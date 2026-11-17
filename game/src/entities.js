// Entity factories and the enemy type table. Entities are plain objects;
// the world owns the arrays and the update rules, this file only builds them.
import { ENEMY_TYPES, GEM_TIERS, PLAYER, BOSS } from './config.js';

export { ENEMY_TYPES };

export function createPlayer() {
  return {
    x: 640, y: 400, radius: PLAYER.radius,
    vx: 0, vy: 0, angle: -Math.PI / 2,
    hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
    speed: PLAYER.speed, fireInterval: PLAYER.fireInterval,
    fireTimer: 0, bulletDamage: PLAYER.bulletDamage,
    bulletSpeed: PLAYER.bulletSpeed, magnetRadius: PLAYER.magnetRadius,
    regen: PLAYER.regen, critChance: PLAYER.critChance,
    projectiles: PLAYER.projectiles, pierce: PLAYER.pierce,
    orbitals: PLAYER.orbitals, orbitalAngle: 0,
    iframes: 0, alive: true, flash: 0,
  };
}

export function createEnemy(type, x, y, wave, elite, rng) {
  const def = ENEMY_TYPES[type];
  const hpMult = 1 + (wave - 1) * 0.22;
  const speedMult = Math.min(1 + (wave - 1) * 0.03, 1.45);
  const dmgMult = 1 + (wave - 1) * 0.08;
  const hp = Math.round(def.hp * hpMult * (elite ? 6 : 1));
  return {
    kind: type, x, y, radius: def.radius * (elite ? 1.5 : 1),
    hp, maxHp: hp,
    speed: def.speed * speedMult * rng.range(0.9, 1.1),
    damage: Math.round(def.damage * dmgMult * (elite ? 1.5 : 1)),
    xp: def.xp, score: def.score * (elite ? 5 : 1),
    color: def.color, shape: def.shape,
    elite, boss: false,
    angle: 0, touchTimer: 0, orbTimer: 0, flash: 0,
    // Darter lunge state.
    lungeTimer: rng.range(1.2, 2.4), lunging: 0, lungeX: 0, lungeY: 0,
    // Shooter fire state.
    shootTimer: rng.range(1.2, 2.2),
    wobble: rng.range(0, Math.PI * 2),
  };
}

export function createBoss(x, y, wave) {
  const hp = Math.round(BOSS.hp * (1 + (wave - 10) * 0.35));
  return {
    kind: 'boss', x, y, radius: BOSS.radius,
    hp, maxHp: hp, speed: BOSS.speed,
    damage: BOSS.damage, xp: 20, score: BOSS.score,
    color: '#ff3df0', shape: 'core',
    elite: true, boss: true,
    angle: 0, touchTimer: 0, orbTimer: 0, flash: 0,
    lungeTimer: 0, lunging: 0, lungeX: 0, lungeY: 0,
    shootTimer: BOSS.burstInterval, summonTimer: BOSS.summonInterval,
    wobble: 0, pulse: 0,
  };
}

export function createBullet(x, y, angle, speed, damage, pierce, crit, friendly) {
  return {
    x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    radius: friendly ? PLAYER.bulletRadius : 9, damage, pierce, crit,
    friendly, life: friendly ? 1.6 : 5, hitSet: friendly ? new Set() : null,
  };
}

export function createGem(x, y, value, rng) {
  const tier = value >= 20 ? GEM_TIERS[2] : value >= 5 ? GEM_TIERS[1] : GEM_TIERS[0];
  return {
    x, y, value: tier.value, radius: tier.radius, color: tier.color,
    vx: rng.range(-90, 90), vy: rng.range(-90, 90),
    magnet: false, bob: rng.range(0, Math.PI * 2),
  };
}

export function createParticle(x, y, color, count, speed, life, rng) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rng.range(0, Math.PI * 2);
    const sp = rng.range(speed * 0.3, speed);
    out.push({
      x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
      radius: rng.range(1.5, 3.5), color,
      life: rng.range(life * 0.5, life), maxLife: life,
    });
  }
  return out;
}

export function createFloatingText(x, y, text, color) {
  return { x, y, text, color, life: 1.1, maxLife: 1.1 };
}
