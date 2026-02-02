---
name: arxiv-search
description: 搜索和检索 arXiv 学术论文
version: 1.0.0
license: MIT
tags: [research, academic, search]
author: Mimo Team
compatibility: Node.js 18+
---

# arXiv 搜索技能

使用本技能可以搜索和检索 arXiv 学术数据库中的论文。

## 功能特性

- 按关键词搜索论文
- 支持多种分类（物理、数学、计算机科学等）
- 获取论文标题、作者、摘要等信息
- 返回论文的 PDF 链接

## 使用方法

调用 `search` 脚本，传入搜索查询参数：

```javascript
{
  query: "machine learning",
  maxResults: 10
}
```

## 可用资源

- `response-schema`: 响应数据的 JSON Schema
- `categories`: arXiv 分类列表

## arXiv 分类

- cs.AI: 人工智能
- cs.CL: 计算与语言
- cs.CV: 计算机视觉
- cs.LG: 机器学习
- math.PR: 概率论
- physics.comp-ph: 计算物理
