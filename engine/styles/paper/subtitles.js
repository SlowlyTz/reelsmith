// Subtitles in screen space, timed by the Whisper word timestamps of each narration line.
// story.subtitles:
//   true                          – the classic paper strip: the whole line, words darken as spoken
//   { style: 'bold', … }          – caption chunks (≤ 2 rows, broken at punctuation), heavy outlined text,
//                                   the word being spoken highlighted
//   { style: 'words', … }         – TikTok style: one word at a time, popping in exactly on its start
// Options (fractions of the canvas): y, x (centre), size (font px / min(W,H)), maxWidth (of W);
// colours: color, stroke, highlight, ink, accent; box (paper backing on/off), font, weight, maxWords.
// A line's `sub` replaces `text` for display; in `sub`, *word* is drawn in the accent colour.
(function () {
  const VG = window.VG, { win, clamp, hash, strSeed } = VG;

  const DEF = {
    strip: {},
    bold: { y: { h: 0.87, v: 0.72 }, x: 0.5, size: 0.056, maxWidth: 0.8, maxWords: 8, rows: 2, box: false, font: 'Fredoka', weight: 700,
      color: '#fffaf0', stroke: '#1a120c', highlight: '#ffd54a', ink: '#23170f', accent: '#ffb347', paperColor: '#fbf3df' },
    words: { y: { h: 0.8, v: 0.67 }, x: 0.5, size: 0.09, maxWidth: 0.8, box: true, font: 'Fredoka', weight: 700,
      color: '#fffaf0', stroke: '#1a120c', highlight: '#ffd84a', ink: '#23170f', accent: '#ff7a59', paperColor: '#ffd84a' },
  };
  let cfg = null, cache = null;
  function conf() {
    const s = VG.story.subtitles;
    if (cfg && cfg.src === s && cfg.W === VG.W) return cfg;
    const o = s === true ? { style: 'strip' } : Object.assign({ style: 'bold' }, s);
    if (!DEF[o.style]) throw new Error(`subtitles.style must be bold | words (got ${o.style})`);
    const c = Object.assign({}, DEF[o.style], o), tall = VG.H > VG.W;
    if (typeof c.y === 'object') c.y = tall ? c.y.v : c.y.h;
    cache = null; cfg = Object.assign(c, { src: s, W: VG.W });
    return cfg;
  }

  // ---------- align display words to the spoken (Whisper) words ----------
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
  function words() {
    if (cache) return cache;
    cache = [];
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
  VG.subtitleWords = () => { conf(); return words(); };

  const font = (c, px) => `${c.weight} ${Math.round(px)}px ${c.font}`;
  function outlined(ctx, str, x, y, c, px, fill) {
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    if (!c.box) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = px * 0.18; ctx.shadowOffsetY = px * 0.06;
      ctx.lineWidth = px * 0.2; ctx.strokeStyle = c.stroke; ctx.strokeText(str, x, y); ctx.restore();
    }
    ctx.fillStyle = fill; ctx.fillText(str, x, y);
  }

  // ---------- style: words (one word at a time) ----------
  const LEAD = 0.03;                     // show a word a hair before it sounds (reads as in sync)
  function drawWords(ctx, t, c) {
    const ws = words(); let i = -1;
    for (let k = 0; k < ws.length && ws[k].a - LEAD <= t; k++) i = k;
    if (i < 0) return;
    const w = ws[i], next = ws[i + 1], sameLine = next && next.line === w.line;
    const cut = next && (sameLine || next.a - w.b < 0.5) && next.a - w.b < 0.9;   // next word replaces it: hard cut
    const until = cut ? next.a - LEAD : w.b + 0.35;
    if (t >= until) return;
    const W = VG.W, H = VG.H, base = Math.min(W, H) * c.size, since = t - (w.a - LEAD);
    ctx.save(); ctx.font = font(c, base); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(w.w).width, padX = base * 0.34, fit = Math.min(1, (W * c.maxWidth) / (tw + padX * 2));
    const pop = since < 0.12 ? VG.ease.back(since / 0.12, 1.9) : 1, out = cut ? 1 : clamp((until - t) / 0.1, 0, 1);
    const s = fit * (0.55 + 0.45 * pop), seed = strSeed(w.line) + i * 17;
    ctx.translate(W * c.x, H * c.y); ctx.rotate((hash(seed, 1) - 0.5) * 0.07); ctx.scale(s, s); ctx.globalAlpha = out;
    VG.applyJit(ctx, seed, 0.8);
    if (c.box) {
      const bw = tw + padX * 2, bh = base * 1.22, key = `subw${Math.round(bw / 8)}x${Math.round(bh / 8)}`;
      VG.piece(ctx, VG.S(key, () => VG.G.rrect(-bw / 2, -bh / 2, bw, bh, base * 0.16), 0.9), w.accent ? c.accent : c.paperColor, 2.2);
      ctx.fillStyle = c.ink; ctx.fillText(w.w, 0, base * 0.04);
    } else outlined(ctx, w.w, 0, base * 0.04, c, base, w.accent ? c.accent : c.highlight);
    ctx.restore();
  }

  // ---------- style: bold (caption chunks) ----------
  // caption breaks: prefer a new chunk before these words, never end one on those (English + German)
  const BREAK_BEFORE = new Set(('from by into in on at with to for of and or but when while because that which as than until ' +
    'von mit und oder aber wenn weil dass bis auf für als wie damit ob').split(' '));
  const NO_END = new Set(('a an the is are was its his her their my your our by of in into to from with at on for and or ' +
    'der die das den dem des ein eine einen einem einer dein deine mein meine sein seine ihr ihre ist sind zu von mit und oder im am auf für').split(' '));
  function chunks(ctx, c, size) {
    const key = `${VG.W}x${VG.H}`;
    if (chunks.key === key) return chunks.list;
    const ws = words(), list = [], maxW = VG.W * c.maxWidth; ctx.save(); ctx.font = font(c, size);
    const rowsOf = (arr) => { const rows = [[]]; let rw = 0; for (const w of arr) { const ww = ctx.measureText(w.w + ' ').width; if (rw + ww > maxW && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push(w); rw += ww; } return rows; };
    // phrases end at punctuation, a new line or a pause; long phrases are split into balanced chunks
    const phrases = []; let cur = [];
    ws.forEach((w, i) => {
      if (cur.length && (cur[0].line !== w.line || w.a - cur[cur.length - 1].b > 0.8)) { phrases.push(cur); cur = []; }
      cur.push(w);
      const nx = ws[i + 1], punct = /[.!?;:…]$/.test(w.w) || (/[,–—]$/.test(w.w) && cur.length >= 3);
      if (punct && nx && cur.length >= 2) { phrases.push(cur); cur = []; }
    });
    if (cur.length) phrases.push(cur);
    const fits = (p) => rowsOf(p).length <= c.rows;
    for (const ph of phrases) {
      let k = Math.ceil(ph.length / c.maxWords);
      const parts = (n) => Array.from({ length: n }, (_, j) => ph.slice(Math.round((j * ph.length) / n), Math.round(((j + 1) * ph.length) / n)));
      while (k < ph.length && !parts(k).every(fits)) k++;
      let out = parts(k);
      if (k === 2) {                               // two chunks: cut where a reader would pause
        const n = ph.length, key = (w) => w.w.toLowerCase().replace(/[^\p{L}']/gu, '');
        let best = -1e9;
        for (let j = Math.ceil(n * 0.35); j <= Math.floor(n * 0.65); j++) {
          const a = ph.slice(0, j), b = ph.slice(j); if (!fits(a) || !fits(b)) continue;
          const sc = (BREAK_BEFORE.has(key(ph[j])) ? 1.5 : 0) - (NO_END.has(key(ph[j - 1])) ? 2 : 0) - Math.abs(j - n / 2) * 0.8;
          if (sc > best) { best = sc; out = [a, b]; }
        }
      }
      for (const p of out) list.push({ words: p, rows: rowsOf(p) });
    }
    ctx.restore();
    list.forEach((k) => { k.a = k.words[0].a - 0.08; });
    list.forEach((k, i) => { const nx = list[i + 1]; k.b = nx && nx.words[0].a - k.words[k.words.length - 1].b < 0.9 ? nx.a : k.words[k.words.length - 1].b + 0.5; });
    chunks.key = key; chunks.list = list;
    return list;
  }
  function drawBold(ctx, t, c) {
    const W = VG.W, H = VG.H, size = Math.min(W, H) * c.size, list = chunks(ctx, c, size);
    const k = list.find((x) => t >= x.a && t < x.b); if (!k) return;
    ctx.save(); ctx.font = font(c, size); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const lh = size * 1.22, sp = ctx.measureText(' ').width, rw = k.rows.map((r) => ctx.measureText(r.map((w) => w.w).join(' ')).width);
    const fade = win(t, k.a, 0.1) * (1 - win(t, k.b - 0.12, 0.12)), rise = (1 - win(t, k.a, 0.14)) * size * 0.25;
    ctx.globalAlpha = fade; ctx.translate(W * c.x, H * c.y + rise);
    const boxH = k.rows.length * lh + size * 0.5, boxW = Math.max(...rw) + size * 1.1;
    if (c.box) VG.piece(ctx, VG.S(`subb${Math.round(boxW / 8)}x${Math.round(boxH / 8)}`, () => VG.G.rrect(-boxW / 2, -boxH / 2, boxW, boxH, size * 0.18), 0.8), c.paperColor, 1.8);
    k.rows.forEach((r, ri) => {
      let x = -rw[ri] / 2; const y = (ri - (k.rows.length - 1) / 2) * lh + size * 0.04;
      for (const w of r) {
        const now = t >= w.a - 0.04 && t < w.b + 0.06, col = w.accent ? c.accent : now ? c.highlight : c.box ? c.ink : c.color;
        outlined(ctx, w.w, x, y, c, size, col);
        x += ctx.measureText(w.w).width + sp;
      }
    });
    ctx.restore();
  }

  // ---------- style: strip (classic) ----------
  function drawStrip(ctx, t) {
    const T = VG.T, line = Object.values(T.lines).find((l) => t >= l.start - 0.1 && t <= l.speechEnd + 0.6);
    if (!line) return;
    const ws = words().filter((w) => w.line === line.id); if (!ws.length) return;
    const W = VG.W, H = VG.H, size = Math.round(Math.min(W, H) * 0.044), maxW = W * 0.82;
    ctx.save(); ctx.font = `600 ${size}px Fredoka`;
    const rows = [[]]; let rowW = 0;
    for (const w of ws) { const ww = ctx.measureText(w.w + ' ').width; if (rowW + ww > maxW && rows[rows.length - 1].length) { rows.push([]); rowW = 0; } rows[rows.length - 1].push(w); rowW += ww; }
    const lh = size * 1.3, boxH = rows.length * lh + size * 0.7, boxW = Math.max(...rows.map((r) => ctx.measureText(r.map((w) => w.w).join(' ')).width)) + size * 1.4;
    const cy = H * (H > W ? 0.8 : 0.86), fade = win(t, line.start - 0.1, 0.25) * (1 - win(t, line.speechEnd + 0.35, 0.25));
    ctx.globalAlpha = fade; ctx.translate(W / 2, cy); ctx.rotate(-0.006);
    VG.piece(ctx, VG.S(`sub${Math.round(boxW)}x${Math.round(boxH)}`, () => VG.G.rrect(-boxW / 2, -boxH / 2, boxW, boxH, 8), 0.8), '#fbf3df', 1.5);
    rows.forEach((r, ri) => {
      let x = -ctx.measureText(r.map((w) => w.w).join(' ')).width / 2; const y = -boxH / 2 + size * 0.35 + lh * ri + size * 0.95;
      for (const w of r) { const a = win(t, w.a - 0.05, 0.12); ctx.fillStyle = VG.rgba('#3b2a1c', 0.25 + 0.75 * a); ctx.textAlign = 'left'; ctx.fillText(w.w, x, y); x += ctx.measureText(w.w + ' ').width; }
    });
    ctx.restore();
  }

  // bold captions as shown: [{ text, a, b }] (for checks)
  VG.subtitleChunks = (ctx) => { const c = conf(); return chunks(ctx, c, Math.min(VG.W, VG.H) * c.size).map((k) => ({ text: k.rows.map((r) => r.map((w) => w.w).join(' ')).join(' / '), a: k.a, b: k.b })); };

  VG.subtitles = (ctx, t) => {
    const c = conf();
    if (c.style === 'words') drawWords(ctx, t, c);
    else if (c.style === 'bold') drawBold(ctx, t, c);
    else drawStrip(ctx, t);
  };
})();
