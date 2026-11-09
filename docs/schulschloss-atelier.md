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

Die Whiteboard-Browserproben verwenden isolierte kuenstliche Schulprofile. Sie
belegen weder einen echten Microsoft-Schuelerlogin im Whiteboard noch eine
Freigabe fuer 400 gleichzeitige Personen. Die normale Microsoft-Anmeldung und
Schulzuordnung ist inzwischen separat fuer Schach und Schulangebote bestanden.

Live-Inbetriebnahme und Karteneinbindung des Ateliers sind noch nicht erfolgt.
Eine vorzeitig angehaltene Vorbereitung hinterlaesst unter `/opt/wvh-castle-art`
nur die isolierten Quellen, Abhaengigkeiten und privaten Testnachweise; keine
laufenden Atelier-Container, keine neue Webroute und keine Schuelerzeichnungen.
Der gepruefte neue Identitaetspruefer muss vor der eigenen Live-Abnahme auch dort
bereitgestellt werden. Das vorhandene Atelier und die alte Schlosswelt bleiben
unveraendert nutzbar.

## Lizenzen

WBO ist AGPL-3.0-or-later, Commit
`90ae10b5e46e8efeb9b0c8ad918524e336b3fedc`. Vollstaendige unveraenderte Quellen,
Lizenz und Versionsnachweis werden mitgeliefert und vom Atelier verlinkt.
Der HTTP-/WebSocket-Proxy httpxy 0.5.6 steht unter MIT.
