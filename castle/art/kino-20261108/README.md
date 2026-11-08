# Kleines Schlosskino

30 x 28 Kacheln, 960 x 896 Pixel. Das sind rund 60 Prozent weniger Kartenflaeche
als beim bisherigen 48-x-44-Grundriss, bei gleicher Anzahl nutzbarer Plaetze.
Der bestaetigte Avatar-Massstab der Grossen Halle bleibt verbindlich.

48 rote Kinosessel stehen in sechs Reihen zu acht Plaetzen, mit Mittelgang und
seitlichen Wegen. Sie sind 32 x 36 Pixel gross, nicht die Avatare vergroessert.
Vorne ist der ganze Bereich nativ still. Hinten stehen vier kleine Tische mit
je vier Plaetzen und einem eigenen nativen Gespraechsbereich, auch fuer Stehende.
Popcorn, Tassen, Filmhefte, Buecher, Decken, Pflanzen und kleine Filmrequisiten
gehoeren zur Einrichtung. Es gibt kein neues Schachspiel und keinen neuen Player.

## Quellen und Neubau

Mit dem integrierten Bildgenerator erzeugt, die grosse Halle nur als Stilreferenz:

- `room-source.png`: unveraenderte Architekturquelle; `room-prompt.txt`.
- `chair-source.png`: unveraenderter freigestellter Kinosessel; `chair-prompt.txt`.
- `lounge-source.png`: Tischvariante aus dem vorhandenen Spieltreff, ohne das
  Original zu aendern; `lounge-prompt.txt`. Echte Alpha-Transparenz bleibt erhalten.

`scene.json` ist die editierbare Quelle fuer Platzierung und Abmessungen.
`node tools/build-cinema.cjs --update-world` erzeugt daraus `floor.png`,
`fronts.png`, `chair.png`, `lounge.png`, `marker.png`, `candles.png`,
`layout.json`, die Karten und die Uebersicht. Auch der gesamte Schlossbauer
verwendet diesen Erzeuger, damit er das Kino nicht durch den Platzhalter ersetzt.
Die Vordergrundmasken kopieren ausschliesslich vorhandene Moebelpixel und lassen
Koepfe sowie Oberkoerper frei. Die Kerzen verwenden die vorhandenen sieben
Animationsframes aus dem Village, ohne verschobene Kachelebenen.

## Film und Schutz

Eine durchgehende, erst auf Knopfdruck geoeffnete Filmflaeche verbindet alle
64 Plaetze. Der native Symbolausloeser `onicon` vermeidet eine Ueberlagerung
mit der Sitzaktion und verwendet nicht deren Leertasten-Hinweis. Siehe die
[WorkAdventure-Dokumentation](https://docs.workadventu.re/map-building/tiled-editor/opening-a-website/).
Ein Wechsel zwischen Ruhe- und Gespraechsplaetzen soll das
Seitenfenster nicht neu laden. Der Link bleibt der bewaehrte Kino-Endpunkt;
dessen Anmeldung, Alterspruefung und Film-Synchronisation werden nicht kopiert
oder veraendert. Die Leinwandgrafik in der Karte ist bewusst neutral: Der Film
laeuft im Seitenfenster, nicht als zweiter Player in der Karte.

Native Vorschau: `https://together.deine-schule.com/~/castle-preview/kino.wam`.
Der Eingang liegt abseits des Ruecksprungfelds. Der Rueckweg fuehrt in die
neue Grosse Halle. Das bisherige Schloss und das vorhandene Kino bleiben erhalten.
Es werden weder Geheimwege noch vertrauliche Inhalte veroeffentlicht.

Kartenpruefung: `node --test tests/cinema.test.mjs`. Die Browserpruefung behandelt
alle 64 Plaetze bei drei Bildschirmgroessen. Der Mehrpersonentest verwendet
kuenstliche Testkonten und Tonquellen. Der Film-Endpunkt wird dort lokal durch
eine neutrale Testseite ersetzt, damit kein echter Film oder fremdes Konto
gestartet wird. Dies prueft Einbindung und Fenster-Lebensdauer, nicht erneut
die Synchronisation innerhalb der unveraenderten Kino-Anwendung.
