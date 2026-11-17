// VOIDPULSE — a neon arena survivor. Original 2D canvas game, vanilla JS,
// no libraries, no network, no external assets. All art is drawn in code
// and all sound is synthesized with WebAudio.
import { FIELD, STEP } from './config.js';
import { createWorld } from './world.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import {
  drawGame, screenButtons,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVELUP, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';
import { loadSave, recordRun, persistSave } from './save.js';
import { ZONES, isZoneUnlocked, unlockRequirement } from './zones.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const audio = new AudioEngine();
const world = createWorld(1337);

let screen = SCREEN_TITLE;
let save = loadSave();
let accumulator = 0;
let lastTime = 0;
let shotMode = false;

// Fit the 1280x800 field into the window, letterboxed, DPR capped at 2.
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  canvas.width = Math.floor(winW * dpr);
  canvas.height = Math.floor(winH * dpr);
  canvas.style.width = `${winW}px`;
  canvas.style.height = `${winH}px`;
  const scale = Math.min(winW / FIELD.width, winH / FIELD.height);
  const offsetX = (winW - FIELD.width * scale) / 2;
  const offsetY = (winH - FIELD.height * scale) / 2;
  input.setView(scale, offsetX, offsetY);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
  ctx.fillStyle = '#05060f';
  ctx.fillRect(-offsetX / scale, -offsetY / scale, winW / scale, winH / scale);
}

function drainSfx() {
  const sfx = world.state.sfx;
  if (sfx.length === 0) return;
  for (const name of sfx) {
    if (typeof audio[name] === 'function') audio[name]();
  }
  sfx.length = 0;
}

function startRun(zoneId) {
  audio.ensure();
  audio.startMusic();
  world.startRun(zoneId);
  screen = SCREEN_PLAY;
  accumulator = 0;
}

// Start a run in the named zone if it is unlocked; a locked zone shows a
// brief red notice under the title map instead of starting a run.
function tryStartZone(zoneId) {
  const zone = ZONES.find((z) => z.id === zoneId) || ZONES[0];
  if (isZoneUnlocked(zoneId, save)) {
    save.lastZone = zoneId;
    persistSave(save);
    startRun(zoneId);
  } else {
    world.state.titleNotice = {
      text: `${zone.name} is locked — ${unlockRequirement(zoneId)}`,
      until: Date.now() + 1500,
    };
  }
}

function handleKey() {
  if (input.wasPressed('p') || input.wasPressed('escape')) {
    if (screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSE;
      world.state.phase = 'paused';
    } else if (screen === SCREEN_PAUSE) {
      screen = SCREEN_PLAY;
      world.state.phase = 'play';
    }
  }
  if (input.wasPressed('r')) {
    if (screen === SCREEN_OVER || screen === SCREEN_WIN || screen === SCREEN_PAUSE) startRun(save.lastZone);
  }
  if (screen === SCREEN_TITLE) {
    // 1 / 2 / 3 start in that zone (locked -> notice); Enter / Space
    // starts in the last-picked zone.
    const zoneIds = ['drift', 'ember', 'violet'];
    for (let i = 0; i < 3; i += 1) {
      if (input.wasPressed(String(i + 1))) tryStartZone(zoneIds[i]);
    }
    if (input.wasPressed('enter') || input.wasPressed(' ')) startRun(save.lastZone);
  }
  if (screen === SCREEN_LEVELUP) {
    if (input.wasPressed('1')) world.applyLevelUpChoice(0);
    if (input.wasPressed('2')) world.applyLevelUpChoice(1);
    if (input.wasPressed('3')) world.applyLevelUpChoice(2);
    if (world.state.phase === 'play') screen = SCREEN_PLAY;
  }
  if (input.wasPressed('m')) {
    audio.muted = !audio.muted;
  }
}

function handleClick(clientX, clientY) {
  audio.ensure();
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left - input.offsetX) / input.scale;
  const y = (clientY - rect.top - input.offsetY) / input.scale;
  for (const b of screenButtons(screen, world.state, save)) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      audio.click();
      if (b.id === 'start') startRun(save.lastZone);
      else if (b.id === 'restart') startRun(save.lastZone);
      else if (b.id.startsWith('zone-')) {
        tryStartZone(b.id.slice(5));
      } else if (b.id === 'resume') {
        screen = SCREEN_PLAY;
        world.state.phase = 'play';
      } else if (b.id === 'continue') {
        world.continueEndless();
        screen = SCREEN_PLAY;
      } else if (b.id.startsWith('card')) {
        world.applyLevelUpChoice(parseInt(b.id.slice(4), 10));
        if (world.state.phase === 'play') screen = SCREEN_PLAY;
      }
      return;
    }
  }
}

function frame(timestamp) {
  if (shotMode) return;
  const now = timestamp / 1000;
  if (!lastTime) lastTime = now;
  let dt = now - lastTime;
  lastTime = now;
  if (dt > 0.25) dt = 0.25;

  handleKey();
  if (screen === SCREEN_PLAY && world.state.phase === 'play') {
    const move = input.moveVector();
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      world.step(STEP, {
        dx: move.dx, dy: move.dy, aimX: input.mouseX, aimY: input.mouseY,
      });
      accumulator -= STEP;
      steps += 1;
      if (world.state.phase !== 'play') break;
    }
    if (steps === 5) accumulator = 0;
    drainSfx();
    if (world.state.phase === 'over') {
      screen = SCREEN_OVER;
      save = recordRun(save, world.state, 'over').save;
    } else if (world.state.phase === 'win') {
      screen = SCREEN_WIN;
      save = recordRun(save, world.state, 'win').save;
    } else if (world.state.phase === 'levelup') {
      screen = SCREEN_LEVELUP;
    }
  } else if (screen === SCREEN_LEVELUP && world.state.phase === 'play') {
    screen = SCREEN_PLAY;
  }

  drawGame(ctx, world, screen, save);
  input.endFrame();
  requestAnimationFrame(frame);
}

function initShotMode() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = parseInt(params.get('seed') || '1337', 10);
  const shotWorld = createWorld(Number.isFinite(seed) ? seed : 1337);
  const result = stageShot(shot, shotWorld);
  // Swap the staged world into place so the frame shows its state.
  world.state = shotWorld.state;
  world.rng = shotWorld.rng;
  world.seed = shotWorld.seed;
  screen = result.screen;
  // Shot mode shows the loaded save (fresh screenshot profiles have an
  // empty localStorage, so bests show 0/—, which is fine).
  drawGame(ctx, world, screen, save);
  return true;
}

window.addEventListener('resize', resize);
canvas.addEventListener('click', (event) => handleClick(event.clientX, event.clientY));
canvas.addEventListener('mousedown', () => audio.ensure());
window.addEventListener('keydown', () => audio.ensure(), { once: true });

resize();
world.state.phase = 'title';
// Ambient world behind the title screen: a short simulated run.
(function ambientTitle() {
  const demo = createWorld(2026);
  stageShot('start', demo);
  world.state = demo.state;
  world.rng = demo.rng;
})();
shotMode = initShotMode();
if (!shotMode) {
  screen = SCREEN_TITLE;
  requestAnimationFrame(frame);
}
