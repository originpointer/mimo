## 附录：OpenCode Patch 文本格式（Begin/End Patch）

### 目的
`Tool: patch` 使用一套自定义的补丁文本格式，用于让模型以结构化方式描述多文件变更。解析入口：
- `.refer/.sources/opencode/packages/opencode/src/patch/index.ts`

### 顶层结构
补丁必须被以下标记包裹：
- `*** Begin Patch`
- `*** End Patch`

### 文件级指令（Header）
每个文件变更以 header 开始：
- 新增文件：`*** Add File: <path>`
- 删除文件：`*** Delete File: <path>`
- 更新文件：`*** Update File: <path>`
  - 可选移动：下一行 `*** Move to: <new_path>`

### Add File 内容
Add File 内容由若干以 `+` 开头的行组成：
- `+` 后面为实际文件内容行
- 解析器会拼接这些行并去掉最后一个多余换行

示例：
```text
*** Begin Patch
*** Add File: hello.txt
+Hello
+World
*** End Patch
```

### Update File 块（chunks）
Update File 由多个 chunk 组成；chunk 以 `@@` 开头（可携带 change_context）：
- `@@` 或 `@@ something`
- 后续直到下一个 `@@` 或 `***` 为止，是变更行：
  - 以空格开头：保留行（同时存在于 old/new）
  - 以 `-` 开头：仅 old_lines
  - 以 `+` 开头：仅 new_lines
- 可选终止标记：`*** End of File`

示例：
```text
*** Begin Patch
*** Update File: test.txt
@@
 line 1
-line 2
+line 2 updated
 line 3
*** End Patch
```

### Delete File
Delete File 不需要内容块：
```text
*** Begin Patch
*** Delete File: old.txt
*** End Patch
```

### 解析与应用的关键语义
- Update 不依赖行号，依赖 `old_lines` 在文件中的序列匹配（可先通过 `change_context` 调整起始搜索位置）。
- 如果 `old_lines` 找不到，会报错并拒绝应用，避免“错位替换”。

### 与 unified diff 的区别
- 这不是 GNU patch/unified diff 格式。
- 它更适合模型生成：结构清晰、可拼接多文件、用上下文定位。
