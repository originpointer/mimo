# javascript-deobfuscator Usage Guide

## Overview

**javascript-deobfuscator** is a general-purpose JavaScript deobfuscation tool by ben-sb. It removes common obfuscation techniques including:
- Array unpacking (arrays containing literals like strings and numbers)
- Proxy function removal (simple, array, and arithmetic proxies)
- Expression simplification (arithmetic and string expressions)
- Hexadecimal identifier renaming (e.g., `_0xca830a`)
- Code beautification
- Computed to static member expression conversion

**Repository:** https://github.com/ben-sb/javascript-deobfuscator
**Web Interface:** https://deobfuscate.io
**Language:** Node.js/TypeScript

## Suitable Reverse Engineering Scenarios

- **Array-based obfuscation** - When code uses string arrays with index-based access
- **Proxy function patterns** - Functions that wrap access to values or operations
- **Hexadecimal identifiers** - Variables named with hex codes like `_0x4b2a`
- **Compressed/minified code** - General code beautification
- **Arithmetic obfuscation** - Complex arithmetic expressions that hide simple values
- **String concatenation patterns** - Split strings reassembled at runtime

## Installation

### Method 1: Local Installation (Recommended)

```bash
cd /Users/sodaabe/Desktop/manus-reverse/projects/javascript-deobfuscator
npm install
npm run prepare  # Builds TypeScript to dist/
```

### Method 2: Global Installation (CLI Usage)

```bash
npm install -g js-deobfuscator
```

### Method 3: As a Library

```bash
npm install js-deobfuscator
```

## Usage Examples

### CLI Usage

```bash
# Basic usage (uses default input/output paths)
node dist/cli.js

# Specify input and output files
node dist/cli.js -i input/source.js -o output/result.js

# Parse ESModule format
node dist/cli.js -i input/source.js -o output/result.js -m

# Show help
node dist/cli.js --help
```

### As a Node.js Library

```javascript
import { deobfuscate } from 'js-deobfuscator';

const obfuscatedCode = `
    var _0x4b2a=['hello','world','log'];
    (function(_0x1a2b3c,_0x4d5e6f){
        // ... obfuscated code ...
    }(_0x4b2a,0x1f4));
`;

const deobfuscatedCode = deobfuscate(obfuscatedCode);
console.log(deobfuscatedCode);
```

### Web Interface

Visit https://deobfuscate.io and paste your obfuscated code directly.

## Expected Output

The tool transforms obfuscated code into more readable form:

**Input:**
```javascript
var _0x4b2a=['hello','world','log'];(function(_0x1a2b3c,_0x4d5e6f){var _0x7g8h9i=function(_0x10j2k3l){while(--_0x10j2k3l){_0x1a2b3c['push'](_0x1a2b3c['shift']());}};_0x7g8h9i(++_0x4d5e6f);}(_0x4b2a,0x1f4));var _0x9m0n1o=function(_0x2o3p4q,_0x5r6s7t){_0x2o3p4q=_0x2o3p4q-0x0;var _0x8u9v0w=_0x4b2a[_0x2o3p4q];return _0x8u9v0w;};console[_0x9m0n1o('0x2')](_0x9m0n1o('0x0'),_0x9m0n1o('0x1'));
```

**Output:**
```javascript
var _0x4b2a = ["hello", "world", "log"];
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
console[_0x9m0n1o("0x2")](_0x9m0n1o("0x0"), _0x9m0n1o("0x1"));
```

**Note:** The tool beautifies and partially deobfuscates the code, making it more readable. However, complete deobfuscation (fully resolving all function calls to their actual values) often requires additional manual analysis or multiple tool passes.

## Output Format

- **Format:** Beautified JavaScript code
- **File:** Written to specified output file (default: `output/output.js`)
- **Quality:** Improved readability but may not fully resolve all obfuscation layers

## Limitations

1. **Partial deobfuscation** - Makes code more readable but may not fully resolve all obfuscation
2. **Single-pass processing** - Complex obfuscation may require running multiple tools in sequence
3. **No execution** - Static analysis only; doesn't execute code to resolve runtime values
4. **Specific patterns** - Works best on array-based and proxy function obfuscation; may struggle with custom obfuscators

## Tips for Best Results

1. **Run multiple tools** - Use this tool first, then try other deobfuscators for additional cleanup
2. **Manual analysis** - After deobfuscation, analyze the code structure to identify remaining patterns
3. **Check for eval** - If code uses `eval()`, consider dynamic analysis approaches
4. **Combine with beautifiers** - Additional code formatters can further improve readability
