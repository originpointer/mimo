# @repo/sens

Rolldown 插件工具库，提供插件开发的基础工具和类型定义。

## 特性

- 🔧 **插件验证** - 验证插件是否符合规范
- 🔗 **插件组合** - 组合多个插件并处理错误
- 📦 **选项合并** - 深度合并插件选项
- 🏭 **工厂函数** - 创建插件工厂函数
- 📝 **TypeScript 支持** - 完整的类型定义
- 🧪 **测试支持** - 支持 Node.js 和 Browser 两种测试模式

## 安装

```bash
pnpm add -D @repo/sens
```

## 使用

### 插件验证

```typescript
import { validatePlugin } from '@repo/sens';

const plugin = { name: 'my-plugin' };
const result = validatePlugin(plugin);

if (result.valid) {
  console.log('Plugin is valid');
} else {
  console.error('Validation errors:', result.errors);
}
```

### 插件组合

```typescript
import { composePlugins } from '@repo/sens';

const plugins = [
  { name: 'plugin-1' },
  { name: 'plugin-2' },
];

// 组合插件，遇到错误时抛出异常
const composed = composePlugins(plugins);

// 组合插件，遇到错误时继续处理
const composedSafe = composePlugins(plugins, {
  continueOnError: true,
});
```

### 选项合并

```typescript
import { mergePluginOptions } from '@repo/sens';

const defaultOptions = {
  name: 'my-plugin',
  config: { enabled: true, timeout: 1000 },
};

const userOptions = {
  config: { timeout: 2000 },
};

const merged = mergePluginOptions(defaultOptions, userOptions);
// { name: 'my-plugin', config: { enabled: true, timeout: 2000 } }
```

### 创建插件工厂

```typescript
import { createPluginFactory } from '@repo/sens';

interface MyPluginOptions {
  name: string;
  version?: string;
}

const createMyPlugin = createPluginFactory<MyPluginOptions>(
  'my-plugin',
  (options = {}) => ({
    name: 'my-plugin',
    version: '1.0.0',
    ...options,
  }),
);

const plugin = createMyPlugin({ version: '2.0.0' });
```

### 提取插件元数据

```typescript
import { extractPluginMetadata } from '@repo/sens';

const plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
};

const metadata = extractPluginMetadata(plugin);
// { name: 'my-plugin', version: '1.0.0', description: 'My awesome plugin' }
```

### Stagehand 风格 XPath 工具（CDP 场景）

当你在 Node.js 中通过 CDP 获取 DOM 树（或类似结构）时，可以使用 `@repo/sens/utils` 提供的工具函数，按 Stagehand v3 的规则构建稳定的 XPath step 并在遍历时累积成绝对 XPath。

算法说明文档：`docs/StagehandXPath-算法说明.md`

```typescript
import { buildChildXPathSegments, joinXPath } from '@repo/sens/utils'

type CdpNode = { nodeType: number; nodeName: string; children?: CdpNode[] }

function buildXpathMapFromTree(root: CdpNode) {
  const map = new Map<CdpNode, string>()

  const walk = (node: CdpNode, xp: string) => {
    map.set(node, xp || "/")

    const kids = node.children ?? []
    if (!kids.length) return

    const segs = buildChildXPathSegments(kids)
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i]!
      const step = segs[i]!
      walk(child, joinXPath(xp || "/", step))
    }
  }

  walk(root, "/")
  return map
}
```

更多说明见：`mimorepo/packages/sens/docs/StagehandXPath-使用指南.md`

## API 文档

### `validatePlugin(plugin: unknown): PluginValidationResult`

验证插件是否符合基本规范。

**参数:**
- `plugin` - 要验证的插件对象

**返回:**
- `valid: boolean` - 插件是否有效
- `errors: string[]` - 错误信息数组

### `composePlugins<T>(plugins: T[], options?: PluginCompositionOptions): T[]`

组合多个插件，可以配置错误处理策略。

**参数:**
- `plugins` - 插件数组
- `options.continueOnError` - 遇到错误时是否继续处理其他插件（默认: `false`）

**返回:**
- 验证后的插件数组

### `mergePluginOptions<T>(defaultOptions: Partial<T>, userOptions: Partial<T>): T`

深度合并插件选项。

**参数:**
- `defaultOptions` - 默认选项
- `userOptions` - 用户选项

**返回:**
- 合并后的选项

### `createPluginFactory<T>(name: string, factory: (options?: Partial<T>) => T)`

创建插件工厂函数。

**参数:**
- `name` - 插件名称
- `factory` - 插件工厂函数

**返回:**
- 插件工厂函数

### `extractPluginMetadata(plugin: Record<string, unknown>): PluginMetadata`

从插件中提取元数据。

**参数:**
- `plugin` - 插件对象

**返回:**
- 插件元数据对象

## 开发

### 构建

```bash
pnpm build
```

### 测试

```bash
# 运行 Node.js 测试
pnpm test

# 运行浏览器测试
pnpm test:browser

# 运行所有测试
pnpm test:all

# 监听模式（Node.js）
pnpm test:watch

# 监听模式（Browser）
pnpm test:watch:browser
```

### 类型检查

```bash
pnpm check-types
```

### Lint

```bash
pnpm lint
```

## 技术栈

- **构建工具**: Rolldown
- **测试框架**: Vitest (Node.js + Browser Mode)
- **类型系统**: TypeScript
- **包管理**: pnpm

## 许可证

MIT
