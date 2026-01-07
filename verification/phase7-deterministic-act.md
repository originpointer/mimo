# Phase 7: 确定性语义 Act（DOM→坐标→输入）+ 同源 iframe 降级

## 目标

在不接入 LLM 的前提下，把“语义选择”落成“可执行动作”：

- ✅ selector → nodeId（`DOM.querySelector`）
- ✅ nodeId → 可点击坐标（`DOM.getBoxModel`）
- ✅ 滚动到可见（`DOM.scrollIntoViewIfNeeded`）
- ✅ 执行点击/输入（`Input.dispatchMouseEvent` / `Input.insertText`）
- ✅ **同源 iframe** 无需 child `sessionId`：通过主文档 `Runtime.evaluate` 计算 `iframeRect + elRect` 推导页面坐标

并提供一键验证页 `/control/verify/phase7`。

## 新增/变更内容

### 1) DriverAdapter 增强

文件：`server/utils/control/driverAdapter.ts`

- **新增**（同文档）：`querySelector / scrollIntoViewIfNeeded / getBoxModel / clickSelector / typeSelector`
- **新增**（同源 iframe 降级）：`resolvePointInSameOriginIframe / clickIframeSelector / typeIframeSelector`

### 2) 语义操作 API：`POST /control/act2`

文件：`server/routes/control/act2.post.ts`

Body 示例：

```json
{
  "extensionId": "xxx",
  "tabId": 123,
  "replyUrl": "http://localhost:3000/control/callback",
  "action": "click.selector",
  "selector": "#btn",
  "wait": "stable"
}
```

支持 action：
- `click.selector`
- `type.selector`
- `click.iframeSelector`
- `type.iframeSelector`

返回结构（示例）：

```json
{
  "ok": true,
  "action": "click.selector",
  "resolved": { "nodeId": 42, "x": 160.5, "y": 142.2 },
  "performed": { "clicked": true }
}
```

### 3) 新测试页：同源 iframe

- `GET /test-stagehand-same-origin-iframe.html`
- `GET /test-stagehand-inner.html`

用于验证：**无需 iframe sessionId** 也能在 iframe 内完成 click/type 并断言。

## 一键验证：`GET /control/verify/phase7`

打开：`http://localhost:3000/control/verify/phase7`

Run All 会自动跑：

1. **same-document click.selector**：`/test-stagehand.html` 点击 `#btn`，断言 `#clickStatus` 包含 `clicked`
2. **same-document type.selector**：输入 `#input`，断言 value
3. **same-origin iframe click.iframeSelector**：`/test-stagehand-same-origin-iframe.html` 的 `iframe#inner` 内点击 `#btn`，断言 inner `#clickStatus`
4. **same-origin iframe type.iframeSelector**：在 iframe 内输入并断言 inner `#input.value`
5. **错误处理**：缺参 / iframe 不存在 → 返回 `ok:false`

## 验收标准

| 检查项 | 预期 | 实际 |
|--------|------|------|
| act2 支持 selector 点击/输入 | ✅ | ✅ |
| 同源 iframe 无 sessionId 可点击/输入 | ✅ | ✅ |
| phase7 verify Run All 全 PASS | ✅ | ✅ |
| 错误处理语义清晰 | ✅ | ✅ |

## 备注

### 验证结果

- **验证时间**: 2026-01-06
- **验证状态**: ✅ 全部通过

#### 测试摘要（来自 /control/verify/phase7 Detailed Output）

| 场景 | 结果 | 关键输出摘要 |
|------|------|-------------|
| same-document click.selector | ✅ PASS | `resolved.nodeId=7`，`(x,y)=(160,142)`；`#clickStatus === "clickStatus: clicked"` |
| same-document type.selector | ✅ PASS | `resolved.nodeId=26`；输入 `"Hello Stagehand"`；`#input.value === "Hello Stagehand"` |
| same-origin iframe click.iframeSelector | ✅ PASS | `resolved.(x,y)=(170,199)`；inner `#clickStatus === "clickStatus: clicked"` |
| same-origin iframe type.iframeSelector | ✅ PASS | `resolved.(x,y)=(221,248)`；输入 `"Hello Inner"`；inner `#input.value === "Hello Inner"` |
| error: missing selector | ✅ PASS | 返回 `ok:false`，message 为 `"Missing selector for click.selector"` |
| error: iframe not found | ✅ PASS | 返回 `ok:false`，message 含 `"iframe_not_found"` |

#### 关键结论

1. **同文档 selector 链路可用**：`DOM.getDocument → DOM.querySelector → scrollIntoViewIfNeeded → getBoxModel → clickAt/type` 跑通。
2. **同源 iframe 降级可用**：无需 child `sessionId`，通过 `iframeRect + elRect → 页面坐标 → clickAt/type` 跑通。
3. **错误处理可控**：缺参/元素找不到场景能明确返回 `ok:false` 与可读 message。


