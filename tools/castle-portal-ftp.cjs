const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const output=path.resolve(__dirname,'../../output/castle-offers/private');
fs.mkdirSync(output,{recursive:true});
const quote=value=>'"'+value.replaceAll('"','""')+'"';
function ftp(commands,label,allowFailure=false){
  if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid operation label');
  const script=path.join(output,label+'.txt');
  fs.writeFileSync(script,'\uFEFFoption batch '+(allowFailure?'continue':'abort')+'\noption confirm off\noption transfer binary\nopen dos@deutsche-online-schule.com\n'+commands.join('\n')+'\nexit\n');
  const run=cp.spawnSync('C:/Program Files (x86)/WinSCP/WinSCP.com',['/script='+script],{encoding:'utf8',windowsHide:true});
  fs.writeFileSync(path.join(output,label+'.log'),((run.stdout||'')+(run.stderr||'')).replace(/(\w+:\/\/)[^\s]+@/gi,'$1[redacted]@'));
  if(run.status!==0&&!allowFailure)throw Error('Portal transfer failed: '+label);
  return run.status===0;
}
module.exports={ftp,quote,output};
if(require.main===module){
  const files=['admin/workadventure_museum.php','api/workadventure_museum_open.php','src/Auth/Auth.php','config/bootstrap.php'];
  for(const file of files){const destination=path.join(output,'before',file);fs.mkdirSync(path.dirname(destination),{recursive:true});if(!fs.existsSync(destination))ftp(['get '+quote('/schooltools/verwaltung/'+file)+' '+quote(destination)],'read-'+file.toLowerCase().replace(/[^a-z0-9]+/g,'-'));}
  console.log('Retained four live source baselines privately; no credentials or pupil records printed.');
}
