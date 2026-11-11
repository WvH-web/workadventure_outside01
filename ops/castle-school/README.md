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

### Repeated Admission Measurement

On 2026-11-11 the latest parallel local suite had one admission-load failure:
286 successful requests and 114 bounded overload responses. That result remains
recorded; earlier isolated passes do not invalidate it. A local CPU profile of
a subsequent isolated pass spent about 1.76 seconds in Node's TCP connect path.
This is a transport-cost observation, not proof of a Windows-only cause.

`tools/measure-castle-admission-capacity.py` then ran three fixed repetitions of
the original strict 400-request test on the VPS. All three returned 400 HTTP
200 responses, with maximum Graph and profile concurrency of sixteen and no
remaining active work. Reported test elapsed times were 7716, 6685 and 5695 ms;
whole-container execution took 9.742, 8.338 and 7.090 seconds respectively.
The original four-second queue deadline and success assertion were not relaxed.
Linux used simultaneous fresh TCP connections, not preconnected sockets.

Each disposable container used the production's exact Node image (v24.22.2),
0.5 CPU and 256 MiB, with no network, credentials, production environment or
real provider/database traffic. Both upstream reads were synthetic. The live
release, services, permissions and maps were unchanged, and every measurement
container was removed. The result is retained privately at
`/opt/wvh-castle-school/private/admission-measure-20261111-attempt-2/result.json`.
The earlier harness attempt failed to read its fixture because of directory
permissions and is retained separately; it is not counted as an admission pass
or failure. The source preflight also reviewed an exact archived-test difference
limited to a later disconnect test and executed the retained original bytes.

The JSONL reporter emits only synthetic counters and bounded failure metadata,
not raw stderr or assertion values. Two reporter cases and three operator cases
cover this evidence gate, finite distinct attempt names and archived-source
validation. This is an admission component measurement, not approval for 400
real Microsoft logins, database users, castle participants or media streams.

### Round Recovery Candidate

The following records the original **not yet published** recovery candidate for the
private membership bridge. It retains only an existing opaque lease/journey
after a transient confirmation error. It retries only heartbeat/visit checks,
with bounded exponential backoff, jitter and the server's `Retry-After` hint,
and only until the last confirmed deadline. It never replays create, join,
leave or link writes and never uses a cached permission or destination to move
the player. Fresh successful heartbeat responses now update the local recovery
deadline without rotating the lease. The server remains authoritative.

An authentication denial, revoked/stale registration, expiry, account switch,
page departure or failed leave does not trigger recovery. A school-profile
lookup failure still revokes the server membership immediately; a later 409
clears the retained client handle instead of creating a replacement. Invalid
or expired journeys are discarded, and delayed old responses cannot erase a
newer lease. Request timeouts normalize browser `AbortError` numeric codes to
the transient error category without retrying the original request itself.

Eleven focused cases exercise the actual client and presence source. The
isolated three-pupil browser fixture also passes at 780/390/320 widths, including
one explicitly intercepted pre-admission 503 followed by a real server renewal
of the same lease. Normal departure, reentry nonce rotation, fresh cohort
revocation and account-switch checks remain in that fixture. This is not native
live acceptance of the candidate: no service, static route or published client
has been changed for it. A separately guarded publication and real native probe
are still required before describing this recovery as live.

The full local regression was rerun serially (`--test-concurrency=1`) after
these changes: 502 cases, 500 passes, two existing skips and no failures. Its
unchanged 400-request test also passed, reporting 4838 ms and sixteen maximum
workers. Serial test-file execution isolates that component from other local
test workloads; it does not negate the earlier parallel-suite failure or prove
real school/media capacity. The full live deployment audit passed again at
07:48 UTC, including the sole-administrator moderation policy and the accepted
museum transition; it does not include the unpublished recovery candidate.
All 74 Python operator cases also pass. The first discovery attempt could not
import the unchanged onboarding test because local PyYAML was absent; rerunning
with PyYAML 6.0.3 in an output-only test dependency directory passed the whole
suite without changing the system Python or server environment.

### Native Recovery Preflight And Reverted Publication

The two-normal-Microsoft-account native candidate passed on 2026-11-11, with
one mobile participant, real bidirectional decoded table audio before and after
an explicitly injected pre-admission 503, the same retained lease, fresh real
server renewal, normal grade filtering, creator departure, reentry and cross-map
cleanup. Only the two reviewed JavaScript responses were substituted in those
test browsers; maps and school decisions were not replaced. That candidate is
not published acceptance.

