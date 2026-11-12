"""Prepare a frozen, reversible change to one new-castle room only."""
import hashlib
from pathlib import Path

path=Path('/tmp/wvh-castle-billiards-hall-publication.py');assert path.resolve()==path
raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()=='7af7b7dbe79fd73c3e714fcdef705c43c7d0f2733c12d8b331ccad02a8e23172'
scope={'__name__':'billiards_hall_prepare','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope)
scope['prepare']('4bd247d074cb158aaa2461ec3993891fca94ce0a639cd659e10f188ae6971879')
