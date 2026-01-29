# Chrome 异步封装分析

## 文件信息

**文件路径**: `/sources/0.0.47_0/chromeAsync.js`
**文件大小**: 2.7KB
**压缩状态**: 单行压缩（可读）

## 概述

`chromeAsync.js` 提供基于 Promise 的 Chrome API 封装，包括：
1. 标签页管理（创建、更新、移动）
2. 标签页组管理（创建、更新、移动）
3. 页面尺寸检测
4. 浏览器客户端 ID 生成

## 存储键前缀生成

```javascript
function getStorageKey(name) {
  const env = Environment.getEnv() === "prod" ? "prod" : "dev"
  return `manus.${env}.${name}`
}
```

**示例**:
- 生产环境: `manus.prod.browser_client_id`
- 开发环境: `manus.dev.browser_client_id`

## 标签页管理 API

### 1. 创建标签页

```javascript
async function createTab(options) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(options, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(tab)
    })
  })
}
```

**选项**:
```javascript
{
  url: "https://example.com",
  active: true,           // 是否激活
  pinned: false,          // 是否固定
  index: 0,               // 位置索引
  windowId: 123           // 目标窗口 ID
}
```

### 2. 更新标签页

```javascript
async function updateTab(tabId, options) {
  return new Promise((resolve, reject) => {
    chrome.tabs.update(tabId, {
      ...options,
      autoDiscardable: false  // 防止标签页被自动丢弃
    }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(tab ?? undefined)
    })
  })
}
```

**用途**:
- 更新 URL
- 激活/停用标签页
- 修改标签页标题
- 防止自动丢弃（保持会话活动）

### 3. 获取标签页

```javascript
async function getTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(tab)
    })
  })
}
```

### 4. 移动标签页

```javascript
async function moveTabs(tabIds, options) {
  return new Promise((resolve, reject) => {
    chrome.tabs.move(tabIds, options, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(Array.isArray(tabs) ? tabs[0] : tabs)
    })
  })
}
```

**选项**:
```javascript
{
  index: 0,              // 目标位置
  windowId: 123          // 目标窗口
}
```

## 缩放管理

### 获取缩放比例

```javascript
async function getZoom(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.getZoom(tabId, (zoomFactor) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(zoomFactor)
    })
  })
}
```

### 设置缩放比例

```javascript
async function setZoom(tabId, zoomFactor) {
  return new Promise((resolve, reject) => {
    chrome.tabs.setZoom(tabId, zoomFactor, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve()
    })
  })
}
```

### 重置缩放为 100%

```javascript
async function ensureZoom(tabId) {
  const currentZoom = await getZoom(tabId)
  const isNotDefault = Math.abs(currentZoom - 1) > 0.01

  if (isNotDefault) {
    await setZoom(tabId, 1)
    return true  // 已重置
  }

  return false  // 无需重置
}
```

**用途**: 在截图或自动化操作前，确保页面缩放为 100% 以保持一致性。

## 标签页组管理

### 1. 创建标签页组

```javascript
async function groupTabs(options) {
  return new Promise((resolve, reject) => {
    chrome.tabs.group(options, (groupId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(groupId)
    })
  })
}
```

**选项**:
```javascript
{
  tabIds: [1, 2, 3],     // 标签页 ID 数组
  groupId: chrome.tabGroups.TAB_GROUP_ID_NONE  // 或现有组 ID
}
```

### 2. 更新标签页组

```javascript
async function updateTabGroup(groupId, options) {
  return new Promise((resolve, reject) => {
    chrome.tabGroups.update(groupId, options, (group) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(group)
    })
  })
}
```

**选项**:
```javascript
{
  title: "任务名称",      // 组标题
  color: "blue",         // 颜色: grey, blue, red, yellow, green, pink, purple, cyan
  collapsed: false       // 是否折叠
}
```

### 3. 获取标签页组

```javascript
async function getTabGroup(groupId) {
  return new Promise((resolve, reject) => {
    chrome.tabGroups.get(groupId, (group) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(group)
    })
  })
}
```

### 4. 移动标签页组

