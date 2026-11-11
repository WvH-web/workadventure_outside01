# Castle Capacity Checks

These are operator-only, synthetic checks. They do not replace school sign-in,
create pupil accounts, approve providers, edit maps or announce a school event.
The old castle and existing application containers/configuration are not test
targets. The separate Hall health repair is described in its own README.

## Verified Scope And Limits

The pinned [official LiveKit CLI](https://github.com/livekit/livekit-cli/tree/v2.19.2)
generates one audio publisher and up to 400 subscribers in one random, unlinked
`castle-capacity-<random>` room. This follows the
[LiveKit benchmarking approach](https://docs.livekit.io/transport/self-hosting/benchmark),
but each result must retain its actual generator location and resource limits.
Receiving RTP tracks/packets is not evidence of 400 native browser audio outputs.

Both release archives are SHA-256 checked; nothing is installed globally:

- Windows v2.19.2: `3a76873bd0a593d03b1305499ae0e468a242742eb3bfbfac737f27f1d00be139`.
- Linux v2.19.2: `a234a95b9cd54303330e59eaf32da953cbfd2b74dbdabd69acae7aa5ff377c8e`.

On the local Windows workstation the CLI now lives under the private managed
`D:\CodexScratch\WorkAdventure\output\castle-capacity\private\bin` directory.
Successful extraction retains a binary hash/version receipt and removes the
duplicate download ZIP. A repeated install verifies that receipt and reuses the
same executable without downloading another copy. New external-generator logs
use the managed D: output as well. The existing small credential handoff remains
at its original approved private location; no credential is relocated by this
storage change. The local initialization and cleanup rules are in
`AGENTS.md` and `ops/castle-school/README.md`.

The Windows generator requires 1.5 GiB free local RAM. Its private handoff is
read once and removed; keys go through the child environment, never command
arguments, a browser, a map variable or public Git. The server handoff is also
removed. Logs are redacted and stay in the operator's owner-only private folder.
Ordinary open applications are never closed to make a test pass.

The additional same-server generator runs as an unprivileged user in a uniquely
named transient systemd scope with no new privileges, at most one CPU, 1.5 GiB
memory, no memory swap and bounded tasks. Actual systemd limits are checked.
It needs at least 4 GiB available before starting, retains at least 2 GiB while
running and stops at 90 percent measured whole-host CPU. A same-server test
includes generator overhead and does not demonstrate external-client capacity.

Both methods stop if an existing media participant appears outside the test
room, if protected configuration/container identities change, or if service
health/resource limits fail. They connect at ten participants per second and
hold stages of 25/100/200/400 subscribers for 20/30/40/60 seconds. The parser
requires the exact number of distinct subscriber rows, one received audio track
each, positive bitrate, no reported errors and at most one percent packet loss
both per subscriber and in aggregate. A zero CLI exit code alone cannot pass.
Only the CLI's exact `-` empty-error placeholder is normalized to empty.

## Current Evidence, 2026-11-10

- An external Windows run reported 25/25 audio tracks and zero packet loss.
  Its original orchestration failure was a parser false negative on the CLI's
  empty-error dash. The original failed report remains archived privately.
- A subsequent external run stopped before media generation because the local
  machine did not have the required free RAM. It is not an external 400 test.
- With the initial 512 MiB generator cap, same-server stages 25 and 100 passed;
  the generator's own cgroup was OOM-killed during the 200 stage. The host stayed
  healthy. That is a generator limit, not proof of a school-server limit.
- After diagnosing that cgroup OOM, only the generator cap was raised to 1.5 GiB.
  Stages 25 and 100 passed again with all tracks received and zero packet loss.
  The 200 stage stopped at the unchanged whole-host CPU guard: 96.88 percent,
  196 connected synthetic participants, no other media participants and 3616 MiB
  available. It did not finish and is not a passed 196- or 200-person stage.
- In that last partial stage the generator scope's journal reported a 945.7 MiB
  memory peak and no swap. The trace does not separate all other host CPU
  contributors, so it must not be presented as isolated LiveKit CPU capacity.
- Every run removed its own room and handoff. All protected maps/configuration
  and existing application-container identities remained unchanged. Current
  service health checks passed afterward.

The complete castle remains **unapproved for 400 users**. Still required are
adequate external generation resources, a full target-size run, native avatar
and browser/media tests, actual school-authentication burst/renewal tests,
longer steady-state/recovery checks and appropriate video/TURN/network cases.
The sixteen-concurrent-lookup admission limits remain another item to measure;
they were not changed or proved sufficient by an audio-only test.

## Operation And Recovery

Do not run methods concurrently. Use the existing private SSH transport to
upload `ops.py` and `report.cjs` to their explicit `/tmp/wvh-castle-capacity-*`
locations. Read the current source before running an operator entry point.
`prepare.py` plus `run-media.cjs` is the external method; after its private
handoff, `observe.py` confirms resource and preservation evidence. The bounded
server method is `run-server-media.py` after the verified Linux installation.
It exports no credential handoff file. Both explicitly reject foreign rooms.

Per-run reports are retained by random test id. A latest-result file is only an
index, not proof that a process is running. Observe the actual tool handle,
process or exact owned systemd scope before deciding whether to wait, stop or
restart. Never start another run merely because observation timed out.

Cleanup checks the exact private room/prefix and refuses to delete unexpected
participants. External manual cleanup additionally requires the matching
small JSON room request, not a generic delete-all operation. Only owned
generator scopes are killed. An interrupted run must be resolved and its real
room/process state checked before a fresh prepare. Private before/after records,
failure logs and historical proofs must not be overwritten to claim success.

## Tests

`castle-capacity-report.test.cjs` checks missing/duplicate/partial recipients,
real errors, the CLI placeholder and per-recipient loss. The Python command
tests reject foreign scopes/rooms/identities, privileged uid/gid and unbounded
counts, and check hard resource caps. The Hall health-repair tests cover exact
configuration preservation, wrong targets and protected-service/file changes.
The existing onboarding override tests need the server's safe YAML parser; that
module was tested on the server rather than replacing its parser locally.
