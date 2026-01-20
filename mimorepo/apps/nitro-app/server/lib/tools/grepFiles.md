# `grepFiles`（uploads 简化 grep：JS RegExp）

在 uploads 目录内对文件内容逐行匹配，返回命中的行列表。**注意：这里的 grep 使用 JS RegExp（`new RegExp()`），不是 ripgrep 语法。**

## 对应实现与路由

- **实现文件**：`server/lib/tools/grepFiles.ts`
- **HTTP 路由**：`POST /api/tools/grep`（`server/routes/api/tools/grep.post.ts`）

## 适用场景

- 在上传的 HTML 中快速定位“锚点/字段标题/关键文本”出现在哪些文件、哪一行
- 结合 `read`：先 grep 找行号，再 read 查看上下文

## 输入参数（与 schema 对齐）

`GrepFilesInputSchema`：

```json
{
  "pattern": "resume-detail-basic-info",
  "flags": "i",
  "path": "",
  "include": "**/*.html",
  "limit": 50
}
```

- **pattern**（string，必填）
  - JS RegExp 的 pattern，例如 `hello`、`resume-detail-basic-info`、`<svg\\b`
- **flags**（string，可选）
  - 传给 `new RegExp(pattern, flags)` 的 flags，例如 `i`、`m`
- **path**（string，可选）
  - uploads 内相对目录；省略/空字符串表示 uploads 根目录
- **include**（string，可选）
  - 用简化 glob 过滤文件名（同 `globFiles`：支持 `*` / `**` / `?`）
  - 常用：`**/*.html`
- **limit**（number，正整数，可选）
  - 最多返回多少条匹配行（默认 100；最大 2000）

## 返回结果

```json
{
  "ok": true,
  "title": "resume-detail-basic-info",
  "output": "Found 3 matches\n2026-01-20/<uploadId>/demo.html:\n  Line 1: ...",
  "metadata": { "matches": 3, "truncated": false }
}
```

输出为文本分组格式（按文件聚合），每条匹配包含 `Line <n>: <lineText>`。

## curl 示例（最小可运行）

> 默认 Nitro 运行在 `http://127.0.0.1:6006`

1）先上传一个 html（便于确保一定有命中）：

```bash
base="http://127.0.0.1:6006"

curl -sS "$base/api/upload/innerHTML" \
  -H 'content-type: application/json' \
  -d '{"content":"<div id=\"hello\">hi</div>","mimeType":"text/html","fileName":"demo.html"}'
```

2）grep 全 uploads（只搜 html）：

```bash
curl -sS "$base/api/tools/grep" \
  -H 'content-type: application/json' \
  -d '{"pattern":"hello","flags":"i","include":"**/*.html","limit":20}'
```

3）限定在某个日期目录（缩小范围）：

```bash
curl -sS "$base/api/tools/grep" \
  -H 'content-type: application/json' \
  -d '{"path":"2026-01-20","pattern":"hello","flags":"i","include":"**/*.html","limit":20}'
```

## 服务端内部调用示例（不走 HTTP）

```ts
import { grepFilesInUploads } from "@/lib/tools/grepFiles"

export async function example() {
  return await grepFilesInUploads({
    path: "",
    include: "**/*.html",
    pattern: "hello",
    flags: "i",
    limit: 50,
  })
}
```

## 扫描策略与限制（重要）

实现内做了多重限制来避免“扫爆”：

- **文件数量上限**：只遍历一部分文件（见 `DEFAULT_FILE_LIMIT`）
- **单文件大小上限**：大于阈值的文件会跳过（见 `MAX_FILE_BYTES`）
- **二进制跳过**：对内容做二进制检测，疑似二进制则跳过
- **逐行匹配**：按 `\\n` 分行，对每一行做 `re.test(line)`

因此它更像“用于 uploads 调试的轻量 grep”，不等价于 ripgrep 的完整能力。

## 常见错误

- **400 invalid input**：请求体不符合 schema
- **400 invalid path**：path 越界/包含 `..`/反斜杠（强制限定在 uploads）
- **400 invalid regex: ...**：pattern/flags 组合无法构造 RegExp

