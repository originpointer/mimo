# `.sources/` 第三方源码（不入 git）的恢复方案

本仓库使用 **`.sources/`** 存放第三方开源项目源码，用作 AI 编码参考。**`.sources/` 本身不纳入 git 管理**（不提交第三方源码）。

为保证更换主机后可以恢复代码环境，本仓库在 `sources/` 下维护：

- `manifest.yml`：第三方仓库清单（会提交到 git）
- `sources-sync.ts`：一键同步脚本（会提交到 git）

## 快速开始

在仓库根目录执行：

```bash
pnpm install
pnpm sources:sync
```

这会按 `sources/manifest.yml` 把第三方仓库 clone/pull 到 `.sources/<name>`。

## 清单格式（`sources/manifest.yml`）

- **`rootDir`**：落盘目录（相对仓库根），默认 `.sources`
- **`sources`**：数组，每项：
  - **`name`**：目录名（会生成在 `${rootDir}/${name}`）
  - **`repo`**：git 仓库 URL（https/ssh 都可）
  - **`ref`（可选）**：分支 / tag / commit
  - **`shallow`（可选）**：是否 shallow clone（默认 `true`）
  - **`notes`（可选）**：备注

## 命令与参数（`pnpm sources:sync`）

> 透传参数时需要 `--` 分隔：`pnpm sources:sync -- --help`

```bash
pnpm sources:sync -- --help
pnpm sources:sync -- --only repoA,repoB
pnpm sources:sync -- --concurrency 8
pnpm sources:sync -- --force
pnpm sources:sync -- --root .sources
pnpm sources:sync -- --manifest sources/manifest.yml
```

参数说明：

- **`--manifest <path>`**：指定清单路径（默认 `sources/manifest.yml`）
- **`--root <dir>`**：覆盖落盘根目录（默认使用清单 `rootDir`，否则 `.sources`）
- **`--only a,b,c`**：只同步部分条目
- **`--concurrency N`**：并行度（默认 4）
- **`--force`**：遇到脏目录时执行 `git reset --hard && git clean -fd`（会丢本地改动，谨慎）

## 常见注意事项

- **脏目录保护**：默认遇到 `.sources/<name>` 有本地未提交改动会跳过，并提示你用 `--force`。
- **锁定版本（可选）**：如果你将来需要可复现版本，只要在清单里给某条目填 `ref: <commit_sha>` 即可。

