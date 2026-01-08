import { eventHandler } from "h3"

/**
 * GET /test-instant.html
 * 测试页面：快速加载
 * 简单页面，用于测试 check API
 */
export default eventHandler(() => {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Instant Page</title>
  <style>
    body { font-family: system-ui; padding: 24px; }
  </style>
</head>
<body>
  <h1>Instant Loading Page</h1>
  <p>This is a simple page that loads instantly.</p>
  
  <script>
    console.log('Page loaded at', Date.now());
    
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded at', Date.now());
    });
    
    window.addEventListener('load', () => {
      console.log('Load event at', Date.now());
    });
  </script>
</body>
</html>`
})



