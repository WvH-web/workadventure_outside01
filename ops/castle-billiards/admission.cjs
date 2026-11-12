'use strict';
const fs=require('node:fs'),path=require('node:path');
const {GatewayError}=require('../hall-audio/errors.cjs');
function createBilliardsAdmission(file){
 const target=path.resolve(file),parent=path.dirname(target);
 if(fs.realpathSync(parent)!==parent)throw Error('Invalid billiards policy directory');
 return auth=>{
  let policy;try{
   const stat=fs.lstatSync(target);if(stat.isSymbolicLink()||!stat.isFile()||stat.size>4096)throw Error();
   policy=JSON.parse(fs.readFileSync(target,'utf8'));
   if(!policy||Array.isArray(policy)||Object.keys(policy).sort().join(',')!=='accounts,mode,version'||policy.version!==1||!['pilot','school'].includes(policy.mode)||!Array.isArray(policy.accounts))throw Error();
   if(policy.mode==='school'&&policy.accounts.length||policy.mode==='pilot'&&(policy.accounts.length<1||policy.accounts.length>10))throw Error();
   if(new Set(policy.accounts).size!==policy.accounts.length||policy.accounts.some(value=>typeof value!=='string'||value!==value.toLowerCase()||value.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))throw Error();
  }catch{throw new GatewayError(503,'unavailable');}
  const identity=auth?.schoolIdentifier||auth?.identifier;
  return policy.mode==='school'||typeof identity==='string'&&policy.accounts.includes(identity.toLowerCase());
 };
}
module.exports={createBilliardsAdmission};
