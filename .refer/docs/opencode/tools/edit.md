## Tool: edit —— 基于 oldString/newString 的可恢复文本替换

### 这篇讲什么
解释 `edit` 工具如何在“尽量不写错块”的前提下完成文本替换，并在写入后用 LSP 诊断把错误回灌给模型。

### 关键文件
- `.refer/.sources/opencode/packages/opencode/src/tool/edit.ts`
- `.refer/.sources/opencode/packages/opencode/src/lsp/index.ts`
- `.refer/.sources/opencode/packages/opencode/src/file/time.ts`

### edit 的定位
`edit` 是“精确替换”工具：输入 `filePath + oldString + newString`。
- 若 `oldString==""`：语义接近“新建/覆盖整个文件内容”。
- 否则：只替换一个匹配（默认），或 `replaceAll` 替换全部。

### 核心难点：oldString 找不到/匹配太多
`edit` 引入多种 replacer 策略来提升匹配鲁棒性：
- 精确匹配
- 行首尾 trim 匹配
- “首尾锚点 + 中间相似度”的块匹配（Levenshtein）
- 空白归一化、缩进弹性、转义还原、边界 trim、上下文块等

策略目标：
- 尽量找到“唯一正确”的替换块
- 若存在多个候选且不唯一：强制报错，要求提供更多上下文

### 写入前后的保护
- **路径越界**：`assertExternalDirectory`
- **一致性**：对已存在文件，写前 `FileTime.assert(sessionID, filePath)`
- **权限**：计算 diff 后 `ctx.ask({ permission:"edit", metadata:{diff} })`
- **写后诊断**：`LSP.touchFile(filePath, true)` → `LSP.diagnostics()`，把错误拼入 tool output

### 流程图
```mermaid
flowchart TD
  Input[edit(filePath,oldString,newString)] --> PathCheck[assertExternalDirectory]
  PathCheck --> TimeCheck[FileTime.assert_if_exists]
  TimeCheck --> Replace[replace_with_replacers]
  Replace --> Diff[createTwoFilesPatch]
  Diff --> Perm[ask(edit,diff)]
  Perm --> Write[write_file]
  Write --> LSP[LSP.touchFile + diagnostics]
  LSP --> Output[tool_output_with_errors]
```

### 适用场景
- 小范围、可用上下文锚定的改动（例如替换一个函数体、改一段逻辑）
- 你希望工具帮你在“oldString 稍有偏差”时仍能找到正确块（靠 replacers）

### 常见失败模式
- `oldString not found in content`
- `Found multiple matches`（需要补更多上下文，避免误替换）
- 未读先写 / 文件被外部改动（FileTime）
- LSP 报错（会作为提示回灌给模型继续修复）
