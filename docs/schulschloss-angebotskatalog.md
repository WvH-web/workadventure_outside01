# Angebotskatalog fuer das Schulschloss

Recherche und technischer Vorabcheck: 7. November 2026.
Ergaenzung zum [Raumkonzept](schulschloss-konzept.md).

## Auswahl und Einordnung

Die Seitenansicht in WorkAdventure soll das Angebot mit dem gemeinsamen Ort
verbinden. Eine Person kann allein beginnen und trotzdem fuer andere am Tisch
ansprechbar bleiben. Echte Mehrspielerangebote teilen darueber hinaus denselben
Spiel- oder Arbeitszustand. Diese beiden Faelle werden nicht gleichgesetzt.

Die folgende Auswahl ist eine redaktionelle Vorauswahl, keine pauschale Freigabe
fuer Grundschule oder Mittelstufe. Anbieterbedingungen, Inhalte, Werbung,
Kontovoraussetzungen und schulische Freigaben bleiben pro Angebot zu pruefen.
Es werden ausgewaehlte Spiele oder Projekte verlinkt, nicht wahllos ganze Portale.

Einbettungsstatus:

- Dokumentiert: Der Anbieter beschreibt einen Einbettungsweg. Die konkrete
  Aktivitaet muss trotzdem im WorkAdventure-Seitenfenster getestet werden.
- Kandidat: Funktionen sind beschrieben; der Seitenfenster-Test ist noch offen.
- Eingeschraenkt: Nur bestimmte Anwendungen oder eigene Integration eignen sich.
- Extern: Einbettungssperre beobachtet; direkter externer Aufruf als Ausweichweg.

Die Alterszuordnung erfolgt spaeter im Verwaltungsportal aus geprueftem Schulkonto,
Klasse und Alter. Ein geeignet wirkendes Spiel ist nicht automatisch fuer alle
Kinder oder alle Nutzungsarten freigegeben.

## Gemeinsam spielen

