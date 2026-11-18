// VOIDPULSE persistence: best scores, per-zone bests, totals and cores,
// kept in localStorage under 'voidpulse_save_v2'. Every storage access is
// guarded in try/catch, so the game still runs when storage is unavailable
// (private mode, file://, or a blocked origin). The v1 key
// 'voidpulse_best' (a plain number) is migrated into best on first load.
import { availableRig } from './rigs.js';
import { cleanTuning } from './tuning.js';
import { bankLeague } from './pilot-league.js';
import { ORDERS, relayComplete } from './relay.js';
const SAVE_KEY = 'voidpulse_save_v2';
const LEGACY_KEY = 'voidpulse_best';

export function defaultSave() {
  return {
    best: 0,
    bestByZone: { drift: 0, ember: 0, violet: 0 },
    bestTime: 0,
    runs: 0,
    kills: 0,
    cores: 0,
    // Highest wave reached in any run; drives zone unlocks (see zones.js).
    maxWave: 0,
    // Last zone the player picked on the title map; START RUN reuses it.
    lastZone: 'drift',
    rig: 'survey',
    tuning: cleanTuning(null, 0),
    relayRank: 0,
    league: { you: 0, rook: 0, vale: 0 },
  };
}

export function loadSave() {
  const save = defaultSave();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (Number.isFinite(parsed.best) && parsed.best > 0) save.best = parsed.best;
        if (parsed.bestByZone && typeof parsed.bestByZone === 'object') {
          for (const zoneId of Object.keys(save.bestByZone)) {
            const v = parsed.bestByZone[zoneId];
            if (Number.isFinite(v) && v > 0) save.bestByZone[zoneId] = v;
          }
        }
        if (Number.isFinite(parsed.bestTime) && parsed.bestTime > 0) save.bestTime = parsed.bestTime;
        if (Number.isFinite(parsed.runs) && parsed.runs > 0) save.runs = parsed.runs;
        if (Number.isFinite(parsed.kills) && parsed.kills > 0) save.kills = parsed.kills;
        if (Number.isFinite(parsed.cores) && parsed.cores > 0) save.cores = parsed.cores;
        if (Number.isFinite(parsed.maxWave) && parsed.maxWave > 0) save.maxWave = parsed.maxWave;
        if (typeof parsed.lastZone === 'string'
          && ['drift', 'ember', 'violet'].includes(parsed.lastZone)) {
          save.lastZone = parsed.lastZone;
        }
        save.rig = availableRig(parsed.rig, save.cores).id;
        save.tuning = cleanTuning(parsed.tuning, save.cores);
        for (const id of Object.keys(save.league)) {
          const points = parsed.league?.[id];
          if (Number.isSafeInteger(points) && points > 0) save.league[id] = points;
        }
        if (Number.isInteger(parsed.relayRank)) save.relayRank = Math.min(ORDERS.length, Math.max(0, parsed.relayRank));
        return save;
      }
    }
    // No v2 save yet: migrate the v1 best score if one exists.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    const n = legacy === null ? 0 : parseInt(legacy, 10);
    if (Number.isFinite(n) && n > 0) save.best = n;
  } catch (err) { /* storage unavailable or corrupt: keep defaults */ }
  return save;
}

function persist(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (err) { /* storage unavailable: the run still counts in memory */ }
}

// Persist an in-memory save change outside of recordRun (e.g. remembering
// the last-picked zone). Same try/catch guard as persist().
export function persistSave(save) {
  persist(save);
}

// Record a finished run. outcome is 'over' | 'win'. Updates the overall
// best, the best for every zone visited this run, the fastest wave-10 clear
// (only on a win), the lifetime totals, the highest wave reached (which
// drives zone unlocks), and stamps the run result onto the
// state for the end screen. Returns { save, newBest, newZoneBest }.
export function recordRun(save, state, outcome) {
  let newBest = false;
  let newZoneBest = false;
  if (state.score > save.best) {
    save.best = state.score;
    newBest = true;
  }
  for (const zoneId of state.zonesVisited || []) {
    if (zoneId in save.bestByZone && state.score > save.bestByZone[zoneId]) {
      save.bestByZone[zoneId] = state.score;
      newZoneBest = true;
    }
  }
  if (outcome === 'win' && state.time > 0
    && (save.bestTime === 0 || state.time < save.bestTime)) {
    save.bestTime = state.time;
  }
  if (state.wave > save.maxWave) save.maxWave = state.wave;
  const previous = state.runResult;
  bankLeague(save, state);
  const kills = state.kills || 0;
  const cores = state.stats?.coresCollected || 0;
  if (!previous) save.runs += 1;
  save.kills += kills - (previous?.kills || 0);
  save.cores += cores - (previous?.cores || 0);
  if (relayComplete(state) && state.relay.rank === save.relayRank) {
    save.cores += ORDERS[save.relayRank].reward;
    save.relayRank++;
  }
  state.runResult = { newBest, newZoneBest, kills, cores };
  return { save, newBest, newZoneBest };
}
