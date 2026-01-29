# deobfuscate-js (top-master/deobfuscate-js) - Installation Failed

## Project Information

**Repository:** https://github.com/top-master/deobfuscate-js
**Original Repository:** https://github.com/lelinhtinh/de4js
**Language:** Ruby (Jekyll) + JavaScript
**Purpose:** JavaScript deobfuscator and unpacker with web interface

## Note: This is a Fork

This repository (`top-master/deobfuscate-js`) is a fork of the original `lelinhtinh/de4js` project. Both are essentially the same tool.

## Failure Reason

**Ruby/Jekyll stack setup issues:**
1. **Jekyll not installed** - Requires `gem install jekyll` which needs to compile native extensions
2. **Complex dependencies** - Requires Ruby, Bundler, Jekyll, github-pages gem, nokogiri, etc.
3. **Ruby version compatibility** - Project requires Ruby 2.1.0+, system has Ruby 2.6.10 (older)
4. **macOS-specific issues** - Native gem compilation on macOS ARM64 can be problematic

## Attempted Solutions

### Attempt 1: Gem Install (Timeout)
```bash
gem install jekyll
# Command timed out - installing Jekyll and dependencies takes significant time
```

### Attempt 2: Docker (Docker Daemon Not Running)
```bash
cd deobfuscate-js && docker-compose up -d
# Error: Cannot connect to Docker daemon - Docker Desktop not running
```

## What This Tool Does

de4js is a **web-based JavaScript deobfuscator and unpacker** with support for:

| Deobfuscator Type | Examples |
|-------------------|----------|
| **Eval** | Packer, WiseLoop |
| **Array** | Javascript Obfuscator, Free JS Obfuscator |
| **Number encoding** | Custom number encoding |
| **Packer** | Dean Edwards Packer |
| **Javascript Obfuscator** | javascriptobfuscator.com |
| **Free JS Obfuscator** | freejsobfuscator.com |
| **Obfuscator.IO** | obfuscator.io (partial, not all cases) |
| **My Obfuscate** | myobfuscate.com |
| **URL encode** | Bookmarklets |
| **JSFuck** | jsfuck encoding |
| **JJencode** | UTF-8 JP JJencode |
| **AAencode** | UTF-8 JP AAencode |
| **WiseLoop** | WiseLoop PHP/JS obfuscator |

## How to Use (if you can set it up)

### Option 1: Docker (Recommended)

```bash
# Start Docker Desktop first
open -a Docker

# Wait for Docker to be ready
docker info

# Run de4js
cd deobfuscate-js
docker-compose up -d

# Access at http://localhost:4000/de4js/
```

### Option 2: Local Jekyll Installation

```bash
# Install Jekyll and dependencies
gem install bundler jekyll
bundle install

# Install Workbox CLI (for service worker)
npm install workbox-cli --global

# Start server
npm start
# Or with livereload:
npm run watch

# Access at http://localhost:4000/de4js/
```

### Option 3: Use Official Website

The easiest way to use de4js is via the official website:
**https://lelinhtinh.github.io/de4js/**

Simply:
1. Visit https://lelinhtinh.github.io/de4js/
2. Paste obfuscated JavaScript
3. Select deobfuscator type
4. View deobfuscated output

## Features

- Works offline (once loaded)
- Source code beautifier / syntax highlighter
- Multiple deobfuscator support (13+ types)
- Supports esoteric encodings (JSFuck, JJencode, AAencode)
- Web interface for easy use

## Limitations

1. **Obfuscator.IO support incomplete** - "Obfuscator.IO is always up to date. The automatic deobfuscation tools (including this project) will usually not match its latest version."
2. **Last updated 2021** - Not actively maintained
3. **Complex setup** - Ruby/Jekyll stack is difficult to set up
4. **No CLI** - Web interface only (unless you build custom wrapper)

## Alternative Tools

Since this tool couldn't be installed, consider using:

| Tool | Type | Use Case |
|------|------|----------|
| **javascript-deobfuscator** | CLI/Library | General deobfuscation (Node.js) |
| **synchrony** | CLI/Library | javascript-obfuscator.io deobfuscation (Node.js) |
| **deobfuscate.io** | Web Interface | Same as javascript-deobfuscator web version |

## Note About Duplicate

This project is essentially the same as **lelinhtinh/de4js** (also in the projects list). They both provide the same web-based deobfuscation service.
