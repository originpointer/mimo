# Manus Browser Operator 扩展实现 BUA 能力的深度分析报告

**作者**: Manus AI
**日期**: 2026年1月29日

## 摘要

本报告详细分析了 Manus 的 **My Browser** 连接器中 **BUA (Browser Use Agent)** 能力的实现方式，特别是其核心组件 **Manus Browser Operator** 浏览器扩展的技术细节和业务流程。该扩展将用户的本地浏览器转化为一个**远程控制终端**，通过 **WebSocket** 建立控制平面，并利用 **Chrome Debugger API** 实现高精度、高权限的浏览器操作。这种架构使得 Manus Agent 能够安全、高效地在用户已认证的私有环境中执行复杂的、多步骤的网页任务，是 BUA 范式在商业化和工程化上的一个重要突破 [1]。

## 1. 业务流程分析：BUA 的“感知-思考-行动”闭环

Manus 的 BUA 能力通过 Browser Operator 扩展实现了一个跨越云端和本地的**分布式 Agent 闭环**。

### 1.1. 业务价值：继承用户身份

Manus BUA 的首要业务价值在于其能够**继承用户在本地浏览器中的身份和会话**。传统的服务器端自动化（如 Playwright）需要处理复杂的登录、验证码和双因素认证。而 Manus Browser Operator 扩展运行在用户已登录的浏览器中，自动继承了所有 Cookie 和 LocalStorage，从而能够直接在用户已认证的平台（如 CRM 系统、企业邮箱、SaaS 工具）上执行任务。这使得 Manus Agent 的能力从公共网页扩展到了用户的私有工作流。

### 1.2. 业务执行全流程

BUA 的任务执行是一个迭代的、持续的“感知-思考-行动”循环，其中云端 Agent 负责“思考”，本地扩展负责“感知”和“行动”。

| 步骤 | 业务过程 | 核心技术细节 | 责任方 |
| :--- | :--- | :--- | :--- |
| **1. 初始化** | 用户激活 My Browser 连接器，扩展建立持久连接。 | 扩展向 `wss://api.manus.im` 建立 **WebSocket** 连接，作为实时控制平面。 | 扩展端 |
| **2. 感知 (Perception)** | Agent 需要了解当前页面状态以规划下一步。 | 扩展注入脚本进行 **DOM 抽象**，提取可交互元素列表；捕获当前视口**截图**；使用 `Readability.js` 和 `Turndown.js` 提取和转换页面内容。 | 扩展端 |
| **3. 数据回传** | 将感知到的状态安全地传输给云端 LLM。 | 结构化数据和截图通过 **预签名 URL** (Pre-signed URLs) 上传至云端存储，并通知云端 Agent 数据就绪。 | 扩展端 |
| **4. 思考 (Reasoning)** | 云端 LLM 根据任务目标、历史记录和多模态输入（文本 + 标注截图）做出决策。 | 云端 LLM 解析输入，输出一个**函数调用**指令（例如：`click(index=5)`）。 | 云端 Agent |
| **5. 行动 (Action)** | 云端将决策指令实时发送给本地扩展。 | 云端通过 **WebSocket** 发送指令。扩展接收指令，并利用 **Chrome Debugger API** 在本地浏览器中执行操作。 | 扩展端 |
| **6. 观察与循环** | 页面状态更新，Agent 验证操作结果。 | 扩展等待页面稳定，然后循环回到步骤 2，重新“感知”新的页面状态。 | 扩展端/云端 |

## 2. 技术细节深度解析：Browser Operator 的核心机制

Manus Browser Operator 扩展的技术实现是其 BUA 能力得以高效运行的关键。

### 2.1. 远程控制与通信机制

该扩展的核心是其**双向实时通信**能力：

*   **控制平面 (WebSocket)**：扩展与 Manus 后端之间维护一个持久的 WebSocket 连接。所有来自云端的控制指令（如导航、点击、输入）都通过这个通道实时下发。这种机制确保了低延迟的交互，是实现闭环 Agent 循环的基础。
*   **数据平面 (Pre-signed URLs)**：为了避免 WebSocket 传输大文件（如高分辨率截图）的压力，扩展将截图和提取的页面内容上传到云端存储服务，并使用预签名 URL 机制确保上传的安全性和时效性。

### 2.2. 权限与操作的“原子化”

Browser Operator 扩展申请了极高的权限，这是其实现 BUA 能力的基石 [2]：

| 权限名称 | 技术作用 | BUA 实现中的角色 |
| :--- | :--- | :--- |
| **`<all_urls>`** | 允许扩展在用户访问的任何网页上注入脚本和执行操作。 | 确保 Agent 可以在任何网站上执行任务。 |
| **`debugger`** | 允许扩展使用 Chrome Debugger API，对浏览器进行底层控制。 | **实现高精度操作**。通过模拟底层的鼠标事件和键盘事件，绕过许多前端框架的事件监听，使操作行为与真实用户无异。 |
| **`cookies`** | 允许扩展读取和设置 Cookie。 | **实现身份继承**。确保 Agent 能够利用用户已登录的会话。 |
| **`scripting`** | 允许扩展注入内容脚本。 | **实现 DOM 抽象**。用于注入 JS 脚本来提取、过滤和简化 DOM 元素。 |

### 2.3. 页面状态的“翻译”与回传

为了让 LLM 能够理解复杂的网页，扩展在本地完成了关键的“翻译”工作：

1.  **DOM 抽象**：通过注入的脚本，扩展将数千个 DOM 节点简化为几十个带有索引的交互元素列表。
2.  **内容提炼**：使用 **Readability.js** 剔除页面上的广告、导航栏等干扰信息，聚焦于核心内容。
3.  **格式转换**：使用 **Turndown.js** 将提炼后的 HTML 转换为结构化的 Markdown 格式，这种格式更适合 LLM 进行文本分析和推理。

## 3. 总结

Manus Browser Operator 扩展是 Manus BUA 能力的**本地执行引擎**。它通过结合 **WebSocket 远程控制**、**Chrome Debugger API** 的底层操作能力以及 **DOM 抽象**的预处理机制，成功地将 BUA 范式从理论和实验室环境带入了用户的真实、私有工作环境。这种实现方式不仅解决了传统自动化工具在身份认证和环境模拟上的难题，也为 AI Agent 提供了最高效、最可靠的网页交互能力。

---
## 参考文献

[1] Manus.im. *Introducing Manus Browser Operator*. Available at: [https://manus.im/blog/manus-browser-operator](https://manus.im/blog/manus-browser-operator)
[2] Mindgard.ai. *Manus Rubra: The Browser Extension With Its Hand in Everything*. Available at: [https://mindgard.ai/blog/manus-rubra-full-browser-remote-control](https://mindgard.ai/blog/manus-rubra-full-browser-remote-control)
