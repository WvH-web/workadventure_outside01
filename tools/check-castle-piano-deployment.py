"""Read-only acceptance of the published piano, helper front-end and single music wrapper."""
import json
import os
from pathlib import Path
import runpy
import time
import hashlib
import urllib.error
import urllib.request

def request(path,body=None):
    req=urllib.request.Request('https://together.deine-schule.com'+path,headers={'Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode())
    try:response=urllib.request.urlopen(req,timeout=10)
    except urllib.error.HTTPError as error:response=error
    return response.status,response.read(2000000),response.headers
def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');wam=runpy.run_path('/tmp/wvh-deploy-castle-piano-wam.py');sha=ops['sha'];private=ops['PRIVATE']
    deployment=json.loads((private/'deployment.json').read_text());wrapped=json.loads((private/'music-wrapper-deployment.json').read_text())
    ui=json.loads(Path('/opt/wvh-castle-school/private/round-ui-events-deployment.json').read_text())
    native_path=Path('/home/wilhelm/.cache/wvh-school-qa/piano-native-live-proof.private.json')
    assert native_path.resolve()==native_path and native_path.parent.stat().st_mode&0o777==0o700;native_path.chmod(0o600)
    native_raw=native_path.read_bytes();native=json.loads(native_raw);wam['proof'](native,live=True);assert native['routed']==[] and native['browserVersion'].startswith('157.')
    assert deployment['release']=='8a1f180e9b723ef1' and ui['release']=='b7020b16c96c065f'
    stage=json.loads(ops['RECORD'].read_text());assert stage['stopped'] and not ops['exists'](ops['NAME']) and not ops['run']('ss','-ltnH','sport = :13241').strip()
    current=ops['inspect']('wvh-castle-piano');assert current['Id']==deployment['containerId'] and current['Image']==deployment['image']
    assert current['State']['Health']['Status']=='healthy' and current['HostConfig']['ReadonlyRootfs'] and current['Config']['User']=='1000:1000'
    release=Path(deployment['release_path']);assert release.resolve()==release and not any(path.is_symlink() for path in release.rglob('*'))
    assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(deployment['files'])
    assert len(deployment['files'])==58 and all(sha((release/name).read_bytes())==digest for name,digest in deployment['files'].items())
    expected=json.loads(json.dumps(deployment['before']));nginx=str(ops['PROTECTED'][0]);expected['files'][nginx]=ui['nginx_after_sha256']
    for name in ['musikzimmer.wam']:
        path='/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview/'+name;expected['files'][path]=wrapped['newWamSha256']
    manifest='/opt/wvh-hall-audio/private/castle-wams.manifest.json';expected['files'][manifest]=wrapped['after']['files'][manifest]
    assert expected==wrapped['after'],'Historical piano acceptance differs'
    health_path=Path('/opt/wvh-hall-audio/private/health-maintenance.json');health_repair=False
    if health_path.exists():
        assert health_path.resolve()==health_path and health_path.stat().st_mode&0o777==0o600
        repair=json.loads(health_path.read_text());assert repair['passed'] and repair['before']==expected
        before,after=repair['before'],repair['after'];name='wvh-hall-audio'
        assert before['files']==after['files'] and {k:v for k,v in before['services'].items() if k!=name}=={k:v for k,v in after['services'].items() if k!=name}
        hall=ops['inspect'](name)
        assert hall['Id']==repair['gatewayAfterId']==after['services'][name]['id'] and hall['Image']==repair['image']
        assert hall['Config']['Healthcheck']==repair['healthConfig'] and hall['State']['Health']['Status']=='healthy'
        assert hashlib.sha256(json.dumps(hall['Config'],sort_keys=True).encode()).hexdigest()==repair['configAfterSha256']
        assert hashlib.sha256(json.dumps(hall['HostConfig'],sort_keys=True).encode()).hexdigest()==repair['hostConfigSha256']
        assert all(sha(Path(path).read_bytes())==digest for path,digest in {**repair['applicationFiles'],**repair['protectedFiles']}.items())
        assert ops['inspect'](repair['rollbackContainer'])['Id']==repair['gatewayBeforeId'] and not ops['inspect'](repair['rollbackContainer'])['State']['Running']
        expected=after;health_repair=True
    assert ops['baseline']()==expected,'An unrelated protected file or existing service changed'
    assert ui['nginx_before_sha256']==deployment['nginx_after_sha256']
    for route,name in [('presence','presence.html'),('rounds','rounds.html'),('unowned-ui.js','unowned-ui.js')]:
        status,raw,headers=request('/castle-school/'+route);assert status==200 and sha(raw)==ui['files'][name]
        assert headers['Cache-Control']=='no-store' and "frame-ancestors 'self'" in headers['Content-Security-Policy']
    for route in ['','piano.js','audio.js','projection.js','keys.css','credits.html','vendor/tone.js']:
        status,raw,headers=request('/castle-piano/'+route);assert status==200 and raw==(release/('castle-piano/public/'+(route or 'index.html'))).read_bytes()
        assert headers['Cache-Control']=='no-store' and "worker-src 'none'" in headers['Content-Security-Policy']
    assert request('/castle-piano/session',{})[0]==401 and request('/castle-piano/server.cjs')[0]==404 and request('/castle-school/round-context')[0]==401
    for path in ['/castle-piano/health','/castle-school/health']:
        status,raw,_=request(path);assert status==200 and json.loads(raw)=={'ready':True}
    publication=json.loads(Path('/tmp/wvh-castle-runtime-publication.json').read_text());assert publication['passed'] and len(publication['files'])==29
    sources={item['file']:item['sha256'] for item in publication['files']};assert publication['head']==wrapped['sourceCommit']
    for name,digest in native['sourceFiles'].items():
        assert sources['castle/'+name]==digest
        with urllib.request.urlopen('https://wvh-web.github.io/workadventure_outside01/castle/'+name+'?v='+publication['head'][:12],timeout=20) as response:assert sha(response.read(2000000))==digest
    ops['atomic'](private/'accepted-native-live-proof.json',native)
    result={'passed':True,'release':deployment['release'],'helperRelease':ui['release'],'sourceCommit':publication['head'],
      'nativeLiveProofSha256':sha(native_raw),'normalMicrosoftPupils':2,'mouseAndMobileTouch':True,'parallelTableSpeechDecodedBoth':True,
      'onlyMusicPreviewWrapperChanged':True,'existingContainersAndOtherMapsUnchanged':not health_repair,
      'allOtherServicesPreservedExceptVerifiedHallHealthRepair':True,'hallHealthRepairVerified':health_repair,'historicalManifestsPreserved':True,
      'permissionsAndAuthenticationUnchanged':True,'stageStopped':True,'healthy':True,'loadApprovalFor400':False,
      'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    ops['atomic'](private/'published-acceptance.json',result);print(json.dumps(result,indent=2))
if __name__=='__main__':main()
