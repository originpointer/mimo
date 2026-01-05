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

## 验证步骤

### Step 1: 验证基础 evaluate

```bash
curl -X POST http://localhost:3000/control/extract \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "xxx",
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
    "action": "navigate",
    "url": "https://example.com"
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
    "action": "click",
    "x": 100,
    "y": 200
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
    "mode": "selector",
    "selector": "h1",
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
| `page.observe()` | 需要实现 | ❌ 待添加 |
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
| DriverAdapter 创建成功 | ✅ | [ ] |
| evaluate 返回正确结果 | ✅ | [ ] |
| navigate 成功导航 | ✅ | [ ] |
| click 成功点击 | ✅ | [ ] |
| type 成功输入 | ✅ | [ ] |
| extract 返回正确数据 | ✅ | [ ] |
| 错误处理正确 | ✅ | [ ] |

## 结论

- [ ] 基础 act/extract 通过 → 可以开始 LLM 集成
- [ ] 部分功能失败 → 需要排查

## 备注

_______________________________________________________________

