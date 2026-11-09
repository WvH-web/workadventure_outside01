# Gemeinsames Schloss-Schach

Stand: 9. November 2026. Separater Ausbau der Schlossvorschau, kein Ersatz des
alten Schlosses und keine Wiederaktivierung des lokalen Village-Prototyps.

## Angebot

- Drei gemeinsame, serverseitig gefuehrte Schachbretter mit zwei Spielern und
  Zuschauern. Freie und belegte Plaetze werden aus echten Verbindungen ermittelt.
- Legale Zuege, Rochade, en passant, ausdrueckliche Bauernumwandlung, Schachmatt
  und Remis werden mit der eingebundenen Schachbibliothek geprueft.
- Remisangebot, Aufgabe, gemeinsame Zustimmung zur naechsten Partie mit
  Farbwechsel, neutrale PGN-Datei und Zuruecksetzen durch eine Lehrkraft.
- Nach Verbindungsabbruch bleibt ein Platz kurz reserviert. Wiederuebernahme
  ist ausdruecklich; ein zweites Fenster uebernimmt nicht heimlich die Partie.
- Der Ersteller ist kein Host. Nach Freigabe seines Platzes bleibt die Stellung
  fuer den anderen Spieler und einen neuen Mitspieler bestehen.
- Freies Spiel ist lokales Ueben beider Seiten, kein KI-Gegner. Drei kleine
  Matt-in-einem-Zug-Aufgaben sind ebenfalls enthalten. Kein Turnier und keine Uhr.

Im Spielesaal oeffnet die Aktion `Schach spielen` am bisherigen Spieltisch die
eigene Seite rechts. Deren Kopfzeile fuehrt weiterhin zu den externen Spielrunden.
Zusaetzlich steht die gerade erreichbare Aktivitaet im nativen Apps-Menue.
Dieser getrennte Zugang umgeht einen beobachteten Fehler der kompakten nativen
Leiste: Nach Hinzufuegen eines weiteren Knopfs konnte eine zuvor verborgene
Aktivitaet sowohl aus der Leiste als auch aus deren Ueberlauf verschwinden.
Es wurde dafuer nur das neue Schloss erweitert, nicht der laufende
WorkAdventure-Client fuer alle Karten ersetzt. Beide Zugaenge teilen dasselbe
Fenster und werden beim Verlassen der Aktivitaet gemeinsam entfernt.
Halle und Oberstufensalon behalten ihren bisherigen Spielrunden-Zugang.
Die vorhandenen drei Gespraechsgruppen bleiben unveraendert: Die Wahl eines
Schachbretts erzeugt keine weitere Sprachgruppe und schaltet kein Mikrofon um.

## Zugang Und Daten

