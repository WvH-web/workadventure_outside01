import copy
import json
from pathlib import Path
import runpy
import subprocess
import unittest

root=Path(__file__).resolve().parents[1]
module=runpy.run_path(str(root/'tools/measure-castle-admission-capacity.py'));result=module['result']


def fixture():
    report=dict(requests=400,successful=400,profileRequests=400,providerRequests=400,elapsedMs=3000,maximumGraph=16,maximumProfiles=16,
        graphActive=0,profileActive=0,transportPreconnected=False,normalMicrosoftLoginLoadTested=False,fullCastleApprovalFor400=False)
    return [dict(type='runtime',node='v22.fixture',platform='linux'),dict(type='diagnostic',value={'httpStatuses':{'200':400}}),dict(type='diagnostic',value=report)]


class AdmissionMeasureTests(unittest.TestCase):
    def test_attempts_have_distinct_owned_names_and_fixed_private_parent(self):
        previous=set()
        for attempt in range(1,10):
            name,path=module['plan'](attempt);self.assertTrue(name.startswith(module['NAME']));self.assertEqual(path.parent,module['PRIVATE'])
            self.assertNotIn(name,previous);previous.add(name)
        for attempt in [0,10,True,'2','../other']:
            with self.assertRaises(AssertionError):module['plan'](attempt)

    def test_only_reviewed_disconnect_test_difference_can_use_the_exact_archived_file(self):
        current=(root/'tests/castle-admission-http.test.cjs').read_bytes()
        archived=subprocess.check_output(['git','show','58010aa:tests/castle-admission-http.test.cjs'],cwd=root)
        self.assertEqual(module['reviewed_source'](current,archived,'castle-admission-http.test.cjs'),archived)
        self.assertEqual(module['reviewed_source'](b'same',b'same','other'),b'same')
        for changed in [current+b' ',current.replace(b'length,400',b'length,399')]:
            with self.assertRaises(AssertionError):module['reviewed_source'](changed,archived,'castle-admission-http.test.cjs')
        with self.assertRaises(AssertionError):module['reviewed_source'](current,archived,'other-file.cjs')

    def test_only_complete_successful_original_linux_gate_passes(self):
        rows=fixture();serialize=lambda value:'\n'.join(json.dumps(row) for row in value)
        self.assertTrue(result(serialize(rows),0)['passed']);self.assertFalse(result(serialize(rows),1)['passed'])
        for value in [rows[:-1],rows+rows,[*rows,{'type':'failure'}]]:self.assertFalse(result(serialize(value),0)['passed'])
        changed=copy.deepcopy(rows);changed[0]['platform']='win32';self.assertFalse(result(serialize(changed),0)['passed'])
        changed=copy.deepcopy(rows);changed[1]['value']['httpStatuses']={'200':286,'503':114};self.assertFalse(result(serialize(changed),0)['passed'])
        for field,value in [('successful',399),('providerRequests',399),('maximumGraph',17),('maximumProfiles',-1),('graphActive',1),
                ('elapsedMs',True),('transportPreconnected',True),('normalMicrosoftLoginLoadTested',True),('fullCastleApprovalFor400',True)]:
            changed=copy.deepcopy(rows);changed[2]['value'][field]=value
            self.assertFalse(result(serialize(changed),0)['passed'],field)


if __name__=='__main__':unittest.main()
