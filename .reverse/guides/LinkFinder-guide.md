# LinkFinder Usage Guide

## Overview

**LinkFinder** by GerbenJavado is a Python tool that discovers endpoints and their parameters in JavaScript files. It uses regex patterns to find URLs embedded in JavaScript code, making it useful for penetration testing and bug bounty hunting.

**Repository:** https://github.com/GerbenJavado/LinkFinder
**Language:** Python 3
**License:** GPL-3.0

## Suitable Reverse Engineering Scenarios

- **API endpoint discovery** - Finding hidden or undocumented API endpoints
- **Bug bounty hunting** - Discovering attack surface in web applications
- **Penetration testing** - Mapping target application endpoints
- **Security assessments** - Identifying all JavaScript-exposed URLs
- **URL extraction** - Finding all URLs in JavaScript bundles

## URL Types Detected

LinkFinder can find:

| URL Type | Example Pattern |
|----------|-----------------|
| **Full URLs** | `https://api.example.com/v1/users` |
| **Absolute/dotted URLs** | `//cdn.example.com/lib.js` |
| **Relative URLs with slash** | `/api/v2/data` |
| **Relative URLs without slash** | `dashboard/settings` |

Also detects URLs in:
- String literals
- Function calls (`fetch()`, `XMLHttpRequest.open()`, etc.)
- Variable assignments
- Template literals

## Installation

### Method 1: Clone and Run

```bash
git clone https://github.com/GerbenJavado/LinkFinder.git
cd LinkFinder
pip3 install -r requirements.txt
python3 linkfinder.py
```

### Method 2: System-wide Installation

```bash
git clone https://github.com/GerbenJavado/LinkFinder.git
cd LinkFinder
python3 setup.py install
```

### Requirements

- Python 3.x
- `jsbeautifier` package

## Usage Examples

### Basic Usage

```bash
# Analyze a URL
python3 linkfinder.py -i https://example.com/app.js

# Analyze a local file
python3 linkfinder.py -i /path/to/file.js

# Analyze a directory
python3 linkfinder.py -i /path/to/js/files/

# Analyze a domain and parse all JavaScript
python3 linkfinder.py -d -i https://example.com

# Save output to custom file
python3 linkfinder.py -i https://example.com/app.js -o results.html
```

### Advanced Options

```bash
# Filter results with regex (e.g., only API endpoints)
python3 linkfinder.py -i https://example.com/app.js -r "^/api/" -o api_endpoints.html

# Add cookies for authenticated JS files
python3 linkfinder.py -i https://example.com/protected.js -c "session=abc123" -o output.html

# Set custom timeout
python3 linkfinder.py -i https://slow-example.com/app.js -t 30 -o output.html

# Import from Burp Suite
python3 linkfinder.py -b -i burp_export.xml -o output.html
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `-i INPUT` | Input: URL, file, or folder (required) |
| `-o OUTPUT` | Output file path (default: output.html) |
| `-d, --domain` | Recursively parse all JavaScript in page (domain mode) |
| `-r REGEX` | Filter results with regex pattern |
| `-c COOKIES` | Add cookies for authenticated pages |
| `-t <seconds>` | Server response timeout (default: 10s) |
| `-b, --burp` | Support Burp Suite exported file |
| `-h, --help` | Show help message |

## Expected Output

The tool generates an HTML file with all discovered endpoints:

**Input JavaScript:**
```javascript
var apiEndpoint = "/api/v1/users";
var authUrl = "https://auth.example.com/login";
var relativePath = "dashboard/settings";
var absoluteUrl = "//cdn.example.com/lib.js";
var fetchCall = fetch("/api/items");
xhttp.open("GET", "/services/data");
```

**Output:**
- `/api/v1/users`
- `https://auth.example.com/login`
- `dashboard/settings`
- `//cdn.example.com/lib.js`
- `/api/items`
- `/services/data`

Each endpoint is clickable and shown with context (the surrounding code line).

## Output Format

- **Format:** HTML file
- **Structure:** Clickable links with context
- **Highlighting:** URLs highlighted in yellow
- **Context:** Shows surrounding code for each URL

## Workflow Examples

### Bug Bounty Hunting

```bash
# 1. Find all JavaScript files on a domain
python3 linkfinder.py -d -i https://target.com -o all_endpoints.html

# 2. Look for API endpoints specifically
python3 linkfinder.py -i https://target.com/app.js -r "^/api/" -o api_endpoints.html

# 3. Find admin/management endpoints
python3 linkfinder.py -i https://target.com/app.js -r "admin|manage|config" -o admin_endpoints.html
```

### Security Assessment

```bash
# 1. Scan local JavaScript bundle
python3 linkfinder.py -i ./dist/app.js -o endpoints.html

# 2. Analyze multiple JS files
python3 linkfinder.py -i ./src/**/*.js -o all_endpoints.html

# 3. Test authenticated application
python3 linkfinder.py -i https://app.com/protected.js \
    -c "session_token=xyz123" -o auth_endpoints.html
```

## Limitations

1. **Regex-based** - May produce false positives or miss dynamically constructed URLs
2. **Static analysis** - Doesn't execute code or handle runtime URL generation
3. **Encoded strings** - May miss URLs that are base64 encoded or further obfuscated
4. **Split strings** - May miss URLs split across multiple string concatenations
5. **Parameter extraction** - Finds endpoints but doesn't extract all parameters

## Tips for Best Results

1. **Domain mode** - Use `-d` flag to recursively find all JS files on a domain
2. **Regex filtering** - Use `-r` to focus on specific endpoint patterns
3. **Combine with SecretFinder** - Use LinkFinder for endpoints, SecretFinder for credentials
4. **Analyze bundles** - Run on webpack/rollup bundles for comprehensive endpoint mapping
5. **Manual verification** - Always verify discovered endpoints manually

## Comparison with Similar Tools

| Feature | LinkFinder | SecretFinder | jsluice |
|---------|------------|--------------|---------|
| **Purpose** | Find endpoints | Find secrets | Find URLs + secrets |
| **Method** | Regex | Regex | AST parsing |
| **Context** | Yes | Yes | Yes |
| **Output** | HTML | HTML | JSON/STDOUT |
| **Accuracy** | Good (regex) | Good (regex) | Better (AST) |

## Docker Usage

```bash
# Build Docker image
docker build -t linkfinder .

# Run Docker container
docker run -it linkfinder -i https://example.com/app.js -o output.html
```

## Chrome Extension

A Chrome extension is available (by @karel_origin) for easy browser-based usage:
- Right-click on a page
- Select "LinkFinder"
- View discovered endpoints

## Security Note

**Use LinkFinder responsibly:**
1. Only scan domains you have permission to test
2. Respect robots.txt and rate limits
3. Don't exploit discovered vulnerabilities without authorization
4. Follow responsible disclosure for security findings
