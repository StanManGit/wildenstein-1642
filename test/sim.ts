import { Game } from '../src/game';
const seed = Number(process.argv[2] || 1);
const logs: string[] = [];
const g = new Game(seed, { att: 'ai', def: 'ai' }, { log: (m) => logs.push(`[T${g.day}] ${m}`), boom: () => {}, changed: () => {} });
const a = g.guns[0];
for (const [tx, ty] of [[444.6, 801], [444.6, 806]]) console.log('aim', tx, ty, g.aimGun(a, tx, ty));
console.log('mortar', g.aimGun(g.guns[2], 530, 802));
console.log('falc', g.aimGun(g.guns[3], g.guns[0].x - 0.6, g.guns[0].y + 1.1), g.aimGun(g.guns[4], g.guns[0].x - 0.6, g.guns[0].y + 1.1));
(async () => {
  let steps = 0;
  const pump = setInterval(() => { for (let k = 0; k < 20; k++) g.update(1 / 60); }, 0);
  while (g.phase !== 'over' && steps < 2000) {
    const c = g.aiNext(); if (!c) break;
    await g.dispatch(c); steps++;
    if (c.t === 'end' && g.phase === 'att') {
      const b = g.breach();
      console.log(`Tag ${g.day - 1} -> att ${g.att.men}/${g.att.morale.toFixed(0)} def ${g.def.men}/${g.def.morale.toFixed(0)} stage ${g.stage} breach q=${b.q.toFixed(2)} top=${b.topMin.toFixed(1)} fill=${b.fill.toFixed(1)} guns ${g.guns.map(x => x.alive ? x.crew : 'x').join(',')}`);
    }
  }
  clearInterval(pump);
  console.log(logs.filter(l => /STURM|Sturm|zersprungen|zerschossen|Akkord|lehnt|verloren|verschüttet/.test(l)).join('\n'));
  console.log('END', g.winner, g.endText, 'day', g.day);
})();
