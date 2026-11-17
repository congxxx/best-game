// Deterministic screenshot scenes behind ?shot=start|play|levelup|end&seed=N.
// Each one plays the real rules forward from a fresh world for a fixed
// number of fixed steps, steered by a simple autopilot, so the frame is what
// a short game really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVELUP, SCREEN_OVER } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 55;
const LEVELUP_LIMIT_SECONDS = 90;
const END_LIMIT_SECONDS = 120;

// Autopilot: flee the nearest close enemy, chase the nearest gem, and aim
// at the nearest enemy so the play frame shows bullets in flight.
function autopilot(state) {
  const p = state.player;
  let moveX = 0;
  let moveY = 0;
  let nearestEnemy = null;
  let nearestD = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestD) { nearestD = d; nearestEnemy = e; }
  }
  let nearestGem = null;
  let nearestGemD = Infinity;
  for (const g of state.gems) {
    const d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d < nearestGemD) { nearestGemD = d; nearestGem = g; }
  }
  if (nearestEnemy && nearestD < 170) {
    moveX += (p.x - nearestEnemy.x) / nearestD;
    moveY += (p.y - nearestEnemy.y) / nearestD;
  }
  if (nearestGem && nearestGemD < 300) {
    moveX += (nearestGem.x - p.x) / nearestGemD;
    moveY += (nearestGem.y - p.y) / nearestGemD;
  }
  // Drift back toward the centre when nothing else matters.
  if (moveX === 0 && moveY === 0) {
    moveX = (FIELD.width / 2 - p.x) / FIELD.width;
    moveY = (FIELD.height / 2 - p.y) / FIELD.height;
  }
  const len = Math.hypot(moveX, moveY) || 1;
  const aim = nearestEnemy
    ? { x: nearestEnemy.x, y: nearestEnemy.y }
    : { x: p.x, y: p.y - 100 };
  return { dx: moveX / len, dy: moveY / len, aimX: aim.x, aimY: aim.y };
}

// Weak autopilot for the end scene: it flees close enemies and shoots with
// a fixed miss offset, but never chases gems, so it levels slowly, gets
// overwhelmed around wave 2, and the frame shows a real run's score.
function weakAutopilot(state) {
  const p = state.player;
  let moveX = 0;
  let moveY = 0;
  let nearestEnemy = null;
  let nearestD = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestD) { nearestD = d; nearestEnemy = e; }
  }
  if (nearestEnemy && nearestD < 200) {
    moveX += (p.x - nearestEnemy.x) / nearestD;
    moveY += (p.y - nearestEnemy.y) / nearestD;
  }
  if (moveX === 0 && moveY === 0) {
    moveX = (FIELD.width / 2 - p.x) / FIELD.width;
    moveY = (FIELD.height / 2 - p.y) / FIELD.height;
  }
  const len = Math.hypot(moveX, moveY) || 1;
  let aimX = p.x;
  let aimY = p.y - 100;
  if (nearestEnemy) {
    const a = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x) + 0.35;
    aimX = p.x + Math.cos(a) * 200;
    aimY = p.y + Math.sin(a) * 200;
  }
  return { dx: moveX / len, dy: moveY / len, aimX, aimY };
}

// Auto-apply the first offered card whenever a level-up pops during a sim.
function settleLevelUps(world) {
  let guard = 0;
  while (world.state.phase === 'levelup' && guard < 8) {
    world.applyLevelUpChoice(0);
    guard += 1;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it
 * and the best score to show.
 */
export function stageShot(name, world) {
  world.startRun();
  if (name !== 'play' && name !== 'levelup' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, autopilot(world.state));
      settleLevelUps(world);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'levelup') {
    for (let i = 0; i < LEVELUP_LIMIT_SECONDS / STEP; i += 1) {
      if (world.state.phase === 'levelup') {
        return { screen: SCREEN_LEVELUP, best: world.state.score };
      }
      if (world.state.phase !== 'play') break;
      world.step(STEP, autopilot(world.state));
    }
    // If the pilot never levelled up, grant the XP directly (still seeded
    // and deterministic) so the frame is a real level-up screen.
    if (world.state.phase === 'play') {
      world.state.phase = 'play';
      world.gainXp(world.state.xpNext - world.state.xp);
    }
    return { screen: SCREEN_LEVELUP, best: world.state.score };
  }
  if (name === 'end') {
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      if (world.state.phase !== 'play') break;
      world.step(STEP, weakAutopilot(world.state));
      settleLevelUps(world);
    }
    if (world.state.phase === 'play') world.killPlayer();
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // play
  for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
    if (world.state.phase !== 'play') break;
    world.step(STEP, autopilot(world.state));
    settleLevelUps(world);
  }
  const over = world.state.phase === 'over';
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
