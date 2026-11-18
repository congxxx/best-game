// All canvas drawing for the play field: the themed zone background,
// entities, and HUD. Screens (title, level-up, pause, victory, game over)
// live in screens.js; this file paints the world and delegates to them.
// No game logic lives here; it only reads world.state and paints it.
import { FIELD, COLORS, BOSS } from './config.js';
import { mulberry32 } from './random.js';
import { drawHorizon } from './horizon.js';
import { pulseHint } from './counterpulse.js';
import { drawPilots, drawLeaderboard } from './league-display.js';
import { drawRadar } from './nav-radar.js';
import { drawResearchReport } from './workshop.js';
import { paintRelay, relayStatus, ORDERS } from './relay.js';
import { drawEnemyHull } from './enemy-hulls.js';
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
for (let i = 0; i < 80; i += 1) {
  STARS.push({
    x: STAR_RNG() * FIELD.width, y: STAR_RNG() * FIELD.height,
    r: 0.6 + STAR_RNG() * 1.6, tw: STAR_RNG() * 6.28,
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

// Soft nebula wash: a radial gradient that fades to transparent, so the
// field has no hard-edged colour blobs. `color` is 'rgba(r,g,b,a)'.
function nebulaWash(ctx, x, y, r, color) {
  const m = color.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
  if (!m) { glowCircle(ctx, x, y, r, color, 1); return; }
  const [, cr, cg, cb, ca] = m;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${ca})`);
  g.addColorStop(0.6, `rgba(${cr},${cg},${cb},${+ca * 0.45})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Per-zone background motif, painted at low alpha behind the grid so the
// three zones read as different places. Deterministic fixed geometry.
function drawMotif(ctx, zone) {
  if (!zone || !zone.motif) return;
  const accent = zone.accent;
  ctx.save();
  if (zone.motif === 'radar') {
    // Radar arcs + crystal shards.
    ctx.strokeStyle = hexToRgba(accent, 0.16);
    ctx.lineWidth = 1.5;
    for (const [cx, cy, r] of [[300, 230, 90], [300, 230, 150], [980, 590, 110], [980, 590, 175]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0.3, Math.PI * 1.4);
      ctx.stroke();
    }
    ctx.fillStyle = hexToRgba(accent, 0.13);
    for (const [px, py, s] of [[180, 420, 14], [700, 150, 10], [1120, 350, 16], [520, 640, 12], [860, 700, 9]]) {
      ctx.beginPath();
      ctx.moveTo(px, py - s);
      ctx.lineTo(px + s * 0.7, py);
      ctx.lineTo(px, py + s * 0.5);
      ctx.lineTo(px - s * 0.7, py);
      ctx.closePath();
      ctx.fill();
    }
  } else if (zone.motif === 'cracks') {
    // Jagged volcanic cracks + angular floating shards + plasma streak.
    ctx.strokeStyle = hexToRgba(accent, 0.20);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 180);
    ctx.lineTo(260, 260);
    ctx.lineTo(420, 190);
    ctx.lineTo(640, 300);
    ctx.lineTo(900, 220);
    ctx.lineTo(1220, 330);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(120, 640);
    ctx.lineTo(340, 560);
    ctx.lineTo(560, 660);
    ctx.lineTo(820, 580);
    ctx.lineTo(1140, 680);
    ctx.stroke();
    ctx.fillStyle = hexToRgba('#ffd23f', 0.16);
    for (const [px, py, s, rot] of [[220, 420, 16, 0.5], [760, 140, 12, 1.1], [1060, 470, 18, 0.3], [480, 720, 11, 0.9]]) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
  } else if (zone.motif === 'rings') {
    // Broken orbit rings + a gravity swirl + shards on the ring.
    ctx.strokeStyle = hexToRgba(accent, 0.18);
    ctx.lineWidth = 2;
    for (const [cx, cy, r, a0, a1] of [
      [330, 250, 80, 0.2, 2.4], [330, 250, 120, 3.0, 5.2],
      [950, 580, 90, 1.0, 3.4], [950, 580, 140, 4.0, 5.8],
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.stroke();
    }
    ctx.strokeStyle = hexToRgba('#ff3df0', 0.14);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(640, 400, 60 + i * 34, 0.6 + i * 0.7, Math.PI * 1.5 + i * 0.7);
      ctx.stroke();
    }
    ctx.fillStyle = hexToRgba(accent, 0.16);
    for (const [px, py, s] of [[330, 170, 8], [450, 250, 10], [950, 490, 9], [1090, 580, 11], [640, 300, 7]]) {
      ctx.beginPath();
      ctx.moveTo(px, py - s);
      ctx.lineTo(px + s, py);
      ctx.lineTo(px, py + s);
      ctx.lineTo(px - s, py);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBackground(ctx, time, zone) {
  // The current zone carries its own palette; fall back to the first zone,
  // then to the v1 cyan palette when no zone is set at all.
  const z = zone || (ZONES && ZONES[0]) || null;
  const bg = z ? z.bg : COLORS.bg;
  const nebulae = z ? z.nebulae : NEBULAE;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const neb of nebulae) {
    // Soft radial wash: no hard-edged colour blobs.
    nebulaWash(ctx, neb.x, neb.y, neb.r, neb.color);
  }
  for (const star of STARS) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.5 + star.tw));
    glowCircle(ctx, star.x, star.y, star.r, '#cfe6ff', a);
  }
  drawHorizon(ctx, z);
  // Zone motif, behind the entities: the three zones read differently.
  drawMotif(ctx, z);
}

function drawPlayer(ctx, p, time) {
  const shield = p.iframes > 0 && Math.floor(time * 18) % 2 === 0;
  ctx.strokeStyle = shield ? '#fff' : '#70f6ee';
  ctx.lineWidth = 2;
  for (const angle of [0.2, 2.3, 4.4]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 11, angle, angle + 0.9);
    ctx.stroke();
  }
  glowCircle(ctx, p.x, p.y, p.radius + 12, 'rgba(57,230,255,0.18)', 1);
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
      glowCircle(ctx, ox, oy, 10, 'rgba(141,246,255,0.2)', 1);
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
  glowCircle(ctx, e.x, e.y, e.radius + 3, e.color, 0.13);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.kind === 'darter' && e.lunging > 0 ? Math.atan2(e.lungeY, e.lungeX) : e.angle);
  ctx.fillStyle = flash ? '#ffffff' : e.color;
  ctx.strokeStyle = e.elite ? COLORS.gold : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = e.elite ? 3 : 1.5;
  ctx.beginPath();
  if (e.shape === 'core') {
    // VOIDHEART: pulsing core with a rotating ring.
    const pulse = 1 + 0.08 * Math.sin(time * 4 + e.pulse);
    ctx.rotate(-e.angle);
    ctx.beginPath();
    ctx.fillStyle = '#230f34';
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    for (let plate = 0; plate < 6; plate++) {
      ctx.save();
      ctx.rotate(plate * Math.PI / 3 + time * 0.14);
      ctx.beginPath();
      ctx.moveTo(24, -10);
      ctx.lineTo(51, -32);
      ctx.lineTo(73, -11);
      ctx.lineTo(61, 9);
      ctx.lineTo(39, 15);
      ctx.closePath();
      ctx.fillStyle = flash ? '#ffd5eb' : '#87345e';
      ctx.fill();
      ctx.strokeStyle = '#ff977e';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
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
  drawEnemyHull(ctx, e);
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
    ctx.font = 'bold 12px monospace';
    ctx.fillText(s.zone.fieldLabel, FIELD.width / 2, 49);
  }
  // Right-hand stats.
  if (s.relay) {
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('OP ' + (s.relay.rank + 1) + '  /  ' + ORDERS[s.relay.rank].name, 24, FIELD.height - 45);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(relayStatus(s), 24, FIELD.height - 24);
  }
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
    const phase = boss.hp < boss.maxHp / 2 ? 'II  /  OVERDRIVE' : 'I  /  CONTAINMENT';
    ctx.fillText(BOSS.name + '   ·   PHASE ' + phase, FIELD.width / 2, 108);
    bar(ctx, x, 116, w, 12, boss.hp / boss.maxHp, COLORS.boss, '#2a0a26');
    if (boss.shootTimer <= 0.8) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('RING BURST IN ' + Math.max(0, boss.shootTimer).toFixed(1) + 's', FIELD.width / 2, 149);
    }
  }
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = COLORS.player;
  ctx.fillText(pulseHint(s), FIELD.width - 24, FIELD.height - 24);
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
    glowCircle(ctx, g.x, g.y, g.radius * 1.4, g.color, 0.18);
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = g.color;
    const r = g.radius * bob;
    ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.4, r * 1.4);
    ctx.restore();
  }
  for (const e of s.enemies) drawEnemy(ctx, e, time);
  // Bullets: a short trail behind each round so lines of fire read even
  // when a bullet only lives a few frames before hitting something.
  for (const b of s.bullets) {
    const tx = b.x - b.vx * 0.045;
    const ty = b.y - b.vy * 0.045;
    ctx.strokeStyle = b.reflected ? '#49ffcc' : 'rgba(142,246,255,0.55)';
    ctx.lineWidth = b.radius * 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    glowCircle(ctx, b.x, b.y, b.radius + 3, 'rgba(142,246,255,0.20)', 1);
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
    glowCircle(ctx, b.x, b.y, b.radius + 7, 'rgba(255,93,143,0.35)', 1);
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
  if (s.player.alive) drawPlayer(ctx, s.player, time);
  const echo = s.lastReflection;
  if (echo && time - echo.time < 0.85) {
    const age = (time - echo.time) / 0.85;
    ctx.save();
    ctx.globalAlpha = 1 - age;
    ctx.strokeStyle = '#62ffd6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(echo.x, echo.y, 28 + age * 150, 0, Math.PI * 2);
    ctx.stroke();
    const left = Math.max(10, Math.min(FIELD.width - 234, echo.x - 112));
    const top = echo.y < 238 ? echo.y + 45 : echo.y - 142;
    ctx.fillStyle = '#08232d';
    ctx.fillRect(left, top, 224, 55);
    ctx.fillStyle = '#62ffd6';
    ctx.fillRect(left, top, 3, 55);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('VOIDPULSE  /  COUNTERPULSE', left + 11, top + 18);
    ctx.font = 'bold 21px system-ui';
    ctx.fillText(echo.count + (echo.count === 1 ? ' SHOT' : ' SHOTS') + ' REFLECTED', left + 10, top + 45, 204);
    ctx.restore();
  }
  // Floating texts.
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px system-ui, sans-serif';
  for (const t of s.texts) {
    if (/^\d+(?:\.\d+)?$/.test(t.text) || /^\+\d+ XP$/.test(t.text)) continue;
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
  if (screen === SCREEN_PLAY) paintRelay(ctx, s);
  if (screen === SCREEN_PLAY) drawPilots(ctx, s);
  drawEntities(ctx, s, s.time);
  if (screen === SCREEN_PLAY || screen === SCREEN_LEVELUP || screen === SCREEN_PAUSE) {
    drawHud(ctx, s);
    if (screen === SCREEN_PLAY) drawLeaderboard(ctx, s, sv);
    if (screen === SCREEN_PLAY) drawRadar(ctx, s);
  }
  ctx.restore();
  if (screen === SCREEN_TITLE) drawTitle(ctx, sv, s);
  else if (screen === SCREEN_LEVELUP) drawLevelUp(ctx, s);
  else if (screen === SCREEN_PAUSE) drawPause(ctx);
  else if (screen === SCREEN_OVER) drawOver(ctx, s, sv);
  else if (screen === SCREEN_WIN) drawWin(ctx, s, sv);
  if (screen === SCREEN_WIN || screen === SCREEN_OVER) drawLeaderboard(ctx, s, sv, true);
  if (screen === SCREEN_WIN || screen === SCREEN_OVER) drawResearchReport(ctx, sv);
}
