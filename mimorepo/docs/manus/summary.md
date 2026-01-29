AI Agent 浏览器自动化架构设计参考手册：基于 Manus 逆向工程的技术规程

1. 总体架构：分布式混合执行模型

在现代 AI Agent 设计中，浏览器自动化架构已从传统的“扩展原生 UI 驱动”演进为“Web App + 桥接扩展”的分布式混合执行模型。Manus 的实践证明，弃用 Chrome 原生 sidePanel API 而转向基于 Web UI（manus.im）的主控模式，是实现高频迭代与复杂 AI 逻辑统一的战略选择。

架构解构：Web UI 驱动模式

Manus 弃用原生 UI 主要是为了解决 Manifest V3 环境下的开发效率瓶颈：

* 开发灵活性： 利用 React 19 等现代框架在 Web 端快速部署，绕过 Chrome 商店冗长的审核周期。
* 逻辑解耦： 将复杂的 Agent 决策链路保留在 Web/云端，扩展仅作为具备权限的“算子执行器”。
* 交互深度： 突破侧边栏固定宽度的物理限制，利用全屏或浮窗提供丰富的视觉反馈。

上下文拓扑与桥接规程

系统建立了一个多层级的通信路径，其中 ManusAppBridge 扮演了关键的“协议净化器（Sanitizer）”角色：

1. Manus App (React 19)： 用户交互层，通过 window.postMessage 向桥接层发送原始指令。
2. ManusAppBridge (Content Script)： 注入在 manus.im 中的中间层。它利用 manus.js 进行域名校验（Origin Validation），将非受信源隔离，并通过 chrome.runtime.sendMessage 将清洗后的协议转发至后台。
3. Background Service Worker： 核心路由枢纽，负责会话管理、权限检查及 CDP 指令调度。
4. Target Content Script / CDP： 底层执行层，在目标页面实施原子操作。


--------------------------------------------------------------------------------


2. 统一消息路由与通信协议设计

在 Manifest V3 强隔离环境下，消息总线的稳定性直接决定了 AI 算子的实时响应能力。

消息结构规范

基于 sendMessage.js 与 typeGuards.js 的底层逻辑，所有跨上下文通信必须遵循严格的协议格式：

字段	类型	规范要求
source	String	必须为 manus-app, content, popup, 或 background。
type	String	采用 domain/action 格式（如 automation/click）。
data	Object	嵌套 Action 模式：必须包含 action: { type, params }。
requestId	String	强制性：由 crypto.getRandomValues 生成的 22 位随机字符串。
timestamp	Number	消息生成的 Unix 时间戳，用于时效性校验。

路由分发策略

Background Service Worker 通过 ManusAppHandler 实施分发，确保指令的原子性执行：

* 慢查询监控： 系统必须内置处理时耗统计，任何超过 1000ms 的请求均需触发架构层面的警告日志。
* 嵌套 Action 路由： 区别于扁平化消息，嵌套结构允许在不更改主协议的前提下，通过扩展 params 字段实现 browser_navigate 或 browser_scroll_down 等复杂操作的平滑升级。


--------------------------------------------------------------------------------


3. 基于 CDP 的高可靠执行引擎规程

Chrome DevTools Protocol (CDP) 是构建“可信自动化”的核心，其能力远超传统的 DOM 事件注入。

核心技术准则：隐身执行规则

Manus 最具突破性的发现是 “不可见执行悖论”：

* 规程定义： 自动化引擎必须能够在 visibilityState: hidden 且 document.hasFocus(): true 的状态下执行。
* 实现路径： 扩展通过 window.focus() 获取文档焦点，配合 CDP 的 Input.dispatchMouseEvent 直接注入事件。
* 价值： 实现了真正的“后台静默操作”，AI 在非活动标签页完成任务时，用户当前的浏览体验完全不受干扰。

高保真事件模拟

为了规避现代 Web 站点的自动化检测，执行引擎应放弃 MouseEvent，转而使用 CDP 驱动的 PointerEvent：

