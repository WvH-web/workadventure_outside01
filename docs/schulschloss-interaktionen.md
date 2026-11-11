# Interaktionsabnahme und neue Anforderungen

Ergaenzung vom 9. November 2026. Das alte Schloss bleibt bestehen.

## Verbindliches Verhalten

- Das Tutorial soll nur einmal beim ersten Einstieg angeboten werden, nicht
  erneut beim ersten Besuch jedes Raums. Eine ausdrueckliche Wiederholung im
  Hilfemenue bleibt moeglich.
- Am sichtbaren Schachtisch der Mittelstufe soll Schach beim Hinsetzen starten.
  Vorbeigehen allein startet nichts. Dasselbe Angebot muss bei allen Sitzenden
  zur selben Tischrunde fuehren, nicht zu voneinander unabhaengigen Partien.
- Allgemeine Spieltische sollen ein festes Angebot oder eine sichtbare gemeinsame
  Auswahl erhalten. Diese Auswahl gilt fuer alle Sitzenden, einschliesslich
  spaeter Hinzukommender. Sie wird erst zurueckgesetzt, wenn alle aufgestanden
  sind oder die Karte verlassen haben. Kein Zuruecksetzen durch einen einzelnen
  aussteigenden Teilnehmer und keine Uebertragung auf einen Nachbartisch.
- Go-Kart: sichtbarer Einstieg am Fahrzeug, funktionsfaehige Fahrt, Ausstieg,
  Rueckkehr des Avatars und freie Steuerung danach. Kein nur dekoratives Fahrzeug
  und kein ausschliesslich schwer auffindbarer Knopf in der oberen Leiste.
- Rutsche: zuegige, gleichmaessige Bewegung ohne Pausen an jedem Wegpunkt,
  trockener Ausgang und wiederhergestellte Steuerung bei Ende oder Abbruch.

## Tatsaechlicher Stand

- 11. November: Der Wandelgang der neuen Vorschau oeffnet in seinem getrennten
  ruhigen Zugangsbereich das persoenliche Schlosszimmer automatisch seitlich.
  Der Zugang bleibt auf den bestehenden kleinen Pilotkreis begrenzt; andere
  Schueler erhalten dadurch noch keine Freigabe. Das alte Schloss bleibt
  unveraendert. Die bestehenden Tischgruppen im Wandelgang bleiben erhalten.
- Zwei normale Microsoft-Testkonten bestehen die veroeffentlichte Probe in
  Chrome 157: Tischgespraech, gemeinsamer privater Zimmerbesuch mit freiwilligem
  Mikrofon und danach wieder Tischgespraech. Keine doppelte Tonverbindung,
  keine automatische Aufnahme beim Beitritt; beim Verlassen enden die echten
  privaten Mikrofonspuren. Desktop und Mobil funktionieren ohne ausgetauschte
  Karten-/Skriptantworten. Die zusaetzliche Vorpruefkarte ist wieder entfernt.
- Gemeldete Ausschnitte bleiben allein fuer das ausdruecklich freigegebene
  Administratorkonto zugaenglich. Keine allgemeine Lehrerrolle wurde hinzugefuegt.
  Die echte Anmeldung dieses Administrators bleibt noch separat zu pruefen;
  dies ist keine Lastfreigabe fuer acht oder 400 gleichzeitige Teilnehmer.
- Geschuetztes Schach und WBO funktionieren mit zwei regulaer angemeldeten
  Microsoft-Schueler-Testkonten auf ihren echten Spielseiten.
- Die Atelier-Verknuepfung ist in der separaten Vorschau veroeffentlicht.
- Die kombinierte Viererprobe von Zeichnen und zwei getrennten nativen
  Hoergruppen ist mit `actions2` bestanden, darunter zwei normal angemeldete
  Microsoft-Schueler-Testkonten. Beide Gruppen empfangen dekodiertes Audio,
  waehrend am Werkstatttisch gemeinsam gezeichnet wird. Schliessen,
  Wiedereroeffnen, 390-Pixel-Ansicht und freie Steuerung nach dem Verlassen
  bestehen; keine JavaScript-Fehler oder Kartenskript-Ladezeitlimits.
  Fruehere gescheiterte Versuche bleiben als solche dokumentiert.
