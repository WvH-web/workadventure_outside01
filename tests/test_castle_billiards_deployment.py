"""Offline scope checks. Never opens a connection or invokes Docker."""
import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import Mock,patch

spec=importlib.util.spec_from_file_location('billiards_deployment',Path(__file__).resolve().parents[1]/'tools/castle-billiards-deployment.py')
ops=importlib.util.module_from_spec(spec);spec.loader.exec_module(ops)

class BilliardsDeployment(unittest.TestCase):
    def before(self):
        return {'services':{'play':{'id':'unchanged','started':'old'}},'files':{str(ops.NGINX):'old','village.tmj':'unchanged','castle.wam':'unchanged','school.env':'private-digest'}}

    def test_only_expected_nginx_digest_may_change(self):
        before=self.before();after=copy.deepcopy(before);after['files'][str(ops.NGINX)]='new';ops.preserve(before,after,'new');self.assertEqual(before,self.before())

    def test_no_other_service_restart_is_permitted(self):
        before=self.before();after=copy.deepcopy(before);after['files'][str(ops.NGINX)]='new';after['services']['play']['started']='new'
        with self.assertRaises(AssertionError):ops.preserve(before,after,'new')

    def test_no_map_or_school_configuration_may_change(self):
        for name in ['village.tmj','castle.wam','school.env']:
            before=self.before();after=copy.deepcopy(before);after['files'][str(ops.NGINX)]='new';after['files'][name]='changed'
            with self.assertRaises(AssertionError):ops.preserve(before,after,'new')

    def test_nginx_is_a_single_scoped_loopback_route(self):
        self.assertEqual(ops.BLOCK.count(b'location '),1);self.assertIn(b'location ^~ /castle-billiards/',ops.BLOCK)
        self.assertIn(b'proxy_pass http://127.0.0.1:3261;',ops.BLOCK);self.assertIn(b'proxy_buffering off;',ops.BLOCK)
        for unrelated in [b'/castle-school/',b'/castle-chess/',b'/castle-content/',b'/castle-preview/']:
            self.assertNotIn(unrelated,ops.BLOCK)

    def test_identity_material_is_not_embedded(self):
        source=Path(ops.__file__).read_text();self.assertNotIn('sberner@',source);self.assertNotIn('password=',source.lower())
        self.assertIn("['A','B']",source);self.assertIn("'mode':'pilot'",source)

    def test_policy_permissions_are_restored_after_restrictive_umask(self):
        directory=Mock();target=Mock();directory.__truediv__=Mock(return_value=target)
        directory.stat.return_value.st_mode=0o40750;target.stat.return_value.st_mode=0o100640
        with patch.object(ops.os,'chown',create=True) as chown:
            self.assertIs(ops.write_policy(directory,['a@invalid.local','b@invalid.local']),target)
        directory.mkdir.assert_called_once_with(mode=0o750);directory.chmod.assert_called_once_with(0o750)
        target.chmod.assert_called_once_with(0o640);self.assertEqual(chown.call_count,2)

if __name__=='__main__':unittest.main()
