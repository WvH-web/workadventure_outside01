# Gemeinsames Schloss-Billard

## Aktuelle Ergaenzung

Die Darstellungskorrektur ist jetzt regulaer als eine exakt begrenzte
oeffentliche CSS-Datei veroeffentlicht, ohne Anwendungsneustart und ohne neue
Spiel- oder Schulregeln. Der normale native Seitenfenster-Test besteht mit
zwei freigegebenen Microsoft-Schultestkonten, einem Touch-Handy und **ohne
ersetzte Browserantworten**. Beide fuehren echte Stoesse aus; beiderseitige neue
Partie, Platzwechsel, Fenster-Wiederbeitritt, bestaetigte Platzfreigabe,
anschliessendes Laufen und beidseitig dekodierte native Tischsprache bestehen.
Die wirklich ausgelieferte CSS wird zusaetzlich in beiden Browsern gegen ihre
geprueften Bytes abgeglichen. Nachweis: `2026-11-12T00-18-44-769Z`.

Der Billardtisch ist daneben als **noch nicht aktivierter Kartenentwurf** im
Spielesaal eingerichtet: zwei passende Hocker, bestehende Fensternische als
Zuschauerplatz, vierzehn statt zwoelf Sitze und weiterhin drei nicht
ueberlappende Gespraechsgruppen. Alle alten Sitzkoordinaten, Tueren, der zentrale
Laufweg und der Schachtisch bleiben erhalten. Billard und das bisherige
Bausteinraetsel sind eine gemeinsame Tischwahl; spaetere Teilnehmer sollen
dieselbe Auswahl erhalten. Eine normale Karten- oder allgemeine Schulfreigabe
ist noch offen. Die Dienstfreigabe bleibt auf die beiden Testkonten beschraenkt.

Die Quellen und ihre abgeleiteten Skriptpakete sind gemeinsam neu erstellt.
Bestehende oeffentliche Skripte oder Karten werden dadurch nicht mitveroeffentlicht.
Nur zusaetzliche Kandidaten-Dateien duerfen separat auf die Kartenauslieferung
gelangen, bevor ein geschuetzter Mehrteilnehmer-Kartentest erfolgt.
607 Node-Faelle und alle 160 Python-Faelle bestehen; die zwei bisherigen
optionalen Node-Auslassungen bleiben unveraendert.

Die Bildquelle, verkleinerte transparente Einrichtung und der Erzeugungstext
stehen in `castle/art/billard-20261112/`. Der neue Raum verwendet eine eigene
Atlasmappe `castle/art/spielesaal-billard-20261112/`, die alten Atlasdateien
bleiben unveraendert. Keine groesseren neuen Zwischendateien werden auf C:
abgelegt; die zur Karte gehoerenden Bildquellen bleiben natuerlich im Projekt.

## Vorheriger Stand

Stand: 11. November 2026, Ortszeit des Projekts. Das gesamte Schlossziel bleibt
offen. Das alte Schloss, Village, Lehrerzimmer und alle bestehenden Karten wurden
nicht ersetzt oder veraendert.

## Tatsaechlicher Stand

Ein getrennter, frisch schulisch gepruefter Billard-Dienst laeuft als Pilot fuer
ausschliesslich die beiden ausdruecklich freigegebenen kuenstlichen Microsoft-
Schultestkonten. Es gibt noch keinen veroeffentlichten Billardtisch und keine
automatische Billard-Aktivierung beim Hinsetzen. Schach bleibt unveraendert.
Der Betriebskontrolllauf bestaetigt alle vorherigen Container, Karten, Regeln,
Quellnachweise und die angenommenen Sitzanzeigen unveraendert. Kein bestehender
Dienst wurde fuer den Pilot neu gestartet; nur eine eigene HTTPS-Route kam hinzu.

Der erste echte native Seitenfenster-Test zeigte nach dem ersten gemeinsamen
Stoss einen Bedienfehler: Die WorkAdventure-Zoomleiste ueberdeckt rechts unten
einen Spielknopf. Die Abstandsverbesserung besteht anschliessend mit zwei normalen
Microsoft-Schultestkonten, einem Touch-Handy, echten Server-Spielstaenden und
beidseitig dekodierter nativer Tischsprache. **Dabei wird nur die korrigierte CSS
innerhalb der beiden Testbrowser ersetzt.** Alle Spiel-, Schul-, Identitaets- und
Sprachdienste bleiben echt. Dieser Kandidatennachweis ist ausdruecklich keine
Abnahme der noch unveraenderten oeffentlichen CSS. Die Annahmepruefung lehnt einen
solchen Kandidatennachweis als normale Online-Abnahme ab.

Erst die korrigierte Darstellung getrennt veroeffentlichen und ohne
Browserersatz erneut pruefen; danach den physischen Tisch mit gemeinsamer
Aktivitaetswahl und automatischem Seitenfenster an das Schloss anbinden. Eine
allgemeine Schulfreigabe oder 400-Personen-Freigabe ist damit nicht erteilt.

## Spiel und Schutz

- Drei getrennte Tische mit je zwei Spielern, Zuschauer nur lesend.
- Der Server berechnet Stoesse, Kollisionen und Regeln, nicht die Teilnehmer.
  Beide Spieler erhalten dieselben vollstaendigen Kugelstaende und Bewegungen.
