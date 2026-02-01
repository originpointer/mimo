/**
 * Background Script - Main Entry Point
 *
 * 在 MV3 background service worker 中运行。
 *
 * 这是统一的消息路由入口点，负责：
 * - 初始化所有管理器（StagehandXPathManager, MimoEngineManager）
 * - 初始化处理器注册表（LegacyHandlerRegistry, HubCommandHandlerRegistry）
 * - 创建统一的消息路由器（MessageRouter）
 * - 注册 chrome.runtime 消息监听器
 * - 管理 Service Worker 生命周期（基于 Manus Chrome Extension v0.0.47 模式）
 *
 * 架构说明：
 * - MessageRouter: 统一入口点，根据消息类型分发到相应的处理器
 * - LegacyHandlerRegistry: 处理13种传统消息类型
 * - HubCommandHandlerRegistry: 处理HubCommandType消息
 * - StagehandXPathManager: CDP工具协调（XPath扫描、截图等）
 * - MimoEngineManager: Socket.IO连接管理
 * - ServiceWorkerLifecycleManager: 生命周期管理（onSuspend 清理）
 * - KeepAliveManager: 保活轮询（每10秒 Chrome API 调用）
 * - StateManager: 状态管理和重启检测
 */

import { MessageRouter } from './message-router';
import { LegacyHandlerRegistry } from './handlers/legacy-handler-registry';
import { HubCommandHandlerRegistry } from './handlers/hub-command-handler-registry';
import { StagehandXPathManager } from './managers/stagehand-xpath-manager';
import { BionSocketManager } from './managers/mimo-engine-manager';

// Import lifecycle management components (Manus-based patterns)
import { ServiceWorkerLifecycleManager } from './managers/lifecycle-manager';
import { KeepAliveManager } from './managers/keep-alive-manager';
import { StateManager } from './managers/state-manager';

// ==================== 初始化管理器 ====================

/**
 * StagehandXPathManager - CDP工具协调
 *
 * 负责XPath扫描、截图、简历抽取等CDP相关功能。
 * 不再负责消息路由和Socket.IO连接管理。
 */
const stagehandManager = new StagehandXPathManager();

/**
 * BionSocketManager - Socket.IO连接管理
 *
 * 负责与后端 Socket.IO 服务器的连接（Bion 协议）。
 * 独立于StagehandXPathManager，保持清晰的关注点分离。
 *
 * 增强功能（基于 Manus 模式）：
 * - 自动重连（指数退避：1s → 30s）
 * - 实现 LifecycleAware 接口
 * - 生命周期管理
 */
const mimoEngineManager = new BionSocketManager({
  busUrl: process.env.PLASMO_PUBLIC_MIMO_BUS_URL || 'http://localhost:6007',
  namespace: '/mimo',
  autoReconnect: true,
  debug: process.env.NODE_ENV === 'development',
});

// ==================== 初始化生命周期管理组件 (Manus 模式) ====================

/**
 * ServiceWorkerLifecycleManager - 生命周期管理器
 *
 * 基于 Manus Chrome Extension v0.0.47 的设计模式
 * 负责：
 * - 注册 chrome.runtime.onSuspend 监听器
 * - 在 Service Worker 终止前清理所有资源
 * - 防止资源泄漏
 */
const lifecycleManager = new ServiceWorkerLifecycleManager();

/**
 * StateManager - 状态管理器
 *
 * 基于 Manus Chrome Extension v0.0.47 的设计模式
 * 负责：
 * - 检测 Service Worker 重启（通过心跳时间戳）
 * - 持久化关键状态到 chrome.storage.local
 * - 提供状态保存/加载功能
 */
const stateManager = new StateManager({
  heartbeatInterval: 10000,  // 10秒心跳
  restartThreshold: 30000,    // 30秒重启检测阈值
});

/**
 * KeepAliveManager - 保活管理器
 *
 * 基于 Manus Chrome Extension v0.0.47 的设计模式
 * 负责：
 * - 每 10 秒执行 Chrome API 调用（chrome.tabs.query）
 * - 重置 Service Worker 的空闲计时器
 * - 确保 Service Worker 永远不会达到 30 秒空闲超时
 *
 * 核心思想：10 秒轮询 < 30 秒超时 = 持续活跃
 */
const keepAliveManager = new KeepAliveManager({
  pollInterval: 10000,  // 10秒（与 Manus 一致）
  onKeepAlive: async () => {
    // 发送 WebSocket 心跳
    if (mimoEngineManager.isConnected()) {
      await mimoEngineManager.sendHeartbeat();
    }
  },
});

