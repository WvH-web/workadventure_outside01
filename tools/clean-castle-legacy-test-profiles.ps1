param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'Temp')).Path
if ((Get-Item -LiteralPath $root).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Legacy temp root is linked' }
$reportRoot='D:\CodexScratch\WorkAdventure'
$marker=Get-Content -LiteralPath (Join-Path $reportRoot '.castle-local-storage.json') -Raw | ConvertFrom-Json
if ($marker.version -ne 1 -or $marker.owner -ne 'wvh-workadventure-local-qa') { throw 'Unknown report root' }
$directory=Join-Path $reportRoot 'output\legacy-profile-cleanup'
foreach ($path in @($reportRoot,(Join-Path $reportRoot 'output'),$directory)) {
    if (Test-Path -LiteralPath $path) {
        if ((Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked report path' }
    } else { New-Item -ItemType Directory -Path $path | Out-Null }
}
$cutoff = [DateTime]::UtcNow.AddDays(-1)
$candidates = @(Get-ChildItem -LiteralPath $root -Directory -Filter 'playwright_chromiumdev_profile-*')
$rows = @()
foreach ($candidate in $candidates) {
    $target = (Resolve-Path -LiteralPath $candidate.FullName).Path
    if ([IO.Path]::GetDirectoryName($target) -ne $root -or $candidate.Name -notmatch '^playwright_chromiumdev_profile-[A-Za-z0-9]+$') { throw 'Unexpected legacy test directory' }
    $reason = $null
    if ($candidate.LastWriteTimeUtc -gt $cutoff) { $reason='recent' }
    if ($candidate.Attributes -band [IO.FileAttributes]::ReparsePoint) { $reason='linked' }
    if (!$reason -and @(Get-ChildItem -LiteralPath $target -Force -Recurse | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count -gt 0) { $reason='linked-content' }
    $processes = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'")
    if (@($processes | Where-Object { $_.CommandLine -and $_.CommandLine.Replace('/', '\').IndexOf($target.Replace('/', '\'), [StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count -gt 0) { $reason='active' }
    $bytes = [long]0
    if (!$reason) { Get-ChildItem -LiteralPath $target -File -Force -Recurse | ForEach-Object { $bytes += $_.Length } }
    $removed = $false
    if ($Apply -and !$reason) { Remove-Item -LiteralPath $target -Recurse; $removed=$true }
    $rows += [PSCustomObject]@{ name=$candidate.Name; logicalBytes=$bytes; skipped=$reason; removed=$removed }
}
$report=Join-Path $directory (([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ'))+'.json')
ConvertTo-Json -InputObject $rows -Depth 4 | Set-Content -LiteralPath $report -Encoding utf8
$removed=@($rows | Where-Object removed)
[PSCustomObject]@{ considered=$rows.Count; removed=$removed.Count; logicalBytesRemoved=($removed | Measure-Object logicalBytes -Sum).Sum; reportDrive='D:'; otherCachesUntouched=$true } | ConvertTo-Json -Compress
