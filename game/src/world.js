// Game state and the fixed-step simulation: spawning, waves, movement,
// combat, collisions, XP/level-ups, the boss, win and lose. Deterministic:
// every random draw comes from the seeded RNG, never from Math.random or
// the wall clock. Sounds are reported as names in state.sfx for main.js
// to play, so simulation never touches audio.
import { FIELD, MAX_PARTICLES, MAX_TEXTS, xpForLevel, waveClearBonus } from './config.js';
import { createPlayer, createParticle, createFloatingText } from './entities.js';
import { makeRng } from './random.js';
import { fitRig } from './rigs.js';
import { applyTuning } from './tuning.js';
import { createRelay, advanceRelay } from './relay.js';
import { createLeague, tickLeague } from './pilot-league.js';
import { zoneForWave, zoneIndex } from './zones.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';
import { startWave, spawnEnemy } from './waves.js';
import { fireBullets, killEnemy } from './combat.js';
import { updateEnemies, updateBullets } from './collision-step.js';

export const EVENT_NONE = 0;

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
      pulseCharge: 0,
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
  startRun(zoneId, rig = 'survey', rank = 0, fitted = null) {
    this.reset(this.seed);
    this.state.relay = createRelay(rank);
    this.state.league = createLeague(this.state.player);
    fitRig(this.state.player, rig);
    applyTuning(this.state.player, fitted);
    this.state.zoneOffset = zoneIndex(zoneId);
    this.state.phase = 'play';
    startWave(this, 1);
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
    const travel = p.speed * (s.zone.thrust || 1) * dt;
    p.x = Math.max(p.radius, Math.min(FIELD.width - p.radius, p.x + c.dx * travel));
    p.y = Math.max(p.radius, Math.min(FIELD.height - p.radius, p.y + c.dy * travel));
    p.angle = Math.atan2(c.aimY - p.y, c.aimX - p.x);
    if (p.iframes > 0) p.iframes -= dt;
    if (p.flash > 0) p.flash -= dt;
    if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    p.orbitalAngle += dt * 3.2;
    advanceRelay(this, dt);

    // Auto-fire.
    p.fireTimer -= dt * (s.zone.cadence || 1);
    if (p.fireTimer <= 0) {
      fireBullets(this);
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
          spawnEnemy(this, s.spawnQueue.shift());
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
      if (s.bannerTimer <= 0) startWave(this, s.wave + 1);
    }

    tickLeague(s, dt);
    updateEnemies(this, dt);
    if (s.phase === 'play') updateBullets(this, dt);
    if (s.phase === 'play') this.updateGems(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);

    // Remove the dead (splitter minis are appended during killEnemy).
    if (s.enemies.some((e) => e.dead)) {
      s.enemies = s.enemies.filter((e) => !e.dead);
    }
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
      if (d < p.magnetRadius * (s.zone.pickup || 1)) {
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
