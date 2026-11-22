import { ZGame, Plan } from '../src/zuerich/game';
const run = (label: string, planF: (g: ZGame) => Plan, rapp = true) => {
  const res: Record<string, number> = {};
  for (let seed = 1; seed <= 40; seed++) {
    const g = new ZGame(seed);
    g.dispatch({ t: 'plan', plan: planF(g), rapperswil: rapp });
    let n = 0;
    while (g.phase === 'tick' && n++ < 100) g.dispatch({ t: 'tick', fr: g.aiFr(), ru: g.aiRu() });
    if (g.phase === 'evening') g.dispatch({ t: 'evening', fr: g.aiEveningFr(), ru: g.aiEveningRu() });
    res[g.grade] = (res[g.grade] || 0) + 1;
    if (seed <= 3) console.log(label, seed, g.grade, 'zone', g.zone, 'east', g.fr.east, 'front', g.front, 'pool', g.ru.pool, 'frLost', g.fr.lost, 'ruLost', g.ru.lost, 'cap', g.ru.captured, 'mort', Math.round(g.mortierProg));
  }
  console.log(label, res);
};
run('ai', g => ZGame.aiPlan(g.rnd));
run('hist', () => ({ site: 'dietikon', start: 'hist', mortier: 'schwach', menard: 'stark', soult: 'nacht' }));
run('wip', () => ({ site: 'wipkingen', start: 'hist', mortier: 'schwach', menard: 'stark', soult: 'nacht' }));
run('vog', () => ({ site: 'vogelsang', start: 'hist', mortier: 'schwach', menard: 'stark', soult: 'nacht' }));
run('spaet', () => ({ site: 'dietikon', start: 'spaet', mortier: 'keine', menard: 'keine', soult: 'binden' }));
run('mortStark', () => ({ site: 'dietikon', start: 'hist', mortier: 'stark', menard: 'stark', soult: 'nacht' }));
