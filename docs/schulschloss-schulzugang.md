# Schulzugang zur Schlossvorschau

## Normale Microsoft-Anmeldung

Am 9. November 2026 mit zwei ausdruecklich dafuer angelegten kuenstlichen
Schueler-Testkonten ueber den normalen Microsoft-Anmeldedialog geprueft.
Beide Konten sind aktiv, verschiedenen Testklassen zugeordnet und besitzen
keine Lehrerrechte. Keine echten Schuelerkonten, keine geaenderten MFA-Regeln,
keine zusaetzlichen Lizenzen und keine gelockerten Anbieterfreigaben.

Die echte Anmeldung hat einen zuvor von synthetischen E-Mail-Identitaeten
nicht abgedeckten Unterschied sichtbar gemacht: WorkAdventure verwendet fuer
diese Microsoft-Konten eine undurchsichtige OpenID-Kennung, nicht die E-Mail.
Eine direkte E-Mail-Suche konnte daher keinen Schulstatus finden.

Der gemeinsame Identitaetspruefer fuer Schulangebote, Schach und das noch nicht
veroeffentlichte Atelier verifiziert zuerst das signierte WorkAdventure-Token.
Bei einer internen Kennung fragt er ausschliesslich Microsoft Graph `/me` nach
Objektkennung und Anmeldenamen des bereits angemeldeten Kontos. Den
Microsoft-Zugriffsschluessel behandelt er als undurchsichtigen Wert: Keine
abgeleitete Freigabe aus selbst dekodierten Microsoft-Tokenfeldern.
Der Browser darf weder E-Mail, Rolle, Alter noch Klasse vorgeben.

Nur die Identitaetszuordnung wird fuer maximal 30 Sekunden im Arbeitsspeicher
wiederverwendet, mit begrenzter Groesse und zusammengefassten gleichzeitigen
Anfragen. Das ist kein Berechtigungscache. Der aktuelle Portal-Schulstatus
einschliesslich Klasse und Alter wird weiterhin bei jeder geschuetzten Anfrage
frisch abgefragt. Ein Microsoft-Fehler, abgelaufener Zugang oder ungueltiges
Profil fuehrt nicht zu einer Ersatzfreigabe.

Dokumentierte Schnittstellen:
[Microsoft Graph: angemeldeten Benutzer lesen](https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0),
[Microsoft: Zugriffstoken als undurchsichtige Werte behandeln](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens).
Die bereits vorhandene delegierte Berechtigung reicht fuer `/me`; keine
Verzeichnis-Administratorberechtigung wurde hinzugefuegt.

## Nachweise und Betrieb

- 16 gezielte Identitaetspruefungen: Signatur vor Anbieteranfrage, feste Zieladresse,
  keine Weiterleitungen, begrenzte Antwort und Laufzeit, falsche Profile und
  abgelaufene Zugriffe, getrennte Anmeldungen und begrenzte Identitaetszuordnung.
- Beide normalen Microsoft-Anmeldungen durchlaufen; anschliessend echte aktive
  Schuelerprofile in Schulangebote- und Schach-Dienst erkannt, ohne Lehrerrechte.
- Externe Spiele bleiben Entwuerfe. Die echte Schuelererkennung veroeffentlicht
  keine bisher ungeprueften Angebote und umgeht keine Alters-/Klassenfreigabe.
- Zwei echte Schueler-Testkonten spielen zwei gemeinsame Schachpartien auf dem
  VPS. Zuege, Touch, ausdruecklicher Wiederbeitritt, Remis und Farbwechsel bestehen.
- Die Korrektur ersetzt nur die beiden neuen Schloss-Zusatzdienste. Bestehender
  WorkAdventure-Client, Anmeldung, Karten, Audio, Portalprofile und Webserver-
  Konfiguration bleiben unveraendert. Vorige Dienststaende bleiben zurueckbehalten.

Aktuelle Zusatzdienst-Staende: Schulangebote `2f5b9d8b0c668074`,
Schach `a2c820f0e4b0ce48`. Private Anmeldesitzungen und detaillierte
Pruefnachweise liegen ausserhalb des Repositorys und des Webverzeichnisses.

Der Test ersetzt keine native Schloss-Sprachprobe mit diesen beiden Konten
und keinen Lasttest fuer 400 Personen. Die bisherigen getrennten nativen
Gespraechsproben bleiben ein eigener Nachweis, nicht Teil dieser SSO-Partien.
