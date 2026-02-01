# 工具注册表 (ToolRegistry)

## 概述

`ToolRegistry` 是工具的中央注册表，负责管理工具的注册、索引和查询。它实现了 `IToolRegistry` 接口，并提供了标签和分组的索引功能。

## 主要功能

- **工具注册**：注册单个或批量注册工具
- **标签索引**：通过标签快速查找工具
- **分组索引**：通过分组管理工具
- **策略过滤**：根据策略过滤可用的工具
- **工具查询**：按名称、标签、分组查询工具

## API 参考

### 构造函数

```typescript
const registry = new ToolRegistry();
```

### 注册方法

#### register

注册单个工具。

```typescript
register<T>(tool: ToolDefinition<T>): void
```

**参数：**
- `tool` - 工具定义对象

**异常：**
- 当工具名称已存在时抛出错误

```typescript
registry.register({
  name: 'my_tool',
  description: '我的工具',
  execute: async (params, context) => {
    return 'result';
  }
});
```

#### registerBatch

批量注册多个工具。

```typescript
registerBatch<T>(tools: ToolDefinition<T>[]): void
```

```typescript
registry.registerBatch([
  { name: 'tool1', description: '工具1', execute: async () => '1' },
  { name: 'tool2', description: '工具2', execute: async () => '2' },
  { name: 'tool3', description: '工具3', execute: async () => '3' }
]);
```

#### unregister

注销一个工具。

```typescript
unregister(name: string): void
```

```typescript
registry.unregister('my_tool');
```

### 查询方法

#### getTools

获取所有已注册的工具。

```typescript
getTools(): ToolDefinition[]
```

#### getTool

根据名称获取工具。

```typescript
getTool(name: string): ToolDefinition | null
```

```typescript
const tool = registry.getTool('my_tool');
if (tool) {
  console.log(tool.description);
}
```

#### findToolsByTag

根据标签查找工具。返回包含**所有指定标签**的工具。

```typescript
findToolsByTag(...tags: ToolTag[]): ToolDefinition[]
```

```typescript
// 查找所有带有 'browser' 标签的工具
const browserTools = registry.findToolsByTag('browser');

// 查找同时带有 'browser' 和 'file' 标签的工具
const browserFileTools = registry.findToolsByTag('browser', 'file');
```

#### getGroup

获取指定分组中的所有工具。

```typescript
getGroup(groupName: string): ToolDefinition[]
```

```typescript
const fileTools = registry.getGroup('file-operations');
```

#### getGroups

获取所有分组名称。

```typescript
getGroups(): string[]
```

```typescript
const groups = registry.getGroups();
// ['browser', 'file', 'code', 'search']
```

### 策略方法

#### filterTools

根据策略过滤工具。

```typescript
filterTools(policy: ToolPolicy): ToolDefinition[]
```

```typescript
const allowedTools = registry.filterTools({
  allow: ['browser_*', 'read_file'],
  deny: ['*delete*']
});
```

#### isToolAllowed

检查工具是否被策略允许。

```typescript
isToolAllowed(name: string, policy: ToolPolicy): boolean
```

```typescript
const allowed = registry.isToolAllowed('delete_file', {
  deny: ['*delete*']
});
// false
```

### 工具方法

#### size

获取已注册工具的数量。

```typescript
size(): number
```

```typescript
console.log(`已注册 ${registry.size()} 个工具`);
```

#### clear

清空所有已注册的工具。

```typescript
clear(): void
```

```typescript
registry.clear();
```

## 通配符匹配

策略中的工具名称支持通配符匹配：

```typescript
// 前缀匹配
'browser_*'  // 匹配 'browser_click', 'browser_navigate' 等

// 后缀匹配
'*_click'    // 匹配 'element_click', 'browser_click' 等

// 精确匹配
'read_file'  // 仅匹配 'read_file'
```

## 使用示例

### 基本注册

```typescript
import { ToolRegistry } from '@mimo/agent-tools/registry';

const registry = new ToolRegistry();

registry.register({
  name: 'greet',
  description: '向用户打招呼',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '用户名称' }
    },
    required: ['name']
  },
  tags: ['social'],
  group: 'communication',
  execute: async (params, context) => {
    return `你好，${params.name}！`;
  }
});
```

### 批量注册与分组

```typescript
registry.registerBatch([
  {
    name: 'file_read',
    description: '读取文件内容',
    tags: ['file'],
    group: 'file-ops',
    execute: async (params) => params.path
  },
  {
    name: 'file_write',
    description: '写入文件内容',
    tags: ['file', 'dangerous'],
    group: 'file-ops',
    execute: async (params) => 'done'
  },
  {
    name: 'file_delete',
    description: '删除文件',
    tags: ['file', 'dangerous'],
    group: 'file-ops',
    execute: async (params) => 'done'
  }
]);

// 获取文件操作组
const fileTools = registry.getGroup('file-ops');
```

### 标签查询

```typescript
// 获取所有浏览器工具
const browserTools = registry.findToolsByTag('browser');

// 获取所有安全工具（不带 dangerous 标签）
const allTools = registry.getTools();
const safeTools = allTools.filter(t => !t.tags?.includes('dangerous'));
```

### 策略过滤

```typescript
// 定义策略：只允许浏览器工具和文件读取
const policy = {
  allow: ['browser_*', 'file_read'],
  deny: ['*_delete', '*_write']
};

// 获取允许的工具
const allowedTools = registry.filterTools(policy);

// 检查特定工具是否允许
if (registry.isToolAllowed('file_delete', policy)) {
  console.log('file_delete 被允许');
}
```

## 索引说明

`ToolRegistry` 维护三个索引：

1. **工具索引**：按名称存储工具定义
2. **标签索引**：按标签映射到工具名称
3. **分组索引**：按分组映射到工具名称

这些索引使得查询操作非常高效，时间复杂度为 O(1) 或 O(n)，其中 n 是结果数量。
