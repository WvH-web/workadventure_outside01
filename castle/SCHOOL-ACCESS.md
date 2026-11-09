# Schulfreigaben und Spielstart

Die neue getrennte Schnittstelle ist bereitgestellt und live geprueft. Sie
ordnet ein gueltig angemeldetes Konto bei jeder Anfrage frisch der vorhandenen
Schuldatenbank zu. Der Browser bekommt nur Freigabeentscheidungen, keine
Geburtsdaten, Altersangaben, Klassen oder vollstaendigen Schuelerprofile.

Klasse und Alter bleiben getrennte Bedingungen und muessen beide passen, wenn
beides verlangt wird. Fehlende Geburtstage werden nicht geschaetzt. Eltern
werden keinem ihrer Kinder gleichgesetzt; doppelte oder widerspruechliche
Zuordnungen geben beschraenkte Angebote nicht frei. Lehrkraft-Outfits oder alte
Rollenangaben im Anmeldetoken ersetzen die frische Pruefung nicht.

Bestanden sind achtzehn neue Schnittstellenpruefungen und sechsunddreissig
SQL-Faelle mit kuenstlichen Daten. Der Livecheck erkennt ein autorisiertes
Lehrkraftkonto und weist unbekannte Testkonten auch mit signierter teacher-Angabe
ab. Abgelaufene Tokens, fremde Urspruenge und mitgeschickte Klassen-/Alterswerte
werden abgewiesen. Vier parallele Testabfragen sind geprueft. Keine Schuelerdaten
wurden veraendert und kein vorhandener WorkAdventure- oder Ansagedienst neu
gestartet.
Die gemeinsame bisherige und neue Kernpruefung besteht alle 227 Faelle.

## Verwaltung Bereitgestellt

