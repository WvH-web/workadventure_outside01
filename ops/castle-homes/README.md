# Personal Rooms: School Authority

Status on 2026-11-10: authority, protected gateway and browser integration now
include a **published two-test-account pilot**, not general school-room access.
The signed context endpoint and separate persistent pilot database are installed.
No published map action, portal login/logout hook, private-room media or moderation
permission is activated. The colleague preview remains fictional and unchanged.
The full school-castle goal remains open.

An isolated VPS runtime preflight also passes with ordinary Microsoft sessions
from the two explicitly authorized synthetic pupil accounts and fresh real
read-only school context. This is loopback-only, not public or native room entry.

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

## Native Entry Candidate

`homes-entry.js` and the dedicated `upper-gallery.bundle.js` prepare automatic
entry from one disjoint native silent area in the upper gallery. The fixed owned
room URL gets no map-API or media permission. Departure/disposal closes only its
owned panel; late openings are closed, rapid reentry is serialized, manual closure
is respected and late initial positions cannot override newer movement.

Seven local cases cover these boundaries and prove the new dedicated bundle
retains every original controller source. Existing shared expansion/outdoor
bundles and all published maps remain unchanged. `--homes` builds only the new
gallery bundle. The native browser probe substitutes candidate map/controller
bytes only inside its two test browsers. This is not published map activation.
The actual two-user candidate now passes with the bundled Chromium 151:
automatic real first-party panels, nonblank desktop/mobile rooms, invitations
and received phrases, no native conversation in the quiet entry, unchanged
microphone preference, owned-panel closure and decoded native table speech both
before and after the visit. No school permission is overridden. Only candidate
map/controller responses are substituted; the room service, school context,
WebSockets and native audio are real public endpoints.

Candidate routing of the hidden opaque-origin script frame did not take effect
with system Chrome 157 in this harness; that failed injection is not counted as
native acceptance. Public standalone room UI does pass on Chrome 157. A final
unmodified Chrome 157 map entry remains required after publication. Candidate
proof: `qa/homes-native-candidate/result.json` in the authorized private folder.
No private-room voice is enabled and no candidate is yet connected to public maps.

The measured unoptimized room load transfers about 34 MB of approved static
artwork per fresh view. Native mobile first load exceeded the 30-second test
deadline once before a later candidate passed. This remains a release/performance
concern, not a 400-user approval; optimize delivery without changing visible
pixels and rerun cold desktop/mobile entry before broader activation.

Latest local regression: 437 Node cases, 436 passed, zero failed, one existing
optional widget-browser skip. A single named moderator request is being resolved
privately against fresh staff roles. No moderation permission was silently added.

Still required before school activation: publish the reviewed gateway with its
broader approved admission policy, independent immutable game release and durable
school-room operational lifecycle;
verify native school visits and invitation withdrawal/recovery;
provide correctly isolated, voluntary room voice without leaking into unrelated
WorkAdventure table chats; approve explicit moderation; test normal Microsoft
school entry, logout/account switching, desktop/mobile rendering, focus,
reconnect/restart and backup/restore. Only then connect the preview castle's
residential entrance. Old castle/Village and colleague test data stay untouched.
