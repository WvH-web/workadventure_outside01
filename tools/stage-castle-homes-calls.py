"""Stage private room calls on loopback with fresh school checks and disposable data only."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import subprocess
import time
import urllib.error
import urllib.request
import zipfile

EXPECTED='189930258e7bd346f4f24f4556a1ae7a41dec5aa9209ba4ce188fcc143d8f0ad'
ROOT=Path('/opt/wvh-castle-homes')
PRIVATE=ROOT/'private'
UNIT='wvh-homes-calls-stage.service'
CONTROL='wvh-homes-media-stage.service'


def main():
    os.umask(0o077)
    helper_path=Path('/tmp/wvh-deploy-castle-homes-media-tools.py')
    raw=helper_path.read_bytes()
    assert helper_path.resolve()==helper_path and hashlib.sha256(raw).hexdigest()=='cc7d874f7cc9d3de0ed2382ec11e8b8f9bef452fd57b64433f9aed15ed15a0ea'
    helper={'__name__':'castle_homes_calls_stage_tools'}
    exec(compile(raw,str(helper_path),'exec'),helper)
    run,sha,atomic,running=(helper[name] for name in ['run','sha','atomic','running'])
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before,docker_before=ops['baseline'](),running()
    processes={name:run('systemctl','show',name,'--property=MainPID,ActiveState,SubState') for name in ['wvh-castle-homes.service','wvh-sterne-kollegium.service']}
    receipt=PRIVATE/'calls-stage.json'
    assert not receipt.exists() and not run('ss','-ltnH','sport = :13251').strip() and not run('ss','-ltnH','sport = :13252').strip()
    original_config=(PRIVATE/'service.json').read_bytes()
    previous_raw=(PRIVATE/'owned-runtime-deployment.json').read_bytes()
    previous=json.loads(previous_raw)
    assert previous['passed'] and previous['before']==previous['after']==before
    previous_release=Path(previous['release'])
    assert previous_release.resolve()==previous_release and previous_release==ROOT/'releases'/previous['archiveSha256'][:16]
    assert all(sha((previous_release/name).read_bytes())==digest for name,digest in previous['files'].items())
    archive_path=Path('/tmp/wvh-castle-homes-calls.zip')
    assert archive_path.resolve()==archive_path and sha(archive_path.read_bytes())==EXPECTED and archive_path.stat().st_size<35*1024*1024
    additions={'ops/castle-homes/calls.cjs','ops/castle-homes/control-proxy.cjs','ops/castle-homes/public/room-call.js','tools/castle-home-rehearsal.cjs','tools/serve-castle-homes-calls.cjs','tests/castle-home-calls.test.cjs'}
    changes={'ops/castle-homes/service.cjs','ops/castle-homes/gateway.cjs','ops/castle-homes/game-adapter.cjs','ops/castle-homes/public/entry.js',
        'ops/castle-homes/public/room.css','ops/castle-homes/public/moderation.html','ops/castle-homes/public/moderation.js','tests/castle-home-service.test.cjs'}
    with zipfile.ZipFile(archive_path) as archive:
        assert len(archive.infolist())==68 and set(archive.namelist())==set(previous['files'])|additions
        assert sum(item.file_size for item in archive.infolist())<35*1024*1024
        payload={name:archive.read(name) for name in archive.namelist()}
    assert all(sha(payload[name])==digest for name,digest in previous['files'].items() if name not in changes)
    release=ROOT/'releases'/EXPECTED[:16]
    assert release.resolve()==release and release!=previous_release
    release.mkdir(mode=0o755,exist_ok=True)
    release.chmod(0o755)
    for name,content in payload.items():
        target=release/name
        assert target.resolve()==target and target.is_relative_to(release)
        target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
        if target.exists():
            assert target.read_bytes()==content
        else:
            atomic(target,content,0o644)
    for path in release.rglob('*'):
        assert not path.is_symlink()
        if path.is_dir():
            path.chmod(0o755)
    node='/opt/plesk/node/24/bin/node'
    source=Path(previous['runtimeRoot'])
    assert source==ROOT/'game-releases'/'8a7b5a2e1bf03405'
    common=['systemd-run','--quiet','--collect','--property=DynamicUser=yes','--property=PrivateTmp=yes',
        '--property=InaccessiblePaths=/opt/wvh-sterne-kollegium','--property=ProtectSystem=strict','--property=ProtectHome=yes',
        '--property=NoNewPrivileges=yes','--property=MemoryMax=512M','--property=CPUQuota=100%',
        '--setenv=NODE_PATH='+str(source/'dorfplatz/node_modules')]
    tests=subprocess.run([*common,'--wait','--pipe','--unit=wvh-homes-calls-tests-'+EXPECTED[:12],'--property=RuntimeMaxSec=90s',node,'--test','--test-concurrency=1',
        *(str(release/'tests'/name) for name in ['castle-home-service.test.cjs','castle-home-runtime.test.cjs','castle-home-gateway.test.cjs',
            'castle-home-media.test.cjs','castle-home-progressive.test.cjs','castle-home-calls.test.cjs'])],
        stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=105)
    atomic(PRIVATE/'calls-linux-tests.private.log',(tests.stdout+'\n'+tests.stderr).encode())
    assert tests.returncode==0, 'Calls candidate Linux tests failed; private diagnostic retained'
    code="const {loadConfig}=require('/srv/hall-audio/config.cjs');const c=loadConfig();console.log(JSON.stringify({url:c.livekit.browserUrl,apiKey:c.livekit.apiKey,apiSecret:c.livekit.apiSecret}));"
    media=json.loads(run('docker','exec','wvh-hall-audio','node','-e',code))
    assert media['url']=='wss://together.deine-schule.com'
    old=json.loads(original_config)
    assert old['version']==3 and old['source']==str(source)
    config={**old,'version':4,'calls':{**media,'apiURL':'http://127.0.0.1:13252','namespace':'sterne-video-castle-homes','roles':['student','teacher'],'fixedGroups':True}}
    credential=PRIVATE/'calls-stage.service.json'
    assert credential.resolve()==credential
    if credential.exists():
        assert credential.stat().st_uid==0 and credential.stat().st_mode&0o777==0o600
        existing=json.loads(credential.read_text())
        assert existing in [config,{**config,'calls':{**config['calls'],'apiURL':'https://together.deine-schule.com'}}]
    atomic(credential,(json.dumps(config,sort_keys=True,separators=(',',':'))+'\n').encode())
    started=False
    control_started=False
    accepted=False
    try:
        run('systemd-run','--quiet','--collect','--unit='+CONTROL,'--property=PrivateTmp=yes','--property=ProtectSystem=strict',
            '--property=ProtectHome=yes','--property=NoNewPrivileges=yes','--property=MemoryMax=128M','--property=CPUQuota=25%',
            '--property=RuntimeMaxSec=1260s',node,str(release/'ops/castle-homes/control-proxy.cjs'))
        control_started=True
        run(*common,'--unit='+UNIT,'--property=RuntimeDirectory=wvh-homes-calls-stage','--property=RuntimeDirectoryMode=0700',
            '--property=RuntimeMaxSec=1200s','--property=LoadCredential=service.json:'+str(credential),node,str(release/'tools/serve-castle-homes-calls.cjs'))
        started=True
        healthy=False
        for _ in range(60):
            try:
                req=urllib.request.Request('http://127.0.0.1:13251/castle-homes/health',headers={'Host':'127.0.0.1:4319'})
                with urllib.request.urlopen(req,timeout=2) as response:
                    healthy=response.status==200 and json.loads(response.read())=={'ready':True}
                if healthy:
                    break
            except Exception:
                pass
            time.sleep(.3)
        assert healthy, 'Calls stage failed readiness; inspect its private journal'
        assert ops['baseline']()==before and running()==docker_before
        assert (PRIVATE/'service.json').read_bytes()==original_config
        assert all(run('systemctl','show',name,'--property=MainPID,ActiveState,SubState')==value for name,value in processes.items())
        record=dict(passed=True,active=True,installed=False,archiveSha256=EXPECTED,release=str(release),files={name:sha(content) for name,content in payload.items()},
            ownedReceiptSha256=sha(previous_raw),linuxTestLogSha256=sha((PRIVATE/'calls-linux-tests.private.log').read_bytes()),
            before=before,after=before,processes=processes,unit=UNIT,controlUnit=CONTROL,credentialFile=str(credential),credentialSha256=sha(credential.read_bytes()),
            onlyDisposableRoomData=True,ordinarySchoolContext=True,originalRuntimeHidden=True,noExistingServiceRestarted=True,
            publicMapEntryEnabled=False,publicRouteCreated=False,checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        ops['atomic'](receipt,record)
        accepted=True
        print(json.dumps({key:record[key] for key in ['passed','active','installed','archiveSha256','onlyDisposableRoomData','ordinarySchoolContext','noExistingServiceRestarted','checkedAt']}))
    finally:
        if not accepted:
            for name in ([UNIT] if started else [])+([CONTROL] if control_started else []):
                result=subprocess.run(['systemctl','stop',name],capture_output=True,text=True,timeout=25)
                if result.returncode:
                    state=subprocess.run(['systemctl','show',name,'--property=MainPID,ActiveState'],capture_output=True,text=True,timeout=10)
                    assert 'MainPID=0' in state.stdout and 'ActiveState=inactive' in state.stdout
        if not accepted:
            assert credential.resolve()==credential and credential.parent==PRIVATE
            credential.unlink(missing_ok=True)


if __name__=='__main__':
    main()
