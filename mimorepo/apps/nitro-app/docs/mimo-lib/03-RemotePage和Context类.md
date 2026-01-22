# RemotePage 和 MimoContext 类详细文档

## 概述

RemotePage 和 MimoContext 是 Mimo Library 中的远程代理类。Mimo 运行在 Nitro 服务器中，不直接控制浏览器，而是通过 Socket.IO 将指令发送到插件端执行，然后接收执行结果。

**位置**: `@mimo/lib/page` 和 `@mimo/lib/context`

**架构图**:

```
┌─────────────────────────────────────────────────────────────────┐
│                       Nitro Server (Mimo)                        │
│                                                                   │
│  代码                                                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ const page = mimo.page;                                    │ │
│  │ await page.goto("https://example.com");                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  RemotePage (远程代理)                        │ │
│  │  所有方法调用都转换为 MimoBus.send() 指令                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Socket.IO
┌─────────────────────────────────────────────────────────────────┐
│                       Next App → Extension                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 接收指令，转发到插件端                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Chrome Extension API
┌─────────────────────────────────────────────────────────────────┐
│                    Plasmo App (插件端)                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  const stagehand = new Stagehand(...);                      │ │
│  │ await stagehand.page.goto(url);                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## RemotePage 类

远程页面代理，所有方法调用都通过 MimoBus 发送指令到插件端执行。

### 导入

```typescript
import { RemotePage } from '@mimo/lib/page';
```

### 创建 RemotePage

```typescript
// 通过 MimoContext 创建
const page = mimo.context.page();

// 通过 Mimo 获取默认页面
const page = mimo.page;

// 为特定标签页创建
const page = mimo.context.page("tab_123");
```

### 构造函数

```typescript
constructor(
  bus: MimoBus,                  // MimoBus 实例
  tabId: string,                 // 标签页 ID
  context: MimoContext           // 所属上下文
)
```

### 方法

#### 导航方法

##### goto()

导航到指定 URL。

```typescript
async goto(
  url: string,
  options?: NavigateOptions
): Promise<RemoteResponse>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `url` | `string` | 目标 URL |
| `options` | `NavigateOptions` | 导航选项 |

**NavigateOptions**:

```typescript
interface NavigateOptions {
  referer?: string;              // Referer 头
  timeout?: number;              // 超时时间（毫秒）
  waitUntil?: "load" | "domcontentloaded" | "networkidle";  // 等待状态
}
```

**返回**: `Promise<RemoteResponse>`

```typescript
interface RemoteResponse {
  success: boolean;              // 是否成功
  data?: {                      // 响应数据
    url: string;                // 最终 URL
    status: number;             // HTTP 状态码
  };
  error?: {                     // 错误信息
    code: string;
    message: string;
  };
  duration?: number;             // 执行耗时（毫秒）
}
```

**示例**:

```typescript
const response = await page.goto("https://example.com", {
  waitUntil: "networkidle",
  timeout: 30000
});

if (response.success) {
  console.log('导航成功:', response.data.url);
}
```

**内部流程**:

1. 通过 MimoBus 发送 `page.goto` 指令
2. 等待插件端执行并返回结果
3. 解析响应并返回

---

##### reload()

重新加载当前页面。

```typescript
async reload(options?: ReloadOptions): Promise<RemoteResponse>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `options` | `ReloadOptions` | 重载选项 |

**ReloadOptions**:

```typescript
interface ReloadOptions {
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
}
```

**示例**:

```typescript
await page.reload({ waitUntil: "load" });
```

---

##### goBack()

后退到上一个页面。

```typescript
async goBack(): Promise<RemoteResponse>
```

**示例**:

```typescript
await page.goBack();
```

---

##### goForward()

前进到下一个页面。

```typescript
async goForward(): Promise<RemoteResponse>
```

**示例**:

```typescript
await page.goForward();
```

---

### 信息获取方法

#### url()

获取当前页面的 URL（从缓存获取，不发送指令）。

```typescript
url(): string
```

**返回**: `string` - 当前缓存的 URL

**示例**:

```typescript
const currentUrl = page.url();
console.log('Current URL:', currentUrl);
```

---

#### getUrl()

从插件端获取当前 URL（发送指令）。

```typescript
async getUrl(): Promise<string>
```

**返回**: `Promise<string>`

**示例**:

```typescript
const url = await page.getUrl();
console.log('Current URL:', url);
```

---

#### title()

获取页面标题。

```typescript
async title(): Promise<string>
```

**返回**: `Promise<string>`

**示例**:

```typescript
const title = await page.title();
console.log('Page title:', title);
```

---

#### content()

获取页面的 HTML 内容。

```typescript
async content(): Promise<string>
```

**返回**: `Promise<string>` - HTML 内容

**示例**:

```typescript
const html = await page.content();
console.log('HTML length:', html.length);
```

---

### 交互方法

#### click()

点击元素。

```typescript
async click(
  selector: string,
  options?: ClickOptions
): Promise<RemoteResponse>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `selector` | `string` | CSS 选择器或 XPath |
| `options` | `ClickOptions` | 点击选项 |

