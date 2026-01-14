## OpenCode 文档索引

这组文档面向本仓库内 vendored 的 `opencode` 源码（位于 `.refer/.sources/opencode`），目标是把 **OpenCode 的“编码能力”（改代码/写文件/打补丁）核心实现原理**按模块拆解，便于快速定位与二次实现。

### 快速入口
- 总览与端到端链路：`00-overview.md`
- 会话与工具调度
  - `session/01-session-loop.md`
  - `session/02-tools-resolution.md`
- 编码工具（写入）
  - `tools/patch.md`
  - `tools/edit.md`
  - `tools/write.md`
- 安全与一致性
  - `safety/permission.md`
  - `safety/external-directory.md`
  - `safety/filetime.md`
- 质量闭环与可回滚
  - `quality/lsp.md`
  - `state/snapshot.md`
- 扩展能力
  - `ext/plugins-mcp.md`
- 附录
  - `appendix/patch-format.md`

### 术语表（简要）
- **Tool**：模型可调用的工具（read/grep/edit/write/patch…），本地执行并把结果回灌模型。
- **Permission**：工具执行前的授权闸门（允许/拒绝/询问），可基于 pattern 规则匹配。
- **Worktree/Directory**：项目根与当前工作目录（用于限制读写路径）。
- **Patch（本文语境）**：两类含义：
  - UI/会话层的“本次 step 修改了哪些文件”（snapshot patch）
  - `patch` 工具的“自定义补丁文本格式”（Begin/End Patch）
