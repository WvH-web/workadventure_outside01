param([Parameter(Mandatory=$true)][string]$XmlPath)
$ErrorActionPreference='Stop'
[xml]$document=Get-Content -LiteralPath $XmlPath -Raw
$names=@($document.SelectNodes('//*[local-name()="ls"]//*[local-name()="filename"]') | ForEach-Object { $_.value })
ConvertTo-Json -InputObject $names -Compress
