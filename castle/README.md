# Begehbarer Schlossgrundriss

Modulare Schloss-Vorschau, ab 7. November 2026. Drei Karten zeigen noch
die Raum- und Laufplanung. Mittelstufenraum, Grosse Halle, Kino und Bibliothek sind bereits als
detailreich gemalte Einrichtungen im Stil des bestehenden Lehrerzimmers umgesetzt.
Bestehende Karten, das Kino-Projekt und das Weihnachtsspiel werden nicht ersetzt.
Die neuen Karten bleiben eine separate Testvorschau. Bestehende Schuelereingaenge
werden nicht umgebogen. Nur das geschuetzte Lehrerzimmer bietet einen freiwilligen
Ruecklink in die neue Halle; sein bisheriger Ausgang bleibt erhalten.

## Verbindlicher Einrichtungs-Massstab

Am 8. November 2026 hat der Nutzer die Groessen der Grossen Halle ausdruecklich
als passend bestaetigt. Diese Fassung ist die Referenz fuer weitere Schlossraeume:
`art/grosse-halle-20261108-scale/source.png` und die dortige `layout.json`.

- Raster: 32 x 32 Pixel; native Spielfigur: 32 Pixel hoch, nicht vergroessern.
- Dreiersofa: rund 100 Pixel breit; Stuehle an Tafeln: etwa 28 bis 36 Pixel hoch;
  Lesesessel: etwa 39 bis 50 Pixel hoch, jeweils in der fertigen Spielgrafik.
- Der neue Gemeinschaftstisch hat zwoelf einzeln nutzbare Plaetze mit etwa
  40 Pixel Sitzabstand. Lange Tafeln erhalten mehr Plaetze, keine Riesenstuehle.
- Sitzhoehe, Blickrichtung und Vordergrundmasken muessen zu echten Avataren
  passen. Koepfe und Oberkoerper bleiben sichtbar; Aufstehen fuehrt auf freie Wege.
- Die 62,5 Prozent beziehen sich nur auf die vorherige Halleneinrichtung.
  Neue Grafiken am fertigen Referenzmassstab messen, nicht pauschal erneut skalieren.
- Jeden neuen Raum im nativen Client mit stehenden und sitzenden Avataren sowie
  mehreren Teilnehmern pruefen. Gespraechsbereiche aus derselben Geometrie ableiten.

Die bestaetigte Einrichtung nicht ohne neuen Auftrag umskalieren. Neue Raeume
weiterhin einzeln in der getrennten Vorschau ausbauen; das bisherige Schloss
bleibt bis zur ausdruecklichen Freigabe unveraendert.

## Sieben verbundene Karten

- `erdgeschoss.tmj`: Grosse Halle, Grundschule, Mittelstufe, Bibliothek,
  Musikzimmer, Museum, Atelier, Wohnfluegel, Spielesaal, Lehrersalon und Kinofoyer.
- `obergeschoss.tmj`: Oberstufe, Leseturm, Sternwarte, Wandelsaal, Festsaal und Werkstatt.
- `kino.tmj`: Kompaktes gemaltes Schlosskino, 30 x 28 Kacheln, 48 ruhige
  Zuschauerplaetze vorne und vier Gespraechstische mit insgesamt 16 Plaetzen hinten.
- `bibliothek.tmj`: Kleine gemalte Schlossbibliothek, 28 x 22 Kacheln, drei
  getrennte Lesegruppen und 13 Sitzplaetze, mit Fensternische und animiertem Kamin.
- `umgebung.tmj`: Schlossansicht, Dorfplatz, Bachbruecke, Markt, Schlossgarten,
  Rutschenturm und vorbereiteter Rundkurs.
- `mittelstufe.tmj`: Gemalter Gemeinschaftsraum, vom Mittelstufenbereich im
  Erdgeschoss und aus der Grossen Halle erreichbar, mit Rueckweg zur Halle.
- `grosse-halle.tmj`: 48 x 32 Kacheln, 42 Sitzplaetze, sechs Gespraechsbereiche,
  geschuetztes Rednerpult, Schlossbrett, Spielrunden, animierter Kamin und Portraet.
  Verbindet Mittelstufe, Kino, Bibliothek, Treppe, Schulpark und Lehrerzimmer.

