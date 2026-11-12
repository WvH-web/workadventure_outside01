'use strict';
const {Worker}=require('node:worker_threads'),path=require('node:path'),crypto=require('node:crypto');
class PhysicsPool {
 constructor({size=2,queueLimit=6,timeoutMs=2500}={}){
  if(!Number.isInteger(size)||size<1||size>4||!Number.isInteger(queueLimit)||queueLimit<0||queueLimit>16||!Number.isFinite(timeoutMs)||timeoutMs<50||timeoutMs>5000)throw Error('Invalid physics limits');
  this.queueLimit=queueLimit;this.timeoutMs=timeoutMs;this.queue=[];this.slots=[];this.closed=false;this.terminating=new Set();
  for(let i=0;i<size;i++){const slot={worker:null,job:null,generation:0,failures:0,disabled:false};this.slots.push(slot);this.spawn(slot);}
 }
 spawn(slot){
  const generation=++slot.generation,worker=new Worker(path.join(__dirname,'physics-worker.cjs'),{resourceLimits:{maxOldGenerationSizeMb:96,maxYoungGenerationSizeMb:16}});
  slot.worker=worker;
  worker.on('message',message=>{
   if(slot.generation!==generation||!slot.job||message.id!==slot.job.id)return;
   const job=slot.job;slot.job=null;slot.failures=0;clearTimeout(job.timer);
   if(message.ok)job.resolve(message.result);else job.reject(Object.assign(Error(message.error),{code:message.error}));this.pump();
  });
  const failed=()=>{if(slot.generation!==generation)return;this.fail(slot,'simulation_unavailable');};
  worker.on('error',failed);worker.on('exit',()=>{if(!this.closed&&slot.generation===generation)failed();});
 }
 fail(slot,code){
  const old=slot.worker;++slot.generation;slot.worker=null;slot.failures++;slot.disabled=slot.failures>=3;
  if(slot.job){const job=slot.job;slot.job=null;clearTimeout(job.timer);job.reject(Object.assign(Error(code),{code}));}
  if(old){const ended=old.terminate();this.terminating.add(ended);
   const finished=()=>{this.terminating.delete(ended);if(!this.closed&&!slot.disabled){this.spawn(slot);this.pump();}};
   void ended.then(finished,finished);
  }
  if(this.slots.every(value=>value.disabled))for(const job of this.queue.splice(0)){clearTimeout(job.queueTimer);job.reject(Object.assign(Error('simulation_unavailable'),{code:'simulation_unavailable'}));}
 }
 run(kind,state,input){
  if(this.closed)return Promise.reject(Object.assign(Error('closed'),{code:'closed'}));
  if(this.slots.every(slot=>slot.disabled))return Promise.reject(Object.assign(Error('simulation_unavailable'),{code:'simulation_unavailable'}));
  if(!['initial','shoot','place'].includes(kind))return Promise.reject(Object.assign(Error('invalid_request'),{code:'invalid_request'}));
  if(this.queue.length>=this.queueLimit&&this.slots.every(slot=>slot.job||!slot.worker))return Promise.reject(Object.assign(Error('busy'),{code:'busy'}));
  return new Promise((resolve,reject)=>{
   const job={id:crypto.randomUUID(),kind,state,input,resolve,reject,timer:null,queueTimer:null,deadline:Date.now()+this.timeoutMs};
   job.queueTimer=setTimeout(()=>{const index=this.queue.indexOf(job);if(index!==-1){this.queue.splice(index,1);reject(Object.assign(Error('simulation_timeout'),{code:'simulation_timeout'}));}},this.timeoutMs);job.queueTimer.unref();
   this.queue.push(job);this.pump();
  });
 }
 pump(){
  if(this.closed)return;
  for(const slot of this.slots){while(!slot.job&&slot.worker&&this.queue.length){
   const job=this.queue.shift();clearTimeout(job.queueTimer);const remaining=job.deadline-Date.now();
   if(remaining<=0){job.reject(Object.assign(Error('simulation_timeout'),{code:'simulation_timeout'}));continue;}
   slot.job=job;job.timer=setTimeout(()=>{if(slot.job===job)this.fail(slot,'simulation_timeout');},remaining);job.timer.unref();
   try{slot.worker.postMessage({id:job.id,kind:job.kind,state:job.state,input:job.input});}catch{this.fail(slot,'simulation_unavailable');}
  }}
 }
 async close(){
  if(this.closed)return this.closeTask;this.closed=true;
  for(const job of this.queue.splice(0)){clearTimeout(job.queueTimer);job.reject(Object.assign(Error('closed'),{code:'closed'}));}
  const closing=[];for(const slot of this.slots){++slot.generation;if(slot.job){clearTimeout(slot.job.timer);slot.job.reject(Object.assign(Error('closed'),{code:'closed'}));slot.job=null;}if(slot.worker)closing.push(slot.worker.terminate());slot.worker=null;}
  this.closeTask=Promise.all([...closing,...this.terminating]);await this.closeTask;
 }
}
module.exports={PhysicsPool};
