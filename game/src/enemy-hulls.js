const hulls = {
  chaser: ['M10 -7 L6 -1 L2 -3 L-1 0 L2 3 L6 1 L10 7 L3 9 L-6 6 L-10 0 L-6 -6 L3 -9 Z', 'M-6 -2 L-2 0 L-6 2 Z'],
  darter: ['M13 0 L1 4 L-6 8 L-4 3 L-11 4 L-8 0 L-11 -4 L-4 -3 L-6 -8 L1 -4 Z', 'M7 0 L-5 1.5 L-5 -1.5 Z'],
  tank: ['M8 -5 L10 -2 L10 2 L8 5 L7 9 L-5 9 L-9 6 L-7 3 L-10 2 L-10 -2 L-7 -3 L-9 -6 L-5 -9 L7 -9 Z', 'M-7 -5 L5 -5 L7 -3 L-4 -3 Z M-7 5 L-4 3 L7 3 L5 5 Z M-3 0 L0 -2 L4 0 L0 2 Z'],
  shooter: ['M12 -2 L12 2 L4 2 L3 5 L-1 5 L-4 9 L-9 7 L-6 2 L-8 0 L-6 -2 L-9 -7 L-4 -9 L-1 -5 L3 -5 L4 -2 Z', 'M1 0 A3 3 0 1 0 -5 0 A3 3 0 1 0 1 0 Z'],
  splitter: ['M-1 -4 C-5 -14 -14 -7 -9 -1 Q-6 2 -2 1 C-10 8 -2 14 3 8 Q5 5 3 2 C14 5 14 -5 7 -7 Q2 -9 -1 -4 Z', 'M-5 -6 A2 2 0 1 0 -5 -2 A2 2 0 1 0 -5 -6 Z M6 -5 A2 2 0 1 0 6 -1 A2 2 0 1 0 6 -5 Z M0 4 A2 2 0 1 0 0 8 A2 2 0 1 0 0 4 Z'],
  mini: ['M10 0 Q1 12 -8 6 L-4 1 L-9 -4 Q-2 -10 10 0 Z', 'M2 0 L-3 3 L-2 -2 Z'],
};

const paths = new Map();

export function drawEnemyHull(ctx, enemy) {
  const kind = enemy.kind;
  if (!paths.has(kind)) paths.set(kind, hulls[kind].map(outline => new Path2D(outline)));
  const [shell, marking] = paths.get(kind);
  ctx.save();
  ctx.scale(enemy.radius / 10, enemy.radius / 10);
  ctx.lineWidth *= 10 / enemy.radius;
  ctx.lineJoin = 'round';
  ctx.fill(shell);
  ctx.stroke(shell);
  ctx.fillStyle = '#231a30';
  ctx.fill(marking);
  ctx.restore();
}