Tiled kann jede TMJ direkt oeffnen. Tileset und Skriptpfade bleiben relativ.
Die sieben kleinen `.wam`-Dateien ergaenzen native Besprechungsbereiche, ohne
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
Ueberschneidungen. Nur diese sieben Wrapper werden nach
`/map-storage/castle-preview/` uebertragen; die Bilder bleiben auf GitHub.

Die Kinoruhezone verwendet zusaetzlich die native Silent-Eigenschaft. Dort wird
keine Gespraechsgruppe aufgebaut. Der bestehende synchrone Player laeuft im
Seitenfenster; dessen Anmeldung und Alterspruefung werden nicht nachgebaut.
Ein Platzwechsel innerhalb des Saals verlaesst die gemeinsame Filmflaeche nicht.

Das Kino verwendet die bestaetigte Halleneinrichtung als Massstabs- und
Stilreferenz. Die Kinosessel sind 32 x 36 Pixel gross. Architektur, Sessel und
die kleinen Popcorn-Tische wurden als getrennte Bildquellen mit dem integrierten
Bildgenerator erstellt. Leinwand, Vorhaenge, Buecher, Pflanzen, Decken und
Filmrequisiten bilden einen kleinen Kinosaal; sechs Kerzen flackern nativ.
Die neutrale Leinwandgrafik ist kein zweiter Filmplayer. Quellen, Produktionsprompts
und editierbare Anordnung: `art/kino-20261108/`. Neubau:
`node tools/build-cinema.cjs --update-world`. Die vorhandene Kino-Anwendung und
das alte Schloss werden nicht ersetzt. Zwei kleine Aufsteller am Mittelgang zeigen
mit Pfeilen auf die ruhige Filmzone vorne und die Gespraechsplaetze hinten.
Ihre Grafik stammt vom integrierten Bildgenerator; die Schrift wird beim Bau gesetzt.
Die Kinoseite oeffnet automatisch beim Betreten. Manuelles Schliessen wird bis
zum naechsten Besuch respektiert; Platzwechsel laden den Film nicht neu.
Alle 64 Plaetze wurden in der
Browservorschau bei 1440, 390 und 320 Pixel Breite geprueft; der Film-Endpunkt
wird bei automatisierten Pruefungen durch eine neutrale Testseite ersetzt.

Die Kino-Fassung `20261108-kino6` wurde mit vier getrennten Testprofilen im echten
WorkAdventure geprueft: vorne keine Gespraechs-Audioenergie, hinten dekodierter Ton
an zwei gleichzeitig getrennten Tischen, auch bei nur 48 Pixel Abstand ueber
die Bereichsgrenze. Alle vier Seitenfenster oeffneten automatisch genau einmal.
Sitzplatzwechsel erhielten dasselbe Fenster; manuelles Schliessen wurde respektiert,
erneutes Oeffnen und Rueckweg zur separaten Halle funktionierten. Keine Browserfehler.
Native Desktop- und Mobilansicht sowie die Aufsteller wurden als Bildschirmbilder
geprueft. Wiederholbare Pruefung: `node tools/check-cinema-live.cjs`, mit kurzlebigen
kuenstlichen Konten und Sprachton statt echter Schueler oder Mikrofone. Der Film
bleibt dabei ersetzt; dies ist weder eine erneute Filmquellen- noch eine Lastabnahme.

Die eigenstaendige Browservorschau simuliert Bewegung, Sitzen und Gruppenanzeige.
Sie stellt keine echten Videokonferenzen oder andere Online-Spieler nach.
Die Grosse Halle wurde am 8. November 2026 mit vier getrennten Browserprofilen
im echten WorkAdventure und LiveKit abgenommen. Die Wiedergabe- und Anmeldelogik
der Kino-Anwendung bleibt unveraendert. Die neue anthrazit-bordeaux-messingfarbene
Darstellung ist unter `../ops/kino-ui/` dokumentiert. Das Seitenfenster wird in der Oberflaechenpruefung ersetzt,
damit kein Film oder fremder Account unbeabsichtigt geoeffnet wird.

