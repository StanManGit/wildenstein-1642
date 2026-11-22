// Geschichtliche Inhalte. Jede Angabe trägt eine Kennzeichnung:
//  'belegt'      = in den genannten Quellen zur Burg Wildenstein belegt
//  'hintergrund' = allgemeines, gut belegtes Wissen über die Zeit (nicht speziell Wildenstein)
//  'erfunden'    = für das Spiel ergänzt, weil die Quellen dazu schweigen

export type Tag = 'belegt' | 'hintergrund' | 'erfunden';

export interface Entry { title: string; text: string; tag: Tag; src?: string[] }

export const SOURCES: Record<string, { name: string; url: string }> = {
  wiki: { name: 'Wikipedia: Burg Wildenstein (Leibertingen)', url: 'https://de.wikipedia.org/wiki/Burg_Wildenstein_(Leibertingen)' },
  burgenwelt: { name: 'burgenwelt.org: Burg Wildenstein', url: 'https://www.burgenwelt.org/deutschland/wildenstein/object.php' },
  burgenarchiv: { name: 'burgenarchiv.de: Burg Wildenstein', url: 'https://www.burgenarchiv.de/burg_wildenstein_in_baden_wuerttemberg' },
  krieg: { name: 'Wikipedia: Dreißigjähriger Krieg', url: 'https://de.wikipedia.org/wiki/Drei%C3%9Figj%C3%A4hriger_Krieg' },
  twiel: { name: 'Wikipedia: Festung Hohentwiel', url: 'https://de.wikipedia.org/wiki/Festung_Hohentwiel' },
  kartaune: { name: 'Wikipedia: Kartaune', url: 'https://de.wikipedia.org/wiki/Kartaune' },
  zimmern: { name: 'Wikipedia: Zimmerische Chronik', url: 'https://de.wikipedia.org/wiki/Zimmerische_Chronik' },
};

export const PROLOG: Entry[] = [
  {
    tag: 'belegt', src: ['wiki', 'burgenwelt'],
    title: 'Sonntag, 10. August 1642: Die Burg fällt durch Überraschung',
    text: 'Der Kommandant der Burg Wildenstein ist mit drei seiner vier Musketiere auf einem Fest in Meßkirch. Truppen von der Festung Hohentwiel nutzen die Gelegenheit und dringen durch eine Schießscharte in die Burg ein. Ob Verrat im Spiel war, ist umstritten. Der Name des Kommandanten wird in den Quellen unterschiedlich angegeben (Jacob Bürklin bzw. „Junker Rosenfeld“).',
  },
  {
    tag: 'hintergrund', src: ['krieg', 'twiel'],
    title: 'Der Krieg im 24. Jahr',
    text: 'Seit 1618 tobt der Dreißigjährige Krieg. Schwaben ist verwüstet, Dörfer sind entvölkert. Der Hohentwiel bei Singen wird von Konrad Widerholt für das protestantische Herzogtum Württemberg gehalten und von dort aus streifen Truppen durch das Land. Das katholische Kurfürstentum Bayern kämpft auf Seiten des Kaisers.',
  },
  {
    tag: 'erfunden',
    title: 'Was im Spiel ergänzt ist',
    text: 'Wie viele Soldaten und Geschütze die Bayern vor Wildenstein hatten, wo ihre Batterien standen und welchen Schaden sie anrichteten, ist nicht überliefert. Diese Werte sind im Spiel plausibel geschätzt: rund 700 Bayern mit zwei Halben Kartaunen und einem Mörser gegen etwa 45 Mann Besatzung. Alles Erfundene ist im Spiel orange markiert.',
  },
];

