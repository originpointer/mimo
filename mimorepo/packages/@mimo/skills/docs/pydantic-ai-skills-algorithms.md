# Pydantic AI Skills - Core Algorithms and Architecture

## Overview

**pydantic-ai-skills** (v0.4.0) is a lightweight framework implementing [Anthropic's Agent Skills specification](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) for Pydantic AI. The framework enables **progressive disclosure** of agent capabilities through modular skill discovery and loading, reducing token usage by loading detailed instructions on-demand.

## Core Architecture: 3-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                         │
│                   (toolset.py: ~900 lines)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         SkillsToolset extends FunctionToolset        │   │
│  │  • list_skills()    • load_skill()                   │   │
│  │  • read_skill_resource()  • run_skill_script()       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Type Layer                              │
│                    (types.py: ~650 lines)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Skill      │  SkillResource  │  SkillScript         │   │
│  │  SkillWrapper (for decorator-based creation)         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Discovery Layer                           │
│                  (directory.py: ~480 lines)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SkillsDirectory • _discover_skills()                │   │
│  │  • _find_skill_files()  • _parse_skill_md()          │   │
│  │  • _validate_skill_metadata()  • _discover_resources()│  │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Execution Layer                              │
│                    (local.py: ~340 lines)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LocalSkillScriptExecutor  │  CallableSkillScriptExecutor │
│  │  FileBasedSkillResource    │  FileBasedSkillScript  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Type System (`types.py`)

### 1.1 Skill Naming Pattern Algorithm

```python
# Line 27: Regular expression for skill name validation
SKILL_NAME_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')

# Line 33-69: normalize_skill_name function
def normalize_skill_name(func_name: str) -> str:
    """
    Algorithm:
    1. Replace underscores with hyphens: data_analyzer → data-analyzer
    2. Convert to lowercase
    3. Validate against SKILL_NAME_PATTERN
    4. Check length ≤ 64 characters
    """
    normalized = func_name.replace('_', '-').lower()
    if not SKILL_NAME_PATTERN.match(normalized):
        raise SkillValidationError(...)
    if len(normalized) > 64:
        raise SkillValidationError(...)
    return normalized
```

**Naming Rules (per Anthropic spec):**
- Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase, numbers, hyphens)
- Max 64 characters
- No reserved words: `anthropic`, `claude`
- No consecutive hyphens

### 1.2 SkillResource Dataclass

```python
@dataclass
class SkillResource:
    """Represents a skill resource (file or callable)."""

    name: str
    description: str | None = None
    content: str | None = None          # Static content
    function: Callable | None = None    # Dynamic content
    takes_ctx: bool = False
    function_schema: FunctionSchema | None = None
    uri: str | None = None              # File path

    async def load(self, ctx: Any, args: dict | None = None) -> Any:
        """Load resource content."""
        if self.function and self.function_schema:
            # Callable resource: invoke with args
            return await self.function_schema.call(args or {}, ctx)
        elif self.content:
            # Static resource: return content directly
            return self.content
```

### 1.3 SkillScript Dataclass

```python
@dataclass
class SkillScript:
    """Represents an executable script (function or file-based)."""

    name: str
    description: str | None = None
    function: Callable | None = None     # For programmatic scripts
    takes_ctx: bool = False
    function_schema: FunctionSchema | None = None
    uri: str | None = None               # For file-based scripts
    skill_name: str | None = None

    async def run(self, ctx: Any, args: dict | None = None) -> Any:
        """Execute the script."""
        if self.function and self.function_schema:
            return await self.function_schema.call(args or {}, ctx)
```

### 1.4 Skill Decorator Pattern

```python
@dataclass
class Skill:
    """Core skill dataclass."""

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
        """Decorator to register callable resources.

        Algorithm:
        1. Extract name from function or use provided name
        2. Generate function schema using Pydantic AI's function_schema()
        3. Create SkillResource with function and schema
        4. Append to self.resources
        """
        # Line 286-311
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
        """Decorator to register executable scripts.

        Similar algorithm to resource(), but creates SkillScript."""
        # Line 355-381
```

---

## 2. Discovery Layer (`directory.py`)

