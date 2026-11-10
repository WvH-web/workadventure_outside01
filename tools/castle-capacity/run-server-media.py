"""Additional bounded same-server audio fan-out test; never a substitute for external/native 400-user acceptance."""
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import re
import runpy
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.parse

BINARY=Path('/opt/wvh-castle-capacity-tools/2.19.2/lk')
BINARY_SHA='e6d87a4db012314d5195cdc614f49bf94d3b07ed430971b08afb91f0ae46f0f8'
REPORT=Path('/tmp/wvh-castle-capacity-report.cjs')
UNIT=re.compile(r'^wvh-castlecap-[a-f0-9]{24}-(25|100|200|400)\.scope$')
STAGES=[(25,20),(100,30),(200,40),(400,60)]
MEMORY_MIB=1536


def command(unit,room,prefix,subscribers,duration,uid,gid):
    assert UNIT.fullmatch(unit) and re.fullmatch(r'castle-capacity-[a-f0-9]{24}',room)
    assert prefix=='castlecap'+room.removeprefix('castle-capacity-')
    assert (subscribers,duration) in STAGES and uid==65534 and gid==65534
    assert unit=='wvh-castlecap-'+room.removeprefix('castle-capacity-')+'-'+str(subscribers)+'.scope'
    return ['systemd-run','--scope','--quiet','--collect','--unit='+unit,
            '--property=MemoryMax='+str(MEMORY_MIB)+'M','--property=MemorySwapMax=0','--property=CPUQuota=100%','--property=TasksMax=2048',
            'setpriv','--reuid='+str(uid),'--regid='+str(gid),'--clear-groups','--no-new-privs',str(BINARY),
            '--legacy-auth','--quiet','perf','load-test','--room',room,'--identity-prefix',prefix,
            '--audio-publishers','1','--video-publishers','0','--subscribers',str(subscribers),'--num-per-second','10','--duration',str(duration)+'s']


def state(unit):
    assert UNIT.fullmatch(unit)
    result=subprocess.run(['systemctl','show',unit,'--property=ActiveState','--value'],capture_output=True,text=True,timeout=5)
    return result.stdout.strip()


def stop(unit):
    assert UNIT.fullmatch(unit)
    if state(unit) in ['active','activating','deactivating']:
        subprocess.run(['systemctl','kill','--kill-whom=all','--signal=SIGKILL',unit],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=5)
        for _ in range(20):
            if state(unit) not in ['active','activating','deactivating']:break
            time.sleep(.2)
    assert state(unit) not in ['active','activating','deactivating'],'Own generator is still running'


def limits(unit):
    assert UNIT.fullmatch(unit)
    properties=['MemoryMax','MemoryCurrent','CPUQuotaPerSecUSec','TasksMax']
    result=subprocess.run(['systemctl','show',unit,*['--property='+key for key in properties]],capture_output=True,text=True,timeout=5)
    assert result.returncode==0
    values=dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
    assert int(values['MemoryMax'])==MEMORY_MIB*1048576 and values['CPUQuotaPerSecUSec']=='1s' and values['TasksMax']=='2048'
    return {'memoryLimitMiB':MEMORY_MIB,'memoryCurrentMiB':round(int(values['MemoryCurrent'])/1048576,2),'cpuQuotaPerSecond':values['CPUQuotaPerSecUSec']}


def parse(text,expected):
    source=REPORT.read_text();assert len(source)<10000 and 'function parseReport(' in source
    script=source+"\nconst value=JSON.parse(require('node:fs').readFileSync(0,'utf8'));console.log(JSON.stringify(parseReport(value.text,value.expected)));"
    result=subprocess.run(['docker','exec','-i','wvh-hall-audio','node','-e',script],input=json.dumps({'text':text,'expected':expected}),capture_output=True,text=True,timeout=10)
    if result.returncode:raise RuntimeError('Audio subscriber report did not pass')
    return json.loads(result.stdout)


def sample(ops,room):
    with contextlib.redirect_stdout(io.StringIO()):value=ops['observe']()
    assert value['room']==room and value['safeToContinue'],'Resource, activity or platform-preservation guard stopped the test'
    return value


def interrupted(_signal,_frame):raise KeyboardInterrupt('Operator interruption')


