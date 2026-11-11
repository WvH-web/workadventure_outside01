# Gemeinsame Sternenmaschine

Stand: 11. November 2026. **Implementiert und lokal geprueft, noch nicht in der
Schlossvorschau freigeschaltet.** Eine bestandene native Mehrspieler-Abnahme
liegt fuer diese neue Aktivitaet noch nicht vor. Der Gesamtausbau bleibt offen.

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

Die Abnahme wird stattdessen mit zusaetzlich veroeffentlichten, hashgeprueften
Dateien und einem getrennten geschuetzten `sternprobe.wam` vorbereitet.
`tools/check-castle-puzzle-native.cjs --stage` verlangt diese echte Bereitstellung,
zwei zugelassene normale Microsoft-Testkonten, einen eigenen Gespraechsnamensraum
und unveraenderte alte Karte. Es ersetzt keinerlei Netzwerkantworten. Ausstehend:
tatsaechliches gemeinsames Loesen, Sprache in beide Richtungen, Aufstehen,
Wiederbeitritt, leere Runde und Bewegung in genau diesem nativen Testraum.

## Veroeffentlichung

`tools/prepare-castle-puzzle.cjs` erzeugt nur
`castle/sternwarte-puzzle-preview.tmj` und den eigenen Controller mit Manifest.
Die vorhandene `castle/sternwarte.tmj` wird nicht ueberschrieben. Die bestehende
Aktivitaets-Zielpruefung erlaubt zusaetzlich nur die exakte eigene `puzzle.html`;
Fremdseiten, Query-Varianten und beliebige Zieladressen bekommen keinen API-Zugang.
Die anderen generierten Controller wurden lediglich mit dieser gemeinsamen
Quellaenderung reproduzierbar neu gebaut, nicht live ersetzt.

Fuer die naechste Probe nur die acht zusaetzlichen Dateien veroeffentlichen:

- `castle/sternwarte-puzzle-preview.tmj`
- `castle/puzzle-preview.bundle.js`
- `castle/puzzle-preview.bundle.manifest.json`
- `castle/puzzle.html`
- `castle/puzzle.css`
- `castle/puzzle.js`
- `castle/puzzle-state.js`
- `castle/art/sternmaschine-20261111/machine.webp`

Danach eine einzelne temporaere WAM-Kopie mit eigener Sprachgruppe einrichten,
die bestehende Pflichtanmeldung verifizieren, nativ pruefen und die Probe wieder
entfernen. Vor und nach dieser Phase den aktuellen Betriebsnachweis ausfuehren.
Erst nach Abnahme darf die konkrete Sternwarten-Aktivitaet gezielt aktiviert werden.
Keine anderen Karten, Dienste oder Spielefreigaben ersetzen. Die Aktivitaet ist
kein Geheimgang; private Entdeckungsplaene und Codes werden nicht mitgeliefert.
