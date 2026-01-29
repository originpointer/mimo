# JavaScript 逆向工程工具 - 总结报告

## 概述

本文档总结了来自 `/Users/sodaabe/Desktop/manus-reverse/lever/projects.md` 项目列表中的 8 个 JavaScript 逆向工程工具的安装和测试情况。

## 快速参考

| # | 项目 | 状态 | 类型 | 语言 | 文档 |
|---|---------|--------|------|----------|-------|
| 1 | **javascript-deobfuscator** | ✅ 已安装 | CLI/库 | Node.js | [文档](guides/javascript-deobfuscator-guide.md) |
| 2 | **synchrony** | ✅ 已安装 | CLI/库 | Node.js/TS | [文档](guides/synchrony-guide.md) |
| 3 | **deobfuscate-js** | ❌ 安装失败 | Web 界面 | Ruby/Jekyll | [失败说明](guides/deobfuscate-js-FAILED.md) |
| 4 | **ai-code-decompile** | ⚠️ 部分安装 | Web 界面 | Next.js/React | [文档](guides/ai-code-decompile-guide.md) |
| 5 | **de4js** | ❌ 重复项目 | Web 界面 | Ruby/Jekyll | [失败说明](guides/de4js-FAILED.md) |
| 6 | **jsluice** | ❌ 安装失败 | CLI | Go | [失败说明](guides/jsluice-FAILED.md) |
| 7 | **SecretFinder** | ✅ 已安装 | CLI | Python 3 | [文档](guides/SecretFinder-guide.md) |
| 8 | **LinkFinder** | ✅ 已安装 | CLI | Python 3 | [文档](guides/LinkFinder-guide.md) |

## 安装结果

### ✅ 成功安装 (5/8)

| 工具 | 用途 | 适用场景 |
|------|---------|---------|
| **javascript-deobfuscator** | 通用 JS 反混淆 | 基于数组的混淆、代理函数、十六进制标识符 |
| **synchrony** | javascript-obfuscator.io 反混淆 | 基于 AST 的 obfuscator.io 输出反混淆 |
| **SecretFinder** | 在 JS 中查找密钥 | API 密钥、令牌、凭据发现 |
| **LinkFinder** | 在 JS 中查找端点 | API 端点映射、URL 发现 |
| **ai-code-decompile** (JSUnpack) | AI 驱动的分析 | 现代框架打包文件 (React/Vue/Next.js) |

### ❌ 安装失败 (3/8)

| 工具 | 原因 | 替代方案 |
|------|--------|-------------|
| **jsluice** | 未安装 Go | 使用 SecretFinder + LinkFinder (Python) |
| **deobfuscate-js** | Ruby/Jekyll 栈问题 | 使用 https://lelinhtinh.github.io/de4js/ |
| **de4js** | 与 deobfuscate-js 重复 | 同上 |

## 按用途分类的工具对比

### 反混淆工具

| 工具 | 方法 | 最适合 | 离线使用 |
|------|--------|----------|---------|
| **javascript-deobfuscator** | Shift-AST | 通用混淆 | ✅ 是 |
| **synchrony** | AST 转换器 | javascript-obfuscator.io | ✅ 是 |
| **ai-code-decompile** | AI 分析 | 现代框架 | ❌ 否 |
| **de4js** | 正则解包器 | 多种格式 | ✅ 是 (网页) |

### 分析工具

| 工具 | 查找内容 | 方法 | 输出 |
|------|-------|--------|--------|
| **SecretFinder** | 密钥/API 密钥 | 正则表达式 | HTML |
| **LinkFinder** | 端点/URL | 正则表达式 | HTML |
| **jsluice** | URL + 密钥 | AST 解析 | JSON |

## 按场景推荐

### 场景 1：反混淆 JavaScript 代码

**推荐工作流程：**
1. 首先使用 **synchrony** 处理 javascript-obfuscator.io 输出
2. 尝试 **javascript-deobfuscator** 处理通用基于数组的混淆
3. 使用 **de4js** 网页界面处理特殊编码 (JSFuck、JJencode)
4. 对于现代框架，使用 **ai-code-decompile** (JSUnpack)

### 场景 2：查找 API 端点

**推荐工作流程：**
1. 使用 **LinkFinder** 进行全面的端点发现
2. 结合 **SecretFinder** 查找凭据
3. 使用正则表达式过滤特定模式的结果

