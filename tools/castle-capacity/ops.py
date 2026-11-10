"""Isolated, bounded media-test room; no school identities, routes, maps or other rooms are modified."""
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import runpy
import secrets
import subprocess
import time
import urllib.request
import urllib.parse

BASE=Path('/opt/wvh-castle-capacity/private')
LEASE=BASE/'media-lease.json'
HANDOFF=Path('/home/wilhelm/.cache/wvh-school-qa/capacity-handoff.private.json')
NAME=re.compile(r'^castle-capacity-[a-f0-9]{24}$')
PREFIX=re.compile(r'^castlecap[a-f0-9]{24}$')
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE,timeout=20)


def atomic(path,value):
    temporary=path.with_name(path.name+'.writing');assert not temporary.exists()
    temporary.write_text(json.dumps(value,indent=2)+'\n');temporary.chmod(0o600);temporary.replace(path)


def running():
    ids=run('docker','ps','-q').split()
    return {item['Name'].lstrip('/'):{'id':item['Id'],'started':item['State']['StartedAt'],'image':item['Image']}
            for item in json.loads(run('docker','inspect',*ids))}


def baseline():
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    return {'protected':ops['baseline'](),'running':running()}


def media(operation,room='',prefix=''):
    assert operation in ['status','create','delete','export']
    assert not room or NAME.fullmatch(room)
    assert not prefix or PREFIX.fullmatch(prefix)
    code=r'''
const {loadConfig}=require('/srv/hall-audio/config.cjs'),{RoomServiceClient}=require('livekit-server-sdk');
const config=loadConfig(),client=new RoomServiceClient(config.livekit.apiUrl,config.livekit.apiKey,config.livekit.apiSecret);
const [operation,room,prefix]=process.argv.slice(1);
async function main(){
 if(operation==='export')return {url:config.livekit.browserUrl,apiKey:config.livekit.apiKey,apiSecret:config.livekit.apiSecret};
 if(operation==='create'){
  const rooms=await client.listRooms();if(rooms.some(value=>value.name===room))throw Error('Room already exists');
  await client.createRoom({name:room,emptyTimeout:300,departureTimeout:5,maxParticipants:402,metadata:'Synthetic castle capacity probe; no school users.'});
 }
 if(operation==='delete'){
  const rooms=await client.listRooms();if(!rooms.some(value=>value.name===room))return {deleted:true};
  const participants=await client.listParticipants(room);
  if(participants.some(value=>!value.identity.startsWith(prefix+'_')))throw Error('Unexpected participant');
  await client.deleteRoom(room);return {deleted:true};
 }
 const rooms=await client.listRooms();
 return {ownRooms:rooms.filter(value=>value.name===room).length,ownParticipants:rooms.filter(value=>value.name===room).reduce((n,value)=>n+value.numParticipants,0),
  otherParticipants:rooms.filter(value=>value.name!==room).reduce((n,value)=>n+value.numParticipants,0)};
}
main().then(value=>console.log(JSON.stringify(value))).catch(()=>{console.error('Scoped media operation failed');process.exitCode=1;});
'''
    return json.loads(run('docker','exec','wvh-hall-audio','node','-e',code,operation,room,prefix))


def load_lease():
    assert LEASE.resolve()==LEASE and LEASE.stat().st_mode&0o777==0o600
    value=json.loads(LEASE.read_text());assert value['version']==1 and NAME.fullmatch(value['room']) and PREFIX.fullmatch(value['prefix'])
    assert value['prefix']=='castlecap'+value['room'].removeprefix('castle-capacity-')
    return value


def resources():
    info=dict(line.split(':',1) for line in Path('/proc/meminfo').read_text().splitlines())
    counters=[int(value) for value in Path('/proc/stat').read_text().splitlines()[0].split()[1:9]]
    return {'availableMiB':int(info['MemAvailable'].split()[0])//1024,'loadAverage':os.getloadavg()[0],'cpus':os.cpu_count(),
            'cpu':{'total':sum(counters),'idle':counters[3]+counters[4]}}


def healthy():
    for route in ['/castle-audio/health','/castle-school/health','/castle-piano/health']:
        try:
            with urllib.request.urlopen('http://127.0.0.1:'+('3210' if 'audio' in route else '3211' if 'school' in route else '3241')+route,timeout=2) as response:
                if response.status!=200 or json.load(response)!={'ready':True}:return False
        except Exception:return False
    return True


