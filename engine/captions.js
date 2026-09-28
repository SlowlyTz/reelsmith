// Caption timing shared by every style: display words of each narration line aligned to the spoken
// (Whisper) words, grouped into phrases and readable chunks. Styles only draw (styles/<style>/subtitles.js).
// A line's `sub` replaces `text` for display (`false` = no caption); in `sub`, *word* marks an accent word.
(function () {
  const VG = window.VG;

  const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
  function sim(a, b) {
    if (!a || !b) return 0; if (a === b) return 1;
    const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return 1 - d[m][n] / Math.max(m, n);
  }
  // Needleman–Wunsch: text words ↔ spoken words; unmatched text words take the unmatched spoken words
  // (or the gap) between their neighbours, so every displayed word gets [start, end].
  function align(disp, spoken, t0, t1) {
    const A = disp.map((w) => norm(w.w)), B = spoken.map((w) => norm(w[0])), m = A.length, n = B.length, GAP = -0.55;
    if (!n) return disp.map((_, i) => [t0 + ((t1 - t0) * i) / m, t0 + ((t1 - t0) * (i + 1)) / m]);
    const S = Array.from({ length: m + 1 }, () => new Float64Array(n + 1)), P = Array.from({ length: m + 1 }, () => new Int8Array(n + 1));
    for (let i = 1; i <= m; i++) { S[i][0] = i * GAP; P[i][0] = 1; }
    for (let j = 1; j <= n; j++) { S[0][j] = j * GAP; P[0][j] = 2; }
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      const d = S[i - 1][j - 1] + 2 * sim(A[i - 1], B[j - 1]) - 1, u = S[i - 1][j] + GAP, l = S[i][j - 1] + GAP;
      if (d >= u && d >= l) { S[i][j] = d; P[i][j] = 0; } else if (u >= l) { S[i][j] = u; P[i][j] = 1; } else { S[i][j] = l; P[i][j] = 2; }
    }
    const match = new Array(m).fill(-1);
    for (let i = m, j = n; i > 0 || j > 0;) { const p = i && j ? P[i][j] : i ? 1 : 2; if (p === 0) { match[--i] = --j; } else if (p === 1) i--; else j--; }
    const out = new Array(m);
    for (let i = 0; i < m;) {
      if (match[i] >= 0) {                                                  // absorb spoken words split off it ("Karstadt" "-Dach")
        const nx = i === m - 1 ? n : match[i + 1], s = spoken[match[i]];
        out[i] = [s[1], nx >= 0 ? spoken[Math.max(match[i], nx - 1)][2] : s[2]]; i++; continue;
      }
      let k = i; while (k < m && match[k] < 0) k++;                        // run [i, k) without a match
      const ja = i ? match[i - 1] : -1, jb = k < m ? match[k] : n;
      const a = ja >= 0 ? spoken[ja][2] : t0, b = jb < n ? spoken[jb][1] : t1, free = spoken.slice(ja + 1, jb);
      for (let r = i; r < k; r++) {
        const f = (r - i) / (k - i), g = (r - i + 1) / (k - i);
        if (free.length) { const x = free[Math.floor(f * free.length)], y = free[Math.max(0, Math.ceil(g * free.length) - 1)]; out[r] = [x[1], y[2]]; }
        else out[r] = [a + (b - a) * f, a + (b - a) * g];
      }
      i = k;
    }
    for (let i = 1; i < m; i++) out[i][0] = Math.max(out[i][0], out[i - 1][0] + 0.02);  // strictly increasing starts
    return out;
  }

  // display words of every line: { w, accent, a (start), b (end), line }
  let cache = null, cacheT = null;
  function words() {
    if (cache && cacheT === VG.T) return cache;
    cache = []; cacheT = VG.T;
    for (const def of VG.story.lines || []) {
      const L = VG.T.lines[def.id]; if (!L || def.sub === false) continue;
      const src = (def.sub ?? def.text).replace(/^…\s*/, '');
      const disp = [];
      for (const tok of src.split(/\s+/).filter(Boolean)) {
        const w = tok.replace(/\*/g, '');
        if (!/[\p{L}\p{N}]/u.test(w) && disp.length) { disp[disp.length - 1].w += ' ' + w; continue; }   // "…", "–" belong to the word before
        disp.push({ w, accent: /\*/.test(tok) });
      }
      const times = align(disp, L.words || [], L.start, L.speechEnd);
      disp.forEach((d, i) => cache.push(Object.assign(d, { a: times[i][0], b: times[i][1], line: def.id })));
    }
    cache.sort((p, q) => p.a - q.a);
    return cache;
  }

  // phrases end at punctuation, a new line or a pause
  function phrases(ws = words(), pause = 0.8) {
    const out = []; let cur = [];
    ws.forEach((w, i) => {
      if (cur.length && (cur[0].line !== w.line || w.a - cur[cur.length - 1].b > pause)) { out.push(cur); cur = []; }
      cur.push(w);
      const nx = ws[i + 1], punct = /[.!?;:…]$/.test(w.w) || (/[,–—]$/.test(w.w) && cur.length >= 3);
      if (punct && nx && cur.length >= 2) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out;
  }

  // split a phrase into as few chunks as `maxWords` and `fits(words)` allow; two chunks are cut where a
  // reader would pause (before prepositions/conjunctions, never after an article), more are balanced
  const BREAK_BEFORE = new Set(('from by into in on at with to for of and or but when while because that which as than until ' +
    'von mit und oder aber wenn weil dass bis auf für als wie damit ob').split(' '));
  const NO_END = new Set(('a an the is are was its his her their my your our by of in into to from with at on for and or ' +
    'der die das den dem des ein eine einen einem einer dein deine mein meine sein seine ihr ihre ist sind zu von mit und oder im am auf für').split(' '));
  function split(ph, maxWords, fits = () => true) {
    let k = Math.ceil(ph.length / maxWords);
    const parts = (n) => Array.from({ length: n }, (_, j) => ph.slice(Math.round((j * ph.length) / n), Math.round(((j + 1) * ph.length) / n)));
    const ok = (p) => p.length <= maxWords && fits(p);
    while (k < ph.length && !parts(k).every(ok)) k++;
    let out = parts(k);
    if (k === 2) {
      const n = ph.length, key = (w) => w.w.toLowerCase().replace(/[^\p{L}']/gu, '');
      let best = -1e9;
      for (let j = Math.ceil(n * 0.35); j <= Math.floor(n * 0.65); j++) {
        const a = ph.slice(0, j), b = ph.slice(j); if (!ok(a) || !ok(b)) continue;
        const sc = (BREAK_BEFORE.has(key(ph[j])) ? 1.5 : 0) - (NO_END.has(key(ph[j - 1])) ? 2 : 0) - Math.abs(j - n / 2) * 0.8;
        if (sc > best) { best = sc; out = [a, b]; }
      }
    }
    return out;
  }

  // chunks with display times: each shows from its first word until the next chunk (or a short hold)
  function chunks(maxWords, fits, { lead = 0.08, hold = 0.5, gap = 0.9 } = {}) {
    const list = [];
    for (const ph of phrases()) for (const p of split(ph, maxWords, fits)) list.push({ words: p });
    list.forEach((k) => { k.a = k.words[0].a - lead; });
    list.forEach((k, i) => { const nx = list[i + 1], last = k.words[k.words.length - 1]; k.b = nx && nx.words[0].a - last.b < gap ? nx.a : last.b + hold; });
    return list;
  }

  VG.captions = { words, phrases, split, chunks };
  VG.subtitleWords = words;
})();
