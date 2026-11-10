'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const directory=path.resolve(__dirname,'../../../output/castle-capacity/private/bin');
const url='https://github.com/livekit/livekit-cli/releases/download/v2.19.2/lk_2.19.2_windows_amd64.zip';
const expected='3a76873bd0a593d03b1305499ae0e468a242742eb3bfbfac737f27f1d00be139';
async function main(){
 fs.mkdirSync(directory,{recursive:true});const archive=path.join(directory,'lk_2.19.2_windows_amd64.zip');
 if(!fs.existsSync(archive)){
  const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Official CLI download failed');
  const data=Buffer.from(await response.arrayBuffer());if(data.length>45000000||crypto.createHash('sha256').update(data).digest('hex')!==expected)throw Error('CLI archive integrity mismatch');fs.writeFileSync(archive,data);
 }
 if(crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex')!==expected)throw Error('Retained CLI archive changed');
 const names=execFileSync('tar',['-tf',archive],{encoding:'utf8'}).trim().split(/\r?\n/);if(!names.includes('lk.exe'))throw Error('Expected CLI executable missing');
 execFileSync('tar',['-xf',archive,'-C',directory,'lk.exe',...['LICENSE','LICENSE.txt','README.md'].filter(name=>names.includes(name))]);
 const version=execFileSync(path.join(directory,'lk.exe'),['--version'],{encoding:'utf8',windowsHide:true}).trim();if(!version.includes('2.19.2'))throw Error('Unexpected CLI version');
 console.log(JSON.stringify({installed:true,version,archiveSha256:expected,officialRelease:true,systemInstallationChanged:false}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
