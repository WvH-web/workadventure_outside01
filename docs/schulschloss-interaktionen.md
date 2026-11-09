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
  Das mobile WorkAdventure-Seitenfenster ist jedoch niedriger als die gesamte
  Schachseite: fuer Brettunterkante und weitere Befehle ist momentan Scrollen
  oder Vergroessern des Fensters noetig. Eine kompaktere Hoehenaufteilung
  bleibt eine konkrete offene Verbesserung, nicht durch den DOM-Test erledigt.
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
  Sie ist noch nicht veroeffentlicht; Browserprobe und kontrollierter
  Client-Austausch stehen aus. Laufende Dienste wurden nicht neu gestartet.
  Details: `ops/workadventure-onboarding/README.md`.

Externe Angebote bleiben bis zur administrativen Freigabe gesperrt. Eine
korrekte Ablehnung wegen Alter/Klasse/fehlender Freigabe ist kein Anlass, diese
Schutzregeln bei der Aktionspruefung zu umgehen. Alle Testnachweise mit
Anmeldesitzungen oder detaillierten Bildern bleiben ausserhalb des Repositorys.
