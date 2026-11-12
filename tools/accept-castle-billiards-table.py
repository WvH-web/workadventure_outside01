"""Accept the exact observed native table result, then remove its extra probe."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-castle-billiards-table-acceptance.py');assert path.resolve()==path
raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='6fa4eebd4eafc2c4bc45ec0772edcf11f9da1ca5681f92e8bbfd8c2283f2b0a2'
scope={'__name__':'billiards_table_acceptance','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
scope['accept']('41c771e30e3946187cf7cc57050102dbbc1e892b7d9dd3c3584cadd5b1ee5af9')
scope['operator']()['cleanup']();scope['verify']()
