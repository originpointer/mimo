## LSP：写入后的诊断反馈闭环

### 这篇讲什么
解释 OpenCode 如何通过 LSP 在写入后即时获取诊断（错误/警告），并把结果写回 tool output，驱动模型继续修复。

### 关键文件
- `.refer/.sources/opencode/packages/opencode/src/lsp/index.ts`
- `.refer/.sources/opencode/packages/opencode/src/tool/edit.ts`
- `.refer/.sources/opencode/packages/opencode/src/tool/write.ts`

### LSP 的角色
LSP 在 OpenCode 的“编码能力”里承担 **质量反馈通道**：
- 模型调用工具写入文件
- 工具触发 LSP 更新
- 收集 diagnostics
- 将 diagnostics 作为字符串回灌给模型

### 触发方式
- `LSP.touchFile(filePath, waitForDiagnostics)`
  - `open` 文件到 LSP client
  - 若 `waitForDiagnostics=true`，等待该文件诊断就绪

### 收集方式
- `LSP.diagnostics()` 汇总所有 client 当前的诊断结果
- 工具层会：
  - 优先输出“当前文件”的错误
  - 并限制最多展示若干文件/若干条目（防止输出爆炸）

### 流程图
```mermaid
flowchart TD
  ToolWrite[edit/write] --> Touch[LSP.touchFile(wait)]
  Touch --> Diag[LSP.diagnostics]
  Diag --> Filter[limit_and_format]
  Filter --> ToolOutput[tool_output_with_diagnostics]
```

### 与“编码能力”的关系
没有 LSP 时，模型只能依赖静态推理；有了 LSP 后，OpenCode 形成了“写入→诊断→修复”的反馈闭环，显著提高自动修复成功率。
