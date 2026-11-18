import { FIELD, BOSS, ENEMY_TYPES, waveEnemyCount } from './config.js';
import { createEnemy, createBoss } from './entities.js';
import { zoneForWave } from './zones.js';

const TWO_PI = Math.PI * 2;

export function startWave(world, wave) {
  const s = world.state;
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
    const pick = world.rng.chance(0.45) ? 'chaser' : world.rng.pick(unlocked);
    queue.push(pick);
  }
  s.spawnQueue = queue;
  s.waveState = 'spawning';
  s.spawnTimer = 0.6;
  s.bannerText = `WAVE ${wave} — ${s.zoneName}`;
  s.bannerTimer = 1.6;
}

export function spawnEnemy(world, type) {
  const s = world.state;
  const margin = 30;
  const edge = world.rng.int(0, 3);
  let x;
  let y;
  if (edge === 0) { x = world.rng.range(0, FIELD.width); y = -margin; }
  else if (edge === 1) { x = FIELD.width + margin; y = world.rng.range(0, FIELD.height); }
  else if (edge === 2) { x = world.rng.range(0, FIELD.width); y = FIELD.height + margin; }
  else { x = -margin; y = world.rng.range(0, FIELD.height); }
  let elite = false;
  if (s.wave % 3 === 0 && s.elitesSpawned < 2 && type !== 'mini') {
    elite = true;
    s.elitesSpawned += 1;
  }
  s.enemies.push(createEnemy(type, x, y, s.wave, elite, world.rng));
}

export function spawnBossMinions(world, count) {
  const s = world.state;
  const boss = s.enemies.find((e) => e.boss);
  if (!boss) return;
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng.range(0, TWO_PI);
    s.enemies.push(createEnemy(
      'mini', boss.x + Math.cos(angle) * 90, boss.y + Math.sin(angle) * 90,
      s.wave, false, world.rng,
    ));
  }
}
