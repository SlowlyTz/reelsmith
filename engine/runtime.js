// Runtime: wires story data, scene definitions, the timeline, a frame and the camera together.
// Story scenes register themselves with VG.scene(id, { bg, fg, light, camera }).
(function () {
  const VG = window.VG, { clamp, lerp, ease, win } = VG;
  VG.defs = {};
  VG.scene = (id, def) => { VG.defs[id] = def; };

  VG.start = (story, voice = {}) => {
    VG.story = story;
    VG.cast = story.cast || {};
    const T = (VG.T = VG.timeline.build(story, voice));
    const { W, H } = VG.FORMATS[story.format || '16:9'];
    VG.W = W; VG.H = H;
    const style = story.style || 'paper';
    if (style !== 'paper') throw new Error(`unknown style "${style}" (available: paper)`);
    VG.initPaper();
    const frame = (VG.frameImpl = VG.frames[story.frame || 'book'](story, T));
    frame.init();
    VG.layout = frame.layout;
    VG.camKeys = cameraKeys(T, frame);
    return T;
  };

  VG.sceneDef = (k) => VG.defs[VG.T.scenes[k].id] || {};

  // State handed to scene bg/fg/light: scene-local time, pop-up helper, narration sync.
  VG.sceneState = (k, t) => {
    const T = VG.T, sc = T.scenes[k], lt = t - sc.openAt;
    const exitAt = k + 1 < T.scenes.length ? T.scenes[k + 1].start : T.frame === 'book' ? T.outro.closeStart : Infinity;
    const fold = 1 - ease.inOut(win(t, exitAt, T.turnDur * 0.42));
    const line = (id) => { const l = T.lines[id]; if (!l) throw new Error(`unknown line ${id}`); return l; };
    // time (scene-local) at which a word of a narration line starts; w = index or text
    const word = (id, w, end = false) => {
      const l = line(id);
      if (l.words.length) {
        const i = typeof w === 'number' ? w : l.words.findIndex(([x]) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').startsWith(String(w).toLowerCase()));
        if (i >= 0 && l.words[i]) return l.words[i][end ? 2 : 1] - sc.openAt;
      }
      // no voice measured yet: estimate from the text position (~14 chars per second)
      const text = (VG.story.lines.find((x) => x.id === id) || {}).text || '';
      const pos = typeof w === 'number' ? text.split(/\s+/).slice(0, w).join(' ').length : Math.max(0, text.toLowerCase().indexOf(String(w).toLowerCase()));
      return l.start - sc.openAt + pos / 14;
    };
    return { t, lt, k, id: sc.id, fold, L: VG.layout, dur: sc.exitAt - sc.openAt,
      pop: (at, dur) => VG.popK(lt, at, dur) * fold,
      line: (id) => ({ start: line(id).start - sc.openAt, end: line(id).speechEnd - sc.openAt }),
      word, since: (id, w) => lt - word(id, w) };
  };

  // Camera keyframes in world coordinates from the frame's intro/outro views and each scene's
  // `camera: [[lt, x, y, zoom], ...]` (content coordinates, lt relative to the scene opening).
  function cameraKeys(T, frame) {
    const keys = [], cv = frame.closedView, oz = frame.openView.z;
    if (cv) { keys.push([0, cv.x, cv.y, cv.z], [T.intro.openStart - 0.1, cv.x, cv.y, cv.z + 0.035]); }
    T.scenes.forEach((s, k) => {
      const def = VG.defs[s.id] || {}, cam = def.camera || [[0, 0, 0, oz], [s.exitAt - s.openAt - 0.2, 0, 0, oz + 0.04]];
      for (const [lt, x, y, z] of cam) { const [wx, wy] = frame.toWorld(x, y); keys.push([s.openAt + lt, wx, wy, z]); }
    });
    const O = T.outro;
    if (cv) keys.push([O.closeStart + O.closeDur + 0.5, cv.x, cv.y, cv.z + 0.09], [O.end, cv.x, cv.y + 20, cv.z + 0.15]);
    else { const last = keys[keys.length - 1]; keys.push([O.closeStart + 0.4, last[1], last[2], last[3]], [O.end, last[1], last[2], last[3] + 0.04]); }
    return keys.sort((a, b) => a[0] - b[0]);
  }
  VG.camera = (t) => {
    const K = VG.camKeys;
    let c;
    if (t <= K[0][0]) c = { x: K[0][1], y: K[0][2], z: K[0][3] };
    else {
      c = { x: K[K.length - 1][1], y: K[K.length - 1][2], z: K[K.length - 1][3] };
      for (let i = 0; i < K.length - 1; i++) {
        const a = K[i], b = K[i + 1];
        if (t <= b[0]) { const k = b[0] > a[0] ? ease.inOut((t - a[0]) / (b[0] - a[0])) : 1; c = { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), z: lerp(a[3], b[3], k) }; break; }
      }
    }
    return VG.frameImpl.clampCam(c, VG.W, VG.H, t);
  };

  VG.render = (ctx, t) => {
    const T = VG.T, a = T.animFps;
    const tq = Math.floor(t * a + 1e-6) / a;  // puppets & pop-ups move on twos
    VG.frame = Math.floor(t * a + 1e-6); VG.time = tq;
    const cam = VG.camera(t);                   // the camera moves on every frame
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#120904'; ctx.fillRect(0, 0, VG.W, VG.H);
    ctx.setTransform(cam.z, 0, 0, cam.z, VG.W / 2 - cam.x * cam.z, VG.H / 2 - cam.y * cam.z);
    VG.frameImpl.draw(ctx, t, tq, clamp(cam.z, 1, 1.7));
    if (VG.frameImpl.overlay) VG.frameImpl.overlay(ctx, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    VG.post(ctx, t, VG.W, VG.H, T);
  };
})();
