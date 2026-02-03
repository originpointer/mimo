# AI 智能体搜索页面自动化能力框架

> 定义 AI 智能体理解搜索页面并按用户描述操作所需的核心能力
> 日期：2026-02-02

---

## 目录

1. [能力架构概览](#能力架构概览)
2. [感知层能力](#感知层能力)
3. [认知层能力](#认知层能力)
4. [执行层能力](#执行层能力)
5. [任务拆解能力](#任务拆解能力)
6. [参考实现](#参考实现)

---

## 能力架构概览

### 五层能力模型

```
┌─────────────────────────────────────────────────────────────┐
│                    任务编排层                                │
│  复杂任务拆解、多步骤规划、并行执行协调                     │
├─────────────────────────────────────────────────────────────┤
│                    执行层                                    │
│  页面操作、表单填写、点击导航、数据提取                     │
├─────────────────────────────────────────────────────────────┤
│                    认知层                                    │
│  意图理解、语义匹配、推理决策、异常处理                     │
├─────────────────────────────────────────────────────────────┤
│                    感知层                                    │
│  页面解析、DOM 理解、视觉识别、内容提取                     │
├─────────────────────────────────────────────────────────────┤
│                    基础设施层                                │
│  浏览器控制、网络请求、存储、队列                           │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户描述 "在 Google 搜索最近的 AI 新闻，提取前5条标题和链接"
         │
         ▼
[意图理解] → 解析目标、约束、输出格式
         │
         ▼
[任务拆解] → 1.打开Google 2.输入搜索 3.解析结果 4.提取数据
         │
         ▼
[并行执行] → 多个搜索任务可同时进行
         │
         ▼
[页面感知] → 理解页面结构、识别搜索结果区域
         │
         ▼
[语义映射] → 将用户描述映射到具体页面元素
         │
         ▼
[操作执行] → 输入、点击、滚动、提取
         │
         ▼
[结果验证] → 检查是否符合预期，处理异常
         │
         ▼
[数据输出] → 返回结构化结果
```

---

## 感知层能力

### 1.1 页面结构理解

**能力描述：** 理解任意搜索页面的 HTML 结构和布局

| 能力项 | 说明 | 实现方式 |
|--------|------|----------|
| **DOM 解析** | 解析 HTML 树结构 | cheerio / jsdom / puppeteer |
| **语义识别** | 识别搜索结果、分页、筛选器 | 基于常见模式的规则 + LLM |
| **视觉理解** | 理解页面视觉布局（如多列布局） | 计算机视觉模型 / screenshot |
| **动态内容** | 处理 JavaScript 渲染的内容 | headless browser |

**代码示例：**

```typescript
// 页面结构分析器
interface PageStructureAnalyzer {
  // 分析页面并识别关键区域
  analyzePage(html: string): PageStructure;
}

interface PageStructure {
  searchResults: SearchResultArea;
  pagination: PaginationArea;
  filters: FilterArea[];
  searchBar: SearchBarArea;
}

interface SearchResultArea {
  selector: string;           // CSS 选择器
  type: "list" | "grid" | "card";
  itemSelector: string;       // 单个结果的选择器
  fields: {
    title: string;            // 标题字段
    link: string;             // 链接字段
    snippet: string;          // 摘要字段
    metadata?: Record<string, string>;
  };
}
```

### 1.2 跨站点适配

**能力描述：** 理解不同搜索引擎的页面结构差异

| 搜索引擎 | 特征 | 适配策略 |
|----------|------|----------|
| Google | 10个蓝色链接、卡片混合 | 规则 + LLM 语义理解 |
| Bing | 类似 Google，卡片式 | 通用选择器 |
| Baidu | 贴吧、知道混排 | 内容类型识别 |
| 电商搜索 | 商品卡片、价格、评分 | 结构化数据提取 |
| 垂直搜索 | 行业特定布局 | 领域知识库 |

**实现策略：**

```typescript
// 自适应页面解析器
class AdaptivePageParser {
  private patterns: SearchEnginePattern[] = [
    { name: "google", test: /google\.com/, parser: GoogleParser },
    { name: "bing", test: /bing\.com/, parser: BingParser },
    { name: "baidu", test: /baidu\.com/, parser: BaiduParser },
    { name: "generic", test: /.*/, parser: GenericLLMParser }
  ];

  parse(url: string, html: string): SearchResult[] {
    const pattern = this.patterns.find(p => p.test.test(url));
    return pattern.parser.parse(html);
  }
}

// LLM 驱动的通用解析器
class GenericLLMParser {
  async parse(html: string): SearchResult[] {
    const prompt = `
分析这个搜索页面，提取搜索结果。

HTML 内容（已简化）：
${truncateHTML(html, 10000)}

请以 JSON 格式返回：
{
  "results": [
    { "title": "...", "link": "...", "snippet": "..." }
  ]
}
`;

    const response = await callLLM(prompt);
    return JSON.parse(response).results;
  }
}
```

### 1.3 内容提取

**能力描述：** 从页面中准确提取所需信息

```typescript
// 智能内容提取器
interface ContentExtractor {
  // 结构化提取（已知选择器）
  extractBySelector(html: string, schema: ExtractionSchema): ExtractedData;

  // 语义提取（基于描述）
  extractByDescription(
    html: string,
    description: string
  ): ExtractedData;

  // 视觉提取（基于位置）
  extractByPosition(screenshot: Image, region: BoundingBox): ExtractedData;
}

// 使用示例
const extractor = new ContentExtractor();

// 场景1: 已知结构
const results1 = extractor.extractBySelector(html, {
  results: ".search-result",
  title: ".title",
  link: "a@href",
  snippet: ".description"
});

// 场景2: 语义理解
const results2 = await extractor.extractByDescription(
  html,
  "提取所有搜索结果的标题、链接和摘要"
);

// 场景3: 视觉定位
const results3 = await extractor.extractByPosition(
  screenshot,
  { x: 100, y: 200, width: 800, height: 600 }
);
```

---

## 认知层能力

### 2.1 意图理解

**能力描述：** 理解用户的自然语言描述并转化为可执行任务

| 能力项 | 说明 | 示例 |
|--------|------|------|
| **目标识别** | 识别用户最终想要什么 | "比较价格" → 需要提取多个来源的价格 |
| **约束理解** | 理解限制条件 | "最近一周" → 时间过滤 |
| **格式偏好** | 理解输出格式要求 | "返回表格" → 结构化输出 |
| **模糊处理** | 处理不明确的描述 | "找一些关于..." → 询问具体数量 |

**实现框架：**

```typescript
// 意图理解器
interface IntentUnderstanding {
  // 解析用户输入
  parse(userInput: string): ParsedIntent;
}

interface ParsedIntent {
  primaryGoal: string;           // 主要目标
  subTasks: SubTask[];           // 子任务
  constraints: Constraint[];     // 约束条件
  outputFormat: OutputFormat;    // 输出格式
  confidence: number;            // 置信度
  clarifications: string[];      // 需要澄清的问题
}

// 示例
const intent = intentParser.parse(
  "在 Google 搜索最近的 AI 新闻，提取前5条标题和链接"
);

// 结果
{
  primaryGoal: "搜索并提取信息",
  subTasks: [
    { action: "search", query: "AI 新闻", engine: "google" },
    { action: "extract", fields: ["title", "link"], limit: 5 }
  ],
  constraints: [
    { type: "time", value: "最近" },
    { type: "quantity", value: 5 }
  ],
  outputFormat: { type: "structured", fields: ["title", "link"] },
  confidence: 0.95,
  clarifications: ["最近"是指多少天内？]
}
```

### 2.2 语义映射

**能力描述：** 将用户描述映射到具体的页面元素和操作

```typescript
// 语义映射器
interface SemanticMapper {
  // 将描述映射到元素
  mapToElement(
    description: string,
    page: PageStructure
  ): ElementSelector;

  // 将描述映射到操作
  mapToAction(
    description: string,
    context: ExecutionContext
  ): Action;
}

// 示例
const mapper = new SemanticMapper();

// 用户: "点击搜索按钮"
const element = mapper.mapToElement(
  "搜索按钮",
  pageStructure
);
// 返回: { selector: "button[aria-label='搜索']", type: "button" }

// 用户: "输入搜索内容"
const action = mapper.mapToAction(
  "输入搜索内容",
  { currentPage: "google", userInput: "AI 新闻" }
);
// 返回: { type: "type", selector: "input[name='q']", text: "AI 新闻" }
```

### 2.3 推理决策

**能力描述：** 在不确定情况下做出合理决策

```typescript
// 决策引擎
interface DecisionEngine {
  // 多步骤决策
  decide(
    situation: Situation,
    options: Option[]
  ): Decision;

  // 异常处理决策
  handleException(
    error: Exception,
    context: Context
  ): RecoveryAction;
}

// 示例场景
const decision = decisionEngine.decide(
  {
    current: "搜索结果页",
    goal: "获取所有结果",
    obstacle: "页面只显示10条，但有更多"
  },
  [
    { action: "点击下一页", cost: "low", reliability: "high" },
    { action: "修改URL参数", cost: "low", reliability: "medium" },
    { action: "使用API", cost: "high", reliability: "high" }
  ]
);
// 返回: { action: "点击下一页", reason: "最可靠且成本低" }
```

---

## 执行层能力

### 3.1 页面操作

**能力描述：** 执行各种页面交互操作

```typescript
// 页面操作器
interface PageOperator {
  // 基础操作
  navigate(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  scroll(direction: "up" | "down", amount: number): Promise<void>;

  // 复合操作
  waitForElement(selector: string, timeout?: number): Promise<Element>;
  waitForNavigation(): Promise<void>;
  executeScript(script: string): Promise<any>;

  // 智能操作
  smartClick(description: string): Promise<void>;
  smartType(description: string, text: string): Promise<void>;
  smartScroll(target: "bottom" | "element" | string): Promise<void>;
}

// 使用示例
const operator = new PageOperator(browser);

// 传统方式
await operator.navigate("https://google.com");
await operator.type("input[name='q']", "AI 新闻");
await operator.click("button[type='submit']");

// 智能方式
await operator.navigate("https://google.com");
await operator.smartType("搜索框", "AI 新闻");
await operator.smartClick("搜索按钮");
```

### 3.2 表单处理

**能力描述：** 理解和填写各种表单

```typescript
// 表单处理器
interface FormHandler {
  // 识别表单字段
  identifyForm(form: Element): FormSchema;

  // 智能填写
  fillForm(
    form: Element,
    data: Record<string, any>
  ): Promise<void>;

  // 提交表单
  submitForm(form: Element): Promise<void>;
}

interface FormSchema {
  fields: FormField[];
  submitButton: ElementSelector;
  validation?: ValidationRule[];
}

interface FormField {
  name: string;
  type: "text" | "select" | "checkbox" | "radio" | "file";
  selector: string;
  required: boolean;
  options?: string[];  // for select/radio
  label?: string;
}

// 使用示例
const formHandler = new FormHandler();

// 1. 识别表单
const schema = formHandler.identifyForm(searchForm);

// 2. 填写表单
await formHandler.fillForm(searchForm, {
  "关键词": "AI 新闻",
  "时间范围": "最近一周",
  "结果数量": "10条每页"
});

// 3. 提交
await formHandler.submitForm(searchForm);
```

### 3.3 数据提取

**能力描述：** 从页面提取结构化数据

```typescript
// 数据提取器
interface DataExtractor {
  // 提取单个元素
  extractOne(selector: string): string;

  // 提取多个元素
  extractMany(selector: string): string[];

  // 提取表格
  extractTable(selector: string): TableRow[];

  // 提取列表
  extractList(config: ListExtractionConfig): ListItem[];

  // 智能提取
  extractByDescription(description: string): any;
}

// 使用示例
const extractor = new DataExtractor(page);

// 提取搜索结果
const results = extractor.extractList({
  container: ".search-results",
  item: ".search-result",
  fields: {
    title: { selector: ".title", attribute: "text" },
    link: { selector: "a", attribute: "href" },
    snippet: { selector: ".description", attribute: "text" },
    date: { selector: ".date", attribute: "text" }
  }
});

// 智能提取
const price = await extractor.extractByDescription(
  "商品的价格"
);
```

---

## 任务拆解能力

### 4.1 任务规划

**能力描述：** 将复杂任务分解为可执行步骤

```typescript
// 任务规划器（参考 OpenClaw 的 Captain 模式）
interface TaskPlanner {
  // 分析任务并创建计划
  plan(userRequest: string): ExecutionPlan;

  // 动态调整计划
  adjust(plan: ExecutionPlan, feedback: Feedback): ExecutionPlan;
}

interface ExecutionPlan {
  steps: ExecutionStep[];
  parallelGroups: ParallelGroup[];
  checkpoints: Checkpoint[];
  fallbackStrategies: FallbackStrategy[];
}

interface ExecutionStep {
  id: string;
  description: string;
  action: Action;
  dependencies: string[];  // 依赖的步骤ID
  expectedOutput?: any;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

interface ParallelGroup {
  id: string;
  steps: ExecutionStep[];  // 可并行执行的步骤
  mergeStrategy: "all" | "first" | "any";
  errorStrategy: "fail-fast" | "continue" | "ignore";
}

// 示例：多搜索引擎聚合
const plan = taskPlanner.plan(
  "搜索 AI 新闻，聚合 Google、Bing、Baidu 的结果"
);

// 生成的计划
{
  steps: [
    { id: "1", action: "navigate", url: "google.com" },
    { id: "2", action: "search", query: "AI 新闻", dependsOn: ["1"] },
    { id: "3", action: "extract", dependsOn: ["2"] }
  ],
  parallelGroups: [
    {
      id: "search-all-engines",
      steps: [
        { action: "search_google", query: "AI 新闻" },
        { action: "search_bing", query: "AI 新闻" },
        { action: "search_baidu", query: "AI 新闻" }
      ],
      mergeStrategy: "all",
      errorStrategy: "continue"
    }
  ],
  checkpoints: [
    { after: "search-all-engines", action: "validate", require: "至少3条结果" }
  ],
  fallbackStrategies: [
    { condition: "结果为空", action: "使用备用搜索引擎" }
  ]
}
```

### 4.2 并行执行

**能力描述：** 同时执行多个独立任务

```typescript
// 并行执行器（参考 OpenClaw 的 parallel）
interface ParallelExecutor {
  // 并行执行多个任务
  executeParallel(
    tasks: Task[],
    strategy: ParallelStrategy
  ): Promise<TaskResult[]>;

  // 并行处理集合
  executeParallelForEach<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    strategy: ParallelStrategy
  ): Promise<R[]>;
}

interface ParallelStrategy {
  concurrency: number;           // 并发数
  mergeStrategy: "all" | "first" | "any";
  errorStrategy: "fail-fast" | "continue" | "ignore";
  timeout?: number;
}

// 使用示例
const executor = new ParallelExecutor();

// 场景1: 多搜索引擎并行搜索
const results = await executor.executeParallel(
  [
    { engine: "google", query: "AI 新闻" },
    { engine: "bing", query: "AI 新闻" },
    { engine: "baidu", query: "AI 新闻" }
  ],
  {
    concurrency: 3,
    mergeStrategy: "all",
    errorStrategy: "continue"  // 一个失败不影响其他
  }
);

// 场景2: 批量处理搜索结果
const processedResults = await executor.executeParallelForEach(
  searchResults,
  async (result) => {
    return await extractFullContent(result.link);
  },
  {
    concurrency: 5,
    errorStrategy: "continue"
  }
);
```

### 4.3 结果聚合

**能力描述：** 合并多个子任务的结果

```typescript
// 结果聚合器
interface ResultAggregator {
  // 聚合结果
  aggregate(
    results: TaskResult[],
    strategy: AggregationStrategy
  ): AggregatedResult;

  // 去重
  deduplicate(results: SearchResult[], key: string): SearchResult[];

  // 排序
  sort(results: SearchResult[], criteria: SortCriteria): SearchResult[];

  // 过滤
  filter(results: SearchResult[], predicate: FilterPredicate): SearchResult[];
}

interface AggregationStrategy {
  mergeStrategy: "union" | "intersect" | "concat";
  rankingStrategy: "chronological" | "relevance" | "custom";
  deduplication: boolean;
  deduplicationKey?: string;
}

// 使用示例
const aggregator = new ResultAggregator();

// 聚合多个搜索引擎的结果
const aggregated = aggregator.aggregate(
  [googleResults, bingResults, baiduResults],
  {
    mergeStrategy: "union",       // 合并所有结果
    rankingStrategy: "relevance", // 按相关性排序
    deduplication: true,
    deduplicationKey: "link"      // 按链接去重
  }
);

// 进一步处理
const unique = aggregator.deduplicate(aggregated, "link");
const sorted = aggregator.sort(unique, { by: "date", order: "desc" });
const filtered = aggregator.filter(sorted, { dateRange: "最近一周" });
```

---

## 参考实现

### OpenClaw 相关能力映射

| OpenClaw 能力 | 搜索自动化应用 | 实现方式 |
|---------------|----------------|----------|
| **OpenProse VM** | 任务编排语言 | 定义搜索流程 DSL |
| **sessions_spawn** | 并行搜索多个引擎 | 每个搜索引擎一个子会话 |
| **parallel** | 同时执行多个搜索任务 | `parallel for engine in engines` |
| **结果聚合** | 合并多源结果 | `reduce` 操作符 |
| **Captain 模式** | 任务拆解和协调 | 协调者智能体规划搜索策略 |

### 实现示例

```prose
# 使用 OpenProse 风格的搜索自动化

# 定义智能体
agent search_coordinator:
  model: opus
  prompt: """You are a search automation expert.
Break down search requests into engine-specific tasks.
Coordinate parallel searches and aggregate results."""

agent page_parser:
  model: sonnet
  prompt: """Extract structured data from search pages.
Handle different page layouts intelligently."""

# 主流程
block search_and_extract(user_query, engines):
  # 并行搜索多个引擎
  parallel (on-fail: "continue"):
    google_results = session: page_parser
      prompt: "Search Google for: {user_query}"

    bing_results = session: page_parser
      prompt: "Search Bing for: {user_query}"

    baidu_results = session: page_parser
      prompt: "Search Baidu for: {user_query}"

  # 聚合结果
  all_results = [google_results, bing_results, baidu_results]

  # 去重
  unique_results = session: search_coordinator
    prompt: "Deduplicate results by link"
    context: all_results

  # 排序
  sorted_results = session: search_coordinator
    prompt: "Sort by relevance and date"
    context: unique_results

  output sorted_results

# 执行
output answer = do search_and_extract(
  user_query: "AI 新闻",
  engines: ["google", "bing", "baidu"]
)
```

---

## 能力检查清单

### 感知层

- [ ] DOM 解析和理解
- [ ] 语义元素识别
- [ ] 跨站点适配
- [ ] 动态内容处理
- [ ] 视觉布局理解

### 认知层

- [ ] 自然语言意图理解
- [ ] 语义到元素映射
- [ ] 上下文推理决策
- [ ] 异常情况处理
- [ ] 模糊输入澄清

### 执行层

- [ ] 页面导航操作
- [ ] 表单智能填写
- [ ] 结构化数据提取
- [ ] 滚动和加载处理
- [ ] 弹窗和干扰处理

### 任务编排层

- [ ] 复杂任务拆解
- [ ] 并行执行协调
- [ ] 结果聚合和去重
- [ ] 错误恢复和重试
- [ ] 进度跟踪和报告

---

## 技术栈建议

### 核心依赖

| 类别 | 技术选型 |
|------|----------|
| **浏览器控制** | Puppeteer / Playwright |
| **页面解析** | Cheerio / jsdom |
| **LLM** | Claude / GPT-4（用于语义理解） |
| **任务编排** | 自研（参考 OpenClaw OpenProse） |
| **数据存储** | SQLite / PostgreSQL |
| **队列** | Bull / RabbitMQ |

### 推荐架构

```
┌─────────────────────────────────────────────────────────────┐
│                    API 层                                    │
│  REST / GraphQL                                             │
├─────────────────────────────────────────────────────────────┤
│                    任务编排层                                │
│  OpenProse 解释器 / 子会话管理 / 并行执行器                 │
├─────────────────────────────────────────────────────────────┤
│                    认知层                                    │
│  意图理解器 / 语义映射器 / 决策引擎                          │
├─────────────────────────────────────────────────────────────┤
│                    执行层                                    │
│  浏览器操作器 / 表单处理器 / 数据提取器                      │
├─────────────────────────────────────────────────────────────┤
│                    感知层                                    │
│  页面分析器 / DOM 解析器 / 视觉理解器                        │
├─────────────────────────────────────────────────────────────┤
│                    基础设施层                                │
│  浏览器池 / 代理池 / 队列 / 存储                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 总结

要实现"AI 对所有搜索页面快速理解并按用户描述操作"，智能体需要具备以下核心能力：

### 必备能力

1. **页面感知**：理解任意搜索页面的结构和内容
2. **意图理解**：将自然语言转化为可执行任务
3. **语义映射**：将描述映射到具体元素和操作
4. **任务拆解**：将复杂任务分解为可执行步骤
5. **并行执行**：同时处理多个独立任务
6. **结果聚合**：合并和优化多源结果

### 实现策略

1. **分层架构**：感知 → 认知 → 执行 → 编排
2. **LLM 驱动**：使用 LLM 进行语义理解和决策
3. **规则增强**：用规则处理常见模式
4. **自适应学习**：从执行结果中持续优化
5. **参考 OpenClaw**：借鉴其任务拆解和编排机制

---

*本文档基于 OpenClaw 任务拆解机制分析，结合搜索自动化场景设计*
