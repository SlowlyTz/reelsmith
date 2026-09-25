// Frame "book": a storybook on a craft table. 16:9 shows double-page spreads, 9:16 a tall single
// page. Handles the cover, page stacks, curled 3D page turns, camera limits and the closing.
(function () {
  const VG = window.VG, { clamp, ease, S, G, piece } = VG;
  const GOLD = '#d8b35c', PAGE = '#f4ead3';

  function geometry(format) {
    const single = format === '9:16';
    const PW = single ? 940 : 840, PH = single ? 1680 : 960;
    return { single, PW, PH, CW: PW + 22, CH: PH + 36,
      content: single ? { cx: PW / 2, w: PW, h: PH } : { cx: 0, w: PW * 2, h: PH },
      extent: single ? [-12, PW + 55] : [-PW - 55, PW + 55] };
  }

  VG.frames = VG.frames || {};
  VG.frames.book = (story, T) => {
    const g = geometry(story.format), { PW, PH, CW, CH, single } = g;
    const cover = Object.assign({ title: story.title, subtitle: '', color: '#2d4d66', emblem: 'moon', endpaper: '#35606a' }, story.book?.cover);
    const R = { layout: { w: g.content.w, h: g.content.h, gutter: !single, single } };
    let TABLE, SH_OPEN, SH_CLOSED, COVER_IMG;

    // ---------- page shapes (book coordinates, spine at x=0) ----------
    const pageL = () => S(`pageL${PW}x${PH}`, () => G.svg(`M ${-PW},${-PH / 2} Q ${-PW / 2},${-PH / 2 - 7} -4,${-PH / 2 + 9} L -4,${PH / 2 - 9} Q ${-PW / 2},${PH / 2 + 7} ${-PW},${PH / 2} Z`, 4), 0.4);
    const pageR = () => S(`pageR${PW}x${PH}`, () => G.svg(`M ${PW},${-PH / 2} Q ${PW / 2},${-PH / 2 - 7} 4,${-PH / 2 + 9} L 4,${PH / 2 - 9} Q ${PW / 2},${PH / 2 + 7} ${PW},${PH / 2} Z`, 4), 0.4);
    let BOTH = null;
    const pagesBoth = () => { if (!BOTH) { BOTH = new Path2D(); BOTH.addPath(pageL()); BOTH.addPath(pageR()); } return BOTH; };

    // ---------- one-time assets ----------
    function buildTable() {
      const X0 = -2000, Y0 = -1500, Wt = 4000, Ht = 3000;
      const c = VG.mk(Wt, Ht), gx = c.getContext('2d'), Rn = VG.rng(99), plank = 250;
      for (let py = 0; py < Ht; py += plank) {
        gx.fillStyle = VG.mix('#6a4128', '#86583a', Rn()); gx.fillRect(0, py, Wt, plank);
        for (let i = 0; i < 150; i++) {
          const y0 = py + Rn() * plank, A = 2 + Rn() * 7, f = 0.001 + Rn() * 0.004, ph = Rn() * 9;
          gx.strokeStyle = Rn() < 0.6 ? `rgba(45,22,10,${0.05 + Rn() * 0.12})` : `rgba(255,210,160,${0.03 + Rn() * 0.06})`;
          gx.lineWidth = 0.6 + Rn() * 2.4; gx.beginPath();
          for (let x = 0; x <= Wt; x += 24) { const y = y0 + A * Math.sin(x * f + ph) + 3 * Math.sin(x * f * 3.7 + ph * 2); x ? gx.lineTo(x, y) : gx.moveTo(x, y); }
          gx.stroke();
        }
        for (let k = 0; k < 2; k++) {
          const kx = Rn() * Wt, ky = py + 40 + Rn() * (plank - 80);
          for (let r = 4; r < 30; r += 4) { gx.strokeStyle = `rgba(50,25,10,${0.25 - r * 0.006})`; gx.lineWidth = 1.5; gx.beginPath(); gx.ellipse(kx, ky, r * 2.4, r * 0.8, 0, 0, Math.PI * 2); gx.stroke(); }
        }
        gx.fillStyle = 'rgba(30,14,6,0.6)'; gx.fillRect(0, py, Wt, 3);
        gx.fillStyle = 'rgba(255,220,180,0.10)'; gx.fillRect(0, py + 3, Wt, 2);
      }
      gx.globalCompositeOperation = 'overlay'; gx.fillStyle = gx.createPattern(VG.GRAIN, 'repeat'); gx.fillRect(0, 0, Wt, Ht);
      gx.globalCompositeOperation = 'source-over';
      const lg = gx.createRadialGradient(-X0 + 150, -Y0 - 120, 200, -X0 + 150, -Y0 - 120, 2100);
      lg.addColorStop(0, 'rgba(255,200,120,0.10)'); lg.addColorStop(0.5, 'rgba(20,8,0,0.15)'); lg.addColorStop(1, 'rgba(10,4,0,0.75)');
      gx.fillStyle = lg; gx.fillRect(0, 0, Wt, Ht);
      TABLE = { c, X0, Y0 };
    }
    function shadowSprite(w, h, blur) {
      const pad = blur * 3, c = VG.mk(w + pad * 2, h + pad * 2), gx = c.getContext('2d');
      gx.filter = `blur(${blur}px)`; gx.fillStyle = 'rgba(15,6,0,0.62)';
      gx.beginPath(); gx.roundRect(pad, pad, w, h, 16); gx.fill();
      return { c, pad };
    }
    function buildCover() {
      const r = 1.6, c = VG.mk(CW * r, CH * r), gx = c.getContext('2d');
      gx.scale(r, r);
      gx.fillStyle = VG.paper(cover.color); gx.beginPath(); gx.roundRect(0, 0, CW, CH, 12); gx.fill();
      gx.save(); gx.globalAlpha = 0.06; gx.strokeStyle = '#000';
      for (let x = 0; x < CW; x += 3) { gx.beginPath(); gx.moveTo(x, 0); gx.lineTo(x, CH); gx.stroke(); }
      gx.strokeStyle = '#fff'; gx.globalAlpha = 0.035; for (let y = 0; y < CH; y += 3) { gx.beginPath(); gx.moveTo(0, y); gx.lineTo(CW, y); gx.stroke(); }
      gx.restore();
      gx.fillStyle = 'rgba(0,0,0,0.25)'; gx.fillRect(34, 0, 3, CH); gx.fillStyle = 'rgba(255,255,255,0.08)'; gx.fillRect(38, 0, 2, CH);
      const gold = () => { const gr = gx.createLinearGradient(0, 0, CW, CH); gr.addColorStop(0, 'rgb(240,212,130)'); gr.addColorStop(0.5, 'rgb(200,160,70)'); gr.addColorStop(1, 'rgb(236,205,120)'); return gr; };
      gx.strokeStyle = gold(); gx.lineWidth = 3.2; gx.beginPath(); gx.roundRect(78, 44, CW - 122, CH - 88, 18); gx.stroke();
      gx.lineWidth = 1.2; gx.beginPath(); gx.roundRect(90, 56, CW - 146, CH - 112, 12); gx.stroke();
      for (const [cx, cy, sx, sy] of [[90, 56, 1, 1], [CW - 56, 56, -1, 1], [90, CH - 56, 1, -1], [CW - 56, CH - 56, -1, -1]]) {
        gx.save(); gx.translate(cx, cy); gx.scale(sx, sy); gx.lineWidth = 2; gx.strokeStyle = gold();
        gx.beginPath(); gx.moveTo(8, 60); gx.bezierCurveTo(8, 20, 20, 8, 60, 8); gx.stroke();
        gx.beginPath(); gx.arc(26, 26, 9, 0, Math.PI * 2); gx.stroke();
        gx.fillStyle = gold(); gx.beginPath(); gx.arc(26, 26, 3.5, 0, Math.PI * 2); gx.fill(); gx.restore();
      }
      const cx = 34 + (CW - 34) / 2;
      const emb = (fn) => { gx.save(); gx.translate(1.5, 2.5); fn('rgba(0,0,0,0.45)'); gx.restore(); fn(gold()); };
      gx.textAlign = 'center';
      let size = 118; gx.font = `${size}px "Berkshire Swash"`;
      while (gx.measureText(cover.title).width > CW * 0.76 && size > 40) { size -= 4; gx.font = `${size}px "Berkshire Swash"`; }
      const titleY = CH * 0.30;
      emb((col) => { gx.fillStyle = col; gx.font = `${size}px "Berkshire Swash"`; gx.fillText(cover.title, cx, titleY); });
      if (cover.subtitle) emb((col) => { gx.fillStyle = col; gx.font = '38px "IM Fell English SC"'; gx.letterSpacing = '3px'; gx.fillText(cover.subtitle, cx, titleY + 72); gx.letterSpacing = '0px'; });
      const dy = titleY + 110;
      gx.strokeStyle = gold(); gx.lineWidth = 1.6; gx.beginPath(); gx.moveTo(cx - 170, dy); gx.lineTo(cx - 14, dy); gx.moveTo(cx + 14, dy); gx.lineTo(cx + 170, dy); gx.stroke();
      gx.fillStyle = gold(); gx.beginPath(); gx.moveTo(cx, dy - 10); gx.lineTo(cx + 9, dy); gx.lineTo(cx, dy + 10); gx.lineTo(cx - 9, dy); gx.fill();
      const my = CH * 0.64, mr = Math.min(150, CW * 0.18);
      if (cover.emblem !== 'none') {
        gx.save(); gx.beginPath(); gx.arc(cx, my, mr, 0, Math.PI * 2); gx.clip();
        const sky = gx.createLinearGradient(0, my - mr, 0, my + mr); sky.addColorStop(0, '#1d2a4a'); sky.addColorStop(1, '#3b4f78');
        gx.fillStyle = sky; gx.fillRect(cx - mr, my - mr, mr * 2, mr * 2);
        gx.globalCompositeOperation = 'overlay'; gx.fillStyle = gx.createPattern(VG.GRAIN, 'repeat'); gx.fillRect(cx - mr, my - mr, mr * 2, mr * 2); gx.globalCompositeOperation = 'source-over';
        const Rr = VG.rng(5);
        for (let i = 0; i < 40; i++) { gx.fillStyle = `rgba(255,240,200,${0.3 + Rr() * 0.6})`; gx.beginPath(); gx.arc(cx - mr + Rr() * mr * 2, my - mr + Rr() * mr * 1.3, 0.8 + Rr() * 1.6, 0, 7); gx.fill(); }
        gx.fillStyle = gold();
        if (cover.emblem === 'moon') {
          gx.beginPath(); gx.arc(cx - mr * 0.4, my - mr * 0.37, mr * 0.25, 0, Math.PI * 2); gx.fill();
          gx.fillStyle = '#23325a'; gx.beginPath(); gx.arc(cx - mr * 0.29, my - mr * 0.44, mr * 0.23, 0, Math.PI * 2); gx.fill();
          gx.fillStyle = '#16203a'; gx.beginPath(); gx.moveTo(cx - mr, my + mr);
          const sk = [[-1, 0.47], [-0.8, 0.27], [-0.63, 0.57], [-0.4, 0.37], [-0.2, 0.67], [0.03, 0.41], [0.23, 0.6], [0.47, 0.33], [0.67, 0.51], [0.87, 0.29]];
          sk.forEach(([x, h], i) => { const nx = i + 1 < sk.length ? sk[i + 1][0] : 1; gx.lineTo(cx + x * mr, my + mr - h * mr - mr * 0.33); gx.lineTo(cx + nx * mr, my + mr - h * mr - mr * 0.33); });
          gx.lineTo(cx + mr, my + mr); gx.fill();
        } else if (cover.emblem === 'star' || cover.emblem === 'heart') {
          gx.save(); gx.translate(cx, my); gx.beginPath();
          const pts = cover.emblem === 'star' ? G.star(mr * 0.5, mr * 0.22) : G.heart(0, 0, mr * 0.45);
          gx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) gx.lineTo(pts[i], pts[i + 1]); gx.fill(); gx.restore();
        }
        gx.restore();
        gx.strokeStyle = gold(); gx.lineWidth = 5; gx.beginPath(); gx.arc(cx, my, mr, 0, Math.PI * 2); gx.stroke();
        gx.lineWidth = 1.5; gx.beginPath(); gx.arc(cx, my, mr + 12, 0, Math.PI * 2); gx.stroke();
        for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; gx.fillStyle = gold(); gx.beginPath(); gx.arc(cx + Math.cos(a) * (mr + 24), my + Math.sin(a) * (mr + 24), 2.2, 0, 7); gx.fill(); }
      }
      gx.globalCompositeOperation = 'source-atop';
      const eg = gx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * 0.35, CW / 2, CH / 2, Math.max(CW, CH) * 0.78);
      eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,0.35)'); gx.fillStyle = eg; gx.fillRect(0, 0, CW, CH);
      COVER_IMG = { c, cx, my };
    }
    R.init = () => { buildTable(); SH_OPEN = shadowSprite(CW * 2, CH, 26); SH_CLOSED = shadowSprite(CW, CH, 26); buildCover(); };

    // ---------- table props, arranged around the closed book ----------
    function drawProps(ctx) {
      if (story.book?.props === false) return;
      const put = (x, y, r, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(r); fn(); ctx.restore(); };
      put(CW + 330, -CH * 0.3, 0.3, () => {
        piece(ctx, S('spoolEnd', () => G.rrect(-62, -40, 124, 80, 14)), '#c9a27a', 2);
        piece(ctx, S('spoolThread', () => G.rrect(-46, -34, 92, 68, 8)), '#c4323f', 1);
        ctx.strokeStyle = 'rgba(255,190,190,0.35)'; ctx.lineWidth = 1.2;
        for (let i = -40; i < 44; i += 5) { ctx.beginPath(); ctx.moveTo(i, -34); ctx.lineTo(i + 4, 34); ctx.stroke(); }
      });
      put(CW + 360, CH * 0.33, -0.5, () => {
        const blade = S('blade', () => G.svg('M 0,-6 L 190,-2 Q 196,0 190,3 L 0,8 Z'), 0.3);
        piece(ctx, blade, '#c8ccd2', 2); ctx.save(); ctx.rotate(0.22); piece(ctx, blade, '#b7bcc4', 2); ctx.restore();
        const ring = S('ring', () => [G.ellipse(-40, -28, 34, 22), VG.revPts(G.ellipse(-40, -28, 20, 11))], 0.5);
        piece(ctx, ring, '#e0a92b', 2); ctx.save(); ctx.translate(-6, 62); piece(ctx, ring, '#e0a92b', 2); ctx.restore();
      });
      put(CW * 0.35, CH / 2 + 100, -0.06, () => {
        piece(ctx, S('pencilBody', () => G.rrect(-200, -13, 330, 26, 3)), '#f2c230', 2);
        piece(ctx, S('pencilTip', () => G.poly([130, -13, 190, 0, 130, 13])), '#e9c9a0', 1.5);
        piece(ctx, S('pencilLead', () => G.poly([172, -4, 190, 0, 172, 4])), '#333', 0.3);
        piece(ctx, S('pencilEnd', () => G.rrect(-236, -13, 40, 26, 5)), '#e88a9a', 1.5);
      });
      const bits = [[CW + 140, -CH / 2 + 30, 0.4, '#f2c14e', 's'], [CW + 530, -80, -0.3, '#e9818a', 'h'], [CW + 220, CH / 2 + 20, 0.8, '#7fb7c9', 's'],
        [-PW - 90, -CH * 0.4, 0.2, '#f2c14e', 's'], [-PW - 120, CH * 0.34, -0.5, '#e9818a', 'h'], [CW * 0.8, -CH / 2 - 70, 0.2, '#f6efe0', 's'], [CW + 100, CH * 0.25, -0.2, '#f2c14e', 'h']];
      for (const [x, y, r, col, kind] of bits) put(x, y, r, () => (kind === 's' ? VG.star(ctx, 0, 0, 1, col, 1.2) : VG.heart(ctx, 0, 0, 22, col, 1.2)));
    }

    // ---------- boards & stacks ----------
    function drawBoards(ctx, leftOn, rightOn) {
      ctx.save(); const s = VG.scaleOf(ctx);
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 3 * s;
      ctx.fillStyle = VG.paper(VG.shade(cover.color, -0.1));
      if (leftOn) { ctx.beginPath(); ctx.roundRect(-CW, -CH / 2, CW, CH, [12, 0, 0, 12]); ctx.fill(); }
      if (rightOn) { ctx.beginPath(); ctx.roundRect(0, -CH / 2, CW, CH, [0, 12, 12, 0]); ctx.fill(); }
      ctx.restore();
    }
    function drawStack(ctx, side, n) {
      for (let i = n; i >= 1; i--) {
        ctx.save(); ctx.translate(side * i * 2.3, i * 1.7);
        ctx.fillStyle = VG.paper(VG.shade(PAGE, -0.05 - i * 0.035), true);
        ctx.fill(side < 0 ? pageL() : pageR());
        ctx.strokeStyle = 'rgba(90,60,30,0.25)'; ctx.lineWidth = 0.8; ctx.stroke(side < 0 ? pageL() : pageR());
        ctx.restore();
      }
    }
    function gutter(ctx) {
      const gg = ctx.createLinearGradient(-PW, 0, PW, 0);
      gg.addColorStop(0, 'rgba(60,35,10,0.16)'); gg.addColorStop(0.06, 'rgba(60,35,10,0.0)'); gg.addColorStop(0.43, 'rgba(60,35,10,0.0)');
      gg.addColorStop(0.475, 'rgba(60,35,10,0.08)'); gg.addColorStop(0.494, 'rgba(40,20,5,0.22)'); gg.addColorStop(0.5, 'rgba(30,15,0,0.34)');
      gg.addColorStop(0.506, 'rgba(40,20,5,0.22)'); gg.addColorStop(0.525, 'rgba(60,35,10,0.08)'); gg.addColorStop(0.57, 'rgba(60,35,10,0.0)');
      gg.addColorStop(0.94, 'rgba(60,35,10,0.0)'); gg.addColorStop(1, 'rgba(60,35,10,0.16)');
      ctx.fillStyle = gg; ctx.fillRect(-PW - 10, -PH / 2 - 20, PW * 2 + 20, PH + 40);
    }

    // ---------- spreads ----------
    // which: 'L' | 'R' | 'both'
    function drawSpread(ctx, k, t, which = 'both') {
      const clip = which === 'L' ? pageL() : which === 'R' ? pageR() : single ? pageR() : pagesBoth();
      ctx.save();
      ctx.fillStyle = VG.paper(PAGE, true); ctx.fill(clip); ctx.clip(clip);
      if (k >= 0 && !(single && which === 'L')) {
        const sc = VG.sceneDef(k), st = VG.sceneState(k, t);
        ctx.save(); ctx.translate(g.content.cx, 0);
        if (sc.bg) sc.bg(ctx, st);
        ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.55; ctx.fillStyle = VG.paper('#808080', true); ctx.fillRect(-g.content.w, -PH, g.content.w * 2, PH * 2); ctx.restore();
        ctx.translate(-g.content.cx, 0); gutter(ctx); ctx.translate(g.content.cx, 0);
        if (sc.fg) sc.fg(ctx, st);
        if (sc.light) sc.light(ctx, st);
        ctx.restore();
      } else gutter(ctx);
      ctx.restore();
    }
    const offs = [];
    const OW = CW * 2 + 20, OH = CH + 40;
    function offscreen(slot, res, fn) {
      const w = Math.ceil(OW * res), h = Math.ceil(OH * res);
      let c = offs[slot]; if (!c || c.width !== w || c.height !== h) c = offs[slot] = VG.mk(w, h);
      const gx = c.getContext('2d'); gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, w, h);
      gx.setTransform(res, 0, 0, res, (OW / 2) * res, (OH / 2) * res); fn(gx); return c;
    }
    const spreadImage = (slot, k, t, res, which) => offscreen(slot, res, (gx) => drawSpread(gx, k, t, which));
    const coverImage = (slot, res) => offscreen(slot, res, (gx) => gx.drawImage(COVER_IMG.c, 0, -CH / 2, CW, CH));
    const insideImage = (slot, t, res) => offscreen(slot, res, (gx) => drawInsideCover(gx, t));
    function drawInsideCover(ctx, t) {
      ctx.save(); ctx.fillStyle = VG.paper(VG.shade(cover.color, -0.1)); ctx.beginPath(); ctx.roundRect(-CW, -CH / 2, CW, CH, [12, 0, 0, 12]); ctx.fill(); ctx.restore();
      ctx.save(); ctx.clip(pageL());
      if (single) {  // plain endpaper with a small star pattern
        ctx.fillStyle = VG.paper(cover.endpaper, true); ctx.fillRect(-PW, -PH / 2, PW, PH);
        ctx.globalAlpha = 0.25; for (let r = 0; r < PH / 64; r++) for (let c = 0; c < PW / 68; c++) VG.star(ctx, -PW + 20 + c * 68 + (r % 2) * 34, -PH / 2 + 30 + r * 64, 0.42, '#f0d9a0', 0);
      }
      ctx.restore();
      if (!single) drawSpread(ctx, 0, t, 'L');
    }

    // ---------- the curled page ----------
    // front: image whose right half is the page front; back: image whose left half is its back.
    // theta 0 = lying on the right, PI = lying on the left.
    function drawTurn(ctx, front, back, res, theta, W, H, curlDir = 1) {
      const N = 64, f = 2400 + PH, curl = 1.05 * Math.sin(theta) * curlDir;
      const X = [0], Z = [0], PHI = [];
      for (let i = 0; i < N; i++) {
        const phi = clamp(theta + curl * ((i + 0.5) / N - 0.35), 0, Math.PI); PHI.push(phi);
        X.push(X[i] + Math.cos(phi) * (W / N)); Z.push(Z[i] + Math.sin(phi) * (W / N));
      }
      const px = X.map((x, i) => (x * f) / (f - Z[i])), sc = Z.map((z) => f / (f - z));
      const edge = px[N], side = edge >= 0 ? 1 : -1, sh = Math.sin(theta);
      ctx.save(); ctx.clip(side > 0 ? pageR() : pageL());
      const sg = ctx.createLinearGradient(0, 0, side * (Math.abs(edge) + 90 * sh + 20), 0);
      sg.addColorStop(0, `rgba(30,15,5,${0.30 * sh})`); sg.addColorStop(0.75, `rgba(30,15,5,${0.22 * sh})`); sg.addColorStop(1, 'rgba(30,15,5,0)');
      ctx.fillStyle = sg; ctx.fillRect(side > 0 ? 0 : -PW - 60, -PH, PW + 60, PH * 2); ctx.restore();
      for (let i = 0; i < N; i++) {
        const x0 = px[i], x1 = px[i + 1], hh = (H / 2) * (sc[i] + sc[i + 1]) / 2, phi = PHI[i], frontSide = x1 >= x0;
        const sw = (W / N) * res, sx = frontSide ? (OW / 2 + (i / N) * W) * res : (OW / 2 - ((i + 1) / N) * W) * res;
        const dx = Math.min(x0, x1), dw = Math.abs(x1 - x0) + 0.6;
        if (dw < 0.05) continue;
        ctx.drawImage(frontSide ? front : back, sx, (OH / 2 - H / 2) * res, sw, H * res, dx, -hh, dw, hh * 2);
        const n = Math.cos(phi), dark = frontSide ? 0.255 * (1 - n) : 0.27 * (1 + n), bright = frontSide ? 0.10 * Math.max(0, Math.sin(phi * 2)) : 0.04;
        if (dark > 0.003) { ctx.fillStyle = `rgba(35,20,8,${dark})`; ctx.fillRect(dx, -hh, dw, hh * 2); }
        if (bright > 0.003) { ctx.fillStyle = `rgba(255,248,230,${bright})`; ctx.fillRect(dx, -hh, dw, hh * 2); }
      }
      ctx.strokeStyle = 'rgba(80,55,30,0.35)'; ctx.lineWidth = 1;
      const hE = (H / 2) * sc[N]; ctx.beginPath(); ctx.moveTo(px[N], -hE); ctx.lineTo(px[N], hE); ctx.stroke();
    }

    function drawClosed(ctx, withSticker) {
      ctx.drawImage(SH_CLOSED.c, -SH_CLOSED.pad + 10, -CH / 2 - SH_CLOSED.pad + 16);
      for (let i = 7; i >= 1; i--) { ctx.fillStyle = VG.shade(PAGE, -0.04 - i * 0.02); ctx.beginPath(); ctx.roundRect(4 + i * 1.2, -CH / 2 + 8 + i * 1.6, CW - 6, CH - 12, 8); ctx.fill(); }
      ctx.drawImage(COVER_IMG.c, 0, -CH / 2, CW, CH);
      if (withSticker && T.outro.sticker) VG.drawSticker(ctx, T.outro.sticker, COVER_IMG.cx, COVER_IMG.my - CH / 2, VG.time - T.outro.stickerAt, 1);
    }

    // ---------- camera ----------
    R.closedView = { x: CW / 2, y: 0, z: single ? 0.97 : 0.9 };
    R.openView = { z: single ? 1.08 : 1.04 };
    R.toWorld = (x, y) => [x + g.content.cx, y];
    R.clampCam = (c, W, H, t) => {
      if (t < T.intro.openStart + T.intro.openDur * 0.7 || t > T.outro.closeStart + 0.4) return c;
      const x0 = g.extent[0] + W / 2 / c.z, x1 = g.extent[1] - W / 2 / c.z, ym = Math.max(0, PH / 2 + 35 - H / 2 / c.z);
      c.x = x0 > x1 ? (g.extent[0] + g.extent[1]) / 2 : clamp(c.x, x0, x1); c.y = clamp(c.y, -ym, ym);
      return c;
    };

    // ---------- render ----------
    R.draw = (ctx, t, tq, res) => {
      ctx.drawImage(TABLE.c, TABLE.X0, TABLE.Y0); drawProps(ctx);
      const I = T.intro, O = T.outro, nS = T.scenes.length;
      if (t < I.openStart) return drawClosed(ctx, false);
      if (t < I.openStart + I.openDur) {
        const p = ease.inOut((t - I.openStart) / I.openDur);
        ctx.drawImage(SH_CLOSED.c, -SH_CLOSED.pad + 10, -CH / 2 - SH_CLOSED.pad + 16);
        if (p > 0.5) ctx.drawImage(SH_OPEN.c, -CW - SH_OPEN.pad + 10, -CH / 2 - SH_OPEN.pad + 16, SH_OPEN.c.width / 2, SH_OPEN.c.height);
        drawBoards(ctx, false, true); drawStack(ctx, 1, 6); drawSpread(ctx, 0, tq, 'R');
        return drawTurn(ctx, coverImage(0, res), insideImage(1, tq, res), res, p * Math.PI, CW, CH);
      }
      if (t < O.closeStart) {
        ctx.drawImage(SH_OPEN.c, -CW - SH_OPEN.pad + 10, -CH / 2 - SH_OPEN.pad + 16);
        const k = T.sceneAt(t), sc = T.scenes[k], turning = k > 0 && t < sc.start + T.turnDur, cur = turning ? k - 1 : k;
        drawBoards(ctx, true, true);
        if (cur === 0) drawInsideCover(ctx, tq); else drawStack(ctx, -1, Math.min(5, cur));
        drawStack(ctx, 1, Math.max(1, 6 - cur));
        if (!turning) return drawSpread(ctx, cur, tq, cur === 0 ? 'R' : 'both');
        const p = ease.inOut((t - sc.start) / T.turnDur);
        if (cur !== 0) drawSpread(ctx, cur, tq, 'L');
        drawSpread(ctx, k, tq, 'R');
        return drawTurn(ctx, spreadImage(0, cur, tq, res, 'R'), spreadImage(1, k, tq, res, 'L'), res, p * Math.PI, PW, PH + 16);
      }
      if (t < O.closeStart + O.closeDur) {
        const p = ease.inOut((t - O.closeStart) / O.closeDur);
        ctx.drawImage(SH_CLOSED.c, -SH_CLOSED.pad + 10, -CH / 2 - SH_CLOSED.pad + 16);
        drawBoards(ctx, false, true); drawStack(ctx, 1, 1); drawSpread(ctx, nS - 1, tq, 'R');
        return drawTurn(ctx, coverImage(0, res), spreadImage(1, nS - 1, tq, res, 'L'), res, (1 - p) * Math.PI, CW, CH, -1);
      }
      drawClosed(ctx, true);
    };
    return R;
  };
})();