```javascript
async function moveTabGroup(groupId, options) {
  return new Promise((resolve, reject) => {
    chrome.tabGroups.move(groupId, options, (group) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(group)
    })
  })
}
```

**选项**:
```javascript
{
  index: 0              // 目标位置索引
}
```

## 页面尺寸检测

```javascript
async function getPageDimensions(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const width = window.innerWidth
        const height = window.innerHeight
        const scrollY = window.scrollY
        const documentHeight = document.documentElement.scrollHeight

        return {
          width,
          height,
          devicePixelRatio: window.devicePixelRatio || 1,
          pixelsAbove: Math.round(scrollY),
          pixelsBelow: Math.max(0, Math.round(documentHeight - scrollY - height))
        }
      }
    })

    const result = results?.[0]?.result

    if (result && typeof result.width === 'number' && typeof result.height === 'number') {
      return {
        width: Math.max(1, Math.round(result.width)),
        height: Math.max(1, Math.round(result.height)),
        devicePixelRatio: result.devicePixelRatio || 1,
        pixelsAbove: result.pixelsAbove ?? 0,
        pixelsBelow: result.pixelsBelow ?? 0
      }
    }

    return null
  } catch {
    return null
  }
}
```

**返回值**:
```javascript
{
  width: 1280,              // 视口宽度（像素）
  height: 720,              // 视口高度（像素）
  devicePixelRatio: 2,      // 设备像素比
  pixelsAbove: 0,           // 顶部滚动像素
  pixelsBelow: 500          // 底部剩余可滚动像素
}
```

**用途**:
- 计算元素可见性
- 确定截图尺寸
- 检测页面是否可滚动

## 浏览器客户端 ID

```javascript
async function generateClientId() {
  const storageKey = getStorageKey("browser_client_id")
  const data = await chrome.storage.local.get(storageKey)
  const existingId = data[storageKey]

  if (existingId && typeof existingId === "string") {
    return existingId
  }

  // 生成新的持久化 ID
  const newId = crypto.randomUUID()
  await chrome.storage.local.set({ [storageKey]: newId })
  return newId
}
```

**用途**:
- 为浏览器实例生成唯一标识符
- 用于跨会话识别同一浏览器
- 支持多浏览器管理

## API 导出

| 导出名称 | 原始名称 | 功能 |
|---------|---------|------|
| `c` | `createTab` | 创建标签页 |
| `i` | `updateTab` | 更新标签页 |
| `a` | `getTab` | 获取标签页 |
| `m` | `moveTabs` | 移动标签页 |
| `h` | `ensureZoom` | 重置缩放为 100% |
| `d` | `groupTabs` | 创建标签页组 |
| `u` | `updateTabGroup` | 更新标签页组 |
| `b` | `getTabGroup` | 获取标签页组 |
| `e` | `moveTabGroup` | 移动标签页组 |
| `f` | `getPageDimensions` | 获取页面尺寸 |
| `g` | `generateClientId` | 生成/获取客户端 ID |

## 关键发现

1. **防丢弃机制**: 更新标签页时自动设置 `autoDiscardable: false`
2. **缩放重置**: 提供 `ensureZoom` 确保缩放为 100%
3. **页面注入**: `getPageDimensions` 使用 `chrome.scripting.executeScript` 注入代码
4. **UUID 持久化**: 客户端 ID 使用 `crypto.randomUUID()` 并持久化存储

## 使用示例

```javascript
// 创建新标签页
const tab = await createTab({ url: "https://example.com", active: true })

// 重置缩放
await ensureZoom(tab.id)

// 获取页面尺寸
const dims = await getPageDimensions(tab.id)
console.log(`${dims.width}x${dims.height}`)

// 创建标签页组
const groupId = await groupTabs({ tabIds: [tab.id] })
await updateTabGroup(groupId, { title: "研究任务", color: "blue" })

// 获取浏览器 ID
const clientId = await generateClientId()
```

## 依赖关系

```
chromeAsync.js
    ├── 导入 sendMessage.js (Environment)
    └── 被 background.ts.js 导入
        ├── SessionManager (标签页组管理)
        └── CdpClient (页面尺寸检测)
```
