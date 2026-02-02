# Pydantic AI Skills - 核心算法与架构

## 概述

**pydantic-ai-skills** (v0.4.0) 是一个轻量级框架，为 Pydantic AI 实现了 [Anthropic 的 Agent Skills 规范](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)。该框架通过**渐进式披露（progressive disclosure）**机制实现模块化的技能发现和按需加载，从而减少 token 使用量。

## 核心架构：三层系统

```
┌─────────────────────────────────────────────────────────────┐
│                    集成层 (Integration Layer)                │
│                   (toolset.py: ~900 行)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         SkillsToolset extends FunctionToolset        │   │
│  │  • list_skills()    • load_skill()                   │   │
│  │  • read_skill_resource()  • run_skill_script()       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      类型层 (Type Layer)                     │
│                    (types.py: ~650 行)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Skill      │  SkillResource  │  SkillScript         │   │
│  │  SkillWrapper (用于装饰器式创建)                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    发现层 (Discovery Layer)                  │
│                  (directory.py: ~480 行)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SkillsDirectory • _discover_skills()                │   │
│  │  • _find_skill_files()  • _parse_skill_md()          │   │
│  │  • _validate_skill_metadata()  • _discover_resources()│  │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 执行层 (Execution Layer)                     │
│                    (local.py: ~340 行)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LocalSkillScriptExecutor  │  CallableSkillScriptExecutor │
│  │  FileBasedSkillResource    │  FileBasedSkillScript  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. 类型系统 (`types.py`)

### 1.1 技能命名模式算法

```python
# 第 27 行：技能名称验证的正则表达式
SKILL_NAME_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')

# 第 33-69 行：normalize_skill_name 函数
def normalize_skill_name(func_name: str) -> str:
    """
    算法：
    1. 将下划线替换为连字符：data_analyzer → data-analyzer
    2. 转换为小写
    3. 使用 SKILL_NAME_PATTERN 验证
    4. 检查长度 ≤ 64 字符
    """
    normalized = func_name.replace('_', '-').lower()
    if not SKILL_NAME_PATTERN.match(normalized):
        raise SkillValidationError(...)
    if len(normalized) > 64:
        raise SkillValidationError(...)
    return normalized
```

**命名规则（遵循 Anthropic 规范）：**
- 模式：`^[a-z0-9]+(-[a-z0-9]+)*$`（小写字母、数字、连字符）
- 最多 64 个字符
- 禁止使用保留词：`anthropic`、`claude`
- 不允许连续的连字符

### 1.2 SkillResource 数据类

```python
@dataclass
class SkillResource:
    """表示技能资源（文件或可调用对象）。"""

    name: str
    description: str | None = None
    content: str | None = None          # 静态内容
    function: Callable | None = None    # 动态内容
    takes_ctx: bool = False
    function_schema: FunctionSchema | None = None
    uri: str | None = None              # 文件路径

    async def load(self, ctx: Any, args: dict | None = None) -> Any:
        """加载资源内容。"""
        if self.function and self.function_schema:
            # 可调用资源：使用参数调用
            return await self.function_schema.call(args or {}, ctx)
        elif self.content:
            # 静态资源：直接返回内容
            return self.content
```

### 1.3 SkillScript 数据类

```python
@dataclass
class SkillScript:
    """表示可执行脚本（函数或基于文件）。"""

    name: str
    description: str | None = None
    function: Callable | None = None     # 用于编程式脚本
    takes_ctx: bool = False
    function_schema: FunctionSchema | None = None
    uri: str | None = None               # 用于基于文件的脚本
    skill_name: str | None = None

    async def run(self, ctx: Any, args: dict | None = None) -> Any:
        """执行脚本。"""
        if self.function and self.function_schema:
            return await self.function_schema.call(args or {}, ctx)
