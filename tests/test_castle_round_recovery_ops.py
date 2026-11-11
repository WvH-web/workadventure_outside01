import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('recovery',root/'tools/castle-round-recovery-ops.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


def fixture():
    conversation={'before':[{'energy':0,'rooms':[]},{'energy':0,'rooms':[]}],
                  'after':[{'energy':1,'rooms':['synthetic-area-lesekamin']},{'energy':2,'rooms':['synthetic-area-lesekamin']}],
                  'connectionAndAudioWaitMilliseconds':2000}
    library=dict(case='native-library',normalMicrosoftPupils=2,**{key:True for key in ['oneMobileTouch','tableAudioDecodedBoth','directoryDoesNotMuteConversation','onePixelPrivateBridge','realGradeFiltering','stageClassOverrideNotPublished','creatorDepartureKeepsPeer','explicitReentryWorks','heartbeatWithoutOpenDirectory']})
    travel=dict(case='native-travel',**{key:True for key in ['crossMapArrivalReauthorized','visitReleasesPreviousMembership','lastPhysicalDepartureRemovesAnnouncement','normalMovementAfterClosure','nonblankNativeCanvas','noSeatOrGameClaimed']})
    recover=dict(case='bounded-recovery',noModuleInterception=False,**{key:True for key in ['oneExplicitPreAdmission503','sameLeaseRetained','noCachedDeadlineExtension','freshRealServerRenewal','noCreateOrJoinReplay']})
    return dict(passed=True,errors=[],realNativeWorkAdventure=True,publishedPreview=True,stageOnly=False,mapsModifiedOnlyInsideTestBrowsers=False,
                realClassOverrideOnlyInStage=False,productionSchoolAndWebConfigChanged=False,loadApprovalFor400=False,
                results=[library,travel,recover],audio=copy.deepcopy(conversation),
                recovery=dict(candidate=True,moduleInterception=True,mapInterception=False,schoolDecisionInterception=False,naturalHeartbeatFault=True,
                              explicitFaultInjection={'route':'round-heartbeat','status':503,'count':1},moduleSha256=module.FILES.copy(),
                              observed={str(n)+':'+name:digest for n in [1,2] for name,digest in module.FILES.items()},audio=conversation))


class RoundRecoveryTests(unittest.TestCase):
    def test_only_exact_reviewed_modules_are_publishable(self):
        self.assertEqual(set(module.FILES),{'presence.js','round-client.js'})
        for name,digest in module.FILES.items():self.assertEqual(module.sha((root/'ops/castle-school/public'/name).read_bytes()),digest)

    def test_routes_are_two_exact_static_paths_without_any_api_or_permissions_override(self):
        with tempfile.TemporaryDirectory() as directory,patch.object(module,'BASE',Path(directory).resolve()):
            text=module.route(module.BASE/('a'*16))
            self.assertEqual(text.count(b'location = '),2)
            for name in module.FILES:self.assertIn(('location = /castle-school/'+name+' {').encode(),text)
            self.assertNotIn(b'proxy_pass',text);self.assertNotIn(b'round-heartbeat',text)
            self.assertEqual(text.count(b'if ($args != "") { return 404; }'),2)
            self.assertEqual(text.count(b'if ($request_method != GET) { return 405; }'),2)
            self.assertEqual(text.count(b'microphone=(), camera=(), display-capture=()'),2)
            for target in [module.BASE/'not-a-release',module.BASE.parent/('a'*16)]:
                with self.assertRaises(AssertionError):module.route(target)

    def test_only_nginx_hash_can_change_and_services_maps_keys_and_manifests_must_match(self):
        before={'services':{'school':{'id':'same'}},'files':{str(module.NGINX):'old','map':'map','key':'key','deployment':'old'}}
        after=copy.deepcopy(before);after['files'][str(module.NGINX)]='new';module.transition(before,after)
        for change in [{'services':{}},{'files':{**after['files'],'map':'different'}},{'files':{**after['files'],'key':'different'}},{'files':{**after['files'],'extra':'bad'}}]:
            with self.assertRaises(AssertionError):module.transition(before,{**after,**change})
        with self.assertRaises(AssertionError):module.transition(before,before)

    def test_proof_requires_real_native_audio_and_fresh_renewal_not_just_success_flags(self):
        original=fixture();module.proof(original,True)
        published=copy.deepcopy(original);published['recovery']['candidate']=published['recovery']['moduleInterception']=False
        published['results'][2]['noModuleInterception']=True;module.proof(published,False)
        for path,value in [(('recovery','schoolDecisionInterception'),True),(('recovery','mapInterception'),True),
                           (('recovery','naturalHeartbeatFault'),False),
                           (('recovery','explicitFaultInjection','count'),2),(('results',2,'freshRealServerRenewal'),False),
                           (('recovery','observed','2:presence.js'),'wrong'),(('audio','after',1,'energy'),0),
                           (('recovery','audio','after',0,'energy'),float('nan')),(('loadApprovalFor400',),True)]:
            changed=copy.deepcopy(original);cursor=changed
            for key in path[:-1]:cursor=cursor[key]
            cursor[path[-1]]=value
            with self.assertRaises(AssertionError):module.proof(changed,True)
        with self.assertRaises(AssertionError):module.proof(original,False)

    def test_history_projection_checks_current_baseline_before_returning_saved_exact_history(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory).resolve();nginx=root/'nginx';old=b'old\n';target=root/('a'*16)
            with patch.object(module,'BASE',root),patch.object(module,'NGINX',nginx):
                new=old+module.route(target);nginx.write_bytes(new)
                value={'before':{'files':{'nginx':'old'}},'after':{'files':{'nginx':'new'}},'directory':str(target)}
                current=copy.deepcopy(value['after']);ops={'baseline':lambda:current}
                with patch.object(module,'verified',return_value=(value,old)):
                    history,receipt=module.historical(ops);self.assertEqual(history['baseline'](),value['before']);self.assertEqual(history['historical_nginx'](),old)
                    self.assertEqual(receipt,value);current['files']['nginx']='foreign'
                    with self.assertRaises(AssertionError):history['baseline']()
                    nginx.write_bytes(b'foreign')
                    with self.assertRaises(AssertionError):history['historical_nginx']()

    def test_accepted_deployment_cannot_be_rolled_back_by_the_staging_command(self):
        with tempfile.TemporaryDirectory() as directory,patch.object(module,'RECORD',Path(directory)/'accepted.json'):
            module.RECORD.write_text('{}')
            with patch.object(module,'reload') as reload:
                with self.assertRaises(AssertionError):module.rollback({})
                reload.assert_not_called()

    def test_publication_changes_no_service_or_manifest_and_web_failure_restores_exact_previous_bytes(self):
        for fails in [False,True]:
            with self.subTest(fails=fails),tempfile.TemporaryDirectory() as directory:
                parent=Path(directory).resolve();private=parent/'private';private.mkdir();nginx=parent/'nginx';old=b'# untouched\n';nginx.write_bytes(old)
                archive=parent/'payload.zip';descriptor=parent/'payload.json'
                with zipfile.ZipFile(archive,'w') as bundle:
                    for name in module.FILES:bundle.writestr(name,(root/'ops/castle-school/public'/name).read_bytes())
                descriptor.write_text(json.dumps({'version':1,'files':module.FILES,'archiveSha256':module.sha(archive.read_bytes()),'sourceCommit':'a'*40}))
                def baseline():return {'services':{'school':{'id':'same','started':'same'}},'files':{str(nginx):module.sha(nginx.read_bytes()),'map':'unchanged','keys':'unchanged'}}
                records={};ops={'baseline':baseline,'run':lambda *args:'same','atomic':lambda path,value:records.update({path.name:copy.deepcopy(value)})}
                initial=baseline();candidate=json.dumps(fixture()).encode()
                with patch.multiple(module,PRIVATE=private,BASE=parent/'releases',NGINX=nginx,RECORD=private/'accepted.json',STAGE=private/'stage.json',ARCHIVE=archive,DESCRIPTOR=descriptor),\
                     patch.object(module,'read',return_value=(candidate,fixture())),patch.object(module,'reload') as reload,\
                     patch.object(module,'public_files',side_effect=RuntimeError('test web failure') if fails else None):
                    if fails:
                        with self.assertRaisesRegex(RuntimeError,'previous web configuration restored'):module.deploy(ops)
                        self.assertEqual(nginx.read_bytes(),old);self.assertEqual(baseline(),initial);self.assertNotIn('stage.json',records)
                        self.assertTrue(records['round-recovery-failure.json']['restored']);self.assertEqual(reload.call_count,2)
                    else:
                        module.deploy(ops);value=records['stage.json'];self.assertTrue(value['provisional']);self.assertTrue(value['membershipsPreserved'])
                        self.assertEqual(value['before'],initial);module.transition(initial,baseline());self.assertEqual(reload.call_count,1)

    def test_a_foreign_web_change_during_failure_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            parent=Path(directory).resolve();private=parent/'private';private.mkdir();nginx=parent/'nginx';nginx.write_bytes(b'old')
            archive=parent/'payload.zip';descriptor=parent/'payload.json'
            with zipfile.ZipFile(archive,'w') as bundle:
                for name in module.FILES:bundle.writestr(name,(root/'ops/castle-school/public'/name).read_bytes())
            descriptor.write_text(json.dumps({'version':1,'files':module.FILES,'archiveSha256':module.sha(archive.read_bytes()),'sourceCommit':'a'*40}))
            def foreign():nginx.write_bytes(b'foreign');raise RuntimeError('foreign state')
            ops={'baseline':lambda:{'services':{},'files':{str(nginx):module.sha(nginx.read_bytes())}},'run':lambda *args:'same','atomic':lambda *args:None}
            with patch.multiple(module,PRIVATE=private,BASE=parent/'releases',NGINX=nginx,RECORD=private/'accepted.json',STAGE=private/'stage.json',ARCHIVE=archive,DESCRIPTOR=descriptor),\
                 patch.object(module,'read',return_value=(b'synthetic',fixture())),patch.object(module,'reload') as reload,patch.object(module,'public_files',side_effect=foreign):
                with self.assertRaises(AssertionError):module.deploy(ops)
                self.assertEqual(nginx.read_bytes(),b'foreign');self.assertEqual(reload.call_count,1)

    def test_only_exact_old_module_readiness_can_wait_other_static_errors_fail_immediately(self):
        pending=module.PendingRoutes({'sha256':'exact-old'});fatal=module.StaticCheckError({'status':403})
        with patch.object(module,'public_files',side_effect=[pending,None]) as check,patch.object(module.time,'sleep') as sleep:
            self.assertEqual(module.wait_public(),[pending.observed]);self.assertEqual(check.call_count,2);sleep.assert_called_once_with(.5)
        with patch.object(module,'public_files',side_effect=fatal) as check,patch.object(module.time,'sleep') as sleep:
            with self.assertRaises(module.StaticCheckError):module.wait_public()
            check.assert_called_once();sleep.assert_not_called()
        with patch.object(module,'public_files',side_effect=pending),patch.object(module.time,'monotonic',side_effect=[0,21]),patch.object(module.time,'sleep') as sleep:
            with self.assertRaises(module.PendingRoutes):module.wait_public()
            sleep.assert_not_called()


if __name__=='__main__':unittest.main()
