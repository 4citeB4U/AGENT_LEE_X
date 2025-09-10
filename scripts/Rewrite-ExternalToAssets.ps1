param(
  [string]$Root = ".",
  [string[]]$ScanDirs = @("app","pages","components","src","public","workers"),
  [string[]]$Exts = @("ts","tsx","js","jsx","html","css")
)

$hostsPath = Join-Path $Root "scripts\forbidden-hosts.txt"
if (-not (Test-Path $hostsPath)) { Write-Error "forbidden-hosts.txt not found at $hostsPath"; exit 1 }
$hosts = Get-Content $hostsPath | Where-Object { $_ -and $_ -notmatch '^\s*#' }

# Build extension patterns
$patterns = $Exts | ForEach-Object { '*.' + $_ }

$files = @()
foreach ($dir in $ScanDirs) {
  $fullDir = Join-Path $Root $dir
  if (Test-Path $fullDir) {
    $files += Get-ChildItem -Path $fullDir -Recurse -Include $patterns -File -ErrorAction SilentlyContinue
  }
}

foreach ($f in $files) {
  try { $orig = Get-Content $f.FullName -Raw } catch { continue }
  $new = $orig
  foreach ($h in $hosts) {
    $escaped = [Regex]::Escape($h)
    # match https://host/<path> capturing the path
    $rx = '(?i)https?://' + $escaped + '(/[^\s''""`<>]+)'
    $new = [regex]::Replace($new, $rx, { param($m) return "/assets/$h" + $m.Groups[1].Value })
  }
  if ($new -ne $orig) {
    Set-Content $f.FullName $new -NoNewline
    Write-Host "Rewrote -> $($f.FullName)"
  }
}
