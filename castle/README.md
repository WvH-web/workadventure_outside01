# Begehbarer Schlossgrundriss

Modulare Schloss-Vorschau, 7. November 2026. Die vier grossen Karten zeigen noch
die Raum- und Laufplanung. Der separate Mittelstufenraum ist bereits als
detailreich gemalte Einrichtung im Stil des bestehenden Lehrerzimmers umgesetzt.
Bestehende Karten, das Kino-Projekt und das Weihnachtsspiel werden nicht ersetzt.

## Fuenf verbundene Karten

- `erdgeschoss.tmj`: Grosse Halle, Grundschule, Mittelstufe, Bibliothek,
  Musikzimmer, Museum, Atelier, Wohnfluegel, Spielesaal, Lehrersalon und Kinofoyer.
- `obergeschoss.tmj`: Oberstufe, Leseturm, Sternwarte, Wandelsaal, Festsaal und Werkstatt.
- `kino.tmj`: 48 ruhige Zuschauerplaetze vorne und 16 Gespraechsplaetze hinten.
- `umgebung.tmj`: Schlossansicht, Dorfplatz, Bachbruecke, Markt, Schlossgarten,
  Rutschenturm und vorbereiteter Rundkurs.
- `mittelstufe.tmj`: Gemalter Gemeinschaftsraum, vom Mittelstufenbereich im
  Erdgeschoss erreichbar, mit Suedtuer zurueck zum Grundriss.

Tiled kann jede TMJ direkt oeffnen. Tileset und Skriptpfade bleiben relativ.
Neue Fluegel werden als weitere Karten mit eigenen IDs und eindeutigen
Ankunftsebenen ergaenzt. Keine dreihundert einzeln gebauten Privatzimmer.

Die Verbindung zum vorhandenen Lehrerzimmer verwendet dessen geschuetzte
Originaladresse. Sein bisheriger Ausgang und seine Zugangspruefung bleiben
unveraendert; die vollstaendige Rueckweg-Anbindung ist ein spaeterer Integrationsschritt.
Die Wohnraumtueren sind Platzhalter fuer die vorhandene Sternenhueter-Anwendung.
Es werden weder deren Testguthaben noch lokale Zimmerdaten veroeffentlicht.

## Gruppen und Kino

`conversationGroup`-Objekte definieren zusammenhaengende Gespraechsflaechen:
Bibliotheks-Lesekreis, Grundschul-Vorlesekreis, Leseturm und Gartenrunde sowie
Kaminrunde, Spieltisch und Kreativecke im neuen Mittelstufenraum.
Diese Gruppen haben Vorrang vor einzelnen Tischgruppen. Stehende und sitzende
Teilnehmer innerhalb einer Flaeche gehoeren zur gleichen nativen Unterhaltung.
Beim Verlassen wird die Gruppe verlassen und normale Naehe-Kommunikation wieder
freigegeben. Kamera- und Mikrofoneinstellungen werden nicht umgeschaltet.

Die Kinoruhezone verwendet zusaetzlich die native Silent-Eigenschaft. Dort wird
keine Gespraechsgruppe aufgebaut. Der bestehende synchrone Player laeuft im
Seitenfenster; dessen Anmeldung und Alterspruefung werden nicht nachgebaut.
Ein Platzwechsel innerhalb des Saals verlaesst die gemeinsame Filmflaeche nicht.

Die eigenstaendige Browservorschau simuliert Bewegung, Sitzen und Gruppenanzeige.
Sie stellt keine echten Videokonferenzen oder andere Online-Spieler nach.
Der native WorkAdventure-Betrieb und insbesondere Audio brauchen noch eine
Mehrpersonenabnahme im echten Client. Die funktionierende Kino-Anwendung wurde
nicht veraendert; ihr Seitenfenster wird in der Oberflaechenpruefung ersetzt,
damit kein Film oder fremder Account unbeabsichtigt geoeffnet wird.

## Animationen und Einrichtung

