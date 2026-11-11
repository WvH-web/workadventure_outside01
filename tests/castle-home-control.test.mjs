import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {installRoomControl,refreshRoomControl} from '../ops/castle-homes/public/room-control.js';
const wait=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

async function fixture(repair){
 const source=process.env.STERNENHUETER_SOURCE||(process.platform==='linux'?'/opt/wvh-castle-homes/game-releases/8a7b5a2e1bf03405':path.resolve(import.meta.dirname,'../../sternenhueter'));
 const manifest=JSON.parse(await fs.readFile(new URL('../ops/castle-homes/game.manifest.json',import.meta.url)));
 const raw=await fs.readFile(path.join(source,'dorfplatz/public/proximity-session.js'));
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),manifest.sourceFiles['dorfplatz/public/proximity-session.js']);
 const {ProximitySession}=await import('data:text/javascript;base64,'+raw.toString('base64'));
 const connect=deferred(),publishing=deferred(),finishVideo=deferred();let requests=0,stopped=0;
 class Room{
  constructor(){this.remoteParticipants=new Map();this.state='connecting';this.canPlaybackAudio=true;this.localParticipant={publishTrack:async track=>{if(track.mediaStreamTrack.kind==='video'){publishing.resolve();await finishVideo.promise;}}};}
  on(){}async connect(){await connect.promise;this.state='connected';}async disconnect(){this.state='disconnected';}
 }
 const sdk={Room,RoomEvent:{},Track:{Source:{Microphone:'microphone',Camera:'camera'}}};
 const session=new ProximitySession({connected:()=>true,context:()=> 'fixed-private-room',loadSDK:async()=>sdk,
  request:async()=>{requests++;return {active:true,mode:'group',leaseMs:9000,peers:[],assignment:'isolated-room',grant:{url:'wss://invalid.local',token:'fake-sdk-only'}};}});
 session.mode='group';session.active=true;session.client='own-client';
 for(const kind of ['audio','video'])session.tracks.set(kind,{mediaStreamTrack:{kind,readyState:'live'},stop(){stopped++;}});
 if(repair)installRoomControl(session);
 return {session,connect,publishing,finishVideo,get requests(){return requests;},get stopped(){return stopped;},
  async close(){session.destroy();connect.resolve();finishVideo.resolve();await wait();}};
}

test('the pinned original blocks renewals during camera publication; the owned control path keeps renewing',async()=>{
 for(const repair of [false,true]){
  const f=await fixture(repair);
  try{
   const first=f.session.pulse();await wait();f.connect.resolve();await f.publishing.promise;
   await f.session.pulse();assert.equal(f.requests,repair?2:1);
   f.finishVideo.resolve();await first;await wait();assert.equal(f.session.active,true);assert.equal(f.stopped,0);
  }finally{await f.close();}
 }
});

test('only one control request per generation runs; an old completion cannot clear a newer request or revive a call',async()=>{
 const old=deferred(),fresh=deferred(),accepted=[],stops=[];let requests=0;
 const s={active:true,client:'old',generation:1,gameConnected:()=>true,context:()=> 'room',request:()=>++requests===1?old.promise:fresh.promise,
  accept:data=>accepted.push(data),stop:reason=>stops.push(reason)};
 const first=refreshRoomControl(s);await refreshRoomControl(s);assert.equal(requests,1);
 s.generation++;s.client='new';const second=refreshRoomControl(s);assert.equal(requests,2);
 old.resolve('stale');await first;await refreshRoomControl(s);assert.equal(requests,2);assert.deepEqual(accepted,[]);
 fresh.resolve('current');await second;assert.deepEqual(accepted,['current']);assert.deepEqual(stops,[]);
});

test('control denial or lost game connection stops capture, while late media errors cannot stop a later generation',async()=>{
 const media=deferred();let stopped=0;
 const s={active:true,client:'own',generation:1,gameConnected:()=>true,context:()=> 'room',request:async()=>({active:true}),
  accept:()=>media.promise,stop(){stopped++;this.active=false;this.generation++;}};
 await refreshRoomControl(s);s.generation++;media.reject(Error('old negotiation'));await wait();assert.equal(stopped,0);
 s.request=async()=>{throw Error('fresh school denial');};await refreshRoomControl(s);assert.equal(stopped,1);
 s.active=true;s.gameConnected=()=>false;await refreshRoomControl(s);assert.equal(stopped,2);
});

test('the original inactive-grant and expired-lease guards still stop both media kinds immediately',async()=>{
 for(const data of [{active:false,leaseMs:9000},{active:true,mode:'group',leaseMs:0}]){
  const f=await fixture(true);
  try{f.session.request=async()=>data;await f.session.pulse();await wait();assert.equal(f.session.active,false);assert.equal(f.stopped,2);}
  finally{await f.close();}
 }
});