```

### 1.4 Skill 装饰器模式

```python
@dataclass
class Skill:
    """核心技能数据类。"""

    name: str
    description: str
    content: str
    license: str | None = None
    compatibility: str | None = None
    resources: list[SkillResource] = field(default_factory=list)
    scripts: list[SkillScript] = field(default_factory=list)
    uri: str | None = None
    metadata: dict[str, Any] | None = None

    def resource(self, func, *, name=None, description=None, ...):
        """装饰器：注册可调用资源。

        算法：
        1. 从函数提取名称或使用提供的名称
        2. 使用 Pydantic AI 的 function_schema() 生成函数模式
        3. 创建带有函数和模式的 SkillResource
        4. 追加到 self.resources
        """
        # 第 286-311 行
        def decorator(f):
            resource_name = name or f.__name__
            func_schema = _function_schema.function_schema(
                f, schema_generator=gen, takes_ctx=takes_ctx, ...
            )
            resource = SkillResource(
                name=resource_name,
                description=description or func_schema.description,
                function=f,
                function_schema=func_schema,
            )
            self.resources.append(resource)
            return f
        return decorator(func) if func else decorator

    def script(self, func, *, name=None, ...):
        """装饰器：注册可执行脚本。

        与 resource() 算法类似，但创建 SkillScript。"""
        # 第 355-381 行
```

---

## 2. 发现层 (`directory.py`)

### 2.1 技能发现算法

```python
# 第 268-352 行：_discover_skills 函数
def _discover_skills(path, validate=True, max_depth=3, script_executor=None):
    """
    从文件系统发现技能的算法：

    1. 解析并验证目录路径
    2. 查找所有 SKILL.md 文件（深度限制）
    3. 对于每个 SKILL.md：
       a. 读取文件内容
       b. 解析 YAML frontmatter
       c. 提取元数据（name, description, license 等）
       d. 如果启用，验证元数据
       e. 发现关联的资源
       f. 发现关联的脚本
       g. 创建 Skill 对象
    4. 返回 Skill 对象列表
    """
```

### 2.2 YAML Frontmatter 解析算法

```python
# 第 108-136 行：_parse_skill_md 函数
def _parse_skill_md(content: str) -> tuple[dict, str]:
    """
    解析带有 YAML frontmatter 的 SKILL.md 文件。

    算法：
    1. 匹配模式：^---\\s*\\n(.*?)^---\\s*\\n (DOTALL|MULTILINE)
    2. 提取 --- 分隔符之间的 YAML 内容
    3. 使用 yaml.safe_load() 解析 YAML
    4. 返回 (frontmatter_dict, instructions_markdown)

    输入示例：
        ---
        name: my-skill
        description: A skill
        ---
        # Instructions
        This is the skill content...
    """
    frontmatter_pattern = r'^---\s*\n(.*?)^---\s*\n'
    match = re.search(frontmatter_pattern, content, re.DOTALL | re.MULTILINE)

    if not match:
        return {}, content.strip()

    frontmatter_yaml = match.group(1).strip()
    instructions = content[match.end():].strip()

    frontmatter = yaml.safe_load(frontmatter_yaml)
    return frontmatter, instructions
```

### 2.3 技能元数据验证算法

```python
# 第 38-105 行：_validate_skill_metadata 函数
def _validate_skill_metadata(frontmatter: dict, instructions: str) -> bool:
    """
    根据 Anthropic 要求验证技能。

    检查项（警告而非错误）：
    1. 名称格式：匹配 SKILL_NAME_PATTERN
    2. 名称长度：≤ 64 字符
    3. 保留词：不包含 'anthropic' 或 'claude'
    4. 描述长度：≤ 1024 字符
    5. 兼容性长度：≤ 500 字符
    6. 指令长度：≤ 500 行

    返回：有效返回 True，发出警告返回 False
    """
