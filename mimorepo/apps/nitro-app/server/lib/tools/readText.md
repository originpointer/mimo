# `readText`（uploads 文本读取）

读取 uploads 目录内的文本文件（HTML/TXT/JSON 等），返回带行号的内容，并对输出做截断保护。

## 对应实现与路由

- **实现文件**：`server/lib/tools/readText.ts`
- **HTTP 路由**：`POST /api/tools/read`（`server/routes/api/tools/read.post.ts`）

## 适用场景

- 调试 uploads 内保存的 HTML/JSON/TXT 内容（例如 upload innerHTML 后查看落盘内容）
- 配合 `grep` 先定位关键词，再用 `read` 分页阅读上下文

## 输入参数（与 schema 对齐）

``` bash

```

使用上述 `uploadId` 直接调用（先用 glob 找到该 uploadId 下的文件路径，再 read）：

```bash
uploadId="71827547-da81-4bfa-a5ae-8a39a660460c"
base="http://127.0.0.1:6006"
# 1) 找到该 uploadId 下的任意一个文件（uploads 结构是：<date>/<uploadId>/<fileName>）
glob_json=$(curl -sS "$base/api/tools/glob" \
  -H 'content-type: application/json' \
  -d "{\"pattern\":\"**/$uploadId/**\",\"limit\":20}")

# 取 output 的第一行作为 relPath（即 uploads 内相对路径）
rel=$(node -e 'const j=JSON.parse(process.argv[1]); const line=String(j.output||\"\").split(\"\\n\").find(Boolean)||\"\"; process.stdout.write(line);' "$glob_json")
echo "rel=$rel"

# 2) readText：读取该文件内容
curl -sS "$base/api/tools/read" \
  -H 'content-type: application/json' \
  -d "{\"path\":\"$rel\",\"offset\":0,\"limit\":120}"
```

`ReadTextInputSchema`：

```json
{
  "path": "2026-01-20/<uploadId>/demo.html",
  "offset": 0,
  "limit": 200
}
```

- **path**（string，必填）
  - uploads 内相对路径，例如 `2026-01-20/<uploadId>/demo.html`
  - 也允许 `.data/uploads/...` / `uploads/...` 形式，会被规范化到 uploads 内
- **offset**（number，非负整数，可选）
  - 从第几行开始读（0-based）
- **limit**（number，正整数，可选）
  - 最多读取多少行（默认 2000；最大 20000）

## 返回结果

成功返回统一结构：

```json
{
  "ok": true,
  "title": "2026-01-20/<uploadId>/demo.html",
  "output": "<file>\n00001| ...\n</file>",
  "metadata": { "truncated": false }
}
```

- **title**：规范化后的 uploads 相对路径
- **output**：带行号的 `<file>...</file>` 文本
- **metadata.truncated**：是否被截断（行数未读完或字节数上限触发）

## curl 示例（最小可运行）

> 默认 Nitro 运行在 `http://127.0.0.1:6006`（见 `apps/nitro-app/package.json` 的 dev/preview 脚本）

1）先上传一段 HTML，拿到 `relPath`：

```bash
base="http://127.0.0.1:6006"

upload_json=$(curl -sS "$base/api/upload/innerHTML" \
  -H 'content-type: application/json' \
  -d '{"content":"<div id=\"hello\">hi</div>","mimeType":"text/html","fileName":"demo.html"}')

echo "$upload_json"
```

返回示例里会包含：

- `relPath`：形如 `.data/uploads/2026-01-20/<uploadId>/demo.html`
- `url`：形如 `/api/file?path=2026-01-20%2F<uploadId>%2Fdemo.html`

2）用 `read` 读取（推荐用 uploads 相对路径，去掉 `.data/uploads/` 前缀）：

```bash
rel="2026-01-20/<uploadId>/demo.html"

curl -sS "$base/api/tools/read" \
  -H 'content-type: application/json' \
  -d "{\"path\":\"$rel\",\"offset\":0,\"limit\":120}"
```

## 服务端内部调用示例（不走 HTTP）

```ts
import { readTextInUploads } from "@/lib/tools/readText"

export async function example() {
  const result = await readTextInUploads({
    path: "2026-01-20/<uploadId>/demo.html",
    offset: 0,
    limit: 120,
  })
  // result.title / result.output / result.metadata.truncated
  return result
}
```

## 常见错误与限制

- **400 invalid input**：请求体不符合 schema（缺字段/类型不对等）
- **400 invalid path**：path 含 `..`、反斜杠、或试图越界（强制限定在 uploads）
- **404 not found**：文件不存在或不是文件
- **400 cannot read binary file**：
  - 扩展名在二进制黑名单（如 `.png/.pdf/.wasm` 等）或
  - 内容被判定为二进制
- **输出截断**：`output` 有最大字节数上限，触发后 `metadata.truncated=true`，并提示用 `offset` 继续读

