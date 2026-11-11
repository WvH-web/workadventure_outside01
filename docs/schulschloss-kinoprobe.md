# Getrennte Filmprobe im neuen Schlosskino

## Umfang

Die neue Probe verwendet zwei genehmigte Schultestkonten mit ihren regulaeren
Microsoft-Anmeldungen in der wirklichen Schlossvorschau. Ein Teilnehmer nutzt
die mobile Touch-Ansicht. Karten, Schulprofile, Rollen und Gespraechsdienste
werden nicht ersetzt. Zuerst wird die echte oeffentliche Kinoseite im nativen
Seitenfenster geladen; ihr Programm muss fuer diesen Test leer sein.

Anschliessend werden ausschliesslich die Kinoabrufe dieser beiden Testbrowser
auf eine lokale Kopie des vorhandenen PHP-Players umgeleitet. Es ist keine
nachgebaute Spielerseite: Der Playercode, der Zeitabgleich und die Pause-/
Fortsetzfunktionen stammen aus der letzten verifiziert veroeffentlichten
Kinofassung. Deren Einstieg hat SHA-256
`8b0b4ee271959d9e45c378150a592b72c69a05c4778420c84f6cf1bc7c6b29ad`.
Ein aktueller erneuter Quellabruf vom Hosting ist damit **nicht** nachgewiesen.
Die oeffentliche Warteseite und ihre Einbettungsregeln werden aktuell gelesen.

Die eigene Testdatenbank enthaelt nur vier minimale `kino_*`-Tabellen und
kuenstliche Vorstellungen. Das ist keine Produktions-Schemamigration.
Konfiguration, Microsoft-Schluessel, echte Schuelerdaten und Datenbanksicherungen
werden nicht kopiert. Nur ein eigener animierter WebM-Testfilm wird abgespielt.
Eine FSK-12-Probe prueft die Verweigerung ohne separate Kino-Altersanmeldung,
nicht die vollstaendige reale Alterspruefung eines angemeldeten Kinozuschauers.

## Schutz und Wiederholung

- Datenbank und PHP lauschen nur auf eigenen freien lokalen Ports. Ein
  synthetischer Datenbankname, ein Besitzmarker und ein CLI-Schalter sind vor
  jeder Test-Steuerung Pflicht. Es gibt keinen oeffentlichen Test-Adminendpunkt.
- Die Quelle wird aus einer festen Dateiliste kopiert, ohne `config.php`,
  `.env`, Uploads oder Nutzerdateien. Das benoetigte oeffentliche Hintergrundbild
  wird anonym ueber normal geprueftes HTTPS geholt, auf PNG/Maximalgroesse
  kontrolliert und mit eigenem Herkunfts-/Hashbeleg erfasst.
- Der Testfilm wird mit dem vorhandenen FFmpeg erzeugt. Eine auf genau diese
  eine Datei begrenzte lokale Auslieferung benutzt das vorhandene Paket `send`
  fuer richtige HTTP-Bytebereiche. Konfigurationsabrufe, Schreibmethoden und
  Authorization-Header werden dort abgewiesen.
- Nur Kino-Requests werden umgeleitet. Die originalen Einbettungs-/Sicherheits-
  Header bleiben erhalten; WorkAdventure-Authorization darf nicht an das Kino
  weitergereicht werden. Unbekannte Assets und abweichende Quelldateien sind
  Fehler, nicht still ignorierte Ausnahmen.
- Profile, Quellbelege und Screenshots liegen unter
  `D:\CodexScratch\WorkAdventure`. PHP, Datenbank, Medienserver und Browser
  werden am Ende beendet. Erforderliche Nachweise bleiben erhalten; unbekannte
  oder noch frische abgebrochene Tempbereiche werden nicht zwangsweise geloescht.

Die Kartensteuerungs-Suche in der bisherigen nativen Probe lief nach einem
Treffer weiter durch fremde Fenster und konnte dort unbegrenzt warten.
`roomController` begrenzt nun jede Einzelabfrage und beendet die Suche bei
einem wirklichen Treffer. Zwei Einzelfaelle pruefen einen nicht antwortenden
Fremdrahmen, falsche/geschlossene Rahmen und den unveraenderten echten Treffer.
Die Suchdiagnose speichert keine URL-Abfrageparameter oder Anmeldeschluessel.

```powershell
node tools/run-castle-local.cjs tools/castle-cinema-stage.cjs --smoke
node tools/run-castle-local.cjs tools/check-castle-cinema-sync-native.cjs
```

Die zweite Probe benutzt nur die beiden vorhandenen genehmigten privaten
Schultest-Anmeldungen. Sie darf nicht mit echten Schuelerkonten oder einem
aktiven oeffentlichen Kinoprogramm ausgefuehrt werden. Der Testaufbau gehoert
nicht auf den produktiven Webserver.

## Stand vom 11. November

Die getrennte echte PHP-/MySQL-Grundprobe besteht: Leerlauf, Start, Pause,
Fortsetzung, Ende und gesperrte FSK-12-Quelle. Die gezielten 19 Node-Faelle
fuer die Probe, die Rahmensuche und die unveraenderte Kinosteuerung bestehen.

