import { eventHandler } from "h3"

/**
 * GET /test-stagehand-inner.html
 * Phase 7: 同源 iframe 内页（可点击/可输入/可断言）
 */
export default eventHandler(() => {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stagehand Inner Frame</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; }
      .frame { padding: 16px; }
      #title { margin: 0 0 10px 0; font-size: 16px; }
      #btn {
        position: absolute;
        left: 40px;
        top: 70px;
        width: 140px;
        height: 38px;
        border-radius: 10px;
        border: 1px solid #ddd;
        background: #111;
        color: #fff;
        cursor: pointer;
      }
      #input {
        position: absolute;
        left: 40px;
        top: 120px;
        width: 220px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid #ddd;
        padding: 0 10px;
        outline: none;
      }
      #clickStatus, #typeStatus {
        position: absolute;
        left: 40px;
        top: 165px;
        width: 360px;
        font-size: 13px;
        color: #333;
      }
      #typeStatus { top: 188px; color: #444; }
    </style>
  </head>
  <body>
    <div class="frame">
      <h1 id="title">Inner Frame</h1>
    </div>

    <button id="btn" type="button">Inner Click</button>
    <input id="input" placeholder="Inner type here" />
    <div id="clickStatus">clickStatus: not_clicked</div>
    <div id="typeStatus">typeStatus: empty</div>

    <script>
      const $btn = document.getElementById('btn');
      const $input = document.getElementById('input');
      const $clickStatus = document.getElementById('clickStatus');
      const $typeStatus = document.getElementById('typeStatus');

      $btn.addEventListener('click', () => {
        $clickStatus.textContent = 'clickStatus: clicked';
      });

      $input.addEventListener('input', () => {
        const v = $input.value || '';
        $typeStatus.textContent = 'typeStatus: ' + (v ? 'typed' : 'empty');
      });
    </script>
  </body>
</html>`
})


