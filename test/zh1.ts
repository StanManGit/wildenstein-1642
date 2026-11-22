import { ZGame, hhmm } from '../src/zuerich/game';
const g = new ZGame(5);
g.dispatch({ t: 'plan', plan: { site: 'dietikon', start: 'hist', mortier: 'schwach', menard: 'stark', soult: 'nacht' }, rapperswil: true });
while (g.phase === 'tick') { const f = g.aiFr(), r = g.aiRu(); const t = hhmm(g.h); g.dispatch({ t: 'tick', fr: f, ru: r }); console.log(t, f, JSON.stringify(r), 'z', g.zone, 'W', g.fr.west, 'E', g.fr.east, 'front', g.front, 'pool', g.ru.pool, 'br', Math.round(g.bridge), g.report.join(' | ').slice(0, 160)); }
g.dispatch({ t: 'evening', fr: g.aiEveningFr(), ru: g.aiEveningRu() }); console.log(g.grade);
