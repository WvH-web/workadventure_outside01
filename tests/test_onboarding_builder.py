"""Unit tests only: every Docker/process command is stubbed, no real build runs."""
import importlib.util
from pathlib import Path
import subprocess
import unittest

file=Path(__file__).resolve().parents[1]/'tools/build-castle-onboarding.py'
spec=importlib.util.spec_from_file_location('castle_onboarding_build',file)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class Commands:
    def __init__(self):self.calls=[];self.processes='';self.fail_create=False;self.fail_remove=False
    def __call__(self,*args):
        self.calls.append(args)
        if args[:2]==('ps','-eo'):return self.processes
        if args[:3]==('docker','buildx','create') and self.fail_create:raise subprocess.CalledProcessError(1,args)
        if args[:3]==('docker','buildx','rm') and self.fail_remove:raise subprocess.CalledProcessError(1,args)
        return ''

class OwnedBuilderTests(unittest.TestCase):
    def test_each_run_has_a_new_private_name(self):
        first=module.OwnedBuilder(Commands());second=module.OwnedBuilder(Commands())
        self.assertNotEqual(first.name,second.name);self.assertRegex(first.name,r'^wvh-castle-onboarding-[a-f0-9]{32}$')

    def test_success_removes_only_its_builder_without_keep_state_or_prune(self):
        commands=Commands();builder=module.OwnedBuilder(commands);builder.create();result=builder.cleanup(process_done=True)
        self.assertTrue(result['removed']);self.assertFalse(result['cacheRetained'])
        self.assertEqual(commands.calls[-1],('docker','buildx','rm',builder.name));self.assertFalse(builder.created)
        self.assertTrue(all('prune' not in command and '--force' not in command and '--all' not in command for command in commands.calls))

    def test_running_own_build_is_never_removed(self):
        commands=Commands();builder=module.OwnedBuilder(commands);builder.create()
        self.assertEqual(builder.cleanup()['reason'],'own-build-still-running');self.assertEqual(len(commands.calls),1)

    def test_foreign_client_using_this_builder_defers_cleanup(self):
        for cli in ['docker buildx build --builder ', 'docker-buildx build --builder=']:
            commands=Commands();builder=module.OwnedBuilder(commands);builder.create();commands.processes=cli+builder.name+' .'
            self.assertEqual(builder.cleanup(process_done=True)['reason'],'another-build-client-uses-this-builder')
            self.assertFalse(any(command[:3]==('docker','buildx','rm') for command in commands.calls))

    def test_other_builders_are_left_alone(self):
        commands=Commands();builder=module.OwnedBuilder(commands);builder.create();commands.processes='docker buildx build --builder someone-else .'
        self.assertTrue(builder.cleanup(process_done=True)['removed']);self.assertNotIn('someone-else',commands.calls[-1])

    def test_failed_create_does_not_claim_or_remove_an_existing_builder(self):
        commands=Commands();commands.fail_create=True;builder=module.OwnedBuilder(commands)
        with self.assertRaises(subprocess.CalledProcessError):builder.create()
        self.assertEqual(builder.cleanup(process_done=True)['reason'],'not-owned-by-this-run');self.assertEqual(len(commands.calls),1)

    def test_unowned_default_or_legacy_builder_name_is_rejected(self):
        for name in ['default','wvh-castle-onboarding','someone-else']:
            commands=Commands();builder=module.OwnedBuilder(commands);builder.create();builder.name=name
            with self.assertRaises(RuntimeError):builder.cleanup(process_done=True)
            self.assertEqual(len(commands.calls),1)

    def test_failed_removal_is_not_reported_as_success(self):
        commands=Commands();builder=module.OwnedBuilder(commands);builder.create();commands.fail_remove=True
        with self.assertRaises(subprocess.CalledProcessError):builder.cleanup(process_done=True)
        self.assertTrue(builder.created)

    def test_no_second_create_can_reuse_the_same_instance(self):
        commands=Commands();builder=module.OwnedBuilder(commands);builder.create()
        with self.assertRaises(RuntimeError):builder.create()
        self.assertEqual(len(commands.calls),1)

if __name__=='__main__':unittest.main(verbosity=2)
