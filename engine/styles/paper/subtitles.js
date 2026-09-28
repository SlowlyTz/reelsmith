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
  const VG = window.VG, { win, clamp, hash, strSeed } = VG;   // timing: engine/captions.js

  const DEF = {
    strip: {},
    bold: { y: { h: 0.87, v: 0.72 }, x: 0.5, size: 0.056, maxWidth: 0.8, maxWords: 8, rows: 2, box: false, font: 'Fredoka', weight: 700,
      color: '#fffaf0', stroke: '#1a120c', highlight: '#ffd54a', ink: '#23170f', accent: '#ffb347', paperColor: '#fbf3df' },
    words: { y: { h: 0.8, v: 0.67 }, x: 0.5, size: 0.09, maxWidth: 0.8, box: true, font: 'Fredoka', weight: 700,
      color: '#fffaf0', stroke: '#1a120c', highlight: '#ffd84a', ink: '#23170f', accent: '#ff7a59', paperColor: '#ffd84a' },
  };
  let cfg = null;
  function conf() {
    const s = VG.story.subtitles;
    if (cfg && cfg.src === s && cfg.W === VG.W) return cfg;
    const o = s === true ? { style: 'strip' } : Object.assign({ style: 'bold' }, s);
    if (!DEF[o.style]) throw new Error(`subtitles.style must be bold | words (got ${o.style})`);
    const c = Object.assign({}, DEF[o.style], o), tall = VG.H > VG.W;
    if (typeof c.y === 'object') c.y = tall ? c.y.v : c.y.h;
    cfg = Object.assign(c, { src: s, W: VG.W });
    return cfg;
  }

  const words = () => VG.captions.words();   // engine/captions.js

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
  function chunks(ctx, c, size) {
    const key = `${VG.W}x${VG.H}`;
    if (chunks.key === key && chunks.T === VG.T) return chunks.list;
    const maxW = VG.W * c.maxWidth; ctx.save(); ctx.font = font(c, size);
    const rowsOf = (arr) => { const rows = [[]]; let rw = 0; for (const w of arr) { const ww = ctx.measureText(w.w + ' ').width; if (rw + ww > maxW && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push(w); rw += ww; } return rows; };
    const list = VG.captions.chunks(c.maxWords, (p) => rowsOf(p).length <= c.rows);
    list.forEach((k) => { k.rows = rowsOf(k.words); });
    ctx.restore();
    chunks.key = key; chunks.T = VG.T; chunks.list = list;
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
