import hashlib
from pathlib import Path
import runpy
import tempfile
import unittest

root=Path(__file__).resolve().parents[1]
module=runpy.run_path(str(root/'tools/castle-game-host-stage.py'))


class NativeGameHostStageTests(unittest.TestCase):
    def test_attempt_paths_stay_in_the_one_private_candidate_namespace(self):
        for attempt in [1,2,9]:
            folder,record,stopped=module['paths'](attempt)
            self.assertEqual(folder.parent,module['PRIVATE']);self.assertEqual(record.parent,folder);self.assertEqual(stopped.parent,folder)
            self.assertTrue(folder.name.endswith('-attempt-'+str(attempt)))
        for attempt in [0,-1,10,True,'1',1.0]:
            with self.assertRaises(AssertionError):module['paths'](attempt)

    def test_stage_uses_the_exact_reviewed_linux_audit_and_bootstrap(self):
        for filename,key in [('check-castle-game-host-linux.py','LINUX_SHA'),('castle-game-host-stage.cjs','BOOTSTRAP_SHA'),
                             ('check-castle-piano-deployment.py','AUDIT_SHA'),('castle-round-recovery-ops.py','RECOVERY_SHA')]:
            self.assertEqual(hashlib.sha256((root/'tools'/filename).read_bytes()).hexdigest(),module[key])

    def test_a_wrong_pin_cannot_execute_an_uploaded_stage_helper(self):
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory).resolve()/'helper.py';file.write_text('raise RuntimeError("must not execute")')
            with self.assertRaises(AssertionError):module['pinned'](file,'0'*64)


if __name__=='__main__':unittest.main()
