---
name: data-analyzer
description: 数据分析和可视化工具，支持 CSV 和 JSON 格式
version: 1.0.0
license: MIT
tags: [data, analytics, visualization]
author: Mimo Team
compatibility: Node.js 18+
---

# 数据分析技能

用于分析 CSV 和 JSON 数据的技能，提供统计分析和数据转换功能。

## 功能特性

- 数据格式转换（CSV ↔ JSON）
- 基础统计分析（均值、中位数、标准差等）
- 数据筛选和排序
- 数据聚合操作

## 使用方法

### 统计分析

调用 `stats` 脚本获取数据统计信息：

```javascript
{
  data: [...],  // 数值数组
  format: "array"
}
```

或分析 CSV 文件：

```javascript
{
  file: "data.csv",
  column: "price"  // 指定列名
}
```

### 数据转换

调用 `convert` 脚本进行格式转换：

```javascript
{
  input: "data.csv",
  output: "data.json",
  format: "json"
}
```

## 可用资源

- `example-csv`: 示例 CSV 数据
- `statistical-methods`: 统计方法说明
