## 07 故障模式 Playbook（排查与修复）

本章按“症状 → 原因 → 定位 → 修复/规避”整理常见失败模式，目标是让线上问题可快速归因，并能触发对应的自愈策略。

---

## F1. `chrome.debugger.attach` 失败
- **症状**：返回错误包含\n
  - `Cannot attach to this target`\n
  - `Another debugger is already attached`\n
- **常见原因**：
  - 目标 Tab 正在被 DevTools 调试（最常见）\n
  - 目标页面 scheme 不允许（非 http/https）\n
  - 权限不足（debugger 未授权）\n
- **定位**：
  - Background 层先 `tabs.get` 校验 URL scheme（现有实现已做）。\n
  - 错误信息记录到 failure report。\n
- **修复/规避**：
  - 提示用户关闭 DevTools 或换一个未被调试的 Tab。\n
  - 降级：使用 content-script DOM 扫描（能力弱于 CDP，尤其跨域 iframe/OOPIF）。\n

---

## F2. `Runtime.evaluate` / `document.evaluate` 异常
- **症状**：验证阶段异常或返回空。\n
- **原因**：
  - 页面执行环境被 CSP/隔离影响（少见，但需兜底）。\n
  - XPath 语法不兼容（含特殊 hop）\n
- **定位**：
  - 记录 exceptionDetails（若可得）\n
  - 统计异常率与 xpath 样本\n
- **修复**：
  - 统一 normalize XPath；避免不必要的自定义 hop。\n
  - 对 shadow hop（`//` 语义）做兼容分支（必要时退回自定义遍历方案，见 `@repo/sens/src/utils/stagehand-xpath.ts` 的 traversal）。\n

---

## F3. CBOR stack / DOM.getDocument 深度问题
- **症状**：digest 构建失败或 xpath 映射缺失，日志包含 `CBOR: stack limit exceeded`。\n
- **原因**：页面 DOM 太深/太大。\n
- **定位**：
  - 记录最终使用的 depth 与 hydrate 次数。\n
- **修复**：
  - 复用 `stagehandSnapshot.ts` 的 depth 递减 + `hydrateDomTree(describeNode)`。\n
  - digest 采样/裁剪更激进（maxNodes/maxDepth/maxSiblings）。\n

---

## F4. iframe/OOPIF 覆盖不足，XPath 退化
- **症状**：
  - 字段 0 命中，但文本在页面可见。\n
  - 生成的 xpath 形如只剩 iframe 前缀或 `/`。\n
- **原因**：
  - OOPIF session 未 attach 或 frameId→sessionId 映射缺失。\n
  - same-process iframe 的 contentDocument 未补全。\n
- **定位**：
  - 记录 framesScanned、OOPIF 数、frameSession 映射数量。\n
- **修复**：
  - 对齐 `StagehandXPathScanner`：`Target.setAutoAttach(flatten)` + `Page.getFrameTree` 合并树。\n
  - 强制补全 iframe contentDocument（`ensureIFrameContentDocuments`）。\n

---

## F5. Shadow DOM（尤其 closed shadow）导致定位失败
- **症状**：contains/候选无法覆盖，或 XPath 无法命中。\n
- **原因**：
  - open shadowRoot 可遍历；closed shadowRoot 无法通过 DOM API/常规遍历拿到内部节点。\n
- **定位**：
  - `includeShadow=true` 仍无法命中且页面疑似组件化。\n
- **修复**：
  - fallback 到 screenshot→TextAnchors +（可选）可访问性树（a11y）信号。\n
  - 若业务允许，退化为容器级定位（main container）。\n

---

## F6. 多命中（matchedCount>1）无法收敛
- **症状**：验证显示同一字段命中多处。\n
- **原因**：
  - 候选污染（导航目录/正文重复）\n
  - 缺少 layout 信息无法做邻近消解\n
- **定位**：
  - 查看 `firstTextSnippet` 是否重复、是否在导航区域。\n
- **修复**：
  - 增强 digest：加入 bbox/layout。\n
  - `TextToDomLocator` 加范围约束：mainContainer/section。\n
  - 允许字段退化为容器级 xpath（schema 标注 container）。\n

---

## F7. LLM 输出不合规（非 JSON / xpath 不在 candidates）
- **症状**：parse 失败或校验失败。\n
- **原因**：提示词不够强、候选太多、模型温度过高。\n
- **定位**：
  - 记录原始输出（服务端落盘）\n
  - 统计不合规率\n
- **修复**：
  - 强化 system prompt：必须输出严格 JSON。\n
  - 限制 candidates 数量并分层。\n
  - 降低 temperature（现有 parse 端已用 `0.1`）。\n