```

### 2.4 资源发现算法

```python
# 第 139-181 行：_discover_resources 函数
def _discover_resources(skill_folder: Path) -> list[SkillResource]:
    """
    在技能目录中发现资源文件。

    算法：
    1. 支持的扩展名：.md, .json, .yaml, .yml, .csv, .xml, .txt
    2. 使用 rglob() 进行递归搜索
    3. 排除 SKILL.md
    4. 安全检查：解析符号链接并验证路径保持在 skill_folder 内
    5. 为每个有效文件创建 FileBasedSkillResource
    """
    resources = []
    supported_extensions = ['.md', '.json', '.yaml', '.yml', '.csv', '.xml', '.txt']
    skill_folder_resolved = skill_folder.resolve()

    for extension in supported_extensions:
        for resource_file in skill_folder.rglob(f'*{extension}'):
            if resource_file.name.upper() != 'SKILL.MD':
                # 安全：检查符号链接逃逸
                resolved_path = resource_file.resolve()
                try:
                    resolved_path.relative_to(skill_folder_resolved)
                except ValueError:
                    # 检测到符号链接逃逸 - 跳过
                    continue

                rel_path = resource_file.relative_to(skill_folder)
                resources.append(create_file_based_resource(
                    name=str(rel_path),
                    uri=str(resolved_path),
                ))

    return resources
```

### 2.5 深度限制的文件搜索算法

```python
# 第 184-207 行：_find_skill_files 函数
def _find_skill_files(root_dir: Path, max_depth: int | None) -> list[Path]:
    """
    查找 SKILL.md 文件，使用深度限制搜索。

    算法（当指定 max_depth 时）：
    1. 对于从 0 到 max_depth 的每个深度：
       - depth=0: pattern = "SKILL.md"
       - depth=1: pattern = "*/SKILL.md"
       - depth=2: pattern = "*/*/SKILL.md"
       - depth=3: pattern = "*/*/*/SKILL.md"
    2. 使用 glob() 匹配每个模式
    3. 收集所有结果

    当 max_depth=None 时：使用 root_dir.glob('**/SKILL.md')
    """
    if max_depth is None:
        return list(root_dir.glob('**/SKILL.md'))

    skill_files = []
    for depth in range(max_depth + 1):
        if depth == 0:
            pattern = 'SKILL.md'
        else:
            pattern = '/'.join(['*'] * depth) + '/SKILL.md'
        skill_files.extend(root_dir.glob(pattern))

    return skill_files
```

---

## 3. 集成层 (`toolset.py`)

### 3.1 SkillsToolset 初始化算法

```python
# 第 140-239 行：__init__ 方法
class SkillsToolset(FunctionToolset):
    def __init__(self, *, skills=None, directories=None, validate=True,
                 max_depth=3, id=None, instruction_template=None,
                 exclude_tools=None):
        """
        初始化算法：

        1. 设置指令模板（自定义或默认）
        2. 验证 exclude_tools 集合
        3. 初始化 _skills 字典和 _skill_directories 列表
        4. 加载编程式技能（如果提供）
        5. 加载基于目录的技能（如果提供）
           - 将 str/Path 转换为 SkillsDirectory 实例
           - 从每个目录发现技能
           - 处理重复项（后者获胜）
        6. 如果未指定 skills/directories，回退到 ./skills 目录
        7. 注册四个工具（除非被排除）

        默认行为：如果未指定任何内容，使用 ./skills 目录
        """
```

### 3.2 工具注册算法

```python
# 第 371-384 行：_register_tools 方法
def _register_tools(self):
    """
    将技能管理工具注册为 Pydantic AI 工具。

    通过 @self.tool 装饰器注册四个工具：
    1. list_skills() - 所有技能的概览
    2. load_skill(skill_name) - 加载完整指令
    3. read_skill_resource(skill_name, resource_name, args) - 读取资源
    4. run_skill_script(skill_name, script_name, args) - 执行脚本

    每个工具函数必须接受 ctx: RunContext[Any] 作为第一个参数
    （Pydantic AI 协议要求）。
    """
```

### 3.3 load_skill 工具算法

```python
# 第 403-460 行：_register_load_skill 方法
@self.tool
async def load_skill(ctx: RunContext[Any], skill_name: str) -> str:
    """
    加载技能的完整指令。

    算法：
    1. 在 self._skills 中按名称查找技能
    2. 如果未找到，抛出 SkillNotFoundError 并附带可用名称
    3. 构建 XML 格式的资源列表：
       - 对于可调用资源：包含 JSON 模式参数
    4. 构建 XML 格式的脚本列表：
       - 对于可调用脚本：包含 JSON 模式参数
    5. 使用 LOAD_SKILL_TEMPLATE 格式化响应：
       <skill>
         <name>skill_name</name>
         <description>description</description>
         <uri>uri</uri>
         <resources>...</resources>
         <scripts>...</scripts>
         <instructions>content</instructions>
       </skill>
    """