`tools/castle-round-recovery-ops.py` prepares two exact static JavaScript routes
with the existing no-store/frame/content/media policy. It does not restart any
service, reset registrations, modify maps, change school rules or rewrite the
School release. Nine operator tests cover exact file hashes and route scope,
native evidence, unchanged services/keys/maps, historical audit projection,
failed-publication rollback, refusal to overwrite a foreign web change, refusal
to roll back an accepted release, and bounded readiness of known old modules.
The full Python operator suite passed 83 cases; 34 focused Node round cases pass.

The first static publication failed an immediate assertion and restored the
exact previous routing. Its original helper, auditor and failure receipt are
retained, not relabeled as successful. Improved diagnostics in the second
attempt observed one response containing the exact old module before the new
route became ready. Only that known old-module response may wait, for at most
20 seconds; unexpected bytes, headers, status codes or permissions fail closed.
The second static publication passed as provisional release `8d43adfc183ce631`.

Its first published native probe did **not** pass: the test waited only 15
seconds for an injected fault despite the normal 20-23 second heartbeat period.
The candidate's artificial storage event could race the preceding heartbeat's
completion. The corrected probe waits for the next natural heartbeat for up to
30 seconds; its separate 12-second recovery limit is unchanged. The failed
published probe remains in its original private output directory. Numbered
attempt directories now prevent an explicit retry from overwriting that result.

Before rerunning, local drive C: reached zero free bytes. A failed patch write
truncated the native test file; it was restored from the committed base plus
this turn's changes and passed syntax checking. The pending server routes were
then explicitly rolled back. The full live audit passed at 08:22:29 UTC with
`roundRecoveryBrowserModulesVerified: false`; all prior castle functionality,
roles, maps and service processes remain unchanged. At that checkpoint there was
**no accepted recovery deployment**. The provisional stage and explicit rollback receipts
remain private at `round-recovery-stage.json` and `round-recovery-rollback.json`;
`round-recovery-deployment.json` does not exist. Do not rerun the current deploy
or accept commands blindly: a new publication plan must account for that
retained rollback and stage history.

The recovery probe now refuses to start browsers below 1 GiB of local free
space, before touching prior results. It correctly refused the attempted retry.
At least 2 GiB should be freed before further browser work. Only this project's
reinstallable local load-test CLI cache was removed to recover writing space:
the duplicate 41,868,548-byte download was first checked against its extracted
executable; the 104,142,336-byte executable was later removed after verifying
that no CLI process was active. `tools/castle-capacity/install-cli.cjs` reinstalls
it from the pinned official release. No school data, source artwork, map,
credential, acceptance proof or server file was deleted for this local cleanup.

The following read-only capacity recheck still found only about 14 MiB free.
Eleven old temporary Playwright profiles total 113,215,853 logical bytes; no
Chrome process referenced any of their exact paths at inspection time. The
installed Playwright browser/tool cache totals 735,299,135 logical bytes and
may be needed by other projects. None was deleted. Together they are still less
than the requested 2 GiB, and logical sizes are not guaranteed reclaimable disk
allocation. Existing artwork, release archives and acceptance proofs remain
protected from opportunistic cleanup. A user decision/free-space change is
still needed before further browser work.

The native recovery probe's disk gate now runs before loading Playwright, Sharp
or the cinema helper; an unused room-builder import was removed. One additional
VM test exercises zero space, 1 KiB and just below the 1 GiB limit and proves
that no browser dependency is loaded and no result/audio write is attempted.
This focused test passes; it is not a rerun of the blocked live acceptance.

### Managed Local Storage On D

The user authorized D: for project scratch work. On 2026-11-11 the private
`D:\CodexScratch\WorkAdventure` root was initialized with inheritance disabled
and exactly three access grants: the current user, SYSTEM and Administrators.
Its machine-local marker records the currently configured bundled Node module
directory; source no longer hard-codes a removed runtime version. The repository
and existing credential locations were not relocated. Canonical source artwork
and required backups remain available. The later, explicitly reviewed migration
of two legacy QA directories is recorded below; their original paths still work.

`castle-local-storage.cjs` directs new Playwright profiles and child-process
temporary files to uniquely marked D: runs before loading browser dependencies.
Project npm/pip/browser download caches are process-scoped on D:, not global
Windows settings. The native round/cinema evidence, capacity CLI/results and
the two round/admission packagers also use D:. Packaging intermediates live
only in the temporary run, not as another retained source copy.

At normal process exit an owned run is removed only after its exact resolved
boundary, ownership marker, absence of links and absence of active browser/tool
processes are verified. A failed safety query retains the directory. Later runs
can sweep stopped, marked runs older than 24 hours; unknown and active folders
are skipped. Output/evidence directories are never part of that sweep.

