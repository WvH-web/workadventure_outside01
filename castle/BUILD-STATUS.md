# Ausbau des neuen Schulschlosses

Das Gesamtziel bleibt aktiv. Dies ist keine Freigabe als fertiggestelltes
Schloss oder fuer eine Veranstaltung mit 400 Personen. Das bisherige Schloss,
Village und geschuetzte Lehrerzimmer werden nicht ersetzt.

## Eingerichtete Innenwelt

- Grosse Halle mit 42 Sitzen, Gemeinschaftstafel, sechs Gespraechsbereichen,
  geschuetztem Rednerpult, Schlossbrett und Rueckwegen.
- Kino mit 48 ruhigen vorderen Plaetzen, 16 hinteren Gespraechsplaetzen und
  automatisch geoeffnetem bestehendem synchronen Kinoplayer.
- Bibliothek mit drei Lesegruppen und 13 Sitzen.
- Grundschulstube und Mittelstufenraum mit vorhandenen Aktivitaeten.
- Neu: Oberstufensalon, Spielesaal, Museum, Musiksalon, Atelier und Sternwarte.
  Je zwoelf Sitze, drei native Hoergruppen und gemeinsame Erzaehlkarten mit
  eigener Raumvariable. Bewaehrte Sitzmoebel bleiben im bestaetigten Massstab.
- Neu: Erdgeschoss-Wandelgang und obere Galerie mit je acht beschrifteten
  Tueren, zehn Sitzen und zwei nativen Hoergruppen. Eine zusaetzliche Tuer
  unten rechts in der Halle verbindet den Wandelgang direkt mit der Halle.
- Das Museum zeigt fuenf Bilder aus der vorhandenen Museumsverwaltung in den
  Wandrahmen. Im Seitenfenster sind alle freigegebenen Katalogeintraege von
  `show1` bis `show13` erreichbar. Im Musiksalon erscheinen die vorhandenen
  Musikbeitraege. Vorhandene Medien-Endpunkte bleiben zustaendig fuer Webseite,
  PDF, YouTube, Audio und Praesentationsinhalt.
  Bereits geoeffnete Beitraege uebernehmen jetzt Aenderungen bei der naechsten
  Aktualisierung. Deaktivierte Beitraege werden geschlossen; unveraenderte
  Musik-/Videoinhalte werden durch die Pruefung nicht neu gestartet.
- Die Expeditionen bieten sieben bewusst externe Museums- und Weltraumziele.
  Einbettungssperren werden nicht umgangen. NASA Eyes kann separat am
  Forschergruppentisch der Sternwarte im Seitenfenster geoeffnet werden.
- Zwoelf native `Eventgaeste` sind mit zwei Teilnehmern und dem nativen
  Auswahlfenster geprueft. Acht klar bezeichnete Schlossfiguren sind mit
  Dialogen, 32-Pixel-Massstab und transparentem Hintergrund live geprueft.
  Jung und alt, unterschiedliche Stile und Persoenlichkeiten, schulgeeignet.
  Figuren zaehlen nicht als echte Besucher. Einzelheiten: `CHARACTERS.md`.
- Neu: Schlosshof, Sternendorf und Schlossgarten als drei kompakte Aussenkarten
  mit insgesamt 32 Picknickplaetzen in acht Gespraechsgruppen. Neue Figuren:
  Noah, Val und Rosa. Gemeinsame Erzaehlkarten, bestehende Museums-/Musikbeitraege,
  Rutsche und native Go-Kart-Darstellung. Aktuelle Abnahme und Grenzen: `OUTDOORS.md`.
- Die getrennte Servergrundlage fuer frische Schul-, Klassen- und Alterspruefungen
  ist bereitgestellt: achtzehn neue Node-Pruefungen, sechsunddreissig kuenstliche
  SQL-Faelle und eine Livepruefung bestanden. Keine Schuelerprofile werden an
  die Karte ausgegeben. Das ist noch keine angeschlossene Inhaltssperre; der
  genaue Stand steht in `SCHOOL-ACCESS.md`.
- Neu: Portalverwaltung und neuer Spielebereich sind verbunden. Start und
  Raumlink-Aenderung pruefen Schulprofil und Portalregeln serverseitig;
  vorhandene Raumlinks bleiben die Datenquelle. 59 isolierte PHP-/MySQL-Faelle,
  neun Portal-Formularansichten, zwanzig neue Start-/Katalogpruefungen und eine
  getrennte Zweibrowserprobe bestanden. Sieben Regelplaetze bleiben Entwuerfe,
  fuenf enthalten echte Vorschauziele und zwei bleiben leer. Die native
  Vierpersonenprobe bestaetigt getrennte Tischgespraeche bei offenen Fenstern,
  verweigerte direkte Starts unbekannter Konten, Wiedereroeffnen, Weiterlaufen
  und Einstieg aus Spielesaal, Oberstufe und Halle. Die echte Lehrkraft-UI-Probe
  erstellt keinen zusaetzlichen WA-Teilnehmer. Einzelheiten: `SCHOOL-ACCESS.md`.

