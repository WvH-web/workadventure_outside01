# Hall Audio Gateway

Independent native-HTTP Node service, default port 3210, mounted at
`https://together.deine-schule.com/castle-audio/`. No WorkAdventure rebuild,
restart, map-script edit, LiveKit restart, or change to native table Spaces is
part of this component. Deployment and secret generation belong to the main task.

## Components

- `controller.cjs`: injected clock/media/code verifier; sessions, rate limits,
  exclusive claims, bounded microphone-permission phase, heartbeats, epochs.
- `auth.cjs`: HS256 WA JWT verification and salted scrypt code verification.
- `media.cjs`: LiveKit server adapter and least-privilege exact-room tokens.
- `server.cjs`: native HTTP, bounded JSON requests, static allowlist, safe errors.
- `public/`: same-origin widget and licensed local dependencies.
- `../../tests/hall-audio.test.cjs`: server, permission, and race tests.
- `../../tests/hall-widget.test.cjs`: optional mocked browser lifecycle tests.

Install/test only in this folder: `npm ci --ignore-scripts`, then `npm test`.
`npm run vendor` mechanically copies the pinned client UMD and Apache-2.0 license.
The copied Lucide bundle is the repository's existing 0.468.0 distribution, with
its ISC license. Application dependency versions are pinned in package/lock:
`livekit-server-sdk@2.15.3`, `jose@6.2.3`, `livekit-client@2.19.2`.
Node 24 supports loading jose's ESM through CommonJS `require`, including
`NODE_PATH=/usr/src/node_modules` in the existing play image.

## Private Configuration

Do not put the chosen code, WA JWT, or signing keys in Git, a map, a URL, public
variables, browser storage, or request logs. `.env`, `.env.*`, `node_modules/`,
and `*.private.json` are ignored. The widget only reads the pre-existing WA
`localStorage.authToken`; its other tokens and session ID stay in memory.

Required environment names:

| Name | Meaning |
| --- | --- |
| `SECRET_KEY` | Existing WA HS256 verification secret; private, not a public key |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Existing LiveKit server credentials |
| `LIVEKIT_HOST` | Browser URL: `wss://together.deine-schule.com` |
| `LIVEKIT_URL` | Internal API URL: `http://workadventure-livekit-1:7880` |
| `HALL_AUDIO_CODE_SALT` | Base64-encoded random salt, at least 16 decoded bytes |
| `HALL_AUDIO_CODE_HASH` | Hex of 64-byte scrypt output using that salt |
| `HALL_AUDIO_CONFIG_FILE` | Path to JSON with `map` and `podium`, unless supplied by env |

Code hashing parameters: Node `crypto.scrypt(code, decodedSalt, 64,
{ N: 16384, r: 8, p: 1, maxmem: 67108864 })`. No trim or case conversion.
Only salt and hash are supplied to this service; it does not generate or retain
the chosen plaintext code. The code is not role-limited by default.

Optional environment names:

| Name | Default / meaning |
| --- | --- |
| `PORT` | `3210` |
| `HALL_AUDIO_HOST` | `127.0.0.1`; use `0.0.0.0` inside the isolated container |
| `HALL_AUDIO_ORIGIN` | `https://together.deine-schule.com`, exact origin, no trailing slash |
| `HALL_AUDIO_ALLOWED_TAGS` | Empty; comma-separated server-signed tags if a role restriction is explicitly wanted |
| `HALL_AUDIO_TRUSTED_PROXY_IPS` | Empty; exact socket peer IPs trusted to supply nginx's overwritten `X-Real-IP` |
| `HALL_AUDIO_MAP_ID`, `HALL_AUDIO_MAP_URL`, `HALL_AUDIO_MAP_NAME` | Override corresponding JSON map fields |
| `HALL_AUDIO_PODIUM_BOUNDS` | JSON rectangle overriding `podium` |

Configuration shape, matching the current main-task generator (recheck if it changes):

```json
{
  "map": {
    "id": "https://together.deine-schule.com/~/castle-preview/grosse-halle.wam",
    "url": "https://wvh-web.github.io/workadventure_outside01/castle/grosse-halle.tmj",
    "name": "Grosse Halle"
  },
  "podium": { "x": 624, "y": 272, "width": 288, "height": 88 }
}
```

