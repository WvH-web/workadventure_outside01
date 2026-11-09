# School Context And Decisions

This is the server-side foundation for castle content permissions, not the
completed map/portal integration. The current maps, public museum endpoints,
existing games and teacher-room access are unchanged. No student game has been
approved by this installation.

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

Query strings, wrong methods, cross-origin browser requests, expired/invalid
tokens, unknown resource identifiers and oversized/malformed bodies are rejected.
All responses are `no-store`. Upstream errors or responses older than ten seconds
return 503, not a stale successful decision. Retry information is bounded.
Current limits are sixteen concurrent upstream lookups, ninety requests per
verified identity/minute and six thousand per trusted client IP/minute. Those
are protection limits, not a capacity demonstration. Rate counters contain
process-salted opaque identifiers, are swept every second after their one-minute
window and are cleared when the server closes. No clear email/IP counter keys.

## Rules Are Bootstrap Data

`policy.cjs` validates every field and combines minimum/maximum age, grade list
and exact class list with AND. Null means no constraint; empty lists are rejected
instead of accidentally becoming unrestricted. Staff are included only when the
rule explicitly names them. An unpublished rule can permit an explicitly enabled
staff preview, but never a student/parent participant.

The seven existing game-board identifiers are registered as **unpublished**.
Their current URLs are not changed or copied into a new configuration. An allowed
staff preview decision is not proof that a board is configured, that its game is
online or that its provider has approved school/child use.

The initial private rules file is loaded at process startup. It is not a live
administration API: replacing a file mounted individually will not update an
already running bind mount. Do not present manual JSON edits as the requested
portal integration. The next stage must provide authoritative portal-managed
rules, fresh configuration reads, school/provider review and URL-origin binding
before student publication.

## Integration Still Required

These JSON decisions are **not bearer capabilities** and the existing map pages
do not consume them yet. A hidden button or browser-supplied `allowed=true` is
not protection. Every protected launch, own-content request, invitation and room
visit must be authorized at its actual serving endpoint. Generic offer ids must
not become a public list of individual pupil rooms.

Next work: portal approval form and storage, reviewed provider/origin constraints,
server-authorized launches using the existing current board URLs, and owned
same-origin WorkAdventure pages. The existing GH-origin map script cannot read
the WA token; tokens must not be placed in URLs or public variables as a workaround.
Public external websites and the old public CMS remain independently reachable.
This API has not retroactively restricted them or the existing castle.

## Publication And Tests

`tools/package-castle-school.cjs` packages nine explicit source/test files, without
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

`tools/update-castle-school.py` currently permits only the specifically reviewed
Node counter change. It preserves the PHP lookup, private rules, routing and all
other services and retains the previous stopped container for rollback. Further
updates need their own reviewed changed-file set; do not bypass its refusal.

Current evidence: eighteen Node checks, thirty-six synthetic PDO/MySQL fixtures,
and a live read-only staff/unknown-account API audit. The fixtures use derived
SELECT tables, not real pupil rows or temporary production tables. Live checks
use an operator-supplied authorized staff identity privately and create no WA
participant. Four parallel unknown identities are correctly denied even with
signed teacher tags. No real pupil account was used for this stage. This is not
the native student UI acceptance, a completed content gate, or a 400-person load
test. Reports and test tokens stay outside the public repository; live audit
tokens are kept only in memory.
