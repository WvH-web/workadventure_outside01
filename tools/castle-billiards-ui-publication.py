"""Publish one reviewed public stylesheet without restarting any application or changing maps."""
import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import time

BASE=Path('/opt/wvh-castle-billiards-ui');PRIVATE=BASE/'private';PUBLIC=BASE/'public'
PREVIOUS=Path('/opt/wvh-castle-billiards-pilot-r3/private')
PREVIOUS_SHA='2084f0ccf75dd91e4034fc742e8598db828d822489a758c4a9467103f489652d'
CSS_SHA='9b4d3527a66599f6686f5d9d86b6188699b7737d89c0c2d09447f55c9619858d'
SUFFIX=b'.controls{padding-right:62px}\n'
CSS_INPUT=Path('/tmp/wvh-castle-billiards-ui.css')
PROOF_INPUT=Path('/home/wilhelm/.cache/wvh-school-qa/billiards-ui-candidate.private.json')
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
BLOCK=b'''
# Reviewed public billiards stylesheet; existing game state and services stay unchanged.
location = /castle-billiards/billiards.css {
    if ($args != "") { return 404; }
    if ($request_method != GET) { return 405; }
    alias /opt/wvh-castle-billiards-ui/public/billiards.css;
    default_type text/css;
    charset utf-8;
    add_header Cache-Control "no-store" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Permissions-Policy "microphone=(), camera=(), display-capture=()" always;
    add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'" always;
}
'''
sha=lambda raw:hashlib.sha256(raw).hexdigest()

def run(*args):
    result=subprocess.run(args,text=True,capture_output=True,timeout=120)
    if result.returncode:raise RuntimeError('Billiards stylesheet publication failed; private details withheld')
    return result.stdout

def checked(path,digest):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and stat.S_IMODE(path.stat().st_mode)==0o600
    raw=path.read_bytes();assert sha(raw)==digest
    scope={'__name__':'billiards_ui_dependency','__file__':str(path)};exec(compile(raw,str(path),'exec'),scope);return scope

def load(path):
    assert path.resolve()==path and path.is_file() and path.stat().st_uid==0 and stat.S_IMODE(path.stat().st_mode)==0o600
    return json.loads(path.read_text())

def write(name,value):
    path=PRIVATE/name;assert path.resolve()==path and not path.exists()
    with path.open('x') as handle:json.dump(value,handle,indent=2);handle.write('\n')
    path.chmod(0o600)

def appended(raw):
    assert b'location = /castle-billiards/billiards.css' not in raw and b'/opt/wvh-castle-billiards-ui/' not in raw
    assert b'location ^~ /castle-billiards/' in raw;return raw+BLOCK

def candidate(proof):
    assert proof['passed'] is True and proof['normalMicrosoftPupils']==2 and proof['errors']==[]
    assert proof['candidateCssSha256']==CSS_SHA and proof['archiveSha256']=='4a81fa9246b809bff1cf1ca119e0a081c58fc29bcb12cde7cc6eb25e52792e44'
    for key in ['syntheticApprovedAccountsOnly','realPublishedHttpsService','realNativeSidePanels','candidateCssOnly','networkResponsesSubstituted',
      'bothPlayersExecutedActualStrokes','mutualRematchAndSeatSwap','explicitNativePanelRejoin','nativeAudioDecodedBothWays','desktopAndTouch','placesReleasedAfterConfirmation']:
        assert proof[key] is True
    for key in ['schoolLookupOverridden','normalMapActivityActivated','normalPublishedCssUsed','oldCastleReplaced','fullCastleApprovalFor400']:
        assert proof[key] is False

def preserved(before,after,digest):
    expected=copy.deepcopy(before);expected['files'][str(NGINX)]=digest;assert after==expected

def predecessors():
    previous=checked(PREVIOUS/'deployment-ops.py',PREVIOUS_SHA)
    seat=previous['predecessor']();helper,ops=previous['dependencies'](seat)
    value=load(PREVIOUS/'before.json');record=load(PREVIOUS/'deployment.json')
    assert record['passed'] and not (PREVIOUS/'rollback.json').exists() and sha((PREVIOUS/'before.json').read_bytes())==record['beforeSha256']
    previous['validate_files'](value['inventory'])
    assert helper['running']()==record['running'] and helper['processes']()==value['processes']
    release=Path(record['release']);assert release.resolve()==release and release==previous['BASE']/'releases'/record['archiveSha256'][:16]
    assert not any(item.is_symlink() for item in release.rglob('*'))
    assert {item.relative_to(release).as_posix() for item in release.rglob('*') if item.is_file()}==set(value['files'])
    previous['validate_files']({str(release/name):digest for name,digest in value['files'].items()})
    for name,source in value['sharedSources'].items():assert sha(Path(source).read_bytes())==value['files'][name]
    assert sha((previous['BASE']/'policy/admission.json').read_bytes())==record['policySha256']
    assert sha((PREVIOUS/'runtime.env').read_bytes())==record['runtimeSha256']
    current=previous['inspect'](previous['NAME']);assert current['Id']==record['containerId'] and current['State']['Health']['Status']=='healthy'
    return previous,helper,ops,release

