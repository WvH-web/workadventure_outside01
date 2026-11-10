"""Repair only the idle Hall container's inherited health check; preserve all application bytes/configuration."""
import copy
import hashlib
import http.client
import json
import os
from pathlib import Path
import runpy
import socket
import subprocess
import time
import urllib.request

NAME='wvh-hall-audio'
EXPECTED_ID='f17387c9a390bac5c552a3255e4c3824d86b1980e977c0f6c6fd936be693e5ed'
PRIVATE=Path('/opt/wvh-hall-audio/private')
RECORD=PRIVATE/'health-maintenance.json'
HEALTH=r'''const http=require('node:http');const request=http.get('http://127.0.0.1:3210/castle-audio/health',response=>{let body='';response.on('data',chunk=>{body+=chunk;if(body.length>1024){response.destroy();process.exit(1);}});response.on('error',()=>process.exit(1));response.on('end',()=>{try{process.exit(response.statusCode===200&&JSON.parse(body).ready===true?0:1);}catch{process.exit(1);}});});request.setTimeout(1500,()=>request.destroy());request.on('error',()=>process.exit(1));'''
HEALTH_CONFIG={'Test':['CMD','node','-e',HEALTH],'Interval':10000000000,'Timeout':3000000000,'StartPeriod':10000000000,'Retries':3}


def sha(raw):return hashlib.sha256(raw).hexdigest()


def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE,timeout=30)


def inspect(name):return json.loads(run('docker','inspect',name))[0]


def all_running():
    ids=run('docker','ps','-q').split()
    values=json.loads(run('docker','inspect',*ids)) if ids else []
    return {item['Name'].lstrip('/'):{'id':item['Id'],'started':item['State']['StartedAt'],'image':item['Image'],
                                    'restarts':item['RestartCount']} for item in values}


def clone_spec(old):
    assert old['Id']==EXPECTED_ID and old['State']['Running']
    assert set(old['NetworkSettings']['Networks'])=={'workadventure_default'}
    endpoint=old['NetworkSettings']['Networks']['workadventure_default']
    assert not endpoint.get('IPAMConfig') and not endpoint.get('Links') and not endpoint.get('DriverOpts')
    assert old['HostConfig']['PortBindings']=={'3210/tcp':[{'HostIp':'127.0.0.1','HostPort':'3210'}]}
    config=copy.deepcopy(old['Config']);config['Image']=old['Image'];config['Healthcheck']=copy.deepcopy(HEALTH_CONFIG)
    return {**config,'HostConfig':copy.deepcopy(old['HostConfig']),
            'NetworkingConfig':{'EndpointsConfig':{'workadventure_default':{'Aliases':endpoint.get('Aliases') or []}}}}


class DockerConnection(http.client.HTTPConnection):
    def __init__(self):super().__init__('localhost',timeout=10)
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        self.sock.settimeout(10);self.sock.connect('/var/run/docker.sock')


def docker_create(spec):
    connection=DockerConnection()
    try:
        connection.request('GET','/version');response=connection.getresponse();version=json.loads(response.read())['ApiVersion']
        assert response.status==200 and version.startswith('1.')
        connection.request('POST','/v'+version+'/containers/create?name='+NAME,body=json.dumps(spec).encode(),headers={'Content-Type':'application/json'})
        response=connection.getresponse();raw=response.read(65536)
        if response.status!=201:raise RuntimeError('Container creation failed')
        value=json.loads(raw);assert len(value['Id'])==64
        return value['Id']
    finally:connection.close()


MEDIA=r'''
const {loadConfig}=require('/srv/hall-audio/config.cjs'),{RoomServiceClient}=require('livekit-server-sdk');
const config=loadConfig(),client=new RoomServiceClient(config.livekit.apiUrl,config.livekit.apiKey,config.livekit.apiSecret);
client.listRooms().then(rooms=>console.log(JSON.stringify({participants:rooms.filter(room=>/^castle-audio-[a-f0-9]{32}$/.test(room.name)).reduce((count,room)=>count+room.numParticipants,0)})))
.catch(()=>{console.error('Hall occupancy check failed');process.exitCode=1;});
'''


def idle():return json.loads(run('docker','exec',NAME,'node','-e',MEDIA))=={'participants':0}


def ready():
    with urllib.request.urlopen('http://127.0.0.1:3210/castle-audio/health',timeout=3) as response:
        return response.status==200 and json.load(response)=={'ready':True}


def preserved(before,after):
    assert before['files']==after['files']
    assert {key:value for key,value in before['services'].items() if key!=NAME}=={key:value for key,value in after['services'].items() if key!=NAME}


