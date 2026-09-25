// Jointed paper puppets, configured per story in story.json -> "cast".
// Origin = between the feet, y grows downwards, a puppet is ~205 units tall at scale 1.
//
// cast entry: { hair: 'short'|'long'|'bob'|'ponytail'|'bun'|'curly', hairColor, skin,
//               outfit: 'tshirt-shorts'|'tshirt-pants'|'top-skirt'|'dress', top, bottom, shoes,
//               lashes: bool, glasses: bool }
(function () {
  const VG = window.VG, { S, G, piece } = VG;
  const D2R = Math.PI / 180;
  const INK = { eye: '#2a1b14', mouth: '#8a3b2e', blush: '#f08a86' };
  const DEFAULT = { hair: 'short', hairColor: '#5b3820', skin: '#f4caa6', outfit: 'tshirt-shorts', top: '#2f8f8b', bottom: '#c9a26d', shoes: '#f3eee4', lashes: false, glasses: false };
  const skirted = (c) => c.outfit === 'top-skirt' || c.outfit === 'dress';

  // ---------- body shapes ----------
  const head = () => S('head', () => G.ellipse(0, -150, 46, 43));
  const ear = (sx) => S('ear' + sx, () => G.ellipse(sx * 45, -147, 7.5, 9.5));
  const neck = () => S('neck', () => G.rrect(-8, -114, 16, 16, 3));
  const tshirt = () => S('tshirt', () => G.svg('M -27,-110 Q -12,-112 -9,-107 Q 0,-101 9,-107 Q 12,-112 27,-110 L 31,-99 L 28,-60 Q 0,-56 -28,-60 L -31,-99 Z'));
  const stripe = () => S('stripe', () => G.rrect(-28, -80, 56, 6, 2));
  const shorts = () => S('shorts', () => G.poly([-29, -64, 29, -64, 32, -36, 3, -34, 0, -46, -3, -34, -32, -36]));
  const pantsTop = () => S('pantsTop', () => G.poly([-29, -64, 29, -64, 30, -44, -30, -44]));
  const top = () => S('top', () => G.svg('M -24,-109 Q -12,-110 -10,-106 Q 0,-94 10,-106 Q 12,-110 24,-109 L 28,-99 L 25,-63 Q 0,-59 -25,-63 L -28,-99 Z'));
  const skirt = (long) => S('skirt' + long, () => long ? G.svg('M -25,-67 L 25,-67 L 44,-14 Q 0,-7 -44,-14 Z') : G.svg('M -25,-67 L 25,-67 L 39,-27 Q 0,-20 -39,-27 Z'));
  const band = () => S('band', () => G.rrect(-26, -68, 52, 6, 2));
  const arm = () => S('arm', () => G.rrect(-6, -3, 12, 50, 6));
  const hand = () => S('hand', () => G.ellipse(0, 49, 7.5, 7.5));
  const sleeve = (kind) => S('sleeve' + kind, () => kind === 'tee' ? G.svg('M -10,-6 Q 0,-12 10,-6 L 11,17 Q 0,20 -11,17 Z') : G.svg('M -9,-6 Q 0,-11 9,-6 L 9,9 Q 0,12 -9,9 Z'));
  const leg = (len) => S('leg' + len, () => G.rrect(-6.5, -2, 13, len, 5));
  const sneaker = () => S('sneaker', () => G.svg('M -10,-5 C -10,-10 8,-11 12,-4 C 15,1 13,5 8,5 L -9,5 C -12,5 -12,0 -10,-5 Z'));
  const flat = () => S('flatShoe', () => G.ellipse(1, 0, 10.5, 5.5));
  const brad = () => S('brad', () => G.ellipse(0, 0, 2.6, 2.6), 0.2);

  // ---------- hair styles: {back, front, extra} ----------
  const HAIR = {
    short: {
      front: () => S('hShort', () => G.svg('M -49,-144 C -54,-180 -30,-202 0,-202 C 31,-202 54,-182 49,-144 L 45,-148 L 41,-162 L 34,-158 L 28,-172 L 18,-162 L 9,-175 L -1,-164 L -11,-175 L -20,-163 L -30,-172 L -36,-158 L -43,-161 Z')),
      extra: () => S('hTuft', () => G.svg('M -6,-199 C -5,-214 9,-218 15,-208 C 8,-209 4,-205 3,-198 Z')),
      ears: true, shine: [[-28, -191], [-12, -198], [6, -196]],
    },
    long: {
      back: () => S('hLongB', () => G.svg('M -44,-186 C -66,-164 -64,-128 -62,-104 C -61,-92 -67,-84 -59,-77 C -53,-72 -47,-78 -43,-83 C -39,-76 -31,-78 -30,-88 L 30,-88 C 31,-78 39,-76 43,-83 C 47,-78 53,-72 59,-77 C 67,-84 61,-92 62,-104 C 64,-128 66,-164 44,-186 C 24,-206 -24,-206 -44,-186 Z')),
      front: () => S('hLongF', () => G.svg('M -50,-136 C -57,-184 -26,-208 4,-205 C 36,-203 59,-178 51,-134 C 50,-122 50,-110 47,-99 C 44,-93 39,-95 39,-103 C 40,-120 42,-140 40,-152 C 26,-168 0,-172 -20,-162 C -32,-156 -40,-148 -43,-136 C -44,-124 -42,-112 -42,-103 C -44,-95 -50,-95 -51,-103 C -52,-114 -51,-126 -50,-136 Z')),
      shine: [[34, -186], [12, -194], [-14, -188]],
    },
    bob: {
      back: () => S('hBobB', () => G.svg('M -46,-184 C -64,-164 -62,-136 -58,-118 C -54,-108 -44,-110 -40,-116 L 40,-116 C 44,-110 54,-108 58,-118 C 62,-136 64,-164 46,-184 C 24,-206 -24,-206 -46,-184 Z')),
      front: () => S('hBobF', () => G.svg('M -50,-138 C -56,-184 -26,-208 2,-205 C 32,-203 58,-180 50,-138 L 46,-120 C 42,-116 38,-118 38,-124 L 40,-160 L -40,-160 L -38,-124 C -38,-118 -42,-116 -46,-120 Z')),
      shine: [[30, -188], [8, -195], [-16, -190]],
    },
    ponytail: {
      back: () => S('hPonyB', () => G.svg('M 30,-186 C 62,-192 80,-164 70,-128 C 64,-104 70,-86 62,-76 C 54,-90 52,-110 50,-130 C 48,-150 44,-164 30,-172 Z')),
      front: () => S('hPonyF', () => G.svg('M -49,-142 C -55,-182 -28,-205 2,-204 C 33,-203 56,-182 49,-142 L 43,-150 C 34,-166 12,-172 -8,-166 C -24,-162 -38,-154 -44,-142 Z')),
      extra: () => S('hPonyTie', () => G.ellipse(52, -176, 7, 7)),
      ears: true, shine: [[30, -188], [8, -196], [-16, -190]],
    },
    bun: {
      front: () => S('hBunF', () => G.svg('M -49,-142 C -55,-182 -28,-205 2,-204 C 33,-203 56,-182 49,-142 L 43,-150 C 34,-168 10,-174 -8,-168 C -24,-162 -38,-154 -44,-142 Z')),
      extra: () => S('hBun', () => G.ellipse(0, -214, 22, 18)),
      ears: true, shine: [[28, -190], [6, -197], [-16, -191]],
    },
    curly: {
      front: () => S('hCurly', () => { const p = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * (1.02 + (i / 14) * 0.96); const r = 50 + (i % 2 ? 6 : 0); p.push(Math.cos(a) * r, -150 + Math.sin(a) * r * 1.02); }
        p.push(40, -150, 30, -166, 14, -158, 0, -170, -14, -158, -30, -166, -40, -150); return G.blob(p, 6); }),
      ears: true, shine: [[-26, -190], [-8, -198], [10, -196]],
    },
  };

  function drawArm(ctx, c, side, ang, id, extra) {
    const sx = skirted(c) ? 25 : 27;
    ctx.save();
    ctx.translate(side * sx, -102);
    VG.applyJit(ctx, id + 'arm' + side, 0.5);
    ctx.rotate(-side * ang * D2R);
    piece(ctx, arm(), c.skin, 0.7);
    piece(ctx, hand(), c.skin, 0.5);
    if (extra) extra(ctx);
    piece(ctx, sleeve(c.outfit.startsWith('tshirt') ? 'tee' : 'cap'), c.top, 0.6);
    piece(ctx, brad(), '#d7b25c', 0.4, { edgeCol: 'rgba(255,255,220,0.8)' }); // split pin at the joint
    ctx.restore();
  }
  function drawLeg(ctx, c, side, ang, len, id) {
    const hx = skirted(c) ? 11 : 13, hy = skirted(c) ? -44 : -50;
    ctx.save();
    ctx.translate(side * hx, hy);
    VG.applyJit(ctx, id + 'leg' + side, 0.4);
    ctx.rotate(-side * ang * D2R);
    piece(ctx, leg(len), c.outfit === 'tshirt-pants' ? c.bottom : c.skin, 0.6);
    ctx.translate(side * 2, len);
    if (side < 0) ctx.scale(-1, 1);
    if (skirted(c)) piece(ctx, flat(), c.shoes, 0.6);
    else { piece(ctx, sneaker(), c.shoes, 0.6); ctx.fillStyle = '#d9534f'; ctx.fillRect(-2, -4, 3, 7); }
    ctx.restore();
  }
  function face(ctx, c, p) {
    const lx = p.lookX || 0, ly = p.lookY || 0;
    ctx.save(); ctx.globalAlpha = 0.45 + 0.35 * (p.blush || 0); ctx.fillStyle = INK.blush;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 27 + lx * 0.5, -131 + ly * 0.4, 8.5, 5.2, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    for (const s of [-1, 1]) {
      const ex = s * 15.5 + lx, ey = -145 + ly;
      ctx.save(); ctx.strokeStyle = INK.eye; ctx.lineCap = 'round';
      if (p.blink) { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(ex, ey - 2, 5.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
      else if (p.happyEyes) { ctx.lineWidth = 2.8; ctx.beginPath(); ctx.arc(ex, ey + 2, 5.5, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
      else {
        ctx.fillStyle = INK.eye; ctx.beginPath(); ctx.ellipse(ex, ey, 5.3, 6.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 1.7, ey - 2.4, 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex - 1.6, ey + 2.2, 0.9, 0, Math.PI * 2); ctx.fill();
        if (c.lashes) {
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(ex + s * 4.2, ey - 5); ctx.lineTo(ex + s * 7.5, ey - 7.6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ex + s * 5.2, ey - 2.6); ctx.lineTo(ex + s * 8.6, ey - 3.8); ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (c.glasses) {
      ctx.save(); ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 2.2;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 15.5 + lx, -145 + ly, 10, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-5.5 + lx, -146 + ly); ctx.quadraticCurveTo(lx, -150 + ly, 5.5 + lx, -146 + ly); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = c.hairColor; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 15.5 + lx * 0.6, -150 + ly * 0.5 - (p.brow || 0) - (c.glasses ? 3 : 0), 7, 1.25 * Math.PI, 1.75 * Math.PI); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = INK.mouth; ctx.fillStyle = '#a8423a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    const mx = lx * 0.7, my = -131 + ly * 0.5;
    if (p.mouth === 'open') {
      ctx.beginPath(); ctx.moveTo(mx - 7, my - 1); ctx.quadraticCurveTo(mx, my + 11, mx + 7, my - 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e97b7b'; ctx.beginPath(); ctx.ellipse(mx, my + 4.5, 3.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    } else if (p.mouth === 'o') { ctx.beginPath(); ctx.ellipse(mx, my + 2, 3.2, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(mx, my - 4, 7.5, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
    ctx.restore();
  }

  // cast lookup: VG.cast is filled from story.json by the runtime
  VG.cast = {};
  const cfg = (who) => Object.assign({}, DEFAULT, typeof who === 'string' ? VG.cast[who] : who);

  // pose: {x, y, scale, flip, rot, walk (phase in rad), armL, armR (deg, outwards), legL, legR, legLen,
  //        headTilt, lookX, lookY, blink, happyEyes, mouth: 'smile'|'open'|'o', blush 0..1, brow,
  //        hideLegs, holdL/holdR (fn drawing into the hand), front (fn drawn over the body), id}
  VG.puppet = (ctx, who, p) => {
    const c = cfg(who), hair = HAIR[c.hair] || HAIR.short, id = (typeof who === 'string' ? who : 'p') + (p.id || '');
    let armL = p.armL ?? 8, armR = p.armR ?? 8, legL = p.legL ?? 3, legR = p.legR ?? 3, bob = p.bob || 0, tilt = p.headTilt || 0;
    if (p.walk != null) {
      const sw = Math.sin(p.walk);
      legL = 4 + sw * 17; legR = 4 - sw * 17;
      armL = 10 - sw * 16 + (p.armL != null ? p.armL - 8 : 0); armR = 10 + sw * 16 + (p.armR != null ? p.armR - 8 : 0);
      bob -= Math.abs(Math.cos(p.walk)) * 3.5; tilt += sw * 2.5;
    }
    const legLen = p.legLen || (skirted(c) ? 40 : 46);
    ctx.save();
    ctx.translate(p.x || 0, p.y || 0);
    ctx.scale((p.scale || 1) * (p.flip ? -1 : 1), p.scale || 1);
    if (p.rot) ctx.rotate(p.rot);
    VG.applyJit(ctx, id, 0.5);
    ctx.translate(0, bob);
    const headPivot = (fn) => { ctx.save(); ctx.translate(0, -108); ctx.rotate(tilt * D2R); ctx.translate(0, 108); fn(); ctx.restore(); };

    if (hair.back) headPivot(() => { ctx.translate(0, -104); ctx.rotate(-tilt * 0.4 * D2R); ctx.translate(0, 104); piece(ctx, hair.back(), c.hairColor, 0.9); });
    if (!p.hideLegs) { drawLeg(ctx, c, -1, legL, legLen, id); drawLeg(ctx, c, 1, legR, legLen, id); }
    piece(ctx, neck(), VG.shade(c.skin, -0.08), 0.3);
    if (c.outfit === 'tshirt-shorts' || c.outfit === 'tshirt-pants') {
      piece(ctx, c.outfit === 'tshirt-shorts' ? shorts() : pantsTop(), c.bottom, 0.8);
      piece(ctx, tshirt(), c.top, 0.9);
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = VG.paper(VG.shade(c.top, 0.18), true); ctx.fill(stripe()); ctx.restore();
    } else {
      const long = c.outfit === 'dress';
      piece(ctx, skirt(long), long ? c.top : c.bottom, 0.8);
      piece(ctx, top(), c.top, 0.9);
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = VG.paper(VG.shade(long ? c.top : c.bottom, -0.15), true); ctx.fill(band()); ctx.restore();
    }
    headPivot(() => {
      VG.applyJit(ctx, id + 'head', 0.4);
      if (hair.ears) { piece(ctx, ear(-1), c.skin, 0.5); piece(ctx, ear(1), c.skin, 0.5); }
      piece(ctx, head(), c.skin, 1.0);
      face(ctx, c, p);
      piece(ctx, hair.front(), c.hairColor, 0.8);
      if (hair.extra) piece(ctx, hair.extra(), c.hairColor, 0.5);
      const sh = hair.shine;
      ctx.save(); ctx.strokeStyle = VG.rgba(VG.shade(c.hairColor, 0.22), 0.85); ctx.lineWidth = 2.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sh[0][0], sh[0][1]); ctx.quadraticCurveTo(sh[1][0], sh[1][1], sh[2][0], sh[2][1]); ctx.stroke(); ctx.restore();
    });
    drawArm(ctx, c, -1, armL, id, p.holdL);
    drawArm(ctx, c, 1, armR, id, p.holdR);
    if (p.front) p.front(ctx);
    ctx.restore();
  };

  // deterministic blinking every few seconds
  VG.blinkAt = (t, seed) => { const per = 2.6 + VG.hash(seed, 1) * 1.6, ph = VG.hash(seed, 2) * per; return ((t + ph) % per) < 0.14; };
  VG.HAIRSTYLES = Object.keys(HAIR);
  VG.OUTFITS = ['tshirt-shorts', 'tshirt-pants', 'top-skirt', 'dress'];
})();
