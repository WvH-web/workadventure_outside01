'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {CERTIFICATES,certificate,digest,hostname,trust,peer}=require('../tools/castle-portal-trust.cjs');
const {inspect,probeArguments}=require('../tools/check-castle-portal-tls.cjs');
const now=Date.parse('2026-11-11T06:00:00Z');
const input=Object.fromEntries(Object.entries(CERTIFICATES).map(([key,value])=>[key,
 fs.readFileSync(path.join(__dirname,'../ops/portal-transfer/trust',value.file),'utf8')]));
const leaf=fs.readFileSync(path.join(__dirname,'fixtures/portal-ftps-public-leaf.pem'),'utf8');
const chain=trust(input,now);
// Offline wildcard test only: this is NOT a confirmed provider hostname or live acceptance.
const fixtureHost='offline-fixture.shr.prod.iad2.secureserver.net';

test('reviewed official cross chain anchors in the existing G2 trust root',()=>{
 for(const [key,value]of Object.entries(CERTIFICATES))assert.equal(digest(chain[key]),value.sha256);
 assert.equal(chain.cross.verify(chain.root.publicKey),true);
 assert.equal(chain.issuer.verify(chain.cross.publicKey),true);
 assert.equal((chain.pem.match(/BEGIN CERTIFICATE/g)||[]).length,3);
 assert.throws(()=>trust({...input,root:input.cross},now));
 assert.throws(()=>trust({...input,issuer:input.root},now));
 assert.throws(()=>trust({...input,cross:input.issuer},now));
 assert.throws(()=>trust({...input,unexpected:input.root},now));
 assert.throws(()=>trust({root:input.root,issuer:input.issuer},now));
});

test('authorities reject before-validity, after-expiry and invalid times',()=>{
 for(const instant of [Date.parse('2000-01-01'),Date.parse('2100-01-01'),NaN,Infinity])assert.throws(()=>trust(input,instant));
 for(const key of Object.keys(CERTIFICATES)){
  assert.throws(()=>trust(input,Date.parse(chain[key].validFrom)-1));
  assert.throws(()=>trust(input,Date.parse(chain[key].validTo)));
 }
});

test('PEM input is bounded to one certificate without appended directives',()=>{
 for(const value of [null,Buffer.from(input.root),'',input.root+input.issuer,'garbage\n'+input.root,
  input.root+'\ntrusted',input.root+' '.repeat(16000),'-----BEGIN CERTIFICATE-----bad-----END CERTIFICATE-----'])assert.throws(()=>certificate(value));
 assert.equal(digest(certificate('\n'+input.root+'\n')),CERTIFICATES.root.sha256);
});

test('preflight accepts only an exact bounded DNS hostname, never IP or command syntax',()=>{
 for(const value of ['ftp.example.com','a.co','a-b.example.test'])assert.equal(hostname(value),value);
 for(const value of ['',null,'127.0.0.1','[::1]','::1','*.example.com','https://example.com','a@example.com','ftp.EXAMPLE.com',
  'ftp.example.com:21','ftp.example.com.','-a.example.com','a-.example.com','a..example.com','ftp.example.c-','a.'+'b'.repeat(64),
  'a'.repeat(64)+'.com','a.'.repeat(127)+'com','ftp.example.com\nUSER name','ftp.example.com\0'])assert.throws(()=>hostname(value),String(value));
});

test('a genuine public leaf proves its chain but not the saved IP or school hostname',()=>{
 const offline=peer(leaf,fixtureHost,chain,now);
 assert.equal(offline.chainTrusted,true);assert.equal(offline.hostnameVerified,true);
 for(const name of ['deutsche-online-schule.com','198.46.180.107.host.secureserver.net','two.labels.shr.prod.iad2.secureserver.net']){
  const result=peer(leaf,name,chain,now);assert.equal(result.chainTrusted,true);assert.equal(result.hostnameVerified,false);
 }
 assert.throws(()=>peer(leaf,'107.180.46.198',chain,now));
 assert.throws(()=>peer(input.issuer,fixtureHost,chain,now));
 const cert=certificate(leaf);
 for(const instant of [Date.parse(cert.validFrom)-1,Date.parse(cert.validTo),NaN])assert.throws(()=>peer(leaf,fixtureHost,chain,instant));
});

test('only simulated full OpenSSL success plus chain and SAN yields authenticated metadata',()=>{
 const result={status:0,stdout:leaf+'\nVerify return code: 0 (ok)\n',stderr:''};
 const success=inspect(result,fixtureHost,chain,now);
 assert.equal(success.passed,true);assert.equal(success.authenticatedCertificate,certificate(leaf).fingerprint256);
 for(const changed of [{...result,status:1},{...result,status:null},{...result,error:{code:'ETIMEDOUT'}},
  {...result,signal:'SIGTERM'},{...result,stdout:leaf},{...result,stdout:'Verification: OK'},
  {...result,stdout:input.issuer+'\nVerification: OK'}]){
  const failed=inspect(changed,fixtureHost,chain,now);assert.equal(failed.passed,false);assert.equal(failed.authenticatedCertificate,null);
 }
 const mismatch=inspect(result,'deutsche-online-schule.com',chain,now);
 assert.equal(mismatch.outcome,'hostname_mismatch');assert.equal(mismatch.authenticatedCertificate,null);
 assert.equal(inspect({error:{code:'ETIMEDOUT'}},fixtureHost,chain,now).outcome,'timeout');
 assert.equal(inspect(result,fixtureHost,chain,Date.parse('2030-01-01')).passed,false);
});

test('actual preflight uses strict server verification and sends no FTP login commands',()=>{
 const args=probeArguments('ftp.example.com','C:/private/reviewed.pem');
 assert.deepEqual(args,['s_client','-starttls','ftp','-connect','107.180.46.198:21','-servername','ftp.example.com',
  '-verify_hostname','ftp.example.com','-verify_return_error','-verifyCAfile','C:/private/reviewed.pem',
  '-purpose','sslserver','-min_protocol','TLSv1.2','-showcerts']);
 assert.throws(()=>probeArguments('ftp.example.com\nPASS x','bundle'));
 const source=fs.readFileSync(path.join(__dirname,'../tools/check-castle-portal-tls.cjs'),'utf8');
 assert.match(source,/input:''/);assert.match(source,/timeout:20000/);
 assert.doesNotMatch(source,/NODE_TLS_REJECT_UNAUTHORIZED|rejectUnauthorized:false|-certificate=\*|USER |PASS /);
});
