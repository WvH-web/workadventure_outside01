import test from 'node:test';
import assert from 'node:assert/strict';
import {GamesPage} from '../ops/castle-school/public/games.js';

const fixture=()=>({roundGeneration:3,roundCheckedAt:100,round:{id:'current-round',mine:true,game:{state:'confirmed'}}});
const update=(target,value,generation=3)=>GamesPage.prototype.updateRound.call(target,value,generation);

test('an older request or previous host generation cannot overwrite the latest bundled round state',()=>{
  const state=fixture(),previous=state.round;
  update(state,{round:null,checkedAt:101},2);assert.equal(state.round,previous);
  update(state,{round:null,checkedAt:99});assert.equal(state.round,previous);
});
test('a successful reply from a legacy service cannot leave a cached host claim visible after rollback',()=>{
  const state=fixture();update(state,{checkedAt:102});assert.equal(state.round,null);
});
test('malformed bundled metadata cannot be taken as the current caller membership',()=>{
  for(const round of [undefined,false,{}, {id:'other',mine:false},{id:12,mine:true}]){
    const state=fixture(),previous=state.round;
    assert.throws(()=>update(state,{round,checkedAt:101}));assert.equal(state.round,previous);
  }
  const state=fixture();assert.throws(()=>update(state,{round:null,checkedAt:NaN}));
});
test('a fresh explicit null or caller round updates only the display, not a lease or an expiry',()=>{
  const state=fixture(),round={id:'new-round',mine:true,game:{state:'waiting'}};
  update(state,{round,checkedAt:102});assert.equal(state.round,round);assert.equal(state.roundCheckedAt,102);
  update(state,{round:null,checkedAt:103});assert.equal(state.round,null);assert.equal(state.roundCheckedAt,103);
  assert.equal(Object.hasOwn(state,'leaseId'),false);assert.equal(Object.hasOwn(state,'expiresAt'),false);
});
