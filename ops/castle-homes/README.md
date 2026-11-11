# Personal Rooms: School Authority

Status on 2026-11-11 UTC: authority, protected gateway and browser integration now
include a **published two-test-account pilot**, not general school-room access.
The signed context endpoint and separate persistent pilot database are installed.
The new-preview upper gallery now has a verified native entrance; no general
portal login/logout hook is activated. Optional room media is active only inside
this restricted pilot, as documented below.
One explicitly approved administrator now has report moderation,
without changing the general school account role. The colleague preview remains
fictional and unchanged.
The full school-castle goal remains open.

The initial isolated VPS runtime preflight also passed with ordinary Microsoft sessions
from the two explicitly authorized synthetic pupil accounts and fresh real
read-only school context. That earlier proof was loopback-only, not public or native room entry.

## Reuse Existing Rooms

The existing Sternenhueter account and bedroom modules remain the source of
ownership, saved furniture, inventory, purchases and visits. The new authority
uses their exact `wvh:student:<id>`, `wvh:family:<id>` and `wvh:staff:<id>` subjects
and signed ticket/introspection protocol. A hash-derived replacement student id,
browser-selected owner or newly invented room product would break that ownership
and is deliberately not used. No local game database or colleague test inventory
is copied into a school environment.

`tools/check-castle-homes-game.cjs` loads the actual separately owned game modules
without editing them. It records nine source hashes before and after the test,
starts a loopback-only synthetic school authority and creates its own temporary
SQLite database. Two devices retain the same owner, room code, layout revision,
starter inventory and balance. A second pupil gets a separate room; game logout
affects only its device, and a fresh school withdrawal denies the other device.
The temporary database and HTTP listener are removed. This is not a native
WorkAdventure, browser, visiting, real-login or live-school-game acceptance.

## Fresh Canonical Identity

`SchoolIdentity.php` reads existing school records; it never writes them. The
live schema capability check confirmed all required fields in eight tables,
without reading student rows. Email resolution rejects duplicate active accounts
and cross-domain ambiguity instead of guessing between a pupil, family and staff.

- Pupils need an active account, a supported enrollment status, an unexpired
  contract, exactly one current dated school year and a current enrollment.
  Current exit/reentry checks follow the existing portal pattern. Conflicting
  current classes/learning levels are denied. The existing AI learning level
  takes precedence when applicable; it does not invent class membership.
- Family identity belongs to the active, portal-enabled family, not to one of
  its children or to a contact email in the guardians table. A current active
  enrolled child is required. Child age/grade never become the parent's fields.
- Staff require a fresh real teacher role (3), primary or additional. An admin
  label alone is insufficient. Privileged teachers additionally need the
  emergency-lock setting explicitly off. Moderation is a separate private
  allowlist and defaults to nobody; token tags or outfits confer no rights.
- Missing/invalid/future birthdays produce unknown age, never an invented older
  age. Berlin school date, inclusive enrollment/contract boundaries and leap
  birthdays have explicit coverage. Raw birthdays, email addresses and names do
  not appear in the private identity DTO.

This identity DTO is private server-to-server data. The eventual browser gateway
must not forward its canonical ids, age or grade as a public map response.

## Context Protocol

The fixed endpoint is
`https://www.deine-schule.com/workadventure-castle-homes.php`; it is installed for
the signed pilot service, not a browser school-profile API.
The Node client permits no alternate origin, endpoint, redirect or browser cookie.
Each fresh call signs timestamp, random nonce and exact JSON bytes with its own
private key. Responses are separately bound to that nonce and their exact bytes.
Signature checks precede any school connection and even opening the nonce store.

Request timestamp tolerance is 30 seconds, nonce retention 60 seconds, and the
private SQLite nonce budget 4096. Concurrent PHP workers cannot consume the same
request twice. The body has one exact `identifier` field, at most 2048 bytes;
role/age/owner fields and query-token alternatives are rejected. Replies are
bounded to 4096 bytes and ten seconds freshness; timeout, malformed data,
signature mismatch, replay or dependency failure never reuse an old permission.
At most sixteen identity lookups run concurrently. The school query transaction
is explicitly read-only; request nonces use a different private SQLite store.

The pilot has a new private context key, FPM-owned nonce store and configuration
outside the webroot. Its game bridge uses a second, different new key. The current
platform login key and School API lookup key were not reused or rotated. The
wrapper only calls `castleHomesContextEndpoint()` with its fixed private config.

## WorkAdventure Grant Authority

`authority.cjs` combines the unchanged strict WorkAdventure JWT/Graph verifier,
fresh canonical identity lookup and bounded FIFO admission. It inspects no
browser-provided role, pupil id, age, class or profile name. Its internal ticket
uses a stable generated nickname rather than a real name. Signing material and
provider tokens must never leave the first-party gateway or enter URLs.

At most four device grants per authenticated account and 600 overall are held
in memory. Renewal rereads identity. Grants last at most 45 seconds between
successful renewals, capped at the signed login expiry and two hours overall.
Identity switching revokes the previous browser grant before the new school
decision. Late renewal/introspection cannot revive a withdrawn grant, overwrite
a newer verified profile or revoke a newer successful renewal. Restart restores
no unattended grants; permanent room ownership remains the game's database.

