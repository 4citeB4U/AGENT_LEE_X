<# LEEWAY HEADER — DO NOT REMOVE
REGION: OPS.SCRIPTS.FIXERS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=wrench ICON_SIG=CD534113
5WH: WHAT=Apply long/micro LEEWAY headers; WHY=standardize repo; WHO=RapidWebDevelop; WHERE=tools\Apply-LeewayHeaders.ps1; WHEN=2025-09-07; HOW=pwsh ./tools/Apply-LeewayHeaders.ps1 -Root "D:\agentleegeminialmost\backend"
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
#>

param(
  [Parameter(Mandatory=$true)] [string]$Root,
  [string[]]$IncludeExt = @('.py','.ps1','.psm1','.mjs','.js','.ts','.md','.surql','.psd1','.pssc'),
  [switch]$WhatIf
)

$LongHeader = @"
LEEWAY HEADER — DO NOT REMOVE
REGION: {REGION}
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=meta ICON_SIG=CD534113
5WH: WHAT={WHAT}; WHY={WHY}; WHO=RapidWebDevelop; WHERE={WHERE}; WHEN={WHEN}; HOW={HOW}
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
"@

$MicroHeader = 'LEEWAY MICRO: REGION={REGION} SIG=00000000 OWNER=RapidWebDevelop WHEN={WHEN}'

function Get-CommentBlock {
  param([string]$Ext,[string]$Body)
  switch ($Ext) {
    '.py' { return ($Body -split "`n" | %{"# $_"}) -join "`n" }
    '.ps1' { return "<#`n$Body`n#>" }
    '.psm1' { return "<#`n$Body`n#>" }
    '.md' { return "<!--`n$Body`n-->" }
    '.surql' { return ($Body -split "`n" | %{"-- $_"}) -join "`n" }
    default { return "/*`n$Body`n*/" }
  }
}

$files = Get-ChildItem -LiteralPath $Root -Recurse -File | Where-Object { $IncludeExt -contains $_.Extension }

$now = (Get-Date).ToString("yyyy-MM-dd")
$report = @()

foreach($f in $files){
  $content = Get-Content -LiteralPath $f.FullName -Raw
  $hasHeader = $content -match 'LEEWAY HEADER — DO NOT REMOVE' -or $content -match 'LEEWAY MICRO:'
  $region = 'SYSTEM.UNKNOWN'
  $what = "Module: $($f.Name)"
  $why = 'standardize'
  $how = 'n/a'
  $where = $f.FullName

  if(-not $hasHeader){
    $headerBody = $LongHeader.Replace('{REGION}',$region).Replace('{WHAT}',$what).Replace('{WHY}',$why).Replace('{WHERE}',$where).Replace('{WHEN}',$now).Replace('{HOW}',$how)
    $headerBlock = Get-CommentBlock -Ext $f.Extension -Body $headerBody
    $newContent = "$headerBlock`n`n$content"
    if($WhatIf){ Write-Host "[DRYRUN] add header -> $($f.FullName)"; }
    else{ Set-Content -LiteralPath $f.FullName -Value $newContent -NoNewline }
    $report += [pscustomobject]@{ file=$f.FullName; action='added-long-header' }
  } else {
    $report += [pscustomobject]@{ file=$f.FullName; action='kept' }
  }
}

$report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $Root 'run\leeway_header_report.json')
Write-Host "Done. Report: $(Join-Path $Root 'run\leeway_header_report.json')"