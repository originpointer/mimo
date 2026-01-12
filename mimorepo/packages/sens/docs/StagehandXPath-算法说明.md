# StagehandXPath 算法说明（@repo/sens）

本文档描述 `@repo/sens` 中 StagehandXPath 的**算法层**：它提供一组纯算法工具，帮助你在遍历 DOM Node 树时生成 stagehand 风格的 XPath step，并拼接为绝对 XPath。

> 说明：算法层只关心“**给定节点序列如何生成 XPath**”；扫描哪些元素、如何跨 tab/frame 通信属于协议层（见 `plasmo-app` 文档）。

## 代码位置

- 实现：`src/utils/stagehand-xpath.ts`
- 推荐导出：`@repo/sens/utils`（在本仓库里若 dist 尚未产出，可在应用侧临时深导入源码）

## 设计目标

- **最小依赖**：不依赖浏览器 DOM API，不依赖 CDP session，仅做字符串/序列算法。\n- **可对齐 stagehand v3**：规则与 stagehand 的 `xpathUtils` 保持一致（例如：每段都带 `[n]`、命名空间标签处理等）。\n
## 核心类型

### `CdpDomNodeLike`

```ts
export type CdpDomNodeLike = {
  nodeType: number
  nodeName: string
}
```

意图：只要求 `nodeType/nodeName`，以便直接适配：\n- CDP DOM Node（例如 `Protocol.DOM.Node` 的子集）\n- 或你自己构造的树节点\n
常见 `nodeType`：\n- `1`：Element\n- `3`：Text\n- `8`：Comment\n
## 核心函数

### `buildChildXPathSegments(kids)`

输入：同一父节点下的 child 列表（保持顺序）。\n输出：与 `kids` 等长的 XPath step 数组。

生成规则：
- **Element**：`tag[n]`\n- **Text**：`text()[n]`\n- **Comment**：`comment()[n]`\n- **命名空间标签**（例如 `svg:rect`）：`*[name()='svg:rect'][n]`\n
计数规则：
- 计数 key 为 `${nodeType}:${tag}`，因此 element/text/comment 分开计数。\n- 索引是 **1-based**。\n
### `joinXPath(base, step)`

将 `base` 与 `step` 拼接为新 XPath。\n\n特殊约定：\n- 当 `step === \"//\"` 时，表示“descendant hop / 跨边界 hop”语义：\n  - `joinXPath(\"/\", \"//\") => \"//\"`\n  - `joinXPath(\"/html[1]/body[1]\", \"//\") => \"/html[1]/body[1]//\"`\n  - `joinXPath(\"/html[1]/body[1]//\", \"slot[1]\") => \"/html[1]/body[1]//slot[1]\"`\n\n该语义常用于表达穿透 shadow root / 后代跳转（是否使用由你的遍历策略决定）。\n
### `normalizeXPath(x)`

标准化输入 XPath：\n- 去掉 `xpath=` 前缀\n- 确保 leading `/`\n- 去掉尾部 `/`（根路径除外）\n
### `prefixXPath(parentAbs, child)`

将 `child` 以前缀 `parentAbs` 组合：\n- `parentAbs === \"/\"` 视为 no-op\n- 若 `child` 以 `\"//\"` 开头，保留 hop 语义拼接\n
## 推荐用法：遍历树构建绝对 XPath

典型用法是在遍历 DOM 树时：\n1) 用 `buildChildXPathSegments(children)` 得到每个 child 的 step\n2) 用 `joinXPath(parentXp, step)` 得到 child 的绝对 XPath\n
```ts
import { buildChildXPathSegments, joinXPath } from "@repo/sens/utils"

type Node = { nodeType: number; nodeName: string; children?: Node[] }

function buildXpathMap(root: Node) {
  const out = new Map<Node, string>()
  const walk = (node: Node, xp: string) => {
    out.set(node, xp)
    const kids = node.children ?? []
    if (!kids.length) return
    const segs = buildChildXPathSegments(kids)
    for (let i = 0; i < kids.length; i++) {
      walk(kids[i]!, joinXPath(xp, segs[i]!))
    }
  }
  walk(root, "/")
  return out
}
```

## 适用范围与限制

- 该算法层**不负责**：\n  - 跨域 iframe DOM 访问\n  - closed shadow DOM 访问\n  - CDP backendNodeId -> XPath 的实时解析（那需要 CDP Runtime/DOM domain）\n- 当页面 DOM 频繁变化时，任何基于“位置索引”的 XPath 都可能随结构变化而变化；建议结合你的“候选元素选择策略”做稳定性设计。\n
## 与 stagehand v3 的对齐点

- **每段带索引**（`tag[n]`）\n- **命名空间标签**使用 `*[name()='...'][n]`\n- **text/comment** 节点使用 `text()[n]` / `comment()[n]`\n- 支持 `\"//\"` hop 的拼接语义\n+
