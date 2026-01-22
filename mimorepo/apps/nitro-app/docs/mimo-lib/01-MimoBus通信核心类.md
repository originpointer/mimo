# MimoBus 类详细文档

## 概述

MimoBus 是 Mimo Library 的核心通信类，负责通过 Socket.IO 与前端建立双向通信连接。所有浏览器操作指令都通过 MimoBus 发送到前端，执行结果也通过 MimoBus 接收。

**位置**: `@mimo/lib/bus`

**架构图**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mimo (Nitro Server)                       │
│                                                                   │
│  ┌───────────────┐                                                │
│  │   MimoBus     │ ◄────── 所有浏览器操作指令都通过这里发送        │
│  │  (通信核心)    │                                                │
│  └───────┬───────┘                                                │
└──────────┼─────────────────────────────────────────────────────────┘
           │
           │ Socket.IO (WebSocket)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next App                                    │
│  ┌───────────────┐                                                │
│  │ Socket Client │ ◄────── 接收指令，转发到扩展                   │
│  └───────┬───────┘                                                │
└──────────┼─────────────────────────────────────────────────────────┘
           │
           │ Chrome Extension API
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Plasmo App (Extension)                        │
│  ┌───────────────┐                                                │
│  │ Message Hub   │ ◄────── 接收指令，调用 Stagehand 执行           │
│  └───────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

## 类定义

```typescript
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';

interface MimoBusOptions {
  url?: string;                  // Socket.IO 服务器 URL
  autoReconnect?: boolean;       // 自动重连
  reconnectInterval?: number;    // 重连间隔（毫秒）
  timeout?: number;              // 默认超时时间（毫秒）
  debug?: boolean;               // 调试模式
}

export class MimoBus extends EventEmitter {
  constructor(options?: MimoBusOptions)
  // ... 方法
}
```

## 构造函数

```typescript
constructor(opts?: MimoBusOptions)
```

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | `"ws://localhost:3000/socket.io/"` | Socket.IO 服务器 URL |
| `autoReconnect` | `boolean` | `true` | 是否自动重连 |
| `reconnectInterval` | `number` | `1000` | 重连间隔（毫秒） |
| `timeout` | `number` | `30000` | 默认超时时间（毫秒） |
| `debug` | `boolean` | `false` | 是否启用调试日志 |

**示例**:

```typescript
// 默认配置
const bus = new MimoBus();

// 自定义配置
const bus = new MimoBus({
  url: "wss://api.example.com/socket.io/",
  autoReconnect: true,
  reconnectInterval: 5000,
  timeout: 60000,
  debug: true,
});
```

---

## 连接管理

### connect()

建立 Socket.IO 连接。

```typescript
async connect(): Promise<void>
```

**返回**: `Promise<void>`

**抛出**:
- `MimoBusConnectionError` - 连接失败
- `MimoBusTimeoutError` - 连接超时

**示例**:

```typescript
try {
  await bus.connect();
  console.log('已连接到 Socket.IO 服务器');
} catch (error) {
  console.error('连接失败:', error);
}
```

**内部实现**:

```typescript
async connect(): Promise<void> {
  if (this.isConnected()) {
    this.logger('already connected', { level: 1 });
    return;
  }

  this.socket = io(this.opts.url, {
    autoConnect: true,
    reconnection: this.opts.autoReconnect,
    reconnectionDelay: this.opts.reconnectInterval,
    timeout: this.opts.timeout,
  });

  // 设置事件监听
  this.setupEventHandlers();

  // 等待连接完成
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new MimoBusTimeoutError('Connection timeout'));
    }, this.opts.timeout);

    this.socket.once('connect', () => {
      clearTimeout(timeout);
      this.emit('connected');
      resolve();
    });

    this.socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      reject(new MimoBusConnectionError(error.message));
    });
  });
}
```

---

### disconnect()

断开 Socket.IO 连接。

```typescript
async disconnect(): Promise<void>
```

**示例**:

```typescript
await bus.disconnect();
console.log('已断开连接');
```

---

### isConnected()

检查是否已连接。

```typescript
isConnected(): boolean
```

**返回**: `boolean`

**示例**:

```typescript
if (bus.isConnected()) {
  console.log('已连接');
} else {
  console.log('未连接');
}
```

---

### onConnected()

监听连接事件。

