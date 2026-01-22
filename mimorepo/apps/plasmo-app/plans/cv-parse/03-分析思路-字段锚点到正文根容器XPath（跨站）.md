# 分析思路：字段锚点 → 正文根容器 XPath（跨 Boss/拉勾/猎聘/智联）

本章给出跨站稳定的核心思路：**先找“简历字段锚点”（anchors）**，再由锚点向上生成候选容器（candidates），最后在服务端/端侧做评分与自校验，输出“只包含简历正文”的根容器 XPath。

该思路与两份能力说明的对齐点：

- 输出是 XPath ⇒ DOM 必须参与（见 `01`）
- `STAGEHAND_XPATH_SCAN` 返回 items 不含正文 innerText/几何信息 ⇒ 需要补采集 anchors/candidates/stats（见 `02`）

---

## 1. 目标定义（避免歧义）

**只要简历正文**：

- 应包含：个人信息、教育/工作/项目经历、技能/证书/自我评价等主要内容
- 应尽量排除：站点导航、推荐职位/相似简历、广告、下载 App 引导、登录/注册引导、底部链接集合

在实现上，我们追求的是：

- **最小的**、仍能覆盖主要字段锚点的容器（不是越大越好）
- 在不确定时，允许通过“截图核验 + 回退动作”来获得更干净的正文态

---

## 2. Anchor（字段锚点）设计：跨站泛化优先

### 2.1 强锚点（强推荐，优先使用）

这些锚点跨站稳定、误报低：

- **手机号**：中国手机号正则（可按业务再扩展国际）
- **邮箱**：标准邮箱正则
- **日期区间**：`YYYY.MM-YYYY.MM`、`YYYY-MM ~ 至今` 等（教育/工作/项目经历高频）
- **章节标题**：`教育经历/工作经历/项目经历/技能/证书/自我评价/求职意向/个人信息` 等（命中标题后，通常附近会有多条条目）

### 2.2 弱锚点（辅助）

- `字段名: 值` 的结构（例如 label/value 两列、`dt/dd`、表格行）
- 常见字段词：城市/年限/学历/学校/专业/公司/职位/期望薪资等（误报更高，需要与强锚点共现）

### 2.3 降噪（非常关键）

在渠道站点，噪声锚点通常来自推荐区与导航：

- **高链接密度区域**（大量 `<a>`，且文本短、重复高）
- **典型操作词**：登录/注册/下载App/举报/收藏/分享/推荐/相似/查看更多
- **固定页脚**：隐私/协议/关于/帮助/客服

降噪策略建议：

- 对 anchor 采样：每种 `anchorType` 限制数量，避免某类噪声刷屏
- 去重：相同文本片段/相同祖先路径的 anchors 做去重

---

## 3. Candidate（候选容器）生成：锚点祖先集合（按 frame 分组）

### 3.1 为什么不用“全页枚举容器”

全页枚举会把导航/推荐/布局容器都拉进来，候选数爆炸且噪声大；锚点祖先生成能把搜索空间收敛到“正文附近”。

### 3.2 生成方法（推荐）

对每个 anchor 元素向上取祖先（例如 10~12 层），把每层祖先的 XPath 作为 candidate：

- 同一 frame 内去重
- 跨 iframe：按 `frameKey` 分组分别打分（避免被 iframe 外层布局拉大）

> 如果你端侧能拿到 bbox，可在生成阶段就过滤“面积过小/不可见”的祖先。

---

## 4. 评分函数：覆盖率优先 + 密度/噪声惩罚（可解释、可调参）

对每个 candidate 计算：

- `coverage = anchorCount / totalAnchors`
- `fieldTypeCount`：包含的 anchorType 种类数
- `textLen`：容器纯文本长度
- `linkDensity`：链接相关文本占比（或 `a` 数量占比）
- `interactiveDensity`：交互控件密度
- `depth`：XPath 深度（用于鼓励“更小更具体”的容器，但要配合 coverage）

一个可用的综合评分思路（示意）：

- **主项**：`coverage`（权重最高）
- **加分**：`fieldTypeCount`、适度的 `textLen`、更深的 `depth`
- **扣分**：`linkDensity`、`interactiveDensity`、过大的容器（靠近 `/html/body`）

### 默认阈值（与 README 对齐）

- 直接通过：`coverage >= 0.75` 且 `fieldTypeCount >= 3` 且 `linkDensity <= 0.20`
- 启用 LLM：`coverage in [0.55, 0.75)` 或 `Top2ScoreGap < 0.10` 或 `fieldTypeCount < 3`
- 强回退：`coverage < 0.55`（滚动/二次采集/扩展 anchors）

---

## 5. LCA（最低公共祖先）作为备选/基线

LCA 可以作为快速基线（尤其 anchors 很干净时）：

- 把 anchors 的 XPath 做 step 对齐，取最长公共前缀即 LCA
- 但 LCA 对“少量噪声 anchor”非常敏感，容易上升到 `/html/body`

因此更推荐“锚点祖先集合 + 评分”，LCA 仅作为：

- 快速初始候选（把 LCA 自身加入 candidates）
- 或作为评分 tie-breaker 的参考

---

## 6. 自校验与回退（闭环）

输出 root xpath 前做自校验：

- `coverage` 是否达标
- `fieldTypeCount` 是否覆盖到足够类型
- `linkDensity/interactiveDensity` 是否过高（疑似混入推荐区/导航）
-（可选）截图核验：是否被遮挡/弹窗覆盖

失败回退策略（由服务端编排控制）：

- 关闭弹窗/等待加载完成
- 滚动并二次采集（很多站点经历内容是滚动加载）
- 扩大 anchors 的弱特征范围（但要保持降噪）

---

## 7. 输出与证据链（便于自动化与 debug）

建议输出：

- `rootXpath`
- `confidence`
- `evidence`：
  - anchors 命中统计（按类型）
  - candidateStats（coverage/linkDensity/interactiveDensity/textLen）
  - 可选 imageChecks（遮挡/弹窗/正文可见）
- `nextAction?`：需要继续采集/滚动/截图时的指令