Die neue Seite [Schlossangebote](https://deutsche-online-schule.com/schooltools/verwaltung/admin/workadventure_castle.php)
ist fuer Administratoren und Verwaltung bereitgestellt, erreichbar von der
bisherigen Museumsverwaltung ueber **Schlossfreigaben**. Sie verwaltet
Zielgruppen, Altersgrenzen, Klassenstufen und konkrete Klassen als getrennte
UND-Bedingungen, Gueltigkeitszeitraum sowie geprueften Anbieter und Pfad.
Vorhandene Titel und Raumlinks werden weiterverwendet, nicht doppelt gepflegt.
Eine Versionspruefung schuetzt vor dem Ueberschreiben neuerer Bearbeitungen.

Die private Katalogschnittstelle liefert diese Regeln und aktuelle Zieladressen
ohne Sitzung oder Schuelerprofil. Alle sieben Regelplaetze starten als Entwurf,
nicht als angenommene Freigabe fuer Kinder. 59 isolierte PHP-/MySQL-Faelle
bestanden auch auf dem Portalhost. Neun synthetische Formularansichten in
1440, 390 und 320 Pixel Breite pruefen Darstellung und Bedienelemente;
Rollen- und CSRF-Fehler sind dabei getrennt geprueft. Eine echte neue
Microsoft-Adminanmeldung wurde damit nicht simuliert oder behauptet.

Die bisherige Raumlink-PIN-Pruefung bleibt zustaendig. Der vorhandene
Controller bestaetigt fuer einen kuenftigen Schloss-Controller nun auch in
POST-JSON ausdruecklich Erfolg oder Fehler; seine GET-Antwort und die bisherigen
Raumlinks bleiben unveraendert. Die Liveprobe mit falscher PIN hat weder die
Adresse noch ihren Zeitstempel geaendert.

## Geschuetzter Spielebereich

Der neue [Spielebereich](https://together.deine-schule.com/castle-school/games)
liest das bestehende WorkAdventure-Anmeldetoken nur auf dessen eigenem Ursprung.
Es wird weder in eine URL geschrieben noch an Spielanbieter weitergegeben.
Spielesaal, Oberstufensalon und Hallen-Spieltisch oeffnen diesen Bereich ohne
WorkAdventure-Scriptfreigabe. Die bisherige Schloss-Spielseite leitet ebenfalls
dorthin und enthaelt keine eigene oeffentliche Umgehungsliste mehr.

Der tatsaechliche Start prueft Profil, Portalregeln, Datum und geprueften
Anbieter-/Pfadbereich erneut auf dem Server. Ein alter erlaubter Knopf, ein
anderer Klassenwert im Browser oder ein teacher-Tag ersetzen diese Pruefung
nicht. Der allgemeine Katalog enthaelt keine Zieladressen. Nur berechtigte
Aufrufe bekommen den aktuellen Raumlink. Die bisherige statische Startdatei
ist fuer diese Entscheidungen nicht mehr die Laufzeitquelle.

Die sieben Regelplaetze bleiben Entwuerfe. Aktuell sind fuenf Zieladressen
eingerichtet und fuer echte berechtigte Lehrkraefte als Vorschau erreichbar;
zwei bleiben ausdruecklich leer. Fuer Schueler wird ohne bewusste Portal-
Freigabe kein Spiel aktiviert. Das ist keine pauschale Kinderfreigabe der
Anbieter und keine Behauptung, dass sieben laufende Spielraeume existieren.

Raumlinks werden im offenen Spielebereich automatisch neu geprueft. Der
Gastgeber kann sie mit der bestehenden Moderator-PIN aendern; Anbieter-/Pfad-
wechsel sind nicht dadurch freigegeben. Nach dem Speichern wird unmittelbar
ein neuer Abruf gestartet. Zwei getrennte Browser bestaetigen, dass auch
andere wartende Teilnehmer ohne Neuladen den neuen Link sehen. Ein bereits
laufendes Fremdspiel wird dabei nicht ungefragt neu geladen.

Die synthetische Browserprobe prueft ausserdem falsche PIN, unabgeschickte
Eingaben waehrend Aktualisierungen, einen verspaeteten alten Abruf, Kontowechsel,
serverseitigen Berechtigungsverlust und direkte unberechtigte Startanfragen.
Seitenfenster und externer Tab werden getrennt geprueft, Einbettungssperren
nicht umgangen. Mobil gibt es eine kompakte Angebotsauswahl. Keine realen
Schueler und keine produktiven Raumlink-Aenderungen wurden dafuer verwendet.
Die native Vierpersonenprobe in WorkAdventure ist ebenfalls bestanden: zwei
getrennte Tischgespraeche mit weiterlaufender, tatsaechlich dekodierter
Sprachuebertragung waehrend der Spielefenster, verweigerte direkte Starts fuer
unbekannte Testkonten, Schliessen/Wiederoeffnen ohne doppelte Fenster sowie
normale Tastaturbewegung nach dem Verlassen. Spielesaal, Oberstufe und Halle
verwenden denselben Einstieg; Raumwechsel entfernen das alte Fenster. Desktop
und Mobil zeigen Karte und passende Bedienelemente ohne leere Spielflaeche.
Auf schmalen Spielflaechen wird das native Aktionsmenue benutzt.

Die zusaetzliche echte Lehrkraft-UI-Probe erkennt die frische Schulrolle und
loest einen aktuellen Vorschau-Raum auf, ohne einen weiteren Lehrkraft-Avatar
in WorkAdventure anzumelden. Die vier nativen Teilnehmer waren ausschliesslich
unbekannte synthetische Konten. Das ist keine native Freigabeprobe mit einem
echten Schuelerkonto und keine gestartete Partie bei einem Fremdanbieter.

Die bisherigen Karten und die bisherige oeffentliche Inhaltsdarstellung
bleiben erhalten. Oeffentliche Fremdseiten und bereits bekannte externe
Raumadressen sind unabhaengig weiter erreichbar; diese Schulfreigabe kann
keinen fremden Anbieter nachtraeglich sperren. Eigene Dienste muessen spaeter
auch direkte Beitritts-, Inhalts- und Besuchsanfragen schuetzen, insbesondere
die noch nicht angeschlossenen persoenlichen Zimmer.

Eine Lastfreigabe fuer 400 Personen, die produktive persoenliche Zimmeranbindung
und die uebrigen Punkte in `BUILD-STATUS.md` bleiben offen. Technische Grundlage,
Betrieb und genaue Grenzen: `../ops/castle-school/README.md`.
