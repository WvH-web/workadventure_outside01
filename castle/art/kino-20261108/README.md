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
`fronts-20261108-v2.png`, `chair.png`, `lounge.png`, `marker.png`, `candles.png`,
`layout.json`, die Karten und die Uebersicht. Auch der gesamte Schlossbauer
verwendet diesen Erzeuger, damit er das Kino nicht durch den Platzhalter ersetzt.
Die Vordergrundmasken kopieren ausschliesslich vorhandene Moebelpixel und lassen
Koepfe sowie Oberkoerper frei.
An den nach vorne gerichteten Tischstuehlen reicht die Freistellung bis zum
Oberkoerper; hinter den Rueckenlehnen der Kinosessel bleibt der Kopf sichtbar.
Die Vordergrundgrafik hat einen versionierten Dateinamen gegen alte Bildcaches,
keinen URL-Parameter im lokalen Tiled-Bildpfad. `fronts.png` bleibt als
bytegleicher Alias fuer bereits zwischengespeicherte Vorschau-Karten erhalten.
Die Kerzen verwenden die vorhandenen sieben
Animationsframes aus dem Village, ohne verschobene Kachelebenen.

## Film und Schutz

Eine durchgehende, erst auf Knopfdruck geoeffnete Filmflaeche verbindet alle
64 Plaetze. `castle/cinema.js` zeigt einen eigenen Kino-Knopf in der Aktionsleiste,
damit sich der Filmzugang nicht mit der Sitzaktion und deren Leertasten-Hinweis
ueberlagert. Es wird erst nach einem Klick genau ein Fenster ueber die
[offizielle Co-Website-API](https://docs.workadventu.re/developer/map-scripting/references/api-nav)
geoeffnet. Fremde Fenster bleiben unangetastet. Manuelles Schliessen und spaete
Antworten nach Verlassen werden ebenfalls beruecksichtigt.
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

## Abnahme am 8. November 2026

106 Karten-, Sitz-, Steuerungs-, Audio- und Zugriffstests sowie sechs Widgettests
sind bestanden. Alle 64 Kinoplaetze wurden in der Browservorschau bei 1440 x 960,
390 x 844 und 320 x 740 Pixeln getestet, einschliesslich Sitzen, Aufstehen,
Gespraechszuordnung, Fenster und Rueckwegen. Keine Layout- oder Browserfehler.

Der Live-Test von `20261108-kino4` verwendete vier getrennte Browserprofile mit
kurzlebigen synthetischen Konten und kuenstlichem Sprachton, keine echten Konten,
Kameras oder Mikrofone. Zwei Personen im vorderen Ruhebereich blieben auch bei
32 Pixel Abstand stumm, waehrend zwei Personen am hinteren Tisch gegenseitig
nichtstummen Ton dekodierten. Danach liefen zwei isolierte Zweiergespraeche an
benachbarten Tischen, auch bei nur 48 Pixel Abstand ueber die Gruppengrenze.
Alle vier erhielten dabei Ton: Der Wechsel aus der Ruhezone stellt die
normale Teilnahme am Tischgespraech wieder her.

Der Film-Endpunkt wurde erst nach dem Klick auf den eigenen Kino-Knopf einmal
geladen. Das gleiche Fenster blieb bei einem Wechsel zwischen vorderen und
hinteren Sitzen erhalten. Der Rueckweg erreichte die neue Halle ohne Ruecksprung
und schloss das eigene Filmfenster. Die echte Kino-Anwendung wurde dabei durch
eine neutrale Testseite ersetzt, nicht veraendert. Native Spielbilder und
Canvas-Pixel wurden auf Desktop und Mobilansicht geprueft; die Sitzdarstellung
wurde an Sesseln und beiden Seiten der Tische kontrolliert. Keine Browserfehler.

Wiederholbarer Live-Test: `node tools/check-cinema-live.cjs`, nach privater
Bereitstellung der kurzlebigen Testkonten. Berichte, Bilder und private Daten
liegen ausserhalb des Repositories unter `../output/cinema-live-qa/`, bezogen
auf den Repository-Stamm. Dies ist kein Lasttest mit 400 Personen und keine
erneute Abnahme der Hardware oder der Film-Synchronisation im Kino-Portal.
