param([Parameter(Mandatory=$true)][string]$PrivatePath)
$ErrorActionPreference='Stop'
$workspace=Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$secret=Join-Path $workspace 'Secrets\Godaddy\VPS\Musik Programm\musik.env\VPS.env'
if(!(Test-Path -LiteralPath $secret)){$secret=Join-Path (Split-Path $workspace -Parent) 'Secrets\Godaddy\VPS\Musik Programm\musik.env\VPS.env'}
$lines=Get-Content -LiteralPath $secret
$serverName=(($lines|Where-Object {$_ -cmatch '^Host/IP:'}|Select-Object -First 1)-replace '^Host/IP:\s*','').Trim()
$sshUser=(($lines|Where-Object {$_ -cmatch '^SSH-User:'}|Select-Object -First 1)-replace '^SSH-User:\s*','').Trim()
$sshPassword=(($lines|Where-Object {$_ -cmatch '^VPS_SSH_PASSWORD='}|Select-Object -First 1)-replace '^VPS_SSH_PASSWORD=','').Trim()
$hostKey=($lines|Where-Object {$_ -cmatch '^ssh-'}|Select-Object -First 1).Trim()
if(!$serverName -or !$sshUser -or !$sshPassword -or !$hostKey){throw 'Protected SSH configuration is incomplete'}
$payload=Get-Content -LiteralPath $PrivatePath -Raw
$python="import json,os,pathlib,re,sys; d=json.load(sys.stdin); assert re.fullmatch('[a-f0-9]{128}',d['hash']); p=pathlib.Path('/opt/wvh-hall-audio/private'); p.mkdir(parents=True,exist_ok=True); p.chmod(448); f=p/'code.json'; f.write_text(json.dumps(d)); f.chmod(384); print('Private podium verification material configured.')"
$encoded=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($python))
$command='sudo -n python3 -c "import base64;exec(base64.b64decode(''{0}''))"' -f $encoded
# The secret JSON travels over SSH standard input, not in the command or process arguments.
$start=[System.Diagnostics.ProcessStartInfo]::new()
$start.FileName='C:\Program Files\PuTTY\plink.exe'
$start.UseShellExecute=$false
$start.CreateNoWindow=$true
$start.RedirectStandardInput=$true
$start.RedirectStandardOutput=$true
$start.RedirectStandardError=$true
foreach($argument in @('-batch','-pw',$sshPassword,'-hostkey',$hostKey,"${sshUser}@${serverName}",$command)){$start.ArgumentList.Add($argument)}
$process=[System.Diagnostics.Process]::Start($start)
$process.StandardInput.Write($payload)
$process.StandardInput.Close()
$stdout=$process.StandardOutput.ReadToEnd()
$stderr=$process.StandardError.ReadToEnd()
$process.WaitForExit()
if($process.ExitCode -ne 0){throw 'Private podium setup failed over SSH'}
Write-Output $stdout.Trim()