Use `node tools/run-castle-local.cjs <Node arguments>` for other local tests, or
`--exec <program> <arguments>` for tools such as Python. This gives child
processes the same D: temporary environment and cleans only the parent-owned
run after the child has ended. If a runtime update changes bundled dependencies,
rerun `initialize-castle-local-storage.ps1` with the current configured directory.
The initialized root must exist; unavailable D: is not a reason to fill C:.

Six new filesystem cases pass, including traversal, junctions, foreign markers,
live owners, active browser paths, recent runs and retained evidence. A real
Chrome check with independent desktop/mobile contexts confirmed actual profiles
on D:, refusal to remove an active browser and successful removal after closure.
Its screenshots and proof remain at `output/local-storage-check` on D:.
The serial complete Node run passed 507 of 509 cases with two existing optional
skips and zero failures; all 83 Python operator cases also pass through the new
temporary environment. Both packagers wrote their artifacts on D:, the official
CLI install passed, and a second invocation reused its verified cached binary.
The temporary root was empty after these completed checks.

The separate guarded legacy-profile cleanup removed eight old, inactive C:
test profiles totaling 105,263,079 logical bytes. Recent profiles, active paths,
linked content and installed/shared browser caches were not removed. Its
per-action report is on D:. No school account data or server configuration was
changed, and this local storage acceptance is not the still-open native
publication acceptance of round recovery. Project work rules now preserve this
storage/cleanup policy in `AGENTS.md`.

### Reviewed Legacy Cleanup

Two inactive legacy visual-QA directories were transferred to the private
`output/legacy-output` on D: after complete SHA-256/file-list/empty-directory
comparison. Their C: paths are now junctions to the verified D: copies. The
retired C: data was removed only after another comparison; no second backup was
created. Sources modified within 24 hours, links, active-database extensions,
credential-like filenames and existing/foreign destinations are refused.
Four additional cases cover migration, traversal, conflicting destinations,
changed data and correct hardlink allocation. An idempotent recheck preserved
the original migration receipt rather than replacing it with a no-op result.

Measured allocated file data removed from C:, not sums of logical/hardlinked
file sizes:

- `schulschloss-20261107`: 373 retained files, 372,711,424 allocated bytes moved.
- `teacher-lounge-20261107`: 60 retained files, 42,090,496 allocated bytes moved.
- Three completed upload ZIPs: 91,856,896 allocated bytes removed. Each archive
  matched its private accepted VPS receipt, and every retained release file was
  freshly hash-verified read-only before the local duplicate was unlinked.
- Total measured allocated file data removed from C: 506,658,816 bytes, about
  483.19 MiB. Directory metadata is not included. Concurrent work can change the
  overall drive free-space delta, so that delta is recorded but not attributed
  wholly to these operations. File identity and link counts prevent credit for
  storage still retained through another hardlink.

