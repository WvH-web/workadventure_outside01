from pathlib import Path
import runpy
import unittest

module=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/castle-capacity/run-server-media.py'))


class CapacityCommandTests(unittest.TestCase):
    def arguments(self,**extra):
        values={'unit':'wvh-castlecap-'+'a'*24+'-400.scope','room':'castle-capacity-'+'a'*24,'prefix':'castlecap'+'a'*24,
                'subscribers':400,'duration':60,'uid':65534,'gid':65534}
        values.update(extra)
        return module['command'](**values)

    def test_hard_resource_caps_and_unprivileged_audio_only(self):
        args=self.arguments()
        for flag in ['--property=MemoryMax=1536M','--property=MemorySwapMax=0','--property=CPUQuota=100%','--property=TasksMax=2048','--reuid=65534','--regid=65534','--no-new-privs','--collect']:
            self.assertIn(flag,args)
        self.assertEqual(args[args.index('--video-publishers')+1],'0')
        self.assertEqual(args[args.index('--audio-publishers')+1],'1')
        self.assertFalse(any('api-secret' in arg or 'api-key' in arg for arg in args))

    def test_foreign_unit_room_identity_and_unbounded_counts_are_rejected(self):
        for values in [{'unit':'nginx.service'},{'room':'existing-room'},{'prefix':'another-prefix'},
                       {'unit':'wvh-castlecap-'+'b'*24+'-400.scope'},{'subscribers':1000},{'duration':99999},{'uid':0},{'gid':0}]:
            with self.assertRaises(AssertionError):self.arguments(**values)

    def test_stages_remain_bounded(self):
        self.assertEqual(module['STAGES'],[(25,20),(100,30),(200,40),(400,60)])


if __name__=='__main__':unittest.main()
