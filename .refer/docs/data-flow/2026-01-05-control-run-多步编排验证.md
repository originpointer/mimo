# 2026-01-05 控制端多步编排（/control/run）验证记录

## 验证目标

验证“控制端编排骨架”是否满足预期：

- 能顺序下发多个 step（每步一个 `commandId`）
- 每步等待扩展 `POST /control/callback` 回传后再推进下一步
- 两步都成功时，在 Nitro 终端看到对应的两条 `[control.callback] ...` 日志

## 验证前置

- Nitro 已启动（`pnpm dev`）
- Chrome 已加载本仓库 MV3 扩展（`extension/`）
- WebApp 中转页可用：`/control/webapp`（SSE 订阅 + 转发）

## 执行方式

### 方式 A：WebApp 一键验证（推荐）

1. 打开 `/control/webapp`
2. 点击 **Connect SSE**
3. 点击 **Test run (2 steps)**

该按钮会调用：

- `POST /control/run`

并下发两个 step：

1. `Runtime.evaluate`（`1+1`，`returnByValue:true`）
2. `Page.getFrameTree`

## 期望现象（Pass 条件）

- Nitro 终端出现 **两条** `[control.callback] ...`
- 两条回传满足：
  - `status:"ok"`
  - `tabId` 一致（同一个 tab 上顺序执行）
  - 第一条 `method:"Runtime.evaluate"` 且 `value:2`
  - 第二条 `method:"Page.getFrameTree"` 且返回中包含当前页面 url（例如 `.../control/webapp`）

## 实际观测（样例日志）

> 来自 Nitro 终端（两步回传，顺序完成）：

1) Step1：Runtime.evaluate

```json
{
  "type": "control.callback",
  "commandId": "cmd_cbe3a0d0a3603f19a9b4c40e",
  "traceId": "tr_ae55e3b8be10b30e36c5d833",
  "status": "ok",
  "result": {
    "kind": "cdp.send",
    "tabId": 829137749,
    "method": "Runtime.evaluate",
    "response": { "result": { "type": "number", "value": 2 } }
  }
}
```

2) Step2：Page.getFrameTree

```json
{
  "type": "control.callback",
  "commandId": "cmd_ada6c84c49584ca15d744ec0",
  "traceId": "tr_64c3f87afd51f008ccd9450c",
  "status": "ok",
  "result": {
    "kind": "cdp.send",
    "tabId": 829137749,
    "method": "Page.getFrameTree",
    "response": {
      "frameTree": {
        "frame": {
          "url": "http://localhost:3000/control/webapp"
        }
      }
    }
  }
}
```

## 结论

验证通过：当前控制端已具备 “多步顺序编排 + callback 驱动推进” 的最小骨架能力，可作为后续 Stagehand 真调度的运行时地基。

## 下一步建议

- 用 `verification/verification-plugin-minset.md` 的 Tier1 清单，批量验证更多 CDP methods（建议走 `/control/enqueue-batch`）。
- 尽快进入 Tier2：补齐扩展侧 `onEvent + sessionId multiplexer`，否则 Stagehand Understudy 的 iframe/OOPIF/事件等待会成为返工点。




