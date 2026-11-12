import * as THREE from './vendor/three/build/three.module.js';
const colors=['#f5f3e9','#e7bf29','#2369c0','#c73537','#7650a7','#e57a27','#25804d','#8c2933','#151a20','#e7bf29','#2369c0','#c73537','#7650a7','#e57a27','#25804d','#8c2933'];
export class BilliardsRenderer {
 constructor(canvas,onPoint){
  this.canvas=canvas;this.onPoint=onPoint;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#202322');
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.ready=true;this.contextLost=event=>{event.preventDefault();this.ready=false;this.onGraphics?.(false);};this.contextRestored=()=>{this.ready=true;this.onGraphics?.(true);};
  canvas.addEventListener('webglcontextlost',this.contextLost);canvas.addEventListener('webglcontextrestored',this.contextRestored);
  this.camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,20);this.group=new THREE.Group();this.scene.add(this.group);this.meshes=[];this.materials=[];this.geometries=[];this.textures=[];
  this.scene.add(new THREE.AmbientLight('#e0e9e2',2.4));const light=new THREE.DirectionalLight('#fff3d3',3.4);light.position.set(-2,-1,5);this.scene.add(light);
  this.ray=new THREE.Raycaster();this.point=new THREE.Vector3();this.plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);this.mode='top';this.angle=0;this.power=.53;
  this.pointer=event=>{if(event.buttons||event.type==='pointerdown'){const point=this.position(event.clientX,event.clientY);if(point)this.onPoint(point);}};
  canvas.addEventListener('pointerdown',this.pointer);canvas.addEventListener('pointermove',this.pointer);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.resize();
  this.animate=()=>{if(this.closed)return;this.draw();this.frame=requestAnimationFrame(this.animate);};this.animate();
 }
 material(options){const value=new THREE.MeshStandardMaterial(options);this.materials.push(value);return value;}
 mesh(geometry,material,x=0,y=0,z=0){this.geometries.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);this.group.add(mesh);return mesh;}
 configure(geometry,balls){
  if(this.geometry)return;this.geometry=geometry;const {halfX:x,halfY:y,radius:r}=geometry;
  const wood=this.material({color:'#593c2c',roughness:.32,metalness:.06}),edge=this.material({color:'#bc9754',roughness:.28,metalness:.45});
  const felt=this.material({color:'#146e50',roughness:1}),cushion=this.material({color:'#1c805b',roughness:.94}),hole=this.material({color:'#090e0c',roughness:1});
  this.tableBounds={x:x+6*r,y:y+6*r};
  this.mesh(new THREE.BoxGeometry(2*x+12*r,2*y+12*r,.12),wood,0,0,-.075);
  this.mesh(new THREE.BoxGeometry(2*x+2*r,2*y+2*r,.03),felt,0,0,-.019);
  for(const side of [-1,1]){
   const gap=3*r,length=x-gap;
   for(const direction of [-1,1])this.mesh(new THREE.BoxGeometry(length,1.4*r,1.1*r),cushion,direction*(x+gap)/2,side*(y+1.7*r),.012);
   this.mesh(new THREE.BoxGeometry(1.4*r,2*y-3*r,1.1*r),cushion,side*(x+1.7*r),0,.012);
   for(const fraction of [-.75,-.5,-.25,.25,.5,.75]){this.mesh(new THREE.OctahedronGeometry(.006),edge,fraction*x,side*(y+4*r),.001);}
  }
  for(const pocket of geometry.pockets){const ring=this.mesh(new THREE.CircleGeometry(pocket.radius*1.05,40),hole,pocket.x,pocket.y,.003);ring.renderOrder=1;
   if(Math.abs(pocket.x)<r)this.mesh(new THREE.PlaneGeometry(pocket.radius*1.6,3*r),hole,0,Math.sign(pocket.y)*(y+1.8*r),.004);
  }
  const sphere=new THREE.SphereGeometry(r,24,18);this.geometries.push(sphere);
  for(const ball of balls){
   const label=ball.label??0,texture=this.ballTexture(label),material=this.material({map:texture,roughness:.23,metalness:.03});
   const mesh=new THREE.Mesh(sphere,material);this.group.add(mesh);this.meshes[ball.id]=mesh;
  }
  this.cue=this.mesh(new THREE.CylinderGeometry(r*.12,r*.25,r*17,12),this.material({color:'#d9bc7b',roughness:.42}));
  this.cue.rotation.x=Math.PI/2;
  const points=[new THREE.Vector3(),new THREE.Vector3(1,0,0)],lineGeometry=new THREE.BufferGeometry().setFromPoints(points);this.geometries.push(lineGeometry);
  this.lineMaterial=new THREE.LineDashedMaterial({color:'#e8dfb5',dashSize:.05,gapSize:.035,transparent:true,opacity:.65});
  this.line=new THREE.Line(lineGeometry,this.lineMaterial);this.line.computeLineDistances();this.group.add(this.line);this.resize();
 }
 ballTexture(label){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d');
  ctx.fillStyle=label>8?'#f6f4e9':colors[label];ctx.fillRect(0,0,128,64);if(label>8){ctx.fillStyle=colors[label];ctx.fillRect(0,16,128,32);}
  if(label){for(const cx of [32,96]){ctx.fillStyle='#faf8eb';ctx.beginPath();ctx.arc(cx,32,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17201c';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(label),cx,33);}}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);return texture;
 }
 resize(){
  const {width,height}=this.canvas.parentElement.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height,false);
  const ratio=width/height,portrait=ratio<1.25;this.group.rotation.z=portrait?Math.PI/2:0;
  const geometry=this.geometry||{halfX:1.13,halfY:.55,radius:.033};
  const wide=2*(portrait?geometry.halfY:geometry.halfX)+.4,tall=2*(portrait?geometry.halfX:geometry.halfY)+.4;
  const extent=Math.max(tall,wide/ratio)*.56;this.camera.left=-extent*ratio;this.camera.right=extent*ratio;this.camera.top=extent;this.camera.bottom=-extent;
  this.camera.up.set(0,1,0);this.camera.position.set(0,this.mode==='top'?0:-2.1,4);this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();this.group.updateMatrixWorld(true);
 }
 toggle(){this.mode=this.mode==='top'?'angle':'top';this.resize();}
 accept(snapshot){
  this.group.visible=true;
  this.configure(snapshot.geometry,snapshot.board.state.balls);
  const incoming=snapshot.board.animation;if(incoming?.frames)this.animation=incoming;else if(!incoming)this.animation=null;
  this.snapshot=snapshot;this.clockOffset=snapshot.serverTime-Date.now();
 }
 clear(){this.snapshot=null;this.animation=null;this.group.visible=false;}
 aim(angle,power,visible,placement=null){this.angle=angle;this.power=power;this.showAim=visible;this.placement=placement;}
 position(x,y){
  const rect=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),this.camera);
  if(!this.ray.ray.intersectPlane(this.plane,this.point))return null;const point=this.group.worldToLocal(this.point.clone());return {x:point.x,y:point.y};
 }
 draw(){
  if(this.snapshot){let balls=this.snapshot.board.state.balls;const active=this.animation,t=active?(Date.now()+this.clockOffset-active.startedAt)/1000*active.rate:Infinity;
   if(active&&t<active.frames.at(-1).t){
    const frames=active.frames;let low=0,high=frames.length-1;while(low+1<high){const mid=(low+high)>>1;if(frames[mid].t<=t)low=mid;else high=mid;}
    const a=frames[low],b=frames[high],fraction=Math.max(0,Math.min(1,(t-a.t)/Math.max(.00001,b.t-a.t)));
    balls=a.balls.map((ball,index)=>({id:ball.id,state:ball.state,pos:ball.pos.map((v,axis)=>v+(b.balls[index].pos[axis]-v)*fraction)}));
   }
   for(const ball of balls){const mesh=this.meshes[ball.id];mesh.visible=ball.state!=='InPocket';mesh.position.set(ball.pos[0],ball.pos[1],ball.pos[2]+this.geometry.radius);}
   const cue=this.meshes[0],point=this.placement||{x:cue.position.x,y:cue.position.y};
   if(this.placement){cue.visible=true;cue.position.set(point.x,point.y,this.geometry.radius);}
   const show=Boolean(this.showAim&&!this.placement&&this.snapshot.board.state.winner===null);
   this.cue.visible=show;this.line.visible=show;
   if(show){const r=this.geometry.radius,dx=Math.cos(this.angle),dy=Math.sin(this.angle),length=r*17,distance=r*2+length/2+this.power*.08;
    this.cue.position.set(point.x-dx*distance,point.y-dy*distance,r*.8);this.cue.rotation.set(0,0,this.angle-Math.PI/2);
    this.line.geometry.setFromPoints([new THREE.Vector3(point.x,point.y,.004),new THREE.Vector3(point.x+dx*.7,point.y+dy*.7,.004)]);this.line.computeLineDistances();
   }
  }
  if(this.ready)this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.closed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();this.canvas.removeEventListener('pointerdown',this.pointer);this.canvas.removeEventListener('pointermove',this.pointer);this.canvas.removeEventListener('webglcontextlost',this.contextLost);this.canvas.removeEventListener('webglcontextrestored',this.contextRestored);for(const item of [...this.geometries,...this.materials,...this.textures])item.dispose();this.lineMaterial?.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
