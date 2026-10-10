// Style "clean": flat minimalist people for little stories – round head, simple hair, rounded body,
// thick rounded limbs, dot eyes. Poses are parameters, so a figure can walk, wave, reach, hold a
// phone or wear a headset and smoothly change between them.
(function () {
  const VG = window.VG, { clamp, lerp } = VG, E = VG.ease, TAU = Math.PI * 2;

  // VG.person(ctx, x, y, h, k, opt) – (x, y) = point between the feet, h = height in units, k = appear (spring)
  // opt: skin, hair ('short' | 'long' | 'bun' | 'curly' | 'none'), hairColor, shirt, pants, shoes, ink (outline colour or false),
  //      facing (1 right, -1 left), face ('smile' | 'neutral' | 'sad' | 'closed' | 'happy'), blush (0..1),
  //      walk (phase in steps, e.g. lt * 1.8; null = standing), wave (0..1 raises the right arm and waves with lt),
  //      reach (0..1 front arm stretched out), phone (0..1 front hand at the ear), headset (true), lean (radians), lt (for idle motion)
  VG.person = (ctx, x, y, h, k = 1, opt = {}) => {
    if (k <= 0) return;
    const f = opt.facing ?? 1, lt = opt.lt ?? 0, ink = opt.ink === undefined ? VG.theme.ink : opt.ink;
    const skin = opt.skin || '#f0c8a8', shirt = opt.shirt || VG.theme.accent, pants = opt.pants || '#3b3f4a', shoes = opt.shoes || '#2a2a2e';
    const hairCol = opt.hairColor || '#4a3428', hr = h * 0.118, lw = Math.max(2, h * 0.012);
    const breathe = Math.sin(lt * 1.6) * h * 0.004, walking = opt.walk != null, ph = walking ? opt.walk * Math.PI : 0;
    const bob = walking ? Math.abs(Math.sin(ph)) * h * 0.018 : 0;

    ctx.save(); ctx.translate(x, y);
    const s = E.spring(k, 0.3); ctx.scale(s, s); ctx.globalAlpha *= clamp(k * 3);
    if (opt.lean) ctx.rotate(opt.lean);
    ctx.translate(0, -bob);
    const hipY = -h * 0.41, shY = -h * 0.72 + breathe, headY = -h + hr + breathe;
    const stroke = (w, col) => { ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
    const limb = (x0, y0, ang, len, w, col, ang2 = 0, len2 = len) => {   // two-segment limb (angles from straight down)
      const kx = x0 + Math.sin(ang) * len, ky = y0 + Math.cos(ang) * len, ex = kx + Math.sin(ang + ang2) * len2, ey = ky + Math.cos(ang + ang2) * len2;
      if (ink) { stroke(w + lw * 2, ink); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke(); }
      stroke(w, col); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke();
      return [ex, ey];
    };
    const blob = (path, col) => { ctx.fillStyle = col; ctx.fill(path); if (ink) { ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.stroke(path); } };

    // long hair hangs behind the body
    if (opt.hair === 'long') {
      const p = new Path2D(), cx = f * hr * 0.04; p.moveTo(cx - hr * 1.12, headY - hr * 0.1); p.quadraticCurveTo(cx - hr * 1.38, headY + hr * 1.5, cx - hr * 1.0, headY + hr * 2.4);
      p.quadraticCurveTo(cx, headY + hr * 2.55, cx + hr * 1.0, headY + hr * 2.4); p.quadraticCurveTo(cx + hr * 1.38, headY + hr * 1.5, cx + hr * 1.12, headY - hr * 0.1); p.closePath(); blob(p, hairCol);
    }
    // legs
    const legW = h * 0.075, legL = (-hipY) / 2 - legW * 0.2, sw = walking ? Math.sin(ph) * 0.45 : 0;
    const feet = [];
    for (const side of [-1, 1]) {
      const a = side * sw * f, bend = walking ? Math.max(0, -Math.sin(ph) * side) * 0.5 * f : 0;
      feet.push(limb(side * h * 0.045, hipY, a, legL, legW, pants, -bend, legL));
    }
    for (const [fx, fy] of feet) { ctx.fillStyle = shoes; ctx.beginPath(); ctx.ellipse(fx + f * legW * 0.35, fy + legW * 0.1, legW * 0.85, legW * 0.42, 0, 0, TAU); ctx.fill(); }
    // back arm (behind the torso)
    const armW = h * 0.06, armL = h * 0.15, swingA = walking ? -Math.sin(ph) * 0.5 : 0.08;
    const back = limb(-f * h * 0.11, shY + armW * 0.4, -f * (0.12 + swingA * f * f), armL, armW, shirt, -f * 0.15, armL * 0.95);
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(back[0], back[1], armW * 0.55, 0, TAU); ctx.fill();
    // torso
    const tw = h * 0.25, tb = h * 0.22, torso = new Path2D();
    torso.moveTo(-tw / 2 + h * 0.02, shY - h * 0.01); torso.quadraticCurveTo(0, shY - h * 0.03, tw / 2 - h * 0.02, shY - h * 0.01);
    torso.quadraticCurveTo(tw / 2 + h * 0.01, shY + h * 0.02, tw / 2, shY + h * 0.05); torso.lineTo(tb / 2, hipY + h * 0.03);
    torso.quadraticCurveTo(0, hipY + h * 0.05, -tb / 2, hipY + h * 0.03); torso.lineTo(-tw / 2, shY + h * 0.05);
    torso.quadraticCurveTo(-tw / 2 - h * 0.01, shY + h * 0.02, -tw / 2 + h * 0.02, shY - h * 0.01); torso.closePath();
    blob(torso, shirt);
    // neck + head
    ctx.fillStyle = skin; ctx.fillRect(-h * 0.025, headY + hr * 0.7, h * 0.05, shY - headY - hr * 0.6);
    const head = new Path2D(); head.arc(f * hr * 0.04, headY, hr, 0, TAU); blob(head, skin);
    // hair on top
    const hx = f * hr * 0.04;
    if (opt.hair !== 'none') {
      const cap = new Path2D();
      if (opt.hair === 'curly') { for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.112), rr = hr * 0.36; cap.moveTo(hx + Math.cos(a) * hr * 0.92 + rr, headY + Math.sin(a) * hr * 0.92); cap.arc(hx + Math.cos(a) * hr * 0.92, headY + Math.sin(a) * hr * 0.92, rr, 0, TAU); } }
      else {
        const lo = opt.hair === 'long' ? 0.25 : -0.1;   // long hair frames the face lower at the sides
        cap.moveTo(hx - hr * 1.05, headY + hr * lo);
        cap.bezierCurveTo(hx - hr * 1.12, headY - hr * 1.3, hx + hr * 1.12, headY - hr * 1.3, hx + hr * 1.05, headY + hr * lo);
        cap.quadraticCurveTo(hx + hr * 0.75, headY - hr * 0.62, hx + f * hr * 0.15, headY - hr * 0.6);
        cap.quadraticCurveTo(hx - hr * 0.75, headY - hr * 0.62, hx - hr * 1.05, headY + hr * lo); cap.closePath();
        if (opt.hair === 'bun') { cap.moveTo(hx - f * hr * 0.35 + hr * 0.45, headY - hr * 1.15); cap.arc(hx - f * hr * 0.35, headY - hr * 1.15, hr * 0.45, 0, TAU); }
      }
      blob(cap, hairCol);
    }
    // face
    const fx = hx + f * hr * 0.28, ey = headY + hr * 0.05, ex = hr * 0.3, face = opt.face || 'smile';
    ctx.fillStyle = VG.theme.ink === '#f2f1ee' ? '#1d1d22' : VG.theme.ink; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1.5, hr * 0.09); ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      const exx = fx + d * ex * (d === f ? 1.05 : 0.8);
      if (face === 'closed' || face === 'happy') { ctx.beginPath(); ctx.arc(exx, ey + hr * 0.04, hr * 0.11, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(exx, ey, hr * 0.075, hr * 0.1, 0, 0, TAU); ctx.fill(); }
    }
    ctx.beginPath();
    if (face === 'sad') ctx.arc(fx, ey + hr * 0.62, hr * 0.22, Math.PI * 1.2, Math.PI * 1.8);
    else if (face === 'neutral') { ctx.moveTo(fx - hr * 0.15, ey + hr * 0.45); ctx.lineTo(fx + hr * 0.15, ey + hr * 0.45); }
    else ctx.arc(fx, ey + hr * 0.2, hr * (face === 'happy' ? 0.3 : 0.24), Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    if (opt.blush) { ctx.fillStyle = VG.rgba('#e07a8a', 0.45 * opt.blush); for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + d * ex * 1.25, ey + hr * 0.32, hr * 0.16, hr * 0.09, 0, 0, TAU); ctx.fill(); } }
    if (opt.headset) {
      stroke(Math.max(3, hr * 0.14), '#2c2f36'); ctx.beginPath(); ctx.arc(hx, headY, hr * 1.12, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      const cx = hx - f * hr * 0.05; ctx.fillStyle = '#2c2f36'; ctx.beginPath(); ctx.ellipse(cx - f * hr * 0.9, headY + hr * 0.05, hr * 0.22, hr * 0.32, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = Math.max(2, hr * 0.08); ctx.beginPath(); ctx.moveTo(cx - f * hr * 0.85, headY + hr * 0.3); ctx.quadraticCurveTo(cx - f * hr * 0.3, headY + hr * 0.95, fx, headY + hr * 0.72); ctx.stroke();
    }
    // front arm: swing / wave / reach / phone (blended)
    const wave = clamp(opt.wave || 0), reach = clamp(opt.reach || 0), phone = clamp(opt.phone || 0);
    let a1 = f * (0.12 + swingA * f * f) * -1, a2 = f * 0.15;
    a1 = lerp(a1, f * 2.6, wave); a2 = lerp(a2, f * (0.4 + Math.sin(lt * 9) * 0.35), wave);
    a1 = lerp(a1, f * 1.45, reach); a2 = lerp(a2, f * 0.1, reach);
    a1 = lerp(a1, f * 0.55, phone); a2 = lerp(a2, f * 2.5, phone);
    const hand = limb(f * h * 0.11, shY + armW * 0.4, a1, armL, armW, shirt, a2, armL * 0.95);
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hand[0], hand[1], armW * 0.55, 0, TAU); ctx.fill();
    if (phone > 0.5) { ctx.save(); ctx.globalAlpha *= clamp((phone - 0.5) * 2); ctx.translate(hand[0], hand[1] - armW * 0.2); ctx.rotate(-f * 0.25);
      ctx.fillStyle = '#25272d'; VG.rrectPath(ctx, -armW * 0.35, -armW * 1.1, armW * 0.7, armW * 1.6, armW * 0.18); ctx.fill(); ctx.restore(); }
    ctx.restore();
    return { head: [x + hx, y + headY - bob], hand: [x + hand[0], y + hand[1] - bob], top: y - h };
  };
})();