* 特征模拟： 模拟 pointerId: 1、pointerType: "mouse" 以及真实的 pressure: 0 参数。
* 会话管理： CdpClient 必须维持 60 秒的不活跃自动分离机制，并对失败指令执行最多 3 次的自动重试。

视觉反馈集成

为了确证自动化过程的可控性，必须集成以下视觉规程：

* 边缘遮罩： 任务执行时，通过 CSS 梯度在目标页面四周生成蓝色边缘光效。
* 标签页动态： 在标签页标题（Favicon 区域）循环显示 Emoji 序列（👆 -> 🖐️ -> 👋），任务完成后强制切换为 ✅。


--------------------------------------------------------------------------------


4. 索引式元素定位与预标记策略

AI 指令定位需解决“网页频繁变动”与“AI 幻觉”之间的矛盾。

定位策略规程

系统采用“预处理生命周期”模式，将元素定位分为三个层级：

1. 数据驱动标记： Content Script 在 document_start 阶段注入，为所有可交互元素分配 data-manus_click_id。
2. DOM 重新索引： 在页面 DOM 发生变动（Mutation）时，实时维护索引池的有效性。
3. 执行闭环： AI 下发 byIndex(4) 指令 -> 扩展通过 getPageDimensions 获取该索引元素的物理坐标 -> CDP 转化坐标并执行点击。


--------------------------------------------------------------------------------


5. 跨上下文状态同步与认证规程

在强隔离环境下，维持实时状态一致性是系统稳定性的战略地位。

认证同步（AuthHelper）规程

AuthHelper 充当 Web 端与扩展端的 状态镜像（State Mirror）：

* 防抖机制： 设置 500ms 的同步阈值，防止在 Cookie 频繁变动时产生存储震荡。
* 令牌映射： 将 manus.im 的 HttpOnly session_id 实时同步至扩展 chrome.storage.local 中的 manus_extension_token。
* 身份标识： 引入 Browser Client ID 规范（由随机“形容词+名词”组成，如 Optimistic-Falcon），用于多实例识别。

响应式存储抽象层

利用 liveUpdate 功能建立响应式存储。任何状态变更（如从 running 切换到 takeover）必须通过订阅模式实时广播至所有上下文（Background、Popup、Bridge），确保存储操作的原子性。


--------------------------------------------------------------------------------


6. 安全架构与合规性防御

debugger 权限的引入带来了显著的安全敞口，必须通过架构级策略进行对冲。

源验证与权限隔离

* 严格域名校验： isManusAppOrigin 必须强制生产环境 HTTPS 协议，仅在开发环境下允许 localhost 或 127.0.0.1 的特定端口。
* 最小化生命周期： CDP 会话遵循“即用即弃”原则，60s 无活动必须强制分离调试器，降低 debugger 被恶意利用的风险。

反检测特征修正

逆向发现，程序化点击常因 screenX/Y 坐标为负（如 -1983）而被识别。

* 防御规范： 开发者在调用 CDP 指令前，必须通过坐标平移算法，确保 screenX/Y 映射在标准的显示器物理边界内，消除“负坐标”这一典型的自动化指纹。


--------------------------------------------------------------------------------


7. 高性能 AI 浏览器算子开发准则 (Summary Checklist)

架构接受准则（Acceptance Criteria）

* 响应性能 (Latency)：
  * [ ] 消息分发延迟（Dispatch Latency）必须受 1000ms 超时监控约束。
  * [ ] 实现基于 Promise 的消息封装，严禁在 Service Worker 中阻塞同步。
* 执行健壮性 (Robustness)：
  * [ ] CDP 引擎必须支持会话持久化缓存（60s）与 3 次重试。
  * [ ] 定位策略必须具备“坐标翻译（Coordinate Translation）”降级能力。
* 上下文隔离 (Isolation)：
  * [ ] 敏感令牌禁止 Content Script 直接读取，必须通过 Background 路由。
  * [ ] ManusAppBridge 必须执行严格的指令净化。
* 用户干预 (Takeover)：
  * [ ] 必须保留可见的视觉反馈系统（蓝色遮罩、Emoji 状态）。
  * [ ] 状态机必须支持 takeover 模式，确保用户可一键中断 AI 逻辑。
