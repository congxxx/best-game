import { createBullet } from './entities.js';

export const PULSE_COST = 12;
const RANGE = 180;

export function counterpulse(world) {
  const state = world.state;
  if (state.phase !== 'play' || state.pulseCharge < PULSE_COST) return false;
  const player = state.player;
  const incoming = state.enemyBullets.filter(shot => shot.life > 0 && Math.hypot(shot.x - player.x, shot.y - player.y) <= RANGE);
  if (!incoming.length) return false;
  const reflected = new Set(incoming);
  state.enemyBullets = state.enemyBullets.filter(shot => !reflected.has(shot));
  for (const shot of incoming) {
    const angle = Math.atan2(-shot.vy, -shot.vx);
    state.bullets.push(createBullet(shot.x, shot.y, angle, player.bulletSpeed, player.bulletDamage, 0, false, true));
  }
  state.pulseCharge = 0;
  state.sfx.push('levelUp');
  world.burst(player.x, player.y, '#8ef6ff', 24, 290, 0.45);
  world.addText(player.x, player.y - 36, 'REFLECTED ×' + incoming.length, '#8ef6ff');
  return true;
}

export function pulseHint(state) {
  if (state.pulseCharge < PULSE_COST) return 'E  /  COUNTERPULSE   ' + state.pulseCharge + ' / ' + PULSE_COST;
  const nearby = state.enemyBullets.filter(shot => shot.life > 0 && Math.hypot(shot.x - state.player.x, shot.y - state.player.y) <= RANGE).length;
  return nearby ? '[ E ]  REFLECT ×' + nearby : 'COUNTERPULSE READY  /  E TO REFLECT';
}
