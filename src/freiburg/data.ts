// Kapitel 2: Die Schlacht bei Freiburg, 3.–10. August 1644
import type { Entry, Slide } from '../history';

export type FSide = 'fr' | 'bav';
export type Terrain = 'plain' | 'valley' | 'hill' | 'forest' | 'city';
export type Kind = 'inf' | 'cav' | 'drag' | 'art' | 'train';

export interface MapNode { id: string; name: string; x: number; y: number; terrain: Terrain; info: Entry; vp?: { fr?: number; bav?: number } }
export interface UnitDef { id: string; side: FSide; name: string; kind: Kind; men: number; node: string; leader?: string }

export const NODES: MapNode[] = [
  { id: 'breisach', name: 'Breisach', x: 0.07, y: 0.42, terrain: 'city', info: { tag: 'hintergrund', title: 'Breisach', text: 'Die Festung am Rhein war seit 1638 in der Hand Bernhards von Sachsen-Weimar und danach Frankreichs. Von hier kamen die französischen Truppen und ihr Nachschub.' } },
  { id: 'ebene', name: 'Rheinebene', x: 0.3, y: 0.38, terrain: 'plain', info: { tag: 'hintergrund', title: 'Die Rheinebene', text: 'Offenes, flaches Land westlich von Freiburg. Hier ist Reiterei im Vorteil.' } },
  { id: 'batzenberg', name: 'Batzenberg', x: 0.3, y: 0.68, terrain: 'hill', info: { tag: 'belegt', src: ['fbwiki'], title: 'Batzenberg', text: 'Ein Hügel südwestlich des Schönbergs. Von hier zog die französische Hauptarmee unter Enghien auf das Schlachtfeld.' } },
  { id: 'ebringen', name: 'Ebringen', x: 0.42, y: 0.72, terrain: 'plain', info: { tag: 'belegt', src: ['fbwiki'], title: 'Ebringen', text: 'Dorf am Fuß des Schönbergs. Über Ebringen griff Enghien am 3. August frontal den Bohl an.' } },
  { id: 'bohl', name: 'Bohl (Schönberg)', x: 0.49, y: 0.6, terrain: 'hill', vp: { fr: 1, bav: 1 }, info: { tag: 'belegt', src: ['fbwiki'], title: 'Der Bohl am Schönberg', text: 'Die Bayern hatten auf dem Bohl Schanzen angelegt. Enghien stürmte sie am 3. August unter schweren Verlusten. Heute erinnert das Schlachtenkreuz auf dem Schönberg an die Toten.' } },
  { id: 'hexsued', name: 'Hexental (Süd)', x: 0.6, y: 0.88, terrain: 'valley', info: { tag: 'belegt', src: ['fbwiki'], title: 'Das Hexental', text: 'Turenne zog mit der ehemals weimarischen Armee durch das enge Hexental, um die Bayern in der Flanke zu fassen. Regen und schlechte Wege bremsten ihn.' } },
  { id: 'merzhausen', name: 'Merzhausen', x: 0.6, y: 0.62, terrain: 'valley', info: { tag: 'belegt', src: ['fbwiki'], title: 'Merzhausen', text: 'Dorf im Hexental zwischen Schönberg und Schlierberg. Wer es hält, verbindet oder trennt die beiden Stellungen.' } },
  { id: 'schlierberg', name: 'Schlierberg (Lorettoberg)', x: 0.58, y: 0.45, terrain: 'hill', vp: { fr: 2, bav: 2 }, info: { tag: 'belegt', src: ['fbwiki'], title: 'Der Schlierberg', text: 'Hierhin zog sich Mercy in der Nacht zum 4. August zurück und verschanzte sich. Am 5. August scheiterten fünf französische Stürme. Ein Gelübde aus der Schlacht führte später zum Bau der Lorettokapelle, der Berg heißt heute Lorettoberg.' } },
  { id: 'wonnhalde', name: 'Wonnhalde', x: 0.7, y: 0.52, terrain: 'forest', vp: { fr: 1 }, info: { tag: 'belegt', src: ['fbwiki'], title: 'Wonnhalde', text: 'Bewaldeter Hang zwischen Schlierberg und Schwarzwald. Ein Teil der Kämpfe am 5. August spielte sich hier ab.' } },
  { id: 'freiburg', name: 'Freiburg', x: 0.64, y: 0.3, terrain: 'city', vp: { fr: 4, bav: 3 }, info: { tag: 'hintergrund', src: ['fbwiki'], title: 'Freiburg im Breisgau', text: 'Die Stadt war kurz vor der Schlacht, Ende Juli 1644, von Mercy eingenommen worden. Die Franzosen kamen zu spät, um sie zu entsetzen.' } },
  { id: 'denzlingen', name: 'Denzlingen', x: 0.6, y: 0.08, terrain: 'plain', info: { tag: 'belegt', src: ['fbwiki'], title: 'Denzlingen', text: 'Am 9. August marschierte Turenne nach Norden über Denzlingen. Damit bedrohte er Mercys Verbindung durch das Glottertal und zwang ihn zum Rückzug.' } },
  { id: 'stpeter', name: 'St. Peter', x: 0.9, y: 0.2, terrain: 'forest', info: { tag: 'belegt', src: ['fbwiki'], title: 'St. Peter im Schwarzwald', text: 'Über das Kloster St. Peter zog sich Mercy am 10. August in den Schwarzwald zurück. Unterwegs verlor er Gepäck und Geschütze.' } },
];