```

### 3.4 get_instructions 算法（渐进式披露）

```python
# 第 574-603 行：get_instructions 方法
async def get_instructions(self, ctx: RunContext[Any]) -> str | None:
    """
    生成渐进式披露的系统提示。

    算法：
    1. 如果未加载技能，返回 None
    2. 构建 XML 格式的技能列表：
       <available_skills>
       <skill><name>skill-name</name><description>...</description></skill>
       ...
       </available_skills>
    3. 如果提供自定义模板则使用，否则使用默认模板：
       _INSTRUCTION_SKILLS_HEADER
    4. 将技能列表注入模板

    通过 @agent.instructions 装饰器调用此方法，
    将技能概览注入到 agent 的系统提示中。
    """
```

### 3.5 编程式技能装饰器算法

```python
# 第 605-712 行：skill 装饰器方法
def skill(self, func=None, *, name=None, description=None, ...):
    """
    使用函数定义技能的装饰器。

    算法：
    1. 如果提供名称，直接验证
    2. 如果没有名称，从函数名称规范化：
       - my_skill → my-skill
    3. 如果未提供，从函数文档字符串提取描述
    4. 创建 SkillWrapper，包含：
       - function（返回内容）
       - 规范化的名称
       - 描述
       - 其他元数据
    5. 立即注册技能（调用 wrapper.to_skill()）
    6. 返回 wrapper 以便附加资源/脚本

    用法：
        @skills.skill()
        def my_skill() -> str:
            '''技能描述。'''
            return '技能指令...'

        @my_skill.resource
        async def get_resource(ctx: RunContext[Deps]) -> str:
            return await ctx.deps.get_data()
    """
```

---

## 4. 执行层 (`local.py`)

### 4.1 LocalSkillScriptExecutor 算法

```python
# 第 85-178 行：LocalSkillScriptExecutor 类
class LocalSkillScriptExecutor:
    """通过子进程执行 Python 脚本。"""

    async def run(self, script: SkillScript, args: dict | None = None) -> Any:
        """
        通过子进程执行脚本，带超时。

        算法：
        1. 构建命令：
           - [python_executable, script_path]
           - 追加参数为 --key value 对
        2. 将 args 字典转换为 CLI 标志：
           - Boolean True: 仅 --flag
           - Boolean False/None: 省略标志
           - List: 为每个项重复标志
           - 其他: --key value
        3. 使用 anyio.run_process 执行（异步兼容）
        4. 使用 anyio.move_on_after() 应用超时
        5. 在输出中合并 stdout 和 stderr
        6. 返回输出或抛出 SkillScriptExecutionError

        示例：
           args = {"query": "test", "limit": 10, "verbose": True}
           → python script.py --query test --limit 10 --verbose
        """
```

### 4.2 FileBasedSkillResource 加载算法

```python
# 第 34-82 行：FileBasedSkillResource 类
@dataclass
class FileBasedSkillResource(SkillResource):
    """从磁盘加载的基于文件的资源。"""

    async def load(self, ctx: Any, args: dict | None = None) -> Any:
        """
        从文件加载资源内容。

        算法：
        1. 验证 uri 存在
        2. 作为 UTF-8 文本读取文件
        3. 根据文件扩展名解析：
           - .json: json.loads() → 返回 dict（失败则返回文本）
           - .yaml/.yml: yaml.safe_load() → 返回 dict（失败则返回文本）
           - 其他: 按原样返回文本
        4. 读取失败时抛出 SkillResourceLoadError
        """
```

### 4.3 FileBasedSkillScript 运行算法

```python
# 第 256-289 行：FileBasedSkillScript 类
@dataclass
class FileBasedSkillScript(SkillScript):
    """通过子进程执行的基于文件的脚本。"""

    executor: LocalSkillScriptExecutor | CallableSkillScriptExecutor

    async def run(self, ctx: Any, args: dict | None = None) -> Any:
        """
        通过 executor 执行脚本文件。

        算法：
        1. 验证 uri 存在
        2. 委托给 self.executor.run(script=self, args=args)
        3. 返回来自 executor 的输出
        """
