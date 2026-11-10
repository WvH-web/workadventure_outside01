'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),output=path.resolve(root,'../output'),source=path.resolve(root,'../sternenhueter');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const files=['authority.cjs','gateway.cjs','game-adapter.cjs','identity-lookup.cjs','SchoolIdentity.php','ContextProtocol.php','context.php'].map(name=>'ops/castle-homes/'+name)
 .concat(['index.html','entry.js','entry.css','room.html','room.css','exit.html','exit.js'].map(name=>'ops/castle-homes/public/'+name),
 ['ops/castle-school/identity.cjs','ops/castle-school/admission.cjs','ops/hall-audio/auth.cjs','ops/hall-audio/errors.cjs',
  'ops/hall-audio/public/vendor/lucide.min.js','ops/hall-audio/public/vendor/lucide.LICENSE',
  'tools/check-castle-homes-vps.cjs','tools/castle-home-test-client.cjs','tools/castle-homes-context-router.php']);
async function main(){
 const {bedroomAssets}=await import(pathToFileURL(path.join(source,'dorfplatz/server/bedrooms.mjs')).href);
 const inputs=new Set([...bedroomAssets(path.join(source,'dorfplatz')).values()].map(file=>path.relative(source,file).replaceAll('\\','/')));
 for(const item of fs.readdirSync(path.join(source,'dorfplatz/server'),{recursive:true,withFileTypes:true}))if(item.isFile())inputs.add(path.relative(source,path.join(item.parentPath,item.name)).replaceAll('\\','/'));
 for(const name of ['proximity.js','proximity.css','proximity-session.js','vendor/livekit-client-2.23.0.js','../package.json','../package-lock.json'])inputs.add(path.posix.normalize('dorfplatz/public/'+name));
 const manifest={version:1,sourceRelease:'/opt/wvh-sterne-kollegium/releases/20261109T191624Z',files:{}};
 for(const name of [...inputs].sort()){
  const candidate=path.resolve(source,name);if(!candidate.startsWith(source+path.sep)||!fs.lstatSync(candidate).isFile()||/(?:^|\/)(?:data|node_modules|\.env)(?:\/|$)/.test(name))throw Error('Unreviewed runtime input');
  manifest.files[name]=sha(fs.readFileSync(candidate));
 }
 for(const file of files)if(!fs.lstatSync(path.join(root,file)).isFile())throw Error('Expected regular source file');
 fs.mkdirSync(output,{recursive:true});const name='castle-homes-runtime.manifest.json';fs.writeFileSync(path.join(output,name),JSON.stringify(manifest,null,2)+'\n');
 const archive=path.join(output,'wvh-castle-homes-qa.zip');execFileSync('tar',['-a','-cf',archive,...files,'-C',output,name],{cwd:root,stdio:'inherit'});
 console.log(JSON.stringify({files:files.length+1,runtimeInputs:inputs.size,archiveSha256:sha(fs.readFileSync(archive)),privateConfigurationIncluded:false}));
}
main().catch(error=>{console.error('Home QA package failed: '+error.message);process.exitCode=1;});