```typescript
onConnected(callback: () => void): void
```

**示例**:

```typescript
bus.onConnected(() => {
  console.log('已连接到服务器');
});
```

---

### onDisconnected()

监听断开连接事件。

```typescript
onDisconnected(callback: (reason: string) => void): void
```

**示例**:

```typescript
bus.onDisconnected((reason) => {
  console.log('连接断开:', reason);
});
```

---

## 指令发送

### send()

发送指令并等待响应。

```typescript
async send<T = any>(
  command: MimoCommand
): Promise<MimoResponse<T>>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `command` | `MimoCommand` | 指令对象 |

**返回**: `Promise<MimoResponse<T>>`

**抛出**:
- `MimoBusNotConnectedError` - 未连接
- `MimoBusTimeoutError` - 响应超时

**示例**:

```typescript
const response = await bus.send({
  id: uuidv4(),
  type: "page.goto",
  payload: { url: "https://example.com" },
  options: { timeout: 10000 },
  timestamp: Date.now(),
});

if (response.success) {
  console.log('导航成功:', response.data);
} else {
  console.error('导航失败:', response.error);
}
```

---

### sendWithStream()

发送指令并流式接收响应。

```typescript
async sendWithStream<T = any>(
  command: MimoCommand
): AsyncGenerator<MimoStreamEvent<T>>
```

**参数**: 同 `send()`

**返回**: `AsyncGenerator<MimoStreamEvent<T>>`

**示例**:

```typescript
const stream = await bus.sendWithStream({
  id: uuidv4(),
  type: "dom.observe",
  payload: { instruction: "find all clickable elements" },
  timestamp: Date.now(),
});

for await (const event of stream) {
  switch (event.type) {
    case "data":
      console.log('数据:', event.data);
      break;
    case "error":
      console.error('错误:', event.error);
      break;
    case "end":
      console.log('结束');
      break;
  }
}
```

---

### sendWithoutWaiting()

发送指令但不等待响应（fire-and-forget）。

```typescript
sendWithoutWaiting(command: MimoCommand): void
```

**示例**:

```typescript
bus.sendWithoutWaiting({
  id: uuidv4(),
  type: "page.screenshot",
  payload: {},
  timestamp: Date.now(),
});
```

---

## 事件监听

### on()

监听来自前端的事件。

```typescript
on(event: string, handler: (data: any) => void): void
```

**预定义事件**:

| 事件 | 数据 | 说明 |
|------|------|------|
| `command.result` | `{ id: string, response: MimoResponse }` | 指令执行结果 |
| `screenshot` | `{ buffer: Buffer, tabId: string }` | 截图数据 |
| `dom.changed` | `{ changes: DomChange[] }` | DOM 变化 |
| `tab.changed` | `{ tab: TabInfo }` | 标签页变化 |
| `tab.closed` | `{ tabId: string }` | 标签页关闭 |
| `stream.data` | `{ id: string, data: any }` | 流式数据 |
| `stream.error` | `{ id: string, error: string }` | 流式错误 |
| `stream.end` | `{ id: string }` | 流式结束 |
| `error` | `{ error: Error }` | 错误事件 |

**示例**:

```typescript
// 监听指令结果
bus.on('command.result', ({ id, response }) => {
  console.log(`指令 ${id} 结果:`, response);
});

// 监听截图
bus.on('screenshot', ({ buffer, tabId }) => {
  console.log(`收到截图，大小: ${buffer.length}`);
  // 保存到文件
  fs.writeFileSync(`screenshot-${tabId}.png`, buffer);
});

// 监听标签页关闭
bus.on('tab.closed', ({ tabId }) => {
  console.log(`标签页 ${tabId} 已关闭`);
});

// 监听流式数据
bus.on('stream.data', ({ id, data }) => {
  console.log(`流 ${id} 数据:`, data);
});
```

---

### off()

移除事件监听。

```typescript
off(event: string, handler?: (data: any) => void): void
```

**示例**:

```typescript
// 移除特定监听器
const handler = (data) => console.log(data);
bus.off('screenshot', handler);

// 移除所有监听器
bus.off('screenshot');
```

---

### once()

监听一次事件。

```typescript
once(event: string, handler: (data: any) => void): void
```

**示例**:

```typescript
bus.once('connected', () => {
  console.log('首次连接成功');
});
```

---

## 房间管理

### joinRoom()

加入房间。

```typescript
async joinRoom(roomId: string): Promise<void>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `roomId` | `string` | 房间 ID |

