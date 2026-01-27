"""
产业链数据采集工具
采集industry-chain页面的SVG数据和chain-info页面的项目列表数据

使用方法：
    python manual_browser_scraper.py

功能：
    - 监听 industry-chain 页面：点击产业链按钮后自动采集SVG数据
    - 监听 chain-info 页面：自动采集项目列表数据
    - 使用标签的显示内容（按钮文本）作为文件名
    - SVG数据：仅保存SVG文件和SVG代码（txt文件），不保存JSON数据
    - 项目列表：保存为JSON和CSV格式
    - 项目详情：保存为JSON格式
"""

import asyncio
import json
import csv
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

class ManualBrowserScraper:
    """手动浏览器采集器 - 只在页面加载时采集，人工操作时不采集"""
    
    def __init__(self, output_dir=None, chain_info_output_dir=None, interaction_timeout=5, use_persistent_context=True, persistent_context_dir=None):
        """
        初始化采集器
        
        Args:
            output_dir: SVG输出目录，默认为脚本所在目录下的svg_output
            chain_info_output_dir: 项目列表输出目录，默认为脚本所在目录下的chain_info_output
            interaction_timeout: 用户操作后多少秒内不采集，默认5秒（鼠标停止5秒后可继续采集）
            use_persistent_context: 是否使用persistent context来共享缓存，默认True（启用缓存持久化）
            persistent_context_dir: persistent context的目录，如果为None则使用脚本目录下的chrome_cache
        """
        if output_dir is None:
            # 默认输出目录为脚本所在目录下的svg_output
            script_dir = Path(__file__).parent
            output_dir = script_dir / "svg_output"
        
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)
        
        # 项目列表输出目录
        if chain_info_output_dir is None:
            script_dir = Path(__file__).parent
            chain_info_output_dir = script_dir / "chain_info_output"
        
        self.chain_info_output_dir = Path(chain_info_output_dir)
        self.chain_info_output_dir.mkdir(exist_ok=True, parents=True)
        
        # 采集状态
        self.is_collecting = False
        self.user_interacting = False
        self.last_interaction_time = 0
        self.interaction_timeout = interaction_timeout  # 用户操作后N秒内不采集
        
        # 已采集的URL集合，避免重复采集（用于chain-detail页面）
        self.collected_urls = set()
        
        # 已采集的SVG URL集合（用于industry-chain页面），避免重复采集
        self.collected_svg_urls = set()
        
        # 已采集的项目列表URL集合（用于chain-info页面），避免重复采集
        self.collected_chain_info_urls = set()
        
        # 详情页数据哈希字典，用于检测数据更新（key: normalized_url, value: data_hash）
        self.detail_page_data_hashes = {}
        
        # chain-info页面数据哈希字典，用于检测数据更新（key: normalized_url, value: data_hash）
        self.chain_info_page_data_hashes = {}
        
        # product-details页面输出目录
        script_dir = Path(__file__).parent
        self.product_details_output_dir = script_dir / "product_details_output"
        self.product_details_output_dir.mkdir(exist_ok=True, parents=True)
        
        # 已采集的product-details页面URL集合，避免重复采集
        self.collected_product_details_urls = set()
        
        # product-details页面数据哈希字典，用于检测数据更新（key: normalized_url, value: data_hash）
        self.product_details_page_data_hashes = {}
        
        # Persistent context选项
        self.use_persistent_context = use_persistent_context
        # 如果未指定persistent context目录，使用脚本目录下的固定目录
        if persistent_context_dir is None:
            script_dir = Path(__file__).parent
            self.persistent_context_dir = script_dir / "chrome_cache"
        else:
            self.persistent_context_dir = Path(persistent_context_dir)
    
    async def start(self):
        """
        启动浏览器并开始监听
        """
        async with async_playwright() as p:
            import os
            browser = None
            context = None
            is_chrome = False
            
            # 如果启用persistent context，直接使用它（不需要先启动browser）
            if self.use_persistent_context:
                # 使用固定的缓存目录（在脚本目录下）
                # 确保目录存在
                self.persistent_context_dir.mkdir(exist_ok=True, parents=True)
                user_data_dir = str(self.persistent_context_dir)
                
                print(f"[浏览器] 使用Persistent Context（缓存持久化）")
                print(f"[浏览器] 正在尝试使用系统安装的Chrome浏览器...")
                print(f"[浏览器] 缓存目录: {user_data_dir}")
                print(f"[浏览器] 注意：缓存将持久化保存，下次启动时会保留之前的缓存数据")
                print(f"[浏览器] 注意：使用persistent context时，请确保没有其他Chrome实例在使用相同目录")
                
                try:
                    # 使用launch_persistent_context来创建persistent context
                    # 这会直接返回context，并且使用Chrome（如果可用）
                    context = await p.chromium.launch_persistent_context(
                        user_data_dir=user_data_dir,
                        headless=False,
                        slow_mo=100,
                        channel='chrome',  # 使用系统安装的Chrome浏览器
                        viewport=None,  # 禁用固定视口，允许窗口最大化
                        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        args=['--start-maximized']  # 启动时最大化窗口
                    )
                    
                    # 对于persistent context，尝试获取browser对象（用于版本检查）
                    try:
                        # persistent context的pages[0].context.browser可以获取browser对象
                        if context.pages:
                            page_temp = context.pages[0]
                            browser = page_temp.context.browser if hasattr(page_temp.context, 'browser') else None
                        else:
                            browser = None
                        
                        # 尝试获取版本信息
                        if browser:
                            try:
                                # 确保 browser.version 是一个方法，而不是字符串
                                if callable(getattr(browser, 'version', None)):
                                    browser_version = await browser.version()
                                else:
                                    browser_version = "Chrome (通过Persistent Context)"
                                    print(f"[浏览器] ⚠ 警告：无法通过标准方法获取版本信息")
                                print(f"[浏览器] 浏览器版本: {browser_version}")
                                # 检查版本信息确认是Chrome还是Chromium
                                if 'chrome' in browser_version.lower() and 'chromium' not in browser_version.lower():
                                    is_chrome = True
                                    print(f"[浏览器] ✓ 确认使用Chrome浏览器（非Chromium）")
                            except Exception as ver_err:
                                print(f"[浏览器] 无法获取浏览器版本信息: {ver_err}")
                                browser_version = "Chrome (通过Persistent Context)"
                                is_chrome = True  # 使用channel='chrome'，假设是Chrome
                        else:
                            browser_version = "Chrome (通过Persistent Context)"
                            print(f"[浏览器] 浏览器版本: {browser_version}")
                            is_chrome = True  # 使用channel='chrome'，假设是Chrome
                    except Exception as ver_e:
                        print(f"[浏览器] 无法获取浏览器版本信息: {ver_e}")
                        browser_version = "Chrome (通过Persistent Context)"
                        is_chrome = True  # 使用channel='chrome'，假设是Chrome
                    
                    print(f"[浏览器] ✓ Persistent Context已创建，缓存将持久化保存")
                except Exception as e:
                    print(f"[浏览器] ✗ 使用Chrome创建Persistent Context失败: {e}")
                    print(f"[浏览器] 回退到使用Chromium...")
                    try:
                        context = await p.chromium.launch_persistent_context(
                            user_data_dir=user_data_dir,
                            headless=False,
                            slow_mo=100,
                            viewport=None,  # 禁用固定视口，允许窗口最大化
                            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            args=['--start-maximized']  # 启动时最大化窗口
                        )
                        # 对于persistent context，尝试获取browser对象
                        try:
                            if context.pages:
                                page_temp = context.pages[0]
                                browser = page_temp.context.browser if hasattr(page_temp.context, 'browser') else None
                            else:
                                browser = None
                            
                            if browser:
                                try:
                                    # 确保 browser.version 是一个方法，而不是字符串
                                    if callable(getattr(browser, 'version', None)):
                                        browser_version = await browser.version()
                                    else:
                                        browser_version = "Chromium (通过Persistent Context)"
                                except:
                                    browser_version = "Chromium (通过Persistent Context)"
                            else:
                                browser_version = "Chromium (通过Persistent Context)"
                        except:
                            browser = None
                            browser_version = "未知"
                        
                        print(f"[浏览器] ✓ 使用Chromium创建Persistent Context")
                        print(f"[浏览器] 浏览器版本: {browser_version}")
                    except Exception as e2:
                        print(f"[浏览器] ✗ Persistent Context创建失败: {e2}")
                        raise
            else:
                # 不使用persistent context，使用常规方式启动
                print("[浏览器] 正在尝试使用系统安装的Chrome浏览器...")
                
                try:
                    browser = await p.chromium.launch(
                        headless=False,
                        slow_mo=100,
                        channel='chrome',  # 使用系统安装的Chrome浏览器（channel方式）
                        args=['--start-maximized']  # 启动时最大化窗口
                    )
                    
                    # 验证是否真的在使用Chrome
                    if browser:
                        try:
                            # 安全地获取版本信息
                            version_attr = getattr(browser, 'version', None)
                            if version_attr and callable(version_attr):
                                browser_version = await version_attr()
                            elif isinstance(version_attr, str):
                                browser_version = version_attr
                            else:
                                browser_version = "Chrome (版本信息不可用)"
                                print(f"[浏览器] ⚠ 警告：无法通过标准方法获取版本信息")
                            print(f"[浏览器] ✓ 成功使用系统安装的Chrome浏览器")
                            print(f"[浏览器] 浏览器版本: {browser_version}")
                            
                            # 检查版本信息确认是Chrome还是Chromium
                            if isinstance(browser_version, str) and 'chrome' in browser_version.lower() and 'chromium' not in browser_version.lower():
                                is_chrome = True
                                print(f"[浏览器] ✓ 确认使用Chrome浏览器（非Chromium）")
                            else:
                                print(f"[浏览器] ⚠ 警告：可能使用的是Chromium而非Chrome")
                        except (TypeError, AttributeError) as ver_err:
                            print(f"[浏览器] ⚠ 获取版本信息时出错: {ver_err}")
                            browser_version = "Chrome (版本信息获取失败)"
                            is_chrome = True  # 使用channel='chrome'，假设是Chrome
                        except Exception as ver_err:
                            print(f"[浏览器] ⚠ 获取版本信息时出错: {ver_err}")
                            browser_version = "Chrome (版本信息获取失败)"
                            is_chrome = True  # 使用channel='chrome'，假设是Chrome
                    else:
                        print(f"[浏览器] ⚠ 警告：无法获取浏览器对象")
                        
                except Exception as e:
                    # 如果系统没有安装Chrome，回退到Chromium
                    print(f"[浏览器] ✗ 未找到系统Chrome: {e}")
                    print("[浏览器] 回退到使用Chromium浏览器...")
                    try:
                        browser = await p.chromium.launch(
                            headless=False,
                            slow_mo=100,
                            args=['--start-maximized']  # 启动时最大化窗口
                        )
                        if browser:
                            try:
                                # 安全地获取版本信息
                                version_attr = getattr(browser, 'version', None)
                                if version_attr and callable(version_attr):
                                    browser_version = await version_attr()
                                elif isinstance(version_attr, str):
                                    browser_version = version_attr
                                else:
                                    browser_version = "Chromium (版本信息不可用)"
                                    print(f"[浏览器] ⚠ 警告：无法通过标准方法获取版本信息")
                                print(f"[浏览器] ✓ 使用Chromium浏览器")
                                print(f"[浏览器] 浏览器版本: {browser_version}")
                            except (TypeError, AttributeError) as ver_err:
                                print(f"[浏览器] ⚠ 获取版本信息时出错: {ver_err}")
                                browser_version = "Chromium (版本信息获取失败)"
                                print(f"[浏览器] ✓ 使用Chromium浏览器")
                                print(f"[浏览器] 浏览器版本: {browser_version}")
                            except Exception as ver_err:
                                print(f"[浏览器] ⚠ 获取版本信息时出错: {ver_err}")
                                browser_version = "Chromium (版本信息获取失败)"
                                print(f"[浏览器] ✓ 使用Chromium浏览器")
                                print(f"[浏览器] 浏览器版本: {browser_version}")
                        else:
                            print(f"[浏览器] ⚠ 警告：无法获取浏览器对象")
                    except Exception as e2:
                        print(f"[浏览器] ✗ Chromium启动失败: {e2}")
                        raise
                
                if browser is None:
                    raise Exception("无法启动浏览器")
                
                # 创建浏览器上下文
                context_options = {
                    'viewport': None,  # 禁用固定视口，允许窗口最大化
                    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
                
                # 显示浏览器信息
                if is_chrome:
                    print(f"[浏览器] 提示：当前使用独立的用户数据目录，不会与正在运行的Chrome共享缓存")
                    print(f"[浏览器] 如需共享缓存，可以在初始化时设置 use_persistent_context=True")
                
                context = await browser.new_context(**context_options)
            
            # 创建新页面
            # 对于persistent context，如果已经有页面，使用第一个页面，否则创建新页面
            if self.use_persistent_context and context.pages:
                page = context.pages[0]
                print(f"[浏览器] 使用Persistent Context的现有页面")
            else:
                page = await context.new_page()
            
            # 设置窗口最大化（保持最大化状态）
            await self._set_window_maximized(page)
            
            # 存储所有页面，用于在新标签页中设置监听
            pages = [page]
            
            # 监听新标签页创建
            async def handle_new_page(new_page):
                """处理新打开的标签页"""
                print(f"\n[新标签页] 检测到新标签页打开: {new_page.url}")
                pages.append(new_page)
                
                # 延迟设置，确保页面已加载
                await asyncio.sleep(0.5)
                
                # 注意：新标签页在同一个浏览器窗口中，不需要重新设置窗口位置
                # 移除窗口最大化调用，避免窗口位置被重置到右上角
                # await self._set_window_maximized(new_page)  # 已移除，防止窗口位置重置
                
                # 确保新标签页可以滚动
                await self._ensure_page_scrollable(new_page)
                
                # 在新标签页中设置用户交互监听
                await self._setup_interaction_listeners(new_page)
                
                # 在新标签页中注入路由监听器
                await self._inject_route_listeners_to_page(new_page, context)
                
                # 监听新标签页的导航事件
                async def handle_new_page_navigation(frame):
                    await self._handle_navigation(frame, context)
                
                new_page.on("framenavigated", lambda frame: asyncio.create_task(
                    handle_new_page_navigation(frame)
                ))
                
                # 监听新标签页的加载事件
                async def handle_new_page_load():
                    try:
                        url = new_page.url
                        normalized_url = self._normalize_url(url)
                        if "/chain-detail" in url and normalized_url not in self.collected_urls:
                            print(f"\n[新标签页加载] 检测到目标URL: {url}")
                            await asyncio.sleep(3)
                            await self._handle_navigation(new_page.main_frame, context)
                    except Exception as e:
                        print(f"[新标签页加载事件错误] {e}")
                
                new_page.on("load", lambda: asyncio.create_task(handle_new_page_load()))
                
                # 在新标签页中启动URL检查任务
                async def check_new_page_url():
                    last_url = new_page.url
                    while True:
                        try:
                            await asyncio.sleep(0.2)
                            current_url = new_page.url
                            if current_url != last_url and "/chain-detail" in current_url:
                                normalized_url = self._normalize_url(current_url)
                                if normalized_url not in self.collected_urls:
                                    print(f"\n[新标签页URL检测] 检测到URL变化: {last_url} -> {current_url}")
                                    last_url = current_url
                                    await asyncio.sleep(2)
                                    await self._handle_navigation(new_page.main_frame, context)
                            elif current_url != last_url:
                                last_url = current_url
                        except Exception as e:
                            await asyncio.sleep(0.5)
                
                asyncio.create_task(check_new_page_url())
            
            # 监听浏览器上下文的新页面事件
            context.on("page", lambda new_page: asyncio.create_task(handle_new_page(new_page)))
            
            # 设置用户交互监听
            await self._setup_interaction_listeners(page)
            
            # 监听页面导航事件
            async def handle_framenavigated(frame):
                # 处理导航事件
                # 确保窗口保持最大化
                try:
                    await self._set_window_maximized(frame.page)
                except:
                    pass
                await self._handle_navigation(frame, context)
            
            page.on("framenavigated", lambda frame: asyncio.create_task(
                handle_framenavigated(frame)
            ))
            
            # 监听页面URL变化（处理SPA路由跳转）- 作为备用检测
            last_url = page.url
            async def check_url_change():
                nonlocal last_url
                while True:
                    try:
                        await asyncio.sleep(0.5)  # 更频繁地检查
                        current_url = page.url
                        if current_url != last_url:
                            print(f"\n[URL轮询检测] {last_url} -> {current_url}")
                            last_url = current_url
                            # 如果是目标URL且未采集过，触发采集
                            if "/chain-detail" in current_url:
                                normalized_url = self._normalize_url(current_url)
                                if normalized_url not in self.collected_urls:
                                    print(f"[触发采集] 轮询检测到目标URL: {current_url}")
                                    await asyncio.sleep(3)  # 等待页面加载
                                    await self._handle_navigation(page.main_frame, context)
                    except Exception as e:
                        print(f"[URL监听错误] {e}")
                        await asyncio.sleep(1)
            
            # 启动URL变化监听任务（备用检测）
            url_check_task = asyncio.create_task(check_url_change())
            
            # 启动详情页数据更新检查任务（定期轮询）
            async def check_detail_page_updates():
                """
                定期检查详情页、chain-info和product-details页面数据是否有更新
                每30秒检查一次当前打开的页面
                """
                while True:
                    try:
                        await asyncio.sleep(30)  # 每30秒检查一次
                        
                        # 检查所有打开的页面
                        for current_page in pages:
                            try:
                                current_url = current_page.url
                                normalized_url = self._normalize_url(current_url)
                                
                                # 如果正在采集，跳过本次检查
                                if self.is_collecting:
                                    continue
                                
                                # 检查chain-detail页面
                                if "/chain-detail" in current_url:
                                    # 如果已经采集过，检查数据是否有更新
                                    if normalized_url in self.collected_urls:
                                        print(f"\n[定期检查] 检查详情页数据更新: {normalized_url}")
                                        data_updated = await self._quick_check_data_update(current_page, normalized_url, context)
                                        if data_updated:
                                            print(f"[定期检查] 检测到数据更新，触发重新采集: {normalized_url}")
                                            # 等待页面稳定
                                            await asyncio.sleep(3)
                                            # 触发重新采集
                                            await self._handle_chain_detail_page(current_page.main_frame, context, current_url)
                                
                                # 检查chain-info页面（chain-info只采集一遍，不进行数据更新检测）
                                elif "/chain-info" in current_url:
                                    # chain-info页面只采集一遍，已采集过的直接跳过
                                    if normalized_url in self.collected_chain_info_urls:
                                        # 已采集过，跳过（不进行数据更新检测）
                                        pass
                                
                                # 检查product-details页面（product-details只采集一遍，不进行数据更新检测）
                                elif "/product-details" in current_url:
                                    # product-details页面只采集一遍，已采集过的直接跳过
                                    if normalized_url in self.collected_product_details_urls:
                                        # 已采集过，跳过（不进行数据更新检测）
                                        pass
                            except Exception as e:
                                # 单个页面检查失败不影响其他页面
                                continue
                    except Exception as e:
                        print(f"[定期检查错误] {e}")
                        await asyncio.sleep(5)
            
            # 启动数据更新检查任务
            update_check_task = asyncio.create_task(check_detail_page_updates())
            
            # 监听页面加载完成事件
            async def handle_load():
                try:
                    url = page.url
                    if "/industry-chain" in url:
                        print(f"\n[页面加载完成] 检测到industry-chain页面: {url}")
                        await asyncio.sleep(1)
                        await self._inject_svg_url_listener_to_page(page, context)
                    elif "chain-info" in url:
                        print(f"\n[页面加载完成] 检测到chain-info页面: {url}")
                        await asyncio.sleep(1)
                        # 检查是否已经采集过
                        normalized_url = self._normalize_url(url)
                        if normalized_url not in self.collected_chain_info_urls:
                            print(f"[触发采集] 检测到未采集的chain-info页面，开始采集...")
                            await self._handle_chain_info_page(page.main_frame, context, url)
                except Exception as e:
                    print(f"[加载事件错误] {e}")
            
            page.on("load", lambda: asyncio.create_task(handle_load()))
            
            print("=" * 80)
            print("产业链数据采集工具已启动")
            print("=" * 80)
            print("\n功能说明：")
            print("1. 产业链SVG采集：访问 industry-chain 页面，点击产业链按钮，工具会自动采集SVG数据")
            print("2. 项目列表采集：访问 chain-info 页面，工具会自动采集项目列表数据")
            print("3. 产品详情采集：访问 product-details 页面，工具会自动采集产品详情数据")
            print("4. SVG数据会以产业链名命名文件夹保存，包含SVG文件和SVG代码（txt文件）")
            print("5. 项目列表数据会保存为JSON、CSV和Excel格式")
            print("6. 产品详情数据会保存为JSON和Excel格式，包含项目信息、融资历程、股东信息、对外投资、工商信息、股权穿透等")
            print("7. 产业链数据会保存为Excel格式，包含基本信息和产业链列表")
            print("8. 数据更新检测：工具会每30秒自动检查详情页、chain-info和product-details页面数据是否有更新，如有更新会自动重新采集")
            print("9. 按 Ctrl+C 退出程序")
            print("=" * 80)
            print("\n等待页面导航...")
            print(f"当前URL: {page.url}\n")
            
            # 为当前页面注入路由监听器
            await self._inject_route_listeners_to_page(page, context)
            
            # 为当前页面启动URL检查任务
            async def check_js_url_change():
                last_checked_url = page.url
                while True:
                    try:
                        await asyncio.sleep(0.2)  # 每200ms检查一次
                        
                        # 方法1: 检查标志位
                        result = await page.evaluate("""
                            () => {
                                if (window.__url_changed && window.__new_url) {
                                    const url = window.__new_url;
                                    window.__url_changed = false;
                                    window.__new_url = null;
                                    return url;
                                }
                                return null;
                            }
                        """)
                        
                        # 方法2: 直接检查当前URL（作为备用）
                        current_url = page.url
                        # 检查是否是 industry-chain 页面
                        if current_url != last_checked_url and "/industry-chain" in current_url:
                            print(f"\n[检测到industry-chain页面] {current_url}")
                            last_checked_url = current_url
                            # 为 industry-chain 页面注入SVG URL监听器
                            await self._inject_svg_url_listener_to_page(page, context)
                        elif current_url != last_checked_url:
                            last_checked_url = current_url
                    except Exception as e:
                        await asyncio.sleep(0.5)
            
            js_route_check_task = asyncio.create_task(check_js_url_change())
            
            # 每次页面导航后重新注入监听器
            async def re_inject_on_navigation(frame):
                if frame == frame.page.main_frame:
                    await asyncio.sleep(0.5)  # 等待页面初始化
                    await self._set_window_maximized(frame.page)  # 恢复窗口最大化
                    await self._ensure_page_scrollable(frame.page)  # 确保页面可滚动
                    await self._inject_route_listeners_to_page(frame.page, context)
                    
                    # 如果是industry-chain页面，也注入SVG URL监听器
                    current_url = frame.page.url
                    if "/industry-chain" in current_url:
                        print(f"[检测到industry-chain页面] 注入SVG URL监听器: {current_url}")
                        await self._inject_svg_url_listener_to_page(frame.page, context)
            
            page.on("framenavigated", lambda frame: asyncio.create_task(
                re_inject_on_navigation(frame)
            ))
            
            
            # 监听industry-chain页面的SVG URL变化（自动采集模式）
            async def check_svg_url_change():
                last_svg_url = None
                processing_urls = set()  # 正在处理的URL集合，避免并发重复处理
                while True:
                    try:
                        await asyncio.sleep(0.2)  # 每200ms检查一次，更快响应
                        current_url = page.url
                        
                        # 只在industry-chain页面检查SVG URL变化
                        if "/industry-chain" in current_url:
                            # 检查JavaScript标志位
                            result = await page.evaluate("""
                                () => {
                                    if (window.__svg_url_changed && window.__new_svg_url) {
                                        const url = window.__new_svg_url;
                                        window.__svg_url_changed = false;
                                        window.__new_svg_url = null;
                                        return url;
                                    }
                                    return null;
                                }
                            """)
                            
                            if result and result != last_svg_url:
                                # 多重检查避免重复
                                if result not in self.collected_svg_urls and result not in processing_urls:
                                    print(f"\n[SVG URL变化] 检测到SVG URL变化: {last_svg_url} -> {result}")
                                    last_svg_url = result
                                    
                                    # 标记为正在处理
                                    processing_urls.add(result)
                                    
                                    try:
                                        print(f"[开始采集] 新的SVG URL: {result}")
                                        await asyncio.sleep(2)  # 等待SVG加载
                                        await self._handle_svg_url_change(page, context, result, current_url)
                                    finally:
                                        # 处理完成后从处理集合中移除
                                        processing_urls.discard(result)
                                elif result in self.collected_svg_urls:
                                    print(f"[跳过] SVG URL已采集过: {result}")
                                    last_svg_url = result
                                elif result in processing_urls:
                                    print(f"[跳过] SVG URL正在处理中: {result}")
                                    last_svg_url = result
                        else:
                            # 不在industry-chain页面，重置
                            last_svg_url = None
                            processing_urls.clear()  # 清空处理集合
                    except Exception as e:
                        print(f"[SVG URL检查错误] {e}")
                        await asyncio.sleep(1)
            
            svg_url_check_task = asyncio.create_task(check_svg_url_change())
            
            # 启动窗口最大化保持任务（仅在窗口被改变时恢复最大化）
            async def keep_window_maximized():
                last_window_states = {}  # 记录每个页面的窗口状态
                while True:
                    try:
                        await asyncio.sleep(5)  # 每5秒检查一次（降低频率）
                        # 检查所有页面的窗口状态
                        for p in pages:
                            try:
                                # 检查窗口是否被改变（不再是最大化）
                                window_state = await p.evaluate("""
                                    () => ({
                                        width: window.outerWidth,
                                        height: window.outerHeight,
                                        screenWidth: window.screen.availWidth,
                                        screenHeight: window.screen.availHeight
                                    })
                                """)
                                
                                page_id = id(p)
                                last_state = last_window_states.get(page_id)
                                
                                # 只在窗口明显被改变时才恢复最大化（允许用户手动调整）
                                if window_state:
                                    is_maximized = (window_state['width'] >= window_state['screenWidth'] - 10 and 
                                                   window_state['height'] >= window_state['screenHeight'] - 10)
                                    
                                    # 如果窗口从最大化变为非最大化，且不是用户刚刚调整的，才恢复
                                    if last_state and last_state.get('was_maximized') and not is_maximized:
                                        # 等待一下，确认不是用户正在调整
                                        await asyncio.sleep(1)
                                        # 再次检查，如果还是非最大化，才恢复
                                        current_state = await p.evaluate("""
                                            () => ({
                                                width: window.outerWidth,
                                                height: window.outerHeight,
                                                screenWidth: window.screen.availWidth,
                                                screenHeight: window.screen.availHeight
                                            })
                                        """)
                                        if current_state:
                                            still_not_maximized = (current_state['width'] < current_state['screenWidth'] - 10 or 
                                                                  current_state['height'] < current_state['screenHeight'] - 10)
                                            if still_not_maximized:
                                                await self._set_window_maximized(p)
                                    
                                    last_window_states[page_id] = {
                                        'was_maximized': is_maximized,
                                        'state': window_state
                                    }
                            except:
                                pass
                    except:
                        await asyncio.sleep(1)
            
            window_maximize_task = asyncio.create_task(keep_window_maximized())
            
            # 打开一个初始页面（可选）
            await page.goto("about:blank")
            
            try:
                # 保持运行，等待用户操作
                while True:
                    await asyncio.sleep(1)
            except KeyboardInterrupt:
                print("\n\n正在关闭浏览器...")
            finally:
                # 取消所有监听任务
                url_check_task.cancel()
                js_route_check_task.cancel()
                svg_url_check_task.cancel()
                window_maximize_task.cancel()
                try:
                    await url_check_task
                except asyncio.CancelledError:
                    pass
                try:
                    await js_route_check_task
                except asyncio.CancelledError:
                    pass
                try:
                    await svg_url_check_task
                except asyncio.CancelledError:
                    pass
                try:
                    await window_maximize_task
                except asyncio.CancelledError:
                    pass
                
                # 关闭浏览器或context
                if self.use_persistent_context and context:
                    # 对于persistent context，关闭context即可
                    await context.close()
                    print("浏览器已关闭（Persistent Context）")
                elif browser:
                    await browser.close()
                    print("浏览器已关闭")
                else:
                    print("浏览器已关闭（无需关闭）")
    
    async def _setup_interaction_listeners(self, page):
        """
        设置用户交互监听器
        
        Args:
            page: Playwright页面对象
        """
        # 监听鼠标移动
        async def handle_mousemove(event):
            self.user_interacting = True
            self.last_interaction_time = asyncio.get_event_loop().time()
            # 如果正在采集，暂停
            if self.is_collecting:
                print("\n[检测到用户操作] 暂停采集...")
                self.is_collecting = False
        
        # 监听鼠标点击
        async def handle_click(event):
            self.user_interacting = True
            self.last_interaction_time = asyncio.get_event_loop().time()
            if self.is_collecting:
                print("\n[检测到用户操作] 暂停采集...")
                self.is_collecting = False
        
        # 监听键盘输入
        async def handle_keypress(event):
            self.user_interacting = True
            self.last_interaction_time = asyncio.get_event_loop().time()
            if self.is_collecting:
                print("\n[检测到用户操作] 暂停采集...")
                self.is_collecting = False
        
        # 使用JavaScript注入监听器
        timeout_ms = self.interaction_timeout * 1000  # 转换为毫秒
        await page.evaluate(f"""
            () => {{
                // 设置超时时间（毫秒）
                window.__interaction_timeout = {timeout_ms};
                
                // 监听鼠标移动
                document.addEventListener('mousemove', () => {{
                    window.__user_interacting = true;
                    window.__last_interaction = Date.now();
                }}, {{ passive: true }});
                
                // 监听鼠标点击
                document.addEventListener('click', () => {{
                    window.__user_interacting = true;
                    window.__last_interaction = Date.now();
                }}, {{ passive: true }});
                
                // 监听键盘输入
                document.addEventListener('keydown', () => {{
                    window.__user_interacting = true;
                    window.__last_interaction = Date.now();
                }}, {{ passive: true }});
                
                // 初始化标志
                window.__user_interacting = false;
                window.__last_interaction = 0;
            }}
        """)
    
    async def _set_window_maximized(self, page):
        """
        设置窗口最大化，并保持最大化状态
        
        Args:
            page: Playwright页面对象
        """
        try:
            # 尝试通过CDP协议最大化窗口（更可靠的方法）
            try:
                browser = page.context.browser
                if browser:
                    # 获取浏览器上下文
                    cdp_session = await page.context.new_cdp_session(page)
                    # 尝试多个窗口ID，确保找到正确的窗口
                    window_ids_to_try = [1, 2, 3, 4, 5]
                    maximized = False
                    for window_id in window_ids_to_try:
                        try:
                            # 使用CDP命令最大化窗口
                            await cdp_session.send('Browser.setWindowBounds', {
                                'windowId': window_id,
                                'bounds': {'windowState': 'maximized'}
                            })
                            maximized = True
                            break
                        except:
                            continue
                    
                    # 不再重复设置，避免干扰用户操作
            except Exception as e:
                # CDP失败不影响其他操作，静默处理
                pass
            
            # 注入JavaScript保持窗口最大化
            await page.evaluate("""
                () => {
                    // 阻止 window.resizeTo 和 window.resizeBy，保持最大化
                    const originalResizeTo = window.resizeTo;
                    const originalResizeBy = window.resizeBy;
                    
                    window.resizeTo = function() {
                        console.log('[窗口保护] 阻止 resizeTo 调用，保持最大化');
                        // 不执行任何操作，保持窗口最大化
                    };
                    
                    window.resizeBy = function() {
                        console.log('[窗口保护] 阻止 resizeBy 调用，保持最大化');
                        // 不执行任何操作，保持窗口最大化
                    };
                    
                    // 确保页面可以滚动（移除可能阻止滚动的样式）
                    if (document.body) {
                        if (document.body.style.overflow === 'hidden') {
                            document.body.style.overflow = 'auto';
                        }
                        if (document.body.style.height === '100%' || document.body.style.height === '100vh') {
                            document.body.style.minHeight = '100vh';
                            document.body.style.height = 'auto';
                        }
                    }
                    
                    if (document.documentElement) {
                        if (document.documentElement.style.overflow === 'hidden') {
                            document.documentElement.style.overflow = 'auto';
                        }
                    }
                    
                    // 监听窗口大小变化，尝试恢复最大化
                    let lastWidth = window.screen.availWidth;
                    let lastHeight = window.screen.availHeight;
                    
                    const checkAndRestoreMaximized = () => {
                        const currentWidth = window.outerWidth;
                        const currentHeight = window.outerHeight;
                        const screenWidth = window.screen.availWidth;
                        const screenHeight = window.screen.availHeight;
                        
                        // 如果窗口不是最大化状态，尝试恢复
                        if (currentWidth < screenWidth - 10 || currentHeight < screenHeight - 10) {
                            console.log('[窗口保护] 检测到窗口未最大化，尝试恢复...');
                            // 注意：在浏览器环境中，我们无法直接设置窗口最大化
                            // 但可以通过阻止resize事件来防止变化
                        }
                    };
                    
                    // 定期检查窗口状态（作为备用保护）
                    setInterval(checkAndRestoreMaximized, 1000);
                    
                    console.log('[窗口保护] 窗口最大化保护已启用，页面滚动功能正常');
                }
            """)
            
            # 使用Playwright的API尝试最大化窗口（仅在viewport为None时设置）
            try:
                # 只在viewport为None时才设置（避免频繁改变视口大小）
                current_viewport = page.viewport_size
                if current_viewport is None or current_viewport.get('width', 0) < 1000:
                    # 获取屏幕尺寸并设置viewport（确保页面能完整显示）
                    screen_size = await page.evaluate("""
                        () => ({
                            width: window.screen.availWidth,
                            height: window.screen.availHeight,
                            innerWidth: window.innerWidth,
                            innerHeight: window.innerHeight
                        })
                    """)
                    if screen_size and 'width' in screen_size and 'height' in screen_size:
                        # 使用实际窗口内部尺寸，而不是屏幕尺寸（减去浏览器UI）
                        viewport_width = screen_size.get('innerWidth', screen_size['width'])
                        viewport_height = screen_size.get('innerHeight', screen_size['height'])
                        
                        # 如果innerWidth/innerHeight不可用，使用屏幕尺寸减去一些边距
                        if viewport_width == screen_size['width']:
                            viewport_width = screen_size['width'] - 20  # 减去一些边距
                        if viewport_height == screen_size['height']:
                            viewport_height = screen_size['height'] - 150  # 减去标题栏等UI高度
                        
                        # 设置viewport为窗口内部尺寸（仅设置一次）
                        await page.set_viewport_size({
                            'width': viewport_width,
                            'height': viewport_height
                        })
                        print(f"[窗口最大化] 设置viewport为: {viewport_width}x{viewport_height}")
            except Exception as e:
                print(f"[窗口最大化] 无法通过API最大化: {e}")
                
        except Exception as e:
            print(f"[窗口最大化设置错误] {e}")
    
    async def _set_fixed_window_size(self, page):
        """
        设置固定窗口大小，防止页面改变窗口尺寸，但保持页面可滚动（保留此方法以兼容）
        
        Args:
            page: Playwright页面对象
        """
        # 直接调用最大化方法
        await self._set_window_maximized(page)
    
    async def _ensure_page_scrollable(self, page):
        """
        确保页面可以正常滚动和完整显示
        
        Args:
            page: Playwright页面对象
        """
        try:
            await page.evaluate("""
                () => {
                    // 确保body和html元素可以滚动和完整显示
                    if (document.body) {
                        // 移除可能阻止滚动的样式
                        const bodyStyle = document.body.style;
                        if (bodyStyle.overflow === 'hidden') {
                            bodyStyle.overflow = 'auto';
                            console.log('[滚动修复] 已移除body的overflow:hidden');
                        }
                        // 确保body高度不受限制，允许内容完整显示
                        if (bodyStyle.height === '100%' || bodyStyle.height === '100vh') {
                            bodyStyle.minHeight = '100vh';
                            bodyStyle.height = 'auto';
                            console.log('[滚动修复] 已修复body高度限制');
                        }
                        // 移除最大宽度限制
                        if (bodyStyle.maxWidth) {
                            bodyStyle.maxWidth = 'none';
                        }
                        // 确保宽度不受限制
                        if (bodyStyle.width === '100%') {
                            bodyStyle.width = 'auto';
                            bodyStyle.minWidth = '100%';
                        }
                    }
                    
                    if (document.documentElement) {
                        const htmlStyle = document.documentElement.style;
                        if (htmlStyle.overflow === 'hidden') {
                            htmlStyle.overflow = 'auto';
                            console.log('[滚动修复] 已移除html的overflow:hidden');
                        }
                        // 移除最大宽度限制
                        if (htmlStyle.maxWidth) {
                            htmlStyle.maxWidth = 'none';
                        }
                    }
                    
                    // 确保主容器可以完整显示
                    const mainContainers = document.querySelectorAll('main, .main, .container, .content, #app, #root, [class*="container"], [class*="wrapper"]');
                    mainContainers.forEach(container => {
                        const style = container.style;
                        if (style.overflow === 'hidden') {
                            style.overflow = 'auto';
                        }
                        // 移除最大宽度限制，确保内容可以完整显示
                        if (style.maxWidth && parseInt(style.maxWidth) < window.innerWidth) {
                            style.maxWidth = '100%';
                        }
                        // 确保宽度不受限制
                        if (style.width && style.width !== '100%' && parseInt(style.width) < window.innerWidth) {
                            style.width = '100%';
                        }
                    });
                    
                    // 检查页面是否可以滚动
                    const canScroll = document.documentElement.scrollHeight > window.innerHeight || 
                                     document.body.scrollHeight > window.innerHeight;
                    console.log('[滚动修复] 页面可滚动:', canScroll);
                    console.log('[滚动修复] 页面高度:', document.documentElement.scrollHeight, '视口高度:', window.innerHeight);
                    console.log('[滚动修复] 页面显示修复完成');
                }
            """)
        except Exception as e:
            print(f"[确保页面可滚动错误] {e}")
    
    async def _scroll_to_load_all_content(self, page, max_scrolls=4, scroll_delay=2.0, force_scroll=False):
        """
        滚动页面以加载所有懒加载内容
        
        Args:
            page: Playwright页面对象
            max_scrolls: 最大滚动次数，默认4次
            scroll_delay: 每次滚动后的等待时间（秒）
            force_scroll: 是否强制滚动指定次数（不提前停止），默认False
        """
        try:
            if force_scroll:
                print(f"  [滚动加载] 开始滚动页面，固定滚动 {max_scrolls} 次...")
            else:
                print(f"  [滚动加载] 开始滚动页面，最多滚动 {max_scrolls} 次...")
            
            scroll_count = 0
            previous_scroll_top = 0
            
            while scroll_count < max_scrolls:
                # 获取当前滚动位置
                current_scroll_top = await page.evaluate("""
                    () => {
                        return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                    }
                """)
                
                # 获取页面总高度和视口高度
                page_info = await page.evaluate("""
                    () => {
                        return {
                            scrollHeight: Math.max(
                                document.documentElement.scrollHeight,
                                document.body.scrollHeight
                            ),
                            clientHeight: window.innerHeight || document.documentElement.clientHeight,
                            scrollTop: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
                        };
                    }
                """)
                
                # 如果不是强制滚动，检查是否已经滚动到底部（无法继续滚动）
                if not force_scroll:
                    can_scroll = page_info["scrollHeight"] > page_info["clientHeight"] + page_info["scrollTop"] + 10
                    
                    if not can_scroll and scroll_count > 0:
                        print(f"  [滚动加载] 已滚动到底部，无法继续滚动，停止滚动")
                        break
                
                # 滚动到底部
                await page.evaluate("""
                    () => {
                        window.scrollTo({
                            top: document.documentElement.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                """)
                
                # 等待内容加载
                await asyncio.sleep(scroll_delay)
                
                # 尝试等待网络请求完成（但不要等待太久）
                try:
                    await page.wait_for_load_state("networkidle", timeout=3000)
                except:
                    pass  # 如果超时，继续执行
                
                # 检查滚动位置是否变化
                new_scroll_top = await page.evaluate("""
                    () => {
                        return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                    }
                """)
                
                scroll_count += 1
                print(f"  [滚动加载] 第 {scroll_count} 次滚动完成")
                
                # 如果不是强制滚动，检查滚动位置是否变化
                if not force_scroll:
                    if abs(new_scroll_top - previous_scroll_top) < 10 and scroll_count > 1:
                        print(f"  [滚动加载] 滚动位置未变化，已到底部，停止滚动")
                        break
                
                previous_scroll_top = new_scroll_top
            
            # 最后等待一次，确保所有内容都已加载
            try:
                await page.wait_for_load_state("networkidle", timeout=5000)
            except:
                pass
            
            if force_scroll:
                print(f"  [滚动加载] 滚动完成，固定滚动 {scroll_count} 次")
            else:
                print(f"  [滚动加载] 滚动完成，共滚动 {scroll_count} 次，保持在底部")
            
        except Exception as e:
            print(f"  [滚动加载错误] {e}")
            import traceback
            traceback.print_exc()
    
    async def _inject_route_listeners_to_page(self, target_page, ctx):
        """注入路由监听器到指定页面（类方法）"""
        try:
            await target_page.evaluate("""
                () => {
                    // 如果已经注入过，先清理
                    if (window.__route_listeners_injected) {
                        return;
                    }
                    
                    // 手动触发函数
                    window.__trigger_scrape = async function() {
                        console.log('[手动触发] 开始采集...');
                        window.__manual_trigger = true;
                    };
                    
                    // 窗口大小保护（防止页面改变窗口大小）
                    const fixedWidth = 1920;
                    const fixedHeight = 1080;
                    const originalResizeTo = window.resizeTo;
                    const originalResizeBy = window.resizeBy;
                    
                    window.resizeTo = function() {
                        console.log('[窗口保护] 阻止 resizeTo 调用');
                    };
                    
                    window.resizeBy = function() {
                        console.log('[窗口保护] 阻止 resizeBy 调用');
                    };
                    
                    // 监听 SPA 路由变化（pushState 和 popState）
                    const originalPushState = history.pushState;
                    const originalReplaceState = history.replaceState;
                    
                    history.pushState = function() {
                        originalPushState.apply(history, arguments);
                        const url = window.location.href;
                        console.log('[路由变化] pushState ->', url);
                        if (url.includes('/chain-detail')) {
                            window.__url_changed = true;
                            window.__new_url = url;
                            window.dispatchEvent(new Event('__url_changed'));
                        }
                    };
                    
                    history.replaceState = function() {
                        originalReplaceState.apply(history, arguments);
                        const url = window.location.href;
                        console.log('[路由变化] replaceState ->', url);
                        if (url.includes('/chain-detail')) {
                            window.__url_changed = true;
                            window.__new_url = url;
                            window.dispatchEvent(new Event('__url_changed'));
                        }
                    };
                    
                    window.addEventListener('popstate', function(event) {
                        const url = window.location.href;
                        console.log('[路由变化] popstate ->', url);
                        if (url.includes('/chain-detail')) {
                            window.__url_changed = true;
                            window.__new_url = url;
                            window.dispatchEvent(new Event('__url_changed'));
                        }
                    });
                    
                    // 监听 hash 变化
                    window.addEventListener('hashchange', function(event) {
                        const url = window.location.href;
                        console.log('[路由变化] hashchange ->', url);
                        if (url.includes('/chain-detail')) {
                            window.__url_changed = true;
                            window.__new_url = url;
                            window.dispatchEvent(new Event('__url_changed'));
                        }
                    });
                    
                    // 初始化标志
                    window.__url_changed = false;
                    window.__new_url = null;
                    window.__manual_trigger = false;
                    window.__route_listeners_injected = true;
                    
                    console.log('[工具] 路由监听和手动触发函数已注入');
                    console.log('[工具] 输入 window.__trigger_scrape() 可手动触发采集');
                }
            """)
        except Exception as e:
            print(f"[注入路由监听器错误] {e}")
    
    async def _inject_svg_url_listener_to_page(self, target_page, ctx):
        """注入SVG URL监听器到industry-chain页面"""
        try:
            await target_page.evaluate("""
                () => {
                    // 如果已经注入过，先清理
                    if (window.__svg_url_listener_injected) {
                        return;
                    }
                    
                    console.log('[SVG监听器] 开始监听SVG URL变化...');
                    
                    let lastSvgUrl = null;
                    
                    // 获取当前SVG URL的函数
                    const getCurrentSvgUrl = () => {
                        // 方法1: 查找object标签
                        const objectTag = document.querySelector('object#svgframe, object[data*=".svg"], object[src*=".svg"]');
                        if (objectTag) {
                            return objectTag.getAttribute('data') || objectTag.getAttribute('src') || null;
                        }
                        
                        // 方法2: 查找iframe标签
                        const iframeTag = document.querySelector('iframe[src*=".svg"], iframe[src*="data.hanghangcha.com"]');
                        if (iframeTag) {
                            return iframeTag.getAttribute('src') || null;
                        }
                        
                        // 方法3: 查找img标签
                        const imgTag = document.querySelector('img[src*=".svg"], img[src*="data.hanghangcha.com"]');
                        if (imgTag) {
                            return imgTag.getAttribute('src') || null;
                        }
                        
                        // 方法4: 查找embed标签
                        const embedTag = document.querySelector('embed[src*=".svg"], embed[src*="data.hanghangcha.com"]');
                        if (embedTag) {
                            return embedTag.getAttribute('src') || null;
                        }
                        
                        return null;
                    };
                    
                    // 检查SVG URL是否变化
                    const checkSvgUrlChange = () => {
                        const currentSvgUrl = getCurrentSvgUrl();
                        if (currentSvgUrl && currentSvgUrl !== lastSvgUrl) {
                            // 避免重复触发：如果标志位已经设置且URL相同，则不重复设置
                            if (window.__svg_url_changed && window.__new_svg_url === currentSvgUrl) {
                                return; // 已经触发过，跳过
                            }
                            
                            console.log('[SVG监听器] 检测到SVG URL变化:', lastSvgUrl, '->', currentSvgUrl);
                            lastSvgUrl = currentSvgUrl;
                            
                            // 触发SVG URL变化事件（只设置一次）
                            window.__svg_url_changed = true;
                            window.__new_svg_url = currentSvgUrl;
                            window.dispatchEvent(new Event('__svg_url_changed'));
                        }
                    };
                    
                    // 使用MutationObserver监听DOM变化
                    const observer = new MutationObserver((mutations) => {
                        checkSvgUrlChange();
                    });
                    
                    // 开始观察
                    observer.observe(document.body || document.documentElement, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['src', 'data', 'href']
                    });
                    
                    // 初始化标志
                    window.__svg_url_changed = false;
                    window.__new_svg_url = null;
                    window.__svg_url_listener_injected = true;
                    
                    // 立即检查一次
                    setTimeout(() => {
                        const initialUrl = getCurrentSvgUrl();
                        if (initialUrl) {
                            lastSvgUrl = initialUrl;
                            console.log('[SVG监听器] 初始SVG URL:', initialUrl);
                        }
                        checkSvgUrlChange();
                    }, 1000);
                    
                    // 定期检查（作为备用，提高检测频率）
                    setInterval(checkSvgUrlChange, 200);  // 从500ms改为200ms，更快响应
                    
                    // 监听按钮点击事件，立即检查SVG URL变化
                    document.addEventListener('click', (event) => {
                        // 延迟一点时间，等待SVG加载
                        setTimeout(() => {
                            checkSvgUrlChange();
                        }, 300);
                    }, true);  // 使用捕获阶段，确保能捕获所有点击
                    
                    // 监听所有可能的交互事件
                    ['mousedown', 'touchstart'].forEach(eventType => {
                        document.addEventListener(eventType, () => {
                            setTimeout(() => {
                                checkSvgUrlChange();
                            }, 500);
                        }, true);
                    });
                    
                    console.log('[SVG监听器] SVG URL监听器已注入（自动采集模式）');
                }
            """)
        except Exception as e:
            print(f"[注入SVG URL监听器错误] {e}")
    
    async def _check_user_interacting(self, page):
        """
        检查用户是否正在操作
        
        Args:
            page: Playwright页面对象
            
        Returns:
            bool: 如果用户正在操作返回True
        """
        try:
            result = await page.evaluate("""
                () => {
                    const now = Date.now();
                    const lastInteraction = window.__last_interaction || 0;
                    const timeout = window.__interaction_timeout || 5000; // 默认5秒超时
                    
                    if (now - lastInteraction < timeout) {
                        return true;
                    }
                    return false;
                }
            """)
            return result
        except:
            return False
    
    async def _handle_svg_url_change(self, page, context, svg_url, page_url):
        """
        处理industry-chain页面的SVG URL变化
        
        Args:
            page: Playwright页面对象
            context: 浏览器上下文对象
            svg_url: 新的SVG URL
            page_url: 当前页面URL
        """
        print(f"\n{'='*80}")
        print(f"[SVG URL变化] 检测到SVG URL变化: {svg_url}")
        print(f"页面URL: {page_url}")
        print(f"{'='*80}")
        
        # 检查是否已经采集过（通过检查文件夹中的文件）
        # 先尝试获取产业链名称
        chain_name = self._extract_chain_name_from_svg_url(svg_url)
        
        # 如果从URL中提取不到，先提取页面信息获取产业链名称
        if not chain_name:
            try:
                page_info = await self._extract_page_info(page)
                chain_name = page_info.get("active_button_text", "") or page_info.get("chain_title", "")
            except:
                pass
        
        # 如果获取到产业链名称，检查文件夹中是否已存在文件
        if chain_name:
            if self._check_chain_already_collected(chain_name):
                chain_name_clean = re.sub(r'[<>:"/\\|?*]', '_', chain_name).strip()
                chain_dir = self.output_dir / chain_name_clean
                existing_files = list(chain_dir.glob("*.txt")) + list(chain_dir.glob("*.svg"))
                print(f"\n[跳过] 该产业链已采集过（文件夹中存在文件）: {chain_name}")
                print(f"  文件夹路径: {chain_dir}")
                print(f"  已有文件数: {len(existing_files)}")
                # 仍然添加到集合中，避免重复检查
                self.collected_svg_urls.add(svg_url)
                return
        
        # 检查内存集合（双重检查，确保不重复）
        if svg_url in self.collected_svg_urls:
            print(f"\n[跳过] 该SVG URL已采集过: {svg_url}")
            return
        
        # 立即标记为已采集，避免并发重复采集
        self.collected_svg_urls.add(svg_url)
        print(f"[标记] SVG URL已标记为已采集: {svg_url}")
        
        # 如果正在采集，等待完成
        if self.is_collecting:
            print(f"[等待] 等待当前采集完成...")
            while self.is_collecting:
                await asyncio.sleep(0.5)
        
        # 等待页面稳定
        print(f"[等待页面稳定] {svg_url}")
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
            print("[页面稳定] networkidle状态已到达")
        except Exception as e:
            print(f"[警告] 等待networkidle超时: {e}")
        
        # 等待SVG加载
        print("[等待SVG加载] 等待3秒确保SVG加载...")
        await asyncio.sleep(3)
        
        # 开始采集
        print(f"\n{'='*80}")
        print(f"[开始采集] SVG URL: {svg_url}")
        print(f"{'='*80}")
        
        self.is_collecting = True
        
        try:
            # 从SVG URL中提取标识符（用于文件名）
            svg_id = self._extract_svg_id_from_url(svg_url)
            
            # 从SVG URL中提取产业链名称（如果有的话）
            chain_name = self._extract_chain_name_from_svg_url(svg_url)
            
            # 采集SVG数据
            svg_data = await self._extract_svg_data_from_url(page, context, svg_url)
            
            # 提取页面信息
            page_info = await self._extract_page_info(page)
            
            # 如果从页面信息中没有提取到产业链名称，使用从SVG URL提取的
            if chain_name and not page_info.get("chain_title"):
                page_info["chain_name_from_svg"] = chain_name
            
            # 组合结果
            result = {
                "svg_url": svg_url,
                "page_url": page_url,
                "svg_id": svg_id,
                "chain_name": chain_name,  # 从SVG URL提取的产业链名称
                "scrape_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "svg_data": svg_data,
                "page_info": page_info
            }
            
            # 保存数据
            output_file = self._save_svg_data(result, svg_id)
            print(f"[采集完成] 数据已保存到: {output_file}")
            print(f"{'='*80}\n")
            
        except Exception as e:
            print(f"[采集错误] {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            self.is_collecting = False
    
    def _check_chain_already_collected(self, chain_name: str) -> bool:
        """
        检查产业链是否已经采集过（通过检查文件夹中的文件）
        
        Args:
            chain_name: 产业链名称
            
        Returns:
            bool: 如果已采集返回True，否则返回False
        """
        if not chain_name:
            return False
        
        # 清理文件名中的非法字符
        chain_name_clean = re.sub(r'[<>:"/\\|?*]', '_', chain_name).strip()
        if not chain_name_clean:
            return False
        
        # 检查文件夹是否存在
        chain_dir = self.output_dir / chain_name_clean
        if not chain_dir.exists() or not chain_dir.is_dir():
            return False
        
        # 检查文件夹中是否有文件（.txt 或 .svg 文件）
        existing_files = list(chain_dir.glob("*.txt")) + list(chain_dir.glob("*.svg"))
        return len(existing_files) > 0
    
    def _extract_svg_id_from_url(self, svg_url: str) -> str:
        """
        从SVG URL中提取标识符
        
        Args:
            svg_url: SVG URL
            
        Returns:
            str: SVG标识符
        """
        try:
            # 从URL中提取文件名（不含扩展名）
            # 例如: https://data.hanghangcha.com/report/automaticdriving_1671181526.svg
            # 返回: automaticdriving_1671181526
            from urllib.parse import urlparse
            parsed = urlparse(svg_url)
            filename = parsed.path.split('/')[-1]
            if filename.endswith('.svg'):
                return filename[:-4]
            return filename
        except:
            return "unknown"
    
    def _extract_chain_name_from_svg_url(self, svg_url: str) -> str:
        """
        从SVG URL中提取产业链名称
        
        Args:
            svg_url: SVG URL
            
        Returns:
            str: 产业链名称（如果能够提取）
        """
        try:
            # 从URL中提取文件名
            # 例如: https://data.hanghangcha.com/report/automaticdriving_1671181526.svg
            # 返回: automaticdriving
            from urllib.parse import urlparse
            parsed = urlparse(svg_url)
            filename = parsed.path.split('/')[-1]
            if filename.endswith('.svg'):
                filename = filename[:-4]
            
            # 尝试提取产业链名称（去除时间戳部分）
            # 格式通常是: {chain_name}_{timestamp}
            if '_' in filename:
                # 分割文件名，取第一部分作为产业链名称
                parts = filename.split('_')
                # 如果最后一部分是数字（时间戳），则前面的部分可能是产业链名称
                if len(parts) > 1 and parts[-1].isdigit():
                    chain_name = '_'.join(parts[:-1])
                    return chain_name
                else:
                    # 否则返回整个文件名
                    return filename
            else:
                return filename
        except:
            return ""
    
    async def _extract_svg_data_from_url(self, page, context, svg_url: str):
        """
        从指定的SVG URL提取SVG数据
        
        Args:
            page: Playwright页面对象
            context: 浏览器上下文对象
            svg_url: SVG文件的URL
            
        Returns:
            dict: SVG数据字典
        """
        svg_data = {
            "svg_elements": [],
            "svg_content": [],
            "svg_urls": [svg_url],
            "svg_files": [],
            "svg_count": 0,
            "object_tags": []
        }
        
        try:
            # 检查URL是否是SVG格式
            from urllib.parse import urlparse
            parsed = urlparse(svg_url)
            url_path = parsed.path.lower()
            
            # 只处理SVG格式的URL
            if not url_path.endswith('.svg'):
                print(f"  [跳过] URL不是SVG格式: {svg_url}")
                print(f"  [跳过] 只下载SVG文件，跳过其他格式")
                return svg_data
            
            # 直接下载SVG内容
            print(f"  [下载SVG] 从URL下载: {svg_url}")
            svg_content = await self._download_svg(context, svg_url)
            
            # 验证内容是否是SVG格式
            if svg_content:
                # 检查内容是否包含SVG标签
                if '<svg' in svg_content.lower() or svg_content.strip().startswith('<?xml'):
                    svg_data["svg_content"].append(svg_content)
                    svg_data["svg_files"].append({
                        "url": svg_url,
                        "content": svg_content,
                        "size": len(svg_content)
                    })
                    svg_data["svg_count"] = 1
                    print(f"  ✓ [下载成功] SVG内容 ({len(svg_content)} 字符)")
                else:
                    print(f"  ✗ [跳过] 下载的内容不是SVG格式，跳过保存")
            else:
                print(f"  ✗ [下载失败] 无法下载SVG内容")
            
            # 同时尝试从页面中查找SVG元素
            try:
                # 查找object标签
                svgframe_object = await page.query_selector('object#svgframe, object[data*=".svg"], object[src*=".svg"]')
                if svgframe_object:
                    obj_attrs = await svgframe_object.evaluate('''el => {
                        const attrs = {};
                        for (let attr of el.attributes) {
                            attrs[attr.name] = attr.value;
                        }
                        return attrs;
                    }''')
                    svg_data["object_tags"].append({
                        "index": 0,
                        "attributes": obj_attrs,
                        "svg_url": svg_url,
                        "method": "url_download"
                    })
            except Exception as e:
                print(f"  [警告] 查找object标签时出错: {e}")
            
        except Exception as e:
            print(f"  提取SVG数据时出错: {e}")
            import traceback
            traceback.print_exc()
        
        return svg_data
    
    def _save_svg_data(self, data: dict, svg_id: str):
        """
        保存SVG数据到文件（用于industry-chain页面）
        使用产业链名命名文件夹，仅保存SVG文件和SVG代码（txt文件），不保存JSON数据
        
        Args:
            data: 要保存的数据
            svg_id: SVG标识符
            
        Returns:
            Path: 保存的文件路径（txt文件或SVG文件）
        """
        # 获取产业链名称
        page_info = data.get("page_info", {})
        
        # 优先使用标签的显示内容（按钮文本），这是最准确的产业链名称
        chain_name = page_info.get("active_button_text", "")
        
        # 如果没有按钮文本，使用其他来源
        if not chain_name:
            chain_name = data.get("chain_name", "") or page_info.get("chain_title", "") or page_info.get("chain_name_from_svg", "")
        
        # 如果还是没有，使用从SVG URL提取的名称
        if not chain_name:
            chain_name = self._extract_chain_name_from_svg_url(data.get("svg_url", ""))
        
        # 如果还是没有，使用svg_id
        if not chain_name:
            chain_name = svg_id
        
        # 清理文件名中的非法字符
        import re
        chain_name = re.sub(r'[<>:"/\\|?*]', '_', chain_name)
        chain_name = chain_name.strip()
        
        # 创建以产业链名命名的文件夹
        chain_dir = self.output_dir / chain_name
        chain_dir.mkdir(exist_ok=True, parents=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 保存SVG的HTML代码，使用产业链名称命名
        svg_data = data.get("svg_data", {})
        if svg_data.get("svg_content"):
            html_filename = f"{chain_name}_{timestamp}.txt"
            html_filepath = chain_dir / html_filename
            with open(html_filepath, 'w', encoding='utf-8') as f:
                for idx, svg_html in enumerate(svg_data["svg_content"], 1):
                    f.write(f"\n{'='*80}\n")
                    f.write(f"SVG #{idx + 1}\n")
                    f.write(f"{'='*80}\n")
                    f.write(svg_html)
                    f.write("\n")
            print(f"    [保存] SVG代码已保存: {html_filepath}")
        
        # 保存SVG文件（从URL下载的），使用产业链名称命名
        if svg_data.get("svg_files"):
            for idx, svg_file in enumerate(svg_data["svg_files"], 1):
                svg_url = svg_file["url"]
                
                # 只保存SVG格式的文件
                from urllib.parse import urlparse
                parsed = urlparse(svg_url)
                url_path = parsed.path.lower()
                
                if not url_path.endswith('.svg'):
                    print(f"    [跳过] 非SVG文件，不保存: {svg_url}")
                    continue
                
                # 验证内容是否是SVG格式
                content = svg_file.get("content", "")
                if not content or ('<svg' not in content.lower() and not content.strip().startswith('<?xml')):
                    print(f"    [跳过] 内容不是SVG格式，不保存: {svg_url}")
                    continue
                
                # 使用产业链名称命名SVG文件
                if len(svg_data["svg_files"]) == 1:
                    # 如果只有一个SVG文件，直接使用产业链名称
                    svg_filename = f"{chain_name}_{timestamp}.svg"
                else:
                    # 如果有多个SVG文件，添加序号
                    svg_filename = f"{chain_name}_{timestamp}_{idx}.svg"
                
                svg_filepath = chain_dir / svg_filename
                with open(svg_filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"    [保存] SVG文件已保存: {svg_filepath}")
        
        # 返回保存的txt文件路径（如果没有txt文件，返回第一个SVG文件路径）
        if svg_data.get("svg_content"):
            return html_filepath
        elif svg_data.get("svg_files"):
            return svg_filepath
        else:
            return chain_dir / f"{chain_name}_{timestamp}.txt"
    
    async def _handle_navigation(self, frame, context):
        """
        处理页面导航事件
        
        Args:
            frame: 导航的frame对象
            context: 浏览器上下文对象
        """
        # 只处理主frame的导航
        if frame != frame.page.main_frame:
            return
        
        url = frame.url
        print(f"\n{'='*80}")
        print(f"[导航事件] 检测到导航: {url}")
        print(f"{'='*80}")
        
        # 规范化URL，用于去重检查
        normalized_url = self._normalize_url(url)
        
        # 判断页面类型并处理
        if "chain-info" in url:
            # 处理 chain-info 页面（项目列表采集）
            await self._handle_chain_info_page(frame, context, url)
        elif "chain-detail" in url:
            # 处理 chain-detail 页面（SVG采集，原有逻辑）
            # 如果正在采集同一个URL，跳过（避免重复触发）
            if self.is_collecting and normalized_url in self.collected_urls:
                print(f"[跳过] 该URL正在采集中，跳过重复触发: {normalized_url}")
                return
            await self._handle_chain_detail_page(frame, context, url)
        elif "product-details" in url:
            # 处理 product-details 页面（产品详情采集）
            # 如果正在采集同一个URL，跳过（避免重复触发）
            if self.is_collecting and normalized_url in self.collected_product_details_urls:
                print(f"[跳过] 该URL正在采集中，跳过重复触发: {normalized_url}")
                return
            await self._handle_product_details_page(frame, context, url)
        elif "industry-chain" in url:
            # industry-chain 页面，只提示，不采集（SVG采集通过SVG URL变化监听）
            print(f"[提示] 检测到 industry-chain 页面，请点击产业链按钮")
            print(f"      工具会自动监听SVG URL变化并采集数据")
        else:
            print(f"[跳过] URL不是目标页面类型，跳过处理")
    
    async def _handle_chain_detail_page(self, frame, context, url):
        """
        处理 chain-detail 页面（原有SVG采集逻辑）
        
        Args:
            frame: 导航的frame对象
            context: 浏览器上下文对象
            url: 页面URL
        """
        print(f"[目标URL] 确认是chain-detail页面，开始处理...")
        
        # 规范化URL（去除可能的尾随斜杠和查询参数顺序差异）
        normalized_url = self._normalize_url(url)
        
        # 检查是否正在采集（防止并发重复采集）
        if self.is_collecting:
            print(f"[跳过] 正在采集其他页面，等待完成: {normalized_url}")
            # 等待当前采集完成
            while self.is_collecting:
                await asyncio.sleep(0.5)
            # 采集完成后，再次检查是否已采集
            if normalized_url in self.collected_urls:
                print(f"[跳过] 该URL已在其他任务中采集: {normalized_url}")
                return
        
        # 立即检查并标记，避免并发重复采集（在页面加载之前就检查）
        if normalized_url in self.collected_urls:
            # 已采集过，检查数据是否有更新（不加载页面，只获取URL）
            print(f"\n[检查] 该URL已采集过，检查数据是否有更新: {normalized_url}")
            page = frame.page
            # 快速检查（不下载内容，只获取URL）
            data_updated = await self._quick_check_data_update(page, normalized_url, context)
            if not data_updated:
                print(f"[跳过] 数据未更新，跳过采集（未执行任何下载操作）: {normalized_url}")
                return
            print(f"[数据已更新] 检测到数据变化，将重新采集: {normalized_url}")
        else:
            # 首次采集，立即标记为已采集（在开始处理前就标记，避免并发问题）
            self.collected_urls.add(normalized_url)
            print(f"[标记] URL已标记为已采集: {normalized_url}")
        
        # 检查通过后，才开始页面加载和下载操作
        page = frame.page
        user_interacting = await self._check_user_interacting(page)
        if user_interacting:
            print(f"[警告] 检测到用户操作，但继续尝试采集: {url}")
            # 不返回，继续采集
        
        print(f"[等待页面加载] {url}")
        # 等待页面加载完成
        try:
            await page.wait_for_load_state("networkidle", timeout=20000)
            print("[页面加载] networkidle状态已到达")
        except Exception as e:
            print(f"[警告] 等待networkidle超时: {e}")
        
        # 恢复窗口最大化（保持最大化状态）
        await self._set_window_maximized(page)
        
        # 确保页面可以滚动
        await self._ensure_page_scrollable(page)
        
        # 等待更长时间确保页面完全渲染，特别是object#svgframe元素
        print("[等待页面渲染] 等待8秒确保SVG加载...")
        await asyncio.sleep(8)
        
        # 等待 object#svgframe 元素出现（最多等待15秒）
        element_found = False
        try:
            print("[等待元素] 等待 object#svgframe 元素加载...")
            await page.wait_for_selector('object#svgframe', timeout=15000, state='attached')
            print("[元素就绪] object#svgframe 元素已加载")
            element_found = True
        except Exception as e:
            print(f"[警告] 等待 object#svgframe 元素超时: {e}")
            # 继续尝试，可能元素已经存在但选择器有问题
            # 尝试查找元素是否存在
            element = await page.query_selector('object#svgframe')
            if element:
                print("[元素检查] object#svgframe 元素已存在")
                element_found = True
        
        if not element_found:
            print("[警告] 未找到 object#svgframe 元素，但继续尝试采集...")
        
        # 不再检查用户操作，直接开始采集
        
        # 滚动页面以加载所有懒加载内容
        print("[滚动加载] 开始滚动页面以加载所有内容...")
        await self._scroll_to_load_all_content(page)
        
        # 开始采集
        print(f"\n{'='*80}")
        print(f"[开始采集] {normalized_url}")
        print(f"原始URL: {url}")
        print(f"{'='*80}")
        
        self.is_collecting = True
        # URL已经在前面标记过了，这里不需要再次添加
        
        try:
            # 提取chain_id
            chain_id = self._extract_chain_id(url)
            
            # 采集SVG数据
            svg_data = await self._extract_svg_data(page, context)
            
            # 提取页面信息
            page_info = await self._extract_page_info(page)
            
            # 组合结果
            result = {
                "chain_id": chain_id,
                "url": url,
                "scrape_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "svg_data": svg_data,
                "page_info": page_info
            }
            
            # 保存数据
            output_file = self._save_data(result, chain_id)
            print(f"[采集完成] 数据已保存到: {output_file}")
            
            # 更新数据哈希（用于后续检测数据更新）
            data_hash = self._calculate_data_hash(svg_data)
            self.detail_page_data_hashes[normalized_url] = data_hash
            print(f"[数据哈希] 已更新数据哈希: {data_hash[:8]}...")
            print(f"{'='*80}\n")
            
        except Exception as e:
            print(f"[采集错误] {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            self.is_collecting = False
    
    async def _handle_chain_info_page(self, frame, context, url):
        """
        处理 chain-info 页面，提取项目列表
        
        Args:
            frame: 导航的frame对象
            context: 浏览器上下文对象
            url: 页面URL
        """
        normalized_url = self._normalize_url(url)
        
        # 检查是否正在采集（防止并发重复采集）
        if self.is_collecting:
            print(f"[跳过] 正在采集其他页面，等待完成: {normalized_url}")
            # 等待当前采集完成
            while self.is_collecting:
                await asyncio.sleep(0.5)
            # 采集完成后，再次检查是否已采集
            if normalized_url in self.collected_chain_info_urls:
                print(f"[跳过] 该URL已在其他任务中采集: {normalized_url}")
                return
        
        # 检查是否已经采集过（在页面加载之前就检查）
        is_first_collection = normalized_url not in self.collected_chain_info_urls
        
        if not is_first_collection:
            # 已采集过，直接跳过（chain-info只采集一遍，不执行任何下载操作）
            print(f"[跳过] 该chain-info页面已采集过，跳过采集（未执行任何下载操作）: {normalized_url}")
            return
        else:
            # 首次采集，立即标记为已采集（在开始处理前就标记，避免并发问题）
            self.collected_chain_info_urls.add(normalized_url)
            print(f"[标记] URL已标记为已采集: {normalized_url}")
        
        # 检查通过后，才开始页面加载和下载操作
        page = frame.page
        print(f"[等待页面加载] {url}")
        
        try:
            await page.wait_for_load_state("networkidle", timeout=20000)
            print("[页面加载] networkidle状态已到达")
        except Exception as e:
            print(f"[警告] 等待networkidle超时: {e}")
        
        # 确保页面可以滚动
        await self._ensure_page_scrollable(page)
        
        # 等待表格加载
        print("[等待表格加载] 等待3秒确保表格渲染...")
        await asyncio.sleep(3)
        
        # 滚动页面以加载所有懒加载内容（固定滚动4次）
        print("[滚动加载] 开始滚动页面以加载所有项目数据（固定滚动4次）...")
        await self._scroll_to_load_all_content(page, max_scrolls=4, scroll_delay=2.0, force_scroll=True)
        
        print(f"\n{'='*80}")
        print(f"[开始采集项目列表] {normalized_url}")
        print(f"{'='*80}")
        
        self.is_collecting = True
        
        try:
            # 提取项目列表
            project_list = await self._extract_project_list(page)
            
            # 提取页面信息
            page_info = await self._extract_chain_info_page_info(page, url)
            
            # 组合结果
            result = {
                "url": url,
                "normalized_url": normalized_url,
                "scrape_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "page_info": page_info,
                "project_list": project_list,
                "project_count": len(project_list)
            }
            
            # 保存数据
            # 使用产业链名称作为文件夹名，细分领域名称作为文件名
            main_chain_name = page_info.get("chain_name")  # 产业链名称（用于文件夹）
            sub_chain_name = page_info.get("sub_chain_name")  # 细分领域名称（用于文件名）
            
            # 如果产业链名称不存在，尝试使用细分领域名称作为备选
            if not main_chain_name:
                main_chain_name = sub_chain_name or "unknown"
            
            # 如果细分领域名称不存在，使用产业链名称
            if not sub_chain_name:
                sub_chain_name = main_chain_name or "unknown"
            
            output_file = self._save_chain_info_data(result, main_chain_name, sub_chain_name)
            print(f"[采集完成] 数据已保存到: {output_file}")
            print(f"[项目数量] 共采集 {len(project_list)} 个项目")
            
            # 更新数据哈希（用于后续检测数据更新）
            data_hash = self._calculate_chain_info_data_hash(project_list)
            self.chain_info_page_data_hashes[normalized_url] = data_hash
            print(f"[数据哈希] 已更新数据哈希: {data_hash[:8]}...")
            print(f"{'='*80}\n")
            
        except Exception as e:
            print(f"[采集错误] {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            self.is_collecting = False
    
    async def _handle_product_details_page(self, frame, context, url):
        """
        处理 product-details 页面，提取产品详情数据
        
        Args:
            frame: 导航的frame对象
            context: 浏览器上下文对象
            url: 页面URL
        """
        normalized_url = self._normalize_url(url)
        
        # 检查是否正在采集（防止并发重复采集）
        if self.is_collecting:
            print(f"[跳过] 正在采集其他页面，等待完成: {normalized_url}")
            # 等待当前采集完成
            while self.is_collecting:
                await asyncio.sleep(0.5)
            # 采集完成后，再次检查是否已采集
            if normalized_url in self.collected_product_details_urls:
                print(f"[跳过] 该URL已在其他任务中采集: {normalized_url}")
                return
        
        # 检查是否已经采集过（在页面加载之前就检查）
        is_first_collection = normalized_url not in self.collected_product_details_urls
        
        if not is_first_collection:
            # 已采集过，直接跳过（product-details只采集一遍，不进行数据更新检测）
            print(f"[跳过] 该product-details页面已采集过，跳过采集（未执行任何下载操作）: {normalized_url}")
            return
        else:
            # 首次采集，立即标记为已采集（在开始处理前就标记，避免并发问题）
            self.collected_product_details_urls.add(normalized_url)
            print(f"[标记] URL已标记为已采集: {normalized_url}")
        
        # 检查通过后，才开始页面加载和下载操作
        page = frame.page
        print(f"[等待页面加载] {url}")
        
        # 无感采集：等待3秒后自动采集，不进行滚动操作，不影响用户使用
        print("[无感采集] 等待3秒后自动采集，不进行滚动操作...")
        await asyncio.sleep(3)
        
        print(f"\n{'='*80}")
        print(f"[开始采集产品详情] {normalized_url}")
        print(f"{'='*80}")
        
        self.is_collecting = True
        
        try:
            # 提取产品详情数据（项目名称、公司名称和工商信息）
            product_data = await self._extract_product_details_data(page)
            
            # 提取页面信息
            page_info = await self._extract_product_details_page_info(page, url)
            
            # 组合结果
            result = {
                "url": url,
                "normalized_url": normalized_url,
                "scrape_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "page_info": page_info,
                "project_name": product_data.get("project_name", ""),
                "company_name": product_data.get("company_name", ""),
                "business_info": product_data.get("business_info", {})
            }
            
            # 保存数据
            project_name = product_data.get("project_name") or page_info.get("project_name", "unknown")
            output_file = self._save_product_details_data(result, project_name)
            print(f"[采集完成] 数据已保存到: {output_file}")
            
            # 更新数据哈希（用于后续检测数据更新）
            data_hash = self._calculate_product_details_data_hash(product_data)
            self.product_details_page_data_hashes[normalized_url] = data_hash
            print(f"[数据哈希] 已更新数据哈希: {data_hash[:8]}...")
            print(f"{'='*80}\n")
            
        except Exception as e:
            print(f"[采集错误] {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            self.is_collecting = False
    
    async def _extract_project_list(self, page):
        """从页面提取项目列表"""
        project_list = await page.evaluate("""
            () => {
                const projects = [];
                
                // 查找表格
                const table = document.querySelector('table.shadow-table, table');
                if (!table) {
                    console.log('未找到表格');
                    return projects;
                }
                
                // 查找表格体
                const tbody = table.querySelector('tbody.table-tbody, tbody');
                if (!tbody) {
                    console.log('未找到表格体');
                    return projects;
                }
                
                // 提取所有行
                const rows = tbody.querySelectorAll('tr');
                console.log(`找到 ${rows.length} 行数据`);
                
                rows.forEach((row, index) => {
                    try {
                        const cells = row.querySelectorAll('td');
                        if (cells.length < 7) {
                            return; // 跳过不完整的行
                        }
                        
                        // 提取项目名称
                        const nameCell = cells[0];
                        const nameLink = nameCell.querySelector('a');
                        const projectName = nameLink ? (nameLink.textContent || nameLink.getAttribute('title') || '').trim() : '';
                        
                        // 提取业务简述
                        const businessCell = cells[1];
                        const businessText = businessCell ? (businessCell.textContent || '').trim() : '';
                        
                        // 提取项目地区
                        const regionCell = cells[2];
                        const region = regionCell ? (regionCell.textContent || '').trim() : '';
                        
                        // 提取轮次
                        const roundCell = cells[3];
                        const round = roundCell ? (roundCell.textContent || '').trim() : '';
                        
                        // 提取时间
                        const timeCell = cells[4];
                        const time = timeCell ? (timeCell.textContent || '').trim() : '';
                        
                        // 提取金额
                        const amountCell = cells[5];
                        const amount = amountCell ? (amountCell.textContent || '').trim() : '';
                        
                        // 提取投资方
                        const investorCell = cells[6];
                        const investors = investorCell ? (investorCell.textContent || '').trim() : '';
                        
                        // 提取链接
                        let projectUrl = '';
                        if (nameLink) {
                            // 获取href属性
                            projectUrl = nameLink.getAttribute('href') || '';
                            // 如果是相对路径，转换为绝对路径
                            if (projectUrl && !projectUrl.startsWith('http')) {
                                if (projectUrl.startsWith('/')) {
                                    projectUrl = 'https://www.hanghangcha.com' + projectUrl;
                                } else {
                                    projectUrl = 'https://www.hanghangcha.com/' + projectUrl;
                                }
                            }
                            // 如果还是没有，尝试从其他属性获取
                            if (!projectUrl) {
                                projectUrl = nameLink.getAttribute('data-url') || nameLink.getAttribute('data-href') || '';
                            }
                        }
                        
                        if (projectName) {
                            projects.push({
                                project_name: projectName,
                                business_description: businessText,
                                region: region,
                                round: round,
                                time: time,
                                amount: amount,
                                investors: investors,
                                project_url: projectUrl,
                                row_index: index + 1
                            });
                        }
                    } catch (e) {
                        console.error(`提取第 ${index + 1} 行数据时出错:`, e);
                    }
                });
                
                return projects;
            }
        """)
        
        return project_list or []
    
    async def _extract_chain_info_page_info(self, page, url):
        """提取chain-info页面信息（区分产业链名称和细分领域名称）"""
        page_info = {}
        
        try:
            page_info["title"] = await page.title()
            page_info["url"] = url
            
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            
            # 提取细分领域名称（用于文件名）
            sub_chain_name = None
            if "title" in params:
                sub_chain_name = params["title"][0]
            
            # 如果URL中没有，从页面标题提取（这通常是细分领域名称）
            if not sub_chain_name:
                sub_chain_name = await page.evaluate("""
                    () => {
                        const titleElement = document.querySelector('.infotitle, .page-title, h1, h2');
                        if (titleElement) {
                            return titleElement.textContent.trim();
                        }
                        return '';
                    }
                """)
            
            if sub_chain_name:
                page_info["sub_chain_name"] = sub_chain_name  # 细分领域名称
            
            # 提取产业链名称（用于文件夹名）
            # 方法1: 从URL参数中提取（如果有chain或parent参数）
            main_chain_name = None
            if "chain" in params:
                main_chain_name = params["chain"][0]
            elif "parent" in params:
                main_chain_name = params["parent"][0]
            elif "chainName" in params:
                main_chain_name = params["chainName"][0]
            
            # 方法2: 从页面中提取产业链名称（面包屑导航、导航栏等）
            if not main_chain_name:
                main_chain_name = await page.evaluate("""
                    () => {
                        // 方法1: 从面包屑导航中提取
                        const breadcrumb = document.querySelector('.el-breadcrumb, .breadcrumb');
                        if (breadcrumb) {
                            const items = breadcrumb.querySelectorAll('.el-breadcrumb__item, .breadcrumb-item');
                            if (items.length >= 2) {
                                // 通常第一个是产业链名称
                                for (let i = 0; i < items.length; i++) {
                                    const text = items[i].textContent.trim();
                                    // 跳过常见的导航文本
                                    if (text && text !== '项目' && text !== '首页' && text !== '项目详情' && 
                                        text !== '项目列表' && text.length > 0 && text.length < 30) {
                                        // 检查是否是产业链名称（通常不会太短）
                                        if (text.length >= 2) {
                                            return text;
                                        }
                                    }
                                }
                            }
                        }
                        
                        // 方法2: 从导航栏或标签页中提取
                        const navItems = document.querySelectorAll('.nav-item.active, .tab-item.active, [class*="chain"][class*="active"]');
                        for (let item of navItems) {
                            const text = item.textContent.trim();
                            if (text && text.length >= 2 && text.length < 30) {
                                return text;
                            }
                        }
                        
                        // 方法3: 从页面标题的特定位置提取
                        const chainTitleElement = document.querySelector('.chain-title, .main-chain-name, [data-chain-name]');
                        if (chainTitleElement) {
                            const text = chainTitleElement.textContent.trim() || chainTitleElement.getAttribute('data-chain-name');
                            if (text) return text;
                        }
                        
                        return '';
                    }
                """)
            
            # 如果还是没找到，从SVG输出目录（output_dir/svg_output）中查找产业链名称
            # output_dir下的每个文件夹名就是产业链名称
            if not main_chain_name:
                main_chain_name = self._find_chain_name_from_svg_output(url, sub_chain_name)
            
            if main_chain_name:
                page_info["chain_name"] = main_chain_name  # 产业链名称（用于文件夹）
            
            # 提取描述
            description = await page.evaluate("""
                () => {
                    const descElement = document.querySelector('.infodesc, .page-desc, .description');
                    if (descElement) {
                        return descElement.textContent.trim();
                    }
                    return '';
                }
            """)
            
            if description:
                page_info["description"] = description
                
        except Exception as e:
            print(f"[提取页面信息错误] {e}")
            import traceback
            traceback.print_exc()
        
        return page_info
    
    async def _extract_product_details_data(self, page):
        """从product-details页面提取产品详情数据（项目名称、公司名称和工商信息）"""
        product_data = {
            "project_name": "",
            "company_name": "",
            "business_info": {}
        }
        
        try:
            # 提取项目名称和公司名称
            info = await page.evaluate("""
                () => {
                    const data = {
                        project_name: "",
                        company_name: ""
                    };
                    
                    // 提取项目名称
                    const projectNameEl = document.querySelector('.bodies-header-info p');
                    if (projectNameEl) {
                        data.project_name = projectNameEl.textContent.trim();
                    }
                    
                    // 提取公司名称
                    const companyEl = document.querySelector('.bodies-header-info .bodies-header-corp a');
                    if (companyEl) {
                        data.company_name = companyEl.textContent.trim();
                    }
                    
                    return data;
                }
            """)
            product_data["project_name"] = info.get("project_name", "")
            product_data["company_name"] = info.get("company_name", "")
            
            # 提取工商信息
            business_info = await page.evaluate("""
                () => {
                    const info = {};
                    const businessMain = document.querySelector('#business .business-main');
                    if (!businessMain) return info;
                    
                    // 将中文键名转换为英文键名
                    const keyMap = {
                        '法定代表人': 'legal_representative',
                        '经营状况': 'business_status',
                        '成立日期': 'establishment_date',
                        '注册资本': 'registered_capital',
                        '实缴资本': 'paid_in_capital',
                        '核准日期': 'approval_date',
                        '统一信用代码': 'unified_social_credit_code',
                        '组织机构代码': 'organization_code',
                        '工商注册号': 'business_registration_number',
                        '纳税人识别号': 'taxpayer_id',
                        '进出口企业代码': 'import_export_code',
                        '所属行业': 'industry',
                        '企业类型': 'enterprise_type',
                        '营业期限': 'business_term',
                        '登记机关': 'registration_authority',
                        '人员规模': 'staff_size',
                        '参保人数': 'insured_count',
                        '所属地区': 'region',
                        '曾用名': 'former_name',
                        '企业地址': 'address',
                        '经营范围': 'business_scope'
                    };
                    
                    // 获取所有子元素（包括标题和内容）
                    const allChildren = Array.from(businessMain.children);
                    
                    // 遍历所有子元素，查找标题元素
                    for (let i = 0; i < allChildren.length; i++) {
                        const element = allChildren[i];
                        const isTitle = element.classList.contains('business-title-h') || element.classList.contains('business-title');
                        
                        if (isTitle) {
                            const key = element.textContent.trim();
                            if (!key) continue;
                            
                            // 查找下一个内容元素（应该是紧邻的下一个元素）
                            let contentEl = null;
                            for (let j = i + 1; j < allChildren.length; j++) {
                                const nextEl = allChildren[j];
                                if (nextEl.classList.contains('business-content-h') || nextEl.classList.contains('business-content')) {
                                    contentEl = nextEl;
                                    break;
                                }
                                // 如果遇到下一个标题，说明当前标题没有对应的内容，跳出
                                if (nextEl.classList.contains('business-title-h') || nextEl.classList.contains('business-title')) {
                                    break;
                                }
                            }
                            
                            if (contentEl) {
                                let value = contentEl.textContent.trim();
                                // 对于参保人数，提取数字部分（去除SVG图标等）
                                if (key === '参保人数') {
                                    // 移除所有非数字字符，只保留数字
                                    const match = value.match(/\\d+/);
                                    if (match) {
                                        value = match[0];
                                    }
                                }
                                
                                if (value && value !== '-') {
                                    const enKey = keyMap[key] || key;
                                    info[enKey] = value;
                                }
                            }
                        }
                    }
                    
                    // 特殊处理经营范围（在 describe-box 中）
                    const describeBox = businessMain.querySelector('.describe-box');
                    if (describeBox) {
                        const describeTitle = describeBox.querySelector('.business-describe-title');
                        const describeContent = describeBox.querySelector('.business-describe');
                        if (describeTitle && describeContent) {
                            const key = describeTitle.textContent.trim();
                            const value = describeContent.textContent.trim();
                            if (key === '经营范围' && value) {
                                info['business_scope'] = value;
                            }
                        }
                    }
                    
                    return info;
                }
            """)
            product_data["business_info"] = business_info
            
        except Exception as e:
            print(f"[提取产品详情数据错误] {e}")
            import traceback
            traceback.print_exc()
        
        return product_data
    
    async def _extract_product_details_page_info(self, page, url):
        """提取product-details页面信息"""
        page_info = {}
        
        try:
            page_info["title"] = await page.title()
            page_info["url"] = url
            
            # 提取项目名称
            project_name = await page.evaluate("""
                () => {
                    const nameEl = document.querySelector('.bodies-header-info p');
                    if (nameEl) {
                        return nameEl.textContent.trim();
                    }
                    return '';
                }
            """)
            
            if project_name:
                page_info["project_name"] = project_name
                
        except Exception as e:
            print(f"[提取页面信息错误] {e}")
        
        return page_info
    
    def _save_chain_info_data(self, data: dict, main_chain_name: str, sub_chain_name: str):
        """
        保存项目列表数据（最新数据覆盖之前的文件）
        
        Args:
            data: 要保存的数据字典
            main_chain_name: 产业链名称（用于创建文件夹）
            sub_chain_name: 细分领域名称（用于文件名）
        """
        # 清理产业链名称（用于文件夹）
        main_chain_name = re.sub(r'[<>:"/\\|?*]', '_', main_chain_name)
        main_chain_name = main_chain_name.strip()
        
        if not main_chain_name:
            main_chain_name = "unknown"
        
        # 清理细分领域名称（用于文件名）
        sub_chain_name = re.sub(r'[<>:"/\\|?*]', '_', sub_chain_name)
        sub_chain_name = sub_chain_name.strip()
        
        if not sub_chain_name:
            sub_chain_name = "unknown"
        
        # 在chain_info_output_dir下创建以产业链名称命名的子目录
        chain_dir = self.chain_info_output_dir / main_chain_name
        chain_dir.mkdir(exist_ok=True, parents=True)
        
        # 不使用时间戳，使用固定文件名，新数据会覆盖旧数据
        # 保存JSON文件（使用细分领域名称作为文件名）
        json_filename = f"{sub_chain_name}.json"
        json_filepath = chain_dir / json_filename
        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"    [保存] JSON数据已保存（覆盖）: {json_filepath}")
        
        # 保存CSV文件（使用细分领域名称作为文件名）
        csv_filename = f"{sub_chain_name}.csv"
        csv_filepath = chain_dir / csv_filename
        
        project_list = data.get("project_list", [])
        if project_list:
            fieldnames = [
                "project_name", "business_description", "region", 
                "round", "time", "amount", "investors", "project_url", "row_index"
            ]
            
            with open(csv_filepath, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                # 只写入fieldnames中定义的字段
                filtered_list = []
                for item in project_list:
                    filtered_item = {k: v for k, v in item.items() if k in fieldnames}
                    filtered_list.append(filtered_item)
                writer.writerows(filtered_list)
            print(f"    [保存] CSV数据已保存: {csv_filepath}")
        
        return json_filepath
    
    def _save_product_details_data(self, data: dict, project_name: str):
        """保存product-details页面数据（最新数据覆盖之前的文件，仅保存项目名称和公司名称）"""
        # 清理文件名
        project_name = re.sub(r'[<>:"/\\|?*]', '_', project_name)
        project_name = project_name.strip()
        
        if not project_name:
            project_name = "unknown"
        
        # 不使用时间戳，使用固定文件名，新数据会覆盖旧数据
        # 保存JSON文件
        json_filename = f"{project_name}.json"
        json_filepath = self.product_details_output_dir / json_filename
        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"    [保存] JSON数据已保存（覆盖）: {json_filepath}")
        
        return json_filepath
    
    def _calculate_product_details_data_hash(self, product_data: dict) -> str:
        """
        计算product-details页面数据哈希值，用于检测数据是否更新
        
        Args:
            product_data: 产品详情数据字典（包含项目名称、公司名称和工商信息）
            
        Returns:
            str: 数据哈希值
        """
        import hashlib
        import json
        
        try:
            # 提取关键数据用于哈希计算（项目名称、公司名称和工商信息）
            business_info = product_data.get("business_info", {})
            hash_data = {
                "project_name": product_data.get("project_name", ""),
                "company_name": product_data.get("company_name", ""),
                "business_info_keys": sorted(business_info.keys()),
                "business_info_values": sorted(business_info.values())
            }
            
            # 将数据转换为JSON字符串并计算哈希
            data_str = json.dumps(hash_data, sort_keys=True, ensure_ascii=False)
            hash_obj = hashlib.md5(data_str.encode('utf-8'))
            return hash_obj.hexdigest()
        except Exception as e:
            print(f"[警告] 计算product-details数据哈希失败: {e}")
            return ""
    
    async def _quick_check_product_details_data_update(self, page, normalized_url: str) -> bool:
        """
        快速检查product-details页面数据是否有更新（不完整采集，只检查哈希）
        无感检查：不进行滚动操作，不影响用户使用
        
        Args:
            page: Playwright页面对象
            normalized_url: 规范化后的URL
            
        Returns:
            bool: 如果数据有更新返回True，否则返回False
        """
        try:
            # 无感检查：等待2秒后直接提取数据，不进行滚动操作，不影响用户使用
            await asyncio.sleep(2)
            
            # 快速提取产品详情数据（用于哈希计算）
            product_data = await self._extract_product_details_data(page)
            
            # 计算当前数据哈希
            current_hash = self._calculate_product_details_data_hash(product_data)
            
            if not current_hash:
                # 如果无法计算哈希，返回False（不触发重新采集）
                return False
            
            # 获取之前保存的哈希
            previous_hash = self.product_details_page_data_hashes.get(normalized_url)
            
            if previous_hash is None:
                # 第一次检查，保存哈希但不触发采集
                self.product_details_page_data_hashes[normalized_url] = current_hash
                return False
            
            # 比较哈希值
            if current_hash != previous_hash:
                print(f"[数据更新检测] 检测到product-details页面数据变化: {normalized_url}")
                print(f"  旧哈希: {previous_hash[:8]}...")
                print(f"  新哈希: {current_hash[:8]}...")
                # 更新哈希值
                self.product_details_page_data_hashes[normalized_url] = current_hash
                return True
            
            return False
        except Exception as e:
            print(f"[product-details数据更新检测错误] {e}")
            return False
    
    def _normalize_url(self, url: str) -> str:
        """
        规范化URL，用于避免重复采集
        
        Args:
            url: 原始URL
            
        Returns:
            str: 规范化后的URL
        """
        try:
            from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
            
            # 解析URL
            parsed = urlparse(url)
            
            # 规范化查询参数（排序）
            if parsed.query:
                params = parse_qs(parsed.query, keep_blank_values=True)
                # 对参数值进行排序（如果值是列表）
                sorted_params = {}
                for key, value_list in sorted(params.items()):
                    sorted_params[key] = sorted(value_list) if isinstance(value_list, list) else value_list
                # 重新编码查询字符串
                query = urlencode(sorted_params, doseq=True)
            else:
                query = parsed.query
            
            # 去除尾随斜杠（除了根路径）
            path = parsed.path.rstrip('/') if parsed.path != '/' else parsed.path
            
            # 重新构建URL
            normalized = urlunparse((
                parsed.scheme,
                parsed.netloc,
                path,
                parsed.params,
                query,
                ''  # 去除fragment
            ))
            
            return normalized
        except Exception as e:
            # 如果规范化失败，返回原始URL
            print(f"[警告] URL规范化失败: {e}, 使用原始URL")
            return url
    
    def _extract_chain_id(self, url: str) -> str:
        """
        从URL中提取chain_id
        
        Args:
            url: 页面URL
            
        Returns:
            str: chain_id
        """
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            chain_id = params.get('id', ['unknown'])[0]
            return chain_id
        except:
            return "unknown"
    
    def _find_chain_name_from_svg_output(self, url: str, sub_chain_name: str = None) -> str:
        """
        从SVG输出目录（output_dir）中查找产业链名称
        output_dir下的每个文件夹名就是产业链名称
        
        Args:
            url: chain-info页面的URL
            sub_chain_name: 细分领域名称（可选，用于匹配）
            
        Returns:
            str: 产业链名称，如果找不到返回空字符串
        """
        try:
            import json
            from urllib.parse import urlparse, parse_qs
            
            # 方法1: 通过chain_id查找
            chain_id = None
            if "id=" in url:
                parsed = urlparse(url)
                params = parse_qs(parsed.query)
                if "id" in params:
                    chain_id = params["id"][0]
            
            # 从output_dir的文件夹中查找
            # output_dir下的每个文件夹名就是产业链名称
            if not self.output_dir.exists():
                return ""
            
            # 获取所有子目录（每个目录名就是一个产业链名称）
            chain_dirs = [d for d in self.output_dir.iterdir() if d.is_dir()]
            if not chain_dirs:
                return ""
            
            # 如果只有一个文件夹，直接使用
            if len(chain_dirs) == 1:
                chain_name = chain_dirs[0].name
                print(f"    [从SVG输出目录] 找到产业链名称: {chain_name}")
                return chain_name
            
            # 如果有多个文件夹，尝试通过chain_id匹配
            if chain_id:
                for chain_dir in chain_dirs:
                    # 查找该文件夹下的JSON文件，看是否包含该chain_id
                    json_files = list(chain_dir.glob("*.json"))
                    for json_file in json_files:
                        try:
                            with open(json_file, 'r', encoding='utf-8') as f:
                                json_data = json.load(f)
                                if json_data.get("chain_id") == chain_id:
                                    chain_name = chain_dir.name
                                    print(f"    [从SVG输出目录] 通过chain_id找到产业链名称: {chain_name}")
                                    return chain_name
                        except:
                            continue
            
            # 如果chain_id匹配失败，使用最近修改的文件夹（通常是最新采集的产业链）
            chain_dirs_sorted = sorted(chain_dirs, key=lambda x: x.stat().st_mtime, reverse=True)
            if chain_dirs_sorted:
                chain_name = chain_dirs_sorted[0].name
                print(f"    [从SVG输出目录] 使用最近修改的产业链文件夹: {chain_name}")
                return chain_name
            
            return ""
            
        except Exception as e:
            print(f"    [从SVG输出目录查找错误] {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def _calculate_data_hash(self, svg_data: dict) -> str:
        """
        计算数据哈希值，用于检测数据是否更新
        
        Args:
            svg_data: SVG数据字典
            
        Returns:
            str: 数据哈希值
        """
        import hashlib
        import json
        
        try:
            # 提取关键数据用于哈希计算
            hash_data = {
                "svg_count": svg_data.get("svg_count", 0),
                "svg_urls": sorted(svg_data.get("svg_urls", [])),
                "svg_content_lengths": [len(content) for content in svg_data.get("svg_content", [])]
            }
            
            # 将数据转换为JSON字符串并计算哈希
            data_str = json.dumps(hash_data, sort_keys=True, ensure_ascii=False)
            hash_obj = hashlib.md5(data_str.encode('utf-8'))
            return hash_obj.hexdigest()
        except Exception as e:
            print(f"[警告] 计算数据哈希失败: {e}")
            return ""
    
    def _calculate_chain_info_data_hash(self, project_list: list) -> str:
        """
        计算项目列表数据哈希值，用于检测数据是否更新
        
        Args:
            project_list: 项目列表
            
        Returns:
            str: 数据哈希值
        """
        import hashlib
        import json
        
        try:
            # 提取关键数据用于哈希计算
            hash_data = {
                "project_count": len(project_list),
                "project_names": sorted([p.get("project_name", "") for p in project_list]),
                "project_urls": sorted([p.get("project_url", "") for p in project_list])
            }
            
            # 将数据转换为JSON字符串并计算哈希
            data_str = json.dumps(hash_data, sort_keys=True, ensure_ascii=False)
            hash_obj = hashlib.md5(data_str.encode('utf-8'))
            return hash_obj.hexdigest()
        except Exception as e:
            print(f"[警告] 计算项目列表数据哈希失败: {e}")
            return ""
    
    async def _quick_check_data_update(self, page, normalized_url: str, context=None) -> bool:
        """
        快速检查详情页数据是否有更新（不完整采集，只检查SVG URL，不下载内容）
        
        Args:
            page: Playwright页面对象
            normalized_url: 规范化后的URL
            context: 浏览器上下文对象（可选，但不使用，避免下载）
            
        Returns:
            bool: 如果数据有更新返回True，否则返回False
        """
        try:
            # 等待页面稳定
            await asyncio.sleep(1)
            
            # 只获取SVG URL，不下载内容（轻量级检查）
            svg_url = None
            try:
                # 查找 id='svgframe' 的 object 标签
                svgframe_object = await page.query_selector('object#svgframe')
                if not svgframe_object:
                    svgframe_object = await page.query_selector('object[id="svgframe"]')
                
                if svgframe_object:
                    # 只获取URL，不下载内容
                    obj_attrs = await svgframe_object.evaluate('''el => {
                        const attrs = {};
                        for (let attr of el.attributes) {
                            attrs[attr.name] = attr.value;
                        }
                        return attrs;
                    }''')
                    svg_url = obj_attrs.get('data') or obj_attrs.get('src')
                    
                    # 处理相对URL（仅用于哈希计算，不实际下载）
                    if svg_url:
                        if svg_url.startswith('//'):
                            svg_url = 'https:' + svg_url
                        elif svg_url.startswith('/'):
                            svg_url = 'https://www.hanghangcha.com' + svg_url
                        elif not svg_url.startswith('http'):
                            svg_url = 'https://www.hanghangcha.com/' + svg_url
            except Exception as e:
                # 如果获取URL失败，使用normalized_url作为标识
                svg_url = normalized_url
            
            # 使用SVG URL作为哈希标识（不下载内容）
            # 如果SVG URL变化，说明数据可能更新了
            current_hash = self._calculate_simple_hash(svg_url or normalized_url)
            
            if not current_hash:
                # 如果无法计算哈希，返回False（不触发重新采集）
                return False
            
            # 获取之前保存的哈希
            previous_hash = self.detail_page_data_hashes.get(normalized_url)
            
            if previous_hash is None:
                # 第一次检查，保存哈希但不触发采集
                self.detail_page_data_hashes[normalized_url] = current_hash
                return False
            
            # 比较哈希值
            if current_hash != previous_hash:
                print(f"[数据更新检测] 检测到SVG URL变化: {normalized_url}")
                print(f"  旧哈希: {previous_hash[:8]}...")
                print(f"  新哈希: {current_hash[:8]}...")
                # 更新哈希值
                self.detail_page_data_hashes[normalized_url] = current_hash
                return True
            
            return False
        except Exception as e:
            print(f"[数据更新检测错误] {e}")
            return False
    
    def _calculate_simple_hash(self, text: str) -> str:
        """
        计算简单哈希值（用于快速检查，不涉及文件下载）
        
        Args:
            text: 要计算哈希的文本
            
        Returns:
            str: 哈希值
        """
        import hashlib
        if not text:
            return ""
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    async def _quick_check_chain_info_data_update(self, page, normalized_url: str) -> bool:
        """
        快速检查chain-info页面数据是否有更新（不完整采集，只检查哈希）
        
        Args:
            page: Playwright页面对象
            normalized_url: 规范化后的URL
            
        Returns:
            bool: 如果数据有更新返回True，否则返回False
        """
        try:
            # 等待页面稳定
            await asyncio.sleep(2)
            
            # 确保页面可以滚动
            await self._ensure_page_scrollable(page)
            
            # 滚动页面以加载所有懒加载内容（快速滚动，减少等待时间）
            await self._scroll_to_load_all_content(page, max_scrolls=4, scroll_delay=1.5)
            
            # 快速提取项目列表（用于哈希计算）
            project_list = await self._extract_project_list(page)
            
            # 计算当前数据哈希
            current_hash = self._calculate_chain_info_data_hash(project_list)
            
            if not current_hash:
                # 如果无法计算哈希，返回False（不触发重新采集）
                return False
            
            # 获取之前保存的哈希
            previous_hash = self.chain_info_page_data_hashes.get(normalized_url)
            
            if previous_hash is None:
                # 第一次检查，保存哈希但不触发采集
                self.chain_info_page_data_hashes[normalized_url] = current_hash
                return False
            
            # 比较哈希值
            if current_hash != previous_hash:
                print(f"[数据更新检测] 检测到chain-info页面数据变化: {normalized_url}")
                print(f"  旧哈希: {previous_hash[:8]}...")
                print(f"  新哈希: {current_hash[:8]}...")
                # 更新哈希值
                self.chain_info_page_data_hashes[normalized_url] = current_hash
                return True
            
            return False
        except Exception as e:
            print(f"[chain-info数据更新检测错误] {e}")
            return False
    
    async def _extract_svg_data(self, page, context):
        """
        从页面提取SVG数据 - 只采集 id='svgframe' 的 object 标签中的 SVG
        
        Args:
            page: Playwright页面对象
            context: 浏览器上下文对象
            
        Returns:
            dict: SVG数据字典
        """
        svg_data = {
            "svg_elements": [],
            "svg_content": [],
            "svg_urls": [],
            "svg_files": [],
            "svg_count": 0,
            "object_tags": []
        }
        
        try:
            # 只查找 id='svgframe' 的 object 标签
            # 尝试多种选择器方式
            svgframe_object = await page.query_selector('object#svgframe')
            
            if not svgframe_object:
                # 尝试其他可能的选择器
                svgframe_object = await page.query_selector('object[id="svgframe"]')
            
            if not svgframe_object:
                # 尝试查找所有object标签，然后筛选
                all_objects = await page.query_selector_all('object')
                print(f"  页面中共有 {len(all_objects)} 个object标签")
                for obj in all_objects:
                    obj_id = await obj.get_attribute('id')
                    if obj_id == 'svgframe':
                        svgframe_object = obj
                        break
            
            if not svgframe_object:
                print("  [错误] 未找到 id='svgframe' 的 object 标签")
                print("  [调试] 尝试查找所有object标签的id属性...")
                all_objects = await page.query_selector_all('object')
                for idx, obj in enumerate(all_objects):
                    obj_id = await obj.get_attribute('id')
                    obj_type = await obj.get_attribute('type')
                    print(f"    object #{idx}: id={obj_id}, type={obj_type}")
                return svg_data
            
            print("  [成功] 找到 id='svgframe' 的 object 标签")
            
            # 等待object标签加载完成
            await asyncio.sleep(2)
            
            # 获取object标签的属性
            obj_attrs = await svgframe_object.evaluate('''el => {
                const attrs = {};
                for (let attr of el.attributes) {
                    attrs[attr.name] = attr.value;
                }
                return attrs;
            }''')
            
            print(f"    object标签属性: {obj_attrs}")
            
            # 方法1: 尝试从object的contentDocument中获取SVG（最直接的方法）
            try:
                print("    [方法1] 尝试从object.contentDocument获取SVG...")
                svg_content = await svgframe_object.evaluate('''el => {
                    try {
                        // 获取object的contentDocument
                        const doc = el.contentDocument;
                        if (doc) {
                            // 查找SVG元素
                            const svg = doc.querySelector('svg');
                            if (svg) {
                                return svg.outerHTML;
                            }
                            // 如果没有SVG元素，返回整个文档内容
                            return doc.documentElement.outerHTML;
                        }
                        return null;
                    } catch (e) {
                        return null;
                    }
                }''')
                
                if svg_content:
                    svg_data["svg_content"].append(svg_content)
                    svg_data["svg_count"] = 1
                    print(f"    ✓ [方法1成功] 从contentDocument获取SVG ({len(svg_content)} 字符)")
                    svg_data["object_tags"].append({
                        "index": 0,
                        "attributes": obj_attrs,
                        "method": "contentDocument"
                    })
                    return svg_data
                else:
                    print("    ✗ [方法1失败] contentDocument为空或无法访问")
            except Exception as e:
                print(f"    ✗ [方法1失败] 错误: {e}")
            
            # 方法2: 尝试从data/src URL下载
            svg_url = obj_attrs.get('data') or obj_attrs.get('src')
            
            if svg_url:
                # 处理相对URL
                if svg_url.startswith('//'):
                    svg_url = 'https:' + svg_url
                elif svg_url.startswith('/'):
                    svg_url = 'https://www.hanghangcha.com' + svg_url
                elif not svg_url.startswith('http'):
                    svg_url = 'https://www.hanghangcha.com/' + svg_url
                
                print(f"    [方法2] 发现SVG URL: {svg_url}")
                svg_data["svg_urls"].append(svg_url)
                
                # 尝试下载SVG内容
                svg_content = await self._download_svg(context, svg_url)
                if svg_content:
                    svg_data["svg_content"].append(svg_content)
                    svg_data["svg_files"].append({
                        "url": svg_url,
                        "content": svg_content,
                        "size": len(svg_content)
                    })
                    svg_data["svg_count"] = 1
                    print(f"    ✓ [方法2成功] 下载SVG内容 ({len(svg_content)} 字符)")
                    svg_data["object_tags"].append({
                        "index": 0,
                        "attributes": obj_attrs,
                        "svg_url": svg_url,
                        "method": "download"
                    })
                    return svg_data
                else:
                    print(f"    ✗ [方法2失败] 下载SVG失败")
            
            # 方法3: 尝试获取object标签的innerHTML/content
            print("    [方法3] 尝试从object标签内容中提取SVG...")
            try:
                # 获取object标签的内容
                object_content = await svgframe_object.inner_html()
                if not object_content:
                    object_content = await svgframe_object.evaluate('el => el.innerHTML')
                
                if object_content:
                    import re
                    # 从内容中提取SVG
                    svg_match = re.search(r'<svg[^>]*>.*?</svg>', object_content, re.DOTALL)
                    if svg_match:
                        svg_content = svg_match.group(0)
                        svg_data["svg_content"].append(svg_content)
                        svg_data["svg_count"] = 1
                        print(f"    ✓ [方法3成功] 从object内容中提取SVG ({len(svg_content)} 字符)")
                        svg_data["object_tags"].append({
                            "index": 0,
                            "attributes": obj_attrs,
                            "method": "innerHTML"
                        })
                        return svg_data
                    else:
                        print(f"    ✗ [方法3失败] object内容中未找到SVG标签")
                        print(f"    [调试] object内容预览: {object_content[:200]}...")
            except Exception as e:
                print(f"    ✗ [方法3失败] 错误: {e}")
            
            # 如果所有方法都失败
            print("    [错误] 所有方法都失败，无法获取SVG内容")
            svg_data["object_tags"].append({
                "index": 0,
                "attributes": obj_attrs,
                "error": "无法获取SVG内容"
            })
            
        except Exception as e:
            print(f"  提取SVG数据时出错: {e}")
            import traceback
            traceback.print_exc()
        
        return svg_data
    
    async def _download_svg(self, context, svg_url: str):
        """
        下载SVG文件内容（只下载SVG格式）
        使用HTTP请求直接下载，不影响浏览器窗口
        
        Args:
            context: 浏览器上下文对象
            svg_url: SVG文件的URL
            
        Returns:
            str: SVG内容，如果下载失败或不是SVG格式返回None
        """
        try:
            # 再次检查URL是否是SVG格式
            from urllib.parse import urlparse
            parsed = urlparse(svg_url)
            url_path = parsed.path.lower()
            
            if not url_path.endswith('.svg'):
                print(f"    [跳过] URL不是SVG格式: {svg_url}")
                return None
            
            # 使用HTTP请求直接下载，不创建新页面
            try:
                # 使用context的request API来下载，这样可以复用浏览器的cookies和headers
                response = await context.request.get(svg_url, timeout=15000)
                if response.status == 200:
                    content = await response.text()
                    
                    # 提取SVG内容（可能包含在HTML中）
                    if '<svg' in content.lower():
                        import re
                        svg_match = re.search(r'<svg[^>]*>.*?</svg>', content, re.DOTALL | re.IGNORECASE)
                        if svg_match:
                            return svg_match.group(0)
                        # 如果没有匹配到完整的SVG标签，但内容看起来像SVG，返回整个内容
                        if content.strip().startswith('<?xml') or content.strip().startswith('<svg'):
                            return content
                    
                    # 如果内容不包含SVG标签，返回None
                    print(f"    [跳过] 下载的内容不包含SVG标签")
                    return None
                else:
                    print(f"    [下载失败] HTTP状态码: {response.status}")
                    return None
            except Exception as http_error:
                # 如果request API失败，回退到使用requests库
                print(f"    [警告] 使用context.request失败，尝试使用requests库: {http_error}")
                try:
                    import requests
                    # 从context获取cookies（如果可能）
                    cookies = {}
                    try:
                        # 尝试从context获取cookies
                        all_cookies = await context.cookies()
                        for cookie in all_cookies:
                            cookies[cookie['name']] = cookie['value']
                    except:
                        pass
                    
                    response = requests.get(svg_url, cookies=cookies, timeout=15)
                    if response.status_code == 200:
                        content = response.text
                        
                        # 提取SVG内容
                        if '<svg' in content.lower():
                            import re
                            svg_match = re.search(r'<svg[^>]*>.*?</svg>', content, re.DOTALL | re.IGNORECASE)
                            if svg_match:
                                return svg_match.group(0)
                            if content.strip().startswith('<?xml') or content.strip().startswith('<svg'):
                                return content
                        
                        print(f"    [跳过] 下载的内容不包含SVG标签")
                        return None
                    else:
                        print(f"    [下载失败] HTTP状态码: {response.status_code}")
                        return None
                except Exception as requests_error:
                    print(f"    [下载错误] requests库也失败: {requests_error}")
                    return None
        except Exception as e:
            print(f"    [下载错误] {e}")
            return None
    
    async def _extract_page_info(self, page):
        """
        提取页面其他相关信息
        
        Args:
            page: Playwright页面对象
            
        Returns:
            dict: 页面信息
        """
        page_info = {}
        
        try:
            page_info["title"] = await page.title()
            page_info["url"] = page.url
            
            # 如果是industry-chain页面，提取更多产业链信息
            if "/industry-chain" in page.url:
                chain_info = await page.evaluate("""
                    () => {
                        const info = {};
                        
                        // 提取产业链标题（可能是h1、h2或特定class的元素）
                        const titleSelectors = [
                            'h1',
                            'h2',
                            '.chain-title',
                            '.industry-title',
                            '[class*="title"]',
                            '[class*="chain"]'
                        ];
                        
                        for (const selector of titleSelectors) {
                            const element = document.querySelector(selector);
                            if (element && element.textContent && element.textContent.trim()) {
                                info.chain_title = element.textContent.trim();
                                break;
                            }
                        }
                        
                        // 提取产业链描述
                        const descSelectors = [
                            '.chain-desc',
                            '.industry-desc',
                            '.chain-intro',
                            '.industry-intro',
                            '[class*="desc"]',
                            '[class*="intro"]',
                            'p'
                        ];
                        
                        for (const selector of descSelectors) {
                            const element = document.querySelector(selector);
                            if (element && element.textContent && element.textContent.trim().length > 20) {
                                info.chain_description = element.textContent.trim();
                                break;
                            }
                        }
                        
                        // 提取当前选中的按钮文本（标签的显示内容）- 优先使用这个作为产业链名称
                        // 根据页面结构，标签使用 class="tagitem" 或 class="active tagitem"
                        let activeTagText = '';
                        
                        // 辅助函数：提取元素文本，排除隐藏元素
                        const getVisibleText = (element) => {
                            if (!element) return '';
                            
                            // 方法1: 只提取直接文本节点，不包含子元素
                            let text = '';
                            for (const node of element.childNodes) {
                                if (node.nodeType === 3) { // 文本节点
                                    text += node.textContent || '';
                                }
                            }
                            
                            // 如果直接文本节点为空，尝试排除隐藏元素后提取
                            if (!text.trim()) {
                                const clone = element.cloneNode(true);
                                // 移除所有隐藏的元素
                                const hiddenElements = clone.querySelectorAll('[style*="display: none"], [style*="display:none"], .free-wrap, .free-text');
                                hiddenElements.forEach(el => el.remove());
                                text = (clone.textContent || clone.innerText || '').trim();
                            } else {
                                text = text.trim();
                            }
                            
                            // 移除"免"字（如果存在）
                            text = text.replace(/免/g, '').trim();
                            
                            return text;
                        };
                        
                        // 方法1: 查找带有 active 类的 tagitem（最准确）
                        const activeTagItem = document.querySelector('.tagitem.active, .active.tagitem, span.tagitem.active, span.active.tagitem');
                        if (activeTagItem) {
                            activeTagText = getVisibleText(activeTagItem);
                        }
                        
                        // 方法2: 如果方法1没找到，查找所有tagitem，找到有active类的
                        if (!activeTagText) {
                            const allTagItems = document.querySelectorAll('.tagitem, span.tagitem');
                            for (const tag of allTagItems) {
                                const classes = tag.className || '';
                                if (classes.includes('active')) {
                                    activeTagText = getVisibleText(tag);
                                    if (activeTagText && activeTagText.length > 0 && activeTagText.length < 50) {
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // 方法3: 如果还没找到，尝试查找其他类型的active按钮
                        if (!activeTagText) {
                            const activeSelectors = [
                                'button.active',
                                '.active button',
                                'button[class*="active"]',
                                '[class*="active"][class*="button"]',
                                'button.selected',
                                '.selected button',
                                'button[class*="selected"]',
                                '[class*="selected"][class*="button"]'
                            ];
                            
                            for (const selector of activeSelectors) {
                                try {
                                    const elements = document.querySelectorAll(selector);
                                    for (const el of elements) {
                                        activeTagText = getVisibleText(el);
                                        if (activeTagText && activeTagText.length > 0 && activeTagText.length < 50) {
                                            break;
                                        }
                                    }
                                    if (activeTagText) break;
                                } catch (e) {
                                    // 继续尝试下一个选择器
                                }
                            }
                        }
                        
                        if (activeTagText) {
                            info.active_button_text = activeTagText;
                        }
                        
                        // 提取所有标签文本（产业链列表）- 用于调试
                        // 优先使用tagitem选择器
                        const tagItems = document.querySelectorAll('.tagitem, span.tagitem');
                        if (tagItems.length > 0) {
                            info.chain_buttons = Array.from(tagItems).slice(0, 20).map(tag => {
                                const text = getVisibleText(tag);
                                const classes = tag.className || '';
                                return { text: text, classes: classes, isActive: classes.includes('active') };
                            }).filter(item => item.text && item.text.length > 0);
                        } else {
                            // 如果没有tagitem，尝试查找按钮
                            const buttons = document.querySelectorAll('button, [class*="button"], [class*="chain-item"], [role="button"]');
                            if (buttons.length > 0) {
                                info.chain_buttons = Array.from(buttons).slice(0, 20).map(btn => {
                                    const text = getVisibleText(btn);
                                    const classes = btn.className || '';
                                    return { text: text, classes: classes };
                                }).filter(item => item.text && item.text.length > 0);
                            }
                        }
                        
                        // 提取页面中的文本内容（作为备用）
                        const mainContent = document.querySelector('main, .main, .content, [class*="content"]');
                        if (mainContent) {
                            info.main_content_text = mainContent.textContent.trim().substring(0, 500);
                        }
                        
                        return info;
                    }
                """)
                
                # 合并提取的信息
                page_info.update(chain_info)
                print(f"  [产业链信息] 提取到产业链信息: {chain_info}")
            
        except Exception as e:
            print(f"  提取页面信息时出错: {e}")
            import traceback
            traceback.print_exc()
        
        return page_info
    
    def _save_data(self, data: dict, chain_id: str):
        """
        保存数据到文件，使用产业链名称命名（优先使用标签的显示内容）
        仅保存SVG文件和SVG代码（txt文件），不保存JSON数据
        
        Args:
            data: 要保存的数据
            chain_id: 产业链ID
            
        Returns:
            Path: 保存的文件路径（txt文件或SVG文件）
        """
        # 获取产业链名称
        page_info = data.get("page_info", {})
        
        # 优先使用标签的显示内容（按钮文本），这是最准确的产业链名称
        chain_name = page_info.get("active_button_text", "")
        
        # 如果没有按钮文本，使用其他来源
        if not chain_name:
            chain_name = data.get("chain_name", "") or page_info.get("chain_title", "") or page_info.get("chain_name_from_svg", "")
        
        # 如果还是没有，使用从SVG URL提取的名称
        if not chain_name:
            svg_data = data.get("svg_data", {})
            svg_urls = svg_data.get("svg_urls", [])
            if svg_urls:
                chain_name = self._extract_chain_name_from_svg_url(svg_urls[0])
        
        # 如果还是没有，使用chain_id
        if not chain_name:
            chain_name = chain_id
        
        # 清理文件名中的非法字符
        import re
        chain_name = re.sub(r'[<>:"/\\|?*]', '_', chain_name)
        chain_name = chain_name.strip()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 保存SVG代码，使用产业链名称命名
        svg_data = data.get("svg_data", {})
        saved_file = None
        
        if svg_data.get("svg_content"):
            svg_filename = f"{chain_name}_{timestamp}.txt"
            svg_filepath = self.output_dir / svg_filename
            with open(svg_filepath, 'w', encoding='utf-8') as f:
                for idx, svg_html in enumerate(svg_data["svg_content"]):
                    f.write(f"\n{'='*80}\n")
                    f.write(f"SVG #{idx + 1}\n")
                    f.write(f"{'='*80}\n")
                    f.write(svg_html)
                    f.write("\n")
            saved_file = svg_filepath
            print(f"    [保存] SVG代码已保存: {svg_filepath}")
        
        # 保存单独的SVG文件（从URL下载的），使用产业链名称命名
        if svg_data.get("svg_files"):
            for idx, svg_file in enumerate(svg_data["svg_files"], 1):
                svg_url = svg_file["url"]
                
                # 只保存SVG格式的文件
                from urllib.parse import urlparse
                parsed = urlparse(svg_url)
                url_path = parsed.path.lower()
                
                if not url_path.endswith('.svg'):
                    print(f"    [跳过] 非SVG文件，不保存: {svg_url}")
                    continue
                
                # 验证内容是否是SVG格式
                content = svg_file.get("content", "")
                if not content or ('<svg' not in content.lower() and not content.strip().startswith('<?xml')):
                    print(f"    [跳过] 内容不是SVG格式，不保存: {svg_url}")
                    continue
                
                # 使用产业链名称命名SVG文件
                if len(svg_data["svg_files"]) == 1:
                    # 如果只有一个SVG文件，直接使用产业链名称
                    svg_filename = f"{chain_name}_{timestamp}.svg"
                else:
                    # 如果有多个SVG文件，添加序号
                    svg_filename = f"{chain_name}_{timestamp}_{idx}.svg"
                
                filepath = self.output_dir / svg_filename
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"    [保存] SVG文件已保存: {filepath}")
                if not saved_file:
                    saved_file = filepath
        
        # 返回保存的文件路径（优先返回txt文件，否则返回SVG文件）
        if saved_file:
            return saved_file
        else:
            # 如果没有保存任何文件，返回一个默认路径
            return self.output_dir / f"{chain_name}_{timestamp}.txt"


async def main():
    """主函数"""
    # 默认启用persistent context来保存缓存
    # 缓存目录：脚本目录下的 chrome_cache 文件夹
    # 缓存将持久化保存，下次启动时会保留之前的缓存数据
    # 如需禁用缓存持久化，可以设置 use_persistent_context=False
    # 例如：scraper = ManualBrowserScraper(use_persistent_context=False)
    
    # 检查并安装Playwright浏览器（如果是打包后的exe）
    if getattr(sys, 'frozen', False):
        # 如果是打包后的exe
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                try:
                    p.chromium.launch()
                except:
                    print("[提示] 正在安装Playwright浏览器，请稍候...")
                    import subprocess
                    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
                    print("[完成] Playwright浏览器安装完成")
        except Exception as e:
            print(f"[警告] Playwright浏览器检查失败: {e}")
            print("[提示] 如果浏览器无法启动，请手动运行: playwright install chromium")
    
    scraper = ManualBrowserScraper()
    await scraper.start()


if __name__ == "__main__":
    import sys
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n程序已退出")
    except Exception as e:
        print(f"\n[错误] 程序运行出错: {e}")
        import traceback
        traceback.print_exc()
        input("\n按回车键退出...")
    except Exception as e:
        print(f"\n\n发生错误: {e}")
        import traceback
        traceback.print_exc()
