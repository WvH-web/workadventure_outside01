'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PhysicsPool}=require('./physics-pool.cjs');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function main(){
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'vendor-manifest.json')));
 for(const file of manifest.files)assert.equal(sha(fs.readFileSync(path.join(__dirname,file.path))),file.sha256);
 const pool=new PhysicsPool({size:2});let results;
 try{
  const {state}=await pool.run('initial'),input={angle:0,power:2.8,offset:{x:0,y:0}},before=JSON.stringify(state);
  results=await Promise.all([pool.run('shoot',state,input),pool.run('shoot',state,input)]);
  assert.deepEqual(results[0].state,results[1].state);assert.deepEqual(results[0].frames,results[1].frames);assert.equal(JSON.stringify(state),before);assert.equal(results[0].state.shots,1);assert.ok(results[0].frames.length>4);
  const potted=results[0].state.balls.filter(ball=>ball.state===require('./vendor/core.cjs').State.InPocket).map(ball=>ball.id);
  console.log(JSON.stringify({passed:true,linux:process.platform==='linux',sourceFiles:manifest.files.length,actualWorkerJobs:2,
   deterministicPositionsAndFrames:true,frames:results[0].frames.length,pottedCount:potted.length,accountDataUsed:false,schoolLoadApproval:false}));
 }finally{await pool.close();}
}
main().catch(error=>{console.error('Billiards isolated Linux smoke failed: '+error.name);process.exitCode=1;});