### 2.1 Skill Discovery Algorithm

```python
# Line 268-352: _discover_skills function
def _discover_skills(path, validate=True, max_depth=3, script_executor=None):
    """
    Algorithm for discovering skills from filesystem:

    1. Resolve and validate directory path
    2. Find all SKILL.md files (depth-limited)
    3. For each SKILL.md:
       a. Read file content
       b. Parse YAML frontmatter
       c. Extract metadata (name, description, license, etc.)
       d. Validate metadata if enabled
       e. Discover associated resources
       f. Discover associated scripts
       g. Create Skill object
    4. Return list of Skill objects
    """
```

### 2.2 YAML Frontmatter Parsing Algorithm

```python
# Line 108-136: _parse_skill_md function
def _parse_skill_md(content: str) -> tuple[dict, str]:
    """
    Parse SKILL.md file with YAML frontmatter.

    Algorithm:
    1. Match pattern: ^---\\s*\\n(.*?)^---\\s*\\n (DOTALL|MULTILINE)
    2. Extract YAML content between --- delimiters
    3. Parse YAML using yaml.safe_load()
    4. Return (frontmatter_dict, instructions_markdown)

    Input example:
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

### 2.3 Skill Metadata Validation Algorithm

```python
# Line 38-105: _validate_skill_metadata function
def _validate_skill_metadata(frontmatter: dict, instructions: str) -> bool:
    """
    Validate skill against Anthropic's requirements.

    Checks (warnings, not errors):
    1. Name format: matches SKILL_NAME_PATTERN
    2. Name length: ≤ 64 characters
    3. Reserved words: not containing 'anthropic' or 'claude'
    4. Description length: ≤ 1024 characters
    5. Compatibility length: ≤ 500 characters
    6. Instructions length: ≤ 500 lines

    Returns: True if valid, False if warnings emitted
    """
```

### 2.4 Resource Discovery Algorithm

```python
# Line 139-181: _discover_resources function
def _discover_resources(skill_folder: Path) -> list[SkillResource]:
    """
    Discover resource files in skill directory.

    Algorithm:
    1. Supported extensions: .md, .json, .yaml, .yml, .csv, .xml, .txt
    2. Use rglob() for recursive search
    3. Exclude SKILL.md
    4. Security check: resolve symlinks and verify path stays within skill_folder
    5. Create FileBasedSkillResource for each valid file
    """
    resources = []
    supported_extensions = ['.md', '.json', '.yaml', '.yml', '.csv', '.xml', '.txt']
    skill_folder_resolved = skill_folder.resolve()

    for extension in supported_extensions:
        for resource_file in skill_folder.rglob(f'*{extension}'):
            if resource_file.name.upper() != 'SKILL.MD':
                # Security: check for symlink escape
                resolved_path = resource_file.resolve()
                try:
                    resolved_path.relative_to(skill_folder_resolved)
                except ValueError:
                    # Symlink escape detected - skip
                    continue

                rel_path = resource_file.relative_to(skill_folder)
                resources.append(create_file_based_resource(
                    name=str(rel_path),
                    uri=str(resolved_path),
                ))

    return resources
