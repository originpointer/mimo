# 任务拆解模块抽取方案建议

> 基于 OpenClaw 项目分析，提出任务拆解模块的独立化方案
> 日期：2026-02-02

---

## 一、执行摘要

**建议：部分抽取**

将任务拆解的核心能力抽取为独立库，保留对 Pi Agent 框架的依赖，但移除所有平台集成代码。

---

## 二、模块边界划分

### 2.1 适合抽取的组件

```
@openclaw/task-core/                    # 核心库
├── src/
│   ├── orchestrator/                   # 编排器
│   │   ├── subagent-spawner.ts         # 子智能体生成
│   │   ├── subagent-registry.ts        # 注册表
│   │   └── result-aggregator.ts        # 结果聚合
│   ├── prose/                          # OpenProse 支持
│   │   ├── interpreter.ts              # 解释器
│   │   ├── compiler.ts                 # 编译器
│   │   └── primitives/                 # 原语实现
│   └── tools/                          # 工具集
│       ├── llm-task.ts                 # LLM 任务
│       └── session-tools.ts            # 会话工具
├── package.json
└── README.md
```

### 2.2 保留在主项目的组件

```
openclaw/
├── src/channels/                       # 平台集成（Discord/Slack/...）
├── src/gateway/                        # Gateway 服务
├── src/config/                         # 配置系统
└── extensions/
    └── openclaw-integration/           # 集成适配器
```

---

## 三、依赖处理方案

### 3.1 依赖层次设计

```
┌─────────────────────────────────────────────────┐
│           应用层 (Application)                   │
│  OpenClaw / 其他 AI 助手                        │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│     @openclaw/task-core                         │
│  (任务拆解核心 - 独立库)                         │
├─────────────────────────────────────────────────┤
│  • Subagent Spawner                             │
│  • OpenProse Interpreter                        │
│  • Result Aggregator                            │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│     抽象层 (Abstractions)                        │
│  • IAgentRuntime (LLM 运行时接口)                │
│  • ISessionStore (会话存储接口)                  │
│  • IEventBus (事件总线接口)                      │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐   ┌─────────────────┐
│  Pi Agent 实现  │   │  其他实现        │
│                 │   │  (LangChain/...) │
└─────────────────┘   └─────────────────┘
```

### 3.2 核心抽象接口

```typescript
/**
 * LLM 运行时抽象
 * 允许切换不同的 AI 框架
 */
export interface IAgentRuntime {
  execute(params: {
    prompt: string;
    model: string;
    tools?: AgentTool[];
    context?: Record<string, unknown>;
  }): Promise<AgentResult>;

  stream(params: {
    prompt: string;
    model: string;
    onChunk: (chunk: string) => void;
  }): AsyncGenerator<string>;
}

/**
 * 会话存储抽象
 * 支持多种存储后端
 */
export interface ISessionStore {
  get(key: string): Promise<Session | undefined>;
  set(key: string, session: Session): Promise<void>;
  delete(key: string): Promise<void>;
  list(filter?: SessionFilter): Promise<Session[]>;
}

/**
 * 事件总线抽象
 * 解耦组件间通信
 */
export interface IEventBus {
  emit(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler?: Function): void;
}
```

### 3.3 Pi Agent 适配器

```typescript
/**
 * Pi Agent 框架的适配器实现
 */
export class PiAgentRuntime implements IAgentRuntime {
  async execute(params: ExecuteParams): Promise<AgentResult> {
    // 调用 @mariozechner/pi-ai
    const runner = await import('@mariozechner/pi-agent-core');
    return runner.runEmbeddedPiAgent(params);
  }
}

/**
 * 未来可添加其他实现
 */
export class LangChainRuntime implements IAgentRuntime {
  async execute(params: ExecuteParams): Promise<AgentResult> {
    // 调用 LangChain
  }
}
```

---

## 四、抽取方案对比

### 方案 A：完全抽取（激进）

**描述：** 创建完全独立的库，移除对 Pi Agent 的依赖

**优点：**
- ✅ 最大程度的复用性
- ✅ 可以支持多种 AI 框架

**缺点：**
- ❌ 需要重写大量核心逻辑
- ❌ 维护成本极高
- ❌ 与原项目差异过大

**结论：不推荐**

---

### 方案 B：依赖抽取（平衡）⭐

**描述：** 保留对 Pi Agent 的依赖，但抽象为接口

**优点：**
- ✅ 复用现有代码
- ✅ 保留灵活性
- ✅ 维护成本可控

**缺点：**
- ⚠️ 仍受 Pi Agent 版本影响
- ⚠️ 抽象层可能带来性能损耗

**结论：推荐**

---

### 方案 C：Monorepo 模块化（保守）

**描述：** 在 Monorepo 内部模块化，不发布独立包