// ==================== 注册生命周期感知组件 ====================

/**
 * 将所有需要清理的组件注册到生命周期管理器
 *
 * 当 Service Worker 即将终止时（onSuspend），
 * 生命周期管理器会调用所有组件的 stop() 方法。
 */
lifecycleManager.addManager(keepAliveManager);
lifecycleManager.addManager(mimoEngineManager);
// stateManager implements LifecycleAware, add it if needed
// lifecycleManager.addManager(stateManager);

// ==================== 初始化处理器注册表 ====================

/**
 * LegacyHandlerRegistry - 传统消息处理器
 *
 * 处理13种自定义消息类型：
 * - STAGEHAND_XPATH_SCAN: XPath扫描
 * - STAGEHAND_VIEWPORT_SCREENSHOT: 视口截图
 * - RESUME_BLOCKS_EXTRACT: 简历块抽取
 * - RESUME_XPATH_VALIDATE: XPath验证
 * - JSON_COMMON_XPATH_FIND: JSON到XPath
 * - XPATH_MARK_ELEMENTS: 元素标记
 * - XPATH_GET_HTML: HTML获取
 * - LIST_TABS: 标签页列表
 * - Tab group operations (5 types): 选项卡组操作
 */
const legacyRegistry = new LegacyHandlerRegistry(stagehandManager);

/**
 * HubCommandHandlerRegistry - Hub命令处理器
 *
 * 处理HubCommandType消息，集成CommandExecutor。
 */
const hubRegistry = new HubCommandHandlerRegistry();

// ==================== 创建统一消息路由器 ====================

/**
 * MessageRouter - 统一消息路由器
 *
 * 所有chrome.runtime消息的单一入口点。
 * 根据消息类型（legacy vs hub）分发到相应的处理器注册表。
 */
const messageRouter = new MessageRouter(legacyRegistry, hubRegistry, {
  debug: process.env.NODE_ENV === 'development',
  slowMessageThreshold: 1000,
});

// ==================== 注册消息监听器 ====================

/**
 * 注册chrome.runtime消息监听器
 *
 * 使用统一的MessageRouter处理所有消息。
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return messageRouter.route(message, sender, sendResponse);
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  return messageRouter.route(message, sender, sendResponse);
});

console.log('[Background] Unified message router registered');

// ==================== 初始化和启动 (Manus 模式) ====================

/**
 * 初始化函数
 *
 * 基于 Manus Chrome Extension v0.0.47 的初始化模式
 * 负责：
 * 1. 检测 Service Worker 是否刚重启
 * 2. 注册生命周期监听器
 * 3. 启动心跳
 * 4. 启动保活轮询
 * 5. 连接到 MimoBus
 */
async function initialize(): Promise<void> {
  console.info('[Background] ===== Initialization Start =====');

  // 1. 检测是否是 Service Worker 重启
  const isRestart = await stateManager.isServiceWorkerRestart();
  if (isRestart) {
    console.info('[Background] Service Worker restart detected');
  }

  // 2. 注册生命周期监听器（onSuspend）
  lifecycleManager.register();
  console.info('[Background] Lifecycle handlers registered');

  // 3. 启动心跳（用于重启检测）
  stateManager.startHeartbeat(10000);  // 10秒
  console.info('[Background] Heartbeat started');

  // 4. 启动保活轮询（每10秒执行 Chrome API 调用）
  keepAliveManager.start();
  console.info('[Background] Keep-alive polling started');

  // 5. 连接到 MimoBus
  try {
    await mimoEngineManager.connect();
    console.info('[Background] MimoBus connection established');
  } catch (error) {
    // MimoEngineManager 会自动重连，这里只记录错误
    console.error('[Background] Failed to connect to MimoBus:', error);
    console.info('[Background] Auto-reconnect will be attempted');
  }

  console.info('[Background] ===== Initialization Complete =====');
}

// 执行初始化
initialize().catch((error) => {
  console.error('[Background] Initialization failed:', error);
});

// ==================== 导出供其他模块使用 ====================

/**
 * 导出管理器实例供其他模块使用
 */
export {
  stagehandManager,
  mimoEngineManager,
  lifecycleManager,
  keepAliveManager,
  stateManager,
};

/**
 * 默认导出 - 向后兼容
 *
 * 保持向后兼容性，允许其他模块使用默认导入。
 */
export default stagehandManager;