Vorige native Fehlversuche bleiben getrennt auf D: erhalten. Der erste Lauf
wurde nach Pruefung seiner konkreten lokalen Prozesskennungen beendet; er
hatte keine abgeschlossene Eintrittsmeldung. Der zweite lief nun begrenzt in
dieselbe Rahmensuche. Nach deren Korrektur meldeten sich beide Testteilnehmer
erfolgreich an. Ein weiterer Versuch dekodierte reale Bilder, scheiterte aber
an nicht seekbarer Auslieferung des Testfilms. Das wurde im Testaufbau mit
geprueften echten HTTP-Bytebereichen korrigiert, nicht durch groessere
Zeitabweichungstoleranzen im Player.

Der folgende Lauf erreichte alle sechs Fachszenarien, wurde jedoch korrekt
nicht abgenommen: Der letzte Vollstaendigkeitsabgleich beanstandete das in der
Kopie noch fehlende Hintergrundbild. Dieses wird nun gezielt mit Herkunftsbeleg
eingelesen. Ein weiterer Lauf schloss das Fenster sichtbar korrekt, wartete
aber mit der ungeeigneten Standard-Animationsabfrage auf den unsichtbaren
Steuerrahmen. Die Probe verwendet dort jetzt ausdruecklich 200-ms-Abfragen;
die unveraenderte Kinosteuerung wird nicht wegen eines Testfehlers umgeschrieben.
Kein Fehlversuch wird nachtraeglich als Abnahme ausgegeben.

## Bestandene native Kopienprobe

Der vollstaendige Lauf `2026-11-11T19-50-34-972Z` besteht mit zwei normal
angemeldeten Schultestkonten, darunter mobile Touchbedienung. Sechs Szenarien:

1. Die echte oeffentliche Warteseite oeffnet sich ohne Klick im nativen Kino.
2. Beide Browser dekodieren wirkliche Videobilder. Der zweite startet sieben
   Sekunden spaeter und findet trotzdem die laufende Filmposition. Sitzwechsel
   erhalten dasselbe Videoelement und Dokument. Eine absichtlich auf null
   verstellte Position wird vom unveraenderten Spieler wieder korrigiert.
3. Vorne empfangen beide keinen Tischton. Hinten dekodieren beide Sprache in
   derselben Gruppe; benachbarte Gespraechstische bleiben getrennt. Der Film
   laeuft in allen diesen Bereichen weiter.
4. Gemeinsames Pausieren entfernt beide Spieler und haelt die Filmzeit fest.
   Fortsetzen bringt beide wieder auf die Serverzeit.
5. Manuelles Schliessen wird respektiert. Ausdrueckliches Wiedereroeffnen,
   Gang zur grossen Halle und erneuter Kinoeintritt verwenden die aktuelle Zeit.
6. Ende entfernt beide Spieler. Ohne separate Altersanmeldung bleibt die
   kuenstliche FSK-12-Vorstellung gesperrt und gibt keine Videoquelle aus.

Alle neun Zeitabgleiche bestehen mit unveraenderter 3,5-Sekunden-Testgrenze.
Groesste gemessene Abweichung zur serverbezogenen Zielzeit: 1,483 Sekunden;
groesster Abstand der beiden Zuschauer: 1,234 Sekunden. Das sind einzelne
Messungen einer kontrollierten Probe, keine Garantie framegenauer Gleichheit
oder ein Nachweis fuer alle Fremdanbieter und Endgeraete.

Desktop-/Mobilbilder und Pixelpruefungen zeigen echte gefuellte Videoflaechen,
ohne horizontalen Inhaltsueberlauf. Alle 16 erhaltenen Quelldateien stimmen mit
ihren Pruefsummen ueberein. Es gibt keine unerwarteten Routenfehler oder
JavaScript-Seitenfehler. `stopped.json` bestaetigt den gestoppten eigenen
PHP-/MySQL-/Medienaufbau und unveraenderte Originalquellen; auch der Browserlauf
ist tatsaechlich beendet. Nachweise liegen privat auf D:, nicht im Webroot.

Die volle Node-Suite besteht danach mit 549 bestandenen Faellen, zwei
bisherigen optionalen Auslassungen und keinem Fehler. Alle 113 Python-
Betriebsfaelle bestehen. Die unveraenderte kuenstliche 400-Anfragen-Messung
erreicht 400 Erfolge in 4937 ms mit vorverbundenem Windows-Transport, maximal
16 gleichzeitigen Identitaets-/Profilpruefungen und ohne echte Microsoft-,
Datenbank- oder Anbieteranfragen. Sie ist weiterhin keine 400-Personen-Freigabe.
Die anschliessend herangezogene Live-Bestandspruefung bestaetigt denselben
akzeptierten Dienst-/Kartenstand; es gab fuer die Kinoprobe keinen Neustart
oder produktiven Datei-/Programmwechsel.

Fuer eine endgueltige Produktionsfilm-Abnahme fehlen weiterhin eine frisch
bestaetigte Hosting-Quellfassung und eine ausdruecklich vorgesehene reale
Testvorstellung samt Anbieter-/Zuschauerfreigaben. Der Gesamtschloss-Ausbau
und die Abnahme fuer 400 wirkliche Teilnehmer bleiben offen. Das bisherige
Schloss und das oeffentliche Kinoprogramm wurden nicht ersetzt oder gesteuert.
