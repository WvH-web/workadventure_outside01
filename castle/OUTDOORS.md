# Hof, Dorf und Garten

Ausbaustand `20261108-outdoors1`. Nur die getrennte Schlossvorschau wird
erweitert. Alte Schlosskarten, Village, Lehrerschutz und Originalfreizeitpark
bleiben unveraendert. Keine Veroeffentlichung privater Wege oder Codes.

## Spielbare Geometrie

Alle drei Karten haben 36 x 24 Kacheln, also 1152 x 768 Pixel. Avatare werden
nicht skaliert. Die eigens erstellte Picknickgarnitur ist 160 x 112 Pixel gross,
mit vier einzelnen Plaetzen, passenden Blickrichtungen, freien Aufstehpositionen
und aus echten Moebelpixeln abgeleiteten Vorderkanten. Keine Grundflaechen werden
als undurchsichtige Vordergrund-Rechtecke ueber Spieler gelegt.

- `umgebung.tmj`: Schlosshof, zwoelf Plaetze in drei getrennten Gruppen. Die
  vorhandene Hallentuer erreicht weiterhin `schlosstor`. Normale Dorf- und Gartenwege.
- `dorf.tmj`: Sternendorf mit zwoelf Plaetzen, drei Gruppen, Marktfronten und
  einer begehbaren Bachbruecke. Noah, Val und Rosa sind auf die drei Aussenkarten verteilt.
- `park.tmj`: Acht Plaetze, zwei Gruppen, kleine Wasserrutsche und Rundkurs.

Die Gruppen beziehen stehende Besucher mit ein. Gemeinsame Geschichten verwenden
je Karte eine getrennte, nicht dauerhafte Raumvariable. Bilder, Musik und
Ausstellungen verwenden vorhandene Verwaltungs-Endpunkte. Im Garten wird kein
weiteres ungeprueftes Fremdspiele-Portal fuer juengere Kinder ergaenzt.

## Fahrten und Grenzen

Die Rutsche verwendet die vorhandene Schloss-Fahrtsteuerung mit sichtbarer
Wegpunktfolge, Abbruchknopf und trockenem Endpunkt. Fahrtende, Fehler und Abbruch
mussen die normale Bewegung wiederherstellen. Kleine native Wasseranimationen
ersetzen grosse GIFs im laufenden Kartenbild.

Go-Karts nutzen die vorhandene Schul-Erweiterung `setTemporaryWoka` und die
bereits bereitgestellte Kartgrafik. Kein schwebendes Ersatzfenster. Normale
WorkAdventure-Bewegung, Kollisionen und Shift bleiben zustaendig; keine neue
Gangwahl, keine zusaetzliche Bewegungsphysik und keine Leertastenbelegung.
Aussteigen erfolgt ueber einen eigenen Knopf, automatisch ausserhalb des
Rundkurses und vor dem freiwilligen Rueckweg. Fehlgeschlagene Wiederherstellung
bietet einen erneuten Avatar-Reset an, sperrt aber nicht die Bewegungssteuerung.

Die bestehende temporaere Kartdarstellung ist weiterhin lokal: andere Personen
sehen den normalen Avatar an seiner wirklichen Position. Das ist weder eine
neue synchronisierte Fahrzeugdarstellung noch ein Rennen mit verbindlicher
Zeitmessung. Dafuer ist spaeter eigene, gepruefte Erweiterung notwendig.

## Grafiken und Wiederaufbau

Vier Originalgrafiken wurden mit dem integrierten Bildgenerator erstellt:

- `art/umgebung-20261108-full/room-source.png`, Beschreibung in `prompt.txt`.
- `art/dorf-20261108-full/room-source.png`, Beschreibung in `prompt.txt`.
- `art/park-20261108-full/room-source.png`, Beschreibung in `prompt.txt`.
- `art/outdoor-furniture-20261108/picnic-source.png`, Beschreibung in `prompt.txt`.

Originale bleiben erhalten. `tools/build-castle-outdoors.cjs` erzeugt daraus
Raster, Boden, alpha-maskierte Vorderkanten, Sitze, Kollisionen, Wasserframes,
Raumvariablen und native WAM-Bereiche. `--update-world` aktualisiert auch die
Vorschau und Knopfzuordnung. Der gesamte Schlossbau verwendet denselben Generator.
Keine fremden Spiel- oder Weihnachtsprojekt-Assets wurden kopiert.

## Pruefstand

Der komplette Neubau aller sechzehn registrierten Karten ist bestanden.
185 Kernpruefungen einschliesslich Rueckweg-Absicherung und Kart-Anbindung
sind nach dem kompletten Neubau bestanden.
Die erweiterte Grafik-Browserprobe pruefte alle sechzehn Karten, alle 32 neuen
Sitze, alle neuen Uebergaenge und den Rutschenabbruch in 1440, 390 und 320 Pixel
Breite ohne Layout- oder Browserfehler.

Die native Vierpersonenprobe fuer Sprache, Figuren, Rutsche, Kart, Shift und
Rueckweg steht noch aus. Der vorhandene Ansage- und Filmdienst wird nicht neu
gestartet. Keine Lastfreigabe fuer 400 Personen; serverseitige Klassen- und
Altersregeln sowie die anderen Punkte in `BUILD-STATUS.md` bleiben offen.