Die Audio-Abnahme verwendet eine kuenstliche Sprach-Tonquelle, keine echten
Schuelerkonten oder Hardware-Mikrofone. Geprueft wurden dekodierte Audioenergie,
zwei gleichzeitige getrennte Zweiergespraeche, die Trennung bei 48 Pixel Abstand
ueber eine Tischgrenze, normale Naehe-Gespraeche nach Verlassen der Bereiche und
die zusaetzliche codegeschuetzte Hallenansage. Alle Pruefungen bestanden; keine
Browserfehler. Das ist kein Lasttest mit 400 Teilnehmern und keine Hardware-Abnahme.
Wiederholbare Pruefung: `tools/hall-ops/live-check.cjs` mit kurzlebigen Testkonten
und dem Code nur in `HALL_CODE`. Private Testdaten liegen nie im Karten-Repository.

## Bibliothek

Die neue Bibliothek ist ueber die entsprechende Tuer der Grossen Halle erreichbar
und kehrt an deren Bibliotheks-Ankunftspunkt zurueck. Sie bleibt eine eigene kleine
Karte mit 896 x 704 Pixeln. Die bisherigen Schlosskarten bleiben unveraendert.
Am Lesesofa mit Sesseln gibt es sechs Plaetze, am Buchclub vier und auf der
Fensterbank drei. Alle Stehenden innerhalb der jeweiligen Flaeche gehoeren zur
gleichen nativen Unterhaltung; die drei Gruppen bleiben voneinander getrennt.
Ausserhalb gilt wieder die normale Naehe-Kommunikation.

Die grossen Regale sind Architektur, die Sitzmoebel bleiben im bestaetigten
32-Pixel-Avatar-Massstab. Das Lesesofa und seine Sitzpunkte stammen unveraendert
in der Groesse aus der abgenommenen Halleneinrichtung. Fensterbank, Tisch und
Sessel haben eigene Sitzpunkte und Vordergrundmasken. Die nativen Kaminflammen
verwenden sieben vorhandene Animationsframes, begleitet von leisem Prasseln.
Neue Raumgrafik und Buchclub-Gruppe wurden mit dem integrierten Bildgenerator
erstellt. Originale, Prompts und editierbare Geometrie liegen unter
`art/bibliothek-20261108/`; Neubau: `node tools/build-library.cjs --update-world`.

Alle 13 Sitzplaetze und Laufwege wurden in der lokalen Vorschau bei 1440, 390 und
320 Pixel Breite geprueft. Die native Audio-Abnahme ist mit
`node tools/check-library-live.cjs` wiederholbar; sie verwendet nur kurzlebige
Testkonten und kuenstlichen Sprachton, keine echten Schueler oder Mikrofone.

## Animationen und Einrichtung

Kamine, Kerzen, Brunnen, Wasser, lebendiges Portraet, Uhr, gelegentliche
Buchbewegungen, dampfender Tee und ein seltenes Himmelsereignis sind als native
Tiled-Tileanimationen angelegt.
GIF-Exporte liegen unter `art/portrait.gif`, `fireplace.gif`, `fountain.gif` und
`book.gif`, `teacup.gif` und `clock.gif`. Fuer die Karte werden Spriteframes statt GIF-Dateien verwendet,
damit Ebenen, Kollisionen und Spieler weiterhin kontrollierbar bleiben.
Einige Effekte sind absichtlich selten; sie sind keine Wartezeit-Belohnungen.

Alle Moebel sind am 32-Pixel-Raster und an einer normalen Spielfigur ausgerichtet.
Die Vorschau hat 232 Sitzplaetze. Sofas und weitere Einrichtungsgegenstaende sind
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
Lehrerbank (4), Spieltreff (4) und die neue Gemeinschaftstafel (12). Auch Stehende in diesen Bereichen gehoeren
zum jeweiligen Gespraech. Avatare bleiben im nativen 32-Pixel-Massstab.
Produktionsgrafik, Prompt und editierbare Geometrie liegen unter
`art/grosse-halle-20261108-scale/`; Neubau: `node tools/build-great-hall.cjs`.
Die Einrichtung wurde auf 62,5 Prozent verkleinert, bei unveraenderten Avataren.

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
