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

The original accepted service candidate was `6973432bdfccee7c`; the bounded
admission update is **live as `da25574fd7da8512`** (see the final section). The separate
preview maps are enabled with runtime `20261109-rounds1`; published native
acceptance passed as described below. Existing school
catalog, chess, art, old castle, Village and protected teacher access remain
unchanged. `castleCommunity: true` is required before a new-map controller opens
the owned round UI or its first-party background membership bridge. Deployment
uses a separately reviewed, exact-file update of this service. The isolated native
acceptance described below passed before activation. No Nginx change is needed:
all new endpoints use the existing service prefix.

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

Local evidence: fifteen domain tests, eight real-HTTP tests and ten native
controller tests pass. `tools/check-castle-rounds.cjs` additionally runs the real
server, production round pages and native community module in three isolated
browser contexts at 320, 390 and 780 pixels. It checks two registrations, an
uncounted visitor, creator departure, retained background heartbeat, reentry,
cross-room cleanup, visiting a different round, last departure, delayed old
context across an account change and fresh loss of school permission. Thumbnails
render; no overflow, clipped buttons or JavaScript errors were observed.
The form is also checked expanded, collapsed and at a compact 469-pixel frame
height on mobile. The existing core suite passes 349 checks, with its optional
widget-browser check run separately and passing as well. An older chess-expiry
test was made deterministic by using its own frozen clock for token issuance;
no chess runtime behavior changed.
School profiles and movement are explicit fixtures: this is not live native
acceptance, an audio test or a capacity claim. No production portal data was
written. External provider room expiry/host confirmation is still separate work.

### Isolated Server And Native Acceptance

Release candidate `6973432bdfccee7c` passed a real loopback-only VPS preflight
using the two explicitly authorized synthetic school accounts after normal
Microsoft login. The candidate used the unchanged production identity verifier
and fresh school database lookup. Both pupils joined the same reading round;
creator departure retained the peer. Primary/middle grade restrictions were
checked with the actual grade-3 and grade-7 profiles. A stage-only override at
one library table additionally restricted its exact class to the first account;
discovery, direct visit, join and create denied the other class. This temporary
override never changed a live rule, map or database row. Every portal write
handler in staging was disabled. The existing seven-entry offer catalog was
also checked unchanged.

The subsequent native browser acceptance used actual WorkAdventure, its real
iframe API, microphone/voice transport and the two normal Microsoft sessions,
including a 390-pixel touch context. Only those test browsers received the
candidate map flag and local controller files; public maps were not enabled.
Both participants decoded non-silent native library-table audio, including
while the round directory was open. The first-party background bridge was
measured at one pixel. Real grade/class filtering, creator departure, explicit
reentry, renewal with the directory closed, cross-map travel to the atelier,
uncounted visits, releasing the prior registration, last physical departure,
free arrow-key movement and a nonblank native canvas passed without JavaScript
errors. This is scoped acceptance with two test pupils, not a 400-user load
approval, a provider-game session test or production publication.

Earlier attempts are not counted as passes. They exposed a pending-window
response race, a missing mobile Apps entry and a probe that incorrectly waited
for animation frames inside a hidden scripting iframe. Window generations now
reject a late open after same-room travel; a dedicated unit case covers it.
The Apps entry follows the existing activity pattern, shares one opener and is
removed on departure. Native probes poll hidden script state explicitly. No
map script gains school-token access or parent-document access from these fixes.

`tools/castle-rounds-ops.py` pins the old manifest and reviewed archive, permits
only the server change plus the twenty-five new round files, verifies all
previous file hashes, snapshots existing platform/service/map/config state and
starts one non-root, read-only, bounded container on loopback port 13212. It
does not update the production manifest or inherited historical Nginx hash.
Its cleanup requires the exact owned container id/release, validates the private
directory before stopping anything and removes only its two private stage
files. Five isolated cleanup tests pass. The native proof is retained privately
and the stage and temporary token handoff are removed after acceptance. No
production service restart, routing change, account change or portal data write
is part of this preflight. The scoped service publication is recorded in the
following section; published-preview acceptance remains a separate step.

