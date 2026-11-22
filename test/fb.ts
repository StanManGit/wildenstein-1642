import { FGame } from '../src/freiburg/game';
const g = new FGame(Number(process.argv[2] || 1), (m) => { if (process.argv[3]) console.log(`[${g.dateText()}] ${m}`); });
let n = 0;
while (!g.over && n++ < 3000) g.dispatch(g.aiNext());
const s = g.score();
console.log(s.verdict, 'FR', s.fr.pts, s.fr.why.join('; '), '| BAV', s.bav.pts, s.bav.why.join('; '), '| losses', g.losses, 'turn', g.turn, 'train', g.units.find(u=>u.kind==='train')!.node);
console.log(g.units.filter(u=>u.alive).map(u=>`${u.id}@${u.node}:${u.men}/${u.morale}`).join(' '));
