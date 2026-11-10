import copy
from pathlib import Path
import runpy
import unittest

ops=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/hall-ops/repair-health.py'))


class HealthRepairTests(unittest.TestCase):
    def old(self):
        return {'Id':ops['EXPECTED_ID'],'Image':'sha256:synthetic','State':{'Running':True},
                'Config':{'Env':['PRIVATE_VALUE=synthetic-do-not-export'],'Cmd':['/srv/hall-audio/server.cjs'],
                          'Image':'original-image-tag','Healthcheck':{'Test':['CMD-SHELL','wrong-port-3000']}},
                'HostConfig':{'PortBindings':{'3210/tcp':[{'HostIp':'127.0.0.1','HostPort':'3210'}]},'ReadonlyRootfs':True,'Memory':402653184},
                'NetworkSettings':{'Networks':{'workadventure_default':{'Aliases':['wvh-hall-audio'],'IPAMConfig':None}}}}

    def test_only_health_and_immutable_image_change(self):
        old=self.old();before=copy.deepcopy(old);result=ops['clone_spec'](old)
        self.assertEqual(old,before)
        expected=copy.deepcopy(old['Config']);expected['Healthcheck']=ops['HEALTH_CONFIG'];expected['Image']=old['Image']
        self.assertEqual({key:value for key,value in result.items() if key not in ['HostConfig','NetworkingConfig']},expected)
        self.assertEqual(result['HostConfig'],old['HostConfig'])
        result['Env'].append('TEST=1');self.assertEqual(old,before)

    def test_health_has_exact_bounded_owned_route(self):
        health=ops['HEALTH_CONFIG']
        self.assertEqual(health['Test'][:3],['CMD','node','-e'])
        self.assertIn('http://127.0.0.1:3210/castle-audio/health',health['Test'][3])
        self.assertIn('JSON.parse(body).ready===true',health['Test'][3])
        self.assertIn('body.length>1024',health['Test'][3])
        self.assertLess(health['Timeout'],health['Interval'])

    def test_changed_network_port_or_identity_is_rejected(self):
        for kind in ['id','network','port','static']:
            old=self.old()
            if kind=='id':old['Id']='another-container'
            if kind=='network':old['NetworkSettings']['Networks']['other']={}
            if kind=='port':old['HostConfig']['PortBindings']['3210/tcp'][0]['HostIp']='0.0.0.0'
            if kind=='static':old['NetworkSettings']['Networks']['workadventure_default']['IPAMConfig']={'IPv4Address':'1.2.3.4'}
            with self.assertRaises(AssertionError):ops['clone_spec'](old)

    def test_every_other_service_and_protected_file_must_match(self):
        before={'files':{'map':'original'},'services':{'wvh-hall-audio':{'id':'old'},'school':{'id':'same'}}}
        after=copy.deepcopy(before);after['services']['wvh-hall-audio']['id']='new';ops['preserved'](before,after)
        for field in ['files','services']:
            invalid=copy.deepcopy(after)
            if field=='files':invalid['files']['map']='changed'
            else:invalid['services']['school']['id']='changed'
            with self.assertRaises(AssertionError):ops['preserved'](before,invalid)


if __name__=='__main__':unittest.main()
