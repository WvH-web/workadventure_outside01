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
- Zwoelf native `Eventgaeste` sind mit zwei Teilnehmern und dem nativen
  Auswahlfenster geprueft. Acht klar bezeichnete Schlossfiguren sind mit
  Dialogen, 32-Pixel-Massstab und transparentem Hintergrund live geprueft.
  Jung und alt, unterschiedliche Stile und Persoenlichkeiten, schulgeeignet.
  Figuren zaehlen nicht als echte Besucher. Einzelheiten: `CHARACTERS.md`.
- Neu: Schlosshof, Sternendorf und Schlossgarten als drei kompakte Aussenkarten
  mit insgesamt 32 Picknickplaetzen in acht Gespraechsgruppen. Neue Figuren:
  Noah, Val und Rosa. Gemeinsame Erzaehlkarten, bestehende Museums-/Musikbeitraege,
  Rutsche und native Go-Kart-Darstellung. Aktuelle Abnahme und Grenzen: `OUTDOORS.md`.
- Die getrennte Servergrundlage fuer frische Schul-, Klassen- und Alterspruefungen
  ist bereitgestellt: achtzehn neue Node-Pruefungen, sechsunddreissig kuenstliche
  SQL-Faelle und eine Livepruefung bestanden. Keine Schuelerprofile werden an
  die Karte ausgegeben. Das ist noch keine angeschlossene Inhaltssperre; der
  genaue Stand steht in `SCHOOL-ACCESS.md`.

## Noch zu vervollstaendigen

- Weitere bestehende Aussenangebote anbinden. Die drei neuen Aussenkarten,
  ihre acht Hoergruppen, Rutsche und Kart sind in Fassung 3 mit vier getrennten
  Testteilnehmern abgenommen; Kartdarstellung bleibt lokal. Siehe `OUTDOORS.md`.
- Weitere im Gesamtkonzept vorgesehene Sonderraeume und Entdeckungen. Private
  Wege und deren genaue Plaene werden nicht in dieser oeffentlichen Datei beschrieben.
- Serverseitige Klassen-/Altersentscheidungen sind als Grundlage vorhanden.
  Noch noetig: Portalpflege samt Anbieterfreigabe, frische Regelkonfiguration,
  Bindung an gepruefte Zieladressen und die Pruefung beim tatsaechlichen
  Inhaltsaufruf, Beitritt und Besuch. Die jetzigen Karten verwenden den neuen
  Dienst noch nicht; Raumnamen sind kein Schutz und die Vorschau ist keine
  neue Altersfreigabe. Einzelheiten: `SCHOOL-ACCESS.md`.
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

## Pruefstand der Innenausbaustufe

Aktuell ist Fassung `20261108-expansion8` mit passiven Figuren- und Museumsbildern.
Die erneute native Einzelprobe bestand in allen acht betroffenen Innenraeumen:
alle Dialoge, 92 Sitze, 32-Pixel-Figuren mit transparenten Ecken, ausdruecklicher
Fokussperre und ohne alte Figurenfenster oder Raumknopfe. JavaScript-Fehler: keine.
Die gesonderte Klickprobe bestaetigt echte Bewegung nach Figuren- und Museums-
bildklicks sowie fuenf tatsaechlich geladene Museumsbilder. Die gemeinsame Suite
mit der neuen Schulpruefung besteht inzwischen aus 207 bestandenen Kernpruefungen.
Die aktuelle vollstaendige Grafikprobe mit den Aussenkarten
prueft sechzehn Karten in 1440, 390 und 320 Pixel Breite: 345 Aufnahmen, keine
Layoutbefunde oder Browserfehler. Die native Vierpersonenprobe der Aussenfassung
3 ist in `OUTDOORS.md` dokumentiert. Die folgende Innenraum-Sprachabnahme bleibt
ausdruecklich der Nachweis der vorherigen Fassung 7, nicht einer neuen Lastprobe.

