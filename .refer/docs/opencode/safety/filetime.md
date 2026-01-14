## FileTime：先读后写、mtime 校验、并发写锁

### 这篇讲什么
解释 OpenCode 如何避免“基于旧上下文覆盖写脏文件”，以及如何在并发工具调用下串行化同一文件写入。

### 关键文件
- `.refer/.sources/opencode/packages/opencode/src/file/time.ts`
- `.refer/.sources/opencode/packages/opencode/src/tool/read.ts`
- `.refer/.sources/opencode/packages/opencode/src/tool/{edit,write,patch}.ts`

### 先读后写
- `ReadTool.execute` 在读取文本文件末尾会调用：`FileTime.read(sessionID, filepath)` 记录时间戳。
- `FileTime.assert(sessionID, filepath)` 会检查：
  - 是否读过（否则报错：必须先 read）
  - 文件 mtime 是否大于最后 read 时间（否则报错：文件已被外部修改，需要重新 read）

### 并发写锁
`FileTime.withLock(filepath, fn)` 用 per-file Promise 链实现串行化：
- 所有 overwrite existing file 的工具应在 lock 内执行 assert/read/write/update
- 避免两个并行工具同时写一个文件导致交错覆盖

### 典型写入工具用法
- `edit`：对已存在文件写入前调用 `FileTime.assert`；写完调用 `FileTime.read` 更新
- `write`：若文件已存在，写前 `FileTime.assert`
- `patch`：对 update/delete 路径先 `FileTime.assert`

### 流程图
```mermaid
flowchart TD
  Read[ReadTool] --> Mark[FileTime.read(sessionID,file)]
  Mark --> WriteTools[edit/write/patch]
  WriteTools --> Lock[FileTime.withLock(file)]
  Lock --> Assert[FileTime.assert]
  Assert --> FS[write/unlink]
  FS --> Mark2[FileTime.read(update_timestamp)]
```

### 与“编码能力”的关系
这是编码链路中最关键的“正确性护栏”之一：模型可能会基于旧内容生成 patch/edit/write，但 FileTime 会强制它先读最新文件再改，减少误覆盖与竞态。
