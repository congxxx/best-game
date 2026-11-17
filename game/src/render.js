// All canvas drawing: the neon field, entities, HUD, and every screen
// (title, level-up, pause, victory, game over). No game logic lives here;
// it only reads world.state and paints it.
import { FIELD, COLORS, BOSS } from './config.js';
import { mulberry32 } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVELUP = 'levelup';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

// Fixed starfield, generated once from a constant seed so it never flickers.
const STAR_RNG = mulberry32(424242);
const STARS = [];
for (let i = 0; i < 90; i += 1) {
  STARS.push({
    x: STAR_RNG() * FIELD.width, y: STAR_RNG() * FIELD.height,
    r: 0.6 + STAR_RNG() * 1.6, tw: STAR_RNG() * 6.28,
  });
}
const NEBULAE = [
  { x: 260, y: 180, r: 260, color: 'rgba(57,230,255,0.05)' },
  { x: 1020, y: 620, r: 300, color: 'rgba(255,61,240,0.05)' },
  { x: 900, y: 150, r: 220, color: 'rgba(176,107,255,0.05)' },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function drawButton(ctx, rect, label, accent) {
  ctx.fillStyle = accent ? 'rgba(57,230,255,0.16)' : 'rgba(20,28,56,0.9)';
  ctx.strokeStyle = accent ? COLORS.player : '#3a4670';
  ctx.lineWidth = 2;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent ? '#e8fbff' : COLORS.text;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, r, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Button layouts, shared by the drawer and main.js click handling.
export function screenButtons(screen, state) {
  const cx = FIELD.width / 2;
  if (screen === SCREEN_TITLE) {
    return [{ id: 'start', x: cx - 130, y: 560, w: 260, h: 56, label: 'START RUN' }];
  }
  if (screen === SCREEN_LEVELUP) {
    const cards = [];
    for (let i = 0; i < 3; i += 1) {
      cards.push({
        id: `card${i}`, x: cx - 480 + i * 330, y: 290, w: 300, h: 230,
        label: state.choices[i] ? state.choices[i].name : '',
      });
    }
    return cards;
  }
  if (screen === SCREEN_PAUSE) {
    return [
      { id: 'resume', x: cx - 130, y: 420, w: 260, h: 52, label: 'RESUME' },
      { id: 'restart', x: cx - 130, y: 488, w: 260, h: 52, label: 'RESTART' },
    ];
  }
  if (screen === SCREEN_OVER) {
    return [{ id: 'restart', x: cx - 130, y: 560, w: 260, h: 56, label: 'RETRY  (R)' }];
  }
  if (screen === SCREEN_WIN) {
    return [
      { id: 'continue', x: cx - 280, y: 560, w: 260, h: 56, label: 'CONTINUE ENDLESS' },
      { id: 'restart', x: cx + 20, y: 560, w: 260, h: 56, label: 'PLAY AGAIN  (R)' },
    ];
  }
  return [];
}

function drawBackground(ctx, time) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const neb of NEBULAE) {
    glowCircle(ctx, neb.x, neb.y, neb.r, neb.color, 1);
  }
  for (const star of STARS) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.5 + star.tw));
    glowCircle(ctx, star.x, star.y, star.r, '#cfe6ff', a);
  }
  // Neon grid, gently breathing.
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.8);
  ctx.strokeStyle = COLORS.grid;
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
  ctx.strokeStyle = `rgba(57,230,255,${0.05 + 0.05 * pulse})`;
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
}

