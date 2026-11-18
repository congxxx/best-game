import { FIELD } from './config.js';
import { ORDERS } from './relay.js';

export function drawRadar(ctx, state) {
  const heat = state.league;
  const relay = state.relay;
  const uplink = relay && ORDERS[relay.rank].nodes[relay.node];
  const gate = heat && !heat.closed && !heat.finishers.includes('you') && heat.gate;
  if (!gate && !uplink) return;
  ctx.save();
  ctx.translate(FIELD.width - 166, 126);
  ctx.fillStyle = 'rgba(8,14,28,0.90)';
  ctx.fillRect(-8, -19, 152, 107);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#c4d5df';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('NAV  /  SIGNAL RADAR', 0, -5);
  ctx.strokeStyle = '#435269';
  ctx.strokeRect(0, 0, 136, 85);
  const point = (x, y) => [x * 136 / FIELD.width, y * 85 / FIELD.height];
  const here = point(state.player.x, state.player.y);
  if (uplink) {
    const [x, y] = point(...uplink);
    ctx.strokeStyle = '#ffd475';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (gate) {
    const [x, y] = point(...gate);
    ctx.strokeStyle = '#a9dcca';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(...here);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeRect(x - 4, y - 4, 8, 8);
  }
  if (heat && !heat.closed) for (const pilot of heat.pilots.slice(1)) {
    const [x, y] = point(pilot.x, pilot.y);
    ctx.fillStyle = pilot.color;
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  ctx.translate(...here);
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#85faff';
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(-3, -3);
  ctx.lineTo(-3, 3);
  ctx.fill();
  ctx.restore();
}
