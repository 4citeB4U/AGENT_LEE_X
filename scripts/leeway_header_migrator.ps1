<#!
.SYNOPSIS
  LEEWAY Header Migrator (PowerShell) — allowlist, dry-run/apply, backup.
.DESCRIPTION
  Mirrors Node migrator: injects canonical header & purges legacy markers (REGION, ICON_ASCII, SIG, AGENTS)
  only in authored source directories.
.PARAMETER DryRun
  Preview changes only.
.PARAMETER Apply
  Write changes.
.PARAMETER Backup
  Also write .bak copy before modifying.
.EXAMPLE
  ./scripts/leeway_header_migrator.ps1 -DryRun
.EXAMPLE
  ./scripts/leeway_header_migrator.ps1 -Apply -Backup
#>
<#!
.SYNOPSIS
  LEEWAY Header Migrator (PowerShell) — allowlist, dry-run/apply, backup.
.DESCRIPTION
  Mirrors Node migrator: injects canonical header & purges legacy markers (REGION, ICON_ASCII, SIG, AGENTS)
  only in authored source directories.
.PARAMETER DryRun Preview changes only.
.PARAMETER Apply  Write changes.
.PARAMETER Backup Also write .bak copy before modifying.
#>
[CmdletBinding()] param(
  [switch]$DryRun,
  [switch]$Apply,
  [switch]$Backup
)

if (-not $DryRun -and -not $Apply) {
  Write-Host 'Use -DryRun or -Apply' -ForegroundColor Yellow
  exit 0
}

$Root = (Get-Location).Path
$AllowDirs = @('components','contexts','services','src','utils','scripts','LeeWay_Standards')
$AllowFiles = @('index.html','vite.config.ts','types.ts')
$ExcludeDirPrefix = @('android','ios','node_modules','dist','build','run','public/assets','vendor','vite-6.3.6','backend/run')
$ExcludeExt = @('.d.ts','.ico','.png','.jpg','.jpeg','.svg','.map','.json')
$LegacyPattern = '^(REGION|ICON_ASCII|SIG|AGENTS):'

function New-Header {
  param($Rel)
  $When = (Get-Date -Format 'yyyy-MM-dd')
  @"
/* LEEWAY CANONICAL HEADER — DO NOT REMOVE
TAG: LEEWAY_CANONICAL_HEADER
COLOR_ONION_HEX: CORE=#7C3AED|#DB2777 LAYER=#0EA5E9|#22D3EE
ICON_FAMILY: lucide
ICON_GLYPH: code
ICON_SIG: AUTO-MIGRATE
5WH: WHAT=Canon header inject; WHY=Standardize & purge legacy markers; WHO=Agent Lee Automation; WHERE=$Rel; WHEN=$When; HOW=allowlisted migrator;
SPDX-License-Identifier: MIT
*/

"@
}

function Test-AllowScope {
  param($Rel)
  if ($AllowFiles -contains $Rel) { return $true }
  foreach ($p in $ExcludeDirPrefix) { if ($Rel -like "$p*") { return $false } }
  foreach ($d in $AllowDirs) { if ($Rel -like "$d/*" -or $Rel -like "$d*" ) { return $true } }
  return $false
}

$Examined=0; $Rewritten=0; $Skipped=0; $Unchanged=0; $Touched=@();

function Update-LeeWayHeader {
  param($Path)
  if (-not (Test-Path $Path)) { return }
  $Rel = Resolve-Path -LiteralPath $Path -Relative
  if (-not (Test-AllowScope $Rel)) { $Skipped++; return }
  $Ext = [IO.Path]::GetExtension($Path)
  if ($ExcludeExt -contains $Ext) { $Skipped++; return }
  if ($Path -notmatch '\.(ts|tsx|js|jsx|mjs|cjs|html)$') { $Skipped++; return }
  $Global:Examined++
  $Raw = Get-Content -Raw -Path $Path
  if ($Raw.Length -eq 0) { return }
  $Chunk = $Raw.Substring(0, [Math]::Min(1000,$Raw.Length))
  $HasCanonical = $Chunk.Contains('TAG: LEEWAY_CANONICAL_HEADER')
  $HasLegacy = [regex]::IsMatch($Chunk,$LegacyPattern,[System.Text.RegularExpressions.RegexOptions]::Multiline)
  if (-not $HasLegacy -and $HasCanonical) { $Global:Unchanged++; return }

  $Lines = $Raw -split '\r?\n'
  for ($i=0; $i -lt [Math]::Min(60,$Lines.Count); $i++) { if ($Lines[$i] -match $LegacyPattern) { $Lines[$i] = '' } }
  if ($HasCanonical) {
    $StartLineObj = $Lines | Select-String -SimpleMatch 'LEEWAY CANONICAL HEADER'
    if ($StartLineObj) {
      $Start = $StartLineObj.LineNumber - 1
      for ($j=$Start; $j -lt $Lines.Count; $j++) {
        if ($Lines[$j] -match '\*/') { $RemoveCount = $j - $Start + 1; for ($k=0; $k -lt $RemoveCount; $k++){ $Lines[$Start] = $null; $Start++ }; break }
      }
      $Lines = $Lines | Where-Object { $_ -ne $null }
    }
  }
  while ($Lines.Count -gt 0 -and ($Lines[0].Trim() -eq '')) { $Lines.RemoveAt(0) }
  $Body = ($Lines -join "`n") -replace "`n{3,}","`n`n"
  $NewContent = (New-Header $Rel) + ($Body.TrimStart())
  if ($DryRun) { $Global:Touched += $Rel; return }
  if ($Apply) {
    if ($Backup) { Copy-Item -Path $Path -Destination "$Path.bak" -Force }
    Set-Content -Path $Path -Value $NewContent -Encoding UTF8
    $Global:Rewritten++; $Global:Touched += $Rel
  }
}

function Walk {
  param($Dir)
  Get-ChildItem -Path $Dir -Recurse -File | ForEach-Object { Update-LeeWayHeader $_.FullName }
}

Write-Host "`n🚀 LEEWAY Migrator ($([string]::Join(',',(@($DryRun)?'DRY-RUN':'APPLY'))))" -ForegroundColor Cyan
foreach ($d in $AllowDirs) { $p = Join-Path $Root $d; if (Test-Path $p) { Walk $p } }
foreach ($f in $AllowFiles) { $p = Join-Path $Root $f; if (Test-Path $p) { Update-LeeWayHeader $p } }

Write-Host "`nSummary" -ForegroundColor Cyan
Write-Host " Examined : $Examined"
Write-Host " Rewritten: $Rewritten $([bool]$DryRun ? '(simulated)' : '')"
Write-Host " Unchanged: $Unchanged"
Write-Host " Skipped  : $Skipped"
Write-Host " Touched  : $($Touched.Count)"
if ($Touched.Count -gt 0) { Write-Host "`nFiles to change:" -ForegroundColor Yellow; $Touched | ForEach-Object { Write-Host " • $_" } }
Write-Host "`nNext: node scripts/leeway_header_audit.mjs" -ForegroundColor Cyan
