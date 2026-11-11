"""Retain the exact restored attempt before permitting a fresh, separately evidenced publication."""
import hashlib
import json
import os
from pathlib import Path
import runpy

OLD_HELPER='e18032485cfb84d658c3514e5cea1e2a7d4429fb402f1745c3d77f44f35c7eba'
OLD_AUDIT='efd68b37512a9cd9636e812204ccfa1f13a59f14cb1a37fe28d4808860746c46'
NEW_HELPER='31c1a4757c64cf407c67453a772aafb13af864751796ecc67436e0206ec4baea'
NEW_AUDIT='d2b45e869f164764ace2399fa4a102520b210698e37cc074dc2f514cd31da084'
sha=lambda raw:hashlib.sha256(raw).hexdigest()


def validate(staged,rollback,current,processes):
    assert staged['passed'] is True and staged['provisional'] is True
    assert rollback['passed'] is True and rollback['restored'] is True
    assert rollback['before']==staged['after'] and rollback['after']==staged['before']==current
    assert staged['processes']==processes


def exact(path,raw,mode=0o600):
    assert path.resolve()==path
    if path.exists():assert path.read_bytes()==raw
    else:
        with path.open('xb') as file:file.write(raw)
    path.chmod(mode)


def replace(path,raw):
    temporary=path.with_name(path.name+'.reviewed-rearm')
    assert path.resolve()==path and temporary.resolve()==temporary and not temporary.exists()
    with temporary.open('xb') as file:file.write(raw)
    temporary.chmod(0o600);temporary.replace(path)


def main():
    os.umask(0o077);helper=Path('/tmp/wvh-castle-round-recovery-ops.py');audit=Path('/tmp/wvh-check-castle-piano-deployment.py')
    old_helper=helper.read_bytes();old_audit=audit.read_bytes();assert sha(old_helper)==OLD_HELPER and sha(old_audit)==OLD_AUDIT
    old=runpy.run_path(str(helper));ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');private=old['PRIVATE'];before=ops['baseline']()
    assert not old['RECORD'].exists() and not (private/'round-recovery-history-1.json').exists()
    staged_raw,staged=old['read'](old['STAGE']);rollback_path=private/'round-recovery-rollback.json';rollback_raw,rollback=old['read'](rollback_path)
    validate(staged,rollback,before,old['processes'](ops));old['transition'](staged['before'],staged['after'])
    backup=private/'nginx-before-round-recovery.private.conf';assert old['NGINX'].read_bytes()==backup.read_bytes() and sha(backup.read_bytes())==staged['nginxBeforeSha256']
    original_raw,original=old['read'](private/'round-recovery-candidate.private.json');assert sha(original_raw)==staged['candidateProofSha256'];old['proof'](original,True)
    new_helper=Path('/tmp/wvh-castle-round-recovery-ops-v2.py');new_audit=Path('/tmp/wvh-check-castle-piano-deployment-recovery-v2.py')
    payload=new_helper.read_bytes();checker=new_audit.read_bytes();assert sha(payload)==NEW_HELPER and sha(checker)==NEW_AUDIT
    updated=runpy.run_path(str(new_helper));source=Path('/home/wilhelm/.cache/wvh-school-qa/round-recovery-candidate-v2.private.json')
    assert source.resolve()==source and source.parent.stat().st_mode&0o777==0o700
    candidate_raw=source.read_bytes();updated['proof'](json.loads(candidate_raw),True)
    fact=Path('/tmp/wvh-castle-recovery-previous-failure.json').read_bytes();failure=json.loads(fact)
    assert failure['version']==1 and failure['passed'] is False and failure['stage']=='bounded-recovery' and failure['errorType']=='TimeoutError' and failure['waitLimitMilliseconds']==15000
    archive=updated['HISTORY_DIR'];assert archive.resolve()==archive and not archive.exists();archive.mkdir(mode=0o700)
    for name,raw in [('stage.json',staged_raw),('rollback.json',rollback_raw),('candidate.private.json',original_raw),('ops.py',old_helper),('audit.py',old_audit),('previous-published-failure.json',fact)]:exact(archive/name,raw)
    history={'version':1,'passed':True,'stageSha256':sha(staged_raw),'rollbackSha256':sha(rollback_raw),'candidateSha256':sha(original_raw),
             'helperSha256':OLD_HELPER,'auditSha256':OLD_AUDIT,'processes':staged['processes'],'failedPublishedFactSha256':sha(fact)}
    exact(updated['HISTORY'],(json.dumps(history,indent=2)+'\n').encode());exact(updated['CANDIDATE'],candidate_raw)
    updated['prior_rollback'](ops,before)
    try:
        assert ops['baseline']()==before;replace(helper,payload);replace(audit,checker)
        runpy.run_path(str(audit))['main']();assert ops['baseline']()==before
        assert old['STAGE'].read_bytes()==staged_raw and rollback_path.read_bytes()==rollback_raw
        old['STAGE'].unlink();rollback_path.unlink();source.unlink()
    except Exception:
        assert helper.read_bytes() in [old_helper,payload] and audit.read_bytes() in [old_audit,checker]
        if helper.read_bytes()!=old_helper:replace(helper,old_helper)
        if audit.read_bytes()!=old_audit:replace(audit,old_audit)
        exact(old['STAGE'],staged_raw);exact(rollback_path,rollback_raw)
        assert ops['baseline']()==before;raise
    print(json.dumps({'passed':True,'priorStageRollbackAndFailurePreserved':True,'freshCandidateValidated':True,'noMapServiceOrPolicyChange':True}))


if __name__=='__main__':main()
