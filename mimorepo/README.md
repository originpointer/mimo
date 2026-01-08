# Mimo Repo

基于 Turborepo 的 Monorepo 项目，包含后端服务器、Web 应用和浏览器扩展。

## 项目结构

### Apps

- `nitro-app`: [Nitro](https://nitro.build/) 后端调度服务器（端口 6006）
- `next-app`: [Next.js](https://nextjs.org/) + [shadcn/ui](https://ui.shadcn.com/) 用户交互页面（端口 3000）
- `plasmo-app`: [Plasmo](https://www.plasmo.com/) 浏览器扩展

### Packages

- `@repo/ui`: React 组件库，供 `next-app` 使用
- `@repo/eslint-config`: ESLint 配置（包含 `eslint-config-next` 和 `eslint-config-prettier`）
- `@repo/typescript-config`: TypeScript 配置，在整个 monorepo 中使用

所有包和应用均使用 100% [TypeScript](https://www.typescriptlang.org/)。

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发

启动所有应用：

```bash
pnpm dev
```

启动特定应用：

```bash
# 启动 Nitro 后端服务器（端口 6006）
pnpm --filter nitro-app dev

# 启动 Next.js Web 应用（端口 3000）
pnpm --filter next-app dev

# 启动 Plasmo 浏览器扩展
pnpm --filter plasmo-app dev
```

### 构建

构建所有应用和包：

```bash
pnpm build
```

构建特定应用：

```bash
pnpm --filter nitro-app build
pnpm --filter next-app build
pnpm --filter plasmo-app build
```

### 其他命令

```bash
# 代码检查
pnpm lint

# 类型检查
pnpm check-types

# 代码格式化
pnpm format
```

## 工具

本项目已配置以下工具：

- [TypeScript](https://www.typescriptlang.org/) - 静态类型检查
- [ESLint](https://eslint.org/) - 代码检查
- [Prettier](https://prettier.io) - 代码格式化
- [Turborepo](https://turborepo.com/) - Monorepo 构建系统

## 远程缓存

Turborepo 支持[远程缓存](https://turborepo.com/docs/core-concepts/remote-caching)，可以在团队成员和 CI/CD 流水线之间共享构建缓存。

默认情况下，Turborepo 会在本地缓存。要启用远程缓存，需要 Vercel 账户：

```bash
# 登录 Vercel
turbo login

# 链接远程缓存
turbo link
```

## 有用链接

了解更多关于 Turborepo 的信息：

- [任务](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [缓存](https://turborepo.com/docs/crafting-your-repository/caching)
- [远程缓存](https://turborepo.com/docs/core-concepts/remote-caching)
- [过滤](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [配置选项](https://turborepo.com/docs/reference/configuration)
- [CLI 使用](https://turborepo.com/docs/reference/command-line-reference)
