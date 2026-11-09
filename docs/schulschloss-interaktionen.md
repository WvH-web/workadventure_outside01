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

- Geschuetztes Schach und WBO funktionieren mit zwei regulaer angemeldeten
  Microsoft-Schueler-Testkonten auf ihren echten Spielseiten.
- Die Atelier-Verknuepfung ist in der separaten Vorschau veroeffentlicht.
- Die erste Viererprobe scheiterte an einem Kartenskript-Ladezeitlimit. Nach
  Buendelung erreichten alle vier Teilnehmer die Steuerung ohne dieses
  Zeitlimit. Eine zusaetzliche zu breit gefasste Pruefung der geladenen Dateien
  brach noch vor der kombinierten Zeichen-/Audio-Probe ab. Diese ist nicht
  als bestanden dokumentiert und wird mit getrennten Kern-/Dekorationsmodulen
  erneut geprueft.
- Automatisches Oeffnen des festen Schachangebots beim Hinsetzen, Schliessen
  beim Aufstehen und Respektieren eines manuell geschlossenen Fensters sind
  implementiert und lokal getestet, aber noch nicht live abgenommen.
- Sichtbarer Go-Kart-Einstieg und Apps-Ausweichknopf sind implementiert;
  Live-Fahrt und Ausstieg sind erneut zu pruefen.
- Die Rutsche verwendet jetzt zeitbasierte Bewegung mit 480 Pixeln/Sekunde
  und hoechstens 30 Aktualisierungen/Sekunde statt 24-Pixel-Spruengen plus
  jeweils 80 Millisekunden Pause. Lokale Zeit-, Abbruch- und Fehlerpruefungen
  bestehen; die echte Bewegungsprobe steht noch aus.
- Gruppenweite Auswahl, spaeter Beitritt und letztes Verlassen sind noch
  keine fertig abgenommene Funktion. Individuelles Oeffnen gleicher Webseiten
  allein gilt ausdruecklich nicht als bestandene gemeinsame Runde.
- Die Tutorial-Ursache ist eingegrenzt: WorkAdventure speichert `tutorialDone`
  im Welt-Kontext, nicht als raumuebergreifendes Einstiegsmerkmal. Die
  Client-Korrektur ist noch nicht veroeffentlicht.

Externe Angebote bleiben bis zur administrativen Freigabe gesperrt. Eine
korrekte Ablehnung wegen Alter/Klasse/fehlender Freigabe ist kein Anlass, diese
Schutzregeln bei der Aktionspruefung zu umgehen. Alle Testnachweise mit
Anmeldesitzungen oder detaillierten Bildern bleiben ausserhalb des Repositorys.
