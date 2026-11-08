# Begehbarer Schlossgrundriss

Modulare Schloss-Vorschau, 7. November 2026. Die vier grossen Karten zeigen noch
die Raum- und Laufplanung. Mittelstufenraum und Grosse Halle sind bereits als
detailreich gemalte Einrichtungen im Stil des bestehenden Lehrerzimmers umgesetzt.
Bestehende Karten, das Kino-Projekt und das Weihnachtsspiel werden nicht ersetzt.
Die neuen Karten bleiben eine separate Testvorschau. Bestehende Schuelereingaenge
werden nicht umgebogen. Nur das geschuetzte Lehrerzimmer bietet einen freiwilligen
Ruecklink in die neue Halle; sein bisheriger Ausgang bleibt erhalten.

## Sechs verbundene Karten

- `erdgeschoss.tmj`: Grosse Halle, Grundschule, Mittelstufe, Bibliothek,
  Musikzimmer, Museum, Atelier, Wohnfluegel, Spielesaal, Lehrersalon und Kinofoyer.
- `obergeschoss.tmj`: Oberstufe, Leseturm, Sternwarte, Wandelsaal, Festsaal und Werkstatt.
- `kino.tmj`: 48 ruhige Zuschauerplaetze vorne und 16 Gespraechsplaetze hinten.
- `umgebung.tmj`: Schlossansicht, Dorfplatz, Bachbruecke, Markt, Schlossgarten,
  Rutschenturm und vorbereiteter Rundkurs.
- `mittelstufe.tmj`: Gemalter Gemeinschaftsraum, vom Mittelstufenbereich im
  Erdgeschoss und aus der Grossen Halle erreichbar, mit Rueckweg zur Halle.
- `grosse-halle.tmj`: 48 x 32 Kacheln, 30 Sitzplaetze, fuenf Gespraechsbereiche,
  geschuetztes Rednerpult, Schlossbrett, Spielrunden, animierter Kamin und Portraet.
  Verbindet Mittelstufe, Kino, Bibliothek, Treppe, Schulpark und Lehrerzimmer.

Tiled kann jede TMJ direkt oeffnen. Tileset und Skriptpfade bleiben relativ.
Die sechs kleinen `.wam`-Dateien ergaenzen native Besprechungsbereiche, ohne
Grafiken zu duplizieren. Der Spieleinstieg ist
`https://together.deine-schule.com/~/castle-preview/grosse-halle.wam`.
Die alten Vorschau-TMJ-Links leiten vor dem Start ihrer Raumsteuerung dorthin
weiter und erhalten den passenden Ankunftspunkt. Die alten Schlosskarten
ausserhalb von `castle/` werden nicht umgeleitet.
Neue Fluegel werden als weitere Karten mit eigenen IDs und eindeutigen
Ankunftsebenen ergaenzt. Keine dreihundert einzeln gebauten Privatzimmer.

Die Verbindung zum vorhandenen Lehrerzimmer verwendet dessen geschuetzte
Originaladresse. Sein bisheriger Ausgang und seine Zugangspruefung bleiben
unveraendert. Der freiwillige Ruecklink stellt vor dem Kartenwechsel wieder auf.
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
Die WAM-Besprechungsbereiche uebernehmen dabei den Ton und verhindern weitere
Naehe-Gespraeche ueber die Tischgrenze hinweg. Die Skripte schalten deren
Mikrofonaufnahme nicht mehr ueber `disablePlayerProximityMeeting()` ab und
eroeffnen keine zweite, doppelte Audioverbindung.

Die WAM-Dateien werden bei jedem Kartenbau aus denselben TMJ-Gruppen und
Sitzdaten erzeugt. Nicht gruppierte Tische bekommen kleine eigene Bereiche;
Ruheplaetze im Kino bleiben ausgenommen. `tools/castle-wam.cjs` prueft
Ueberschneidungen. Nur diese sechs Wrapper werden nach
`/map-storage/castle-preview/` uebertragen; die Bilder bleiben auf GitHub.

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
Die Vorschau hat 207 Sitzplaetze. Sofas und weitere Einrichtungsgegenstaende sind
teilweise noch dekorative Platzhalter; nicht jede Sofagrafik ist bereits ein Sitz.
Fuer die Endgrafik folgen eigene Raumansichten, Vordergrundteile und individuell
ausgearbeitete Sitzecken. Der Grundriss wird vorher anhand echter Wege abgestimmt.

