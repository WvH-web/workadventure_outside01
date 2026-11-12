"""Remove only redundant, exact uploaded copies after normal native acceptance."""
import hashlib
import json
from pathlib import Path
import stat

PRIVATE=Path('/opt/wvh-castle-billiards-hall/private');TABLE=Path('/opt/wvh-castle-billiards-table-r2/private')
sha=lambda raw:hashlib.sha256(raw).hexdigest()
PAIRS=[('wvh-castle-billiards-r2-publication.json',TABLE/'publication.json'),('wvh-castle-billiards-r2-probe.wam',TABLE/'probe-input.json'),
 ('wvh-castle-billiards-table-r2-stage.py',TABLE/'stage-ops.py'),('wvh-castle-billiards-table-acceptance.py',TABLE/'acceptance-ops.py'),
 ('wvh-castle-billiards-table-native.json',TABLE/'native-proof.json'),('wvh-castle-billiards-hall-publication.py',PRIVATE/'publication-ops.py'),
 ('wvh-castle-billiards-hall.wam',PRIVATE/'wam-after.json'),('wvh-castle-billiards-hall-native.json',PRIVATE/'native-proof.json'),
 ('wvh-castle-billiards-hall-acceptance.py',PRIVATE/'acceptance-ops.py')]


def dependency(path,digest):
    assert path.resolve()==path and path.stat().st_uid==0 and stat.S_IMODE(path.stat().st_mode)==0o600
    raw=path.read_bytes();assert sha(raw)==digest
    scope={'__name__':'billiards_cleanup_dependency','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);return scope


def main():
    hall=dependency(PRIVATE/'publication-ops.py','7af7b7dbe79fd73c3e714fcdef705c43c7d0f2733c12d8b331ccad02a8e23172')
    acceptance=dependency(PRIVATE/'acceptance-ops.py','76781b1bc212b9caf2852f953c0f9c5eb18c897f7184d4e9a48df7a98e46667a')
    hall['verify']();acceptance['verify_receipt'](hall);assert not (PRIVATE/'upload-cleanup.json').exists()
    stage=hall['load'](PRIVATE/'stage.json');items=[]
    for name,retained in PAIRS:
        source=Path('/tmp')/name
        assert source.resolve()==source and source.is_file() and source.stat().st_uid==1000
        assert str(source) not in stage['inventory'] and str(source) not in stage['before']['files']
        assert retained.resolve()==retained and retained.stat().st_uid==0 and stat.S_IMODE(retained.stat().st_mode)==0o600
        raw=source.read_bytes();assert raw==retained.read_bytes() and len(raw)<100000
        metadata=source.stat();items.append((source,retained,metadata.st_dev,metadata.st_ino,len(raw),sha(raw)))
    for source,retained,device,inode,size,digest in items:
        metadata=source.stat();assert source.resolve()==source and (metadata.st_dev,metadata.st_ino)==(device,inode)
        assert sha(source.read_bytes())==sha(retained.read_bytes())==digest;source.unlink()
    hall['verify']();acceptance['verify_receipt'](hall)
    record={'passed':True,'removedOnlyExactRedundantUploads':True,'count':len(items),'bytes':sum(item[4] for item in items),
      'retained':{str(item[1]):item[5] for item in items},'existingServicesAndMapsUnchanged':True}
    hall['write']('upload-cleanup.json',hall['encoded'](record));print(json.dumps({key:value for key,value in record.items() if key!='retained'}))


if __name__=='__main__':main()