- Fassung `20261109-actions2`: Automatisches Oeffnen des festen Schachangebots
  beim Hinsetzen mit zwei normal angemeldeten Microsoft-Schueler-Testkonten
  live bestanden. Mittelstufe ist an Schachtisch 1, Spielesaal an Tisch 2
  gebunden. Kein automatisches Beanspruchen einer Schachfarbe und kein
  versehentlicher Wechsel an einen Nachbartisch.
- Der Oberstufen-Spieltisch bietet eine sichtbare gemeinsame Wahl zwischen
  Schach an Tisch 3 und eigenen Erzaehlkarten. Die native Dreipersonenprobe
  bestaetigt spaeteren Beitritt, gemeinsamen Kartenwechsel, Fortbestand nach
  Kartenverlassen des Erstellers und neue Auswahl nach dem letzten Aufstehen.
  Die Auswahl wird nur zwischen tatsaechlich Sitzenden weitergegeben,
  nicht dauerhaft gespeichert. Alters- und Schulpruefungen bleiben beim
  tatsaechlichen Start der geschuetzten Spielseite wirksam.
- Die native Fenster-API gibt Popups unmittelbar zurueck. Ein zunaechst
  faelschlich angenommener Promise wurde nach der Liveprobe korrigiert;
  synchrone und asynchrone Rueckgaben sind jetzt beide lokal abgedeckt.
  Die erneute Tischprobe besteht ohne JavaScript-Fehler. Weitere Angebote
  ohne passend konfigurierten Tisch bleiben bewusst ausdruecklich oeffnbar.
  Die wiederholte Probe umfasst jetzt ein natives 390-Pixel-Touchgeraet.
  Die Schachseite hat keinen waagerechten Ueberlauf und weiterhin 64 Felder.
  Die danach gefundene abgeschnittene Brettunterkante ist im Schachdienst
  `745b263bbd6c4af4` korrigiert: Die Brettgroesse beruecksichtigt die echte
  verfuegbare Fensterhoehe und die benoetigte Platzwahl. Lokale echte
  Maus-/Touch-Zuege und Sichtbarkeitsgrenzen bestehen bei 390x468, 320x440
  und 760x480 Pixeln. Die erneute native Pruefung verlangt jetzt die tatsaechlich
  sichtbaren Brett- und Platzwahlgrenzen; ein blosses Zaehlen von 64
  DOM-Feldern gilt dafuer nicht als Beleg. Diese erneute Liveprobe besteht
  nach dem Client-Austausch mit zwei normal angemeldeten Testkonten:
  Fensterhoehe 469 px, Brettunterkante 378,39 px, Platzwahlunterkante
  448,39 px. Spaeterer Beitritt, Fortbestand nach einem Aufstehen und eine
  neue Runde nach dem letzten Aufstehen sind erneut bestaetigt. Auch die
  native Dreipersonenprobe der gemeinsamen Oberstufenwahl besteht erneut.
- Sichtbarer Go-Kart-Einstieg, native Fahrt, Ausstieg und wiederhergestellter
  Avatar sind mit einem normal angemeldeten Schueler-Testkonto live geprueft.
- Die Rutsche verwendet jetzt zeitbasierte Bewegung mit 480 Pixeln/Sekunde
  und hoechstens 30 Aktualisierungen/Sekunde statt 24-Pixel-Spruengen plus
  jeweils 80 Millisekunden Pause. Lokale Zeit-, Abbruch- und Fehlerpruefungen
  bestehen. Die native Probe der Fassung `actions1` benoetigte 773 ms und
  19 Positionsaktualisierungen; trockene Landung und freie Bewegung danach
  sind bestaetigt. `actions2` aendert nur das gemeinsame Auswahlfenster,
  nicht die Kart- oder Rutschenbewegung.
