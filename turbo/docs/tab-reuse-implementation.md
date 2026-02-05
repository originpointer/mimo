# Tab 复用与上下文感知 Tool 暴露实现文档

## 概述

本文档描述了 Mimo 浏览器自动化系统中的 Tab 复用功能实现。该功能确保当任务已有 tabId 时，系统会复用现有 tab 进行导航，而不是创建新的 tab。

---

## 需求

1. **Tab 复用** - 当 Tab Group 已存在（任务已有 `tabId`）但 URL 发生变更时，直接在现有 tab 上导航
2. **上下文感知 Tool 暴露** - 当 `tabId` 存在时，不向 LLM 暴露 task_start 工具，只暴露 tab 操作和页面操作工具

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    orchestrator.ts                          │
│                                                              │
│  用户消息 → intent analysis → 判断 task.tabId 是否存在        │
│                                                              │
│     ┌──────────────────┐      ┌──────────────────┐        │
│     │   无 tabId       │      │   有 tabId       │        │
│     │  (新建任务)       │      │  (继续任务)       │        │
│     └────────┬─────────┘      └────────┬─────────┘        │
│              │                         │                   │
│              ▼                         ▼                   │
│     preparePage()              navigateToUrl()            │
│   (创建新 tab + group)        (在现有 tab 上导航)           │
│              │                         │                   │
│              ▼                         ▼                   │
│   getTaskCreationTools()    getTabOperationTools()        │
│   (暴露创建任务工具)          (暴露 tab 操作工具)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 涉及文件

| 文件 | 修改内容 |
|------|----------|
| `apps/mimocrx/src/background/index.ts` | 添加 `browser_navigate` 动作处理 |
| `server/agent/tool-runner.ts` | 添加 `navigateToUrl()` 方法 |
| `server/agent/orchestrator.ts` | 拆分 `getBrowserTools()` 为两个方法，修改主流程实现 tab 复用逻辑 |
| `server/stores/taskStore.ts` | 修复 `upsertTask()` 字段保留逻辑 |

---

## 关键实现细节

### 1. mimocrx - browser_navigate 动作

**文件**: `apps/mimocrx/src/background/index.ts`

```typescript
if (name === "browser_navigate") {
  const tabId = (params as any)?.tabId as number;
  const url = (params as any)?.url as string;

  if (!tabId || !url) {
    throw new Error("INVALID_PARAMS: tabId and url are required");
  }

  // 使用 chrome.tabs.update 在现有 tab 上导航
  await new Promise<void>((resolve, reject) => {
    chrome.tabs.update(tabId, { url }, (tab) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      if (!tab) return reject(new Error("Tab not found"));
      resolve();
    });
  });

  lastResult = { navigated: true, tabId, url };
  continue;
}
```

### 2. tool-runner - navigateToUrl 方法

**文件**: `server/agent/tool-runner.ts`

```typescript
async navigateToUrl(params: {
  taskId: string;
  clientId: string;
  tabId: number;
  url: string;
  baseUrl: string;
}): Promise<PageContext> {
  const { taskId, clientId, tabId, url, baseUrl } = params;

  // 1. 更新任务 URL
  await upsertTask(taskId, { currentUrl: url });

  // 2. 在现有 tab 上导航
  await this.runBrowserAction({
    taskId, clientId,
    action: { browser_navigate: { tabId, url } },
    execTimeoutMs: 30_000,
  });

  // 3. 等待页面加载
  // 4. 截图
  // 5. 提取可读内容

  return { tabId, screenshotUrl, readability };
}
```

### 3. orchestrator - 上下文感知 Tool 暴露

**文件**: `server/agent/orchestrator.ts`

```typescript
// 任务创建时的工具集（新建 tab）
private getTaskCreationTools() {
  return [
    {
      name: "browser_navigate",
      description: "导航到指定 URL（会创建新的浏览器标签页）",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
  ];
}

// Tab 操作工具集（复用已有 tab）
private getTabOperationTools() {
  return [
    { name: "browser_navigate", description: "在当前页面导航到新 URL", ... },
    { name: "browser_click", description: "点击页面上的元素", ... },
    { name: "browser_type", description: "在输入框中输入文本", ... },
    { name: "browser_screenshot", description: "获取当前页面截图", ... },
    { name: "browser_readability", description: "提取当前页面的主要文本内容", ... },
  ];
}

// LLM 调用时根据是否有 tabId 选择工具集
const hasExistingTab = !!updatedTask?.tabId;
tools: isBrowserRequired
  ? (hasExistingTab ? this.getTabOperationTools() : this.getTaskCreationTools())
  : undefined,
```

### 4. taskStore - 修复字段保留逻辑

**文件**: `server/stores/taskStore.ts`

**问题**: 原始实现使用 `...update` 覆盖，导致 `tabId`, `groupId`, `windowId`, `debuggerAttached` 在部分更新时丢失。

**修复**:
```typescript
export async function upsertTask(taskId: string, update: Partial<TaskRecord>): Promise<TaskRecord> {
  const existing = await storage.getItem<TaskRecord>(keyByTaskId(taskId));

  const next: TaskRecord = {
    taskId,
    title: update.title ?? existing?.title ?? "新任务",
    status: update.status ?? existing?.status ?? "created",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    // 使用 ?? 保留现有值或使用新值
    selectedClientId: update.selectedClientId ?? existing?.selectedClientId,
    currentUrl: update.currentUrl ?? existing?.currentUrl,
    tabId: update.tabId ?? existing?.tabId,
    groupId: update.groupId ?? existing?.groupId,
    windowId: update.windowId ?? existing?.windowId,
    debuggerAttached: update.debuggerAttached ?? existing?.debuggerAttached,
  };

  await storage.setItem(keyByTaskId(taskId), next);
  return next;
}
```

---

## 验证日志

修复后的日志显示功能正常工作：

```json
// 第一次请求 - 创建新 tab
{"type":"task_start_result","tabId":412519569,"groupId":947335390}
{"type":"orchestrator_preparePage","updatedTask":{"tabId":412519569,"groupId":947335390,"debuggerAttached":true}}
{"type":"task_status_changed","status":"ongoing","hasTabGroup":true}

// 第二次请求 - 复用现有 tab
{"type":"tab_navigated","tabId":412519569,"url":"https://www.google.com"}
{"type":"tab_reused","tabId":412519569,"url":"https://www.google.com"}
{"type":"task_status_changed","status":"ongoing","hasTabGroup":true}

// 第三次请求 - 继续复用
{"type":"tab_navigated","tabId":412519569,"url":"https://www.liepin.com"}
{"type":"tab_reused","tabId":412519569,"url":"https://www.liepin.com"}
```

---

## 边界情况处理

| 场景 | 处理方式 |
|------|----------|
| Tab 已关闭 | 捕获错误，清除无效 tabId，降级到创建新 tab |
| URL 为空 | 使用 `task.currentUrl` 或 `about:blank` |
| Client 不可用 | 自动选择其他可用 client 或报错 |
| 状态不一致 | 重新从 taskStore 读取最新状态 |

---

## 相关文档

- [Debugger Attach/Detach 实现](./debugger-implementation.md)
- [Task Store 设计](./task-store-design.md)
- [Mimo 协议规范](./mimo-protocol-spec.md)
