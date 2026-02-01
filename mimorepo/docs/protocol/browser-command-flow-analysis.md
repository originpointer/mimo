# 浏览器指令流程分析报告

**分析日期**: 2026-02-01
**分析目标**: 判断打开浏览器 tab 功能是通过后端直接发送到 Background，还是由后端发送到前端 manus.im 再中转到 Background

---

## 结论

**打开浏览器 tab 的功能是通过后端直接发送指令到 Background（扩展），而不是经过前端 manus.im 中转。**

---

## 推理依据

### 1. Socket.IO 消息类型分析

#### 扩展（Background）接收的消息

**参考文件**: [接口分析.md](../../../../.reverse/analysis/data-io/接口分析.md)

```javascript
// background 中 socket.io 消息记录（端口 6007）
r 42["my_browser_extension_message",{
  "type": "browser_action",
  "action": {
    "browser_navigate": {
      "brief": "尝试打开 http://localhost:5173/ 页面",
      "intent": "navigational",
      "url": "http://localhost:5173/",
      "append_manusai_user": true
    }
  },
  "screenshot_presigned_url": "https://vida-private.s3...",
  "clean_screenshot_presigned_url": "https://vida-private.s3..."
}]
```

**关键特征**:
- 事件名是 `my_browser_extension_message`（专门给扩展的消息）
- 消息类型是 `browser_action`（浏览器操作指令）
- 直接发送到扩展的 Socket.IO 连接（端口 6007，namespace `/mimo`）

#### 前端（manus.im）接收的消息

**参考文件**: [接口分析.md](../../../../.reverse/analysis/data-io/接口分析.md)

```javascript
// manus.im 中 socket.io 消息记录
r 42["message",{"type":"liveStatus","text":"思考中"}]
r 42["message",{"type":"planUpdate","tasks":[...]}]
r 42["message",{"type":"myBrowserSelection","status":"waiting_for_selection"}]
r 42["message",{"type":"toolUsed","tool":"browser","status":"success"}]
r 42["message",{"type":"chatDelta","delta":{"content":"..."}}]
```

**前端只接收 UI 更新消息，不接收也不转发 `browser_action` 指令。**

### 2. 通信协议对比

**参考文件**: [数据交互分析.md](../../../../.reverse/analysis/data-io/数据交互分析.md)

| 维度 | 后端 → 扩展 | 后端 → 前端 |
|------|-------------|-------------|
| **Socket.IO 事件** | `my_browser_extension_message` | `message` |
| **数据类型** | 命令指令 | UI 更新 |
| **响应方式** | 直接返回执行结果 | 事件推送 |
| **示例** | `{ type: "browser_action" }` | `{ type: "liveStatus" }` |

### 3. 完整数据流分析

**参考文件**: [数据交互分析.md](../../../../.reverse/analysis/data-io/数据交互分析.md)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   manus.im  │         │   后端      │         │  Extension  │
│   (前端)    │         │  (Backend)  │         │  (插件)     │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │ 1. user_message       │                       │
       │    (用户输入)          │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │ 2. liveStatus         │                       │
       │    planUpdate         │                       │
       │    myBrowserSelection │                       │
       │<──────────────────────┤                       │
       │                       │                       │
       │ 3. select_my_browser  │                       │
       │    (用户选择浏览器)    │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │                       │ 4. browser_action     │
       │                       │    (直接发送)         │
       │                       ├──────────────────────>│
       │                       │                       │
       │                       │ 5. CDP 执行导航       │
       │                       │                       │
       │                       │ 6. result (成功)      │
       │                       │<──────────────────────┤
       │                       │                       │
       │ 7. toolUsed           │                       │
       │    screenshot         │                       │
       │<──────────────────────┤                       │