// Ein Eintrag pro Belagerungstag (Tag 1 = 11. August 1642)
export const CHRONICLE: Entry[] = [
  { tag: 'hintergrund', title: 'Die Bayern rücken an', src: ['wiki'], text: 'Die Burg kann nur von der Hochfläche im Nordosten angegriffen werden. Auf allen anderen Seiten fällt der Fels rund 200 Meter tief zur Donau ab. Genau dort, auf der Hochfläche, müssen die Belagerer ihre Batterien bauen.' },
  { tag: 'hintergrund', title: 'Schanzkörbe', text: 'Geschütze stehen hinter Schanzkörben: mannshohe Weidenkörbe, mit Erde gefüllt. Erde schluckt Kanonenkugeln besser als Stein, denn sie splittert nicht.' },
  { tag: 'belegt', title: 'Der äußere Halsgraben', src: ['wiki', 'burgenarchiv'], text: 'Vor der Vorburg liegt ein in den Fels gehauener Halsgraben, 15 bis 20 Meter breit und 20 bis 26 Meter tief. Er trennt den Burgfelsen von der Hochfläche. Eine Zugbrücke führte darüber.' },
  { tag: 'belegt', title: 'Die Schildmauer', src: ['wiki', 'burgenarchiv'], text: 'Die Schildmauer der Vorburg ist 74 Meter lang und 3 Meter dick, mit gedecktem Wehrgang. Zwei runde Flankentürme mit Schießscharten bestreichen den Graben. Im Spiel siehst du die Mauer im Querschnitt.' },
  { tag: 'hintergrund', title: 'Wie man eine Bresche schießt', text: 'Belagerer zielten möglichst tief auf die Mauer, um sie von unten auszuhöhlen. Bricht der Fuß weg, stürzt der Rest hinterher. Der Schutt bildet eine Rampe, über die man stürmen kann. Genau so funktioniert auch der Einsturz im Spiel.' },
  { tag: 'hintergrund', title: 'Schwarzpulver', text: 'Schießpulver bestand aus etwa drei Vierteln Salpeter, dazu Holzkohle und Schwefel. Bei Regen wurde es feucht und versagte. Zu viel Ladung konnte das Rohr zerreißen und die eigene Mannschaft töten.' },
  { tag: 'belegt', title: 'Die Bayern stürmen', src: ['wiki', 'burgenwelt'], text: 'Die Quellen berichten, dass bayerische Sturmangriffe auf die Burg mit Verlusten scheiterten. An welchen Tagen das geschah, ist nicht überliefert.' },
  { tag: 'hintergrund', title: 'Faschinen', text: 'Um einen Graben zu überwinden, warfen Belagerer Faschinen hinein: dicke Bündel aus Reisig. Dabei standen die Schanzarbeiter oft im Feuer der Verteidiger.' },
  { tag: 'belegt', title: 'Die Zugbrücken', src: ['wiki'], text: 'Wildenstein hat zwei Zugbrücken, die gegeneinander versetzt liegen. Wer die erste überwand, stand nicht direkt vor der zweiten, sondern musste unter Beschuss die Richtung ändern.' },
  { tag: 'hintergrund', title: 'Kalender im Krieg', text: 'Katholische Länder wie Bayern rechneten seit 1582 nach dem neuen, gregorianischen Kalender. Das protestantische Württemberg blieb beim alten julianischen Kalender, der zehn Tage zurücklag. Ein und derselbe Tag hatte so je nach Lager ein anderes Datum.' },
  { tag: 'belegt', title: 'Der innere Graben', src: ['wiki', 'burgenarchiv'], text: 'Zwischen Vorburg und Hauptburg liegt ein zweiter Graben, etwa 40 mal 20 Meter groß und 13 bis 16 Meter tief. Selbst wer die Vorburg nahm, stand vor einem neuen Hindernis.' },
  { tag: 'hintergrund', title: 'Musketiere', text: 'Ein Musketier trug eine Luntenschlossmuskete, die mit einer glimmenden Schnur gezündet wurde. Ein geübter Schütze schaffte etwa einen Schuss pro Minute. Nachts verriet die glimmende Lunte seine Position.' },
  { tag: 'belegt', title: 'Die Hauptbastion', src: ['wiki', 'burgenarchiv'], text: 'Die Hauptbastion misst etwa 40 mal 20 bis 25 Meter. Ihre Kasemattenmauern sind unten 5,5 Meter dick, oben 3,7 Meter. In zwei Stockwerken liegen Geschützscharten.' },
  { tag: 'hintergrund', title: 'Akkord', text: 'Eine Belagerung endete oft mit einem Akkord, einem Übergabevertrag. Bei einer ehrenvollen Kapitulation durfte die Besatzung mit Waffen und Gepäck abziehen. Wer dagegen erstürmt wurde, hatte nach Kriegsbrauch kaum Gnade zu erwarten.' },
  { tag: 'belegt', title: 'Der geknickte Torgang', src: ['wiki'], text: 'Der Weg in die Hauptburg führt durch einen geknickten Torgang mit Mordloch. Angreifer, die bis hierher kamen, konnten von oben beschossen werden.' },
  { tag: 'hintergrund', title: 'Die Zimmerische Chronik', src: ['zimmern'], text: 'Wildenstein gehörte lange den Herren von Zimmern. Graf Froben Christoph von Zimmern schrieb im 16. Jahrhundert die Zimmerische Chronik, eine der berühmtesten Familienchroniken Deutschlands, voller Geschichten aus dem Donautal.' },
  { tag: 'belegt', title: 'Eine frühe Artilleriefestung', src: ['wiki'], text: 'Schon ab 1514 ließ Gottfried Werner von Zimmern Wildenstein zu einer Festung für das Zeitalter der Feuerwaffen ausbauen: dicke Mauern, Kasematten und Schießscharten statt hoher, dünner Ritterburgmauern.' },
  { tag: 'belegt', title: 'Die Zisterne', src: ['wiki', 'burgenarchiv'], text: 'Auf dem Felsen gibt es keine Quelle. Eine 17 Meter tiefe Zisterne sammelte Regenwasser. Ohne sie hätte keine Besatzung eine Belagerung überstanden.' },
  { tag: 'hintergrund', title: 'Seuchen und Hunger', text: 'Mehr Menschen starben im Dreißigjährigen Krieg an Pest, Ruhr und Hunger als in Schlachten. Auch Belagerungsheere litten in ihren Lagern unter Krankheiten, je länger sie vor einer Festung lagen.' },
  { tag: 'belegt', title: 'Der Kommandantenturm', src: ['wiki'], text: 'Über der Bastion erhebt sich der Kommandantenturm. Ein offener Saal darauf diente als Plattform für schwerere Geschütze.' },
  { tag: 'hintergrund', title: 'Der Hohentwiel', src: ['twiel'], text: 'Die Festung Hohentwiel, von der die Eroberer Wildensteins kamen, wurde im Dreißigjährigen Krieg mehrfach belagert, aber nie eingenommen. Ihr Kommandant Konrad Widerholt gilt bis heute als Held der Region.' },
  { tag: 'hintergrund', title: 'Herbst naht', text: 'Belagerungen waren teuer. Sold, Futter für die Zugpferde und Pulver mussten herangeschafft werden. Mit Herbstregen wurden Wege und Laufgräben zu Schlamm. Die Zeit arbeitete auch gegen die Belagerer.' },
  { tag: 'belegt', title: 'Oberstleutnant von Marmont', src: ['wiki', 'burgenwelt'], text: 'Den Befehl über die bayerischen Truppen vor Wildenstein führte laut den Quellen Oberstleutnant von Marmont. Ihm übergab die Besatzung schließlich die Burg.' },
  { tag: 'hintergrund', title: 'Kartaunen', src: ['kartaune'], text: 'Die schwerste übliche Belagerungskanone, die ganze Kartaune, verschoss 48-pfündige Kugeln und wog über drei Tonnen. Sie schaffte nur 8 bis 10 Schuss am Tag, weil das Rohr abkühlen musste.' },
  { tag: 'belegt', title: '4. September 1642: Übergabe', src: ['wiki', 'burgenwelt'], text: 'An diesem Tag übergab die Besatzung die Burg mit einer ehrenvollen Kapitulation an Oberstleutnant von Marmont. Wildenstein blieb bis 1649 in bayerischer Hand, also über das Kriegsende 1648 hinaus.' },
];

