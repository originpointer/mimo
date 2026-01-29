# Manus 数据接口结构分析

## 概述

基于 `.reverse/messages` 目录中的消息日志分析，本文档详细说明 Manus 浏览器扩展如何定义数据接口的指令类型。

## 消息通道

所有通信通过统一的 WebSocket 消息通道：

```
"my_browser_extension_message"
```

## 消息类型架构

```
my_browser_extension_message
├── activate_extension (激活扩展)
├── my_browser_extension_connected (连接确认)
├── session_status (会话状态)
└── browser_action (浏览器操作)
    ├── browser_navigate (页面导航)
    ├── browser_click (点击)
    ├── browser_scroll_down (向下滚动)
    └── ... (其他操作)
```

## 消息结构详解

### 1. 连接握手流程

**位置**: `.reverse/messages/connect.txt`

**激活请求 (前端 → 后端)**
```json
{
  "type": "activate_extension",
  "id": "iOsp5rYQ0FIKxyrHYaaogW",
  "timestamp": 1769655035820,
  "clientId": "799d1683-daa4-4a5d-82e3-3d14ff199815",
  "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
  "version": "0.0.47",
  "browserName": "Smart-Fox",
  "allowOtherClient": true,
  "skipAuthorization": true
}
```

**连接确认 (后端 → 前端)**
```json
{
  "type": "my_browser_extension_connected",
  "success": true,
  "roomId": "my_browser_extension_room/310519663250378609",
  "clientId": "799d1683-daa4-4a5d-82e3-3d14ff199815",
  "timestamp": 1769655035999
}
```

### 2. 会话状态消息

**类型**: `session_status`

```json
{
  "type": "session_status",
  "status": "running", // or "stopped"
  "sessionId": "uE2jD9RiRY9uFXAtCdLcDo",
  "sessionTitle": "使用MyBrowser访问localhost5173",
  "clientId": "799d1683-daa4-4a5d-82e3-3d14ff199815"
}
```

### 3. 浏览器操作消息

**类型**: `browser_action`

Manus 使用**嵌套的 action 对象**来定义具体操作类型：

#### 3.1 页面导航 (browser_navigate)

**位置**: `.reverse/messages/open-url.txt`

```json
{
  "type": "browser_action",
  "id": "ZCgH51YSiN6xa2ZWDM9yJd",
  "sessionId": "uE2jD9RiRY9uFXAtCdLcDo",
  "clientId": "799d1683-daa4-4a5d-82e3-3d14ff199815",
  "timestamp": 1769655288731,
  "action": {
    "browser_navigate": {
      "brief": "尝试访问 http://localhost:5173/",
      "intent": "navigational",
      "url": "http://localhost:5173/",
      "append_manusai_user": true
    }
  },
  "screenshot_presigned_url": "https://vida-private.s3.us-east-1.amazonaws.com/...",
  "clean_screenshot_presigned_url": "https://vida-private.s3.us-east-1.amazonaws.com/..."
}
```

**字段说明**:
| 字段 | 说明 |
|------|------|
| `brief` | 操作简述（中文） |
| `intent` | 意图类型 |
| `url` | 目标 URL |
| `append_manusai_user` | 是否附加用户标识 |

#### 3.2 点击操作 (browser_click)

**位置**: `.reverse/messages/click.txt`

```json
{
  "type": "browser_action",
  "action": {
    "browser_click": {
      "brief": "点击按钮第 1 次",
      "index": 4,
      "browser_viewport_width": 1472,
      "browser_viewport_height": 724
    }
  }
}
```

**关键发现**：
- Manus **不使用 XPath** 定位元素
- 使用 `index` 字段，对应元素的 `data-manus_click_id` 属性
- 响应消息显示：`"result": "Click action (single_left) executed via CDP"`

#### 3.3 滚动操作 (browser_scroll_down)