def main():
    import pwd
    os.umask(0o077)
    assert BINARY.is_file() and BINARY.resolve()==BINARY and hashlib.sha256(BINARY.read_bytes()).hexdigest()==BINARY_SHA
    assert REPORT.is_file() and not REPORT.is_symlink() and REPORT.stat().st_size<10000
    assert shutil.which('systemd-run') and shutil.which('setpriv')
    owner=pwd.getpwnam('nobody');assert owner.pw_uid==65534 and owner.pw_gid==65534
    ops=runpy.run_path('/tmp/wvh-castle-capacity-ops.py')
    signal.signal(signal.SIGTERM,interrupted);signal.signal(signal.SIGHUP,interrupted)
    with contextlib.redirect_stdout(io.StringIO()):lease=ops['prepare'](export_handoff=False)
    room,prefix=lease['room'],lease['prefix'];directory=ops['BASE']/room;directory.mkdir(mode=0o700)
    home=Path(tempfile.mkdtemp(prefix='castle-capacity-cli-'));os.chown(home,owner.pw_uid,owner.pw_gid)
    credentials=None;process=None;units=[];stages=[];samples=[];failure=None;cleanup=None
    try:
        credentials=ops['media']('export');url=urllib.parse.urlsplit(credentials['url'])
        assert url.scheme=='wss' and url.hostname=='together.deine-schule.com' and not url.username and not url.password and not url.query and not url.fragment
        environment={**os.environ,'HOME':str(home),'XDG_CONFIG_HOME':str(home/'.config'),'XDG_CACHE_HOME':str(home/'.cache'),
                     'LIVEKIT_URL':credentials['url'],'LIVEKIT_API_KEY':credentials['apiKey'],'LIVEKIT_API_SECRET':credentials['apiSecret'],
                     'NO_COLOR':'1','TERM':'dumb','GOMEMLIMIT':'1024MiB','GOMAXPROCS':'2'}
        assert ops['resources']()['availableMiB']>=4000,'Insufficient headroom for the bounded generator'
        samples.append(sample(ops,room))
        for subscribers,duration in STAGES:
            unit='wvh-castlecap-'+room.removeprefix('castle-capacity-')+'-'+str(subscribers)+'.scope'
            assert state(unit) not in ['active','activating','deactivating'];units.append(unit)
            started=time.monotonic();stdout=directory/('media-'+str(subscribers)+'.stdout.private.log');stderr=directory/('media-'+str(subscribers)+'.stderr.private.log')
            print(json.dumps({'phase':'running','generator':'same-server-bounded','subscribers':subscribers,'holdSeconds':duration,'memoryLimitMiB':MEMORY_MIB,'cpuLimit':1}),flush=True)
            with stdout.open('w') as out,stderr.open('w') as error:
                process=subprocess.Popen(command(unit,room,prefix,subscribers,duration,owner.pw_uid,owner.pw_gid),stdout=out,stderr=error,env=environment,cwd=home)
                while process.poll() is None:
                    time.sleep(3)
                    if process.poll() is not None:break
                    assert time.monotonic()-started<duration+(subscribers+1)/10+90,'Media stage deadline exceeded'
                    value=sample(ops,room);value['generator']=limits(unit);samples.append(value)
                code=process.wait(timeout=5);process=None
            stop(unit)
            for file in [stdout,stderr]:
                text=file.read_text();text=text.replace(credentials['apiKey'],'[key]').replace(credentials['apiSecret'],'[secret]')
                text=re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[token]',text);file.write_text(text)
            if code!=0:raise RuntimeError('Bounded media generator failed')
            result=parse(stdout.read_text(),subscribers);result.update(holdSeconds=duration,elapsedMs=round((time.monotonic()-started)*1000),externalWindowsGenerator=False)
            stages.append(result);print(json.dumps({'phase':'passed',**result}),flush=True)
            time.sleep(6);value=sample(ops,room);samples.append(value)
            for _ in range(10):
                if value['media']['ownParticipants']==0:break
                time.sleep(2);value=sample(ops,room);samples.append(value)
            assert value['media']['ownParticipants']==0,'Previous synthetic peers did not disconnect'
    except BaseException as error:
        failure=str(error) if isinstance(error,(AssertionError,RuntimeError,KeyboardInterrupt)) else 'Scoped media test failed'
    finally:
        for unit in units:stop(unit)
        if process is not None:
            try:process.wait(timeout=5)
            except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)
        with contextlib.redirect_stdout(io.StringIO()):cleanup=ops['cleanup'](room)
        shutil.rmtree(home)
        if credentials:credentials.clear()
        if not cleanup['existingPlatformAndMapsUnchanged']:failure=failure or 'Existing platform changed during probe'
    result={'passed':failure is None,'scope':'same-server resource-bounded LiveKit audio fan-out only','external400ClientTest':False,
            'fullCastleApprovalFor400':False,'schoolLoginLoadTested':False,'nativeAvatarsLoadTested':False,'camerasOrClassroomVideoTested':False,
            'generatorMemoryLimitMiB':MEMORY_MIB,'generatorCpuLimit':1,'stages':stages,'samples':samples,'cleanup':cleanup,
            'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),**({'error':failure} if failure else {})}
    ops['atomic'](directory/'media-result.private.json',result);ops['atomic'](ops['BASE']/'server-media-result.private.json',result)
    print(json.dumps({'passed':result['passed'],'highestPassedSubscribers':max([row['subscribers'] for row in stages],default=0),
                      'cleanupConfirmed':cleanup['ownTestRoomRemoved'] and cleanup['privateHandoffRemoved'],'existingPlatformAndMapsUnchanged':cleanup['existingPlatformAndMapsUnchanged'],
                      'external400ClientTest':False,'fullCastleApprovalFor400':False,**({'error':failure} if failure else {})}),flush=True)
    if failure:raise SystemExit(1)


if __name__=='__main__':main()
