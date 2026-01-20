# `globFiles`（uploads 简化 glob 查找）

在 uploads 目录内按 **简化 glob 语义**查找文件，返回 **uploads 内相对路径**列表（按 mtime 从新到旧排序），用于快速定位文件名模式匹配的上传内容。

## 对应实现与路由

- **实现文件**：`server/lib/tools/globFiles.ts`
- **HTTP 路由**：`POST /api/tools/glob`（`server/routes/api/tools/glob.post.ts`）

## 适用场景

- 想找“最近上传的 HTML 文件”或“某天上传的所有 `.html`”
- 配合 `read` / `grep`：先用 glob 找到目标文件路径，再读取/搜索内容

## 输入参数（与 schema 对齐）

`GlobFilesInputSchema`：

```json
{
  "pattern": "**/*.html",
  "path": "",
  "limit": 50
}
```

- **pattern**（string，必填）
  - 支持 `*` / `**` / `?`
  - 如果 pattern 不包含 `/`，会自动补成 `**/<pattern>`（例如 `*.html` 等价于 `**/*.html`）
- **path**（string，可选）
  - uploads 内相对目录；省略/空字符串表示 uploads 根目录
- **limit**（number，正整数，可选）
  - 最多返回多少条（默认 200；最大 5000）

## 返回结果

```json
{
  "ok": true,
  "title": "**/*.html",
  "output": "2026-01-20/<uploadId>/a.html\n2026-01-20/<uploadId>/b.html",
  "metadata": { "count": 2, "truncated": false }
}
```

- **output**：每行一个 uploads 相对路径
- **metadata.truncated**：匹配结果超过 limit 会为 true，并在 output 末尾追加提示

## curl 示例

查找所有 html（全 uploads）：

```bash
base="http://127.0.0.1:6006"

curl -sS "$base/api/tools/glob" \
  -H 'content-type: application/json' \
  -d '{"path":"","pattern":"**/*.html","limit":50}'
```

限定在某个日期目录里查找：

```bash
curl -sS "$base/api/tools/glob" \
  -H 'content-type: application/json' \
  -d '{"path":"2026-01-20","pattern":"**/*.html","limit":50}'
```

查找某个 uploadId 下所有文件（用 `**/*`）：

```bash
curl -sS "$base/api/tools/glob" \
  -H 'content-type: application/json' \
  -d '{"path":"2026-01-20/<uploadId>","pattern":"**/*","limit":200}'
```

## 服务端内部调用示例（不走 HTTP）

```ts
import { globFilesInUploads } from "@/lib/tools/globFiles"

export async function example() {
  return await globFilesInUploads({
    path: "",
    pattern: "**/*.html",
    limit: 50,
  })
}
```

## 简化 glob 语义说明（重要）

当前实现将 glob 转成 RegExp，仅支持：

- `*`：匹配单段路径内任意字符（不跨 `/`）
- `?`：匹配单段路径内任意单个字符（不跨 `/`）
- `**`：匹配任意深度路径（可跨 `/`）

不支持：

- brace 扩展：`{a,b}`
- 字符类：`[a-z]`
- 复杂的 extglob（如 `@(a|b)`）

## 常见错误与限制

- **400 invalid input**：请求体不符合 schema
- **400 invalid path**：path 越界/包含 `..`/反斜杠（强制限定在 uploads）
- **性能与上限**：内部会先遍历一定数量文件再筛选（见实现内 `walkFiles` 的 limit/maxDepth），极端大目录下建议传 `path` 缩小范围

