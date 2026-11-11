# Ausbau des neuen Schulschlosses

Das Gesamtziel bleibt aktiv. Dies ist keine Freigabe als fertiggestelltes
Schloss oder fuer eine Veranstaltung mit 400 Personen. Das bisherige Schloss,
Village und geschuetzte Lehrerzimmer werden nicht ersetzt.

Aktueller Nachtrag vom 11. November: Die begrenzte Wiederverbindung freiwilliger
Runden ist jetzt in der getrennten Vorschau live abgenommen. Zwei normal
angemeldete Microsoft-Schultestkonten, eines mobil, bestaetigen nach einer
ausdruecklich simulierten kurzen Ueberlast dieselbe serverseitig erneuerte
Anmeldung und weiterlaufenden Tischton in beide Richtungen. Die Serverpruefung
um 16:32 UTC besteht einschliesslich der bisherigen Museums-/Zimmerfunktionen.
Kein Dienstneustart, Kartenersatz oder geaenderter Schulzugang. Die nachfolgenden
aelteren Zwischenstaende bleiben als Verlauf erhalten; der Gesamtausbau ist
weiter offen. Einzelheiten: `../ops/castle-school/README.md`.

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
- Gastgeberpflege und zeitlich ablaufende externe Spiellinks sind jetzt als
  Erweiterung implementiert, aber noch nicht live: ausdrueckliche Bestaetigung
  des zentralen Links, keine automatische Gastgebernachfolge, Ende bei Abmelden
  oder Ablauf und neue Bestaetigung nach Linkwechsel. 18 neue Zustands-/HTTP-
  Faelle und die getrennte Zweibrowserprobe mit 980/390/320 Pixeln bestehen.
  Auch die isolierte Linux-Vorpruefung des Kandidaten `3119b0c32934a5f1`
  besteht mit 33 Faellen ohne Netz oder Schuldaten; alle 91 lokalen Python-
  Betriebsfaelle bestehen. Alte/neue Karten und bestehende Dienste sind
  anschliessend vollstaendig unveraendert nachgeprueft.
  Fuer genau diesen Kandidaten besteht inzwischen auch die native Vorpruefung
  mit zwei normalen Microsoft-Schultestkonten, mobiler Touchbedienung und vier
  echten beidseitigen Tischtonmessungen. Nur Katalog/Anbieterinhalt im getrennten
  Testdienst sind kuenstlich. Fensterwechsel, neue Links und Gastgebernachfolge
  bestehen; Testdienst und temporaere Kontofreigabe sind entfernt. Noch keine
  Veroeffentlichung, Anbieterfreigabe oder 400-Personen-Abnahme.
  Freigabe, native Vorpruefung und Betrieb bleiben offen; Einzelheiten:
  `../docs/schulschloss-gastgeber.md`.
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
  Ansichten passen. Ein getrennter HTTPS-Testpilot ist inzwischen ausschliesslich
  fuer die zwei freigegebenen Microsoft-Testkonten bereitgestellt und samt echter
  privater Besuche, Kontowechsel, Grafik und 45-Sekunden-Zugangsablauf geprueft.
  Die veroeffentlichten Karten bleiben unveraendert. Allgemeiner Schuleinstieg,
  native Besuchs-/Sprachabnahme und Betriebsabnahme fehlen noch.
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

## Persoenliche Zimmer: Geschuetzter Pilot

Die Sternenhueter-Zimmer sind als eigenstaendiger, schulisch geschuetzter Pilot
bereitgestellt. Nur die obere Galerie der neuen Vorschau hat jetzt einen
nativ geprueften Eingang, noch keine allgemeine Schulfreigabe.
Zwei ausdruecklich vorgesehene Microsoft-Testkonten und das gezielt genehmigte
Administratorkonto haben Zugang. Die allgemeine Kontorolle wurde nicht geaendert;
nur das genehmigte Konto darf gemeldete Zimmergespraeche pruefen.

Die neue Ladefolge benoetigt fuer ein Startzimmer vier statt aller 19 Bilder:
rund 6,7 statt 30,4 MB, bei unveraenderten sichtbaren Bildpunkten und
Anklickflaechen. Weitere Einrichtung und Bodenbilder werden bei Bedarf geladen.
Die isolierte Desktop-/Mobilprobe prueft alle 13 Katalog-Bildgruppen, Kaeufe,
Bodenvorschau, Speichern, ein zweites Geraet, Besuche, Nachrichten und Erholung
nach einem unterbrochenen Bildabruf. Die echte Browserprobe mit den beiden
normalen Microsoft-Testanmeldungen ist ebenfalls bestanden. Einzelmessungen
lagen bei etwa 5-6 Sekunden fuer den ersten Aufruf und 3-4 Sekunden fuer einen
erneuten Besuch; das ist keine feste Ladezeit- oder 400-Personen-Zusage.