Important gateway requirement: the original game's internal session ceiling is
up to two hours and its identity check interval is 60 seconds. **Neither replaces
the gateway's 45-second grant**. The gateway must validate it on every protected
HTTP request and WebSocket upgrade, sweep at least once per second, and close all
bound sockets on invalidation. It must bind the backend game cookie to the same
browser grant, strip unrelated credentials and expose no internal authority
routes without their private request signature. A successful renewal must not
replace the backend cookie or repeatedly disconnect a valid game session.

The authority module alone grants no browser access. Its `ticket` and
introspection response remain internal server values, not browser launch payloads.

## Protected Gateway And Local Browser

`gateway.cjs` now owns first-party entry, a separate browser binder and individual
HttpOnly view cookies. The backend game's actual school cookie stays on the
server. The browser receives only `ready`, a public view generation and bounded
lease duration. A generation URL is not an access credential: it requires both
the correct scoped HttpOnly view cookie and the matching browser binder, plus a
live server grant. Different accounts receive different generations, so an old
frame cannot silently start reading the new account after a cookie change.
No school, provider or backend game token is put into a URL.

Every protected HTTP request and room-WebSocket upgrade checks that binding.
Only the explicit bedroom/visit endpoints and reviewed room assets are proxied;
there is no arbitrary upstream, authenticated file browser or full-game fallback.
Cookies, bearer headers and forwarding headers supplied by the browser are not
forwarded to the game. School fields are stripped from its room responses, and
initial guest metadata exposes no unrelated hidden village players. A successful
renewal keeps the same backend session and open socket. Stale initial responses
and stale leave requests cannot replace or close a newer accepted view.

Expired/revoked views close their bound HTTP streams and sockets. Explicit last
device departure leaves the actual private visit before logging that game device
out; another active device belonging to the same actor is not forcibly detached.
The original game's documented reconnect grace is not turned into extra gateway
authorization. Camera and microphone permissions are closed, and the not-yet-
approved video controls are hidden. Private room voice is not claimed as ready.

The existing room renderer/editor and visit engine are reused unchanged. A
single exact-hash-guarded invitation adaptation makes the original copy button
produce the public authenticated entry URL, not a device's private view path.
Owned room markup supplies that canonical base; the original separately owned
game checkout is never edited. Its backend APIs and purchased furniture model
remain the source of truth.

The isolated original-engine HTTP/WebSocket probe passes ten cases: verified
entry, distinct owners, foreign-view denial, actual visits, received phrases,
young-child chat rules, guest furniture isolation, non-disconnecting renewals,
credential stripping, host departure and finite lease enforcement. Seven
additional dependency-isolated Node cases cover the gateway boundary and races.
Chrome 157 tests two separate synthetic browser contexts at 1000 and 390 pixels,
plus the 320-pixel catalog. Actual bitmap pixels, controls and overflow checks
pass. An invitation opens the real shared private visit, a phrase arrives in the
other browser, and account switching retains the correct new owner across later
auth polls. No network request is intercepted. Clipboard writing is deliberately
stubbed to avoid changing the user's clipboard; the generated link and subsequent
browser visit are real. These are not normal Microsoft or native WA tests.

`tools/serve-castle-home-rehearsal.cjs` serves a loopback-only local selection page
at the first free port from 4318 to 4328. It creates two fictional accounts and a
disposable game database. The selector and actual room were also browser-tested.
Use its explicit stop button to close the owned process and remove its temporary
database. It cannot serve as the production school identity provider and is not
included in a future school deployment. Runtime URL/pid/instance metadata are
outside this repository in `output/castle-homes/local-server.json`.

## Evidence And Remaining Work

- Nineteen Node cases cover canonical subjects, fresh lookup/signature boundaries,
  provider-backed opaque subjects with controlled Graph data, queues, expiry,
  account changes, bounded devices, cancellation, withdrawal, response ordering,
  real PHP request/response bytes and two separate PHP workers.
- Fifty-nine SQL-derived identity cases pass on local SQLite and real VPS MySQL.
  The fixture adapter permits only SELECT-derived tables, not real pupil rows.
  Twenty-one protocol assertions pass, including replay, budgets and invalid
  requests never reaching the school resolver.
- A separate read-only VPS canary uses only the two explicitly authorized
  synthetic pupil accounts. Both canonical subjects match the actual database
  ids; their current school cohorts and ages match the fixture handoff. Default
  moderation is denied. No room, inventory or school record is created/updated.
  This does not test real parent/staff accounts or a new normal Microsoft login.
- Private VPS proof: `/opt/wvh-castle-homes/private/authority-preflight.json`.
  Local original-game proof: `output/castle-homes/game-contract.json` outside
  this repository. That earlier preflight changed no public endpoints, routes,
  existing services or maps. No live capacity claim follows from these checks.

