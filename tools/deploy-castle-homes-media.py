"""Publish only pinned nonpersonal room images; leave authority and PHP policy unchanged."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import secrets
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request
import zipfile

EXPECTED='a07797165557cc82c862004b62474cc746df624f1b46d878bb065e1e196a6e2f'
MANIFEST_SHA='242a42c7c40827e681c92fea56fe1d2d9886cab9fe8cd6279107af981e676909'
ROOT=Path('/opt/wvh-castle-homes')
PRIVATE=ROOT/'private'
UNIT=Path('/etc/systemd/system/wvh-castle-homes.service')
SERVICE='wvh-castle-homes.service'
ARCHIVE=Path('/tmp/wvh-castle-homes-media.zip')
INPUT=Path('/home/wilhelm/.cache/wvh-school-qa/homes-accounts.private.json')
RECEIPT=PRIVATE/'media-deployment.json'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def run(*args,timeout=35):
    result=subprocess.run(args,stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=timeout)
    if result.returncode:
        raise RuntimeError('Scoped room-media operation failed; private diagnostics withheld')
    return result.stdout


def atomic(path,raw,mode=0o600):
    assert path.resolve()==path
    temp=path.with_name('.'+path.name+'.'+secrets.token_hex(6))
    fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,mode)
    try:
        os.fchmod(fd,mode)
        os.fchown(fd,0,0)
        with os.fdopen(fd,'wb') as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp,path)
    finally:
        temp.unlink(missing_ok=True)


def request(url,headers=None):
    try:
        response=urllib.request.urlopen(urllib.request.Request(url,headers=headers or {}),timeout=15)
    except urllib.error.HTTPError as error:
        response=error
    with response:
        return response.status,response.read(5*1024*1024),response.headers


def running():
    ids=run('docker','ps','-q').split()
    return {row['Name']:[row['Id'],row['State']['StartedAt'],row['RestartCount']]
            for row in json.loads(run('docker','inspect',*ids))}


def main():
    os.umask(0o077)
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before,docker_before=ops['baseline'](),running()
    colleague=run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')
    assert not RECEIPT.exists() and PRIVATE.resolve()==PRIVATE and PRIVATE.stat().st_mode&0o777==0o700
    prior_raw=(PRIVATE/'moderation-deployment.json').read_bytes()
    prior=json.loads(prior_raw)
    assert prior['passed'] and prior['before']==prior['after']==before
    old_release=Path(prior['release'])
    assert old_release==ROOT/'releases'/prior['archiveSha256'][:16] and old_release.resolve()==old_release
    assert all(sha((old_release/name).read_bytes())==digest for name,digest in prior['files'].items())
    protected={**prior['changedFiles'],**prior['contextFiles']}
    assert all(Path(name).resolve()==Path(name) and sha(Path(name).read_bytes())==digest for name,digest in protected.items())
    assert INPUT.resolve()==INPUT and INPUT.parent.stat().st_mode&0o777==0o700
    INPUT.chmod(0o600)
    accounts=json.loads(INPUT.read_text())
    assert set(accounts)=={'version','accounts'} and accounts['version']==1 and [row['key'] for row in accounts['accounts']]==['A','B']
    raw=ARCHIVE.read_bytes()
    assert sha(raw)==EXPECTED and len(raw)<35*1024*1024
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert len(archive.infolist())==54 and sum(row.file_size for row in archive.infolist())<35*1024*1024
        manifest_raw=archive.read('ops/castle-homes/media/manifest.json')
        assert sha(manifest_raw)==MANIFEST_SHA
        manifest=json.loads(manifest_raw)
        assert manifest['version']==1 and manifest['codec']=='lossless-mixed' and len(manifest['images'])==19
        media_files={'ops/castle-homes/media/'+row['sha256']+'.'+row['format'] for row in manifest['images']}
        expected=set(prior['files'])|{'ops/castle-homes/media.cjs','tests/castle-home-media.test.cjs',
            'ops/castle-homes/media/manifest.json','ops/castle-homes/media/browser-fidelity.json'}|media_files
        assert set(archive.namelist())==expected and len(expected)==54
        payload={name:archive.read(name) for name in expected}
    proof=json.loads(payload['ops/castle-homes/media/browser-fidelity.json'])
    assert proof['passed'] and proof['manifestSha256']==MANIFEST_SHA and proof['browserVersion'].startswith('157.')
    assert not proof['sourceImagesChanged'] and not proof['publicDeploymentTested'] and len(proof['comparisons'])==19
    assert all(row['sameDimensions'] and row['alphaDifferences']==row['visibleRgbDifferences']==0 for row in proof['comparisons'])
    assert {row['route'] for row in proof['comparisons']}=={row['route'] for row in manifest['images']}
    runtime=json.loads(payload['castle-homes-runtime.manifest.json'])
    assert sha(payload['castle-homes-runtime.manifest.json'])==manifest['sourceManifestSha256']
    source=Path(runtime['sourceRelease'])
    assert len(runtime['files'])==107 and all((source/name).resolve()==source/name and sha((source/name).read_bytes())==digest for name,digest in runtime['files'].items())
    for row in manifest['images']:
        body=payload['ops/castle-homes/media/'+row['sha256']+'.'+row['format']]
        assert sha(body)==row['sha256'] and len(body)==row['bytes'] and runtime['files'][row['source']]==row['sourceSha256']
    release=ROOT/'releases'/EXPECTED[:16]
    assert release.resolve()==release and release!=old_release
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
        if path.is_dir():
            path.chmod(0o755)
    node='/opt/plesk/node/24/bin/node'
    node_path=str(source/'dorfplatz/node_modules')
    common=['systemd-run','--quiet','--wait','--pipe','--collect','--property=DynamicUser=yes',
        '--property=PrivateTmp=yes','--property=ProtectSystem=strict','--property=ProtectHome=yes',
        '--property=NoNewPrivileges=yes','--property=MemoryMax=256M','--property=CPUQuota=100%',
        '--setenv=NODE_PATH='+node_path]
    tests=subprocess.run([*common,'--unit=wvh-homes-media-tests-'+EXPECTED[:12],'--property=RuntimeMaxSec=60s',
        node,'--test',*(str(release/'tests'/name) for name in ['castle-home-media.test.cjs','castle-home-gateway.test.cjs','castle-home-service.test.cjs'])],
        stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=75)
    atomic(PRIVATE/'media-linux-tests.private.log',(tests.stdout+'\n'+tests.stderr).encode())
    assert tests.returncode==0, 'Room-media Linux tests failed'
    backup=PRIVATE/('before-media-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'-'+secrets.token_hex(3))
    assert backup.resolve()==backup
    backup.mkdir(mode=0o700)
    old_unit=UNIT.read_bytes()
    atomic(backup/'service.snapshot',old_unit)
    database=Path('/var/lib/wvh-castle-homes/pilot.sqlite').resolve()
    assert database==Path('/var/lib/private/wvh-castle-homes/pilot.sqlite') and database.is_file()
    with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as reader,sqlite3.connect(backup/'pilot.sqlite') as writer:
        reader.backup(writer)
    (backup/'pilot.sqlite').chmod(0o600)
    unit=old_unit.replace(str(old_release/'ops/castle-homes/service.cjs').encode(),str(release/'ops/castle-homes/service.cjs').encode())
    assert unit!=old_unit and sha(old_unit)==prior['changedFiles'][str(UNIT)]
    changed=False
    committed=False
    try:
        assert UNIT.read_bytes()==old_unit
        atomic(UNIT,unit,0o644)
        changed=True
        run('systemctl','daemon-reload')
        run('systemctl','restart',SERVICE)
        ready=False
        for _ in range(40):
            try:
                status,body,_=request('https://together.deine-schule.com/castle-homes/health',{'Cache-Control':'no-cache'})
                if status==200 and json.loads(body)=={'ready':True}:
                    ready=True
                    break
            except Exception:
                pass
            time.sleep(.4)
        assert ready, 'Room-media release did not become ready'
        public_images=[]
        for row in manifest['images']:
            url='https://together.deine-schule.com/castle-homes/media/'+row['sha256']+'.'+row['format']
            status,body,headers=request(url)
            assert status==200 and sha(body)==row['sha256'] and len(body)==row['bytes']
            assert headers['Cache-Control']=='public, max-age=31536000, immutable' and headers['Content-Type']=='image/'+row['format']
            assert not headers.get('Set-Cookie') and headers['Cross-Origin-Resource-Policy']=='same-origin'
            assert request(url,{'If-None-Match':'"'+row['sha256']+'"'})[:2]==(304,b'')
            public_images.append(dict(route=row['route'],sha256=row['sha256'],bytes=len(body),publicTlsHashAndCacheVerified=True))
        qa=subprocess.run([*common,'--unit=wvh-homes-media-public-'+EXPECTED[:12],'--property=RuntimeMaxSec=125s',
            '--property=LoadCredential=accounts.json:'+str(INPUT),node,str(release/'tools/check-castle-homes-public.cjs')],
            stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=140)
        atomic(PRIVATE/'media-public-probe.private.log',(qa.stdout+'\n'+qa.stderr).encode())
        assert qa.returncode==0, 'Public room regression failed'
        acceptance=json.loads(qa.stdout.strip().splitlines()[-1])
        assert acceptance['passed'] and len(acceptance['checks'])==7
        assert ops['baseline']()==before and running()==docker_before
        assert run('systemctl','show','wvh-sterne-kollegium.service','--property=MainPID,ActiveState,SubState')==colleague
        assert all(sha(Path(name).read_bytes())==digest for name,digest in protected.items() if name!=str(UNIT))
        assert UNIT.read_bytes()==unit and run('systemctl','is-active',SERVICE).strip()=='active'
        record=dict(passed=True,release=str(release),archiveSha256=EXPECTED,moderationReceiptSha256=sha(prior_raw),before=before,after=before,
            files={name:sha(content) for name,content in payload.items()},unitBeforeFile=str(backup/'service.snapshot'),
            unitBeforeSha256=sha(old_unit),unitAfterSha256=sha(unit),recoveryDatabaseFile=str(backup/'pilot.sqlite'),
            recoveryDatabaseSha256=sha((backup/'pilot.sqlite').read_bytes()),linuxTestLogSha256=sha((PRIVATE/'media-linux-tests.private.log').read_bytes()),
            mediaManifestSha256=MANIFEST_SHA,browserFidelityProofSha256=sha(payload['ops/castle-homes/media/browser-fidelity.json']),
            originalImageBytes=manifest['originalBytes'],optimizedImageBytes=manifest['bytes'],publicImages=public_images,acceptance=acceptance,
            onlyRoomPilotRestarted=True,privateAuthorityAndModerationUnchanged=True,sourceImagesUnchanged=True,
            existingServicesAndMapsUnchanged=True,broadSchoolRoomAccess=False,voiceEnabled=False,
            checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()))
        ops['atomic'](RECEIPT,record)
        committed=True
        print(json.dumps({key:record[key] for key in ['passed','archiveSha256','originalImageBytes','optimizedImageBytes',
            'onlyRoomPilotRestarted','privateAuthorityAndModerationUnchanged','sourceImagesUnchanged','existingServicesAndMapsUnchanged','checkedAt']}))
    finally:
        if changed and not committed:
            assert UNIT.read_bytes()==unit, 'Concurrent live change; do not overwrite'
            atomic(UNIT,old_unit,0o644)
            run('systemctl','daemon-reload')
            run('systemctl','restart',SERVICE)


if __name__=='__main__':
    try:
        main()
    finally:
        INPUT.unlink(missing_ok=True)
