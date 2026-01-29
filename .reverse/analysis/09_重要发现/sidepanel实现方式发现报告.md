# Sidepanel 实现方式发现报告

## 发现概述

在验证 Manus 浏览器插件的实际运行时行为时，发现原始分析报告中关于 **sidepanel** 的描述存在重大错误。本文档记录了发现过程和最终结论。

---

## 发现时间线

### 2026-01-28: 初始问题报告

**用户反馈**: 插件在实际运行时未找到 sidepanel 的开启方式。

### 验证步骤

#### 步骤 1: 检查 manifest.json

**文件**: `.reverse/sources/0.0.47_0/manifest.json`

**关键发现**:
```json
{
  "action": {
    "default_popup": "src/popup.html",
    "default_title": "Manus Chrome Operator"
  },
  "permissions": [
    "tabs", "tabGroups", "storage", "debugger", "cookies", "scripting"
  ]
}
```

- ❌ **没有** `side_panel` 权限
- ❌ **没有** `side_panel` 配置项
- ❌ **没有** 使用 Chrome Extension Manifest V3 的 side_panel API

#### 步骤 2: 检查 sidepanel.html 文件

**文件**: `.reverse/sources/0.0.47_0/src/sidepanel.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Manus Chrome Operator</title>
    <script type="module" crossorigin src="/sidepanel.html.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

**发现**: 这只是一个普通的 HTML 页面，不是通过 Chrome sidePanel API 打开的。

#### 步骤 3: 检查 typeGuards.js

**文件**: `.reverse/sources/0.0.47_0/typeGuards.js`

```javascript
function e(o){
  return s=>{
    if(!s||typeof s!="object")return!1;
    const n=s;
    return n.source===o&&typeof n.type=="string"
  }
}
const t=e("sidepanel"),     // isSidepanelMessage
      a=e("content"),       // isContentMessage
      u=e("popup"),         // isPopupMessage
      c=e("background"),    // isBackgroundMessage
      p=e("manus-app");     // isManusAppMessage
```

**发现**: "sidepanel" 只是一个**消息来源标识符**，用于区分消息来自哪个上下文。

#### 步骤 4: 分析 ManusAppHandler

**文件**: `.reverse/sources/0.0.47_0/background.ts.js`

```javascript
const Wn=["https://manus.im","https://vida.butterfly-effect.dev"];
const qn=r=>Wn.includes(r)||r.startsWith("http://localhost")||r.startsWith("http://127.0.0.1");

class Vn { // ManusAppHandler
  async handle(e,t) {
    if(!dn(e)) throw new Error("Invalid message type for ManusAppHandler");
    const n=t.url;
    // ... 验证来源
    switch(e.type) {
      case "my-browser/ping":
      case "my-browser/switch-to-tab":
      case "my-browser/set-browser-settings":
        // ...
    }
  }
}
```

**发现**: ManusAppHandler 专门处理来自 `manus.im` 网站的消息，消息来源标识为 `"manus-app"`。

#### 步骤 5: 分析 ManusAppBridge

**文件**: `.reverse/sources/0.0.47_0/ManusAppBridge.ts.js`

```javascript
import{i as a}from"./manus.js";  // isManusAppOrigin

const t="manus-app";

window.addEventListener("message",async s=>{
  if(s.source!==window)return;
  if(!a(s.origin)){  // 验证域名
    return;
  }
  const r=s.data;
  if(!r||r.source!==t) return;  // 检查消息来源

  try{
    const e=await i(r);  // 发送到 background
    window.postMessage(e,"*")
  }catch(e){
    // ...
  }
})
```

**发现**: ManusAppBridge 是注入到 manus.im 页面的 content script，用于：
1. 接收来自页面的 `window.postMessage`
2. 验证消息来源
3. 转发到 background worker

---

## 最终结论

### 实际架构

```
┌─────────────────────────────────────────────────────────────┐
│                  https://manus.im 网站页面                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            React UI 组件 (之前称为 "sidepanel")        │    │
│  │                                                      │    │
│  │  - 任务控制                                           │    │
│  │  - 状态显示                                           │    │
│  │  - 会话管理                                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          │ window.postMessage                │
│                          │ (source: "manus-app")             │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              ManusAppBridge.ts (Content Script)              │
│                   注入到 manus.im 页面                        │
│                                                              │
│  - 验证消息来源域名                                           │
│  - 转发消息到 background                                     │
└──────────────────────────┼───────────────────────────────────┘
                           │ chrome.runtime.sendMessage
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Background Worker (Service Worker)              │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ ManusAppHandler  │  │ ContentHandler   │                 │
│  │ (处理网站消息)    │  │ (处理页面消息)    │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### 消息来源对比

