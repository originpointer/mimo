# Observer 配置参数说明文档

本文档详细说明了在 `page-state-detector.ts` 中使用的所有 Observer API 的运行时配置参数和返回值字段。

## 概述

`PageStateDetector` 类使用四种浏览器原生 Observer API 来监控页面状态变化：

- **MutationObserver**: 监听 DOM 变化，判断 DOM 是否稳定
- **PerformanceObserver**: 监听性能指标，判断网络是否安静
- **ResizeObserver**: 监听元素尺寸变化，触发状态重新检查
- **IntersectionObserver**: 监听关键元素可见性，判断页面内容是否已渲染

这些 Observer 协同工作，通过多种信号综合判断页面的加载状态。

---

## 1. MutationObserver 配置与返回值

### 使用场景

在 `page-state-detector.ts` 中用于检测 DOM 变化，判断页面 DOM 是否稳定：

- 监听 `document.body` 及其子树的 DOM 变化
- 记录最后一次 DOM 变化的时间戳（`lastMutationTime`）
- 通过 `domStableThreshold` 配置判断 DOM 是否进入稳定期
- 当 DOM 在指定时间内无变化时，认为页面内容已稳定
- 用于区分 `RESOURCE_LOADING` 和 `READY` 状态

### 代码位置

```typescript:80:94:mimorepo/apps/plasmo-app/src/utils/page-state-detector.ts
private initializeMutationObserver(): void {
  this.mutationObserver = new MutationObserver(() => {
    this.lastMutationTime = Date.now();
    this.scheduleDOMStabilityCheck();
    this.checkState();
  });

  this.mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-loading', 'data-state'],
    characterData: true,
  });
}
```

### 配置参数（MutationObserverInit）

`observe()` 方法的第二个参数，用于指定要观察的变化类型：

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `childList` | `boolean` | 否 | `false` | 设置为 `true` 时，观察目标节点子节点的添加或移除（包括文本节点） |
| `subtree` | `boolean` | 否 | `false` | 设置为 `true` 时，将观察扩展到目标节点的所有后代节点 |
| `attributes` | `boolean` | 否 | `false` | 设置为 `true` 时，观察目标节点属性的变化 |
| `attributeFilter` | `string[]` | 否 | `undefined` | 要观察的属性名称数组。如果指定，则只观察列出的属性变化。需要 `attributes: true` |
| `characterData` | `boolean` | 否 | `false` | 设置为 `true` 时，观察目标节点数据的变化 |
| `attributeOldValue` | `boolean` | 否 | `false` | 设置为 `true` 时，记录属性变化前的旧值。需要 `attributes: true` |
| `characterDataOldValue` | `boolean` | 否 | `false` | 设置为 `true` 时，记录数据变化前的旧值。需要 `characterData: true` |

**重要约束**：
- 至少需要将 `childList`、`attributes` 或 `characterData` 之一设置为 `true`，否则会抛出错误

**实际配置说明**：
- `childList: true` - 监听子节点的添加和删除
- `subtree: true` - 监听整个子树的变化，而不仅仅是直接子节点
- `attributes: true` - 监听属性变化
- `attributeFilter: ['class', 'data-loading', 'data-state']` - 只监听这些特定属性的变化，减少不必要的回调
- `characterData: true` - 监听文本内容的变化

### 返回值（MutationRecord[]）

回调函数接收一个 `MutationRecord[]` 数组，每个 `MutationRecord` 对象包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `string` | 变化类型：`"childList"`（子节点变化）、`"attributes"`（属性变化）、`"characterData"`（数据变化） |
| `target` | `Node` | 发生变化的节点 |
| `addedNodes` | `NodeList` | 添加的节点列表（仅当 `type === "childList"` 时） |
| `removedNodes` | `NodeList` | 移除的节点列表（仅当 `type === "childList"` 时） |
| `previousSibling` | `Node \| null` | 被添加或移除节点的前一个兄弟节点（仅当 `type === "childList"` 时） |
| `nextSibling` | `Node \| null` | 被添加或移除节点的后一个兄弟节点（仅当 `type === "childList"` 时） |
| `attributeName` | `string \| null` | 变化的属性名称（仅当 `type === "attributes"` 时） |
| `attributeNamespace` | `string \| null` | 变化的属性命名空间（仅当 `type === "attributes"` 时） |
| `oldValue` | `string \| null` | 变化前的旧值（仅当配置了 `attributeOldValue` 或 `characterDataOldValue` 时） |