export const EDGES: [string, string][] = [
  ['breisach', 'ebene'], ['breisach', 'batzenberg'], ['ebene', 'batzenberg'], ['ebene', 'freiburg'], ['ebene', 'denzlingen'],
  ['batzenberg', 'ebringen'], ['ebringen', 'bohl'], ['ebringen', 'hexsued'], ['hexsued', 'merzhausen'], ['bohl', 'merzhausen'],
  ['bohl', 'schlierberg'], ['merzhausen', 'schlierberg'], ['merzhausen', 'wonnhalde'], ['schlierberg', 'wonnhalde'], ['schlierberg', 'freiburg'],
  ['wonnhalde', 'freiburg'], ['wonnhalde', 'stpeter'], ['freiburg', 'stpeter'], ['freiburg', 'denzlingen'], ['denzlingen', 'stpeter'], ['ebene', 'bohl'],
];

export const UNITS: UnitDef[] = [
  { id: 'f1', side: 'fr', name: 'Enghiens Fußvolk I', kind: 'inf', men: 3500, node: 'ebringen', leader: 'Enghien' },
  { id: 'f2', side: 'fr', name: 'Enghiens Fußvolk II', kind: 'inf', men: 3000, node: 'batzenberg', leader: 'Enghien' },
  { id: 'f3', side: 'fr', name: 'Enghiens Reiterei', kind: 'cav', men: 2500, node: 'batzenberg', leader: 'Enghien' },
  { id: 'f4', side: 'fr', name: 'Französische Artillerie', kind: 'art', men: 900, node: 'batzenberg' },
  { id: 'f5', side: 'fr', name: 'Turennes Fußvolk (Weimarer)', kind: 'inf', men: 3500, node: 'hexsued', leader: 'Turenne' },
  { id: 'f6', side: 'fr', name: 'Weimarer Reiterei', kind: 'cav', men: 3000, node: 'hexsued', leader: 'Turenne' },
  { id: 'f7', side: 'fr', name: 'Dragoner', kind: 'drag', men: 900, node: 'ebene' },
  { id: 'b1', side: 'bav', name: 'Fußvolk auf dem Bohl', kind: 'inf', men: 2600, node: 'bohl', leader: 'Mercy' },
  { id: 'b2', side: 'bav', name: 'Fußvolk am Schlierberg', kind: 'inf', men: 3000, node: 'schlierberg', leader: 'Mercy' },
  { id: 'b3', side: 'bav', name: 'Kürassiere (Kaspar von Mercy)', kind: 'cav', men: 2000, node: 'merzhausen', leader: 'Kaspar von Mercy' },
  { id: 'b4', side: 'bav', name: 'Reiterei Johann von Werth', kind: 'cav', men: 3000, node: 'freiburg', leader: 'Werth' },
  { id: 'b5', side: 'bav', name: 'Bayerische Artillerie', kind: 'art', men: 700, node: 'bohl' },
  { id: 'b6', side: 'bav', name: 'Besatzung Freiburg', kind: 'inf', men: 1500, node: 'freiburg' },
  { id: 'b7', side: 'bav', name: 'Fußvolk in Reserve', kind: 'inf', men: 2200, node: 'wonnhalde' },
  { id: 'b8', side: 'bav', name: 'Tross (Gepäck, Vorräte)', kind: 'train', men: 400, node: 'freiburg' },
];