export const EPILOG: Entry = {
  tag: 'belegt', src: ['wiki'],
  title: 'Wie es wirklich ausging',
  text: 'Am 4. September 1642 kapitulierte die Besatzung ehrenvoll vor den Bayern unter Oberstleutnant von Marmont, nach kurzer Belagerung und gescheiterten Sturmangriffen. 1648 beendete der Westfälische Friede den Krieg, 1649 zogen die Bayern ab. Die Burg steht noch heute über dem Donautal und ist eine Jugendherberge.',
};

// Infotafeln: Rechtecke in Weltkoordinaten (x0, x1, y0, y1)
export interface Spot extends Entry { x0: number; x1: number; y0: number; y1: number }

export const SPOTS: Spot[] = [
  { x0: 422, x1: 445, y0: 776, y1: 800, tag: 'belegt', src: ['wiki', 'burgenarchiv'], title: 'Äußerer Halsgraben', text: '15 bis 20 m breit, 20 bis 26 m tief, in den Fels gehauen. Im Spiel 17 m breit und 22 m tief. Wer stürmen will, muss ihn erst mit Faschinen und Schutt auffüllen.' },
  { x0: 444, x1: 452, y0: 800, y1: 815, tag: 'belegt', src: ['wiki', 'burgenarchiv'], title: 'Schildmauer der Vorburg', text: '74 m lang, 3 m dick, mit gedecktem Wehrgang und zwei runden Flankentürmen mit Schießscharten (im Hintergrund). Höhe im Spiel: 12 m (geschätzt).' },
  { x0: 452, x1: 478, y0: 800, y1: 811, tag: 'belegt', src: ['wiki'], title: 'Vorburg', text: 'Der äußere Burghof zwischen Schildmauer und innerem Graben. Das Wirtschaftsgebäude ist im Spiel vereinfacht dargestellt.' },
  { x0: 478, x1: 498, y0: 785, y1: 800, tag: 'belegt', src: ['wiki', 'burgenarchiv'], title: 'Innerer Graben', text: 'Etwa 40 x 20 m groß und 13 bis 16 m tief. Im Spiel 14 m tief. Die zweite Zugbrücke liegt versetzt zur ersten.' },
  { x0: 498, x1: 523, y0: 786, y1: 823, tag: 'belegt', src: ['wiki', 'burgenarchiv'], title: 'Hauptbastion', text: 'Etwa 40 x 20–25 m. Kasemattenmauern unten 5,5 m, oben 3,7 m dick, zwei Etagen mit Geschützscharten. Im Spiel genau mit diesen Mauerstärken nachgebaut.' },
  { x0: 523, x1: 533, y0: 800, y1: 845, tag: 'belegt', src: ['wiki'], title: 'Kommandantenturm', text: 'Mit offenem Saal (Exerziersaal) als Plattform für schwerere Geschütze. Höhe im Spiel geschätzt.' },
  { x0: 533, x1: 557, y0: 800, y1: 827, tag: 'belegt', src: ['wiki', 'burgenarchiv'], title: 'Palas', text: 'Wohnbau, etwa 22 x 15 m. In der Burg gab es außerdem eine Kapelle und eine 17 m tiefe Zisterne.' },
  { x0: 557, x1: 620, y0: 598, y1: 800, tag: 'belegt', src: ['wiki'], title: 'Felssporn über der Donau', text: 'Die Burg steht auf einem Kalkfelsen rund 200 m über der Donau. Von dieser Seite war sie nicht angreifbar.' },
];

