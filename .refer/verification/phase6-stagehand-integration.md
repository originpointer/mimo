# Phase 6: Stagehand act/extract/observe 最小集成验证

## 目标

把 Stagehand handler 的核心逻辑串起来（LLM 推理在服务端，DOM/输入在扩展侧）。

## 实现内容

### DriverAdapter 类

**文件**: `server/utils/control/driverAdapter.ts`

**核心接口**:

```typescript
interface DriverAdapter {
  // 基础 CDP 发送
  send(method: string, params?: object, options?: { sessionId?: string }): Promise<CdpResult>
  
  // 便捷方法
  evaluate(expression: string): Promise<unknown>
  getDocument(): Promise<unknown>
  getFrameTree(): Promise<unknown>
  screenshot(): Promise<string>
  
  // 等待方法
  waitForLoad(): Promise<boolean>
  waitForDomReady(): Promise<boolean>
  waitForNetworkIdle(): Promise<boolean>
  waitForStable(): Promise<{ domReady: boolean; networkIdle: boolean }>
  
  // Session 管理
  getChildSessions(): TargetInfo[]
  findSessionByUrl(urlPattern: string): TargetInfo | undefined
  
  // 操作方法
  navigate(url: string): Promise<void>
  clickAt(x: number, y: number): Promise<void>
  type(text: string): Promise<void>
  press(key: string): Promise<void>
}
```

### Act Endpoint

**Endpoint**: `POST /control/act`

**Body**:
```json
{
  "extensionId": "xxx",
  "tabId": 123,
  "action": "click" | "type" | "press" | "navigate" | "evaluate",
  "x": 100, "y": 200,  // for click
  "text": "hello",     // for type
  "key": "Enter",      // for press
  "url": "https://...",// for navigate
  "expression": "..."  // for evaluate
}
```

### Extract Endpoint

**Endpoint**: `POST /control/extract`

**Body**:
```json
{
  "extensionId": "xxx",
  "tabId": 123,
  "mode": "expression" | "selector" | "all",
  "expression": "document.title",  // for expression mode
  "selector": "h1",                // for selector mode
  "attribute": "textContent"       // for selector mode
}
```

### Observe Endpoint

**Endpoint**: `POST /control/observe`

**说明**: `page.observe()` 的最小实现，用于拿到页面快照，供后续 LLM 定位/决策。

**Body**:
```json
{
  "extensionId": "xxx",
  "tabId": 123,
  "replyUrl": "http://localhost:3000/control/callback",
  "sessionId": "optional-session-id",
  "include": ["document", "screenshot", "axTree", "frameTree"],
  "depth": 1
}
```

**Response**:
```json
{
  "ok": true,
  "result": {
    "tabId": 123,
    "sessionId": null,
    "include": ["document", "screenshot"],
    "document": { "...": "..." },
    "screenshot": "base64..."
  }
}
```

## 验证步骤

### 推荐：一键自动验证

打开验证页：`http://localhost:3000/control/verify/phase6`，填写 `extensionId` / `replyUrl` 后点击 **Run All**。

- **预期**：所有检查项 PASS（绿色 ✅），Detailed Output 中能看到完整 JSON 结果。
- **备注**：verify 页会创建一个测试 tab，并自动导航到 `http://localhost:3000/test-stagehand.html`（固定布局测试页）。

### Step 1: 验证基础 evaluate

```bash
curl -X POST http://localhost:3000/control/extract \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "xxx",
    "tabId": 123,
    "mode": "expression",
    "expression": "document.title"
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "mode": "expression",
  "result": "Page Title Here"
}
```

### Step 2: 验证 act - navigate

```bash
curl -X POST http://localhost:3000/control/act \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "xxx",
    "tabId": 123,
    "action": "navigate",
    "url": "http://localhost:3000/test-stagehand.html"
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "action": "navigate",
  "result": { "navigated": true, "url": "https://example.com" }
}
```

### Step 3: 验证 act - click

```bash
curl -X POST http://localhost:3000/control/act \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "xxx",
    "tabId": 123,
    "action": "click",
    "x": 160,
    "y": 142
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "action": "click",
  "result": { "clicked": true, "x": 100, "y": 200 }
}
```

### Step 4: 验证 act - type

