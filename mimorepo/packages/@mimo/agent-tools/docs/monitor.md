# 监控系统 (Monitor)

## 概述

监控系统负责记录和分析工具的执行情况，提供执行历史、统计数据和失败分析。

## 核心组件

- **ToolMonitor**：监控器，记录执行并提供统计分析
- **ExecutionRecord**：执行记录
- **ExecutionStats**：执行统计

## ToolMonitor

### 构造函数

```typescript
const monitor = new ToolMonitor();
```

### API

#### record

记录一次执行结果。

```typescript
record(result: ExecutionResult): void
```

```typescript
const result = await executor.execute(tool, params, context);
monitor.record(result);
```

#### getHistory

获取执行历史。

```typescript
getHistory(toolName?: string, limit?: number): ExecutionRecord[]
```

**参数：**
- `toolName` - 可选，按工具名称筛选
- `limit` - 可选，限制返回数量

```typescript
// 获取所有历史
const allHistory = monitor.getHistory();

// 获取特定工具的历史
const toolHistory = monitor.getHistory('browser_navigate');

// 获取最近 10 条记录
const recentHistory = monitor.getHistory(undefined, 10);
```

#### getStats

获取执行统计。

```typescript
getStats(toolName?: string): ExecutionStats
```

**返回：**
```typescript
interface ExecutionStats {
  total: number;           // 总执行次数
  successful: number;      // 成功次数
  failed: number;          // 失败次数
  successRate: number;     // 成功率 (0-1)
  avgDuration: number;     // 平均耗时（毫秒）
  minDuration?: number;    // 最短耗时
  maxDuration?: number;    // 最长耗时
}
```

```typescript
// 全局统计
const globalStats = monitor.getStats();
console.log(`总执行: ${globalStats.total}, 成功率: ${(globalStats.successRate * 100).toFixed(1)}%`);

// 特定工具统计
const toolStats = monitor.getStats('browser_navigate');
console.log(`平均耗时: ${toolStats.avgDuration}ms`);
```

#### getAllStats

获取所有工具的统计。

```typescript
getAllStats(): Map<string, ExecutionStats>
```

```typescript
const allStats = monitor.getAllStats();

for (const [toolName, stats] of allStats) {
  console.log(`${toolName}: ${stats.successful}/${stats.total} 成功`);
}
```

#### getRecentFailures

获取最近的失败记录。

```typescript
getRecentFailures(limit?: number): ExecutionRecord[]
```

```typescript
// 获取最近 10 次失败
const failures = monitor.getRecentFailures(10);

for (const failure of failures) {
  console.error(`${failure.toolCall.name}: ${failure.result.error}`);
}
```

#### clear

清空所有记录。

```typescript
clear(): void
```

```typescript
monitor.clear();
```

#### setMaxRecords

设置最大记录数量。

```typescript
setMaxRecords(max: number): void
```

默认最大记录数为 1000。当超过限制时，最旧的记录会被自动移除。

```typescript
monitor.setMaxRecords(5000);
```

#### size

获取当前记录数量。

```typescript
readonly size: number
```

```typescript
console.log(`已记录 ${monitor.size} 次执行`);
```

## 全局监控实例

系统提供了一个全局的监控实例：

### getToolMonitor

获取全局监控实例。

```typescript
import { getToolMonitor } from '@mimo/agent-tools/monitor';

const monitor = getToolMonitor();
```

### resetToolMonitor

重置全局监控实例。

```typescript
import { resetToolMonitor } from '@mimo/agent-tools/monitor';

resetToolMonitor();
```

## 使用示例

### 基本使用

```typescript
import { ToolExecutor } from '@mimo/agent-tools/executor';
import { getToolMonitor } from '@mimo/agent-tools/monitor';

const executor = new ToolExecutor();
const monitor = getToolMonitor();

// 执行并记录
const result = await executor.execute(tool, params, context);
monitor.record(result);

// 查看统计
const stats = monitor.getStats();
console.log(`成功率: ${(stats.successRate * 100).toFixed(1)}%`);
```

### 自动记录

可以包装执行器自动记录：

```typescript
class MonitoredExecutor {
  private executor = new ToolExecutor();
  private monitor = getToolMonitor();

  async execute(tool, params, context) {
    const result = await this.executor.execute(tool, params, context);
    this.monitor.record(result);
    return result;
  }
}
```

### 失败分析

```typescript
// 获取失败记录
const failures = monitor.getRecentFailures(20);

// 按错误类型分组
const errorGroups = new Map<string, number>();

for (const failure of failures) {
  const error = failure.result.error || 'Unknown';
  const count = errorGroups.get(error) || 0;
  errorGroups.set(error, count + 1);
}

// 输出报告
console.log('失败分析:');
for (const [error, count] of errorGroups) {
  console.log(`  ${error}: ${count} 次`);
}
```

### 性能分析

```typescript
// 获取所有工具的统计
const allStats = monitor.getAllStats();

// 找出最慢的工具
let slowestTool = '';
let slowestTime = 0;

for (const [toolName, stats] of allStats) {
  if (stats.avgDuration > slowestTime) {
    slowestTime = stats.avgDuration;
    slowestTool = toolName;
  }
}

console.log(`最慢的工具: ${slowestTool} (${slowestTime.toFixed(0)}ms)`);
```