- Die Auswahl einer Tischrunde endet beim letzten Verlassen. Gespeicherte
  Schachpartien werden deshalb nicht geloescht oder fremde Sitze uebernommen;
  ihre ausdruecklichen Wiederbeitritts- und Remisregeln bleiben erhalten.
- Die Tutorial-Ursache ist eingegrenzt: WorkAdventure speichert `tutorialDone`
  im Welt-Kontext, nicht als raumuebergreifendes Einstiegsmerkmal. Die
  Client-Korrektur ist isoliert gebaut; sieben neue Tutorial- und sechs
  vorhandene Schul-Anpassungspruefungen bestehen im echten Svelte-Pruefumfeld.
  Die isolierte native Browserprobe besteht einschliesslich Mobil-Raumwechsel
  mitten im Tutorial. Nach ausdruecklich erlaubter kurzer Unterbrechung ist
  `1.34.5-school-v4-onboarding` live. Nur der Client wurde ersetzt; alle
  sechzehn Vorschau-WAMs, bestehende Kartenziele und Schul-Anpassungen bleiben
  unveraendert. Die temporaere Testinstanz ist wieder beendet.
  Die anschliessende Liveprobe besteht mit zwei normal angemeldeten
  Microsoft-Schueler-Testkonten auf Desktop und 390-Pixel-Touchansicht:
  erstes Angebot, keine Wiederholung nach Raumwechsel oder Neuladen,
  ausdrueckliche Hilfe-Wiederholung und mobiler Abschluss. Freie Bewegung,
  temporaerer Avatarwechsel und frischer Schulzugang bestehen ohne
  JavaScript-Fehler. Die Einstiegs-Praeferenz gilt pro Browser und Konto;
  sie wird nicht als geraeteuebergreifende Speicherung ausgegeben.
  Details: `ops/workadventure-onboarding/README.md`.

Externe Angebote bleiben bis zur administrativen Freigabe gesperrt. Eine
korrekte Ablehnung wegen Alter/Klasse/fehlender Freigabe ist kein Anlass, diese
Schutzregeln bei der Aktionspruefung zu umgehen. Alle Testnachweise mit
Anmeldesitzungen oder detaillierten Bildern bleiben ausserhalb des Repositorys.

## Museums- und Musikbeitraege

Die vorhandene Verwaltung bleibt die Datenquelle. Der Katalog erkennt jetzt
auch eine reine Ziel-Link-Aenderung ohne anderen Titel oder neues Bild und
ohne vorhandenen Aenderungszeitpunkt. Der eingetragene Ziel-Link wird dabei
nur verglichen, nicht als direkter Aufruf vertraut: Geoeffnet wird weiterhin
ausschliesslich der vorhandene Portal-Endpunkt mit geprueftem Tafelkennzeichen.

Ein geaenderter ausgewaehlter Beitrag wird bei der naechsten Aktualisierung
wirklich neu geladen, nicht nur sein URL-Fragment veraendert. Die automatische
Pruefung erfolgt einmal pro Minute sowie beim Zurueckkehren in das Fenster;
der sichtbare Aktualisieren-Knopf bleibt erhalten. Ein deaktivierter Beitrag
schliesst sein Medienfenster und kehrt zur uebrigen Ausstellung zurueck.
Unveraenderte Beitraege und eine voruebergehend nicht erreichbare Verwaltung
unterbrechen dagegen keinen bereits laufenden Inhalt.

Statische Fassung `f2c8ce521afb19ac`: ausschliesslich `collection.html`,
`collection.js` und `catalog.js` ersetzt. Vierzehn Dateien und ihre unveraenderten
Sicherheitsheader wurden vor und nach dem Austausch geprueft; alle laufenden
Container, Karten und die gesamte Webserverdatei bleiben byte- beziehungsweise
startzeitgleich. Die historische Webserver-Pruefsumme wurde nicht still auf
die zwischenzeitliche fremde Konfigurationsaenderung umgeschrieben. Der erste
Versuch scheiterte an Verzeichnisrechten und setzte die eigene Verknuepfung
zurueck; nach Korrektur besteht die Auslieferungspruefung ohne Dienstneustart.

