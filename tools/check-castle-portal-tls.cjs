'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {CERTIFICATES,trust,peer,hostname}=require('./castle-portal-trust.cjs');
const address='107.180.46.198';
function inspect(result,expectedHost,chain,now=Date.now()){
 const blocks=(result.stdout||'').match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g)||[];
 let verified;try{if(blocks.length)verified=peer(blocks[0],expectedHost,chain,now);}catch{}
 const authenticated=!!verified?.hostnameVerified&&result.status===0&&!result.error&&!result.signal&&
  /Verify return code: 0 \(ok\)|Verification: OK/.test((result.stdout||'')+'\n'+(result.stderr||''));
 return {passed:authenticated,chainTrusted:!!verified?.chainTrusted,hostnameVerified:!!verified?.hostnameVerified,
  authenticatedCertificate:authenticated?verified.fingerprint256:null,credentialsSent:false,ftpUserCommandsSent:false,
  outcome:authenticated?'verified':verified&&!verified.hostnameVerified?'hostname_mismatch':result.error?.code==='ETIMEDOUT'?'timeout':'tls_rejected'};
}
function probeArguments(expected,bundle){
 hostname(expected);
 return ['s_client','-starttls','ftp','-connect',address+':21','-servername',expected,'-verify_hostname',expected,
  '-verify_return_error','-verifyCAfile',bundle,'-purpose','sslserver','-min_protocol','TLSv1.2','-showcerts'];
}
function main(){
 const expected=hostname(process.argv[2]||'deutsche-online-schule.com'),folder=path.resolve(__dirname,'../ops/portal-transfer/trust');
 const input=Object.fromEntries(Object.entries(CERTIFICATES).map(([key,value])=>[key,fs.readFileSync(path.join(folder,value.file),'utf8')]));
 const chain=trust(input),output=path.resolve(__dirname,'../../output/castle-offers/private/verified-tls');fs.mkdirSync(output,{recursive:true});
 const bundle=path.join(output,'godaddy-g2-cross-chain.pem');fs.writeFileSync(bundle,chain.pem);
 const result=cp.spawnSync('C:/Program Files/Git/usr/bin/openssl.exe',probeArguments(expected,bundle),
  {input:'',encoding:'utf8',timeout:20000,windowsHide:true,maxBuffer:128*1024});
 const value={...inspect(result,expected,chain),expectedHostname:expected,onlyReadOnlyHandshake:true,systemTrustStoreChanged:false};
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify(value));if(!value.passed)process.exitCode=2;
}
if(require.main===module)try{main();}catch(error){console.error('Secure portal preflight refused: '+error.message);process.exitCode=1;}
module.exports={inspect,probeArguments};
