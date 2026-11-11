param([Parameter(Mandatory=$true)][string]$Directory)
$ErrorActionPreference = 'Stop'
$Directory = [IO.Path]::GetFullPath($Directory).Replace('/', '\')
$processes = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe' OR Name='node.exe' OR Name='ffmpeg.exe'")
$active = @($processes | Where-Object { $_.CommandLine -and $_.CommandLine.Replace('/', '\').IndexOf($Directory, [StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count -gt 0
ConvertTo-Json -InputObject $active -Compress
