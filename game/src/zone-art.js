// Code-drawn preview illustration for a zone card: a small scene in the
// zone's own motif, so the three cards read as three different places
// instead of three coloured labels. Deterministic; no RNG.
export function drawZonePreview(ctx, zone, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = zone.bg;
  ctx.fillRect(x, y, w, h);
  const accent = zone.accent;
  if (zone.id === 'drift') {
    // Cyan crystal energy structure + scan rings.
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    for (const [cx, cy, r] of [[x + w * 0.5, y + h * 0.62, 34], [x + w * 0.72, y + h * 0.55, 24]]) {
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    const shards = [
      [0.28, 0.78, 26, 10], [0.42, 0.85, 34, 12], [0.58, 0.8, 22, 9], [0.72, 0.88, 16, 8],
    ];
    for (const [fx, fy, sh, sw] of shards) {
      const px = x + w * fx;
      const py = y + h * fy;
      ctx.beginPath();
      ctx.moveTo(px, py - sh);
      ctx.lineTo(px + sw, py);
      ctx.lineTo(px, py + sh * 0.4);
      ctx.lineTo(px - sw, py);
      ctx.closePath();
      ctx.globalAlpha = 0.85;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e8fbff';
    for (const [fx, fy] of [[0.2, 0.25], [0.55, 0.18], [0.85, 0.3], [0.35, 0.4]]) {
      ctx.beginPath();
      ctx.arc(x + w * fx, y + h * fy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (zone.id === 'ember') {
    // Angular volcanic cracks + an orange plasma channel.
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.08, y + h * 0.85);
    ctx.lineTo(x + w * 0.3, y + h * 0.55);
    ctx.lineTo(x + w * 0.52, y + h * 0.7);
    ctx.lineTo(x + w * 0.78, y + h * 0.35);
    ctx.lineTo(x + w * 0.95, y + h * 0.5);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y + h * 0.3);
    ctx.lineTo(x + w * 0.38, y + h * 0.5);
    ctx.lineTo(x + w * 0.6, y + h * 0.28);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd23f';
    for (const [fx, fy, s] of [[0.25, 0.2, 7], [0.6, 0.15, 9], [0.82, 0.7, 6]]) {
      ctx.save();
      ctx.translate(x + w * fx, y + h * fy);
      ctx.rotate(0.6);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
    // Hazard chevrons along the bottom edge.
    ctx.fillStyle = accent;
    for (let i = 0; i < 5; i += 1) {
      const px = x + w * (0.1 + i * 0.18);
      ctx.beginPath();
      ctx.moveTo(px, y + h - 8);
      ctx.lineTo(px + 7, y + h - 16);
      ctx.lineTo(px + 14, y + h - 8);
      ctx.lineTo(px + 7, y + h - 4);
      ctx.closePath();
      ctx.globalAlpha = 0.75;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // Violet vortex: spiral arcs, a broken orbit ring, and a distant
    // VOIDHEART silhouette (dark core, magenta ring) on the right.
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i += 1) {
      ctx.globalAlpha = 0.65 - i * 0.15;
      ctx.beginPath();
      ctx.arc(x + w * 0.38, y + h * 0.55, 12 + i * 11, 0.4 + i * 0.5, Math.PI * 1.7 + i * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(x + w * 0.38, y + h * 0.55, 46, 0.2, Math.PI * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w * 0.38, y + h * 0.55, 46, Math.PI * 1.3, Math.PI * 1.9);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a0a2e';
    ctx.beginPath();
    ctx.arc(x + w * 0.82, y + h * 0.38, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff3df0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w * 0.82, y + h * 0.38, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff8ef5';
    for (const [fx, fy] of [[0.68, 0.2], [0.95, 0.55], [0.55, 0.85]]) {
      ctx.beginPath();
      ctx.arc(x + w * fx, y + h * fy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
