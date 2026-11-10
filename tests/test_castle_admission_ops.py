import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec=importlib.util.spec_from_file_location('admission_ops',Path(__file__).resolve().parents[1]/'tools/castle-admission-ops.py')
ops=importlib.util.module_from_spec(spec);spec.loader.exec_module(ops)

class AdmissionScope(unittest.TestCase):
    def baseline(self):
        return {'services':{ops.NAME:{'id':'old'},'play':{'id':'untouched'}},'files':{str(ops.DEPLOYMENT):'old','/nginx':'same','/map.wam':'same'}}
    def test_only_school_and_its_current_manifest_can_change(self):
        before=self.baseline();after=self.baseline();after['services'][ops.NAME]={'id':'new'};after['files'][str(ops.DEPLOYMENT)]='new'
        ops.preserved(before,after)
        for section,key in [('services','play'),('files','/nginx'),('files','/map.wam')]:
            changed=copy.deepcopy(after);changed[section][key]='unexpected'
            with self.assertRaises(AssertionError):ops.preserved(before,changed)
    def container(self):
        return {'Id':ops.EXPECTED_OLD_ID,'Image':'sha256:pinned','Config':{'User':'1000:1000','Image':'old-tag','Env':['SECRET_KEY=not-exported'],
            'Healthcheck':{'Test':['CMD','node','health']},'Labels':{'wvh.release':'old','wvh.component':'castle-school'}},
            'HostConfig':{'ReadonlyRootfs':True,'Memory':268435456,'PortBindings':{'3211/tcp':[{'HostIp':'127.0.0.1','HostPort':'3211'}]},
                'Mounts':[{'Type':'bind','Source':'/old/release','Target':'/srv/release','ReadOnly':True},
                          {'Type':'bind','Source':'/private/rules.json','Target':'/srv/rules.json','ReadOnly':True}]},
            'NetworkSettings':{'Networks':{'workadventure_default':{'Aliases':['school']}}}}
    def test_clone_preserves_restrictions_environment_health_and_private_rules(self):
        old=self.container();snapshot=copy.deepcopy(old);candidate=ops.clone_spec(old,Path('/new/release'),'new')
        self.assertEqual(old,snapshot);self.assertEqual(candidate['Image'],'sha256:pinned')
        self.assertEqual(candidate['Env'],old['Config']['Env']);self.assertEqual(candidate['Healthcheck'],old['Config']['Healthcheck'])
        self.assertEqual(candidate['HostConfig']['Mounts'][1],old['HostConfig']['Mounts'][1])
        expected=copy.deepcopy(old['HostConfig']);expected['Mounts'][0]['Source']=str(Path('/new/release'))
        self.assertEqual(candidate['HostConfig'],expected)
    def test_foreign_container_unsafe_mount_or_network_is_rejected(self):
        for change in ['id','rw','binds','network','duplicate','user']:
            old=self.container()
            if change=='id':old['Id']='foreign'
            if change=='rw':old['HostConfig']['Mounts'][0]['ReadOnly']=False
            if change=='binds':old['HostConfig']['Binds']=['unexpected']
            if change=='network':old['NetworkSettings']['Networks']['other']={}
            if change=='duplicate':old['HostConfig']['Mounts'].append(copy.deepcopy(old['HostConfig']['Mounts'][0]))
            if change=='user':old['Config']['User']='root'
            with self.subTest(change=change),self.assertRaises(AssertionError):ops.clone_spec(old,Path('/new/release'),'new')
    def test_qa_cleanup_does_not_touch_a_foreign_container(self):
        original=ops.inspect;calls=[];old_run=ops.run
        try:
            ops.run=lambda *args:calls.append(args)
            for value in [{'Id':'foreign','Config':{'Labels':{'wvh.component':'castle-admission-test'}}},
                          {'Id':'expected','Config':{'Labels':{'wvh.component':'foreign'}}}]:
                ops.inspect=lambda name:value
                with self.assertRaises(AssertionError):ops.remove_owned('test','expected')
            self.assertEqual(calls,[])
        finally:ops.inspect=original;ops.run=old_run
    def test_archive_pins_exact_files_digest_and_rejects_traversal(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'test.zip'
            with zipfile.ZipFile(path,'w') as archive:archive.writestr('allowed.cjs','reviewed')
            digest=ops.sha(path.read_bytes());self.assertEqual(ops.read_archive(path,digest,{'allowed.cjs'}),{'allowed.cjs':b'reviewed'})
            for checksum,files in [('0'*64,{'allowed.cjs'}),(digest,{'other.cjs'})]:
                with self.assertRaises(AssertionError):ops.read_archive(path,checksum,files)
            with zipfile.ZipFile(path,'w') as archive:archive.writestr('../outside','unexpected')
            with self.assertRaises(AssertionError):ops.read_archive(path,ops.sha(path.read_bytes()))
    def test_rollback_restores_exact_previous_container_even_when_create_response_was_lost(self):
        for created in ['new',None]:
            calls=[];backup='school-backup';release=Path('/new/release')
            values={backup:{'Id':ops.EXPECTED_OLD_ID},ops.NAME:{'Id':'new','Config':{'Labels':{'wvh.release':'reviewed'}},
                'Mounts':[{'Source':str(release),'Destination':'/srv/release','RW':False}]}}
            old_run,old_exists,old_inspect=ops.run,ops.exists,ops.inspect
            try:
                ops.run=lambda *args:calls.append(args);ops.exists=lambda name:name in values;ops.inspect=lambda name:values[name]
                ops.rollback(backup,release,'reviewed',created)
                self.assertEqual(calls,[('docker','stop','-t','10',ops.NAME),('docker','rm',ops.NAME),('docker','rename',backup,ops.NAME),('docker','start',ops.NAME)])
            finally:ops.run,ops.exists,ops.inspect=old_run,old_exists,old_inspect
    def test_rollback_never_removes_foreign_container_or_wrong_mount(self):
        for change in ['old-id','new-id','label','rw','source']:
            backup='school-backup';release=Path('/new/release');calls=[]
            values={backup:{'Id':ops.EXPECTED_OLD_ID},ops.NAME:{'Id':'new','Config':{'Labels':{'wvh.release':'reviewed'}},
                'Mounts':[{'Source':str(release),'Destination':'/srv/release','RW':False}]}}
            if change=='old-id':values[backup]['Id']='foreign'
            if change=='new-id':values[ops.NAME]['Id']='foreign'
            if change=='label':values[ops.NAME]['Config']['Labels']['wvh.release']='foreign'
            if change=='rw':values[ops.NAME]['Mounts'][0]['RW']=True
            if change=='source':values[ops.NAME]['Mounts'][0]['Source']='foreign'
            old_run,old_exists,old_inspect=ops.run,ops.exists,ops.inspect
            try:
                ops.run=lambda *args:calls.append(args);ops.exists=lambda name:name in values;ops.inspect=lambda name:values[name]
                with self.subTest(change=change),self.assertRaises(AssertionError):ops.rollback(backup,release,'reviewed','new')
                self.assertEqual(calls,[])
            finally:ops.run,ops.exists,ops.inspect=old_run,old_exists,old_inspect

if __name__=='__main__':unittest.main()
