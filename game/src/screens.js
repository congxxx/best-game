import { FIELD, COLORS } from './config.js';
import { SCREEN_PAUSE, dimOverlay, drawButton, screenButtons } from './screen-layout.js';

export function drawPause(ctx) {
  dimOverlay(ctx, 0.7);
  const cx = FIELD.width / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('PAUSED', cx, 300);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('WASD move · Mouse aim · Auto-fire on · P / Esc resume', cx, 340);
  for (const b of screenButtons(SCREEN_PAUSE)) drawButton(ctx, b, b.label, b.id === 'resume');
}

export * from './screen-layout.js';
export * from './title-screen.js';
export * from './upgrade-screen.js';
export * from './result-screen.js';
export * from './zone-art.js';