```

---

## 5. 渐进式披露流程

该框架的核心创新是**渐进式披露** - 仅在需要时加载信息以最小化 token 使用。

### 流程图

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Agent 启动                                                │
│    - get_instructions() 注入技能概览                         │
│    - 仅名称 + 描述在系统提示中                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Agent 接收任务                                            │
│    - 在上下文中看到可用技能                                  │
│    - 决定使用哪个技能                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Agent 调用 load_skill(name)                              │
│    - 接收完整的 SKILL.md 内容                                │
│    - 获取资源和脚本列表及其模式                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Agent 根据需要调用 read_skill_resource()                  │
│    - 加载补充文档                                            │
│    - 使用参数调用可调用资源                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Agent 根据需要调用 run_skill_script()                     │
│    - 执行 Python 脚本（文件或可调用）                          │
│    - 以字符串形式获取结果                                     │
└─────────────────────────────────────────────────────────────┘
```

### 示例：Token 使用对比

**没有渐进式披露：**
```
系统提示：10,000 tokens（所有技能完全加载）
每次请求上下文：10,000 tokens（始终存在）
```

**有渐进式披露：**
```
系统提示：500 tokens（仅技能名称 + 描述）
按需加载：+2,000 tokens（仅在需要技能时）
平均上下文：500-2,500 tokens（仅加载需要的内容）
```

---

## 6. 安全措施

### 6.1 路径遍历防护

```python
# directory.py 第 161-170 行
def _discover_resources(skill_folder: Path) -> list[SkillResource]:
    """安全：验证解析后的路径保持在 skill_folder 内。"""
    skill_folder_resolved = skill_folder.resolve()

    for resource_file in skill_folder.rglob(f'*{extension}'):
        resolved_path = resource_file.resolve()
        try:
            # 如果路径在 skill_folder 之外则抛出 ValueError
            resolved_path.relative_to(skill_folder_resolved)
        except ValueError:
            # 检测到符号链接逃逸 - 跳过此文件
            warnings.warn("检测到符号链接逃逸。跳过。")
            continue
```

### 6.2 脚本超时

```python
# local.py 第 154-165 行
async def run(self, script, args):
    """带超时执行以防止脚本挂起。"""
    result = None
    with anyio.move_on_after(self.timeout) as scope:
        result = await anyio.run_process(cmd, check=False, cwd=cwd, ...)

    if scope.cancelled_caught or result is None:
        raise SkillScriptExecutionError(
            f"脚本 '{script.name}' 在 {self.timeout} 秒后超时"
        )
```

### 6.3 安全的 YAML 解析

```python
# directory.py 第 132-133 行
frontmatter = yaml.safe_load(frontmatter_yaml)
```
使用 `yaml.safe_load()` 而不是 `yaml.load()` 来防止任意代码执行。

---

## 7. 异常层次 (`exceptions.py`)

```
SkillException (基类)
├── SkillNotFoundError          # 在任何来源中找不到技能
├── SkillValidationError        # 技能验证失败
├── SkillResourceNotFoundError  # 找不到资源文件
├── SkillResourceLoadError      # 资源加载失败
└── SkillScriptExecutionError   # 脚本执行失败
```

所有异常都继承自 `SkillException`，允许广泛的错误处理：

```python
try:
    result = await agent.run("使用 hr-analytics-skill 分析数据")
except SkillException as e:
    print(f"技能相关错误: {e}")
```

---

## 8. 双技能模式

### 8.1 文件系统技能

```markdown
my-skill/
├── SKILL.md          # 必需：YAML frontmatter + 指令
├── scripts/          # 可选：Python 脚本
│   └── process.py
└── resources/        # 可选：附加文件
    └── data.json
```

**发现：** 通过 `SkillsDirectory` 自动
**执行：** 通过 `LocalSkillScriptExecutor` 子进程

### 8.2 编程式技能

