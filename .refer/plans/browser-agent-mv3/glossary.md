## 术语表

- **MV3**：Chrome Extension Manifest V3。
- **SW（Service Worker）**：MV3 background 运行形态，非常驻，可被回收。
- **CS（Content Script）**：注入网页上下文的脚本，可读写 DOM。
- **Action**：服务端下发的结构化动作指令（JSON），由插件执行。
- **Observation**：插件执行动作后的结构化观测结果（JSON）。
- **Artifacts**：证据文件/引用（截图、导出包等）。
- **Policy**：风控策略，决定 risk 与 requiresConfirmation。
- **Human-in-the-loop**：需要用户确认/介入才能继续执行。
- **幂等（Idempotency）**：同一 `actionId` 多次执行/上报不会造成重复副作用。
- **审计（Audit）**：记录每一步动作、结果、证据与确认信息，支持追溯。
