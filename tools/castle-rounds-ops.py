"""Guarded, isolated rounds preflight. No production container, route or school data changes."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request
import zipfile

BASE=Path('/opt/wvh-castle-school');PRIVATE=BASE/'private';RECORD=PRIVATE/'deployment.json'
ARCHIVE=Path('/tmp/wvh-castle-school.zip');NAME='wvh-castle-rounds-stage'
TOKEN=Path('/home/wilhelm/.cache/wvh-school-qa/live-token-handoff.private.json')
STAGE=PRIVATE/'rounds-stage.json';PORT=13212
EXPECTED_RECORD='8ab037eaf6abdf5bbe1d98d222adb3b7213673f42970c284b522af857d9b99ef'
EXPECTED_ARCHIVE='6973432bdfccee7c96fafd7ffe161d2d05161842e9e37cb9843281b607ef52cc'
ROOMS={'atelier','bibliothek','dorf','erdgeschoss','grosse-halle','grundschule','kino','mittelstufe',
 'museum','musikzimmer','obergeschoss','oberstufe','park','spielesaal','sternwarte','umgebung'}
ADDED={'castle-school/rounds.cjs','castle-school/round-targets.json'}|{
 'castle-school/public/'+name for name in ['rounds.html','rounds.js','rounds.css','round-client.js','presence.html','presence.js','presence.css']}
ADDED|={'castle-school/public/round-rooms/'+room+'.webp' for room in ROOMS}
SERVICES=['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio',
 'wvh-castle-school','wvh-castle-chess','wvh-castle-art','wvh-castle-art-board']
PROTECTED=[Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf'),
 Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-role-lookup.php'),
 Path('/var/www/vhosts/deine-schule.com/httpdocs/workadventure-castle-context.php'),
 Path('/var/www/vhosts/deine-schule.com/private/castle-school/profile.php'),
 PRIVATE/'runtime.env',PRIVATE/'rules.json',RECORD,
 Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json')]
BOOTSTRAP=r'''const fs=require('node:fs'),assert=require('node:assert/strict');
const {createSchoolServer}=require('/srv/release/castle-school/server.cjs');
const {createSchoolVerifier}=require('/srv/release/castle-school/identity.cjs');
const {createLookup}=require('/srv/release/castle-school/lookup.cjs');
const {createOfferLookup}=require('/srv/release/castle-school/catalog.cjs');
const {GatewayError}=require('/srv/release/hall-audio/errors.cjs');
async function main(){
 const secret=process.env.SECRET_KEY,key=process.env.CASTLE_SCHOOL_LOOKUP_KEY;
 const verify=createSchoolVerifier(secret),lookup=createLookup({url:'https://www.deine-schule.com/workadventure-castle-context.php',key});
 const tokens=JSON.parse(fs.readFileSync('/srv/qa/tokens.private.json','utf8')),profiles={};
 for(const id of ['A','B']){const auth=await verify('Bearer '+tokens[id]);profiles[id]=await lookup(auth.schoolIdentifier??auth.identifier);
   assert.equal(profiles[id].eligible,true);assert.equal(profiles[id].kind,'student');}
 assert.equal(profiles.A.gradeLevel,3);assert.equal(profiles.B.gradeLevel,7);assert.notEqual(profiles.A.classId,profiles.B.classId);
 const targets=JSON.parse(fs.readFileSync('/srv/release/castle-school/round-targets.json','utf8'));
 const own=targets.find(target=>target.id==='bibliothek-buchclub');assert.ok(own);own.rule.classIds=[profiles.A.classId];
 const server=createSchoolServer({config:{origin:'https://together.deine-schule.com',secret,trustedProxyIps:[]},
   verify,lookup,roundTargets:targets,getOffers:createOfferLookup({key}),
   updateRoomLink:async()=>{throw new GatewayError(503,'staging_read_only');}});
 await new Promise(resolve=>server.listen(3211,'0.0.0.0',resolve));
 for(const event of ['SIGINT','SIGTERM'])process.once(event,()=>{server.close();server.closeIdleConnections();});
 console.info('Isolated castle rounds ready; portal writes disabled.');
}
main().catch(()=>{console.error('Isolated castle rounds startup failed.');process.exitCode=1;});
'''
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def inspect(name):return json.loads(run('docker','inspect',name))[0]
def exists(name):return bool(run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip())
def atomic(path,value):
    temporary=path.with_name(path.name+'.rounds-staging');assert not temporary.exists()
    temporary.write_text(json.dumps(value,indent=2)+'\n');temporary.chmod(0o600);temporary.replace(path)
def baseline():
    states={}
    for name in SERVICES:
        value=inspect(name);assert value['State']['Running']
        states[name]={'id':value['Id'],'started':value['State']['StartedAt']}
    files={str(path):sha(path.read_bytes()) for path in PROTECTED}
    maps=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
    for path in maps.iterdir():
        assert path.is_file() and not path.is_symlink() and path.name.endswith('.wam')
        files[str(path)]=sha(path.read_bytes())
    return {'files':files,'services':states}
def unchanged(before):
    assert baseline()==before,'Existing platform, map or protected configuration changed'
def request(route,token=None,body=None,port=PORT):
    headers={'Origin':'https://together.deine-schule.com','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(f'http://127.0.0.1:{port}/castle-school/'+route,headers=headers,
      data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'POST')
    try:response=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as error:response=error
    raw=response.read(100000);assert not token or token.encode() not in raw
    return response.status,json.loads(raw)
def ready():
    for _ in range(50):
        try:
            if request('health')==(200,{'ready':True}):return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('Isolated round service not ready')
def audit(tokens):
    def api(account,route,body=None):return request(route,tokens[account],body)
    assert request('round-context')[0]==401 and request('round-context','forged')[0]==401
    contexts={account:api(account,'round-context') for account in tokens}
    for status,value in contexts.values():
        assert status==200 and value['account']=={'kind':'student','schoolAccount':True} and value['rounds']==[]
        assert all(key not in json.dumps(value) for key in ['classId','gradeLevel','birthdate','identifier','targetUrl','leaseId'])
    a=contexts['A'][1];b=contexts['B'][1]
    assert any(target['mapId']=='grundschule' for target in a['targets']) and not any(target['mapId']=='mittelstufe' for target in a['targets'])
    assert any(target['mapId']=='mittelstufe' for target in b['targets']) and not any(target['mapId']=='grundschule' for target in b['targets'])
    assert any(target['id']=='bibliothek-buchclub' for target in a['targets']) and not any(target['id']=='bibliothek-buchclub' for target in b['targets'])
    leases={}
    try:
        status,made=api('A','round-create',{'targetId':'bibliothek-lesekamin','kind':'read','capacity':4});assert status==200
        leases['A']=made['leaseId'];rid=made['round']['id']
        status,joined=api('B','round-join',{'roundId':rid});assert status==200 and joined['round']['registered']==2
        leases['B']=joined['leaseId']
        assert api('A','round-close',{'roundId':rid})[0]==403
        assert api('A','round-leave',{'leaseId':leases.pop('A')})[0]==200
        assert api('B','round-heartbeat',{'leaseId':leases['B']})[1]['round']['registered']==1
        assert api('B','round-leave',{'leaseId':leases.pop('B')})[0]==200
        status,exclusive=api('A','round-create',{'targetId':'bibliothek-buchclub','kind':'talk','capacity':2});assert status==200
        leases['A']=exclusive['leaseId'];rid=exclusive['round']['id']
        assert api('B','round-visit',{'roundId':rid})[0]==403 and api('B','round-join',{'roundId':rid})[0]==403
        assert api('B','round-create',{'targetId':'bibliothek-buchclub','kind':'talk','capacity':2})[0]==403
        assert api('A','round-leave',{'leaseId':leases.pop('A')})[0]==200
        for account,target in [('A','mittelstufe-spieltisch'),('B','grundschule-lesekamin')]:
            assert api(account,'round-create',{'targetId':target,'kind':'talk','capacity':2})[0]==403
        for account in tokens:
            status,old=api(account,'context');assert status==200 and len(old['offers'])==7 and not any(offer['allowed'] for offer in old['offers'])
            assert api(account,'round-context')[1]['rounds']==[]
    finally:
        for account,lease in leases.items():api(account,'round-leave',{'leaseId':lease})
    return {'normalMicrosoftPupils':2,'freshSchoolAuthorization':True,'sharedRoundAndCreatorDeparture':True,
      'realGradeSeparation':True,'exactClassAndRuleAgainstFreshSchoolDatabase':True,'noStudentModeration':True,
      'oldSevenOfferCatalogPreserved':True,'portalWritesDisabled':True,'stageRoundsCleaned':True}
def stop():
    record=json.loads(STAGE.read_text());assert record['name']==NAME
    qa=Path(record['qa']);assert qa==PRIVATE/('rounds-stage-'+record['release_id']) and qa.resolve()==qa
    assert {path.name for path in qa.iterdir()}=={'tokens.private.json','bootstrap.cjs'}
    assert all(path.is_file() and not path.is_symlink() for path in qa.iterdir())
    value=inspect(NAME);assert value['Id']==record['id'] and value['Config']['Labels']['wvh.component']=='castle-rounds-stage'
    assert value['Config']['Labels']['wvh.release']==record['release_id']
    run('docker','stop','-t','8',NAME);run('docker','rm',NAME)
    for filename in ['tokens.private.json','bootstrap.cjs']:
        target=qa/filename;assert not target.is_symlink();target.unlink()
    qa.rmdir()
    unchanged(record['before']);record['stopped']=True;record['stopped_at_utc']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
    atomic(STAGE,record)
    print(json.dumps({'stopped':True,'existingPlatformAndMapsUnchanged':True}))
def stage():
    os.umask(0o077)
    assert sha(RECORD.read_bytes())==EXPECTED_RECORD and sha(ARCHIVE.read_bytes())==EXPECTED_ARCHIVE
    old_record=json.loads(RECORD.read_text());old_release=Path(old_record['release']);old=inspect('wvh-castle-school')
    assert old_release==BASE/'releases/2f5b9d8b0c668074' and old_release.resolve()==old_release
    assert old['State']['Health']['Status']=='healthy' and old['Config']['User']=='1000:1000' and old['HostConfig']['ReadonlyRootfs']
    assert all(sha((old_release/file).read_bytes())==digest for file,digest in old_record['files'].items())
    allowed=set(old_record['files'])|ADDED
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert set(archive.namelist())==allowed and len(archive.infolist())==len(allowed) and sum(info.file_size for info in archive.infolist())<2000000
        payload={file:archive.read(file) for file in allowed}
    assert {file for file in old_record['files'] if sha(payload[file])!=old_record['files'][file]}=={'castle-school/server.cjs'}
    env=dict(item.split('=',1) for item in old['Config']['Env'] if '=' in item)
    assert all(env[key].encode() not in raw for key in ['SECRET_KEY','CASTLE_SCHOOL_LOOKUP_KEY'] for raw in payload.values())
    assert not exists(NAME) and not run('ss','-ltnH','sport = :13212').strip()
    assert not STAGE.exists() or json.loads(STAGE.read_text()).get('stopped') is True
    assert TOKEN.resolve()==TOKEN and not TOKEN.is_symlink() and TOKEN.parent.stat().st_mode&0o777==0o700
    TOKEN.chmod(0o600);tokens=json.loads(TOKEN.read_text());assert set(tokens)=={'A','B'}
    assert all(isinstance(token,str) and len(token)<32768 for token in tokens.values())
    release_id=EXPECTED_ARCHIVE[:16];release=BASE/'releases'/release_id
    if release.exists():
        assert release.resolve()==release and not any(path.is_symlink() for path in release.rglob('*'))
        assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==allowed
        assert all(sha((release/file).read_bytes())==sha(raw) for file,raw in payload.items())
    else:
        release.mkdir(mode=0o755);release.chmod(0o755)
        for file,raw in payload.items():
            assert not file.startswith('/') and '\\' not in file and '..' not in file.split('/')
            target=release/file;target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);target.write_bytes(raw);target.chmod(0o644)
        for directory in release.rglob('*'):
            if directory.is_dir():directory.chmod(0o755)
    qa=PRIVATE/('rounds-stage-'+release_id);qa.mkdir(mode=0o700,exist_ok=True);qa.chmod(0o700);os.chown(qa,1000,1000)
    for name,raw in [('tokens.private.json',TOKEN.read_bytes()),('bootstrap.cjs',BOOTSTRAP.encode())]:
        target=qa/name;assert not target.is_symlink();target.write_bytes(raw);target.chmod(0o600);os.chown(target,1000,1000)
    before=baseline();health=old['Config']['Healthcheck']['Test'][-1]
    try:created=run('docker','run','-d','--name',NAME,'--restart','no','--network','workadventure_default',
      '--workdir','/srv/release','--user','1000:1000','-p',f'127.0.0.1:{PORT}:3211','--env-file',str(PRIVATE/'runtime.env'),
      '--label','wvh.component=castle-rounds-stage','--label','wvh.release='+release_id,
      '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--mount','type=bind,src='+str(qa)+',dst=/srv/qa,readonly',
      '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges:true',
      '--memory','256m','--cpus','0.5','--log-opt','max-size=2m','--log-opt','max-file=2',
      '--health-cmd',health,'--health-interval','15s','--health-timeout','3s','--health-start-period','5s','--health-retries','3',
      '--entrypoint','node',old['Image'],'/srv/qa/bootstrap.cjs').strip()
    except Exception:
        if exists(NAME):
            value=inspect(NAME);assert value['Config']['Labels']['wvh.component']=='castle-rounds-stage' and value['Config']['Labels']['wvh.release']==release_id
            run('docker','rm',NAME)
        for filename in ['tokens.private.json','bootstrap.cjs']:(qa/filename).unlink()
        qa.rmdir();unchanged(before)
        raise RuntimeError('Isolated rounds container could not start; no production service changed') from None
    record={'name':NAME,'id':created,'release_id':release_id,'release':str(release),'qa':str(qa),'before':before,
      'files':{file:sha(raw) for file,raw in payload.items()},'stopped':False,'real_class_override_stage_only':True}
    atomic(STAGE,record)
    try:
        ready();proof=audit(tokens);unchanged(before)
        assert inspect(NAME)['State']['Running']
        record['api_proof']=proof;atomic(STAGE,record)
        print(json.dumps({'passed':True,'stageRunning':True,'release':release_id,'onlyLoopbackPort':PORT,
          'existingPlatformAndMapsUnchanged':True,**proof,'liveNativeBrowserProof':False,'loadApprovalFor400':False},indent=2))
    except Exception:
        stop();raise RuntimeError('Isolated rounds preflight failed; stage stopped and platform preserved') from None
if __name__=='__main__':stage()
