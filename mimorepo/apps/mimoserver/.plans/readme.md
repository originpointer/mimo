当用户使用浏览器插件进行浏览器控制时，server 端需要对浏览器的实时状态有一个清晰的建模。

## 浏览器插件 MV3 可监控的实时信息

### 标签页状态

**监控 API**: `chrome.tabs`, `chrome.windows`

| 信息 | 说明 |
|------|------|
| `tabId` | 标签页唯一标识符 |
| `windowId` | 所属窗口 ID |
| `url` | 当前页面 URL |
| `title` | 页面标题 |
| `favIconUrl` | 网站 favicon URL |
| `status` | 加载状态：`loading` / `complete` |
| `active` | 是否为当前激活标签 |
| `pinned` | 是否固定 |
| `hidden` | 是否隐藏 |
| `index` | 标签在窗口中的位置 |
| `openerTabId` | 打开此标签的源标签 ID |

**事件监听**:
- `chrome.tabs.onCreated` - 标签创建
- `chrome.tabs.onUpdated` - 标签更新（URL、标题、状态变化）
- `chrome.tabs.onActivated` - 标签切换
- `chrome.tabs.onRemoved` - 标签关闭
- `chrome.windows.onCreated` / `onRemoved` - 窗口变化
