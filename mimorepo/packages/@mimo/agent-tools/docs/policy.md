# 策略系统 (Policy)

## 概述

策略系统提供了一套灵活的工具访问控制机制。通过策略，你可以控制：

- 哪些工具可以被使用
- 工具只能在哪些域名下使用
- 运行时动态决策

## 核心组件

- **PolicyResolver**：策略解析器，根据配置决定是否允许工具执行
- **PolicyBuilder**：策略构建器，提供流畅的链式 API
- **POLICY_PROFILES**：预定义的策略配置

## PolicyBuilder

PolicyBuilder 提供了一个链式 API 来构建策略配置。

### 构造函数

```typescript
const builder = new PolicyBuilder();
```

### 链式方法

#### allow

允许一个工具。

```typescript
allow(toolName: string): this
```

```typescript
builder
  .allow('browser_navigate')
  .allow('browser_click')
  .allow('read_file');
```

#### deny

拒绝一个工具。

```typescript
deny(toolName: string): this
```

```typescript
builder
  .deny('file_delete')
  .deny('shell_execute');
```

#### allowTools

允许多个工具。

```typescript
allowTools(...toolNames: string[]): this
```

```typescript
builder.allowTools('browser_navigate', 'browser_click', 'browser_fill');
```

#### denyTools

拒绝多个工具。

```typescript
denyTools(...toolNames: string[]): this
```

```typescript
builder.denyTools('file_delete', 'file_write', 'shell_execute');
```

#### allowOnDomains

限制工具只能在指定域名下使用。

```typescript
allowOnDomains(toolName: string, ...domains: string[]): this
```

```typescript
builder.allowOnDomains('browser_navigate', 'github.com', '*.github.com');
```

#### setOverride

设置运行时覆盖函数。

```typescript
setOverride(
  fn: (tool: ToolDefinition, context: ToolExecutionContext) => boolean | Promise<boolean>
): this
```

```typescript
builder.setOverride(async (tool, context) => {
  // 动态决策：只在工作时间允许
  const hour = new Date().getHours();
  return hour >= 9 && hour <= 18;
});
```

### 构建方法

#### build

构建策略配置。

```typescript
build(): PolicyConfig
```

```typescript
const policy = builder.build();
```

#### clone

克隆当前构建器。

```typescript
clone(): PolicyBuilder
```

```typescript
const newBuilder = builder.clone();
```

#### clear

清除所有配置。

```typescript
clear(): this
```

```typescript
builder.clear();
```

### 合并方法

#### merge

合并另一个配置。

```typescript
merge(config: PolicyConfig): this
```

```typescript
builder.merge({
  tools: {
    'browser_*': 'allow'
  }
});
```

#### extend

扩展一个策略配置。

```typescript
extend(profile: PolicyConfig): this
```

```typescript
builder.extend(POLICY_PROFILES.BROWSER_ONLY);
```

### 静态方法

#### from

从现有配置创建构建器。

```typescript
static from(config: PolicyConfig): PolicyBuilder
```

```typescript
const builder = PolicyBuilder.from({
  tools: {
    'browser_*': 'allow'
  }
});
```

## 预定义策略 (POLICY_PROFILES)

### ALLOW_ALL

允许所有工具。

```typescript
import { POLICY_PROFILES } from '@mimo/agent-tools/policy';

const policy = POLICY_PROFILES.ALLOW_ALL;
```

### DENY_ALL

拒绝所有工具。

```typescript
const policy = POLICY_PROFILES.DENY_ALL;
```

### BROWSER_ONLY

只允许浏览器工具。

```typescript
const policy = POLICY_PROFILES.BROWSER_ONLY;
// 等价于: tools: { 'browser_*': 'allow', '*': 'deny' }
```

### BROWSER_AND_FILE_READ

允许浏览器工具和文件读取。

```typescript
const policy = POLICY_PROFILES.BROWSER_AND_FILE_READ;
// 等价于: tools: { 'browser_*': 'allow', 'read_file': 'allow', '*': 'deny' }
```

### BROWSER_GITHUB_ONLY

只允许浏览器工具访问 GitHub 域名。

```typescript
const policy = POLICY_PROFILES.BROWSER_GITHUB_ONLY;
// 工具限制: browser_*
// 域名限制: *.github.com, github.com
```

