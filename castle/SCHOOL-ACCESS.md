# Schulfreigaben: Servergrundlage

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

## Noch Nicht Angeschlossen

Die Karte und die Spielseiten verwenden diese Entscheidungen noch nicht.
Bestehende Karten und die bisherige oeffentliche Museumsverwaltung bleiben
unveraendert. Es gibt durch diesen Arbeitsschritt also noch keine neuen Sperren
oder automatischen Schuelerfreigaben in WorkAdventure.

Die sieben vorhandenen Spielkennungen sind zunaechst nur als ungepruefte
Regelplaetze erfasst; fuer Lehrkraefte ist eine Vorschauentscheidung moeglich.
Das ist keine Behauptung, dass sieben Spielraeume eingerichtet oder fuer Kinder
freigegeben waeren. Die Startkonfiguration ist noch kein live aktualisierbares
Verwaltungsformular.

Als Naechstes folgen Pflege und Freigabe im Verwaltungsportal, die Bindung an
gepruefte Anbieter und Zieladressen und der geschuetzte tatsaechliche Aufruf der
Angebote. Eigene Dienste muessen spaeter auch direkte Beitritts-, Inhalts- und
Besuchsanfragen pruefen; eine ausgeblendete Schaltflaeche reicht nicht. Die
bestehenden dynamischen Raumlinks werden dabei weiterverwendet, nicht doppelt
gepflegt. Oeffentliche Fremdseiten bleiben unabhaengig erreichbar.

Eine Lastfreigabe fuer 400 Personen, die produktive persoenliche Zimmeranbindung
und die uebrigen Punkte in `BUILD-STATUS.md` bleiben offen. Technische Grundlage,
Betrieb und genaue Grenzen: `../ops/castle-school/README.md`.
