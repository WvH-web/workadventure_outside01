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

Der gepruefte Client `1.34.5-school-v4-onboarding` ist am 9. November nach
ausdruecklicher Freigabe fuer eine kurze Unterbrechung veroeffentlicht.
Neustart: 21:33 UTC / 15:33 Costa Rica. Nur der Play-Client wurde ersetzt;
Anmeldungskonfiguration, fuenf vorhandene Rollen-Patches, Audio-, Karten- und
Spieledienste bleiben erhalten. Alle sechzehn Vorschau-WAMs sind bytegleich,
die bisherigen Village-/Nature-Ziele unveraendert. Das alte Schloss bleibt
bestehen. Unmittelbar vor dem Austausch waren keine Spielverbindungen aktiv.

Die optionale Wartungsfreigabe ist an den exakten Kandidaten, V3-Ausgangsstand
und die aktuelle Compose-Datei gebunden, laeuft nach 15 Minuten ab und wird
vor dem Austausch einmalig verbraucht. Ohne diese private Freigabe verhindern
weiterhin aktive Spielverbindungen den Austausch. Dreizehn isolierte
Pruefungen bestaetigen den gezielten YAML-Eintrag sowie Gueltigkeits-, Zeit-
und Umfangsgrenzen der Freigabe. Vollstaendiges V3-Image und originale
Compose-Datei bleiben als Ruecksetzstand erhalten. Kein erneuter Compilerlauf.

Die native Browserprobe in der Loopback-Testinstanz besteht jetzt ebenfalls:
erstes Angebot in zwei getrennten Browsern, Raumwechsel und Neuladen ohne
Wiederholung, ausdruecklicher Neustart im Profilmenue sowie ein mobiler
Raumwechsel mitten im Tutorial. Danach funktionieren Bewegung und der
vorhandene temporaere Avatarwechsel samt Rueckkehr. Die Probe verwendet
kuenstliche Gastidentitaeten, keine echte Microsoft-Anmeldung. Ein einfacher
JWT-Tausch im selben anonymen Browser ist kein gueltiger Microsoft-Kontowechsel:
WorkAdventure speichert anonyme Weltvariablen browserbezogen. Diese Grenze
wird nicht als bestandene Microsoft-Kontenprobe ausgegeben.

Die anschliessende Liveprobe besteht mit beiden ausdruecklich vorgesehenen
kuenstlichen Schueler-Testkonten nach normaler Microsoft-Anmeldung, eines
davon mit 390-Pixel-Touchansicht. Beide erhalten beim frischen Einstieg das
erste Angebot; Raumwechsel mitten in einer manuell gestarteten Wiederholung
und Neuladen bieten es nicht erneut an. Auf Desktop funktioniert ausdrueckliches
Ueberspringen, mobil der vorhandene kurze Ablauf mit `Next`, `Got it!` und
`Start exploring!`. Bewegung, temporaerer Kart-Avatar samt Rueckkehr und
frisch gepruefter Schuelerzugang zum Schachdienst bestehen. Keine
JavaScript-Fehler. Die ersten fehlgeschlagenen mobilen Pruefversuche hatten
einen Desktop-Ueberspringen-Knopf beziehungsweise falsche Schrittbeschriftungen
erwartet; es war keine weitere Client-Aenderung oder Unterbrechung noetig.
Browserlokale Speicherung bleibt browserlokal, nicht geraeteuebergreifend.

Die Abschaltpruefung der temporaeren Testinstanz besteht; sie ist nicht mehr
aktiv. Private Nachweise liegen unter dem serverseitigen Upgrade-Verzeichnis
`20261109-onboarding`, insbesondere `live-deployment.json` und
`post-rollout-check.json`. Die Live-Browser- und native Tischprobe werden
ebenfalls dort ohne Anmeldedaten gesichert. Die unabhaengige Nachpruefung vermerkt eine schon
vor dem Neustart bestehende Webserver-Manifestabweichung: Webkonfiguration
zuletzt um 19:22 UTC geaendert, Client erst um 21:33 UTC gestartet. Weder die
Webkonfiguration noch fremde Nachweise wurden dafuer ueberschrieben oder auf
einen alten Stand zurueckgesetzt. Ein spaeterer Inhalts-Rollout muss diese
Abweichung gezielt abgleichen; sie wird nicht als passende Pruefsumme ausgegeben.

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