Der getrennte Zimmerpilot verwendet jetzt eine eigene unveraenderliche
Programmgrundlage statt des Kollegiumsprojekts. Alle 4.869 benoetigten Dateien
werden beim Start geprueft; das alte Projekt ist fuer diesen Dienst gesperrt.
Die echte Zweipersonenprobe sowie Desktop-/Mobilbrowser bestehen weiterhin.
Nur der Zimmerpilot wurde kurz neu gestartet, nicht WorkAdventure oder das
bisherige Schloss. Die Freigaben und Schluessel bleiben unveraendert.

Eine Wiederherstellung aus dem Programmarchiv ist mit zwei kuenstlichen
Teilnehmern in einer abgeschotteten Kopie bestanden. Die konsistent gesicherten
Zimmerdaten wurden getrennt wiederhergestellt und vollstaendig verglichen,
ohne Live-Daten zu ersetzen. Eine gepruefte reine Programmkopie liegt auch
ausserhalb des Servers; das ersetzt noch keine vollstaendige Notfallprobe mit
echten Schulanmeldungen und gesicherter Daten-/Schluesselwiederherstellung.
Die letzte lokale Gesamtsuite: 456 Faelle, 454 bestanden, keine Fehler oder
Abbrueche, zwei begruendete Auslassungen. Die Linux-Dateirechte sind separat
auf dem Server geprueft. Das ist keine 400-Personen-Freigabe.

Freiwillige Zimmergespraeche sind nun im weiterhin eng begrenzten Pilot aktiv.
Mikrofon und Kamera starten aus und werden einzeln eingeschaltet. Die feste
Zimmergruppe folgt dem echten Besuch und dessen Gueltigkeit, nicht einer vom
Browser behaupteten Zimmerkennung. In zwei getrennten Browsern kommen ueber
die echte oeffentliche Adresse Ton in beide Richtungen und ein ausdruecklich
eingeschaltetes Testkamerabild an. Verschiedene Zimmer bleiben getrennt;
Zimmerwechsel und Besuchsende stoppen die Aufnahme. Es wurden ausschliesslich
kuenstliche Medien der genehmigten Testkonten benutzt, keine echten Kinderbilder
oder Mikrofone. Meldungen und die darauf beschraenkte Moderation sind integriert.
Die getrennte Moderations-Browserprobe bestaetigt auch Gespraechspausen.

Die native Zweipersonenprobe ist inzwischen bestanden: wirklicher Tischton
vor und nach dem Zimmerbesuch, privater Ton in beide Richtungen, ruhiger
Eingangsbereich und tatsaechlich beendete Medien beim Verlassen. Die Mobil-
und Desktopansichten bestehen ohne ersetzte Antworten oder Kartenschnittstelle.

Die Zimmerfassung `1b28495f0e9dfb1e` behebt eine nachgewiesene Blockade der
Zugangsverlaengerung durch ausstehende Kameraveroeffentlichung. Die echte
Dreibrowserprobe mit den zwei genehmigten Microsoft-Testkonten prueft Offline,
Wiederbeitritt, zweites Geraet ohne automatische Uebernahme, ausdruecklichen
Geraetewechsel, Kontowechsel und Abmelden. Zehn Tonmessungen und zehn dekodierte
Kameraproben bestehen. Alte Aufnahmen enden; neue Aufnahme bleibt freiwillig.
Die anschliessende native Schloss-/Tischtonprobe besteht ebenfalls. Nur der
Zimmerpilot wurde kurz gestartet, nicht WorkAdventure oder das alte Schloss.

Die letzte lokale Gesamtsuite umfasst 489 Node-Faelle: 486 bestanden, ein
fehlgeschlagener 400-Anfragen-Lastfall und zwei dokumentierte Auslassungen.
In diesem Lauf wurden 286 Anfragen erfolgreich beantwortet und 114 mit Ueberlast abgewiesen;
fruehere isolierte Laeufe bestanden. Die Kapazitaet ist damit nicht verlaesslich
abgenommen. Der vorangehende
Zimmer-Meilenstein besteht zudem mit 62 Python- und 41 Linux-Faellen.
Das sind weder eine echte Administrator-Anmeldeprobe noch eine Freigabe fuer
acht gemeinsame Zimmerkameras oder 400 gleichzeitige Teilnehmer.