export const KIND_NAME: Record<Kind, string> = { inf: 'Fußvolk', cav: 'Reiterei', drag: 'Dragoner', art: 'Artillerie', train: 'Tross' };

export const FB_SOURCES: Record<string, { name: string; url: string }> = {
  fbwiki: { name: 'Wikipedia: Schlacht bei Freiburg im Breisgau', url: 'https://de.wikipedia.org/wiki/Schlacht_bei_Freiburg_im_Breisgau' },
  fbwikien: { name: 'Wikipedia (engl.): Battle of Freiburg', url: 'https://en.wikipedia.org/wiki/Battle_of_Freiburg' },
};

// 16 Halbtage: 3. August morgens bis 10. August abends
export const HALF = ['Morgen', 'Abend'];
export function fbDate(turn: number) { return `${3 + Math.floor(turn / 2)}. August 1644, ${HALF[turn % 2]}`; }
export const FIXED_RAIN = [1, 2, 3]; // 3. Aug abends, 4. Aug ganztags

export const FB_CHRONICLE: Entry[] = [
  { tag: 'belegt', src: ['fbwiki'], title: 'Der Angriff beginnt', text: 'Am 3. August greift der junge Herzog von Enghien die bayerischen Schanzen auf dem Bohl frontal über Ebringen an. Gleichzeitig soll Turenne durch das Hexental die Flanke der Bayern umgehen.' },
  { tag: 'belegt', src: ['fbwiki'], title: 'Regen und Dunkelheit', text: 'Regen und schlechte Wege halten Turenne im Hexental auf. In der Nacht weicht Mercy mit seinen Truppen vom Bohl auf den Schlierberg zurück und verschanzt sich dort neu.' },
  { tag: 'belegt', src: ['fbwiki'], title: '4. August: Regen', text: 'Den ganzen Tag regnet es. Nasses Pulver zündet nicht, die Männer beider Seiten sind erschöpft. Musketen sind im Regen fast nutzlos, es zählen Piken und Degen.' },
  { tag: 'hintergrund', title: 'Pike und Muskete', text: 'Ein Regiment Fußvolk bestand aus Musketieren und Pikenieren. Die Pikeniere mit ihren etwa fünf Meter langen Spießen schützten die Musketiere vor Reiterangriffen, während diese nachluden.' },
  { tag: 'belegt', src: ['fbwiki'], title: '5. August: Sturm auf den Schlierberg', text: 'Die Franzosen stürmen fünfmal gegen die Stellungen am Schlierberg. Beim vierten Sturm brechen sie ein. Kaspar von Mercy, der Bruder des Feldherrn, schließt die Lücke mit abgesessenen Kürassieren. Die Franzosen müssen abziehen.' },
  { tag: 'belegt', src: ['fbwiki'], title: 'Ein Gelübde', text: 'Die Verluste sind auf beiden Seiten furchtbar. Aus einem Gelübde im Zusammenhang mit der Schlacht entstand später die Lorettokapelle auf dem Schlierberg, der seitdem Lorettoberg heißt.' },
  { tag: 'hintergrund', title: 'Der junge Enghien', text: 'Louis de Bourbon, Herzog von Enghien, war 1644 erst 23 Jahre alt. Ein Jahr zuvor hatte er bei Rocroi gesiegt. Später wurde er als „der Große Condé“ berühmt.' },
  { tag: 'hintergrund', title: 'Turenne', text: 'Henri de La Tour d’Auvergne, Vicomte de Turenne, führte die ehemals weimarische Armee, die nach dem Tod Bernhards von Sachsen-Weimar 1639 in französische Dienste übergegangen war. Er gilt als einer der größten Feldherren seiner Zeit.' },
  { tag: 'hintergrund', title: 'Franz von Mercy', text: 'Der bayerische Feldmarschall Franz von Mercy war ein Meister der Verteidigung im Gelände. Er fiel ein Jahr später, 1645, in der Schlacht bei Alerheim.' },
  { tag: 'hintergrund', title: 'Johann von Werth', text: 'Der Reitergeneral Johann von Werth war wegen seiner kühnen Überfälle gefürchtet. 1638 geriet er in französische Gefangenschaft und kam erst 1642 im Austausch frei.' },
  { tag: 'erfunden', title: 'Zahlen im Spiel', text: 'Die Stärke der Armeen wird in den Quellen unterschiedlich angegeben, jeweils etwa 16.000 bis 20.000 Mann. Die Aufteilung in Verbände und ihre Startstellungen im Spiel sind vereinfacht und geschätzt.' },
  { tag: 'hintergrund', title: 'Kürassiere', text: 'Kürassiere waren schwere Reiter mit Brustpanzer, Helm, Pistolen und Degen. Abgesessen konnten sie auch eine Schanze verteidigen, wie am Schlierberg.' },
  { tag: 'hintergrund', title: 'Nachschub', text: 'Eine Armee von 20.000 Mann brauchte täglich Tonnen von Brot und Futter. Die Franzosen versorgten sich über Breisach, die Bayern über die Wege durch den Schwarzwald.' },
  { tag: 'hintergrund', title: 'Feldzeichen', text: 'Uniformen gab es kaum. Freund und Feind erkannte man an Feldbinden, Zweigen am Hut und Losungsworten. Die Farben der Spielsteine sind deshalb vereinfacht.' },
  { tag: 'belegt', src: ['fbwiki'], title: '9. August: Turenne zieht nach Norden', text: 'Turenne marschiert über Denzlingen und bedroht Mercys Verbindung durch das Glottertal in den Schwarzwald. Mercy muss handeln, wenn er nicht abgeschnitten werden will.' },
  { tag: 'belegt', src: ['fbwiki'], title: '10. August: Rückzug über St. Peter', text: 'Mercy zieht sich über St. Peter in den Schwarzwald zurück. Er verliert dabei Gepäck und Geschütze, bringt aber sein Heer in Sicherheit.' },
];

