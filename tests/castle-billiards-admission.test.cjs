'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createBilliardsAdmission}=require('../ops/castle-billiards/admission.cjs');
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'castle-billiards-policy-'))),file=path.join(root,'admission.json');
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const write=value=>fs.writeFileSync(file,JSON.stringify(value));return {root,file,write};
}
test('private pilot accounts do not grant school roles and canonical school identity takes priority',t=>{
 const f=fixture(t);f.write({version:1,mode:'pilot',accounts:['a@invalid.local']});const admit=createBilliardsAdmission(f.file);
 assert.equal(admit({identifier:'A@INVALID.LOCAL'}),true);assert.equal(admit({identifier:'b@invalid.local'}),false);
 assert.equal(admit({identifier:'a@invalid.local',schoolIdentifier:'b@invalid.local'}),false);assert.equal(admit(null),false);
});
test('an atomic policy replacement applies immediately without a service restart',t=>{
 const f=fixture(t);f.write({version:1,mode:'pilot',accounts:['a@invalid.local']});const admit=createBilliardsAdmission(f.file);
 const replacement=path.join(f.root,'replacement.json');fs.writeFileSync(replacement,JSON.stringify({version:1,mode:'pilot',accounts:['b@invalid.local']}));fs.renameSync(replacement,f.file);
 assert.equal(admit({identifier:'a@invalid.local'}),false);assert.equal(admit({identifier:'b@invalid.local'}),true);
 f.write({version:1,mode:'school',accounts:[]});assert.equal(admit(null),true);
});
test('missing, malformed, oversized and excessive policy files fail closed',t=>{
 const f=fixture(t),admit=createBilliardsAdmission(f.file),reject=()=>assert.throws(()=>admit({identifier:'a@invalid.local'}),error=>error.status===503&&error.code==='unavailable');reject();
 for(const value of [null,[],{}, {version:2,mode:'pilot',accounts:['a@invalid.local']},{version:1,mode:'pilot',accounts:[]},
  {version:1,mode:'pilot',accounts:['A@invalid.local']},{version:1,mode:'pilot',accounts:['a@invalid.local','a@invalid.local']},
  {version:1,mode:'pilot',accounts:['not-an-email']},{version:1,mode:'school',accounts:['a@invalid.local']},
  {version:1,mode:'public',accounts:[]},{version:1,mode:'school',accounts:[],extra:true},
  {version:1,mode:'pilot',accounts:Array.from({length:11},(_,i)=>`p${i}@invalid.local`)}]){f.write(value);reject();}
 fs.writeFileSync(f.file,'{');reject();fs.writeFileSync(f.file,' '.repeat(4097));reject();
});
