## External Directory：工作区外读写的越界保护

### 这篇讲什么
解释 `assertExternalDirectory` 如何在目标路径不属于项目 worktree 时触发额外权限，防止模型随意读写系统路径。

### 关键文件
- `.refer/.sources/opencode/packages/opencode/src/tool/external-directory.ts`
- `.refer/.sources/opencode/packages/opencode/src/project/instance.ts`（containsPath/worktree/directory）

### 核心逻辑
`assertExternalDirectory(ctx, target, options)`：
- 若 target 在工作区内（`Instance.containsPath(target)`）→ 放行
- 否则，计算 parentDir，并申请 `permission:"external_directory"`，pattern 形如：`<parentDir>/*`

这使权限请求的粒度是“某个目录下的所有条目”，而不是单个绝对路径，便于用户一次授权一组文件。

### 流程图
```mermaid
flowchart TD
  Target[target_path] --> InWorktree{Instance.containsPath?}
  InWorktree -->|yes| Allow[allow]
  InWorktree -->|no| Ask[ctx.ask(external_directory,parentDir/*)]
  Ask --> Allow
```

### 与 read/edit/write/patch 的关系
- `read`：默认也会调用它（可通过 `bypassCwdCheck` 旁路，用于内部读取）
- `write/edit/patch`：写入前同样会检查，避免补丁写到 `/etc/...` 这类路径（测试里也有对应用例）。

### 注意点
- 这是“工作区外访问”的第二道闸门；第一道通常是工具本身申请的 permission（read/edit）。
- 若用户确实需要修改外部目录，必须显式授权对应 parentDir。