| 消息来源 | 实际位置 | 处理器 | 通信方式 |
|---------|---------|--------|---------|
| `"sidepanel"` | **不存在** (历史遗留?) | N/A | N/A |
| `"manus-app"` | **manus.im 网站页面** | ManusAppHandler | window.postMessage → ManusAppBridge → chrome.runtime |
| `"content"` | 注入到所有网页 | ContentHandler | chrome.tabs.sendMessage |
| `"popup"` | src/popup.html | PopupHandler | chrome.runtime.sendMessage |
| `"background"` | Service Worker | N/A | N/A |

### 关键发现

1. **sidepanel.html 文件存在但未被使用**
   - 文件位于 `src/sidepanel.html`
   - 但 manifest.json 中没有配置任何方式打开它
   - 可能是早期开发的遗留文件

2. **实际 UI 在 manus.im 网站上**
   - 用户访问 `https://manus.im/my-browser` 或类似路径
   - 页面包含 React UI 组件
   - 通过 ManusAppBridge 与扩展通信

3. **没有使用 Chrome 原生 sidePanel API**
   - Chrome 114+ 引入的 `chrome.sidePanel` API 未被使用
   - 没有 `side_panel` 权限
   - 不是真正的浏览器侧边栏

---

## 错误来源分析

原始分析报告中错误的根本原因：

1. **看到 "sidepanel" 消息来源就假设是扩展的 sidepanel 组件**
   - 没有验证 manifest.json 配置
   - 没有追踪实际的消息流

2. **没有区分文件名和功能**
   - `sidepanel.html.js` 文件存在
   - 但实际上只是打包产物，未被使用

3. **混淆了概念**
   - "sidepanel" 作为消息标识 ≠ Chrome Extension sidePanel API
   - UI 位于网站 ≠ 扩展独立页面

---

## 正确的架构描述

```
┌────────────────────────────────────────────────────────────────┐
│                    Manus AI 浏览器自动化系统                      │
└────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐         ┌──────────────────────┐
    │  https://manus.im    │         │   任意网页 (Wikipedia) │
    │                      │         │                      │
    │  ┌────────────────┐  │         │  ┌────────────────┐  │
    │  │   React UI     │  │         │  │ Content Script │  │
    │  │   (任务控制)    │  │         │  │ (DOM交互/截图) │  │
    │  └────────┬───────┘  │         │  └───────┬────────┘  │
    └───────────┼──────────┘         └──────────┼────────────┘
                │                              │
                │ window.postMessage           │ chrome.tabs
                │ (source: "manus-app")        │ (source: "content")
                │                              │
                ▼                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │                  Background Worker                       │
    │  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
    │  │ManusAppHandler│  │ContentHandler │  │SessionManager│ │
    │  │(处理网站消息)  │  │(处理页面消息)  │  │ (会话管理)   │ │
    │  └───────────────┘  └───────────────┘  └─────────────┘ │
    │  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
    │  │  CdpClient    │  │  AuthHelper   │  │  TabManager  │ │
    │  │  (CDP/截图)   │  │  (Cookie同步) │  │ (标签管理)   │ │
    │  └───────────────┘  └───────────────┘  └─────────────┘ │
    └─────────────────────────────────────────────────────────┘
                │
                │ chrome.debugger.sendCommand
                │
                ▼
    ┌─────────────────────────────────────────────────────────┐
    │                  Chrome DevTools Protocol                │
    │                 (截图、DOM操作、页面控制)                  │
    └─────────────────────────────────────────────────────────┘
```

---

## 修正建议

所有分析文档中关于 sidepanel 的描述需要修正：

### 需要修正的文档

1. `Manus浏览器插件逆向实现分析报告.md`
2. `analysis/00_概述/总结报告.md`
3. `analysis/00_概述/消息类型分类.md`
4. `analysis/02_后台工作器/架构分析.md`
5. `analysis/01_核心插件/类型守卫.md`
6. `analysis/01_核心插件/消息传递机制.md`

### 修正内容

| 原描述 | 修正为 |
|--------|--------|
| `Sidepanel (React)` | `Manus.im 网站 React UI` |
| `chrome.runtime.sendMessage` | `window.postMessage → ManusAppBridge → chrome.runtime.sendMessage` |
| 作为扩展的侧边栏 UI | 作为网站页面的 UI 组件 |
| `source: "sidepanel"` | `source: "manus-app"` |

---

## 附录: 文件清单

### 实际使用的文件

| 文件 | 用途 |
|------|------|
| `src/popup.html` | 扩展图标点击弹窗 |
| `ManusAppBridge.ts.js` | 注入到 manus.im 的桥接脚本 |
| `background.ts.js` | 后台服务工作器 |
| `content.ts.js` | 注入到所有网页的内容脚本 |

### 未使用的文件

| 文件 | 状态 |
|------|------|
| `src/sidepanel.html` | ❌ 未被使用 |
| `sidepanel.html.js` | ❌ 未被使用 |
| `assets/sidepanel.css` | ❌ 未被使用 |

---

**文档创建时间**: 2026-01-28
**发现者**: Claude Code
**版本**: 1.0
