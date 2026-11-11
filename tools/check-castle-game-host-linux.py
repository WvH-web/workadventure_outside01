"""Run pinned game-host tests in the real immutable Node image, without school data or network."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import runpy
import stat
import subprocess
import time
import zipfile

PRIVATE=Path('/opt/wvh-castle-school/private')
SOURCE=Path('/tmp/wvh-castle-game-host-school.zip')
SOURCE_DESCRIPTOR=Path('/tmp/wvh-castle-game-host-school.json')
TESTS=Path('/tmp/wvh-castle-game-host-tests.zip')
TEST_DESCRIPTOR=Path('/tmp/wvh-castle-game-host-tests.json')
EXPECTED_SOURCE='3119b0c32934a5f18d810571810dfdd2adf8e03594f677d6eaa20552f1cf2736'
EXPECTED_TESTS='7b9ceeab5ae70b0341b9cab20c8c8d25d33900c56b6702e911d080af0042fa60'
EXPECTED_SOURCE_DESCRIPTOR='66764072a48c21a2f3c2b275045ceda2e1fb77bf9e8b4094d4cbb44ce9945283'
EXPECTED_TEST_DESCRIPTOR='4507859e15ba7f3fd9cb4ea2ae558751e0921790222cfedbbf54268a3bfc556e'
AUDIT_SHA='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
NAME='wvh-castle-game-host-qa'
CHANGED={'castle-school/server.cjs','castle-school/rounds.cjs','castle-school/public/games.html',
         'castle-school/public/games.js','castle-school/public/games.css','castle-school/public/rounds.js',
         'castle-school/public/rounds.html',
         'castle-school/public/presence.js','castle-school/public/round-client.js'}
TEST_FILES={'castle-game-host.test.cjs','castle-game-host-http.test.cjs','castle-rounds.test.cjs','fixtures/castle-offers.cjs'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def run(*args):
    value=subprocess.run(args,text=True,capture_output=True,timeout=25)
    if value.returncode:raise RuntimeError('Scoped Linux preflight command failed')
    return value.stdout


def archive(path,digest,descriptor,descriptor_digest):
    for item in [path,descriptor]:assert item.resolve()==item and item.is_file()
    raw=path.read_bytes();meta_raw=descriptor.read_bytes()
    assert len(raw)<2000000 and sha(raw)==digest and sha(meta_raw)==descriptor_digest
    meta=json.loads(meta_raw)
    assert set(meta)=={'version','sourceCommit','archiveSha256','files'} and meta['version']==1 and meta['archiveSha256']==digest
    assert re.fullmatch('[a-f0-9]{40}',meta['sourceCommit'])
    with zipfile.ZipFile(path) as bundle:
        entries=bundle.infolist();assert len(entries)==len(meta['files']) and {entry.filename for entry in entries}==set(meta['files'])
        assert sum(entry.file_size for entry in entries)<2500000
        for entry in entries:
            name=PurePosixPath(entry.filename)
            assert not name.is_absolute() and '..' not in name.parts and '\\' not in entry.filename and str(name)==entry.filename
            assert not entry.is_dir() and not stat.S_ISLNK(entry.external_attr>>16)
        payload={name:bundle.read(name) for name in meta['files']}
    assert all(sha(raw)==meta['files'][name] for name,raw in payload.items())
    return meta,payload


def exact_directory(directory,files):
    assert directory.resolve()==directory and directory.parent.parent==PRIVATE
    directory.mkdir(mode=0o755,parents=True,exist_ok=True);directory.chmod(0o755)
    for name,raw in files.items():
        target=directory/name;assert target.resolve()==target
        target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
        if target.exists():assert target.read_bytes()==raw
        else:
            with target.open('xb') as handle:handle.write(raw)
        target.chmod(0o644)
    for path in directory.rglob('*'):
        assert not path.is_symlink()
        if path.is_dir():path.chmod(0o755)
    assert {path.relative_to(directory).as_posix() for path in directory.rglob('*') if path.is_file()}==set(files)


def main(attempt=1):
    os.umask(0o077);assert type(attempt) is int and 1<=attempt<=9
    assert all(re.fullmatch('[a-f0-9]{64}',value) for value in [EXPECTED_SOURCE,EXPECTED_TESTS,EXPECTED_SOURCE_DESCRIPTOR,EXPECTED_TEST_DESCRIPTOR])
    assert PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_uid==0 and PRIVATE.stat().st_mode&0o777==0o700
    audit=Path('/tmp/wvh-check-castle-piano-deployment.py');assert audit.resolve()==audit and sha(audit.read_bytes())==AUDIT_SHA
    runpy.run_path(str(audit))['main']()
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']()
    assert not ops['exists'](NAME)
    record_path=PRIVATE/'deployment.json';record_raw=record_path.read_bytes();live=json.loads(record_raw);old=ops['inspect']('wvh-castle-school')
    assert old['State']['Health']['Status']=='healthy'
    source,payload=archive(SOURCE,EXPECTED_SOURCE,SOURCE_DESCRIPTOR,EXPECTED_SOURCE_DESCRIPTOR)
    tests,test_payload=archive(TESTS,EXPECTED_TESTS,TEST_DESCRIPTOR,EXPECTED_TEST_DESCRIPTOR)
    assert source['sourceCommit']==tests['sourceCommit'] and set(payload)==set(live['files']) and len(payload)==42
    assert {name for name in payload if sha(payload[name])!=live['files'][name]}==CHANGED
    assert set(test_payload)==TEST_FILES
    recovery=json.loads((PRIVATE/'round-recovery-deployment.json').read_text())
    assert recovery['passed'] and not recovery['provisional']
    for name,digest in recovery['files'].items():assert sha(payload['castle-school/public/'+name])==digest
    folder=PRIVATE/('game-host-linux-'+EXPECTED_SOURCE[:16]);assert folder.resolve()==folder
    folder.mkdir(mode=0o700,exist_ok=True);folder.chmod(0o700)
    exact_directory(folder/'ops',payload);exact_directory(folder/'tests',test_payload)
    receipt=PRIVATE/('game-host-linux-'+EXPECTED_SOURCE[:16]+'-attempt-'+str(attempt)+'.json')
    log=receipt.with_suffix('.private.log');assert not receipt.exists() and not log.exists()
    runtime=run('docker','exec','wvh-castle-school','node','--version').strip();assert re.fullmatch(r'v24\.\d+\.\d+',runtime)
    all_before=run('docker','ps','-q').split();result=None
    try:
        result=subprocess.run(['docker','run','--rm','--name',NAME,'--network','none','--read-only','--user','1000:1000',
            '--workdir','/qa','--env','NODE_PATH=/usr/src/node_modules','--mount','type=bind,src='+str(folder/'ops')+',dst=/qa/ops,readonly',
            '--mount','type=bind,src='+str(folder/'tests')+',dst=/qa/tests,readonly','--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
            '--label','wvh.component=castle-game-host-test','--label','wvh.release='+EXPECTED_SOURCE[:16],
            '--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--cpus','0.5','--pids-limit','128',
            '--entrypoint','node',old['Image'],'--max-old-space-size=128','--test','--test-reporter=tap','--test-concurrency=1',
            'tests/castle-game-host.test.cjs','tests/castle-game-host-http.test.cjs','tests/castle-rounds.test.cjs'],
            text=True,capture_output=True,timeout=90)
        log.write_text(result.stdout+result.stderr);log.chmod(0o600)
        assert result.returncode==0 and re.search(r'^# tests 33$',result.stdout,re.M) and re.search(r'^# pass 33$',result.stdout,re.M)
        assert re.search(r'^# fail 0$',result.stdout,re.M) and re.search(r'^# skipped 0$',result.stdout,re.M)
    finally:
        if ops['exists'](NAME):
            current=ops['inspect'](NAME)
            assert current['Config']['Labels']['wvh.component']=='castle-game-host-test' and current['Config']['Labels']['wvh.release']==EXPECTED_SOURCE[:16]
            run('docker','stop','-t','8',NAME);run('docker','rm',NAME)
        assert not ops['exists'](NAME) and set(run('docker','ps','-q').split())==set(all_before)
        assert ops['baseline']()==before and record_path.read_bytes()==record_raw
    runpy.run_path(str(audit))['main']()
    value={'passed':True,'tests':33,'runtime':runtime,'sourceCommit':source['sourceCommit'],'archiveSha256':EXPECTED_SOURCE,
        'testArchiveSha256':EXPECTED_TESTS,'sourceDescriptorSha256':EXPECTED_SOURCE_DESCRIPTOR,'testDescriptorSha256':EXPECTED_TEST_DESCRIPTOR,
        'testLogSha256':sha(log.read_bytes()),'image':old['Image'],'files':source['files'],'before':before,'after':ops['baseline'](),
        'networkDisabled':True,'syntheticProfilesOnly':True,'schoolKeysMounted':False,'temporaryContainerRemoved':True,
        'oldAndNewPreviewMapsUnchanged':True,'published':False,'fullCastleApprovalFor400':False,'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    assert value['before']==value['after'];ops['atomic'](receipt,value)
    print(json.dumps({key:value[key] for key in ['passed','tests','runtime','networkDisabled','syntheticProfilesOnly','schoolKeysMounted','temporaryContainerRemoved','published','fullCastleApprovalFor400','checkedAt']}))


if __name__=='__main__':main()