Neun lokale Inhalts-/Layoutfaelle und sechs weitere Faelle gegen die wirklich
veroeffentlichten Dateien bestehen bei 320, 390 und 780 Pixeln. Letztere verwenden
absichtlich eine kontrollierte Katalog-/Medienantwort: echte Schuldaten werden
nicht geaendert. Geprueft sind Ziel- und Versionsaenderung, neuer Titel,
unveraenderter laufender Inhalt, voruebergehender Ausfall, deaktivierter Beitrag,
weitere verfuegbare Tafeln und ein bereinigter Rueckweg. Keine Browserfehler.
Das ist keine neue Altersfreigabe, keine Lastabnahme und kein Beleg fuer die
Wiedergabefaehigkeit aller fremden Medienanbieter.

Die anschliessende native Zweipersonenprobe besteht in Museum und Musiksalon:
realer unveraenderter Katalog, echter Portal-Endpunkt mit HTTP 200 trotz neuem
Versionsparameter, stabiler Medienlink beim unveraenderten Aktualisieren,
steigende dekodierte Tisch-Audioenergie vor und waehrend des Seitenfensters,
bereinigter Rueckweg und freie Pfeiltastenbewegung nach dem Schliessen.
Eine Ansicht verwendet echtes emuliertes Touch bei 390 Pixeln. Beide Personen
sind getrennte kuenstliche QA-Identitaeten mit synthetischem Mikrofonton, keine
neuen Schulkonten. Keine Browserfehler; die fremden Videos wurden nicht als
vollstaendig abgespielt oder gemeinsam synchronisiert ausgegeben. Fruehere
Pruefversuche hatten das mobile Hauptmenue beziehungsweise seine zwei
gleichnamigen Aktionszugaenge falsch angesprochen; die Kartensteuerung blieb
unveraendert. Der aktuelle Nachweis liegt ausserhalb des Repositorys unter
`output/castle-gallery-native-qa/result.json`.

Die beiden Pages-Veroeffentlichungsversuche fuer `d227019` scheiterten im
Auslieferungsschritt nach jeweils zehn Minuten; Build und Artefakt-Upload
bestanden. Das Artefakt war mit 434.528.281 Byte nur 6.608 Byte groesser als
der vorher erfolgreich veroeffentlichte Stand. Eine neue Aufblaehung oder ein
allgemeiner GitHub-Ausfall sind damit nicht als Ursache bewiesen. Die eigenen
Galeriedateien sind unabhaengig davon auf dem VPS veroeffentlicht und geprueft;
alte Karten werden nicht zur Umgehung dieses Problems ersetzt. Die erneuerten
Karten-Skriptpakete benoetigen einen gesonderten erfolgreichen Pages-Nachweis.

## Eigenes geschuetztes Schlossklavier

Die ausdrueckliche Entscheidung fuer ein eigenes Schulklavier ersetzt die
fruehere externe Shared-Piano-Idee. Der getrennte Dienst `/castle-piano/`,
Fassung `8a1f180e9b723ef1`, ist produktiv und gesund. Kein vorhandener
WorkAdventure-, Karten-, Schach-, Atelier- oder Schuldienst wurde ersetzt.
Die Webserver-Ergaenzung besteht ausschliesslich aus der neuen Klavierrouting-
Regel; bisherige Regeln und historische Bereitstellungsnachweise bleiben erhalten.
Die alte Schlosswelt, Lehrerberechtigungen und Geheimwege sind unveraendert.

- Ein gemeinsames Klavier fuer hoechstens acht gleichzeitig Verbundene,
  Tonumfang C3 bis C6, bis zu acht gehaltene Tasten je Person und ein Haltepedal.
