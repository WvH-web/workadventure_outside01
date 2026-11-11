'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),reporter=require('../tools/castle-admission-reporter.cjs');
test('measurement reporter keeps structured synthetic counters without unrelated diagnostics or credential fields',()=>{
 assert.deepEqual(reporter.diagnostic(JSON.stringify({httpStatuses:{200:400},accessToken:'never print'})),{httpStatuses:{200:400}});
 for(const value of ['private text',JSON.stringify({accessToken:'private'}),JSON.stringify({httpStatuses:{name:400}}),
  JSON.stringify({httpStatuses:{200:-1}}),JSON.stringify({httpStatuses:{200:true}}),JSON.stringify({httpStatuses:{200:401}})])assert.equal(reporter.diagnostic(value),null);
 const good={scope:'controlled synthetic HTTP burst; no real provider or database requests',requests:400,successful:400,elapsedMs:3000,
  maximumGraph:16,maximumProfiles:16,graphActive:0,profileActive:0,profileRequests:400,providerRequests:400,transportPreconnected:false,
  normalMicrosoftLoginLoadTested:false,fullCastleApprovalFor400:false};
 assert.deepEqual(reporter.diagnostic(JSON.stringify({...good,password:'never print'})),good);
 assert.equal(reporter.diagnostic(JSON.stringify({...good,fullCastleApprovalFor400:true})),null);
 assert.equal(reporter.diagnostic(JSON.stringify({...good,maximumGraph:-1})),null);
});
test('reporter consumes real test events and never emits raw stderr or assertion payloads',async()=>{
 const events=[{type:'test:stdout',data:{message:'secret'}},{type:'test:diagnostic',data:{message:'raw private error'}},
  {type:'test:diagnostic',data:{message:'{"httpStatuses":{"200":400}}'}},
  {type:'test:fail',data:{name:'synthetic 400 check',details:{error:{name:'AssertionError',message:'private value'}}}}];
 const rows=[];for await(const line of reporter(events))rows.push(JSON.parse(line));
 assert.equal(rows[0].type,'runtime');assert.equal(rows[0].node,process.version);assert.equal(rows.length,3);
 assert.deepEqual(rows[1],{type:'diagnostic',value:{httpStatuses:{200:400}}});
 assert.deepEqual(rows[2],{type:'failure',name:'synthetic 400 check',errorType:'AssertionError'});
 assert.doesNotMatch(JSON.stringify(rows),/secret|private/);
});
