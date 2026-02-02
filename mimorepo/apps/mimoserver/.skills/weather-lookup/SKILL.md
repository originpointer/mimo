---
name: weather-lookup
description: 查询全球城市天气信息
version: 1.0.0
license: MIT
tags: [weather, utility, location]
author: Mimo Team
compatibility: Node.js 18+
---

# 天气查询技能

查询全球城市的实时天气信息。

## 功能特性

- 按城市名称查询天气
- 支持中文和英文城市名
- 返回温度、湿度、风速等信息
- 提供天气预报概览

## 使用方法

调用 `current` 脚本查询当前天气：

```javascript
{
  city: "Beijing"
}
```

或使用英文名称：

```javascript
{
  city: "London",
  units: "metric"  // metric(摄氏度) 或 imperial(华氏度)
}
```

## 返回数据格式

```json
{
  "city": "Beijing",
  "temperature": 22,
  "humidity": 45,
  "wind_speed": 12,
  "condition": "Clear",
  "description": "晴朗"
}
```

## 支持的城市

- 北京 (Beijing)
- 上海 (Shanghai)
- 伦敦 (London)
- 纽约 (New York)
- 东京 (Tokyo)
- 巴黎 (Paris)
- 更多城市...
