# ai-code-decompile (JSUnpack) Usage Guide

## Overview

**ai-code-decompile** (also known as **JSUnpack**) is an AI-powered JavaScript decompilation and analysis tool. It helps understand bundled, minified, and obfuscated frontend code by analyzing production JavaScript builds.

**⚠️ IMPORTANT:** This repository only contains the **frontend UI/interaction code**. The actual AI decompilation engine is a proprietary backend service hosted at https://www.jsunpack.tech/

**Repository:** https://github.com/zhongguagua/ai-code-decompile
**Official Website:** https://www.jsunpack.tech/
**Language:** Next.js/React/TypeScript

## Suitable Reverse Engineering Scenarios

- **Modern frontend framework analysis** - React, Vue, Next.js applications
- **Production build analysis** - Webpack, Vite, Rollup bundled code
- **Learning implementations** - Study how websites implement features
- **Architecture research** - Understand complex frontend architectures
- **Problem localization** - Debug production JavaScript issues
- **Technical investigation** - Analyze competitor implementations (legally)

## What JSUnpack Does

| Feature | Description |
|---------|-------------|
| **AI-driven analysis** | Context-aware code understanding, not just string replacement |
| **Variable inference** | Intelligently推测 variable and function purposes |
| **Framework recognition** | Automatically identifies third-party libraries |
| **Code structure** | Identifies key flows, core functions, and module structures |
| **Noise reduction** | Filters out irrelevant code, focuses on valuable logic |
| **Real-world ready** | Designed for multi-entry, multi-chunk production builds |

## Installation

### Method 1: Use Official Website (Recommended)

No installation required - visit https://www.jsunpack.tech/

### Method 2: Local Development (Frontend Only)

```bash
cd ai-code-decompile
node >= 18

npm install
npm run dev

# Access at http://localhost:3000
```

**Note:** Local development will only run the UI. The AI backend requires internet connection to the jsunpack.tech API.

## Usage

### Web Interface (Primary Use)

1. Visit https://www.jsunpack.tech/
2. Paste obfuscated JavaScript code
3. Click "Analyze" or "Decompile"
4. Review the AI-generated analysis

### Expected Results

The tool provides:
- **Deobfuscated code** - More readable version of input
- **Function analysis** - Descriptions of what functions do
- **Module structure** - Organization of the codebase
- **Library identification** - Recognition of frameworks used
- **Business logic** - Key implementation patterns

## What It Targets

| Code Type | Support |
|-----------|---------|
| **React applications** | ✅ Excellent |
| **Vue applications** | ✅ Excellent |
| **Next.js builds** | ✅ Excellent |
| **Webpack bundles** | ✅ Excellent |
| **Vite builds** | ✅ Excellent |
| **Rollup bundles** | ✅ Excellent |
| **Multi-entry apps** | ✅ Supported |
| **Mixed frameworks** | ✅ Supported |

## Limitations

1. **Not 100% source restoration** - Cannot fully restore original source code after heavy obfuscation
2. **Requires internet** - AI backend is SaaS, not local
3. **Freemium model** - Basic features free, advanced features may require payment
4. **No offline use** - Must connect to jsunpack.tech API
5. **Learning focus** - Designed for analysis, not for cracking or bypassing protections

## Technical Boundaries

From the official documentation:

> - JSUnpack **不以 100% 还原原始源码为目标** (Does not aim to 100% restore original source)
> - 多轮打包与混淆后，部分语义信息本身不可逆 (After multiple rounds of bundling/obfuscation, some semantic info is irreversible)
> - 本工具仅用于 **学习、分析、研究与问题定位** (Only for learning, analysis, research, and problem localization)
> - 不提供任何破解、绕过授权或商业保护的能力 (Does not provide cracking, bypassing authorization, or commercial protection circumvention)

## Comparison with Other Tools

| Tool | Approach | Best For | Offline |
|------|----------|----------|---------|
| **JSUnpack** | AI-based analysis | Modern framework bundles | ❌ No |
| **javascript-deobfuscator** | AST-based transformations | Array/proxy obfuscation | ✅ Yes |
| **synchrony** | AST transformers | javascript-obfuscator.io | ✅ Yes |
| **de4js** | Regex unpackers | Multiple obfuscator formats | ✅ Yes |

## Use Cases

### ✅ Appropriate Use Cases

- Learning how a website implements a feature
- Understanding your own production code (lost source)
- Analyzing open-source project builds
- Debugging production JavaScript issues
- Security research (defensive)
- Technical architecture analysis

### ❌ Not For

- Cracking commercial software
- Bypassing license protection
- Stealing proprietary code
- Unauthorized access to systems
- Circumventing authentication

## Pricing

- **Free tier** - Basic analysis available
- **Premium features** - May require subscription
- **API access** - Contact for enterprise use

## Notes

1. This is the **frontend only** - The AI decompilation engine is proprietary
2. For offline tools, use: javascript-deobfuscator, synchrony, or de4js
3. The tool is actively maintained and updated
4. Best results with modern framework-based applications
5. AI analysis quality depends on the complexity of input code

## Alternative Local Tools

If you need offline deobfuscation:
- **javascript-deobfuscator** - Node.js CLI tool (successfully installed)
- **synchrony** - Node.js CLI tool (successfully installed)
- **de4js** - Web interface (https://lelinhtinh.github.io/de4js/)
