# Grosse Halle: Avatar-Massstab

Die Halle bleibt 1536 x 1024 Pixel bei 32 Pixeln pro Kachel. Avatare werden
nicht vergroessert. Die bestehenden fuenf Moebelgruppen werden reproduzierbar
auf 62,5 Prozent verkleinert. Das Dreiersofa ist damit rund 100 Pixel breit.
Die zusaetzliche Gemeinschaftstafel bietet zwoelf Plaetze. Insgesamt: 42 Sitze,
sechs getrennte Gespraechsbereiche.

## Bildquellen

`floor-source.png` wurde mit dem integrierten Bildgenerator aus der bisherigen
Halle als leerer Boden erzeugt. Prompt: [floor-prompt.txt](floor-prompt.txt).
`table-source.png` ist der neue freigestellte Tisch aus demselben Bildgenerator.
Prompt: [table-prompt.txt](table-prompt.txt). Er hat echte Transparenz und genau
sechs Stuehle je Laengsseite.

`source.png` ist die daraus erzeugte Spielgrafik. Die Architektur, Tueren, Treppe,
Kamin, das Podest, Schlossbrett und der Mittelgang werden pixelgetreu aus der
Originalgrafik uebernommen. Die Originale unter `../grosse-halle-20261107/`
bleiben unangetastet. Die alten Moebelgruppen behalten ihre eigenen Bildpixel;
sie werden mit transparenten Aussenkonturen verkleinert und neu platziert.

## Bearbeitung

`furniture.json` steuert Bildausschnitte, Masken, Platzierung und den neuen Tisch.
`tools/prepare-hall-furniture.cjs` erzeugt daraus Grafik und Geometrie. Sitzpunkte
beruecksichtigen weiterhin den nativen 16-Pixel-Fusspunktversatz. Die obere
Koerperpartie bleibt in den Vordergrundmasken frei. Kleine Tischkerne bleiben
auch bei der groben 32-Pixel-Kollision solide.

Neubau mit `node tools/build-great-hall.cjs --update-world`. Danach die neue
`grosse-halle.wam` nur im getrennten `castle-preview` veroeffentlichen. Der
Versionsparameter an der TMJ-Quelle verhindert das Mischen alter Grafik und
neuer Gespraechsbereiche. Das bisherige Schloss wird nicht ersetzt.

## Gepruefter Stand

Am 8. November 2026 wurden 90 Karten-, Sitz-, Audio- und Zugriffstests sowie
sechs Widgettests bestanden. Die Browservorschau wurde bei 1440, 390 und 320
Pixeln Breite mit allen 42 Hallensitzen geprueft.

Im veroeffentlichten WorkAdventure-Client lief ein Test mit vier getrennten
synthetischen Konten und erzeugtem Testton, ohne echte Mikrofone. Zwei parallele
Tischgruppen blieben auch an ihrer Grenze getrennt. Beide empfingen die
Hallendurchsage; ihr eigenes Gespraech lief weiter. Verlassen des Podests stoppte
die Ansage. Zuhoerer konnten keinen Ton in den Ansageraum senden. Ausserhalb
der Tischbereiche kehrte die Naehe-Kommunikation zurueck. Auch die beiden
entferntesten Plaetze der neuen Gemeinschaftstafel empfingen gegenseitig
decodierten, nichtstummen Ton. Keine Browserfehler wurden festgestellt.

Die nativen Spielbilder fuer Sofa, Lesesessel, Besucherbank und Gemeinschaftstafel
wurden visuell kontrolliert. Lokaler Pruefbericht und Bilder liegen ausserhalb
des oeffentlichen Repositories unter `../output/hall-live-qa/`, bezogen auf den
Repository-Stammordner. Dies ist kein Lasttest mit 400 Teilnehmern.
