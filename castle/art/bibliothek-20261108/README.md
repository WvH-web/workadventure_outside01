# Kleine Schlossbibliothek

Neue, getrennte Vorschaukarte: `castle/bibliothek.tmj` und `bibliothek.wam`.
Spielgrafik 896 x 704 Pixel, 28 x 22 Kacheln, unveraenderte 32-Pixel-Avatare.

`room-source.png` und `bookclub-source.png` sind unveraenderte Originalausgaben
des integrierten Bildgenerators. Die beiden `*-prompt.txt` enthalten die finalen
Produktionsbeschreibungen. Die native Groesse und Geometrie wird deterministisch
aus `scene.json` gebaut; die Bildgenerierung selbst ist kein Bestandteil des Builds.

`room.png` ist der verkleinerte Hintergrund, `bookclub.png` die freigestellte kleine
Tischgruppe, `floor.png` die zusammengesetzte Spielgrafik und `fronts.png` die
pixelgetreue Moebel-Vordergrundmaske. Das Sofa und die drei Lesesessel werden in
derselben Groesse aus der abgenommenen Halleneinrichtung uebernommen, nicht
erneut skaliert. Koepfe und Oberkoerper bleiben vor allen Masken sichtbar.

Die Szene hat drei getrennte native Hoerbereiche mit insgesamt 13 Sitzplaetzen.
Nicht nur Sitzende, sondern auch Stehende innerhalb der jeweiligen Flaeche
gehoeren zur Unterhaltung. Kamera und Mikrofon werden nicht zwangsweise geschaltet.

Neubau: `node tools/build-library.cjs --update-world`.
Tests: `node --test tests/library.test.mjs`.
Native Viererprobe: `node tools/check-library-live.cjs`.
Private Konten, Sprach-Testdatei und Bildschirmbilder bleiben ausserhalb des Repositorys.
