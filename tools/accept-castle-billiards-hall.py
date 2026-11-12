"""Record the exact normal two-account, native game-hall acceptance."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-castle-billiards-hall-acceptance.py');assert path.resolve()==path
raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='76781b1bc212b9caf2852f953c0f9c5eb18c897f7184d4e9a48df7a98e46667a'
scope={'__name__':'billiards_hall_acceptance','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
scope['accept']('fb661134c7b57dbde7af6cbc8d463081ad1ddaac68cc733422a0eb22c6dc1a48')