## Noch zu vervollstaendigen

- Weitere bestehende Aussenangebote anbinden. Die drei neuen Aussenkarten,
  ihre acht Hoergruppen, Rutsche und Kart sind in Fassung 3 mit vier getrennten
  Testteilnehmern abgenommen; Kartdarstellung bleibt lokal. Siehe `OUTDOORS.md`.
- Weitere im Gesamtkonzept vorgesehene Sonderraeume und Entdeckungen. Private
  Wege und deren genaue Plaene werden nicht in dieser oeffentlichen Datei beschrieben.
- Schulprofil, Portalregeln und Anbieter-/Pfadbindung werden im neuen
  Spielebereich beim tatsaechlichen Start durchgesetzt. Noch noetig sind
  redaktionelle Schuelerfreigaben und der entsprechende Schutz eigener
  Inhalts-, Beitritts- und Besuchsendpunkte, insbesondere persoenlicher Zimmer.
  Raumnamen allein sind kein Schutz; die Vorschau ist keine Kinderfreigabe.
  Einzelheiten: `SCHOOL-ACCESS.md`.
- Weitere geeignete gemeinsame Spiele, gegebenenfalls Billard nach Abnahme
  einer vorhandenen Grundlage. Das eigene geschuetzte Schlossklavier ist als
  `8a1f180e9b723ef1` im Musiksalon live: gemeinsam spielen, allein ueben,
  echte Schul-Anbindung und echte Klavier-Samples. Die native Probe mit zwei
  normalen Microsoft-Testkonten besteht einschliesslich Touch, dekodiertem
  Klavierton im anderen Browser und parallelen Tischgespraechen. Das ist kein
  anonymer Shared-Piano-Ersatzlink. Geschuetztes gemeinsames
  Schach und WBO sind inzwischen mit echten Microsoft-Schueler-Testkonten
  geprueft; Zeichnen samt parallelen nativen Tischgespraechen ebenfalls.
  Einzelheiten stehen in den unten verlinkten Fachnachweisen. Die
  Spielrundenliste verwendet die sieben vorhandenen Verwaltungsangebote
  und deren aktuelle Links; redaktionelle Schuelerfreigaben bleiben offen.
- Gastgeberpflege und zeitlich ablaufende externe Spiellinks bleiben offen.
  Die eigene gemeinsame Rundenliste fuer 49 echte Gespraechsbereiche ist
  in allen 16 Vorschaukarten live. Sie zeigt freiwillige
  Anmeldungen, keine behauptete Belegung oder laufenden Fremdspiele.
  Schul-/Klassenpruefung, Ablauf, Wiederbeitritt und bereinigter Raumwechsel
  sind lokal abgedeckt. Auch der getrennte VPS-Test mit zwei regulaer
  angemeldeten Microsoft-Schultestkonten besteht, einschliesslich echter
  Klassen-/Stufentrennung. Die native Zweipersonenprobe bestaetigt beidseitigen
  Tischton bei offener Uebersicht, mobilen Zugang, Wiederbeitritt und
  kartenuebergreifenden Besuch. Der urspruengliche Dienst `6973432bdfccee7c`
  wurde mit beiden Konten gegen den echten HTTPS-Endpunkt geprueft. Die unten
  dokumentierte begrenzte Anfrageverarbeitung ist als `da25574fd7da8512` gesund live.
  Die Runtime-Aktivierung `20261109-rounds1` aendert ausschliesslich technische
  Eigenschaften der neuen Vorschaukarten, nicht deren Einrichtung oder
  Gespraechsflaechen. Auch die veroeffentlichte Zweipersonenprobe besteht
  ohne Testumleitung, darunter mobiler Beitritt und wirklich dekodierter
  Tischton. Alle 16 veroeffentlichten Raeume sind mit jeweils genau einer
  Runden-Anbindung und sichtbarer Grafik durchlaufen. Im Leerlauf entstehen
  keine Runden-API-Abfragen. Eine gesonderte Doppelkontofenster-Probe besteht.
  Die Pflege externer Raumangebote bleibt offen. Details stehen in
  `ops/castle-school/README.md`.
