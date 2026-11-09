# School Context And Decisions

The separate game gate connects portal-managed rules and existing room links to
fresh school context. Only the new castle preview uses it. Old maps, public
museum content and teacher-room access are unchanged. No student game has been
approved automatically by this installation.

## Trust Boundary

The independent Node process serves `/castle-school/` on the existing
WorkAdventure origin. It uses the existing pinned `jose` verifier and the active
WorkAdventure verification material unchanged. A valid HS256 signature,
expiration and identifier are required. Signed role tags, outfit, display name,
client age and client class are never authority for a school permission.

Each recognized email lookup is a fresh server-to-server POST to the exact
canonical school endpoint. The separate 256-bit lookup key is generated on the
server and never sent to the browser. The endpoint reads prepared SELECTs in a
single database transaction. No profile cache, pupil update, DDL, account change
or request logger is involved. Unknown non-email identifiers do not query the
school database.

`profile.php` checks the existing active primary staff roles 1 and 3, active
guardians, unique active student email, one active school year containing today,
and a unique current active class. Enrollment start and end dates are inclusive.
The school date is Europe/Berlin, not the operator's or browser's timezone.
Multiple different classes, conflicting parent/student emails and duplicate
student emails fail closed. Parents never inherit a child's birthday or class.
Missing/invalid birthdays do not produce an estimated age. Fictional character
ages are unrelated to this mechanism.

The PHP-to-Node profile contains only the required internal decision inputs.
Browser responses contain account category and per-resource decisions, never
email, name, pupil id, birthday, age, grade level or class id. The internal PHP
endpoint does not accept browser WA tokens instead of its separate lookup key.
It is outside any browser CORS grant. Its code/configuration live outside the
website document root; no database credentials are mounted into the Node process.

## HTTP Contract

- `GET health`: public `{ "ready": true }`; process readiness, not a load claim.
- `GET context`: verified account category, configured resource decisions and
  check timestamp. `Authorization: Bearer <existing WA token>` is required.
- `POST decision`: JSON with only `resourceId`. It performs another fresh school
  lookup. Additional age, class, role or identity fields are rejected.
- `POST launch`: only `resourceId`; freshly checks school profile, private portal
  catalog, dates, reviewed origin/path and provider floor, then returns the
  current target only if permitted. A context response is never a capability.
- `POST room-link`: only `resourceId`, `targetUrl`, `pin`; repeats authorization,
  validates the proposed reviewed provider/path and uses the existing public
  controller's PIN authority. No WA JWT or private key is forwarded to it.
- `GET games`, `games.js`, `games.css`: owned same-origin UI. Media capture is
  disabled, only the existing token header is used, and API access for the map
  script is not needed. No token transport through a query, iframe message or
  public map variable. Third-party games never receive the school token.

Query strings, wrong methods, cross-origin browser requests, expired/invalid
tokens, unknown resource identifiers and oversized/malformed bodies are rejected.
All responses are `no-store`. Upstream errors or responses older than ten seconds
return 503, not a stale successful decision. Retry information is bounded.
Current limits are sixteen concurrent upstream lookups, ninety requests per
verified identity/minute and six thousand per trusted client IP/minute. Those
are protection limits, not a capacity demonstration. Rate counters contain
process-salted opaque identifiers, are swept every second after their one-minute
window and are cleared when the server closes. No clear email/IP counter keys.

## Portal Rules And Current Links

`policy.cjs` validates every field and combines minimum/maximum age, grade list
and exact class list with AND. Null means no constraint; empty lists are rejected
instead of accidentally becoming unrestricted. Staff are included only when the
rule explicitly names them. An unpublished rule can permit an explicitly enabled
staff preview, but never a student/parent participant.

`offers.cjs` strictly validates the versioned seven-entry portal DTO, including
real dates and reviewed origin/path. All age/grade/class constraints remain AND
conditions. Dates use Europe/Berlin. A draft, expired approval or changed
provider can only produce an explicitly configured staff preview; an absent
target never does. Known Gartic Phone minimum-age constraints cannot be lowered
through a class approval. Provider terms and required school permissions still
need a real administrative review before publication.

