# Hof, Dorf und Garten

Ausbaustand `20261108-outdoors3`. Nur die getrennte Schlossvorschau wird
erweitert. Alte Schlosskarten, Village, Lehrerschutz und Originalfreizeitpark
bleiben unveraendert. Keine Veroeffentlichung privater Wege oder Codes.

## Spielbare Geometrie

Alle drei Karten haben 36 x 24 Kacheln, also 1152 x 768 Pixel. Avatare werden
nicht skaliert. Die eigens erstellte Picknickgarnitur ist 128 x 96 Pixel gross,
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
189 Kernpruefungen einschliesslich Rueckweg-Absicherung, Kart-Anbindung und
passiver Bildfenster
sind nach dem kompletten Neubau bestanden.
Die erweiterte Grafik-Browserprobe pruefte alle sechzehn Karten, alle 32 neuen
Sitze, alle neuen Uebergaenge und den Rutschenabbruch in 1440, 390 und 320 Pixel
Breite ohne Layout- oder Browserfehler.

In Fassung 1 bestanden alle drei Karten die native Vierpersonenprobe fuer acht
Hoergruppen, 32 Sitze, gemeinsame Karten samt spaetem Beitritt, drei Dialoge,
mobile Spielflaechen und Rutsche samt Abbruch. Die Fahrzeugdarstellung wurde
geladen; eine ungeeignete Warteabfrage im unsichtbaren Skriptfenster brach den
weiteren Fahrzeugtest ab. Die Abfrage verwendet nun ausdrueckliches Polling.
Die Liveansicht zeigte ausserdem zu viel verdeckten Oberkoerper auf der vorderen
Bank. Fassung 2 verwendet kompaktere Moebel, passende Sitzpunkte und mehr freie
Oberkoerperpixel. Das geparkte Kart ist eine getrennt ausblendbare native Ebene.
Neue Boden- und Vordergrunddateinamen verhindern gemischte alte/neue Grafiken.

Eine zusaetzliche Klickprobe in Fassung 2 fand einen echten Fokusfehler:
Dekorative Karten-Iframes konnten die Tastatur uebernehmen. Die Einzelmessung
ergab 75 Pixel normale Bewegung, null nach dem Bildklick und 72 nach passiver
Konfiguration. Fassung 3 stellt nur die Figuren- und Museumsbilder vom vorhandenen
Inhaltsursprung bereit. Der kleine Helfer setzt ausschliesslich das eigene
enthaltende Iframe auf `pointer-events: none`, `tabIndex=-1` und `inert`.
Keine globalen Tastaturereignisse, keine neuen Karten-API- oder Medienrechte;
Dialoge und Galerien bleiben interaktiv. Das bestehende strenge CSP bleibt erhalten.

Der vollstaendige native Wiederholungsnachweis der Fassung 3 fuer Fokus, Kart,
Shift und Rueckweg steht noch aus. Der vorhandene Ansage- und Filmdienst wird nicht neu
gestartet. Keine Lastfreigabe fuer 400 Personen; serverseitige Klassen- und
Altersregeln sowie die anderen Punkte in `BUILD-STATUS.md` bleiben offen.
