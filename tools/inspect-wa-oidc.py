"""Read only public OIDC application metadata; never print a client secret or token."""
import json
import subprocess
from urllib.parse import urlsplit,urlunsplit

for name in ['workadventure-play-1','workadventure-back-1']:
    data=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
    env=dict(value.split('=',1) for value in data['Config']['Env'] if '=' in value)
    result={'container':name,'clientId':env.get('OPENID_CLIENT_ID'),'scope':env.get('OPENID_SCOPE'),
      'secretConfigured':bool(env.get('OPENID_CLIENT_SECRET')),'configurationKeys':[key for key in env if key.startswith('OPENID_')]}
    for key in ['OPENID_CLIENT_ISSUER','OPENID_ISSUER','OPENID_REDIRECT_URI']:
        if env.get(key):
            parsed=urlsplit(env[key]);result[key]=urlunsplit((parsed.scheme,parsed.hostname or '',parsed.path,'',''))
    print(json.dumps(result,indent=2))
