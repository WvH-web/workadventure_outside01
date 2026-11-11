"""Remove only this publication's one explicitly synthetic media report, after a private backup."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import runpy
import secrets
import sqlite3

os.umask(0o077)
private=Path('/opt/wvh-castle-homes/private')
record=json.loads((private/'calls-deployment.json').read_text())
config=json.loads((private/'service.json').read_text())
assert record['passed'] and config['version']==4 and len(config['allowedSubjects'])==2
receipt=private/'calls-qa-cleanup.json'
assert not receipt.exists()
snapshot=Path(record['recoveryDatabaseFile'])
assert snapshot.resolve()==snapshot and snapshot.parent.parent==private and snapshot.parent.name.startswith('before-calls-')
stamp=snapshot.parent.name.removeprefix('before-calls-').split('-')[0]
start=int(datetime.datetime.strptime(stamp,'%Y%m%dT%H%M%SZ').replace(tzinfo=datetime.timezone.utc).timestamp()*1000)
end=int(datetime.datetime.strptime(record['checkedAt'],'%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc).timestamp()*1000)+1000
database=Path('/var/lib/wvh-castle-homes/pilot.sqlite').resolve()
assert database==Path('/var/lib/private/wvh-castle-homes/pilot.sqlite')
backup=private/('before-qa-report-cleanup-'+secrets.token_hex(6)+'.sqlite')
assert not backup.exists() and backup.resolve()==backup
with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as reader,sqlite3.connect(backup) as writer:
    reader.backup(writer)
backup.chmod(0o600)
with sqlite3.connect(database) as db:
    db.execute('PRAGMA busy_timeout=3000')
    db.execute('BEGIN IMMEDIATE')
    pupils=db.execute('SELECT guest,role FROM school_accounts WHERE subject IN (?,?)',config['allowedSubjects']).fetchall()
    assert len(pupils)==2 and all(row[1]=='student' for row in pupils)
    ids=[row[0] for row in pupils]
    rows=db.execute("SELECT id FROM video_reports WHERE note=? AND status='open' AND created BETWEEN ? AND ? AND reporter IN (?,?) AND target IN (?,?)",
        ['Synthetic room-call safety probe.',start,end,*ids,*ids]).fetchall()
    assert len(rows)==1, 'Unexpected synthetic report count; retain data'
    deleted=db.execute("DELETE FROM video_reports WHERE id=? AND note=?",[rows[0][0],'Synthetic room-call safety probe.']).rowcount
    assert deleted==1
    db.commit()
ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
result=dict(passed=True,syntheticQaReportsRemoved=deleted,onlyApprovedSyntheticPupilPair=True,schoolRolesAndOtherReportsUnchanged=True,
    backup=str(backup),backupSha256=hashlib.sha256(backup.read_bytes()).hexdigest())
ops['atomic'](receipt,result)
print(json.dumps({key:value for key,value in result.items() if key not in ['backup','backupSha256']}))
