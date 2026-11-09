# Ausbau des neuen Schulschlosses

Das Gesamtziel bleibt aktiv. Dies ist keine Freigabe als fertiggestelltes
Schloss oder fuer eine Veranstaltung mit 400 Personen. Das bisherige Schloss,
Village und geschuetzte Lehrerzimmer werden nicht ersetzt.

## Eingerichtete Innenwelt

- Grosse Halle mit 42 Sitzen, Gemeinschaftstafel, sechs Gespraechsbereichen,
  geschuetztem Rednerpult, Schlossbrett und Rueckwegen.
- Kino mit 48 ruhigen vorderen Plaetzen, 16 hinteren Gespraechsplaetzen und
  automatisch geoeffnetem bestehendem synchronen Kinoplayer.
- Bibliothek mit drei Lesegruppen und 13 Sitzen.
- Grundschulstube und Mittelstufenraum mit vorhandenen Aktivitaeten.
- Neu: Oberstufensalon, Spielesaal, Museum, Musiksalon, Atelier und Sternwarte.
  Je zwoelf Sitze, drei native Hoergruppen und gemeinsame Erzaehlkarten mit
  eigener Raumvariable. Bewaehrte Sitzmoebel bleiben im bestaetigten Massstab.
- Neu: Erdgeschoss-Wandelgang und obere Galerie mit je acht beschrifteten
  Tueren, zehn Sitzen und zwei nativen Hoergruppen. Eine zusaetzliche Tuer
  unten rechts in der Halle verbindet den Wandelgang direkt mit der Halle.
- Das Museum zeigt fuenf Bilder aus der vorhandenen Museumsverwaltung in den
  Wandrahmen. Im Seitenfenster sind alle freigegebenen Katalogeintraege von
  `show1` bis `show13` erreichbar. Im Musiksalon erscheinen die vorhandenen
  Musikbeitraege. Vorhandene Medien-Endpunkte bleiben zustaendig fuer Webseite,
  PDF, YouTube, Audio und Praesentationsinhalt.
- Die Expeditionen bieten sieben bewusst externe Museums- und Weltraumziele.
  Einbettungssperren werden nicht umgangen. NASA Eyes kann separat am
  Forschergruppentisch der Sternwarte im Seitenfenster geoeffnet werden.

## Noch zu vervollstaendigen

- Liebevoll ausgebaute Aussenanlage und Dorf mit richtigen Laufwegen,
  Aufenthaltsplaetzen, vorhandenen Freizeitangeboten und erweiterbaren Anschluessen.
- Weitere im Gesamtkonzept vorgesehene Sonderraeume und Entdeckungen. Private
  Wege und deren genaue Plaene werden nicht in dieser oeffentlichen Datei beschrieben.
- Serverseitig frisch gepruefte Klassen-/Altersfreigaben fuer Inhalte und
  passende Zugangspunkte aus dem Verwaltungsportal. Raumnamen allein sind
  kein Schutz und die aktuelle Innenvorschau ist keine neue Altersfreigabe.
- Wirkliche gemeinsame Zeichentische, ein verifiziert gemeinsam genutztes
  Shared Piano, belastbares Schach und gegebenenfalls Billard nach Abnahme
  einer geeigneten vorhandenen Grundlage. Keine bloss dekorativen Spielmoebel
  als funktionierende Spiele ausgeben. Die Spielrundenliste verwendet derzeit
  die sieben bereits vorhandenen Verwaltungsangebote und deren aktuelle Links.
- Gemeinsame Rundenliste mit freiwilligem Mitmachstatus, Gastgeberpflege,
  zeitlich ablaufenden externen Links und ehrlicher Anzeige nicht bekannter Spielstaende.
- Redaktionell freigegebene Themenrotation, Aushang und freiwillige Erinnerungen
  aus dem Portal. Die jetzt vorhandene Expeditionenliste ist noch keine
  automatische Rotation oder Versandfunktion.
- Abgesicherte produktive Sternenhueter-Schulbruecke fuer persoenliche Zimmer
  und Besuche. Lokale Testdaten bleiben unberuehrt und unveroeffentlicht.
- Betriebs-, Wiederanlauf- und realistische Leistungstests vor breiter Nutzung.
  Kleine synthetische Mehrteilnehmerproben ersetzen keine Lastabnahme.
- Zusaetzlich: Zwoelf native `Eventgaeste` sind mit zwei Teilnehmern und dem
  nativen Auswahlfenster geprueft. Acht klar bezeichnete Schlossfiguren sind
  mit Dialogen, 32-Pixel-Massstab und transparentem Hintergrund live geprueft.
  Jung und alt, unterschiedliche Stile und Persoenlichkeiten, schulgeeignet.
  Figuren zaehlen nicht als echte Besucher. Einzelheiten: `CHARACTERS.md`.

## Pruefstand der Innenausbaustufe

