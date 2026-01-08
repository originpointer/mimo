### DOM 注入与观察链路：DOM tree / clickable elements / iframe fallback

本页聚焦“Navigator 如何获得页面可操作元素视图”，以及 DOM tree 如何构建、标注与回退。

---

### 1) DOM 注入触发点

文件：`chrome-extension/src/background/index.ts`

- `chrome.tabs.onUpdated`：当 tab load complete 且 URL 以 http 开头时，调用 `injectBuildDomTreeScripts(tabId)`。

---

### 2) DOM service：核心 API

文件：`chrome-extension/src/background/browser/dom/service.ts`

- **注入脚本**：`injectBuildDomTreeScripts(tabId)`
  - 目标是在页面上下文提供：
    - `window.buildDomTree(args)`：生成结构化 DOM tree（并生成 highlightIndex/selector map 等）
    - `window.turn2Markdown(selector?)`：页面/元素转 markdown
    - `window.parserReadability()`：readability 抽取

- **构建 clickable elements**：
  - `getClickableElements(tabId, url, showHighlightElements, focusElement, viewportExpansion, debugMode)`
  - 内部调用 `_buildDomTree(...)`：
    - `chrome.scripting.executeScript({ func: args => window.buildDomTree(args) })`
    - 返回 `BuildDomTreeResult`（rootId + map + 可选 perfMetrics）

---

### 3) iframe fallback（跨域/无法注入）

文件：`chrome-extension/src/background/browser/dom/service.ts`

当主 frame 的 DOM tree 显示“可见 iframe 构建失败”时：

1. `chrome.webNavigation.getAllFrames({ tabId })` 获取 frames
2. 对失败 frame 单独执行 `chrome.scripting.executeScript({ frameIds: [...] })`
3. 对每个 subframe 单独执行 `window.buildDomTree(...)`
4. 最终在 background 侧合并 frame tree（`constructFrameTree`）

这解决了跨域 iframe 无法在主 frame 内直接读取 DOM 的问题。

---

### 4) DOM 表示：`DOMElementNode` / `DOMTextNode`

文件：`chrome-extension/src/background/browser/dom/views.ts`

- `DOMElementNode` 关键字段：
  - `xpath`：相对于“最近 root”（document / shadowRoot / iframe）的 xpath
  - `highlightIndex`：为可交互元素分配的编号（供 LLM 用 index 执行动作）
  - `attributes`：会按 includeAttributes 过滤以节省 token
  - `viewportCoordinates/pageCoordinates/viewportInfo`：用于 vision/滚动定位
  - `isNew`：用于向模型表达“本次 state 相对上次变化”

- `clickableElementsToString(includeAttributes)`：把 DOM tree 压缩成 LLM 可消费的“可交互元素清单文本”。

---

### 5) Page 如何使用 DOM service

文件：`chrome-extension/src/background/browser/page.ts`

- `Page.getClickableElements(showHighlightElements, focusElement)`
  - 调用 DOM service 的 `getClickableElements(tabId, this.url(), ...)`

- `Page.attachPuppeteer()`
  - 通过 `ExtensionTransport.connectTab(tabId)` 建立 CDP 连接
  - `evaluateOnNewDocument` 注入 anti-detection 与 shadow DOM open

---

### 6) 可点击元素的“稳定性”与历史

- `ClickableElementProcessor`：`browser/dom/clickable/service.ts`
  - 提供 `getClickableElementsHashes(domTree)`，通过 WebCrypto SHA-256 对元素（branchPath/attributes/xpath）做 hash
  - 用途：降低 DOM 变化带来的 index 漂移，辅助判断哪些元素是新/旧

- `HistoryTreeProcessor`：`browser/dom/history/service.ts`
  - 将 `DOMElementNode` 转为 `DOMHistoryElement` 并进行 hash
  - 提供 `findHistoryElementInTree(...)`：用于在新 DOM tree 中查找历史元素（回放/定位）
