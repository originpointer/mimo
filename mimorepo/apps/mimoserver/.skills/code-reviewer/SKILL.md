---
name: code-reviewer
description: 代码审查助手，提供最佳实践和常见问题检查
version: 1.0.0
license: MIT
tags: [code-quality, review, best-practices]
author: Mimo Team
compatibility: Node.js 18+
---

# 代码审查技能

提供代码审查的最佳实践指南和常见问题检查清单。

## 审查维度

### 1. 代码质量

- 代码可读性
- 命名规范
- 代码复杂度
- 重复代码检测

### 2. 安全性

- SQL 注入风险
- XSS 漏洞
- 敏感信息泄露
- 权限检查

### 3. 性能

- 算法复杂度
- 资源使用
- 缓存策略
- 数据库查询优化

### 4. 可维护性

- 模块化程度
- 文档完整性
- 测试覆盖率
- 错误处理

## 使用方法

使用 `readResource` 工具加载特定的审查指南：

```
readResource("code-reviewer", "checklist")
readResource("code-reviewer", "security")
readResource("code-reviewer", "performance")
```

## 可用资源

- `checklist`: 通用代码审查检查清单
- `security`: 安全审查要点
- `performance`: 性能审查指南
- `typescript`: TypeScript 专项审查
- `react`: React 组件审查要点
