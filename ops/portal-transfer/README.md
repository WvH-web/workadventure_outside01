# Portal Transfer Preflight

This is a credential-free diagnostic, not a deployment and not a TLS bypass.
The existing saved transfer site uses an IP address that does not match the
hosting certificate. Its client also lacks the complete GoDaddy R1 cross chain.
No portal notice code, database schema or school roles have been published by
this diagnostic. The confirmed hosting FTP server hostname is still required.

`node tools/build-castle-portal-trust.cjs` downloads only the two fixed public
certificates from [GoDaddy's official repository](https://ssl-ccp.godaddy.com/repository/).
Their DER SHA-256 values are checked against the published repository values.
The cross-signed R1 certificate must verify through G2, an existing Node/Mozilla
trust root. The new self-signed R1 certificate is not installed or trusted.
All three certificates are CA certificates with checked validity and signatures.
Changing an authority requires review; this tool will not silently repin it.

`node tools/check-castle-portal-tls.cjs <confirmed-hostname>` makes only an
explicit FTP TLS handshake to the existing hosting endpoint. It uses a private,
application-only CA bundle, strict hostname/SAN verification, server purpose,
TLS 1.2 minimum, a 20-second limit and no FTP USER/PASS commands. It does not
read saved credentials or change the Windows trust store. The default school
hostname is only a diagnostic; it is not a claimed provider FTP hostname.

The 2026-11-11 read-only probe verifies the repaired certificate chain but
correctly rejects the school hostname. No fingerprint from that failed probe
is accepted as an authenticated pin. A matching hostname with a successful,
strict authenticated handshake is required before transfer setup can proceed.
No wildcard certificate acceptance, plain FTP fallback or browser exception is
provided. The saved WinSCP session and existing transfer wrapper are unchanged.

The public leaf in `tests/fixtures/portal-ftps-public-leaf.pem` was extracted from
the rejected handshake. It contains no key, login or pupil data. Its wildcard is
used only in offline unit tests to exercise name checking and simulated process
results. `offline-fixture.shr.prod.iad2.secureserver.net` is not a discovered or
confirmed hosting endpoint. Tests use a fixed time within the fixture's validity;
real preflight always checks the current time.

Generated local diagnostics live outside the repository under
`output/castle-offers/private/verified-tls/`. The three `trust/*.pem` files are
public authority material, not private credentials. Run focused tests with
`node --test tests/castle-portal-trust.test.cjs`.
