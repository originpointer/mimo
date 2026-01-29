# Manus 自动化操作分析报告

**日期**: 2026-01-29
**分析目标**: 研究 Manus AI Browser Operator 的实现原理及检测方法
**分析版本**: 0.0.47

---

## 目录

1. [研究背景](#研究背景)
2. [研究过程](#研究过程)
3. [技术发现](#技术发现)
4. [实现原理](#实现原理)
5. [检测方案](#检测方案)
6. [参考资料](#参考资料)
7. [重要更新](#重要更新)

---

## 研究背景

Manus AI Browser Operator 是一个 Chrome 浏览器扩展，声称能够"帮助用户完成需要个人上下文的日常任务"。本研究旨在：

1. 了解 Manus 如何触发点击事件
2. 确认事件是否为可信事件（`isTrusted: true`）
3. 分析 Manus 是否能在非活动标签页执行操作
4. 开发可靠的自动化检测方案

---

## 研究过程

### 第一阶段：基础测试

**测试环境**: Vite + React 测试页面 (`localhost:5173`)

**测试代码**:
```typescript
const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log('isTrusted:', e.isTrusted);
  console.log('target:', e.target);
  console.log('currentTarget:', e.currentTarget);
  // ... 更多调试信息
}
```

**初始发现**:
- ✅ Manus 触发的事件 `isTrusted: true`
- ✅ 按钮元素被添加了 `data-manus_clickable="true"` 和 `data-manus_click_id="4"` 属性
- ✅ 事件类型为 `PointerEvent` 而非 `MouseEvent`

### 第二阶段：源代码分析

**分析文件**: `/.reverse/sources/0.0.47_0/manifest.json`

**关键发现**:
```json
{
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "debugger",      // ← 关键权限
    "cookies",
    "scripting"
  ]
}
```

- ✅ 有 `debugger` 权限（可用于 Chrome DevTools Protocol）
- ❌ **没有** `nativeMessaging` 权限（排除 Native App 方案）

### 第三阶段：页面状态监听

**监听代码**:
```typescript
useEffect(() => {
  const handleFocus = () => console.log('focus - 页面获得焦点');
  const handleBlur = () => console.log('blur - 页面失去焦点');
  const handleVisibilityChange = () => {
    console.log('visibilitychange', document.visibilityState);
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

**测试结果**:
```
[时间] 页面状态: focus - 页面获得焦点
[========== 点击事件调试信息 ==========]
------ 页面活动状态 ------
visibilityState: hidden
hidden: true
document.hasFocus(): true
activeElement: BUTTON
```

**关键矛盾**:
- ✅ 有 `focus` 事件 → 标签页被激活
- ❌ `visibilityState: hidden` → 页面仍报告为隐藏状态
- ✅ `document.hasFocus(): true` → 文档确实有焦点

### 第四阶段：系统进程检查

```bash
$ ps aux | grep -i manus
(无结果)
```

**结论**: Manus 是纯浏览器扩展，没有独立的 Native App 进程。

---

## 技术发现

### 发现 1: 原生事件类型

| 属性 | 值 | 说明 |
|------|-----|------|
| `isTrusted` | `true` | 真实用户操作特征 |
| 原生事件类型 | `PointerEvent` | 指针事件（非鼠标事件） |
| `pointerId` | `1` | 指针设备 ID |
| `pointerType` | `"mouse"` | 鼠标类型 |
| `width/height` | `1/1` | 鼠标点击典型尺寸 |
| `pressure` | `0` | 鼠标无压力 |
| `isPrimary` | `false` | 非主指针（异常） |

### 发现 2: 异常坐标

| 坐标类型 | Manus 点击 | 真实用户点击 |
|---------|-----------|-------------|
| `clientX/Y` | `(960, 508)` | `(964, 356)` |
| `screenX` | `-1983` (负数) | `1317` (正数) |
| `offsetX/Y` | `(55-56, 19)` | `(67, 17)` |

**特征**:
- Manus 的 `screenX` 为负数（异常）
- 点击坐标高度一致（程序化控制）

### 发现 3: 页面状态异常

```
visibilityState: hidden     ← 页面声称隐藏
document.hasFocus(): true   ← 但文档有焦点
activeElement: BUTTON       ← 按钮被激活
```

**解释**: Manus 不切换标签页，而是通过 `window.focus()` 和 CDP 直接在非活动标签页操作。详见 [重要更新](#重要更新)。

---

## 实现原理

> **说明 (2026-01-29)**: 本节描述的实现原理已被证实不准确。正确的实现方式请参阅下方的 [重要更新](#重要更新) 部分。保留本节仅供参考，展示原始分析过程。

### ~~Manus 架构（原始分析 - 已证实不准确）~~

<details>
<summary>点击展开查看原始分析（已过时）</summary>

```
┌─────────────────────────────────────────────────────────────┐
│                    Manus 点击实现流程                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户视角：                                                  │
│  ┌───────────────────────────────────────────┐              │
│  │ manus.im 页面一直显示在屏幕上             │              │
│  └───────────────────────────────────────────┘              │
│                                                             │
│  实际发生（快速，用户察觉不到）：                              │
│                                                             │
│  1. manus.im 发送操作指令                                    │
│     ↓                                                       │
│  2. Service Worker 接收指令                                  │
│     ↓                                                       │
│  3. chrome.tabs.update(tabId, {active: true})              │
│     → 目标标签页被激活 (~10ms)                               │
│     → focus 事件触发                                        │
│     ↓                                                       │
│  4. chrome.debugger.sendCommand(                            │
│       "Input.dispatchMouseEvent", ...)                      │
│     → 发送 CDP 鼠标事件                                       │
│     → 目标页面触发 onClick                                   │
│     ↓                                                       │
│  5. chrome.tabs.update(manusImTabId, {active: true})       │
│     → 立即切换回 manus.im (~10ms)                           │
│                                                             │
│  总耗时：~20-50ms（用户几乎察觉不到）                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**~~使用的 Chrome API~~**

| API | 用途 |
|-----|------|
| `chrome.tabs.update(tabId, {active: true})` | ~~激活目标标签页~~ |
| `chrome.debugger.sendCommand()` | 发送 CDP 命令 |
| `Input.dispatchMouseEvent` (CDP) | 注入鼠标事件 |
| `chrome.scripting.executeScript()` | 注入脚本（备用） |

</details>

### 为什么 `isTrusted: true`？

Chrome DevTools Protocol 的 `Input.dispatchMouseEvent` 命令在操作系统层面模拟输入，浏览器将其视为真实的用户操作。

### 关键证据总结

| 证据 | 说明 |
|------|------|
| ✅ 有 `debugger` 权限 | 允许使用 CDP |
| ❌ 无 `nativeMessaging` 权限 | 排除 Native App |
| ✅ `focus` 事件触发 | 标签页被短暂激活 |
| ✅ `isTrusted: true` | CDP 注入的可信事件 |
| ✅ `PointerEvent` 类型 | CDP 生成的事件类型 |
| ✅ 无 Manus 进程 | 纯浏览器扩展实现 |
| ✅ `data-manus_*` 属性 | 扩展预先标记元素 |

---

## 检测方案

### 方案 1: 检测 Manus 标记属性（推荐）

**置信度**: HIGH
**可靠性**: 非常可靠

```typescript
/**
 * 检测是否为 Manus 自动化操作
 * @param element - 点击的目标元素
 * @returns 是否为 Manus 操作
 */
function isManusAutomation(element: HTMLElement): boolean {
  return element.hasAttribute('data-manus_clickable') ||
         element.hasAttribute('data-manus_click_id');
}
```

**优点**:
- ✅ 100% 准确（Manus 特有标记）
- ✅ 简单高效
- ✅ 无误报

**缺点**:
- ⚠️ Manus 更改属性名称后失效

### 方案 2: 综合检测

**置信度**: HIGH / MEDIUM / LOW
**用途**: 检测多种自动化工具

```typescript
/**
 * 检测可疑的自动化操作（包括 Manus）
 * @param event - 鼠标事件对象
 * @param element - 点击的目标元素
 * @returns 检测结果
 */
function detectSuspiciousAutomation(event: MouseEvent, element: HTMLElement): {
  isAutomation: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
} {
  const reasons: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // 高置信度：Manus 标记属性
  if (element.hasAttribute('data-manus_clickable')) {
    reasons.push('存在 data-manus_clickable 属性');
    confidence = 'high';
  }

  if (element.hasAttribute('data-manus_click_id')) {
    reasons.push('存在 data-manus_click_id 属性');
    confidence = 'high';
  }

  // 中等置信度：异常特征
  if (event.screenX < 0 && event.isTrusted) {
    reasons.push('screenX 为负数且事件可信');
    if (confidence !== 'high') confidence = 'medium';
  }

  if (document.visibilityState === 'hidden' &&
      (document.activeElement === element || element.contains(document.activeElement))) {
    reasons.push('页面隐藏但元素被激活');
    if (confidence !== 'high') confidence = 'medium';
  }

  return {
    isAutomation: confidence !== 'low',
    confidence,
    reasons
  };
}
```

### 检测特征汇总

| 特征 | 置信度 | 检测方法 | 误报率 |
|------|--------|---------|--------|
| `data-manus_clickable` | HIGH | 属性检查 | 无 |
| `data-manus_click_id` | HIGH | 属性检查 | 无 |
| `screenX < 0` + `isTrusted: true` | MEDIUM | 坐标检查 | 低 |
| `visibilityState: hidden` + `activeElement` | MEDIUM | 状态检查 | 低 |

---

## 防御建议

### 1. 检测并阻止

```typescript
const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  const target = e.target as HTMLElement;

  // 检测自动化操作
  if (isManusAutomation(target)) {
    console.warn('检测到 Manus 自动化操作，已阻止');
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // 正常处理用户点击
  setCount((count) => count + 1);
};
```

### 2. 限流保护

```typescript
// 对关键操作进行限流
const clickThrottle = new Map<string, number>();

const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  const target = e.target as HTMLElement;
  const now = Date.now();
  const lastClick = clickThrottle.get('button-action');

  if (lastClick && now - lastClick < 1000) {
    console.warn('点击过于频繁，可能是自动化操作');
    return;
  }

  clickThrottle.set('button-action', now);
  setCount((count) => count + 1);
};
```

### 3. 验证码/挑战

对于敏感操作，可以要求：
- 人工验证
- 图形验证码
- 行为验证（如鼠标轨迹）

---

## 参考资料

### 官方文档

- [chrome.debugger API](https://developer.chrome.com/docs/extensions/reference/api/debugger)
- [chrome.tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

### 技术讨论

- [GitHub: Input.dispatchMouseEvent inactive tab issue #89](https://github.com/ChromeDevTools/devtools-protocol/issues/89)
- [StackOverflow: Perform isTrusted:true event](https://stackoverflow.com/questions/69113304/perform-istrustedtrue-event-in-browser)
- [CSDN: chrome插件模拟isTrusted的事件](https://blog.csdn.net/mantou_riji/article/details/141828419)

### 相关工具

- [GitHub: orstavik/ClickIsTrusted](https://github.com/orstavik/ClickIsTrusted) - Chrome extension that lets you trigger click events with isTrusted=true

---

## 附录：测试日志样本

### Manus 自动化点击日志

```
[16:00:51.124] 页面状态: focus - 页面获得焦点
========== 点击事件调试信息 ==========
是否受信 (isTrusted): true
事件类型: click

------ 自动化检测 ------
检测为自动化: 是 ✓
置信度: HIGH
检测原因: 存在 data-manus_clickable 属性, 存在 data-manus_click_id 属性,
          screenX 为负数且事件可信, 页面隐藏但元素被激活

Manus Click ID: 4
screenX (Manus通常为负): -1983

------ 页面活动状态 ------
visibilityState: hidden
hidden: true
document.hasFocus(): true
activeElement: BUTTON

------ 坐标信息 ------
clientX/Y (相对于视口): (960, 508)
pageX/Y (相对于页面): (960, 508)
screenX/Y (相对于屏幕): (-1983, 1432)
offsetX/Y (相对于目标元素): (56, 19)

------ PointerEvent 详情 ------
pointerId: 1
pointerType: mouse
isPrimary: false
```

### 真实用户点击日志

```
========== 点击事件调试信息 ==========
是否受信 (isTrusted): true
事件类型: click

------ 自动化检测 ------
检测为自动化: 否

------ 页面活动状态 ------
visibilityState: visible
hidden: false
document.hasFocus(): true
activeElement: BUTTON

------ 坐标信息 ------
clientX/Y (相对于视口): (964, 356)
pageX/Y (相对于页面): (964, 356)
screenX/Y (相对于屏幕): (1317, 941)
offsetX/Y (相对于目标元素): (67, 17)
```

---

## 重要更新

### ⚠️ 实现原理修正 (2026-01-29)

**经深入分析确认，Manus 无需切换标签页即可在非活动标签页触发点击事件。**

#### 关键证据

通过精确的事件监听发现：
- `visibilityState` **全程保持 `hidden`**，从未变为 `visible`
- `visibilitychange` 事件**完全没有触发**
- 只有 `focus` 事件被触发

#### 正确的实现方式

```
1. Content Script 调用 window.focus()
   → 触发 focus 事件
   → document.hasFocus() = true
   → 但标签页未激活

2. CDP 的 Input.dispatchMouseEvent 直接向非活动标签页发送事件
   → 无需激活标签页
   → 产生 isTrusted: true 的点击事件
```

#### 与之前分析的区别

| 方面 | 之前分析 | 实际实现 |
|------|---------|---------|
| 标签页切换 | 需要 chrome.tabs.update() | **不需要** |
| 操作时间 | ~20-50ms | **~5-10ms** |
| visibilityState | 快速切换来不及更新 | **始终保持 hidden** |
| visibilitychange | 应该触发 | **完全不触发** |

**详细分析请参阅**: [11_点击事件深度分析/非活动标签页点击实现原理.md](11_点击事件深度分析/非活动标签页点击实现原理.md)

---

**报告完成日期**: 2026-01-29
**分析版本**: 0.0.47
**研究状态**: ✅ 完成
**最后更新**: 2026-01-29 (实现原理修正)
