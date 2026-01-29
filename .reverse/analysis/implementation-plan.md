# Mimo 项目 - 自动化检测防御方案

**项目路径**: `/Users/soda/Documents/solocodes/mimo/mimorepo`
**创建日期**: 2026-01-29
**方案版本**: 1.0

---

## 目录

1. [方案概述](#方案概述)
2. [项目结构分析](#项目结构分析)
3. [实施方案](#实施方案)
4. [使用指南](#使用指南)
5. [扩展方案](#扩展方案)

---

## 方案概述

### 目标

为 Mimo 项目添加自动化操作检测能力，主要针对 Manus AI Browser Operator 等自动化工具。

### 核心功能

1. **自动化检测**: 识别自动化点击操作
2. **事件拦截**: 阻止可疑的自动化操作
3. **日志记录**: 记录检测到的自动化行为
4. **可选防御**: 提供多种防御策略供选择

### 技术栈

- **检测库**: `@mimo/detection` (新建)
- **集成方式**: React Hook / HOC / 组件级
- **日志系统**: 复用现有的 `@mimo/bus` 日志系统

---

## 项目结构分析

### 当前项目结构

```
mimorepo/
├── apps/
│   └── next-app/          # Next.js 应用
├── packages/
│   ├── @mimo/
│   │   ├── agent/        # 代理功能
│   │   ├── bus/          # 消息总线 (Socket.IO)
│   │   ├── context/      # 上下文管理
│   │   ├── core/         # 核心功能
│   │   ├── engine/       # 引擎
│   │   ├── hub/          # Hub 服务器
│   │   ├── llm/          # LLM 客户端
│   │   └── types/        # 类型定义
│   ├── ui/               # UI 组件库
│   └── sens/             # Sens 包
└── .reverse/
    ├── sources/          # 反编译的扩展代码
    └── analysis/         # 分析文档（本目录）
```

### 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Mimo 技术架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser Extension (Manus)                                │
│     ↓ Socket.IO                                              │
│  MimoHub (Nitro Server)                                    │
│     ↓                                                       │
│  MimoBus (@mimo/bus)                                       │
│     ↓                                                       │
│  MimoEngine (@mimo/engine)                                 │
│     ↓                                                       │
│  Client Application                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 实施方案

### 阶段 1: 创建检测包

创建 `@mimo/detection` 包，包含自动化检测的核心功能。

**包结构**:
```
packages/@mimo/detection/
├── src/
│   ├── index.ts           # 主入口
│   ├── detectors.ts       # 检测器实现
│   ├── types.ts          # 类型定义
│   └── constants.ts      # 常量定义
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```

**文件内容**:

**`packages/@mimo/detection/src/types.ts`**:
```typescript
/**
 * 自动化检测结果
 */
export interface AutomationDetectionResult {
  /** 是否为自动化操作 */
  isAutomation: boolean;
  /** 置信度 */
  confidence: 'high' | 'medium' | 'low';
  /** 检测原因列表 */
  reasons: string[];
  /** 自动化类型 */
  automationType?: 'manus' | 'puppeteer' | 'playwright' | 'unknown';
  /** 检测时间戳 */
  timestamp: number;
}

/**
 * 检测选项
 */
export interface DetectionOptions {
  /** 是否启用 Manus 检测 */
  enableManusDetection?: boolean;
  /** 是否启用通用自动化检测 */
  enableGeneralDetection?: boolean;
  /** 是否记录日志 */
  enableLogging?: boolean;
  /** 自定义检测器 */
  customDetectors?: ((event: Event, element: HTMLElement) => boolean)[];
}

/**
 * 防御动作
 */
export type DefenseAction = 'block' | 'allow' | 'challenge' | 'throttle';

/**
 * 防御策略
 */
export interface DefenseStrategy {
  /** 动作名称 */
  name: string;
  /** 动作类型 */
  action: DefenseAction;
  /** 条件函数 */
  condition: (detection: AutomationDetectionResult) => boolean;
  /** 执行函数 */
  execute: (detection: AutomationDetectionResult) => void | Promise<void>;
}

/**
 * 防御配置
 */
export interface DefenseConfig {
  /** 默认动作 */
  defaultAction?: DefenseAction;
  /** 防御策略列表 */
  strategies?: DefenseStrategy[];
  /** 是否启用自动防御 */
  autoBlock?: boolean;
}
```

**`packages/@mimo/detection/src/constants.ts`**:
```typescript
/**
 * Manus 相关的 DOM 属性
 */
export const MANUS_ATTRIBUTES = {
  CLICKABLE: 'data-manus_clickable',
  CLICK_ID: 'data-manus_click_id',
} as const;

/**
 * 事件特征阈值
 */
export const EVENT_THRESHOLDS = {
  /** 屏幕坐标负数阈值 */
  SCREEN_X_THRESHOLD: 0,
  /** 点击间隔阈值（毫秒） */
  CLICK_INTERVAL_THRESHOLD: 100,
  /** 快速连续点击次数阈值 */
  RAPID_CLICK_THRESHOLD: 3,
} as const;
```

**`packages/@mimo/detection/src/detectors.ts`**:
```typescript
import type { AutomationDetectionResult, DetectionOptions } from './types.js';
import { MANUS_ATTRIBUTES } from './constants.js';

/**
 * 检测是否为 Manus 自动化操作
 */
export function detectManus(
  element: HTMLElement,
  event: Event
): AutomationDetectionResult {
  const reasons: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // 高置信度：Manus 标记属性
  if (element.hasAttribute(MANUS_ATTRIBUTES.CLICKABLE)) {
    reasons.push(`存在 ${MANUS_ATTRIBUTES.CLICKABLE} 属性`);
    confidence = 'high';
  }

  if (element.hasAttribute(MANUS_ATTRIBUTES.CLICK_ID)) {
    reasons.push(`存在 ${MANUS_ATTRIBUTES.CLICK_ID} 属性`);
    confidence = 'high';
  }

  // 检查 PointerEvent 特征
  if (event instanceof PointerEvent) {
    if (event.pointerType === 'mouse' && !event.isPrimary) {
      reasons.push('非主鼠标指针');
      if (confidence !== 'high') confidence = 'medium';
    }
  }

  return {
    isAutomation: confidence !== 'low',
    confidence,
    reasons,
    automationType: 'manus',
    timestamp: Date.now(),
  };
}

/**
 * 检测通用自动化特征
 */
export function detectGeneralAutomation(
  element: HTMLElement,
  event: Event
): AutomationDetectionResult {
  const reasons: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // 检查 MouseEvent 坐标
  if (event instanceof MouseEvent) {
    if (event.screenX < 0 && event.isTrusted) {
      reasons.push('screenX 为负数且事件可信');
      confidence = 'medium';
    }

    // 检查状态不一致
    if (document.visibilityState === 'hidden' &&
        (document.activeElement === element || element.contains(document.activeElement))) {
      reasons.push('页面隐藏但元素被激活');
      if (confidence !== 'high') confidence = 'medium';
    }
  }

  return {
    isAutomation: confidence !== 'low',
    confidence,
    reasons,
    automationType: 'unknown',
    timestamp: Date.now(),
  };
}

/**
 * 综合检测函数
 */
export function detectAutomation(
  element: HTMLElement,
  event: Event,
  options: DetectionOptions = {}
): AutomationDetectionResult {
  // 默认启用所有检测
  const enableManus = options.enableManusDetection !== false;
  const enableGeneral = options.enableGeneralDetection !== false;

  // 检测 Manus
  if (enableManus) {
    const manusResult = detectManus(element, event);
    if (manusResult.isAutomation) {
      return manusResult;
    }
  }

  // 检测通用自动化
  if (enableGeneral) {
    const generalResult = detectGeneralAutomation(element, event);
    if (generalResult.isAutomation) {
      return generalResult;
    }
  }

  // 自定义检测器
  if (options.customDetectors) {
    for (const detector of options.customDetectors) {
      if (detector(event, element)) {
        return {
          isAutomation: true,
          confidence: 'medium',
          reasons: ['自定义检测器匹配'],
          automationType: 'unknown',
          timestamp: Date.now(),
        };
      }
    }
  }

  return {
    isAutomation: false,
    confidence: 'low',
    reasons: [],
    timestamp: Date.now(),
  };
}
```

**`packages/@mimo/detection/src/index.ts`**:
```typescript
export * from './types.js';
export * from './detectors.js';
export * from './constants.js';

// 便捷导出
export { detectAutomation, detectManus, detectGeneralAutomation } from './detectors.js';
```

---

### 阶段 2: React 集成

创建 React Hook 用于在组件中使用自动化检测。

**文件路径**: `packages/ui/src/hooks/useAutomationDetection.ts`

```typescript
import { useEffect, useRef } from 'react';
import type { AutomationDetectionResult, DetectionOptions, DefenseConfig } from '@mimo/detection';

/**
 * 自动化检测 Hook 配置
 */
export interface UseAutomationDetectionConfig {
  /** 检测选项 */
  detectionOptions?: DetectionOptions;
  /** 防御配置 */
  defenseConfig?: DefenseConfig;
  /** 回调函数 */
  onDetected?: (detection: AutomationDetectionResult) => void;
}

/**
 * 自动化检测 Hook
 *
 * @example
 * ```tsx
 * const handleClick = useAutomationDetection({
 *   onDetected: (detection) => {
 *     console.warn('检测到自动化操作:', detection);
 *   }
 * });
 *
 * <button onClick={handleClick}>Click me</button>
 * ```
 */
export function useAutomationDetection(
  config: UseAutomationDetectionConfig = {}
) {
  const { detectionOptions, defenseConfig, onDetected } = config;

  const handleEvent = <E extends Event>(
    event: E,
    handler: () => void
  ) => {
    return (e: E) => {
      // 获取事件目标
      const element = e.target as HTMLElement;

      // 动态导入检测函数（避免循环依赖）
      import('@mimo/detection').then(({ detectAutomation }) => {
        const detection = detectAutomation(element, e, detectionOptions);

        if (detection.isAutomation) {
          console.warn('[AutomationDetection] 检测到自动化操作:', detection);

          // 触发回调
          onDetected?.(detection);

          // 执行防御策略
          if (defenseConfig?.autoBlock) {
            console.warn('[AutomationDetection] 操作已被阻止');
            return;
          }

          // 执行自定义策略
          if (defenseConfig?.strategies) {
            for (const strategy of defenseConfig.strategies) {
              if (strategy.condition(detection)) {
                strategy.execute(detection);
                if (strategy.action === 'block') {
                  return;
                }
              }
            }
          }
        }

        // 执行原始处理
        handler();
      });
    };
  };

  return handleEvent;
}
```

---

### 阶段 3: 使用示例

#### 基础使用

```tsx
import { useAutomationDetection } from '@mimo/ui/hooks/useAutomationDetection';

function MyComponent() {
  const [count, setCount] = useState(0);

  const handleClick = useAutomationDetection({
    onDetected: (detection) => {
      console.warn('检测到自动化操作:', detection);
      // 可以发送到后端记录
      fetch('/api/automation-log', {
        method: 'POST',
        body: JSON.stringify(detection),
      });
    },
  });

  return (
    <button onClick={handleClick(() => setCount(c => c + 1))}>
      Count: {count}
    </button>
  );
}
```

#### 高级使用：自动阻止

```tsx
const handleClick = useAutomationDetection({
  detectionOptions: {
    enableManusDetection: true,
    enableGeneralDetection: true,
  },
  defenseConfig: {
    autoBlock: true,  // 自动阻止所有自动化操作
  },
  onDetected: (detection) => {
    // 记录到日志系统
    logger.warn('自动化操作被阻止', detection);
  },
});
```

#### 高级使用：自定义策略

```tsx
const handleClick = useAutomationDetection({
  defenseConfig: {
    strategies: [
      {
        name: '高置信度阻止',
        action: 'block',
        condition: (detection) => detection.confidence === 'high',
        execute: (detection) => {
          console.warn('阻止高置信度自动化操作');
        },
      },
      {
        name: '中置信度挑战',
        action: 'challenge',
        condition: (detection) => detection.confidence === 'medium',
        execute: (detection) => {
          // 显示验证码
          showCaptcha();
        },
      },
    ],
  },
});
```

---

### 阶段 4: 集成到 MimoBus

在 MimoBus 中添加自动化检测日志功能。

**修改文件**: `packages/@mimo/bus/src/logger.ts`

```typescript
import type { AutomationDetectionResult } from '@mimo/detection';

export class MimoBusLogger {
  // ... 现有代码 ...

  /**
   * 记录自动化检测事件
   */
  logAutomationDetection(detection: AutomationDetectionResult): void {
    this.logger.warn({
      event: 'automation_detected',
      isAutomation: detection.isAutomation,
      confidence: detection.confidence,
      automationType: detection.automationType,
      reasons: detection.reasons,
      timestamp: detection.timestamp,
    }, 'Automation detected');
  }
}
```

---

## 使用指南

### 安装

```bash
# 在 mimorepo 根目录执行
pnpm install
```

### 在 Next.js 应用中使用

```tsx
// app/page.tsx
'use client';

import { useAutomationDetection } from '@mimo/ui/hooks/useAutomationDetection';

export default function Page() {
  const [count, setCount] = useState(0);

  const handleClick = useAutomationDetection({
    onDetected: (detection) => {
      console.warn('检测到自动化操作:', detection);
    },
  });

  return (
    <main>
      <h1>Mimo 自动化检测示例</h1>
      <button onClick={handleClick(() => setCount(c => c + 1))}>
        点击次数: {count}
      </button>
    </main>
  );
}
```

### 开发模式

```bash
# 启动开发服务器
pnpm dev

# 构建所有包
pnpm build

# 运行类型检查
pnpm check-types
```

---

## 扩展方案

### 扩展 1: 服务器端验证

在 MimoHub 中添加自动化检测的集中管理和统计。

```typescript
// packages/@mimo/hub/src/automation-tracker.ts

export class AutomationTracker {
  private detections = new Map<string, AutomationDetectionResult[]>();

  record(detection: AutomationDetectionResult): void {
    const key = detection.automationType || 'unknown';
    if (!this.detections.has(key)) {
      this.detections.set(key, []);
    }
    this.detections.get(key)!.push(detection);
  }

  getStats() {
    return {
      total: Array.from(this.detections.values()).reduce((sum, arr) => sum + arr.length, 0),
      byType: Object.fromEntries(
        Array.from(this.detections.entries()).map(([type, arr]) => [type, arr.length])
      ),
    };
  }
}
```

### 扩展 2: 机器学习检测

收集大量自动化操作数据后，可以训练模型进行更准确的检测。

```typescript
// packages/@mimo/detection/src/ml-detector.ts

export class MLAutomationDetector {
  async predict(event: Event, element: HTMLElement): Promise<boolean> {
    // 提取特征
    const features = this.extractFeatures(event, element);

    // 调用 ML 模型
    const response = await fetch('/api/detect-automation', {
      method: 'POST',
      body: JSON.stringify(features),
    });

    const result = await response.json();
    return result.isAutomation;
  }

  private extractFeatures(event: Event, element: HTMLElement) {
    return {
      // 事件特征
      eventType: event.type,
      isTrusted: event.isTrusted,
      timeStamp: event.timeStamp,

      // 坐标特征
      screenX: event instanceof MouseEvent ? event.screenX : 0,
      screenY: event instanceof MouseEvent ? event.screenY : 0,

      // 元素特征
      elementTag: element.tagName,
      elementClasses: Array.from(element.classList),
      elementAttrs: Array.from(element.attributes).map(attr => attr.name),

      // 页面状态
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
    };
  }
}
```

### 扩展 3: 浏览器扩展检测

检测浏览器扩展（不仅仅是 Manus）的特征。

```typescript
// packages/@mimo/detection/src/extension-detector.ts

const EXTENSION_PATTERNS = [
  'data-manus_',          // Manus
  'data-monica_',         // Monica
  'data-selenium_',      // Selenium
  'data-automation-',    // 通用自动化标记
];

export function detectExtensions(element: HTMLElement): boolean {
  for (const pattern of EXTENSION_PATTERNS) {
    for (const attr of element.attributes) {
      if (attr.name.startsWith(pattern)) {
        return true;
      }
    }
  }
  return false;
}
```

---

## 实施步骤

### Step 1: 创建检测包

```bash
# 创建包目录
mkdir -p packages/@mimo/detection/src

# 创建必要的文件
touch packages/@mimo/detection/src/{index.ts,detectors.ts,types.ts,constants.ts}
touch packages/@mimo/detection/{package.json,tsconfig.json,tsdown.config.ts}
```

### Step 2: 实现检测功能

按照上面的文件内容实现各个检测文件。

### Step 3: 添加 React Hook

```bash
# 创建 hooks 目录
mkdir -p packages/ui/src/hooks

# 创建 Hook 文件
touch packages/ui/src/hooks/useAutomationDetection.ts
```

### Step 4: 更新依赖

```bash
# 在 mimorepo 根目录执行
pnpm install
```

### Step 5: 测试

使用 Vite 测试页面进行自动化检测测试。

---

## 总结

本方案提供了一个完整的自动化检测防御系统：

1. **模块化设计**: 独立的检测包，易于集成
2. **灵活配置**: 支持多种检测策略和防御选项
3. **可扩展性**: 支持自定义检测器和 ML 集成
4. **与现有架构兼容**: 无缝集成到 Mimo 项目中

通过实施本方案，Mimo 项目将能够：
- ✅ 检测 Manus 等 AI 自动化工具
- ✅ 记录自动化操作日志
- ✅ 提供多种防御策略
- ✅ 保护关键业务逻辑

---

**文档版本**: 1.0
**最后更新**: 2026-01-29
