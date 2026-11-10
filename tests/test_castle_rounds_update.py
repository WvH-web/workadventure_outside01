import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('round_update',Path(__file__).resolve().parents[1]/'tools/update-castle-rounds.py')
update=importlib.util.module_from_spec(spec);spec.loader.exec_module(update)

class ScopeAndRollback(unittest.TestCase):
    def snapshot(self):return {'files':{'/private/deployment.json':'old','/web/nginx':'unchanged'},
      'services':{update.NAME:{'id':'old','started':'old'},'workadventure-play-1':{'id':'client','started':'same'}}}
    def test_only_own_service_and_manifest_may_change(self):
        before=self.snapshot();after=self.snapshot();after['files']['/private/deployment.json']='new';after['services'][update.NAME]={'id':'new','started':'new'}
        update.preserved(before,after,'/private/deployment.json')
        for kind,key in [('files','/web/nginx'),('services','workadventure-play-1')]:
            with self.subTest(kind=kind):
                changed=self.snapshot();changed[kind][key]='unexpected'
                with self.assertRaises(AssertionError):update.preserved(before,changed,'/private/deployment.json')
    def fixture(self,kind):
        backup='school-before-rounds';release=Path('/opt/school/releases/reviewed');calls=[]
        containers={backup:{'Id':'old-id','State':{'Running':False}}}
        if kind=='failed':containers[update.NAME]={'Id':'new-id','Config':{'Labels':{'wvh.release':'reviewed'}},'Mounts':[{'Source':str(release),'RW':False}]}
        if kind=='foreign':containers[update.NAME]={'Id':'foreign','Config':{'Labels':{'wvh.release':'other'}},'Mounts':[]}
        if kind=='not-renamed':containers={update.NAME:{'Id':'old-id','State':{'Running':False}}}
        def run(*args):calls.append(args)
        ops={'exists':lambda name:name in containers,'inspect':lambda name:containers[name],'run':run}
        return ops,backup,release,calls
    def test_failed_replacement_is_removed_and_exact_old_container_restored(self):
        ops,backup,release,calls=self.fixture('failed');update.rollback(ops,backup,'old-id','reviewed',release)
        self.assertEqual(calls,[('docker','stop','-t','8',update.NAME),('docker','rm',update.NAME),('docker','rename',backup,update.NAME),('docker','start',update.NAME)])
    def test_start_failure_before_new_container_exists_still_restores_old(self):
        ops,backup,release,calls=self.fixture('missing');update.rollback(ops,backup,'old-id','reviewed',release)
        self.assertEqual(calls,[('docker','rename',backup,update.NAME),('docker','start',update.NAME)])
    def test_stop_before_rename_failure_starts_only_original(self):
        ops,backup,release,calls=self.fixture('not-renamed');update.rollback(ops,backup,'old-id','reviewed',release)
        self.assertEqual(calls,[('docker','start',update.NAME)])
    def test_foreign_replacement_is_never_stopped_or_removed(self):
        ops,backup,release,calls=self.fixture('foreign')
        with self.assertRaises(AssertionError):update.rollback(ops,backup,'old-id','reviewed',release)
        self.assertEqual(calls,[])
    def test_wrong_old_container_or_rw_mount_prevents_rollback_deletion(self):
        for change in ['id','mount']:
            ops,backup,release,calls=self.fixture('failed')
            if change=='id':ops['inspect'](backup)['Id']='other'
            else:ops['inspect'](update.NAME)['Mounts'][0]['RW']=True
            with self.assertRaises(AssertionError):update.rollback(ops,backup,'old-id','reviewed',release)
            self.assertEqual(calls,[])

if __name__=='__main__':unittest.main()
