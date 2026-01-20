# `listTree`（uploads 目录树）

列出 uploads 下某个目录的树状结构（目录优先、包含文件名），并带条目上限，避免一次性列出过多内容。

## 对应实现与路由

- **实现文件**：`server/lib/tools/listTree.ts`
- **HTTP 路由**：`POST /api/tools/list`（`server/routes/api/tools/list.post.ts`）

## 适用场景

- 调试 uploads 目录结构：查看最近的 `YYYY-MM-DD/<uploadId>/...` 目录与文件
- 结合 `read`/`glob`/`grep` 前先确认文件落盘位置

## 输入参数（与 schema 对齐）

`ListTreeInputSchema`：

```json
{
  "path": "",
  "limit": 200
}
```

- **path**（string，可选）
  - uploads 内相对目录
  - 省略或传空字符串：表示 uploads 根目录
- **limit**（number，正整数，可选）
  - 最多收集多少个“文件条目”（默认 200；最大 2000）

## 返回结果

```json
{
  "ok": true,
  "title": "uploads/",
  "output": "/abs/path/to/.data/uploads/\n  2026-01-20/\n    <uploadId>/\n      demo.html\n",
  "metadata": { "count": 12, "truncated": false }
}
```

- **metadata.count**：收集到的文件条目数（不是目录数）
- **metadata.truncated**：达到 limit 或仍有未遍历队列时会为 true

## curl 示例

列出 uploads 根目录（最常用）：

```bash
base="http://127.0.0.1:6006"

curl -sS "$base/api/tools/list" \
  -H 'content-type: application/json' \
  -d '{"path":"","limit":200}'
```

列出某个日期目录（缩小范围）：

```bash
curl -sS "$base/api/tools/list" \
  -H 'content-type: application/json' \
  -d '{"path":"2026-01-20","limit":200}'
```

## 服务端内部调用示例（不走 HTTP）

```ts
import { listUploadsTree } from "@/lib/tools/listTree"

export async function example() {
  return await listUploadsTree({ path: "", limit: 200 })
}
```

## 常见错误与限制

- **400 invalid input**：请求体不符合 schema
- **400 invalid path**：path 含 `..`、反斜杠、或越界（强制限定在 uploads）
- **忽略目录**：实现内有一组 `IGNORE_DIR_NAMES`（如 `.git/node_modules/dist` 等），遍历时会跳过这些目录名
- **深度上限**：实现内对遍历深度有上限（避免极端深层目录导致性能问题）
- **输出可能包含绝对路径**：`output` 第一行会打印当前 rootDir 的绝对路径（用于调试定位）

