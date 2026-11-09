"""Exercise only the pure override editor with the server's existing safe YAML parser."""
import ast
import copy
import json
from pathlib import Path
import unittest
import yaml

source=Path('/tmp/wvh-onboarding-deploy-source.py') if __file__=='<stdin>' else Path(__file__).resolve().parents[1]/'tools/deploy-castle-onboarding.py'
module=ast.parse(source.read_text())
function=next(node for node in module.body if isinstance(node,ast.FunctionDef) and node.name=='image_override')
approval_function=next(node for node in module.body if isinstance(node,ast.FunctionDef) and node.name=='validate_maintenance_approval')
scope={'copy':copy,'json':json,'yaml':yaml,'EXPECTED':'candidate-image','BASE':'base-image'}
exec(compile(ast.Module(body=[function,approval_function],type_ignores=[]),str(source),'exec'),scope)
edit=scope['image_override'];old='wvh-workadventure-play:1.34.5-school-v3';new='wvh-workadventure-play:1.34.5-school-v4-onboarding'

class ImageOverrideTests(unittest.TestCase):
    def test_plain_yaml_changes_only_one_scalar(self):
        before=('# untouched\nservices:\n  play:\n    image: '+old+' # keep\n    environment:\n      EXAMPLE: "unchanged"\n').encode()
        after=edit(before,old,new)
        self.assertEqual(after,before.replace(old.encode(),json.dumps(new).encode(),1))

    def test_json_is_supported_without_reformatting(self):
        before=json.dumps({'services':{'play':{'image':old},'other':{'image':'do-not-touch'}}},indent=4).encode()
        self.assertEqual(edit(before,old,new),before.replace(json.dumps(old).encode(),json.dumps(new).encode(),1))

    def test_crlf_unicode_and_other_service_values_are_preserved(self):
        before=('# Pruefung: \u00dcbernahme\r\nservices:\r\n  other:\r\n    image: '+old+'\r\n  play:\r\n    image: "'+old+'"\r\n').encode()
        after=edit(before,old,new)
        self.assertEqual(after,before.replace(('"'+old+'"').encode(),json.dumps(new).encode(),1))

    def test_changed_baseline_is_rejected(self):
        with self.assertRaises(AssertionError):edit(b'services:\n  play:\n    image: someone-elses-image\n',old,new)

    def test_duplicate_image_is_rejected(self):
        raw=('services:\n  play:\n    image: '+old+'\n    image: '+old+'\n').encode()
        with self.assertRaises(AssertionError):edit(raw,old,new)

    def test_duplicate_play_is_rejected(self):
        raw=('services:\n  play:\n    image: '+old+'\n  play:\n    image: '+old+'\n').encode()
        with self.assertRaises(AssertionError):edit(raw,old,new)

    def test_inherited_image_is_rejected_instead_of_changing_an_anchor(self):
        raw=('x-base: &base\n  image: '+old+'\nservices:\n  play:\n    <<: *base\n').encode()
        with self.assertRaises(AssertionError):edit(raw,old,new)

    def test_unsafe_yaml_constructors_are_not_executed(self):
        with self.assertRaises(yaml.YAMLError):edit(b'!!python/object/apply:builtins.print ["must-not-run"]',old,new)

class MaintenanceApprovalTests(unittest.TestCase):
    def setUp(self):
        self.value={'version':1,'scope':'play-only','approved_by':'current-user','allow_active_sessions':True,
            'image_id':'candidate-image','base_image_id':'base-image','override_sha256':'configuration-hash',
            'approved_at':1000,'expires_at':1900}

    def check(self,value=None,now=1100):
        return scope['validate_maintenance_approval'](self.value if value is None else value,now,'configuration-hash')

    def test_current_explicit_scoped_approval_is_accepted(self):self.check()

    def test_expired_or_future_approval_is_rejected(self):
        for now in [999,1900,2000]:
            with self.subTest(now=now),self.assertRaises(AssertionError):self.check(now=now)

    def test_changed_image_configuration_or_scope_is_rejected(self):
        for key in ['image_id','base_image_id','override_sha256','scope','approved_by']:
            value={**self.value,key:'different'}
            with self.subTest(key=key),self.assertRaises(AssertionError):self.check(value)

    def test_missing_or_implicit_approval_is_rejected(self):
        for flag in [None,False,1,'true']:
            with self.subTest(flag=flag),self.assertRaises(AssertionError):self.check({**self.value,'allow_active_sessions':flag})

    def test_unbounded_window_and_noninteger_timestamps_are_rejected(self):
        for extra in [{'expires_at':1000},{'expires_at':1000000},{'approved_at':True},{'expires_at':'1900'}]:
            with self.subTest(extra=extra),self.assertRaises(AssertionError):self.check({**self.value,**extra})

if __name__=='__main__':unittest.main(verbosity=2)
