'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),output=path.resolve(root,'../output'),source=path.join(output,'wbo-source-v2.18.33'),target=path.join(root,'ops/castle-art');
const commit='90ae10b5e46e8efeb9b0c8ad918524e336b3fedc',sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const proxyVersion='0.5.6';
async function main(){
  if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!==commit||execFileSync('git',['status','--porcelain'],{cwd:source,encoding:'utf8'}).trim())throw Error('Unreviewed WBO source');
  fs.mkdirSync(path.join(target,'upstream'),{recursive:true});fs.mkdirSync(path.join(target,'vendor'),{recursive:true});
  const archive=path.join(output,'wbo-source-v2.18.33.tar.gz');execFileSync('git',['archive','--format=tar.gz','-o',archive,commit],{cwd:source});
  const wbo=fs.readFileSync(archive),stored=path.join(target,'upstream/wbo-2.18.33.tar.gz');if(fs.existsSync(stored)&&sha(fs.readFileSync(stored))!==sha(wbo))throw Error('Existing source archive changed');fs.copyFileSync(archive,stored);
  const metadata=await(await fetch('https://registry.npmjs.org/httpxy/'+proxyVersion)).json();
  if(metadata.name!=='httpxy'||metadata.version!==proxyVersion||metadata.dependencies&&Object.keys(metadata.dependencies).length)throw Error('Unexpected proxy dependency');
  const tar=Buffer.from(await(await fetch(metadata.dist.tarball)).arrayBuffer());
  if('sha512-'+crypto.createHash('sha512').update(tar).digest('base64')!==metadata.dist.integrity)throw Error('Proxy integrity failure');
  const temporary=path.join(output,'httpxy-'+proxyVersion+'.tgz');fs.writeFileSync(temporary,tar);
  const files=[];
  for(const [from,to]of [['package/dist/index.mjs','vendor/httpxy.mjs'],['package/LICENSE','vendor/httpxy-LICENSE']]){
    const bytes=execFileSync('tar',['-xOf',temporary,from]);const destination=path.join(target,to);
    if(fs.existsSync(destination)&&sha(fs.readFileSync(destination))!==sha(bytes))throw Error('Modified proxy vendor source');fs.writeFileSync(destination,bytes);
    files.push({path:to,sha256:sha(bytes),source:metadata.dist.tarball+'#'+from});
  }
  const license=execFileSync('git',['show',commit+':LICENSE'],{cwd:source});fs.writeFileSync(path.join(target,'upstream/WBO-LICENSE'),license);
  const assets=execFileSync('git',['ls-tree','-r','--name-only',commit,'client-data'],{cwd:source,encoding:'utf8'}).trim().split('\n').map(name=>name.slice('client-data/'.length));
  const manifest={version:1,wbo:{version:'2.18.33',commit,archive:'upstream/wbo-2.18.33.tar.gz',sha256:sha(wbo),license:'AGPL-3.0-or-later',source:'https://github.com/lovasoa/whitebophir/releases/tag/v2.18.33'},
    proxy:{name:'httpxy',version:proxyVersion,integrity:metadata.dist.integrity,license:metadata.license},files,clientAssets:assets};
  fs.writeFileSync(path.join(target,'upstream-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({wboVersion:manifest.wbo.version,sourceCommit:commit,archiveBytes:wbo.length,proxyVersion,staticAssetCount:assets.length}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
