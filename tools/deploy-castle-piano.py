"""Add only the separately tested, school-authorized piano service and its own web route."""
import json
import os
from pathlib import Path
import runpy
import time
import urllib.error
import urllib.request

NAME='wvh-castle-piano'
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
BLOCK=b'''
# School-authorized castle piano; no changes to other castle routes.
location ^~ /castle-piano/ {
    proxy_pass http://127.0.0.1:3241;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
    proxy_read_timeout 65s;
    client_max_body_size 2k;
}
'''
def appended(raw):
    assert b'/castle-piano/' not in raw and b'127.0.0.1:3241' not in raw
    assert b'/castle-school/' in raw and b'/castle-chess/' in raw and b'/castle-art/' in raw
    return raw+BLOCK
def preserved(before,after):
    assert before['services']==after['services']
    assert {key:value for key,value in before['files'].items() if key!=str(NGINX)}=={key:value for key,value in after['files'].items() if key!=str(NGINX)}
def accepted(proof,digest):
    assert proof['passed'] and proof['stageOnly'] and proof['archiveSha256']==digest
    assert proof['normalMicrosoftPupils']==2 and not proof['syntheticSchoolOverrides']
    assert proof['privateStagingTransportProxy'] and not proof['realPublicBrowserHandshake'] and not proof['loadApprovalFor400']
    for key in ['actualToneSampler','actualVpsPianoWebSockets','pupilsCannotModerate','opaqueSecureHttpOnlyCookie',
      'mouseAndMobileTouchHeardBothWays','practiceDoesNotBroadcast','freshSchoolRenewalObserved','creatorMayLeave',
      'remainingParticipantCanPlay','mobileNoOverflow']:assert proof[key] is True
    assert proof['errors']==[] and proof['transportCounts']['sent']>0 and proof['transportCounts']['received']>0
