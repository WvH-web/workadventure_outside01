# Gemeinsame Sternenmaschine

Stand: 11. November 2026. **Implementiert und in einem getrennten geschuetzten
nativen Testraum abgenommen.** Die gewoehnliche Sternwarte ist noch nicht auf
die neue Aktivitaet umgestellt. Der Gesamtausbau bleibt offen.

## Aktivitaet

Die sichtbare Forschergruppe in der Sternwarte bekommt eine gemeinsame Auswahl:
Sternenmaschine oder das bereits vorhandene NASA-Sonnensystem. Die Sitzplaetze,
Moebelgroessen, Gespraechsflaechen, Rueckwege und anderen Angebote bleiben gleich.
Eine Auswahl gilt fuer die bestehende Tischrunde. Nachzuegler sollen dieselbe
Aktivitaet automatisch im Seitenfenster erhalten, nicht eine eigene neue Partie.

Die Sternenmaschine ist ein eigenes kleines kooperatives Raetsel mit drei
Himmelsbildern und drei Einstellringen. Zu Beginn sind die Hinweise auf die
Teilnehmer verteilt; jeder kann bei Bedarf auch alle Hinweise ansehen. Allein
sind alle Hinweise vorhanden. Es gibt weder Zeitdruck noch Punkte, Belohnungen
fuer Anwesenheit, freie Texteingaben oder notwendige Fremdanbieter-Konten.

Die eigene Rastergrafik wird fuer die ganze Spielflaeche nur einmal als 376 KB
grosses WebP verwendet. Die drei Ringe bewegen sich entsprechend dem bestaetigten
Spielstand; reduzierte Bewegung wird respektiert. Mobil sind die Symboltasten
in zwei Reihen angeordnet, mit Tastatur gibt es die uebliche Radio-Auswahl.
Ein Zuruecksetzen betrifft die ganze Runde und verlangt eine Bestaetigung.

## Gemeinsamer Zustand

- Die bestehende `TableRound` bestimmt die Tischrunde; keine zweite Lobby.
- Nur passende Sitzkennung, Sitzbesuch und aktive Auswahl `machine` zaehlen.
- Jeder Ring hat einen eigenen geordneten Aenderungsstand. Gleichzeitige
  Aenderungen an unterschiedlichen Ringen bleiben beide erhalten; bei demselben
  Ring gibt es eine deterministische Entscheidung.
- Ein neuer Raetseldurchgang hat eine eigene Version. Verspaetete alte Ring-
  Aenderungen setzen einen neuen Durchgang nicht zurueck.
- Erst bestaetigte Veroeffentlichungen erscheinen als gespeichert. Fehlgeschlagene
  Schreibvorgaenge zeigen einen Fehler und benoetigen einen ausdruecklichen Retry.
- Der Stand wird kurzlebig mit den sitzenden Teilnehmern weitergegeben; das
  Schliessen des Seitenfensters ist kein Verlassen des Tisches. Ein leerer Tisch
  und eine neue `TableRound` beginnen frisch.
- Geteilt werden nur technische, kurzlebige Spieler-/Sitz-/Rundenkennungen,
  Zaehler und Symbolwerte. Keine Namen, E-Mails, Profile, URLs oder freien Texte.
- Der Raetselstand ist **keine Berechtigung** und oeffnet keine geschuetzte Tuer.
  Er ersetzt weder Microsoft-Anmeldung noch serverseitige Klassen-/Altersregeln.

## Nachweise Und Grenzen

`tests/castle-puzzle.test.mjs` enthaelt 19 bestandene Faelle: alle drei Raetsel,
gleichzeitige gleiche/unterschiedliche Ringwahl, Nachzuegler, Ausscheiden,
Wiedereroeffnen, leere/neue Runde, veraltete Sitzbesuche, fehlerhafte und noch
nicht bestaetigte Veroeffentlichungen, begrenzter Timeout, ausdrueckliche Erholung,
erster Klick waehrend einer Hintergrund-Veroeffentlichung und 400 unbeteiligte
synthetische Spieler. Letzteres ist kein 400-Personen- oder Medienlasttest.

Die eigene Browserpruefung besteht bei 320, 390, 680 und 1280 Pixeln Breite,
einschliesslich Touch, bewegten dekodierten Bitmap-Pixeln, Loesung, Tastaturfokus,
Bestaetigung und ohne waagerechten Ueberlauf. Die Einzelvorschau ist ausdruecklich
so beschriftet und nur auf Loopback mit `?preview=1` verfuegbar. Sie stellt keine
echten Mitspieler dar. Belege liegen getrennt von Wegwerfprofilen auf D:.

Die abschliessende gesamte Node-Suite besteht mit 570 Faellen: 568 bestanden,
zwei bisherige optionale Auslassungen, kein Fehler. Es wurden keine Python-
Betriebsoperatoren geaendert und keine neue Live-Betriebsabnahme behauptet.

