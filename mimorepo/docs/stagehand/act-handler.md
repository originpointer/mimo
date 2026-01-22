# ActHandler 源码分析

## 类概述

`ActHandler` 是 Stagehand v3 框架中负责执行页面动作的核心处理器。它使用大语言模型（LLM）理解用户的自然语言指令，并自动在页面上执行相应的 Playwright 动作。

**源码位置**: [actHandler.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts)

### 核心功能

- 将自然语言指令转换为可执行的页面动作
- 支持两步操作（如填写表单后提交）
- 内置自愈机制，当动作失败时自动重新分析页面并重试
- 支持 DOM 快照和网络稳定性检测
- 提供变量替换功能

---

## 类属性

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `llmClient` | `LLMClient` | LLM 客户端实例 |
| `defaultModelName` | `AvailableModel` | 默认模型名称 |
| `defaultClientOptions` | `ClientOptions` | 默认客户端选项 |
| `resolveLlmClient` | 函数 | LLM 客户端解析函数 |
| `systemPrompt` | `string` | 系统提示词 |
| `logInferenceToFile` | `boolean` | 是否将推理结果记录到文件 |
| `selfHeal` | `boolean` | 是否启用自愈机制 |
| `onMetrics` | 函数 | 指标回调函数（记录 Token 使用量等） |
| `defaultDomSettleTimeoutMs` | `number` | DOM 稳定超时时间（毫秒） |

---

## 方法说明

### 3.1 `constructor` (构造函数)