**优点：**
- ✅ 零抽取成本
- ✅ 代码共享无障碍
- ✅ 统一版本管理

**缺点：**
- ❌ 外部无法复用
- ❌ 模块边界可能模糊

**结论：短期可行，长期限制复用**

---

## 五、推荐的实施方案

### 阶段 1：抽象接口层（1-2 周）

```typescript
// packages/task-core/src/runtime/IAgentRuntime.ts
export interface IAgentRuntime {
  // ... 定义接口
}

// packages/task-core/src/adapters/PiAgentRuntime.ts
export class PiAgentRuntime implements IAgentRuntime {
  // ... 适配器实现
}
```

**目标：** 定义清晰的抽象边界

### 阶段 2：抽取核心代码（2-3 周）

```bash
# 创建新包
mkdir -p packages/task-core
cd packages/task-core
npm init

# 移动核心文件
cp -r src/agents/subagent*.ts src/
cp -r extensions/llm-task/* src/
cp -r extensions/open-prose/* src/
```

**目标：** 移植核心逻辑，移除平台依赖

### 阶段 3：简化依赖（1 周）

```json
{
  "dependencies": {
    "@mariozechner/pi-agent-core": "^0.49.3",
    "@mariozechner/pi-ai": "^0.49.3",
    "@sinclair/typebox": "^0.34.47",
    "zod": "^4.3.6"
  },
  "peerDependencies": {
    "@mariozechner/pi-agent-core": ">=0.49.0"
  }
}
```

**目标：** 最小化依赖树

### 阶段 4：独立测试（1 周）

```typescript
// packages/task-core/test/integration/captains-chair.test.ts
describe('Captain Chair Pattern', () => {
  it('should execute coordinated workflow', async () => {
    const orchestrator = new Orchestrator({
      runtime: new MockAgentRuntime(),
      store: new MemorySessionStore()
    });

    const result = await orchestrator.execute(`
      agent captain:
        prompt: "Break down this task"
    `);

    expect(result.tasks).toHaveLength(3);
  });
});
```

**目标：** 验证独立运行能力

### 阶段 5：文档和发布（1 周）

```markdown
# @openclaw/task-core

独立的任务拆解和多智能体编排库。

## 特性

- 子智能体生成和管理
- OpenProse 工作流语言
- 并行执行和结果聚合
- 多 AI 框架支持（Pi Agent / LangChain）

## 使用示例

\`\`\`typescript
import { Orchestrator, PiAgentRuntime } from '@openclaw/task-core';

const orchestrator = new Orchestrator({
  runtime: new PiAgentRuntime()
});

const result = await orchestrator.spawn({
  task: 'Analyze this codebase',
  agentId: 'expert'
});
\`\`\`
```

**目标：** 降低使用门槛

---

## 六、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Pi Agent 版本不兼容 | 高 | 使用 peerDependencies，锁定主要版本 |
| 维护负担增加 | 中 | 先在 Monorepo 内模块化，稳定后再独立 |
| API 设计不当 | 中 | 充分的抽象层设计，预留扩展点 |
| 文档滞后 | 低 | 自动生成 API 文档，示例驱动 |

---

## 七、最终建议

### 推荐方案：**方案 B（依赖抽取）+ Monorepo 过渡**

**实施步骤：**

1. **第 1-4 周：** 在 OpenClaw Monorepo 内创建 `packages/task-core`
2. **第 5-8 周：** 逐步迁移核心代码，完善抽象层
3. **第 9-12 周：** 编写独立测试和文档
4. **第 13 周：** 发布 alpha 版本，收集反馈
5. **第 14+ 周：** 根据反馈决定是否独立仓库

### 成功指标

- [ ] 独立于 Discord/Slack/Telegram 运行
- [ ] 测试覆盖率 > 80%
- [ ] API 文档完整
- [ ] 至少 3 个完整示例
- [ ] 外部项目可成功集成

---

## 八、参考架构

```
openclaw/
├── packages/
│   ├── task-core/              # 新增：独立任务拆解库
│   │   ├── src/
│   │   │   ├── orchestrator/
│   │   │   ├── prose/
│   │   │   ├── runtime/
│   │   │   │   ├── IAgentRuntime.ts
│   │   │   │   └── adapters/
│   │   │   └── tools/
│   │   ├── test/
│   │   └── package.json
│   │
│   ├── openclaw/               # 主应用（依赖 task-core）
│   │   ├── src/
│   │   │   ├── channels/       # 平台集成
│   │   │   ├── gateway/        # Gateway 服务
│   │   │   └── config/
│   │   └── package.json
│   │
│   └── examples/               # 示例项目
│       ├── simple-bot/
│       └── cli-tool/
│
├── pnpm-workspace.yaml
└── package.json
```

---

*本方案基于 OpenClaw 源码分析，实际实施时需根据最新代码调整*