```bash
curl -X POST http://localhost:3000/control/act \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "xxx",
    "tabId": 123,
    "action": "type",
    "text": "Hello World"
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "action": "type",
  "result": { "typed": true, "text": "Hello World" }
}
```

### Step 5: 验证 extract - selector

```bash
curl -X POST http://localhost:3000/control/extract \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "xxx",
    "tabId": 123,
    "mode": "selector",
    "selector": "#title",
    "attribute": "textContent"
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "mode": "selector",
  "result": "Page Heading"
}
```

### Step 6: 验证 extract - all

```bash
curl -X POST http://localhost:3000/control/extract \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "xxx",
    "tabId": 123,
    "mode": "all"
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "mode": "all",
  "result": {
    "title": "Page Title",
    "url": "https://example.com/",
    "htmlPreview": "<!DOCTYPE html>..."
  }
}
```

## 与 Stagehand 对比

| Stagehand 功能 | 当前实现 | 状态 |
|---------------|---------|------|
| `page.act("点击登录按钮")` | `POST /control/act` (坐标点击) | ⚠️ 需要 LLM 定位 |
| `page.extract({ title: "页面标题" })` | `POST /control/extract` | ✅ 基础版本 |
| `page.observe()` | `POST /control/observe` | ✅ 最小版（document/screenshot/axTree/frameTree） |
| Frame 穿透 | sessionId 支持 | ⚠️ 需测试 |
| 等待稳定 | waitHelpers | ✅ |
| 截图 | screenshot() | ✅ |

## 下一步：LLM 集成

要实现完整的 Stagehand act()，需要：

1. **Observe 阶段**: 使用 `DOM.getDocument` + `Accessibility.getFullAXTree` 获取页面可交互元素
2. **LLM 推理**: 将页面快照发送给 LLM，让它选择目标元素
3. **定位元素**: 使用 `DOM.getBoxModel` 获取元素坐标
4. **执行操作**: 使用 `Input.dispatchMouseEvent` 等执行实际操作

这需要：
- 移植 Stagehand 的 observeHandler 逻辑
- 移植 Stagehand 的 actHandler 逻辑
- 集成 LLM provider

## 验收标准

| 检查项 | 预期 | 实际 |
|--------|------|------|
| DriverAdapter 创建成功 | ✅ | ✅ |
| evaluate 返回正确结果 | ✅ | ✅ |
| navigate 成功导航 | ✅ | ✅ |
| click 成功点击 | ✅ | ✅ |
| type 成功输入 | ✅ | ✅ |
| extract 返回正确数据 | ✅ | ✅ |
| observe 返回页面快照 | ✅ | ✅ |
| 错误处理正确 | ✅ | ✅ |

## 结论

- ✅ 基础 act/extract/observe 通过 → 可以开始 LLM 集成
- [ ] 部分功能失败 → 需要排查

## 备注

_______________________________________________________________

### 固定布局测试页

用于稳定验证 click/type 的页面：`http://localhost:3000/test-stagehand.html`

- **按钮中心坐标**: `(160, 142)`
- **输入框中心坐标**: `(210, 209)`

### 验证结果（跑完 /control/verify/phase6 后填写）

- **验证时间**: 2026-01-06
- **验证状态**: ✅ 全部通过
- **详细输出**: 见 `verification/round6-log.json`（包含 screenshot base64，文档中仅记录摘要，不粘贴原始数据）

#### 测试摘要（来自 round6-log.json）

| 测试项 | 结果 | 关键输出摘要 |
|------|------|-------------|
| navigate | ✅ PASS | `href === "http://localhost:3000/test-stagehand.html"` |
| evaluate | ✅ PASS | `1+1 === 2` |
| extract(selector) | ✅ PASS | `#title.textContent === "Stagehand Fixed Layout Test"` |
| click | ✅ PASS | 点击 `(160,142)` 后 `#clickStatus === "clickStatus: clicked"` |
| type | ✅ PASS | 输入 `"Hello Stagehand"` 后 `#input.value === "Hello Stagehand"` |
| observe | ✅ PASS | `include=["document","screenshot"]`；document 存在；screenshot 为 base64（长度远大于 100） |
| error-handling | ✅ PASS | 缺参 click 返回 `ok:false` 且 message 为 `"Missing x/y for click action"` |

