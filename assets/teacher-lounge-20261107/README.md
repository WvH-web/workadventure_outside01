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
`standX`, `standY` and `facing` properties control the interaction. Approach points
must remain walkable; seat sockets may be inside furniture. Keep `seatFronts`
above `floorLayer`. The visible action-bar button always allows standing up.

The common staff conversation uses a native WorkAdventure streaming space, with
every occupant a speaker. User microphone/camera choices are not changed.
WorkAdventure deduplicates participant media when a proximity bubble overlaps;
a two-client live check confirmed one audible remote stream. Leaving this map
removes the space; it does not affect other school maps or their permissions.

The board at the east wall opens `resources.html`. Existing meeting and leisure
links are retained in the map's `teacherLoungeResources` property. The server's
existing teacher-only room rule is unchanged; static map/assets remain public
like the other GitHub Pages map files.

Checks: `node --test tests/teacher-lounge-20261107.test.mjs` from the repo root.
The builder takes the previous map as its optional first argument; regenerating
overwrites the layout. Do not regenerate over later manual Tiled adjustments.
