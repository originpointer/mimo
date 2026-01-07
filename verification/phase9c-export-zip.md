# Phase 9-C：审计产物产品化（Export Zip + Replay 增强 + 自动断言）

> 目标：把 Phase9-A 的“能落盘”升级为“可交付、可归档、可回归”的产物：zip 导出 + 更强回放页 + 验证页自动断言。

## 现状

- 审计：`audit/<taskId>.jsonl` + `audit/<taskId>/screenshots/*-before.jpg|*-after.jpg`
- `GET /control/replay/:taskId`：纯 HTML 时间线（内嵌 base64 图片）
- `GET /control/export/:taskId`：JSON + base64 screenshots（MVP）

## 目标与范围（MVP）

- **导出 zip**：`GET /control/export/:taskId` 返回 zip：
  - `task.jsonl`
  - `screenshots/*.jpg`
  - （可选）`meta.json`（taskId、createdAt、count）
- **回放增强**：回放页展示更完整字段：
  - action 摘要（type/target/params）
  - risk、requiresConfirmation、reason
  - error.code / error.message
  - 允许下载单张截图
- **验证页自动断言**：`/control/verify/phase9` 在完成后自动检查：
  - jsonl 行数符合预期（至少 low + high 两条）
  - before/after 图片可读取（非空）

## 实现建议

- 新增：`server/utils/control/exportZip.ts`
  - 使用 Node 内置能力生成 zip（若实现成本高，再引入轻量 zip 库）
- 修改：`server/routes/control/export/[taskId].get.ts`
  - `content-type: application/zip`
  - `content-disposition: attachment; filename="<taskId>.zip"`
- 修改：`server/routes/control/replay/[taskId].get.ts`
  - 展示字段增强 + 下载按钮（走 `GET /control/export/:taskId` 或单张 endpoint）
- 修改：`server/routes/control/verify/phase9.get.ts`
  - 完成后 fetch replay/export 做断言（失败则标红并输出原因）

## 验收标准

- 访问 `GET /control/export/:taskId`：浏览器下载 zip，解压结构正确。
- replay 页可查看并下载截图。
- phase9 验证页“验收断言”能稳定通过。

## 回归点

- 不影响现有审计写入路径（仍写 jsonl + screenshots）。
- 若 zip 实现失败，可临时保留 JSON export 作为 fallback（通过 query 参数切换）。
