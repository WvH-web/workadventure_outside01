# Schlosskino: Darstellung

Die bestehende Kino-Anwendung bleibt fuer Synchronisation, Microsoft-Anmeldung,
Alterspruefung, Chat und die verschiedenen Filmquellen verantwortlich.
Diese Erweiterung veraendert nur die Darstellung: Anthrazit, Bordeaux und Messing,
kompaktere Ueberschriften, eine breitere Filmflaeche und eine ruhigere Programmliste.
Im eingebetteten Seitenfenster wird die Darstellung automatisch verdichtet.
Die neue JavaScript-Datei liest oder speichert keine Anmeldedaten, startet keine
Netzwerkanfragen und steuert keinen Player.

`head-includes.html` enthaelt die einzigen beiden Ergaenzungen an `kino.php`.
Die uebrigen fuenf Dateien werden als neue, versionierte statische Assets geladen.
`build-kino-icons.cjs` erzeugt die beiden Symbole aus dem vorhandenen Lucide-Paket.
Die Lizenz liegt neben den Symbolen.

## Gepruefter Ablauf

`tools/kino-ui.cjs fetch` liest ausschliesslich die oeffentliche PHP-Vorlage und
die beiden vorhandenen Foyer-Assets mit dem gespeicherten WinSCP-Profil.
Diese Website liegt auf dem separaten Windows/IIS-Hosting, nicht auf dem
WorkAdventure-VPS. Server-Konfiguration, Datenbank und Nutzerdaten werden nicht
heruntergeladen oder veraendert. Zugangsdaten werden nicht exportiert.

`prepare` verlangt den unveraenderten Ausgangsstand, fuegt die beiden Includes
ein, prueft die PHP-Syntax und vergleicht saemtliche PHP-Tokens ohne HTML.
Ausgangsstand: SHA-256
`fc63faccdbd49e43b54ef43ab96200e5985c48fb647e20f56af1d6e0b02b770e`.
Vorlage, Sicherungen und Transferprotokolle bleiben ausserhalb dieses Repositorys
unter `../output/kino-ui-20261108/`.

`node tools/check-kino-ui.cjs` rendert die echte Vorlage ohne Anwendungsstart
mit kuenstlichen Daten. Acht Ansichten bei vier Bildschirmbreiten plus vier
herkunftsgetrennte Iframe-Tests ergeben 36 Darstellungspruefungen. Die originale
Inline-Steuerung wird nur in diesen lokalen Testseiten blockiert. In Produktion
bleibt sie unveraendert. Tests starten keine echten Filme und verwenden keine
Schuelerkonten. Eine vollstaendige Abnahme aller Filmquellen ersetzt das nicht.

`deploy` prueft zweimal auf zwischenzeitliche Aenderungen und weigert sich,
vorhandene neue Zieldateien zu ueberschreiben. Zunaechst werden die statischen
Assets und eine zufaellig benannte PHP-Testkopie hochgeladen. Nach Quellvergleich
und HTTP-Pruefung wird die Hauptdatei umbenannt, ersetzt und erneut ausgelesen.
Fehler fuehren zu einer geprueften Ruecksetzung, solange keine fremde Bearbeitung
erfolgt ist. Die temporaere Server-Sicherung wird nach erfolgreicher Pruefung
entfernt; die lokale Sicherung bleibt erhalten. Der lokale Website-Spiegel wird
nur aktualisiert, wenn er noch dem geprueften Ausgangsstand entspricht.

Ein erneuter Einsatz nach erfolgreicher Veroeffentlichung braucht einen neuen
Ausgangsstand und neue Asset-Versionen; der Helfer ueberschreibt keine alte Abnahme.
Die alten Schlosskarten, das Portal und die Veranstaltungsdaten bleiben unberuehrt.

## Veroeffentlichung am 8. November 2026

Die beiden Includes und alle fuenf statischen Dateien sind veroeffentlicht,
per HTTP und durch erneutes Herunterladen bytegenau geprueft. Die PHP-Tokens
bleiben identisch. Der unveraenderte lokale Website-Spiegel wurde mit aktualisiert.
Der vollstaendige private Ausgangsstand bleibt als lokale Ruecksetzmoeglichkeit erhalten.

Alle 36 synthetischen Darstellungspruefungen und die 109 Schloss-Kernpruefungen
bestanden. `node tools/check-kino-public.cjs` prueft zusaetzlich die echte Seite
anonym bei 1280 Pixel Breite sowie eingebettet bei 680 und 390 Pixel Breite.
Alle drei oeffentlichen Ansichten sind fehlerfrei, ohne Filmstart oder Formulareingabe.
Zum Zeitpunkt dieser Pruefung war keine Vorstellung angesetzt; die echte
Wiedergabesynchronisation wird dadurch nicht erneut abgenommen.

Die native Kino-Abnahme mit vier getrennten Testprofilen bestand anschliessend:
automatisches Seitenfenster, unveraendertes Fenster bei Sitzwechsel, bewusstes
Schliessen und Wiedereroeffnen, Ruhezone vorne und zwei getrennte Tischgespraeche
hinten. Der Film-Endpunkt war in dieser Pruefung durch eine neutrale Seite ersetzt;
die echte veroeffentlichte Darstellung wurde separat wie oben beschrieben geprueft.