**注意**：在 `page-state-detector.ts` 中，回调函数没有使用 `MutationRecord` 的具体内容，只是记录时间戳并触发状态检查。

---

## 2. PerformanceObserver 配置与返回值

### 使用场景

在 `page-state-detector.ts` 中用于检测网络资源加载活动，判断网络是否安静：

- 监听 `resource` 和 `navigation` 类型的性能条目
- 记录最后一次网络活动的时间戳（`lastNetworkActivityTime`）
- 通过 `networkQuietThreshold` 配置判断网络是否进入安静期
- 当网络在指定时间内无新资源加载时，认为网络已安静
- 用于判断页面是否已完成资源加载，辅助判断 `READY` 状态

### 代码位置

```typescript:99:115:mimorepo/apps/plasmo-app/src/utils/page-state-detector.ts
private initializePerformanceObserver(): void {
  try {
    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource' || entry.entryType === 'navigation') {
          this.lastNetworkActivityTime = Date.now();
          this.scheduleNetworkQuietCheck();
          this.checkState();
        }
      }
    });

    this.performanceObserver.observe({ entryTypes: ['resource', 'navigation'] });
  } catch (e) {
    console.warn('PerformanceObserver not supported:', e);
  }
}
```

### 配置参数（PerformanceObserverInit）

`observe()` 方法的参数对象，用于指定要观察的性能条目类型：

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `entryTypes` | `string[]` | 是 | - | 要观察的性能条目类型数组。每个字符串代表一种性能条目类型 |

**支持的 entryTypes**（部分常用类型）：

| 类型 | 说明 |
|------|------|
| `"resource"` | 资源加载性能条目（如脚本、样式表、图片等） |
| `"navigation"` | 页面导航性能条目 |
| `"mark"` | 用户标记的性能条目 |
| `"measure"` | 用户测量的性能条目 |
| `"paint"` | 绘制性能条目（如 FCP、LCP） |
| `"largest-contentful-paint"` | 最大内容绘制（LCP） |
| `"first-input"` | 首次输入延迟（FID） |
| `"layout-shift"` | 布局偏移（CLS） |
| `"longtask"` | 长任务性能条目 |
| `"element"` | 元素性能条目 |
| `"event"` | 事件性能条目 |

**注意**：
- 不同浏览器支持的 `entryTypes` 可能不同
- 可以使用 `PerformanceObserver.supportedEntryTypes` 静态属性查询浏览器支持的条目类型
- 在 `page-state-detector.ts` 中只使用了 `"resource"` 和 `"navigation"` 两种类型

### 返回值（PerformanceObserverEntryList）

回调函数接收一个 `PerformanceObserverEntryList` 对象，包含以下方法和属性：

| 方法/属性 | 类型 | 说明 |
|-----------|------|------|
| `getEntries()` | `PerformanceEntry[]` | 返回所有性能条目的数组 |
| `getEntriesByType(type: string)` | `PerformanceEntry[]` | 返回指定类型的性能条目数组 |
| `getEntriesByName(name: string, type?: string)` | `PerformanceEntry[]` | 返回指定名称的性能条目数组 |

**PerformanceEntry 对象字段**（所有性能条目的基础字段）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 性能条目的名称 |
| `entryType` | `string` | 性能条目的类型（如 `"resource"`、`"navigation"`） |
| `startTime` | `number` | 性能条目的开始时间（相对于性能时间线的毫秒数） |
| `duration` | `number` | 性能条目的持续时间（毫秒） |

**PerformanceResourceTiming 对象字段**（`entryType === "resource"` 时）：

继承自 `PerformanceEntry`，额外包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `initiatorType` | `string` | 资源类型（如 `"script"`、`"link"`、`"img"`） |
| `fetchStart` | `number` | 开始获取资源的时间 |
| `domainLookupStart` | `number` | 开始 DNS 查询的时间 |
| `domainLookupEnd` | `number` | DNS 查询结束的时间 |
| `connectStart` | `number` | 开始建立连接的时间 |
| `connectEnd` | `number` | 连接建立完成的时间 |
| `requestStart` | `number` | 开始发送请求的时间 |
| `responseStart` | `number` | 开始接收响应的时间 |
| `responseEnd` | `number` | 响应接收完成的时间 |
| `transferSize` | `number` | 传输的字节数 |
| `encodedBodySize` | `number` | 编码后的响应体大小 |
| `decodedBodySize` | `number` | 解码后的响应体大小 |