### SAFE_TOOLS_ONLY

只允许安全工具（无运行时执行）。

```typescript
const policy = POLICY_PROFILES.SAFE_TOOLS_ONLY;
// 允许: browser_*, read_file, web_search, web_fetch, memory_*
```

## PolicyResolver

PolicyResolver 负责解析策略并决定工具是否可执行。

### API

```typescript
class PolicyResolver {
  constructor(config?: PolicyConfig)

  // 解析策略，返回是否允许
  resolve(
    tool: ToolDefinition,
    context: ToolExecutionContext
  ): Promise<boolean>

  // 更新配置
  updateConfig(config: PolicyConfig): void
}
```

### 使用示例

```typescript
import { PolicyResolver } from '@mimo/agent-tools/policy';

const resolver = new PolicyResolver({
  tools: {
    'browser_*': 'allow',
    'read_file': 'allow',
    '*': 'deny'
  }
});

const allowed = await resolver.resolve(tool, context);
```

## 使用示例

### 基本策略构建

```typescript
import { PolicyBuilder } from '@mimo/agent-tools/policy';

const policy = new PolicyBuilder()
  .allowTools('browser_navigate', 'browser_click', 'browser_fill')
  .allow('read_file')
  .denyTools('file_delete', 'shell_execute')
  .build();
```

### 域名限制策略

```typescript
const policy = new PolicyBuilder()
  .allowTools('browser_navigate', 'browser_click')
  .allowOnDomains('browser_navigate', 'github.com', '*.github.com')
  .allowOnDomains('browser_click', '*.github.com')
  .build();
```

### 使用预定义策略并扩展

```typescript
import { PolicyBuilder, POLICY_PROFILES } from '@mimo/agent-tools/policy';

// 基于 BROWSER_ONLY 扩展
const policy = new PolicyBuilder()
  .extend(POLICY_PROFILES.BROWSER_ONLY)
  .allow('read_file')
  .allow('web_search')
  .build();
```

### 运行时动态策略

```typescript
const policy = new PolicyBuilder()
  .allowTools('browser_*', 'read_file')
  .setOverride(async (tool, context) => {
    // 检查用户权限
    const userRole = context.config?.userRole;

    if (tool.tags?.includes('dangerous')) {
      return userRole === 'admin';
    }

    return true;
  })
  .build();
```

### 克隆和变体

```typescript
// 基础策略
const basePolicy = new PolicyBuilder()
  .allowTools('browser_navigate', 'browser_click')
  .build();

// 创建变体
const adminPolicy = PolicyBuilder.from(basePolicy)
  .allow('file_delete')
  .allow('shell_execute')
  .build();

const guestPolicy = PolicyBuilder.from(basePolicy)
  .deny('browser_click')
  .build();
```

### 与注册表配合使用

```typescript
import { ToolRegistry } from '@mimo/agent-tools/registry';
import { PolicyBuilder } from '@mimo/agent-tools/policy';

const registry = new ToolRegistry();

// 注册工具
registry.registerBatch([
  { name: 'browser_navigate', description: '导航', execute: async () => {} },
  { name: 'file_read', description: '读取文件', execute: async () => {} },
  { name: 'file_delete', description: '删除文件', execute: async () => {} }
]);

// 应用策略
const policy = new PolicyBuilder()
  .allowTools('browser_*', 'file_read')
  .deny('*_delete')
  .build();

// 获取允许的工具
const allowedTools = registry.filterTools(policy.tools || {});
```

## 策略优先级

策略解析的优先级顺序：

1. **拒绝列表 (deny)**：最高优先级，如果匹配则拒绝
2. **允许列表 (allow)**：如果存在，只有匹配的工具才允许
3. **域名限制**：检查当前域名是否在允许列表中
4. **运行时覆盖**：最后执行自定义的判断逻辑

```typescript
const policy = {
  tools: {
    '*': 'deny',           // 默认拒绝所有
    'browser_*': 'allow',  // 但允许浏览器工具
    'browser_delete': 'deny' // 除了删除操作
  },
  domains: {
    'browser_navigate': ['github.com'] // 导航只允许 GitHub
  },
  override: async (tool, context) => {
    // 最后的动态检查
    return context.config?.allowed === true;
  }
};
```
