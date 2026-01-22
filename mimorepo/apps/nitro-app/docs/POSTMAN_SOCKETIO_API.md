# Socket.IO API 使用文档

## 概述

此 Socket.IO 服务器提供客户端与服务器之间的实时双向通信。服务器支持 WebSocket 和 polling 两种传输方式。

## 服务器连接信息

| 属性 | 值 |
|------|-----|
| **基础 URL** | `http://localhost:6006` |
| **Socket.IO 路径** | `/socket.io/` |
| **传输方式** | `websocket`、`polling` |
| **CORS 源** | `http://localhost:3000`（可通过 `CORS_ORIGIN` 环境变量配置） |

## 连接服务器

### 使用 Postman 连接

1. 打开 Postman，创建一个新请求
2. 将请求类型更改为 **Socket.IO**
3. 输入服务器地址：`http://localhost:6006`
4. 配置设置：
   - **传输方式**：`websocket`、`polling`
   - **路径**：`/socket.io/`
   - **重连**：启用

### 使用 JavaScript（浏览器）

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:6006", {
  transports: ["websocket", "polling"],
  reconnection: true
});

socket.on("connect", () => {
  console.log("已连接到服务器：", socket.id);
});
```

### 使用 Node.js

```javascript
const { io } = require("socket.io-client");

const socket = io("http://localhost:6006", {
  transports: ["websocket", "polling"],
  reconnection: true
});

socket.on("connect", () => {
  console.log("已连接到服务器：", socket.id);
});
```

## 事件参考

### 服务器事件（客户端监听）

#### `connect`

客户端成功连接到服务器时触发。

**数据：**
```typescript
// 无数据，但 socket.id 包含连接 ID
socket.id: string
```

**示例响应：**
```json
{
  "socketId": "abc123..."
}
```

---

#### `disconnect`

客户端与服务器断开连接时触发。

**数据：**
```typescript
reason: string  // 断开原因
```

**示例：**
```json
"transport close"
```

**常见断开原因：**
- `transport close` - 连接已关闭（例如用户关闭标签页）
- `client namespace disconnect` - 客户端主动断开连接
- `server namespace disconnect` - 服务器断开客户端连接

---

#### `message-ack`

服务器收到客户端的 `message` 事件后触发。

**数据：**
```typescript
{
  received: boolean;
  timestamp: number;
}
```

**示例：**
```json
{
  "received": true,
  "timestamp": 1737547200000
}
```

---

#### `room-joined`

客户端成功加入房间后触发。

**数据：**
```typescript
{
  roomId: string;
  socketId: string;
}
```

**示例：**
```json
{
  "roomId": "chat-room-1",
  "socketId": "abc123..."
}
```

---

### 客户端事件（服务器监听）

#### `message`

向服务器发送消息。

**数据：** `unknown`（任何可序列化为 JSON 的数据）

**示例：**
```json
{
  "text": "你好，服务器！",
  "userId": "user-123"
}
```

**Postman 设置：**
- 事件：`message`
- 数据：`{"text": "你好，服务器！"}`

---

#### `join-room`

加入特定房间以进行基于房间的消息传递。

**数据：** `string`（房间 ID）

**示例：**
```json
"chat-room-1"
```

**Postman 设置：**
- 事件：`join-room`
- 数据：`"chat-room-1"`

---

## 使用 Postman 测试

### 步骤 1：连接服务器

1. 在 Postman 中创建新的 Socket.IO 请求
2. 设置 URL：`http://localhost:6006`
3. 点击 **连接**

### 步骤 2：发送消息

1. 点击 **发送消息**
2. 事件：`message`
3. 数据：
   ```json
   {
     "text": "来自 Postman 的问候！"
   }
   ```

### 步骤 3：加入房间

1. 点击 **发送消息**
2. 事件：`join-room`
3. 数据：
   ```json
   "test-room"
   ```

### 步骤 4：监听事件

Postman 将自动显示收到的事件：
- `connect` - 连接成功时
- `message-ack` - 发送消息后
- `room-joined` - 加入房间后
- `disconnect` - 断开连接时

## 使用 curl 测试

注意：Socket.IO 需要 WebSocket 客户端，curl 原生不支持。请使用 JavaScript 客户端或 Postman 进行测试。

简单的 HTTP polling 测试：

```bash
# 测试 Socket.IO 端点可用性
curl -I http://localhost:6006/socket.io/
```

## 使用浏览器测试

在浏览器中打开测试页面 [test-socket.html](../test-socket.html)：

```bash
# 启动服务器
pnpm dev

# 在浏览器中打开 test-socket.html
open apps/nitro-app/test-socket.html
```

## 服务器端广播

服务器支持向所有连接的客户端或特定房间广播消息。

### 向所有客户端广播

```typescript
import { broadcastToAll } from "~/lib/socketio";

broadcastToAll("notification", {
  message: "服务器公告"
});
```

### 向房间广播

```typescript
import { broadcastToRoom } from "~/lib/socketio";

broadcastToRoom("chat-room-1", "new-message", {
  text: "大家好！",
  sender: "user-123"
});
```

## 错误处理

### 常见连接错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `ECONNREFUSED` | 服务器未运行 | 使用 `pnpm dev` 启动服务器 |
| CORS 错误 | 源不被允许 | 设置 `CORS_ORIGIN` 环境变量 |
| `Invalid namespace` | 路径不正确 | 使用 `/socket.io/` 作为路径 |

### 调试

启用 Socket.IO 调试日志：

```javascript
const socket = io("http://localhost:6006", {
  debug: true
});

// 或在浏览器中设置 localStorage
localStorage.debug = "socket.io-client:*";
```

## 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `CORS_ORIGIN` | `http://localhost:3000` | WebSocket 连接的允许 CORS 源 |
| `NITRO_PORT` | `6006` | Nitro 服务器的端口 |

## 完整示例流程

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:6006");

// 1. 等待连接
socket.on("connect", () => {
  console.log("已连接：", socket.id);

  // 2. 发送消息
  socket.emit("message", { text: "你好！" });
});

// 3. 接收确认
socket.on("message-ack", (data) => {
  console.log("消息已确认：", data);
});

// 4. 加入房间
socket.emit("join-room", "my-room");

// 5. 接收房间确认
socket.on("room-joined", (data) => {
  console.log("已加入房间：", data.roomId);
});

// 6. 处理断开连接
socket.on("disconnect", (reason) => {
  console.log("已断开连接：", reason);
});
```

## 相关资源

- [Socket.IO 客户端文档](https://socket.io/docs/v4/client-api/)
- [Socket.IO 服务器文档](https://socket.io/docs/v4/server-api/)
- [Postman WebSocket 测试指南](https://blog.postman.com/postman-now-supports-websocket-apis/)