**PerformanceNavigationTiming 对象字段**（`entryType === "navigation"` 时）：

继承自 `PerformanceResourceTiming`，额外包含页面导航相关的详细时间信息。

---

## 3. ResizeObserver 配置与返回值

### 使用场景

在 `page-state-detector.ts` 中用于检测页面尺寸变化，触发状态重新检查：

- 监听 `document.body` 的尺寸变化
- 当页面尺寸发生变化时，可能意味着内容布局发生变化
- 触发 `checkState()` 重新评估页面状态
- 用于处理响应式布局变化或动态内容加载导致的尺寸变化场景

### 代码位置

```typescript:120:130:mimorepo/apps/plasmo-app/src/utils/page-state-detector.ts
private initializeResizeObserver(): void {
  try {
    this.resizeObserver = new ResizeObserver(() => {
      this.checkState();
    });

    this.resizeObserver.observe(document.body);
  } catch (e) {
    console.warn('ResizeObserver not supported:', e);
  }
}
```

### 配置参数（ResizeObserverOptions）

`observe()` 方法的第二个参数（可选），用于指定观察的盒模型：

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `box` | `"content-box" \| "border-box" \| "device-pixel-content-box"` | 否 | `"content-box"` | 指定要观察的盒模型类型 |

**box 值说明**：

| 值 | 说明 |
|----|------|
| `"content-box"` | 观察内容区域的大小（CSS 定义的内容区域） |
| `"border-box"` | 观察边框区域的大小（CSS 定义的边框区域，包括 padding 和 border） |
| `"device-pixel-content-box"` | 观察设备像素单位的内容区域大小（在应用任何 CSS 变换之前） |

**注意**：
- 在 `page-state-detector.ts` 中没有传递配置参数，使用默认的 `"content-box"`
- `device-pixel-content-box` 是较新的特性，浏览器支持可能有限

### 返回值（ResizeObserverEntry[]）

回调函数接收一个 `ResizeObserverEntry[]` 数组，每个 `ResizeObserverEntry` 对象包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `target` | `Element` | 被观察的元素 |
| `contentRect` | `DOMRectReadOnly` | 元素内容区域的矩形信息（已废弃，但部分浏览器仍支持） |
| `borderBoxSize` | `ResizeObserverSize[]` | 边框盒的尺寸信息数组（每个元素代表一个片段，用于处理分片布局） |
| `contentBoxSize` | `ResizeObserverSize[]` | 内容盒的尺寸信息数组 |
| `devicePixelContentBoxSize` | `ResizeObserverSize[]` | 设备像素内容盒的尺寸信息数组 |

**ResizeObserverSize 对象字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `inlineSize` | `number` | 内联方向的尺寸（水平方向为宽度，垂直方向为高度） |
| `blockSize` | `number` | 块方向的尺寸（水平方向为高度，垂直方向为宽度） |

**注意**：
- `borderBoxSize`、`contentBoxSize` 和 `devicePixelContentBoxSize` 都是数组，因为元素可能被分片（fragmented）
- 在大多数情况下，数组只包含一个元素
- `contentRect` 属性已被废弃，建议使用 `contentBoxSize` 替代

---

## 4. IntersectionObserver 配置与返回值

### 使用场景

在 `page-state-detector.ts` 中用于检测关键元素的可见性，判断页面内容是否已渲染：

- 监听配置的关键元素选择器（`keyElementSelectors`）对应的元素
- 当关键元素进入视口或可见性发生变化时，触发状态检查
- 用于判断页面主要内容是否已加载并可见
- 配合 `checkKeyElements()` 方法判断页面是否包含预期的关键内容
- 用于区分页面是否真正完成内容加载（`READY` 状态）

### 代码位置

```typescript:135:151:mimorepo/apps/plasmo-app/src/utils/page-state-detector.ts
private initializeIntersectionObserver(): void {
  try {
    this.intersectionObserver = new IntersectionObserver(() => {
      this.checkState();
    });

    // 观察关键元素
    this.config.keyElementSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        this.intersectionObserver?.observe(el);
      });
    });
  } catch (e) {
    console.warn('IntersectionObserver not supported:', e);
  }
}
```

### 配置参数（IntersectionObserverInit）

