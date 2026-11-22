# Kriegsjahre im Südwesten – Wildenstein 1642 und Freiburg 1644

Geschichtsspiele im Browser nach echten Ereignissen des Dreißigjährigen Krieges.

- **Kapitel 1: Belagerung von Wildenstein 1642** – Artillerie-Belagerung einer Felsenburg im Oberen Donautal (Leibertingen).
- **Kapitel 2: Schlacht bei Freiburg 1644** – rundenbasierte Strategie auf der Karte des Breisgaus: Enghien und Turenne gegen Mercy, 3.–10. August 1644. Halbtagesrunden, Regen und nasses Pulver, Schanzen, gemeinsame Angriffe, Siegpunkte, Rückzug über St. Peter.

**Spielen:** https://stanmangit.github.io/wildenstein-1642/ (läuft auf PC, Tablet und Handy im Querformat; über „Zum Startbildschirm hinzufügen“ als App installierbar, danach auch offline spielbar)

## Kapitel 1: Worum es geht

Am 10. August 1642 nehmen Truppen vom Hohentwiel die Burg durch einen Handstreich. Die Bayern belagern sie; am 4. September 1642 kapituliert die Besatzung ehrenvoll. Im Spiel führst du entweder die bayerischen Belagerer oder die Besatzung, gegen die KI oder zu zweit an einem Gerät.

- Echte Ballistik: Schwerkraft, Luftwiderstand (inkl. Schallmauer), Wind, Streuung, Pulverladung, Rohrzerspringer, Regen.
- Die Burg im Querschnitt mit den überlieferten Maßen: Halsgraben, Schildmauer 3 m, innerer Graben, Bastion mit 5,5 m / 3,7 m Kasemattenmauern. Mauern werden zerschossen, stürzen ein, Schutt füllt den Graben.
- Bresche schießen, Graben mit Faschinen füllen, stürmen oder einen Akkord anbieten; als Verteidiger Geschützmannschaften treffen und nachts Breschen verbauen.
- 25 Tage, jeder mit einem Eintrag aus der Chronik. Infotafeln zu allen Burgteilen und Geschützen.

## Was ist echt?

Im Spiel ist jede Angabe gekennzeichnet:

- **Belegt** – in den Quellen zur Burg belegt (Wikipedia „Burg Wildenstein (Leibertingen)“, burgenwelt.org, burgenarchiv.de).
- **Hintergrundwissen** – allgemein belegtes Wissen über die Zeit.
- **Erfunden fürs Spiel** – Truppenstärken, Geschütze der Bayern, Batteriestellungen und Schäden sind nicht überliefert und plausibel ergänzt.

## Entwicklung

```
npm install
npm run serve     # baut nach dist/ und startet http://localhost:8080
npm run check     # Typprüfung
```

Aufbau (`src/`):

- `world.ts` – Raster mit 0,5-m-Zellen, Materialien, Einsturz und Schuttrutschen
- `sim.ts` – Geschütztypen und Ballistik
- `game.ts` – Regeln, KI. Alle Spielzüge laufen als Befehle über `dispatch()`, aller Zufall über einen gesäten Zufallsgenerator. Für spätere Online-Duelle müssen nur Startwert und Befehle zwischen zwei Geräten ausgetauscht werden.
- `history.ts` – Chronik, Infotafeln, Quellen
- `music.ts` – Musik im Stil um 1600, im Browser erzeugt
- `freiburg/` – Kapitel 2: Karte, Regeln und KI
- `render.ts`, `main.ts` – Grafik und Bedienung

Jeder Push auf `main` wird automatisch über GitHub Actions auf GitHub Pages veröffentlicht.
