import { eventHandler } from "h3"

/**
 * GET /test-multi-resource.html
 * 测试页面：多资源加载
 * 包含多个图片资源来测试网络空闲检测
 */
export default eventHandler(() => {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Multi Resource Page</title>
  <style>
    body { font-family: system-ui; padding: 24px; }
    .status { color: #666; margin-top: 12px; }
    .images { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
    .images img { width: 80px; height: 80px; border: 1px solid #ddd; }
    .resource-info { font-size: 12px; color: #999; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>Multi Resource Page</h1>
  <p>This page loads multiple resources to test network idle detection.</p>
  <div class="status" id="status">Loading resources...</div>
  <div class="resource-info" id="resource-info">0 / 6 resources loaded</div>
  
  <div class="images">
    <img src="/slow-image.png?delay=300" alt="Image 1" />
    <img src="/slow-image.png?delay=500" alt="Image 2" />
    <img src="/slow-image.png?delay=700" alt="Image 3" />
    <img src="/slow-image.png?delay=900" alt="Image 4" />
    <img src="/slow-image.png?delay=1100" alt="Image 5" />
    <img src="/slow-image.png?delay=1300" alt="Image 6" />
  </div>
  
  <script>
    let loadedCount = 0;
    const totalImages = 6;
    
    // Track image loads
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      img.onload = () => {
        loadedCount++;
        console.log(\`Image \${index + 1} loaded at\`, Date.now());
        document.getElementById('resource-info').textContent = 
          \`\${loadedCount} / \${totalImages} resources loaded\`;
        
        if (loadedCount === totalImages) {
          document.getElementById('status').textContent = 'All resources loaded!';
        }
      };
      img.onerror = () => {
        loadedCount++;
        console.log(\`Image \${index + 1} failed to load\`);
        document.getElementById('resource-info').textContent = 
          \`\${loadedCount} / \${totalImages} resources processed\`;
      };
    });
    
    // Log load events
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded fired at', Date.now());
    });
    
    window.addEventListener('load', () => {
      console.log('Load event fired at', Date.now());
      if (loadedCount === totalImages) {
        document.getElementById('status').textContent = 'Page fully loaded!';
      }
    });
  </script>
</body>
</html>`
})



