# Great Hall Artwork and Native Geometry

## Source

- Supplied generated illustration: `source.png`; original authoring prompt: `prompt.txt` in this directory. Both source files are preserved unchanged.
- Requested image size: 2304 x 1536. Measured PNG size: **1536 x 1024**, RGB, 8 bits/channel, no alpha, 72 DPI.
- Source SHA-256: `7b50f8fe2437a06f206daaa6732b2052a171d7432d88054671cd6376310f9bb4`.
- The complete image is resized to 1536 x 1024, never cropped. With the supplied image, decoded floor pixels are identical to source pixels: **native 1:1 scale**, 48 x 32 tiles, 32px tile and avatar size, no padding.
- `layout.json` is the editable geometry source. All rectangles, seat/stand points and foreground polygons use final native pixels. Only `entries`, `portals`, and hearth/portrait `tileX`/`tileY` use native tile coordinates. A future 2304px-wide source still uses these final-space coordinates; source-space samples would first be multiplied by 1.5 for inspection, not the final map geometry.
- Standard table chairs measure about 45-58px high. The lounge's intentionally cushioned armchairs are larger, about 62-80px. The source artwork is preserved rather than independently rescaling furniture.

## Build and Ownership

From the project root:

```sh
node tools/build-great-hall.cjs
```

Or import `const { buildGreatHall } = require("./tools/build-great-hall.cjs")` and `await buildGreatHall()` to receive `{ map, world }`.

Normal generation writes only `castle/grosse-halle.tmj`, this directory's `floor.png`, `fronts.png`, `fire.png`, `portrait.png`, `marker.png`, and `castle/art/grosse-halle-overview.png`. It does not update the shared world manifest. The optional CLI flag `--update-world` replaces/appends only the `grosse-halle` world entry, preserving all other manifest data. That flag was not used during this work. Main build, existing maps, browser preview, room scripts, gateway/backend, and tests are owned by other work.

Map properties: `castleMapId: grosse-halle`, `script: hall.js?v=20261107-hall1`, and public `hallAudioUrl: https://together.deine-schule.com/castle-audio/`. Measured metadata is saved as the map's JSON-string `castleMapdata` property, returned as `world.mapdata`, and printed by the CLI. No access credentials are stored in geometry, map or art configuration.

## Areas

All rectangles below are **x, y, width, height in native map pixels**.

| Area | Rectangle | Properties / seats |
| --- | --- | --- |
| Kaminrunde | 160, 336, 416, 304 | `conversationGroup: kaminrunde`, 6 seats (3 sofa + 3 armchairs) |
| Tafel Nord | 816, 368, 368, 200 | `conversationGroup: tafel-nord`, 8 seats |
| Tafel Sued | 816, 568, 368, 216 | `conversationGroup: tafel-sued`, 8 seats |
| Lehrerbank | 192, 704, 416, 224 | `conversationGroup: lehrerbank`, 4 seats, 38px spacing |
| Spieltreff | 1248, 672, 240, 240 | `conversationGroup: spieltreff`, 4 seats |
| **Podium** | **624, 272, 288, 88** | **`hallPodium: true`, `silent: true`** |
| Noticeboard interaction approach | 1248, 384, 256, 224 | `hallAction: noticeboard`, `hallNoticeboardKey: hallnotice01` |
| **Noticeboard inner display** | **1343, 429, 120, 96** | **`hallBoardDisplay: true`**, separate from interaction approach |
| Game-table action | 1248, 672, 240, 240 | `hallAction: games` |
| Foyer | 608, 800, 640, 160 | Preview/world room only, not an audio group |

The five conversation rectangles do not overlap each other or the podium. `world.rooms` includes those five, podium and foyer. The podium is the only native silent area. There are no native streaming, broadcast or megaphone properties. Hall-wide audience and microphone gateway authorization belong to `hall.js` and the server; this generator does not enable an unguarded native broadcast. The existing noticeboard endpoint's `board=hallnotice01` key is handed to the client integration, not implemented as a guessed URL here. The display rectangle marks only the empty painted center; the board itself remains solid furniture.

## Portals and Returns

Exit layer rectangles use native pixels. `world.links` matches every native `exitUrl`; the teacher target retains `../` so the existing preview treats it as external.

| Exit layer | Rectangle | Destination |
| --- | --- | --- |
| `door-lehrerzimmer` | 160, 224, 32, 32 | `../teachersmeetingground.tmj` (unchanged protected map) |
| `door-mittelstufe` | 544, 224, 32, 32 | `mittelstufe.tmj#vom-flur` |
| `door-kino` | 992, 224, 32, 32 | `kino.tmj#foyer` |
| `door-bibliothek` | 1280, 224, 32, 32 | `erdgeschoss.tmj#bibliothek-anreise` |
| `door-treppe` | 1408, 224, 64, 32 | `obergeschoss.tmj#vom-eg` |
| `door-schlosstor` | 736, 928, 64, 32 | `umgebung.tmj#schlosstor` |

