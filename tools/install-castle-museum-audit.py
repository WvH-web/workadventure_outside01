"""Preserve the historical auditor and add only the reviewed museum transition verifier."""
import hashlib
from pathlib import Path
import runpy
import os


def main():
    sha=lambda raw:hashlib.sha256(raw).hexdigest()
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');before=ops['baseline']()
    old=Path('/tmp/wvh-check-castle-piano-deployment.py');new=Path('/tmp/wvh-check-castle-piano-deployment.museum-new.py')
    museum=Path('/tmp/wvh-check-castle-museum-deployment.py')
    backup=Path('/opt/wvh-castle-content/private/before-museum-tour/audit-before-manifest-history-fix.py')
    assert all(path.resolve()==path for path in [old,new,museum,backup]) and not backup.exists()
    previous=old.read_bytes();assert sha(previous)=='683c8346f226d4ee6fd34c542bea959cae117741902c75d6551fb96b3ee744bb'
    updated=new.read_bytes();assert sha(updated)=='6903c79bc1e6264f37b6bcd7de7bb4796946c7a967c0bb0a74796ecc552ae76c'
    assert sha(museum.read_bytes())=='7ea09b480cfddae730ebdcc2b8638811cf904a52c81bd8a573346aef5f740203'
    compile(updated,str(old),'exec');compile(museum.read_bytes(),str(museum),'exec')
    backup.write_bytes(previous);backup.chmod(0o600)
    assert old.read_bytes()==previous and ops['baseline']()==before
    new.chmod(0o600);os.chown(new,0,0);new.replace(old);museum.chmod(0o600);os.chown(museum,0,0)
    assert sha(old.read_bytes())=='6903c79bc1e6264f37b6bcd7de7bb4796946c7a967c0bb0a74796ecc552ae76c' and ops['baseline']()==before
    print('{"passed":true,"onlyAuditCodeUpdated":true,"historicAuditorPreserved":true,"protectedPlatformUnchanged":true}')


if __name__=='__main__':main()
