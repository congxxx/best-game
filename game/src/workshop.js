import { MODULES, balance } from './tuning.js';

export function workshopButtons() {
  return [...MODULES.map((mod, index) => ({
    id: 'mod-' + mod.id, x: index < 2 ? 210 + index * 560 : 92 + (index - 2) * 282,
    y: index < 2 ? 225 : 430, w: index < 2 ? 300 : 248, h: 112,
  })), { id: 'mod-stock', x: 335, y: 650, w: 280, h: 56 }, { id: 'workshop', x: 665, y: 650, w: 280, h: 56 }];
}

export function drawWorkshop(ctx, save) {
  const buttons = workshopButtons();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e3fbff';
  ctx.font = 'bold 48px system-ui';
  ctx.fillText('SHIPYARD  /  TUNING TREE', 640, 94);
  ctx.font = '18px system-ui';
  ctx.fillText('Research once. Fit one branch to any rig. Tier II includes its parent.', 640, 138);
  ctx.fillStyle = '#ffcf71';
  ctx.fillText(balance(save) + ' CORES AVAILABLE', 640, 175);
  for (const [index, mod] of MODULES.entries()) {
    const box = buttons[index];
    const center = box.x + box.w / 2;
    const owned = save.tuning.owned.includes(mod.id);
    const fitted = save.tuning.fitted === mod.id;
    if (mod.parent) {
      const parent = buttons[MODULES.findIndex(item => item.id === mod.parent)];
      ctx.strokeStyle = '#526585';
      ctx.beginPath();
      ctx.moveTo(parent.x + parent.w / 2, parent.y + parent.h);
      ctx.lineTo(center, box.y);
      ctx.stroke();
    }
    ctx.fillStyle = fitted ? '#15404b' : '#121c31';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = fitted ? '#75ffed' : '#ccd9f2';
    ctx.font = 'bold 20px system-ui';
    ctx.fillText((mod.parent ? 'II' : 'I') + '  /  ' + mod.name, center, box.y + 30);
    ctx.font = '15px system-ui';
    ctx.fillText(mod.effect, center, box.y + 59);
    ctx.fillStyle = '#ffcf71';
    ctx.font = 'bold 13px monospace';
    const gated = mod.parent && !save.tuning.owned.includes(mod.parent);
    ctx.fillText(fitted ? 'FITTED' : owned ? 'EQUIP FREE' : gated ? 'REQUIRES ' + mod.parent.toUpperCase() : (balance(save) >= mod.cost ? 'BUY + FIT: ' : 'NEED ') + mod.cost + ' CORES', center, box.y + 87);
  }
  for (const box of buttons.slice(-2)) {
    ctx.fillStyle = '#23314e';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = '#fff';
    ctx.fillText(box.id === 'workshop' ? 'BACK TO HANGAR  [T]' : 'RESTORE STOCK  /  FREE', box.x + box.w / 2, box.y + 34);
  }
  ctx.restore();
}

export function drawResearchReport(ctx, save) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,28,0.91)';
  ctx.fillRect(100, 320, 250, 220);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e3fbff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('SHIPYARD  /  NEXT LAUNCH', 114, 342);
  ctx.fillStyle = '#ffcf71';
  ctx.fillText(balance(save) + ' CORES AVAILABLE', 114, 367);
  let y = 396;
  for (const root of MODULES.filter(mod => !mod.parent)) {
    ctx.fillStyle = '#85faff';
    ctx.fillText(root.name.toUpperCase() + (save.tuning.owned.includes(root.id) ? '  /  OWNED' : '  /  3 CORE'), 114, y);
    ctx.font = '13px system-ui';
    ctx.fillStyle = '#cbd7eb';
    ctx.fillText('↳ ' + MODULES.filter(mod => mod.parent === root.id).map(mod => mod.name).join('  |  '), 121, y + 21);
    ctx.font = 'bold 14px monospace';
    y += 56;
  }
  ctx.fillStyle = '#b6bed0';
  ctx.fillText('ZONE MAP → T TO RESEARCH', 114, 523);
  ctx.restore();
}
