# Mittelstufen-Gemeinschaftsraum

Originale Raumgrafik, mit dem eingebauten Bildgenerator erstellt. Das vorhandene
Lehrerzimmer war ausschliesslich eine Stil- und Kamerareferenz, keine Editiervorlage.
Der aktuelle Produktionsprompt steht in `prompt-ms3.txt`. Die neue Grafik wurde
mit dem eingebauten Bildgenerator aus der bisherigen Grafik als Stilreferenz
entwickelt: Rot, Gold, kleinere Moebel und ein grosszuegigerer Raum.

- `source-ms3.png`: aktuelle unveraenderte Originalgrafik, 1536 x 1024 Pixel.
- `floor-ms3.png`: Spielboden mit 960 x 640 Pixeln, 30 x 20 Kacheln zu 32 Pixeln.
- `fronts-ms3.png`: pixelgetreue Moebelvorderkanten; sonst transparent.
- `fire-ms3.png`: vorhandene Kaminanimation auf passenden Massstab verkleinert.
- `marker.png`: unsichtbare Kachel fuer Einstiege, Ausgaenge und Kollisionen.
- `layout.json`: Sitzpunkte, Aufstehpositionen, Blickrichtungen, Kollisionsrechtecke,
  Maskenpolygone und getrennte Gespraechsflaechen. Sitz- und Maskenkoordinaten
  verwenden das Referenzbild mit halber Quellaufloesung (768 x 512); `render`
  bestimmt die gemeinsame Umrechnung in Spielpixel. `collisionGrid` und `exit`
  verwenden direkt das fertige 30-x-20-Spielraster. `hearth.scale` skaliert die
  Flammen unabhaengig vom Zimmer.

Die Dateien `source.png`, `floor.png`, `fronts.png` und `prompt.txt` sind die erste
Version und bleiben unveraendert erhalten. Neue Bilddateinamen verhindern, dass
zwischengespeicherte alte Karten mit neu dimensionierten Tilesets vermischt werden.

Sitzanzahl: Sofa 3, Sessel 2, linke Fensterbank 1, Spieltisch 4, Kreativtisch 2.
Kaminflammen und Prasseln stammen aus den
bereits vorhandenen Village-Assets; das Feuer ist eine native Tileanimation.

`node tools/build-middle-common-room.cjs` erzeugt Ableitungen, TMJ und aktualisiert
den Raumeintrag im vorhandenen Vorschaumanifest.
`node tools/build-castle.cjs` erneuert zusaetzlich die Verbindungen und das Manifest.
Die interaktive Vorschau ist unter `../../index.html#mittelstufe` erreichbar.

Mehrpersonen-Audio und Sitzbelegung brauchen weiterhin einen Test mit echten
WorkAdventure-Nutzern. Die separate Browservorschau simuliert nur den eigenen Avatar.
