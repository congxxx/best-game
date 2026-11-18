export const RIGS = [
  { id: 'survey', name: 'SURVEY', detail: 'Balanced flight', cores: 0 },
  { id: 'bulwark', name: 'BULWARK', detail: '+30 hull / -10% thrust', cores: 1 },
  { id: 'needle', name: 'NEEDLE', detail: '+25% damage / -20 hull', cores: 3 },
];

export function availableRig(id, cores) {
  return RIGS.find(rig => rig.id === id && cores >= rig.cores) || RIGS[0];
}

export function fitRig(player, id) {
  if (id === 'bulwark') {
    player.maxHp += 30;
    player.speed *= 0.9;
  } else if (id === 'needle') {
    player.maxHp -= 20;
    player.bulletDamage *= 1.25;
  }
  player.hp = player.maxHp;
}
