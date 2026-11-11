# Local Storage

- On this Windows workstation use `D:\CodexScratch\WorkAdventure` for large QA
  outputs, browser profiles, downloads and disposable build/test copies. Do not
  silently fall back to C: when D: is unavailable.
- Use `tools/castle-local-storage.cjs` for new local QA output directories and
  temporary environments. Initialize its private root with
  `tools/initialize-castle-local-storage.ps1` and the current configured bundled
  Node dependency directory. Machine-specific paths stay in the D: marker,
  not in source-controlled hard-coded runtime versions.
- Keep credentials and existing private handoffs at their approved locations.
  Do not move the repository, original artwork, rollback archives or acceptance
  proofs as an incidental cleanup. New evidence can use the private D: output.
- Close every owned browser/process and clean its disposable temporary run.
  Stale cleanup must verify the ownership marker, exact absolute boundaries,
  absence of links and absence of active processes. Never delete another chat's
  active browser profile or an unknown directory.
- The two explicitly reviewed legacy QA directories in `output` now have C:
  junctions to their hash-verified D: copies. Keep these working paths and their
  migration receipts. Never treat the retained D: evidence as disposable temp.
- Delete duplicate download archives after verified extraction; retain the
  executable's integrity receipt. Keep failed/accepted test evidence distinct.
- Commit and push scoped changes. The old castle and unrelated maps remain
  untouched; do not publish secret routes or credentials.
