"""Expose complete, byte-checked proof atomically; never publish an in-progress SFTP file."""
import hashlib
import json
from pathlib import Path
import re


def publish(source,target,descriptor,validate):
    assert set(descriptor)=={'sha256','bytes'} and re.fullmatch('[a-f0-9]{64}',descriptor['sha256'])
    assert type(descriptor['bytes']) is int and 0<descriptor['bytes']<150000
    assert source.resolve()==source and source.is_file() and not target.exists() and not target.is_symlink() and source.parent==target.parent
    raw=source.read_bytes()
    assert len(raw)==descriptor['bytes'] and hashlib.sha256(raw).hexdigest()==descriptor['sha256']
    validate(json.loads(raw));source.chmod(0o600);source.rename(target)
    assert target.read_bytes()==raw


def main():
    helper=Path('/tmp/wvh-deploy-castle-homes-control.py');raw=helper.read_bytes()
    assert helper.resolve()==helper and hashlib.sha256(raw).hexdigest()=='60f004b6953efcd0322763184254cdc7fc6db1ba3305cfadb3b462de716fbb9f'
    scope={'__name__':'castle_home_proof_tools'};exec(compile(raw,str(helper),'exec'),scope)
    target=scope['INPUT'];source=target.parent/'homes-control-live.uploading'
    assert target.parent.stat().st_mode&0o777==0o700
    descriptor=json.loads(Path('/tmp/wvh-home-control-proof-descriptor.json').read_text())
    publish(source,target,descriptor,lambda value:scope['proof'](value,False))
    print(json.dumps(dict(passed=True,completeProofExposedAtomically=True)))


if __name__=='__main__':main()