### Scoped Service Publication

`tools/update-castle-rounds.py` revalidated the exact staged archive, forty source
hashes, successful private native proof and the entire preserved baseline before
replacing only `wvh-castle-school`. The previous container remains stopped under
its release-specific rollback name. The same existing Node runtime, private
environment, identity resolver, rules mount and dedicated healthcheck are used.
Six rollback/scope tests cover a failed replacement, failure before creation,
failure before rename, a foreign container, a wrong rollback id/read-write mount
and changes to any other service or protected file. No WorkAdventure restart,
Nginx update, authentication change or map replacement is part of this step.

The actual HTTPS post-update check passed with both normal Microsoft pupil
tokens. Both cohorts could join the shared library table, while cross-cohort
primary/middle round creation remained denied. In particular the private
class-only preflight override was absent in production. Creator departure,
account-bound renewal, pupil moderation denial, browser field rejection and the
unchanged seven-entry old offer catalog passed. Only the probe's own temporary
registrations were created and then removed; no portal links were written.
The historical Nginx manifest value was preserved and the actual unchanged hash
was recorded separately. The service is healthy. This alone is not the final
published-map acceptance or a capacity approval.

`castle/runtime.json` now separates the runtime revision from each room's
unchanged artwork/layout revision. All illustrated room builders use the same
small finalizer, and WAM source URLs include both revisions. Current controllers
also use one shared cache-busted room-module import. Four new checks cover all
sixteen runtime markers, unchanged voice geometry, idempotent managed-metadata
edits, preservation of room arguments, rejection of old/teacher/foreign maps
and scripts, and matching controller imports. No art, collision, seat, door or
native audio rectangle changed during activation preparation.

### Published Preview Acceptance

Pages run `42728397079` successfully published commit `351a542`. Twenty-nine
public map/runtime files were checked byte-for-byte against that exact Git
commit. The sixteen VPS wrappers were then guarded against their saved prior
versions: only each `mapUrl` cache revision could change. Every native voice
area, property, identifier, description and other WAM field remained identical.
All sixteen HTTP map-storage routes and native room lookups passed without a
WorkAdventure restart or changes to old maps.

The unmodified published pages passed a subsequent real native test with the
two normal Microsoft pupil sessions, one using mobile touch. Shared reading
registration, both-way decoded table audio, audio while the directory remained
open, real grade filtering, absence of the stage-only class override, creator
departure, explicit reentry, private background renewal, cross-map visiting,
release of the former registration, last physical departure, free movement and
a nonblank native canvas all passed. No map or API route was intercepted by
that acceptance. The synthetic microphone source is explicit test input, not
invented receiver audio. No JavaScript errors were observed.

All sixteen published rooms were also traversed sequentially with a normal
Microsoft test session. Each had exactly one membership bridge, the expected
runtime/seats/groups and a nonblank canvas. An idle, unregistered visitor made
zero round API requests across the sixteen rooms. The cinema endpoint was
stubbed in this room-smoke probe to avoid starting a film; this does not claim a
new film-synchronization test. Its first counter incorrectly counted the static
`round-client.js` file as a profile request; the corrected exact API matcher
passed. A separate same-account two-window probe explicitly accepted the normal
duplicate-session warning without disabling that warning. A transient private
probe value was not observed in the second connection during twelve seconds,
longer than the ten-second native travel-request freshness window, and was
removed afterwards. This is not a claim about all persisted player variables.

A repeated voice check initially sampled while the native call still displayed
Connecting. The current probe records transport/audio samples and requires
actual decoded energy in both receivers within a fixed 25-second ceiling;
otherwise it fails with private diagnostics. The successful final run observed
audio after 4067 ms of that sampling window. The slowest sequential room check
after the first entry was 8806 ms, including its validation/screenshot overhead.
These observations are not a 400-person capacity approval or a latency SLA.

Release-specific final audit: `/opt/wvh-castle-school/private/rounds-published-acceptance.json`.
All three detailed browser proofs remain private on the VPS. The previous
school container is retained; other service ids/start times, web configuration
and authentication files are unchanged. Temporary stage/container/token files
are removed. The final checker can revalidate the retained exact proofs without
re-uploading credentials. It is scoped to this release and must not be used to
silently redefine the baseline of future map or service changes.