`catalog.cjs` uses the exact private HTTPS portal endpoint with its separate
lookup key, an empty-object body, no account data, no cookies, no redirect
following, bounded size/time and concurrent calls. Context metadata alone may
share a one-second cache; every target resolution, join and moderator action
reads fresh configuration. Upstream failure never falls back to a cached launch.
Profile lookups are never cached. The original mounted rules file remains only
for the retained older rollback release and is not runtime authority now.

The seven rule slots start unpublished. The current live catalog has five real
targets and two missing targets, not seven active game rooms. Existing CMS URLs
are joined, not copied into a second settings table. Staff previews are not
proof of provider availability or school/child approval.

## User Interface And Limits

The game shelf and Hall game action use the owned page; the old castle-preview
HTML shelf redirects there instead of publishing another direct-link list.
Selected room targets refresh every five to six seconds, metadata every fifteen
seconds while visible. Join and copy obtain another fresh server authorization.
Successful edits force a new resolution instead of reusing an older pending
response. Dirty host input is preserved during other participants' changes.
Only the explicit user join action opens a game; changing targets never
automatically reloads an existing external game. Tabs have no opener, embedded
games are sandboxed and receive no microphone/camera access from this document.

Token changes abort pending work and clear owned links/frames. Losing school
permission closes the owned embedded game; it cannot revoke an already-known
public Internet address or control an external tab. The old CMS and provider
sites remain independently reachable. This is castle-entry authorization, not
a global restriction on third-party websites or a game presence service.

Future own-content, invitation and personal-room visit endpoints must enforce
the same school authority themselves. Generic offer ids must not become a list
of individual pupil rooms. Student approvals and parental-consent requirements
must not be inferred from outfits, age estimates or unpublished defaults.

## Publication And Tests

`tools/package-castle-school.cjs` packages fourteen explicit source/test files, without
private environment or dependencies. The first installation checks exact source
and routing hashes, PHP syntax, SELECT-only PDO fixtures and non-root Node module
loading before changing its new paths. It appends one isolated proxy location,
tests Nginx and gracefully reloads it; it waits for the new route because old
workers may briefly return 404. Existing WorkAdventure, map storage and hall
audio containers must keep their original ids/start times.

Only the new Node service binds loopback port 3211. It runs as uid/gid 1000 with a
read-only filesystem, no added capabilities or Docker socket, 256 MiB/0.5 CPU
limits and bounded logs. The private lookup/configuration are owned by the
existing website PHP user. The static-gallery manifest's expected Nginx hash is
advanced after preserving its exact route, headers and file hashes. No global
login material or application settings are rotated.

The historical `tools/update-castle-school.py` permits only the earlier counter
change and must not be used for this release. `tools/update-castle-games.py`
allows exactly the reviewed server change and five new catalog/UI files. It
preflights a candidate on an isolated loopback port with real read-only API
checks before replacing only the permission container. PHP, private lookup
configuration, Nginx, gallery and existing platform/audio containers retain
their hashes/ids/start times. The previous service stays available for rollback;
an older stopped instance is verified against its original private release
manifest before retaining it under a separate name. No credentials are rotated.
The service now has its own HTTP health command instead of inheriting the
unrelated WorkAdventure image health command.

Current evidence: eighteen base Node checks, twenty new catalog/start checks,
thirty-six synthetic school-profile PDO/MySQL fixtures, fifty-nine isolated
portal-policy fixtures and a live read-only staff/unknown-account API audit.
The school-profile fixtures use derived
SELECT tables, not real pupil rows or temporary production tables. Live checks
use an operator-supplied authorized staff identity privately and create no WA
participant. Four parallel unknown identities are correctly denied even with
signed teacher tags. No real pupil account was used for this stage. This is not
native real-student acceptance or a 400-person load test. The synthetic browser
probe checks two waiting participants, immediate/automatic link refresh,
wrong PIN, late responses, dirty input, changing accounts, opening the latest
target, embedded layout and server-side permission loss. No production room
link is changed. Native multi-participant acceptance of this new wiring is
still pending. Reports and test tokens stay outside the public repository;
live server audit tokens are kept only in memory.