构造函数的第二个参数（可选），用于配置观察器的行为：

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `root` | `Element \| Document \| null` | 否 | `null` | 用作视口的根元素。`null` 表示使用浏览器视口 |
| `rootMargin` | `string` | 否 | `"0px 0px 0px 0px"` | 应用到根元素边界框的边距，类似 CSS margin 语法（如 `"10px 20px 30px 40px"`） |
| `threshold` | `number \| number[]` | 否 | `0` | 触发回调的可见性阈值。`0` 表示元素一像素可见即触发，`1` 表示元素完全可见才触发。可以是数组，在多个阈值处触发 |
| `trackVisibility` | `boolean` | 否 | `false` | 是否跟踪元素的实际可见性（考虑透明度、visibility 等）。实验性特性，浏览器支持可能有限 |
| `delay` | `number` | 否 | `0` | 通知之间的最小延迟（毫秒）。当 `trackVisibility` 为 `true` 时，最小值为 `100` |
| `scrollMargin` | `string` | 否 | `"0px 0px 0px 0px"` | 计算交叉时添加到每个滚动容器的偏移量，语法同 `rootMargin` |

**重要说明**：
- 在 `page-state-detector.ts` 中没有传递配置参数，使用所有默认值
- `root: null` 表示使用浏览器视口作为根
- `threshold: 0` 表示元素一进入视口就触发回调
- `rootMargin` 可以用于提前或延迟触发回调（如 `"100px"` 表示元素距离视口 100px 时就触发）

### 返回值（IntersectionObserverEntry[]）

回调函数接收一个 `IntersectionObserverEntry[]` 数组，每个 `IntersectionObserverEntry` 对象包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `target` | `Element` | 被观察的元素 |
| `time` | `number` | 交叉变化发生的时间（相对于文档创建时间的毫秒数） |
| `rootBounds` | `DOMRectReadOnly \| null` | 根元素的边界矩形。如果根为 `null`，则为视口的边界矩形 |
| `boundingClientRect` | `DOMRectReadOnly` | 目标元素的边界矩形 |
| `intersectionRect` | `DOMRectReadOnly` | 目标元素与根元素（或视口）的交叉区域矩形 |
| `intersectionRatio` | `number` | 交叉比例，范围 0.0 到 1.0，表示目标元素与根元素（或视口）的交叉区域占目标元素的比例 |
| `isIntersecting` | `boolean` | 目标元素是否与根元素（或视口）交叉 |
| `isVisible` | `boolean` | 目标元素是否可见（仅当 `trackVisibility: true` 时可用） |

**DOMRectReadOnly 对象字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `x` | `number` | 矩形左上角的 x 坐标 |
| `y` | `number` | 矩形左上角的 y 坐标 |
| `width` | `number` | 矩形的宽度 |
| `height` | `number` | 矩形的高度 |
| `top` | `number` | 矩形顶部边缘的 y 坐标 |
| `right` | `number` | 矩形右侧边缘的 x 坐标 |
| `bottom` | `number` | 矩形底部边缘的 y 坐标 |
| `left` | `number` | 矩形左侧边缘的 x 坐标 |

**注意**：
- `intersectionRatio` 和 `isIntersecting` 是最常用的字段
- `isVisible` 需要 `trackVisibility: true` 才能使用，且浏览器支持可能有限
- 在 `page-state-detector.ts` 中，回调函数没有使用这些字段的具体值，只是触发状态检查

---

## 5. Observer 协同工作流程

多个 Observer 协同工作来判断页面状态，工作流程如下：

### 状态判断逻辑

```typescript:194:228:mimorepo/apps/plasmo-app/src/utils/page-state-detector.ts
private checkState(): void {
  const readyState = document.readyState;
  const hasKeyElements = this.checkKeyElements();
  const hasLoadingIndicators = this.checkLoadingIndicators();
  const networkQuiet = this.checkNetworkQuiet();
  const domStable = this.checkDOMStability();
  const resourcesLoaded = this.checkResourcesLoaded();

  let newState: PageLoadState;

  if (readyState === 'loading') {
    newState = PageLoadState.DOM_LOADING;
  } else if (readyState === 'interactive') {
    if (resourcesLoaded && domStable && !hasLoadingIndicators) {
      newState = this.isSPA ? PageLoadState.CONTENT_STABILIZING : PageLoadState.DOM_READY;
    } else {
      newState = PageLoadState.RESOURCE_LOADING;
    }
  } else if (readyState === 'complete') {
    if (hasKeyElements && !hasLoadingIndicators && networkQuiet && domStable) {
      newState = PageLoadState.READY;
    } else if (this.isSPA && !domStable) {
      newState = PageLoadState.CONTENT_STABILIZING;
    } else {
      newState = PageLoadState.RESOURCE_LOADING;
    }
  } else {
    newState = this.currentState;
  }

  if (newState !== this.currentState) {
    this.currentState = newState;
    this.notifyStateChangeDebounced();
  }
}
```

