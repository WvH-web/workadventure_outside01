import copy
from pathlib import Path
import runpy
import unittest

module=runpy.run_path(str(Path(__file__).resolve().parents[1]/'tools/check-castle-museum-deployment.py'))


def fixture():
    files={str(module['RECORD']):'content-old',str(module['TARGET']):'map-old',str(module['MANIFEST']):'manifest-old','other.wam':'same','role.php':'same'}
    expected={'files':files,'services':{'play':{'id':'same','started':'same'}}}
    current=copy.deepcopy(expected);current['files'][str(module['RECORD'])]='content-first'
    content=dict(before=copy.deepcopy(expected),after=copy.deepcopy(current),recordSha256='content-first')
    stage=dict(before=copy.deepcopy(current),probeSha256='probe');current['files'][str(module['PROBE'])]='probe';stage['after']=copy.deepcopy(current)
    repair=dict(before=copy.deepcopy(current),recordSha256='content-fixed');current['files'][str(module['RECORD'])]='content-fixed';repair['after']=copy.deepcopy(current)
    cleanup=dict(before=copy.deepcopy(current));del current['files'][str(module['PROBE'])];cleanup['after']=copy.deepcopy(current)
    value=dict(original=copy.deepcopy(expected),before=copy.deepcopy(current),newWamSha256='map-new',manifestAfterSha256='manifest-new')
    current['files'][str(module['TARGET'])]='map-new';current['files'][str(module['MANIFEST'])]='manifest-new';value['after']=current
    return [expected,value,content,stage,repair,cleanup]


class MuseumAuditTests(unittest.TestCase):
    def test_exact_append_repair_cleanup_and_single_map_transition(self):
        values=fixture();original=copy.deepcopy(values)
        self.assertEqual(module['transition'](*values),values[1]['after']);self.assertEqual(values,original)

    def test_changed_roles_other_maps_processes_and_missing_probe_cleanup_are_rejected(self):
        for index,key in [(1,'original'),(1,'before'),(1,'after'),(2,'before'),(2,'after'),(3,'before'),(3,'after'),(4,'before'),(4,'after'),(5,'before'),(5,'after')]:
            for section,field in [('files','role.php'),('files','other.wam'),('services','play')]:
                values=fixture();values[index][key][section][field]='changed'
                with self.assertRaises(AssertionError):module['transition'](*values)
        values=fixture();values[5]['after']['files'][str(module['PROBE'])]='forgotten'
        with self.assertRaises(AssertionError):module['transition'](*values)


if __name__=='__main__':unittest.main()
