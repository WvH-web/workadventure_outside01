"""Bounded, network-isolated startup diagnosis. Existing services and evidence are read-only."""
import json
from pathlib import Path
import subprocess

base=Path('/opt/wvh-castle-billiards-pilot-r2');private=base/'private'
before=json.loads((private/'before.json').read_text());assert json.loads((private/'rollback.json').read_text())['previousPlatformPreserved'] is True
release=base/'releases'/before['archiveSha256'][:16];name='wvh-castle-billiards-diagnose'
assert not subprocess.check_output(['docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}'],text=True).strip()
script="""
const fs=require('node:fs'),Module=require('node:module'),path=require('node:path');
const file='/srv/release/castle-billiards/server.cjs',source=fs.readFileSync(file,'utf8');
if(!source.endsWith('module.exports={createBilliardsServer};\\n'))throw Error('Unexpected startup source');
const mod=new Module(file);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));
mod._compile(source.replace('module.exports={createBilliardsServer};','module.exports={createBilliardsServer,main};'),file);
mod.exports.main().then(()=>{console.log(JSON.stringify({startup:true}));process.emit('SIGTERM');},error=>{
 console.log(JSON.stringify({startup:false,type:error.name,locations:error.stack.split('\\n').slice(1,6)}));process.exitCode=1;
});
"""
args=['docker','run','--rm','--name',name,'--network','none','--user','1000:1000','--read-only','--env-file',str(private/'runtime.env'),
 '--label','wvh.component=castle-billiards-diagnose','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','512m','--cpus','1',
 '--mount','type=bind,src='+str(release)+',dst=/srv/release,readonly','--mount','type=bind,src='+str(base/'policy')+',dst=/srv/billiards-policy,readonly',
 '--mount','type=bind,src='+str(base/'data')+',dst=/srv/billiards-data,readonly','--entrypoint','node',before['image'],'-e',script]
try:
    result=subprocess.run(args,text=True,capture_output=True,timeout=20)
    print(json.dumps({'exitCode':result.returncode,'diagnosis':result.stdout.strip(),'stderrPresent':bool(result.stderr)}))
finally:
    active=subprocess.check_output(['docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}'],text=True).strip()
    if active:
        value=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
        assert value['Config']['Labels'].get('wvh.component')=='castle-billiards-diagnose'
        subprocess.run(['docker','stop','-t','3',name],check=True,capture_output=True);subprocess.run(['docker','rm',name],check=True,capture_output=True)
