# Gaeste und Schlossfiguren

Die gewuenschte Erweiterung umfasst beide Arten: auswaehlbare Avatare echter
Teilnehmer und klar gekennzeichnete, ansprechbare Schlossfiguren. Keine Figur
wird als anwesender Schueler gezaehlt oder simuliert eine wartende reale Person.

## Teilnehmer-Avatare

Zwoelf zusaetzliche native Komplettfiguren stehen in der Sammlung `Eventgaeste`.
Die bisherigen 24 Komplettfiguren und saemtliche Koerper-, Haar-, Kleidungs- und
Zubehoerteile bleiben unveraendert. Die Figuren haben das vorhandene Format:
96 x 128 Pixel pro Laufblatt, drei Bilder je Richtung und 32 x 32 Pixel pro Bild.
Es sind echte vom Server aufgeloeste Avatare, kein nur lokal sichtbares Kostuem.

Zwei getrennte synthetische Teilnehmer wurden in der echten Vorschau geprueft:
zwei unterschiedliche sichtbare Figuren, native 32-Pixel-Portraets, gegenseitige
Sichtbarkeit, zwoelf gezeichnete Auswahlbilder im nativen Editor und gespeicherte
Auswahl. Desktop- und Mobilproben der eigenen Charakteruebersicht bestanden.
Reale Schuelerkonten oder Geraetemikrofone wurden dafuer nicht verwendet.

Das Aussehen ist kein Altersnachweis, keine Lehrkraftrolle und keine Berechtigung.
Die im Figurenkatalog angegebenen Alter sind ausschliesslich fiktive Figurenalter.
Insbesondere aendert ein Lehrer-Outfit keine serverseitigen Rollen oder Freigaben.

## Schlossbewohner

Die Fassung `20261108-expansion7` platziert acht Figuren:
Amir im Wandelgang, Otto in der Galerie, Kai im Oberstufensalon, Sam im Spielesaal,
Elin im Museum, Lea im Musiksalon, Mira im Atelier und Farah in der Sternwarte.
Ihre Koerper haben echte Kollisionsfelder; die Gespraechsflaechen liegen davor,
nicht auf einem Stuhl, einem Eingang oder einem anderen Aktivitaetsbereich.

Ein freiwilliger Knopf oeffnet einen kurzen, redaktionell festgelegten Dialog.
Die Antworten schlagen gemeinsames Erzaehlen, Ausprobieren, Spielen und
Ruecksichtnahme vor. Keine freie KI-Konversation, keine Auswertung persoenlicher
Gesprache und kein Speichern von Kindertexten. Kamera und Mikrofon bleiben aus
den Figurenfenstern ausgesperrt. Die erste native Probe bestand fuer alle acht
Dialoge und 92 Sitzplaetze, zeigte aber einen weissen Hintergrund um die Figuren.
Die Ursache war ein unterschiedliches Browser-Farbschema zwischen WorkAdventure
und dem transparenten Figurenbild. Fassung 6 gleicht dieses an; die native
Einzelprobe in der Halle zeigt damit tatsaechlich keinen weissen Hintergrund.
Die Figuren verwenden die vorhandene Karten-Webseiten-Schnittstelle, ohne
Kartenschnittstellen-, Kamera- oder Mikrofonfreigabe fuer die Bilder.
Die erneute Liveprobe der Fassung 7 in allen acht Raeumen ist bestanden: 32-Pixel-Figuren,
vier gepruefte Hintergrund-Eckpixel ohne weissen Kasten, alle Dialoge, sichere
Bildfenster ohne Kartenschnittstelle und alle 92 Sitze. Beim Raumwechsel bleiben
keine fremden Raumknopfe oder alten Figurenbilder zurueck. Browserfehler: keine.
Die reine Grafikvorschau bildet diese nativen Zusatzfiguren nicht ab.

Die Aussenfassung `20261108-outdoors1` ergaenzt Noah im Schlosshof, Val im Dorf
und Rosa im Garten. Ihre native Dialog- und Mehrpersonenprobe steht noch aus;
die fruehere Abnahme der acht Innenfiguren gilt nicht als Nachweis dafuer.

## Quelle und Betrieb

Die Grafiken stammen aus der bereits in WorkAdventure enthaltenen
[Pipoya-Sammlung](https://pipoya.itch.io/pipoya-free-rpg-character-sprites-32x32).
Es wird kein neues Assetpaket kopiert oder weiterverkauft; die Schlosswelt
verwendet die vorhandenen Grafikadressen unseres eigenen WorkAdventure-Servers.
Der eigene Katalog, Dialoge und Zuordnungen stehen in `characters-data.js`.
Die originalen Figurengrafiken werden nicht bearbeitet oder kopiert. Die kleinen
Tileset- und Schriftproben in `art/characters-20261108/` stammen aus der
Darstellungsuntersuchung und werden von der aktuellen Fassung nicht geladen.

`tools/build-event-avatars.cjs` erzeugt die oeffentliche Sammlungsbeschreibung.
`tools/deploy-event-avatars.py` ergaenzt nur diese Sammlung nach geprueften
Ausgangs-Pruefsummen. Die native JSON-Datei wird atomar ersetzt. Ein einzelner
zusaetzlicher Nur-Lese-Dateimount in der Compose-Ergaenzung bewahrt den Katalog
beim naechsten regulaeren Neuerstellen des Servers. Es wurde kein Dienst oder
Anwendungsprozess neu gestartet. Vorherige Dateien und das private
Veroeffentlichungsprotokoll liegen geschuetzt unter `/opt/wvh-event-avatars/private`.

Der Mount betrifft nur `pusher/data/woka.json`, nicht die benachbarte
Begleiterdatei. Die Erstveroeffentlichung ist wiederholbar, verweigert aber
ungepruefte Aenderungen oder eine andere Sammlung. Weitere Katalogaenderungen
muessen gesondert geprueft werden, besonders wenn der Nur-Lese-Mount bereits
aktiv ist. Native Figurenkennungen nicht einfach entfernen: sie koennen in der
gespeicherten Auswahl echter Teilnehmer vorkommen.