### 场景 3：安全评估

**推荐工作流程：**
1. **LinkFinder** - 映射所有端点
2. **SecretFinder** - 查找泄露的凭据
3. **javascript-deobfuscator** - 反混淆可疑代码
4. 手动分析结果

### 场景 4：分析生产环境构建

**推荐工作流程：**
1. **ai-code-decompile** (JSUnpack) - 用于 React/Vue/Next.js 应用
2. **LinkFinder** - 提取 API 端点
3. **SecretFinder** - 检查密钥
4. **synchrony** - 如需进一步反混淆

## 项目目录结构

```
/Users/sodaabe/Desktop/manus-reverse/
├── projects/
│   ├── javascript-deobfuscator/  ✅ 已安装并正常工作
│   ├── synchrony/                 ✅ 已安装并正常工作
│   ├── SecretFinder/              ✅ 已安装并正常工作
│   ├── LinkFinder/                ✅ 已安装并正常工作
│   ├── ai-code-decompile/         ⚠️ 仅有前端 (AI 后端为 SaaS)
│   └── deobfuscate-js/            ❌ 安装失败 (Jekyll 问题)
├── guides/
│   ├── javascript-deobfuscator-guide.md
│   ├── synchrony-guide.md
│   ├── SecretFinder-guide.md
│   ├── LinkFinder-guide.md
│   ├── ai-code-decompile-guide.md
│   ├── jsluice-FAILED.md
│   ├── deobfuscate-js-FAILED.md
│   └── de4js-FAILED.md
├── SUMMARY.md                     ← 本文件
└── lever/
    └── projects.md                ← 原始项目列表
```

## 关键发现

### 工具环境要求

| 工具 | 是否必需 | 可用版本 | 状态 |
|------|----------|-----------|--------|
| git | ✅ | ✅ 2.50.1 | 正常 |
| node | ✅ | ✅ v22.17.1 | 正常 |
| npm | ✅ | ✅ 10.9.2 | 正常 |
| python3 | ✅ | ✅ 3.9.6 | 正常 |
| pip3 | ✅ | ✅ 21.2.4 | 正常 |
| go | - | ❌ 未找到 | jsluice 失败 |
| ruby | - | ✅ 2.6.10 | 版本过旧，无法运行 Jekyll |
| jekyll | - | ❌ 未找到 | de4js/deobfuscate-js 失败 |

### 重复项目

**deobfuscate-js** (top-master/deobfuscate-js) 和 **de4js** (lelinhtinh/de4js) 是同一个项目 —— 一个是另一个的分支。测试时只保留了 deobfuscate-js。

### 基于 AI 的工具限制

**ai-code-decompile** (JSUnpack) 成功安装，但仅提供前端 UI。实际的 AI 反编译引擎是专有的 SaaS 后端，需要连接到 jsunpack.tech。

## 使用命令汇总

### 已安装工具

```bash
# javascript-deobfuscator (Node.js)
cd /Users/sodaabe/Desktop/manus-reverse/projects/javascript-deobfuscator
node dist/cli.js -i input.js -o output.js

# synchrony (Node.js/TypeScript)
cd /Users/sodaabe/Desktop/manus-reverse/projects/synchrony
node dist/cli.js input.js -o output.js

# SecretFinder (Python 3)
python3 /Users/sodaabe/Desktop/manus-reverse/projects/SecretFinder/SecretFinder.py -i file.js -o output.html

# LinkFinder (Python 3)
python3 /Users/sodaabe/Desktop/manus-reverse/projects/LinkFinder/linkfinder.py -i file.js -o output.html

# ai-code-decompile (JSUnpack 网页界面)
# 访问: https://www.jsunpack.tech/
```

## 结论

**8 个项目中 5 个成功安装** 并配有完整文档：
- ✅ 4 个功能完整的 CLI 工具 (javascript-deobfuscator、synchrony、SecretFinder、LinkFinder)
- ⚠️ 1 个部分安装 (ai-code-decompile 仅前端)
- ❌ 3 个安装失败 (jsluice、deobfuscate-js、de4js)

所有成功的工具均可用于 JavaScript 逆向工程任务。失败的工具在其文档中提供了可用的网页替代方案。

---

**生成时间：** 2026-01-28
**分析项目总数：** 8
**成功安装：** 5 (62.5%)
**安装失败：** 3 (37.5%)
