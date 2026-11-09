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

`tools/package-castle-school.cjs` packages forty explicitly selected source,
fixture and thumbnail files, without private environment or dependencies.
This includes the inactive round-directory candidate described below; historical
install/update scripts must not be used to deploy that candidate.
The first installation checks exact source
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
link is changed. Native four-participant acceptance now verifies two isolated
audio groups decoding speech while two game panels are open, denied direct
launches from unknown accounts, real compact native-menu operation, reopening,
no duplicated panels, movement after departure and the three game entry routes.
The actual staff UI-only probe creates no additional WA participant. Native
test users are synthetic unknown accounts, not real pupils or authorized
student game participants. No external provider match was started by this test.
Reports and test tokens stay outside the public repository; live server audit
tokens are kept only in memory and the temporary UI-only staff credential is
removed after the test.

## Voluntary Round Directory Candidate

This candidate is **not live and not enabled in any map**. Existing school
catalog, chess, art, old castle, Village and protected teacher access remain
unchanged. `castleCommunity: true` is required before a new-map controller opens
the owned round UI or its first-party background membership bridge. Deployment
needs a separately reviewed, exact-file update of this service and native real
school-account acceptance before enabling the map flag. No Nginx change is
needed: all new endpoints use the existing service prefix.

`rounds.cjs` uses forty-nine real conversation areas from sixteen public preview
maps, generated by `tools/build-castle-rounds.cjs`. It does not publish private
passages or teacher areas. Talk, reading, owned story cards, chess and drawing
are offered only at their corresponding configured tables. Directory entries
are voluntary registrations, not measured map occupancy or proof that a game
is actually in progress. No fabricated visitors, participant names, age/class
fields, auth material or school policy is sent to another participant.

`GET round-context` returns freshly permitted targets, round announcements and
the caller's registration indicator. The exact POST bodies are:

- `round-create`: `targetId`, `kind`, `capacity`.
- `round-join`, `round-visit`, `round-close`: `roundId`.
- `round-heartbeat`, `round-leave`: `leaseId`.

Every endpoint verifies the existing token and reads a fresh school profile.
Basic owned activities allow eligible pupils and staff; primary, middle and
upper common rooms additionally require grades 1-4, 5-10 and 11-13 respectively.
The policy engine also supports exact class and age AND rules; the default
shared areas do not require a known birthday. Browser role/class overrides,
signed teacher tags, parents and unknown accounts confer no permission.
Only a freshly verified staff profile can close a round for its participants.
Lookup failure/revocation removes the caller's membership, never grants a stale
permission. Another member's revocation is observed on their next fresh request
or expiry, not through an invented instantaneous school-wide presence feed.

One account has at most one registration; one table has at most one announcement.
The 90-second account-bound lease rotates on explicit reentry, so an older panel
cannot remove the replacement. The private first-party bridge renews it every
20-23 seconds even after the directory closes. It makes no school request before
an explicit opt-in. A visit alone does not register the visitor; visiting another
table releases the previous registration. Leaving the area releases membership,
and losing the browser ultimately expires it. Announcements last at most two
hours; the first participant may leave without deleting other registrations.
The last departure removes the announcement. Service restart forgets directory
registrations but does not delete games, chess journals or drawing content.

Only tab-scoped session storage contains the opaque membership/journey handles.
The existing auth token is read in the owned same-origin pages and used only in
the authorization header, never in a map variable, URL or third-party frame.
Native travel requests contain only a short-lived nonce and a fixed map id in
private, nonpersistent player state. The controller uses normal departure
cleanup; the background bridge freshly reauthorizes before teleporting to an
existing safe approach point. It never claims a seat, changes a game selection,
claims a chess color or starts a foreign website automatically.

Local evidence: fifteen domain tests, eight real-HTTP tests and nine native
controller tests pass. `tools/check-castle-rounds.cjs` additionally runs the real
server, production round pages and native community module in three isolated
browser contexts at 320, 390 and 780 pixels. It checks two registrations, an
uncounted visitor, creator departure, retained background heartbeat, reentry,
cross-room cleanup, visiting a different round, last departure, delayed old
context across an account change and fresh loss of school permission. Thumbnails
render; no overflow, clipped buttons or JavaScript errors were observed.
The form is also checked expanded, collapsed and at a compact 469-pixel frame
height on mobile. The existing core suite passes 344 checks, with its optional
widget-browser check run separately and passing as well. An older chess-expiry
test was made deterministic by using its own frozen clock for token issuance;
no chess runtime behavior changed.
School profiles and movement are explicit fixtures: this is not live native
acceptance, an audio test or a capacity claim. No production portal data was
written. External provider room expiry/host confirmation is still separate work.
