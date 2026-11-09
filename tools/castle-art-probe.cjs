'use strict';
const assert=require('node:assert/strict');
const boardId='schlossatelier-plakat';
async function board(page){
  for(let attempt=0;attempt<100;attempt++){
    const child=page.frames().find(frame=>frame.url().includes('/castle-art/wbo/boards/'+boardId));
    if(child){try{await child.waitForFunction(()=>window.WBOApp?.connection?.state==='connected'&&WBOApp.access?.boardState?.canWrite===true,undefined,{timeout:1000});return child;}catch(error){if(attempt===99)throw error;}}
    await page.waitForTimeout(100);
  }throw Error('Authorized real WBO frame not connected');
}
async function choose(page,owner=page){await owner.locator('#board-select').selectOption(boardId);return board(page);}
async function observe(child){await child.evaluate(()=>{
  window.__artProbeCreated=[];
  WBOApp.connection.socket.onAnyOutgoing((event,message)=>{if(event==='broadcast'&&message?.type===1&&typeof message.id==='string')window.__artProbeCreated.push(message.id);});
});}
async function settled(child){await child.waitForFunction(()=>WBOApp.writes.bufferedWrites.length===0);}
async function created(child){await settled(child);const ids=await child.evaluate(()=>window.__artProbeCreated.splice(0));assert.ok(ids.length);return ids;}
async function paint(page,child,{touch=false,x=150,y=230}={}){
  await child.locator('#toolID-pencil').click();const handle=await child.frameElement(),box=await handle.boundingBox();assert.ok(box);
  if(touch){
    const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+x,y:box.y+y}]});
    for(let step=1;step<=10;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+x+step*5,y:box.y+y+step*3}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else{
    await page.mouse.move(box.x+x,box.y+y);await page.mouse.down();await page.mouse.move(box.x+x+60,box.y+y+40,{steps:10});await page.mouse.up();
  }
  await child.waitForFunction(()=>window.__artProbeCreated.length>0);return created(child);
}
async function received(child,ids){for(const id of ids)await child.locator('#drawingArea > [id="'+id+'"]').waitFor();}
async function eraseOwn(child,ids){
  await child.evaluate(async ids=>{
    const {TOOL_CODE_BY_ID}=await import('/castle-art/wbo/tools/tool-order.js');
    for(const id of ids)if(document.getElementById(id))WBOApp.writes.drawAndSend({tool:TOOL_CODE_BY_ID.eraser,type:3,id});
  },ids);await settled(child);await child.waitForFunction(ids=>ids.every(id=>!document.getElementById(id)),ids);
}
module.exports={boardId,board,choose,observe,paint,created,received,eraseOwn};
