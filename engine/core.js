// Style-independent core: math, easing, deterministic randomness, colour helpers, canvases.
// Everything lives on the global `VG` namespace so the engine runs as plain <script> tags
// (works from file:// in the standalone player and in headless Chromium).
(function () {
  const VG = (window.VG = window.VG || {});

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const ease = {
    inOut: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 3); },
    in: (t) => { t = clamp(t); return t * t * t; },
    back: (t, s = 2.2) => { t = clamp(t); const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  };
  // 0 before a, ramps to 1 over [a, a+d]
  const win = (t, a, d) => clamp((t - a) / d);
  Object.assign(VG, { clamp, lerp, smooth, ease, win });

  // ---------- deterministic randomness ----------
  function hash(a, b = 0, c = 0) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function rng(seed) {
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const strSeed = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  Object.assign(VG, { hash, rng, strSeed });

  // ---------- canvases ----------
  VG.mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
  // uniform scale of the current transform (shadow blur/offsets are in device pixels)
  VG.scaleOf = (ctx) => { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; };

  // ---------- colour ----------
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  VG.mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); };
  VG.shade = (a, k) => (k >= 0 ? VG.mix(a, '#ffffff', k) : VG.mix(a, '#000000', -k));
  VG.rgba = (h, a) => { const c = hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  VG.ramp = (stops, t) => { t = clamp(t) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(t)); return VG.mix(stops[i], stops[i + 1], t - i); };
  VG.rgbaStr = (c, a) => (c.startsWith('#') ? VG.rgba(c, a) : c.replace(/rgba?\(([^,]+),([^,]+),([^,)]+)(,[^)]+)?\)/, `rgba($1,$2,$3,${a})`));

  // ---------- output formats ----------
  VG.FORMATS = {
    '16:9': { W: 1920, H: 1080 },
    '9:16': { W: 1080, H: 1920 },
  };

  // ---------- stop-motion clock ----------
  // Puppets and pop-ups move "on twos" (animFps), the camera moves on every output frame.
  VG.frame = 0;
  VG.time = 0;
})();
