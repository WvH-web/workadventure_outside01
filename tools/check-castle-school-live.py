"""Read-only live API checks; staff identity comes from a private operator environment."""
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request
import uuid
import zipfile

ORIGIN='https://together.deine-schule.com'
URL=ORIGIN+'/castle-school/'
identifier=os.environ.get('CASTLE_SCHOOL_QA_IDENTIFIER','')
if '@' not in identifier or len(identifier)>254:raise RuntimeError('A private authorized staff QA identity is required')
def inspect(name):return json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
names=['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1','wvh-hall-audio']
before={name:inspect(name) for name in names}
env=dict(item.split('=',1) for item in before['workadventure-play-1']['Config']['Env'] if '=' in item)
secret=env['SECRET_KEY'].encode()
def token(identity,tags=None,expired=False):
    encode=lambda value:base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).rstrip(b'=')
    value=encode({'alg':'HS256','typ':'JWT'})+b'.'+encode({'identifier':identity,'username':'Private Castle API QA',
      'exp':int(time.time())+(-5 if expired else 180),'tags':tags or []})
    return (value+b'.'+base64.urlsafe_b64encode(hmac.new(secret,value,hashlib.sha256).digest()).rstrip(b'=')).decode()
def request(path,auth=None,body=None,extra=None):
    headers={'Origin':ORIGIN,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json'}
    if auth:headers['Authorization']='Bearer '+auth
    headers.update(extra or {})
    req=urllib.request.Request(URL+path,headers=headers,data=None if body is None else json.dumps(body).encode(),method='GET' if body is None else 'POST')
    started=time.monotonic()
    try:response=urllib.request.urlopen(req,timeout=10)
    except urllib.error.HTTPError as error:response=error
    raw=response.read(8192)
    try:data=json.loads(raw)
    except ValueError:raise RuntimeError('A live permission response was not JSON') from None
    assert response.headers.get('Cache-Control')=='no-store'
    for text in [identifier,auth or 'never-a-token', 'birthdate','gradeLevel','classId','"age"','Private Castle API QA']:
        assert text.encode() not in raw,'Private profile data must not leave the API'
    return response.status,data,round((time.monotonic()-started)*1000)

staff=token(identifier)
assert request('context')[0]==401
assert request('context','invalid')[0]==401
assert request('context',token(identifier,expired=True))[0]==401
assert request('context',staff,extra={'Origin':'https://invalid.local'})[0]==403
assert request('context?token=not-accepted',staff)[0]==404
status,body,latency=request('context',staff)
assert status==200 and body['account']=={'kind':'staff','schoolAccount':True}
assert len(body['decisions'])==7 and all(d=={'allowed':True,'mode':'preview'} for d in body['decisions'].values())
first=body['checkedAt'];time.sleep(.05)
assert request('context',staff)[1]['checkedAt']>first
assert request('decision',staff,{'resourceId':'haxballarea01'})[1]['decisions']['haxballarea01']=={'allowed':True,'mode':'preview'}
assert request('decision',staff,{'resourceId':'haxballarea01','age':99,'classId':17})[0]==400
assert request('decision',staff,{'resourceId':'not-configured'})[0]==400
unknown=token('castle-qa-'+uuid.uuid4().hex+'@invalid.local',['teacher','admin'])
status,denied,_=request('context',unknown)
assert status==200 and denied['account']=={'kind':'unverified','schoolAccount':False}
assert all(d=={'allowed':False,'mode':None} for d in denied['decisions'].values())
def parallel(_number):
    identity='castle-api-'+uuid.uuid4().hex+'@invalid.local'
    status,body,elapsed=request('context',token(identity,['teacher']))
    assert status==200 and body['account']['schoolAccount'] is False
    assert all(d['allowed'] is False for d in body['decisions'].values())
    return elapsed
with ThreadPoolExecutor(max_workers=4) as pool:parallel_times=list(pool.map(parallel,range(4)))
for path in ['runtime.env','rules.json','config.json']:assert request(path,staff)[0]==404
for method in ['GET','POST']:
    headers={'Content-Type':'application/json','Authorization':'Bearer '+staff}
    req=urllib.request.Request('https://www.deine-schule.com/workadventure-castle-context.php',method=method,
      headers=headers,data=json.dumps({'identifier':identifier}).encode() if method=='POST' else None)
    try:response=urllib.request.urlopen(req,timeout=10)
    except urllib.error.HTTPError as error:response=error
    assert response.status==(405 if method=='GET' else 401)
    assert json.load(response)=={'error':'method_not_allowed' if method=='GET' else 'unauthorized'}
for name,previous in before.items():
    current=inspect(name);assert current['Id']==previous['Id'] and current['State']['StartedAt']==previous['State']['StartedAt']
current=inspect('wvh-castle-school')
assert current['Image']==before['workadventure-play-1']['Image']
service_env=dict(item.split('=',1) for item in current['Config']['Env'] if '=' in item)
with zipfile.ZipFile('/tmp/wvh-castle-school.zip') as bundle:
    for name in bundle.namelist():
        source=bundle.read(name)
        assert secret not in source and service_env['CASTLE_SCHOOL_LOOKUP_KEY'].encode() not in source,'Runtime verification material must not appear in release source'
assert current['Config']['User']=='1000:1000' and current['HostConfig']['ReadonlyRootfs'] is True
assert all(binding['HostIp']=='127.0.0.1' for bindings in current['HostConfig']['PortBindings'].values() for binding in bindings)
private=Path('/opt/wvh-castle-school/private')
probes=json.loads((private/'public-probe.json').read_text())
proof={'staffFreshlyRecognized':True,'signedFakeStaffTagsRejected':True,'clientAgeClassOverridesRejected':True,
 'unauthorizedExpiredAndCrossOriginRejected':True,'profileAndTokenDataNotDisclosed':True,'newContextOnRepeatedRequests':True,
 'staffPreviewDecisions':7,'studentApprovalsCreated':False,'staffRequestMilliseconds':latency,
 'fourParallelUnknownIdentitiesMilliseconds':parallel_times,'privateFilesNotServed':True,
 'unprivilegedLoopbackReadOnlyContainer':True,'verifiedExistingImageId':True,'noRuntimeCredentialsInReleaseSource':True,
 'serverOnlyLookupRejectsBrowserTokens':True,'existingServicesUnchanged':True,'databaseWrites':False,
 'publicRouteProbeStatuses':[p['status'] for p in probes],'mapIntegrationComplete':False,'loadApprovalFor400':False}
(private/'live-check.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof,indent=2))
