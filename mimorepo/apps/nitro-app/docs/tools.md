# Nitro Tools（uploads 受控工具）使用文档

本目录下的 tools 用于在 **Nitro 服务端**对 `uploads` 目录（默认 `.data/uploads`）做受控的 **读取/列目录/简单 glob/简单 grep**，便于调试与构建“上传 innerHTML → 处理/抽取 → 输出”的链路。

## 适用范围与约定

- **仅允许访问 uploads**：所有 `path`/搜索范围都会被规范化并限制在 `UPLOADS_DIR`（默认 `.data/uploads`）下。
  - uploads 根目录来自 `server/lib/uploadStore.ts` 的 `getUploadsDir()`，支持 `UPLOADS_DIR` 环境变量。
  - 路径校验逻辑在 `server/lib/tools/uploadsPath.ts`。
- **路径输入格式**：
  - 推荐：`2026-01-20/<uploadId>/file.html`（uploads 内相对路径）
  - 也可：`.data/uploads/2026-01-20/<uploadId>/file.html`（会被规范化为相对路径）
- **错误码约定**：
  - `400`：参数不合法 / path 不合法 / regex 不合法
  - `404`：文件不存在（仅 `read`）
  - `500`：其他运行期错误

## HTTP API

### `POST /api/tools/read`

- **用途**：读取 uploads 内文本文件（HTML/JSON/TXT），返回带行号的内容，并按字节数截断输出。
- **实现**：`server/routes/api/tools/read.post.ts` → `server/lib/tools/readText.ts`

#### 请求体

```json
{
  "path": "2026-01-20/<uploadId>/mimo-xpath-innerhtml.html",
  "offset": 0,
  "limit": 200
}
```

- **path**：必填，uploads 内相对路径（或 `.data/uploads/...`）
- **offset**：可选，从第几行开始（0-based）
- **limit**：可选，最多读多少行（默认 2000）

#### 响应体（成功）

```json
{
  "ok": true,
  "title": "2026-01-20/<uploadId>/mimo-xpath-innerhtml.html",
  "output": "<file>\n00001| ...\n</file>",
  "metadata": { "truncated": false }
}
```

#### 常见失败

- `400 invalid input`：请求体不符合 schema
- `400 invalid path`：包含 `..`、反斜杠或越界
- `404 not found`：文件不存在
- `400 cannot read binary file`：疑似二进制或扩展名在黑名单内

---

### `POST /api/tools/list`

- **用途**：列出 uploads 下某个目录的树状结构（带上限，避免列太多）。
- **实现**：`server/routes/api/tools/list.post.ts` → `server/lib/tools/listTree.ts`

#### 请求体

```json
{
  "path": "",
  "limit": 200
}
```

- **path**：可选，uploads 内相对目录；传空/省略表示 uploads 根目录
- **limit**：可选，最多收集多少个文件条目（默认 200）

#### 响应体（成功）

```json
{
  "ok": true,
  "title": "uploads/",
  "output": "/abs/path/to/.data/uploads/\n2026-01-20/\n  <uploadId>/\n    file.html\n",
  "metadata": { "count": 12, "truncated": false }
}
```

---

### `POST /api/tools/glob`

- **用途**：按简化 glob 查找文件（仅支持 `*` / `**` / `?`），返回 **uploads 内相对路径**列表（按 mtime 排序）。
- **实现**：`server/routes/api/tools/glob.post.ts` → `server/lib/tools/globFiles.ts`

#### 请求体

```json
{
  "path": "",
  "pattern": "**/*.html",
  "limit": 50
}
```

- **pattern**：必填
  - 如果不包含 `/`，会自动当成 `**/<pattern>`（例如 `*.html` 等价于 `**/*.html`）
- **path**：可选，限定搜索根目录（uploads 内）
- **limit**：可选，最多返回多少条（默认 200）

#### 响应体（成功）