**ClickOptions**:

```typescript
interface ClickOptions {
  button?: "left" | "right" | "middle";  // 鼠标按钮
  clickCount?: number;           // 点击次数
  delay?: number;                 // 每次点击间隔（毫秒）
  modifiers?: {
    alt?: boolean;
    control?: boolean;
    meta?: boolean;
    shift?: boolean;
  };
}
```

**示例**:

```typescript
// 简单点击
await page.click("#submit-button");

// 带选项的点击
await page.click("#button", {
  button: "left",
  clickCount: 2,
  delay: 100
});

// Shift + 点击
await page.click("#link", {
  modifiers: { shift: true }
});
```

---

#### fill()

填充输入框。

```typescript
async fill(
  selector: string,
  value: string
): Promise<RemoteResponse>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `selector` | `string` | CSS 选择器或 XPath |
| `value` | `string` | 要填入的值 |

**示例**:

```typescript
await page.fill("#username", "john_doe");
await page.fill("#password", "secret123");
```

---

#### select()

选择下拉框选项。

```typescript
async select(
  selector: string,
  value: string
): Promise<RemoteResponse>
```

**示例**:

```typescript
await page.select("#country", "United States");
await page.select("#color", "blue");
```

---

#### hover()

悬停在元素上。

```typescript
async hover(
  selector: string
): Promise<RemoteResponse>
```

**示例**:

```typescript
await page.hover("#menu-item");
```

---

### 定位器方法

#### locator()

创建一个元素定位器。

```typescript
locator(selector: string): RemoteLocator
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `selector` | `string` | CSS 选择器 |

**返回**: `RemoteLocator`

**示例**:

```typescript
const buttonLocator = page.locator("#submit-button");
await buttonLocator.click();
```

---

#### frameLocator()

创建一个 iframe 定位器。

```typescript
frameLocator(frameSelector: string): RemoteFrameLocator
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `frameSelector` | `string` | iframe 选择器 |

**返回**: `RemoteFrameLocator`

**示例**:

```typescript
const frameLocator = page.frameLocator("#my-frame");
await frameLocator.locator("#button").click();
```

---

#### deepLocator()

创建一个跨 Shadow DOM 和 iframe 的 XPath 定位器。

```typescript
deepLocator(xpath: string): RemoteDeepLocator
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `xpath` | `string` | XPath 表达式 |

**返回**: `RemoteDeepLocator`

**示例**:

```typescript
// 定位跨 Shadow DOM 的元素
const deepLoc = page.deepLocator("/html/body/div[1]/shadow-root/div/button");
await deepLoc.click();
```

---

### 截图方法

#### screenshot()

截取页面截图。

```typescript
async screenshot(options?: ScreenshotOptions): Promise<Buffer>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `options` | `ScreenshotOptions` | 截图选项 |

**ScreenshotOptions**:

```typescript
interface ScreenshotOptions {
  path?: string;                // 保存路径
  type?: "png" | "jpeg";        // 图片类型
  quality?: number;             // JPEG 质量 (0-100)
  fullPage?: boolean;           // 是否截取整个页面
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };                            // 裁剪区域
}
```

**返回**: `Promise<Buffer>` - 图片数据

**示例**:

```typescript
// 简单截图
const buffer = await page.screenshot();

// 保存到文件
await page.screenshot({ path: "screenshot.png" });

// 全页截图
await page.screenshot({ fullPage: true });

// 裁剪截图
await page.screenshot({
  clip: { x: 0, y: 0, width: 800, height: 600 }
});
```

---

### 执行方法

#### evaluate()

在页面上下文中执行 JavaScript。

```typescript
async evaluate<T>(
  func: () => T,
  args?: any
): Promise<T>

async evaluate<T, Args extends any[]>(
  func: (...args: Args) => T,
  ...args: Args
): Promise<T>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `func` | `Function` | 要执行的函数 |
| `args` | `any[]` | 函数参数 |

**返回**: `Promise<T>` - 函数返回值

**示例**:

```typescript
// 获取页面高度
const height = await page.evaluate(() => {
  return document.body.scrollHeight;
});

// 带参数的执行
const result = await page.evaluate((a, b) => {
  return a + b;
}, 1, 2);

// 访问页面元素
const text = await page.evaluate(() => {
  return document.querySelector("#title")?.textContent;
});
```

---

### 等待方法

#### waitForSelector()

等待元素出现。

