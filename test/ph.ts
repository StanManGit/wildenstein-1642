import { PGame } from '../src/philippsburg/game';
const res: Record<string, number> = {};
for (let seed = 1; seed <= 20; seed++) {
  const g = new PGame(seed);
  let n = 0;
  while (!g.over && n++ < 200) {
    if (g.phase === 'fr') g.dispatch(g.aiAtt());
    else { if (g.pendingTerms) { g.dispatch({ t: 'terms', accept: g.aiAcceptTerms() }); if (g.over) break; } g.dispatch({ t: 'def', a: g.aiDef() }); }
  }
  res[g.winner!] = (res[g.winner!] || 0) + 1;
  console.log(seed, g.winner, 'day', g.day, 'relief', g.relief.day, `ring ${g.ring.toFixed(0)} dist ${g.dist.toFixed(0)} bat ${g.batteries} wall ${g.wall.toFixed(0)} breach ${g.breach()} fr ${g.fr.men}/${g.fr.morale.toFixed(0)} imp ${g.imp.men}/${g.imp.morale.toFixed(0)}`, g.endText.slice(0, 40));
}
console.log(res);