Im gemalten Mittelstufenraum sind alle zwoelf Sitzplaetze einzeln ausgerichtet:
drei Sofaplaetze, zwei Lesesessel, eine Fensterbank, vier Spieltischplaetze und
zwei Kreativplaetze. Moebelvorderkanten liegen vor den Avataren, der Boden dahinter.
Der Kamin verwendet die vorhandene native Feueranimation und leises Prasseln.
Das Schachbrett und die Kreativmaterialien sind derzeit Einrichtung, kein neuer
Schach- oder Zeicheneditor. Die drei Gespraechsbereiche sind voneinander getrennt.

Die Rot-Gold-Variante ist 30 x 20 statt 24 x 16 Kacheln gross. Die Raumflaeche ist
damit groesser, waehrend die einzelnen Stuehle und Sessel deutlich kleiner
gezeichnet sind. Die Spielfigur bleibt im normalen 32-Pixel-Massstab. Die
Vorschau verwendet ebenfalls einen 32 Pixel hohen Platzhalter, keinen
mitvergroesserten Avatar. Sitzpunkte, Masken, Hindernisse, Feuer und Gruppen
werden aus derselben aktuellen Raumvorlage erzeugt.
Die native Sitzsteuerung gleicht die Position zusaetzlich regelmaessig mit dem
Client ab, weil Bewegungsereignisse in der Live-Version veraltete Koordinaten
enthalten koennen. Laufende Sitz- und Rutschbewegungen werden dabei nicht ueberschrieben.

Die Raumgrafik wurde mit dem eingebauten Bildgenerator und dem Lehrerzimmer
als reiner Stilreferenz erstellt. Original, Produktionsprompt, 1:2 verkleinerter
Spielboden und pixelgetreue Vordergrundmaske liegen unter
`art/mittelstufe-20261107/`. `layout.json` dort ist die editierbare Quelle fuer
Sitze, Moebelmasken, Kollisionen und Gruppen. Neubau ueber
`node tools/build-middle-common-room.cjs`, oder zusammen mit allen Karten ueber
`node tools/build-castle.cjs`. Die Einrichtung des originalen Lehrerzimmers bleibt unveraendert.

## Grosse Halle und Ansagen

Die Halle hat getrennte Gruppen fuer Kaminrunde (6), zwei Tafeln (je 8),
Lehrerbank (4) und Spieltreff (4). Auch Stehende in diesen Bereichen gehoeren
zum jeweiligen Gespraech. Avatare bleiben im nativen 32-Pixel-Massstab.
Produktionsgrafik, Prompt und editierbare Geometrie liegen unter
`art/grosse-halle-20261107/`; Neubau: `node tools/build-great-hall.cjs`.

Auf dem Podest erscheint die Codeeingabe. Nur nach serverseitiger Pruefung
erhaelt genau eine Person die Mikrofonfreigabe fuer die Halle. Der Code ist
weder in der Karte noch in Skripten hinterlegt. Verlassen, Abmelden, Abbruch
oder ausbleibende Verbindung beenden die Ansage. Hintergrund-Tabs werden nicht
allein wegen Unsichtbarkeit getrennt; Browser und Mobilgeraete koennen Audio
dennoch unterbrechen. Ein Lautsprechersymbol entsperrt blockierte Wiedergabe.
Die normalen Tischgespraeche bleiben getrennt; die Ansage wird zusaetzlich gehoert.
Das Podest selbst ist nativ still, damit die Stimme nicht doppelt uebertragen wird.

Der isolierte Dienst unter `/castle-audio/` nutzt die vorhandene Anmeldung,
kurze Freigaben und getrennte LiveKit-Raeume. Berechtigungen, Bedrohungsgrenzen
und Betrieb sind in `../ops/hall-audio/README.md` dokumentiert.
Die Browser-Grundrissvorschau hat absichtlich keine nachgebaute Ansagefreigabe;
diese wird nur im echten WorkAdventure-Client angeboten.

Das oeffentliche Schlossbrett wird im Verwaltungsportal unter der bestehenden
Museumsverwaltung als `hallnotice01` / Schlossbrett gepflegt. Es verwendet
dieselben Uploads und Inhaltsarten. Ohne Eintrag bleibt es neutral leer.
Keine vertraulichen Kollegiumsmitteilungen dort veroeffentlichen.
Der Spieltreff oeffnet die sieben bestehenden Verwaltungs-Landeseiten; geaenderte
Raumlinks werden damit ohne erneutes Karten-Deployment uebernommen.

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