```python
skill = Skill(
    name='my-skill',
    description='我的技能',
    content='指令...',
)

@skill.resource
async def get_data(ctx: RunContext[Deps]) -> str:
    return await ctx.deps.fetch_data()

@skill.script
async def process(ctx: RunContext[Deps], input: str) -> str:
    return await ctx.deps.process(input)
```

**发现：** 通过 `SkillsToolset(skills=[skill])` 手动注册
**执行：** 通过 `function_schema.call()` 直接函数调用

---

## 9. 关键数据结构

### Skill 对象结构

```
Skill
├── name: str                    # 唯一标识符（如 "arxiv-search"）
├── description: str             # 简要描述（≤1024 字符）
├── content: str                 # 完整指令（SKILL.md 主体）
├── license: str | None          # 可选的许可证信息
├── compatibility: str | None    # 可选的环境要求
├── uri: str | None              # 文件路径（用于文件系统技能）
├── metadata: dict | None        # 附加字段
├── resources: list[SkillResource]
│   ├── name: str                # 资源标识符
│   ├── description: str | None
│   ├── content: str | None      # 静态内容
│   ├── function: Callable | None  # 动态内容
│   ├── function_schema: FunctionSchema | None
│   └── uri: str | None          # 基于文件的文件路径
└── scripts: list[SkillScript]
    ├── name: str                # 脚本标识符
    ├── description: str | None
    ├── function: Callable | None  # 用于编程式
    ├── function_schema: FunctionSchema | None
    ├── uri: str | None          # 基于文件的文件路径
    ├── skill_name: str | None
    └── executor: Executor | None  # 用于基于文件的脚本
```

---

## 10. 核心算法总结

| 算法 | 位置 | 目的 |
|------|------|------|
| `normalize_skill_name()` | types.py:33 | 将函数名称转换为有效的技能名称 |
| `_parse_skill_md()` | directory.py:108 | 从 SKILL.md 提取 YAML frontmatter |
| `_validate_skill_metadata()` | directory.py:38 | 根据 Anthropic 规范验证技能 |
| `_discover_skills()` | directory.py:268 | 扫描目录查找 SKILL.md 文件 |
| `_find_skill_files()` | directory.py:184 | 深度限制的递归文件搜索 |
| `_discover_resources()` | directory.py:139 | 查找资源文件并验证符号链接 |
| `_discover_scripts()` | directory.py:210 | 在技能目录中查找 Python 脚本 |
| `get_instructions()` | toolset.py:574 | 生成渐进式披露提示 |
| `load_skill()` | toolset.py:403 | 加载完整技能及资源/脚本 |
| `read_skill_resource()` | toolset.py:462 | 加载资源内容（静态或可调用） |
| `run_skill_script()` | toolset.py:517 | 执行脚本（子进程或可调用） |
| `FileBasedSkillResource.load()` | local.py:42 | 加载文件并解析 JSON/YAML |
| `LocalSkillScriptExecutor.run()` | local.py:113 | 带超时执行脚本 |

---

## 11. 渐进式披露的详细流程

### 11.1 初始化阶段

```python
# agent.py
@agent.instructions
async def add_skills(ctx: RunContext) -> str | None:
    """将技能指令注入到 agent 上下文。"""
    return await skills_toolset.get_instructions(ctx)
```

**生成的系统提示：**
```
You have access to a collection of skills containing domain-specific knowledge and capabilities.

<available_skills>
<skill>
<name>arxiv-search</name>
<description>Search arXiv for research papers</description>
</skill>
<skill>
<name>web-research</name>
<description>Conduct comprehensive web research</description>
</skill>
</available_skills>

When a task falls within a skill's domain:
1. Use `load_skill` to read the complete skill instructions
2. Follow the skill's guidance to complete the task
3. Use any additional skill resources and scripts as needed
```

### 11.2 技能加载阶段

当 agent 调用 `load_skill("arxiv-search")` 时：