```

### 2.5 Depth-Limited File Search Algorithm

```python
# Line 184-207: _find_skill_files function
def _find_skill_files(root_dir: Path, max_depth: int | None) -> list[Path]:
    """
    Find SKILL.md files with depth-limited search.

    Algorithm (when max_depth is specified):
    1. For each depth from 0 to max_depth:
       - depth=0: pattern = "SKILL.md"
       - depth=1: pattern = "*/SKILL.md"
       - depth=2: pattern = "*/*/SKILL.md"
       - depth=3: pattern = "*/*/*/SKILL.md"
    2. Use glob() with each pattern
    3. Collect all results

    When max_depth=None: use root_dir.glob('**/SKILL.md')
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

## 3. Integration Layer (`toolset.py`)

### 3.1 SkillsToolset Initialization Algorithm

```python
# Line 140-239: __init__ method
class SkillsToolset(FunctionToolset):
    def __init__(self, *, skills=None, directories=None, validate=True,
                 max_depth=3, id=None, instruction_template=None,
                 exclude_tools=None):
        """
        Initialization algorithm:

        1. Set up instruction template (custom or default)
        2. Validate exclude_tools set
        3. Initialize _skills dict and _skill_directories list
        4. Load programmatic skills (if provided)
        5. Load directory-based skills (if provided)
           - Convert str/Path to SkillsDirectory instances
           - Discover skills from each directory
           - Handle duplicates (last one wins)
        6. Fall back to ./skills directory if no skills/directories
        7. Register four tools (unless excluded)

        Default behavior: Uses ./skills directory if nothing specified
        """
```

### 3.2 Tool Registration Algorithm

```python
# Line 371-384: _register_tools method
def _register_tools(self):
    """
    Register skill management tools as Pydantic AI tools.

    Four tools registered via @self.tool decorator:
    1. list_skills() - Overview of all skills
    2. load_skill(skill_name) - Load full instructions
    3. read_skill_resource(skill_name, resource_name, args) - Read resources
    4. run_skill_script(skill_name, script_name, args) - Execute scripts

    Each tool function MUST accept ctx: RunContext[Any] as first parameter
    (Pydantic AI protocol requirement).
    """
```

### 3.3 load_skill Tool Algorithm

```python
# Line 403-460: _register_load_skill method
@self.tool
async def load_skill(ctx: RunContext[Any], skill_name: str) -> str:
    """
    Load complete instructions for a skill.

    Algorithm:
    1. Look up skill by name in self._skills
    2. If not found, raise SkillNotFoundError with available names
    3. Build XML-formatted resources list:
       - For callable resources: include JSON schema parameters
    4. Build XML-formatted scripts list:
       - For callable scripts: include JSON schema parameters
    5. Format response using LOAD_SKILL_TEMPLATE:
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

### 3.4 get_instructions Algorithm (Progressive Disclosure)

```python
# Line 574-603: get_instructions method
async def get_instructions(self, ctx: RunContext[Any]) -> str | None:
    """
    Generate system prompt for progressive disclosure.

    Algorithm:
    1. If no skills loaded, return None
    2. Build skills list in XML format:
       <available_skills>
       <skill><name>skill-name</name><description>...</description></skill>
       ...
       </available_skills>
    3. Use custom template if provided, else use default:
       _INSTRUCTION_SKILLS_HEADER
    4. Inject skills list into template

    This is called via @agent.instructions decorator to inject
    skills overview into agent's system prompt.
    """
```

### 3.5 Programmatic Skill Decorator Algorithm

```python
# Line 605-712: skill decorator method
def skill(self, func=None, *, name=None, description=None, ...):
    """
    Decorator to define skills using functions.

    Algorithm:
    1. If name provided, validate it directly
    2. If no name, normalize from function name:
       - my_skill → my-skill
    3. Extract description from function docstring if not provided
    4. Create SkillWrapper with:
       - function (returns content)
       - normalized name
       - description
       - other metadata
    5. Register skill immediately (call wrapper.to_skill())
    6. Return wrapper for attaching resources/scripts

    Usage:
        @skills.skill()
        def my_skill() -> str:
            '''Skill description.'''
            return 'Skill instructions...'

        @my_skill.resource
        async def get_resource(ctx: RunContext[Deps]) -> str:
            return await ctx.deps.get_data()
    """
```

---

## 4. Execution Layer (`local.py`)

### 4.1 LocalSkillScriptExecutor Algorithm

```python
# Line 85-178: LocalSkillScriptExecutor class
class LocalSkillScriptExecutor:
    """Execute Python scripts as subprocesses."""

    async def run(self, script: SkillScript, args: dict | None = None) -> Any:
        """
        Execute script via subprocess with timeout.

        Algorithm:
        1. Build command:
           - [python_executable, script_path]
           - Append arguments as --key value pairs
        2. Convert args dict to CLI flags:
           - Boolean True: --flag only
           - Boolean False/None: omit flag
           - List: repeat flag for each item
           - Other: --key value
        3. Execute with anyio.run_process (async-compatible)
        4. Apply timeout with anyio.move_on_after()
        5. Combine stdout and stderr in output
        6. Return output or raise SkillScriptExecutionError

        Example:
           args = {"query": "test", "limit": 10, "verbose": True}
           → python script.py --query test --limit 10 --verbose
        """
```

