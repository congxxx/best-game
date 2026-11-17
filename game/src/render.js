// All canvas drawing for the play field: the themed zone background,
// entities, and HUD. Screens (title, level-up, pause, victory, game over)
// live in screens.js; this file paints the world and delegates to them.
// No game logic lives here; it only reads world.state and paints it.
import { FIELD, COLORS, BOSS } from './config.js';
import { mulberry32 } from './random.js';
import { ZONES } from './zones.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVELUP, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN,
  drawTitle, drawLevelUp, drawPause, drawOver, drawWin,
  formatTime, normalizeSave,
} from './screens.js';

// Screen ids and button layouts are owned by screens.js; main.js imports
// them from here, so re-export them unchanged.
export {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVELUP, SCREEN_PAUSE,
  SCREEN_OVER, SCREEN_WIN, screenButtons,
} from './screens.js';

// Fixed starfield, generated once from a constant seed so it never flickers.
const STAR_RNG = mulberry32(424242);
const STARS = [];
for (let i = 0; i < 180; i += 1) {
  STARS.push({
    x: STAR_RNG() * FIELD.width, y: STAR_RNG() * FIELD.height,
    r: 0.6 + STAR_RNG() * 1.6, tw: STAR_RNG() * 6.28,
  });
}
// Small nebula wisps, fixed positions spread over the whole field so the
// corners are not empty sky. Drawn in the zone accent at a very low alpha
// (see drawBackground) so the field stays readable.
const WISPS = [];
for (let i = 0; i < 12; i += 1) {
  WISPS.push({
    x: 60 + STAR_RNG() * (FIELD.width - 120),
    y: 90 + STAR_RNG() * (FIELD.height - 180),
    r: 42 + STAR_RNG() * 55,
    a: 0.035 + STAR_RNG() * 0.03,
  });
}

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
// Fallback nebulae for the v1 cyan palette, used only when no zone is set.
const NEBULAE = [
  { x: 260, y: 180, r: 260, color: 'rgba(57,230,255,0.05)' },
  { x: 1020, y: 620, r: 300, color: 'rgba(255,61,240,0.05)' },
  { x: 900, y: 150, r: 220, color: 'rgba(176,107,255,0.05)' },
];

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function glowCircle(ctx, x, y, r, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, time, zone) {
  // The current zone carries its own palette; fall back to the first zone,
  // then to the v1 cyan palette when no zone is set at all.
  const z = zone || (ZONES && ZONES[0]) || null;
  const bg = z ? z.bg : COLORS.bg;
  const grid = z ? z.grid : COLORS.grid;
  const gridBright = z ? z.gridBright : COLORS.gridBright;
  const nebulae = z ? z.nebulae : NEBULAE;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const neb of nebulae) {
    // Zone nebulae carry their own alpha and are drawn twice so they read
    // brighter than the faint v1 wash; the fallback keeps the single pass.
    glowCircle(ctx, neb.x, neb.y, neb.r, neb.color, 1);
    if (z) glowCircle(ctx, neb.x, neb.y, neb.r, neb.color, 1);
  }
  // Small wisps in the zone accent, spread across the whole field.
  const accent = (z && z.accent) || COLORS.player;
  for (const w of WISPS) {
    glowCircle(ctx, w.x, w.y, w.r, hexToRgba(accent, w.a), 1);
  }
  for (const star of STARS) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.5 + star.tw));
    glowCircle(ctx, star.x, star.y, star.r, '#cfe6ff', a);
  }
  // Neon grid, gently breathing.
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.8);
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= FIELD.width; x += 64) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD.height);
  }
  for (let y = 0; y <= FIELD.height; y += 64) {
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.width, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.7 + 0.3 * pulse;
  ctx.strokeStyle = gridBright;
  ctx.beginPath();
  for (let x = 0; x <= FIELD.width; x += 256) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD.height);
  }
  for (let y = 0; y <= FIELD.height; y += 256) {
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.width, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, p, time) {
  if (p.iframes > 0 && Math.floor(time * 18) % 2 === 0) return;
  glowCircle(ctx, p.x, p.y, p.radius + 16, 'rgba(57,230,255,0.24)', 1);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = p.flash > 0 ? '#ffffff' : COLORS.player;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-13, -13);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-13, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Orbital blades.
  if (p.orbitals > 0) {
    for (let i = 0; i < p.orbitals; i += 1) {
      const a = p.orbitalAngle + (i / p.orbitals) * Math.PI * 2;
      const ox = p.x + Math.cos(a) * 92;
      const oy = p.y + Math.sin(a) * 92;
      glowCircle(ctx, ox, oy, 12, 'rgba(141,246,255,0.25)', 1);
      ctx.fillStyle = '#bff6ff';
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(57,230,255,0.14)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 92, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemy(ctx, e, time) {
  const flash = e.flash > 0;
  glowCircle(ctx, e.x, e.y, e.radius + 10, e.color, 0.36);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.fillStyle = flash ? '#ffffff' : e.color;
  ctx.strokeStyle = e.elite ? COLORS.gold : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = e.elite ? 3 : 1.5;
  ctx.beginPath();
  if (e.shape === 'diamond' || e.shape === 'blob') {
    ctx.moveTo(e.radius, 0);
    ctx.lineTo(0, e.radius);
    ctx.lineTo(-e.radius, 0);
    ctx.lineTo(0, -e.radius);
    ctx.closePath();
  } else if (e.shape === 'arrow') {
    ctx.moveTo(e.radius + 6, 0);
    ctx.lineTo(-e.radius, -e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.4, 0);
    ctx.lineTo(-e.radius, e.radius * 0.8);
    ctx.closePath();
  } else if (e.shape === 'hex') {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
      else ctx.lineTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
    }
    ctx.closePath();
  } else if (e.shape === 'square') {
    ctx.rect(-e.radius * 0.85, -e.radius * 0.85, e.radius * 1.7, e.radius * 1.7);
  } else if (e.shape === 'core') {
    // VOIDHEART: pulsing core with a rotating ring.
    const pulse = 1 + 0.08 * Math.sin(time * 4 + e.pulse);
    ctx.rotate(-e.angle);
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff8ef5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.7 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = time * 0.7 + (i / 8) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * e.radius * 0.85, Math.sin(a) * e.radius * 0.85);
      ctx.lineTo(Math.cos(a) * (e.radius + 12), Math.sin(a) * (e.radius + 12));
    }
    ctx.stroke();
    ctx.fillStyle = '#fff0fd';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.32 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawEnemyHp(ctx, e);
    return;
  }
  ctx.fill();
  ctx.stroke();
  if (e.shape === 'blob') {
    ctx.fillStyle = 'rgba(5,6,15,0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawEnemyHp(ctx, e);
  if (e.elite && !e.boss) {
    // Above the HP bar, so the bar never strikes through the label.
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ELITE', e.x, e.y - e.radius - 24);
  }
}

