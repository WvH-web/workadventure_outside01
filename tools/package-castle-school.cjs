const path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),destination=path.resolve(root,'../output/wvh-castle-school.zip');
fs.mkdirSync(path.dirname(destination),{recursive:true});
const files=['castle-school/profile.php','castle-school/lookup.php','castle-school/policy.cjs','castle-school/lookup.cjs',
  'castle-school/server.cjs','castle-school/identity.cjs','castle-school/rules.json','hall-audio/auth.cjs','hall-audio/errors.cjs',
  'castle-school/offers.cjs','castle-school/catalog.cjs','castle-school/public/games.html','castle-school/public/games.js','castle-school/public/games.css',
  'castle-school/rounds.cjs','castle-school/round-targets.json',...['rounds.html','rounds.js','rounds.css','round-client.js','presence.html','presence.js','presence.css'].map(file=>'castle-school/public/'+file)];
const {validateTargets}=require('../ops/castle-school/rounds.cjs');
const targets=validateTargets(JSON.parse(fs.readFileSync(path.join(root,'ops/castle-school/round-targets.json'),'utf8')));
for(const id of new Set(targets.map(target=>target.mapId)))files.push('castle-school/public/round-rooms/'+id+'.webp');
execFileSync('tar',['-a','-cf',destination,...files,'-C','../tests','castle-school-profile.php'],{cwd:path.join(root,'ops'),stdio:'inherit'});
console.log(JSON.stringify({packagedFiles:files.length+1,roundTargets:targets.length,privateConfigurationIncluded:false}));
