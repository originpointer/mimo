# 数字孪生中枢指令单元实施计划

本计划概述了实现数字孪生（`@twin/chrome`）集中式指令单元的步骤。该单元将利用 `@bion/browser-tools` 中现有的指令通道和结构，促进向插件/浏览器发送主动指令。

## 目标描述

创建一个 `TwinControlUnit`（孪生控制单元），作为使用 `BrowserTransport` 模式的浏览器指令的中央调度器。这使得数字孪生不仅能反射状态，还能通过发送 `browser_navigate`、`browser_click` 等指令来驱动浏览器。

## 建议变更

### 包依赖
#### [修改] [package.json](file:///Users/sodaabe/codes/coding/mimo/mimorepo/packages/@twin/chrome/package.json)
- 添加 `@bion/browser-tools` 作为依赖项，以访问 `BrowserTransport` 和其他类型。

### 新增指令单元
#### [新增] [src/controlUnit.ts](file:///Users/sodaabe/codes/coding/mimo/mimorepo/packages/@twin/chrome/src/controlUnit.ts)
- 定义 `TwinControlConfig` 接口（扩展或类似于 `BrowserToolsConfig`）。
- 实现 `TwinControlUnit` 类。
    - 方法：`setConfig(config)`，`dispatch(actionName, params)`。
    - 负责生成 `actionId`。
    - 维护对 `transport` 的引用。

### 系统集成
#### [修改] [src/systemManager.ts](file:///Users/sodaabe/codes/coding/mimo/mimorepo/packages/@twin/chrome/src/systemManager.ts)
- 添加一个属性来持有 `TwinControlUnit`。
- 在构造函数或懒加载中初始化 `TwinControlUnit`。
- 暴露一个从外部设置配置（transport, sessionId 等）的方法（例如，当连接建立时）。

#### [修改] [src/index.ts](file:///Users/sodaabe/codes/coding/mimo/mimorepo/packages/@twin/chrome/src/index.ts)
- 导出 `TwinControlUnit` 及相关类型。

#### [修改] [src/task.ts](file:///Users/sodaabe/codes/coding/mimo/mimorepo/packages/@twin/chrome/src/task.ts)
- 允许 `Task` 实例访问 `TwinControlUnit`（例如，在创建时传递或访问单例/系统管理器）。
- 向 `Task` 添加执行常用操作的方法（例如 `navigate(url)`）。（可选，但符合“组织指令”的要求）。

## 验证计划

### 自动化测试
- 运行 `npm run check-types`（或 `tsc --noEmit`）以确保类型安全。
- 由于没有现有的单元测试，我将依赖构建系统的类型检查。

### 手动验证
- 我将创建一个临时集成脚本，验证 `TwinControlUnit` 可以被实例化，并且可以向其传递简单的对象。