function drawPlayer(ctx, p, time) {
  if (p.iframes > 0 && Math.floor(time * 18) % 2 === 0) return;
  glowCircle(ctx, p.x, p.y, p.radius + 16, 'rgba(57,230,255,0.18)', 1);
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
  glowCircle(ctx, e.x, e.y, e.radius + 10, e.color, 0.16);
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
    glowCircle(ctx, g.x, g.y, g.radius * 2.2, g.color, 0.25);
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
  // Bullets.
  for (const b of s.bullets) {
    glowCircle(ctx, b.x, b.y, b.radius + 6, 'rgba(142,246,255,0.35)', 1);
    ctx.fillStyle = b.crit ? COLORS.gold : '#d8fbff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.crit ? b.radius + 1.5 : b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of s.enemyBullets) {
    glowCircle(ctx, b.x, b.y, b.radius + 7, 'rgba(255,93,143,0.4)', 1);
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

function dimOverlay(ctx, alpha) {
  ctx.fillStyle = `rgba(3,4,10,${alpha})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function statsLines(s) {
  return [
    ['SCORE', String(s.score)],
    ['WAVE REACHED', String(s.wave)],
    ['KILLS', String(s.kills)],
    ['TIME', formatTime(s.time)],
    ['LEVEL', String(s.level)],
    ['GEMS COLLECTED', String(s.stats.gemsCollected)],
  ];
}

function drawStats(ctx, s, y) {
  ctx.textAlign = 'center';
  for (const [label, value] of statsLines(s)) {
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

function drawTitle(ctx, best) {
  dimOverlay(ctx, 0.72);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  glowCircle(ctx, cx, 180, 130, 'rgba(57,230,255,0.12)', 1);
  ctx.fillStyle = COLORS.player;
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('VOIDPULSE', cx, 200);
  ctx.fillStyle = '#ff3df0';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('— A NEON ARENA SURVIVOR —', cx, 238);
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Hold the arena. Survive the waves. Break the VOIDHEART on wave 10.', cx, 292);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('WASD / Arrows — move      Mouse — aim (auto-fire is always on)', cx, 330);
  ctx.fillText('Collect XP gems, pick upgrades on level-up, dodge the pink shots.', cx, 356);
  ctx.fillText('P / Esc — pause      R — restart      1 / 2 / 3 — pick a card', cx, 382);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`BEST SCORE  ${best}`, cx, 428);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Elites glow gold every 3rd wave. Splitters burst into minis. Good hunting.', cx, 470);
  for (const b of screenButtons(SCREEN_TITLE)) drawButton(ctx, b, b.label, true);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('An original game. No borrowed names, art or music.', cx, 660);
}

function drawLevelUp(ctx, s) {
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
    ctx.fillStyle = COLORS.player;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(u.icon, rect.x + rect.w / 2, rect.y + 62);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText(u.name, rect.x + rect.w / 2, rect.y + 108);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(u.desc, rect.x + rect.w / 2, rect.y + 142);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`[ ${i + 1} ]`, rect.x + rect.w / 2, rect.y + 188);
  });
}

function drawPause(ctx) {
  dimOverlay(ctx, 0.7);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('PAUSED', cx, 300);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('WASD move · Mouse aim · Auto-fire on · P / Esc resume', cx, 340);
  for (const b of screenButtons(SCREEN_PAUSE)) drawButton(ctx, b, b.label, b.id === 'resume');
}

function drawOver(ctx, s) {
  dimOverlay(ctx, 0.78);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hp;
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('SIGNAL LOST', cx, 190);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('The void takes another pulse.', cx, 226);
  drawStats(ctx, s, 290);
  for (const b of screenButtons(SCREEN_OVER, s)) drawButton(ctx, b, b.label, true);
}

function drawWin(ctx, s) {
  dimOverlay(ctx, 0.72);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('VOIDHEART DESTROYED', cx, 180);
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Wave 10 is yours. The arena is quiet — for now.', cx, 220);
  drawStats(ctx, s, 280);
  for (const b of screenButtons(SCREEN_WIN, s)) drawButton(ctx, b, b.label, b.id === 'continue');
}

// Main entry: paint the world, then the overlay for the current screen.
export function drawGame(ctx, world, screen, best) {
  const s = world.state;
  ctx.save();
  if (s.shake > 0) {
    const mag = Math.min(10, s.shake);
    ctx.translate(Math.sin(s.time * 127.1) * mag, Math.cos(s.time * 311.7) * mag);
  }
  drawBackground(ctx, s.time);
  drawEntities(ctx, s, s.time);
  if (screen === SCREEN_PLAY || screen === SCREEN_LEVELUP || screen === SCREEN_PAUSE) {
    drawHud(ctx, s);
  }
  ctx.restore();
  if (screen === SCREEN_TITLE) drawTitle(ctx, best);
  else if (screen === SCREEN_LEVELUP) drawLevelUp(ctx, s);
  else if (screen === SCREEN_PAUSE) drawPause(ctx);
  else if (screen === SCREEN_OVER) drawOver(ctx, s);
  else if (screen === SCREEN_WIN) drawWin(ctx, s);
}
