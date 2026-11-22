import { HGame, seasonText } from '../src/hohentwiel/game';
let wins = 0;
for (let seed = 1; seed <= 20; seed++) {
  const g = new HGame(seed);
  let n = 0;
  while (!g.over && n++ < 500) {
    if (g.pendingEvent) { g.dispatch({ t: 'choose', i: g.pendingEvent.hist ?? 0 }); continue; }
    const av = g.available();
    let a = av[0];
    if (g.siege) a = g.grain < 2 ? 'rationen' : g.morale > 50 && g.rnd() < 0.4 ? 'ausfall' : g.siege.relief < 0.3 ? 'bote' : 'halten';
    else if (g.morale < 40) a = 'exerzieren';
    else if (g.grain < 4 && g.money > 400) a = 'schweiz';
    else if (g.men < 90 && g.money > 800) a = 'werben';
    else if (av.includes('raub') && g.rnd() < 0.4) a = 'raub';
    else if (g.money > 2500) a = 'bauen';
    else a = 'kontrib';
    g.dispatch({ t: 'act', a: a as any });
  }
  if (g.won) wins++;
  console.log(seed, g.won ? 'WIN ' : 'LOSS', seasonText(g.turn), `men ${g.men} grain ${g.grain} money ${g.money} mor ${g.morale} wrath ${g.wrath} def ${g.defense}`, g.won ? '' : g.endText.slice(0, 50));
}
console.log('wins', wins);
