---
description: "用苏格拉底式提问判断 Nitro 功能应挂载到 nitroApp、event.context、hooks、routes 或 custom preset。"
alwaysApply: false
globs:
  - "server/**/*.ts"
  - "nitro.config.ts"
  - "docs/nitro/**/*.md"
---

## 目的

在 Nitro 项目里新增功能时，先用一组**苏格拉底式提问**帮助你判断“正确的挂载点”，避免：

- 把“服务依赖”塞进生命周期 hooks（变成隐式魔法）
- 把“请求级状态”挂成全局单例（引入串扰/并发问题）
- 让 routes 直接 import utils 造成耦合，而不是从 Nitro context 获取

参考：Cursor Rules 机制说明（项目规则位于 `.cursor/rules`）：[`https://cursor.com/cn/docs/context/rules`](https://cursor.com/cn/docs/context/rules)

## 挂载点候选（快速对照）

- **`nitroApp`（全局服务容器）**：适合“启动时初始化一次、全局复用”的能力（如索引、连接池、客户端、缓存门面）。
- **`event.context`（请求级上下文）**：适合“每个请求都可能不同”的数据（如请求 traceId、鉴权结果、租户信息）。
- **`nitroApp.hooks`（生命周期副作用/观测/修饰）**：适合“请求/响应生命周期的日志、埋点、统一错误捕获、响应加工”等。
- **routes（路由 handler 本身）**：适合“纯业务编排”，不应承载复杂的初始化/全局副作用。
- **custom preset / entry（运行时入口）**：适合“改变运行时启动方式/接入 provider”，不是常规业务功能挂载点。

## 苏格拉底式提问：先问再写

### 1) 你的“功能”本质是什么？

- **它是一个可复用服务/依赖吗？**
  - 是否会被多个 route/middleware/插件使用？
  - 是否需要稳定 API（例如 `search(q)`、`getClient()`）？
  - 如果是：倾向挂到 **`nitroApp`**。

- **它是一次请求的临时状态吗？**
  - 是否只在当前请求有效（与 `event` 绑定）？
  - 是否包含用户/租户/trace 等请求级信息？
  - 如果是：倾向放到 **`event.context`**。

- **它是生命周期副作用/观测吗？**
  - 是否核心价值是“记录/拦截/修改请求或响应”？
  - 是否天然属于 request/beforeResponse/afterResponse/error/close 等生命周期？
  - 如果是：倾向使用 **`nitroApp.hooks.hook(...)`**。

### 2) 你希望“消费者”如何使用它？

- 你希望调用方写出**显式依赖**吗（可读、可搜索、可类型提示）？
  - 例如：`useNitroApp().xxx.doSomething()`
  - 若希望：倾向 **`nitroApp`**（或 `event.context`）。

- 你希望调用方“什么都不做”，靠 hook 隐式生效吗？
  - 例如：所有响应都被 beforeResponse 自动改写
  - 若是：确认这真的是“响应加工/观测”类需求，否则容易产生隐式耦合。

### 3) 生命周期与并发模型是什么？

- 它是否应当在启动时初始化一次（eager），并在整个进程内复用？
  - 若是：倾向 **`nitroApp`**。

- 它是否与某个请求绑定，且并发请求之间必须隔离？
  - 若是：倾向 **`event.context`**。

### 4) 可测试性与可替换性要求？

- 你是否希望在测试中轻松替换实现（mock/stub）？
  - `nitroApp.xxx = fakeService` 通常最直观。

- 你是否能接受为了触发功能而必须跑完整请求生命周期（才能触发 hook）？
  - 若不能：谨慎把“服务能力”塞进 hooks。

### 5) 失败语义应该在哪里暴露？

- 初始化失败应该是“启动即失败”（fail-fast）吗？
  - 若是：倾向 **`nitroApp` + plugin 启动初始化**。

- 失败只影响单次请求处理吗？
  - 若是：倾向 `event.context` 或 route 内处理。

### 6) 反例校验（强制自检）

- 我是不是正在用 `beforeResponse` 来“导出服务/依赖”？
  - 如果是：停一下，问自己——这是否违背“hook 用于响应生命周期”的语义？
  - 服务导出通常应挂到 `nitroApp`；`beforeResponse` 更适合“观测/加工响应”。

## 推荐决策（可直接套用）

- **全局复用能力**：挂 `nitroApp`（由 plugin 初始化/挂载），routes 通过 `useNitroApp()` 获取。
- **请求级信息**：放 `event.context`（由 middleware 或 route 入口注入）。
- **日志/埋点/统一错误处理/响应加工**：使用 `nitroApp.hooks`。


