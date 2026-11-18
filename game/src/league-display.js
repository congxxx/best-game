import { standings, careerTable } from './pilot-league.js';

export function drawPilots(ctx, state) {
  const heat = state.league;
  if (!heat || heat.closed) return;
  const [gx, gy] = heat.gate;
  ctx.save();
  if (heat.finishers.length < 3) {
    ctx.strokeStyle = '#adddc8';
    ctx.lineWidth = 2;
    for (let index = 0; index < 4; index++) {
      ctx.beginPath();
      ctx.arc(gx, gy, 47, index * Math.PI / 2, index * Math.PI / 2 + 0.65);
      ctx.stroke();
    }
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c6efdc';
    ctx.fillText('GATE ' + heat.wave + '  /  +' + (3 - heat.finishers.length), gx, gy - 53);
  }
  for (const pilot of heat.pilots.slice(1)) {
    ctx.save();
    ctx.translate(pilot.x, pilot.y);
    ctx.rotate(pilot.heading || 0);
    ctx.strokeStyle = pilot.color;
    ctx.fillStyle = '#181727';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-9, -7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-9, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = pilot.color;
    ctx.fillText(pilot.name, pilot.x, pilot.y + (pilot.id === 'rook' ? -17 : 23));
  }
  ctx.restore();
}

export function drawLeaderboard(ctx, state, save, result = false) {
  const heat = state.league;
  if (!heat || (!result && heat.closed)) return;
  const left = result ? 905 : 20;
  const top = result ? 320 : 77;
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,28,0.91)';
  ctx.fillRect(left, top, 230, result ? 220 : 131);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 14px monospace';
  const section = (title, rows, y) => {
    ctx.fillStyle = '#e9f2ff';
    ctx.fillText(title, left + 12, y);
    for (const [index, row] of rows.entries()) {
      const line = y + 22 + index * 19;
      ctx.fillStyle = row.color;
      ctx.fillText('P' + row.place + '  ' + row.name, left + 12, line);
      ctx.textAlign = 'right';
      ctx.fillText(row.points + ' PT', left + 217, line);
      ctx.textAlign = 'left';
    }
  };
  section(result ? 'HEAT  /  FINAL' : 'SIGNAL LEAGUE  /  LIVE', standings(heat.pilots), top + 21);
  if (result) section('CAREER  /  TOTAL', careerTable(save.league), top + 132);
  else {
    ctx.font = '12px monospace';
    ctx.fillStyle = '#c4cce1';
    ctx.fillText('Gate finish: 3 / 2 / 1 pts', left + 12, top + 104);
    ctx.fillText(state.time < heat.until ? heat.notice : 'Next gate each wave', left + 12, top + 122);
  }
  ctx.restore();
}
