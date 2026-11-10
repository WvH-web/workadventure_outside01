'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs');
const {execFileSync,execFile}=require('node:child_process');
const {createIdentityLookup,validateIdentity}=require('../ops/castle-homes/identity-lookup.cjs');
const key='a'.repeat(64),now=1794348000000;
const student={sub:'wvh:student:7',role:'student',grade:3,age:9,moderator:false,read_only:false};
const body=identity=>({version:1,checkedAt:now,identity});
const mac=value=>crypto.createHmac('sha256',key).update(value).digest('hex');
function response(options,value=body(student),{status=200,signature,type='application/json'}={}){
 const raw=typeof value==='string'?value:JSON.stringify(value);
 return new Response(raw,{status,headers:{'Content-Type':type,'X-Castle-Homes-Signature':signature??mac(options.headers['X-Castle-Homes-Nonce']+'\n'+raw)}});
}
const denied=error=>error.status===503&&error.code==='unavailable';

test('canonical ownership matches the existing student/family/staff namespaces and never substitutes age or grade',()=>{
 assert.deepEqual(validateIdentity(body(student),now),student);
 for(const [role,sub]of [['parent','wvh:family:7'],['teacher','wvh:staff:7']])assert.deepEqual(validateIdentity(body({...student,role,sub,grade:null,age:null}),now),{...student,role,sub,grade:null,age:null});
 assert.equal(validateIdentity(body(null),now),null);
 assert.equal(validateIdentity(body({...student,age:null}),now).age,null);
 assert.ok(Object.isFrozen(validateIdentity(body(student),now)));
 for(const patch of [{sub:'wvh:staff:7'},{sub:'wvh:student:07'},{sub:'7'},{grade:0},{grade:null},{age:-1},{age:121},{moderator:true},{read_only:true},{email:'private@invalid.local'},{role:'teacher'},{grade:'3'}])assert.throws(()=>validateIdentity(body({...student,...patch}),now));
 for(const value of [{...body(student),checkedAt:now-10001},{...body(student),checkedAt:now+5001},{...body(student),extra:true},{...body(student),version:2}])assert.throws(()=>validateIdentity(value,now));
});

test('each lookup signs a fresh bounded request to one fixed endpoint, without cookies or cached profiles',async()=>{
 const requests=[];let current=student;
 const lookup=createIdentityLookup({key,clock:()=>now,fetcher:async(url,options)=>{
  requests.push(options);assert.equal(url,'https://www.deine-schule.com/workadventure-castle-homes.php');assert.equal(options.redirect,'error');assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),{identifier:'pupil@invalid.local'});assert.equal(options.headers.cookie,undefined);
  assert.equal(options.headers['X-Castle-Homes-Signature'],mac(options.headers['X-Castle-Homes-Timestamp']+'\n'+options.headers['X-Castle-Homes-Nonce']+'\n'+options.body));
  return response(options,body(current));
 }});
 assert.deepEqual(await lookup('pupil@invalid.local'),student);current={...student,grade:7,age:13};assert.deepEqual(await lookup('pupil@invalid.local'),current);
 current=null;assert.equal(await lookup('pupil@invalid.local'),null);assert.equal(requests.length,3);
 assert.equal(new Set(requests.map(row=>row.headers['X-Castle-Homes-Nonce'])).size,3);
 for(const id of ['opaque',null,{},'pupil@invalid.local\n','a'.repeat(255)+'@invalid.local'])assert.equal(await lookup(id),null);
 assert.equal(requests.length,3);
});

test('invalid signatures, nonce replay responses, stale profiles, oversized and failed upstream replies fail closed',async()=>{
 let previous;
 const replay=createIdentityLookup({key,clock:()=>now,fetcher:async(_url,options)=>{const fresh=response(options);if(!previous){previous={body:await fresh.text(),signature:fresh.headers.get('x-castle-homes-signature')};return new Response(previous.body,{headers:{'Content-Type':'application/json','X-Castle-Homes-Signature':previous.signature}});}return new Response(previous.body,{headers:{'Content-Type':'application/json','X-Castle-Homes-Signature':previous.signature}});}});
 assert.deepEqual(await replay('pupil@invalid.local'),student);await assert.rejects(replay('pupil@invalid.local'),denied);
 for(const variant of [(o)=>response(o,body(student),{signature:'0'.repeat(64)}),(o)=>response(o,{...body(student),checkedAt:now-10001}),
  (o)=>response(o,{...body(student),identity:{...student,moderator:true}}),(o)=>response(o,'x'.repeat(4097)),(o)=>response(o,'not-json'),
  (o)=>response(o,body(student),{status:503}),(o)=>response(o,body(student),{type:'text/html'}),()=>{throw Error('Private diagnostic must not escape');}]){
  const lookup=createIdentityLookup({key,clock:()=>now,fetcher:async(_url,options)=>variant(options)});
  await assert.rejects(lookup('pupil@invalid.local'),error=>denied(error)&&!error.message.includes('Private'));
 }
});