- Erprobte, unveraenderte Physik und Achtball-Regeln aus dem fest gepinnten
  [tailuge/billiards](https://github.com/tailuge/billiards/tree/fda4e90e251ce59ad878dbb996af372f4028a325).
  Kein neuer Eigenbau der Billardphysik und kein Anschluss an dessen Lobby.
- Die verwendete Regelvariante ist keine Behauptung offizieller Turnierregeln:
  Ein offener Erstkontakt-Acht-Fehler verliert; eine zu fruehe Acht bei bereits
  zugewiesener Gruppe wird zurueckgesetzt; die gueltige letzte Acht gewinnt.
- Echtes Zugrecht, Effet, legale Platzierung der weissen Kugel, Aufgeben,
  beiderseitige neue Partie mit Platzwechsel und explizite Wiederuebernahme.
- Nach dauerhafter Speicherung werden Kugelstaende bestaetigt. Ein Neustart
  stellt Positionen wieder her, nicht Konten, Sitzbesitzer oder Verbindungen.
- Zwei begrenzte Rechenprozesse, begrenzte Warteschlange, Zeiten, Nachrichten,
  Ereignisstroeme, Anmeldungen und Ausgaben. Keine unbegrenzten Unterprozesse.
- Jede Aktion braucht eine gueltig signierte Schul-Anmeldung, ein frisches
  Schulprofil und die getrennte private Pilotfreigabe. Keine Rollen aus dem
  Browser, keine Zugangsdaten in URLs und keine Schuelerprofile im Spielstand.
- Keine Werbung, Anbieter-Lobby, fremden Mitspieler, Sprachaufnahmen oder
  eigener Spielchat. Gespraeche bleiben in WorkAdventure.

## Geprueft

32 fokussierte Node-Faelle pruefen reale Physik, Regeln, Worker-Absturz,
Wiederanlauf, Zugrecht, Zuschauer, doppelte Anfragen, Speicherausfall,
Platzuebernahme, frische Schul- und Pilotfreigaben, Rollenentzug und HTTP/SSE.
14 neue Python-Faelle pruefen Veroeffentlichungsgrenzen und echte Annahmebedingungen.
Die ganze Node-Suite besteht mit 600 Faellen und zwei unveraenderten optionalen
Auslassungen; alle 154 Python-Faelle bestehen.

Die getrennte lokale Browserprobe besteht in sieben Szenarien mit neun Bildern:
zwei wirkliche Spieler, Zuschauer, beide Stossrichtungen, gemeinsame neue Partie,
Wiederbeitritt, Touch/Effet, spaeter Zuschauer, 320/390/1440/2400 Pixel und
explizit simulierte Wiederherstellung des eigenen Grafik-Kontexts. Echte HTTP-
und Ereignisverbindungen, keine ersetzten Netzwerkantworten; die lokale Schul-
Auskunft verwendet bewusst nur kuenstliche Fixtures. Die Linux-Probe berechnet
zwei echte deterministische Worker-Auftraege im getrennten Container ohne Konten.

Der normale native Versuch mit noch alter CSS wurde korrekt als fehlgeschlagen
festgehalten. Der anschliessende **CSS-Kandidat** besteht mit zwei echten
Microsoft-Schulanmeldungen, realem oeffentlichem Spielserver, zwei echten Stoessen,
gemeinsamem Neustart der Partie, Touch-Bedienung, Wiederbeitritt und echter
nativer Sprache. Die Probe oeffnet die Fenster selbst ueber die native Karten-API;
eine normale Karten-Aktion wird dadurch nicht als fertig ausgegeben.

Ein frueher Volltest war neben vier gleichzeitig laufenden Software-WebGL-
Fenstern an einer bestehenden 15-Sekunden-Grenze gescheitert. Die Grenzwerte
wurden nicht erhoeht. Der spaetere serielle Volltest besteht, einschliesslich
des unveraenderten 400-Anfragen-Tests mit ausschliesslich synthetischer Auskunft.
Dieser ist kein Lastnachweis fuer echte Microsoft-Anmeldungen oder 400 Schueler.

## Betriebsversuche

Die erste Portvorpruefung und eine fehlende temporaere Kontoliste stoppten vor
jeder Dienst- oder Karten-Aenderung. Anschliessend wurde ein Versuch wegen einer
zu strengen Verzeichnisberechtigung zurueckgenommen; der Pilot blieb geschlossen.
Die Ursache war die restriktive Dateivorgabe beim Erstellen des privaten
Freigabeordners. Explizite minimale Gruppenrechte sind korrigiert und getestet.

Ein zweiter Versuch wurde nach dem erfolgreichen Start bei einer Nachpruefung
zurueckgesetzt. Sein damaliger Nachweis enthaelt nur AssertionError; die genaue
Teilpruefung ist daraus nicht rekonstruierbar. Nachgestellte echte lokale HTTP-
Pruefungen derselben Bytes bestehen. Der dritte Versuch wartet zusaetzlich auf
die oeffentliche Bereitschaft und dokumentiert kuenftig Teilpruefung und
Aufrufstelle. Er besteht vollstaendig. Eine bestimmte Ursache des zweiten
Fehlversuchs wird damit nicht behauptet. Beide Ruecksetzungen und alle
Vorgaengernachweise bleiben unveraendert erhalten.

Neue umfangreiche Downloads, Browserdateien, Beweise und Zwischenstaende liegen
auf D:. Auf C: liegen nur die benoetigten Projektquellen. Die drei temporaeren
Server-Uploads wurden nach Hashpruefung entfernt (765.265 Bytes); laufende
Quellen, Spielstaende, private Freigaben und Nachweise bleiben erhalten.

Private Nachweise: lokale Browserprobe `2026-11-12T00-07-16-162Z`, native
Fehlprobe `2026-11-11T23-59-00-764Z`, nativer CSS-Kandidat
`candidate-2026-11-12T00-09-41-081Z` (einschliesslich bestaetigter Platzfreigabe).
Keine Zugangsdaten oder Geheimgangplaene
werden veroeffentlicht. Technische Grenzen, Quellmanifest und Lizenzen stehen
unter `ops/castle-billiards/README.md`.
