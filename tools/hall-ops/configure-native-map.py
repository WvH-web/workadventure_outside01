"""Change only the private gateway's exact allowed preview room URI."""
import os
from pathlib import Path
import shutil

os.umask(0o077)
path=Path('/opt/wvh-hall-audio/private/runtime.env')
before='https://together.deine-schule.com/_/global/wvh-web.github.io/workadventure_outside01/castle/grosse-halle.tmj'
after='https://together.deine-schule.com/~/castle-preview/grosse-halle.wam'
lines=path.read_text().splitlines()
matches=[line for line in lines if line.startswith('HALL_AUDIO_MAP_ID=')]
if matches!=['HALL_AUDIO_MAP_ID='+before]:
    raise RuntimeError('The configured hall URI differs from the reviewed baseline')
backup=path.with_name('runtime-before-native-wam.env')
if backup.exists():
    raise RuntimeError('A native routing backup already exists; review before reconfiguration')
shutil.copyfile(path,backup)
backup.chmod(0o600)
new=path.with_name('runtime-native-wam.staging')
new.write_text('\n'.join('HALL_AUDIO_MAP_ID='+after if line.startswith('HALL_AUDIO_MAP_ID=') else line for line in lines)+'\n')
new.chmod(0o600)
new.replace(path)
print('Only the private hall map URI was updated. The isolated gateway must be rolled over to activate it.')