Die ersten nativen Kandidatenproben haben den bisherigen Raumcontroller nicht
zuverlaessig ersetzt. Sie gelten deshalb **nicht als bestanden** und beweisen
insbesondere keinen neuen Tischton. Das zusaetzlich versuchte Blockieren von
Service Workern half nicht und fuehrte selbst zu einem Framework-Fehler in einem
abgeschirmten Frame; diese Testoption wurde wieder entfernt. Dazu existiert eine
[primaere Playwright-Fehlermeldung](https://github.com/microsoft/playwright/issues/43113).
Weder die Frame-Abschirmung noch Anmeldung oder Serverantworten wurden gelockert.

Die anschliessende Abnahme besteht mit zusaetzlich veroeffentlichten,
hashgeprueften Dateien und einem getrennten geschuetzten `sternprobe.wam`.
Veroeffentlichungscommit: `2202ba1205c44364206496fddb4623d5fd6eefc9`.
Dieser Commit fuegt genau acht Dateien hinzu und ersetzt keine vorhandene.

`tools/check-castle-puzzle-native.cjs --stage` besteht mit zwei zugelassenen
normalen Microsoft-Schultestkonten, eines als Touch-Handy. Es ersetzt keine
Karten-, Anmelde-, Schulprofil-, Medien- oder Spielantworten. Geprueft sind:

- Sichtbare gemeinsame Auswahl und automatisches Oeffnen fuer Nachzuegler.
- Komplementaere Hinweise und tatsaechliche Aenderungen in beide Richtungen.
- Alle drei Raetsel in beiden wirklichen Clients bis zum Ende geloest.
- Gleichzeitige Aenderungen an zwei verschiedenen Ringen bleiben erhalten.
- Aufstehen des Auswaehlenden, Wiederbeitritt und gleicher erhaltener Spielstand.
- Manuelles Schliessen und Wiedereroeffnen des Seitenfensters ohne neue Runde.
- Bestaetigtes gemeinsames Zuruecksetzen und frischer Beginn nach leerem Tisch.
- Dekodierte native Sprache in beide Richtungen an drei Punkten: synthetisches
  Sprachsignal ueber echte Medienverbindungen, kein Ersatz des Sprachdienstes.
- Nichtleere Spielgrafik und Karten-Canvas, kein waagerechter Handy-Ueberlauf
  und normale Tastaturbewegung nach dem Aufstehen.

Der eigens getrennte Gespraechsnamensraum verhindert Kontakt mit den normalen
Sternwarten-Gruppen. Die neue Testkarte verlangte weiterhin die normale
Pflichtanmeldung. Sie wurde nach Abnahme wieder entfernt. Die urspruenglichen
16 Karten, alle erfassten laufenden Container und geschuetzten Dienste sowie
ihre Konfigurationen bleiben unveraendert; kein Dienst wurde neu gestartet.
Der vorherige vollstaendige Live-Betriebsnachweis besteht danach erneut.

Private Belege liegen auf D: unter `star-machine-native`, letzter bestandener
Lauf `2026-11-11T21-11-27-131Z` mit sieben Szenarien und drei Sprachmessungen.
Die unveraenderlichen Serverbelege `stage.json`, `native-proof.json`,
`native-acceptance.json` und `cleanup.json` liegen getrennt von den bisherigen
Abnahmen unter `/opt/wvh-castle-stars/private/`. Historische Nachweise wurden
nicht ersetzt. Alle 121 Python-Betriebsfaelle und erneut alle 570 Node-Faelle
(568 bestanden, zwei bestehende optionale Auslassungen) bestehen. Die temporaere
Veroeffentlichungs-Arbeitskopie auf D: wurde nach geprueftem Push entfernt;
Belege und benoetigte Endfassungen bleiben erhalten. Eine echte 400-Personen-
Abnahme ist damit weiterhin nicht erbracht.

Die native Aufstehen-Schaltflaeche ist insbesondere in der Handy-Kombination
noch sehr dominant und ueberlagert teils den Seitenbereich. Die Aktivitaet ist
scrollbar; eine kompaktere gemeinsame Sitzbedienung bleibt UI-Nacharbeit.

## Veroeffentlichung

`tools/prepare-castle-puzzle.cjs` erzeugt nur
`castle/sternwarte-puzzle-preview.tmj` und den eigenen Controller mit Manifest.
Die vorhandene `castle/sternwarte.tmj` wird nicht ueberschrieben. Die bestehende
Aktivitaets-Zielpruefung erlaubt zusaetzlich nur die exakte eigene `puzzle.html`;
Fremdseiten, Query-Varianten und beliebige Zieladressen bekommen keinen API-Zugang.
Die anderen generierten Controller wurden lediglich mit dieser gemeinsamen
Quellaenderung reproduzierbar neu gebaut, nicht live ersetzt.

Bereits als ausschliesslich zusaetzliche Dateien veroeffentlicht:

- `castle/sternwarte-puzzle-preview.tmj`
- `castle/puzzle-preview.bundle.js`
- `castle/puzzle-preview.bundle.manifest.json`
- `castle/puzzle.html`
- `castle/puzzle.css`
- `castle/puzzle.js`
- `castle/puzzle-state.js`
- `castle/art/sternmaschine-20261111/machine.webp`

Die temporaere WAM-Kopie mit eigener Sprachgruppe ist bereits geprueft und
wieder entfernt. Vor und nach dieser Phase besteht der aktuelle Betriebsnachweis.
Die gezielte Aktivierung der normalen Sternwarten-Aktivitaet steht noch aus:
kanonische TMJ und Builder passend nachziehen, nur diese eine Vorschau-WAM
umstellen, den vorigen Nachweis unveraendert als Vorgaenger behalten und den
normalen Zugang nochmals ohne Testkarte pruefen. Keine anderen Karten, Dienste
oder Spielefreigaben ersetzen. Die Aktivitaet ist kein Geheimgang; private
Entdeckungsplaene und Codes werden nicht mitgeliefert.