The baseline audit separately found the existing hall audio container's inherited
client-port healthcheck reporting unhealthy while its actual `/castle-audio/health`
endpoint returned ready. It was not restarted or relabeled by this work. Its
healthcheck needs a later scoped correction, not a false claim that the hall
audio endpoint was down.

### Bounded Admission

The School API now verifies the existing WorkAdventure signature locally before
admitting a request to sixteen shared workers. Up to 512 requests can wait in
FIFO order for at most four seconds; one authenticated identifier can hold at
most four active/waiting places. Existing per-IP/per-identity rate limits remain
in force. The queue holds only process-salted opaque keys, never class or age
decisions. Expiry is checked again after waiting and after upstream work. Every
admitted decision still uses a fresh school profile, and normal opaque Microsoft
subjects still resolve through the same fixed Graph endpoint and its existing
short identity-only cache.

Queued disconnects/timeouts free their place immediately. An active request keeps
its worker until all its upstream work has settled, even after a disconnect or a
failed parallel catalog/profile request. This prevents canceled or failed work
from exceeding upstream concurrency. Bounded 503/429 responses include a retry
hint; none becomes a permission grant. Shutdown rejects queued work and drains
active requests. No profile cache, role override, provider bypass, room layout,
native audio setting or game integration is introduced.

Six gate cases and six real-HTTP cases cover FIFO/limits, cancellation, shutdown,
expired queued tokens and a class change while waiting. A controlled 400-request
burst passed on Windows and in an isolated, network-disabled Linux container
with the production Node image and 256 MiB/0.5 CPU limits. Each request performed
its own synthetic 50 ms Graph and 55 ms school read; observed maximum concurrency
was sixteen for each. These are synthetic dependencies, not 400 real Microsoft
logins, database users or audio participants. This is not a 400-person castle
capacity approval.

Windows loopback refused 168 of 400 simultaneous TCP connects against both a
bare echo server and the application, independently of backlog size or transport
library. Its application test therefore establishes 400 connections first and
then sends all 400 HTTP requests together, without a client request queue. Linux
also tests simultaneous fresh TCP connections. The transport distinction is
recorded explicitly in the evidence. Twelve earlier serial reads for the two
authorized synthetic pupils observed a 55.32 ms median and 311.18 ms maximum;
that small read-only timing sample is not a provider latency guarantee.

`tools/castle-admission-ops.py` pins both reviewed archives, preserves forty old
source hashes except the four explicit changes, and accepts the two added files.
The two already-live UI documents and their helper must match their independent
deployment receipt exactly. Its stage has no public route and disables portal
room-link writes. Fresh database/cohort canaries use only the two authorized test
pupils via signed synthetic legacy identities; they do not claim a new normal
Microsoft login. They create no registrations or portal writes.

Publication requires the exact accepted stage and unchanged protected baseline.
It clones the School container's immutable image, environment, health check and
restrictions, changing only its read-only release mount and release label. The
previous container and original deployment manifest are retained for rollback.
Seven scope/rollback tests reject foreign containers, unsafe mounts and unrelated
changes, including a lost container-create response. Private stage/publication
receipts are `admission-stage.json` and `admission-deployment.json` under the
School service's private directory. The piano acceptance checker follows this
explicit maintenance transition instead of rewriting older evidence.

Publication completed on 2026-11-10 at 21:34 UTC as `da25574fd7da8512`.
Only the School container was replaced; its health check and both read-only
HTTPS cohort canaries passed afterwards. The 21:35 UTC acceptance followed the
saved Hall-health and School-admission receipts, verified the preserved old
manifests, all protected files and preview wrappers, and confirmed that staging
was stopped. It revalidates retained native piano/voice evidence, not a new
post-maintenance multi-browser run. Locally, 398 Node cases passed and one
optional widget browser case was skipped; seven operator scope/rollback cases
also passed. The overall school-castle goal and full-capacity approval remain open.