export const FB_EPILOG: Entry = {
  tag: 'belegt', src: ['fbwiki', 'fbwikien'], title: 'Wie es wirklich ausging',
  text: 'Die Schlacht bei Freiburg endete ohne klaren Sieger. Die Franzosen hatten sehr hohe Verluste und konnten die Bayern nicht vernichten, Mercy musste aber abziehen und Gepäck und Geschütze zurücklassen. Danach eroberten die Franzosen Philippsburg und weitere Orte am Rhein. Freiburg blieb in bayerischer Hand.',
};

export const FB_SLIDES: Slide[] = [
  { file: "Freiburg merian01.jpg", credit: 'Matthäus Merian, 1644', license: 'gemeinfrei', tag: 'hintergrund',
    title: 'Freiburg im Breisgau, 1644', text: 'Ende Juli hat der bayerische Feldmarschall Franz von Mercy die Stadt eingenommen. Nun nähert sich vom Rhein her das französische Heer.' },
  { file: "Plan des combats de Fribourg Donnés au mois d'Aoust 1644 - btv1b84933119.jpg", credit: 'Antoine Coquart, 1644 (BnF)', license: 'gemeinfrei', tag: 'belegt',
    title: 'Der Plan der Kämpfe', text: 'Eine französische Karte aus dem Jahr der Schlacht zeigt die Stellungen um Freiburg. Mercy hat sich auf den Höhen südlich der Stadt verschanzt.' },
  { file: 'Portret van Franz von Mercy, RP-P-1908-5133.jpg', credit: 'Rijksmuseum, 1649', license: 'CC0', tag: 'belegt',
    title: 'Franz von Mercy', text: 'Der Verteidiger: erfahren, vorsichtig und ein Meister im Ausnutzen des Geländes.' },
  { file: 'Justus van Egmont - Portrait of Louis de Bourbon, Prince of Condé.jpg', credit: 'Justus van Egmont, 17. Jh.', license: 'gemeinfrei', tag: 'belegt',
    title: 'Herzog von Enghien', text: 'Der Angreifer: 23 Jahre alt, kühn und siegesgewiss. An seiner Seite steht Turenne mit der ehemals weimarischen Armee.' },
  { file: 'Schlachtechrüz.jpg', credit: 'Foto: W-j-s', license: 'gemeinfrei', tag: 'belegt',
    title: '3. bis 10. August 1644', text: 'Eine der blutigsten Schlachten des Dreißigjährigen Krieges beginnt. Heute erinnert ein Kreuz auf dem Schönberg daran.' },
];
