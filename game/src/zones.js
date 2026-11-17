// Themed zones: one palette per wave, cycling drift -> ember -> violet.
// All art stays code-drawn; these are just colors the renderer paints with.
export const ZONES = [
  { id: 'drift',  name: 'CYAN DRIFT',  bg: '#05060f', grid: '#141a33', gridBright: '#1d2547', accent: '#39e6ff',
    nebulae: [ {x:260,y:180,r:260,color:'rgba(57,230,255,0.09)'}, {x:1020,y:620,r:300,color:'rgba(57,230,255,0.06)'}, {x:900,y:150,r:220,color:'rgba(125,255,176,0.07)'} ] },
  { id: 'ember',  name: 'EMBER REEF',  bg: '#0f0605', grid: '#33161a', gridBright: '#471d22', accent: '#ff7a3d',
    nebulae: [ {x:300,y:200,r:280,color:'rgba(255,122,61,0.09)'}, {x:1000,y:600,r:300,color:'rgba(255,93,93,0.07)'}, {x:850,y:140,r:220,color:'rgba(255,210,63,0.07)'} ] },
  { id: 'violet', name: 'VIOLET DEEP', bg: '#0a0512', grid: '#221640', gridBright: '#2e1e55', accent: '#b06bff',
    nebulae: [ {x:280,y:170,r:270,color:'rgba(176,107,255,0.09)'}, {x:1010,y:630,r:300,color:'rgba(255,61,240,0.07)'}, {x:880,y:160,r:220,color:'rgba(57,230,255,0.06)'} ] },
];

export function zoneForWave(wave, offset = 0) {
  return ZONES[((wave - 1 + offset) % ZONES.length + ZONES.length) % ZONES.length];
}

// Index of a zone id in ZONES; unknown ids fall back to drift (offset 0).
export function zoneIndex(zoneId) {
  const i = ZONES.findIndex((z) => z.id === zoneId);
  return i >= 0 ? i : 0;
}

// Unlock rule: a zone is cleared when the player survives its wave, i.e.
// reaches the next wave. CYAN DRIFT is always open; EMBER REEF opens once
// any run reached wave 2 (survived drift's wave 1); VIOLET DEEP opens once
// any run reached wave 3 (survived ember's wave 2). `save.maxWave` is the
// highest wave reached in any run. No unlocks are ever seeded.
export function isZoneUnlocked(zoneId, save) {
  const maxWave = (save && save.maxWave) || 0;
  if (zoneId === 'drift') return true;
  if (zoneId === 'ember') return maxWave >= 2;
  if (zoneId === 'violet') return maxWave >= 3;
  return false;
}

export function unlockRequirement(zoneId) {
  if (zoneId === 'ember') return 'Clear CYAN DRIFT to unlock';
  if (zoneId === 'violet') return 'Clear EMBER REEF to unlock';
  return '';
}
