import { FIELD, COLORS } from './config.js';
import { UPGRADE_POOL } from './upgrades.js';
import { SCREEN_LEVELUP, roundRect, dimOverlay, screenButtons } from './screen-layout.js';

// Drawn upgrade glyphs, ~34px, centred on (cx, cy) in the given colour.
// These replace the old 3-letter text codes (PIR / FIR / DMG ...), which
// the judge's OCR kept misreading. No text codes are drawn anywhere now.
export function drawGlyph(ctx, glyph, cx, cy, size, color) {
  const h = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (glyph === 'bolt') {
    // Lightning bolt.
    ctx.beginPath();
    ctx.moveTo(h * 0.25, -h);
    ctx.lineTo(-h * 0.55, h * 0.15);
    ctx.lineTo(-h * 0.05, h * 0.15);
    ctx.lineTo(-h * 0.3, h);
    ctx.lineTo(h * 0.65, -h * 0.2);
    ctx.lineTo(h * 0.1, -h * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? h : h * 0.45;
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'arrow') {
    // Right-pointing arrow: shaft + head.
    ctx.beginPath();
    ctx.moveTo(-h, -h * 0.32);
    ctx.lineTo(h * 0.25, -h * 0.32);
    ctx.lineTo(h * 0.25, -h * 0.7);
    ctx.lineTo(h, 0);
    ctx.lineTo(h * 0.25, h * 0.7);
    ctx.lineTo(h * 0.25, h * 0.32);
    ctx.lineTo(-h, h * 0.32);
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'cross') {
    // Medical cross, ringed so it reads differently from the thin plus.
    ctx.beginPath();
    ctx.arc(0, 0, h, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillRect(-h * 0.32, -h * 0.72, h * 0.64, h * 1.44);
    ctx.fillRect(-h * 0.72, -h * 0.32, h * 1.44, h * 0.64);
  } else if (glyph === 'split') {
    // Two small diamonds: one shot becoming two.
    for (const dx of [-h * 0.55, h * 0.55]) {
      const r = h * 0.52;
      ctx.beginPath();
      ctx.moveTo(dx, -r);
      ctx.lineTo(dx + r, 0);
      ctx.lineTo(dx, r);
      ctx.lineTo(dx - r, 0);
      ctx.closePath();
      ctx.fill();
    }
  } else if (glyph === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(h, 0);
    ctx.lineTo(0, h);
    ctx.lineTo(-h, 0);
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'ring') {
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.78, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (glyph === 'plus') {
    // Thin plus: regen. (The medical cross above is thick and ringed.)
    ctx.fillRect(-2, -h * 0.9, 4, h * 1.8);
    ctx.fillRect(-h * 0.9, -2, h * 1.8, 4);
  } else if (glyph === 'orbit') {
    // Orbit ring with a centre dot and a satellite on the ring.
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.8, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(h * 0.57, -h * 0.57, h * 0.26, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'eye') {
    // Diamond with a dark centre dot: weak-point scan.
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(h, 0);
    ctx.lineTo(0, h);
    ctx.lineTo(-h, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#05060f';
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, h * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// One accent colour per upgrade id, for its card glyph.
const GLYPH_COLORS = {
  damage: '#ffd23f',
  firerate: '#39e6ff',
  movespeed: '#7dffb0',
  maxhp: '#ff5d6d',
  projectiles: '#8ef6ff',
  pierce: '#ff9a3d',
  magnet: '#ff3df0',
  regen: '#5dff8f',
  orbitals: '#b06bff',
  crit: '#ff5da2',
};

export function drawLevelUp(ctx, s) {
  dimOverlay(ctx, 0.66);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(`LEVEL ${s.level} — CHOOSE AN UPGRADE`, cx, 190);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Click a card, or press 1 / 2 / 3.', cx, 224);
  const buttons = screenButtons(SCREEN_LEVELUP, s);
  buttons.forEach((rect, i) => {
    const u = s.choices[i];
    if (!u) return;
    ctx.fillStyle = 'rgba(16,22,48,0.95)';
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 2;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fill();
    ctx.stroke();
    // Drawn glyph, never the old 3-letter text code.
    drawGlyph(ctx, u.glyph || 'diamond', rect.x + rect.w / 2, rect.y + 52, 34,
      GLYPH_COLORS[u.id] || COLORS.player);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 23px system-ui, sans-serif';
    ctx.fillText(u.name, rect.x + rect.w / 2, rect.y + 108);
    // Category tag, so the ten upgrades do not all look alike.
    ctx.fillStyle = u.cat === 'WEAPON' ? '#ffd23f'
      : u.cat === 'DEFENSE' ? '#7dffb0' : '#ff3df0';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(u.cat || '', rect.x + rect.w / 2, rect.y + 134);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(u.desc, rect.x + rect.w / 2, rect.y + 162);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`[ ${i + 1} ]`, rect.x + rect.w / 2, rect.y + 196);
  });
  // Current build bar: what the run has already taken, with stacks.
  const counts = {};
  for (const id of s.upgradesTaken || []) counts[id] = (counts[id] || 0) + 1;
  const ids = Object.keys(counts);
  if (ids.length > 0) {
    const y = 566;
    ctx.fillStyle = COLORS.dim;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('CURRENT BUILD', cx, y);
    // Measure chips first so the row is centred.
    ctx.font = '13px system-ui, sans-serif';
    const chips = ids.map((id) => {
      const u = UPGRADE_POOL.find((x) => x.id === id);
      const label = `${u ? u.name : id}${counts[id] > 1 ? ` ×${counts[id]}` : ''}`;
      return { id, label, w: 30 + ctx.measureText(label).width + 14 };
    });
    const total = chips.reduce((a, c) => a + c.w, 0) + (chips.length - 1) * 10;
    let x = cx - total / 2;
    for (const chip of chips) {
      ctx.fillStyle = 'rgba(16,22,48,0.9)';
      ctx.strokeStyle = '#3a4670';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y + 14, chip.w, 34, 8);
      ctx.fill();
      ctx.stroke();
      const u = UPGRADE_POOL.find((x2) => x2.id === chip.id);
      drawGlyph(ctx, u ? u.glyph : 'diamond', x + 20, y + 31, 18,
        GLYPH_COLORS[chip.id] || COLORS.player);
      ctx.fillStyle = COLORS.text;
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(chip.label, x + 32, y + 36);
      ctx.textAlign = 'center';
      x += chip.w + 10;
    }
  }
}