def main():
    os.umask(0o077)
    assert not RECORD.exists() and not PRIVATE.is_symlink() and PRIVATE.stat().st_mode&0o777==0o700
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']();running_before=all_running();old=inspect(NAME)
    assert old['Id']==EXPECTED_ID and old['State']['Health']['Status']=='unhealthy' and ready()
    assert '3000' in str(old['Config']['Healthcheck']['Test']) and '/castle-audio/health' not in str(old['Config']['Healthcheck']['Test'])
    spec=clone_spec(old)
    assert len(old['Mounts'])==1 and old['Mounts'][0]['Destination']=='/srv/hall-audio' and not old['Mounts'][0]['RW']
    release=Path(old['Mounts'][0]['Source']);assert release.resolve()==release and release.is_relative_to('/opt/wvh-hall-audio/releases')
    assert not any(path.is_symlink() for path in release.rglob('*'))
    files={str(path):sha(path.read_bytes()) for path in release.rglob('*') if path.is_file()}
    protected={str(path):sha(path.read_bytes()) for path in [PRIVATE/'runtime.env',PRIVATE/'code.json']}
    backup=NAME+'-before-health-'+EXPECTED_ID[:12]
    assert not run('docker','ps','-aq','--filter','name=^/'+backup+'$').strip()
    run('docker','exec',NAME,'node','-e',HEALTH)
    assert idle();time.sleep(3);assert idle() and ops['baseline']()==before and all_running()==running_before
    created=None;renamed=False
    try:
        run('docker','stop','-t','10',NAME);run('docker','rename',NAME,backup);renamed=True
        created=docker_create(spec);run('docker','start',NAME)
        healthy=False
        for _ in range(50):
            current=inspect(NAME)
            if current['State'].get('Health',{}).get('Status')=='healthy' and ready():healthy=True;break
            time.sleep(.5)
        assert healthy and current['Id']==created and current['Image']==old['Image']
        expected=copy.deepcopy(old['Config']);expected['Image']=old['Image'];expected['Healthcheck']=copy.deepcopy(HEALTH_CONFIG)
        assert current['Config']==expected,'Application configuration changed'
        assert current['HostConfig']==old['HostConfig'],'Container restrictions changed'
        assert current['Mounts']==old['Mounts'],'Read-only application mount changed'
        assert files=={str(path):sha(path.read_bytes()) for path in release.rglob('*') if path.is_file()}
        assert all(sha(Path(name).read_bytes())==digest for name,digest in protected.items())
        after=ops['baseline']();preserved(before,after)
        running_after=all_running()
        assert {key:value for key,value in running_after.items() if key!=NAME}=={key:value for key,value in running_before.items() if key!=NAME}
        assert inspect(backup)['Id']==EXPECTED_ID and not inspect(backup)['State']['Running']
        with urllib.request.urlopen('https://together.deine-schule.com/castle-audio/health',timeout=8) as response:assert response.status==200 and json.load(response)=={'ready':True}
        record={'passed':True,'repair':'20261110-health1','before':before,'after':after,'runningBefore':running_before,'runningAfter':running_after,
                'gatewayBeforeId':EXPECTED_ID,'gatewayAfterId':created,'rollbackContainer':backup,'image':current['Image'],
                'healthConfig':HEALTH_CONFIG,'applicationFiles':files,'protectedFiles':protected,
                'configBeforeSha256':sha(json.dumps(old['Config'],sort_keys=True).encode()),'configAfterSha256':sha(json.dumps(current['Config'],sort_keys=True).encode()),
                'hostConfigSha256':sha(json.dumps(current['HostConfig'],sort_keys=True).encode()),'idleAtGate':True,
                'healthNowCorrect':True,'applicationBytesAndEnvironmentUnchanged':True,'allOtherServicesAndMapsUnchanged':True,
                'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
        ops['atomic'](RECORD,record)
        print(json.dumps({key:record[key] for key in ['passed','repair','gatewayAfterId','idleAtGate','healthNowCorrect','applicationBytesAndEnvironmentUnchanged','allOtherServicesAndMapsUnchanged','checkedAt']}))
    except BaseException:
        if created:
            assert inspect(NAME)['Id']==created
            subprocess.run(['docker','stop','-t','8',NAME],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            run('docker','rm',NAME)
        if renamed:
            assert inspect(backup)['Id']==EXPECTED_ID
            run('docker','rename',backup,NAME);run('docker','start',NAME)
        preserved(before,ops['baseline']())
        raise RuntimeError('Health repair failed; original Hall container restored') from None


if __name__=='__main__':main()
