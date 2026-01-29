# SecretFinder Usage Guide

## Overview

**SecretFinder** by m4ll0k is a Python tool that finds sensitive data (secrets, API keys, tokens) in JavaScript files. It uses regex patterns to detect various types of credentials and sensitive information embedded in JavaScript code.

**Repository:** https://github.com/m4ll0k/SecretFinder
**Language:** Python 3
**Based on:** LinkFinder (forked and enhanced for secret detection)

## Suitable Reverse Engineering Scenarios

- **Security assessments** - Finding hardcoded credentials in web applications
- **Bug bounty hunting** - Discovering leaked API keys and tokens
- **Penetration testing** - Extracting secrets from JavaScript bundles
- **Code audits** - Checking for accidental credential exposure
- **JavaScript file analysis** - Finding sensitive data in minified/obfuscated JS

## Secret Types Detected

SecretFinder includes built-in regex patterns for:

| Category | Patterns |
|----------|----------|
| **Google** | API keys, Captcha, OAuth tokens |
| **Amazon AWS** | Access key IDs, Secret access keys |
| **Facebook** | Access tokens |
| **Authentication** | Basic auth, Bearer tokens, API keys in headers |
| **Payment** | Mailgun, Twilio, PayPal, Square, Stripe API keys |
| **GitHub** | Personal access tokens |
| **Cryptographic** | RSA, DSA, EC, PGP private keys |
| **JWT** | JSON Web Tokens |
| **General** | Authorization headers, various API key formats |

## Installation

```bash
git clone https://github.com/m4ll0k/SecretFinder.git secretfinder
cd secretfinder
pip3 install -r requirements.txt
python3 SecretFinder.py
```

### Requirements

- Python 3.x
- Required packages: `requests`, `requests_file`, `jsbeautifier`, `lxml`

## Usage Examples

### Basic Usage

```bash
# Analyze a URL
python3 SecretFinder.py -i https://example.com/app.js

# Analyze a local file
python3 SecretFinder.py -i /path/to/file.js

# Analyze a directory
python3 SecretFinder.py -i /path/to/js/files/

# Save output to custom file
python3 SecretFinder.py -i https://example.com/app.js -o results.html
```

### Advanced Options

```bash
# Extract all JS links from a page and process them
python3 SecretFinder.py -i https://example.com -e -o output.html

# Filter results with regex
python3 SecretFinder.py -i https://example.com/app.js -r "^AKIA" -o aws_keys.html

# Add cookies for authenticated JS files
python3 SecretFinder.py -i https://example.com/protected.js -c "session=abc123" -o output.html

# Set custom headers
python3 SecretFinder.py -i https://example.com/api.js -H "Authorization:Bearer token" -o output.html

# Use proxy
python3 SecretFinder.py -i https://example.com/app.js -p 127.0.0.1:8080 -o output.html

# Process only specific JS files (contain string)
python3 SecretFinder.py -i https://example.com -n "app;main" -o output.html

# Ignore specific JS files (contain string)
python3 SecretFinder.py -i https://example.com -g "analytics;tracking" -o output.html
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `-i INPUT` | Input: URL, file, or folder (required) |
| `-o OUTPUT` | Output file path (default: output.html) |
| `-e, --extract` | Extract all JavaScript links from page and process |
| `-r REGEX` | Filter results with regex pattern |
| `-c COOKIE` | Add cookies for authenticated pages |
| `-H HEADERS` | Set custom headers |
| `-p PROXY` | Set proxy (host:port) |
| `-g IGNORE` | Ignore JS URLs containing these strings (semicolon separated) |
| `-n ONLY` | Process only JS URLs containing these strings (semicolon separated) |
| `-b, --burp` | Support Burp exported file |
| `-h, --help` | Show help message |

## Expected Output

The tool generates an HTML file with highlighted findings:

**Input JavaScript:**
```javascript
var apiKey = "AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe";
var awsKey = "AKIAIOSFODNN7EXAMPLE";
var jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**Output Categories Found:**
- **google api** - Detected Google API key pattern
- **amazon aws access key id** - Detected AWS access key pattern
- **Authorization headers** - Detected Bearer tokens, Basic auth

Each finding is highlighted in yellow with the matching line context.

## Output Format

- **Format:** HTML file with highlighted findings
- **Structure:** Grouped by secret type (google api, aws, facebook, etc.)
- **Highlighting:** Matching patterns highlighted in yellow
- **Context:** Shows the surrounding code line

## Limitations

1. **Regex-based** - May produce false positives or miss custom formats
2. **Static analysis** - Doesn't execute code, only scans source text
3. **Encoded secrets** - May miss secrets that are base64 encoded or further obfuscated
4. **Split strings** - May miss secrets split across multiple string concatenations

## Tips for Best Results

1. **Combine with LinkFinder** - Use LinkFinder to find endpoints, SecretFinder to find secrets
2. **Analyze bundles** - Run on webpack/rollup bundles for comprehensive secret scanning
3. **Custom regex** - Use `-r` flag to filter for specific patterns you're interested in
4. **Authenticated testing** - Use `-c` and `-H` flags for testing protected JavaScript files
5. **HTML output** - Open HTML in browser for easy review of findings

## Comparison with LinkFinder

| Feature | SecretFinder | LinkFinder |
|---------|--------------|------------|
| **Purpose** | Find secrets/credentials | Find endpoints/URLs |
| **Based on** | LinkFinder fork | Original tool |
| **Patterns** | Regex for secrets | Regex for URLs |
| **Output** | HTML with secrets | HTML with endpoints |
| **Use case** | Credential discovery | Endpoint mapping |

## Example Workflow

```bash
# 1. Crawl a website to find all JavaScript files
python3 SecretFinder.py -i https://target.com -e -o all_secrets.html

# 2. Look for AWS keys specifically
python3 SecretFinder.py -i https://target.com -r "^AKIA" -o aws_keys.html

# 3. Scan local JavaScript bundle
python3 SecretFinder.py -i ./dist/app.js -o local_secrets.html

# 4. Test authenticated endpoint
python3 SecretFinder.py -i https://app.com/protected.js \
    -c "session=xyz123" -H "X-CSRF-Token: abc" -o auth_secrets.html
```

## Security Note

**Always responsibly disclose found secrets:**
1. Never use discovered credentials for unauthorized access
2. Report findings to the application owner
3. Follow responsible disclosure policies
4. Revoke/rotate any exposed credentials immediately
