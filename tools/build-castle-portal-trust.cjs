'use strict';
const fs=require('node:fs'),path=require('node:path'),tls=require('node:tls');
const {REPOSITORY,CERTIFICATES,certificate,digest,trust}=require('./castle-portal-trust.cjs');
async function build(){
 const folder=path.resolve(__dirname,'../ops/portal-transfer/trust'),input={};
 input.root=tls.rootCertificates.find(raw=>digest(certificate(raw))===CERTIFICATES.root.sha256);if(!input.root)throw Error('Existing G2 root missing');
 for(const key of ['cross','issuer']){
  const response=await fetch(REPOSITORY+CERTIFICATES[key].remote,{redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Official certificate download failed');
  const chunks=[];let size=0;for await(const part of response.body){size+=part.byteLength;if(size>16000)throw Error('Certificate response too large');chunks.push(part);}
  input[key]=Buffer.concat(chunks).toString('utf8');
 }
 trust(input);fs.mkdirSync(folder,{recursive:true});for(const key of Object.keys(CERTIFICATES))fs.writeFileSync(path.join(folder,CERTIFICATES[key].file),input[key].trim()+'\n');
 console.log(JSON.stringify({passed:true,officialCrossChainVerified:true,anchorAlreadyInRuntimeTrustStore:true,systemTrustStoreChanged:false,credentialsUsed:false}));
}
if(require.main===module)build().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={build};
