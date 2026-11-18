const PILOTS = [
  { id: 'you', name: 'YOU', color: '#85faff' },
  { id: 'rook', name: 'MARA ROOK', color: '#ffb878' },
  { id: 'vale', name: 'ION VALE', color: '#c6a2ff' },
];
const GATES = [[350, 435], [920, 275], [600, 625], [355, 285], [974, 540]];
const ENTRY_RADIUS = 47;

export function createLeague(player) {
  return { wave: 0, gate: GATES[0], finishers: [], elapsed: 0, notice: '', until: 0,
    pilots: PILOTS.map(pilot => ({ ...pilot, x: player.x, y: player.y, points: 0 })) };
}

export function standings(pilots) {
  const sorted = [...pilots].sort((left, right) => right.points - left.points);
  return sorted.map(pilot => ({ ...pilot, place: 1 + sorted.findIndex(other => other.points === pilot.points) }));
}

export function careerTable(totals = {}) {
  return standings(PILOTS.map(pilot => ({ ...pilot, points: totals[pilot.id] || 0 })));
}

export function tickLeague(state, dt) {
  const heat = state.league;
  if (!heat || heat.closed) return;
  if (heat.wave !== state.wave) {
    heat.wave = state.wave;
    heat.gate = GATES[(state.wave - 1) % GATES.length];
    heat.finishers = [];
    heat.elapsed = 0;
  }
  heat.elapsed += dt;
  const [gx, gy] = heat.gate;
  const arrivals = [];
  for (const pilot of heat.pilots) {
    const oldDistance = Math.hypot(pilot.x - gx, pilot.y - gy);
    if (pilot.id === 'you') {
      pilot.x = state.player.x;
      pilot.y = state.player.y;
    } else {
      const tagged = heat.finishers.includes(pilot.id);
      const direction = pilot.id === 'rook' ? 1 : -1;
      const angle = heat.elapsed * 0.8 * direction;
      const targetX = tagged ? gx + 85 * Math.cos(angle) : gx;
      const targetY = tagged ? gy + 85 * Math.sin(angle) : gy;
      const dx = targetX - pilot.x;
      const dy = targetY - pilot.y;
      const speed = pilot.id === 'rook' ? 97 : 82 + Math.min(37, heat.elapsed * 5);
      const fraction = Math.min(1, speed * dt / (Math.hypot(dx, dy) || 1));
      pilot.x += dx * fraction;
      pilot.y += dy * fraction;
      pilot.heading = Math.atan2(dy, dx);
    }
    const distance = Math.hypot(pilot.x - gx, pilot.y - gy);
    if (distance <= ENTRY_RADIUS && !heat.finishers.includes(pilot.id)) {
      arrivals.push({ pilot, crossing: Math.max(0, (oldDistance - ENTRY_RADIUS) / (oldDistance - distance || 1)) });
    }
  }
  for (const {pilot} of arrivals.sort((left, right) => left.crossing - right.crossing)) {
    const before = standings(heat.pilots).find(row => row.id === pilot.id).place;
    const award = 3 - heat.finishers.length;
    pilot.points += award;
    heat.finishers.push(pilot.id);
    const position = standings(heat.pilots).find(row => row.id === pilot.id).place;
    heat.notice = pilot.name + (position < before ? ' UP TO P' + position : ' TAGGED') + '  +' + award;
    heat.until = state.time + 3;
  }
}

export function bankLeague(save, state) {
  const heat = state.league;
  if (!heat || heat.closed) return;
  for (const pilot of heat.pilots) save.league[pilot.id] += pilot.points;
  heat.closed = true;
}
