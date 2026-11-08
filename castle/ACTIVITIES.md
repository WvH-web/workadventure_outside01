# Aktivitaeten im neuen Schloss

## Zusaetzlicher Innenausbau

Die Fassung `20261108-expansion1` ergaenzt Oberstufe, Spielesaal, Museum,
Musiksalon, Atelier und Sternwarte. Alle sechs haben eine eigene Erzaehlrunde,
je zwoelf Sitze und drei getrennte Gespraechsbereiche. Die beiden neuen
Schlossgaenge ersetzen die frueheren grossen Innen-Planungsflaechen.
Aktueller Ausbau- und Abnahmestand: `BUILD-STATUS.md`.

Museum und Musiksalon verwenden den vorhandenen oeffentlichen Verwaltungskatalog,
keine kopierten Daten oder neuen Uploadordner. Titel und Bilder werden alle
60 Sekunden aktualisiert, der Seitenkatalog ausserdem beim erneuten Sichtbarwerden.
Ausgewaehlte Beitraege oeffnen im eigenen Inhaltsrahmen mit Rueckweg zur Liste.
Die Galerie liegt dafuer zusaetzlich auf der WorkAdventure-Domain unter
`/castle-content/`; die vorhandene Verwaltungs-CSP wird nicht gelockert. In der
reinen Grafikvorschau auf einer anderen Domain oeffnet der Beitrag extern.
Nur bekannte `show1` bis `show13` beziehungsweise `musik01` bis `musik07` und
Bildadressen des vorhandenen `museum_asset.php` werden angenommen. Gelieferte
Zieladressen werden nicht als Navigationsrecht vertraut; der Oeffnungsendpunkt
wird aus der geprueften Boardkennung gebaut. Kein Kamera-, Mikrofon- oder
Kartenschnittstellenzugriff fuer diese Inhaltsseiten.

Fuenf nordseitige Museumsrahmen verwenden native Karten-Webseiten mit echten
Verwaltungsbildern. Sie liegen vollstaendig auf gesperrten Wandflaechen, nicht
auf Laufwegen. Zurueckgezogene Katalogbilder werden entfernt; bei einem
kurzen Verbindungsfehler bleibt der letzte Stand sichtbar. Ein spaetes Ergebnis
nach dem Verlassen darf keine Bilder in die naechste Karte einfuegen.
Grundlage ist die dokumentierte [Karten-Webseiten-Schnittstelle](https://docs.workadventu.re/developer/map-scripting/references/api-room/).

Die sieben Expeditionen werden bewusst extern geoeffnet. PhET und Song Maker
sind weiterhin individuelle Arbeitsflaechen, NASA Eyes eine individuelle Ansicht;
gemeinsames Sprechen macht daraus keinen automatisch gemeinsamen Editor.
Die neu eingefuehrten Erzaehlvariablen werden dagegen tatsaechlich serverseitig
geteilt und sind wie die vorhandenen Grundschul-/Mittelstufenrunden nicht persistent.
Dies erweitert keine schulische Altersfreigabe. Die automatische Rotation und
weiteren echten Mehrspielerangebote bleiben offene Anforderungen des Gesamtziels.

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

Die oben beschriebenen sechs zusaetzlichen Innenraeume sind nun eingerichtet.
Weitere Sonderraeume, der Park und die tieferen Mehrspieler-Anbindungen bleiben
offen. Jeder Ausbau braucht freie Wege, passende Avatare, funktionierende
Angebote, getrennte Gespraechsgruppen und eine echte Mehrteilnehmerprobe.
Dies veroeffentlicht keine privaten Schlossplaene oder versteckten Verbindungen.

## Quellen und Wiederholung

Neue Grafiken wurden mit dem integrierten Bildgenerator erzeugt. Originale und
finale Prompts: `art/grundschule-20261108/` und `art/story-cards-20261108/`.
Die Raumgrafik ist `grundschule-20261108/room-source.png`, die freigestellte
Bautisch-Variante `grundschule-20261108/bookclub-source.png`; zugehoerige Prompts
sind `room-prompt.txt` und `table-prompt.txt`. Die Bautisch-Variante wurde aus der
Bibliotheks-Tischgruppe abgeleitet; das Bibliotheksoriginal blieb unveraendert.
Der Bildkartenbogen ist `story-cards-20261108/atlas-source.png`, sein finaler
Prompt `story-cards-20261108/prompt.txt`. Die neun kleinen WebP-Bilder werden
deterministisch daraus abgeleitet und sparen Uebertragungsvolumen im Seitenfenster.
Die Sofa-/Sesselgruppe stammt in unveraenderter Groesse aus der abgenommenen Halle.
Die Bibliotheksgrafik und deren Daten bleiben unveraendert. Der gemeinsame
Raumbauer wird auch fuer die neue Stube verwendet, ohne den Standardbau der
Bibliothek zu veraendern.

Tests: `tests/activities.test.mjs`, `tests/primary-common-room.test.mjs`,
`tools/check-activities-browser.cjs`, `tools/check-castle-browser.cjs` und
`tools/check-primary-live.cjs`. Der lokale Vorschaumodus der Erzaehlkarten
ist ausdruecklich nicht gemeinsam; echte Synchronisation wird nur nativ geprueft.
Private Testkonten, Tonquelle und Bildschirmbilder bleiben ausserhalb des Repositorys.

## Abnahme am 8. November 2026

130 Kernpruefungen bestanden. Die Vorschau mit acht Karten und allen zwoelf
neuen Sitzplaetzen bestand bei 1440, 390 und 320 Pixel Breite ohne Layout- oder
Browserfehler. Vier Erzaehlkarten-Ansichten und beide echten eingebetteten
Experimente bestanden die gesonderte Darstellungspruefung.

Vier getrennte native Profile bestaetigten alle drei Hoerbereiche inklusive
Stehplaetzen, getrennte Parallelgespraeche, beidseitige Kartenwechsel ohne
Neuladen, den spaeteren Beitritt eines dritten Lesers, Schliessen/Wiedereroeffnen,
das Behalten anderer offener Webseiten, getrennte Grundschul-/Mittelstufenrunden,
alle zwoelf Sitze, nichtleere Desktop-/Mobilgrafik und beide Richtungen der
Hallentuer. Keine Browserfehler. Nur kuenstliche Konten und Sprachton verwendet;
dies ist keine Hardware- oder 400-Personen-Lastabnahme.

Alle acht Vorschau-Wrapper wurden geprueft und ohne Server-Neustart aktualisiert.
Das bisherige Schloss, Village, Lehrerzimmer, Kino und Bibliothek blieben unveraendert.

Die endgueltige Fassung `20261108-gs2` hebt die beiden Sitzpunkte der Musikbank
um 14 Pixel auf die Polster. Die alte Vordergrunddatei bleibt erhalten; die neue
Fassung hat eine eigene Bildadresse. Nach dieser Anpassung wurde die komplette
native Viererprobe erneut bestanden: alle drei Gruppen, Erzaehlkarten mit spaetem
Beitritt und Raumtrennung, alle zwoelf Sitze, Desktop/Mobil und Hallentuer.
Die Sitzbilder wurden anschliessend mit den echten Avataren kontrolliert.
