# Geschuetztes Schlossatelier

Das Atelier erhaelt drei gemeinsame Zeichenflaechen: Maltisch, Ideenwand und
Plakatwerkstatt. Die Technik ist das unveraenderte WBO 2.18.33, nicht ein selbst
entwickeltes Zeichenprogramm. Die vorhandenen Sitz- und Gespraechsgruppen bleiben
unabhaengig davon erhalten; das Whiteboard fordert weder Kamera noch Mikrofon an.

## Zugang und Daten

- Nur aktuell eindeutig zugeordnete aktive Schueler und Lehrkraefte erhalten Zugang.
  Klassen- und Altersangaben werden ausschliesslich serverseitig verarbeitet.
- WorkAdventure-Anmeldungen und Portal-Schluessel werden niemals an WBO weitergegeben.
  Eine kurzlebige Schulberechtigung steuert auch bereits verbundene WebSockets.
- Keine oeffentlichen oder frei benennbaren Whiteboards. Die drei Schulflaechen
  sind fuer berechtigte Schueler gemeinsam sichtbar, nicht privat pro Klasse.
- Zeichnungen und eingegebene Texte werden gespeichert. Keine Namen, Fotos oder
  persoenlichen Informationen hineinschreiben. Keine automatische Veroeffentlichung
  im Museum. Eine solche Uebernahme braucht eine gesonderte Freigabe.
- Lehrkraefte erhalten WBO-Moderation, darunter Leeren der Flaeche. WBO erlaubt
  Moderatoren ausserdem, temporaere Moderation bewusst weiterzugeben. Schueler
  koennen sich diese Berechtigung nicht selbst erteilen.
- Speichern nach 1 Sekunde Ruhe, spaetestens nach 3 Sekunden laufender Bearbeitung.
  Ein harter Serverabbruch kann die letzten noch nicht gespeicherten Striche
  verlieren. Ein bestaetigter Strich ist hier keine garantierte Festplattenbuchung.
- Pro Flaeche maximal 2.048 Elemente, pro Nachricht maximal 500 Kinder und begrenzte
  Koordinaten. Drei feste Flaechen ersetzen keine unbegrenzte persoenliche Ablage.
  Vor wichtigen Aktionen exportieren; keine stille automatische Komplettloeschung.

## Nachweise vom 9. November 2026

- 13 eigene Zugangs-, Sitzungs-, Rollen-, Proxy- und Quellpaketpruefungen bestanden.
- Echte WBO-Engine mit getrennten lokalen Browserprofilen: Striche und Texte werden
  ueber WebSocket geteilt; spaeter Beitritt, Verlassen des Erstellers, Wiederbeitritt,
  mehrere Tabs, Berechtigungsablauf, Rollenwechsel und getrennte Flaechen bestanden.
- Gefaelschter Schueler-Loeschbefehl serverseitig abgewiesen; Lehrkraft kann gemeinsam
  leeren. Echter Touch-Strich bei 320 und 390 Pixeln wird beim Mitspieler angezeigt.
- Geordneter Neustart stellt zwei unterschiedliche gespeicherte Flaechen wieder her;
  SVG-Export funktioniert. Keine Browser- oder CSP-Fehler in dieser lokalen Probe.
- 112 von 113 ausgewaehlten unveraenderten Upstream-Tests auf Windows bestanden. Ein
  Speicher-Test verlangt 10.000 Hardlinks auf dieselbe Datei und scheitert hier an
  der Windows-Grenze von 1.024 Links. Alle 113 Tests anschliessend im isolierten,
  schreibgeschuetzten Linux-Testlauf auf dem VPS bestanden.
- Produktionsabhaengigkeiten nach Paket-Lock installiert; die lokale npm-Pruefung
  meldete zum Pruefzeitpunkt keine bekannten Schwachstellen.