```

### 4. 扩展与前端职责分工

**参考文件**: [数据交互分析.md](../../../../.reverse/analysis/data-io/数据交互分析.md)

| 维度 | 插件 (Background) | 前端页面 (Frontend) |
|------|-------------------|---------------------|
| **运行环境** | Chrome Extension Service Worker | Browser Tab / Web App |
| **用户交互** | 无 UI | 完整 UI |
| **浏览器权限** | 完整权限 | 受限 |
| **CDP 访问** | ✅ 支持 | ❌ 不支持 |
| **持久连接** | ✅ WebSocket (后台) | ❌ 页面关闭断开 |
| **主要协议** | Socket.IO (6007) | HTTP API + Socket.IO |
| **数据处理** | 执行命令 | 展示结果 |
| **截图** | 捕获并上传 | 展示 |
| **DOM 操作** | 直接操作 | 无 |

### 5. 指令传递流程验证

**参考文件**: [指令传递流程分析.md](../../../../.reverse/analysis/10_指令传递流程/指令传递流程分析.md)

```
用户在 manus.im 输入请求
    │
    ├─→ 前端发送 message 事件 (user_message)
    │       { type: "user_message", content: "使用浏览器打开..." }
    │
    ├─→ 后端接收并处理
    │       ├─→ 发送 liveStatus: "思考中"
    │       ├─→ 发送 planUpdate: 创建任务列表
    │       ├─→ 发送 explanation: AI 思考过程
    │       └─→ 发送 toolUsed: { tool: "browser", status: "start" }
    │
    ├─→ 后端发现需要浏览器
    │       └─→ 发送 myBrowserSelection (等待用户选择)
    │
    ├─→ 用户选择浏览器
    │       └─→ 前端发送 select_my_browser 事件
    │
    ├─→ 后端向插件发送导航命令 ⭐ 关键步骤
    │       Socket.IO: my_browser_extension_message
    │       {
    │         type: "browser_action",
    │         action: { browser_navigate: { url: "..." } }
    │       }
    │
    └─→ 插件执行导航并返回结果
```

---

## 架构优点

### 1. 职责分离清晰

| 组件 | 职责 |
|------|------|
| **前端 (manus.im)** | 用户交互、UI 展示、聊天对话 |
| **后端 (Backend)** | 消息路由、AI 决策、任务协调 |
| **扩展 (Extension)** | 浏览器操作、CDP 调用、截图上传 |

前端只需关注 UI，不需要理解浏览器操作的技术细节。

### 2. 安全性更好

- ✅ 前端无法直接构造浏览器操作指令
- ✅ 所有 `browser_action` 指令都由后端验证和授权
- ✅ 防止前端被篡改后恶意操作浏览器

### 3. 解耦性更强

- ✅ 前端页面关闭不影响扩展的运行
- ✅ 扩展可以独立于前端接收和处理命令
- ✅ 后端可以同时控制多个扩展实例（多浏览器）

### 4. 性能更优

- ✅ 消息直接从后端到扩展，减少一跳中转
- ✅ 扩展始终在后台运行（Service Worker），无需等待前端页面加载
- ✅ 前端只接收必要的 UI 更新，减少数据传输

### 5. 可扩展性强

```
后端 ──→ 扩展A (Smart-Fox)
    │
    ├──→ 扩展B (Swift-Phoenix)
    │
    └──→ 扩展C (...)
```

一个后端可以同时控制多个浏览器扩展，前端只需选择使用哪个浏览器。

---

## 支持的浏览器命令类型

**参考文件**: [数据交互分析.md](../../../../.reverse/analysis/data-io/数据交互分析.md)

| 命令类型 | 说明 |
|---------|------|
| `browser_navigate` | 导航到 URL |
| `browser_click` | 点击元素 |
| `browser_fill` | 填充表单 |
| `browser_screenshot` | 截图 |
| `browser_getContent` | 获取内容 |
| `browser_evaluate` | 执行 JS |
| `browser_hover` | 悬停 |
| `browser_select` | 选择下拉 |
| `browser_close` | 关闭标签 |

---

## 参考文件路径

| 文件 | 路径 |
|------|------|
| 接口分析 | `.reverse/analysis/data-io/接口分析.md` |
| 数据交互分析 | `.reverse/analysis/data-io/数据交互分析.md` |
| 指令传递流程分析 | `.reverse/analysis/10_指令传递流程/指令传递流程分析.md` |
| 消息记录 | `.reverse/messages/open-url.txt` |
| 自动化分析 | `.reverse/analysis/manus-automation-analysis.md` |
| Socket 消息 | `.reverse/sources/0.0.47_0/background.ts.js` |

---

## 总结

| 方面 | 实现方式 |
|------|---------|
| **指令流向** | 后端 → 扩展（直连） |
| **前端角色** | 仅展示 UI 和传递用户输入 |
| **通信协议** | Socket.IO，事件名 `my_browser_extension_message` |
| **核心优势** | 职责分离、安全、解耦、性能好、可扩展 |
