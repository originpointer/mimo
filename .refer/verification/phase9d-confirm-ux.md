# Phase 9-D：确认体验增强（通知合并/可解释/降级）

> 目标：在不依赖 popup 可被程序唤起的前提下，把确认交互做到“可解释、少打扰、可回归”。主入口仍为 `chrome.notifications` 按钮。

## 现状

- 扩展已使用 `chrome.notifications` 创建 Approve/Reject 通知，并用 `notificationId` 映射 actionKey。
- popup 用于查看 pending/历史，并提供 Test Notification。

## 目标与范围（MVP）

- **通知去重/合并**：同一 `taskId:actionId` 不重复弹多条；重试只更新通知内容（可选）。
- **通知内容可解释**：标题/内容显示：站点、动作、risk、reason。
- **降级策略明确**：
  - `perm!=granted`：在回调错误 message 中提示“打开扩展确认/系统设置开启通知”。
  - 系统不展示通知：popup 仍能看到 pending 并手动 Approve。
- **可跳转回放（可选）**：通知点击可打开 `replayUrl`（需要把 replayUrl 写入 pending）。

## 建议实现

- 修改：`extension/background.js`
  - 维护 `actionKey -> notificationId` 映射（已有稳定 id）
  - 若 pending 已存在且通知已发：使用 `chrome.notifications.update`（可选）
  - 在 pending.request 中补充 `replayUrl`（由服务端传入或由 verify 页拼接）
- 修改：`extension/popup.js`
  - 展示 reason/risk 更清晰；提供“一键打开 replay”按钮（可选）

## 验收标准

- 连续触发同一 action 的 CONFIRMATION_REQUIRED，不会刷屏。
- Approve/Reject 能可靠写入 store，且通知会被清理。
- `perm!=granted` 时 verify 页能明确提示用户去系统设置打开 Chrome 通知。

## 回归点

- 不改变“只有 Input.* 才强制确认”的原则（避免对纯读操作过度打扰）。
