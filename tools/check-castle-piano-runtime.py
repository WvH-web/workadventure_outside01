"""Read-only runtime compatibility check; never print school configuration values."""
import json
import subprocess
from pathlib import Path
def run(*args):return subprocess.check_output(args,text=True,stderr=subprocess.PIPE)
def main():
    value=json.loads(run('docker','inspect','wvh-castle-school'))[0]
    env=dict(item.split('=',1) for item in value['Config']['Env'] if '=' in item)
    modules=json.loads(run('docker','exec','wvh-castle-school','node','-e',
      "console.log(JSON.stringify({node:process.version,module:require.resolve('jose'),nodePath:process.env.NODE_PATH||null}))"))
    print(json.dumps({'running':value['State']['Running'],'healthy':value['State']['Health']['Status']=='healthy',
      'image':value['Image'],'modulePaths':modules,'configurationNames':sorted(key for key in env if key.startswith('CASTLE_') or key=='NODE_PATH')},indent=2))
    print(json.dumps({'publicHelperAncestors':{str(path):oct(path.stat().st_mode&0o777) for path in [Path('/opt'),Path('/opt/wvh-castle-school'),Path('/opt/wvh-castle-school/frontend')] if path.exists()}}))
if __name__=='__main__':main()
