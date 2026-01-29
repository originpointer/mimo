# 自动化检测快速参考

## 快速开始

### 1. 基础检测代码

```typescript
import { detectAutomation, isManusAutomation } from '@mimo/detection';

// 在点击处理器中使用
const handleClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;

  // 方法1: 简单检测
  if (isManusAutomation(target)) {
    console.warn('检测到 Manus 操作');
    return;
  }

  // 方法2: 综合检测
  const detection = detectAutomation(target, e, {
    enableManusDetection: true,
    enableGeneralDetection: true,
  });

  if (detection.isAutomation) {
    console.warn('检测到自动化操作:', detection.reasons);
    return;
  }

  // 正常处理点击
  handleValidClick(e);
};
```

### 2. React Hook 使用

```tsx
import { useAutomationDetection } from '@mimo/ui/hooks/useAutomationDetection';

function MyComponent() {
  const handleClick = useAutomationDetection({
    onDetected: (detection) => {
      console.warn('自动化操作:', detection);
    },
  });

  return <button onClick={handleClick(() => console.log('clicked'))}>
    点击我
  </button>;
}
```

## 检测特征速查表

| 特征 | 检测方法 | 置信度 |
|------|---------|--------|
| `data-manus_clickable` | `hasAttribute()` | HIGH |
| `data-manus_click_id` | `hasAttribute()` | HIGH |
| `screenX < 0` + `isTrusted: true` | 坐标检查 | MEDIUM |
| `visibilityState: hidden` + 有焦点 | 状态检查 | MEDIUM |
| `isPrimary: false` + `pointerType: mouse` | 事件检查 | MEDIUM |

## 防御策略

```typescript
// 策略1: 直接阻止
const defenseStrategy1 = {
  name: 'block-all',
  action: 'block' as const,
  condition: (detection: AutomationDetectionResult) => true,
  execute: (detection) => {
    console.warn('已阻止自动化操作');
  },
};

// 策略2: 仅阻止高置信度
const defenseStrategy2 = {
  name: 'block-high-confidence',
  action: 'block' as const,
  condition: (detection: AutomationDetectionResult) => detection.confidence === 'high',
  execute: (detection) => {
    console.warn('已阻止高置信度自动化操作');
  },
};

// 策略3: 记录但不阻止
const defenseStrategy3 = {
  name: 'log-only',
  action: 'allow' as const,
  condition: (detection: AutomationDetectionResult) => true,
  execute: (detection) => {
    fetch('/api/automation-log', {
      method: 'POST',
      body: JSON.stringify(detection),
    });
  },
};
```

## 常见问题

**Q: 如何只检测不阻止？**
A: 不调用 `e.preventDefault()` 即可。

**Q: 如何记录所有检测到的操作？**
A: 使用 `onDetected` 回调发送到服务器。

**Q: 如何添加自定义检测逻辑？**
A: 使用 `customDetectors` 选项：
```typescript
const customDetector = (event: Event, element: HTMLElement) => {
  return element.classList.contains('no-automation-allowed');
};
```

**Q: 如何区分不同类型的自动化？**
A: 检查 `detection.automationType` 属性。

## 调试技巧

```typescript
// 开启详细日志
const detection = detectAutomation(target, e, {
  enableLogging: true,
});

// 打印完整检测结果
console.table(detection);
```