Previous local regression run: 425 Node cases, 424 passed, zero failed, one existing
optional widget-browser skip. The context endpoint also passes PHP syntax
checking. The latest pinned private MySQL/context archive is
`48741f8abebc9e98ce799453f3d209b2a82fed4110326a941a26a162ba715592`.
Its replay/context checks use disposable private state; no public endpoint was
installed and no existing service was restarted.

## Isolated Linux Runtime Preflight

`tools/package-castle-homes-qa.cjs` packages only the scoped gateway/context code,
its QA client/router and the existing icon license. It does not package keys,
login states, game databases, a fictional login selector or colleague inventory.
A generated manifest pins 107 original game modules and bedroom assets against
the read-only release `/opt/wvh-sterne-kollegium/releases/20261109T191624Z`.
The installed dependencies are reused, not reinstalled or changed. This is not
yet a separately deployed production runtime/dependency image.

`tools/prepare-castle-homes-qa.cjs` reads the two designated accounts' successful
ordinary Microsoft browser states into a separate private transfer file; it
prints no credentials. The VPS verifier checks the real platform signature and
Microsoft Graph identity, without minting replacement platform tokens. No pupil
other than these two synthetic identities may reach this probe's school lookup.

`tools/check-castle-homes-runtime.py` verifies the pinned archive and source
manifest, then runs the actual room engine and PHP endpoint in one disposable
unprivileged systemd identity. Credentials use systemd's private credential mount;
PHP and gateway listen only on loopback. The PHP lookup URL is explicitly routed
inside the test to its local listener. The fixed public HTTPS endpoint is neither
installed nor tested by this preflight. The actual school SQL transaction remains
read-only; room edits occur only in the disposable fixture database.

Eight cases passed on 2026-11-10 with seven provider checks and twelve fresh
school lookups: unsigned context denial, real-session school entry, same-owner
inventory across devices, actual two-user WebSocket visits and younger-child
phrase protection, non-disconnecting renewal, closed SQLite backup integrity,
restore retaining owners/furniture but not grants/open visits, and dependency
failure revoking HTTP plus an already open socket. Restore uses a separate copy,
not a live database overwrite; it does not prove online production backup.

Pinned QA archive:
`f8876b6cbc8f999503db915eef1cbe9190598a6822a27181064a1482fe65c8e0`.
Private proof: `/opt/wvh-castle-homes/private/runtime-preflight.json`.
All existing Docker processes, the colleague service, protected configurations,
preview maps and all 107 reviewed original inputs remained unchanged. Temporary
credentials/input are removed even on failure; systemd removes its runtime tree.
That isolated preflight activated no public route, school database for rooms,
map action, media or moderation permission. It did not test native WorkAdventure,
public TLS/cookies, family/staff accounts, voluntary voice or production capacity.

## Published Two-Account Pilot

Release `54b79c1e4440db78` is a separate unprivileged systemd service listening
only on `127.0.0.1:3251`; Nginx publishes only `/castle-homes/`. Its exact private
allowlist contains the two already authorized synthetic pupils. It resolves the
fresh real school context before applying that allowlist. No fictional platform
issuer, role claim, email-derived replacement owner or colleague inventory is used.
Every other account, including staff, remains outside this pilot.

`service.cjs` validates the fixed origin/port/release, distinct context/bridge
keys, exact two canonical subjects and all 107 pinned original runtime files
before startup. The original game dependencies/code are reused at their fixed
read-only release, not copied from a local development database. This dependency
on the colleague release still needs a separate production-runtime lifecycle.
Private service credentials use systemd LoadCredential. The pilot database is in
a separate 0700 StateDirectory; restart restores no unattended gateway grants.

The new PHP wrapper and immutable PHP sources are outside the existing profile
endpoint. PHP code/config use the actual FPM pool group, not the different webroot
group. Only the nonce directory is FPM-writable. No school record or existing
site configuration is changed. Five Linux bootstrap cases pass. Installer failures
restore only the new namespace; no existing WorkAdventure service is restarted.

Seven genuine HTTPS acceptance cases pass without request interception: secure
scoped browser cookies, normal Microsoft sessions plus the signed public context,
same owner on separate devices, denied stolen views, real two-user WebSockets and
received fixed phrases, non-disconnecting renewal, host departure and an actual
46.5-second wait proving the 45-second HTTP/socket deadline. No injected clock is
used for that public deadline. Private receipt:
`/opt/wvh-castle-homes/private/pilot-deployment.json`.

Chrome 157 also passes the actual public interface with two separate ordinary
Microsoft states at 1000/390 pixels and a 320-pixel catalog. Real bitmap pixels,
private invitations, received phrases, account switching, stable ownership and
remaining-device isolation pass with no network interception. Only clipboard
writing is stubbed to preserve the user's clipboard. The initial empty-canvas
failure was a test readiness race: absence of the loading element counted as
hidden and the initial phrase "wird geladen" matched the old broad ready regex.
The test now waits for attachment, actual completed loading and rendered pixels.
This browser probe reuses normal login states; it is not a new Microsoft login UI
run and is not native WorkAdventure acceptance. Private evidence is in
`qa/homes-public-browser` beneath the authorized-test-account private folder.

