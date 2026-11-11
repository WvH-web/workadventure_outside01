import hashlib
from pathlib import Path
import runpy
import unittest

root=Path(__file__).resolve().parents[1]
linux=runpy.run_path(str(root/'tools/check-castle-game-host-bundled-linux.py'))
stage=runpy.run_path(str(root/'tools/castle-game-host-bundled-stage.py'))
previous=runpy.run_path(str(root/'tools/castle-game-host-stage.py'))
native=runpy.run_path(str(root/'tools/record-castle-game-host-bundled-native.py'))


class BundledHostPreflightTests(unittest.TestCase):
    def test_the_bundled_input_scope_is_distinct_without_replacing_historical_receipts(self):
        self.assertEqual(stage['SOURCE'],linux['SOURCE_SHA'])
        self.assertEqual(native['SOURCE'],stage['SOURCE'])
        self.assertEqual(hashlib.sha256((root/'tools/check-castle-game-host-native.cjs').read_bytes()).hexdigest(),native['PROBE_SHA'])
        self.assertNotEqual(stage['SOURCE'],previous['SOURCE'])
        self.assertNotEqual(stage['paths'](1)[0],previous['paths'](1)[0])
        self.assertEqual(stage['paths'](1)[0].parent,stage['PRIVATE'])
        for key in ['SOURCE','SOURCE_DESCRIPTOR','TESTS','TEST_DESCRIPTOR']:
            self.assertIn('bundled',str(linux[key]))

    def test_all_reused_operators_and_the_restricted_catalog_are_pinned_exactly(self):
        for filename,digest in [('check-castle-game-host-linux.py',linux['LIBRARY_SHA']),
            ('check-castle-piano-deployment.py',linux['AUDIT_SHA']),('check-castle-game-host-bundled-linux.py',stage['LINUX_SHA']),
            ('castle-game-host-stage.cjs',stage['BOOTSTRAP_SHA']),('castle-round-recovery-ops.py',stage['RECOVERY_SHA'])]:
            self.assertEqual(hashlib.sha256((root/'tools'/filename).read_bytes()).hexdigest(),digest)

    def test_ui_snapshot_cases_are_in_the_linux_test_bundle_not_replaced_with_the_old_subset(self):
        self.assertEqual(linux['TEST_FILES'],{'castle-game-host.test.cjs','castle-game-host-http.test.cjs','castle-game-status.test.mjs',
            'castle-rounds.test.cjs','fixtures/castle-offers.cjs'})
        for value in [linux['SOURCE_SHA'],linux['TESTS_SHA'],linux['SOURCE_DESCRIPTOR_SHA'],linux['TEST_DESCRIPTOR_SHA']]:
            self.assertRegex(value,r'^[a-f0-9]{64}$')


if __name__=='__main__':unittest.main()
