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
scope={'copy':copy,'json':json,'yaml':yaml}
exec(compile(ast.Module(body=[function],type_ignores=[]),str(source),'exec'),scope)
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

if __name__=='__main__':unittest.main(verbosity=2)
