import hashlib
import json
from pathlib import Path
import runpy
import tempfile
import unittest

publish=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/publish-castle-home-control-proof.py'))['publish']


class ProofPublicationTests(unittest.TestCase):
    def test_only_complete_validated_bytes_become_visible(self):
        with tempfile.TemporaryDirectory(prefix='castle-proof-') as directory:
            source=Path(directory)/'uploading';target=Path(directory)/'ready';raw=b'{"passed":true}'
            expected=dict(sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw));source.write_bytes(raw[:8])
            with self.assertRaises(AssertionError):publish(source,target,expected,lambda value:None)
            self.assertFalse(target.exists());self.assertEqual(source.read_bytes(),raw[:8])
            source.write_bytes(raw);publish(source,target,expected,lambda value:self.assertEqual(value,{'passed':True}))
            self.assertFalse(source.exists());self.assertEqual(target.read_bytes(),raw)

    def test_bad_json_rejected_proof_and_existing_target_are_never_published(self):
        with tempfile.TemporaryDirectory(prefix='castle-proof-') as directory:
            source=Path(directory)/'uploading';target=Path(directory)/'ready'
            for raw in [b'{',b'{"passed":false}']:
                source.write_bytes(raw);expected=dict(sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw))
                with self.assertRaises((AssertionError,json.JSONDecodeError)):publish(source,target,expected,lambda value:self.assertTrue(value['passed']))
                self.assertFalse(target.exists())
            target.write_bytes(b'previous');source.write_bytes(b'{}');expected=dict(sha256=hashlib.sha256(b'{}').hexdigest(),bytes=2)
            with self.assertRaises(AssertionError):publish(source,target,expected,lambda value:None)
            self.assertEqual(target.read_bytes(),b'previous')


if __name__=='__main__':unittest.main()