```json
{
  "type": "browser_action",
  "action": {
    "browser_scroll_down": {
      "brief": "向下滚动页面以确保按钮可见",
      "direction": "down",
      "target": "page",
      "browser_viewport_width": 1472,
      "browser_viewport_height": 724,
      "to_bottom": false
    }
  }
}
```

### 4. 响应消息结构

所有操作的响应都遵循统一格式：

```json
[
  {
    "sessionId": "uE2jD9RiRY9uFXAtCdLcDo",
    "actionId": "S4drieikgM1KSen7B1E6Zf",
    "clientId": "799d1683-daa4-4a5d-82e3-3d14ff199815",
    "status": "success",
    "result": {
      "url": "http://localhost:5173/",
      "title": "vite-project",
      "result": "Click action (single_left) executed via CDP",
      "screenshot_uploaded": true,
      "clean_screenshot_uploaded": true,
      "clean_screenshot_path": "",
      "elements": "1[:]{div {id:\"root\"} ...}",
      "markdown": "# vite-project\n...",
      "full_markdown": "# vite-project\n...",
      "pixels_above": 0,
      "pixels_below": 0,
      "viewport_width": 1472,
      "viewport_height": 724,
      "new_pages": []
    }
  }
]
```

**响应关联机制**：
- `sessionId`: 会话标识
- `actionId`: 对应请求中的 `id` 字段
- `status`: `success` 或错误状态

## 设计模式对比

### Manus vs Mimo

| 特性 | Manus 方式 | Mimo 当前方式 |
|------|-----------|--------------|
| **消息通道** | 单一通道 `"my_browser_extension_message"` | 多种消息类型常量 |
| **操作路由** | 嵌套 `action.{browser_*}` | 扁平化 `type` 字段 |
| **元素定位** | `data-manus_click_id` + index | XPath |
| **响应关联** | `sessionId` + `actionId` | `sendResponse` 回调 |
| **截图处理** | 返回 S3 presigned URL | 本地处理 |
| **协议** | WebSocket | Chrome runtime messaging |

### 架构示意图

```
┌─────────────────────────────────────────────────────────────┐
│                    Manus 消息架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Web App (manus.im)                                          │
│      ↓                                                      │
│  WebSocket Channel: "my_browser_extension_message"          │
│      ↓                                                      │
│  Browser Extension (Smart-Fox)                              │
│      ↓                                                      │
│  Nested Action Routing:                                      │
│  ├── action.browser_navigate                                │
│  ├── action.browser_click (index based)                     │
│  └── action.browser_scroll_down                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 关键技术要点

### 1. 元素定位机制

Manus 使用预标记的 `data-manus_click_id` 属性：

```html
<!-- 页面元素 -->
<div data-manus_click_id="0">...</div>
<button data-manus_click_id="4">点击我</button>
```

点击命令使用索引值：
```json
{
  "action": {
    "browser_click": {
      "index": 4  // 对应 data-manus_click_id="4"
    }
  }
}
```

### 2. CDP 点击实现

从响应消息 `"result": "Click action (single_left) executed via CDP"` 可以确认：
- Manus 使用 Chrome DevTools Protocol (CDP) 执行点击
- 与 Mimo 实现方式相同：`Input.dispatchMouseEvent`

### 3. WebSocket 协议

消息格式示例：
```
r 42["my_browser_extension_message", {...}]  # 请求 (receive)
s 42["my_browser_extension_message", {...}]  # 响应 (send)
```

## 参考文件

| 文件 | 说明 |
|------|------|
| `.reverse/messages/connect.txt` | 连接握手流程 |
| `.reverse/messages/open-url.txt` | 导航命令示例 |
| `.reverse/messages/click.txt` | 点击命令演示 |

## 总结

Manus 的数据接口设计特点：
1. **统一消息通道** - 简化了消息路由逻辑
2. **嵌套操作结构** - 通过 `action` 对象实现操作类型的扩展性
3. **索引式元素定位** - 预标记策略，避免复杂的 XPath 查询
4. **WebSocket 实时通信** - 支持双向消息流
5. **CDP 原生事件注入** - 与 Mimo 相同的实现方式
