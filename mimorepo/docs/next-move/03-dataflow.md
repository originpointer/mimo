# 03 三端数据流转（插件 + next-app + nitro-app）

本篇用“数据流 + 时序图”把整个产品闭环说清楚：谁在何时产出什么数据、写到哪里、如何回放与自愈。

## 1) 关键参与者
- **Next 工具页**：`mimorepo/apps/next-app/app/tools/page.tsx`
- **插件 Background**：`mimorepo/apps/plasmo-app/src/background/index.ts`
- **Nitro API**：`mimorepo/apps/nitro-app/server/routes/api/*`
- **WorkflowCache Store**：`mimorepo/apps/nitro-app/server/stores/workflowCacheStore.ts`

## 2) 总览：一张图看全链路
```mermaid
flowchart TD
  subgraph Next[next-app]
    UI[Tools_UI]
  end

  subgraph Ext[plasmo-app]
    BG[StagehandXPathManager]
    Tools[CDP_Tools_scan_extract_validate_screenshot]
  end

  subgraph Nitro[nitro-app]
    Parse[resume_parse]
    Feedback[resume_feedback]
    Cache[workflow_cache_get_put_patch]
    ToolReq[tool_call_request]
    ToolRes[tool_call_result]
    WS[tool_call_ws]
  end

  UI -->|chrome.runtime.sendMessage| BG
  BG --> Tools

  UI -->|HTTP| Parse
  UI -->|HTTP| Feedback
  UI -->|HTTP| Cache
  UI -->|HTTP| ToolReq
  BG -->|HTTP| ToolRes
  ToolRes --> WS
  WS -->|WebSocket| UI
```

## 3) 基础链路：扩展注册与选择
目的：next-app 需要知道要发消息给哪个 `extensionId`。

```mermaid
sequenceDiagram
  participant ExtBG as Plasmo_BG
  participant Nitro as Nitro_API
  participant NextUI as Next_Tools_UI

  ExtBG->>Nitro: POST /api/extension/extension-id {extensionId, extensionName}
  NextUI->>Nitro: GET /api/extension/extension-list
  Nitro-->>NextUI: {extensions[], latest}
```

## 4) 主流程：从页面生成 JSON Resume XPath（PickXPath 优先）
现状实现的“能跑通闭环”基本已经存在于 `Tools` 页面：

```mermaid
sequenceDiagram
  participant NextUI as Next_Tools_UI
  participant ExtBG as Plasmo_BG
  participant Nitro as Nitro_API

  Note over NextUI: 1) 采集 blocks+candidates
  NextUI->>ExtBG: RESUME_BLOCKS_EXTRACT {targetTabId?, options...}
  ExtBG-->>NextUI: {ok:true, page, blocks, candidates?, mainContainer?, meta}

  Note over NextUI: 2) LLM 选择 XPath（强约束：必须来自 candidates）
  NextUI->>Nitro: POST /api/resume/parse {sample}
  Nitro-->>NextUI: {ok:true, sampleId, jsonResumeXPath, meta}

  Note over NextUI: 3) 插件端客观验证（最终真相）
  NextUI->>ExtBG: RESUME_XPATH_VALIDATE {targetTabId?, xpaths[]}
  ExtBG-->>NextUI: {ok:true, results[], meta}

  Note over NextUI: 4) 回传反馈（离线评估）
  NextUI->>Nitro: POST /api/resume/feedback {sampleId, feedback}
  Nitro-->>NextUI: {ok:true}
```

### 4.1 关键数据资产
- **sample（用于 LLM）**：`page + candidates + mainContainer?`（当前 prompt 只取 candidates 前 400）
- **validation（用于质量评估）**：字段级 `matchedCount/firstTextSnippet`

## 5) Tool-call 截图链路（异步：请求→执行→回传→ws）
用途：把截图当成“后台异步工具”，并支持 UI 实时展示结果。

```mermaid
sequenceDiagram
  participant NextUI as Next_Tools_UI
  participant Nitro as Nitro_API
  participant ExtBG as Plasmo_BG
  participant WS as Nitro_WS

  NextUI->>Nitro: POST /api/tool-call/request {extensionId, toolType:"viewportScreenshot", targetTabId?}
  Nitro-->>NextUI: {taskId, instruction:{type:"STAGEHAND_VIEWPORT_SCREENSHOT", payload:{taskId,targetTabId?}}}

  NextUI->>ExtBG: STAGEHAND_VIEWPORT_SCREENSHOT {taskId,targetTabId?}
  ExtBG->>Nitro: POST /api/tool-call/result {taskId, ok, dataUrl/base64/meta}
  Nitro->>WS: broadcast tool-call:result {taskId, ok, imageUrl, meta}
  WS-->>NextUI: tool-call:result
```

**注意**：Nitro 在 `tool-call/result` 会把 base64 落盘到 uploads 并返回 `imageUrl`，避免在 cache/反馈里存大字段。

## 6) WorkflowCache：回放 → 验证 → 自愈 → patch（产品关键闭环）
将 Stagehand v3 的“cache replay + self-heal refresh”迁移到 XPath 任务：\n
**cache 命中不等于成功**，必须再验证；若验证失败必须自愈并 patch 刷新 entry。

```mermaid
sequenceDiagram
  participant NextUI as Next_Tools_UI
  participant Nitro as Nitro_API
  participant ExtBG as Plasmo_BG

  Note over NextUI: 1) 查询 cache
  NextUI->>Nitro: POST /api/workflow-cache/get {extensionId, key}
  Nitro-->>NextUI: {ok:true, hit:true, entry} or {hit:false}

  alt cache_hit
    Note over NextUI: 2) 回放仍需验证
    NextUI->>ExtBG: RESUME_XPATH_VALIDATE {xpaths: flatten(entry.xpaths)}
    ExtBG-->>NextUI: {ok:true, results[]}

    alt validate_ok
      Note over NextUI: 3) 刷新 entry（可选）
      NextUI->>Nitro: POST /api/workflow-cache/patch {extensionId, key, patch:{updatedAt, history, qualityScore}}
      Nitro-->>NextUI: {ok:true}
    else validate_fail
      Note over NextUI: 3) 自愈：重采集→LLM→再验证
      NextUI->>ExtBG: RESUME_BLOCKS_EXTRACT
      ExtBG-->>NextUI: blocks+candidates
      NextUI->>Nitro: POST /api/resume/parse
      Nitro-->>NextUI: jsonResumeXPath
      NextUI->>ExtBG: RESUME_XPATH_VALIDATE
      ExtBG-->>NextUI: results
      NextUI->>Nitro: POST /api/workflow-cache/patch {xpaths, validation, history, updatedAt}
      Nitro-->>NextUI: {ok:true}
    end
  else cache_miss
    Note over NextUI: 走主流程生成并 put
  end
```

## 7) “数据落盘点”一览（用于回归与评估）
- Nitro `sampleStore`：\n
  - `resume/parse` 会落 `sample.json / parse.json / events.jsonl`\n
  - `resume/feedback` 会落 `feedback-<ts>.json / events.jsonl`\n
  - `workflow-cache/put|patch` 会落 `workflow-cache/<cacheId>/...` 与 `events.jsonl`
- Nitro `storage(data)`：WorkflowCache Entry（`workflow-cache:${extensionId}:${cacheId}`）

