import { PLAYER } from './config.js';
import { PULSE_COST } from './counterpulse.js';
import { createEnemy, createBullet, createGem } from './entities.js';

export function fireBullets(world) {
  const s = world.state;
  const p = s.player;
  const aim = s.aim || { x: p.x, y: p.y - 100 };
  const base = Math.atan2(aim.y - p.y, aim.x - p.x);
  const n = p.projectiles;
  const spread = 0.13;
  for (let i = 0; i < n; i += 1) {
    const offset = (i - (n - 1) / 2) * spread;
    const crit = world.rng.chance(p.critChance);
    const dmg = Math.round(p.bulletDamage * (crit ? PLAYER.critMult : 1));
    s.bullets.push(createBullet(
      p.x + Math.cos(base + offset) * (p.radius + 6),
      p.y + Math.sin(base + offset) * (p.radius + 6),
      base + offset, p.bulletSpeed, dmg, p.pierce, crit, true,
    ));
  }
  s.stats.shotsFired += n;
  s.sfx.push('shoot');
  // Muzzle flash: a couple of short-lived sparks at the nose so the
  // firing reads in a still frame even when the round itself is gone.
  world.burst(
    p.x + Math.cos(base) * (p.radius + 10),
    p.y + Math.sin(base) * (p.radius + 10),
    '#8ef6ff', 2, 130, 0.22,
  );
}

export function damageEnemy(world, enemy, dmg, crit) {
  const s = world.state;
  enemy.hp -= dmg;
  enemy.flash = 0.09;
  world.addText(enemy.x, enemy.y - enemy.radius - 6, String(dmg), crit ? '#ffd23f' : '#dfe8ff');
  world.burst(enemy.x, enemy.y, enemy.color, 4, 140, 0.3);
  if (enemy.hp <= 0) killEnemy(world, enemy);
  else s.sfx.push('enemyHit');
}

export function killEnemy(world, enemy) {
  const s = world.state;
  enemy.dead = true;
  s.kills += 1;
  s.pulseCharge = Math.min(PULSE_COST, s.pulseCharge + 1);
  // Kill streaks: a kill within 2.5s of the last one extends the combo.
  if (s.time - s.lastKillTime < 2.5) s.combo += 1;
  else s.combo = 1;
  s.lastKillTime = s.time;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  s.score += enemy.score + s.combo;
  world.burst(enemy.x, enemy.y, enemy.color, enemy.boss ? 60 : 30, 260, 0.8);
  s.sfx.push('enemyDeath');
  // Gems: one gem per tier value, elites and the boss drop bonus gems.
  // Tougher (xp >= 5) enemies scatter a second small gem, so the field
  // keeps more pickups lying around between kills.
  const gemValue = enemy.xp >= 20 ? 20 : enemy.xp >= 5 ? 5 : 1;
  s.gems.push(createGem(enemy.x, enemy.y, gemValue, world.rng));
  if (enemy.xp >= 5 && !enemy.elite && !enemy.boss) {
    s.gems.push(createGem(enemy.x + 18, enemy.y + 10, 1, world.rng));
  }
  if (enemy.elite && !enemy.boss) {
    s.gems.push(createGem(enemy.x + 14, enemy.y, 20, world.rng));
    world.addText(enemy.x, enemy.y - 30, 'ELITE +20', '#ffd23f');
  }
  // Elites and the boss salvage a core: the run's collectible.
  if (enemy.elite || enemy.boss) {
    s.stats.coresCollected += 1;
    world.addText(enemy.x, enemy.y - 52, 'CORE +1', '#ffd23f');
    world.burst(enemy.x, enemy.y, '#ffd23f', 10, 200, 0.5);
  }
  if (enemy.kind === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      s.enemies.push(createEnemy(
        'mini', enemy.x + world.rng.range(-16, 16), enemy.y + world.rng.range(-16, 16),
        s.wave, false, world.rng,
      ));
    }
  }
  if (enemy.boss) {
    s.bossActive = false;
    s.bossDefeated = true;
    if (s.relay?.rank === 2 && s.relay.node === 1) s.relay.bossAfterLink = true;
    s.shake = 22;
    for (let i = 0; i < 3; i += 1) {
      s.gems.push(createGem(enemy.x + world.rng.range(-50, 50), enemy.y + world.rng.range(-50, 50), 20, world.rng));
    }
    s.sfx.push('bossDeath');
    if (s.wave % 10 === 0) {
      s.phase = 'win';
      s.sfx.push('victory');
    }
  }
}

export function hurtPlayer(world, dmg, fromX, fromY) {
  const s = world.state;
  const p = s.player;
  if (p.iframes > 0 || !p.alive) return;
  p.hp -= dmg;
  p.iframes = PLAYER.invulnTime;
  p.flash = 0.15;
  s.shake = Math.max(s.shake, 11);
  const dx = p.x - fromX;
  const dy = p.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  p.x += (dx / len) * 18;
  p.y += (dy / len) * 18;
  world.burst(p.x, p.y, '#ff4d6d', 10, 220, 0.5);
  s.sfx.push('playerHurt');
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    s.phase = 'over';
    s.shake = 18;
    world.burst(p.x, p.y, '#39e6ff', 46, 320, 0.9);
    s.sfx.push('defeat');
  }
}
