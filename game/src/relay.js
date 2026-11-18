export const ORDERS = [
  { name: 'FIRST LIGHT', reward: 1, nodes: [[350, 435, 3]], task: 'Hold the beacon for 3s' },
  { name: 'CROSSWIRE', reward: 2, nodes: [[330, 260, 2], [940, 555, 2]], task: 'Link both beacons in order' },
  { name: 'HEARTBREAK', reward: 3, nodes: [[900, 390, 4]], task: 'Arm the beacon, then break VOIDHEART' },
];

export function createRelay(rank) {
  if (!ORDERS[rank]) return null;
  return { rank, node: 0, charge: 0 };
}

export function relayComplete(state) {
  const relay = state.relay;
  return !!relay && relay.node === ORDERS[relay.rank].nodes.length
    && (relay.rank !== 2 || relay.bossAfterLink === true);
}

export function advanceRelay(world, dt) {
  const state = world.state;
  const relay = state.relay;
  if (!relay) return;
  const node = ORDERS[relay.rank].nodes[relay.node];
  if (!node) return;
  const [x, y, seconds] = node;
  if (Math.hypot(state.player.x - x, state.player.y - y) > 64) return;
  relay.charge += dt;
  if (relay.charge < seconds) return;
  relay.node++;
  relay.charge = 0;
  state.enemyBullets.length = 0;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 15);
  world.addText(x, y - 28, 'LINKED  /  SHIELD PULSE', '#ffd475');
  world.burst(x, y, '#ffd475', 24, 180, 0.6);
}

export function paintRelay(ctx, state) {
  const relay = state.relay;
  if (!relay) return;
  const order = ORDERS[relay.rank];
  const node = order.nodes[relay.node];
  ctx.save();
  ctx.strokeStyle = '#f6cc80';
  ctx.fillStyle = '#f6cc80';
  if (node) {
    const [x, y, seconds] = node;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(x, y, 64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 64, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * relay.charge / seconds);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('UPLINK ' + (relay.node + 1), x, y + 5);
  }
  ctx.restore();
}

export function relayStatus(state) {
  const relay = state.relay;
  const order = ORDERS[relay.rank];
  if (relayComplete(state)) return 'LINK SECURED  /  +' + order.reward + ' CORE AT DEBRIEF';
  const node = order.nodes[relay.node];
  return node ? 'BEACON ' + (relay.node + 1) + '/' + order.nodes.length + '  /  HOLD ' + Math.ceil(node[2] - relay.charge) + 's' : 'BEACON ARMED  /  DEFEAT VOIDHEART';
}
