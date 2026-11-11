$ErrorActionPreference='Stop'
$workspace=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$secret=Join-Path $workspace 'Secrets\Godaddy\VPS\Musik Programm\musik.env\VPS.env'
if(!(Test-Path -LiteralPath $secret)){$secret=Join-Path (Split-Path $workspace -Parent) 'Secrets\Godaddy\VPS\Musik Programm\musik.env\VPS.env'}
$lines=Get-Content -LiteralPath $secret
$serverName=(($lines | Where-Object {$_ -cmatch '^Host/IP:'} | Select-Object -First 1) -replace '^Host/IP:\s*','').Trim()
$sshUser=(($lines | Where-Object {$_ -cmatch '^SSH-User:'} | Select-Object -First 1) -replace '^SSH-User:\s*','').Trim()
$sshPassword=(($lines | Where-Object {$_ -cmatch '^VPS_SSH_PASSWORD='} | Select-Object -First 1) -replace '^VPS_SSH_PASSWORD=','').Trim()
$hostKey=($lines | Where-Object {$_ -cmatch '^ssh-'} | Select-Object -First 1).Trim()
if(!$serverName -or !$sshUser -or !$sshPassword -or !$hostKey){throw 'Protected SSH configuration is incomplete'}
& 'C:\Program Files\PuTTY\plink.exe' -batch -pw $sshPassword -hostkey $hostKey -N -L '127.0.0.1:4319:127.0.0.1:13251' -R '127.0.0.1:4319:127.0.0.1:4319' "${sshUser}@${serverName}"
if($LASTEXITCODE -ne 0){throw 'Room-call test connection ended'}
