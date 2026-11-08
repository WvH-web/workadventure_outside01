"""Publish only the registered native meeting wrappers into an isolated preview directory."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import urllib.parse
import urllib.request
import zipfile

os.umask(0o077)
legacy_ids={'erdgeschoss','obergeschoss','kino','umgebung','mittelstufe','grosse-halle','bibliothek','grundschule'}
ids=legacy_ids|{'oberstufe','spielesaal','museum','musikzimmer','atelier','sternwarte'}
archive=Path('/tmp/wvh-castle-preview-wams.zip')
storage=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data').resolve()
target=(storage/'castle-preview').resolve()
assert target.parent==storage and target.name=='castle-preview'
def inspect(name):
    return json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
before={name:inspect(name) for name in ['workadventure-play-1','workadventure-back-1','workadventure-map-storage-1']}
assert any(m['Destination']=='/maps' and Path(m['Source']).resolve()==storage
           for m in before['workadventure-map-storage-1']['Mounts'])
private=Path('/opt/wvh-hall-audio/private')
record=private/'castle-wams.manifest.json'
hashof=lambda data:hashlib.sha256(data).hexdigest()
expected={id+'.wam' for id in ids}
if target.exists():
    if not record.exists():
        raise RuntimeError('Preview directory has unreviewed contents; refusing to overwrite it')
    old=json.loads(record.read_text())['files']
    existing=set(p.name for p in target.iterdir())
    if existing!=set(old) or existing not in [expected,{id+'.wam' for id in legacy_ids}]:
        raise RuntimeError('Preview directory has unreviewed contents; refusing to overwrite it')
    if any(hashof((target/name).read_bytes())!=old[name] for name in existing):
        raise RuntimeError('A preview map was edited since the last deployment')
payload={}
with zipfile.ZipFile(archive) as bundle:
    if set(bundle.namelist())!=expected or any(item.file_size>100000 for item in bundle.infolist()):
        raise RuntimeError('Unexpected wrapper archive')
    for name in sorted(expected):
        raw=bundle.read(name)
        wam=json.loads(raw)
        source='https://wvh-web.github.io/workadventure_outside01/castle/'+name[:-4]+'.tmj'
        parsed=urllib.parse.urlsplit(wam.get('mapUrl',''))
        query=urllib.parse.parse_qs(parsed.query)
        valid_source=urllib.parse.urlunsplit((parsed.scheme,parsed.netloc,parsed.path,'',''))==source and not parsed.fragment
        valid_query=not query or (set(query)=={'v'} and len(query['v'])==1 and len(query['v'][0])<=64 and query['v'][0].replace('-','').isalnum())
        if wam.get('version')!='2.1.0' or not valid_source or not valid_query or wam.get('entities')!={} or wam.get('entityCollections')!=[]:
            raise RuntimeError('Unexpected source or assets in '+name)
        if any(prop.get('type')!='livekitRoomProperty' for area in wam['areas'] for prop in area['properties']):
            raise RuntimeError('Only native meeting properties are allowed in this preview deployment')
        payload[name]=raw
backup=private/('castle-wams-before-'+hashof(archive.read_bytes())[:12])
backup.mkdir(mode=0o700,exist_ok=False)
if target.exists():
    for name in existing:
        shutil.copyfile(target/name,backup/name)
target.mkdir(mode=0o755,exist_ok=True)
target.chmod(0o755)
os.chown(target,1000,1000)
written={}
try:
    for name,raw in payload.items():
        temporary=target/(name+'.staging')
        temporary.write_bytes(raw)
        temporary.chmod(0o644)
        os.chown(temporary,1000,1000)
        temporary.replace(target/name)
        written[name]=hashof(raw)
    proof=[]
    for name in sorted(expected):
        wam_url='https://together.deine-schule.com/map-storage/castle-preview/'+name
        play_uri='https://together.deine-schule.com/~/castle-preview/'+name
        with urllib.request.urlopen(wam_url,timeout=20) as response:
            assert response.status==200 and hashof(response.read())==written[name]
        query=urllib.parse.urlencode({'playUri':play_uri})
        with urllib.request.urlopen('https://together.deine-schule.com/map?'+query,timeout=20) as response:
            info=json.load(response)
            assert info.get('wamUrl')==wam_url and info.get('mapUrl') is None
        proof.append({'name':name,'http':200,'native_wam_route':True})
    for name,old in before.items():
        now=inspect(name)
        assert now['Id']==old['Id'] and now['State']['StartedAt']==old['State']['StartedAt']
    record.write_text(json.dumps({'files':written,'source':'GitHub castle TMJ files','routing':'/~/castle-preview/'},indent=2)+'\n')
    record.chmod(0o600)
    print(json.dumps({'preview':proof,'existing_maps_untouched':True,'workadventure_not_restarted':True},indent=2))
except Exception:
    for name,digest in written.items():
        current=target/name
        if current.exists() and hashof(current.read_bytes())==digest:
            if (backup/name).exists():
                shutil.copyfile(backup/name,current)
                current.chmod(0o644)
                os.chown(current,1000,1000)
            else:
                current.unlink()
    raise RuntimeError('Preview deployment failed; owned writes were rolled back') from None
