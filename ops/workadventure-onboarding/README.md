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

Die native Browserprobe in der Loopback-Testinstanz besteht jetzt ebenfalls:
erstes Angebot in zwei getrennten Browsern, Raumwechsel und Neuladen ohne
Wiederholung, ausdruecklicher Neustart im Profilmenue sowie ein mobiler
Raumwechsel mitten im Tutorial. Danach funktionieren Bewegung und der
vorhandene temporaere Avatarwechsel samt Rueckkehr. Die Probe verwendet
kuenstliche Gastidentitaeten, keine echte Microsoft-Anmeldung. Ein einfacher
JWT-Tausch im selben anonymen Browser ist kein gueltiger Microsoft-Kontowechsel:
WorkAdventure speichert anonyme Weltvariablen browserbezogen. Diese Grenze
wird nicht als bestandene Microsoft-Kontenprobe ausgegeben.

## Bau-Cache

`tools/build-castle-onboarding.py` legt kuenftig fuer jeden Lauf einen neuen
eindeutigen Buildx-Builder an. Nach normalem Ende, Fehler oder kontrolliertem
Abbruch beendet der gleiche Prozess seinen eigenen Build-Client und entfernt
im `finally` nur diesen Builder mitsamt Cache. Ein noch laufender Build-Client
mit demselben Buildernamen verhindert die Entfernung. Fremde, alte oder
Standard-Builder werden nicht uebernommen; es gibt weder globales Prune noch
erzwungene Entfernung. Bilder, Quellen, Logs und Pruefnachweise bleiben erhalten.
Neun lokale Steuerungspruefungen verwenden ausschliesslich simulierte
Prozess-/Dockeraufrufe; fuer diese Helfer-Aenderung wurde kein Compiler gestartet.

Die Serverbereinigung vom 9. November entfernte den bisherigen gestoppten
Builder samt rund 3,56 GiB Cache. Kandidat, Pruefimage, V3 und vollstaendiger
alter Rollback wurden erhalten. Fuer die Tutorialkorrektur wird deshalb der
schon gepruefte Kandidat wiederverwendet, nicht erneut gebaut.

Eine frische schlanke Laufzeitbasis bleibt ein eigener abnahmepflichtiger
Umbau: sechs laufende Dienste und Ruecksetzcontainer teilen derzeit V3s grosse
Layer. Ein zusaetzliches nur nominell kleineres Play-Image koennte auf dem
Host zunaechst mehr Speicher belegen. Anmelde-/Rollen-Patches, benoetigte
Node-Abhaengigkeiten, native Binaerdateien und saemtliche Browser-/Avatarassets
muessen vor einer gemeinsamen Umstellung vollstaendig nachgewiesen werden.