function drawEnemyHp(ctx, e) {
  if (e.hp >= e.maxHp || e.boss) return;
  const w = e.radius * 2;
  ctx.fillStyle = 'rgba(10,14,30,0.8)';
  ctx.fillRect(e.x - w / 2, e.y - e.radius - 16, w, 4);
  ctx.fillStyle = '#ff5d5d';
  ctx.fillRect(e.x - w / 2, e.y - e.radius - 16, w * (e.hp / e.maxHp), 4);
}

function drawHud(ctx, s) {
  const p = s.player;
  ctx.textBaseline = 'alphabetic';
  // HP bar.
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HULL', 24, 30);
  bar(ctx, 70, 18, 220, 16, p.hp / p.maxHp, COLORS.hp, COLORS.hpBack);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 298, 30);
  // XP bar.
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('XP', 24, 56);
  bar(ctx, 70, 44, 220, 10, s.xp / s.xpNext, COLORS.xp, COLORS.xpBack);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`LV ${s.level}`, 298, 54);
  // Zone name, top-centre, in the zone's accent colour.
  const zoneName = s.zoneName || (s.zone && s.zone.name) || '';
  if (zoneName) {
    ctx.textAlign = 'center';
    ctx.fillStyle = (s.zone && s.zone.accent) || COLORS.player;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`— ${zoneName} —`, FIELD.width / 2, 30);
  }
  // Right-hand stats.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`WAVE ${s.wave}`, FIELD.width - 24, 30);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`KILLS ${s.kills}    TIME ${formatTime(s.time)}`, FIELD.width - 24, 54);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`SCORE ${s.score}`, FIELD.width - 24, 78);
  // Combo indicator, under SCORE, once a streak is going.
  if ((s.combo || 0) >= 3) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`COMBO x${s.combo}`, FIELD.width - 24, 102);
  }
  // Boss bar.
  const boss = s.enemies.find((e) => e.boss);
  if (boss) {
    const w = 460;
    const x = (FIELD.width - w) / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.boss;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(BOSS.name, FIELD.width / 2, 108);
    bar(ctx, x, 116, w, 12, boss.hp / boss.maxHp, COLORS.boss, '#2a0a26');
  }
  // Wave banner.
  if (s.bannerTimer > 0 && s.bannerText) {
    ctx.globalAlpha = Math.min(1, s.bannerTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8fbff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(s.bannerText, FIELD.width / 2, 220);
    ctx.globalAlpha = 1;
  }
}