- Redaktionell freigegebene Themenrotation, Aushang und freiwillige Erinnerungen
  aus dem Portal. Die jetzt vorhandene Expeditionenliste ist noch keine
  automatische Rotation oder Versandfunktion.
- Abgesicherte produktive Sternenhueter-Schulbruecke fuer persoenliche Zimmer
  und Besuche. Lokale Testdaten bleiben unberuehrt und unveroeffentlicht.
  Die kanonische Schulzuordnung und kurzlebige Zugangsverwaltung sind inzwischen
  separat implementiert. Reale MySQL-Prueffaelle, zwei autorisierte Testprofile
  sowie die Verbindung zum originalen Konto-/Zimmercode bestehen. Der geschuetzte
  Einstieg ist lokal mit zwei getrennten Browserzugaengen, wirklichen privaten
  Besuchen, Nachrichten und Kontowechsel geprueft. Desktop und 390/320-Pixel-
  Ansichten passen. Produktiver Schuleinstieg, native Besuchs-/Sprachabnahme
  und Betriebsabnahme fehlen noch; kein Schul-Zimmerzugang wurde freigeschaltet.
  Einzelheiten: `ops/castle-homes/README.md`.
- Betriebs-, Wiederanlauf- und realistische Leistungstests vor breiter Nutzung.
  Kleine synthetische Mehrteilnehmerproben ersetzen keine Lastabnahme.

## Begrenzte Anfrageverarbeitung am 10. November

Nach ausdruecklicher Freigabe wurde nur die Runden-/Schulpruefung kurz neu
gestartet. Maximal 16 aktive Anfragen, 512 wartende Anfragen, hoechstens vier
aktive/wartende Plaetze je bestaetigtem Konto und vier Sekunden Wartefrist.
Schulprofile und Klassenfreigaben werden weiterhin frisch gelesen. Abbruch,
abgelaufene Anmeldung und unzulaessige Klassenwechsel erteilen keinen Zugriff.
Karten, bisheriges Schloss, WorkAdventure-Client, Tischton, Kino und Spiele
blieben unveraendert; die vorige Dienstausgabe bleibt als Ruecksetzstand erhalten.

Die isolierte Linux-Pruefung mit der echten Node-Laufzeit und den gleichen
Ressourcengrenzen besteht fuer 400 gleichzeitig eintreffende HTTP-Testanfragen
mit kuenstlichen Abhaengigkeiten. Zwei autorisierte Testprofile bestaetigen
anschliessend die echten Klassenfreigaben am oeffentlichen HTTPS-Endpunkt.
Diese letzte Probe verwendet signierte Testidentitaeten, keine neuen normalen
Microsoft-Anmeldungen. 398 lokale Node-Faelle bestehen, ein optionaler
Browserfall bleibt ausgelassen; sieben Betriebs-/Ruecksetzfaelle bestehen.
Die anschliessende Bestandspruefung bestaetigt unveraenderte andere Dienste,
geschuetzte Dateien und Karten sowie beendete Testdienste. Vorige native
Klavier-/Sprachnachweise wurden nachgeprueft, nicht als neue Browserprobe ausgegeben.

Das ist keine Freigabe fuer 400 reale Schlossbesucher. Die getrennte bisherige
Audioprobe bestand bis 100 Teilnehmer; der 200er-Versuch wurde wegen hoher
Serverlast abgebrochen. Einzelheiten: `tools/castle-capacity/README.md` und
`ops/castle-school/README.md`. Das Gesamtziel bleibt aktiv.

## Pruefstand der Innenausbaustufe