```typescript
async waitForSelector(
  selector: string,
  options?: WaitForSelectorOptions
): Promise<void>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `selector` | `string` | CSS 选择器或 XPath |
| `options` | `WaitForSelectorOptions` | 等待选项 |

**WaitForSelectorOptions**:

```typescript
interface WaitForSelectorOptions {
  timeout?: number;             // 超时时间（毫秒）
  state?: "attached" | "detached" | "visible" | "hidden";  // 等待状态
}
```

**示例**:

```typescript
// 等待元素可见
await page.waitForSelector("#result", { state: "visible" });

// 等待元素消失
await page.waitForSelector("#loading", { state: "hidden" });

// 带超时
await page.waitForSelector("#button", { timeout: 5000 });
```

---

#### waitForNavigation()

等待导航完成。

```typescript
async waitForNavigation(
  options?: WaitForNavigationOptions
): Promise<void>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `options` | `WaitForNavigationOptions` | 等待选项 |

**示例**:

```typescript
// 点击链接后等待导航
await page.click("#next-page-link");
await page.waitForNavigation({ waitUntil: "load" });
```

---

### 标记功能

#### mark()

标记元素（在页面上显示标记，用于调试）。

```typescript
async mark(
  xpath: string,
  options?: MarkOptions
): Promise<void>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `xpath` | `string` | XPath 表达式 |
| `options` | `MarkOptions` | 标记选项 |

**MarkOptions**:

```typescript
interface MarkOptions {
  contentColor?: { r: number; g: number; b: number };
  borderColor?: { r: number; g: number; b: number };
}
```

**示例**:

```typescript
await page.mark("/html/body/div[1]/button", {
  contentColor: { r: 255, g: 0, b: 0 },
  borderColor: { r: 0, g: 255, b: 0 }
});
```

---

#### unmark()

取消标记元素。

```typescript
async unmark(xpath: string): Promise<void>
```

**示例**:

```typescript
await page.unmark("/html/body/div[1]/button");
```

---

#### unmarkAll()

取消所有标记。

```typescript
async unmarkAll(): Promise<void>
```

**示例**:

```typescript
await page.unmarkAll();
```

---

### 生命周期

#### close()

关闭页面（关闭对应的标签页）。

```typescript
async close(): Promise<void>
```

**示例**:

```typescript
await page.close();
```

---

#### isClosed()

检查页面是否已关闭。

```typescript
isClosed(): boolean
```

**返回**: `boolean`

**示例**:

```typescript
if (page.isClosed()) {
  console.log('页面已关闭');
}
```

---

## RemoteLocator 类

远程元素定位器，所有操作都通过 MimoBus 发送指令。

### 创建 RemoteLocator

```typescript
const locator = page.locator("#button");
```

### 方法

#### click()

点击定位的元素。

```typescript
async click(options?: ClickOptions): Promise<RemoteResponse>
```

#### fill()

填充定位的输入框。

```typescript
async fill(value: string): Promise<RemoteResponse>
```

#### textContent()

获取元素的文本内容。

```typescript
async textContent(): Promise<string>
```

#### innerHTML()

获取元素的 HTML。

```typescript
async innerHTML(): Promise<string>
```

#### boundingBox()

获取元素的边界框。

```typescript
async boundingBox(): Promise<BoundingBox>
```

```typescript
interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

#### waitFor()

等待元素出现。

```typescript
async waitFor(options?: WaitForOptions): Promise<void>
```

#### highlight()

高亮显示元素。

```typescript
async highlight(options?: HighlightOptions): Promise<void>
```

### 示例

```typescript
const button = page.locator("#submit-button");

// 链式操作
await button.click();
const text = await button.textContent();

// 高亮并截图
await button.highlight({ duration: 5000 });
const screenshot = await button.screenshot();
```

---

## RemoteDeepLocator 类

跨 Shadow DOM 和 iframe 的深度定位器。

### 创建 RemoteDeepLocator

```typescript
const deepLocator = page.deepLocator("/html/body/div[1]/shadow-root/div/button");
```

### 方法

#### click()

点击定位的元素。

```typescript
async click(options?: ClickOptions): Promise<RemoteResponse>
```

#### fill()

填充定位的输入框。

```typescript
async fill(value: string): Promise<RemoteResponse>
```

#### mark()

标记元素。

```typescript
async mark(options?: MarkOptions): Promise<void>
```

#### unmark()

取消标记。

```typescript
async unmark(): Promise<void>
```

#### highlight()

高亮显示元素。

```typescript
async highlight(options?: HighlightOptions): Promise<void>
```

### 示例

```typescript
// 跨 Shadow DOM 定位
const button = page.deepLocator(
  "/html/body/div[1]/shadow-root/div[2]/button"
);

// 标记并点击
await button.mark({ duration: 3000 });
await button.click();
```

---

## MimoContext 类

