# Mittelstufen-Gemeinschaftsraum

Originale Raumgrafik, mit dem eingebauten Bildgenerator erstellt. Das vorhandene
Lehrerzimmer war ausschliesslich eine Stil- und Kamerareferenz, keine Editiervorlage.
Der vollstaendige Produktionsprompt steht in `prompt.txt`.

- `source.png`: unveraendertes Original, 1536 x 1024 Pixel.
- `floor.png`: exakt auf 768 x 512 Pixel verkleinert, 24 x 16 Kacheln zu 32 Pixeln.
- `fronts.png`: unveraenderte Bildpixel der Moebelvorderkanten; sonst transparent.
- `marker.png`: unsichtbare Kachel fuer Einstiege, Ausgaenge und Kollisionen.
- `layout.json`: Sitzpunkte, Aufstehpositionen, Blickrichtungen, Kollisionsrechtecke,
  Maskenpolygone und getrennte Gespraechsflaechen in Spielpixeln.

Sitzanzahl: Sofa 3, Sessel 2, linke Fensterbank 1, Spieltisch 4, Kreativtisch 2.
Die rechte Fensterbank ist dekorativ. Kaminflammen und Prasseln stammen aus den
bereits vorhandenen Village-Assets; das Feuer ist eine native Tileanimation.

`node tools/build-middle-common-room.cjs` erzeugt die Ableitungen und die TMJ.
`node tools/build-castle.cjs` erneuert zusaetzlich die Verbindungen und das Manifest.
Die interaktive Vorschau ist unter `../../index.html#mittelstufe` erreichbar.

Mehrpersonen-Audio und Sitzbelegung brauchen weiterhin einen Test mit echten
WorkAdventure-Nutzern. Die separate Browservorschau simuliert nur den eigenen Avatar.
