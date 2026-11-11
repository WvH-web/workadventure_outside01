"""Inventory only pinned code/dependencies; never copy colleague state or credentials."""
import hashlib
import json
import os
from pathlib import Path
import runpy
import shutil
import time

ROOT=Path('/opt/wvh-castle-homes')
SOURCE=Path('/opt/wvh-sterne-kollegium/releases/20261109T191624Z')
ORIGINAL_SHA='8718d84cb8b6ef283a08075598f1d3115574e38964247378e61f08ad53ce8aa6'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    os.umask(0o077)
    ops=runpy.run_path('/tmp/wvh-castle-piano-ops.py')
    before=ops['baseline']()
    published=json.loads((ROOT/'private/progressive-deployment.json').read_text())
    release=Path(published['release'])
    assert release==ROOT/'releases'/published['archiveSha256'][:16] and published['passed']
    raw=(release/'castle-homes-runtime.manifest.json').read_bytes()
    assert sha(raw)==ORIGINAL_SHA
    original=json.loads(raw)
    assert SOURCE.resolve()==SOURCE and original['sourceRelease']==str(SOURCE) and len(original['files'])==107
    assert all((SOURCE/name).resolve()==SOURCE/name and sha((SOURCE/name).read_bytes())==digest for name,digest in original['files'].items())
    # The room surface manifest was not the engine's complete shared model-code closure.
    source_files=dict(original['files'])
    supplemental={}
    for file in sorted((SOURCE/'dorfplatz/public').rglob('*')):
        if not file.is_file() or file.suffix not in ['.js','.mjs','.cjs']:
            continue
        assert file.resolve()==file and file.stat().st_uid==0 and not file.stat().st_mode&0o022
        assert file.stat().st_size<5*1024*1024
        name=file.relative_to(SOURCE).as_posix()
        if name not in source_files:
            source_files[name]=sha(file.read_bytes())
            supplemental[name]=source_files[name]
    lock_raw=(SOURCE/'dorfplatz/package-lock.json').read_bytes()
    assert sha(lock_raw)==original['files']['dorfplatz/package-lock.json']
    lock=json.loads(lock_raw)
    assert lock['lockfileVersion']==3 and isinstance(lock['packages'],dict)
    modules=SOURCE/'dorfplatz/node_modules'
    assert modules.resolve()==modules and modules.is_dir()
    packages={}
    dependency_files={}
    symlinks=[]
    forbidden=[]
    total=0
    for directory,dirs,names in os.walk(modules,followlinks=False):
        current=Path(directory)
        dirs[:]=sorted(name for name in dirs if name!='.bin')
        assert all(not (current/name).is_symlink() for name in dirs), 'Review a linked dependency directory before copying'
        if current!=modules and (current.parent.name=='node_modules' and not current.name.startswith('@') or current.parent.name.startswith('@') and current.parent.parent.name=='node_modules'):
            relative=current.relative_to(SOURCE/'dorfplatz').as_posix()
            assert relative in lock['packages'], 'An unpinned package was found'
            package=json.loads((current/'package.json').read_text())
            entry=lock['packages'][relative]
            assert package['version']==entry['version'] and not entry.get('dev')
            packages[relative]={'name':package['name'],'version':package['version'],'license':package.get('license'),'integrity':entry.get('integrity')}
        for name in sorted(names):
            if current==modules and name=='.package-lock.json':
                continue
            source=current/name
            relative=source.relative_to(SOURCE).as_posix()
            assert source.stat().st_uid==0 and not source.stat().st_mode&0o022 and source.is_file()
            if source.is_symlink():
                target=source.resolve(strict=True)
                assert target.is_relative_to(modules) and target.is_file()
                symlinks.append({'file':relative,'target':target.relative_to(SOURCE).as_posix()})
            if name in ['.env','.npmrc','.yarnrc','.yarnrc.yml'] or name.endswith(('.p12','.pfx','.key','.pem')):
                forbidden.append(relative)
            body=source.read_bytes()
            dependency_files[relative]=sha(body)
            total+=len(body)
    assert packages and total<512*1024*1024
    assert all(any(name.startswith('dorfplatz/'+package+'/') for package in packages) for name in dependency_files)
    assert not forbidden, 'Review potentially sensitive package files before copying'
    # Preserve the original source manifest as provenance; the new tree has its own content identity.
    descriptor={'version':1,'originalSourceManifestSha256':ORIGINAL_SHA,'originalSource':str(SOURCE),
        'sourceFiles':dict(sorted(source_files.items())),'supplementalSharedCode':supplemental,'dependencyFiles':dict(sorted(dependency_files.items())),
        'packages':dict(sorted(packages.items())),'materializedInternalFileSymlinks':symlinks,
        'omittedNonRuntimeEntries':['node_modules/.bin','node_modules/.package-lock.json'],
        'dependencyBytes':total}
    descriptor_raw=(json.dumps(descriptor,sort_keys=True,separators=(',',':'))+'\n').encode()
    target=ROOT/'private/owned-runtime-inventory.json'
    ops['atomic'](target,descriptor)
    assert sha(target.read_bytes())!=sha(b'') and ops['baseline']()==before
    # The canonical byte form is separate from the human-readable private receipt.
    canonical=ROOT/'private/owned-runtime-manifest.canonical.json'
    canonical.write_bytes(descriptor_raw)
    canonical.chmod(0o600)
    print(json.dumps({'sourceReadOnly':True,'configurationChanged':False,'installed':False,
        'sourceFiles':len(source_files),'supplementalSharedCode':supplemental,'dependencyFiles':len(dependency_files),'dependencyBytes':total,
        'packages':packages,'internalFileSymlinks':len(symlinks),'forbiddenFiles':len(forbidden),
        'treeManifestSha256':sha(descriptor_raw),'freeBytes':shutil.disk_usage(ROOT).free,
        'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}))


if __name__=='__main__':
    main()
