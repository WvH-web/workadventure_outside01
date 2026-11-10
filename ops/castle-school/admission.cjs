'use strict';
const {performance}=require('node:perf_hooks');
const {GatewayError}=require('../hall-audio/errors.cjs');
const unavailable=()=>new GatewayError(503,'unavailable',1);

class AdmissionGate {
  constructor({concurrency=16,maxPending=512,maxPerKey=4,waitMs=4000,now=()=>performance.now()}={}){
    if(!Number.isInteger(concurrency)||concurrency<1||concurrency>64||!Number.isInteger(maxPending)||maxPending<0||maxPending>1024||
      !Number.isInteger(maxPerKey)||maxPerKey<1||maxPerKey>16||!Number.isInteger(waitMs)||waitMs<1||waitMs>10000||typeof now!=='function')throw Error('Invalid admission limits');
    Object.assign(this,{concurrency,maxPending,maxPerKey,waitMs,now});this.active=0;this.waiting=[];this.counts=new Map();this.closed=false;
  }
  count(key,change){const next=(this.counts.get(key)||0)+change;if(next)this.counts.set(key,next);else this.counts.delete(key);}
  grant(key){
    this.active++;let released=false;
    return ()=>{if(released)return;released=true;this.active--;this.count(key,-1);this.drain();};
  }
  remove(entry,error){
    if(entry.state!=='waiting')return;
    entry.state='ended';const index=this.waiting.indexOf(entry);if(index>=0)this.waiting.splice(index,1);
    clearTimeout(entry.timer);entry.signal?.removeEventListener('abort',entry.abort);this.count(entry.key,-1);entry.reject(error);
  }
  drain(){
    while(!this.closed&&this.active<this.concurrency&&this.waiting.length){
      const entry=this.waiting.shift();
      if(entry.signal?.aborted||this.now()>=entry.deadline){this.remove(entry,unavailable());continue;}
      entry.state='active';clearTimeout(entry.timer);entry.signal?.removeEventListener('abort',entry.abort);entry.resolve(this.grant(entry.key));
    }
  }
  acquire(key,{signal}={}){
    if(typeof key!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(key))throw Error('Opaque admission key required');
    if(this.closed||signal?.aborted)return Promise.reject(unavailable());
    if((this.counts.get(key)||0)>=this.maxPerKey)return Promise.reject(new GatewayError(429,'rate_limited',1));
    if(this.active<this.concurrency&&this.waiting.length===0){this.count(key,1);return Promise.resolve(this.grant(key));}
    if(this.waiting.length>=this.maxPending)return Promise.reject(unavailable());
    this.count(key,1);
    return new Promise((resolve,reject)=>{
      const entry={key,signal,resolve,reject,state:'waiting',deadline:this.now()+this.waitMs};
      entry.abort=()=>this.remove(entry,unavailable());entry.timer=setTimeout(()=>this.remove(entry,unavailable()),this.waitMs);
      this.waiting.push(entry);signal?.addEventListener('abort',entry.abort,{once:true});if(signal?.aborted)entry.abort();
    });
  }
  close(){if(this.closed)return;this.closed=true;for(const entry of [...this.waiting])this.remove(entry,unavailable());}
}
module.exports={AdmissionGate};
