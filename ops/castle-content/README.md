# Shared Museum Selection

Accepted on 2026-11-11 UTC in the separate school-castle preview:
`https://together.deine-schule.com/~/castle-preview/museum.wam`.
The old castle and Village remain unchanged. This is not completion of the
whole castle or an eight-/400-participant capacity approval.

## Shared Table

The museum's four-chair exhibition table opens the owned collection panel on
seating. A participant selects a currently published `show1` through `show13`
entry; the table follows the same entry. Either participant can return the
group to the gallery. Late arrivals inherit the acknowledged selection, and
the chooser may leave. Closing every side panel does not end a seated round.
When the last chair visit ends, a new visit does not revive the former choice.
The existing native table meeting supplies conversation, not a second audio app.

Only the owned exact collection URL receives the map API. Ordinary collections,
external pages and the nested portal viewer do not gain that API or capture
permissions. `tour-state.js` uses transient, room-scoped public player state
bound to the existing chair visit and acknowledged table-round UUID. It copies
validated selections between current table participants and deterministically
merges simultaneous changes. No browser-selected URL, name, school profile,
points, recorded audio or persistent tour history is stored.

This is collaborative selection, not an anti-tampering guide permission or
server-side age authorization. A modified client can declare native player
state. Destinations still come only from the canonical existing public museum
catalog and opening endpoint, never from a participant's target URL. Public
boards do not become restricted school content merely by hiding a button.
Station selection does not synchronize video position, PDF pages, scrolling
or controls inside external applications. The normal catalog refresh retains
unchanged media and removes withdrawn entries; it does not restart a player
on each native state update.

## Publication And Evidence

- Feature foundation: `93e110a`; public append-only sources: `93eb88e`.
- Dedicated native bundle SHA-256:
  `b02927ad5ea575d0328875945c73cafe17a136d9a5961fffd37de7c1a458e7d4`.
- Published map source SHA-256:
  `2581644913f50f67c3e71746ee935326de754398e2a74a0426c5e5673daa2fe4`.
- First 15-file static archive:
  `98b90e3b25299aa80056ae89b758da8ad650297eb902bd22a926bce33a647d46`.
- Accepted marker-repair archive:
  `13b49289c2d2df8facaaf2bcadc401953686d458272c0f3f73ab8c871151910a`.

Only three new GitHub Pages files were added. No existing map source or common
published bundle was overwritten. The existing static gallery route now serves
15 files atomically. Its routing, security headers, twelve unchanged original
files and prior releases are retained. The marker repair changed only
`collection.html` and `collection.js`; the original receipt was not rewritten.

An additional protected `museumprobe.wam` used its own native meeting namespace.
It passed without network substitution using the two explicitly approved
synthetic pupils' ordinary Microsoft states and the actual unmodified public
catalog/viewers. The probe was then hash-verified and removed. Only the existing
new-preview `museum.wam` changed its source URL; native areas, furniture,
entities, access configuration and all other fifteen wrappers stayed unchanged.
No container or systemd service restarted; Nginx and school roles stayed intact.

The repeated genuine two-pupil public probe additionally closes all side panels
while seated and reopens them without losing the selection. Four stages each
require actual received native audio energy in both clients. Actual portal
viewers return HTTP 200 and load inside the side frame. Desktop and 390px mobile
canvases are nonblank and the panel does not overflow horizontally. No actual
movie playback, physical microphone or capacity claim is inferred from this.
Six desktop/mobile regression views use released files but synthetic catalog
data; they are separate from the unmodified native acceptance.

All 71 local Python operational cases pass. The latest full Node regression has
489 cases: 486 pass, two documented skips and one failed 400-request admission
load case (286 HTTP 200, 114 HTTP 503). An earlier isolated full run passed,
but repeated overload/timeout results on this Windows host remain unresolved.
The museum does not modify admission processing. Neither a successful retry nor
the two-pupil native probe is a general event-capacity acceptance.

Private receipts under `/opt/wvh-castle-content/private/`:
`museum-tour-content.json`, `museum-tour-stage.json`,
`museum-tour-repair-1.json`, `museum-tour-cleanup.json`,
`museum-tour-deployment-stage.json` and final `museum-tour-deployment.json`.
Browser evidence and exact earlier metadata live in `before-museum-tour/` and
`museum-tour-published-browser.private.json`. Failed browser-substitution,
locator-wait and marker-visibility attempts remain in the local private QA area,
not in this repository. No pupil sign-in states or screenshots are published.

The updated full deployment auditor verifies the complete append, repair,
cleanup and single-wrapper chain and all current bytes. The earlier gallery
milestone uses its exact retained manifest; the museum verifier separately
validates the current manifest transition. Both previous auditors are retained,
not silently replaced as historical evidence. The room-service health check
understands the same explicit transition without restarting anything.

## Rebuild And Probe

`node tools/build-castle-expansion.cjs --only=museum --update-world` builds the
canonical museum and identical publication source `museum-tour-preview.tmj`.
`node tools/check-castle-museum-tour.cjs` probes the accepted preview with the
approved private test states; the `--stage` switch is only for an existing
isolated probe. `--attempt=2` through `--attempt=9` retain earlier outputs.

The publication/staging helpers are deliberately one-time, exact-state guarded
transitions. Do not rerun them as generic updaters or use the legacy fourteen-
file gallery installer for the new fifteen-file package. Content maintenance
continues through the existing portal and does not require a map build. Future
code publications require a new reviewed transition, preserved backups and
another real native probe. `rollback-castle-museum-tour.py` restores only a
still-provisional museum promotion; it refuses an accepted release.