上下文管理器，负责管理远程标签页和创建 RemotePage 实例。

### 导入

```typescript
import { MimoContext } from '@mimo/lib/context';
```

### 创建 MimoContext

```typescript
// 通过 Mimo 获取
const context = mimo.context;

// 或创建新实例
const context = new MimoContext({
  bus: mimo.bus,
  defaultTabId: "tab_123"
});
```

### 方法

#### tabs()

获取所有标签页信息。

```typescript
async tabs(): Promise<TabInfo[]>
```

**返回**: `Promise<TabInfo[]>`

```typescript
interface TabInfo {
  id: string;                      // 标签页 ID
  url: string;                     // 当前 URL
  title: string;                    // 页面标题
  active: boolean;                  // 是否为活动标签
  windowId: number;                 // 窗口 ID
}
```

**示例**:

```typescript
const tabs = await context.tabs();
console.log('标签页数量:', tabs.length);
tabs.forEach(tab => {
  console.log(`- ${tab.title}: ${tab.url}`);
});
```

---

#### activeTab()

获取当前活动标签页信息。

```typescript
async activeTab(): Promise<TabInfo>
```

**返回**: `Promise<TabInfo>`

**示例**:

```typescript
const tab = await context.activeTab();
console.log('活动标签页:', tab.url);
```

---

#### switchToTab()

切换到指定标签页。

```typescript
async switchToTab(tabId: string): Promise<void>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `tabId` | `string` | 标签页 ID |

**示例**:

```typescript
await context.switchToTab("tab_123");
```

---

#### newTab()

创建新标签页。

```typescript
async newTab(): Promise<TabInfo>
```

**返回**: `Promise<TabInfo>` - 新创建的标签页信息

**示例**:

```typescript
const newTab = await context.newTab();
console.log('新标签页 ID:', newTab.id);
```

---

#### page()

获取指定标签页的 RemotePage 代理。

```typescript
page(tabId?: string): RemotePage
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `tabId` | `string` | 标签页 ID（可选，默认使用活动标签页） |

**返回**: `RemotePage`

**示例**:

```typescript
// 获取活动标签页的页面代理
const page = context.page();

// 获取指定标签页的页面代理
const page = context.page("tab_123");
```

---

#### close()

关闭上下文，释放所有资源。

```typescript
async close(): Promise<void>
```

**示例**:

```typescript
await context.close();
```

---

## 事件监听

### 监听标签页事件

```typescript
context.on('tab.changed', (tab: TabInfo) => {
  console.log('标签页变化:', tab);
});

context.on('tab.closed', ({ tabId }: { tabId: string }) => {
  console.log('标签页关闭:', tabId);
});

context.on('tab.created', (tab: TabInfo) => {
  console.log('标签页创建:', tab);
});
```

### 监听页面事件

```typescript
context.on('page.loaded', (tabId: string) => {
  console.log('页面加载完成:', tabId);
});

context.on('page.error', (tabId: string, error: Error) => {
  console.error('页面错误:', tabId, error);
});
```

---

## 使用示例

### 多标签页操作

```typescript
// 获取所有标签页
const tabs = await mimo.context.tabs();

// 在每个标签页中执行操作
for (const tab of tabs) {
  const page = mimo.context.page(tab.id);

  if (tab.url.includes('example.com')) {
    await page.goto('https://another-site.com');
    await page.click('#accept-button');
  }
}
```

### 标签页切换

```typescript
// 获取所有标签页
const tabs = await mimo.context.tabs();

// 切换到第二个标签页
await mimo.context.switchToTab(tabs[1].id);

// 执行操作
const page = mimo.context.page();
await page.click('#button');
```

### 使用定位器

```typescript
const page = mimo.context.page();

// 简单定位器
const button = page.locator('#submit-button');
await button.click();

// iframe 定位器
const frameButton = page.frameLocator('#my-frame')
  .locator('#inner-button');
await frameButton.click();

// 深度定位器（跨 Shadow DOM）
const deepButton = page.deepLocator(
  '/html/body/div[1]/shadow-root/div/button'
);
await deepButton.click();
```

### 标记和调试

```typescript
const page = mimo.context.page();

// 标记元素
await page.mark('/html/body/div[1]/button');

// 等待查看
await new Promise(resolve => setTimeout(resolve, 5000));

// 取消标记
await page.unmark('/html/body/div[1]/button');

// 或取消所有标记
await page.unmarkAll();
```

### 截图

```typescript
const page = mimo.context.page();

// 简单截图
const buffer = await page.screenshot();

// 保存到文件
await page.screenshot({
  path: '/path/to/screenshot.png',
  fullPage: true
});

// 裁剪截图
const buffer = await page.screenshot({
  clip: { x: 0, y: 0, width: 800, height: 600 }
});
```