export const GUNINFO_NOTE = 'Belegt ist nur, dass die Scharten der Burg für Hakenbüchsen und Falkonette gebaut waren. Welche Geschütze die Bayern mitbrachten, ist nicht überliefert (erfunden: zwei Halbe Kartaunen und ein Mörser).';

export function tagLabel(t: Tag) {
  return t === 'belegt' ? 'Belegt' : t === 'hintergrund' ? 'Hintergrundwissen' : 'Erfunden fürs Spiel';
}

export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export function dateOf(day: number) {
  // Tag 1 = Montag, 11. August 1642 (10. August war laut Quellen ein Sonntag)
  const d = 10 + day;
  const inAug = d <= 31;
  const md = inAug ? d : d - 31;
  return `${WD[day % 7]}, ${md}. ${inAug ? 'August' : 'September'} 1642`;
}

// Vorspann: echte Bilder von Wikimedia Commons (Lizenzen geprüft, siehe IMAGES.md)
export interface Slide { file: string; credit: string; license: string; title: string; text: string; tag: Tag }
export const commonsUrl = (file: string, width = 1600) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
export const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;

export const SLIDES: Slide[] = [
  { file: 'Donautal bei Beuron mit Wildenstein.jpg', credit: 'Foto: Andreas Praefcke, 2007', license: 'CC BY 3.0', tag: 'belegt',
    title: 'Das Obere Donautal', text: 'Auf einem Kalkfelsen, rund 200 Meter über der Donau, steht die Burg Wildenstein. Angreifen kann man sie nur von der Hochfläche im Nordosten.' },
  { file: 'De Merian Sueviae 287.jpg', credit: 'Matthäus Merian, Topographia Sueviae, 1643', license: 'gemeinfrei', tag: 'hintergrund',
    title: 'Schwaben im Krieg', text: 'Seit 1618 tobt der Dreißigjährige Krieg. Merians Kupferstiche zeigen Burgen und Städte Schwabens, wie sie die Menschen damals sahen.' },
  { file: 'Bartlett wildenstein.jpg', credit: 'William Henry Bartlett, 1840', license: 'gemeinfrei', tag: 'belegt',
    title: 'Sonntag, 10. August 1642', text: 'Der Kommandant feiert mit drei seiner vier Musketiere auf einem Fest in Meßkirch. Truppen vom Hohentwiel steigen durch eine Schießscharte ein. Die Burg ist verloren, ohne dass ein Schuss fällt.' },
  { file: 'Kunstdenkmäler KN 1887 S413 Wildenstein Grundriss.jpg', credit: 'Josef Durm, Die Kunstdenkmäler des Großherzogthums Baden, 1887', license: 'gemeinfrei', tag: 'belegt',
    title: 'Die Bayern rücken an', text: 'Zwei Gräben, eine drei Meter dicke Schildmauer und eine Bastion mit fünfeinhalb Meter starken Mauern. Bayerische Truppen schließen die Burg ein. Was sie mitbrachten, ist nicht überliefert.' },
  { file: 'Landappbw 467414 1818 Burg Wildenstein bei Leibertingen.jpg', credit: 'Foto: Roland Knobloch, 2021', license: 'CC0', tag: 'belegt',
    title: '25 Tage', text: 'Die Burg steht bis heute. Wie die Belagerung ausging, erfährst du am Ende. Jetzt liegt es an dir.' },
];

export const MUSIC_NOTE: Entry = {
  tag: 'hintergrund', title: 'Musik um 1600',
  text: 'Im Krieg gaben Trommler und Pfeifer die Signale: zum Sammeln, zum Marsch, zum Sturm, und ein Trommler mit weißer Fahne überbrachte Verhandlungsangebote. Zum Tanz spielten Schalmeien, Dudelsäcke, Lauten und Fiedeln. Michael Praetorius veröffentlichte 1612 mit „Terpsichore“ eine Sammlung von über 300 Tänzen. Die Musik in diesem Spiel ist eine eigene Komposition im Stil der Zeit, kein Originalstück.',
};
