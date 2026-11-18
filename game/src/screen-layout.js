import { FIELD, COLORS } from './config.js';
import { RIGS } from './rigs.js';
import { workshopButtons } from './workshop.js';
import { ZONES, isZoneUnlocked } from './zones.js';

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
    tuning: { owned: [], fitted: null },
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
    rig: save.rig || 'survey',
    tuning: save.tuning || { owned: [], fitted: null },
    relayRank: save.relayRank || 0,
    league: save.league || {},
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

export function glowCircle(ctx, x, y, r, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function dimOverlay(ctx, alpha) {
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
    if (state?.workshop) return workshopButtons();
    const sv = normalizeSave(save);
    const cards = ZONES.map((zone, i) => ({
      id: `zone-${zone.id}`,
      x: 160 + i * 330, y: 350, w: 300, h: 185,
      label: zone.name,
      locked: !isZoneUnlocked(zone.id, sv),
      key: String(i + 1),
    }));
    const rigs = RIGS.map((rig, index) => ({
      ...rig, id: 'rig-' + rig.id, x: 160 + index * 330, y: 680, w: 300, h: 68,
      locked: sv.cores < rig.cores, selected: (sv.rig || 'survey') === rig.id,
    }));
    return [...cards, ...rigs, { id: 'workshop', x: 770, y: 631, w: 350, h: 41 }, {
      id: 'start', x: cx - 130, y: 566, w: 260, h: 56, label: 'START RUN',
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
    return [
      { id: 'restart', x: cx - 280, y: 560, w: 260, h: 56, label: 'RETRY  (R)' },
      { id: 'map', x: cx + 20, y: 560, w: 260, h: 56, label: 'ZONE MAP  (Z)' },
    ];
  }
  if (screen === SCREEN_WIN) {
    return [
      { id: 'continue', x: cx - 280, y: 624, w: 260, h: 56, label: 'CONTINUE ENDLESS' },
      { id: 'restart', x: cx + 20, y: 624, w: 260, h: 56, label: 'PLAY AGAIN  (R)' },
      { id: 'map', x: cx - 130, y: 698, w: 260, h: 50, label: 'ZONE MAP  (Z)' },
    ];
  }
  return [];
}
