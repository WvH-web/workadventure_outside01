"""Run the real room engine and fresh school context in a disposable Linux identity."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import secrets
import subprocess
import time
import zipfile

ARCHIVE = Path('/tmp/wvh-castle-homes-qa.zip')
EXPECTED = 'f8876b6cbc8f999503db915eef1cbe9190598a6822a27181064a1482fe65c8e0'
INPUT = Path('/home/wilhelm/.cache/wvh-school-qa/homes-accounts.private.json')
SOURCE = Path('/opt/wvh-sterne-kollegium/releases/20261109T191624Z')
ROOT = Path('/opt/wvh-castle-homes')
PRIVATE = ROOT / 'private'
FILES = {
    *('ops/castle-homes/'+name for name in [
        'authority.cjs', 'gateway.cjs', 'game-adapter.cjs', 'identity-lookup.cjs',
        'SchoolIdentity.php', 'ContextProtocol.php', 'context.php']),
    *('ops/castle-homes/public/'+name for name in [
        'index.html', 'entry.js', 'entry.css', 'room.html', 'room.css', 'exit.html', 'exit.js']),
    'ops/castle-school/identity.cjs', 'ops/castle-school/admission.cjs',
    'ops/hall-audio/auth.cjs', 'ops/hall-audio/errors.cjs',
    'ops/hall-audio/public/vendor/lucide.min.js', 'ops/hall-audio/public/vendor/lucide.LICENSE',
    'tools/check-castle-homes-vps.cjs', 'tools/castle-home-test-client.cjs',
    'tools/castle-homes-context-router.php', 'castle-homes-runtime.manifest.json',
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def run(*args, timeout=25):
    result = subprocess.run(args, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError('Private runtime precondition failed; diagnostics withheld')
    return result.stdout


def running():
    ids = run('docker', 'ps', '-q').split()
    return {row['Name']: [row['Id'], row['State']['StartedAt'], row['RestartCount']]
            for row in json.loads(run('docker', 'inspect', *ids))}


def colleague():
    return run('systemctl', 'show', 'wvh-sterne-kollegium.service',
               '--property=MainPID,ActiveState,SubState')


def source_hashes(files):
    result = {}
    assert len(files) == 107
    for name, expected in files.items():
        target = SOURCE / name
        assert target.resolve() == target and target.is_relative_to(SOURCE) and target.is_file()
        assert target.stat().st_uid == 0 and not target.stat().st_mode & 0o022
        result[name] = sha(target.read_bytes())
        assert result[name] == expected
    return result


def main():
    os.umask(0o077)
    ops = runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    baseline = ops['baseline']()
    services, original_service = running(), colleague()
    config = Path('/var/www/vhosts/deine-schule.com/private/castle-school/config.json')
    config_hash = sha(config.read_bytes())
    original_deployment = Path('/opt/wvh-sterne-kollegium/deployment.json')
    original_hash = sha(original_deployment.read_bytes())
    assert original_hash == 'e171b1d6665364b5187f4ed6b0a0ac8b115b361f75ffd29ae71021441cedf564'
    raw = ARCHIVE.read_bytes()
    assert sha(raw) == EXPECTED and len(raw) < 500000
    assert ROOT.resolve() == ROOT and PRIVATE.resolve() == PRIVATE
    PRIVATE.mkdir(mode=0o700, parents=True, exist_ok=True)
    PRIVATE.chmod(0o700)
    assert {path.name for path in ROOT.iterdir()} <= {'private', 'preflight', 'staging'}
    # Permit traversal to reviewed code, without listing the private service root.
    ROOT.chmod(0o711)
    release = ROOT / 'staging' / EXPECTED[:16]
    assert release.resolve() == release
    release.mkdir(mode=0o755, parents=True, exist_ok=True)
    release.parent.chmod(0o755)
    release.chmod(0o755)
    payload = {}
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert set(archive.namelist()) == FILES and len(archive.infolist()) == len(FILES)
        assert sum(row.file_size for row in archive.infolist()) < 900000
        for name in FILES:
            target = release / name
            assert target.resolve() == target and target.is_relative_to(release)
            target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
            content = archive.read(name)
            payload[name] = content
            if target.exists():
                assert target.read_bytes() == content
            else:
                target.write_bytes(content)
                target.chmod(0o644)
    for directory in release.rglob('*'):
        if directory.is_dir():
            directory.chmod(0o755)
    manifest = json.loads((release/'castle-homes-runtime.manifest.json').read_text())
    assert manifest['version'] == 1 and manifest['sourceRelease'] == str(SOURCE)
    source_before = source_hashes(manifest['files'])
    unit = 'wvh-castle-homes-qa-'+EXPECTED[:12]
    credential = PRIVATE / ('qa-'+EXPECTED[:16]+'.private.json')
    assert not credential.exists()
    assert subprocess.run(['systemctl', 'is-active', '--quiet', unit]).returncode != 0
    try:
        assert INPUT.resolve() == INPUT and INPUT.parent.stat().st_mode & 0o777 == 0o700
        INPUT.chmod(0o600)
        value = json.loads(INPUT.read_text())
        assert set(value) == {'version', 'accounts'} and value['version'] == 1
        assert len(value['accounts']) == 2 and [a['key'] for a in value['accounts']] == ['A', 'B']
        assert len({a['identifier'].lower() for a in value['accounts']}) == 2
        assert all(set(a) == {'key', 'identifier', 'token'} and isinstance(a['token'], str)
                   and 40 < len(a['token']) < 32768 for a in value['accounts'])
        environment = json.loads(run('docker', 'inspect', 'wvh-castle-school'))[0]['Config']['Env']
        secret_values = [row.split('=', 1)[1] for row in environment if row.startswith('SECRET_KEY=')]
        # Match the existing verifier's configuration; the separate room key is newly random.
        assert len(secret_values) == 1 and len(secret_values[0]) > 0
        database = json.loads(config.read_text())['db']
        php = sorted(Path('/opt/plesk/php').glob('*/bin/php'))[-1]
        private_config = dict(value, secret=secret_values[0], contextKey=secrets.token_hex(32),
                              db=database, source=str(SOURCE), php=str(php))
        for private_value in [secret_values[0], database['password'], *(a['token'] for a in value['accounts'])]:
            assert len(private_value) > 0 and all(private_value.encode() not in content for content in payload.values())
        credential.write_text(json.dumps(private_config))
        credential.chmod(0o600)
        properties = {
            'DynamicUser': 'yes', 'RuntimeDirectory': unit, 'RuntimeDirectoryMode': '0700',
            'ProtectSystem': 'strict', 'ProtectHome': 'yes', 'PrivateTmp': 'yes',
            'NoNewPrivileges': 'yes', 'ProtectKernelTunables': 'yes', 'ProtectKernelModules': 'yes',
            'ProtectControlGroups': 'yes', 'LockPersonality': 'yes', 'RestrictSUIDSGID': 'yes',
            'CapabilityBoundingSet': '', 'UMask': '0077', 'MemoryMax': '512M', 'CPUQuota': '100%',
            'TasksMax': '64', 'RuntimeMaxSec': '150s', 'LoadCredential': 'qa.json:'+str(credential),
            'Description': 'Isolated castle homes QA '+EXPECTED[:12],
        }
        command = ['systemd-run', '--quiet', '--wait', '--pipe', '--collect', '--service-type=exec', '--unit='+unit]
        for name, setting in properties.items():
            command += ['--property='+name+'='+setting]
        command += ['--setenv=NODE_PATH='+str(SOURCE/'dorfplatz/node_modules'),
                    '/opt/plesk/node/24/bin/node', '--max-old-space-size=256',
                    str(release/'tools/check-castle-homes-vps.cjs')]
        result = subprocess.run(command, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=165)
        diagnostic = PRIVATE / 'runtime-probe.private.log'
        diagnostic.write_text(result.stdout+'\n'+result.stderr)
        diagnostic.chmod(0o600)
        if result.returncode:
            raise RuntimeError('Isolated homes runtime check failed; private diagnostic retained')
        proof = json.loads(result.stdout.strip().splitlines()[-1])
        assert proof['passed'] and len(proof['checks']) == 8 and not proof['schoolWrites']
        assert ops['baseline']() == baseline and running() == services and colleague() == original_service
        assert sha(config.read_bytes()) == config_hash and sha(original_deployment.read_bytes()) == original_hash
        assert source_hashes(manifest['files']) == source_before
        assert subprocess.run(['systemctl', 'is-active', '--quiet', unit]).returncode != 0
        assert not (Path('/run')/unit).exists(), 'The disposable runtime must be removed'
        record = dict(proof, archiveSha256=EXPECTED, runtimeSourceManifestSha256=sha(
            (release/'castle-homes-runtime.manifest.json').read_bytes()),
            reviewedRuntimeInputs=len(source_before), protectedBaselineUnchanged=True,
            existingDockerAndColleagueServiceUnchanged=True,
            checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))
        ops['atomic'](PRIVATE/'runtime-preflight.json', record)
        print(json.dumps(record))
    finally:
        description = subprocess.run(['systemctl', 'show', unit, '-p', 'Description', '--value'],
                                     capture_output=True, text=True).stdout.strip()
        if description == 'Isolated castle homes QA '+EXPECTED[:12]:
            subprocess.run(['systemctl', 'stop', unit], capture_output=True, timeout=15)
        credential.unlink(missing_ok=True)
        INPUT.unlink(missing_ok=True)


if __name__ == '__main__':
    try:
        main()
    finally:
        INPUT.unlink(missing_ok=True)