- Der Modus `Allein ueben` hat keinen gemeinsamen Notenkanal. Es werden keine
  Aufnahmen, Namen, Schulkonto-Kennungen oder Auffuehrungsverlaeufe gespeichert.
- Signierter WorkAdventure-Zugang und frischer Portalstatus bei Anmeldung
  und Erneuerung. Die erneuerbare Freigabe gilt hoechstens 45 Sekunden,
  begrenzt durch die gepruefte Anmeldung. Notenmeldungen erneuern sie nicht.
  Ein abgelaufener Microsoft-Zugang wird nicht durch erfundene Rollen ersetzt;
  dann ist die normale erneute Anmeldung erforderlich.
- Klassen-, Jahrgangs- und Altersregeln werden serverseitig durch dieselbe
  gepruefte Schulrichtlinie ausgewertet. Dieses eigene Instrument ist bewusst
  fuer aktive Schueler aller Altersstufen und aktive Lehrkraefte freigegeben,
  nicht fuer Eltern, unbekannte Konten oder vermeintliche Lehrer-Tags im Browser.
- Ein undurchsichtiges, kurzes HttpOnly-Cookie ist auf den Klavierpfad begrenzt.
  Keine Schul-Zugangsschluessel in URLs, WebSocket-Protokollen oder Spielerzustand.
  Ein weiteres Fenster braucht eine ausdrueckliche Uebernahme. Beim Verlassen,
  Verbindungsabbruch oder Freigabeablauf enden nur die eigenen Toene.
- Kamera, Mikrofon, Bildschirmfreigabe und Hardware-MIDI sind in der Klavierseite
  gesperrt. Sie erhaelt keinen Zugriff auf die WorkAdventure-Karten-API.
  Die normale Tischunterhaltung bleibt Aufgabe des vorhandenen nativen Audiobereichs.