Allocation is measured from the filesystem's
[`fs.Stats.blocks`](https://nodejs.org/api/fs.html#statsblocks), device/inode
identity and link counts, not from summed apparent file lengths.

The nonmatching `wvh-castle-homes-calls.zip` was kept; it was not assumed safe to
delete. The required off-server `8a7b5a2e1bf03405.tar.gz` runtime backup remains
untouched. No pupil data, active database, credential, map, server service or
other project's cache was altered. The previously removed eight inactive
browser profiles had 105,263,079 logical bytes; that is **not** added to the
allocated-data total because their allocation was not measured before deletion.

Private receipts are under `output/legacy-migrations`,
`output/completed-upload-cleanup` and `output/legacy-profile-cleanup` on D:.
The final serial Node regression passed 511 of 513 cases, with two existing
optional skips and no failures. The 83 Python operator checks also pass. This
cleanup does not publish a new map or service release.

### Accepted Native Recovery Publication

The corrected native preflight and the subsequent published probe both passed
on 2026-11-11. Each used two independently signed-in, approved Microsoft school
test accounts, including a mobile participant. The probe waits until a previous
heartbeat has actually updated the confirmed lease before injecting one 503
into the next natural heartbeat. The fault-observation window is 30 seconds;
the separate 12-second recovery bound was not relaxed. The same membership is
renewed by the real server, without extending a cached deadline or replaying
create/join. Real decoded native table audio increases in both directions
before and after the fault. Grade filtering, creator departure, explicit
reentry and cross-map cleanup also pass.

The fresh candidate substituted only the two exact JavaScript modules inside
the test browsers. The published probe substituted neither modules, maps nor
school decisions. Both browsers fetched the accepted module hashes directly
from the public preview routes. Its retained result is
`D:\CodexScratch\WorkAdventure\output\rounds-native-recovery-published-attempt-2\result.json`.
No real pupil data or test credentials are published with these sources.

Before republishing, `rearm-castle-round-recovery.py` preserved the previous
provisional stage, explicit rollback, original candidate, pinned operator/audit
sources and a sanitized fact describing the failed 15-second probe. The
root-private `round-recovery-history-1.json` binds that exact restored history;
the original failure evidence is not overwritten or relabeled. Three new
operator cases cover rearming, refusal of unrolled-back state and refusal of
tampered history. The full Python operator suite passed 86 cases.

Release `8d43adfc183ce631`, packaged from source commit `322d456`, is now accepted
in `round-recovery-deployment.json` with `provisional: false`. The full live audit
passed at 16:32:03 UTC with `roundRecoveryBrowserModulesVerified: true`.
The separate read-only homes health check confirms healthy enabled services,
zero automatic restarts and preserved existing maps/services. Publication
changed only the two static module routes, without a service restart, reset of
registrations, map replacement, school-policy change or relaxed media headers.
Earlier receipts remain intact and are checked as history before the actual
current baseline is verified. Already-open browser realms keep their loaded
module until ordinary reentry/reload; existing sessions were not forcibly closed.

After acceptance, the complete serial Node regression passed 511 of 513 cases
with the same two optional skips and no failures; all 86 Python operator cases
passed again. The D: temporary root was empty after both test runners ended.
Distinct private logs remain next to the publication package on D:; accepted
and failed browser evidence is retained, not treated as disposable scratch.

This accepts bounded recovery of voluntary round registrations, not the full
castle or a 400-person real Microsoft/media workload. External game-host link
lifecycle, broad room admission and other remaining scope are still open.

### Explicit External Game Hosts: Preflight Only

The new source implements an explicit, membership-bound game-host confirmation
for an ordinary conversation round. It references the existing central offer,
revision and exact displayed target, never a second link database. Departure,
expiry, explicit ending, same-account reentry or a central link save require a
new confirmation. Other conversation members remain registered and are not
automatically declared a successor host. Launch checks the actual membership,
fresh school profile, current offer rule and exact current URL/revision. Public
round summaries contain no external target, other member lease or identity;
restricted games expose neither a title nor resource id. Missing catalogs do
not extend game-host permission or stop an otherwise valid conversation.

Eighteen added state/HTTP tests and the isolated two-browser fixture pass,
including delayed older catalog replies, 980/390/320-pixel views, the existing
PIN updater, a changed link, explicit successor, expiry and account switching.
The old game-page browser suite also passes, including wrong PIN, provider/path
restriction, dirty input preservation and permission loss. External provider
responses are synthetic in these tests; no real game session is claimed.
Source checkpoints are `43c6be3` and navigation correction `debe1cd`.

The candidate school archive is
`3119b0c32934a5f18d810571810dfdd2adf8e03594f677d6eaa20552f1cf2736`.
The pinned, network-disabled Linux run passes 33 tests on the actual unchanged
`v24.22.2` service image with 0.5 CPU/256 MiB, no real school keys, and no
school/provider access. Its container is removed. The full existing-platform
audit passes before and after, last at 17:11:03 UTC on 2026-11-11, with accepted
round recovery still verified. Root-private receipt:
`game-host-linux-3119b0c32934a5f1-attempt-1.json`. Four operator cases cover
archive/descriptor integrity, traversal/symlinks and refusal to overwrite
retained candidate bytes. Including the separate current-navigation check below,
the full local Python suite passes 91 cases.

The source archive, descriptor and separate tests now live under the managed
D: output; `package-castle-school.cjs` no longer creates a C: upload archive.
Both packagers require committed scoped source, record the source commit and
exact file hashes, and keep intermediate test copies only in owned temporary
storage. The first candidate's separate Linux result remains retained rather
than being relabeled as the later navigation correction.

This feature is **not published**. The user explicitly allowed a brief restart
of only the school/round service on 2026-11-11, acknowledging voluntary round
registration reset. That permission has not yet been used. Before publication:

1. Run a native two-account preflight with decoded table audio before/during/
   after the game panel, both directions of same-panel navigation, departure,
   fresh permissions, normal movement and desktop/mobile canvas evidence.
   Normal school authorization must not be replaced. If a synthetic approved
   game catalog is needed in an isolated loopback stage, record that override
   explicitly; it is not a real provider/student approval.
2. Preserve the current accepted recovery and admission receipts. Do not rerun
   the old one-shot admission updater: its pinned prior container is historical.
   A reviewed new service transition must verify exact source changes, retain
   the old container/manifest, preserve the static recovery routes and all
   other processes/configuration/maps, and extend the full audit accordingly.
   `/rounds` is independently aliased to the earlier accepted HTML, so replacing
   the service alone does not publish the navigation change. Only that exact
   HTML alias needs a reviewed immutable target update, preserving its existing
   headers/method guards and both other old UI aliases. Historical UI hashes
   and the earlier one-shot updater must remain unchanged. Their Python test
   verifies the pinned Git snapshot; a separate case permits only the reviewed
   current navigation replacement.
3. Publish only after the preflight, then verify actual published routes,
   rejected pupil access to all seven still-draft offers, fresh permissions and
   native conversations. Roll back the scoped service if these gates fail.

No provider rule, pupil publication, map, secret, media policy or actual live
service has been changed by this preflight. A WorkAdventure host confirmation
is a voluntary declaration, not proof that a cross-origin provider room exists;
a host remaining in WorkAdventure must explicitly end it after closing only
the external game. Details: `docs/schulschloss-gastgeber.md`.

### Restricted Native Host Preflight Accepted

Candidate `3119b0c32934a5f1` passed the actual native two-account preflight.
Both approved accounts signed in normally through Microsoft again. The
loopback-only stage additionally restricts real school lookup to exactly those
two accounts; it does not replace their actual profiles or authentication.
Its synthetic provider catalog/updater is explicitly marked on every response,
not exposed publicly or copied to production. No maps were substituted.

The actual WorkAdventure sidebar tests creation/join, mobile touch, both panel
navigation directions without nonce rotation, two genuinely loaded synthetic
targets, automatic link-change invalidation, normal physical departure,
explicit successor and last-departure cleanup. Four samples show increasing
inbound bytes and decoded audio energy in both actual native participants.
Movement and nonblank desktop/mobile canvases also pass. The synthetic provider
iframe receives no Authorization header or map API. This does not certify a
real external game, provider age approval or 400-person capacity.

Failures are retained in separate D: timestamped runs. The probe now waits for
membership before checking closure, resets only the isolated fixture and
handles expected route cancellation without logging request headers. Source
assertions and unexpected routing errors cannot be excused as navigation.
The running tunnel and stage were actually closed, the temporary identifier
environment removed, and the full unchanged-platform audit passed again at
17:37:32 UTC. Root-private receipt
`game-host-native-acceptance-3119b0c32934a5f1.json` binds the exact original stage,
teardown, browser evidence and pinned probe source. It remains `published: false`.
The brief restart permission has still not been used.

Before publication, also avoid doubling the games page's periodic requests:
its own round status should travel with existing fresh link/context responses,
not require an additional recurring school/profile lookup. The resulting
candidate needs fresh regression and native evidence before replacing the
accepted candidate as the publication input. Earlier evidence stays historical.

### Bundled Status Candidate

The games page no longer polls `round-context` alongside its existing periodic
link resolution. `context`, `launch` and the guarded group launch include only
the caller's own round snapshot using the same fresh profile and catalog.
`RoundBoard.own` never creates or renews a membership; active membership still
requires its real token expiry and cohort permission. Nonmembers get null,
including legacy isolated verifier fixtures without a round-capable expiry.
Parent/unverified profiles cannot borrow another role's membership.

The UI rejects older timestamps and prior local mutation generations; an old
in-flight response cannot erase a newer host confirmation. A response from a
legacy backend without the field clears the display claim instead of retaining
cached host permission. Malformed snapshots are not adopted. Eight added
HTTP/state/frontend cases cover these boundaries and the one-lookup budget.
The actual isolated two-browser fixture observes regular link refreshes but
zero additional periodic round-directory requests, including after host/link
changes. The existing game UI suite also passes across desktop/390/320 widths.

Retain all three new local load outcomes: the first serial complete suite
failed its unchanged 400-request round-directory case (259 successful), the
isolated repeat passed all 400 in 5380 ms, and the next complete repeat passed
all 400 in 12509 ms. After the four final display cases were added, the final
complete suite passed 540 of 542 cases, with two existing optional skips and
zero failures; its load case passed all 400 in 6707 ms. Windows transport was
preconnected in these measurements; no real Microsoft/provider/database load
was generated. This variability remains a capacity qualification, not a reason
to loosen admission limits or claim a 400-person school/media approval.
All 97 Python operator checks also pass.

This candidate is not published or covered by the earlier native receipt for
`3119b0c32934a5f1`. Package its committed source and the expanded five-file test
bundle on D:, run its own Linux/native preflight, and preserve the earlier
candidate/receipts when preparing the narrowly scoped service/HTML transition.