```json
{
  "ok": true,
  "title": "**/*.html",
  "output": "2026-01-20/<uploadId>/a.html\n2026-01-20/<uploadId>/b.html",
  "metadata": { "count": 2, "truncated": false }
}
```

---

### `POST /api/tools/grep`

- **用途**：在 uploads 文件内容中逐行查找匹配行（**JS RegExp**，不是 ripgrep 语法），用于快速定位锚点/字段文本。
- **实现**：`server/routes/api/tools/grep.post.ts` → `server/lib/tools/grepFiles.ts`

#### 请求体

```json
{
  "path": "",
  "pattern": "resume-detail-basic-info",
  "flags": "i",
  "include": "**/*.html",
  "limit": 50
}
```

- **pattern**：必填，JS `new RegExp(pattern, flags)` 的 pattern
- **flags**：可选，例如 `i`、`m`
- **include**：可选，按简化 glob 过滤文件名（同 `glob` 的语义）
- **limit**：可选，最多返回多少条匹配行（默认 100）

#### 响应体（成功）

```json
{
  "ok": true,
  "title": "resume-detail-basic-info",
  "output": "Found 3 matches\n2026-01-20/<uploadId>/mimo.html:\n  Line 123: ...",
  "metadata": { "matches": 3, "truncated": false }
}
```

## 服务端内部调用（在 Nitro 代码里直接用）

你可以在任意 Nitro handler / lib 中直接 import 并调用（不走 HTTP），例如：

```ts
import { readTextInUploads } from "@/lib/tools/readText"
import { globFilesInUploads } from "@/lib/tools/globFiles"
import { grepFilesInUploads } from "@/lib/tools/grepFiles"
import { listUploadsTree } from "@/lib/tools/listTree"

// readTextInUploads({ path, offset, limit })
// globFilesInUploads({ pattern, path, limit })
// grepFilesInUploads({ pattern, flags, path, include, limit })
// listUploadsTree({ path, limit })
```

返回结构统一为：

- `title: string`
- `output: string`
- `metadata: Record<string, any>`

详见：`server/lib/tools/types.ts`

## 安全与限制（重要）

- **强制 uploads-only**：通过 `resolvePathInUploads` / `resolveDirInUploads` 做规范化与越界校验。
- **read 有输出上限**：会按最大字节数截断 `output`，并在末尾提示继续用 `offset` 读取。
- **glob 是简化实现**：仅支持 `*` / `**` / `?`，不支持 brace `{a,b}`、字符类 `[]` 等高级语法。
- **grep 是逐行 + JS RegExp**：
  - 不支持 ripgrep 的高级参数与语法
  - 对单文件大小与文件总数有上限（见 `server/lib/tools/grepFiles.ts`），避免扫描过大
- **不提供通用文件系统与 shell**：这套 tools 只面向 uploads，避免把机器文件系统暴露成“万能读写/执行”接口。

## 端到端示例：upload → grep/read → file.get

假设 Nitro 在 `http://127.0.0.1:6006`：

1) 上传 innerHTML：

```bash
curl -sS http://127.0.0.1:6006/api/upload/innerHTML \
  -H 'content-type: application/json' \
  -d '{"content":"<div id=\"hello\">hi</div>","mimeType":"text/html","fileName":"demo.html"}'
```

2) 在 uploads 里 grep 锚点：

```bash
curl -sS http://127.0.0.1:6006/api/tools/grep \
  -H 'content-type: application/json' \
  -d '{"pattern":"hello","flags":"i","include":"**/*.html","limit":20}'
```

3) read 读取文件内容（用上一步返回的相对路径替换 `<relPath>`）：

```bash
curl -sS http://127.0.0.1:6006/api/tools/read \
  -H 'content-type: application/json' \
  -d '{"path":"<relPath>","offset":0,"limit":120}'
```

4) 如需直接获取原始文件字节（HTML/JSON/TXT），用现有接口：

```bash
curl -sS "http://127.0.0.1:6006/api/file?path=$(python -c 'import urllib.parse;print(urllib.parse.quote(\"<relPath>\"))')"
```