test('timeouts and active lookup concurrency remain bounded and release their resources after failures',async()=>{
 let entered,release;const started=new Promise(resolve=>entered=resolve),block=new Promise(resolve=>release=resolve);
 const lookup=createIdentityLookup({key,clock:()=>now,concurrency:1,fetcher:async(_url,options)=>{entered();await block;return response(options);}});
 const first=lookup('pupil@invalid.local');await started;await assert.rejects(lookup('other@invalid.local'),denied);release();await first;
 assert.deepEqual(await lookup('pupil@invalid.local'),student);
 const timed=createIdentityLookup({key,timeout:15,clock:()=>now,fetcher:async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}))});
 await assert.rejects(timed('pupil@invalid.local'),denied);await assert.rejects(timed('pupil@invalid.local'),denied);
 for(const options of [{key:'bad'},{url:'https://evil.invalid/'},{timeout:0},{concurrency:0}])assert.throws(()=>createIdentityLookup({key,...options}));
});

function phpRuntime(){
 const binary=process.env.CASTLE_HOMES_PHP||path.resolve(__dirname,'../../sternenhueter/dorfplatz/output/runtime/php-8.5.12-1/php.exe');
 assert.ok(fs.existsSync(binary),'Set CASTLE_HOMES_PHP to a PHP CLI with PDO SQLite; this integration check is not optional');
 const args=['-n',...(process.platform==='win32'?['-d','extension_dir='+path.join(path.dirname(binary),'ext')]:[]),'-d','extension=pdo_sqlite'];
 return (file,options={})=>JSON.parse(execFileSync(binary,[...args,path.join(__dirname,file),...(options.args||[])],{input:options.input,encoding:'utf8',timeout:20000}));
}

test('real PHP SQL fixtures and request-replay/budget checks pass without school data or school writes',()=>{
 const php=phpRuntime(),identities=php('castle-homes-identity.php'),protocol=php('castle-homes-protocol.php');
 assert.equal(identities.passed,59);assert.equal(identities.realStudentRowsRead,false);assert.equal(identities.schoolWrites,false);
 assert.ok(protocol.passed>=20);assert.equal(protocol.schoolResolverNeverCalledForInvalidRequests,true);assert.equal(protocol.schoolWrites,false);
});

test('the actual PHP private protocol accepts the Node-signed request and Node validates its exact response bytes',async()=>{
 const php=phpRuntime();
 const lookup=createIdentityLookup({key,clock:()=>now,fetcher:async(_url,options)=>{
  const headers=Object.fromEntries(['timestamp','nonce','signature'].map(name=>[name,options.headers['X-Castle-Homes-'+name[0].toUpperCase()+name.slice(1)]]));
  const result=php('castle-homes-protocol.php',{args:['--reply'],input:JSON.stringify({raw:options.body,headers,now})});
  return new Response(result.body,{headers:{'Content-Type':'application/json','X-Castle-Homes-Signature':result.signature}});
 }});
 assert.deepEqual(await lookup('pupil@invalid.local'),student);
});

test('separate PHP workers cannot accept the same signed context request twice',async()=>{
 const binary=process.env.CASTLE_HOMES_PHP||path.resolve(__dirname,'../../sternenhueter/dorfplatz/output/runtime/php-8.5.12-1/php.exe');
 const base=['-n',...(process.platform==='win32'?['-d','extension_dir='+path.join(path.dirname(binary),'ext')]:[]),'-d','extension=pdo_sqlite'];
 const directory=await fs.promises.mkdtemp(path.join(require('node:os').tmpdir(),'castle-home-nonce-')),database=path.join(directory,'nonces.sqlite');
 try{
  execFileSync(binary,[...base,'-r',"new PDO('sqlite:'.$argv[1]);",database],{timeout:10000});
  const raw=JSON.stringify({identifier:'pupil@invalid.local'}),timestamp=String(now/1000),nonce='c'.repeat(40),headers={timestamp,nonce,signature:mac(timestamp+'\n'+nonce+'\n'+raw)};
  const input=JSON.stringify({raw,headers,now}),request=()=>new Promise((resolve,reject)=>{
   const child=execFile(binary,[...base,path.join(__dirname,'castle-homes-protocol.php'),'--nonce',database],{encoding:'utf8',timeout:15000},(error,stdout)=>{
    if(error){reject(error);return;}try{resolve(JSON.parse(stdout));}catch(error){reject(error);}
   });child.stdin.on('error',reject);child.stdin.end(input);
  });
  const results=await Promise.all([request(),request()]);assert.equal(results.filter(row=>row.rejected===true).length,1);assert.equal(results.filter(row=>typeof row.body==='string').length,1);
 }finally{await fs.promises.rm(directory,{recursive:true,force:true});}
});