The historical piano acceptance chain separately validates this addition: every
old service and map stays identical; the exact new Nginx block is appended to the
preserved original bytes. New release/context/unit/credential hashes are checked
without rewriting old manifests or calling old audio evidence a fresh test.

## Native Entry

`homes-entry.js` and the dedicated `upper-gallery.bundle.js` prepare automatic
entry from one disjoint native silent area in the upper gallery. The fixed owned
room URL gets no map API. Optional microphone/camera and invitation-code copying
are permitted only for this first-party panel; capture still requires explicit
separate device clicks. Departure/disposal closes only its
owned panel; late openings are closed, rapid reentry is serialized, manual closure
is respected and late initial positions cannot override newer movement.

Nine local cases cover these boundaries, prove the dedicated bundle retains
every original controller source and compare both generated map sources with
the untouched original gallery. Existing shared expansion/outdoor bundles,
artwork, furniture, exits and native table groups remain unchanged. `--homes`
builds only the dedicated gallery bundle; `build-castle-home-entry.cjs` adds
the two reviewed sources without editing the original Tiled gallery.

The earlier Chromium 151 candidate used browser response substitutions; the
opaque-origin candidate injection failed in Chrome 157 and is not acceptance.
On 11 November, the new public sources and a separately namespaced temporary
WAM passed in ordinary system Chrome 157 with two normal Microsoft test pupils.
No map/script/provider response was substituted. Real private microphones
decoded both ways, while native table/proximity audio was absent in the quiet
entry. The actual held microphone tracks ended when the owned panel closed;
native book-club speech decoded both before and after the visit. Desktop and
390px mobile canvases were nonblank, with unchanged microphone preference.
An anonymous browser was redirected to normal Microsoft authentication.
The owned temporary WAM was then removed, restoring the exact sixteen-map
inventory and unchanged service processes. Private proof:
`qa/homes-native-calls/result.private.json`.

The same probe subsequently passed against the actual new-preview gallery,
without request substitution or a service restart. Only `obergeschoss.wam`
changed its source URL to `obergeschoss-homes.tmj`; its voice areas and all
fifteen sibling maps remain byte-identical. The original wrapper and manifest
are backed up privately, and the historical audit validates this explicit
transition rather than overwriting earlier manifests. Optional private speech
decoded at RMS 0.1804 / 0.1656, with no native speech crossing into the visit.
Private proof: `qa/homes-native-preview/result.private.json`; root receipt:
`native-entry-deployment.json`. Only the existing two synthetic pupils and
sole approved administrator can use personal rooms. This does not broaden
school admission or replace the old castle.

Static publication adds six files only. GitHub's dynamic Pages job associated
the second build with its parent commit; this is recorded separately from the
published source commit. Acceptance additionally checks every public file's
exact bytes against its committed source, not just a successful job badge.
Three focused deployment cases reject missing media/boundary proof and test
atomic writes without replacing another operation's staging file.

The measured unoptimized room load transfers about 34 MB of approved static
artwork per fresh view. Native mobile first load exceeded the 30-second test
deadline once before a later candidate passed. This remains a release/performance
concern, not a 400-user approval; optimize delivery without changing visible
pixels and rerun cold desktop/mobile entry before broader activation.

## Sole Administrator Moderation

Release `ab1272f9dd94c61e` is live only in the isolated room pilot. The two approved
synthetic pupils retain their existing access; one separately approved canonical
staff subject is the entire moderator allowlist. Its current administrator role
is checked in the database on every protected operation. An ordinary teacher or
administrator role, token tag, browser setting or room configuration cannot grant
moderation. No school account role or other school record was written.

The selected administrator exception follows the portal's inactive default when
the emergency setting has never been saved. An active, malformed or duplicate
setting still denies access; database errors, inactive staff and ambiguous email
matches also fail closed. The earlier non-exception guards remain unchanged.
Seventy-four real SQL-derived fixtures cover the narrow exception and denials.

The protected view at `/castle-homes/#moderation` lists only submitted reports and
their already-delivered context, not a transcript of every private conversation.
It supports resolving a report, a 15-minute sender writing pause and a 15-minute
room-visit closure. Commands use the original report engine and fresh server
moderator checks. Sandbox-compatible confirmation dialogs require no additional
browser privileges. Untrusted notes are rendered as plain text.

An isolated Chrome 157 browser test creates three synthetic reports from messages
actually received by a second participant. Desktop/mobile layout, all commands,
the sender restriction, guest removal and permission withdrawal pass. It uses no
real pupil conversations or impersonated staff login. Both ordinary Microsoft
pupil states separately pass the real public moderation denial without request
interception. The selected real staff identity passes the signed public school
context canary; its first ordinary Microsoft browser login is not yet tested.

Deployment preserved the initial immutable release and receipt. Four changed
pilot files have private byte-exact rollback snapshots and a consistent SQLite
recovery copy. Only the room pilot restarted. Fourteen Linux gateway/service
cases, 74 SQL identity fixtures and 21 protocol fixtures pass. All seven genuine
public TLS/WebSocket/lease regression cases pass again. The historical castle
audit validates the explicit transition without rewriting any old manifest;
Nginx, all other services, school roles, maps and WAMs remain unchanged. Private
receipt: `/opt/wvh-castle-homes/private/moderation-deployment.json`.

