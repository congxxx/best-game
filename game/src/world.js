// Game state and the fixed-step simulation: spawning, waves, movement,
// combat, collisions, XP/level-ups, the boss, win and lose. Deterministic:
// every random draw comes from the seeded RNG, never from Math.random or
// the wall clock. Sounds are reported as names in state.sfx for main.js
// to play, so simulation never touches audio.
import {
  FIELD, MAX_PARTICLES, MAX_TEXTS, PLAYER, BOSS,
  ENEMY_TYPES, waveEnemyCount,
  xpForLevel, waveClearBonus,
} from './config.js';
import { makeRng } from './random.js';
import { zoneForWave, zoneIndex } from './zones.js';
import {
  createPlayer, createEnemy, createBoss, createBullet, createGem,
  createParticle, createFloatingText,
} from './entities.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';

export const EVENT_NONE = 0;

const TWO_PI = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export class World {
  constructor(seed) {
    this.seed = seed || 1337;
    this.reset(this.seed);
  }

  reset(seed) {
    this.seed = seed || this.seed;
    this.rng = makeRng(this.seed);
    this.state = {
      phase: 'title', // title | play | levelup | paused | over | win
      player: createPlayer(),
      enemies: [],
      bullets: [],
      enemyBullets: [],
      gems: [],
      particles: [],
      texts: [],
      wave: 0,
      zone: zoneForWave(1),
      zoneName: zoneForWave(1).name,
      // Offset into the zone cycle for this run: 0 = start in CYAN DRIFT,
      // 1 = start in EMBER REEF, 2 = start in VIOLET DEEP. Wave numbering
      // stays 1..10; only the zone lookup is shifted.
      zoneOffset: 0,
      zonesVisited: [],
      // Brief notice shown under the title map (e.g. locked-zone message).
      titleNotice: null,
      combo: 0,
      bestCombo: 0,
      lastKillTime: 0,
      runResult: null,
      waveState: 'idle', // idle | spawning | fighting | clear
      spawnQueue: [],
      spawnTimer: 0,
      elitesSpawned: 0,
      bossActive: false,
      bossDefeated: false,
      bannerTimer: 0,
      bannerText: '',
      kills: 0,
      score: 0,
      time: 0,
      xp: 0,
      level: 1,
      xpNext: xpForLevel(1),
      pendingLevels: 0,
      choices: [],
      upgradesTaken: [],
      shake: 0,
      sfx: [],
      stats: { shotsFired: 0, gemsCollected: 0, coresCollected: 0 },
    };
  }

  // Start a run in the given zone ('drift' | 'ember' | 'violet'); no arg
  // starts in CYAN DRIFT. Wave numbering stays 1..10 — only the zone
  // cycle is offset, so a run starting in EMBER REEF plays
  // ember -> violet -> drift -> ember ...
  startRun(zoneId) {
    this.reset(this.seed);
    this.state.zoneOffset = zoneIndex(zoneId);
    this.state.phase = 'play';
    this.startWave(1);
  }

  // ---- waves ------------------------------------------------------------
  startWave(wave) {
    const s = this.state;
    s.wave = wave;
    s.zone = zoneForWave(wave, s.zoneOffset);
    s.zoneName = s.zone.name;
    if (!s.zonesVisited.includes(s.zone.id)) s.zonesVisited.push(s.zone.id);
    s.elitesSpawned = 0;
    s.bossActive = false;
    if (wave % 10 === 0) {
      const boss = createBoss(FIELD.width / 2, BOSS.radius + 20, wave);
      s.enemies.push(boss);
      s.bossActive = true;
      s.spawnQueue = ['chaser', 'chaser', 'darter', 'darter', 'shooter'];
      s.waveState = 'spawning';
      s.spawnTimer = 1.2;
      s.bannerText = `VOIDHEART AWAKENS — ${s.zoneName}`;
      s.bannerTimer = 2.0;
      s.sfx.push('bossRoar');
      return;
    }
    const count = waveEnemyCount(wave);
    const unlocked = Object.keys(ENEMY_TYPES).filter(
      (t) => t !== 'mini' && ENEMY_TYPES[t].unlockWave <= wave,
    );
    const queue = [];
    for (let i = 0; i < count; i += 1) {
      // Early waves lean on chasers; later waves mix the unlocked types.
      const pick = this.rng.chance(0.45) ? 'chaser' : this.rng.pick(unlocked);
      queue.push(pick);
    }
    s.spawnQueue = queue;
    s.waveState = 'spawning';
    s.spawnTimer = 0.6;
    s.bannerText = `WAVE ${wave} — ${s.zoneName}`;
    s.bannerTimer = 1.6;
  }

  spawnEnemy(type) {
    const s = this.state;
    const margin = 30;
    const edge = this.rng.int(0, 3);
    let x;
    let y;
    if (edge === 0) { x = this.rng.range(0, FIELD.width); y = -margin; }
    else if (edge === 1) { x = FIELD.width + margin; y = this.rng.range(0, FIELD.height); }
    else if (edge === 2) { x = this.rng.range(0, FIELD.width); y = FIELD.height + margin; }
    else { x = -margin; y = this.rng.range(0, FIELD.height); }
    let elite = false;
    if (s.wave % 3 === 0 && s.elitesSpawned < 2 && type !== 'mini') {
      elite = true;
      s.elitesSpawned += 1;
    }
    s.enemies.push(createEnemy(type, x, y, s.wave, elite, this.rng));
  }

  spawnBossMinions(count) {
    const s = this.state;
    const boss = s.enemies.find((e) => e.boss);
    if (!boss) return;
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng.range(0, TWO_PI);
      s.enemies.push(createEnemy(
        'mini', boss.x + Math.cos(angle) * 90, boss.y + Math.sin(angle) * 90,
        s.wave, false, this.rng,
      ));
    }
  }

  // ---- combat -----------------------------------------------------------
  fireBullets() {
    const s = this.state;
    const p = s.player;
    const aim = s.aim || { x: p.x, y: p.y - 100 };
    const base = Math.atan2(aim.y - p.y, aim.x - p.x);
    const n = p.projectiles;
    const spread = 0.13;
    for (let i = 0; i < n; i += 1) {
      const offset = (i - (n - 1) / 2) * spread;
      const crit = this.rng.chance(p.critChance);
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
    this.burst(
      p.x + Math.cos(base) * (p.radius + 10),
      p.y + Math.sin(base) * (p.radius + 10),
      '#8ef6ff', 2, 130, 0.22,
    );
  }

  damageEnemy(enemy, dmg, crit) {
    const s = this.state;
    enemy.hp -= dmg;
    enemy.flash = 0.09;
    this.addText(enemy.x, enemy.y - enemy.radius - 6, String(dmg), crit ? '#ffd23f' : '#dfe8ff');
    this.burst(enemy.x, enemy.y, enemy.color, 4, 140, 0.3);
    if (enemy.hp <= 0) this.killEnemy(enemy);
    else s.sfx.push('enemyHit');
  }

  killEnemy(enemy) {
    const s = this.state;
    enemy.dead = true;
    s.kills += 1;
    // Kill streaks: a kill within 2.5s of the last one extends the combo.
    if (s.time - s.lastKillTime < 2.5) s.combo += 1;
    else s.combo = 1;
    s.lastKillTime = s.time;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    s.score += enemy.score + s.combo;
    this.burst(enemy.x, enemy.y, enemy.color, enemy.boss ? 60 : 30, 260, 0.8);
    s.sfx.push('enemyDeath');
    // Gems: one gem per tier value, elites and the boss drop bonus gems.
    // Tougher (xp >= 5) enemies scatter a second small gem, so the field
    // keeps more pickups lying around between kills.
    const gemValue = enemy.xp >= 20 ? 20 : enemy.xp >= 5 ? 5 : 1;
    s.gems.push(createGem(enemy.x, enemy.y, gemValue, this.rng));
    if (enemy.xp >= 5 && !enemy.elite && !enemy.boss) {
      s.gems.push(createGem(enemy.x + 18, enemy.y + 10, 1, this.rng));
    }
    if (enemy.elite && !enemy.boss) {
      s.gems.push(createGem(enemy.x + 14, enemy.y, 20, this.rng));
      this.addText(enemy.x, enemy.y - 30, 'ELITE +20', '#ffd23f');
    }
    // Elites and the boss salvage a core: the run's collectible.
    if (enemy.elite || enemy.boss) {
      s.stats.coresCollected += 1;
      this.addText(enemy.x, enemy.y - 52, 'CORE +1', '#ffd23f');
      this.burst(enemy.x, enemy.y, '#ffd23f', 10, 200, 0.5);
    }
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 2; i += 1) {
        s.enemies.push(createEnemy(
          'mini', enemy.x + this.rng.range(-16, 16), enemy.y + this.rng.range(-16, 16),
          s.wave, false, this.rng,
        ));
      }
    }
    if (enemy.boss) {
      s.bossActive = false;
      s.bossDefeated = true;
      s.shake = 22;
      for (let i = 0; i < 3; i += 1) {
        s.gems.push(createGem(enemy.x + this.rng.range(-50, 50), enemy.y + this.rng.range(-50, 50), 20, this.rng));
      }
      s.sfx.push('bossDeath');
      if (s.wave % 10 === 0) {
        s.phase = 'win';
        s.sfx.push('victory');
      }
    }
  }

  hurtPlayer(dmg, fromX, fromY) {
    const s = this.state;
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
    this.burst(p.x, p.y, '#ff4d6d', 10, 220, 0.5);
    s.sfx.push('playerHurt');
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      s.phase = 'over';
      s.shake = 18;
      this.burst(p.x, p.y, '#39e6ff', 46, 320, 0.9);
      s.sfx.push('defeat');
    }
  }

  // ---- helpers ----------------------------------------------------------
  burst(x, y, color, count, speed, life) {
    const s = this.state;
    const parts = createParticle(x, y, color, count, speed, life, this.rng);
    for (const part of parts) {
      if (s.particles.length >= MAX_PARTICLES) s.particles.shift();
      s.particles.push(part);
    }
  }

  addText(x, y, text, color) {
    const s = this.state;
    if (s.texts.length >= MAX_TEXTS) s.texts.shift();
    s.texts.push(createFloatingText(x, y, text, color));
  }

  gainXp(value) {
    const s = this.state;
    s.xp += value;
    s.stats.gemsCollected += 1;
    while (s.xp >= s.xpNext) {
      s.xp -= s.xpNext;
      s.level += 1;
      s.xpNext = xpForLevel(s.level);
      s.pendingLevels += 1;
    }
    if (s.pendingLevels > 0 && s.phase === 'play') {
      s.phase = 'levelup';
      s.choices = rollUpgrades(this.rng, s);
      s.sfx.push('levelUp');
    }
  }

  applyLevelUpChoice(index) {
    const s = this.state;
    if (s.phase !== 'levelup' || !s.choices[index]) return;
    applyUpgrade(s, s.choices[index]);
    s.pendingLevels -= 1;
    if (s.pendingLevels > 0) {
      s.choices = rollUpgrades(this.rng, s);
    } else {
      s.choices = [];
      s.phase = 'play';
    }
  }

  continueEndless() {
    const s = this.state;
    if (s.phase !== 'win') return;
    s.phase = 'play';
    s.waveState = 'clear';
    s.bannerText = 'ENDLESS MODE';
    s.bannerTimer = 1.4;
  }

  // Forced death used by the end screenshot scene when the pilot survives.
  killPlayer() {
    const s = this.state;
    if (s.phase !== 'play') return;
    s.player.hp = 0;
    s.player.alive = false;
    s.phase = 'over';
    s.sfx.push('defeat');
  }

  // ---- the fixed step ---------------------------------------------------
  step(dt, ctrl) {
    const s = this.state;
    if (s.phase !== 'play') return;
    const p = s.player;
    const c = ctrl || { dx: 0, dy: 0, aimX: p.x, aimY: p.y - 100 };
    s.aim = { x: c.aimX, y: c.aimY };
    s.time += dt;
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 26);
    if (s.bannerTimer > 0) s.bannerTimer -= dt;

    // Player movement, clamped to the field.
    p.x = Math.max(p.radius, Math.min(FIELD.width - p.radius, p.x + c.dx * p.speed * dt));
    p.y = Math.max(p.radius, Math.min(FIELD.height - p.radius, p.y + c.dy * p.speed * dt));
    p.angle = Math.atan2(c.aimY - p.y, c.aimX - p.x);
    if (p.iframes > 0) p.iframes -= dt;
    if (p.flash > 0) p.flash -= dt;
    if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    p.orbitalAngle += dt * 3.2;

    // Auto-fire.
    p.fireTimer -= dt;
    if (p.fireTimer <= 0) {
      this.fireBullets();
      p.fireTimer = p.fireInterval;
    }

    // Wave spawning: faster trickle than v3, and from wave 3 two enemies
    // arrive per tick so the field holds visibly more of them at once.
    if (s.waveState === 'spawning') {
      s.spawnTimer -= dt;
      const interval = Math.max(0.3, 0.8 - s.wave * 0.05);
      const batch = s.wave >= 3 ? 2 : 1;
      if (s.spawnTimer <= 0 && s.spawnQueue.length > 0) {
        for (let i = 0; i < batch && s.spawnQueue.length > 0; i += 1) {
          this.spawnEnemy(s.spawnQueue.shift());
        }
        s.spawnTimer = interval;
      }
      if (s.spawnQueue.length === 0) s.waveState = 'fighting';
    } else if (s.waveState === 'fighting') {
      if (s.enemies.length === 0) {
        s.score += waveClearBonus(s.wave);
        this.addText(p.x, p.y - 40, `WAVE CLEAR +${waveClearBonus(s.wave)}`, '#ffd23f');
        s.waveState = 'clear';
        s.bannerText = `WAVE ${s.wave} CLEAR`;
        s.bannerTimer = 2.2;
      }
    } else if (s.waveState === 'clear') {
      if (s.bannerTimer <= 0) this.startWave(s.wave + 1);
    }

    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateGems(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);

    // Remove the dead (splitter minis are appended during killEnemy).
    if (s.enemies.some((e) => e.dead)) {
      s.enemies = s.enemies.filter((e) => !e.dead);
    }
  }

  updateEnemies(dt) {
    const s = this.state;
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
          const base = this.rng.range(0, TWO_PI);
          for (let i = 0; i < count; i += 1) {
            const a = base + (i / count) * TWO_PI;
            s.enemyBullets.push(createBullet(e.x, e.y, a, 205, 12, 0, false, false));
          }
          e.shootTimer = enraged ? BOSS.burstInterval * 0.65 : BOSS.burstInterval;
          s.sfx.push('bossRoar');
        }
        e.summonTimer -= dt;
        if (e.summonTimer <= 0) {
          this.spawnBossMinions(BOSS.summonCount);
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
          e.lungeTimer = this.rng.range(1.6, 2.6);
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
          const a = Math.atan2(dy, dx) + this.rng.range(-0.08, 0.08);
          s.enemyBullets.push(createBullet(e.x, e.y, a, 240, e.damage, 0, false, false));
          e.shootTimer = this.rng.range(1.8, 2.6);
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
            this.damageEnemy(e, Math.round(p.bulletDamage * 0.8), false);
            break;
          }
        }
      }

      // Contact damage, rate-limited per enemy.
      const rr = e.radius + p.radius;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr && e.touchTimer <= 0) {
        e.touchTimer = 0.85;
        this.hurtPlayer(e.damage, e.x, e.y);
        if (s.phase !== 'play') return;
      }
    }
  }

  updateBullets(dt) {
    const s = this.state;
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
          this.damageEnemy(e, b.damage, b.crit);
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
        this.hurtPlayer(b.damage, b.x - b.vx * 0.05, b.y - b.vy * 0.05);
        if (s.phase !== 'play') return;
      }
    }
    s.enemyBullets = s.enemyBullets.filter((b) => b.life > 0
      && b.x > -100 && b.x < FIELD.width + 100 && b.y > -100 && b.y < FIELD.height + 100);
  }

  updateGems(dt) {
    const s = this.state;
    const p = s.player;
    for (const g of s.gems) {
      if (g.taken) continue; // Defensive: a gem already picked this step.
      g.bob += dt * 4;
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < p.magnetRadius) {
        g.magnet = true;
        g.vx = (dx / d) * 420;
        g.vy = (dy / d) * 420;
      } else if (g.magnet) {
        g.vx *= 0.92;
        g.vy *= 0.92;
      } else {
        // Gems slide away from the kill point before settling, so they
        // scatter across the field instead of piling up on the player.
        g.vx *= 0.985;
        g.vy *= 0.985;
      }
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (d < p.radius + 12) {
        g.taken = true;
        this.addText(g.x, g.y - 10, `+${g.value} XP`, g.color);
        this.burst(g.x, g.y, g.color, 5, 120, 0.3);
        s.sfx.push('gemPickup');
        this.gainXp(g.value);
        if (s.phase !== 'play') break;
      }
    }
    // Always sweep taken gems, even when a pickup triggered a level-up
    // and left the loop early: a taken gem left in the array would be
    // collected again on the next step (same gem, double XP).
    s.gems = s.gems.filter((g) => !g.taken);
  }

  updateParticles(dt) {
    const s = this.state;
    for (const part of s.particles) {
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vx *= 0.985;
      part.vy *= 0.985;
    }
    s.particles = s.particles.filter((part) => part.life > 0);
  }

  updateTexts(dt) {
    const s = this.state;
    for (const t of s.texts) {
      t.life -= dt;
      t.y -= 34 * dt;
    }
    s.texts = s.texts.filter((t) => t.life > 0);
  }
}

export function createWorld(seed) {
  return new World(seed);
}
