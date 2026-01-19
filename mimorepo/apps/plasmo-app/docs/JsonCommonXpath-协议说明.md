# JsonCommonXpath 协议说明（plasmo-app ↔ next-app）

本协议用于在 `mimorepo/apps/next-app` 的 `/tools` 页面里，输入 `{ key: value }` JSON 后，通过 `plasmo-app` 扩展后台走 CDP，在目标网页 Tab 内完成：

- `contains(value)` 命中元素收集（等价于 jQuery `*:contains("value")` 的实用语义：元素 `innerText/textContent` 包含该字符串）
- 计算所有 key 的“最小共同父容器” XPath（可能不唯一 → 返回数组）

## 涉及文件

- 扩展协议类型：`mimorepo/apps/plasmo-app/src/types/json-common-xpath.ts`
- 扩展后台执行：`mimorepo/apps/plasmo-app/src/background/libs/JsonCommonXpathFinder.ts`
- 扩展 message 路由：`mimorepo/apps/plasmo-app/src/background/index.ts`
- next-app 工具页：`mimorepo/apps/next-app/app/tools/page.tsx`
- next-app 类型镜像：`mimorepo/apps/next-app/types/plasmo.ts`

## 消息常量

- `JSON_COMMON_XPATH_FIND`

## 请求结构（payload）

类型：`JsonCommonXpathFindPayload`

- `targetTabId?: number`\n  可选；指定要扫描的 tab。未提供时由扩展后台默认取当前窗口的 active tab。\n
- `kv: Record<string,string>`\n  输入的 `{ key: value }`。\n
- `options?: Partial<JsonCommonXpathFindOptions>`\n  可选参数：\n  - `maxHitsPerKey`：每个 key 最多保留多少个命中元素（默认 20）\n  - `maxElementsScanned`：最多扫描多少个元素（默认 12000）\n  - `caseSensitive`：是否区分大小写（默认 false）\n  - `includeShadow`：是否遍历 open shadowRoot（默认 false，仅 open shadow DOM）\n

## 响应结构

类型：`JsonCommonXpathFindResponse`

成功：

- `ok: true`
- `containerXpaths: string[]`\n  最小共同父容器 XPath（可能 0/1/N 个）。\n
- `hitsByKey: Record<string,string[]>`\n  每个 key 对应的命中元素 XPath 列表。\n
- `meta?`：\n  - `durationMs?`：耗时\n  - `tabId?`：实际执行的 tabId\n  - `scannedElements?`：扫描过的元素数\n  - `missedKeys?`：没有任何命中的 key 列表（存在时 `containerXpaths` 会为空）\n
失败：

- `ok: false`
- `error: string`

## 示例

请求：

```json
{
  "type": "JSON_COMMON_XPATH_FIND",
  "payload": {
    "targetTabId": 123,
    "kv": {
      "name": "John",
      "email": "@gmail.com"
    },
    "options": {
      "maxHitsPerKey": 20,
      "maxElementsScanned": 12000,
      "caseSensitive": false,
      "includeShadow": false
    }
  }
}
```

成功响应（示例）：

```json
{
  "ok": true,
  "containerXpaths": ["/html[1]/body[1]/div[2]"],
  "hitsByKey": {
    "name": ["/html[1]/body[1]/div[2]/span[1]"],
    "email": ["/html[1]/body[1]/div[2]/a[1]"]
  },
  "meta": {
    "tabId": 123,
    "durationMs": 48,
    "scannedElements": 5321,
    "missedKeys": []
  }
}
```

## 典型行为说明

- 若某个 key 没有命中：\n  - `hitsByKey[key] = []`\n  - `meta.missedKeys` 会包含该 key\n  - `containerXpaths = []`\n
- 若所有 key 都有命中但无法形成共同父交集：\n  - `containerXpaths = []`\n  - `hitsByKey` 仍会返回，便于你在 UI 中定位/调整 value 或扩大/缩小匹配范围\n
## 限制

- contains 匹配基于 `innerText/textContent`，是对 jQuery `:contains()` 的实用等价；不执行真正的 jQuery 选择器语法。\n- 只能遍历 **open** shadow DOM（`includeShadow=true` 时）；closed shadow DOM 无法穿透。\n- CDP `attach` 可能与 DevTools 冲突（目标 Tab 被调试时可能失败）。\n