A post-upgrade room-art browser check again exceeded the 30-second cold-load
deadline. Public API/moderation acceptance is not a claim that this broader
rendering/performance concern is solved; the 34 MB asset optimization remains open.
A later run rendered the desktop room in about 17 seconds, then exposed a test
toggle race on mobile: two unconditional clicks could close the asynchronously
opened conversation panel. The harness now waits for the actual room state and
opens the panel only when it is hidden; it does not alter the page's state.

The concurrent PHP nonce check initializes its shared store
before racing signed requests, rather than racing SQLite's first WAL conversion.
It still requires exactly one acceptance and one replay denial from two workers.

## Lossless Cached Media

Room pilot release `a07797165557cc82` serves the same 19 generic room images through
content-addressed URLs. The reviewed image/source hashes, dimensions and encoding
choices are in `media.manifest.json`; the service pins its exact manifest hash.
Original game code, images, saved rooms, inventories, ownership and school
permissions are unchanged. The only live configuration change is the pilot's
service executable path. Old releases, receipts, unit bytes and a consistent
SQLite recovery copy are retained privately.

Transparent furniture/avatar sheets stay PNG; four opaque room/floor images use
lossless WebP. A WebP-only candidate passed the server-side raw-pixel comparison
but failed Chrome's actual canvas comparison for transparent pixels and was
never published. The final mixed set passes both checks for all 19 images:
identical dimensions, every visible RGB value and every alpha value, including
the furniture hit-test alpha data. No resizing, palette quantization or visible
quality tradeoff was used. The build requires the pinned original image bytes
and leaves them untouched. Original encoded bytes: 34,169,550; final: 30,386,384,
an 11.1% reduction. Decoded image memory is not reduced by this encoding change.

Only these pre-reviewed generic images are publicly cacheable, under their exact
hash filenames with immutable caching and same-origin resource policy. No
personal render, layout, account, report or API response is cacheable. The
original image aliases remain behind the browser-bound room grant and redirect
without caching the grant. Expired/foreign views still fail closed. A hash URL
reveals only the same generic artwork after departure, never the former user's
room state. Unknown media names, queries, source files and traversal are denied.

The isolated Linux media/gateway/service suite passed 18 cases before publication.
All 19 real HTTPS image bodies and cache headers were then checked against their
pinned hashes, including 304 revalidation and absence of cookies. The seven
genuine two-pupil HTTPS/WebSocket/45-second-lease cases passed again. The historical
castle audit verifies the explicit unit-only transition without rewriting prior
receipts. Moderation, PHP, credentials, existing services, Nginx, maps and WAMs
remain unchanged. Private receipt: `media-deployment.json` in the pilot directory.

Normal Microsoft states were freshly obtained for both authorized synthetic
pupils. A real Chrome 157 observation, without request interception, measured cold
standalone entry at about 14.5 seconds for both; a second protected view in the
same browser took 5.3/5.9 seconds and reused all 19 images from disk cache. Warm
desktop/mobile canvases were genuinely nonblank. Earlier unoptimized observations
were 36.3/20.4 seconds. These are individual network observations, not a controlled
speedup factor or a latency guarantee. A separate full public UI run passed at
1000/390/320 pixels, including invitations, received phrases, account switching,
remaining-device isolation, rendering and no JavaScript/resource errors. Its
desktop/mobile first-ready timings were 28.9/20.1 seconds, demonstrating that cold
latency still varies. Both pupil accounts also remain excluded from moderation.

Latest full local regression: 444 cases, 443 passed, no failures, one existing
optional widget-browser skip, with test files isolated by `--test-concurrency=1`.
The 400-request admission burst remains internally simultaneous. A prior run
with competing test files hit the existing four-second queue deadline for some
synthetic requests; no production deadlines or admission rules were relaxed.

The later progressive-entry release below reduces the mandatory first-load set.
Broader activation still needs additional browser/device behavior and the
independent production-runtime lifecycle and native entry.
This is not private-room voice, broad school admission or approval for 400 users.

## Progressive Room Entry

Pilot release `c609afec40261d7c` loads the architecture, two avatar sheets and the
atlases used by the current saved room. A starter room needs four images, about
6,704,173 encoded bytes instead of the complete 30,386,384-byte catalog. Furnished
rooms and chosen floors load the additional images they actually use; four is
not a hardcoded limit or a promise for every possible room. Catalog thumbnails
load when visible, with deduplicated requests and an observer-free fallback.

Two original frontend modules are adapted only after their exact source hashes
match the reviewed original release. The rendering/material/geometry methods,
source images, purchases, inventory and authentication remain the original ones.
The three replacement module routes retain the same private browser binding;
they cannot replace an API or authentication route. Existing cached image hashes
are unchanged. Only the pilot's executable path changed on the server. No old
castle, other map, Nginx setting, PHP context, credential or moderator policy was
changed, and the colleague runtime remains byte-identical.

