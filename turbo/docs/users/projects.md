# Projects

本页面定义 Turbo 仓库内各 app/package 的职责边界与引用约定，配合 `docs/system-design/code-structure.md` 使用。

## 代码引用约定

- 同层子路径使用相对路径（`./`）。
- 涉及上级目录使用 alias（`@/`）。
- Workspace 包直接使用包名（`mimo-protocol` / `mimo-bus` / `@repo/mimo-utils`）。

## Workspace 结构

- `apps/mimoim`: Web UI
- `apps/mimoserver`: HTTP + Socket 服务端
- `apps/mimocrx`: Chrome 扩展（Plasmo）
- `apps/docs`: 文档站
- `packages/mimo-protocol`: 协议单一事实来源
- `packages/mimo-bus`: Socket.IO bus
- `packages/mimo-utils`: 通用工具
