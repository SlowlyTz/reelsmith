// Style "clean", frame "desktop": a computer screen – soft gradient wallpaper with blurred colour
// blobs and an optional menu bar; scenes place windows (VG.window) and the pointer (VG.pointer) on it.
// story.desktop = { wallpaper: ['#c9d6ff', '#e2c9ff'], menubar: true, clock: '9:41' } (+ story.board options).
(function () {
  const VG = window.VG;
  VG.frames.desktop = (story, T) => {
    const D = { wallpaper: null, menubar: true, clock: '9:41', ...(story.desktop || {}) };
    let wall = null;
    const frame = VG.cleanFrame(story, T, (ctx, W, H) => {
      if (!wall) {   // render the wallpaper once
        const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
        const [a, b] = D.wallpaper || (parseInt(VG.theme.bg.slice(1, 3), 16) < 80 ? ['#1b1f2a', '#2a2140'] : ['#dfe7ff', '#f3dcef']);
        const lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, a); lg.addColorStop(1, b); g.fillStyle = lg; g.fillRect(0, 0, W, H);
        g.filter = `blur(${Math.round(Math.min(W, H) * 0.12)}px)`;
        [[0.2, 0.25, VG.theme.accent, 0.35], [0.85, 0.7, VG.theme.highlight, 0.28], [0.6, 0.1, '#7aa7ff', 0.3]].forEach(([x, y, col, al]) => {
          g.globalAlpha = al; g.fillStyle = col; g.beginPath(); g.arc(x * W, y * H, Math.min(W, H) * 0.32, 0, Math.PI * 2); g.fill();
        });
        g.filter = 'none'; g.globalAlpha = 1; wall = c;
      }
      ctx.fillStyle = '#000'; ctx.fillRect(-W, -H, W * 2, H * 2);
      ctx.drawImage(wall, -W / 2, -H / 2, W, H);
    }, { grain: 0.02 });
    // menu bar in screen space above the scenes
    frame.overlay = (ctx) => {
      if (!D.menubar) return;
      const { w: W, h: H } = frame.layout, bh = Math.round(Math.min(W, H) * 0.045);
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-W / 2, -H / 2, W, bh);
      VG.text(ctx, D.clock, W / 2 - 30, -H / 2 + bh / 2, { size: bh * 0.5, weight: 600, font: VG.FONT.ui, color: '#1d1d1f', align: 'right' });
      ctx.fillStyle = '#1d1d1f'; ctx.beginPath(); ctx.arc(-W / 2 + 36, -H / 2 + bh / 2, bh * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    return frame;
  };
})();
