import { eventHandler } from "h3"

/**
 * GET /test-stagehand.html
 * Phase 6 固定布局测试页：
 * - 固定坐标按钮（用于 clickAt）
 * - 固定坐标输入框（用于 clickAt + type）
 * - 固定文本元素（用于 extract selector）
 */
export default eventHandler(() => {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stagehand Test Page</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; }
      .frame { padding: 24px; }
      #title { margin: 0 0 12px 0; }
      .hint { color: #666; font-size: 12px; margin-bottom: 12px; }

      /* 固定坐标区域（绝对定位，避免布局变化） */
      #btn {
        position: absolute;
        left: 80px;
        top: 120px;
        width: 160px;
        height: 44px;
        border-radius: 10px;
        border: 1px solid #ddd;
        background: #111;
        color: #fff;
        cursor: pointer;
      }
      #input {
        position: absolute;
        left: 80px;
        top: 190px;
        width: 260px;
        height: 38px;
        border-radius: 10px;
        border: 1px solid #ddd;
        padding: 0 12px;
        outline: none;
      }
      #clickStatus, #typeStatus, #keyStatus {
        position: absolute;
        left: 80px;
        top: 250px;
        width: 420px;
        font-size: 14px;
        color: #333;
      }
      #typeStatus { top: 276px; color: #444; }
      #keyStatus { top: 302px; color: #555; }
      code { background: #f6f6f6; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="frame">
      <h1 id="title">Stagehand Fixed Layout Test</h1>
      <div class="hint">
        建议点击坐标：按钮中心 <code>(160, 142)</code>，输入框中心 <code>(210, 209)</code>
      </div>
    </div>

    <button id="btn" type="button">Click Me</button>
    <input id="input" placeholder="Type here" />
    <div id="clickStatus">clickStatus: not_clicked</div>
    <div id="typeStatus">typeStatus: empty</div>
    <div id="keyStatus">keyStatus: 0</div>

    <script>
      const $btn = document.getElementById('btn');
      const $input = document.getElementById('input');
      const $clickStatus = document.getElementById('clickStatus');
      const $typeStatus = document.getElementById('typeStatus');
      const $keyStatus = document.getElementById('keyStatus');
      let keyCount = 0;

      $btn.addEventListener('click', () => {
        $clickStatus.textContent = 'clickStatus: clicked';
      });

      $input.addEventListener('input', () => {
        const v = $input.value || '';
        $typeStatus.textContent = 'typeStatus: ' + (v ? 'typed' : 'empty');
      });

      document.addEventListener('keydown', () => {
        keyCount += 1;
        $keyStatus.textContent = 'keyStatus: ' + keyCount;
      });
    </script>
  </body>
</html>`
})