Fassung `20261108-expansion7`: Innenausbau mit transparenten Figurenbildern und
raumeigenen Knopfkennungen erfolgreich gebaut. 169 Kernpruefungen inklusive
verspaeteter Bereinigung nach Raumwechseln bestanden. Die letzte vollstaendige
Grafik-Browserprobe der Fassung 6 in den drei Groessen 1440, 390 und 320 Pixel
pruefte alle
vierzehn Karten, alle neuen Sitzplaetze, jede neue Tuer und die vorhandenen
Hallenfunktionen ohne Layout- oder Browserfehler. Neun gesonderte Inhaltsproben
pruefen Museum, Musik und Expeditionen inklusive Bilder, Rueckweg aus einem
Beitrag, geaenderte Daten und eine voruebergehend nicht erreichbare Verwaltung.

Die native Vierpersonenprobe hat das Museum mit allen drei Hoergruppen, spaetem
Beitritt, zwoelf Sitzen, fuenf Verwaltungsbildern und echtem eingebettetem
Verwaltungsbeitrag geprueft. Beim folgenden Raumwechsel trat eine verzoegerte
Initialisierung auf, die in der Einzelprobe nicht reproduziert wurde. Fassung 2
verwendet eindeutig raumspezifische Skriptadressen und korrekt beschriftete
Rueckwege. In der Wiederholungsprobe trat an einer Fensterbank ein Sitz-Timeout
auf. Als konkrete Schwachstelle wurde der bisherige Drehstart in einer gesperrten
Wandkachel gefunden. Der neue Drehweg verwendet ein kurzes, fuer den ganzen Avatar
freies Bodenpaar; alle ueber 200 Sitzplaetze werden darauf geprueft. Eine native
Einzelprobe nach dieser Aenderung pruefte alle 92 Sitze der acht neuen Raeume
erfolgreich. In Fassung 6 bestanden Museum und Musiksalon auch die Vierpersonenprobe
mit allen drei getrennten Gruppen, gemeinsamen Karten und den echten eingebetteten
Verwaltungsbeitraegen. Beim Wechsel zum Oberstufensalon blieben alte Aktivitaetsknopfe
stehen und der Rueckwegknopf verschwand. Fassung 7 trennt die Kennungen je Raum;
beim Eintritt werden nur bekannte Bedienelemente anderer Schlossraeume entfernt.
Der vollstaendige Vierpersonen-Wiederholungsnachweis steht noch aus. Kein allgemeines
Bestehen aller neuen Raeume wird daraus abgeleitet. Testberichte,
synthetische Sprachdatei und kurzlebige Testzugriffe bleiben ausserhalb des
oeffentlichen Repositorys.

Die Verwaltung erlaubt per Content-Security-Policy nur WorkAdventure-Urspruenge
als Rahmen. Deshalb werden ausschliesslich die sechs oeffentlichen Galerie-Dateien
zusaetzlich unter `https://together.deine-schule.com/castle-content/` bereitgestellt.
Das ist kein Proxy fuer fremde Inhalte und keine Lockerung der Verwaltungs-CSP.
Die Galerie braucht keine Kartenschnittstelle und keinen Kamera-/Mikrofonzugriff.
In der reinen Grafikvorschau unter einer anderen Domain oeffnen Beitraege extern.
Die Servereinrichtung sichert die bisherige Nginx-Konfiguration, prueft deren
Pruefsumme vor dem Ergaenzen genau dieses neuen Pfads und testet Nginx vor dem
graceful Reload; WorkAdventure und der Ansagedienst bleiben unangetastet.

## Quellen und Wiederaufbau

Alle acht neuen Raumhintergruende wurden mit dem integrierten Bildgenerator
erstellt. Originale und finale Prompts stehen in `art/*-20261108-full/` als
`room-source.png` und `room-prompt.txt`. Der Builder `tools/build-castle-expansion.cjs`
leitet daraus Raster, Masken, Sitzpunkte, Kollisionen und native Wrapper ab.
Vorhandene Sitzgruppen und Tischgrafik werden wiederverwendet, nicht vergroessert.

`node tools/build-castle.cjs` baut alle registrierten Karten. Die aeltere
Atlaszeichnung laeuft in einem eigenen Prozess; Quellbilder werden vor den
tausenden Rasterausschnitten einmal rasterisiert. Das vermeidet den nativen
Skia-Abbruch beim Kopieren grosser Zeichnungen auf Windows.

`tools/castle-map-ids.cjs` ist die gemeinsame Kartenliste fuer Generator,
Routing und Pruefungen. Die Serververoeffentlichung prueft die bereits
bereitgestellten Wrapper gegen deren gespeicherte Pruefsummen und akzeptiert
nur den bekannten Wechsel von acht auf vierzehn Dateien im separaten
`castle-preview`-Verzeichnis. Keine uebrigen Karten oder Dienste werden ersetzt.