def observe():
    lease=load_lease();assert lease['state']=='prepared'
    if HANDOFF.exists():
        assert not HANDOFF.is_symlink() and json.loads(HANDOFF.read_text())['room']==lease['room'];HANDOFF.unlink()
    status=media('status',lease['room'],lease['prefix']);resource=resources()
    previous=lease.get('lastCpu');cpu=resource.pop('cpu');lease['lastCpu']=cpu
    busy=100*(1-(cpu['idle']-previous['idle'])/(cpu['total']-previous['total'])) if previous and cpu['total']>previous['total'] else 0
    resource['cpuBusyPercent']=round(busy,2)
    preserved=baseline()==lease['before']
    safe=preserved and lease['expiresAt']>int(time.time()) and status['otherParticipants']==0 and status['ownParticipants']<=401 and resource['availableMiB']>=2000 and busy<90 and resource['loadAverage']<resource['cpus']*1.5 and healthy()
    sample={'room':lease['room'],'safeToContinue':safe,'existingPlatformUnchanged':preserved,'media':status,'resources':resource,'at':int(time.time())}
    lease['samples'].append(sample);atomic(LEASE,lease)
    print(json.dumps(sample))
    return sample


def prepare(export_handoff=True):
    os.umask(0o077);assert not BASE.is_symlink()
    BASE.mkdir(mode=0o700,parents=True,exist_ok=True);BASE.chmod(0o700)
    assert not HANDOFF.exists() and HANDOFF.parent.stat().st_mode&0o777==0o700
    if LEASE.exists():assert load_lease()['state']=='closed'
    before=baseline();status=media('status');resource=resources()
    assert status['otherParticipants']==0 and resource['availableMiB']>=2500 and healthy(),'Existing activity or insufficient resources'
    nonce=secrets.token_hex(12);room='castle-capacity-'+nonce;prefix='castlecap'+nonce
    expires=int(time.time())+1200;created=False
    try:
        status=media('create',room,prefix);created=True
        assert status['ownRooms']==1 and status['ownParticipants']==0 and status['otherParticipants']==0
        lease={'version':1,'state':'prepared','room':room,'prefix':prefix,'expiresAt':expires,'before':before,'samples':[],
               'generator':'external-windows' if export_handoff else 'bounded-server-process'}
        atomic(LEASE,lease)
        if export_handoff:
            credentials=media('export');url=urllib.parse.urlsplit(credentials['url'])
            assert url.scheme=='wss' and url.hostname=='together.deine-schule.com' and not url.username and not url.password and url.port in [None,443] and not url.query and not url.fragment
            atomic(HANDOFF,{'version':1,**credentials,'room':room,'prefix':prefix,'expiresAt':expires})
            owner=pwd.getpwnam('wilhelm');os.chown(HANDOFF,owner.pw_uid,owner.pw_gid)
        assert baseline()==before
        print(json.dumps({'prepared':True,'noRealParticipants':True,'privateHandoff':export_handoff,'roomCreatedOnlyForSyntheticTest':True,'expiresInSeconds':1200}))
        return lease
    except BaseException:
        if HANDOFF.exists():HANDOFF.unlink()
        if created:media('delete',room,prefix)
        raise RuntimeError('Media-test preparation failed; no existing room was modified') from None


def cleanup(expected_room):
    lease=load_lease();assert lease['state']=='prepared'
    assert expected_room==lease['room'] and NAME.fullmatch(expected_room),'Cleanup belongs to another test'
    if HANDOFF.exists():
        assert not HANDOFF.is_symlink() and json.loads(HANDOFF.read_text())['room']==lease['room'];HANDOFF.unlink()
    assert media('delete',lease['room'],lease['prefix'])=={'deleted':True}
    assert media('status',lease['room'],lease['prefix'])['ownRooms']==0
    after=baseline();preserved=after==lease['before']
    lease.update(state='closed',after=after,closedAt=int(time.time()));atomic(LEASE,lease)
    result={'closed':True,'room':lease['room'],'ownTestRoomRemoved':True,'privateHandoffRemoved':not HANDOFF.exists(),'existingPlatformAndMapsUnchanged':preserved,
            'samples':len(lease['samples']),'maximumObservedParticipants':max([sample['media']['ownParticipants'] for sample in lease['samples']],default=0)}
    print(json.dumps(result))
    return result
