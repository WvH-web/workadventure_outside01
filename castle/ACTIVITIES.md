# Aktivitaeten im neuen Schloss

## Grundschulstube

Die eigene kleine Karte `grundschule.tmj` hat zwoelf Sitzplaetze und drei getrennte
native Hoerbereiche. In der neuen Halle fuehrt die zusaetzliche kleine Tuer links
unten dorthin. Die bestehende Halleneinrichtung bleibt im bestaetigten Massstab;
nur die Tuer wurde als Ausschnitt der vorhandenen Architektur ergaenzt.
Alte Bilddateien bleiben fuer noch offene Clients erhalten.

- Vorlese- und Erzaehlrunde: sechs Plaetze und gemeinsame Erzaehlkarten.
- Bau- und Spieltisch: vier Plaetze, [PhET Flaechen belegen](https://phet.colorado.edu/de/simulations/area-builder).
- Musiknische: zwei Plaetze, [Chrome Music Lab Song Maker](https://musiclab.chromeexperiments.com/).

## Mittelstufenraum

Die unveraenderte Einrichtung bekommt dieselbe getrennte Aktivitaetssteuerung:
Erzaehlkarten an der Kaminrunde, die sieben vorhandenen Verwaltungs-Spielseiten
am Spieltisch und Song Maker in der Kreativecke. Die bestehenden Raumlinks/PIN-
Seiten werden wiederverwendet, nicht neu kopiert oder mit festen Sitzungscodes ersetzt.
Schachbrett und Zeichenmaterial bleiben Dekoration; es wird kein alter,
unzuverlaessiger Schach-Prototyp als fertiges Spiel ausgegeben.

## Gemeinsame Erzaehlkarten

Drei von neun Bildmotiven werden raumweit geteilt. Neu legen, spaeteres Beitreten,
Schliessen und erneutes Oeffnen verwenden denselben aktuellen Stand. Grundschule
und Mittelstufe haben unterschiedliche Variablen und getrennte WorkAdventure-Raeume.
Keine Namen, Geschichten, Nachrichten, Punkte oder persoenlichen Profile werden
geschrieben. Die Variablen sind nicht persistent und verschwinden, wenn der Raum
leer wird beziehungsweise der Server neu startet.

Dies ist eine offene kreative Runde, kein regelgebundenes Wettkampfspiel:
Alle im Raum duerfen neu legen. Gleichzeitiges Legen folgt der letzten vom Server
angenommenen Aenderung; es gibt weder Zugbesitz noch Belohnungen oder privaten
Gruppeninhalt. Die Anzeige uebernimmt nur gepruefte Bildkennungen aus dem
Serverzustand und erfindet bei Schreibfehlern keine lokale gemeinsame Runde.

Die Integration nutzt die dokumentierten [Raumvariablen](https://docs.workadventu.re/developer/map-scripting/variables/)
und die [State-API](https://docs.workadventu.re/developer/map-scripting/references/api-state/).
Nur die exakt eigene `story.html` bekommt ueber die
[CoWebsite-API](https://docs.workadventu.re/developer/map-scripting/references/api-nav/)
Zugriff auf die Kartenschnittstelle. Externe Experimente und die Spieleliste
bekommen keinen API-, Kamera- oder Mikrofonzugriff. Seiten oeffnen erst nach
bewusstem Klick; verlassen und entsorgen schliessen nur das eigene Fenster.

PhET und Song Maker laufen im Seitenfenster; die Gespraechsgruppe bleibt aktiv.
Ihre Arbeitsflaechen sind nicht gemeinsam synchronisiert. Gemeinsam besprechen,
parallel ausprobieren oder die native Bildschirmfreigabe nutzen ist moeglich.
Song Maker erfordert laut Anbieter kein Konto. Die Erzaehlkarten dagegen werden
tatsaechlich ohne Neuladen zwischen den Teilnehmern synchronisiert.

## Grenzen und weitere Raeume

Die Bezeichnung Grundschule ist kein neuer serverseitiger Klassen-/Altersfilter.
Alle fuer die Schlossvorschau berechtigten Nutzer koennen diese Angebote oeffnen.
Altersgebundene Inhalte brauchen spaeter eine frisch gepruefte Freigabe aus dem
Portal; versteckte Schaltflaechen allein sind kein Schutz. Keine Portal-Anmeldung,
Elternfreigabe oder Lehrkraftberechtigung wird durch diesen Ausbau veraendert.
Die noch lokale Sternenhueter-Schulbruecke und private Zimmer werden nicht durch
einen ungeprueften Testzugang ersetzt oder als bereits produktiv eingebunden ausgegeben.

Weitere Raeume werden einzeln eingerichtet und mit passenden Angeboten versehen:
Spielesaal, Oberstufe, Atelier und wechselnde Ausstellungen. Jeder fertige Raum
braucht freie Wege, passende Avatare, funktionierende Angebote, getrennte
Gespraechsgruppen und eine echte Mehrteilnehmerprobe. Dies veroeffentlicht keine
privaten Schlossplaene oder versteckten Verbindungen.

## Quellen und Wiederholung

Neue Grafiken wurden mit dem integrierten Bildgenerator erzeugt. Originale und
finale Prompts: `art/grundschule-20261108/` und `art/story-cards-20261108/`.
Die Sofa-/Sesselgruppe stammt in unveraenderter Groesse aus der abgenommenen Halle.
Die Bibliotheksgrafik und deren Daten bleiben unveraendert. Der gemeinsame
Raumbauer wird auch fuer die neue Stube verwendet, ohne den Standardbau der
Bibliothek zu veraendern.

Tests: `tests/activities.test.mjs`, `tests/primary-common-room.test.mjs`,
`tools/check-activities-browser.cjs`, `tools/check-castle-browser.cjs` und
`tools/check-primary-live.cjs`. Der lokale Vorschaumodus der Erzaehlkarten
ist ausdruecklich nicht gemeinsam; echte Synchronisation wird nur nativ geprueft.
Private Testkonten, Tonquelle und Bildschirmbilder bleiben ausserhalb des Repositorys.