Die lokalen Browserproben verwenden isolierte kuenstliche Schulprofile.
Zusaetzlich ist jetzt der echte VPS-Betrieb mit beiden eigens eingerichteten
Microsoft-Schueler-Testkonten bestanden: normale Anmeldung, frisch gepruefter
Schulstatus, gemeinsame Maus- und Touch-Striche, Text, Neuladen, spaeteres
Beitreten und Weiterzeichnen nach Verlassen des ersten Teilnehmers.
Geschlossene Zweittabs melden andere offene Tabs nicht ab. Die Probe entfernt
nur die durch ihre eigenen ausgehenden Erstellnachrichten erfassten Objekte;
keine fremden Bilder und keine komplette Zeichenflaeche werden geloescht.
Keine Browserfehler oder Anmeldeschluessel in Browser-URLs.

## Live-Betrieb und Schlossvorschau

Die eigene Seite liegt unter `/castle-art/`. Der Zugang braucht eine bestehende
WorkAdventure-Anmeldung und den aktuellen Portal-Schulnachweis. Der interne
Whiteboard-Dienst hat keinen eigenen oeffentlichen Port. Gateway und WBO laufen
getrennt als Benutzer 1000, mit schreibgeschuetztem Programm, begrenztem Speicher
und begrenzten Protokollen. Nur WBOs eigenes Datenverzeichnis ist beschreibbar.

Veroeffentlichter Dienststand: `bf7276dd326ee8d8` unter `/opt/wvh-castle-art`.
Die alte unbenutzte Vorbereitung bleibt als gepruefter Quellstand erhalten.
Die bereits laufenden Schloss-, Audio- und WorkAdventure-Dienste wurden nicht
neu gestartet. Nur der eigene Webpfad kam hinzu; die privaten gemeinsamen
Webserver-Nachweise wurden auf den neuen Konfigurationshash abgestimmt.

Schlossvorschau `20261109-atelier2`: Am Werkstatttisch im Atelier steht
`Gemeinsam zeichnen` bereit, einschliesslich des nativen Apps-Eintrags. Es
oeffnet genau ein Seitenfenster ohne Zugriff auf die Karten-API. Die drei
Gespraechsbereiche und zwoelf Sitzplaetze bleiben gleich. Alle acht neu
versionierten Karten behalten dieselben Kollisions-/Sitzgeometrien und exakt
dieselben PNG-Dateien. Kein Ersatz des alten Schlosses.

Die Live-Seitenprobe ist noch kein Nachweis fuer gemeinsame native
Schloss-Sprachgespraeche bei geoeffnetem Atelier. Diese kombinierte Probe folgt
separat. Eine Freigabe fuer 400 gleichzeitige Personen ist damit nicht erteilt.

Beim ersten kombinierten Versuch lud der vierte native Teilnehmer die Karte,
aber sein Kartenskript lief in WorkAdventures Lade-Zeitlimit. Dieser Versuch
ist ausdruecklich nicht bestanden. Als gezielte Verbesserung fuer die acht
neuen Innenraeume buendelt der Kartenbau jetzt die acht zusammengehoerigen
Quellmodule in eine Datei von rund 31 KB. Es entfaellt deren mehrstufiges
Nachladen; Karten, Grafikmassstab und Laufwege werden dadurch nicht geaendert.
Die kombinierte Probe wird mit diesem Stand wiederholt.

Die Quellmodule bleiben lesbar erhalten. `tools/build-castle-script.cjs`
verwendet die bereits im Village-Projekt gesperrte esbuild-Version 0.17.17
ausschliesslich zum Bauen, ohne Entwicklungsserver. Das erzeugte Manifest
prueft Quellen-/Ausgabehashes, fehlende Restimporte und dass Raumsteuerung,
Aktivitaeten und Figuren jeweils nur einmal enthalten sind. Der gesamte
Innenraumbau erneuert das Paket automatisch nach den UI-Kennungen.

## Lizenzen

WBO ist AGPL-3.0-or-later, Commit
`90ae10b5e46e8efeb9b0c8ad918524e336b3fedc`. Vollstaendige unveraenderte Quellen,
Lizenz und Versionsnachweis werden mitgeliefert und vom Atelier verlinkt.
Der HTTP-/WebSocket-Proxy httpxy 0.5.6 steht unter MIT.
