# 简历正文根节点 XPath 识别（跨站）- 文档索引

目标：在 **Boss/拉勾/猎聘/智联** 等渠道页面中，定位“**只包含简历正文**”的根容器，并输出其 **可回放 XPath**；在不确定时可启用 **大模型** 做候选裁决，并按《图像与 DOM 落地原则》必要时用 **截图核验**。

本方案显式对齐两份仓库文档能力边界：

- `mimorepo/apps/plasmo-app/docs/大模型页面理解-图像与DOM-落地原则.md`
- `mimorepo/apps/plasmo-app/docs/StagehandXPath-协议说明.md`

---

## 文档结构（建议按顺序阅读）

- `00-README.md`：索引、术语与默认阈值
- `01-能力对齐-图像与DOM落地原则在简历场景的应用.md`：什么时候必须 DOM、什么时候必须截图、如何融合
- `02-能力对齐-StagehandXPath协议在简历场景的定位与不足.md`：`STAGEHAND_XPATH_SCAN` 能力边界、如何复用与补采集
- `03-分析思路-字段锚点到正文根容器XPath（跨站）.md`：anchors → candidates → score → root xpath 的核心算法
- `04-第三方依赖库调研.md`：Readability/unfluff 等的适用性与局限，如何作为弱信号融合
- `05-大模型兜底-启用规则与输入输出契约.md`：触发条件、输入结构、输出约束、安全与注入防护
- `06-最终方案-服务端编排与回传协议（Stagehand风格）.md`：服务端调度状态机、端侧回传协议、失败回退与安全策略

---

## 术语表（极简）

- **简历正文**：个人信息 + 教育/工作/项目经历 + 技能/证书/自我评价 等内容区；**不包含** 顶部导航、推荐职位、相似简历、广告、下载 App、登录注册等。
- **Anchor（字段锚点）**：强特征命中点（手机号/邮箱/日期区间/章节标题/字段名:值结构）。不要求一次命中根节点，只需提供“在正文内的可靠散点”。
- **Candidate（候选容器）**：由 anchor 向上追溯祖先得到的一批可能的“正文根容器”。
- **Coverage（覆盖率）**：某 candidate 包含的 anchors 数 / anchors 总数。
- **LinkDensity**：容器内链接（`<a>`）相关文本占比，通常正文区较低。
- **InteractiveDensity**：容器内交互控件密度（`button/input/select/textarea/[role=button]`），正文区通常较低。
- **TopK**：按评分选出的候选容器集合，用于 LLM 兜底裁决。
- **LLM 兜底**：仅在 TopK candidates 内做“选择”，不允许全页自由找 xpath。

---

## 默认 pipeline（对齐《图像与DOM落地原则》）

推荐默认：**并行采集最小 DOM 摘要 + viewport 截图**，服务端融合决策；成本敏感场景可以先 DOM，再在不确定时触发截图核验。

### Pipeline C（默认，最稳但成本更高）

- 端侧并行采集：
  - **DOM 摘要**（anchors + candidates 摘要 + stats + xpath）
  - **viewport 截图**（必要时用于遮挡/弹窗/跨 iframe 合成判断）
- 服务端：
  - 打分选 root xpath；不确定则 LLM 在 TopK 裁决
  - 自校验，不通过则回退（滚动/二次采集/扩大 anchor）

### Pipeline A（成本敏感，DOM 为主，图像核验）

- 先只采集 DOM 摘要并选 root xpath
- 若出现“遮挡/弹窗/视觉语义风险/Top2 分差小”等，再采集截图核验

---

## 默认阈值（可按站点微调）

- **DOM 直接通过**：`coverage >= 0.75` 且 `fieldTypeCount >= 3` 且 `linkDensity <= 0.20`
- **启用 LLM**：`coverage in [0.55, 0.75)` 或 `Top2ScoreGap < 0.10` 或 `fieldTypeCount < 3`
- **强回退**：`coverage < 0.55`（滚动/二次采集/扩展 anchors）
- **截图核验触发**：检测到遮挡/弹窗/跨 iframe 合成风险，或 DOM 结果不稳定（候选分差小）

