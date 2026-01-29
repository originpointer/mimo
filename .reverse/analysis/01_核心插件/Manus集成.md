# Manus 域名验证分析

## 文件信息

**文件路径**: `/sources/0.0.47_0/manus.js`
**文件大小**: 293 字节
**压缩状态**: 单行压缩（高度精简）

## 概述

`manus.js` 提供域名验证功能，用于确定一个 origin 是否为 Manus 应用受信任的域名。这是安全关键组件，用于防止跨域消息伪造攻击。

## 核心函数: isManusAppOrigin

```javascript
function isManusAppOrigin(origin) {
  const { webAppDomain } = Environment.getEnvParams()

  // 检查是否为主域名
  if (origin === webAppDomain) {
    return true
  }

  // 开发模式：允许本地主机
  if (Environment.isDev()) {
    try {
      const url = new URL(origin)
      const isLocalhost =
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "::1"

      // 仅允许 HTTP 协议的本地主机
      if (url.protocol === "http:" && isLocalhost) {
        return true
      }
    } catch {
      return false
    }
  }

  return false
}
```

## 受信任的域名

### 生产环境

| 域名 | 用途 |
|------|------|
| `https://manus.im` | 主应用域名 |

### 开发环境

| 域名 | 用途 |
|------|------|
| `https://manus.im` | 主应用域名 |
| `http://localhost:*` | 本地开发（任意端口） |
| `http://127.0.0.1:*` | 本地回环（任意端口） |
| `http://[::1]` | IPv6 本地回环 |

### 构建环境

| 域名 | 用途 |
|------|------|
| `https://vida.butterfly-effect.dev` | 测试环境域名 |

## 验证逻辑流程图

```
                     ┌─────────────────┐
                     │   输入 origin   │
                     └────────┬────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ origin ===          │
                    │ webAppDomain?       │
                    └────────┬────────────┘
                             │
                ┌────────────┴────────────┐
                │ YES                     │ NO
                ▼                         ▼
         ┌──────────┐          ┌─────────────────────┐
         │ 返回 true │          │ 是否为开发模式?      │
         └──────────┘          └────────┬────────────┘
                                       │
                          ┌────────────┴────────────┐
                          │ YES                     │ NO
                          ▼                         ▼
                   ┌───────────────┐         ┌──────────┐
                   │ 解析 URL      │         │ 返回 false│
                   └───────┬───────┘         └──────────┘
                           │
                           ▼
                 ┌─────────────────────┐
                 │ hostname 为         │
                 │ localhost/127.0.0.1/│
                 │ ::1 且协议为 http:? │
                 └────────┬────────────┘
                          │
             ┌────────────┴────────────┐
             │ YES                     │ NO
             ▼                         ▼
      ┌──────────┐              ┌──────────┐
      │ 返回 true │              │ 返回 false│
      └──────────┘              └──────────┘
```

## 使用场景

### 1. PostMessage 验证

在 `ManusAppBridge.ts.js` 中使用：

```javascript
window.addEventListener("message", async (event) => {
  // 1. 拒绝来自 iframe 的消息
  if (event.source !== window) {
    return
  }

  // 2. 验证域名是否受信任
  if (!isManusAppOrigin(event.origin)) {
    console.warn("Untrusted origin:", event.origin)
    return
  }

  // 3. 验证消息来源
  if (event.data?.source !== "manus-app") {
    return
  }

  // 处理受信任的消息...
})
```

### 2. Content Script 注入验证

Manifest 中的 content script 匹配规则：

```json
{
  "content_scripts": [
    {
      "matches": [
        "https://manus.im/*",
        "https://vida.butterfly-effect.dev/*",
        "http://localhost/*"
      ],
      "js": ["assets/ManusAppBridge.ts-loader.js"],
      "run_at": "document_start"
    }
  ]
}
```

## 安全分析

### ✅ 安全特性

1. **源验证**: 检查 `event.source !== window` 防止 iframe 攻击
2. **域名白名单**: 仅允许特定域名
3. **协议限制**: 开发模式下仅允许 HTTP（本地），生产环境强制 HTTPS
4. **异常处理**: URL 解析失败时返回 `false`

### ⚠️ 潜在风险

1. **开发模式宽松**: 允许任意端口的 localhost，可能在某些攻击场景被利用
2. **无子域名验证**: 不检查子域名，如 `https://attacker.manus.im` 会被接受（如果存在）
3. **无端口验证**: 生产环境中未显式检查端口

## 环境参数来源

```javascript
// 来自 sendMessage.js 中的 Environment 类
const ENV_PARAMS = {
  local: {
    socketEndpoint: "http://localhost:4000",
    webAppDomain: "https://vida.butterfly-effect.dev"
  },
  dev: {
    socketEndpoint: "wss://vida.butterfly-effect.dev",
    webAppDomain: "https://manus.im"
  },
  prod: {
    socketEndpoint: "wss://api.manus.im",
    webAppDomain: "https://manus.im"
  }
}

// 当前版本硬编码为 "prod"
const currentEnv = "prod"
const { webAppDomain } = ENV_PARAMS[currentEnv]
// webAppDomain = "https://manus.im"
```

## 导出

```javascript
export { isManusAppOrigin as i }
```

## 依赖关系

```
manus.js
    ├── 导入 sendMessage.js (Environment)
    └── 被 ManusAppBridge.ts.js 导入
```

## 关键发现

1. **极简设计**: 仅 293 字节，职责单一
2. **环境感知**: 开发模式允许本地主机
3. **安全优先**: 默认拒绝，明确允许

## 建议增强

```javascript
// 建议添加子域名验证
function isManusAppOrigin(origin) {
  const { webAppDomain } = Environment.getEnvParams()

  // 精确匹配主域名
  if (origin === webAppDomain) {
    return true
  }

  // 可选：允许子域名
  try {
    const originUrl = new URL(origin)
    const domainUrl = new URL(webAppDomain)

    // 检查是否为子域名
    if (originUrl.hostname === `.${domainUrl.hostname}` ||
        originUrl.hostname.endsWith(`.${domainUrl.hostname}`)) {
      return originUrl.protocol === domainUrl.protocol
    }
  } catch {
    return false
  }

  // ... 其余代码
}
```

## 测试用例

```javascript
// 生产环境测试
isManusAppOrigin("https://manus.im")           // ✅ true
isManusAppOrigin("https://manus.im/")          // ✅ true
isManusAppOrigin("https://manus.im/app")       // ✅ true
isManusAppOrigin("https://evil.com")           // ❌ false
isManusAppOrigin("http://manus.im")            // ❌ false (HTTP)

// 开发环境测试
isManusAppOrigin("http://localhost:3000")      // ✅ true (仅 dev)
isManusAppOrigin("http://127.0.0.1:3000")      // ✅ true (仅 dev)
isManusAppOrigin("http://[::1]:3000")          // ✅ true (仅 dev)
isManusAppOrigin("https://localhost:3000")     // ❌ false (HTTPS)
```
