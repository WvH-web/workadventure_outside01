"""Activate only version-bumped preview wrappers; all existing native voice areas must remain identical."""
import hashlib
import json
from pathlib import Path
import runpy
import urllib.parse
import urllib.request
import zipfile

sha=lambda raw:hashlib.sha256(raw).hexdigest()
base=Path('/opt/wvh-castle-school');record=json.loads((base/'private/deployment.json').read_text())
assert record['release']==str(base/'releases/6973432bdfccee7c') and record['round_directory_service_live'] is True
with urllib.request.urlopen('https://together.deine-schule.com/castle-school/health',timeout=15) as response:assert json.load(response)=={'ready':True}
publication=Path('/tmp/wvh-castle-runtime-publication.json');published=json.loads(publication.read_text())
assert published['passed'] and len(published['files'])==29
expected_sources={value['file']:value['sha256'] for value in published['files']}
archive=Path('/tmp/wvh-castle-preview-wams.zip')
storage=Path('/var/lib/docker/volumes/workadventure_map-storage-data/_data/castle-preview')
manifest_path=Path('/opt/wvh-hall-audio/private/castle-wams.manifest.json')
old=json.loads(manifest_path.read_text())['files'];assert len(old)==16
assert set(path.name for path in storage.iterdir())==set(old)
assert all(sha((storage/name).read_bytes())==digest for name,digest in old.items())
with zipfile.ZipFile(archive) as bundle:
    assert set(bundle.namelist())==set(old) and len(bundle.infolist())==16
    assert all(info.file_size<100000 for info in bundle.infolist())
    for name in old:
        before=json.loads((storage/name).read_text());after=json.loads(bundle.read(name))
        assert {key:value for key,value in before.items() if key!='mapUrl'}=={key:value for key,value in after.items() if key!='mapUrl'}
        a=urllib.parse.urlsplit(before['mapUrl']);b=urllib.parse.urlsplit(after['mapUrl'])
        assert (a.scheme,a.netloc,a.path,a.fragment)==(b.scheme,b.netloc,b.path,b.fragment)
        assert b.scheme=='https' and b.netloc=='wvh-web.github.io' and b.path=='/workadventure_outside01/castle/'+name[:-4]+'.tmj'
        with urllib.request.urlopen(after['mapUrl'],timeout=20) as response:raw=response.read(4000000)
        assert sha(raw)==expected_sources['castle/'+name[:-4]+'.tmj']
        source=json.loads(raw);props={prop['name']:prop['value'] for prop in source['properties']}
        assert props['castleCommunity'] is True and props['castleRuntimeRevision']=='20261109-rounds1' and props['castleMapId']==name[:-4]
        version=props['castleRevision']+'-'+props['castleRuntimeRevision'];assert urllib.parse.parse_qs(b.query)=={'v':[version]}
        assert urllib.parse.parse_qs(urllib.parse.urlsplit(props['script']).query)['v']==[version]
runpy.run_path('/tmp/wvh-deploy-castle-wams.py')
print(json.dumps({'activated':True,'previewMaps':16,'nativeAudioAndAllOtherWamFieldsUnchanged':True,
 'runtime':'20261109-rounds1','publicationHead':published['head'],'oldCastleReplaced':False}))
