"""Validate the bundled-status candidate without changing the historical preflight."""
import hashlib
import json
import os
from pathlib import Path
import re
import runpy
import subprocess
import time

PRIVATE=Path('/opt/wvh-castle-school/private')
SOURCE=Path('/tmp/wvh-castle-game-host-bundled-school.zip')
SOURCE_DESCRIPTOR=Path('/tmp/wvh-castle-game-host-bundled-school.json')
TESTS=Path('/tmp/wvh-castle-game-host-bundled-tests.zip')
TEST_DESCRIPTOR=Path('/tmp/wvh-castle-game-host-bundled-tests.json')
SOURCE_SHA='8dc68e99c36dabfebc0714ec7124aaa7b19d935a130fcd3052fdf6a6229a6355'
TESTS_SHA='67151be53452f73d173b2e772613bb361f9a3cf6d803f10140e0f8e2b0571e3a'
SOURCE_DESCRIPTOR_SHA='1cb216e9d4c6fbd7590d7c652e4671b584b8a199e4e5029583f8917ebfac5212'
TEST_DESCRIPTOR_SHA='6261f91baa2e1f377625e9e1d303ac809b8f56a099697e9af1aee125157fdf29'
LIBRARY=Path('/tmp/wvh-check-castle-game-host-linux.py')
LIBRARY_SHA='afc370c1520a6d4ebe61a72258de586ec7e995d721f65fd4d6ec63d17a2c9b27'
AUDIT=Path('/tmp/wvh-check-castle-piano-deployment.py')
AUDIT_SHA='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
NAME='wvh-castle-game-host-qa'
TEST_FILES={'castle-game-host.test.cjs','castle-game-host-http.test.cjs','castle-game-status.test.mjs','castle-rounds.test.cjs','fixtures/castle-offers.cjs'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def checked(path,digest):
    assert path.resolve()==path and sha(path.read_bytes())==digest
    return runpy.run_path(str(path))


def main(attempt=1):
    os.umask(0o077);assert type(attempt) is int and 1<=attempt<=9
    assert PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_uid==0 and PRIVATE.stat().st_mode&0o777==0o700
    checked(AUDIT,AUDIT_SHA)['main']();library=checked(LIBRARY,LIBRARY_SHA)
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']();run=library['run']
    assert not ops['exists'](NAME)
    record=PRIVATE/'deployment.json';original=record.read_bytes();current=json.loads(original);old=ops['inspect']('wvh-castle-school')
    assert old['State']['Health']['Status']=='healthy'
    source,payload=library['archive'](SOURCE,SOURCE_SHA,SOURCE_DESCRIPTOR,SOURCE_DESCRIPTOR_SHA)
    tests,test_payload=library['archive'](TESTS,TESTS_SHA,TEST_DESCRIPTOR,TEST_DESCRIPTOR_SHA)
    assert source['sourceCommit']==tests['sourceCommit'] and set(payload)==set(current['files']) and len(payload)==42
    assert {name for name in payload if sha(payload[name])!=current['files'][name]}==library['CHANGED']
    assert set(test_payload)==TEST_FILES
    accepted=json.loads((PRIVATE/'round-recovery-deployment.json').read_text());assert accepted['passed'] and not accepted['provisional']
    for name,digest in accepted['files'].items():assert source['files']['castle-school/public/'+name]==digest
    folder=PRIVATE/('game-host-linux-'+SOURCE_SHA[:16]);assert folder.resolve()==folder
    folder.mkdir(mode=0o700,exist_ok=True);folder.chmod(0o700)
    library['exact_directory'](folder/'ops',payload);library['exact_directory'](folder/'tests',test_payload)
    receipt=PRIVATE/('game-host-linux-'+SOURCE_SHA[:16]+'-attempt-'+str(attempt)+'.json');log=receipt.with_suffix('.private.log')
    assert not receipt.exists() and not log.exists()
    runtime=run('docker','exec','wvh-castle-school','node','--version').strip();assert re.fullmatch(r'v24\.\d+\.\d+',runtime)
    running=run('docker','ps','-q').split()
    try:
        result=subprocess.run(['docker','run','--rm','--name',NAME,'--network','none','--read-only','--user','1000:1000','--workdir','/qa',
            '--env','NODE_PATH=/usr/src/node_modules','--mount','type=bind,src='+str(folder/'ops')+',dst=/qa/ops,readonly',
            '--mount','type=bind,src='+str(folder/'tests')+',dst=/qa/tests,readonly','--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
            '--label','wvh.component=castle-game-host-test','--label','wvh.release='+SOURCE_SHA[:16],
            '--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--cpus','0.5','--pids-limit','128',
            '--entrypoint','node',old['Image'],'--max-old-space-size=128','--test','--test-reporter=tap','--test-concurrency=1',
            *['tests/'+name for name in sorted(TEST_FILES) if name.endswith(('.test.cjs','.test.mjs'))]],text=True,capture_output=True,timeout=90)
        log.write_text(result.stdout+result.stderr);log.chmod(0o600)
        assert result.returncode==0 and all(re.search(r'^# '+key+' '+str(value)+r'$',result.stdout,re.M) for key,value in [('tests',41),('pass',41),('fail',0),('skipped',0)])
    finally:
        if ops['exists'](NAME):
            candidate=ops['inspect'](NAME)
            assert candidate['Config']['Labels']['wvh.component']=='castle-game-host-test' and candidate['Config']['Labels']['wvh.release']==SOURCE_SHA[:16]
            run('docker','stop','-t','8',NAME);run('docker','rm',NAME)
        assert not ops['exists'](NAME) and set(run('docker','ps','-q').split())==set(running)
        assert ops['baseline']()==before and record.read_bytes()==original
    checked(AUDIT,AUDIT_SHA)['main']()
    ops['atomic'](receipt,{'passed':True,'tests':41,'runtime':runtime,'archiveSha256':SOURCE_SHA,'sourceCommit':source['sourceCommit'],
        'files':source['files'],'testArchiveSha256':TESTS_SHA,'sourceDescriptorSha256':SOURCE_DESCRIPTOR_SHA,'testDescriptorSha256':TEST_DESCRIPTOR_SHA,
        'testLogSha256':sha(log.read_bytes()),'image':old['Image'],'before':before,'after':ops['baseline'](),
        'networkDisabled':True,'syntheticProfilesOnly':True,'schoolKeysMounted':False,'temporaryContainerRemoved':True,
        'published':False,'fullCastleApprovalFor400':False,'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})
    print(json.dumps({'passed':True,'tests':41,'runtime':runtime,'networkDisabled':True,'schoolKeysMounted':False,
        'temporaryContainerRemoved':True,'existingServicesAndMapsUnchanged':True,'published':False}))


if __name__=='__main__':main()
