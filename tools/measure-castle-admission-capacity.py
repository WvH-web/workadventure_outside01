"""Repeat the unchanged 400-request gate in isolated production-image containers, never live providers."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import subprocess
import time
import zipfile

PRIVATE=Path('/opt/wvh-castle-school/private')
NAME='wvh-castle-admission-measure-20261111'
LABEL='castle-admission-measure-20261111'
TESTS={'castle-admission.test.cjs','castle-admission-http.test.cjs','fixtures/castle-offers.cjs'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def plan(attempt):
    assert type(attempt) is int and 1<=attempt<=9
    suffix='-attempt-'+str(attempt) if attempt>1 else ''
    return NAME+suffix,PRIVATE/('admission-measure-20261111'+suffix)


def reviewed_source(current,archived,name):
    if current==archived:return archived
    assert name=='castle-admission-http.test.cjs'
    assert sha(archived)=='c510443271db55a8e6b9fb888b4c61e34344c3b071fc88206eca8b5a44d4ff63'
    assert sha(current)=='2918298263e42153949949db952914ed63fbe5b7487bbc9056f1c81734cac859'
    # Commit c5aa6a9 only bounded a later disconnect test. The entire fixture and
    # strict 400-request case are byte-identical; execute the retained old file.
    marker=b"test('class and role changes while waiting"
    assert current.split(marker)[0]==archived.split(marker)[0] and marker in current and marker in archived
    return archived


def result(stdout,exit_code):
    rows=[json.loads(line) for line in stdout.splitlines() if line.strip()]
    reports=[row['value'] for row in rows if row.get('type')=='diagnostic' and row.get('value',{}).get('requests')==400]
    statuses=[row['value']['httpStatuses'] for row in rows if row.get('type')=='diagnostic' and 'httpStatuses' in row.get('value',{})]
    runtimes=[row for row in rows if row.get('type')=='runtime']
    passed=exit_code==0 and len(reports)==1 and statuses==[{'200':400}] and not any(row.get('type')=='failure' for row in rows)
    passed=passed and len(runtimes)==1 and runtimes[0].get('platform')=='linux' and isinstance(runtimes[0].get('node'),str)
    if passed:
        report=reports[0]
        counters=['requests','successful','profileRequests','providerRequests','maximumGraph','maximumProfiles','graphActive','profileActive','elapsedMs']
        passed=all(type(report[key]) is int and report[key]>=0 for key in counters)
        passed=passed and report['successful']==report['profileRequests']==report['providerRequests']==400 and 1<=report['maximumGraph']<=16 and 1<=report['maximumProfiles']<=16 and report['graphActive']==report['profileActive']==0
        passed=passed and report['transportPreconnected'] is False and report['normalMicrosoftLoginLoadTested'] is False and report['fullCastleApprovalFor400'] is False
    return dict(passed=passed,httpStatuses=statuses[-1] if statuses else {},runtime=runtimes[0] if len(runtimes)==1 else None,measurement=reports[0] if len(reports)==1 else None)


def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']()
    cpu=os.cpu_count();available=int(next(line for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')).split()[1])*1024
    if available<1024**3 or os.getloadavg()[0]>max(1,cpu*.75):
        print(json.dumps(dict(deferred=True,reason='Insufficient spare host resources; no test container started')));return
    deployment=json.loads((PRIVATE/'deployment.json').read_text());accepted=json.loads((PRIVATE/'admission-deployment.json').read_text())
    live=ops['inspect']('wvh-castle-school');assert live['State']['Health']['Status']=='healthy' and live['Id']==accepted['containerId'] and live['Image']==accepted['image']
    image=json.loads(subprocess.check_output(['docker','image','inspect',live['Image']],text=True,timeout=10))[0]
    assert not image['Config'].get('Volumes') and not any(item.startswith(('SECRET_KEY=','CASTLE_SCHOOL_LOOKUP_KEY=','CLIENT_SECRET=','DB_PASSWORD=')) for item in image['Config'].get('Env',[]))
    release=Path(deployment['release']);assert release.resolve()==release and release.parent==PRIVATE.parent/'releases' and len(deployment['files'])==42
    assert not any(path.is_symlink() for path in release.rglob('*'))
    assert all(sha((release/name).read_bytes())==digest for name,digest in deployment['files'].items())
    # The original QA directory is keyed by its archive, not by the stage receipt.
    staged=json.loads((PRIVATE/'admission-stage.json').read_text());original=PRIVATE/('admission-tests-'+staged['qaArchiveSha256'][:16])
    assert original.resolve()==original and original.is_dir()
    descriptor=json.loads(Path('/tmp/wvh-castle-admission-measure.json').read_text());archive=Path('/tmp/wvh-castle-admission-measure.zip')
    assert descriptor['version']==1 and type(descriptor.get('attempt')) is int and 1<=descriptor['attempt']<=9 and sha(archive.read_bytes())==descriptor['archiveSha256']
    container_name,output=plan(descriptor['attempt'])
    with zipfile.ZipFile(archive) as bundle:
        assert len(bundle.infolist())==4 and set(bundle.namelist())==TESTS|{'reporter.cjs'} and sum(item.file_size for item in bundle.infolist())<150000
        payload={name:bundle.read(name) for name in bundle.namelist()}
    assert {name:sha(raw) for name,raw in payload.items()}==descriptor['files']
    for name in TESTS:payload[name]=reviewed_source(payload[name],(original/name).read_bytes(),name)
    assert output.resolve()==output and output.parent==PRIVATE and not output.exists() and not ops['exists'](container_name)
    output.mkdir(mode=0o700);test_dir=output/'tests';test_dir.mkdir(mode=0o755);test_dir.chmod(0o755)
    for name,raw in payload.items():
        path=test_dir/name;path.parent.mkdir(mode=0o755,parents=True,exist_ok=True);path.parent.chmod(0o755);path.write_bytes(raw);path.chmod(0o644)
    runs=[]
    try:
        for number in range(1,4):
            assert ops['baseline']()==before and not ops['exists'](container_name)
            started=time.monotonic();timed_out=False
            try:
                process=subprocess.run(['docker','run','--rm','--name',container_name,'--network','none','--read-only','--user','1000:1000',
                    '--workdir','/qa','--env','NODE_PATH=/usr/src/node_modules','--mount','type=bind,src='+str(release)+',dst=/qa/ops,readonly',
                    '--mount','type=bind,src='+str(test_dir)+',dst=/qa/tests,readonly','--label','wvh.component='+LABEL,
                    '--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--cpus','0.5','--pids-limit','128',
                    '--entrypoint','node',live['Image'],'--max-old-space-size=128','--test','--test-concurrency=1',
                    '--test-name-pattern=400 simultaneous','--test-reporter=/qa/tests/reporter.cjs','tests/castle-admission-http.test.cjs'],
                    text=True,capture_output=True,timeout=35)
                stdout=process.stdout;stderr=process.stderr;exit_code=process.returncode
            except subprocess.TimeoutExpired as error:
                timed_out=True;stdout=(error.stdout or b'').decode() if isinstance(error.stdout,bytes) else error.stdout or ''
                stderr='Execution deadline exceeded; inspecting and stopping only the owned measurement container';exit_code=-1
            finally:
                if ops['exists'](container_name):
                    container=ops['inspect'](container_name);assert container['Config'].get('Labels',{}).get('wvh.component')==LABEL and container['Image']==live['Image']
                    subprocess.run(['docker','stop','-t','5',container['Id']],check=True,capture_output=True,timeout=15)
                    if ops['exists'](container_name):subprocess.run(['docker','rm',container['Id']],check=True,capture_output=True,timeout=10)
            (output/f'run-{number}.jsonl').write_text(stdout);(output/f'run-{number}.stderr').write_text(stderr)
            try:measured=result(stdout,exit_code)
            except (ValueError,KeyError,TypeError):measured=dict(passed=False,reportRejected=True)
            runs.append(dict(run=number,elapsedSeconds=round(time.monotonic()-started,3),timedOut=timed_out,exitCode=exit_code,**measured))
            assert not ops['exists'](container_name) and ops['baseline']()==before
            if not measured['passed']:break
        value=dict(passed=len(runs)==3 and all(row['passed'] for row in runs),runs=runs,sourceCommit=descriptor['sourceCommit'],
            sourceRelease=deployment['release'],executedTestFiles={name:sha(payload[name]) for name in TESTS},sameProductionNodeImage=True,networkDisabled=True,productionCredentialsPassed=False,
            cpuLimit=0.5,memoryMiB=256,strictOriginalTestUnchanged=True,liveServicesAndMapsUnchanged=True,
            realMicrosoftLoginLoadTested=False,realDatabaseLoadTested=False,fullCastleApprovalFor400=False)
        ops['atomic'](output/'result.json',value);print(json.dumps(value))
    finally:
        assert not ops['exists'](container_name) and ops['baseline']()==before


if __name__=='__main__':main()
