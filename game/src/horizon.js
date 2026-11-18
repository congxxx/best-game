const SKIES = {
  drift: { sun: '#267581', ridge: '#102e3f', x: 310, radius: 118, peaks: [95, 128, 60, 92, 152, 77, 90, 64, 132] },
  ember: { sun: '#ae5836', ridge: '#43212a', x: 965, radius: 145, peaks: [56, 130, 74, 182, 65, 88, 159, 94, 51] },
  violet: { sun: '#795a9d', ridge: '#30213e', x: 305, radius: 154, peaks: [128, 150, 91, 64, 83, 115, 79, 130, 152] },
};

export function drawHorizon(ctx, zone) {
  const sky = SKIES[zone.id];
  ctx.save();
  ctx.translate(sky.x, 275);
  ctx.fillStyle = sky.sun;
  ctx.beginPath();
  ctx.arc(0, 0, sky.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = zone.bg;
  for (let band = 0; band < 12; band++) {
    const height = band * 1.1 + 1;
    ctx.fillRect(-sky.radius, -36 + band * 16, sky.radius * 2, height);
  }
  ctx.restore();
  if (zone.id === 'violet') {
    ctx.strokeStyle = '#967ea4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, sky.radius * 1.5, 29, -0.32, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  for (const layer of [0, 1]) {
    ctx.fillStyle = layer ? zone.bg : sky.ridge;
    ctx.beginPath();
    ctx.moveTo(0, 800);
    for (let index = 0; index <= 16; index++) {
      const peak = sky.peaks[(index + layer * 3) % sky.peaks.length];
      ctx.lineTo(index * 80, (layer ? 538 : 490) - peak);
    }
    ctx.lineTo(1280, 800);
    ctx.fill();
  }
}
