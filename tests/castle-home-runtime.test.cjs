'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {reviewedRuntime,validateRuntimeFiles,SOURCE,ORIGINAL}=require('../ops/castle-homes/runtime.cjs');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
test('owned runtime pins all source and installed dependencies without selecting the old runtime',async()=>{
 const raw=await fs.readFile(path.join(__dirname,'../ops/castle-homes/game.manifest.json')),manifest=JSON.parse(raw);
 const files=Object.fromEntries(Object.entries(manifest.sourceFiles).filter(([name])=>!Object.hasOwn(manifest.supplementalSharedCode,name)));
 const provenance=Buffer.from(JSON.stringify({version:1,sourceRelease:ORIGINAL,files},null,2)+'\n');
 const checked=reviewedRuntime(raw,provenance);assert.equal(Object.keys(checked.files).length,4869);assert.equal(Object.keys(checked.sourceFiles).length,107);
 assert.match(SOURCE,/^\/opt\/wvh-castle-homes\/game-releases\/[a-f0-9]{16}$/);assert.equal(SOURCE.startsWith('/opt/wvh-sterne-kollegium'),false);
 assert.throws(()=>reviewedRuntime(Buffer.concat([raw,Buffer.from(' ')]),provenance));assert.throws(()=>reviewedRuntime(raw,Buffer.concat([provenance,Buffer.from(' ')])));
});
test('exact file inventory rejects shadow modules, empty extra directories, missing files and unsafe names',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'castle-home-runtime-exact-')),name='node_modules/@scope/module/index.js',file=path.join(root,name),data=Buffer.from('module.exports=1;');
 const files={[name]:sha(data)},options={owner:process.getuid?.()??0};
 try{
  await fs.mkdir(path.dirname(file),{recursive:true,mode:0o755});await fs.writeFile(file,data,{mode:0o644});await validateRuntimeFiles(root,files,options);
  const extra=path.join(root,'node_modules/@scope/module/node_modules');await fs.mkdir(extra);await assert.rejects(validateRuntimeFiles(root,files,options));await fs.rmdir(extra);
  const shadow=path.join(root,'node_modules/@scope/module/package.json');await fs.writeFile(shadow,'{}');await assert.rejects(validateRuntimeFiles(root,files,options));await fs.unlink(shadow);
  for(const name of ['../escape.js','/escape.js','C:/escape.js','a\\b','./index.js','a//b','a/../b'])await assert.rejects(validateRuntimeFiles(root,{[name]:sha(data)},options));
  await fs.unlink(file);await assert.rejects(validateRuntimeFiles(root,files,options));
 }finally{assert.equal(path.dirname(await fs.realpath(root)),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('castle-home-runtime-exact-'));await fs.rm(root,{recursive:true,force:true});}
});
test('Linux runtime rejects file and ancestor write permissions and symbolic links',{skip:process.platform!=='linux'},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'castle-home-runtime-permissions-')),file=path.join(root,'module.js'),data=Buffer.from('module.exports=1;'),files={'module.js':sha(data)},options={owner:process.getuid()};
 try{
  await fs.writeFile(file,data,{mode:0o644});await validateRuntimeFiles(root,files,options);
  await fs.chmod(file,0o666);await assert.rejects(validateRuntimeFiles(root,files,options));await fs.chmod(file,0o644);
  await fs.chmod(root,0o777);await assert.rejects(validateRuntimeFiles(root,files,options));await fs.chmod(root,0o700);
  await fs.rename(file,path.join(root,'other.js'));await fs.symlink('other.js',file);await assert.rejects(validateRuntimeFiles(root,files,options));
 }finally{await fs.chmod(root,0o700);assert.equal(path.dirname(await fs.realpath(root)),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('castle-home-runtime-permissions-'));await fs.rm(root,{recursive:true,force:true});}
});
