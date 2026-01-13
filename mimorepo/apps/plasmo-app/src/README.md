# Stagehand XPath（仅 CDP 版本）

本 app 已精简为**只保留通过 CDP（`chrome.debugger`）扫描页面并构建 XPath** 的能力。

## 核心入口

- **Background**: `src/background/index.ts`
  - 监听 `STAGEHAND_XPATH_SCAN`
  - attach 到目标 tab 并通过 CDP 扫描主 frame + iframe（含 OOPIF）
  - 输出 `StagehandXPathItem[]`

- **UI（Tab Page）**: `src/tabs/stagehand-xpath.tsx`
  - 选择目标 tab
  - 发送 `STAGEHAND_XPATH_SCAN` 到 background，并展示结果

## 输出格式

类型定义见：`src/types/stagehand-xpath.ts`

## 开发

```bash
pnpm dev
pnpm build
pnpm package
```
