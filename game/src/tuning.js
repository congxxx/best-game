export const MODULES = [
  { id: 'coil', name: 'Flux coil', cost: 3, effect: '+15% damage / -10 hull', damage: 1.15, hull: -10 },
  { id: 'keel', name: 'Iron keel', cost: 3, effect: '+20 hull / -7% thrust', hull: 20, speed: 0.93 },
  { id: 'lance', parent: 'coil', name: 'Phase lance', cost: 5, effect: '+1 pierce / -12% cadence', pierce: 1, rate: 0.88 },
  { id: 'arc', parent: 'coil', name: 'Arc driver', cost: 5, effect: '+20% cadence / -10% damage', rate: 1.2, damage: 0.9 },
  { id: 'wake', parent: 'keel', name: 'Slip wake', cost: 5, effect: '+18% thrust / -12 hull', speed: 1.18, hull: -12 },
  { id: 'well', parent: 'keel', name: 'Gravity well', cost: 5, effect: '+50% pickup / -8% thrust', magnet: 1.5, speed: 0.92 },
];

export function cleanTuning(raw, cores) {
  const owned = [];
  let remaining = cores;
  for (const mod of MODULES) {
    if (Array.isArray(raw?.owned) && raw.owned.includes(mod.id) && remaining >= mod.cost && (!mod.parent || owned.includes(mod.parent))) {
      owned.push(mod.id);
      remaining -= mod.cost;
    }
  }
  return { owned, fitted: owned.includes(raw?.fitted) ? raw.fitted : null };
}

export function balance(save) {
  return save.cores - MODULES.reduce((spent, mod) => spent + (save.tuning.owned.includes(mod.id) ? mod.cost : 0), 0);
}

export function equip(save, id) {
  if (id === 'stock') { save.tuning.fitted = null; return true; }
  const mod = MODULES.find(item => item.id === id);
  if (!mod || (mod.parent && !save.tuning.owned.includes(mod.parent))) return false;
  if (!save.tuning.owned.includes(id)) {
    if (balance(save) < mod.cost) return false;
    save.tuning.owned.push(id);
  }
  save.tuning.fitted = id;
  return true;
}

export function applyTuning(player, fitted) {
  const leaf = MODULES.find(mod => mod.id === fitted);
  if (!leaf) return;
  for (const mod of MODULES.filter(mod => mod === leaf || mod.id === leaf.parent)) {
    player.maxHp += mod.hull || 0;
    player.speed *= mod.speed || 1;
    player.fireInterval /= mod.rate || 1;
    player.bulletDamage *= mod.damage || 1;
    player.pierce += mod.pierce || 0;
    player.magnetRadius *= mod.magnet || 1;
  }
  player.hp = player.maxHp;
}