Aktuelle Interaktionsfassung: `20261109-actions2`. 312 automatische
Kernpruefungen bestehen; die zusaetzliche Widget-Browserpruefung ist separat
aktiviert und ebenfalls bestanden. Native Mehrteilnehmerproben bestaetigen automatisches
Schach beim Hinsetzen, feste physische Schachzuordnung und eine gemeinsame
Tischauswahl mit spaeterem Beitritt und Zuruecksetzen erst beim letzten
Verlassen. Die Vierpersonenprobe im Atelier prueft gemeinsames Zeichnen
parallel zu zwei getrennten nativen Hoergruppen. Sichtbarer Kart-Einstieg,
Fahrt, Ausstieg und die schnellere Rutsche sind separat live geprueft.
Die Tutorialkorrektur ist nach geprueftem isoliertem Lauf und ausdruecklicher
Wartungsfreigabe als `1.34.5-school-v4-onboarding` live. Nur der Client wurde
ersetzt; bisheriges Schloss, vorhandene Kartenziele und alle sechzehn
Vorschau-WAMs bleiben unveraendert. Die erneute native Tischprobe besteht
einschliesslich vollstaendig sichtbarem mobilen Schachbrett und Platzwahl.
Die Live-Tutorialprobe mit zwei normal angemeldeten Microsoft-Schueler-
Testkonten besteht auf Desktop und Mobil: erster Einstieg, Raumwechsel,
Neuladen, Hilfe-Wiederholung und anschliessend freie Steuerung.
Die Museums-/Musikaktualisierung ist separat als statische Fassung
`f2c8ce521afb19ac` veroeffentlicht, ohne weiteren Client- oder Dienstneustart.
Neun lokale und sechs Inhaltsproben der veroeffentlichten Dateien bestehen.
Die anschliessende native Zweipersonenprobe besteht in beiden Raeumen mit
echten Verwaltungsbeitraegen und parallel weiterlaufendem Tischton, darunter
eine 390-Pixel-Touchansicht. Keine Browserfehler oder veraenderten Schuldaten.
Nachweise und konkrete Grenzen: [Interaktionen](../docs/schulschloss-interaktionen.md),
[Schach](../docs/schulschloss-schach.md), [Atelier](../docs/schulschloss-atelier.md).
Keiner dieser Nachweise ersetzt den noch erforderlichen Lasttest.

Fruehere Fassung `20261109-games1` mit dem angeschlossenen Spielebereich:
227 Kernpruefungen, getrennte Browserproben der Lobby und die native
Vierpersonenprobe der Anbindung sind bestanden; Details und Grenzen stehen in
`SCHOOL-ACCESS.md`. Die neue Serverkomponente ist mit eigenem gesundem
Zustandscheck bereitgestellt. Bestehende WorkAdventure-/Audio-Instanzen,
Anmeldematerial und Nginx bleiben unveraendert.

Die grafische Ausgangsfassung bleibt `20261108-expansion8` mit passiven
Figuren- und Museumsbildern; fuer die Spiele-Anbindung wurden keine
Raumgrafiken, Sitzkoordinaten oder Hoergruppen geaendert.
Die erneute native Einzelprobe bestand in allen acht betroffenen Innenraeumen:
alle Dialoge, 92 Sitze, 32-Pixel-Figuren mit transparenten Ecken, ausdruecklicher
Fokussperre und ohne alte Figurenfenster oder Raumknopfe. JavaScript-Fehler: keine.
Die gesonderte Klickprobe bestaetigt echte Bewegung nach Figuren- und Museums-
bildklicks sowie fuenf tatsaechlich geladene Museumsbilder. Die gemeinsame Suite
mit der neuen Schulpruefung bestand damals aus 207 bestandenen Kernpruefungen.
Die aktuelle vollstaendige Grafikprobe mit den Aussenkarten
prueft sechzehn Karten in 1440, 390 und 320 Pixel Breite: 345 Aufnahmen, keine
Layoutbefunde oder Browserfehler. Die native Vierpersonenprobe der Aussenfassung
3 ist in `OUTDOORS.md` dokumentiert. Die folgende Innenraum-Sprachabnahme bleibt
ausdruecklich der Nachweis der vorherigen Fassung 7, nicht einer neuen Lastprobe.

Fassung `20261108-expansion7`: Innenausbau mit transparenten Figurenbildern und
raumeigenen Knopfkennungen erfolgreich gebaut. 169 Kernpruefungen inklusive
verspaeteter Bereinigung nach Raumwechseln bestanden. Die damalige vollstaendige
Grafik-Browserprobe der Fassung 6 in den drei Groessen 1440, 390 und 320 Pixel
pruefte alle
vierzehn Karten, alle neuen Sitzplaetze, jede neue Tuer und die vorhandenen
Hallenfunktionen ohne Layout- oder Browserfehler. Neun gesonderte Inhaltsproben
pruefen Museum, Musik und Expeditionen inklusive Bilder, Rueckweg aus einem
Beitrag, geaenderte Daten und eine voruebergehend nicht erreichbare Verwaltung.

Die vollstaendige native Vierpersonenprobe der Fassung 7 ist bestanden: alle
acht neuen Innenbereiche, alle 92 Sitze und 22 getrennte Hoergruppen. Auch
stehende Teilnehmer werden einbezogen; parallele Runden bleiben getrennt.
Die sechs gemeinsamen Erzaehlkartenangebote folgen denselben Runden, auch bei
spaetem Beitritt und erneutem Oeffnen. Museum und Musik oeffnen echte
Verwaltungsbeitraege; die fuenf Museumsbilder werden korrekt geladen. Desktop
und Mobil zeigen gefuellte Spielflaechen. Der Rueckweg zur Halle und ihre neue
Wandelgangtuer funktionieren. Keine zurueckgebliebenen Museumsbildfenster und
keine JavaScript-Fehler in dieser Probe.

