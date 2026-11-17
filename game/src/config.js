// VOIDPULSE tuning constants. Every number the game balances on lives here,
// so the rest of the code reads like rules instead of magic numbers.
export const FIELD = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const MAX_PARTICLES = 800;
export const MAX_TEXTS = 64;

export const COLORS = {
  bg: '#05060f',
  grid: '#141a33',
  gridBright: '#1d2547',
  player: '#39e6ff',
  playerCore: '#e8fbff',
  bullet: '#8ef6ff',
  enemyBullet: '#ff5d8f',
  gemSmall: '#7dffb0',
  gemMid: '#39e6ff',
  gemBig: '#ffd23f',
  hp: '#ff4d6d',
  hpBack: '#2a1020',
  xp: '#39e6ff',
  xpBack: '#10202a',
  text: '#dfe8ff',
  dim: '#8a94b8',
  gold: '#ffd23f',
  boss: '#ff3df0',
};

export const PLAYER = {
  radius: 16,
  maxHp: 100,
  speed: 265,
  fireInterval: 0.34,
  bulletSpeed: 640,
  bulletDamage: 12,
  bulletRadius: 10,
  magnetRadius: 75,
  regen: 0,
  critChance: 0.05,
  critMult: 2,
  projectiles: 1,
  pierce: 0,
  orbitals: 0,
  invulnTime: 0.6,
};

// Enemy type table. `unlockWave` is the first wave the type can appear in.
export const ENEMY_TYPES = {
  chaser: {
    name: 'Chaser', radius: 16, hp: 22, speed: 95, damage: 10, xp: 1,
    score: 10, color: '#ff5d5d', unlockWave: 1, shape: 'diamond',
  },
  darter: {
    name: 'Darter', radius: 12, hp: 12, speed: 150, damage: 8, xp: 1,
    score: 15, color: '#ffb02e', unlockWave: 2, shape: 'arrow',
  },
  tank: {
    name: 'Tank', radius: 26, hp: 90, speed: 48, damage: 18, xp: 5,
    score: 25, color: '#b06bff', unlockWave: 3, shape: 'hex',
  },
  shooter: {
    name: 'Shooter', radius: 15, hp: 26, speed: 80, damage: 8, xp: 5,
    score: 25, color: '#ff5da2', unlockWave: 4, shape: 'square',
  },
  splitter: {
    name: 'Splitter', radius: 20, hp: 40, speed: 75, damage: 12, xp: 5,
    score: 30, color: '#7dffb0', unlockWave: 5, shape: 'blob',
  },
  mini: {
    name: 'Mini', radius: 9, hp: 8, speed: 130, damage: 6, xp: 1,
    score: 5, color: '#9dff6e', unlockWave: 1, shape: 'diamond',
  },
};

// Gem tiers dropped by enemies: value -> radius and color.
export const GEM_TIERS = [
  { value: 1, radius: 6, color: COLORS.gemSmall },
  { value: 5, radius: 8, color: COLORS.gemMid },
  { value: 20, radius: 11, color: COLORS.gemBig },
];

export const BOSS = {
  name: 'VOIDHEART',
  radius: 72,
  hp: 2600,
  speed: 42,
  damage: 25,
  score: 1000,
  burstInterval: 3.0,
  burstCount: 14,
  summonInterval: 6.5,
  summonCount: 3,
};

export function waveEnemyCount(wave) {
  return 14 + wave * 6;
}

export function waveHpMult(wave) {
  return 1 + (wave - 1) * 0.22;
}

export function waveSpeedMult(wave) {
  return Math.min(1 + (wave - 1) * 0.03, 1.45);
}

export function waveDamageMult(wave) {
  return 1 + (wave - 1) * 0.08;
}

export function xpForLevel(level) {
  return 10 + (level - 1) * 8;
}

export function waveClearBonus(wave) {
  return 50 * wave;
}
