const fs=require('node:fs'),path=require('node:path');
const {buildFurnishedRoom}=require('./build-library.cjs');
const {createCanvas}=require('./castle-deps.cjs')('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),revision='20261109-actions2';
const own='';
const games='https://together.deine-schule.com/castle-school/games';
const collection='https://together.deine-schule.com/castle-content/collection.html';
const piano='https://together.deine-schule.com/castle-piano/';
const activity=(id,group,label,url,api=false)=>({id,group,label,url,api});
const inhabitants={oberstufe:['kai','Kai'],spielesaal:['sam','Sam'],museum:['elin','Elin'],musikzimmer:['lea','Lea'],
  atelier:['mira','Mira'],sternwarte:['farah','Farah'],erdgeschoss:['amir','Amir'],obergeschoss:['otto','Otto']};
function addInhabitant(scene,id,wide=false){
  const [key,name]=inhabitants[id],x=wide?720:496,bodyY=wide?400:304;
  scene.npcs=[{id:key,x:x-48,y:bodyY-48,width:96,height:64,body:{x:x-16,y:bodyY-16,width:32,height:32}}];
  scene.activities.push({...activity('npc-'+key,null,name+' ansprechen','characters.html?npc='+key),area:{x:x-48,y:bodyY+16,width:128,height:64}});
}
const rooms=[
  {id:'oberstufe',name:'Oberstufensalon',parent:'obergeschoss',key:'Os',labels:['Salonrunde','Fensternische','Debatten- und Lerntisch'],
    activities:[activity('os-story','lesekamin','Erzaehlrunde',own+'story.html',true),{...activity('os-games','buchclub','Tischrunde','https://together.deine-schule.com/castle-chess/#table=tisch-3'),choices:[
      {id:'chess',label:'Schach',url:'https://together.deine-schule.com/castle-chess/#table=tisch-3'},
      {id:'story',label:'Erzaehlkarten',url:'story.html#table',api:true}]},activity('os-explore','fensterleser','Expeditionen',own+'expeditions.html')]},
  {id:'spielesaal',name:'Spielesaal',parent:'erdgeschoss',key:'Games',labels:['Spielelounge','Zuschauernische','Spielrunde'],
    activities:[activity('games-story','lesekamin','Erzaehlkarten',own+'story.html',true),activity('games-shelf','buchclub','Schach spielen','https://together.deine-schule.com/castle-chess/#table=tisch-2'),activity('games-puzzles','fensterleser','Bausteinraetsel','https://phet.colorado.edu/sims/html/area-builder/latest/area-builder_all.html?locale=de')]},
  {id:'museum',name:'Schlossmuseum',parent:'erdgeschoss',key:'Museum',revision:'20261111-tour1',bundle:'museum-tour.bundle.js',labels:['Geschichten der Fundstuecke','Entdeckernische','Ausstellungsrunde'],script:'displays.js',
    displays:[{board:'show1',x:80,y:59,width:72,height:45},{board:'show2',x:37,y:135,width:38,height:43},
      {board:'show3',x:112,y:139,width:44,height:30},{board:'show4',x:741,y:58,width:34,height:50},{board:'show5',x:736,y:140,width:37,height:18}],
    activities:[activity('museum-story','lesekamin','Fundstueck-Geschichten',own+'story.html',true),activity('museum-collection','buchclub','Gemeinsame Ausstellung',collection+'?kind=museum&shared=table',true),activity('museum-tour','fensterleser','Expeditionen',own+'expeditions.html')]},
  {id:'musikzimmer',name:'Musiksalon',parent:'erdgeschoss',key:'Music',revision:'20261109-piano1',labels:['Musik- und Erzaehlrunde','Klangnische','Band- und Chortreff'],
    activities:[{...activity('music-piano',null,'Schlossklavier',piano),area:{x:64,y:256,width:128,height:48}},
      activity('music-story','lesekamin','Erzaehlkarten',own+'story.html',true),{...activity('music-band','buchclub','Klavier, Band und Chor',piano),choices:[
        {id:'piano',label:'Schlossklavier',url:piano},{id:'choir',label:'Band und Chor',url:collection+'?kind=music'}]},
      activity('music-compose','fensterleser','Song Maker','https://musiclab.chromeexperiments.com/Song-Maker/')]},
  {id:'atelier',name:'Schlossatelier',parent:'erdgeschoss',key:'Atelier',labels:['Ideenrunde','Zeichen- und Klangnische','Werkstatttisch'],
    activities:[activity('atelier-story','lesekamin','Ideenkarten',own+'story.html',true),activity('atelier-draw','buchclub','Gemeinsam zeichnen','https://together.deine-schule.com/castle-art/'),activity('atelier-music','fensterleser','Klangentwurf','https://musiclab.chromeexperiments.com/Song-Maker/')]},
  {id:'sternwarte',name:'Sternwarte',parent:'obergeschoss',key:'Stars',revision:'20261111-puzzle1',bundle:'puzzle-preview.bundle.js',labels:['Sternengeschichten','Fenster zum All','Forschergruppe'],
    activities:[activity('stars-story','lesekamin','Sternengeschichten',own+'story.html',true),{...activity('stars-solar','buchclub','Sternenwerkstatt','puzzle.html',true),choices:[
      {id:'machine',label:'Sternenmaschine',url:'puzzle.html',api:true},{id:'solar',label:'Sonnensystem',url:'https://eyes.nasa.gov/apps/solar-system/'}]},activity('stars-tours','fensterleser','Weltraum-Expeditionen',own+'expeditions.html')]},
];
function roomScene(config){
  const scene=JSON.parse(fs.readFileSync(path.join(root,'castle/art/bibliothek-20261108/scene.json')));
  scene.revision=config.revision||revision;scene.expectedSeats=12;scene.storyVariable='castleStory'+config.key;
  scene.scriptRoomId=true;
  scene.window={columns:['museum','atelier','sternwarte'].includes(config.id)?[776,816]:[752,800],y:config.id==='sternwarte'?184:config.id==='museum'?200:204,standY:272,label:config.labels[1]};
  if(config.id==='sternwarte'){
    scene.collisions.find(r=>r.id==='north-window').height=160;
    Object.assign(scene.collisions.find(r=>r.id==='window-bench'),{y:160,height:96});
    scene.windowFront=[[752,198],[824,198],[824,220],[752,220]];
  }
  scene.bookclub.source='../bibliothek-20261108/bookclub-source.png';scene.bookclub.label=config.labels[2];
  scene.groups[0].label=config.labels[0];scene.groups[1].label=config.labels[1];scene.groups[2].label=config.labels[2];
  scene.exit={...scene.exit,target:config.parent+'.tmj',entry:config.id};
  scene.returnLabel=config.parent==='obergeschoss'?'Obere Galerie':'Wandelgang';
  scene.entries={start:[13,19],flur:[13,19]};scene.activities=[...config.activities];scene.displays=config.displays||[];
  addInhabitant(scene,config.id);
  return scene;
}
const lowerDoors=[
  ['museum','Museum',3,'museum.tmj','flur'],['musikzimmer','Musiksalon',8,'musikzimmer.tmj','flur'],
  ['atelier','Atelier',13,'atelier.tmj','flur'],['spielesaal','Spielesaal',17,'spielesaal.tmj','flur'],
  ['grundschule','Grundschule',22,'grundschule.tmj','halle'],['mittelstufe','Mittelstufe',26,'mittelstufe.tmj','vom-flur'],
  ['kino','Kino',31,'kino.tmj','foyer'],['obergeschoss','Obere Galerie',35,'obergeschoss.tmj','erdgeschoss'],
];
const upperDoors=[
  ['oberstufe','Oberstufe',2,'oberstufe.tmj','flur'],['sternwarte','Sternwarte',7,'sternwarte.tmj','flur'],
  ['bibliothek','Bibliothek',12,'bibliothek.tmj','halle'],['erdgeschoss','Wandelgang',17,'erdgeschoss.tmj','vom-og'],
  ['museum','Museum',21,'museum.tmj','flur'],['atelier','Atelier',26,'atelier.tmj','flur'],
  ['musikzimmer','Musiksalon',30,'musikzimmer.tmj','flur'],['spielesaal','Spielesaal',36,'spielesaal.tmj','flur'],
];
function corridorScene(id){
  const scene=roomScene(rooms[0]),upper=id==='obergeschoss',doors=upper?upperDoors:lowerDoors;
  scene.width=40;scene.noHearth=true;scene.expectedSeats=10;delete scene.storyVariable;scene.activities=[];scene.displays=[];
  addInhabitant(scene,id,true);
  scene.window={columns:[],y:204,standY:272};scene.windowFront=[];
  scene.circle.y=336;scene.bookclub.x=944;scene.bookclub.label='Treffpunkttisch';
  scene.groups=[{id:'lesekamin',label:upper?'Galerierunde':'Lounge im Wandelgang',x:64,y:304,width:288,height:256},
    {id:'buchclub',label:'Treffpunkttisch',x:896,y:400,width:288,height:240}];
  scene.collisions=[{id:'north-wall',x:0,y:0,width:1280,height:224,preserve:true},
    {id:'west-wall',x:0,y:0,width:32,height:704,preserve:true},{id:'east-wall',x:1248,y:0,width:32,height:704,preserve:true},
    {id:'south-west',x:0,y:672,width:608,height:32,preserve:true},{id:'south-east',x:672,y:672,width:608,height:32,preserve:true},
    {id:'table',x:976,y:480,width:128,height:64,preserve:true}];
  scene.exit={x:19,y:21,width:2,height:1,target:'grosse-halle.tmj',entry:upper?'vom-og':'wandelgang'};
  scene.returnLabel='Grosse Halle';
  scene.entries={start:[19,19],halle:[19,19]};
  scene.portals=doors.map(([id,label,x,target,entry])=>({id,label,x,y:7,width:2,height:1,target,entry}));
  for(const d of scene.portals)scene.entries[d.id]=[d.x,9];
  if(upper){scene.entries['vom-eg']=[19,19];scene.entries.erdgeschoss=[17,9];}
  else Object.assign(scene.entries,{'vom-og':[35,9],hof:[19,19],garten:[37,18],kino:[31,9],'mittelstufe-anreise':[26,9],'bibliothek-anreise':[19,19]});
  return scene;
}
function plaques(scene){
  const canvas=createCanvas(scene.width*32,scene.height*32),g=canvas.getContext('2d');g.textAlign='center';g.textBaseline='middle';
  for(const p of scene.portals){
    const x=p.x*32+32,y=258,width=112,height=26;
    g.fillStyle='#34241b';g.fillRect(x-width/2,y,width,height);g.strokeStyle='#c7a458';g.lineWidth=1;g.strokeRect(x-width/2+.5,y+.5,width-1,height-1);
    let size=13;g.font=size+'px Georgia';while(g.measureText(p.label).width>width-10&&size>9)g.font=(--size)+'px Georgia';
    g.fillStyle='#f5e4b8';g.fillText(p.label,x,y+height/2+1);
  }
  return {input:canvas.toBuffer('image/png'),left:0,top:0};
}
async function buildCastleExpansion({only}={}){
  if(only&&!rooms.some(room=>room.id===only)&&!['erdgeschoss','obergeschoss'].includes(only))throw Error('Unknown expansion room');
  const results=[];
  for(const room of rooms.filter(room=>!only||room.id===only)){
    const scene=roomScene(room);
    results.push(await buildFurnishedRoom({id:room.id,folder:room.id+'-20261108-full',name:room.name,scene,script:room.bundle||'expansion.bundle.js',
      description:room.name+' mit drei getrennten Gespraechsrunden und passenden Aktivitaeten.',copyright:'Original room artwork generated for deine Schule; approved 32px-avatar seating and book-club furniture; village fire animation.'}));
  }
  for(const id of ['erdgeschoss','obergeschoss'].filter(id=>!only||id===only)){
    const scene=corridorScene(id);
    results.push(await buildFurnishedRoom({id,folder:id+'-20261108-full',width:40,scene,script:'expansion.bundle.js',name:id==='erdgeschoss'?'Wandelgang':'Obere Galerie',
      description:'Eingerichteter Schlossgang mit acht beschrifteten Tueren und zwei getrennten Gespraechsgruppen.',overlays:[plaques(scene)]}));
  }
  require('./build-castle-ui.cjs').buildCastleUi();require('./build-castle-script.cjs').buildCastleScript();
  require('./build-castle-script.cjs').buildCastleMuseumScript();
  if(!only||only==='museum')fs.copyFileSync(path.join(root,'castle/museum.tmj'),path.join(root,'castle/museum-tour-preview.tmj'));
  return results;
}
module.exports={buildCastleExpansion,roomScene,corridorScene,rooms,revision};
if(require.main===module)buildCastleExpansion({only:process.argv.find(arg=>arg.startsWith('--only='))?.slice('--only='.length)}).then(results=>{
  if(process.argv.includes('--update-world')){
    const file=path.join(root,'castle/layout.json'),manifest=JSON.parse(fs.readFileSync(file));
    for(const {world} of results){const i=manifest.worlds.findIndex(w=>w.id===world.id);if(i<0)manifest.worlds.push(world);else manifest.worlds[i]=world;}
    fs.writeFileSync(file,JSON.stringify(manifest)+'\n');
  }
  console.log(JSON.stringify(results.map(({world})=>({id:world.id,...world.mapdata})),null,2));
}).catch(error=>{console.error(error);process.exitCode=1;});
