'use strict';
const crypto=require('node:crypto'),net=require('node:net'),tls=require('node:tls');
const REPOSITORY='https://ssl-ccp.godaddy.com/repository/';
const CERTIFICATES=Object.freeze({
 root:{file:'godaddy-g2.pem',sha256:'45140b3247eb9cc8c5b4f0d7b53091f73292089e6e5a63e2749dd3aca9198eda'},
 cross:{file:'godaddy-r1-cross-g2.pem',remote:'gd_tls_root-r1-cross-g2.crt.pem',sha256:'7bcb0f2f2d1031a6af8d61baa835d2835a3b8bcc26d94a3b048b1655fb81298c'},
 issuer:{file:'godaddy-dv-r1v1.pem',remote:'gd_tls_issuing_dv-r1v1.crt.pem',sha256:'7a43bc7747d0633fbd90ff900c9242417c027dbdca05af72da9a70e3518dbe2e'},
});
const digest=cert=>crypto.createHash('sha256').update(cert.raw).digest('hex');
function certificate(raw){
 if(typeof raw!=='string'||raw.length>16000)throw Error('Bounded PEM certificate required');
 const blocks=raw.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
 if(blocks?.length!==1||raw.replace(blocks[0],'').trim())throw Error('Exactly one certificate required');
 return new crypto.X509Certificate(blocks[0]);
}
function current(cert,now){return Number.isFinite(now)&&Date.parse(cert.validFrom)<=now&&now<Date.parse(cert.validTo);}
function hostname(value){
 if(typeof value!=='string'||value.length>253||value!==value.toLowerCase()||net.isIP(value)||
  !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value))throw Error('An exact confirmed DNS hostname is required');
 return value;
}
function trust(input,now=Date.now()){
 if(!input||Object.keys(input).sort().join(',')!=='cross,issuer,root')throw Error('Reviewed chain required');
 const result={};for(const key of Object.keys(CERTIFICATES)){
  const cert=certificate(input[key]);if(digest(cert)!==CERTIFICATES[key].sha256||!cert.ca||!current(cert,now))throw Error('Reviewed authority changed or expired');result[key]=cert;
 }
 if(!result.root.verify(result.root.publicKey)||!result.cross.checkIssued(result.root)||!result.cross.verify(result.root.publicKey)||
  !result.issuer.checkIssued(result.cross)||!result.issuer.verify(result.cross.publicKey))throw Error('Authority chain verification failed');
 // The existing Mozilla G2 root is the anchor, not the newly introduced self-signed R1 root.
 const approved=tls.rootCertificates.map(raw=>new crypto.X509Certificate(raw)).some(cert=>digest(cert)===CERTIFICATES.root.sha256);
 if(!approved)throw Error('The existing runtime trust store does not include the reviewed G2 root');
 return {...result,pem:input.root.trim()+'\n'+input.cross.trim()+'\n'+input.issuer.trim()+'\n'};
}
function peer(raw,expectedHost,chain,now=Date.now()){
 hostname(expectedHost);const cert=certificate(raw);
 if(cert.ca||!current(cert,now)||!cert.checkIssued(chain.issuer)||!cert.verify(chain.issuer.publicKey))throw Error('Peer chain or validity failed');
 const name=cert.checkHost(expectedHost,{subject:'never',wildcards:true,partialWildcards:false,multiLabelWildcards:false,singleLabelSubdomains:false});
 return {chainTrusted:true,hostnameVerified:!!name,fingerprint256:cert.fingerprint256,validUntil:new Date(cert.validTo).toISOString()};
}
module.exports={REPOSITORY,CERTIFICATES,certificate,digest,hostname,trust,peer};
