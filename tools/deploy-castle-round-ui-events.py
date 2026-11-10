"""Publish only three static round-helper documents; keep the running school service and all memberships."""
import json
import os
from pathlib import Path
import runpy
import time
import urllib.error
import urllib.request
import zipfile

FILES={'presence.html':'4fd66f9618ea05d1ab06a9ec0d9f5a8e02ec076fb2b59f58c9d2d0ef7b997585',
 'rounds.html':'90aa7d7aad5f76dcee1582d146a4d55225499aec8d195b5a457e70f24e980791',
 'unowned-ui.js':'6c872ac17e66f51de918ab233c0720b1d6ed460b29742185ece3e8fffd04e6cf'}
ROUTES={'presence':'presence.html','rounds':'rounds.html','unowned-ui.js':'unowned-ui.js'}
NGINX=Path('/var/www/vhosts/system/together.deine-schule.com/conf/vhost_nginx.conf')
CSP="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-src https:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'"
def request(route,timeout=12):
    try:response=urllib.request.urlopen('https://together.deine-schule.com/castle-school/'+route,timeout=timeout)
    except urllib.error.HTTPError as error:response=error
    return response.status,response.read(100000),response.headers
def preserved(before,after):
    assert before['services']==after['services']
    assert {key:value for key,value in before['files'].items() if key!=str(NGINX)}=={key:value for key,value in after['files'].items() if key!=str(NGINX)}
def main():
    os.umask(0o077);ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py');sha=ops['sha'];before=ops['baseline']()
    piano=json.loads((ops['PRIVATE']/'deployment.json').read_text());assert sha(NGINX.read_bytes())==piano['nginx_after_sha256']
    private=Path('/opt/wvh-castle-school/private');record=private/'round-ui-events-deployment.json';assert not record.exists()
    school=json.loads((private/'deployment.json').read_text());release=Path(school['release']);old_files={}
    for name in ['presence.html','rounds.html']:
        original=release/('castle-school/public/'+name);assert sha(original.read_bytes())==school['files']['castle-school/public/'+name]
        status,raw,headers=request(name[:-5]);assert status==200 and raw==original.read_bytes();old_files[name]=raw
        assert headers['Content-Security-Policy']==CSP
    with zipfile.ZipFile('/tmp/wvh-castle-round-ui.zip') as archive:
        assert len(archive.infolist())==3 and set(archive.namelist())==set(FILES) and sum(info.file_size for info in archive.infolist())<15000
        payload={name:archive.read(name) for name in FILES};assert all(sha(raw)==FILES[name] for name,raw in payload.items())
    for name in old_files:assert payload[name]==old_files[name].replace(b'<script defer src="/iframe_api.js">',b'<script defer src="/castle-school/unowned-ui.js"></script><script defer src="/iframe_api.js">')
    identifier=sha(b''.join(name.encode()+payload[name] for name in sorted(payload)))[:16]
    parent=Path('/opt/wvh-castle-round-ui');target=parent/identifier
    assert parent.resolve()==parent and target.resolve()==target and not parent.is_symlink()
    parent.mkdir(mode=0o755,exist_ok=True);parent.chmod(0o755);target.mkdir(mode=0o755,exist_ok=True);target.chmod(0o755)
    if list(target.iterdir()):assert {path.name for path in target.iterdir()}==set(FILES) and all(not path.is_symlink() and path.is_file() for path in target.iterdir())
    for name,raw in payload.items():
        file=target/name;assert not file.exists() or file.read_bytes()==raw;file.write_bytes(raw);file.chmod(0o644)
    old=NGINX.read_bytes();assert b'# Castle round helper UI isolation' not in old
    block='\n# Castle round helper UI isolation; no school-service restart.\n'
    for route,name in ROUTES.items():
        assert ('location = /castle-school/'+route+' {').encode() not in old
        block+='location = /castle-school/'+route+' {\n    alias '+str(target/name)+';\n    types { }\n    default_type "'+('text/javascript' if name.endswith('.js') else 'text/html')+'; charset=utf-8";\n'
        block+='    if ($args != "") { return 404; }\n    if ($request_method != GET) { return 405; }\n'
        for key,value in {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN',
          'Permissions-Policy':'microphone=(), camera=(), display-capture=()','Content-Security-Policy':CSP}.items():block+='    add_header '+key+' "'+value+'" always;\n'
        block+='}\n'
    new=old+block.encode();backup=private/('nginx-before-ui-events-'+identifier+'.private.conf');assert not backup.exists() or backup.read_bytes()==old
    backup.write_bytes(old);backup.chmod(0o600);changed=False;step='apply-web-route';observed={}
    try:
        ops['unchanged'](before);assert NGINX.read_bytes()==old;NGINX.write_bytes(new);changed=True
        ops['run']('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');ops['run']('nginx','-t')
        step='check-static-helpers'
        until=time.monotonic()+25
        while True:
            ready=True
            for route,name in ROUTES.items():
                try:
                    status,raw,headers=request(route,3);observed[route]={'status':status,'sha256':sha(raw),'cache':headers['Cache-Control'],'cspMatches':headers['Content-Security-Policy']==CSP}
                    ready=ready and status==200 and raw==payload[name] and headers['Cache-Control']=='no-store' and headers['Content-Security-Policy']==CSP and headers['X-Frame-Options']=='SAMEORIGIN'
                except Exception as error:observed[route]={'errorType':type(error).__name__};ready=False
            if ready:break
            if time.monotonic()>=until:raise RuntimeError('New static helper routing did not become ready')
            time.sleep(.5)
        assert request('round-context')[0]==401 and request('context')[0]==401
        step='preserve-existing-platform';after=ops['baseline']();preserved(before,after);assert NGINX.read_bytes()==new
        value={'passed':True,'release':identifier,'files':FILES,'directory':str(target),'nginx_before_sha256':sha(old),'nginx_after_sha256':sha(new),
          'backup':str(backup),'before':before,'onlyStaticHelpersChanged':True,'runningSchoolServiceUnchanged':True,'membershipsPreserved':True,
          'existingManifestsAndMapsUnchanged':True,'authenticationAndPolicyUnchanged':True}
        ops['atomic'](record,value);print(json.dumps({key:value[key] for key in ['passed','release','onlyStaticHelpersChanged','runningSchoolServiceUnchanged',
          'membershipsPreserved','existingManifestsAndMapsUnchanged','authenticationAndPolicyUnchanged']},indent=2))
    except Exception as error:
        ops['atomic'](private/'round-ui-events-failure.private.json',{'step':step,'type':type(error).__name__,'observed':observed})
        if changed:
            assert NGINX.read_bytes() in [old,new]
            if NGINX.read_bytes()==new:NGINX.write_bytes(old);ops['run']('plesk','sbin','httpdmng','--reconfigure-domain','together.deine-schule.com');ops['run']('nginx','-t')
        ops['unchanged'](before);raise RuntimeError('Helper UI publication failed; exact previous routing restored') from None
if __name__=='__main__':main()
