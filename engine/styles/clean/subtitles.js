// Style "clean": captions timed by the narration (engine/captions.js).
// story.subtitles = true | { style: 'karaoke' | 'words' | 'lines', … }
//   karaoke (default) – short chunks (≤ 3 words), heavy uppercase white text with a black outline,
//                       the word being spoken turns yellow (TikTok explainer look)
//   words             – one word at a time, same look, popping in on its start
//   lines             – calmer sentence-case captions (≤ 2 rows) for 16:9, spoken word highlighted
// Options: y, x (fractions), size (of min(W,H)), maxWidth (of W), maxWords, rows, upper, color, stroke,
// highlight, accent (for *accent* words in `sub`), font, weight.
(function () {
  const VG = window.VG, { clamp } = VG, E = VG.ease;

  const DEF = {
    karaoke: { y: { h: 0.85, v: 0.745 }, x: 0.5, size: 0.066, maxWidth: 0.86, maxWords: 3, rows: 1, upper: true },
    words: { y: { h: 0.82, v: 0.72 }, x: 0.5, size: 0.085, maxWidth: 0.86, upper: true },
    lines: { y: { h: 0.87, v: 0.76 }, x: 0.5, size: 0.05, maxWidth: 0.8, maxWords: 8, rows: 2, upper: false },
  };
  let cfg = null, list = null;
  function conf() {
    const s = VG.story.subtitles;
    if (cfg && cfg.src === s && cfg.W === VG.W) return cfg;
    const o = s === true ? { style: 'karaoke' } : { style: 'karaoke', ...s };
    if (!DEF[o.style]) throw new Error(`subtitles.style must be karaoke | words | lines (got ${o.style})`);
    const c = { color: '#ffffff', stroke: '#111111', highlight: VG.theme.highlight, accent: VG.theme.accent, font: VG.FONT.head, weight: 800, ...DEF[o.style], ...o };
    if (typeof c.y === 'object') c.y = VG.H > VG.W ? c.y.v : c.y.h;
    list = null; cfg = Object.assign(c, { src: s, W: VG.W });
    return cfg;
  }
  const up = (c, w) => (c.upper ? w.toUpperCase() : w);
  const font = (c, px) => `${c.weight} ${Math.round(px)}px ${c.font}`;

  function word(ctx, c, str, x, y, px, fill) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = px * 0.16; ctx.shadowOffsetY = px * 0.05;
    ctx.lineWidth = px * 0.17; ctx.strokeStyle = c.stroke; ctx.strokeText(str, x, y);
    ctx.shadowColor = 'transparent'; ctx.fillStyle = fill; ctx.fillText(str, x, y); ctx.restore();
  }

  function chunks(ctx, c, px) {
    if (list && list.T === VG.T) return list;
    const maxW = VG.W * c.maxWidth; ctx.save(); ctx.font = font(c, px);
    const rowsOf = (arr) => { const rows = [[]]; let rw = 0; for (const w of arr) { const ww = ctx.measureText(up(c, w.w) + ' ').width; if (rw + ww > maxW && rows[rows.length - 1].length) { rows.push([]); rw = 0; } rows[rows.length - 1].push(w); rw += ww; } return rows; };
    list = VG.captions.chunks(c.maxWords || 1, (p) => rowsOf(p).length <= (c.rows || 1), { lead: 0.03, hold: 0.35 });
    list.forEach((k) => { k.rows = rowsOf(k.words); });
    ctx.restore(); list.T = VG.T;
    return list;
  }

  VG.subtitles = (ctx, t) => {
    const c = conf(), W = VG.W, H = VG.H, px = Math.min(W, H) * c.size;
    if (c.style === 'words') c.maxWords = 1, c.rows = 1;
    const L = chunks(ctx, c, px), k = L.find((x) => t >= x.a && t < x.b); if (!k) return;
    const since = t - k.a, pop = since < 0.12 ? 0.9 + 0.1 * E.outQuint(since / 0.12) : 1;
    const out = clamp((k.b - t) / 0.08);
    ctx.save(); ctx.font = font(c, px); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.translate(W * c.x, H * c.y); ctx.scale(pop, pop); ctx.globalAlpha = clamp(since / 0.05) * out;
    const lh = px * 1.18, sp = ctx.measureText(' ').width;
    let cur = k.words[0]; for (const w of k.words) if (w.a - 0.03 <= t) cur = w;   // the word being (or last) spoken
    k.rows.forEach((r, ri) => {
      const strs = r.map((w) => up(c, w.w)), rw = strs.reduce((a, s) => a + ctx.measureText(s).width, 0) + sp * (strs.length - 1);
      const fit = Math.min(1, (W * c.maxWidth) / rw);
      ctx.save(); ctx.scale(fit, fit);
      let x = -rw / 2; const y = (ri - (k.rows.length - 1) / 2) * lh;
      r.forEach((w, i) => {
        word(ctx, c, strs[i], x, y, px, w === cur ? c.highlight : w.accent ? c.accent : c.color);
        x += ctx.measureText(strs[i]).width + sp;
      });
      ctx.restore();
    });
    ctx.restore();
  };
  VG.subtitleChunks = (ctx) => { const c = conf(); return chunks(ctx, c, Math.min(VG.W, VG.H) * c.size).map((k) => ({ text: k.rows.map((r) => r.map((w) => up(c, w.w)).join(' ')).join(' / '), a: k.a, b: k.b })); };
})();
