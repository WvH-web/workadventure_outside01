const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const storage=require('./castle-local-storage.cjs');storage.configure();
const root=path.resolve(__dirname,'..');
const folder=storage.outputPath('castle-school-packages/'+new Date().toISOString().replace(/[:.]/g,'-')),destination=path.join(folder,'school.zip');
const files=['castle-school/profile.php','castle-school/lookup.php','castle-school/policy.cjs','castle-school/lookup.cjs',
  'castle-school/server.cjs','castle-school/identity.cjs','castle-school/admission.cjs','castle-school/rules.json','hall-audio/auth.cjs','hall-audio/errors.cjs',
  'castle-school/offers.cjs','castle-school/catalog.cjs','castle-school/public/games.html','castle-school/public/games.js','castle-school/public/games.css',
  'castle-school/rounds.cjs','castle-school/round-targets.json',...['rounds.html','rounds.js','rounds.css','round-client.js','presence.html','presence.js','presence.css','unowned-ui.js'].map(file=>'castle-school/public/'+file)];
const {validateTargets}=require('../ops/castle-school/rounds.cjs');
const targets=validateTargets(JSON.parse(fs.readFileSync(path.join(root,'ops/castle-school/round-targets.json'),'utf8')));
for(const id of new Set(targets.map(target=>target.mapId)))files.push('castle-school/public/round-rooms/'+id+'.webp');
const scoped=['ops/castle-school','ops/hall-audio/auth.cjs','ops/hall-audio/errors.cjs','tests/castle-school-profile.php'];
execFileSync('git',['diff','--exit-code','HEAD','--',...scoped],{cwd:root,stdio:'pipe'});
if(execFileSync('git',['ls-files','--others','--exclude-standard','--',...scoped],{cwd:root,encoding:'utf8'}).trim())throw Error('Commit application source before packaging');
execFileSync('tar',['-a','-cf',destination,...files,'-C','../tests','castle-school-profile.php'],{cwd:path.join(root,'ops'),stdio:'inherit'});
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const descriptor={version:1,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),archiveSha256:sha(fs.readFileSync(destination)),
  files:Object.fromEntries([...files.map(name=>[name,sha(fs.readFileSync(path.join(root,'ops',name)))]),['castle-school-profile.php',sha(fs.readFileSync(path.join(root,'tests/castle-school-profile.php'))) ]])};
fs.writeFileSync(path.join(folder,'school.json'),JSON.stringify(descriptor,null,2)+'\n');
console.log(JSON.stringify({packagedFiles:files.length+1,roundTargets:targets.length,privateConfigurationIncluded:false,destination,descriptor:path.join(folder,'school.json'),archiveSha256:descriptor.archiveSha256}));