The initial scene waits for the latest authorized room, not the first provisional
snapshot. Furniture and floor changes wait for their real image/alpha data before
painting and pointer hit testing resume. Waiting stops the current movement
input; a failed image shows a retry instead of retrying every animation frame.
Late completions cannot reactivate a disposed room or paint a replaced catalog
canvas. The exact existing alpha extraction is retained.

The isolated Chrome 157 probe passes at 1000/390 pixels: four initial images,
all thirteen catalog atlases, actual opaque/transparent hit testing, original
purchase handlers, floor preview and pixel-exact cancellation after settled
frames, saved floor/furniture on a fresh device (six required images), a genuine
two-person visit and a received phrase. Synthetic points exist only in its new
temporary database and matching in-memory fixture; no live pupil points were
seeded. One separate image-failure episode intentionally aborts a single image
request, then verifies retry and saved-room recovery. Normal interaction checks
do not intercept network responses; the fault injection is labelled separately.

Twenty-eight isolated Linux service/gateway/media/progressive cases pass before
activation. All seven real TLS/context/WebSocket/45-second-lease regression cases
pass after it. The historical audit verifies this explicit unit-only transition
against unchanged earlier receipts, immutable sources and recovery copies.
Private receipt: `progressive-deployment.json` in the pilot directory.

Freshly obtained normal Microsoft states for the two authorized synthetic pupils
pass genuine public standalone entry. One observation measured first entry at
6.0/5.0 seconds and a new protected view at 3.9/3.4 seconds, with all four images
reused from disk cache, nonblank desktop/mobile canvases and no failed requests.
The separate full UI probe also passes invitations, received phrases, account
switching, remaining-device isolation and 1000/390/320-pixel layouts without
JavaScript/resource errors. Its recorded post-interaction first-ready figures
were 7.0/14.0 seconds; those also include UI actions and screenshots. These remain
individual observations, not a latency guarantee or a 400-user approval. Pupil
moderation denial still passes against the real public service.

A later local regression stalled in the pre-existing queued-request abort probe:
aborting before the request reached the test server could leave an unbounded
wait for a server-side close event. Only that verified test runner/worker was
stopped. The test now observes actual arrival before aborting and bounds its
lifecycle-event waits; the isolated six-case admission suite passes again,
including its internally simultaneous 400 synthetic requests. Production
admission deadlines, concurrency and role rules were not changed.
The final isolated-file full regression passes 453 cases: 452 passed, no
failures, one existing optional widget-browser skip. Its 400-request synthetic
burst still runs simultaneously and passes without provider/database simulation
being mislabelled as a real 400-pupil production approval.

Still required before school activation: publish the reviewed gateway with its
broader approved admission policy and complete the durable school-room operational lifecycle;
verify native school visits and invitation withdrawal/recovery;
provide correctly isolated, voluntary room voice without leaking into unrelated
WorkAdventure table chats; test the approved moderator's ordinary Microsoft
login; test normal Microsoft
school entry, logout/account switching, desktop/mobile rendering, focus,
reconnect/restart and backup/restore. Only then connect the preview castle's
residential entrance. Old castle/Village and colleague test data stay untouched.

## Independent Runtime And Recovery

The isolated pilot now runs service release `4846d94ddfe65cc2` against its own
immutable game tree `8a7b5a2e1bf03405`, not the colleague project's release.
The complete generic tree is pinned in `game.manifest.json`: 162 source files
(the original 107 plus 55 shared program modules), 4,706 installed dependency
files and 30 package versions checked against the original lockfile. No package
upgrade, school database, upload, identity or credential was copied. Licenses
remain in the copied packages. The two trees use different file inodes.

The service validates the exact 4,869-file inventory, including its manifest,
before importing the game. Missing/changed files, unexpected shadow modules,
symbolic links, writable directories and unsafe file ownership fail closed.
Configuration version 3 accepts only the fixed owned tree. The service namespace
also makes the complete colleague project inaccessible. The original source
descriptor remains provenance, not an executable fallback.

Thirty-one Linux service/gateway/media/progressive/runtime cases pass with that
old project hidden. The actual engine and native image codec also pass there
with two disposable synthetic participants, a shared visit and a received
phrase. Only the room pilot restarted. The unit changed its executable,
dependency path and isolation rule; private configuration changed only version
and source. All keys, pupil identifiers, moderator policy, PHP, Nginx, old maps,
WAMs and other services are preserved. Explicit private receipt:
`owned-runtime-deployment.json`; earlier receipts are retained unchanged.

All seven genuine public TLS/context/WebSocket/lease cases pass again with the
ordinary Microsoft test states. Chrome 157 passes public desktop/mobile entry,
320px catalog, invitations, messages, account switching and remaining-device
isolation, with no JavaScript or resource errors and no network interception.
The latest full local run reports 456 cases: 454 passed, zero failures or
cancellations, two skips (the optional widget browser and Linux-only filesystem
permissions on Windows). Linux separately exercises the latter. An earlier
combined run timed out in the synthetic 400-request transport fixture; both
the isolated fixture and the final complete run pass without changing production
limits or test deadlines. This is still not real 400-pupil approval.