```python
# toolset.py 第 403-460 行
async def load_skill(ctx: RunContext[Any], skill_name: str) -> str:
    skill = self._skills[skill_name]

    # 构建资源列表
    resources_xml = []
    for res in skill.resources:
        if res.function and res.function_schema:
            # 可调用资源：包含 JSON Schema
            params_json = json.dumps(res.function_schema.json_schema)
            resources_xml.append(f'<resource name="{res.name}" parameters={params_json} />')
        else:
            # 静态资源
            resources_xml.append(f'<resource name="{res.name}" />')

    # 构建脚本列表
    scripts_xml = []
    for scr in skill.scripts:
        if scr.function and scr.function_schema:
            # 可调用脚本：包含 JSON Schema
            params_json = json.dumps(scr.function_schema.json_schema)
            scripts_xml.append(f'<script name="{scr.name}" parameters={params_json} />')
        else:
            # 文件脚本
            scripts_xml.append(f'<script name="{scr.name}" />')

    return f"""<skill>
<name>{skill.name}</name>
<description>{skill.description}</description>

<resources>
{''.join(resources_xml)}
</resources>

<scripts>
{''.join(scripts_xml)}
</scripts>

<instructions>
{skill.content}
</instructions>
</skill>"""
```

### 11.3 资源加载阶段

当 agent 调用 `read_skill_resource(skill_name, resource_name, args)` 时：

```python
# toolset.py 第 462-515 行
async def read_skill_resource(
    ctx: RunContext[Any],
    skill_name: str,
    resource_name: str,
    args: dict[str, Any] | None = None,
) -> str:
    skill = self._skills[skill_name]
    resource = self._find_skill_resource(skill, resource_name)

    # 使用 resource.load() 接口
    return await resource.load(ctx=ctx, args=args)
```

**静态资源加载（local.py）：**
```python
async def load(self, ctx: Any, args: dict | None = None) -> Any:
    # 读取文件
    content = Path(self.uri).read_text(encoding='utf-8')

    # 根据扩展名解析
    if self.name.endswith('.json'):
        return json.loads(content)
    elif self.name.endswith(('.yaml', '.yml')):
        return yaml.safe_load(content)
    else:
        return content
```

**可调用资源加载（types.py）：**
```python
async def load(self, ctx: Any, args: dict | None = None) -> Any:
    # 调用函数
    return await self.function_schema.call(args or {}, ctx)
```

### 11.4 脚本执行阶段

当 agent 调用 `run_skill_script(skill_name, script_name, args)` 时：

```python
# toolset.py 第 517-572 行
async def run_skill_script(
    ctx: RunContext[Any],
    skill_name: str,
    script_name: str,
    args: dict[str, Any] | None = None,
) -> str:
    skill = self._skills[skill_name]
    script = self._find_skill_script(skill, script_name)

    # 使用 script.run() 接口
    return await script.run(ctx=ctx, args=args)
```

**文件脚本执行（local.py）：**
```python
async def run(self, ctx: Any, args: dict | None = None) -> Any:
    # 通过 executor 执行
    return await self.executor.run(self, args)
```

**LocalSkillScriptExecutor 执行：**
```python
async def run(self, script: SkillScript, args: dict | None = None) -> Any:
    # 构建命令
    cmd = [self._python_executable, str(script_path)]

    # 转换参数为 CLI 标志
    if args:
        for key, value in args.items():
            if isinstance(value, bool):
                if value:
                    cmd.append(f'--{key}')
            elif isinstance(value, list):
                for item in value:
                    cmd.append(f'--{key}')
                    cmd.append(str(item))
            elif value is not None:
                cmd.append(f'--{key}')
                cmd.append(str(value))

    # 执行
    result = await anyio.run_process(cmd, check=False)
    return result.stdout.decode('utf-8')
```

---

## 12. 完整示例：HR Analytics 技能

### 12.1 定义编程式技能

