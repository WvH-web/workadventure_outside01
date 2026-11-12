'use strict';
const {parentPort}=require('node:worker_threads'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,manifest=JSON.parse(fs.readFileSync(path.join(root,'vendor-manifest.json')));
const raw=fs.readFileSync(path.join(root,'vendor/core.cjs'));
if(crypto.createHash('sha256').update(raw).digest('hex')!==manifest.coreSha256)throw Error('Billiards core integrity');
const core=require('./vendor/core.cjs'),{createBilliardsModel}=require('./model.cjs'),model=createBilliardsModel(core);
parentPort.on('message',request=>{
 try{
  if(!request||typeof request.id!=='string'||!['initial','shoot','place'].includes(request.kind))throw Error('invalid_request');
  const result=request.kind==='initial'?{state:model.initial(),geometry:model.geometry()}:request.kind==='place'?{state:model.place(request.state,request.input)}:model.shoot(request.state,request.input);
  parentPort.postMessage({id:request.id,ok:true,result});
 }catch(error){parentPort.postMessage({id:request?.id,ok:false,error:error.code||'simulation_failed'});}
});