### 4.2 FileBasedSkillResource Load Algorithm

```python
# Line 34-82: FileBasedSkillResource class
@dataclass
class FileBasedSkillResource(SkillResource):
    """File-based resource that loads from disk."""

    async def load(self, ctx: Any, args: dict | None = None) -> Any:
        """
        Load resource content from file.

        Algorithm:
        1. Validate uri is present
        2. Read file as UTF-8 text
        3. Parse based on file extension:
           - .json: json.loads() → return dict (or text if fails)
           - .yaml/.yml: yaml.safe_load() → return dict (or text if fails)
           - Other: return text as-is
        4. Raise SkillResourceLoadError on read failure
        """
```

### 4.3 FileBasedSkillScript Run Algorithm

```python
# Line 256-289: FileBasedSkillScript class
@dataclass
class FileBasedSkillScript(SkillScript):
    """File-based script that executes via subprocess."""

    executor: LocalSkillScriptExecutor | CallableSkillScriptExecutor

    async def run(self, ctx: Any, args: dict | None = None) -> Any:
        """
        Execute script file via executor.

        Algorithm:
        1. Validate uri is present
        2. Delegate to self.executor.run(script=self, args=args)
        3. Return output from executor
        """
```

---

## 5. Progressive Disclosure Flow

The core innovation of the framework is **progressive disclosure** - loading information only when needed to minimize token usage.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Agent Startup                                             │
│    - get_instructions() injects skills overview             │
│    - Only names + descriptions in system prompt            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Agent receives task                                       │
│    - Sees available skills in context                       │
│    - Decides which skill to use                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Agent calls load_skill(name)                             │
│    - Receives full SKILL.md content                         │
│    - Gets list of resources and scripts with schemas        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Agent calls read_skill_resource() as needed             │
│    - Loads supplementary documentation                      │
│    - Invokes callable resources with parameters             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Agent calls run_skill_script() when needed              │
│    - Executes Python scripts (file or callable)             │
│    - Gets results back as strings                           │
└─────────────────────────────────────────────────────────────┘
```

### Example: Token Usage Comparison

**Without progressive disclosure:**
```
System prompt: 10,000 tokens (all skills fully loaded)
Context per request: 10,000 tokens (always present)
```

**With progressive disclosure:**
```
System prompt: 500 tokens (skill names + descriptions only)
On-demand load: +2,000 tokens (only when skill needed)
Average context: 500-2,500 tokens (load only what's needed)
```

---

## 6. Security Measures

### 6.1 Path Traversal Prevention

```python
# directory.py Line 161-170
def _discover_resources(skill_folder: Path) -> list[SkillResource]:
    """Security: Validate resolved paths stay within skill_folder."""
    skill_folder_resolved = skill_folder.resolve()

    for resource_file in skill_folder.rglob(f'*{extension}'):
        resolved_path = resource_file.resolve()
        try:
            # This raises ValueError if path is outside skill_folder
            resolved_path.relative_to(skill_folder_resolved)
        except ValueError:
            # Symlink escape detected - skip this file
            warnings.warn("Symlink escape detected. Skipping.")
            continue
```

### 6.2 Script Timeout

```python
# local.py Line 154-165
async def run(self, script, args):
    """Execute with timeout to prevent hanging scripts."""
    result = None
    with anyio.move_on_after(self.timeout) as scope:
        result = await anyio.run_process(cmd, check=False, cwd=cwd, ...)

    if scope.cancelled_caught or result is None:
        raise SkillScriptExecutionError(
            f"Script '{script.name}' timed out after {self.timeout} seconds"
        )
```

### 6.3 Safe YAML Parsing

```python
# directory.py Line 132-133
frontmatter = yaml.safe_load(frontmatter_yaml)
```
Uses `yaml.safe_load()` instead of `yaml.load()` to prevent arbitrary code execution.

---

## 7. Exception Hierarchy (`exceptions.py`)

```
SkillException (base)
├── SkillNotFoundError          # Skill not found in any source
├── SkillValidationError        # Skill validation failed
├── SkillResourceNotFoundError  # Resource file not found
├── SkillResourceLoadError      # Failed to load resource
└── SkillScriptExecutionError   # Script execution failed
```

All exceptions inherit from `SkillException`, allowing broad error handling:

```python
try:
    result = await agent.run("Use the hr-analytics-skill to analyze data")
except SkillException as e:
    print(f"Skill-related error: {e}")
```

---

## 8. Dual Skill Modes

### 8.1 Filesystem Skills

```markdown
my-skill/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── scripts/          # Optional: Python scripts
│   └── process.py
└── resources/        # Optional: Additional files
    └── data.json
```

**Discovery:** Automatic via `SkillsDirectory`
**Execution:** Subprocess via `LocalSkillScriptExecutor`

### 8.2 Programmatic Skills

```python
skill = Skill(
    name='my-skill',
    description='My skill',
    content='Instructions...',
)

@skill.resource
async def get_data(ctx: RunContext[Deps]) -> str:
    return await ctx.deps.fetch_data()

@skill.script
async def process(ctx: RunContext[Deps], input: str) -> str:
    return await ctx.deps.process(input)
```

**Discovery:** Manual registration via `SkillsToolset(skills=[skill])`
**Execution:** Direct function call via `function_schema.call()`

---

## 9. Key Data Structures

### Skill Object Structure

```
Skill
├── name: str                    # Unique identifier (e.g., "arxiv-search")
├── description: str             # Brief description (≤1024 chars)
├── content: str                 # Full instructions (SKILL.md body)
├── license: str | None          # Optional license info
├── compatibility: str | None    # Optional environment requirements
├── uri: str | None              # File path (for filesystem skills)
├── metadata: dict | None        # Additional fields
├── resources: list[SkillResource]
│   ├── name: str                # Resource identifier
│   ├── description: str | None
│   ├── content: str | None      # Static content
│   ├── function: Callable | None  # Dynamic content
│   ├── function_schema: FunctionSchema | None
│   └── uri: str | None          # File path for file-based
└── scripts: list[SkillScript]
    ├── name: str                # Script identifier
    ├── description: str | None
    ├── function: Callable | None  # For programmatic
    ├── function_schema: FunctionSchema | None
    ├── uri: str | None          # File path for file-based
    ├── skill_name: str | None
    └── executor: Executor | None  # For file-based scripts
```

---

## 10. Summary of Core Algorithms

| Algorithm | Location | Purpose |
|-----------|----------|---------|
| `normalize_skill_name()` | types.py:33 | Convert function names to valid skill names |
| `_parse_skill_md()` | directory.py:108 | Extract YAML frontmatter from SKILL.md |
| `_validate_skill_metadata()` | directory.py:38 | Validate skill against Anthropic spec |
| `_discover_skills()` | directory.py:268 | Scan directory for SKILL.md files |
| `_find_skill_files()` | directory.py:184 | Depth-limited recursive file search |
| `_discover_resources()` | directory.py:139 | Find resource files with symlink validation |
| `_discover_scripts()` | directory.py:210 | Find Python scripts in skill directory |
| `get_instructions()` | toolset.py:574 | Generate progressive disclosure prompt |
| `load_skill()` | toolset.py:403 | Load full skill with resources/scripts |
| `read_skill_resource()` | toolset.py:462 | Load resource content (static or callable) |
| `run_skill_script()` | toolset.py:517 | Execute script (subprocess or callable) |
| `FileBasedSkillResource.load()` | local.py:42 | Load file with JSON/YAML parsing |
| `LocalSkillScriptExecutor.run()` | local.py:113 | Execute script with timeout |

---

## References

- **Source Code:** `/Users/sodaabe/codes/coding/mimo/mimorepo/.sources/pydantic-ai-skills/`
- **Anthropic Spec:** [Agent Skills Documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- **Pydantic AI:** [pydantic-ai Documentation](https://ai.pydantic.dev/)
