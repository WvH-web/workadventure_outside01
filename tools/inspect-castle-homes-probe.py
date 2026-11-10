"""Show only bounded credential-free QA diagnostics, never the private configuration."""
import json
from pathlib import Path
import re

private = Path('/opt/wvh-castle-homes/private')
codes = sorted(Path('/opt/wvh-castle-homes/staging').glob('*/tools/check-castle-homes-vps.cjs'))
log = private / 'runtime-probe.private.log'
lines = log.read_text().splitlines() if log.is_file() else []
safe = []
for line in lines:
    if line.startswith(('Home VPS probe stopped at ', 'HomeProbeDiagnostic ',
                        'Failed to start transient service unit:', 'Failed to find executable',
                        'Failed to connect to bus:', 'Unknown assignment:')):
        safe.append(line[:500])
print(json.dumps({'diagnostics': safe, 'logLines': len(lines),
                  'codePathModes': {str(p): oct(p.stat().st_mode & 0o777) for code in codes for p in [code, *code.parents] if p.exists()},
                  'missingModules': re.findall(r"Cannot find module '([A-Za-z0-9_./-]+)'", '\n'.join(lines)),
                  'errorCodes': re.findall(r"code: '([A-Z_]+)'", '\n'.join(lines)),
                  'systemdFailures': [line[:180] for line in lines if re.match(r'^(Failed at step|Failed to execute|Property .* not found|Unknown property)', line)],
                  'temporaryRuntimesRemoved': not list(Path('/run').glob('wvh-castle-homes-qa-*')),
                  'privateInputRemoved': not Path('/home/wilhelm/.cache/wvh-school-qa/homes-accounts.private.json').exists(),
                  'temporaryCredentialRemoved': not list(private.glob('qa-*.private.json'))}))
