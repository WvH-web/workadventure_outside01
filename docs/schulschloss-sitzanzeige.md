# Kompakte Sitzanzeige

Stand: 11. November 2026, neue geschuetzte Schlossvorschau. Live abgenommen,
kein Ersatz des bisherigen Schlosses und keine 400-Personen-Freigabe.

## Bedienung

Hinsetzen und Aufstehen erscheinen als 144 x 44 Pixel grosse Schaltflaeche mit
Symbol unten links. Am Handy bleibt sie oberhalb der normalen Bedienleiste.
Sie verdeckt nicht mehr den rechten Spielbereich auf dem Desktop.
Die native Leertaste bleibt erhalten. Ein fokussierter Knopf reagiert einmal
beim Loslassen von Leertaste oder Enter, ohne dieselbe Aktion zusaetzlich an
Phaser weiterzugeben. Gedrueckthalten loest keinen Sitzwechsel im Kreis aus.

Nur die beiden exakten Sitzmeldungen auf den 16 registrierten neuen
Schlosskarten und der bestehenden Sternwarte-Kandidatenquelle bekommen diese
Darstellung. Andere Meldungen und bisherige Karten behalten unveraendert
die originale Anzeige. Neue Schlosskarten muessen bewusst aufgenommen werden.

Bei WAM-Raeumen muss die bereits aufgeloeste TMJ-Adresse der aktiven Szene
verwendet werden: `mapUrlFile`, nicht die anfangs leere Adresse im urspruenglichen
Room-Objekt. Beim Raumwechsel reagiert die Anzeige auf den echten Szenenwechsel;
der native Space-Listener wird wie bisher registriert und wieder entfernt.

## Pruefungen

- 38 fokussierte Komponenten-, Tastatur- und Quellenfaelle, ausserdem sieben
  bestehende Tutorial- und sechs bestehende Schulclientfaelle: 51 bestanden.
- Isolierter wirklicher Client mit kuenstlicher Identitaet, Desktop und
  Touch-Handy. Kein Zertifikats-Bypass und kein Austausch von Netzwerkantworten.
  Klick, Antippen, gehaltene Leertaste, fokussierte Leertaste/Enter, echte
  Seitenfenster, alte Popup-Darstellung, Raumwechsel, Tutorial und Avatarwechsel
  bestehen. Die erste Quellen-Erkennung war dort falsch und wurde nicht live
  freigegeben; ihre fehlgeschlagene Probe bleibt im Verlauf erhalten.
- Normale Live-Vorschau mit den zwei ausdruecklich freigegebenen synthetischen
  Microsoft-Schultestkonten, eines am Touch-Handy. Beide bedienen die wirkliche
  neue Sitzanzeige, sehen die gemeinsame Sternenmaschine und dekodieren nativen
  Tischton in beide Richtungen. Raumwechsel schliesst das Spiel, beendet den
  Sitzbesuch, wiederholt das Tutorial nicht und erlaubt wieder normales Laufen.
  Keine Netzwerk-/Berechtigungsantwort wurde ersetzt, keine echten Schueler.
- Vollstaendige lokale Node-Suite: 568 bestanden, zwei bestehende optionale
  Auslassungen, kein Fehler. Alle 140 Python-Betriebsfaelle bestehen, darunter
  13 neue Faelle fuer den eng begrenzten Auslieferungsabgleich.

Private Nachweise liegen auf D: unter `CodexScratch/WorkAdventure/output/`:
`seat-ui-stage/2026-11-11T22-22-33-843Z/result.json` und
`seat-ui-native/2026-11-11T22-31-46-688Z/result.json`. Screenshots und benoetigte
Messdaten bleiben erhalten; sie werden nicht als Kartenassets veroeffentlicht.

## Auslieferung

Nur die Frontend-Dateien des vorhandenen angepassten Schulclients wurden
ersetzt. Anmeldung, Pusher-Anpassungen, Avatar-API, alle sechs eingebundenen
Schuldateien und die vorherigen gehashten Clientdateien bleiben erhalten.
Es wurde ausschliesslich der Play-Client neu gestartet, nach ausdruecklicher
Freigabe. Alle Kartenbytes, Konfigurationen und uebrigen Dienste blieben gleich.

Der erste Live-Versuch wurde nach erfolgreichem Start vorsorglich auf den alten
Client zurueckgesetzt: Der Abgleich verglich die Reihenfolge von Umgebungswerten
und Mounts statt nur ihren vollstaendigen Inhalt. Der zweite Versuch erfolgte
nach erneuter ausdruecklicher Freigabe. Er sortiert ausschliesslich diese zwei
Reihenfolgen; geaenderte Werte, Quellen, Schreibrechte oder zusaetzliche Eintraege
werden weiterhin abgewiesen. Auch dies wird gesondert getestet.

Aktueller Client: `wvh-workadventure-play:1.34.5-school-v5-seat-ui-r2`, Image-ID
`sha256:fb84b493271e96d6e37bf2b143e09e16ecdc9957f357ad5db4ac1f576bf4e07a`.
Der vorherige Client bleibt als Ruecksetzstand erhalten. Der aktuelle Audit
ueber `tools/run-castle-audit.py` prueft die tatsaechliche neue Clientinstanz,
alle unveraenderten Karten und Dienste sowie die unveraenderten historischen
Abnahmen. Er erfindet keine alte Container-ID und schreibt keine alten
Abnahmeprotokolle um.

Die beiden eigenen, nicht mehr eingebundenen Bauausgaben wurden nach der
Abnahme entfernt (368.918.301 Bytes), ebenso das nie freigegebene erste
Kandidaten-Image und die wegwerfbaren Testidentitaeten. Aktueller Client,
Ruecksetzstand, Quellen und Pruefnachweise bleiben erhalten. Es wurde kein
allgemeines Docker-Prune ausgefuehrt. Grosse lokale Ausgaben liegen auf D:;
der lokale Teststarter verhindert zusaetzlich Python-Bytecode im Quellordner.

Die privaten neuen Betriebsnachweise stehen getrennt unter
`/opt/wvh-castle-seat-ui-retry/private`. Fruehere, auch fehlgeschlagene Nachweise
bleiben erhalten. Es gibt keinen noch offenen nativen Client-Abnahmeschritt.
