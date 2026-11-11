'use strict';
const crypto=require('node:crypto');
const PINNED=Object.freeze({renderer:'98cbef13f54a019d70202d9b4dfebaf39f39e2f5dc0b33d2c38e0995d8478397',app:'fba855be801a27a42a7cfb290bdc7dd70c5e2820e2ee76d98a9ce8b1c6d34c1c'});
function replace(source,anchor,replacement){if(source.split(anchor).length!==2)throw Error('Reviewed room-media anchor changed');return source.replace(anchor,replacement);}
function adaptRoomModule(kind,source){
 if(!PINNED[kind]||crypto.createHash('sha256').update(source).digest('hex')!==PINNED[kind])throw Error('Review the changed room module before adapting it');
 if(kind==='app'){
  source=replace(source,"const renderer=new RoomRenderer($('#room'),view);","const renderer=new RoomRenderer($('#room'),view);\nwindow.addEventListener('castle-room-media-waiting',stop);");
  return replace(source,'Promise.all([renderer.loaded,roomLoaded]).then(()=>{','Promise.all([renderer.loaded,roomLoaded]).then(()=>renderer.media.scene()).then(()=>{');
 }
 const loading=source.split(/\r?\n/).filter(line=>line.trimStart().startsWith('this.loaded=Promise.all('));
 if(loading.length!==1||!loading[0].trimEnd().endsWith('this.resize();});'))throw Error('Reviewed room-media initializer changed');
 source=replace(source,loading[0],"    this.media=prepareRoomMedia(this,{image,ATLAS,FINISHES,RoomMaterials,itemFor,base:import.meta.url});this.loaded=this.media.loaded;");
 source=replace(source,'thumbnail(canvas,id){if(!this.ready)return;','thumbnail(canvas,id){if(this.media.thumbnail(canvas,id,()=>this.thumbnail(canvas,id)))return;if(!this.ready)return;');
 source=replace(source,'if(!this.ready){requestAnimationFrame(t=>this.frame(t));return;}','const view=this.getState();if(!this.media.frame(view)){requestAnimationFrame(t=>this.frame(t));return;}');
 source=replace(source,'const view=this.getState(),state=view.room,c=this.c,scale=this.width/W;','const state=view.room,c=this.c,scale=this.width/W;');
 return "import {prepareRoomMedia} from './castle-room-media.js';\n"+source;
}
module.exports={adaptRoomModule,PINNED};
