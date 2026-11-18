import { FIELD, BOSS, COLORS } from './config.js';
import { ZONES } from './zones.js';
import { SCREEN_OVER, SCREEN_WIN, normalizeSave, formatTime, dimOverlay, drawButton, screenButtons } from './screen-layout.js';

// End-of-run stat sheet: label left, value right, same style as v1.
// isWin adds BEST CLEAR TIME when a clear time has been recorded.
export function statsLines(s, save, isWin) {
  const sv = normalizeSave(save);
  const stats = s.stats || {};
  const rows = [
    ['SCORE', String(s.score)],
    ['BEST', String(sv.best)],
    ['WAVE REACHED', String(s.wave)],
    ['KILLS', String(s.kills)],
    ['TIME', formatTime(s.time)],
    ['LEVEL', String(s.level)],
    ['GEMS COLLECTED', String(stats.gemsCollected || 0)],
    ['CORES SALVAGED', String(stats.coresCollected || 0)],
    ['BEST COMBO', String(s.bestCombo || 0)],
  ];
  if (isWin && sv.bestTime > 0) rows.push(['BEST CLEAR TIME', formatTime(sv.bestTime)]);
  return rows;
}

export function drawStats(ctx, s, y, save, isWin) {
  ctx.textAlign = 'center';
  for (const [label, value] of statsLines(s, save, isWin)) {
    ctx.fillStyle = COLORS.dim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(label, FIELD.width / 2 - 130, y);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(value, FIELD.width / 2 + 40, y);
    ctx.textAlign = 'center';
    y += 30;
  }
  return y;
}

function drawNewBest(ctx, s, y) {
  if (!s.runResult || !s.runResult.newBest) return;
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ NEW BEST! ★', FIELD.width / 2, y);
}

export function drawOver(ctx, s, save) {
  dimOverlay(ctx, 0.78);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hp;
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('SIGNAL LOST', cx, 190);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('The void takes another pulse.', cx, 226);
  drawNewBest(ctx, s, 258);
  drawStats(ctx, s, 290, save, false);
  for (const b of screenButtons(SCREEN_OVER, s)) drawButton(ctx, b, b.label, b.id === 'restart');
}

export function drawWin(ctx, s, save) {
  dimOverlay(ctx, 0.72);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  // Gold banner: the achievement, first thing the eye reads.
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText('VOIDHEART DEFEATED', cx, 108);
  // Wrecked-core emblem: a broken gold ring around a cracked dark core,
  // with three drifting shards — the boss, destroyed, drawn in code.
  ctx.save();
  ctx.translate(cx, 178);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i += 1) {
    const a0 = i * (Math.PI * 2 / 3) + 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, 44, a0, a0 + Math.PI * 2 / 3 - 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#1a0a2e';
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff8ef5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -14);
  ctx.lineTo(-2, -2);
  ctx.lineTo(-10, 8);
  ctx.moveTo(10, -10);
  ctx.lineTo(2, 4);
  ctx.lineTo(12, 12);
  ctx.stroke();
  ctx.fillStyle = COLORS.gold;
  const shards = [[-62, -18, 7], [60, 6, 9], [-8, 58, 6]];
  for (const [sx, sy, sr] of shards) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sx * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, -sr);
    ctx.lineTo(sr, 0);
    ctx.lineTo(0, sr);
    ctx.lineTo(-sr, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Wave 10 is yours. The arena is quiet — for now.', cx, 258);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('★  10 WAVES  ·  3 ZONES  ·  1 FINAL BOSS  ★', cx, 288);
  drawNewBest(ctx, s, 316);
  drawStats(ctx, s, 338, save, true);
  for (const b of screenButtons(SCREEN_WIN, s)) drawButton(ctx, b, b.label, b.id === 'continue');
}