### 各 Observer 的职责

1. **MutationObserver**
   - 检测 DOM 变化，更新 `lastMutationTime`
   - 通过 `checkDOMStability()` 判断 DOM 是否稳定（`domStable`）

2. **PerformanceObserver**
   - 检测网络资源加载，更新 `lastNetworkActivityTime`
   - 通过 `checkNetworkQuiet()` 判断网络是否安静（`networkQuiet`）

3. **ResizeObserver**
   - 检测页面尺寸变化
   - 触发 `checkState()` 重新评估状态

4. **IntersectionObserver**
   - 检测关键元素可见性变化
   - 触发 `checkState()` 重新评估状态
   - 配合 `checkKeyElements()` 判断关键元素是否存在（`hasKeyElements`）

### 状态转换条件

- **READY 状态**需要同时满足：
  - `hasKeyElements === true`（关键元素存在且可见）
  - `hasLoadingIndicators === false`（无加载指示器）
  - `networkQuiet === true`（网络安静，由 PerformanceObserver 判断）
  - `domStable === true`（DOM 稳定，由 MutationObserver 判断）
  - `readyState === 'complete'`（文档加载完成）

---

## 6. 配置参数总结

### ObserverConfig 接口

`PageStateDetector` 使用的配置接口：

```typescript
interface ObserverConfig {
  /** DOM 稳定期阈值（毫秒） */
  domStableThreshold?: number;        // 默认: 500
  /** 网络安静期阈值（毫秒） */
  networkQuietThreshold?: number;       // 默认: 500
  /** 状态更新防抖时间（毫秒） */
  debounceTime?: number;               // 默认: 300
  /** 超时时间（毫秒） */
  timeout?: number;                    // 默认: 30000
  /** 关键元素选择器 */
  keyElementSelectors?: string[];      // 默认: ['main', '[role="main"]', '.main-content', '#main-content']
  /** 加载指示器选择器 */
  loadingIndicatorSelectors?: string[]; // 默认: ['[class*="loading"]', '[class*="spinner"]', ...]
}
```

### 默认配置

```typescript:71:84:mimorepo/apps/plasmo-app/src/types/page-state.ts
export const DEFAULT_CONFIG: Required<ObserverConfig> = {
  domStableThreshold: 500,
  networkQuietThreshold: 500,
  debounceTime: 300,
  timeout: 30000,
  keyElementSelectors: ['main', '[role="main"]', '.main-content', '#main-content'],
  loadingIndicatorSelectors: [
    '[class*="loading"]',
    '[class*="spinner"]',
    '[class*="skeleton"]',
    '[class*="loader"]',
    '[data-loading="true"]',
  ],
};
```

---

## 7. 最佳实践建议

### MutationObserver

- 使用 `attributeFilter` 限制观察的属性，减少不必要的回调
- 根据实际需求选择是否启用 `subtree`（启用会增加性能开销）
- 在不需要时及时调用 `disconnect()` 断开观察

### PerformanceObserver

- 使用 `PerformanceObserver.supportedEntryTypes` 检查浏览器支持
- 只观察需要的 `entryTypes`，避免不必要的性能开销
- 注意处理浏览器不支持的情况（使用 try-catch）

### ResizeObserver

- 对于简单场景，可以不传递配置参数，使用默认值
- 如果需要精确控制，可以指定 `box` 参数
- 注意 `device-pixel-content-box` 的浏览器兼容性

### IntersectionObserver

- 使用 `rootMargin` 可以提前或延迟触发回调
- 合理设置 `threshold` 数组，避免过于频繁的回调
- 对于需要精确可见性检测的场景，可以考虑启用 `trackVisibility`（注意浏览器支持）

### 通用建议

- 所有 Observer 都应该在组件销毁时调用 `disconnect()` 清理资源
- 使用防抖（debounce）机制避免过于频繁的状态更新
- 合理设置阈值时间，平衡响应速度和准确性

---

## 参考资源

- [MDN - MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [MDN - PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- [MDN - ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [MDN - IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)
- [W3C - MutationObserver](https://www.w3.org/TR/dom/#mutationobserver)
- [W3C - Intersection Observer](https://www.w3.org/TR/intersection-observer/)
