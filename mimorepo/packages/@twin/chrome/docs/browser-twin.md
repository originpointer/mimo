# Browser Digital Twin State Synchronization

`@twin/chrome` 维护了一个浏览器的数字孪生 (Digital Twin) 状态，通过 `BrowserTwinStore` 实时同步浏览器内部的标签页、窗口和标签组状态。

## Synchronized Entities

以下是当前已实现的同步状态实体及其属性。

### 1. Tabs (标签页)

同步每个标签页的详细状态。

*   **Identity**: `id`, `windowId`, `groupId`, `openerTabId`, `index`
*   **Content**: `url`, `title`, `favIconUrl`
*   **Status**: `status` ('loading' | 'complete'), `active`, `pinned`, `hidden`
*   **Metadata**: `lastUpdated` (timestamp)

**Captured Events:**
*   `TabCreated`: 新标签页创建
*   `TabUpdated`: 属性变更（如 URL 加载完成、标题更新、Pin 状态改变等）
*   `TabActivated`: 标签页被激活（切换到前台）
*   `TabRemoved`: 标签页关闭

### 2. Windows (窗口)

同步浏览器窗口的几何信息和焦点状态。

*   **Identity**: `id`
*   **State**: `focused` (是否获得焦点)
*   **Geometry**: `top`, `left`, `width`, `height`
*   **Type**: `type` ('normal' | 'popup' | 'panel' | 'app' | 'devtools')
*   **Relations**: `tabIds` (窗口包含的标签页 ID 列表)
*   **Metadata**: `lastUpdated`

**Captured Events:**
*   `WindowCreated`: 窗口打开
*   `WindowRemoved`: 窗口关闭
*   `WindowFocused`: 窗口获得/失去焦点

### 3. Tab Groups (标签组)

同步 Chrome 原生标签组的状态。

*   **Identity**: `id`, `windowId`
*   **Appearance**: `title`, `color` ('grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange')
*   **State**: `collapsed` (是否折叠)

**Captured Events:**
*   `TabGroupCreated`: 创建组
*   `TabGroupUpdated`: 组属性变更（如改名、变色、折叠/展开）
*   `TabGroupRemoved`: 组解散
*   `TabGroupMoved`: 组在标签栏移动

---

## Global State

`BrowserTwinStore` 还维护了全局的上下文状态：

*   **System Context**:
    *   `activeWindowId`: 当前系统焦点的浏览器窗口 ID
    *   `activeTabId`: 当前活动窗口中的活动标签页 ID
*   **Lifecycle**:
    *   `extensionState`: 插件端状态 ('idle', 'ongoing', 'takeover', 'hidden')
    *   `systemState`: 系统端状态 ('running', 'stopped', 'waiting', 'error', etc.)

## Data Flow

1.  **Source**: Chrome Extension (Bion Protocol) 捕获原生 API 事件。
2.  **Transport**: 事件通过 Socket 传输到 Server 端。
3.  **Ingestion**: `TabEventEmitter` 接收原始数据并转换为标准 `TabEvent`。
4.  **State Management**: `BrowserTwinStore` 应用事件，更新内存中的 Map 状态 (`windows`, `tabs`, `groups`)，并对外发出 `state_changed` 事件。


# 数据获取与价值分析 (Data Acquisition & Value Analysis)

本文档说明了 `@twin/chrome` 如何获取浏览器数据，以及这些数据在 BUA Agent 执行过程中的核心价值。

## 1. 数据获取途径 (Data Acquisition Pathways)

数据的流动经历“源头捕获”、“实时传输”和“中心处理”三个阶段，构成了从浏览器到底层的完整链路。

### 源头 (Source): Chrome Extension
*   **机制**: 利用 Chrome Extension API (`chrome.tabs.*`, `chrome.windows.*`, `chrome.tabGroups.*`) 监听浏览器内的所有生命周期事件。
*   **捕获内容**: 包括标签页的创建/更新/移除、窗口的焦点变化/尺寸调整、以及标签组的折叠/展开等原生事件。

### 传输 (Transport): Bion Protocol
*   **机制**: 采用基于 WebSocket (或 Socket.IO) 的 Bion 协议。
*   **特点**: 建立全双工长连接，确保浏览器发生的任何状态变更能以毫秒级延迟推送到 Server 端，无需 Server 轮询。

### 处理 (Processing): Twin Core
*   **摄入**: `@twin/chrome` 包中的 `TabEventEmitter` 接收原始 Bion 消息流。
*   **聚合**: `BrowserTwinStore` 将碎片化的事件流聚合为一致的、内存驻留的 `BrowserTwinState` 对象，维护着 `windows`、`tabs` 和 `groups` 的实时映射。

---

## 2. 在 BUA Agent 执行过程中的价值 (Value in BUA Agent Execution)

对于自动化 Agent (BUA Agent) 而言，`@twin/chrome` 提供的不仅仅是数据，而是执行任务的“感官”和“大脑皮层”。

### 👁️ 全知视角 (Omniscient Perception)
Agent 无需通过截图或频繁查询 DOM 来了解当前开了几个窗口、哪个标签页是激活的。
*   **价值**: Agent 可以直接读取 `BrowserTwinStore` 瞬间获知全局状态。例如，在决定“打开新标签”前，Agent 已知当前是否已达到标签页上限。

### ✅ 操作验证 (Action Verification)
Agent 在执行动作（如“点击链接”）后，往往难以判断页面是否真正开始加载。
*   **价值**: 通过监听 `TabUpdated` 事件中的 `status: 'loading'` 状态变化，Agent 可以精确捕捉到操作生效的瞬间。
*   **价值**: 通过监听 `status: 'complete'`，Agent 确切知道何时页面已准备好接受进一步交互，消除了盲目等待 (`sleep(5000)`) 的不稳定性。

### 🧹 状态抗噪 (State Denoising)
原生的 Chrome 事件流非常嘈杂（例如一个页面加载可能触发十几次 `onUpdated`）。
*   **价值**: Twin 层作为中间件，过滤了冗余事件，为 Agent 提供清洗后的、语义化的高层状态对象（如 `Task` 和 `Group`）。Agent 只需要关注“任务组配置变更”(`group_config_change`)，而无需处理底层的标签页高亮逻辑。

### 🛡️ 安全屏障 (Safety Barrier)
Agent 的操作依赖于底层浏览器环境的稳定性。
*   **价值**: 通过实时监控 `ExtensionState`，Agent 可以感知“心脏跳动”。如果插件状态变为 `idle` 或 `disconnected`，Agent 可以立即触发熔断机制，暂停执行，避免在失联的浏览器上徒劳地发送指令，从而通过异常处理流程保护任务安全。
