import { FIELD, BOSS, COLORS } from './config.js';
import { ZONES, unlockRequirement } from './zones.js';
import { drawZonePreview } from './zone-art.js';
import { SCREEN_TITLE, normalizeSave, roundRect, glowCircle, dimOverlay, drawButton, screenButtons } from './screen-layout.js';

// Drawn padlock glyph, centred on (cx, cy), `size` wide, for locked
// zone cards. Shackle arc on top, body below, dark keyhole dot.
function drawPadlock(ctx, cx, cy, size, color) {
  const w = size;
  const h = size * 0.85;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -h * 0.25, w * 0.28, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(-w / 2, -h * 0.25, w, h * 0.75);
  ctx.fill();
  ctx.fillStyle = '#05060f';
  ctx.beginPath();
  ctx.arc(0, h * 0.05, w * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawZoneCard(ctx, b, sv) {
  const zone = ZONES.find((z) => `zone-${z.id}` === b.id) || ZONES[0];
  const cx = b.x + b.w / 2;
  const locked = !!b.locked;
  ctx.fillStyle = locked ? 'rgba(10,12,26,0.92)' : 'rgba(16,22,48,0.95)';
  ctx.strokeStyle = locked ? '#3a4670' : zone.accent;
  ctx.lineWidth = 2;
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.stroke();
  // Preview illustration, dimmed but visible when locked.
  drawZonePreview(ctx, zone, b.x + 10, b.y + 10, b.w - 20, 84);
  if (locked) {
    ctx.fillStyle = 'rgba(3,4,10,0.45)';
    ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 84);
  }
  if (!locked && sv.lastZone === zone.id) {
    ctx.fillStyle = COLORS.gold;
    const tx = b.x + b.w - 24;
    const ty = b.y + 24;
    ctx.beginPath();
    ctx.moveTo(tx, ty - 7);
    ctx.lineTo(tx + 12, ty);
    ctx.lineTo(tx, ty + 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = locked ? COLORS.dim : zone.accent;
  ctx.fillStyle = '#080b18';
  ctx.fillRect(b.x + 10, b.y + 72, b.w - 20, 22);
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = zone.accent;
  ctx.fillText(zone.fieldLabel, cx, b.y + 88);
  ctx.fillStyle = locked ? COLORS.dim : zone.accent;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(zone.name, cx, b.y + 120);
  if (locked) {
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(unlockRequirement(zone.id), cx, b.y + 142);
    // Padlock + LOCKED, centred as one row.
    ctx.textBaseline = 'middle';
    drawPadlock(ctx, cx - 31, b.y + 166, 20, '#ff5d6d');
    ctx.fillStyle = '#ff5d6d';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LOCKED', cx - 13, b.y + 166);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
  } else {
    const best = sv.bestByZone[zone.id] || 0;
    ctx.fillStyle = COLORS.text;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`BEST ${best > 0 ? best : '—'}`, cx, b.y + 142);
    ctx.fillStyle = zone.accent;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`CLICK TO START  [ ${b.key} ]`, cx, b.y + 166);
  }
}

export function drawTitle(ctx, save, state) {
  const sv = normalizeSave(save);
  const st = state || {};
  dimOverlay(ctx, 0.72);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  glowCircle(ctx, cx, 140, 130, 'rgba(57,230,255,0.12)', 1);
  ctx.fillStyle = COLORS.player;
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('VOIDPULSE', cx, 150);
  ctx.fillStyle = '#ff3df0';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('VOIDHEART  /  SIGNAL INTERCEPT', cx, 186);
  ctx.save();
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + side * 235, 126);
    ctx.scale(side, 1);
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const [offset, height] of [[28,0],[38,-8],[48,6],[60,-40],[71,23],[82,-5],[94,0],[166,0]]) ctx.lineTo(offset, height);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Hold the arena. Survive the waves. Break the VOIDHEART on wave 10.', cx, 214);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('10 WAVES  •  3 ZONES  •  1 FINAL BOSS', cx, 248);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('WASD / Arrows — move · Mouse — aim · Auto-fire always on · P — pause · R — restart', cx, 276);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`BEST SCORE  ${sv.best}   ·   RUNS ${sv.runs}   ·   TOTAL KILLS ${sv.kills}`, cx, 306);
  ctx.fillStyle = COLORS.dim;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('— SELECT ZONE —', cx, 336);
  // The zone-select map: three cards in a row, same grid as level-up.
  const buttons = screenButtons(SCREEN_TITLE, st, sv);
  for (const b of buttons) {
    if (b.id.startsWith('zone-')) drawZoneCard(ctx, b, sv);
  }
  // Brief locked-zone notice, if one was just shown (expires by itself).
  const notice = st.titleNotice;
  if (notice && Date.now() < notice.until) {
    ctx.fillStyle = '#ff5d6d';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(notice.text, cx, 550);
  }
  for (const b of buttons) {
    if (b.id === 'start') drawButton(ctx, b, b.label, true);
  }
  ctx.fillStyle = COLORS.dim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`HANGAR  /  ${sv.cores} CORES SALVAGED  /  SELECT LAUNCH RIG`, cx, 659);
  for (const rig of buttons.filter(button => button.id.startsWith('rig-'))) {
    ctx.fillStyle = rig.selected ? '#12323d' : '#111627';
    ctx.fillRect(rig.x, rig.y, rig.w, rig.h);
    ctx.fillStyle = rig.selected ? COLORS.player : COLORS.dim;
    ctx.fillRect(rig.x, rig.y, rig.w, 2);
    ctx.font = 'bold 15px monospace';
    ctx.fillText(rig.name + (rig.locked ? '  /  ' + rig.cores + ' CORES' : rig.selected ? '  /  FITTED' : '  /  EQUIP'), rig.x + rig.w / 2, rig.y + 25);
    ctx.font = '14px system-ui';
    ctx.fillText(rig.detail, rig.x + rig.w / 2, rig.y + 48);
  }
}
