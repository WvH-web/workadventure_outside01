param(
    [string]$Root = 'D:\CodexScratch\WorkAdventure',
    [Parameter(Mandatory=$true)][string]$NodeModules
)
$ErrorActionPreference = 'Stop'
$Root = [IO.Path]::GetFullPath($Root)
if ($Root -notmatch '^D:\\' -or $Root -eq 'D:\') { throw 'Use an explicit project directory on D:' }
if (!(Test-Path -LiteralPath $NodeModules -PathType Container)) { throw 'Configured dependency directory is missing' }
$marker = Join-Path $Root '.castle-local-storage.json'
if (Test-Path -LiteralPath $Root) {
    if (!(Test-Path -LiteralPath $marker -PathType Leaf)) { throw 'Existing directory has no project ownership marker' }
    $prior = Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json
    if ($prior.version -ne 1 -or $prior.owner -ne 'wvh-workadventure-local-qa') { throw 'Foreign project storage marker' }
} else {
    New-Item -ItemType Directory -Path $Root | Out-Null
}
if ((Get-Item -LiteralPath $Root).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Project storage cannot be a junction or symbolic link' }
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = [Security.AccessControl.DirectorySecurity]::new()
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true, $false)
foreach ($principal in @($sid, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'), [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))) {
    $rule = [Security.AccessControl.FileSystemAccessRule]::new($principal, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $Root -AclObject $acl
$value = [ordered]@{ version=1; owner='wvh-workadventure-local-qa'; nodeModules=[IO.Path]::GetFullPath($NodeModules) }
$value | ConvertTo-Json | Set-Content -LiteralPath $marker -Encoding utf8
[PSCustomObject]@{ initialized=$true; drive='D:'; privateAccess=$true; credentialsMoved=$false } | ConvertTo-Json -Compress
