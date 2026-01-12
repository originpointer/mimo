# 页面加载状态监听模块

## 概述

本模块实现了在 Chrome Extension MV3 中监听页面加载状态的功能，支持 SPA 和非 SPA 页面的状态检测，并将状态同步到 server。

## 架构

```
content.ts (Content Script)
  └─> PageStateDetector
      ├─> MutationObserver (DOM 变化)
      ├─> PerformanceObserver (网络请求)
      ├─> IntersectionObserver (元素可见性)
      ├─> ResizeObserver (布局变化)
      └─> SPADetector (SPA 检测)
          └─> History API 拦截 (路由变化)

background/index.ts (Background Script)
  └─> PageStateManager
      ├─> chrome.webNavigation 事件
      ├─> chrome.tabs 事件
      └─> 状态同步到 Server
```

## 核心模块

### 1. 类型定义 (`types/page-state.ts`)

定义了页面状态相关的类型：
- `PageLoadState`: 页面加载状态枚举
- `PageStateInfo`: 页面状态信息接口
- `ObserverConfig`: Observer 配置接口

### 2. 页面状态检测器 (`utils/page-state-detector.ts`)

`PageStateDetector` 类负责检测页面加载状态：

- **初始化**: 自动检测 SPA，设置所有 Observer
- **状态检测**: 综合多个指标判断页面状态
- **状态通知**: 通过回调函数通知状态变化

#### 使用示例

```typescript
import { PageStateDetector } from './utils/page-state-detector';

const detector = new PageStateDetector({
  domStableThreshold: 500,
  networkQuietThreshold: 500,
  debounceTime: 300,
  timeout: 30000,
});

detector.onStateChange((stateInfo) => {
  console.log('Page state changed:', stateInfo);
});

detector.initialize();
```

### 3. SPA 检测器 (`utils/spa-detector.ts`)

`SPADetector` 类负责检测页面是否为 SPA：

- 框架检测（React、Vue、Angular）
- 路由模式检测
- SPA 结构特征检测
- 路由变化监听

### 4. iframe 检测器 (`utils/iframe-detector.ts`)

`IFrameDetector` 类负责检测和处理 iframe：

- 检测所有 iframe
- 判断同源/跨域
- 监听 iframe 加载状态
- 检查 iframe 可见性

### 5. Content Script (`content.ts`)

在页面上下文中运行，负责：

- 初始化 `PageStateDetector`
- 监听页面状态变化
- 通过 `chrome.runtime.sendMessage` 发送状态到 background
- 处理来自 background 的消息

### 6. Background Script (`background/index.ts`)

在 background service worker 中运行，负责：

- 监听 `chrome.webNavigation` 事件
- 监听 `chrome.tabs` 事件
- 管理所有 tab 的状态
- 将状态同步到 server

## 状态流转

```
UNKNOWN
  ↓ (检测到导航)
NAVIGATING
  ↓ (DOM 开始解析)
DOM_LOADING
  ↓ (DOM 解析完成)
DOM_READY
  ↓ (资源加载中)
RESOURCE_LOADING
  ↓ (SPA: 内容稳定中)
CONTENT_STABILIZING (仅 SPA)
  ↓ (所有条件满足)
READY
```

## 配置选项

### ObserverConfig

```typescript
interface ObserverConfig {
  domStableThreshold?: number;        // DOM 稳定期阈值（毫秒），默认 500
  networkQuietThreshold?: number;     // 网络安静期阈值（毫秒），默认 500
  debounceTime?: number;              // 状态更新防抖时间（毫秒），默认 300
  timeout?: number;                   // 超时时间（毫秒），默认 30000
  keyElementSelectors?: string[];     // 关键元素选择器
  loadingIndicatorSelectors?: string[]; // 加载指示器选择器
}
```

## Server API

Background script 会将状态同步到 server，需要实现以下 API：

### POST /api/page-states

接收批量页面状态更新。

**请求体**:
```json
{
  "states": [
    {
      "state": "READY",
      "url": "https://example.com",
      "tabId": 123,
      "frameId": 0,
      "timestamp": 1234567890,
      "details": {
        "readyState": "complete",
        "hasKeyElements": true,
        "hasLoadingIndicators": false,
        "networkQuiet": true,
        "domStable": true,
        "resourcesLoaded": true,
        "isSPA": true
      }
    }
  ],
  "timestamp": 1234567890
}
```

## 环境变量

在 `.env` 文件中设置：

```
PLASMO_PUBLIC_SERVER_URL=http://localhost:3000
```

## 注意事项

1. **Content Script 注入时机**: 脚本会在 `DOMContentLoaded` 后自动初始化，如果注入较晚，会立即初始化。

2. **SPA 路由变化**: 通过拦截 `history.pushState` 和 `history.replaceState` 来检测路由变化。

3. **跨域 iframe**: 跨域 iframe 的状态需要通过 `chrome.webNavigation` API 在 background 中检测。

4. **性能考虑**: 
   - 使用防抖避免频繁更新
   - Observer 只监听必要的区域
   - 及时清理不需要的 Observer

5. **错误处理**: 
   - 所有 Observer 初始化都有 try-catch
   - 超时检测防止页面永远不进入 READY 状态
   - 网络请求失败会重试（限制次数）

## 开发

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 打包
pnpm package
```

## 测试建议

1. **SPA 页面测试**:
   - React Router 应用
   - Vue Router 应用
   - Angular Router 应用

2. **非 SPA 页面测试**:
   - 传统多页面应用
   - 包含 iframe 的页面
   - 异步加载内容的页面

3. **边界情况测试**:
   - 页面加载超时
   - 网络错误
   - 资源加载失败
   - 从缓存恢复的页面