### 成功率报告

```typescript
function generateSuccessReport(monitor: ToolMonitor): string {
  const allStats = monitor.getAllStats();
  const lines: string[] = ['工具执行报告', '============', ''];

  for (const [toolName, stats] of allStats) {
    const rate = (stats.successRate * 100).toFixed(1);
    const avg = stats.avgDuration.toFixed(0);

    lines.push(`${toolName}`);
    lines.push(`  执行: ${stats.total} 次`);
    lines.push(`  成功: ${stats.successful} 次`);
    lines.push(`  成功率: ${rate}%`);
    lines.push(`  平均耗时: ${avg}ms`);
    lines.push('');
  }

  return lines.join('\n');
}

console.log(generateSuccessReport(monitor));
```

### 实时监控

```typescript
import { ToolExecutor } from '@mimo/agent-tools/executor';
import { getToolMonitor } from '@mimo/agent-tools/monitor';

const executor = new ToolExecutor();
const monitor = getToolMonitor();

// 定期输出统计
setInterval(() => {
  const stats = monitor.getStats();
  console.log(`[监控] 总执行: ${stats.total}, 成功率: ${(stats.successRate * 100).toFixed(1)}%`);
}, 5000);
```

## 完整示例

### 综合监控系统

```typescript
import { ToolExecutor } from '@mimo/agent-tools/executor';
import { getToolMonitor } from '@mimo/agent-tools/monitor';

class ToolMonitoringSystem {
  private executor = new ToolExecutor();
  private monitor = getToolMonitor();

  async execute(tool, params, context) {
    const result = await this.executor.execute(tool, params, context);
    this.monitor.record(result);
    return result;
  }

  getReport() {
    const allStats = this.monitor.getAllStats();
    const failures = this.monitor.getRecentFailures(10);

    return {
      summary: this.monitor.getStats(),
      byTool: Object.fromEntries(allStats),
      recentFailures: failures.map(f => ({
        tool: f.toolCall.name,
        error: f.result.error,
        timestamp: f.timestamp
      }))
    };
  }

  getSlowTools(threshold = 1000) {
    const allStats = this.monitor.getAllStats();
    const slow: Array<{ tool: string; avgDuration: number }> = [];

    for (const [toolName, stats] of allStats) {
      if (stats.avgDuration > threshold) {
        slow.push({
          tool: toolName,
          avgDuration: stats.avgDuration
        });
      }
    }

    return slow.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  getUnreliableTools(threshold = 0.8) {
    const allStats = this.monitor.getAllStats();
    const unreliable: Array<{ tool: string; successRate: number }> = [];

    for (const [toolName, stats] of allStats) {
      if (stats.successRate < threshold && stats.total >= 5) {
        unreliable.push({
          tool: toolName,
          successRate: stats.successRate
        });
      }
    }

    return unreliable.sort((a, b) => a.successRate - b.successRate);
  }
}

// 使用
const system = new ToolMonitoringSystem();

// 执行工具
await system.execute(tool, params, context);

// 获取报告
const report = system.getReport();
console.log('总执行:', report.summary.total);
console.log('成功率:', (report.summary.successRate * 100).toFixed(1), '%');

// 找出慢的工具
const slowTools = system.getSlowTools(500);
console.log('慢速工具:', slowTools);

// 找出不可靠的工具
const unreliableTools = system.getUnreliableTools(0.9);
console.log('不可靠工具:', unreliableTools);
```

## 记录结构

### ExecutionRecord

```typescript
interface ExecutionRecord {
  toolCall: ToolCall;      // 工具调用信息
  result: ExecutionResult; // 执行结果
  timestamp: number;       // 时间戳
}
```

### ToolCall

```typescript
interface ToolCall {
  id: string;              // 调用 ID
  name: string;            // 工具名称
  parameters: any;         // 调用参数
  success?: boolean;       // 是否成功
  result?: any;            // 执行结果
  error?: string;          // 错误信息
}
```

### ExecutionResult

```typescript
interface ExecutionResult {
  success: boolean;        // 是否成功
  result?: any;            // 结果
  error?: string;          // 错误
  duration: number;        // 耗时（毫秒）
  toolCall: ToolCall;      // 调用信息
}
```

## 最佳实践

1. **设置合理的最大记录数**：根据应用场景调整
   ```typescript
   monitor.setMaxRecords(10000);  // 高流量场景
   ```

2. **定期清理历史**：避免内存占用过多
   ```typescript
   setInterval(() => monitor.clear(), 24 * 60 * 60 * 1000);  // 每天清理
   ```

3. **使用全局实例**：共享监控数据
   ```typescript
   const monitor = getToolMonitor();
   ```

4. **结合日志使用**：重要事件同时记录到日志
   ```typescript
   monitor.record(result);
   if (!result.success) {
     context.logger.error(`工具执行失败: ${result.error}`);
   }
   ```
