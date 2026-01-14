## Snapshot：变更可追踪与可回滚（track/patch/restore/revert）

### 这篇讲什么
解释 OpenCode 如何用一个独立的 git worktree 快照机制记录每个 step 的文件变化，并支持 restore/revert。

### 关键文件
- `.refer/.sources/opencode/packages/opencode/src/snapshot/index.ts`
- `.refer/.sources/opencode/packages/opencode/src/session/processor.ts`（在 step-start/finish-step 处调用）

### 核心思想
当项目启用 snapshot 且 VCS=git 时：
- `Snapshot.track()` 在 step 开始阶段写入当前树（git write-tree）
- `Snapshot.patch(hash)` 在 step 结束时比较 hash 与当前工作区，得到“本 step 改了哪些文件”
- `Snapshot.restore(hash)` 可将工作区恢复到某个树
- `Snapshot.revert(patches)` 可按 patch 列表逐文件 checkout 回滚

### 目录位置
快照 gitdir 在全局数据目录下，以 project.id 分隔：
- `Global.Path.data/snapshot/<project.id>`（实现细节见 snapshot 代码）

### 流程图
```mermaid
flowchart TD
  StepStart[step-start] --> Track[Snapshot.track]
  Track --> Hash[tree_hash]
  StepFinish[finish-step] --> Patch[Snapshot.patch(hash)]
  Patch --> Changed[changed_files_list]
  Changed --> UI[session_part_patch]

  Changed --> Revert[Snapshot.revert]
  Hash --> Restore[Snapshot.restore]
```

### 与“编码能力”的关系
- **可观测**：每个 step 最终会产生一个 patch part，UI 可以展示“改了哪些文件”。
- **可恢复**：当模型写错/用户想撤销时，可通过 restore/revert 快速回退。
- **与 patch 工具不同**：这里的 patch 是“变化摘要”，不是 `Tool: patch` 的补丁文本格式。
