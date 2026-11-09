# Einmaliges Einstiegs-Tutorial

Gezielte Ergaenzung fuer den vorhandenen WorkAdventure-Quellstand v1.34.5,
Commit `38c808924267157fb3bd3f7a943de35f026e4773`. Die vorhandene
Upstream-Lizenz bleibt fuer die geaenderten WorkAdventure-Dateien massgeblich.
Keine neue Laufzeitbibliothek und keine Aenderung der Anmeldung oder Rollen.

`onboarding.patch` aendert ausschliesslich den Onboarding-Store und dessen
Svelte-Komponente. `OnboardingVisit.ts` merkt sich das erste tatsaechliche
Anbieten lokal pro Browser und WorkAdventure-Konto. Es werden keine Tokens,
Klassen, Altersangaben oder Berechtigungen gespeichert oder uebertragen.
Die schon lokal vorhandene Konto-UUID dient ausschliesslich als Zuordnung
dieser UI-Praeferenz, niemals als Zugangsberechtigung.

- Schon das erste Anbieten wird gemerkt; ein Raumwechsel mitten im Tutorial
  startet es deshalb nicht erneut.
- Bisherige abgeschlossene Welt-Tutorials werden uebernommen.
- Ausgeschaltetes Tutorial und laufende Gespraeche verbrauchen den ersten
  spaeter geeigneten Einstieg nicht.
- Ueberspringen und Abschliessen behalten das vorhandene Welt-Merkmal bei.
- Ausdrueckliches Wiederholen ueber die Hilfe bleibt moeglich, auf Desktop
  und Mobilgeraeten.
- Bei gesperrtem oder vollem Browserspeicher bleibt die Praeferenz waehrend
  der geoeffneten Anwendung im Speicher. Ein browseruebergreifendes oder
  geraeteuebergreifendes Versprechen wird damit nicht gemacht.
- Ein noch ausstehender Start-Timer wird beim Zerstoeren der alten
  Raum-Komponente entfernt; die alte Tutorial-Ansicht wird geschlossen.

## Pruefstand

Die quellstandsgebundene Vorbereitung und der auf zwei CPUs / 4 GiB begrenzte
isolierte Compilerlauf bestehen. Sieben Store-Pruefungen und sechs vorhandene
Pruefungen der Schul-Anpassungen bestehen im echten WorkAdventure-/Svelte-
Pruefumfeld. Alle vorher vorhandenen Quellanpassungen bleiben bytegleich.

Das ist noch keine Veroeffentlichung des Clients: Laufende WorkAdventure-,
Anmelde-, Audio- und Karten-Dienste wurden nicht ersetzt oder neu gestartet.
Browserprobe, Ruecksetzstand und kontrollierte Client-Auslieferung folgen
separat. Der Compiler ist kein Grund, einen laufenden Teilnehmer zu trennen.
