// "Warum ist deine Tastatur nicht alphabetisch?" – clean sketch-note explainer (9:16, theme sand).
// Content coordinates: origin in the centre, st.L.w × st.L.h (1080×1920). Everything sits in the upper
// ~60 % like the reference (y ≈ −0.36·h … +0.19·h); karaoke captions own the band around y = +0.245·h.
// Recurring motif: a drawn key row (keycaps that draw their outline, then fill and letter in).
(function () {
  const VG = window.VG, { clamp, lerp } = VG, E = VG.ease;
  const U = (st) => Math.min(st.L.w, st.L.h) / 1080;
  const th = () => VG.theme;
  const HAND_BLUE = '#23407a';

  // time (scene-local) of a word; negative index counts from the end of the line
  const at = (st, id, w, d = 0) => {
    if (typeof w === 'number' && w < 0) { const n = VG.T.lines[id].words.length; return st.word(id, Math.max(0, n + w)) + d; }
    return st.word(id, w) + d;
  };

  // ---------- keycap ----------
  // outline draws itself, then the cap fills and the letter fades in; opt: fill, color, ink, flip (0..1 swaps to opt.to), alpha, lw
  function key(ctx, x, y, s, ch, k, o = {}) {
    if (k <= 0) return;
    const T = th(), r = s * 0.2;
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    if (o.scale != null) ctx.scale(o.scale, o.scale);
    ctx.globalAlpha *= clamp(k * 4) * (o.alpha ?? 1);
    const kf = E.outQuint(clamp((k - 0.25) / 0.5));
    // cap body + bottom lip (keycap depth)
    ctx.save(); VG.softShadow(ctx, 16, 7); ctx.globalAlpha *= kf;
    ctx.fillStyle = VG.rgba(T.ink, 0.16); VG.rrectPath(ctx, -s / 2, -s / 2 + s * 0.07, s, s, r); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= kf; ctx.fillStyle = o.fill || T.paper; VG.rrectPath(ctx, -s / 2, -s / 2, s, s, r); ctx.fill(); ctx.restore();
    VG.inkRect(ctx, -s / 2, -s / 2, s, s, r, clamp(k / 0.6), { w: o.lw || s * 0.055, shadow: false, color: o.ink || T.ink });
    // inner dish line
    if (kf > 0) {
      ctx.save(); ctx.globalAlpha *= kf * 0.5; ctx.strokeStyle = o.ink || T.ink; ctx.lineWidth = Math.max(1.5, s * 0.018);
      VG.rrectPath(ctx, -s * 0.36, -s * 0.38, s * 0.72, s * 0.66, r * 0.7); ctx.stroke(); ctx.restore();
    }
    const kt = E.outQuint(clamp((k - 0.45) / 0.4));
    if (kt > 0 && ch) {
      const f = o.flip || 0, sy = Math.abs(Math.cos(Math.PI * f)), letter = f < 0.5 ? ch : o.to;
      ctx.save(); ctx.translate(0, -s * 0.05); ctx.scale(1, Math.max(0.02, sy));
      VG.text(ctx, letter, 0, s * 0.02, { size: s * 0.46, weight: 800, color: o.color || T.ink, alpha: kt });
      ctx.restore();
    }
    ctx.restore();
  }
  // a row of keys centred on (x, y); ks = progress per key (number → staggered draw from one value)
  function keyRow(ctx, letters, x, y, s, gap, kOf, oOf = () => ({})) {
    const n = letters.length, tot = n * s + (n - 1) * gap;
    letters.forEach((ch, i) => key(ctx, x - tot / 2 + s / 2 + i * (s + gap), y, s, ch, kOf(i), oOf(i)));
    return (i) => x - tot / 2 + s / 2 + i * (s + gap);
  }

  // ---------- pen that writes ----------
  // writes: [{ t, dur, str, x, y, size, color, weight }] on the same context; draws all texts and a pen at the writing edge
  function penWrite(ctx, st, writes, u, rest) {
    const lt = st.lt;
    const tip = (wr, k) => {
      const w = VG.measure(ctx, wr.str, { size: wr.size, weight: wr.weight || 600, font: VG.FONT.hand }), edge = wr.size * 0.6;
      return [wr.x + Math.min(w, E.inOutSine(k) * (w + edge) - edge * 0.35), wr.y + wr.size * 0.22, w];
    };
    writes.forEach((wr) => VG.write(ctx, wr.str, wr.x, wr.y, st.prog(wr.t, wr.dur), { size: wr.size, color: wr.color, weight: wr.weight, align: 'left' }));
    // pen position
    let p = null, writing = false;
    for (let i = 0; i < writes.length; i++) {
      const wr = writes[i], k = st.prog(wr.t, wr.dur);
      if (lt >= wr.t && lt <= wr.t + wr.dur) { p = tip(wr, k); writing = true; break; }
      const next = writes[i + 1];
      if (lt > wr.t + wr.dur && next && lt < next.t) {
        const a = tip(wr, 1), b = tip(next, 0), f = E.inOut((lt - wr.t - wr.dur) / (next.t - wr.t - wr.dur));
        p = [lerp(a[0], b[0], f), lerp(a[1], b[1], f) - Math.sin(Math.PI * f) * 40 * u]; break;
      }
    }
    const first = writes[0], last = writes[writes.length - 1];
    if (!p && lt < first.t) { const b = tip(first, 0), f = E.outQuint(clamp((lt - (first.t - 0.7)) / 0.7)); p = [lerp(rest[0], b[0], f), lerp(rest[1], b[1], f)]; }
    if (!p && lt > last.t + last.dur) { const a = tip(last, 1), f = E.inOut(clamp((lt - last.t - last.dur) / 0.8)); p = [lerp(a[0], rest[0], f), lerp(a[1], rest[1], f)]; }
    if (!p) return;
    const bob = writing ? Math.sin(lt * 34) * 5 * u : 0, lift = writing ? 0 : 10 * u;
    drawPen(ctx, p[0], p[1] + bob - lift, u, clamp((lt - first.t + 0.9) / 0.4));
  }
  function drawPen(ctx, x, y, u, a) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-1.02); ctx.globalAlpha *= a; ctx.scale(u, u);
    VG.softShadow(ctx, 18, 14, 'rgba(40,30,20,0.32)');
    ctx.fillStyle = '#26221f'; VG.rrectPath(ctx, 44, -15, 250, 30, 12); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#b9b3aa'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(46, -13); ctx.lineTo(46, 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#26221f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12, -3.5); ctx.lineTo(12, 3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = VG.theme.accent; ctx.fillRect(70, -15, 36, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(110, -11, 170, 5);
    ctx.fillStyle = '#8e8a84'; VG.rrectPath(ctx, 200, -21, 70, 8, 4); ctx.fill();
    ctx.restore();
  }

  // =====================================================================================
  // 1. hook – A B C D E F keys flip into Q W E R T Z: "absichtlich durcheinander"
  const ABC = ['A', 'B', 'C', 'D', 'E', 'F'], QWZ = ['Q', 'W', 'E', 'R', 'T', 'Z'];
  VG.scene('hook', {
    fg(ctx, st) {
      const { h } = st.L, u = U(st), T = th(), s = 124 * u, gap = 20 * u, ry = -0.13 * h;
      const tAbs = at(st, 'vo1', 'absichtlich'), tDur = at(st, 'vo1', 'durcheinander'), tWar = at(st, 'vo1', 'warum');
      const flipAt = (i) => tDur - 0.05 + i * 0.075;
      const shake = (i) => { const q = st.prog(flipAt(i), 0.45); return q > 0 && q < 1 ? Math.sin(q * Math.PI * 3) * 0.12 * (1 - q) * (i % 2 ? 1 : -1) : 0; };
      const X = keyRow(ctx, ABC, 0, ry, s, gap, (i) => st.prog(-0.24 + i * 0.05, 0.45),
        (i) => ({ flip: st.prog(flipAt(i), 0.3), to: QWZ[i], rot: shake(i) + (st.prog(flipAt(i), 0.3) >= 1 ? [-0.04, 0.03, -0.02, 0.05, -0.03, 0.02][i] * E.outQuint(st.prog(flipAt(i) + 0.25, 0.3)) : 0),
          fill: i === 5 && st.lt > flipAt(5) + 0.15 ? T.paper : undefined }));
      // headline: ABSICHTLICH (with marker underline) / DURCHEINANDER
      const hy = -0.3 * h, hs = 92 * u;
      VG.headline(ctx, ['absichtlich'], 0, hy, st.pop(tAbs - 0.12, 0.5), { size: hs });
      VG.headline(ctx, ['durcheinander'], 0, hy + hs * 1.22, st.pop(tDur - 0.12, 0.5), { size: hs, color: T.accent });
      const aw = VG.measure(ctx, 'ABSICHTLICH', { size: hs, weight: 800 });
      VG.underline(ctx, -aw / 2, hy + hs * 0.5, aw / 2, st.prog(tAbs + 0.35, 0.45), { w: 11 * u });
      // handwritten "a b c …" note under the row, struck through on "warum"
      const ny = ry + s * 0.95;
      VG.write(ctx, 'a  b  c  d  e  f', 0, ny, st.prog(tDur + 0.45, 0.7), { size: 50 * u, color: T.muted });
      const nw = VG.measure(ctx, 'a  b  c  d  e  f', { size: 50 * u, weight: 600, font: VG.FONT.hand });
      VG.strike(ctx, -nw / 2 - 14 * u, ny + 4 * u, nw / 2 + 14 * u, st.prog(tWar - 0.1, 0.4), { w: 14 * u });
      VG.write(ctx, 'wär doch logischer, oder?', 0, ny + 72 * u, st.prog(tWar + 0.05, 0.8), { size: 42 * u, color: T.muted, weight: 500 });
      // "?" pop + ripple on "warum"
      VG.ripple(ctx, X(5) - 20 * u, ny + 40 * u, 70 * u, st.lt - tWar, { n: 3, w: 4 * u });
      VG.mark(ctx, '?', X(5) - 20 * u, ny + 40 * u, st.pop(tWar, 0.5), { size: 120 * u });
    },
  });

  // =====================================================================================
  // 2. type bars – a fan of levers converging on the strike point; two neighbours jam
  const FAN = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  const JAM = [4, 5];          // E and F: neighbours
  const DEMO = 7;              // H: the lever that strikes once
  VG.scene('hebel', {
    camera: [[0, 0, 0, 1], [1, 0, 0, 1]],
    fg(ctx, st) {
      const { w, h } = st.L, u = U(st), T = th(), lt = st.lt;
      const P = [0, -0.235 * h], R = 430 * u, n = FAN.length;
      const tSch = at(st, 'vo2', 'schreibmaschinen'), tBuch = at(st, 'vo2', 'buchstaben'), tMet = at(st, 'vo2', 'metallhebel');
      const tBen = at(st, 'vo3', 'benachbarte'), tSchn = at(st, 'vo3', 'schnell'), tVer = at(st, 'vo3', 'verhakten'), tHeb = at(st, 'vo3', -1);
      // platen (Walze) with a sheet of paper behind it
      const py = P[1] - 92 * u, pw = 560 * u, ph = 66 * u;
      const kPaper = st.pop(tSch - 0.1, 0.7);
      if (kPaper > 0) {
        ctx.save(); ctx.globalAlpha *= clamp(kPaper * 2); VG.softShadow(ctx, 18, 6);
        ctx.fillStyle = T.paper; const sh = 150 * u * E.outQuint(kPaper); ctx.fillRect(-190 * u, py - sh, 380 * u, sh + 10 * u); ctx.restore();
        ctx.save(); ctx.globalAlpha *= 0.5 * clamp(kPaper * 2); ctx.strokeStyle = VG.rgba(T.ink, 0.35); ctx.lineWidth = 3 * u;
        for (let i = 0; i < 3; i++) { const yy = py - 110 * u + i * 30 * u; if (yy > py - 150 * u * E.outQuint(kPaper)) { ctx.beginPath(); ctx.moveTo(-150 * u, yy); ctx.lineTo((i === 2 ? 30 : 150) * u, yy); ctx.stroke(); } }
        ctx.restore();
      }
      const kPl = st.prog(-0.32, 0.7);
      if (kPl > 0) { ctx.save(); ctx.globalAlpha *= E.outQuint(clamp((kPl - 0.3) / 0.5)); ctx.fillStyle = T.card; VG.rrectPath(ctx, -pw / 2, py - ph / 2, pw, ph, ph / 2); ctx.fill(); ctx.restore(); }
      VG.inkRect(ctx, -pw / 2, py - ph / 2, pw, ph, ph / 2, kPl, { w: 7 * u });
      [-1, 1].forEach((sgn) => { const kk = st.pop(tSch + 0.35, 0.4); if (kk > 0) VG.dot(ctx, sgn * (pw / 2 + 26 * u), py, 20 * u, kk, T.ink); });
      VG.write(ctx, 'walze', pw / 2 - 20 * u, py - 72 * u, st.prog(tSch + 0.5, 0.5), { size: 40 * u, align: 'left', color: T.muted });
      // strike point
      VG.dot(ctx, P[0], P[1], 9 * u, st.pop(tSch + 0.3, 0.4), T.ink);

      // levers: angle per index across the lower half-circle
      const ang = (i) => Math.PI * (0.13 + 0.74 * (1 - i / (n - 1)));   // 0.13π … 0.87π, A on the left
      const swing = (i) => {
        let s = 0;
        if (i === DEMO) { const q = st.prog(tMet - 0.05, 0.55); s = Math.sin(Math.PI * q); }
        if (JAM.includes(i)) s = Math.max(s, E.outQuint(st.prog(tSchn - 0.1 + (i === JAM[1] ? 0.09 : 0), 0.3)));
        return s;
      };
      const jam = st.prog(tVer, 0.25);
      const ghost = st.prog(tBen - 0.3, 0.5);
      for (let i = 0; i < n; i++) {
        const a = ang(i), pv = [P[0] + Math.cos(a) * R, P[1] + Math.sin(a) * R];
        const kDraw = st.prog(tBuch - 0.35 + i * 0.07, 0.4);
        if (kDraw <= 0) continue;
        const sw = swing(i), len = lerp(0.52, 0.985, sw) * R;
        let tipX = pv[0] - Math.cos(a) * len, tipY = pv[1] - Math.sin(a) * len;
        if (JAM.includes(i) && jam > 0) { const j = Math.sin(lt * 55) * 3 * u * (1 - st.prog(tVer + 0.5, 0.6)); tipX += j; tipY -= j * 0.5; }
        const hot = (i === DEMO && sw > 0.01 && lt < tBen) || (JAM.includes(i) && st.lt > tBen - 0.1);
        const col = hot ? T.accent : T.ink, dim = hot ? 1 : lerp(1, 0.35, ghost);
        ctx.save(); ctx.globalAlpha *= dim;
        VG.ink(ctx, { pts: [pv, [tipX, tipY]], smooth: false }, E.outQuint(kDraw), { w: 9 * u, color: col, shadow: false, wobble: 0 });
        // type slug at the tip
        if (kDraw > 0.8) { ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(a); ctx.fillStyle = col; VG.rrectPath(ctx, -4 * u, -11 * u, 22 * u, 22 * u, 5 * u); ctx.fill(); ctx.restore(); }
        // key cap at the pivot end
        key(ctx, pv[0] + Math.cos(a) * 44 * u, pv[1] + Math.sin(a) * 44 * u, 62 * u, FAN[i], st.prog(tBuch - 0.3 + i * 0.07, 0.5), { fill: hot ? T.accent : undefined, color: hot ? '#fff' : undefined, lw: 4 * u });
        ctx.restore();
      }
      // label "TYPENHEBEL" with a connector to the striking lever
      const ad = ang(DEMO), mid = [P[0] + Math.cos(ad) * R * 0.72, P[1] + Math.sin(ad) * R * 0.72];
      const labY = P[1] + R + 190 * u;
      const lx = 0.25 * w, kLab = st.pop(tMet - 0.1, 0.55), kCon = st.prog(tMet + 0.15, 0.45);
      VG.ghost(ctx, st.prog(tBen - 0.3, 0.5), (c) => {
        VG.line(c, lx - 40 * u, labY - 34 * u, mid[0] + 12 * u, mid[1] + 4 * u, kCon, { w: 4 * u, bend: 0.12 });
        VG.dot(c, mid[0] + 12 * u, mid[1] + 4 * u, 8 * u, st.pop(tMet + 0.55, 0.3), T.ink);
        VG.label(c, 'Typenhebel', lx, labY, kLab, { size: 38 * u });
        VG.write(c, '1 buchstabe = 1 hebel', lx - 10 * u, labY + 74 * u, st.prog(tMet + 0.5, 0.8), { size: 38 * u, color: T.muted });
      }, 0.12);

      // vo3: neighbours highlighted, then they jam at the strike point
      const e0 = ang(JAM[0]), e1 = ang(JAM[1]);
      const nb = [P[0] + Math.cos((e0 + e1) / 2) * (R + 150 * u), P[1] + Math.sin((e0 + e1) / 2) * (R + 150 * u)];
      VG.write(ctx, 'nachbarn', nb[0], nb[1] + 20 * u, st.prog(tBen + 0.1, 0.6), { size: 46 * u, color: T.accent, weight: 700 });
      [e0, e1].forEach((a, j) => {
        const to = [P[0] + Math.cos(a) * (R + 95 * u), P[1] + Math.sin(a) * (R + 95 * u)];
        VG.arrow(ctx, nb[0] + (j ? 60 : -60) * u, nb[1] - 20 * u, to[0], to[1] + 10 * u, st.prog(tBen + 0.25 + j * 0.1, 0.4), { w: 5 * u, headSize: 18 * u, bend: j ? -0.2 : 0.2 });
      });
      // speed lines on "schnell"
      [[-1, 0], [1, 1]].forEach(([sg, j]) => {
        const a = ang(JAM[j]), bx = P[0] + Math.cos(a) * R * 0.55, by = P[1] + Math.sin(a) * R * 0.55;
        const k1 = st.prog(tSchn - 0.05, 0.3), out = 1 - st.prog(tSchn + 0.4, 0.3);
        if (k1 > 0 && out > 0) VG.ink(ctx, { pts: [[bx + sg * 60 * u, by + 20 * u], [bx + sg * 110 * u, by + 60 * u]], smooth: false }, k1, { w: 5 * u, alpha: out, shadow: false });
      });
      // jam: burst + "klemmt!" + cross over the strike point
      VG.burst(ctx, P[0], P[1] + 6 * u, 62 * u, st.pop(tVer + 0.05, 0.5), { w: 4 * u });
      VG.appear(ctx, P[0], P[1] + 6 * u, st.pop(tVer + 0.12, 0.4), (c) => VG.text(c, '!', 0, 2 * u, { size: 64 * u, weight: 800, color: '#fff' }), 'pop');
      VG.appear(ctx, -0.3 * w, P[1] - 5 * u, st.pop(tVer + 0.35, 0.5), (c) => VG.text(c, 'KLEMMT!', 0, 0, { size: 60 * u, weight: 800, color: T.accent }), 'up');
      VG.write(ctx, 'maschine blockiert', -0.3 * w, P[1] + 48 * u, st.prog(tHeb, 0.8), { size: 38 * u, color: T.muted });
    },
  });

  // =====================================================================================
  // 3. Sholes – a clean sheet of paper, a pen writes the explanation; two keys drift apart
  VG.scene('sholes', {
    fg(ctx, st) {
      const { w, h } = st.L, u = U(st), T = th();
      const sw = Math.min(0.8 * w, 860 * u), sh = 0.4 * h, sy = -0.12 * h;
      const tErk = at(st, 'vo4', 'erklärung'), tChr = at(st, 'vo4', 'christopher'), tSor = at(st, 'vo4', 'sortierte'),
        tHau = at(st, 'vo4', 'häufige'), tAus = at(st, 'vo4', 'auseinander');
      VG.sheet(ctx, 0, sy, sw, sh, st.pop(-0.32, 0.6), {}, (c) => {
        const x = 130 * u;
        const writes = [
          { t: tChr - 0.05, dur: 0.95, str: 'Christopher Sholes', x, y: 118 * u, size: 66 * u, color: HAND_BLUE, weight: 700 },
          { t: tChr + 0.95, dur: 0.55, str: 'USA, um 1870', x: x + 4 * u, y: 196 * u, size: 44 * u, color: T.muted },
          { t: tSor - 0.05, dur: 0.95, str: 'tasten umsortiert', x, y: 280 * u, size: 54 * u, color: HAND_BLUE },
          { t: tHau - 0.05, dur: 0.75, str: 'häufige paare:', x, y: 408 * u, size: 54 * u, color: HAND_BLUE },
          { t: tAus + 0.4, dur: 0.75, str: 'weit auseinander', x: 250 * u, y: 664 * u, size: 50 * u, color: T.accent, weight: 700 },
        ];
        // two keys S T side by side that slide apart on "auseinander"
        const ky = 530 * u, cx = sw / 2 + 20 * u, sep = E.inOut(st.prog(tAus - 0.1, 0.7)) * 200 * u;
        const kS = st.prog(tHau + 0.55, 0.45), kT = st.prog(tHau + 0.65, 0.45);
        key(c, cx - 50 * u - sep, ky, 88 * u, 'S', kS, { lw: 4.5 * u });
        key(c, cx + 50 * u + sep, ky, 88 * u, 'T', kT, { lw: 4.5 * u });
        const ka = st.prog(tAus + 0.35, 0.45);
        VG.arrow(c, cx - 24 * u, ky, cx - sep + 12 * u, ky, ka, { w: 5 * u, headSize: 16 * u, color: T.accent });
        VG.arrow(c, cx + 24 * u, ky, cx + sep - 12 * u, ky, ka, { w: 5 * u, headSize: 16 * u, color: T.accent });
        // underline under the name
        const nw = VG.measure(c, 'Christopher Sholes', { size: 66 * u, weight: 700, font: VG.FONT.hand });
        VG.underline(c, x, 160 * u, x + nw, st.prog(tChr + 0.9, 0.4), { w: 8 * u, color: HAND_BLUE, alpha: 0.7 });
        penWrite(c, st, writes, u, [sw + 60 * u, sh - 40 * u]);
      });
      // sticker label "THEORIE" on the top right corner of the sheet + a hedge note
      VG.label(ctx, 'Theorie', sw / 2 - 90 * u, sy - sh / 2 + 6 * u, st.pop(tErk - 0.25, 0.55), { size: 36 * u, fill: T.highlight });
      VG.write(ctx, 'eine gängige erklärung', -sw / 2 + 170 * u, sy - sh / 2 - 44 * u, st.prog(tErk - 0.2, 0.7), { size: 40 * u, color: T.muted, rot: -0.02 });
    },
  });

  // =====================================================================================
  // 4. key row Q W E R T Y – circled; Y and Z swap → QWERTZ; letter frequency bars
  const QWY = ['Q', 'W', 'E', 'R', 'T', 'Y'];
  VG.scene('tasten', {
    fg(ctx, st) {
      const { w, h } = st.L, u = U(st), T = th();
      const s = 120 * u, gap = 18 * u, ry = -0.235 * h;
      const tVer = at(st, 'vo5', 'vermutlich'), tQy = at(st, 'vo5', 3), tUns = at(st, 'vo5', 'uns'), tQz = at(st, 'vo5', 8),
        tDeu = at(st, 'vo5', 'deutschen'), tHae = at(st, 'vo5', 'häufiger'), tZ = tDeu + 0.55, tY = at(st, 'vo5', -1);
      const tot = 6 * s + 5 * gap, X = (i) => -tot / 2 + s / 2 + i * (s + gap);
      const sw = E.inOut(st.prog(tQz - 0.25, 0.6));            // Y ↓ out, Z ↑ in
      keyRow(ctx, QWY.slice(0, 5), X(2), ry, s, gap, (i) => st.prog(-0.32 + i * 0.06, 0.45));
      // Y leaves downwards to the right, Z arrives from below-left
      const yk = st.prog(-0.02, 0.45);
      key(ctx, lerp(X(5), X(5) + 30 * u, sw), lerp(ry, ry + 190 * u, sw), s, 'Y', yk, { alpha: lerp(1, 0.4, sw), rot: 0.12 * sw });
      const zk = st.prog(tQz - 0.3, 0.4);
      key(ctx, lerp(X(5) - 150 * u, X(5), sw), lerp(ry + 230 * u, ry, sw), s, 'Z', zk, { fill: T.accent, color: '#fff', rot: -0.1 * (1 - sw) });
      VG.arrow(ctx, X(5) + 90 * u, ry + 40 * u, X(5) + 100 * u, ry + 150 * u, st.prog(tQz - 0.2, 0.4), { w: 5 * u, headSize: 18 * u, bend: -0.25, color: T.muted });
      VG.arrow(ctx, X(5) - 150 * u, ry + 150 * u, X(5) - 80 * u, ry + 40 * u, st.prog(tQz - 0.1, 0.4), { w: 5 * u, headSize: 18 * u, bend: -0.25, color: T.accent });
      // hedge note + name
      VG.write(ctx, '(vermutlich)', X(0) - 30 * u, ry - 170 * u, st.prog(tVer, 0.6), { size: 42 * u, color: T.muted, align: 'left' });
      VG.headline(ctx, ['qwerty'], X(3) + 60 * u, ry - 175 * u, st.pop(tQy - 0.05, 0.4) * (1 - st.prog(tQz - 0.3, 0.3)), { size: 70 * u });
      VG.headline(ctx, ['qwertz'], X(3) + 60 * u, ry - 175 * u, st.pop(tQz - 0.05, 0.4), { size: 70 * u, color: T.accent });
      // the loop that draws itself around all six keys
      const kl = st.prog(tQy - 0.15, 0.75);
      VG.ghost(ctx, st.prog(tUns, 0.4), (c) => VG.loop(c, 0, ry, tot / 2 + 50 * u, s * 0.9, kl, { w: 10 * u }), 0.0);
      VG.write(ctx, 'bei uns:', X(5) - 250 * u, ry + 250 * u, st.prog(tUns - 0.05, 0.5), { size: 44 * u, color: T.accent, weight: 700 });
      // letter frequency: Z vs Y in German
      const by = 0.02 * h, bx = -0.33 * w, bw = 0.55 * w;
      const kz = st.pop(tZ - 0.15, 0.5), ky = st.pop(tHae + 0.2, 0.5);
      VG.label(ctx, 'Z', bx - 20 * u, by, kz, { size: 40 * u, w: 72 * u, h: 72 * u });
      VG.bar(ctx, bx + 40 * u, by, bw, 34 * u, 1, st.prog(tZ, 0.8), { color: T.accent, track: VG.rgba(T.ink, 0.08) });
      VG.write(ctx, '≈ 1,1 % aller buchstaben', bx + 40 * u, by + 60 * u, st.prog(tZ + 0.3, 0.7), { size: 44 * u, color: T.muted, align: 'left' });
      VG.label(ctx, 'Y', bx - 20 * u, by + 150 * u, ky, { size: 40 * u, w: 72 * u, h: 72 * u });
      VG.bar(ctx, bx + 40 * u, by + 150 * u, bw, 34 * u, 0.04, st.prog(tHae + 0.3, 0.6), { color: T.ink, track: VG.rgba(T.ink, 0.08) });
      VG.write(ctx, '≈ 0,04 %', bx + 40 * u, by + 210 * u, st.prog(tY - 0.1, 0.5), { size: 44 * u, color: T.muted, align: 'left' });
      VG.burst(ctx, bx + 40 * u + bw + 10 * u, by, 34 * u, st.pop(tHae - 0.05, 0.5), { w: 3 * u, points: 9 });
    },
  });

  // =====================================================================================
  // 5. desktop moment – settings window: click, type, open the layout menu, keep QWERTZ
  VG.scene('heute', {
    fg(ctx, st) {
      const { w, h } = st.L, u = U(st), T = th();
      const ww = Math.min(0.84 * w, 900 * u), wh = 0.4 * h, wy = -0.155 * h, bar = 64;
      const tNic = at(st, 'vo6', 'nichts'), tLay = at(st, 'vo6', 'layout'), tBeh = at(st, 'vo6', 'behalten'), tGew = at(st, 'vo6', 'gewohnheit');
      // window-local layout (top-left of content area)
      const L0 = [-ww / 2, wy - wh / 2 + bar];
      const field = { x: 50 * u, y: 200 * u, w: ww - 100 * u, h: 104 * u };
      const dd = { x: 250 * u, y: 64 * u, w: ww - 300 * u, h: 80 * u };
      const opt = (i) => ({ x: dd.x, y: dd.y + dd.h + 10 * u + i * 78 * u, w: dd.w, h: 78 * u });
      const btn = { x: ww - 190 * u, y: wh - bar - 90 * u };
      const G = (x, y) => [L0[0] + x, L0[1] + y];
      // pointer path (content coords)
      const tClick1 = tNic - 0.75, tType = tClick1 + 0.15, tMenu = tLay - 0.1, tHover = tMenu + 0.55, tKeep = tGew - 0.05;
      const pField = G(field.x + field.w * 0.72, field.y + field.h * 0.55), pDd = G(dd.x + dd.w * 0.7, dd.y + dd.h / 2),
        pAbc = G(dd.x + dd.w * 0.55, opt(2).y + 39 * u), pBtn = G(btn.x + 10 * u, btn.y + 8 * u);
      const keys = [[0.15, 0.44 * w, 0.2 * h], [tClick1 - 0.05, ...pField, 'click'], [tMenu - 0.55, pField[0], pField[1]], [tMenu, ...pDd, 'click'],
        [tHover, ...pAbc], [tHover + 0.55, pAbc[0] + 10 * u, pAbc[1] + 4 * u], [tKeep, ...pBtn, 'click'], [tKeep + 1.2, pBtn[0] + 70 * u, pBtn[1] + 150 * u]];
      const menu = st.prog(tMenu + 0.05, 0.25) * (1 - st.prog(tHover + 0.6, 0.2));
      const P = VG.pointerAt(st.lt, keys);
      VG.window(ctx, 0, wy, ww, wh, st.pop(-0.3, 0.55), { title: 'Einstellungen – Tastatur' }, (c, cw, ch) => {
        // layout row
        VG.text(c, 'Layout', 50 * u, dd.y + dd.h / 2, { size: 34 * u, weight: 600, font: VG.FONT.ui, color: '#6b6f78', align: 'left' });
        const ddHot = st.lt > tMenu && menu > 0;
        c.save(); c.fillStyle = '#f1f2f5'; VG.rrectPath(c, dd.x, dd.y, dd.w, dd.h, 18 * u); c.fill();
        c.lineWidth = 3 * u; c.strokeStyle = ddHot ? T.accent : 'rgba(0,0,0,0.12)'; c.stroke(); c.restore();
        VG.text(c, 'QWERTZ – Deutsch', dd.x + 30 * u, dd.y + dd.h / 2 + 1, { size: 34 * u, weight: 600, font: VG.FONT.ui, color: '#1d1d1f', align: 'left' });
        VG.ink(c, { pts: [[dd.x + dd.w - 52 * u, dd.y + 34 * u], [dd.x + dd.w - 38 * u, dd.y + 48 * u], [dd.x + dd.w - 24 * u, dd.y + 34 * u]], smooth: false }, 1, { w: 4 * u, color: '#6b6f78', shadow: false, wobble: 0 });
        // text field + typed text
        const focus = st.lt > tClick1;
        c.save(); c.fillStyle = '#ffffff'; VG.rrectPath(c, field.x, field.y, field.w, field.h, 18 * u); c.fill();
        c.lineWidth = (focus ? 4 : 2.5) * u; c.strokeStyle = focus ? '#4a86f7' : 'rgba(0,0,0,0.14)'; c.stroke(); c.restore();
        VG.text(c, 'Tipp-Test', field.x + 6 * u, field.y - 30 * u, { size: 28 * u, weight: 600, font: VG.FONT.ui, color: '#8a8f99', align: 'left' });
        const kType = st.prog(tType, 1.35);
        if (!focus) VG.text(c, 'Hier tippen …', field.x + 30 * u, field.y + field.h / 2, { size: 36 * u, weight: 500, font: VG.FONT.ui, color: '#b0b4bb', align: 'left' });
        else VG.type(c, 'asdf jklö – nichts klemmt', field.x + 30 * u, field.y + field.h / 2, kType, { size: 38 * u, color: '#1d1d1f', caret: st.lt < tMenu - 0.2 });
        // result: green tick + note
        const kOk = st.prog(tType + 1.45, 0.4);
        VG.tick(c, field.x + 40 * u, field.y + field.h + 70 * u, 46 * u, kOk, { w: 7 * u });
        if (kOk > 0) VG.text(c, 'keine Hebel, kein Stau', field.x + 90 * u, field.y + field.h + 70 * u, { size: 32 * u, weight: 600, font: VG.FONT.ui, color: '#2e9e5b', align: 'left', alpha: E.outQuint(kOk) });
        // buttons
        const press = P.since < 0.25 && st.lt > tKeep - 0.05 ? 1 : 0;
        VG.button(c, 'Ändern', btn.x - 250 * u, btn.y, st.pop(0.5, 0.4), { size: 32 * u, fill: '#e6e7eb', color: '#6b6f78' });
        VG.button(c, 'Behalten', btn.x, btn.y, st.pop(0.6, 0.4), { size: 32 * u, press });
        // dropdown menu on top
        if (menu > 0) {
          c.save(); c.globalAlpha *= E.outQuint(menu); c.translate(0, (1 - E.outQuint(menu)) * -12 * u);
          const m0 = opt(0), mh = 3 * 78 * u + 16 * u;
          c.save(); VG.softShadow(c, 30, 12, 'rgba(0,0,0,0.22)'); c.fillStyle = '#fff'; VG.rrectPath(c, m0.x, m0.y - 8 * u, m0.w, mh, 18 * u); c.fill(); c.restore();
          const hov = st.lt > tHover - 0.1 ? 2 : -1;
          ['QWERTZ – Deutsch', 'QWERTY – Englisch', 'ABCDEF – Alphabetisch'].forEach((s, i) => {
            const o = opt(i);
            if (i === hov) { c.save(); c.fillStyle = VG.rgba(T.accent, 0.14); VG.rrectPath(c, o.x + 8 * u, o.y, o.w - 16 * u, o.h, 12 * u); c.fill(); c.restore(); }
            VG.text(c, s, o.x + 30 * u, o.y + o.h / 2, { size: 32 * u, weight: i === 0 ? 700 : 500, font: VG.FONT.ui, color: i === hov ? T.accent : '#1d1d1f', align: 'left' });
            if (i === 0) VG.tick(c, o.x + o.w - 50 * u, o.y + o.h / 2, 30 * u, 1, { w: 5 * u });
          });
          c.restore();
        }
      });
      VG.pointer(ctx, st.lt, keys, { scale: 1.75 * u });
      // handwritten verdict under the window
      const gy = wy + wh / 2 + 80 * u;
      VG.write(ctx, 'aus reiner gewohnheit', 0, gy, st.prog(tGew - 0.05, 0.8), { size: 58 * u, color: T.accent, weight: 700 });
      const gw = VG.measure(ctx, 'aus reiner gewohnheit', { size: 58 * u, weight: 700, font: VG.FONT.hand });
      VG.underline(ctx, -gw / 2, gy + 40 * u, gw / 2, st.prog(tGew + 0.7, 0.4), { w: 8 * u });
      void tBeh;
    },
  });

  // =====================================================================================
  // 6. question to the viewer – headline, the QWERTZ row with a "10" burst, comment bubble
  VG.scene('frage', {
    fg(ctx, st) {
      const { w, h } = st.L, u = U(st), T = th();
      const tTip = at(st, 'vo7', 'tippst'), tZeh = at(st, 'vo7', 3), tKom = at(st, 'vo7', 'kommentare'), tSch = at(st, 'vo7', 'schreib');
      const hy = -0.3 * h, hs = 84 * u;
      VG.headline(ctx, ['tippst du mit'], 0, hy, st.pop(tTip - 0.1, 0.5), { size: hs });
      VG.headline(ctx, ['zehn fingern?'], 0, hy + hs * 1.08, st.pop(tZeh - 0.1, 0.5), { size: hs, colors: [T.accent, T.accent] });
      // motif: the QWERTZ row, smaller
      const s = 96 * u, gap = 16 * u, ry = -0.12 * h;
      const X = keyRow(ctx, QWZ, 0, ry, s, gap, (i) => st.prog(-0.32 + i * 0.06, 0.45));
      // "10" burst next to the row + a handwritten aside
      VG.burst(ctx, X(0) - 20 * u, ry - s * 1.05, 70 * u, st.pop(tZeh, 0.5), { w: 4 * u, points: 11 });
      VG.appear(ctx, X(0) - 20 * u, ry - s * 1.05, st.pop(tZeh + 0.08, 0.45), (c) => VG.text(c, '10', 0, 3 * u, { size: 56 * u, weight: 800, color: '#fff' }), 'pop');
      VG.write(ctx, 'oder adler-suchsystem?', 0, ry + s * 0.95, st.prog(tZeh + 0.45, 0.8), { size: 44 * u, color: T.muted });
      // comment bubble with a typed answer + arrow towards the comment button
      const by = 0.08 * h, bw = 640 * u, bh = 130 * u, bx = -40 * u;
      VG.appear(ctx, bx, by, st.pop(tSch - 0.1, 0.5), (c) => {
        c.save(); VG.softShadow(c, 24, 10); c.fillStyle = T.paper; VG.rrectPath(c, -bw / 2, -bh / 2, bw, bh, 34 * u); c.fill();
        c.beginPath(); c.moveTo(-bw / 2 + 70 * u, bh / 2 - 2); c.lineTo(-bw / 2 + 60 * u, bh / 2 + 40 * u); c.lineTo(-bw / 2 + 120 * u, bh / 2 - 2); c.closePath(); c.fill(); c.restore();
        VG.dot(c, -bw / 2 + 70 * u, 0, 36 * u, 1, T.soft);
        VG.type(c, 'ja, blind!', -bw / 2 + 130 * u, 2 * u, st.prog(tSch + 0.35, 0.8), { size: 44 * u, color: T.ink, weight: 600 });
      }, 'up');
      VG.arrow(ctx, bx + bw / 2 + 10 * u, by - 10 * u, 0.4 * w, by + 150 * u, st.prog(tKom, 0.6), { w: 6 * u, bend: -0.35, headSize: 24 * u, color: T.accent });
      VG.write(ctx, 'ab in die kommentare', bx - 20 * u, by + 125 * u, st.prog(tKom + 0.15, 0.8), { size: 42 * u, color: T.muted });
      VG.mark(ctx, '?', 0.3 * w, ry - 125 * u, st.pop(tZeh + 0.5, 0.5), { size: 96 * u });
    },
  });
})();
