"""Publish only the accepted round-directory school service, with exact rollback and no map or web-config change."""
import json
import os
from pathlib import Path
import runpy
import time
import urllib.error
import urllib.request

NAME='wvh-castle-school'
def preserved(before,after,record_path):
    assert {key:value for key,value in before['services'].items() if key!=NAME}=={key:value for key,value in after['services'].items() if key!=NAME}
    assert {key:value for key,value in before['files'].items() if key!=str(record_path)}=={key:value for key,value in after['files'].items() if key!=str(record_path)}
def accepted(proof):
    assert proof['passed'] and proof['stageOnly'] and proof['realNativeWorkAdventure'] and proof['errors']==[]
    assert proof['mapsModifiedOnlyInsideTestBrowsers'] and proof['realClassOverrideOnlyInStage'] and not proof['productionSchoolAndWebConfigChanged']
    assert not proof['loadApprovalFor400'] and len(proof['results'])==2
    assert proof['results'][0]['normalMicrosoftPupils']==2
    assert all(value is True for key,value in proof['results'][0].items() if key not in ['case','normalMicrosoftPupils'])
    assert all(value is True for key,value in proof['results'][1].items() if key!='case')
def request(base,route,token=None,body=None):
    headers={'Origin':'https://together.deine-schule.com','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(base+route,headers=headers,data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'POST')
    try:response=urllib.request.urlopen(req,timeout=12)
    except urllib.error.HTTPError as error:response=error
    raw=response.read(100000);assert not token or token.encode() not in raw
    value=json.loads(raw);assert all(key not in raw for key in [b'identifier',b'classId',b'gradeLevel',b'birthdate',b'accessToken',b'userPrincipalName'])
    return response.status,value
def readiness(base):
    for _ in range(50):
        try:
            if request(base,'health')==(200,{'ready':True}):return
        except Exception:pass
        time.sleep(.3)
    raise RuntimeError('Round service readiness failed')
def legacy(base,tokens):
    for token in tokens.values():
        status,value=request(base,'context',token)
        assert status==200 and value['account']=={'kind':'student','schoolAccount':True}
        assert len(value['offers'])==7 and not any(offer['allowed'] for offer in value['offers'])
    assert request(base,'context')[0]==401
def audit(base,tokens):
    api=lambda who,route,body=None:request(base,route,tokens[who],body)
    assert request(base,'round-context')[0]==401 and request(base,'round-context','forged')[0]==401
    contexts={who:api(who,'round-context') for who in tokens}
    for status,value in contexts.values():
        assert status==200 and value['account']=={'kind':'student','schoolAccount':True}
        assert 'leaseId' not in json.dumps(value)
    a=contexts['A'][1];b=contexts['B'][1]
    assert any(target['mapId']=='grundschule' for target in a['targets']) and not any(target['mapId']=='mittelstufe' for target in a['targets'])
    assert any(target['mapId']=='mittelstufe' for target in b['targets']) and not any(target['mapId']=='grundschule' for target in b['targets'])
    assert all(any(target['id']=='bibliothek-buchclub' for target in value['targets']) for value in [a,b]),'Stage-only class override must not reach production'
    leases={};rid=None
    try:
        status,made=api('A','round-create',{'targetId':'bibliothek-buchclub','kind':'talk','capacity':2});assert status==200
        leases['A']=made['leaseId'];rid=made['round']['id']
        status,joined=api('B','round-join',{'roundId':rid});assert status==200 and joined['round']['registered']==2
        leases['B']=joined['leaseId'];assert api('A','round-close',{'roundId':rid})[0]==403
        assert api('A','round-leave',{'leaseId':leases.pop('A')})[0]==200
        assert api('B','round-heartbeat',{'leaseId':leases['B']})[1]['round']['registered']==1
        assert api('B','round-leave',{'leaseId':leases.pop('B')})[0]==200
        for who,target in [('A','mittelstufe-spieltisch'),('B','grundschule-lesekamin')]:
            assert api(who,'round-create',{'targetId':target,'kind':'talk','capacity':2})[0]==403
            assert api(who,'round-create',{'targetId':target,'kind':'talk','capacity':2,'age':99})[0]==400
        legacy(base,tokens)
        assert all(all(row['id']!=rid for row in api(who,'round-context')[1]['rounds']) for who in tokens)
    finally:
        for who,lease in leases.items():api(who,'round-leave',{'leaseId':lease})
    return {'normalMicrosoftPupils':2,'freshSchoolAndGradeRules':True,'sharedCommonAreaAcrossCohorts':True,
      'stageClassOverrideNotPublished':True,'creatorMayLeave':True,'noPupilModerationOrBrowserRoleOverrides':True,
      'oldSevenOfferCatalogUnchanged':True,'ownTestRegistrationsRemoved':True,'portalRoomLinksWritten':False}
def rollback(ops,backup,old_id,release_id,release):
    if ops['exists'](backup):
        assert ops['inspect'](backup)['Id']==old_id
        if ops['exists'](NAME):
            failed=ops['inspect'](NAME)
            assert failed['Id']!=old_id and failed['Config']['Labels'].get('wvh.release')==release_id
            assert any(mount['Source']==str(release) and not mount['RW'] for mount in failed['Mounts'])
            ops['run']('docker','stop','-t','8',NAME);ops['run']('docker','rm',NAME)
        ops['run']('docker','rename',backup,NAME);ops['run']('docker','start',NAME)
    else:
        assert ops['inspect'](NAME)['Id']==old_id
        if not ops['inspect'](NAME)['State']['Running']:ops['run']('docker','start',NAME)
def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-rounds-ops.py')
    sha=ops['sha'];record_path=ops['RECORD'];record_raw=record_path.read_bytes()
    assert sha(record_raw)==ops['EXPECTED_RECORD'] and sha(ops['ARCHIVE'].read_bytes())==ops['EXPECTED_ARCHIVE']
    stage=json.loads(ops['STAGE'].read_text());assert stage['stopped'] is True and not ops['exists'](ops['NAME'])
    assert stage['api_proof']['exactClassAndRuleAgainstFreshSchoolDatabase'] and stage['release_id']==ops['EXPECTED_ARCHIVE'][:16]
    proof_raw=(ops['PRIVATE']/'rounds-native-stage-proof.json').read_bytes()
    assert sha(proof_raw)==stage['native_proof_sha256'];accepted(json.loads(proof_raw))
    final=json.loads((ops['PRIVATE']/'rounds-preflight-final.json').read_text());assert final['passed'] and final['stageStopped'] and final['candidate']==stage['release_id']
    ops['unchanged'](stage['before']);before=ops['baseline']()
    release=Path(stage['release']);assert release==ops['BASE']/'releases'/stage['release_id'] and release.resolve()==release
    assert not any(path.is_symlink() for path in release.rglob('*'))
    assert {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}==set(stage['files'])
    assert len(stage['files'])==40 and all(sha((release/file).read_bytes())==digest for file,digest in stage['files'].items())
    targets=json.loads((release/'castle-school/round-targets.json').read_text());assert len(targets)==49 and all(target['rule']['classIds'] is None for target in targets)
    token_path=ops['TOKEN'];assert token_path.resolve()==token_path and not token_path.is_symlink() and token_path.parent.stat().st_mode&0o777==0o700
    token_path.chmod(0o600);tokens=json.loads(token_path.read_text());assert set(tokens)=={'A','B'}
    old=ops['inspect'](NAME);old_record=json.loads(record_raw);backup=NAME+'-before-rounds-'+stage['release_id']
    assert old['State']['Health']['Status']=='healthy' and old['Config']['User']=='1000:1000' and old['HostConfig']['ReadonlyRootfs']
    assert not ops['exists'](backup) and any(mount['Source']==old_record['release'] and not mount['RW'] for mount in old['Mounts'])
    legacy('https://together.deine-schule.com/castle-school/',tokens)
    backup_record=ops['PRIVATE']/('deployment-before-rounds-'+stage['release_id']+'.json')
    if backup_record.exists():assert backup_record.read_bytes()==record_raw
    else:backup_record.write_bytes(record_raw);backup_record.chmod(0o600)
    ops['unchanged'](before)
    updated_raw=None
    try:
        ops['run']('docker','stop','-t','10',NAME);ops['run']('docker','rename',NAME,backup)
        created=ops['run']('docker','run','-d','--name',NAME,'--restart','unless-stopped','--network','workadventure_default',
          '--workdir','/srv/release','--user','1000:1000','-p','127.0.0.1:3211:3211','--env-file',str(ops['PRIVATE']/'runtime.env'),
          '--label','wvh.component=castle-school','--label','wvh.release='+stage['release_id'],
          '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly',
          '--mount','type=bind,src='+str(ops['PRIVATE']/'rules.json')+',dst=/srv/rules.json,readonly',
          '--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges:true',
          '--memory','256m','--cpus','0.5','--log-opt','max-size=2m','--log-opt','max-file=2',
          '--health-cmd',old['Config']['Healthcheck']['Test'][-1],'--health-interval','15s','--health-timeout','3s',
          '--health-start-period','5s','--health-retries','3','--entrypoint','node',old['Image'],'/srv/release/castle-school/server.cjs').strip()
        readiness('http://127.0.0.1:3211/castle-school/');proof=audit('https://together.deine-schule.com/castle-school/',tokens)
        for _ in range(30):
            current=ops['inspect'](NAME);assert current['Id']==created and current['Image']==old['Image']
            if current['State']['Health']['Status']=='healthy':break
            time.sleep(1)
        else:raise RuntimeError('Dedicated rounds service healthcheck failed')
        assert record_path.read_bytes()==record_raw;preserved(before,ops['baseline'](),record_path)
        nginx_path='/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf'
        updated={**old_record,'release':str(release),'files':stage['files'],'archive_sha256':ops['EXPECTED_ARCHIVE'],
          'source_files':40,'previous_release':old_record['release'],'previous_rounds_container':backup,
          'round_directory_service_live':True,'node_code_only_update':True,'nginx_observed_sha256':before['files'][nginx_path],
          'native_rounds_preflight_sha256':stage['native_proof_sha256']}
        updated_raw=(json.dumps(updated,indent=2)+'\n').encode();ops['atomic'](record_path,updated)
        assert record_path.read_bytes()==updated_raw
        preserved(before,ops['baseline'](),record_path)
        result={**proof,'passed':True,'release':stage['release_id'],'onlySchoolServiceReplaced':True,
          'workAdventureAndExistingMapsUnchanged':True,'previousContainerRetained':True,'nginxAndAuthFilesUnchanged':True,
          'historicalNginxManifestPreserved':True,'productionClassOverride':False,'mapFlagsEnabled':False,
          'checked_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'loadApprovalFor400':False}
        ops['atomic'](ops['PRIVATE']/'rounds-live-check.json',{'before':before,'image':old['Image'],'containerId':created,**result})
        print(json.dumps(result,indent=2))
    except Exception:
        rollback(ops,backup,old['Id'],stage['release_id'],release)
        if updated_raw is not None:
            current_record=record_path.read_bytes()
            if current_record==updated_raw:record_path.write_bytes(record_raw);record_path.chmod(0o600)
            else:assert current_record==record_raw
        readiness('http://127.0.0.1:3211/castle-school/')
        raise RuntimeError('Round-directory update failed; previous school service restored') from None
if __name__=='__main__':main()