| Angebot und Quelle | Nutzung im Schloss | Gemeinsamkeit und Einstieg | Seitenfenster |
| --- | --- | --- | --- |
| [Gartic Phone](https://garticphone.com/en) | Zeichen- und Geschichtenrunde im Mittelstufenraum | Gemeinsam schreiben, zeichnen und Ergebnisse ansehen; passende Raumadresse teilen | Kandidat; technischer HEAD-Abruf erhielt 403, kein Nachweis einer Einbettungssperre |
| [Skribbl](https://skribbl.io/) | Kurze Zeichen- und Ratespiele | Privater Raum; eigene Woerter moeglich; gemeinsam dieselbe Raumadresse nutzen | Kandidat |
| [Codenames](https://codenames.game/) | Wortspiel-Tisch fuer sprachlich passende Gruppen | Raumlink teilen; Anbieter sieht eigenen Sprachchat vor, den WorkAdventure liefern kann | Kandidat |
| [PlayingCards.io](https://playingcards.io/docs/faq) | Ausgewaehlte Karten-, Wuerfel- und Brettspieltische | Synchronisierte Spielflaeche; Regeln und Gewinner werden von den Spielern selbst bestimmt | Kandidat; kein automatischer Regelmotor |
| [BuddyBoardGames](https://buddyboardgames.com/) | Einfache Zweispielertische und kleine Gruppen | Laut Anbieter ohne Anmeldung; Katalog nennt unter anderem Schach, Dame, Memory, Vier gewinnt und Ludo | Kandidat; einzelne passende Spiele statt gesamtem Katalog freigeben |
| [Jigsaw Explorer](https://www.jigsawexplorer.com/multiplayer-jigsaw-puzzle-games/) | Ruhiger Puzzletisch in Bibliothek oder Galerie | Alle sehen denselben Fortschritt; spaeter dazukommen moeglich; Ersteller kann gehen, andere spielen weiter | Kandidat; direkter technischer Abruf erhielt 403, Browserpruefung offen |

PlayingCards.io ist auch fuer selbst gestaltete Schlossspiele interessant, bietet
aber nicht automatisch regelkonformes Schach. Kostenlose inaktive Raeume laufen
laut Anbieter ab; aktuelle Raumlinks und Wiederverwendung muessen gepflegt werden.
Bei BuddyBoardGames gehoeren nicht alle angebotenen Spiele in die schulische
Vorauswahl. Der Katalog allein ist kein Nachweis einer Werbe- oder Inhaltsfreigabe.

## Gemeinsam gestalten und arbeiten

| Angebot und Quelle | Nutzung im Schloss | Gemeinsamer Zustand | Seitenfenster |
| --- | --- | --- | --- |
| [Shared Piano](https://experiments.withgoogle.com/shared-piano) | Musikzimmer, spontane Klangrunde | Laut Anbieter bis zu zehn Personen gleichzeitig, ohne Anmeldung; gleicher Raumlink erforderlich | Kandidat |
| [WBO](https://github.com/lovasoa/whitebophir) | Maltisch, gemeinsame Schlosszeitung, Raetselwand | Gemeinsames Zeichnen in Echtzeit, gespeicherte Boards; eigene Instanz moeglich | Kandidat; fuer dauerhaften Schuleinsatz eigene geschuetzte Instanz bevorzugen |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | Ideen sammeln, Karten zeichnen, Geschichten planen | Gehostete Anwendung hat Echtzeit-Zusammenarbeit; eigene Integration moeglich | Kandidat; reine Zeichenkomponente bringt noch keinen fertigen Mehrspielerdienst mit |
| [CryptPad](https://docs.cryptpad.org/en/user_guide/user_account.html) | Zusammen schreiben, Schuelerzeitung und Projektplanung | Dokumente gemeinsam bearbeiten; Gastnutzung mit Einschraenkungen moeglich | Eingeschraenkt; nur passende Anwendungen und freigeschalteter Embed-Modus |
| [MakeCode Arcade](https://arcade.makecode.com/multiplayer) | Spielewerkstatt und ausgewaehlte Arcade-Runden | Programmieren und Teilen; dafuer vorbereitete Spiele unterstuetzen zwei bis vier Personen per Code oder Link | Projekt-Einbettung dokumentiert; Mehrspieler-Sitzung im Seitenfenster gesondert testen |

Fuer WBO werden keine oeffentlichen Gemeinschaftsboards fuer private Schuelerarbeit
benutzt. Eigene Instanz, Zugang, Boardbesitz, Speichern und Loeschen brauchen eine
saubere schulische Regelung. Selbsthosting ersetzt diese Aufgaben nicht.

Excalidraw als eingebettete Bibliothek und die gehostete Zusammenarbeit sind
verschiedene Integrationsumfaenge. Keine Zusage, dass ein Komponentenimport
automatisch Anmeldung, Raumverwaltung und Echtzeitsynchronisierung mitbringt.

CryptPad hat einen [dokumentierten Einbettungsweg](https://docs.cryptpad.org/en/user_guide/share_and_access.html).
Die [Instanzkonfiguration](https://docs.cryptpad.org/en/admin_guide/admin_panel.html)
muss entfernte Einbettung erlauben. Die OnlyOffice-basierten Anwendungen Sheets,
Document und Presentation lassen sich laut Dokumentation auch dann nicht einbetten.
Ein pauschaler Zuspruch fuer alle CryptPad-Anwendungen waere deshalb falsch.

MakeCode unterscheidet [Einbettung eines Projekts](https://arcade.makecode.com/share)
von einer echten Mehrspieler-Sitzung. Die offizielle
[Mehrspieler-Auswahl](https://arcade.makecode.com/multiplayer-games) nennt etwa
Perfect Fit und Paint Party. Gemeinsames Spielen ist nicht automatisch gemeinsames
Bearbeiten desselben Programmquelltexts.

## Allein beginnen und gemeinsam erkunden

| Angebot und Quelle | Verwendung | Bedeutung von gemeinsam | Seitenfenster |
| --- | --- | --- | --- |
| [Chrome Music Lab und Song Maker](https://musiclab.chromeexperiments.com/) | Musik ausprobieren und eigene kurze Stuecke erstellen | Eigene Komposition teilen und gemeinsam besprechen; kein belegter gemeinsamer Live-Editor | Kandidat; nicht mit Shared Piano verwechseln |
| [Scratch-Projekte](https://mitscratch.freshdesk.com/en/support/solutions/articles/4000156765-how-can-i-embed-a-scratch-project-on-another-website-) | Ausgewaehlte Spiele, Animationen und Schuelerprojekte | Je Projekt getrennt pruefen; keine pauschale Mehrspielerfunktion oder gemeinsame Bearbeitung behaupten | Dokumentierter Projekt-Embed; nur vorab gepruefte Projekt-IDs |
| [PhET](https://phet.colorado.edu/en/help-center/getting-started) | Interaktives Experimentierzimmer, beispielsweise Balance, Kraefte oder Stromkreise | Standardmaessig eigene Simulation; daneben sprechen oder eine Ansicht vorfuehren | Einbettung dokumentiert; konkrete HTML5-Simulation nutzen |
| [NASA Eyes](https://science.nasa.gov/eyes/) | Sternwarte, Planeten, Raumfahrt und wechselnde Weltraumthemen | Eigene Navigation; fuer dieselbe Ansicht braucht es Anleitung oder zusaetzliche gemeinsame Steuerung | Kandidat; Browser-Anwendung, offizielle Einbettungsbeispiele vorhanden |
| [Deutsches Museum](https://www.deutsches-museum.de/museumsinsel/programm/programm-a-z/digitale-touren) | Wechselnde Ausfluege zu Erfindungen und Ausstellungen | Gemeinsam sprechen und gefuehrt erkunden; kein belegter synchroner Gruppenrundgang | Kandidat; Rundgang war vom Pruefrechner technisch nicht erreichbar |

Einzelangebote sind bewusst Teil der Auswahl. Ein Schueler kann in Ruhe etwas
ausprobieren, waehrend andere dazukommen, Fragen stellen oder gemeinsam ueberlegen.
Die Sprachgruppe gehoert zum Tisch und bleibt auch beim geoeffneten Seitenfenster
der soziale Bezugspunkt. Ob der Ton und die Bedienung beim Fokuswechsel erhalten
bleiben, wird pro Angebot und Schulgeraet geprueft.

Bei PhET werden Nutzungs- und Lizenzbedingungen fuer die konkrete schulische
Einbindung mitgeprueft. Ein sichtbarer Embed-Knopf ist keine pauschale Aussage
ueber alle erlaubten Nutzungsarten.

## Bestehende Sportangebote mit externer Oeffnung

| Angebot | Einordnung | Technischer Vorabcheck |
| --- | --- | --- |
| [Haxball](https://www.haxball.com/play) | Bestehender Treffpunkt und Live-Raumlink bleiben sinnvoll; Spiel extern oeffnen | Antwort enthielt `X-Frame-Options: SAMEORIGIN` |
| [Stumble Guys](https://www.stumbleguys.com/play) | Bestehenden Spieltreff und gemeinsame Raumadresse beibehalten; Anbieterbedingungen pruefen | Antwort enthielt `Content-Security-Policy: frame-ancestors 'self'` |

Ein Seitenfenster kann hier eine begleitende Treffpunktseite mit aktuellem
Raumlink anzeigen, nicht den gesperrten Spielinhalt selbst. Die Einbettungssperren
werden nicht mit einem Weiterleitungsrahmen oder einem Proxy umgangen. Ob die
WorkAdventure-Gespraeche im externen Tab weiterlaufen, braucht einen eigenen Test.

## Vorhandene eigene Anwendungen zuerst nutzen

- Das eigene Kino ist bereits auf synchrone Vorstellungen im Seitenfenster
  ausgerichtet. Player, Serverzustand, Administration und Alterspruefung werden
  fuer das Schloss weiterverwendet. Vorne bleibt es ruhig, hinten sind Gespraeche moeglich.
- Das persoenliche Sternenhueter-Zimmer hat bereits einen lokalen Editor mit
  48 Moebeln. Einrichten, dauerhafter Besitz und gemeinsame Besuche werden als
  ein zusammenhaengendes System angebunden, nicht durch ein neues Zimmerprodukt ersetzt.
- Eigene Go-Karts und Geheimwege bleiben Bestandteile der Spielwelt. Zusaetzliche
  Rutschentuerme, Sternwarte und kooperative Geheimraeume ergaenzen sie.

## Technischer Vorabcheck und seine Grenzen

Am 7. November 2026 wurden von diesem Rechner HTTP-HEAD-Abrufe ausgefuehrt.
Bei Skribbl, Codenames, PlayingCards.io, BuddyBoardGames, Shared Piano, WBO,
Excalidraw, einem MakeCode-Player, einer PhET-Simulation und NASA Eyes wurde in
der jeweiligen Antwort keine `X-Frame-Options`- oder `frame-ancestors`-Sperre gefunden.

Das ist kein bestandener Einbettungs- oder Spieltest. Startseite und konkreter
Spielraum koennen unterschiedliche Regeln haben. Weiterleitungen, Skripte,
Cookies, Anmeldung, Browserrechte und die WorkAdventure-Konfiguration koennen
die Nutzung weiterhin verhindern. Gartic Phone und Jigsaw lieferten 403;
Song Maker lehnte HEAD mit 405 ab; der Museum-Rundgang war nicht erreichbar.
Keines dieser Ergebnisse allein beweist eine grundsaetzliche Browser-Sperre.

Die CryptPad-Startseite erlaubte in `frame-ancestors` unter anderem HTTPS-Urspruenge.
Das ersetzt nicht die dokumentierten Einschraenkungen einzelner Anwendungen.
Es wurden keine privaten Anbieterraeume angelegt und keine Live-Schulangebote geaendert.

## Empfohlene erste Erprobung

1. BuddyBoardGames: ausgewaehlte Zweispielerangebote, besonders Schach und Vier gewinnt.
2. Jigsaw Explorer: gemeinsam puzzeln und spaeter wieder dazukommen.
3. WBO: gemeinsam malen in einer schulisch geschuetzten Instanz.
4. Shared Piano: wirklich gemeinsam musizieren.
5. Gartic Phone und Skribbl: bewaehrte Gruppenangebote erneut im Seitenfenster testen.
6. MakeCode Arcade: ein ausgewaehltes Mehrspielerspiel und ein eigenes Schuelerprojekt.
7. PhET und NASA Eyes: allein beginnen, mit Gespraechspartnern weiter entdecken.

Vor einem breiten Start: zwei echte Clients, derselbe Raum, spaeter Beitritt,
Gastgeber verlaesst das Spiel, erneuter Beitritt, Seitenfenster schliessen,
Tastaturfokus, normaler Avatarweg, Tischton und Klassen-/Altersfreigabe pruefen.
Scheitert ein Anbieter, bleiben Schloss und Kommunikation benutzbar.
