import { Game } from '../src/game';
import { World, MASON, RUBBLE, AIR, ROCK, FILL, TIMBER, EARTH } from '../src/world';
const g = new Game(5, { att: 'ai', def: 'ai' }, { log: () => {}, boom: () => {}, changed: () => {} });
function show() {
  const ch: Record<number, string> = { [AIR]: ' ', [MASON]: '#', [RUBBLE]: '%', [ROCK]: 'R', [FILL]: 'f', [TIMBER]: 't', [EARTH]: 'e' };
  for (let y = 815; y > 776; y -= 1) { let s = ''; for (let x = 420; x < 460; x += 0.5) s += ch[g.w.at(x, y)] ?? '?'; console.log(y.toString().padStart(4), s); }
}
(async () => {
  const pump = setInterval(() => { for (let k = 0; k < 30; k++) g.update(1 / 60); }, 0);
  for (let d = 0; d < Number(process.argv[2] || 6); d++) {
    for (const gun of g.gunsOf('att')) { if (gun.type.shell) continue; gun.usedToday = false; gun.crew = 9; const a = g.aimGun(gun, 444.6, 801); g.phase = 'att'; await g.dispatch({ t: 'fire', gun: gun.id, angle: a.angle, charge: a.charge }); }
    { const b = g.breach(); console.log('day', d, 'top', b.topMin, 'fill', b.fill.toFixed(1), 'q', b.q.toFixed(2)); }
  }
  clearInterval(pump); show();
})();
