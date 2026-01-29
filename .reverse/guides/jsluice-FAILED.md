# jsluice - Installation Failed

## Project Information

**Repository:** https://github.com/BishopFox/jsluice
**Language:** Go
**Purpose:** Extracts URLs, paths, secrets, and interesting data from JavaScript using tree-sitter parsing

## Failure Reason

**Go is not installed** on this system. jsluice requires Go to be installed and compiled.

## Installation Requirements

To install jsluice, you need:
1. Go programming language (golang.org)
2. Go toolchain (go install)

## Installation Instructions (if Go is available)

```bash
# Install Go CLI tool
go install github.com/BishopFox/jsluice/cmd/jsluice@latest

# Or use as a Go package
go get github.com/BishopFox/jsluice
```

## CLI Usage (once installed)

```bash
# Extract URLs
jsluice urls example.js | jq

# Extract secrets
jsluice secrets awskey.js | jq

# Show AST tree
jsluice tree hello.js

# Format/beautify code
jsluice format test.js

# Custom query
jsluice query -q '(string) @str' config.js
```

## Features

- **AST-based parsing** - Uses tree-sitter for better accuracy than regex
- **URL extraction** - Finds URLs in context (fetch, window.open, etc.)
- **Secret detection** - Finds API keys and tokens
- **Context awareness** - Understands string concatenation
- **JSON output** - JSONL format for easy processing
- **Static analysis** - Doesn't execute code

## Installing Go (macOS)

```bash
# Using Homebrew
brew install go

# Or download from https://go.dev/dl/
```

## Alternative Approach

Since jsluice is not available, consider using:
- **LinkFinder** - For URL endpoint discovery (Python, already installed)
- **SecretFinder** - For secret discovery (Python, already installed)
- **jsluice online** - May be available as a web service

## Notes

If you wish to use jsluice:
1. Install Go from https://go.dev/dl/
2. Run `go install github.com/BishopFox/jsluice/cmd/jsluice@latest`
3. The binary will be installed to `~/go/bin/jsluice`
4. Add `~/go/bin` to your PATH
