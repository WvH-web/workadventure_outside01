# Gastgeber fuer externe Spielrunden

## Stand

Die Erweiterung ist implementiert und lokal geprueft, aber noch nicht live.
529 von 531 Node-Faellen bestehen; zwei bisherige optionale Faelle sind
ausgelassen. Die getrennte Zweibrowserprobe prueft 980, 390 und 320 Pixel.
Die bisherigen Spielseiten/PIN-Eingaben bestehen ebenfalls. Ihre Anbieter-
Antworten sind dabei synthetisch ersetzt, nicht als echte Partien getestet.
Die isolierte Linux-Vorpruefung besteht inzwischen mit 33 Faellen auf Node
24.22.2, ohne Netz, Schulschluessel oder echte Schuldaten. Alle 91 lokalen
Python-Betriebsfaelle bestehen ebenfalls. Native Tischtonprobe und kontrollierte
Veroeffentlichung stehen noch aus. Der Benutzer hat den kurzen Neustart nur
des Runden-/Schuldienstes am 11. November ausdruecklich genehmigt.

## Ablauf

- Eine normale Gespraechsrunde wird am gewuenschten Treffpunkt angeboten.
- Ein Teilnehmer erstellt beim freigegebenen Spielanbieter einen Raum und
  speichert dessen Link ueber die vorhandene Raumlink-/Moderator-PIN-Eingabe.
- Im Spielefenster bestaetigt dieser Teilnehmer den aktuell angezeigten Link
  als Gastgeber seiner Treffpunktrunde. Andere registrierte Teilnehmer sehen
  diese Bestaetigung automatisch und koennen mitspielen.
- Ein Linkwechsel braucht eine erneute ausdrueckliche Bestaetigung. Verlassen,
  Ablauf oder ausdrueckliches Beenden der Gastgeber-Anmeldung beenden nur das
  Spielangebot, nicht das Gespraech der uebrigen Teilnehmer.
- Ein Nachfolger wird nicht automatisch zum Spielgastgeber erklaert. Er muss
  den aktuellen Link selbst bestaetigen. Expliziter Wiederbeitritt rotiert die
  Mitgliedschaft und braucht ebenfalls eine neue Bestaetigung.

Die Rundenliste zeigt den Stand als `Gastgeber bestaetigt` beziehungsweise
`Gastgeber gesucht`. Das Spielefenster bleibt im selben Seitenfenster mit der
Liste verbunden. Der Rueckweg dorthin wird nur beim Einstieg aus diesem
Rundenfenster angeboten; ein direktes Spielefenster behauptet keinen eigenen
Zugriff auf die Kartenschnittstelle. Die bisherigen normalen Spielstarts ausserhalb einer
zugeordneten Gastgeberrunde bleiben erhalten. Innerhalb einer zugeordneten
Runde werden Mitspielen/Kopieren frisch gegen deren Bestaetigung geprueft;
der normale gespeicherte-Link-Start wird dort nicht als Ersatz angeboten.
Eine bereits laufende fremde Partie wird nicht ungefragt neu geladen.

## Grenzen und Schutz

Die Bestaetigung bedeutet eine freiwillige Gastgebermeldung in WorkAdventure,
nicht eine technische Aussage ueber den fremden Spielserver. Wer nur den
Fremdspiel-Tab schliesst, aber weiter im Schloss sitzt, muss seine Bestaetigung
selbst beenden. WorkAdventure umgeht keine Fremdseiten-Sperren und kann nicht
beobachten, ob ein externer Raum tatsaechlich existiert. Abrupter Verbindungs-
verlust endet spaetestens mit der vorhandenen maximal 90-sekuendigen Anmeldung;
eine Treffpunktrunde lebt insgesamt hoechstens zwei Stunden.

Die sieben bestehenden Anbieter-/Zielgruppenregeln bleiben unveraendert und
starten weiter als Entwuerfe fuer Schueler. Eine echte Schuelerfreigabe braucht
die redaktionelle Pruefung im Verwaltungsportal. Jeder Spielstart prueft frisch
Schulprofil, Alter/Klasse, Angebotsregel und aktuellen zentralen Link. Die PIN
ersetzt keine solche Freigabe. Es gibt keine zweite Raumlink-Datenbank.

Der kurzlebige Serverzustand enthaelt nur Angebotskennung, Revision, Hash des
Links und eine pro Prozess gesalzene Gastgeberzuordnung zur echten Anmeldung.
Die Rundenliste liefert keine Zieladresse, Namen, E-Mail, Alters-/Klassendaten
oder fremde Mitgliedschaftsschluessel. Ein verweigerter Angebotszugang gibt
auch keinen alten Spieletitel aus. Bei fehlendem Katalog wird kein Spiel als
bestaetigt angezeigt oder aus gespeicherten Rechten gestartet; das normale
Treffpunktgespraech kann weiterlaufen. Eine alte ausstehende Antwort kann
keine neuere Bestaetigung loeschen.

## Nachweise

18 neue Node-Faelle pruefen Zustand und echte HTTP-Aufrufe einschliesslich
Nonce-Bindung, Ablauf, Rollen-/Klassenverlust, geaenderten Links, eingeschraenkter
Sichtbarkeit, Katalogausfall und konkurrierenden Antworten. Die Browserprobe
verwendet zwei getrennte Profile und den wirklichen Servercode, aber nur
kuenstliche Schuldaten, PIN und Spielantworten. Sie prueft gegenseitiges
Aktualisieren, Linkwechsel, Nachfolger, Navigation im gleichen Seitenfenster,
Kontowechsel und abgelaufene Anmeldungen. Fehlversuche bleiben in eigenen
D:-Verzeichnissen erhalten, erfolgreiche Berichte werden nicht daruebergelegt.

Die abschliessende Linux-Vorpruefung des Kandidaten `3119b0c32934a5f1` besteht
am 11. November um 17:11 UTC. Vorher und nachher bestaetigt die volle
Server-Bestandspruefung gesunde bisherige Dienste einschliesslich der bereits
akzeptierten Runden-Wiederverbindung. Der Testbehaelter ist entfernt; weder
Karten noch Schulregeln oder laufende Dienstprozesse wurden geaendert.
Der vorherige Kandidat und seine eigene Linux-Pruefung bleiben als Verlauf
erhalten. Auch die vollstaendige HTML-Navigation in beide Richtungen wird
isoliert ohne Ersetzen der echten Mitgliedschaftskennung geprueft.

Quellen: `ops/castle-school/rounds.cjs`, `server.cjs`, `public/games.js`,
`public/rounds.js`; Tests: `tests/castle-game-host*.test.cjs`,
`tools/check-castle-game-host-browser.cjs` und die bestehende Spiele-Browserprobe.
Linux-/Paketpruefung: `tools/check-castle-game-host-linux.py`,
`tests/test_castle_game_host_linux.py` und `tools/package-castle-game-host-tests.cjs`.
Dies ist keine neue Lastabnahme und keine Fertigmeldung des gesamten Schlosses.
