import hashlib
import json
from pathlib import Path
import runpy
import stat
import tempfile
import unittest
import zipfile

module=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/check-castle-game-host-linux.py'))
sha=lambda raw:hashlib.sha256(raw).hexdigest()


class GameHostLinuxTests(unittest.TestCase):
    def bundle(self,root,name='server.cjs',link=False):
        archive=root/'source.zip';descriptor=root/'source.json';body=b'synthetic fixture'
        with zipfile.ZipFile(archive,'w') as handle:
            if link:
                info=zipfile.ZipInfo(name);info.external_attr=(stat.S_IFLNK|0o777)<<16;handle.writestr(info,body)
            else:handle.writestr(name,body)
        value={'version':1,'sourceCommit':'a'*40,'archiveSha256':sha(archive.read_bytes()),'files':{name:sha(body)}}
        descriptor.write_text(json.dumps(value));return archive,descriptor,value

    def test_only_the_exact_hashed_archive_and_descriptor_are_read(self):
        with tempfile.TemporaryDirectory() as directory:
            archive,descriptor,value=self.bundle(Path(directory));meta,payload=module['archive'](archive,value['archiveSha256'],descriptor,sha(descriptor.read_bytes()))
            self.assertEqual(meta,value);self.assertEqual(payload,{'server.cjs':b'synthetic fixture'})
            for digest,descriptor_digest in [('0'*64,sha(descriptor.read_bytes())),(value['archiveSha256'],'0'*64)]:
                with self.assertRaises(AssertionError):module['archive'](archive,digest,descriptor,descriptor_digest)

    def test_links_and_escaping_or_noncanonical_names_are_rejected_before_extraction(self):
        for name,link in [('../server.cjs',False),('/server.cjs',False),('files\\server.cjs',False),('server.cjs',True)]:
            with self.subTest(name=name,link=link),tempfile.TemporaryDirectory() as directory:
                archive,descriptor,value=self.bundle(Path(directory),name,link)
                with self.assertRaises(AssertionError):module['archive'](archive,value['archiveSha256'],descriptor,sha(descriptor.read_bytes()))

    def test_payload_hashes_and_exact_descriptor_shape_cannot_be_skipped(self):
        with tempfile.TemporaryDirectory() as directory:
            archive,descriptor,value=self.bundle(Path(directory))
            for patch in [{'files':{'server.cjs':'0'*64}},{'sourceCommit':'not-a-commit'},{'extra':'ignored'}]:
                descriptor.write_text(json.dumps({**value,**patch}))
                with self.assertRaises(AssertionError):module['archive'](archive,value['archiveSha256'],descriptor,sha(descriptor.read_bytes()))

    def test_retained_candidate_files_are_never_overwritten_with_different_bytes(self):
        function=module['exact_directory'];previous=function.__globals__['PRIVATE']
        try:
            with tempfile.TemporaryDirectory() as directory:
                private=Path(directory).resolve();function.__globals__['PRIVATE']=private;target=private/'candidate'/'ops'
                function(target,{'server.cjs':b'original'});function(target,{'server.cjs':b'original'})
                with self.assertRaises(AssertionError):function(target,{'server.cjs':b'changed'})
                self.assertEqual((target/'server.cjs').read_bytes(),b'original')
                with self.assertRaises(AssertionError):function(private/'foreign',{'server.cjs':b'ignored'})
        finally:function.__globals__['PRIVATE']=previous


if __name__=='__main__':unittest.main()
