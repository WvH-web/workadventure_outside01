"""Small read-only timing probe with the two authorized synthetic accounts; no identity/profile values are returned."""
import json
from pathlib import Path
import subprocess

source=Path('/home/wilhelm/.cache/wvh-school-qa/admission-identifiers.private.json')
assert source.resolve()==source and source.parent.stat().st_mode&0o777==0o700 and source.stat().st_size<2048
source.chmod(0o600)
try:
    value=json.loads(source.read_text());assert list(value)==['identifiers'] and len(value['identifiers'])==2
    assert all(isinstance(identifier,str) and 0<len(identifier)<255 for identifier in value['identifiers'])
    code=r'''
const fs=require('node:fs'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const {createLookup}=require('/srv/release/castle-school/lookup.cjs');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
assert.ok(Array.isArray(input.identifiers)&&input.identifiers.length===2&&new Set(input.identifiers).size===2);
async function main(){
 const durations=[],lookup=createLookup({url:'https://www.deine-schule.com/workadventure-castle-context.php',key:process.env.CASTLE_SCHOOL_LOOKUP_KEY});
 for(let index=0;index<12;index++){
  const started=performance.now(),value=await lookup(input.identifiers[index%2]);
  assert.equal(value.eligible,true);assert.equal(value.kind,'student');durations.push(performance.now()-started);
 }
 const sorted=[...durations].sort((a,b)=>a-b),round=value=>Math.round(value*100)/100;
 console.log(JSON.stringify({passed:true,scope:'serial internal profile reads only',authorizedSyntheticAccounts:2,requests:durations.length,
  minimumMs:round(sorted[0]),medianMs:round(sorted[Math.floor(sorted.length/2)]),p95Ms:round(sorted[Math.ceil(sorted.length*.95)-1]),
  maximumMs:round(sorted.at(-1)),eachReadFresh:true,identityOrClassValuesPrinted:false,normalMicrosoftLoginTested:false,schoolWrites:false}));
}
main().catch(()=>{console.error('Read-only school timing probe failed');process.exitCode=1;});
'''
    result=subprocess.run(['docker','exec','-i','wvh-castle-school','node','-e',code],input=json.dumps(value),capture_output=True,text=True,timeout=50)
    if result.returncode:raise RuntimeError('Internal timing probe failed; no school data was written')
    summary=json.loads(result.stdout);assert summary['passed'] and summary['schoolWrites'] is False
    print(json.dumps(summary))
finally:
    source.unlink(missing_ok=True)
