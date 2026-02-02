# @mimo/skills 使用文档

## 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [架构设计](#架构设计)
- [SKILL.md 格式规范](#skill-md-格式规范)
- [API 参考](#api-参考)
- [使用指南](#使用指南)
- [最佳实践](#最佳实践)
- [异常处理](#异常处理)
- [常见问题](#常见问题)

---

## 概述

### 简介

**@mimo/skills** 是对 Anthropic Agent Skills 规范的 TypeScript/Node.js 实现，具有以下核心特性：

- **渐进式加载**：按需加载技能，减少初始上下文消耗
- **BM25 搜索**：基于 Orama 的全文检索，可配置相关性阈值
- **文件化技能**：通过目录和 SKILL.md 文件定义技能
- **编程式技能**：使用 TypeScript Builder 模式创建技能
- **安全机制**：路径遍历防护、脚本超时控制、安全 YAML 解析
- **类型安全**：完整的 TypeScript 支持和 Zod 验证

### 核心能力

| 能力 | 说明 |
|------|------|
| 技能发现 | 自动扫描目录中的 SKILL.md 文件 |
| 智能搜索 | BM25 算法实现的全文搜索 |
| 资源管理 | 支持静态和动态资源加载 |
| 脚本执行 | 本地 Python 脚本执行与自定义执行器 |
| 工具集成 | 提供 5 个核心工具给 Agent 使用 |

### 版本信息

- **当前版本**：0.0.1
- **模块类型**：ESM
- **运行环境**：Node.js 18+

---

## 快速开始

### 安装

```bash
# npm
npm install @mimo/skills

# pnpm
pnpm add @mimo/skills

# yarn
yarn add @mimo/skills
```

### 基础使用

#### 1. 文件化技能

创建技能目录结构：

```
skills/
└── arxiv-search/
    ├── SKILL.md
    ├── scripts/
    │   └── search.py
    └── resources/
        └── schema.json
```

编写 SKILL.md：

```markdown
---
name: arxiv-search
description: 搜索 arXiv 学术论文
version: 1.0.0
license: MIT
---

# arXiv 搜索技能

使用此技能可以搜索和检索 arXiv 上的学术论文。
```

初始化并使用：

```typescript
import { SkillsToolset } from '@mimo/skills';

const toolset = new SkillsToolset({
  directories: ['./skills'],
  enableBM25: true
});

await toolset.initialize();

// 列出所有技能
const skills = await toolset.listSkills();

// 搜索技能
const results = await toolset.searchSkills('学术论文', 5);
```

#### 2. 编程式技能

```typescript
import { createSkill, SkillsToolset } from '@mimo/skills';

// 创建技能
const skill = createSkill('data-analyzer', '数据分析工具')
  .setContent('用于分析 CSV 和 JSON 数据的技能...')
  .setLicense('MIT')
  .setCompatibility('Node.js 18+')
  .addResource('schema', JSON.stringify({ type: 'object' }), '数据模式')
  .addScript('process', async (data) => {
    // 处理逻辑
    return result;
  }, inputSchema, '数据处理脚本')
  .build();

// 使用技能
const toolset = new SkillsToolset({
  skills: [skill]
});

await toolset.initialize();
```

---

## 核心概念

### Skill（技能）

技能是技能系统的核心单元，包含以下组成部分：

```typescript
interface Skill {
  name: string;                      // 技能名称（标准化）
  description: string;               // 简短描述
  content: string;                   // 主要指令内容
  license?: string;                  // 许可证
  compatibility?: string;            // 兼容性说明
  resources: SkillResource[];        // 关联资源
  scripts: SkillScript[];            // 关联脚本
  uri?: string;                      // 资源标识符
  metadata?: Record<string, unknown>; // 元数据
}
```

### SkillResource（资源）

资源是技能可以引用的数据文件或动态内容生成器：

| 类型 | 说明 | 示例 |
|------|------|------|
| StaticSkillResource | 预定义的静态内容 | JSON Schema、参考文档 |
| CallableSkillResource | 通过函数动态生成内容 | 实时 API 数据 |
| FileBasedSkillResource | 从磁盘加载的文件 | 配置文件、数据文件 |

### SkillScript（脚本）

脚本是可以执行的代码单元：

| 类型 | 说明 | 示例 |
|------|------|------|
| CallableSkillScript | 函数式执行 | TypeScript 函数 |
| FileBasedSkillScript | 文件式执行 | Python 脚本 |

### 渐进式披露（Progressive Disclosure）

系统只提供技能的名称和描述，完整内容仅在需要时加载：

```typescript
// 初始指令只包含技能概览
const instructions = await toolset.getInstructions();
// "可用技能: arxiv-search - 搜索学术论文, data-analyzer - 数据分析工具"

// 按需加载完整技能
const skill = await toolset.loadSkill('arxiv-search');
```

---

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    集成层 (Integration Layer)                 │
│                   SkillsToolset (5 个工具)                    │
│  - listSkills  - loadSkill  - readResource  - runScript     │
│  - searchSkills                                                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    发现层 (Discovery Layer)                   │
│          FileSystemDiscovery + OramaSearchManager            │
│  - 目录扫描    - BM25 索引   - 相关性排序                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       类型层 (Type Layer)                     │
│              Skill, SkillResource, SkillScript               │
│  - Builder 模式  - 验证  - 序列化                              │
└─────────────────────────────────────────────────────────────┘
```

### 模块结构

```
src/
├── index.ts                    # 主入口
├── types.ts                    # 核心接口与类型
├── constants.ts                # 常量定义
├── exceptions.ts               # 异常类
├── validation.ts               # 验证工具
│
├── discovery/                  # 技能发现
│   ├── FileSystemDiscovery.ts  # 文件系统扫描
│   ├── OramaSearchManager.ts   # BM25 搜索
│   ├── FrontmatterParser.ts    # YAML 解析
│
├── skill/                      # 技能实现
│   └── Skill.ts                # Skill 类与 Builder
│
├── resources/                  # 资源类型
│   └── SkillResource.ts        # 资源实现
│
├── scripts/                    # 脚本类型
│   └── SkillScript.ts          # 脚本实现
│
├── execution/                  # 脚本执行
│   └── ScriptExecutor.ts       # 执行器实现
│
└── toolset/                    # Agent 集成
    └── SkillsToolset.ts        # 工具集主类
```

---

## SKILL.md 格式规范

### 基本结构

SKILL.md 使用 YAML frontmatter 定义元数据：

```markdown
---
name: skill-name              # 必需：小写、连字符、最多 64 字符
description: 简短描述          # 必需：最多 1024 字符
version: 1.0.0                # 可选：版本号
license: MIT                  # 可选：许可证
author: 作者名                # 可选：作者
tags: [tag1, tag2]            # 可选：标签
compatibility: Node.js 18+    # 可选：兼容性说明
---

# 技能指令

详细的指令内容...
```

### 命名规则

```typescript
// 技能名称正则表达式
const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// 有效示例
'arxiv-search'        // ✓ 有效
'data_analyzer'       // ✗ 无效（使用下划线）
'MySkill'             // ✗ 无效（大写字母）
'skill'               // ✗ 无效（保留字）
```

### 目录结构规范

```
skill-name/
├── SKILL.md              # 必需：技能定义和指令
├── scripts/              # 可选：可执行脚本
│   ├── process.py        # .py 文件自动识别为脚本
│   └── helper.py
└── resources/            # 可选：资源文件
    ├── reference.md      # .md 文件
    ├── schema.json       # .json 文件
    ├── config.yaml       # .yaml/.yml 文件
    └── data.csv          # .csv, .xml, .txt 文件
```

### 自动发现规则

| 文件类型 | 识别位置 | 处理方式 |
|---------|---------|---------|
| `.py` | 根目录 / `scripts/` | 注册为 SkillScript |
| `.md` | 任意位置 | 纯文本加载 |
| `.json` | 任意位置 | JSON 解析 |
| `.yaml/.yml` | 任意位置 | YAML 解析 |
| `.csv` | 任意位置 | 纯文本加载 |
| `.xml` | 任意位置 | 纯文本加载 |
| `.txt` | 任意位置 | 纯文本加载 |

---

## API 参考

### SkillsToolset

主工具集类，提供技能管理和 Agent 集成。

#### 构造函数

```typescript
constructor(options: SkillsToolsetOptions)
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `skills` | `Skill[]` | `[]` | 编程式技能列表 |
| `directories` | `string[]` | `[]` | 扫描目录路径 |
| `validate` | `boolean` | `false` | 是否验证技能结构 |
| `maxDepth` | `number` | `3` | 最大发现深度 |
| `enableBM25` | `boolean` | `false` | 启用 BM25 搜索 |
| `bm25Threshold` | `number` | `0.3` | BM25 相关性阈值 (0-1) |
| `instructionTemplate` | `string` | - | 自定义指令模板 |
| `excludeTools` | `Set<string> \| string[]` | - | 排除的工具名称 |

#### 方法

##### initialize()

```typescript
async initialize(): Promise<void>
```

初始化工具集，扫描目录并构建索引。

##### getInstructions()

```typescript
async getInstructions(): Promise<string>
```

获取系统指令，包含可用技能概览。

##### listSkills()

```typescript
async listSkills(): Promise<Record<string, string>>
```

列出所有可用技能（名称-描述映射）。

##### loadSkill()

```typescript
async loadSkill(skillName: string): Promise<string>
```

加载指定技能的完整文档（XML 格式）。

##### readSkillResource()

```typescript
async readSkillResource(
  skillName: string,
  resourceName: string,
  args?: Record<string, unknown>
): Promise<string>
```

读取技能的资源内容。

##### runSkillScript()

```typescript
async runSkillScript(
  skillName: string,
  scriptName: string,
  args?: Record<string, unknown>
): Promise<string>
```

执行技能的脚本。

##### searchSkills()

```typescript
async searchSkills(
  query: string,
  limit?: number
): Promise<SearchResult[]>
```

使用 BM25 搜索技能。

**搜索结果类型：**

```typescript
interface SearchResult {
  name: string;
  description: string;
  score: number;        // 相关性分数 (0-1)
  uri?: string;
}
```

---

### SkillBuilder

编程式创建技能的 Builder 类。

#### createSkill()

```typescript
function createSkill(
  name: string,
  description: string
): SkillBuilder
```

创建一个新的 SkillBuilder 实例。

#### Builder 方法

| 方法 | 参数 | 返回值 |
|------|------|--------|
| `setContent()` | `content: string` | `this` |
| `setLicense()` | `license: string` | `this` |
| `setCompatibility()` | `compatibility: string` | `this` |
| `setMetadata()` | `metadata: Record<string, unknown>` | `this` |
| `addResource()` | `name, content, description?` | `this` |
| `addCallableResource()` | `name, fn, schema?, description?` | `this` |
| `addScript()` | `name, fn, schema?, description?` | `this` |
| `build()` | - | `Skill` |

---

### FileSystemDiscovery

文件系统技能发现器。

#### discover()

```typescript
static async discover(
  rootPath: string,
  options?: DiscoveryOptions
): Promise<Skill[]>
```

从指定目录发现技能。

**选项：**

```typescript
interface DiscoveryOptions {
  validate?: boolean;    // 验证技能
  maxDepth?: number;     // 最大递归深度
}
```

---

### OramaSearchManager

BM25 搜索管理器。

#### 构造函数

```typescript
constructor(options?: OramaSearchOptions)
```

**选项：**

```typescript
interface OramaSearchOptions {
  threshold?: number;    // 相关性阈值
  boost?: {              // 字段权重
    name?: number;
    description?: number;
    body?: number;
  };
}
```

#### buildIndex()

```typescript
async buildIndex(skills: Map<string, Skill>): Promise<void>
```

构建技能搜索索引。

#### search()

```typescript
async search(
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]>
```

执行搜索查询。

**选项：**

```typescript
interface SearchOptions {
  limit?: number;        // 最大结果数
  threshold?: number;    // 最小相关性阈值
}
```

---

### ScriptExecutor

脚本执行器。

#### LocalScriptExecutor

本地 Python 脚本执行器。

```typescript
class LocalScriptExecutor implements ScriptExecutor {
  constructor(
    timeout?: number,    // 默认 30000ms
    pythonPath?: string  // 默认 'python3'
  )
}
```

**参数转换规则：**

| 输入类型 | CLI 参数格式 |
|---------|-------------|
| `string` | `--key value` |
| `boolean` | `--flag` |
| `number` | `--key value` |
| `Array` | `--key item1 --key item2` |
| `Object` | `--key key1=value1 --key key2=value2` |

#### CallableScriptExecutor

自定义执行逻辑包装器。

```typescript
class CallableScriptExecutor implements ScriptExecutor {
  constructor(
    executor: (script: SkillScript, args: Record<string, unknown>) => Promise<unknown>
  )
}
```

---

## 使用指南

### 场景一：学术论文检索系统

创建一个 arXiv 论文检索技能：

```
skills/arxiv-search/
├── SKILL.md
├── scripts/
│   └── search.py
└── resources/
    └── response-schema.json
```

**SKILL.md：**

```markdown
---
name: arxiv-search
description: 搜索和检索 arXiv 学术论文
version: 1.0.0
tags: [research, academic]
---

# arXiv 搜索技能

使用本技能搜索 arXiv 学术数据库中的论文。

## 使用方法

调用 `search` 脚本，传入搜索查询参数。
```

**scripts/search.py：**

```python
import argparse
import requests

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--query', required=True)
    parser.add_argument('--max-results', type=int, default=10)
    args = parser.parse_args()

    url = f"http://export.arxiv.org/api/query?search_query=all:{args.query}&max_results={args.max_results}"
    response = requests.get(url)
    print(response.text)

if __name__ == '__main__':
    main()
```

**使用：**

```typescript
import { SkillsToolset } from '@mimo/skills';

const toolset = new SkillsToolset({
  directories: ['./skills']
});

await toolset.initialize();

// 执行搜索
const results = await toolset.runSkillScript(
  'arxiv-search',
  'search',
  { query: 'machine learning', maxResults: 5 }
);
```

---

### 场景二：动态数据转换

创建一个支持动态资源加载的技能：

```typescript
import { createSkill, SkillsToolset } from '@mimo/skills';

// 动态数据源
async function fetchMarketData(args: { symbol: string }) {
  const response = await fetch(
    `https://api.market.com/v1/quote?symbol=${args.symbol}`
  );
  return response.json();
}

// 创建带动态资源的技能
const skill = createSkill('market-analyzer', '金融市场分析工具')
  .setContent(`
    # 市场分析技能

    使用此技能获取实时市场数据和分析报告。

    ## 可用资源
    - quote: 实时行情数据
    - history: 历史数据
  `)
  .addCallableResource(
    'quote',
    fetchMarketData,
    {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '股票代码' }
      }
    },
    '实时行情数据'
  )
  .addScript('analyze', async (args) => {
    // 分析逻辑
    return { trend: 'up', confidence: 0.85 };
  })
  .build();

const toolset = new SkillsToolset({ skills: [skill] });
```

---

### 场景三：技能搜索与发现

启用 BM25 搜索实现智能技能发现：

```typescript
import { SkillsToolset } from '@mimo/skills';

const toolset = new SkillsToolset({
  directories: ['./skills'],
  enableBM25: true,
  bm25Threshold: 0.3
});

await toolset.initialize();

// 自然语言搜索
const queries = [
  '如何搜索学术论文',
  '数据分析工具',
  '图像处理'
];

for (const query of queries) {
  const results = await toolset.searchSkills(query, 3);
  console.log(`查询: ${query}`);
  results.forEach(r => {
    console.log(`  - ${r.name} (相关度: ${r.score.toFixed(2)})`);
  });
}
```

**输出示例：**

```
查询: 如何搜索学术论文
  - arxiv-search (相关度: 0.89)
  - google-scholar (相关度: 0.72)
  - pubmed-search (相关度: 0.65)
```

---

### 场景四：混合技能配置

结合文件化和编程式技能：

```typescript
import { SkillsToolset, createSkill } from '@mimo/skills';

// 编程式技能（需要动态逻辑）
const dynamicSkill = createSkill('calculator', '计算器技能')
  .setContent('执行各种数学计算')
  .addScript('calculate', async ({ expression }) => {
    return eval(expression);
  })
  .build();

// 文件化技能（静态内容）
const toolset = new SkillsToolset({
  directories: ['./skills'],  // 扫描目录中的 SKILL.md
  skills: [dynamicSkill],     // 添加编程式技能
  enableBM25: true
});

await toolset.initialize();
```

---

## 最佳实践

### 1. 技能命名规范

```typescript
// ✓ 推荐
'data-analyzer'
'image-processor'
'api-client'

// ✗ 避免
'DataAnalyzer'      // 使用 Pascal Case
'data_analyzer'     // 使用下划线
'data'              // 过于通用
```

### 2. 资源组织

```
skill-name/
├── SKILL.md              # 主定义
├── scripts/              # 脚本分离
│   ├── main.py
│   └── utils.py
└── resources/            # 资源分离
    ├── schemas/
    │   └── input.json
    └── docs/
        └── guide.md
```

### 3. 错误处理

```typescript
import {
  SkillNotFoundError,
  SkillValidationError,
  SkillResourceNotFoundError
} from '@mimo/skills';

try {
  const skill = await toolset.loadSkill('unknown-skill');
} catch (error) {
  if (error instanceof SkillNotFoundError) {
    console.error('技能不存在');
  } else if (error instanceof SkillValidationError) {
    console.error('技能验证失败:', error.details);
  }
}
```

### 4. 脚本超时控制

```typescript
import { LocalScriptExecutor } from '@mimo/skills';

// 为长时间运行的脚本设置更长超时
const executor = new LocalScriptExecutor(60000);  // 60 秒
```

### 5. 搜索阈值调优

```typescript
// 高召回率（更多结果，可能包含低相关性）
const toolset = new SkillsToolset({
  enableBM25: true,
  bm25Threshold: 0.2
});

// 高精确率（更少结果，高相关性）
const toolset = new SkillsToolset({
  enableBM25: true,
  bm25Threshold: 0.5
});
```

### 6. 资源验证

```typescript
const toolset = new SkillsToolset({
  directories: ['./skills'],
  validate: true,  // 启用验证
  maxDepth: 3
});
```

---

## 异常处理

### 异常层级

```
Exception
└── SkillException (基类)
    ├── SkillNotFoundError         # 技能不存在
    ├── SkillValidationError       # 技能验证失败
    ├── SkillResourceNotFoundError # 资源不存在
    ├── SkillResourceLoadError     # 资源加载失败
    └── SkillScriptExecutionError  # 脚本执行失败
```

### 异常类型

#### SkillNotFoundError

```typescript
throw new SkillNotFoundError('my-skill', 'custom message');
```

#### SkillValidationError

```typescript
throw new SkillValidationError('skill-name', 'Invalid name format', {
  field: 'name',
  expected: 'lowercase-hyphenated',
  received: 'MySkill'
});
```

#### SkillResourceNotFoundError

```typescript
throw new SkillResourceNotFoundError('skill', 'resource-name');
```

#### SkillScriptExecutionError

```typescript
throw new SkillScriptExecutionError('script-name', error.message, {
  exitCode: 1,
  stdout: '...',
  stderr: '...'
});
```

---

## 常见问题

### Q1: 如何调试技能发现？

```typescript
import { SkillsToolset } from '@mimo/skills';

const toolset = new SkillsToolset({
  directories: ['./skills'],
  validate: true,  // 启用验证
  maxDepth: 3
});

try {
  await toolset.initialize();
  console.log('发现的技能:', await toolset.listSkills());
} catch (error) {
  console.error('初始化失败:', error);
}
```

### Q2: BM25 搜索如何工作？

BM25 (Best Matching 25) 是一种排名函数，用于估算文档与搜索查询的相关性。

```typescript
// 搜索权重配置（默认）
const boost = {
  name: 3,        // 技能名称权重最高
  description: 2, // 描述次之
  body: 1         // 内容权重最低
};

// 分数计算
score = Σ (qi × IDF(qi) × (f(qi, D) × (k1 + 1)) / (f(qi, D) + k1 × (1 - b + b × |D| / avgdl)))
```

### Q3: 如何处理大型资源？

```typescript
// 使用 CallableSkillResource 按需加载
const skill = createSkill('large-data', '大型数据集处理')
  .addCallableResource(
    'data',
    async () => {
      // 懒加载大型数据
      return await fetchLargeData();
    }
  )
  .build();
```

### Q4: 脚本参数如何传递？

```python
# scripts/process.py
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--input', required=True)
parser.add_argument('--output', default='result.json')
parser.add_argument('--verbose', action='store_true')
parser.add_argument('--tags', action='append', default=[])
args = parser.parse_args()
```

```typescript
// 调用时
await toolset.runSkillScript('my-skill', 'process', {
  input: 'data.json',
  output: 'output.json',
  verbose: true,
  tags: ['tag1', 'tag2', 'tag3']
});
```

### Q5: 如何排除特定工具？

```typescript
const toolset = new SkillsToolset({
  directories: ['./skills'],
  excludeTools: ['searchSkills']  // 排除搜索工具
});
```

---

## 附录

### 依赖项

| 包名 | 版本 | 用途 |
|------|------|------|
| `@orama/orama` | ^3.1.18 | 全文搜索引擎 |
| `@orama/highlight` | ^0.1.9 | 搜索高亮 |
| `@orama/stopwords` | ^3.1.18 | 停用词处理 |
| `@orama/tokenizers` | ^3.1.18 | 文本分词 |
| `glob` | ^11.0.0 | 文件匹配 |
| `json5` | ^2.2.3 | JSON 解析 |
| `yaml` | ^2.7.0 | YAML 解析 |
| `zod` | ^3.24.2 | Schema 验证 |

### 常量

```typescript
// 名称验证
const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SKILL_NAME_LENGTH = 64;

// 描述长度限制
const MAX_DESCRIPTION_LENGTH = 1024;

// 默认值
const DEFAULT_SCRIPT_TIMEOUT = 30000;      // 30 秒
const DEFAULT_BM25_THRESHOLD = 0.3;
const DEFAULT_MAX_DEPTH = 3;

// 保留字
const RESERVED_WORDS = new Set(['anthropic', 'claude']);
```

### 相关资源

- [Anthropic Agent Skills 规范](https://docs.anthropic.com)
- [Orama 文档](https://docs.orama.com)
- [Mimo 项目仓库](https://github.com/your-org/mimo)

---

> 本文档由 @mimo/skills 自动生成
> 最后更新: 2026-02-02