Die eigene Seite liegt unter
[Schloss-Schach](https://together.deine-schule.com/castle-chess/).
Ohne bestehende WorkAdventure-Anmeldung und aktuellen Schulnachweis ist keine
Teilnahme moeglich. Jede Anfrage prueft den echten, aktuellen Schulstatus;
aktive Schueler und Lehrkraefte sind zugelassen, Eltern und unbekannte Konten
nicht. Behauptete Rollen im Browser oder in Token-Tags genuegen nicht.
Externe Spielanbieter und deren gesonderte Freigaben bleiben unberuehrt.

Verbindungen verwenden kurzlebige, kontogebundene Sitzungen und autorisierte
Server-Ereignisse. Keine Anmeldedaten in URLs. Konto- oder Berechtigungswechsel
sperren auch die lokale Uebungsansicht. Sitzungen werden alle 15 Sekunden
erneuert, serverseitig spaetestens nach 45 Sekunden ohne Erneuerung gesperrt und
nie ueber das Ablaufdatum der Anmeldung verlaengert. Ein verlassener Platz kann
anschliessend bis zu zwei Minuten reserviert bleiben.

Gespeichert werden nur Zuege, Ergebnis, Aenderungsnummer und Zeitpunkt. Keine
Konten, Namen, Klassen, Geburtsdaten oder Sitzbelegungen in der Spielstandsdatei.
Nach Neustart ist die Stellung wiederherstellbar, aber kein Platz scheinbesetzt.
Unbenutzte, unbelegte Bretter werden nach zwoelf Stunden zurueckgesetzt.
Es gibt keine Rangliste, privaten Nachrichten oder frei eingegebenen Spielnamen.

## Betrieb

Eigener Dienst `wvh-castle-chess`, intern Port 3221, nur hinter dem bestehenden
Webserver erreichbar. Schreibgeschuetzt, Benutzer 1000, begrenzter Speicher,
begrenzte Protokolle; nur das eigene Datenverzeichnis ist beschreibbar.
Spielstaende werden atomar und vor der Zugbestaetigung geschrieben. Ein
Speicherfehler bestaetigt keinen Zug und ueberschreibt nicht die vorige Stellung.

Private Bereitstellungsnachweise und Konfiguration liegen auf dem VPS unter
`/opt/wvh-castle-chess/private`, der kleine Spielstand unter
`/opt/wvh-castle-chess/data/state.json`. Keine Zugangsdaten im Repository.
Der erste veroeffentlichte Stand ist `b15d76ad9a28ec63`. Die bestehende
WorkAdventure-Instanz, Anmeldung, Audiodienste und andere Karten wurden nicht
neu gestartet. Nur ein eigener Webpfad wurde angehaengt.

Die Spielstandsdatei ist ein laufender Stand, keine unabhaengige Sicherung.
Fuer eine spaetere dauerhafte Turnierhistorie braucht es eine gesonderte
Aufbewahrung; jetzt gibt es ausdruecklich keine solche Historie.

## Pruefungen Und Grenzen

- 26 Regel-, Wiederbeitritts- und Speicherpruefungen sowie acht echte
  HTTP-/Ereignisstrom- und Zugangspruefungen mit synthetischen Testprofilen.
- Getrennte Browser fuer zwei Spieler, Zuschauer und eine Testlehrkraft:
  gemeinsame Zuege, Platzwechsel, Wiederuebernahme nach Neuladen, Remis,
  Farbwechsel, Lehrer-Reset, Ueben, Unterumwandlung und echte Mattaufgaben.
- Desktop sowie 390 und 320 Pixel: 64 Felder, geladene Figurengrafiken, kein
  Verschieben oder Neuaufbauen des Bretts beim Anklicken eines Bauern,
  keine abgeschnittenen Beschriftungen und keine Browserfehler. Die mobilen
  Proben verwenden echte emulierte Touch-Ereignisse, nicht nur kleine Fenster.
- VPS: eigener Gesundheitscheck, echter frisch gepruefter Lehrkraft-Zugang
  ausschliesslich als Seiten-Zuschauer, Ereignisstrom und Ablehnung unbekannter
  Konten. Keine Schuelerkonten angelegt, veraendert oder nachgeahmt.
- Aktuelle native Schlossvorschau `20261109-chess2`: vier getrennte, unbekannte
  QA-Teilnehmer in zwei Gespraechsgruppen. Zwei oeffnen die Schachseite,
  einschliesslich des Apps-Eintrags in der kompakten Gespraechsansicht.
  Empfangene Audioenergie steigt bei allen vier weiter; die Gruppen bleiben
  getrennt. Direkte API und Uebungsmodus sind fuer diese Nicht-Schulkonten
  gesperrt. Schliessen, erneutes Oeffnen und Verlassen raeumen das eigene Fenster
  auf; die Pfeiltasten bewegen anschliessend wieder den Avatar. Keine
  Browserfehler. Die echte Lehrkraft-Probe blieb ein eigenes Seitenfenster ohne
  zusaetzlichen Lehrkraft-Avatar oder Zug auf einem gemeinsamen Schulbrett.

Der vollstaendige zugehoerige Regressionstest umfasst inzwischen 292 bestandene
Pruefungen. Die getrennte Browserprobe prueft auch die mobile Touch-Bedienung.

Zusaetzlich sind zwei positive Live-Partien mit den ausdruecklich freigegebenen,
kuenstlichen Schueler-Testkonten bestanden. Beide haben sich normal bei Microsoft
angemeldet; kein synthetisches Profil und kein eigens ausgestelltes QA-Token
ersetzten dabei die Schulanmeldung. Geprueft wurden gemeinsame Zuege, echtes
mobiles Touch, gleichbleibende Brettmasse beim Anwaehlen eines Bauern,
Neuladen mit ausdruecklicher Platzuebernahme, vereinbartes Remis und gemeinsame
neue Partie mit Farbwechsel. Der erfolgreiche Probetisch bleibt leer und frei.
Lehrer-Reset wird diesen Konten nicht angeboten. Keine Browserfehler.

Dabei wurde auch korrigiert, dass neue Sitzungen nach dem Neuladen die eigene
reservierte Partie an Tisch 2 oder 3 anzeigen statt stets Tisch 1. Der Platz
wird weiterhin nicht heimlich uebernommen. Die sichere Zuordnung echter
Microsoft-Kennungen ist in `schulschloss-schulzugang.md` dokumentiert.

Diese beiden Partien liefen auf der echten Spielseite, nicht zugleich als
erneute native Sprachprobe. Es ist keine Freigabe fuer 400 Teilnehmer. Dafuer muessen
insbesondere die Schulstatus-Abfragen und die gesamte Schlossinstanz gemeinsam
unter Last geprueft werden.

Nach dem Tutorial-Clientwechsel besteht die erneute native Schlossprobe mit
zwei normal angemeldeten Microsoft-Testkonten: automatisches Oeffnen beim
Hinsetzen, fest zugeordneter Tisch 1, gemeinsame Runde bei spaetem Beitritt,
Fortbestand beim Aufstehen eines Teilnehmers und neue Runde erst nach dem
letzten Aufstehen. Im echten mobilen Seitenfenster sind alle 64 Felder und
die Platzwahl vollstaendig sichtbar: Fensterhoehe 469 px, Brettunterkante
378,39 px, Platzwahlunterkante 448,39 px. Diese Probe fuehrt keine Schachzuege
aus und beansprucht keine fremden Plaetze. Die getrennte Dreipersonenprobe
bestaetigt erneut die gemeinsame Wahl und Erzaehlkarten am Oberstufentisch.

Die Abhaengigkeiten sind lokal, versionsgebunden und per Integritaetspruefung
bezogen: chess.js 1.4.0, cm-chessboard 8.15.4 und eventsource-parser 4.1.3.
Urheber und Lizenzen sind auf der Schachseite verlinkt. Es wird nur der
Standard-Figurensatz unter CC BY-SA verwendet, nicht der nichtkommerzielle
alternative Figurensatz.