**示例**:

```typescript
await bus.joinRoom('session-123');
// 之后发送到此房间的消息只会被房间内成员接收
```

---

### leaveRoom()

离开房间。

```typescript
async leaveRoom(roomId: string): Promise<void>
```

**示例**:

```typescript
await bus.leaveRoom('session-123');
```

---

## 广播

### broadcast()

广播消息到所有连接的客户端。

```typescript
broadcast(event: string, data: any): void
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `event` | `string` | 事件名称 |
| `data` | `any` | 数据 |

**示例**:

```typescript
bus.broadcast('notification', {
  message: '操作完成',
  type: 'success'
});
```

---

### broadcastToRoom()

广播消息到特定房间。

```typescript
broadcastToRoom(roomId: string, event: string, data: any): void
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `roomId` | `string` | 房间 ID |
| `event` | `string` | 事件名称 |
| `data` | `any` | 数据 |

**示例**:

```typescript
bus.broadcastToRoom('session-123', 'update', {
  progress: 50,
  status: 'processing'
});
```

---

## 生命周期

### destroy()

销毁 MimoBus 实例，清理所有资源。

```typescript
destroy(): void
```

**示例**:

```typescript
bus.destroy();
```

**内部实现**:

```typescript
destroy(): void {
  // 移除所有监听器
  this.removeAllListeners();

  // 断开 Socket.IO 连接
  if (this.socket) {
    this.socket.disconnect();
    this.socket = null;
  }

  // 清理待处理的指令
  this.pendingCommands.clear();
  this.streamControllers.clear();
}
```

---

## 指令类型

### CommandType

```typescript
type CommandType =
  // 页面操作
  | "page.init"                // 初始化页面连接
  | "page.goto"                // 导航到 URL
  | "page.reload"              // 重新加载页面
  | "page.goBack"              // 后退
  | "page.goForward"           // 前进
  | "page.getUrl"              // 获取当前 URL
  | "page.getTitle"            // 获取页面标题
  | "page.getContent"           // 获取页面内容

  // 元素交互
  | "page.click"               // 点击元素
  | "page.fill"                // 填充输入框
  | "page.select"              // 选择下拉框
  | "page.hover"               // 悬停元素

  // DOM 操作
  | "dom.observe"              // 观察页面元素
  | "dom.locator"              // 创建定位器
  | "dom.deepLocator"          // 创建深度定位器
  | "dom.mark"                 // 标记元素
  | "dom.unmark"               // 取消标记
  | "dom.unmarkAll"            // 取消所有标记

  // 截图和执行
  | "page.screenshot"          // 截取页面截图
  | "page.evaluate"            // 执行 JavaScript
  | "page.waitFor"             // 等待元素

  // 浏览器操作
  | "browser.getTabs"          // 获取所有标签页
  | "browser.getActiveTab"     // 获取活动标签页
  | "browser.switchTab"        // 切换标签页
  | "browser.newTab"           // 新建标签页
  | "browser.closeTab"         // 关闭标签页

  // 流式传输
  | "stream.start"             // 开始流式传输
  | "stream.chunk"             // 流式数据块
  | "stream.end"               // 结束流式传输
```

### MimoCommand

```typescript
interface MimoCommand {
  id: string;                    // UUID 唯一标识
  type: CommandType;            // 指令类型
  payload: any;                 // 指令参数（具体格式取决于 type）
  options?: {
    timeout?: number;           // 超时时间（毫秒）
    tabId?: string;             // 目标标签页 ID
    frameId?: string;           // 目标 Frame ID
  };
  timestamp: number;            // 发送时间戳
}
```

### 指令 Payload 格式

#### page.goto

```typescript
{
  type: "page.goto",
  payload: {
    url: string;                // 目标 URL
    waitUntil?: "load" | "domcontentloaded" | "networkidle";
    timeout?: number;
  }
}
```

#### page.click

```typescript
{
  type: "page.click",
  payload: {
    selector: string;           // CSS 选择器或 XPath
    button?: "left" | "right" | "middle";
    clickCount?: number;
    delay?: number;
    modifiers?: {
      alt?: boolean;
      control?: boolean;
      meta?: boolean;
      shift?: boolean;
    };
  }
}
```

