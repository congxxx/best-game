// The upgrade pool: ten stackable upgrades, each with a cap where noted.
// rollUpgrades picks three distinct, still-available choices; applyUpgrade
// mutates the player's stats and the world's counters.
import { shuffle } from './random.js';

export const UPGRADE_POOL = [
  {
    id: 'damage', cat: 'WEAPON', name: 'Pulse Rounds', max: 99,
    desc: 'Bullet damage +25%',
    icon: 'DMG',
    glyph: 'bolt',
    apply(p) { p.bulletDamage *= 1.25; },
  },
  {
    id: 'firerate', cat: 'WEAPON', name: 'Rapid Coil', max: 99,
    desc: 'Fire rate +20%',
    icon: 'SPD',
    glyph: 'star',
    apply(p) { p.fireInterval *= 0.8333; },
  },
  {
    id: 'movespeed', cat: 'DEFENSE', name: 'Ion Thrusters', max: 99,
    desc: 'Move speed +12%',
    icon: 'MOV',
    glyph: 'arrow',
    apply(p) { p.speed *= 1.12; },
  },
  {
    id: 'maxhp', cat: 'DEFENSE', name: 'Hull Plating', max: 99,
    desc: 'Max HP +25 and heal 25',
    icon: 'HP',
    glyph: 'cross',
    apply(p) { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'projectiles', cat: 'WEAPON', name: 'Split Shot', max: 3,
    desc: '+1 projectile per volley',
    icon: '+1',
    glyph: 'split',
    apply(p) { p.projectiles += 1; },
  },
  {
    id: 'pierce', cat: 'WEAPON', name: 'Lance Rounds', max: 3,
    desc: 'Bullets pierce +1 enemy',
    icon: 'PIR',
    glyph: 'diamond',
    apply(p) { p.pierce += 1; },
  },
  {
    id: 'magnet', cat: 'UTILITY', name: 'Tractor Field', max: 99,
    desc: 'Magnet radius +60%',
    icon: 'MAG',
    glyph: 'ring',
    apply(p) { p.magnetRadius *= 1.6; },
  },
  {
    id: 'regen', cat: 'DEFENSE', name: 'Nano Weave', max: 99,
    desc: 'Regenerate +0.8 HP/s',
    icon: 'REG',
    glyph: 'plus',
    apply(p) { p.regen += 0.8; },
  },
  {
    id: 'orbitals', cat: 'WEAPON', name: 'Orbital Blades', max: 3,
    desc: '+1 orbiting blade',
    icon: 'ORB',
    glyph: 'orbit',
    apply(p) { p.orbitals += 1; },
  },
  {
    id: 'crit', cat: 'WEAPON', name: 'Weak-Point Scan', max: 5,
    desc: 'Crit chance +10%',
    icon: 'CRT',
    glyph: 'eye',
    apply(p) { p.critChance += 0.10; },
  },
];

// How many times the player already holds each upgrade id.
export function upgradeCounts(state) {
  const counts = {};
  for (const id of state.upgradesTaken) counts[id] = (counts[id] || 0) + 1;
  return counts;
}

// Three distinct upgrades the player can still take.
export function rollUpgrades(rng, state) {
  const counts = upgradeCounts(state);
  const available = UPGRADE_POOL.filter((u) => (counts[u.id] || 0) < u.max);
  const picked = shuffle(rng, available).slice(0, 3);
  return picked;
}

export function applyUpgrade(state, upgrade) {
  upgrade.apply(state.player);
  state.upgradesTaken.push(upgrade.id);
}
