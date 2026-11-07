# Magisches Lehrerzimmer

Map: `teachersmeetingground.tmj`, 24 x 16 tiles at 32 px, 768 x 512 px.
The existing protected room URL is retained. No alternate map copy is published.
The previous map remains in Git history (parent of the lounge replacement commit).

The original AI-generated wizard-school artwork is `source.png` (1536 x 1024).
`floor.png` is its exact nearest-neighbour half-size version. `fronts.png` reuses
the original furniture pixels with transparency, so native avatars appear behind
chair arms, chair fronts and the table edge. There is no replacement avatar or
native sitting animation: seating is positioning, facing and foreground occlusion,
replicated through ordinary player movement and transient public player state.

Twelve seating objects live in the `seating` layer. Their `seatX`, `seatY`,
`standX`, `standY`, `facing` and `audioGroup` properties control the interaction. Approach points
must remain walkable; seat sockets may be inside furniture. Keep `seatFronts`
above `floorLayer`. The visible action-bar button always allows standing up.

The eight conference seats share the native `council` conversation. The three
armchairs share a separate `fireplace` conversation. Joining happens only once
seated; standing up leaves the group and ordinary proximity remains available.
The writing desk has no automatic group. No whole-room broadcast remains.
User microphone/camera choices are not changed. These native two-way spaces are
room-specific and do not alter the permissions or audio of other school maps.

Facing uses a short native movement from a different tile before snapping to the
chair. A same-tile movement is not reliable: EasyStar returns an empty path, and
WorkAdventure then walks to a neighbouring tile. The sixteen-pixel foot offset
also has to be accounted for. Native movement events are checked for all chairs.

Three phased tile animations reuse `village/tilesets/fire.png`; no new artwork is
needed. The `kamin-prasseln` area loops `village/fire.mp3` at volume 0.12, only near
the hearth. Both visuals and audio use the existing native WorkAdventure players.

The board at the east wall opens `resources.html`. Existing meeting and leisure
links are retained in the map's `teacherLoungeResources` property. The server's
existing teacher-only room rule is unchanged; static map/assets remain public
like the other GitHub Pages map files.

Checks: `node --test tests/teacher-lounge-20261107.test.mjs` from the repo root.
The builder takes the previous map as its optional first argument; regenerating
overwrites the layout. Do not regenerate over later manual Tiled adjustments.
