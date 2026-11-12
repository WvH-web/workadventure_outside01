"""Diagnose the exact failed pilot's real HTTP responses on an isolated loopback port."""
import hashlib
import json
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request

base=Path('/opt/wvh-castle-billiards-pilot-r2');private=base/'private'
before=json.loads((private/'before.json').read_text());release=base/'releases'/before['archiveSha256'][:16]
name='wvh-castle-billiards-loopback';origin='http://127.0.0.1:13261/castle-billiards/'
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE,timeout=30)
assert not run('docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}').strip() and not run('ss','-ltnH','sport = :13261').strip()
created=run('docker','run','-d','--name',name,'--network','workadventure_default','--user','1000:1000','--read-only','--env-file',str(private/'runtime.env'),
 '--label','wvh.component=castle-billiards-loopback','-p','127.0.0.1:13261:3231','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','512m','--cpus','1',
 '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--mount','type=bind,src='+str(base/'policy')+',dst=/srv/billiards-policy,readonly',
 '--mount','type=bind,src='+str(base/'data')+',dst=/srv/billiards-data,readonly','--entrypoint','node',before['image'],'/srv/release/castle-billiards/server.cjs').strip()
def request(route,body=None):
    req=urllib.request.Request(origin+route,data=body,headers={'Content-Type':'application/json'})
    try:response=urllib.request.urlopen(req,timeout=3)
    except urllib.error.HTTPError as error:response=error
    return response.status,response.read(4000001),response.headers
try:
    for _ in range(40):
        try:
            if request('health')[0]==200:break
        except Exception:pass
        time.sleep(.2)
    rows=[]
    for file in ['index.html','billiards.js','renderer.js','billiards.css','credits.html','vendor/three/LICENSE','vendor/three/build/three.module.js','vendor/three/build/three.core.js']:
        status,raw,headers=request(file)
        rows.append({'file':file,'status':status,'sameBytes':raw==(release/'castle-billiards/public'/file).read_bytes(),
          'noStore':headers.get('Cache-Control')=='no-store','sameOriginFrames':"frame-ancestors 'self'" in headers.get('Content-Security-Policy','')})
    routes={route:request(route,b'{}' if route=='session' else None)[0] for route in ['health','session','server.cjs','vendor/core.cjs','state.json','vendor-manifest.json','policy/admission.json']}
    print(json.dumps({'static':rows,'routes':routes,'existingRoutesChanged':False,'credentialsUsedInRequests':False},indent=2))
finally:
    current=json.loads(run('docker','inspect',name))[0];assert current['Id']==created and current['Config']['Labels']['wvh.component']=='castle-billiards-loopback'
    run('docker','stop','-t','4',name);run('docker','rm',name)