| Return entry | Tile x,y | Avatar center x,y in pixels |
| --- | --- | --- |
| `start` | 23,26 | 752,848 |
| `vom-lehrerzimmer` | 5,9 | 176,304 |
| `mittelstufe` | 17,9 | 560,304 |
| `kino` | 31,9 | 1008,304 |
| `bibliothek` | 40,9 | 1296,304 |
| `vom-og` | 44,9 | 1424,304 |
| `schlosstor` | 24,26 | 784,848 |

Every return is off all exit triggers. North approaches have a clear intervening floor row, and south returns are on the runner before the door arch. Reciprocal links and any newly named destination entries must be integrated by the main agent.

## Foreground, Collision and Fire

`room-art` is the complete illustration. After the `floorLayer` object group, `furniture-fronts` copies original RGBA pixels inside editable furniture-edge polygons. There is no replacement painting, tinting or new vector artwork. Every seated head rectangle (x-9..x+9, y-17..y-3) stays transparent in the foreground. Furniture masks were visually checked with thirty 32px avatar stand-ins.

`collisionRects` rasterize at native tile centers. Portal thresholds, all seat centers, every standing point, and all starts receive explicit 8px body clearance. Rectangles with `preserve: true` are checked after clearance so table centers, walls, books, lamps, plants, lectern and noticeboard cannot silently become walkable. The lectern is solid but the dais is accessible from both sides/south. Collision uses its own transparent marker tileset with `collides: true`; entry markers never collide.

Fire comes from the existing `village/tilesets/fire.png`, with timing read from `village/wa-headquarters.tmj`: seven 100ms frames, upper IDs 112, 156, 200, 244, 288, 332, 376, lower halves +22. Each 32x64 sprite is scaled to 24x48 with nearest-neighbor sampling, then its transparent bottom is cropped. Three small phase-shifted flames are composited into each **64x64** frame. All offsets are baked into those pixels. The resulting atlas is **448x64**, 14 columns, 28 tiles. Four quadrant animations (IDs 0, 1, 14, 15) are placed at native tiles (9,6), (10,6), (9,7), (10,7). No `offsetx`/`offsety` occurs anywhere in the map. The visible frame-zero flames occupy x=301..341, y=219..244 on the hearth logs. A local fireplace ambience area uses the existing village fire sound; it grants no microphone/broadcast access.

The existing `castle/art/portrait.gif` supplies the additional north-wall portrait animation: 8 decoded 64x96 frames, resized to **52x64**. Its exact on-map rectangle is **1172,56,52,64**. Each frame is baked into a transparent **96x96** cell at inset **20,24**. The generated `portrait.png` atlas is **768x96**, 24 columns, 72 tiles, appended after the fire tileset. All nine tile animations are placed from base tile **36,1** (pixel **1152,32**) without offsets. Animation tile IDs are 0,1,2,24,25,26,48,49,50, advancing by 3 per frame; GIF frame delays are preserved exactly: **5500,2400,100,140,3000,2500,2200,4000 ms**, a 19,840ms cycle. The source GIF is unchanged and the entire painted/animated rectangle remains within the solid north wall. No new generated illustration is used.

## Verification and Integration Risks

Measured build: **30 seats, 5 conversation areas, 7 world rooms, 7 entries, 6 exits / 8 exit tiles, 707 blocked tiles, 811 reachable non-portal floor tiles, 166 foreground tiles / 66,933 foreground pixels, 4 synchronized fire-quadrant animations and 9 synchronized portrait-tile animations**. Generated overview is native 1536x1024, with frame zero of both animations composited at their exact native positions; the floor atlas remains the unchanged illustration.

The generator checks dimensions, unique seat count, protected collisions, reachable standing approaches and returns, portal adjacency, accessible podium/board approach, group separation and transparent head regions. An additional in-memory 4px-step BFS with an 8px body radius passed all 30 standing points, all 30 seat bodies, all 7 entries, and approaches to all 6 exits while treating portal cells as barriers: **46,688 reachable body positions**. Ten unconnected free tile cells are deliberate teleport-only chair interiors, not walking approaches. Separate checks verified native layer lengths, all tileset image sizes, 1:1 decoded source/floor equality, exact foreground pixel identity, animation indices/timing, one silent area only, and absence of sensitive/native-broadcast properties. The native fire composite was visually inspected over the actual hearth.

Portrait-specific checks passed all 8 resized GIF frames with **zero changed channels** between the intended 52x64 frame and the atlas crop. All pixels outside the inset portrait rectangle have zero alpha. All 9 animation sequences preserve the GIF delays and frame order, all 9 map cells are collidable north-wall cells, and the native placement was visually inspected at 4x enlargement. Normal rebuilds are deterministic and leave the source artwork, source GIF and shared manifest unchanged.

Remaining integration checks belong to the main work: connect the six reciprocal destinations (especially the new library arrival and outside `schlosstor` entry), register `world`, deploy matching podium bounds to the audio gateway, connect the board/game actions, and smoke-test in a live native WorkAdventure room. Browser integration and gateway authorization were not tested here. Existing protected teacher-room access was neither read for secrets nor altered.
