### Understudy：CDP 驱动层（Context / Page / Frame / Locator）

Understudy 是 Stagehand v3 的“浏览器执行引擎”：用 CDP（Chrome DevTools Protocol）管理 target/session/frame，并提供类似 Playwright 的 Page/Locator 操作能力。

---

### 1) `V3Context`：Target/Session -> Page 的管理者

文件：`lib/v3/understudy/context.ts`

#### 1.1 核心职责

- 连接根 CDP websocket：`CdpConnection.connect(wsUrl)`
- 管理 top-level targets（页面 tab）：**每个 top-level target 对应一个 `Page` 实例**
- 管理 OOPIF（跨进程 iframe）会话：把 child session “adopt” 到拥有它的 Page
- 维护映射：
  - `pagesByTarget: targetId -> Page`
  - `mainFrameToTarget: mainFrameId -> targetId`
  - `sessionOwnerPage: sessionId -> Page`
  - `frameOwnerPage: frameId -> Page`（用于快速反查；真正的 ownership 规则在 `Page/FrameRegistry`）

#### 1.2 事件桥接（重要）

`V3Context.bootstrap()` 订阅：

- `Target.attachedToTarget` → `onAttachedToTarget()`
- `Target.detachedFromTarget` → `onDetachedFromTarget()`
- `Target.targetDestroyed` → `cleanupByTarget()`
- `Target.targetCreated`（fallback attach，覆盖某些 OOPIF attach 不稳定场景）

当 session attach 后：

- 对 top-level page：`Page.create(conn, session, targetId, apiClient, launchOptions, isBrowserbase)`
- 对 child/OOPIF：尝试 `Page.getFrameTree` 得到 child root frameId 并 adopt

---

### 2) `Page`：每个 top-level target 的聚合根

文件：`lib/v3/understudy/page.ts`

#### 2.1 核心约束：FrameId 的 session ownership

- `Page` 持有：top-level session + adopted OOPIF sessions
- `FrameRegistry` 是唯一真相：
  - frame 树结构（parent/children、swap/root changes）
  - frameId -> session 的 ownership

这也是 `Frame` 的关键前提：**Frame 上的 CDP 调用必须走拥有该 frameId 的 session**。

#### 2.2 Page 提供的能力（示例）

- 导航：`goto/goBack/reload`（内部会用 lifecycle watcher / network manager）
- 截图：封装 `Page.captureScreenshot`，含遮罩/动画禁用等处理
- console：管理 console listeners
- init scripts：通过 `Page.addScriptToEvaluateOnNewDocument` 分发到每个 session
- cursor overlay：hybrid 模式用于可视化指针位置

---

### 3) `Frame`：绑定 session 的薄封装

文件：`lib/v3/understudy/frame.ts`

- 只做“把某个 frameId 的操作发到正确 session”
- 常用能力：
  - `evaluate()`：在 main world 执行表达式/函数（自动序列化结果）
  - `screenshot()`：frame/session 级 screenshot
  - `getAccessibilityTree()`：支持 frame-scoped，必要时 fallback 到 unscoped

---

### 4) `Locator`：Frame 内的元素交互

文件：`lib/v3/understudy/locator.ts`

#### 4.1 设计要点

- 每次 action 都会重新 resolve selector（lazy）
- 倾向使用 **objectId** 驱动（降低 nodeId 脆弱性）
- 使用 `Page.createIsolatedWorld` + 注入的 locator scripts

#### 4.2 remote browser 的文件上传

- 本地浏览器：写临时文件 + `DOM.setFileInputFiles`
- 远程浏览器：将 payload base64 注入页面，由 DOM helper 构造 File 并触发 change/input（规避远程环境无法访问本地文件系统）
