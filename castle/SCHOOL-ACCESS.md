# Schulfreigaben: Verwaltung und Servergrundlage

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
Die gemeinsame bisherige und neue Kernpruefung besteht alle 207 Faelle.

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

## Noch Nicht Angeschlossen

Die Karte und die Spielseiten verwenden diese Entscheidungen noch nicht.
Die bestehenden Karten und die bisherige oeffentliche Inhaltsdarstellung
bleiben erhalten. Es gibt durch diesen Arbeitsschritt also noch keine neuen Sperren
oder automatischen Schuelerfreigaben in WorkAdventure.

Die sieben vorhandenen Spielkennungen sind zunaechst nur als ungepruefte
Regelplaetze erfasst; fuer Lehrkraefte ist eine Vorschauentscheidung moeglich.
Das ist keine Behauptung, dass sieben Spielraeume eingerichtet oder fuer Kinder
freigegeben waeren. Die Portalpflege ist jetzt vorhanden, aber der getrennte
Schlossdienst verwendet noch seine Startkonfiguration statt des neuen Katalogs.

Als Naechstes folgen der Anschluss des Schlossdienstes an den neuen Katalog,
die Durchsetzung der Anbieter-/Pfadbindung und der geschuetzte tatsaechliche
Aufruf der Angebote. Eigene Dienste muessen spaeter auch direkte Beitritts-, Inhalts- und
Besuchsanfragen pruefen; eine ausgeblendete Schaltflaeche reicht nicht. Die
bestehenden dynamischen Raumlinks werden dabei weiterverwendet, nicht doppelt
gepflegt. Oeffentliche Fremdseiten bleiben unabhaengig erreichbar.

Eine Lastfreigabe fuer 400 Personen, die produktive persoenliche Zimmeranbindung
und die uebrigen Punkte in `BUILD-STATUS.md` bleiben offen. Technische Grundlage,
Betrieb und genaue Grenzen: `../ops/castle-school/README.md`.