Klang: [Tone.js Sampler 15.1.22](https://tonejs.github.io/docs/15.1.22/classes/Sampler.html),
aus fest geprueften Quellen lokal gebuendelt, mit allen Abhaengigkeits-Lizenzen.
13 unveraenderte Salamander-MP3-Dateien von Alexander Holm,
[CC BY 3.0 und feste Quellfassung](https://github.com/Tonejs/audio/tree/869b6f8d9cddb47d966238c012041480b1ce517a/salamander),
zusammen 843.324 Byte. Die eigentliche Klangbibliothek wird erst beim bewussten
Start geladen, nicht auf jeder Schlosskarte. Eigener Lautstaerkeregler und
Begrenzung der Summe; keine zusaetzliche fremde Musikverbindung.

29 lokale Domain-/HTTP-/Projektionsfaelle bestehen. Die echten Browserproben
pruefen Maus und Touch bei 320 und 390 Pixeln, hoerbaren Samplerklang im anderen
Browser, unabhaengiges Loslassen gleicher Toene, spaeteren Beitritt, privates
Ueben, Fenster-Uebernahme und abgelaufene Berechtigungen. Die getrennte VPS-
Vorpruefung verwendet echte Schulprofile hinter einer privaten Testverbindung;
die nachfolgende Produktivprobe verwendet den echten oeffentlichen WebSocket-
Handshake. Beide bestehen mit den zwei ausdruecklich vorgesehenen kuenstlichen
Microsoft-Schuelerkonten, ohne Rechte- oder Datenbankaenderungen.

Die native Kandidatenprobe besteht mit beiden normalen Microsoft-Schueler-
Testkonten: gemeinsame Wahl beim Hinsetzen, spaeterer Beitritt, echter
Klavierklang per Maus und Mobil-Touch in beide Richtungen und gleichzeitig
steigende dekodierte Sprachenergie in beiden nativen Tischverbindungen.
Aufstehen schliesst nur das eigene Klavier; der andere spielt weiter. Nach
dem letzten Aufstehen kann eine neue Runde die erhaltene Band-/Chor-Galerie
waehlen. Der ausdrueckliche Zugang am sichtbaren Klavier und normale Bewegung
nach dem Schliessen bestehen ebenfalls, ohne JavaScript-Fehler.
Sitzplaetze, Grafiken und drei getrennte Sprachbereiche werden dafuer nicht
veraendert. Detailbilder, Anmeldesitzungen und Betriebsnachweise bleiben privat.
Das ist weder ein samplegenau synchronisiertes Bandstudio noch eine Lastfreigabe
fuer 400 Personen. Das gesamte Schlossziel bleibt offen.

Die Probe hat einen vorhandenen WorkAdventure-Nebeneffekt aufgedeckt:
Native Popup-Klicks werden an alle registrierten Kartenfenster gesendet.
Die unsichtbare Rundenanmeldung besitzt kein solches Popup und meldete deshalb
einen unbekannten Popup-Schluessel. Ein frueher, ausschliesslich auf den
vertrauenswuerdigen Elternrahmen und genau diesen Nachrichtentyp begrenzter
Filter behebt dies in den beiden Runden-Hilfsseiten. Andere Zustands- und
API-Nachrichten bleiben unveraendert. Die echte veroeffentlichte `iframe_api.js`
reproduziert im ungefilterten Kontrollfenster den Fehler und bleibt im
gefilterten Fenster fehlerfrei. Zwei lokale Grenzpruefungen bestehen ebenfalls.

Die Hilfsseiten-Fassung `b7020b16c96c065f` bedient nur `presence`, `rounds`
und das neue kleine Hilfsskript mit unveraenderten Sicherheitsheadern. Der
Schuldienst und seine laufenden Runden wurden dafuer nicht neu gestartet;
alle bisherigen Dienststarts, Berechtigungen und Bereitstellungsnachweise
bleiben erhalten. Die Webserver-Umschaltung wird bis zur tatsaechlichen
Auslieferung aller drei erwarteten Inhalte beobachtet, nicht nach dem ersten
noch alten HTTP-Ergebnis als fehlgeschlagen behandelt.

Die Kandidatenprobe verwendet den zur vorhandenen Pruefbibliothek passenden
Chromium 151: Die aktuelle lokale Chrome-157-/Playwright-1.62-Kombination
umging in der Gegenprobe die Skriptumleitung in abgeschotteten Kartenfenstern.
Eine absichtlich strengere Autoplay-Einstellung blockierte zusaetzlich einen
nativen mobilen Empfang und ist kein bestandener Sprachnachweis. Die normale
native Testkonfiguration mit sichtbarer Mikrofonbedienung besteht; die separate
Klavierprobe besteht auch mit strenger Autoplay-Regel und bewusstem Tonstart.
Die nachfolgende Live-Abnahme ohne lokale Skriptumleitung bleibt erforderlich.

Diese Live-Abnahme ist anschliessend mit Chrome 157 und denselben beiden
normalen Schul-Testkonten bestanden, einschliesslich Mobil-Touch, Musik und
nativer Sprache in beide Richtungen, sichtbarer Auswahl, spaeterem Beitritt,
Aufstehen, erhaltener Galerie und freier Bewegung. Keine lokale Karten- oder
Skriptumleitung, keine Browserfehler. Pages-Lauf `42747604594` fuer Commit
`2e51f67` besteht; alle 29 veroeffentlichten Schloss-Laufzeitdateien sind exakt
gegen diesen Commit geprueft. Ausschliesslich `musikzimmer.wam` wurde auf die
Fassung `20261109-piano1` umgeschaltet. Seine drei nativen Sprachbereiche und
alle uebrigen WAM-Felder bleiben unveraendert. Lokaler Abschlussstand: 382
Node-Faelle, davon 381 bestanden und ein separater optionaler Widget-Browsertest
uebersprungen; 18 Python-Betriebs-/Umfangspruefungen bestanden.