Offen bleiben insbesondere eine Dienstneustart-Probe bei laufendem Gespraech,
die breitere Schulfreigabe, echte gemeinsame Sterne-/Inventaranbindung,
vollstaendige Daten-/Schluesselwiederherstellung, Lastnachweise und die
abschliessende native Kartenfreigabe. Der Gesamtausbau ist nicht abgeschlossen.
Das bisherige Schloss, andere Karten und das Kollegiumsprojekt bleiben
unveraendert. Einzelheiten und Nachweise:
`ops/castle-homes/README.md`.

## Gemeinsame Museumsrunde

Die gemeinsame Stationsauswahl am Ausstellungstisch ist in der separaten
Schlossvorschau live und mit zwei normalen Microsoft-Schultestkonten geprueft.
Sie uebernimmt den vorhandenen
Verwaltungskatalog und synchronisiert nur die ausgewaehlte Station, nicht die
Bedienung oder Filmposition fremder Inhalte. Automatisches Oeffnen beim Sitzen,
beidseitige Auswahl, spaeter Beitritt, Weiterlaufen ohne den Auswaehlenden,
manuelles Schliessen und Wiedereroeffnen sowie Neustart nach dem letzten
Aufstehen bestehen ohne ersetzte Netzwerkantworten. Nativer Tischton kommt
an vier Zeitpunkten bei beiden Teilnehmern an. Nur der Museum-Wrapper der
neuen Vorschau wurde umgestellt; Einrichtung, Hoergruppen und alle anderen
Karten bleiben unveraendert. Der getrennte Testraum ist entfernt. Einzelheiten:
`ACTIVITIES.md` und `../ops/castle-content/README.md`.

Alle 71 lokalen Python-Betriebspruefungen sowie die echte Serverpruefung der
Veroeffentlichung bestehen. Die normale Galerie ist mit sechs Desktop-/Mobil-
Ansichten der veroeffentlichten Dateien nachgeprueft. Der oben genannte
400-Anfragen-Fehler bleibt ausdruecklich offen und wird dadurch nicht umgedeutet.

## Zugangs- und Rundenstabilitaet

Drei feste, getrennte Servermessungen mit je 400 gleichzeitigen kuenstlichen
Zugangspruefungen bestehen mit dem echten Node-Abbild und den bisherigen
Ressourcen-/Wartezeitgrenzen. Die Container hatten keinen Netzzugang und
verwendeten weder Schulkonten noch echte Datenbank-/Microsoft-Abfragen.
Bestehende Dienste, Karten und Rechte blieben unveraendert. Der fruehere
parallele lokale Lastfehler bleibt dokumentiert; die Gesamtfreigabe fuer
400 echte Teilnehmer mit Audio/Video ist weiterhin offen.

Eine Korrektur fuer freiwillige Rundenanmeldungen ist vorbereitet, aber noch
nicht live: Nach voruebergehender Ueberlast prueft sie die vorhandene Anmeldung
begrenzt erneut. Jede Bestaetigung erfolgt frisch auf dem Server, niemals aus
gespeicherten Rechten. Abgelaufene/entzogene Freigaben, Kontowechsel und
fehlgeschlagene Abmeldungen werden nicht automatisch wiederhergestellt.
Elf neue Einzelfaelle und die getrennte Dreikonten-Browserprobe bestehen.
Vor der Veroeffentlichung fehlt noch die native Live-Probe dieses Kandidaten.

Die aktuelle serielle Node-Gesamtsuite umfasst 502 Faelle: 500 bestanden, zwei
bisherige Auslassungen, keine Fehler. Der unveraenderte 400-Anfragen-Fall
besteht darin ebenfalls. Die echte Serverpruefung um 07:48 UTC bestaetigt den
unveraenderten Live-Stand einschliesslich der gezielten Administratormoderation
und der Museumsrunde, nicht die noch unveroeffentlichte Rundenkorrektur.
Alle 74 Python-Betriebspruefungen bestehen ebenfalls mit der nur lokal im
Testordner ergaenzten YAML-Abhaengigkeit.
Einzelheiten und Messgrenzen: `../ops/castle-school/README.md`.

