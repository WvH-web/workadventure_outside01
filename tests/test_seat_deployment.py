import copy
from pathlib import Path
import runpy
import unittest

ops=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/castle-seat-deployment.py'))

class SeatDeploymentTest(unittest.TestCase):
    def test_only_image_scalar_changes(self):
        source=b'# preserved\nservices:\n  play:\n    image: old\n    environment:\n      KEEP: yes\n  back:\n    image: stable\n'
        self.assertEqual(ops['image_override'](source,'old','new'),source.replace(b'image: old',b'image: "new"'))

    def test_wrong_image_rejected(self):
        with self.assertRaises(AssertionError):ops['image_override'](b'services: {play: {image: other}}','old','new')

    def test_image_inheritance_rejected(self):
        with self.assertRaises(AssertionError):ops['image_override'](b'base: &base {image: old}\nservices: {play: {<<: *base}}','old','new')

    def test_projection_never_changes_maps(self):
        before={'services':{'workadventure-play-1':{'id':'old'},'school':{'id':'stable'}},'files':{'castle.wam':'same'}}
        after=ops['baseline_projection'](before,{'id':'new'})
        self.assertEqual(after['files'],before['files']);self.assertEqual(after['services']['school'],before['services']['school'])
        self.assertEqual(before['services']['workadventure-play-1']['id'],'old')

    def test_other_restart_is_rejected(self):
        before={'workadventure-play-1':'old','school':'same'}
        ops['unchanged_except_play'](before,{'workadventure-play-1':'new','school':'same'})
        with self.assertRaises(AssertionError):ops['unchanged_except_play'](before,{'workadventure-play-1':'new','school':'changed'})

    def test_auth_configuration_is_not_normalized_away(self):
        before={'Config':{'Hostname':'oldid','Image':'old','Env':['AUTH=on'],'Labels':{'com.docker.compose.image':'old','school':'keep'}}}
        after=copy.deepcopy(before);after['Config']['Hostname']='newid';after['Config']['Image']='new';after['Config']['Labels']['com.docker.compose.image']='new'
        self.assertEqual(ops['normalized_container'](before),ops['normalized_container'](after))
        after['Config']['Env']=['AUTH=off'];self.assertNotEqual(ops['normalized_container'](before),ops['normalized_container'](after))

    def test_environment_order_is_not_a_configuration_change(self):
        a={'Config':{'Env':['AUTH=on','SCHOOL=protected']}};b=copy.deepcopy(a);b['Config']['Env'].reverse()
        self.assertEqual(ops['normalized_container'](a),ops['normalized_container'](b))
        b['Config']['Env'].append('AUTH=on');self.assertNotEqual(ops['normalized_container'](a),ops['normalized_container'](b))

    def test_mount_order_is_not_a_configuration_change(self):
        a={'Mounts':[{'Target':'/one','Source':'/protected-one','ReadOnly':True},{'Target':'/two','Source':'/protected-two','ReadOnly':True}]}
        b=copy.deepcopy(a);b['Mounts'].reverse();self.assertEqual(ops['normalized_host'](a),ops['normalized_host'](b))
        b['Mounts'][0]['ReadOnly']=False;self.assertNotEqual(ops['normalized_host'](a),ops['normalized_host'](b))

    def test_changed_mount_source_is_not_normalized_away(self):
        a={'Mounts':[{'Target':'/one','Source':'/protected-one','ReadOnly':True}]};b=copy.deepcopy(a);b['Mounts'][0]['Source']='/other'
        self.assertNotEqual(ops['normalized_host'](a),ops['normalized_host'](b))

    def proof(self):
        row={key:True for key in ['nativeSpace','heldSpaceOnce','focusedSpaceOnce','focusedEnterOnce','pointerOrTouch','nativeSidePanel',
            'nativeRoomTravel','noTutorialRepeat','movementAfterTravel','temporaryAvatarPreserved']}
        row.update(button={'width':144,'height':44},legacyPopupHeight=80)
        return {'passed':True,'stageOnly':True,'imageId':'candidate','errors':[],'certificateChecksBypassed':False,'networkResponsesSubstituted':False,
            'realStudentAccountsUsed':False,'rows':[dict(row,mobile=False),dict(row,mobile=True)]}

    def test_native_stage_requires_both_viewports(self):
        proof=self.proof();ops['gate'](proof,'candidate');proof['rows']=proof['rows'][:1]
        with self.assertRaises(AssertionError):ops['gate'](proof,'candidate')

    def test_tls_bypass_not_accepted(self):
        proof=self.proof();proof['certificateChecksBypassed']=True
        with self.assertRaises(AssertionError):ops['gate'](proof,'candidate')

    def test_broken_space_not_accepted(self):
        proof=self.proof();proof['rows'][0]['focusedSpaceOnce']=False
        with self.assertRaises(AssertionError):ops['gate'](proof,'candidate')

    def test_wrong_candidate_not_accepted(self):
        with self.assertRaises(AssertionError):ops['gate'](self.proof(),'different')

if __name__=='__main__':unittest.main()
