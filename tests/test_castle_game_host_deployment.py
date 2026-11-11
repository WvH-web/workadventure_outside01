import copy
import hashlib
from pathlib import Path
import runpy
import unittest

root=Path(__file__).resolve().parents[1]
ops=runpy.run_path(str(root/'tools/castle-game-host-deployment-ops.py'))


class HostPublicationTests(unittest.TestCase):
    def baseline(self):
        return {'services':{'wvh-castle-school':{'id':'old','started':'one'},'play':{'id':'play','started':'zero'}},
            'files':{str(ops['NGINX']):ops['sha'](self.nginx()),str(ops['MANIFEST']):'old','map.wam':'map','runtime.env':'secret'}}

    def nginx(self):
        return b'other\nlocation = /castle-school/rounds {\n    '+ops['OLD_ALIAS']+b'\n    if ($args != "") { return 404; }\n}\nrecovery aliases unchanged\n'

    def transition(self):
        before=self.baseline();after=copy.deepcopy(before)
        after['services']['wvh-castle-school']={'id':'new','started':'two'}
        after['files'][str(ops['NGINX'])]=ops['sha'](ops['alias'](self.nginx()))
        after['files'][str(ops['MANIFEST'])]='new'
        return before,after

    def test_exact_alias_keeps_every_guard_and_other_route_byte(self):
        raw=self.nginx();new=ops['alias'](raw)
        self.assertEqual(new.replace(ops['NEW_ALIAS'],ops['OLD_ALIAS']),raw)
        for raw in [raw+ops['OLD_ALIAS'],raw.replace(ops['OLD_ALIAS'],b'changed'),raw+ops['NEW_ALIAS'],raw+b'location = /castle-school/rounds {']:
            with self.assertRaises(AssertionError):ops['alias'](raw)

    def test_only_service_manifest_and_single_alias_can_change(self):
        before,after=self.transition();ops['preserved'](before,after,self.nginx(),ops['alias'](self.nginx()))
        for change in ['map','secret','other-service','dropped','same-school']:
            altered=copy.deepcopy(after)
            if change=='map':altered['files']['map.wam']='new'
            if change=='secret':altered['files']['runtime.env']='new'
            if change=='other-service':altered['services']['play']['started']='new'
            if change=='dropped':del altered['files']['map.wam']
            if change=='same-school':altered['services']['wvh-castle-school']['id']='old'
            with self.subTest(change=change),self.assertRaises(AssertionError):ops['preserved'](before,altered,self.nginx(),ops['alias'](self.nginx()))

    def test_rollback_permits_only_the_original_school_start_timestamp_to_change(self):
        before=self.baseline();after=copy.deepcopy(before);after['services']['wvh-castle-school']['started']='restarted'
        ops['preserved'](before,after,self.nginx(),self.nginx(),True)
        after['services']['wvh-castle-school']['id']='different'
        with self.assertRaises(AssertionError):ops['preserved'](before,after,self.nginx(),self.nginx(),True)

    def old(self):
        return {'Image':'sha256:same','Config':{'User':'1000:1000','Labels':{'wvh.release':'old'},'Env':['PRIVATE=unchanged']},
            'HostConfig':{'ReadonlyRootfs':True,'Binds':None,'Memory':268435456,'NanoCpus':500000000,
                'Mounts':[{'Target':'/srv/release','Source':'/old','Type':'bind','ReadOnly':True},
                    {'Target':'/srv/rules.json','Source':'/private/rules.json','Type':'bind','ReadOnly':True}]},
            'NetworkSettings':{'Networks':{'workadventure_default':{'Aliases':['oldalias'],'IPAMConfig':None,'Links':None,'DriverOpts':None}}}}

    def test_clone_retains_private_environment_limits_rules_and_network(self):
        old=self.old();snapshot=copy.deepcopy(old);spec=ops['clone_spec'](old)
        self.assertEqual(old,snapshot)
        expected=copy.deepcopy(old['Config']);expected['Image']=old['Image'];expected['Labels']['wvh.release']=ops['SOURCE'][:16]
        self.assertEqual({key:spec[key] for key in expected},expected)
        host=copy.deepcopy(old['HostConfig']);host['Mounts'][0]['Source']=str(ops['RELEASE'])
        self.assertEqual(spec['HostConfig'],host)
        self.assertEqual(spec['NetworkingConfig'],{'EndpointsConfig':{'workadventure_default':{'Aliases':['oldalias']}}})

    def test_clone_rejects_unsafe_or_ambiguous_mounts_and_network(self):
        for kind in ['writable','two-mounts','root-user','writable-root','extra-network','explicit-ip','binds']:
            old=self.old()
            if kind=='writable':old['HostConfig']['Mounts'][0]['ReadOnly']=False
            if kind=='two-mounts':old['HostConfig']['Mounts'].append(copy.deepcopy(old['HostConfig']['Mounts'][0]))
            if kind=='root-user':old['Config']['User']='root'
            if kind=='writable-root':old['HostConfig']['ReadonlyRootfs']=False
            if kind=='extra-network':old['NetworkSettings']['Networks']['other']={}
            if kind=='explicit-ip':old['NetworkSettings']['Networks']['workadventure_default']['IPAMConfig']={'IPv4Address':'1.2.3.4'}
            if kind=='binds':old['HostConfig']['Binds']=['/host:/container']
            with self.subTest(kind=kind),self.assertRaises(AssertionError):ops['clone_spec'](old)

    def test_all_running_services_other_than_school_remain_exact(self):
        before={'wvh-castle-school':{'id':'old'},'other':{'id':'same','configSha256':'same'}}
        after=copy.deepcopy(before);after['wvh-castle-school']['id']='new';ops['preserved_running'](before,after)
        after['other']['configSha256']='changed'
        with self.assertRaises(AssertionError):ops['preserved_running'](before,after)

    def test_all_entry_points_pin_the_same_operator_without_changing_the_old_audit(self):
        digest=hashlib.sha256((root/'tools/castle-game-host-deployment-ops.py').read_bytes()).hexdigest()
        for filename in ['stage-castle-game-host-publication.py','publish-castle-game-host.py','run-castle-audit.py']:
            self.assertIn(digest,(root/'tools'/filename).read_text())
        self.assertEqual(hashlib.sha256((root/'tools/check-castle-piano-deployment.py').read_bytes()).hexdigest(),ops['AUDIT_SHA'])


if __name__=='__main__':unittest.main()