`WA.room.id` is the full canonical play URI: v1.34.5 `GameScene.ts` sends
`roomId: this.roomUrl`, and `Api/Iframe/room.ts` returns that string unchanged.
`GameScene` sets `this.roomUrl = _room.key`; `Connection/Room.ts:290` defines
`key` as the full URL with its search and hash removed. The separate internal
`Room.id` pathname field is not the scripting API's `WA.room.id`.
It is not the GitHub map URL or a relative `/_/global/...` path. The widget checks
this exact value after `WA.onInit()`. Both map and position checks are client-originated
and are explicitly not server proof that someone is inside WA or standing on a podium.

## Deployment Contract (Not Executed)

Use one separate gateway container/process with the existing
`wvh-workadventure-play:1.34.5-school-v3` image, Node 24.22.2,
`NODE_PATH=/usr/src/node_modules`, and command `node /usr/src/hall-audio/server.cjs`.
Mount this directory read-only at `/usr/src/hall-audio`, inject only the required
private environment, join `workadventure_default`, and publish
`127.0.0.1:3210:3210`. Do not mount the Docker socket or the full private WA config.
Run without extra capabilities and with a read-only root filesystem where possible.
The prebuilt image supplies dependencies; no install/build is needed at deployment.

The main task can add an nginx location to
`/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf`:

```nginx
location ^~ /castle-audio/ {
    proxy_pass http://127.0.0.1:3210;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_buffering off;
}
```

Preserve the prefix: no trailing slash on `proxy_pass`. No TLS changes or main
WA restart are needed. The selected proxy socket peer must match
`HALL_AUDIO_TRUSTED_PROXY_IPS`, otherwise all requests correctly share the proxy's
IP rate bucket. The gateway never trusts arbitrary forwarding headers.

Exactly one gateway instance may own the `castle-audio-[32 lowercase hex]`
namespace. Startup deletes orphan rooms matching only that strict namespace,
then starts a new random epoch. It never deletes native WA room names. Do not
horizontally scale without adding a shared atomic lease and epoch coordinator.
The port is bound before startup cleanup, preventing a second local instance
on the same port from retiring the active instance's rooms.

## Widget Contract

The main hall opens the absolute gateway URL with `allowApi: true`,
`allowPolicy: 'microphone; autoplay'`, bottom-right, initially 340x220.
The widget loads `/iframe_api.js` and self-identifies using
`WA.ui.website.getAll()` followed by `getById(id)`. It changes only its own
`size.width/height`: 340x84 idle, 340x220 on the podium or for errors.
No ID/token query parameter is needed. If lookup/resizing is unavailable, the
same transparent 340x220 widget remains usable. The main hall closes it on unload.

- Position queries every 500 ms, independent of stale movement notifications.
- Authenticated state polling every 2 seconds; control freshness at most 4.5 seconds.
- LiveKit connection work runs independently of control polling, including slow
  initial connections; it cannot hold the state-poll lock or timer setup.
- Idle widgets have no LiveKit connection. Listeners connect only when a speaker
  is arming or active and disconnect when no lease is present.
- Position freshness at most 3 seconds; a transient query error preserves the last
  valid position only within that deadline. Active heartbeat every second; active lease
  expires after 8 seconds without a successful heartbeat. Server expiry sweeps every 250 ms.
- Microphone permission phase lasts at most 30 seconds. Arming heartbeats renew
  the eight-second soft deadline but never its 30-second hard deadline; loss of
  heartbeats expires within eight seconds even during the permission prompt.
  Only successful microphone publication starts the active lease phase.
- Explicit password-form submit starts capture. Audience members never request
  microphone access. Stop/mute, track end, actual podium exit, control/position
  errors, revoke, and pagehide/unload stop the local microphone track immediately.
- Merely switching tabs does not stop listening or broadcasting. Polling continues
  in the background; genuine browser suspension/loss of freshness fails closed.
- Unload release uses authenticated `fetch(..., { keepalive: true })`; delivery is
  best effort, so server expiry is authoritative. No bearer tokens appear in URLs.
- A cross-tab auth-token change immediately stops microphone capture and detaches
  listener audio. The replacement token is verified by `GET state` against the
  existing opaque session. Only server-confirmed same-identity replacements clear
  the fatal auth state; account changes, invalid tokens and logout stay stopped.
  Successful renewal may resume listening, but never automatically captures a mic.
- No changes to WA microphone/camera state, native groups, or native media streams.
  The gateway has separate mic controls; WA's mute button is not a gateway mute button.