Recovery was rehearsed, not merely archived. The generic 84,095,464-byte archive
was safely reconstructed into a temporary tree, all 4,869 regular files were
verified, and that recovered tree was bound read-only into an isolated engine
probe with the old project hidden. Two new synthetic participants visited and
exchanged a phrase. The private consistent SQLite snapshot was separately
restored offline, passed integrity checks and matched every SQL object and row;
it was never applied over live rooms. Temporary restored data was removed.
Private receipt: `owned-runtime-recovery.json`. This is not yet a complete
authenticated pupil session against a restored production database.

The software-only archive was also downloaded off-server and verified locally,
including every archived file. Archive SHA-256:
`a3b7e21e359445f6fb42dc692ffc1f90fb27b5bb0260101166730891fc27d0b5`.
Local verification: `tools/check-castle-homes-backup.py`. The temporary SFTP
export was removed; the root-only server archive remains. No school database or
key was exported. This one verified software copy is not a recurring backup
policy for pupil data or a complete VPS disaster-recovery rehearsal.

Private-room voice was still disabled at that milestone; the next section
records its later restricted activation. Broader pupil admission, genuine native
castle entry, ordinary administrator-login moderation and full operational/load
acceptance remain open. The existing castle is not replaced.

## Optional Room Conversations

Pilot release `dde4ccfa91500283` enables voluntary audio/video using the exact
owned game's existing proximity, visit, safety-report and LiveKit modules. Only
the already admitted two synthetic pupil accounts and sole approved administrator
can enter. No additional pupil, family, staff or global role was admitted.
At this deployment the private-room map entrance remained off; the later
Native Entry transition above activates only the new-preview gallery.

Every join is forced to the fixed bedroom group: the browser cannot claim a
village, nearby mode, owner, group id or room scope. The original authoritative
walker/socket and owner/visit epoch determine eligibility. A maximum of eight
visitors share a group regardless of furniture distance. Calls require their
own consent; joining does not capture either device. Microphone and camera have
separate icon buttons and both start off. Camera, screen, recording, data and
administration are not interchangeable rights: the existing SFU grants permit
only microphone/camera tracks, not screen/data publishing, room recording,
participant metadata changes or room administration.

The owned panel subclasses the original pinned panel without changing its
session/transport engine or original source files. It fixes the group mode,
uses labelled icons and compact 320px-safe controls, and retains mute, playback
permission, report and explicit leave actions. Missing/foreign views remain
closed. Browser policy permits same-origin microphone/camera only in this pilot
and continues to deny screen capture. This is an explicit media-permission
change, not a claim that every HTTP header remained unchanged. School access,
moderation capability, all existing keys/subjects, PHP, Nginx and maps remain
unchanged.

The SFU's administrative API is intentionally not publicly routed. A separate
loopback-only control service on port 13252 resolves only the fixed existing
SFU container and forwards only JSON ListRooms/DeleteRoom operations. Listing
filters out every foreign namespace; deletion accepts only exact generated
castle-room names. The SFU still checks the SDK-issued administrative JWT.
The relay has no signing key, arbitrary target, shell, recording/token endpoint
or public listener. Its root identity is needed only for the fixed container
address lookup; the room service retains its own unprivileged identity and gets
no Docker access. The unit is read-only/hardened, with empty capabilities,
128MB memory, 25% CPU, four active operations and 32 connections. The internal
control path stays on loopback/private container networking. Browser media
continues through the existing public TLS/WSS SFU endpoint.

The first real-media probe ran against a disposable loopback service through
pinned SSH forwarding in both directions, using fresh ordinary Microsoft test
states and the actual signed public school context. Its SQLite data and
temporary credentials were removed after acceptance. No real staff identity or
human microphone/camera was impersonated or captured. The subsequent public
probe used the real public HTTPS gateway directly, with no SSH or request
interception. Both real remote microphones decoded non-silent samples in Chrome
157, and an explicitly enabled fake camera decoded 320x180 video in the other
browser. Separate owner rooms did not hear one another. Changing rooms stopped
the old capture; owner closure stopped both capture and remote media. Real
received-contact reporting, pupil moderation denial and 1100/390/320 layouts pass.

The pinned SDK first probes `/rtc/v1/validate`; the current SFU returns 404 for
that protocol path. The SDK's explicit supported legacy-transport fallback then
connects successfully. Both browser proofs record the two compatibility 404s
separately, not as an assertion that every network response was 200. Actual
decoded media, no JavaScript errors and no unexpected resource failures are
required. No authentication rejection or embedding protection is bypassed.

Safety reports contain the pupil's description of an actually released recent
contact, not a conversation recording. Only the fresh sole-moderator capability
opens the report API or the new conversation-report tab. A synthetic moderator
browser fixture additionally verifies text-only hostile notes, 320px layout,
resolution, confirmation cancellation, conversation timeout without removing
room access, and clearing after capability withdrawal. It does not claim the
real administrator's ordinary login has been tested. Existing chat moderation
also passes its separate regression.