**位置**: [actHandler.ts:55-82](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts#L55-L82)

**作用**: 初始化 `ActHandler` 实例，设置 LLM 客户端、默认配置和各项功能开关。

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `llmClient` | `LLMClient` | 是 | LLM 客户端实例 |
| `defaultModelName` | `AvailableModel` | 是 | 默认模型名称 |
| `defaultClientOptions` | `ClientOptions` | 是 | 默认客户端选项 |
| `resolveLlmClient` | 函数 | 是 | 解析 LLM 客户端的函数 |
| `systemPrompt` | `string` | 否 | 自定义系统提示词 |
| `logInferenceToFile` | `boolean` | 否 | 是否记录推理到文件（默认 `false`） |
| `selfHeal` | `boolean` | 否 | 是否启用自愈机制（默认 `false`） |
| `onMetrics` | 函数 | 否 | 指标回调函数 |
| `defaultDomSettleTimeoutMs` | `number` | 否 | DOM 稳定超时时间 |

---

### 3.2 `recordActMetrics` (私有方法)

**位置**: [actHandler.ts:84-93](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts#L84-L93)

**作用**: 记录 act 操作的指标数据，包括 Token 使用量和推理时间。

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `response` | `ActInferenceResponse` | LLM 推理响应对象，包含 token 数据 |

**记录的指标**:
- `promptTokens`: 提示词 Token 数量
- `completionTokens`: 完成 Token 数量
- `reasoningTokens`: 推理 Token 数量
- `cachedInputTokens`: 缓存输入 Token 数量
- `inferenceTimeMs`: 推理耗时（毫秒）

---

### 3.3 `getActionFromLLM` (私有方法)

**位置**: [actHandler.ts:95-133](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts#L95-L133)

**作用**: 调用 LLM 分析页面和指令，返回建议的动作。

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `instruction` | `string` | 是 | 用户指令 |
| `domElements` | `string` | 是 | DOM 元素树（快照） |
| `xpathMap` | `Record<string, string>` | 是 | XPath 映射表（元素 ID → XPath） |
| `llmClient` | `LLMClient` | 是 | LLM 客户端 |
| `requireMethodAndArguments` | `boolean` | 否 | 是否要求返回方法和参数（默认 `true`） |

**返回值**:
```typescript
{
  action?: Action;  // 标准化的动作对象
  response: ActInferenceResponse;  // 原始 LLM 响应
}
```

---

### 3.4 `act` (公开方法)

**位置**: [actHandler.ts:135-267](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts#L135-L267)

**作用**: 主入口方法，执行完整的动作流程。支持单步和两步操作。

**核心流程**:

```
1. 等待 DOM 和网络稳定
   ↓
2. 捕获页面快照（DOM 树 + XPath 映射）
   ↓
3. 调用 LLM 获取第一个动作
   ↓
4. 执行第一个动作
   ↓
5. 如果是两步操作（twoStep === true）：
   - 再次捕获页面快照
   - 计算差异树
   - 调用 LLM 获取第二个动作
   - 执行第二个动作
   ↓
6. 返回合并结果
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `instruction` | `string` | 是 | 用户指令（如 "点击登录按钮"） |
| `page` | `Page` | 是 | 页面对象 |
| `variables` | `Record<string, string>` | 否 | 变量替换表 |
| `timeout` | `number` | 否 | 超时时间（毫秒） |
| `model` | `ModelConfiguration` | 否 | 模型配置覆盖 |

**返回值**: `ActResult` 对象
```typescript
{
  success: boolean;           // 是否成功
  message: string;            // 执行消息
  actionDescription: string;  // 动作描述
  actions: Action[];          // 执行的动作列表
}
```

**两步操作示例**:
- 填写搜索框并点击搜索按钮
- 选择下拉选项并确认

---

### 3.5 `takeDeterministicAction` (公开方法)

**位置**: [actHandler.ts:269-443](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts#L269-L443)

**作用**: 执行单个确定性动作。支持自愈机制，当动作失败时自动重新分析页面并重试。

**核心流程**:

```
1. 验证方法是否支持
   ↓
2. 替换参数中的变量（如 %name% → "张三"）
   ↓
3. 执行 Playwright 动作
   ↓
4. 如果失败且启用自愈：
   - 重新捕获页面快照
   - 调用 LLM 重新分析
   - 使用新的选择器重试
   ↓
5. 返回执行结果
```

**参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `action` | `Action` | 是 | 要执行的动作 |
| `page` | `Page` | 是 | 页面对象 |
| `domSettleTimeoutMs` | `number` | 否 | DOM 稳定超时时间 |
| `llmClientOverride` | `LLMClient` | 否 | 覆盖的 LLM 客户端 |
| `ensureTimeRemaining` | 函数 | 否 | 超时检查函数 |
| `variables` | `Record<string, string>` | 否 | 变量替换表 |

**返回值**: `ActResult` 对象

**自愈机制**:
当 `selfHeal` 为 `true` 时，如果动作执行失败（如元素未找到），处理器会：
1. 记录错误日志
2. 重新捕获页面快照
3. 使用相同的指令重新请求 LLM 分析
4. 使用新返回的选择器重试动作

---

### 3.6 `normalizeActInferenceElement` (辅助函数)

**位置**: [actHandler.ts:446-480](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts#L446-L480)

**作用**: 将 LLM 返回的元素数据标准化为 `Action` 对象。

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `element` | `ActInferenceElement \| undefined` | LLM 返回的元素 |
| `xpathMap` | `Record<string, string>` | XPath 映射表 |
| `requireMethodAndArguments` | `boolean` | 是否要求方法和参数 |

**返回值**: 标准化的 `Action` 对象或 `undefined`

**验证逻辑**:
- 检查元素是否存在
- 如果要求方法和参数，验证 `method` 和 `arguments`
- 验证 `elementId` 格式（必须包含 "-"）
- 从 `xpathMap` 中获取 XPath
- 移除尾部的文本节点

**输出格式**:
```typescript
{
  description: string;
  method?: string;
  arguments?: string[];
  selector: `xpath=${string}`;
}
```

---

### 3.7 `substituteVariablesInArguments` (辅助函数)

**位置**: [actHandler.ts:482-498](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/actHandler.ts#L482-L498)

**作用**: 替换参数数组中的变量占位符。

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `args` | `string[] \| undefined` | 参数数组 |
| `variables` | `Record<string, string>` | 变量映射表 |

**返回值**: 替换后的参数数组

**替换规则**:
- 占位符格式: `%变量名%`
- 示例: `%username%` → `"john_doe"`

**示例**:
```typescript
const args = ["Hello %name%", "Your email is %email%"];
const variables = { name: "张三", email: "zhang@example.com" };

// 结果: ["Hello 张三", "Your email is zhang@example.com"]
```

---

## 使用示例

### 基本用法

```typescript
const actHandler = new ActHandler(
  llmClient,
  "gpt-4",
  { apiKey: "xxx" },
  (model) => llmClient,
  undefined,  // systemPrompt
  false,      // logInferenceToFile
  true        // selfHeal
);

// 执行单个动作
const result = await actHandler.act({
  instruction: "点击登录按钮",
  page: page,
  variables: { username: "admin" },
  timeout: 30000
});

console.log(result.success);  // true/false
console.log(result.message);  // 执行消息
```

### 两步操作

```typescript
// LLM 会自动识别需要两步操作
const result = await actHandler.act({
  instruction: "在搜索框输入 'iPhone' 并点击搜索",
  page: page
});

// result.actions 会包含两个动作
```

### 变量替换

```typescript
const result = await actHandler.act({
  instruction: "在用户名框输入 %username%，密码框输入 %password%",
  page: page,
  variables: {
    username: "admin",
    password: "secret123"
  }
});
```

---

## 类型定义

```typescript
interface Action {
  selector: string;        // XPath 选择器
  description: string;     // 动作描述
  method?: string;         // Playwright 方法名
  arguments?: string[];    // 方法参数
}

interface ActResult {
  success: boolean;           // 是否成功
  message: string;            // 执行消息
  actionDescription: string;  // 动作描述
  actions: Action[];          // 执行的动作列表
}
```

---

## 相关文件

- [handlerUtils/actHandlerUtils.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/handlerUtils/actHandlerUtils.ts) - 处理器工具函数
- [handlerUtils/timeoutGuard.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/handlers/handlerUtils/timeoutGuard.ts) - 超时守卫
- [understudy/a11y/snapshot.ts](../../../../.refer/.sources/stagehand/packages/core/lib/v3/understudy/a11y/snapshot.ts) - 快照捕获