Die separate Figurenprobe der Fassung 7 pruefte ebenfalls alle acht Raeume:
Dialoge, 32-Pixel-Figuren, vier transparente Hintergrund-Ecken, alle 92 Sitze,
keine alten Raumknopfe und keine zurueckgebliebenen Figurenbilder. Die erneute
native Zweipersonenprobe bestaetigte zwoelf Auswahlbilder, zwei unterschiedliche
32-Pixel-Avatare, gegenseitige Sichtbarkeit und eine gespeicherte Avatarwahl.

Auch die erneute native Kinoprobe mit vier Teilnehmern ist bestanden: ruhiger
vorderer Bereich, getrennte hintere Gespraeche einschliesslich benachbarter
Gruppengrenzen, automatisch geoeffnetes Filmfenster, kein Neuladen beim
Platzwechsel, respektiertes manuelles Schliessen und Rueckweg zur separaten
Halle. Desktop- und Mobil-Spielflaechen sind gefuellt; JavaScript-Fehler: keine.
Der Kinoinhalt wurde dabei bewusst durch eine Testseite ersetzt, damit kein
echter Film gestartet wird. Das ist keine neue Ende-zu-Ende-Pruefung des
bestehenden synchronen Filmdienstes.

Die frueher gefundenen Sitz- und Knopfprobleme sind damit nachgeprueft: Der
Drehstart liegt auf einem fuer den ganzen Avatar freien Bodenpaar statt in
der Wand. Die Knopfkennungen sind je Raum getrennt; beim Eintritt werden nur
bekannte Bedienelemente anderer Schlossraeume entfernt. Das ist eine kleine
Funktionsprobe, keine Lastfreigabe fuer 400 gleichzeitige Teilnehmer. Testberichte,
synthetische Sprachdatei und kurzlebige Testzugriffe bleiben ausserhalb des
oeffentlichen Repositorys.

Die Verwaltung erlaubt per Content-Security-Policy nur WorkAdventure-Urspruenge
als Rahmen. Deshalb werden die sechs oeffentlichen Galerie-Dateien zusaetzlich
unter `https://together.deine-schule.com/castle-content/` bereitgestellt.
Die Fokuskorrektur ergaenzt acht gepruefte statische Dateien fuer Figuren- und
Museumsbilder. Diese machen nur ihr eigenes enthaltendes Bildfenster passiv;
die eigentlichen Inhalte, Dialoge und Galerien bleiben bedienbar.
Das ist kein Proxy fuer fremde Inhalte und keine Lockerung der Verwaltungs-CSP.
Die Galerie braucht keine Kartenschnittstelle und keinen Kamera-/Mikrofonzugriff.
In der reinen Grafikvorschau unter einer anderen Domain oeffnen Beitraege extern.
Die Servereinrichtung sichert die bisherige Nginx-Konfiguration, prueft deren
Pruefsumme vor dem Ergaenzen genau dieses neuen Pfads und testet Nginx vor dem
graceful Reload; WorkAdventure und der Ansagedienst bleiben unangetastet.

## Quellen und Wiederaufbau

Alle acht neuen Raumhintergruende wurden mit dem integrierten Bildgenerator
erstellt. Originale und finale Prompts stehen in `art/*-20261108-full/` als
`room-source.png` und `room-prompt.txt`. Der Builder `tools/build-castle-expansion.cjs`
leitet daraus Raster, Masken, Sitzpunkte, Kollisionen und native Wrapper ab.
Vorhandene Sitzgruppen und Tischgrafik werden wiederverwendet, nicht vergroessert.

`node tools/build-castle.cjs` baut alle registrierten Karten. Die aeltere
Atlaszeichnung laeuft in einem eigenen Prozess; Quellbilder werden vor den
tausenden Rasterausschnitten einmal rasterisiert. Das vermeidet den nativen
Skia-Abbruch beim Kopieren grosser Zeichnungen auf Windows.

`tools/castle-map-ids.cjs` ist die gemeinsame Kartenliste fuer Generator,
Routing und Pruefungen. Die Serververoeffentlichung prueft die bereits
bereitgestellten Wrapper gegen deren gespeicherte Pruefsummen und akzeptiert
nur die bekannten Erweiterungen von acht auf vierzehn und sechzehn Dateien im separaten
`castle-preview`-Verzeichnis. Keine uebrigen Karten oder Dienste werden ersetzt.