def request(base,route,body=None):
    req=urllib.request.Request(base+route,headers={'Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode())
    try:response=urllib.request.urlopen(req,timeout=8)
    except urllib.error.HTTPError as error:response=error
    return response.status,response.read(2000000),response.headers
def ready(base):
    for _ in range(50):
        try:
            status,raw,_=request(base,'health')
            if status==200 and json.loads(raw)=={'ready':True}:return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('Dedicated piano service readiness failed')
def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');sha=ops['sha'];private=ops['PRIVATE'];record=json.loads(ops['RECORD'].read_text())
    assert not record['stopped'] and record['name']==ops['NAME'] and not ops['exists'](NAME)
    assert not (private/'deployment.json').exists() and not ops['run']('ss','-ltnH','sport = :3241').strip()
    assert record['archive_sha256']==ops['EXPECTED_ARCHIVE']==sha(ops['ARCHIVE'].read_bytes())
    candidate=ops['inspect'](ops['NAME']);assert candidate['Id']==record['id'] and candidate['State']['Running']
    assert candidate['State']['Health']['Status']=='healthy' and candidate['Config']['Labels']['wvh.release']==record['release_id']
    release=Path(record['release']);assert release==ops['BASE']/'releases'/record['release_id'] and release.resolve()==release
    assert not any(path.is_symlink() for path in release.rglob('*'))
    assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(record['files'])
    assert len(record['files'])==58 and all(sha((release/name).read_bytes())==digest for name,digest in record['files'].items())
    proof_path=Path('/home/wilhelm/.cache/wvh-school-qa/piano-stage-proof.private.json')
    assert proof_path.resolve()==proof_path and not proof_path.is_symlink() and proof_path.parent.stat().st_mode&0o777==0o700
    proof_path.chmod(0o600);proof_raw=proof_path.read_bytes();accepted(json.loads(proof_raw),record['archive_sha256'])
    ops['unchanged'](record['before']);before=ops['baseline']();old=NGINX.read_bytes();new=appended(old)
    backup=private/('nginx-before-'+record['release_id']+'.private.conf');assert not backup.exists();backup.write_bytes(old);backup.chmod(0o600)
    school=ops['inspect']('wvh-castle-school');assert school['Image']==record['image'] and school['State']['Health']['Status']=='healthy'
    env=dict(item.split('=',1) for item in school['Config']['Env'] if '=' in item);proxy=env['CASTLE_SCHOOL_TRUSTED_PROXY_IPS']
    import ipaddress
    assert proxy and all(ipaddress.ip_address(value) for value in proxy.split(','))
    environment=private/'runtime.env';env_raw=environment.read_text();assert 'CASTLE_PIANO_TRUSTED_PROXY_IPS=' not in env_raw
    environment.write_text(env_raw+'CASTLE_PIANO_TRUSTED_PROXY_IPS='+proxy+'\n');environment.chmod(0o600)
    created=None;changed=False
    try:
        created=ops['run']('docker','run','-d','--name',NAME,'--restart','unless-stopped','--network','workadventure_default',
          '--workdir','/srv/release','--user','1000:1000','-p','127.0.0.1:3241:3241','--env-file',str(environment),
          '--label','wvh.component=castle-piano','--label','wvh.release='+record['release_id'],
          '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=8m',
          '--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','192m','--cpus','0.5','--log-opt','max-size=2m','--log-opt','max-file=2',
          '--health-cmd',candidate['Config']['Healthcheck']['Test'][-1],'--health-interval','15s','--health-timeout','3s',
          '--health-start-period','5s','--health-retries','3','--entrypoint','node',record['image'],'/srv/release/castle-piano/server.cjs').strip()
        ready('http://127.0.0.1:3241/castle-piano/');ops['unchanged'](before)
        assert NGINX.read_bytes()==old;NGINX.write_bytes(new);changed=True
        ops['run']('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');ops['run']('nginx','-t')
        ready('https://together.deine-schule.com/castle-piano/')
        base='https://together.deine-schule.com/castle-piano/'
        for route in ['','piano.js','audio.js','projection.js','keys.css','credits.html']:
            status,raw,headers=request(base,route);assert status==200 and raw==(release/('castle-piano/public/'+(route or 'index.html'))).read_bytes()
            assert headers['Cache-Control']=='no-store' and "frame-ancestors 'self'" in headers['Content-Security-Policy']
        assert request(base,'session',{})[0]==401 and request(base,'server.cjs')[0]==404
        for _ in range(30):
            value=ops['inspect'](NAME);assert value['Id']==created and value['Image']==record['image']
            if value['State']['Health']['Status']=='healthy':break
            time.sleep(1)
        else:raise RuntimeError('Piano service healthcheck failed')
        after=ops['baseline']();preserved(before,after);assert NGINX.read_bytes()==new
        result={'passed':True,'release':record['release_id'],'release_path':str(release),'archive_sha256':record['archive_sha256'],'files':record['files'],
          'containerId':created,'image':record['image'],'nginx_before_sha256':sha(old),'nginx_after_sha256':sha(new),'backup':str(backup),
          'stage_proof_sha256':sha(proof_raw),'before':before,'onlyNewPianoServiceAdded':True,'existingContainersAndMapsUnchanged':True,
          'historicalDeploymentManifestsUnchanged':True,'healthy':True,'nativeCastleIntegrationTested':False,'loadApprovalFor400':False,
          'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        ops['atomic'](private/'deployment.json',result);ops['atomic'](private/'accepted-stage-proof.json',json.loads(proof_raw))
        print(json.dumps({key:result[key] for key in ['passed','release','onlyNewPianoServiceAdded','existingContainersAndMapsUnchanged',
          'historicalDeploymentManifestsUnchanged','healthy','nativeCastleIntegrationTested','loadApprovalFor400']},indent=2))
    except Exception:
        if changed:
            assert NGINX.read_bytes() in [old,new]
            if NGINX.read_bytes()==new:NGINX.write_bytes(old);ops['run']('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');ops['run']('nginx','-t')
        if ops['exists'](NAME):
            value=ops['inspect'](NAME);assert value['Config']['Labels'].get('wvh.component')=='castle-piano' and value['Config']['Labels'].get('wvh.release')==record['release_id']
            if created:assert value['Id']==created
            ops['run']('docker','stop','-t','6',NAME);ops['run']('docker','rm',NAME)
        ops['unchanged'](before);raise RuntimeError('Piano publication failed; previous routes and services restored') from None
if __name__=='__main__':main()