def public(previous,release):
    status,raw,_=previous['request']('health');assert status==200 and json.loads(raw)=={'ready':True}
    for name in ['index.html','billiards.js','renderer.js','billiards.css','credits.html','vendor/three/LICENSE','vendor/three/build/three.module.js','vendor/three/build/three.core.js']:
        status,raw,headers=previous['request'](name)
        expected=(PUBLIC/'billiards.css') if name=='billiards.css' else release/'castle-billiards/public'/name
        assert status==200 and raw==expected.read_bytes() and headers['Cache-Control']=='no-store'
        assert "frame-ancestors 'self'" in headers['Content-Security-Policy']
    assert previous['request']('session',{})[0]==401
    for route in ['server.cjs','state.json','vendor/core.cjs','policy/admission.json','billiards.css?token=not-a-real-credential']:
        assert previous['request'](route)[0]==404
    assert previous['request']('billiards.css',{})[0]==405

def publish():
    os.umask(0o077);previous=checked(PREVIOUS/'deployment-ops.py',PREVIOUS_SHA);previous['verify']()
    assert not BASE.exists();previous,helper,ops,release=predecessors()
    for path in [CSS_INPUT,PROOF_INPUT]:assert path.resolve()==path and path.is_file() and path.stat().st_size<100000
    css=CSS_INPUT.read_bytes();proof_raw=PROOF_INPUT.read_bytes();candidate(json.loads(proof_raw))
    assert sha(css)==CSS_SHA and css==(release/'castle-billiards/public/billiards.css').read_bytes()+SUFFIX
    old=NGINX.read_bytes();new=appended(old);before=ops['baseline']();running=helper['running']();processes=helper['processes']()
    frozen={str(path):sha(path.read_bytes()) for path in PREVIOUS.iterdir() if path.is_file()}
    assert all(Path(name).resolve()==Path(name) for name in frozen)
    BASE.mkdir(mode=0o755);BASE.chmod(0o755);PRIVATE.mkdir(mode=0o700);PUBLIC.mkdir(mode=0o755);PUBLIC.chmod(0o755)
    target=PUBLIC/'billiards.css';target.write_bytes(css);target.chmod(0o644)
    (PRIVATE/'candidate-proof.json').write_bytes(proof_raw);(PRIVATE/'candidate-proof.json').chmod(0o600)
    (PRIVATE/'nginx-before.private.conf').write_bytes(old);(PRIVATE/'nginx-before.private.conf').chmod(0o600)
    write('before.json',{'version':1,'baseline':before,'running':running,'processes':processes,'inventory':frozen,'candidateSha256':sha(proof_raw)})
    source=Path(__file__).read_bytes();(PRIVATE/'publication-ops.py').write_bytes(source);(PRIVATE/'publication-ops.py').chmod(0o600)
    changed=False
    try:
        assert NGINX.read_bytes()==old;NGINX.write_bytes(new);changed=True;run('nginx','-t');run('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');run('nginx','-t')
        for _ in range(40):
            try:
                status,raw,_=previous['request']('billiards.css')
                if status==200 and sha(raw)==CSS_SHA:break
            except Exception:pass
            time.sleep(.3)
        else:raise RuntimeError('Public stylesheet did not become ready')
        public(previous,release);assert helper['running']()==running and helper['processes']()==processes
        previous['validate_files'](frozen);preserved(before,ops['baseline'](),sha(new));assert NGINX.read_bytes()==new
        write('deployment.json',{'version':1,'passed':True,'beforeSha256':sha((PRIVATE/'before.json').read_bytes()),'nginxSha256':sha(new),
          'cssSha256':CSS_SHA,'publicationSourceSha256':sha(source),'onlyOnePublicStylesheetChanged':True,'serviceRestarted':False,'mapsChanged':False,'fullCastleApprovalFor400':False})
    except Exception:
        if changed:
            assert NGINX.read_bytes() in [old,new]
            if NGINX.read_bytes()==new:
                NGINX.write_bytes(old);run('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');run('nginx','-t')
        assert helper['running']()==running and helper['processes']()==processes and ops['baseline']()==before;previous['validate_files'](frozen)
        write('rollback.json',{'previousStylesheetAndPlatformRetained':True});raise RuntimeError('Stylesheet publication stopped; previous platform preserved') from None
    verify()

def verify():
    record=load(PRIVATE/'deployment.json');before=load(PRIVATE/'before.json');previous,helper,ops,release=predecessors()
    assert record['passed'] and not (PRIVATE/'rollback.json').exists() and sha((PRIVATE/'before.json').read_bytes())==record['beforeSha256']
    assert sha((PRIVATE/'publication-ops.py').read_bytes())==record['publicationSourceSha256']
    previous['validate_files'](before['inventory']);assert helper['running']()==before['running'] and helper['processes']()==before['processes']
    assert NGINX.read_bytes()==appended((PRIVATE/'nginx-before.private.conf').read_bytes()) and sha(NGINX.read_bytes())==record['nginxSha256']
    preserved(before['baseline'],ops['baseline'](),record['nginxSha256'])
    assert (PUBLIC/'billiards.css').resolve()==PUBLIC/'billiards.css' and sha((PUBLIC/'billiards.css').read_bytes())==record['cssSha256']==CSS_SHA
    candidate(load(PRIVATE/'candidate-proof.json'));assert sha((PRIVATE/'candidate-proof.json').read_bytes())==before['candidateSha256']
    public(previous,release)
    print(json.dumps({'passed':True,'onlyOneBilliardsStylesheetPublished':True,'allContainersAndMapsUnchanged':True,'noServiceRestart':True,
      'pilotOnly':True,'normalMicrosoftAcceptancePending':not (PREVIOUS/'acceptance.json').exists(),'nativeMapActivityPending':True,'oldCastleReplaced':False,'fullCastleApprovalFor400':False}))

if __name__=='__main__':verify()
