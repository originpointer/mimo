# @mimo/skills

基于 BM25 搜索的 AI 代理渐进式技能框架。

## 概述

`@mimo/skills` 是对 [Anthropic Agent Skills 规范](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) 的 TypeScript/Node.js 实现。它支持模块化的技能定义和按需加载以最小化 token 使用，同时提供基于 BM25 的搜索功能实现智能技能发现。

## 特性

- **🎯 渐进式披露**: 按需加载技能，减少初始上下文
- **🔍 BM25 搜索**: 使用 Orama 进行全文搜索，可配置相关性阈值
- **📁 文件式技能**: 通过目录和 SKILL.md 文件定义技能
- **🔧 编程式技能**: 使用 TypeScript 装饰器和构建器创建技能
- **🔒 安全可靠**: 防止路径遍历、脚本超时、安全的 YAML 解析
- **📦 类型安全**: 完整的 TypeScript 支持，使用 Zod 进行验证

## 安装

```bash
pnpm add @mimo/skills
```

## 快速开始

### 文件式技能

创建一个包含 SKILL.md 文件的技能目录：

```markdown
---
name: arxiv-search
description: 在 arXiv 上搜索研究论文
---

# arXiv 搜索技能

使用此技能查找学术论文。
```

然后使用工具集：

```ts
import { SkillsToolset } from '@mimo/skills';

const toolset = new SkillsToolset({
  directories: ['./skills'],
  enableBM25: true
});

await toolset.initialize();

// 获取包含技能概览的系统提示
const instructions = await toolset.getInstructions();

// 搜索相关技能
const results = await toolset.searchSkills('研究论文');
```

### 编程式技能

```ts
import { createSkill } from '@mimo/skills';

const skill = createSkill('data-analyzer', '数据分析')
  .setContent('数据分析说明...')
  .addResource('schema', schemaContent)
  .addScript('process', processFn, schema)
  .build();

const toolset = new SkillsToolset({
  skills: [skill]
});
```

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    集成层 (Integration Layer)                │
│                   SkillsToolset (5 个工具)                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    发现层 (Discovery Layer)                  │
│          FileSystemDiscovery + OramaSearchManager            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       类型层 (Type Layer)                    │
│              Skill, SkillResource, SkillScript               │
└─────────────────────────────────────────────────────────────┘
```

## 五个核心工具

| 工具 | 描述 |
|------|------|
| `listSkills()` | 列出所有可用技能 |
| `loadSkill(name)` | 加载技能的完整说明 |
| `readSkillResource(skillName, resourceName, args)` | 读取资源文件 |
| `runSkillScript(skillName, scriptName, args)` | 执行脚本 |
| `searchSkills(query, limit)` | BM25 搜索技能 |

## 渐进式披露流程

1. **发现**: 代理在系统提示中接收技能名称和描述
2. **搜索**: 代理使用 `searchSkills()` 查找相关技能
3. **加载**: 代理调用 `loadSkill()` 获取完整说明
4. **执行**: 代理根据需要使用资源和脚本

## BM25 搜索

启用 BM25 搜索以实现智能技能发现：

```ts
const toolset = new SkillsToolset({
  directories: ['./skills'],
  enableBM25: true,
  bm25Threshold: 0.3  // 过滤低相关性结果
});

await toolset.initialize();

// 搜索返回排序结果
const results = await toolset.searchSkills('数据分析');
// [{ name: 'data-analyzer', description: '...', score: 0.89 }, ...]
```

**搜索配置：**
- **权重因子**: name=3x, description=2x, body=1x
- **阈值**: 按最小相关性过滤结果 (0-1)
- **限制**: 限制最大结果数 (默认: 10)
- **分词器**: 支持中文的普通话分词器

## SKILL.md 格式

```yaml
---
name: my-skill
description: 简要描述（最多 1024 字符）
version: 1.0.0
---

# 技能说明

详细说明...
```

**必填字段：**
- `name`: 小写、连字符，最多 64 字符
- `description`: 简要摘要，最多 1024 字符

**可选字段：**
- `version`, `license`, `author`, `tags` 等

## 目录结构

```
my-skill/
├── SKILL.md          # 必填：说明和元数据
├── scripts/          # 可选：可执行脚本
│   └── process.py
└── resources/        # 可选：附加文件
    ├── reference.md
    └── schema.json
```

## API 参考

### SkillsToolset

```ts
class SkillsToolset {
  constructor(options?: SkillsToolsetOptions);

  // 初始化并从目录加载技能
  async initialize(): Promise<void>;

  // 获取指定技能
  getSkill(name: string): Skill;

  // 获取所有已加载的技能
  getSkills(): Map<string, Skill>;

  // 工具方法
  async listSkills(): Promise<Record<string, string>>;
  async loadSkill(skillName: string): Promise<string>;
  async readSkillResource(skillName: string, resourceName: string, args?: Record<string, unknown>): Promise<string>;
  async runSkillScript(skillName: string, scriptName: string, args?: Record<string, unknown>): Promise<string>;
  async searchSkills(query: string, limit?: number): Promise<Array<{ name: string; description: string; score: number }>>;

  // 渐进式披露
  async getInstructions(): Promise<string | null>;
}
```

### Skill 选项

```ts
interface SkillsToolsetOptions {
  // 要包含的编程式技能
  skills?: Skill[];

  // 扫描技能的目录
  directories?: string[];

  // 验证技能结构
  validate?: boolean;

  // 最大发现深度
  maxDepth?: number;

  // 启用 BM25 搜索
  enableBM25?: boolean;

  // BM25 相关性阈值 (0-1)
  bm25Threshold?: number;

  // 自定义说明模板
  instructionTemplate?: string;

  // 要排除的工具
  excludeTools?: Set<string> | string[];
}
```

## 许可证

MIT

## 参考资料

- [Anthropic Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [pydantic-ai-skills](https://github.com/pydantic-ai/pydantic-ai-skills) - Python 参考实现
- [Orama](https://oramasearch.com/) - 全文搜索引擎