Die native Zweikonten-Vorprobe der Rundenkorrektur besteht inzwischen,
einschliesslich echtem Tischton vor/nach einer ausdruecklich simulierten
Ueberlast. Der anschliessende Veroeffentlichungsversuch ist jedoch wieder
zurueckgesetzt: Die erste Live-Probe scheiterte an einer zu kurzen Testwartezeit.
Vor deren Korrekturprobe lief das lokale Laufwerk C: voll. Die betroffene lokale
Testdatei ist wiederhergestellt; weitere Browserproben starten bei zu wenig
Platz nicht mehr. Der Server ist um 08:22 UTC vollstaendig im bisherigen Zustand
nachgeprueft, ohne Neustart, Kartenersatz oder Rechteaenderung. Die Korrektur
war zu diesem Zeitpunkt **nicht live abgenommen**. Fehlversuche und
Ruecksetzbelege sind erhalten.
Alle 83 Python-Betriebspruefungen und 34 gezielte Node-Rundenfaelle bestehen.
Fuer weitere native Proben werden mindestens 2 GiB freier lokaler Platz benoetigt.

Die lokale Speicherblockade ist inzwischen behoben. Neue Browserprofile,
temporaere Testlaeufe, Kapazitaets-Werkzeuge und die aktuellen Paket-Ausgaben
nutzen die geschuetzte Ablage `D:\CodexScratch\WorkAdventure`. Beendete eigene
Temp-Laeufe werden nach Sicherheitspruefung automatisch entfernt; Nachweise
bleiben erhalten. Ein echter Desktop-/Mobilbrowserlauf prueft diese Trennung.
Zwei aeltere QA-Verzeichnisse liegen nach vollstaendigem Dateivergleich auf D:,
ihre bisherigen C:-Pfade funktionieren weiter. Drei erledigte Upload-ZIPs sind
nach frischer Nur-Lese-Pruefung der erhaltenen Serverfassungen entfernt.
Hardlink-bereinigt sind damit 506.658.816 Bytes belegter Dateispeicher auf C:
verlagert oder entfernt; andere gleichzeitig stattfindende Bereinigungen sind
darin nicht eingerechnet. Erforderliche Ruecksetzstaende bleiben erhalten.
Der aktuelle serielle Node-Gesamtlauf besteht mit 511 bestandenen Faellen und
zwei vorhandenen Auslassungen; die 83 Python-Betriebsfaelle bestehen ebenfalls.
Das ist keine nachtraegliche Freigabe der noch offenen Runden-Liveabnahme.

Die anschliessende erneute Kandidatenprobe und die echte veroeffentlichte
Zweipersonenprobe sind inzwischen bestanden. Beide warten auf den natuerlichen
naechsten Herzschlag der Rundenanmeldung; die eigentliche Erholungsfrist bleibt
unveraendert. Die Veroeffentlichungsprobe ersetzt weder Browsermodule, Karten
noch Schulentscheidungen. Auch Klassenfilter, Wiederbeitritt, Raumwechsel und
der weiterlaufende echte Tischton bestehen. Die statische Fassung
`8d43adfc183ce631` ist nun endgueltig abgenommen. Die vorherige Ruecksetzung ist
mit ihren unveraenderten Belegen gesondert archiviert und bleibt Teil der
Bestandspruefung. Alle 86 Python-Betriebsfaelle bestehen. Die gesonderte
Nur-Lese-Gesundheitspruefung bestaetigt gesunde Zimmerdienste ohne automatische
Neustarts. Der erneute vollstaendige serielle Node-Lauf nach der Abnahme
besteht mit 511 bestandenen Faellen, zwei bisherigen optionalen Auslassungen
und keinem Fehler. Der D:-Tempordner ist nach den beendeten Pruefungen leer;
Pruefnachweise bleiben erhalten. Das ist weiterhin keine 400-Personen- oder
Gesamtschloss-Freigabe.

## Geplante Portal-Aushaenge

Die zeitlich freizugebenden Portal-Aushaenge sind in einem getrennten
Arbeitsstand vorbereitet und mit 47 kuenstlichen PHP-/MySQL-Faellen sowie
neun Desktop-/Mobilansichten geprueft, aber noch nicht veroeffentlicht.
Entwuerfe, zukuenftige, abgelaufene und nicht ausdruecklich freigegebene
Fassungen bleiben unsichtbar. Das ist kein automatischer Schuelerversand.

Die sichere Transfer-Vorpruefung verwendet jetzt GoDaddys gepruefte offizielle
R1-zu-G2-Zertifikatskette, ohne Windows-Vertrauensspeicher oder Zugangsdaten
zu veraendern. Der echte Nur-Lese-Handshake bestaetigt die Kette, lehnt den
bisherigen unpassenden Servernamen aber weiter korrekt ab. Fuer die
Veroeffentlichung fehlt noch der bestaetigte FTPS-Hostname aus dem Hosting.
Es wurden keine Aushangdateien oder Datenbankaenderungen live eingespielt.
Einzelheiten: `ops/portal-transfer/README.md`.

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
