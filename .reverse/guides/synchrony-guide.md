# synchrony Usage Guide

## Overview

**synchrony** (by relative) is a JavaScript cleaner and deobfuscator specifically designed to target code obfuscated with **javascript-obfuscator** (also known as obfuscator.io). It uses AST (Abstract Syntax Tree) based transformations to deobfuscate code.

**Repository:** https://github.com/relative/synchrony
**Web Interface:** https://deobfuscate.relative.im
**Language:** Node.js/TypeScript
**License:** GPL-3.0

## Suitable Reverse Engineering Scenarios

- **javascript-obfuscator / obfuscator.io output** - Primary target, works best on code obfuscated with this tool
- **String array obfuscation** - When code uses string arrays with rotation/shifting
- **Control flow obfuscation** - When code flow is intentionally complicated
- **Dead code removal** - Identifies and removes useless code inserted by obfuscators
- **AST-based transformations** - Uses proper AST parsing rather than regex

## Installation

### Method 1: Local Installation

```bash
cd /path/to/synchrony
npm install
npm run build
```

### Method 2: Global Installation (CLI)

```bash
npm install -g synchrony
# Or using yarn/pnpm
yarn global add synchrony
pnpm add -g synchrony
```

## Usage Examples

### CLI Usage

```bash
# Basic usage - deobfuscates to file.cleaned.js by default
synchrony deobfuscate input.js

# Specify output file
synchrony deobfuscate input.js -o output.js

# Rename symbols automatically
synchrony deobfuscate input.js -o output.js --rename

# Enable loose parsing for malformed code
synchrony deobfuscate input.js -o output.js --loose

# Use custom deobfuscation config
synchrony deobfuscate input.js -o output.js -c custom-config.json

# Specify ECMA version
synchrony deobfuscate input.js -o output.js --ecma-version 2020

# Show help
synchrony --help
```

### Web Interface

Visit https://deobfuscate.relative.im and paste your obfuscated code.

## Expected Output

The tool runs multiple transformers in sequence:
- **Simplify** - Simplify expressions
- **MemberExpressionCleaner** - Clean member expressions
- **LiteralMap** - Map literal values
- **DeadCode** - Remove dead code
- **Demangle** - Demangle identifiers
- **StringDecoder** - Decode encoded strings
- **Desequence** - Flatten sequences
- **ControlFlow** - Improve control flow

**Input:**
```javascript
var _0x4b2a=['hello','world','log'];(function(_0x1a2b3c,_0x4d5e6f){var _0x7g8h9i=function(_0x10j2k3l){while(--_0x10j2k3l){_0x1a2b3c['push'](_0x1a2b3c['shift']());}};_0x7g8h9i(++_0x4d5e6f);}(_0x4b2a,0x1f4));var _0x9m0n1o=function(_0x2o3p4q,_0x5r6s7t){_0x2o3p4q=_0x2o3p4q-0x0;var _0x8u9v0w=_0x4b2a[_0x2o3p4q];return _0x8u9v0w;};console[_0x9m0n1o('0x2')](_0x9m0n1o('0x0'),_0x9m0n1o('0x1'));
```

**Output:**
```javascript
var _0x4b2a = [
    'hello',
    'world',
    'log'
];
(function (_0x1a2b3c, _0x4d5e6f) {
    var _0x7g8h9i = function (_0x10j2k3l) {
        while (--_0x10j2k3l) {
            _0x1a2b3c.push(_0x1a2b3c.shift());
        }
    };
    _0x7g8h9i(++_0x4d5e6f);
}(_0x4b2a, 500));
var _0x9m0n1o = function (_0x2o3p4q, _0x5r6s7t) {
    _0x2o3p4q = _0x2o3p4q - 0;
    var _0x8u9v0w = _0x4b2a[_0x2o3p4q];
    return _0x8u9v0w;
};
console[_0x9m0n1o('0x2')](_0x9m0n1o('0x0'), _0x9m0n1o('0x1'));
```

Note: The output is beautified and some transformations are applied. The tool runs multiple transformers but may not fully resolve all obfuscation layers in a single pass.

## Output Format

- **Format:** Beautified JavaScript code
- **File:** Written to specified output file (default: `input.cleaned.js`)
- **Transformers:** Multiple AST-based transformers applied sequentially

## Transformer Details

The tool uses the following transformers:

| Transformer | Purpose |
|-------------|---------|
| Simplify | Simplify arithmetic and logical expressions |
| MemberExpressionCleaner | Clean computed member expressions |
| LiteralMap | Map literal values to their usage |
| DeadCode | Remove unreachable code |
| Demangle | Rename obfuscated identifiers |
| StringDecoder | Decode string encoding |
| Desequence | Flatten sequence expressions |
| ControlFlow | Improve control flow structure |

## Limitations

1. **Primary target:** Works best on javascript-obfuscator/obfuscator.io output
2. **Older versions:** May not work correctly on very old versions of javascript-obfuscator
3. **No user configuration:** Currently doesn't support user-defined transformer configurations
4. **Partial deobfuscation:** May not fully resolve all obfuscation in a single pass
5. **Transformer errors:** If a transformer encounters an error, it will display output and request filing a GitHub issue

## Command Options

| Option | Description |
|--------|-------------|
| `file` | File to deobfuscate (required) |
| `-o, --output` | Where to output deobfuscated file |
| `--rename` | Rename symbols automatically |
| `--ecma-version` | Set ECMA version for AST parser |
| `-c, --config` | Supply custom deobfuscation config |
| `-l, --loose` | Enable loose parsing for malformed code |
| `--sourceType` | Source type ('script', 'module', or 'both') |
| `--help` | Display help information |
| `--version` | Display version number |

## Tips for Best Results

1. **Target obfuscator:** This tool is specifically designed for javascript-obfuscator.io output
2. **Multiple passes:** For heavily obfuscated code, consider running the tool multiple times
3. **Combine with other tools:** Use other deobfuscators after synchrony for additional cleanup
4. **Report issues:** If you encounter transformer errors, file a GitHub issue with the terminal output
5. **Check web interface:** The web interface may have newer features than the CLI

## Comparison with javascript-deobfuscator

| Feature | synchrony | javascript-deobfuscator |
|---------|-----------|------------------------|
| Primary target | javascript-obfuscator.io | General-purpose |
| Approach | AST-based transformers | Shift-AST based |
| License | GPL-3.0 | ISC |
| Web interface | Yes (deobfuscate.relative.im) | Yes (deobfuscate.io) |
| Config | Currently not available | Standard CLI options |
