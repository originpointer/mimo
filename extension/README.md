# Mimo Control Driver（MV3 扩展）

## 作用

- 接收 WebApp 通过 `chrome.runtime.sendMessage`（external messaging）转发的命令
- 对命令 `jws` 做 **ES256 + JWKS** 验签
- 用 `chrome.debugger` 执行最小 CDP 调用（attach/sendCommand/detach）
- 把结果/遥测通过 **HTTP** 回传给控制端服务（`reply.url`）

## 关键配置

- `manifest.json`
  - `permissions`: `debugger`, `storage`
  - `externally_connectable.matches`: 允许 WebApp origin（目前默认允许 localhost + https://*/*，后续应收紧）
  - `host_permissions`: 允许扩展 `fetch` 到控制端（目前默认较宽，后续应收紧）

## 加载方式（开发）

1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 加载已解压的扩展程序，选择本目录 `extension/`