- Same-account speaker monitoring is suppressed across widget sessions. Publisher
  tokens cannot subscribe. The explicit autoplay-unlock button handles blocked audio.

## HTTP And Epoch Contract

All paths are under `/castle-audio/`. `GET config`, `GET health` and static
assets are public and contain no secrets. Other requests require
`Authorization: Bearer <WA JWT>`; all except `POST session` also require
`X-Hall-Session: <opaque session ID>`. POSTs are JSON; requests with query strings
are rejected. Responses use `Cache-Control: no-store`; there is no request logger.

- `POST session`: `{ "mapId": "full URI" }` -> `sessionId`.
- `GET state`: epoch, availability, signed display name, phase and own/same-account
  flags; never another user's identifier, session ID or tokens. No invented counts.
- `POST listen`: `{}` -> fresh exact-epoch subscribe-only token, opaque identity,
  URL and state; same-account speakers instead receive `suppressed: true`.
- `POST claim`: `{ "code": "...", "position": { "x": 0, "y": 0 } }` -> a
  microphone-only publisher token plus `leaseId`, or 409 for an occupied/reserved claim.
- `POST heartbeat`: `{ "leaseId": "...", "position": { "x": 0, "y": 0 }, "active": true }`.
- `POST release`: `{ "leaseId": "..." }`; an empty object cancels that session's
  in-flight claim. A stale lease ID cannot release a newer grant.

An atomic in-memory reservation precedes asynchronous scrypt and SDK calls.
Five code attempts per signed identity and fifteen per trusted IP are allowed
per minute. New sessions do not reset these buckets. No submitted email/name/ID
is used to establish identity.
Each verified identity is limited to eight live sessions and twenty session-creation
attempts per minute, using a limiter separate from the PIN-attempt buckets.
Expired sessions free slots; exhausting one account's quota does not block others.

Every claim, release, expiry and restart uses a fresh raw
`castle-audio-<128-bit random epoch>` room, outside the native `${world}.name`
and long-name SHA-256 room forms. Listeners receive 45-second `canPublish:false`,
`canSubscribe:true`, `canPublishData:false` tokens with no publish-source list.
Speakers receive microphone-only, no-subscribe/no-data/no-admin tokens.
Retirement revokes/removes the old speaker and deletes the old room. SDK
reconnection with cached tokens is disabled; reconnecting requires a fresh grant.
Listeners detach old audio before switching epochs, never fall back to an old
room, and detach when authenticated control state stops being fresh.

Self-hosted LiveKit does not revoke cached JWTs. A former speaker may recreate
the old room with an old token, but it is not the current audience's room.
Deleting/kicking or short token TTL alone is not the mitigation: current-epoch
isolation plus client fail-closed migration is. During control-message delay,
stale listeners have a bounded transition window; this is not instantaneous
cryptographic revocation of a self-hosted LiveKit token. Active connections can
outlive token expiry, which is why the lease and epoch watchdog are separate.

## Verification And Device Checks

Run `npm test` here. Browser harness: set `HALL_AUDIO_BROWSER_TEST=1` and
`HALL_AUDIO_PLAYWRIGHT` to the installed Playwright module directory, then run
the same command. Its fake WA/LiveKit transport exercises layout, resize,
mic cancellation, background visibility, stale state and unload; it does not
claim real RTP/microphone integration. Screenshots, if produced, stay in ignored `.qa/`.

Before live release, verify actual `WA.room.id`, current generator bounds,
browser microphone permissions/autoplay, background-tab behavior on supported
devices, speaker shutdown while navigating, microphone-only enforcement against
direct SDK publishing, and two table groups hearing the speaker independently.
Do not print or record the chosen code or real bearer tokens during those checks.

On 2026-11-08 the native WAM preview passed a four-profile live test using a
generated audio fixture: both table conversations carried non-silent decoded
audio, separate rooms remained isolated at the boundary, the podium reached both
groups, leaving stopped publishing, and an audience token could not publish.
Ordinary proximity audio resumed outside meeting areas. Real microphones,
interactive Microsoft sign-in and a 400-user load test were not part of this run.

Same-origin widget code has normal access to the WA origin's storage. Treat all
gateway HTML/JS and dependencies as trusted; the service's HS256 verification
secret also permits signing if the service is compromised. WA login JWTs remain
valid until their own expiry; this is not an OpenID introspection/revocation service.
