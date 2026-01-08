import { eventHandler } from "h3"

export default eventHandler(() => {
  return `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Skills 搜索</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; }
    .row { display:flex; gap: 8px; align-items:center; flex-wrap: wrap; }
    input { padding: 10px 12px; width: min(720px, 92vw); font-size: 16px; }
    button { padding: 10px 12px; font-size: 16px; cursor: pointer; }
    .meta { color:#555; margin-top: 8px; }
    .hit { border: 1px solid #eee; border-radius: 10px; padding: 12px; margin-top: 12px; }
    .name { font-weight: 700; font-size: 18px; }
    .desc { color:#333; margin-top: 6px; }
    .snippet { color:#444; margin-top: 8px; }
    .path { color:#666; margin-top: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas; font-size: 12px; }
    mark.orama-highlight { background: #ffe58f; padding: 0 2px; border-radius: 3px; }
    .error { color: #b00020; margin-top: 10px; white-space: pre-wrap; }
  </style>
  <h1>Skills 快速定位</h1>
  <p class="meta">从 <code>SKILLS_DIR</code> 扫描一层目录的 <code>*/SKILL.md</code>，使用 Orama(BM25)+中文 tokenizer/stopwords 检索。</p>

  <div class="row">
    <input id="q" placeholder="输入关键词（中文/英文），例如：最小权限、allowed-tools、子代理、优先级…" />
    <button id="btn">搜索</button>
  </div>
  <div class="meta" id="meta"></div>
  <div class="error" id="err"></div>
  <div id="results"></div>

  <script>
    const $q = document.getElementById('q');
    const $btn = document.getElementById('btn');
    const $meta = document.getElementById('meta');
    const $err = document.getElementById('err');
    const $results = document.getElementById('results');

    function escapeHtml(s) {
      return String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    }

    async function runSearch() {
      const query = ($q.value || '').trim();
      $err.textContent = '';
      $results.innerHTML = '';
      $meta.textContent = '';
      if (!query) return;

      const url = '/api/skills/search?q=' + encodeURIComponent(query) + '&limit=10';
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok) {
        $err.textContent = data.error || '查询失败';
        return;
      }

      $meta.textContent = 'docsCount=' + data.docsCount + '  skillsDir=' + data.skillsDir;

      const hits = data.hits || [];
      if (!hits.length) {
        $results.innerHTML = '<div class="meta">无结果</div>';
        return;
      }

      $results.innerHTML = hits.map(h => {
        const score = (h.score ?? 0).toFixed(4);
        return (
          '<div class="hit">' +
            '<div class="name">' + (h.nameHTML || escapeHtml(h.id)) + '</div>' +
            '<div class="desc">' + (h.descriptionHTML || '') + '</div>' +
            '<div class="snippet">' + (h.snippetHTML || '') + '</div>' +
            '<div class="path">score=' + score + ' · ' + escapeHtml(h.path || '') + '</div>' +
          '</div>'
        );
      }).join('');
    }

    $btn.addEventListener('click', runSearch);
    $q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runSearch();
    });
  </script>
  `
})