#### page.fill

```typescript
{
  type: "page.fill",
  payload: {
    selector: string;
    value: string;
  }
}
```

#### dom.observe

```typescript
{
  type: "dom.observe",
  payload: {
    instruction?: string;       // 观察指令
    selector?: string;          // 限定范围
  }
}
```

#### page.screenshot

```typescript
{
  type: "page.screenshot",
  payload: {
    fullPage?: boolean;
    type?: "png" | "jpeg";
    quality?: number;
    clip?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }
}
```

---

## 响应格式

### MimoResponse

```typescript
interface MimoResponse<T = any> {
  id: string;                    // 对应的指令 ID
  success: boolean;              // 执行是否成功
  data?: T;                      // 响应数据
  error?: {
    code: string;               // 错误代码
    message: string;            // 错误消息
    stack?: string;             // 堆栈跟踪
  };
  timestamp: number;            // 响应时间戳
  duration?: number;            // 执行耗时（毫秒）
}
```

### 响应数据类型

#### page.goto 响应

```typescript
interface PageGotoResponse {
  url: string;                  // 最终 URL
  status: number;               // HTTP 状态码
  ok: boolean;                  // 是否成功
}
```

#### page.click 响应

```typescript
interface PageClickResponse {
  selector: string;             // 点击的选择器
  success: boolean;             // 是否成功
}
```

#### dom.observe 响应

```typescript
interface DomObserveResponse {
  actions: Action[];             // 可操作元素列表
}

interface Action {
  selector: string;
  description: string;
  method?: string;
  arguments?: string[];
}
```

#### page.screenshot 响应

```typescript
interface PageScreenshotResponse {
  buffer: string;                // Base64 编码的图片数据
  format: "png" | "jpeg";
  size: number;                 // 图片大小（字节）
}
```

---

## 错误处理

### 错误类

```typescript
// 连接错误
class MimoBusConnectionError extends Error {
  constructor(message: string)
}

// 超时错误
class MimoBusTimeoutError extends Error {
  constructor(message: string, public timeout: number)
}

// 未连接错误
class MimoBusNotConnectedError extends Error {
  constructor()
}

// 指令错误
class MimoBusCommandError extends Error {
  constructor(message: string, public command: MimoCommand)
}
```

### 错误处理示例

```typescript
try {
  const response = await bus.send({
    id: uuidv4(),
    type: "page.goto",
    payload: { url: "https://example.com" },
    timestamp: Date.now(),
  });
} catch (error) {
  if (error instanceof MimoBusTimeoutError) {
    console.log(`操作超时: ${error.timeout}ms`);
  } else if (error instanceof MimoBusNotConnectedError) {
    console.log('未连接到服务器');
  } else if (error instanceof MimoBusConnectionError) {
    console.log('连接失败:', error.message);
  }
}
```

---

## 高级用法

### 指令拦截

```typescript
// 拦截所有发送的指令
bus.on('sending', (command: MimoCommand) => {
  console.log('发送指令:', command.type);
});

// 拦截所有接收的响应
bus.on('received', (response: MimoResponse) => {
  console.log('接收响应:', response.id, response.success);
});
```

### 批量指令

```typescript
const commands = [
  { type: "page.fill", payload: { selector: "#username", value: "user" } },
  { type: "page.fill", payload: { selector: "#password", value: "pass" } },
  { type: "page.click", payload: { selector: "#submit" } },
];

for (const cmd of commands) {
  await bus.send({
    id: uuidv4(),
    ...cmd,
    timestamp: Date.now(),
  });
}
```

### 流式传输

```typescript
// 发送流式指令
const streamId = uuidv4();
await bus.send({
  id: streamId,
  type: "stream.start",
  payload: { instruction: "extract all links" },
  timestamp: Date.now(),
});

// 监听流式数据
bus.on(`stream.${streamId}.data`, (data) => {
  console.log('数据块:', data);
});

bus.on(`stream.${streamId}.end`, () => {
  console.log('流式传输结束');
});
```

### 重连处理

```typescript
bus.on('disconnected', (reason) => {
  console.log('连接断开:', reason);

  // 自动重连
  setTimeout(async () => {
    try {
      await bus.connect();
      console.log('重连成功');
    } catch (error) {
      console.log('重连失败:', error);
    }
  }, 5000);
});
```