function drawEntities(ctx, s, time) {
  // Gems.
  for (const g of s.gems) {
    const bob = 1 + 0.12 * Math.sin(g.bob);
    glowCircle(ctx, g.x, g.y, g.radius * 2.6, g.color, 0.42);
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = g.color;
    const r = g.radius * bob;
    ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.4, r * 1.4);
    ctx.restore();
  }
  for (const e of s.enemies) drawEnemy(ctx, e, time);
  if (s.player.alive) drawPlayer(ctx, s.player, time);
  // Bullets: a short trail behind each round so lines of fire read even
  // when a bullet only lives a few frames before hitting something.
  for (const b of s.bullets) {
    const tx = b.x - b.vx * 0.045;
    const ty = b.y - b.vy * 0.045;
    ctx.strokeStyle = 'rgba(142,246,255,0.55)';
    ctx.lineWidth = b.radius * 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    glowCircle(ctx, b.x, b.y, b.radius + 11, 'rgba(142,246,255,0.4)', 1);
    ctx.fillStyle = b.crit ? COLORS.gold : '#d8fbff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.crit ? b.radius + 2.5 : b.radius + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of s.enemyBullets) {
    const tx = b.x - b.vx * 0.05;
    const ty = b.y - b.vy * 0.05;
    ctx.strokeStyle = 'rgba(255,93,143,0.5)';
    ctx.lineWidth = b.radius * 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    glowCircle(ctx, b.x, b.y, b.radius + 9, 'rgba(255,93,143,0.45)', 1);
    ctx.fillStyle = COLORS.enemyBullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Particles.
  for (const part of s.particles) {
    ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Floating texts.
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px system-ui, sans-serif';
  for (const t of s.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    // Keep centred text on the field: a gem picked up at the edge would
    // otherwise have its label cut off by the canvas edge.
    const tx = Math.max(70, Math.min(FIELD.width - 70, t.x));
    ctx.fillText(t.text, tx, t.y);
  }
  ctx.globalAlpha = 1;
}

// Main entry: paint the world, then the overlay for the current screen.
// `save` is the persistent save record { best, bestByZone, bestTime,
// runs, kills, cores }; a bare best-score number is also accepted.
export function drawGame(ctx, world, screen, save) {
  const s = world.state;
  const sv = normalizeSave(save);
  ctx.save();
  if (s.shake > 0) {
    const mag = Math.min(10, s.shake);
    ctx.translate(Math.sin(s.time * 127.1) * mag, Math.cos(s.time * 311.7) * mag);
  }
  drawBackground(ctx, s.time, s.zone);
  drawEntities(ctx, s, s.time);
  if (screen === SCREEN_PLAY || screen === SCREEN_LEVELUP || screen === SCREEN_PAUSE) {
    drawHud(ctx, s);
  }
  ctx.restore();
  if (screen === SCREEN_TITLE) drawTitle(ctx, sv, s);
  else if (screen === SCREEN_LEVELUP) drawLevelUp(ctx, s);
  else if (screen === SCREEN_PAUSE) drawPause(ctx);
  else if (screen === SCREEN_OVER) drawOver(ctx, s, sv);
  else if (screen === SCREEN_WIN) drawWin(ctx, s, sv);
}
