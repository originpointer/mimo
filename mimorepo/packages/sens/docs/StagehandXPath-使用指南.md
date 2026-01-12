# StagehandXPath 使用指南（@repo/sens/utils）

本文档描述 `@repo/sens/utils` 内的 **Stagehand 风格 XPath 算法工具**，用于在 **Node.js/CDP** 场景下，对 DOM Node 树进行遍历时构建稳定的 XPath。

## 适用场景

- 你通过 CDP（或类似协议）拿到了 DOM 树结构（至少包含 `nodeType` / `nodeName` / `children`）。
- 你希望在遍历过程中为每个节点生成类似 Stagehand v3 的 XPath step，并逐步累积得到“绝对 XPath”。

这些工具是**纯字符串算法**，不依赖浏览器 DOM API。

## 导入方式

```ts
import {
  buildChildXPathSegments,
  joinXPath,
  normalizeXPath,
  prefixXPath
} from "@repo/sens/utils"
```

## 数据结构约定

`buildChildXPathSegments` 只依赖每个节点的最小字段：

```ts
type CdpDomNodeLike = {
  nodeType: number
  nodeName: string
}
```

常见 `nodeType`：
- `1`：Element
- `3`：Text
- `8`：Comment

## API 说明

### `buildChildXPathSegments(kids)`

为同一父节点下的 `kids` 生成每个 child 的 XPath step（带位置索引）。

规则：
- Element：`tag[n]`
- Text：`text()[n]`
- Comment：`comment()[n]`
- 命名空间标签（例如 `svg:rect`）：`*[name()='svg:rect'][n]`

计数 key 为 `${nodeType}:${tag}`，因此 text/comment/element 会分别计数。

### `joinXPath(base, step)`

把 `base` 与 `step` 拼接成新的 XPath。

特殊约定：
- 若 `step === "//"`，表示“后代跳转/跨边界 hop”（stagehand 在穿透 shadow root 时会用到类似语义）
- 当 `base` 是 `/` 时，`joinXPath("/", "//")` 返回 `"//"`
- 当 `base` 以 `"//"` 结尾时，会直接拼接 `step`（例如 `"/a//" + "b[1]" => "/a//b[1]"`）

### `normalizeXPath(x)`

标准化输入 XPath：
- 去掉 `xpath=` 前缀（不区分大小写）
- 确保前导 `/`
- 去掉末尾 `/`（根路径 `/` 除外）

### `prefixXPath(parentAbs, child)`

把 `child` XPath 以前缀 `parentAbs` 组合成新 XPath，适用于 iframe 前缀拼接等场景。

规则要点：
- `parentAbs === "/"` 视为 no-op 前缀
- 若 `child` 以 `"//"` 开头，会以 `"//"` 语义拼接（保留 hop）

## 示例：遍历 Node 树构建 XPath

```ts
import { buildChildXPathSegments, joinXPath } from "@repo/sens/utils"

type Node = { nodeType: number; nodeName: string; children?: Node[] }

function buildXpathMap(root: Node) {
  const out = new Map<Node, string>()

  const walk = (node: Node, xp: string) => {
    out.set(node, xp || "/")

    const kids = node.children ?? []
    if (!kids.length) return

    const segs = buildChildXPathSegments(kids)
    for (let i = 0; i < kids.length; i++) {
      walk(kids[i]!, joinXPath(xp || "/", segs[i]!))
    }
  }

  walk(root, "/")
  return out
}
```

## 常见坑

- 命名空间标签：如 `svg:rect`，推荐用 `*[name()='svg:rect'][n]`，否则在不同 XPath 引擎/命名空间解析下可能不一致。\n+- Text/Comment 节点：如果你的 DOM 树里包含这些节点，索引必须分别计数（`text()[1]`、`comment()[1]`）。\n+- `"//"` hop：本工具把 `"//"` 当作“特殊 step”，用于表达跨边界/后代跳转语义；是否产生该 step 取决于你遍历树的策略（例如遇到 shadowRoot 子树时插入）。\n+