Thirty-seven Linux cases pass before activation. The seven genuine public
TLS/context/WebSocket/45-second-lease cases pass with fixed-group and pupil
moderation checks. Publication stays provisional until the real public browser
media proof arrives; otherwise the exact former unit/configuration is restored.
Only the existing room pilot restarted; its new scoped control service was
started separately. The historical audit checks both explicit transitions and
unchanged prior receipts. Private receipt: `calls-deployment.json`.
The complete local regression passes 462 cases: 460 passed, no failures or
cancellations, the same two documented skips. The control-relay and school-
withdrawal/epoch/failure cases use isolated simulated control responses, not
pretended real SFU load. The two real media probes are recorded separately.

The subsequent Control Renewal milestone below verifies live account/device
transfer and offline/reconnect. Still open: an active-call service-restart
episode; broader age/class admission; the approved administrator's actual login; genuine points
integration; complete data/key disaster recovery and fleet/load acceptance.
Two-participant media evidence is not an eight-person or 400-person load approval.
The post-test read-only observation found about 205MiB current / 230MiB peak for
the room process under its existing 256MiB limit, and 13MiB / 25MiB for the
control relay, with no automatic restarts. Room-process headroom must be sized
and retested before broad admission; these figures are not a capacity guarantee.
The one explicitly synthetic report submitted by this publication's approved
test pair was removed after a private consistent backup. Other reports and
school roles were not changed.

The native-entry follow-up passes 464 Node cases (462 passed, no failures,
the same two documented skips). All 57 Python operational cases, including
the three focused entry-deployment cases, also pass. Local Python uses an
isolated PyYAML 6.0.3 test directory; no global or server dependency changes.
Post-entry health shows about 209MiB current / 230MiB peak for the
room process, about 15MiB / 27MiB for the control relay and zero automatic
restarts. Broader admission still requires resource sizing and load tests.

## Control Renewal

Release `1b28495f0e9dfb1e` fixes a reproduced browser-side renewal blockage
without changing the pinned original game engine, school policy, nine-second
media lease or 45-second SFU grant. A real camera/device-transfer probe first
timed out, while its repeated run passed. The focused counterfactual then
reproduced the specific blockage in the exact pinned original session: pending
camera publication held the next control renewal behind it. This demonstrates
a real renewal defect; it does not prove that every earlier intermittent
transport failure had this single cause.

The owned room panel installs a small separate renewal path. Control requests
remain bounded to one per generation, but camera negotiation cannot prevent
the next fresh server decision. Old-generation completions cannot clear a newer
request or revive a stopped call. Denial, zero remaining lease and lost game
connection still stop actual tracks immediately. The original media session,
permissions, owner epochs, capture consent and SFU engine remain unchanged.
The new module is served only inside an authenticated, browser-bound private
view. Foreign views and query-based access are rejected. No extra public API,
media capability, role or admitted subject was added.

Two candidate runs substitute only the two owned browser modules; both pass.
They are explicitly not unmodified publication acceptance. The actual public
release then passes without response substitution in three separate Chrome
157 browser processes with the two normal Microsoft pupil-test accounts.
Normal Microsoft login was refreshed once before this test series; its genuine
states were reused, not replaced with fabricated school identities. The proof's
`normalLoginRepeated` refers to that pre-series refresh, not a sign-in inside
each probe. Only browser-provided fake microphones/cameras were captured.

All six episodes pass: actual offline network emulation, online reauthorization,
opening a second device without taking over, explicit call transfer, account
switch and logout. Ten remote microphone samples and ten actual 320x180 video
decodes cover both participants before and after reconnect/transfer. Old audio
and video tracks end, new devices start with capture off, and leaving the former
device does not end the current call. A switched account opens its own room and
cannot use the former protected view. No JavaScript errors or unexpected resource
failures occur. Known SDK compatibility 404s, retired-call rejection and deliberate
old-view denial are recorded separately. This is not a real staff-login or load test.

The first publication automatically reverted because it observed an SFTP proof
file after 16KB, before transfer completion. The actual media probe had passed;
publication was correctly refused. Its original script, full proof and explicit
rollback receipt remain private. The corrected handover uploads under a distinct
staging name, checks complete bytes, hash and proof, and only then atomically
exposes the ready file. Partial JSON, rejected proof and an existing target have
dedicated regression cases. A new public probe was performed after retry, not
reused from the rolled-back process.

The final acceptance is `control-renewal-deployment.json`; it preserves both
candidate proofs, the new public proof and a consistent private SQLite backup.
The historical audit follows the explicit rollback/process transition rather
than rewriting old manifests. Only the room pilot restarted. Its configuration,
the control relay, all other services, all maps and the old castle remain unchanged.
Forty-one Linux cases pass before activation. Wider admission, real points,
complete data/key recovery and full fleet/load acceptance remain open.

The fresh post-publication native castle probe also passes with two ordinary
Microsoft pupils: actual table speech before/after, private speech decoded in
both directions, a quiet entry, actual track termination and desktop/mobile
rendering. It grants no map API and substitutes no responses. Its separate
`control-renewal-native-acceptance.json` binds the proof to this release's
acceptance and unchanged service processes; the old gallery proof is retained.
The complete local regression passes 472 Node cases (470 passed, no failures,
the same two documented skips) and all 62 Python operational cases.
