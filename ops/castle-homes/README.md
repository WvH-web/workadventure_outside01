# Personal Rooms: School Authority

Status on 2026-11-10: implemented and checked authority foundation, **not a
published room service**. No map action, public context endpoint, room database,
portal login/logout hook or live game was activated or changed. The separate
colleague preview remains fictional. The full school-castle goal remains open.

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

The future fixed endpoint is
`https://www.deine-schule.com/workadventure-castle-homes.php`; **it is not installed**.
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

Deployment must create a new private context key, FPM-owned nonce store and
configuration outside the webroot. Do not reuse or rotate the current platform
login key or School API lookup key. The wrapper may only call
`castleHomesContextEndpoint()` with that fixed private configuration.

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

No public gateway is implemented by the authority module alone. Its `ticket` and
introspection response are internal server values, not browser launch payloads.

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
  this repository. Public endpoints, routes, existing services and maps remain
  unchanged. No live game capacity claim follows from these checks.

Final local regression run: 418 Node cases, 417 passed, zero failed, one existing
optional widget-browser skip. The context endpoint also passes PHP syntax
checking. The latest pinned private MySQL/context archive is
`48741f8abebc9e98ce799453f3d209b2a82fed4110326a941a26a162ba715592`.
Its replay/context checks use disposable private state; no public endpoint was
installed and no existing service was restarted.

Still required before activation: finish the protected browser/gateway and its
cookie/socket binding; select the separately owned game's reviewed release and
durable school database; verify actual private visits and code revocation;
provide correctly isolated, voluntary room voice without leaking into unrelated
WorkAdventure table chats; approve explicit moderation; test normal Microsoft
school entry, logout/account switching, desktop/mobile rendering, focus,
reconnect/restart and backup/restore. Only then connect the preview castle's
residential entrance. Old castle/Village and colleague test data stay untouched.
