# 05-示例：基础聊天（ChatAgent）

本示例展示 `@mimo/agent-multi` 的 **基础聊天能力**：多轮对话、历史管理、敏感信息脱敏。

## 适用场景

- “先聊天再执行”的前置交互：澄清需求、收集参数、生成计划草稿
- 纯文本问答类能力（不需要工具、也不需要缓存/回放）
- 需要**可控的历史**与**脱敏**（避免 key/token 写进日志或存储）

## 使用规范（强约束）

- **不要**把 `AI_GATEWAY_API_KEY` / `OPENAI_API_KEY` 等敏感值直接拼接进 prompt
- 如果必须把某些敏感字段放入消息上下文（例如临时凭证），务必：
  - 使用 `sensitiveData` 传入，让 `SensitiveDataFilter` 在历史里替换
  - 控制历史长度：`MessageManager({ maxHistoryItems })`
- 生产环境建议为 `abort()` 增加 `AbortSignal` 贯穿 LLM 请求（P0 目前只标记状态）

## 示例代码（最小可用）

```ts
import { LLMProvider } from '@mimo/llm';
import { ChatAgent } from '@mimo/agent-multi';

const llmProvider = new LLMProvider();
const llm = llmProvider.getClient('anthropic/claude-haiku-4.5');

const agent = new ChatAgent({
  id: 'chat-demo',
  model: 'anthropic/claude-haiku-4.5',
  llm,
  // 可选：prompt 模板（默认 default）
  promptTemplate: 'default',
  // 可选：附加自定义 system prompt（建议只放非敏感约束）
  customSystemPrompt: 'Be concise and return plain text.',
});

const r1 = await agent.execute('我想做一个登录流程自动化，你需要问我哪些信息？', {
  // 任何敏感值都放这里，避免进入历史
  sensitiveData: new Map([
    ['AI_GATEWAY_API_KEY', process.env.AI_GATEWAY_API_KEY ?? ''],
  ]),
});
console.log(r1.output);

const r2 = await agent.execute('补充：目标站点是 example.com，账号密码稍后给。', {
  sensitiveData: new Map([
    ['AI_GATEWAY_API_KEY', process.env.AI_GATEWAY_API_KEY ?? ''],
  ]),
});
console.log(r2.output);

// 查看脱敏后的历史（适合调试/回放对话上下文）
console.log(agent.getHistory());
```

## 输出与约定

- `ChatAgent.execute(task)`：
  - `output`：助手回复文本
  - `usage`：token 使用量（来自 `@mimo/llm` 的 `ChatCompletionResponse.usage`）
  - `actions`：固定包含一个 `type=chat` 的动作，便于统一观察/日志

