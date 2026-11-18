import { FIELD, BOSS } from './config.js';
import { createBullet } from './entities.js';
import { spawnBossMinions } from './waves.js';
import { damageEnemy, hurtPlayer } from './combat.js';

const TWO_PI = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function updateEnemies(world, dt) {
  const s = world.state;
  const p = s.player;
  for (const e of s.enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.touchTimer > 0) e.touchTimer -= dt;
    if (e.orbTimer > 0) e.orbTimer -= dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    e.angle = Math.atan2(dy, dx);

    if (e.boss) {
      e.pulse += dt;
      // Drift toward the player, slow and menacing.
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
      const enraged = e.hp < e.maxHp * 0.5;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        const count = enraged ? BOSS.burstCount + 6 : BOSS.burstCount;
        const base = world.rng.range(0, TWO_PI);
        for (let i = 0; i < count; i += 1) {
          const a = base + (i / count) * TWO_PI;
          s.enemyBullets.push(createBullet(e.x, e.y, a, 205, 12, 0, false, false));
        }
        e.shootTimer = enraged ? BOSS.burstInterval * 0.65 : BOSS.burstInterval;
        s.sfx.push('bossRoar');
      }
      e.summonTimer -= dt;
      if (e.summonTimer <= 0) {
        spawnBossMinions(world, BOSS.summonCount);
        e.summonTimer = BOSS.summonInterval;
      }
    } else if (e.kind === 'darter') {
      e.lungeTimer -= dt;
      if (e.lunging > 0) {
        e.lunging -= dt;
        e.x += e.lungeX * e.speed * 2.6 * dt;
        e.y += e.lungeY * e.speed * 2.6 * dt;
      } else if (e.lungeTimer <= 0 && d < 320) {
        e.lunging = 0.32;
        e.lungeX = nx;
        e.lungeY = ny;
        e.lungeTimer = world.rng.range(1.6, 2.6);
      } else {
        e.x += nx * e.speed * dt;
        e.y += ny * e.speed * dt;
      }
    } else if (e.kind === 'shooter') {
      // Keep a firing distance: close in when far, back off when near.
      const want = 260;
      const dir = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
      e.wobble += dt * 1.4;
      e.x += (nx * dir + Math.cos(e.wobble) * 0.45) * e.speed * dt;
      e.y += (ny * dir + Math.sin(e.wobble) * 0.45) * e.speed * dt;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < 520) {
        const a = Math.atan2(dy, dx) + world.rng.range(-0.08, 0.08);
        s.enemyBullets.push(createBullet(e.x, e.y, a, 240, e.damage, 0, false, false));
        e.shootTimer = world.rng.range(1.8, 2.6);
      }
    } else {
      // Chaser, tank, splitter, mini: straight pursuit.
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
    }

    // Orbital blades chew through anything they touch.
    if (p.orbitals > 0 && e.orbTimer <= 0) {
      for (let i = 0; i < p.orbitals; i += 1) {
        const a = p.orbitalAngle + (i / p.orbitals) * TWO_PI;
        const ox = p.x + Math.cos(a) * 92;
        const oy = p.y + Math.sin(a) * 92;
        if (dist2(ox, oy, e.x, e.y) < (14 + e.radius) * (14 + e.radius)) {
          e.orbTimer = 0.4;
          damageEnemy(world, e, Math.round(p.bulletDamage * 0.8), false);
          break;
        }
      }
    }

    // Contact damage, rate-limited per enemy.
    const rr = e.radius + p.radius;
    if (dist2(e.x, e.y, p.x, p.y) < rr * rr && e.touchTimer <= 0) {
      e.touchTimer = 0.85;
      hurtPlayer(world, e.damage, e.x, e.y);
      if (s.phase !== 'play') return;
    }
  }
}

export function updateBullets(world, dt) {
  const s = world.state;
  const p = s.player;
  for (const b of s.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (b.hitSet.has(e)) continue;
      const rr = b.radius + e.radius;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        b.hitSet.add(e);
        damageEnemy(world, e, b.damage, b.crit);
        if (b.pierce > 0) b.pierce -= 1;
        else { b.life = 0; break; }
      }
    }
  }
  s.bullets = s.bullets.filter((b) => b.life > 0
    && b.x > -20 && b.x < FIELD.width + 20 && b.y > -20 && b.y < FIELD.height + 20);

  for (const b of s.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const rr = b.radius + p.radius;
    if (p.alive && dist2(b.x, b.y, p.x, p.y) < rr * rr) {
      b.life = 0;
      hurtPlayer(world, b.damage, b.x - b.vx * 0.05, b.y - b.vy * 0.05);
      if (s.phase !== 'play') return;
    }
  }
  s.enemyBullets = s.enemyBullets.filter((b) => b.life > 0
    && b.x > -100 && b.x < FIELD.width + 100 && b.y > -100 && b.y < FIELD.height + 100);
}