Kamine, Kerzen, Brunnen, Wasser, lebendiges Portraet, Uhr, gelegentliche
Buchbewegungen, dampfender Tee und ein seltenes Himmelsereignis sind als native
Tiled-Tileanimationen angelegt.
GIF-Exporte liegen unter `art/portrait.gif`, `fireplace.gif`, `fountain.gif` und
`book.gif`, `teacup.gif` und `clock.gif`. Fuer die Karte werden Spriteframes statt GIF-Dateien verwendet,
damit Ebenen, Kollisionen und Spieler weiterhin kontrollierbar bleiben.
Einige Effekte sind absichtlich selten; sie sind keine Wartezeit-Belohnungen.

Alle Moebel sind am 32-Pixel-Raster und an einer normalen Spielfigur ausgerichtet.
Die Vorschau hat 177 Sitzplaetze. Sofas und weitere Einrichtungsgegenstaende sind
teilweise noch dekorative Platzhalter; nicht jede Sofagrafik ist bereits ein Sitz.
Fuer die Endgrafik folgen eigene Raumansichten, Vordergrundteile und individuell
ausgearbeitete Sitzecken. Der Grundriss wird vorher anhand echter Wege abgestimmt.

Im gemalten Mittelstufenraum sind alle zwoelf Sitzplaetze einzeln ausgerichtet:
drei Sofaplaetze, zwei Lesesessel, eine Fensterbank, vier Spieltischplaetze und
zwei Kreativplaetze. Moebelvorderkanten liegen vor den Avataren, der Boden dahinter.
Der Kamin verwendet die vorhandene native Feueranimation und leises Prasseln.
Das Schachbrett und die Kreativmaterialien sind derzeit Einrichtung, kein neuer
Schach- oder Zeicheneditor. Die drei Gespraechsbereiche sind voneinander getrennt.

Die Raumgrafik wurde mit dem eingebauten Bildgenerator und dem Lehrerzimmer
als reiner Stilreferenz erstellt. Original, Produktionsprompt, 1:2 verkleinerter
Spielboden und pixelgetreue Vordergrundmaske liegen unter
`art/mittelstufe-20261107/`. `layout.json` dort ist die editierbare Quelle fuer
Sitze, Moebelmasken, Kollisionen und Gruppen. Neubau ueber
`node tools/build-middle-common-room.cjs`, oder zusammen mit allen Karten ueber
`node tools/build-castle.cjs`. Das originale Lehrerzimmer bleibt unveraendert.

Die neue Portraetgrafik wurde mit dem eingebauten Bildgenerator erzeugt.
`art/portrait-source.png` ist das unveraenderte Original. Produktionsprompt:
`art/portrait-prompt.txt`. Die uebrigen Grundrissgrafiken sind eigene,
programmgenerierte Spielgrafiken. Die Anordnung der Aussenwelt orientiert sich
am bereits vorhandenen Weihnachtsprojekt; dessen Grafiken werden nicht kopiert.

## Lokal pruefen

```powershell
node tools/serve-castle.cjs 4192
node --test tests/castle.test.mjs
node tools/check-castle-browser.cjs http://127.0.0.1:4192/
```

Browservorschau: `http://127.0.0.1:4192/`.
Die Laufprobe verwendet Pfeiltasten oder WASD, Shift fuer schnelleres Gehen,
die sichtbare Sitzaktion und Escape zum Aufstehen beziehungsweise Schliessen.
Auf schmalen Ansichten gibt es eine eingeblendete Laufsteuerung. Im Grundriss
kann ein Raum angeklickt werden. Nach Fokusverlust werden Lauftasten zurueckgesetzt.

Der lokale Server stellt nur den Ordner `castle` lesend bereit.
Zum Neubauen: `node tools/build-castle.cjs`. Benoetigt `sharp` und
`@napi-rs/canvas`, fuer Browserpruefungen zusaetzlich `playwright` mit Chromium.
Der vorhandene Codex-Abhaengigkeitsordner oder `CODEX_NODE_MODULES` kann diese
Pakete bereitstellen. Ein Neubau ueberschreibt die erzeugten TMJ-Dateien; manuelle
Tiled-Aenderungen vorher sichern und anschliessend in die Quelle uebernehmen.

Die Vorschau verwendet lokal mitgelieferte Lucide-Icons, Version 0.468.0.
Der unveraenderte Bibliotheksstand und seine Lizenz liegen unter `vendor/`.
Die Grundrissansicht laedt keine externen Icon- oder Schriftanbieter nach.
