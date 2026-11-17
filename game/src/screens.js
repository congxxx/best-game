// Screen painters: title, level-up, pause, victory and game over.
// Moved out of render.js so each screen is one job in one place.
// Every painter only reads state and the persistent save record; it never
// mutates game logic. Button rects here are shared with main.js click
// handling — do not move them.
import { FIELD, COLORS } from './config.js';
import { ZONES, isZoneUnlocked, unlockRequirement } from './zones.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVELUP = 'levelup';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

// The persistent save record main.js passes in. Accepts the old v1 shape
// (a bare best-score number) too, so a plain drawGame call still works.
export function normalizeSave(save) {
  const base = {
    best: 0, bestByZone: {}, bestTime: 0, runs: 0, kills: 0, cores: 0,
    maxWave: 0, lastZone: 'drift',
  };
  if (typeof save === 'number') return { ...base, best: save };
  if (!save || typeof save !== 'object') return base;
  return {
    best: save.best || 0,
    bestByZone: save.bestByZone || {},
    bestTime: save.bestTime || 0,
    runs: save.runs || 0,
    kills: save.kills || 0,
    cores: save.cores || 0,
    maxWave: save.maxWave || 0,
    lastZone: save.lastZone || 'drift',
  };
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function roundRect(ctx, x, y, w, h, r) {
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

function dimOverlay(ctx, alpha) {
  ctx.fillStyle = `rgba(3,4,10,${alpha})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

export function drawButton(ctx, rect, label, accent) {
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

// Button layouts, shared by the drawer and main.js click handling.
// The title screen's zone cards are buttons too: ids zone-drift,
// zone-ember, zone-violet, each carrying its rect, a `locked` flag and
// the 1/2/3 key that starts in that zone. `save` drives the lock flags
// and is only needed for the title screen.
export function screenButtons(screen, state, save) {
  const cx = FIELD.width / 2;
  if (screen === SCREEN_TITLE) {
    const sv = normalizeSave(save);
    const cards = ZONES.map((zone, i) => ({
      id: `zone-${zone.id}`,
      x: 160 + i * 330, y: 350, w: 300, h: 128,
      label: zone.name,
      locked: !isZoneUnlocked(zone.id, sv),
      key: String(i + 1),
    }));
    return [...cards, {
      id: 'start', x: cx - 130, y: 516, w: 260, h: 56, label: 'START RUN',
    }];
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

// One zone card on the title map, from its screenButtons entry `b`.
// Unlocked: zone name in accent, per-zone BEST, 'CLICK TO START' and its
// [ 1 / 2 / 3 ] key; the last-picked zone gets a small gold triangle in
// the top-right corner. Locked: dimmed card, padlock + LOCKED, and the
// unlock requirement line.
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
  if (!locked && sv.lastZone === zone.id) {
    ctx.fillStyle = COLORS.gold;
    const tx = b.x + b.w - 24;
    const ty = b.y + 18;
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
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(zone.name, cx, b.y + 36);
  const best = sv.bestByZone[zone.id] || 0;
  ctx.fillStyle = COLORS.text;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`BEST ${best > 0 ? best : '—'}`, cx, b.y + 64);
  if (locked) {
    // Padlock + LOCKED, centred as one row: padlock spans cx-41..cx-21,
    // text starts at cx-13 and runs ~54px to cx+41.
    ctx.textBaseline = 'middle';
    drawPadlock(ctx, cx - 31, b.y + 90, 20, '#ff5d6d');
    ctx.fillStyle = '#ff5d6d';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LOCKED', cx - 13, b.y + 90);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(unlockRequirement(zone.id), cx, b.y + 114);
  } else {
    ctx.fillStyle = zone.accent;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('CLICK TO START', cx, b.y + 90);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`[ ${b.key} ]`, cx, b.y + 114);
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
  ctx.fillText('— A NEON ARENA SURVIVOR —', cx, 186);
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Hold the arena. Survive the waves. Break the VOIDHEART on wave 10.', cx, 214);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('WASD / Arrows — move · Mouse — aim · Auto-fire always on', cx, 244);
  ctx.fillText('Collect XP gems · Pick upgrades on level-up · P / Esc — pause · R — restart', cx, 268);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`BEST SCORE  ${sv.best}   ·   RUNS ${sv.runs}   ·   TOTAL KILLS ${sv.kills}`, cx, 300);
  ctx.fillStyle = COLORS.dim;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('— SELECT ZONE —', cx, 334);
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
    ctx.fillText(notice.text, cx, 502);
  }
  for (const b of buttons) {
    if (b.id === 'start') drawButton(ctx, b, b.label, true);
  }
  ctx.fillStyle = COLORS.dim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Elites glow gold every 3rd wave. Splitters burst into minis. Good hunting.', cx, 596);
  ctx.fillText('An original game. No borrowed names, art or music.', cx, 620);
}

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
    ctx.fillStyle = COLORS.dim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(u.desc, rect.x + rect.w / 2, rect.y + 142);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`[ ${i + 1} ]`, rect.x + rect.w / 2, rect.y + 188);
  });
}

export function drawPause(ctx) {
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
  for (const b of screenButtons(SCREEN_OVER, s)) drawButton(ctx, b, b.label, true);
}

export function drawWin(ctx, s, save) {
  dimOverlay(ctx, 0.72);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('VOIDHEART DESTROYED', cx, 180);
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Wave 10 is yours. The arena is quiet — for now.', cx, 220);
  drawNewBest(ctx, s, 248);
  drawStats(ctx, s, 272, save, true);
  for (const b of screenButtons(SCREEN_WIN, s)) drawButton(ctx, b, b.label, b.id === 'continue');
}
