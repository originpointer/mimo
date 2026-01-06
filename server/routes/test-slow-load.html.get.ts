import { eventHandler } from "h3"

/**
 * GET /test-slow-load.html
 * 测试页面：延迟加载
 * 通过动态添加图片资源来延迟 load 事件
 */
export default eventHandler(() => {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Slow Loading Page</title>
  <style>
    body { font-family: system-ui; padding: 24px; }
    .status { color: #666; margin-top: 12px; }
  </style>
</head>
<body>
  <h1>Slow Loading Page</h1>
  <p>This page delays the load event by adding a slow-loading image.</p>
  <div class="status" id="status">Loading...</div>
  <div id="image-container"></div>
  
  <script>
    // Log DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded fired at', Date.now());
      document.getElementById('status').textContent = 'DOMContentLoaded fired, adding slow image...';
      
      // Add slow-loading image to delay load event
      const img = document.createElement('img');
      img.src = '/slow-image.png?delay=2000';
      img.style.width = '100px';
      img.style.height = '100px';
      img.onload = () => {
        console.log('Slow image loaded at', Date.now());
        document.getElementById('status').textContent = 'Image loaded!';
      };
      img.onerror = () => {
        console.log('Image failed to load');
        document.getElementById('status').textContent = 'Image failed to load';
      };
      document.getElementById('image-container').appendChild(img);
    });
    
    // Log load event
    window.addEventListener('load', () => {
      console.log('Load event fired at', Date.now());
      document.getElementById('status').textContent = 'Page fully loaded!';
    });
  </script>
</body>
</html>`
})