```python
from pydantic_ai_skills import Skill

hr_analytics_skill = Skill(
    name='hr-analytics-skill',
    description='HR 数据分析能力',
    content="""使用此技能进行 HR 数据分析：
1. 调用 load_dataset 脚本初始化数据库
2. 使用 get_context 资源获取数据集概览
3. 执行 run_query 脚本进行 SQL 查询
""",
)

@hr_analytics_skill.resource
def get_context() -> str:
    """提供 HR 数据集结构概览。"""
    return 'HR 数据集包含 5 个关联表：business_units, departments, jobs, employees, compensations'

@hr_analytics_skill.script
async def load_dataset(ctx: RunContext[AnalystDeps]) -> str:
    """加载 HuggingFace HR 数据集到内存数据库。"""
    # 初始化数据库
    ctx.deps.db = sqlite3.connect(':memory:')

    # 加载数据
    for subset in ['employees', 'compensations']:
        dataset = datasets.load_dataset('hr-synthetic-database', name=subset)
        df = dataset.to_pandas()
        df.to_sql(subset, ctx.deps.db)

    return 'HR 数据集加载完成'

@hr_analytics_skill.script
async def run_query(ctx: RunContext[AnalystDeps], query: str) -> str:
    """执行 SQL 查询。"""
    cursor = ctx.deps.db.cursor()
    cursor.execute(query)
    rows = cursor.fetchall()
    return format_results(rows)
```

### 12.2 注册到 SkillsToolset

```python
from pydantic_ai_skills import SkillsToolset

skills_toolset = SkillsToolset(skills=[hr_analytics_skill])

agent = Agent(
    model='openai:gpt-4',
    instructions='你是一个 HR 数据分析师',
    toolsets=[skills_toolset],
)
```

### 12.3 使用流程

```
用户: "分析员工薪酬分布"
    ↓
Agent: 看到技能列表（名称 + 描述）
    ↓
Agent: 调用 load_skill("hr-analytics-skill")
    ↓
返回: 完整指令 + 资源列表 + 脚本列表
    ↓
Agent: 调用 run_skill_script("hr-analytics-skill", "load_dataset", {})
    ↓
返回: "HR 数据集加载完成"
    ↓
Agent: 调用 run_skill_script("hr-analytics-skill", "run_query", {"query": "SELECT ..."})
    ↓
返回: 格式化的查询结果
```

---

## 13. 性能优化建议

### 13.1 技能设计原则

| 原则 | 说明 | 示例 |
|------|------|------|
| **单一职责** | 每个技能专注一个领域 | `arxiv-search` 而不是 `research-tools` |
| **按需加载** | 使用资源而非在指令中包含所有内容 | 大型 API 文档作为资源而非嵌入 SKILL.md |
| **缓存友好** | 静态资源优于可调用资源 | API schema 作为静态文件 |
| **深度限制** | 使用 max_depth 限制扫描深度 | `max_depth=3` 默认值 |

### 13.2 Token 使用优化

```python
# ❌ 不推荐：所有内容在 SKILL.md 中
skill = Skill(
    name='api-client',
    content="""
    # API 客户端

    ## 端点列表
    - GET /users (500 行文档)
    - POST /users (300 行文档)
    - GET /orders (400 行文档)
    ... (更多内容)
    """,
)

# ✅ 推荐：分离资源
skill = Skill(
    name='api-client',
    content="""
    # API 客户端

    使用 read_skill_resource() 获取 API 文档。
    """,
    resources=[
        SkillResource(name='API_REFERENCE.md', uri='api-reference.md'),
        SkillResource(name='examples.json', uri='examples.json'),
    ],
)
```

### 13.3 脚本执行优化

```python
# 使用 CallableSkillScriptExecutor 进行自定义执行
async def cached_executor(script, args):
    # 实现缓存逻辑
    cache_key = f"{script.name}:{args}"
    if cached := cache.get(cache_key):
        return cached

    result = await execute_script(script, args)
    cache.set(cache_key, result)
    return result

executor = CallableSkillScriptExecutor(func=cached_executor)
directory = SkillsDirectory(path="./skills", script_executor=executor)
```

---

## 14. 参考

- **源代码：** `/Users/sodaabe/codes/coding/mimo/mimorepo/.sources/pydantic-ai-skills/`
- **Anthropic 规范：** [Agent Skills 文档](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- **Pydantic AI：** [pydantic-ai 文档](https://ai.pydantic.dev/)
- **相关文档：**
  - [类依赖关系分析](class-dependencies.md)
  - [项目开发指南](../../../.sources/pydantic-ai-skills/AGENTS.md)
