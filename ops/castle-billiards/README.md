# School Castle Billiards

An isolated GPL-3.0 billiards integration, not a modification of the existing
school portal, WorkAdventure client, old castle or chess service. The accepted
physical table is now active only in the protected new-castle game hall.

## Source and Runtime

- Actual physics and EightBall rules from
  [tailuge/billiards](https://github.com/tailuge/billiards/tree/fda4e90e251ce59ad878dbb996af372f4028a325).
  The 44 used upstream modules are retained byte-for-byte in `vendor/tailuge`,
  alongside their original license and notices. Only four rendering/network
  event boundaries are replaced by data-only headless signals.
- Local Three.js 0.187.0, verified against official npm integrity; no provider
  lobby, chat, public opponents, score upload, ads, remote rendering or CDN.
- One authoritative server computes each shot in two bounded worker threads.
  Clients send angle, power and spin, never final ball positions or outcomes.
  All players and spectators receive the same server-generated trajectory.
- Three tables, two places each, spectators read-only. Explicit rejoin,
  turn enforcement, legal cue-ball placement, concession, mutual rematch and
  staff-only reset. A rematch swaps places. No built-in chess or event changes.
- Rules are the pinned upstream variant, not a claim of tournament compliance:
  an open-table first-contact eight foul loses; an early eight with assigned
  group balls remaining is respotted; a legally potted final eight wins.
- Atomic bounded journal stores only canonical positions and rules state.
  Restarts restore the balls, never account owners, leases or occupied places.

## Protection and Limits

The production entry point requires the actual signed school session and a fresh
school-profile lookup for every API request. Token tags or client-supplied class,
age and staff claims do not grant access. Only active pupils and staff qualify.
An additional private policy is read afresh from a read-only directory mount:
`/srv/billiards-policy/admission.json`. Pilot mode admits only named, verified
school identities; it does not grant a school role. Invalid policies fail closed.
Account identifiers and profiles do not appear in table snapshots or the journal.

The shell is same-origin embeddable, with microphone/camera disabled. Conversation
remains WorkAdventure's responsibility. There is no billiards public chat.
Leases last 45 seconds, with 15-second fresh-school renewal and 120-second explicit
rejoin reservations. Worker queue, computation time, input size, SSE buffers,
sessions and request rates are bounded. These limits are not a 400-person approval.

Run with Node 24 and the existing reviewed school `jose` dependency via NODE_PATH.
Required private environment: SECRET_KEY, CASTLE_SCHOOL_LOOKUP_KEY,
CASTLE_BILLIARDS_DATA_DIR=/srv/billiards-data,
CASTLE_BILLIARDS_POLICY_DIR=/srv/billiards-policy and an explicit trusted proxy
list. Bind the service only to host loopback; expose only `/castle-billiards/`
through the existing verified HTTPS origin. Never store real keys or pilot
account names in source, static assets, query strings or release archives.

## Reproduce and Verify

Use `tools/review-castle-billiards-source.cjs`, then
`tools/prepare-castle-billiards-core.cjs --install`. Downloads and intermediate
builds stay in the managed D: storage. The manifest pins source, compiler,
dependency integrity and every installed vendor byte. esbuild's static-block
lowering is enabled explicitly; physics/rules are not patched to work around
compiler initialization order.

Local model/worker, room, admission and HTTP tests use isolated fixture identities.
The Playwright probe uses real HTTP/SSE and real Three.js across separate browser
contexts, without substituted network responses. It covers both players actually
shooting, shared trajectories, spectators, touch/spin, rejoin, rematch, revocation,
320/390/1440/2400-pixel framing and explicit WebGL loss/restoration. All screenshots
and private evidence stay on D:. A Linux smoke executes real worker jobs without
accounts or any external network. Neither fixture test substitutes for normal
Microsoft school logins, native castle conversation tests or capacity acceptance.

During local verification, an existing 400-request synthetic identity test timed
out when run alongside four software-rendered WebGL contexts. The unchanged full
suite subsequently passed serially. Its 15-second limit was not raised, and no
test was skipped to hide the failed concurrent run.

The normal published table passed two real Microsoft school test accounts with
no substituted network responses: shared sit choice, automatic late-sitter panel,
the same authoritative shot, spectator bench, rejoin, separate chess conversation,
last-standing reset, native movement, desktop/touch and 144 x 44 seat controls.
Three actual bidirectional native voice measurements passed. Only this new-castle
wrapper and its manifest entry changed, plus the private additional admission
policy from pilot to school; every request still requires a fresh active pupil
or staff profile. No service restarted. See `docs/schulschloss-billard.md` for
immutable evidence and the retained failed attempts. Larger load and restore
drills remain open; this is not whole-castle or 400-person acceptance. The previous
castle remains unchanged.