Fassung `20261108-expansion7`: Innenausbau mit transparenten Figurenbildern und
raumeigenen Knopfkennungen erfolgreich gebaut. 169 Kernpruefungen inklusive
verspaeteter Bereinigung nach Raumwechseln bestanden. Die damalige vollstaendige
Grafik-Browserprobe der Fassung 6 in den drei Groessen 1440, 390 und 320 Pixel
pruefte alle
vierzehn Karten, alle neuen Sitzplaetze, jede neue Tuer und die vorhandenen
Hallenfunktionen ohne Layout- oder Browserfehler. Neun gesonderte Inhaltsproben
pruefen Museum, Musik und Expeditionen inklusive Bilder, Rueckweg aus einem
Beitrag, geaenderte Daten und eine voruebergehend nicht erreichbare Verwaltung.

Die vollstaendige native Vierpersonenprobe der Fassung 7 ist bestanden: alle
acht neuen Innenbereiche, alle 92 Sitze und 22 getrennte Hoergruppen. Auch
stehende Teilnehmer werden einbezogen; parallele Runden bleiben getrennt.
Die sechs gemeinsamen Erzaehlkartenangebote folgen denselben Runden, auch bei
spaetem Beitritt und erneutem Oeffnen. Museum und Musik oeffnen echte
Verwaltungsbeitraege; die fuenf Museumsbilder werden korrekt geladen. Desktop
und Mobil zeigen gefuellte Spielflaechen. Der Rueckweg zur Halle und ihre neue
Wandelgangtuer funktionieren. Keine zurueckgebliebenen Museumsbildfenster und
keine JavaScript-Fehler in dieser Probe.

Die separate Figurenprobe der Fassung 7 pruefte ebenfalls alle acht Raeume:
Dialoge, 32-Pixel-Figuren, vier transparente Hintergrund-Ecken, alle 92 Sitze,
keine alten Raumknopfe und keine zurueckgebliebenen Figurenbilder. Die erneute
native Zweipersonenprobe bestaetigte zwoelf Auswahlbilder, zwei unterschiedliche
32-Pixel-Avatare, gegenseitige Sichtbarkeit und eine gespeicherte Avatarwahl.

Auch die erneute native Kinoprobe mit vier Teilnehmern ist bestanden: ruhiger
vorderer Bereich, getrennte hintere Gespraeche einschliesslich benachbarter
Gruppengrenzen, automatisch geoeffnetes Filmfenster, kein Neuladen beim
Platzwechsel, respektiertes manuelles Schliessen und Rueckweg zur separaten
Halle. Desktop- und Mobil-Spielflaechen sind gefuellt; JavaScript-Fehler: keine.
Der Kinoinhalt wurde dabei bewusst durch eine Testseite ersetzt, damit kein
echter Film gestartet wird. Das ist keine neue Ende-zu-Ende-Pruefung des
bestehenden synchronen Filmdienstes.

Die frueher gefundenen Sitz- und Knopfprobleme sind damit nachgeprueft: Der
Drehstart liegt auf einem fuer den ganzen Avatar freien Bodenpaar statt in
der Wand. Die Knopfkennungen sind je Raum getrennt; beim Eintritt werden nur
bekannte Bedienelemente anderer Schlossraeume entfernt. Das ist eine kleine
Funktionsprobe, keine Lastfreigabe fuer 400 gleichzeitige Teilnehmer. Testberichte,
synthetische Sprachdatei und kurzlebige Testzugriffe bleiben ausserhalb des
oeffentlichen Repositorys.

Die Verwaltung erlaubt per Content-Security-Policy nur WorkAdventure-Urspruenge
als Rahmen. Deshalb werden die sechs oeffentlichen Galerie-Dateien zusaetzlich
unter `https://together.deine-schule.com/castle-content/` bereitgestellt.
Die Fokuskorrektur ergaenzt acht gepruefte statische Dateien fuer Figuren- und
Museumsbilder. Diese machen nur ihr eigenes enthaltendes Bildfenster passiv;
die eigentlichen Inhalte, Dialoge und Galerien bleiben bedienbar.
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
nur die bekannten Erweiterungen von acht auf vierzehn und sechzehn Dateien im separaten
`castle-preview`-Verzeichnis. Keine uebrigen Karten oder Dienste werden ersetzt.
