const path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),destination=path.resolve(root,'../output/wvh-castle-school.zip');
fs.mkdirSync(path.dirname(destination),{recursive:true});
const files=['castle-school/profile.php','castle-school/lookup.php','castle-school/policy.cjs','castle-school/lookup.cjs',
  'castle-school/server.cjs','castle-school/identity.cjs','castle-school/rules.json','hall-audio/auth.cjs','hall-audio/errors.cjs',
  'castle-school/offers.cjs','castle-school/catalog.cjs','castle-school/public/games.html','castle-school/public/games.js','castle-school/public/games.css'];
execFileSync('tar',['-a','-cf',destination,...files,'-C','../tests','castle-school-profile.php'],{cwd:path.join(root,'ops'),stdio:'inherit'});
console.log('Packaged reviewed school-context source and synthetic fixtures without private configuration.');
