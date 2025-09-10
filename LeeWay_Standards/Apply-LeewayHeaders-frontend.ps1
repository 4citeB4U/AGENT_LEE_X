<# LEEWAY HEADER — DO NOT REMOVE
REGION: UI.OPS.FIXERS
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=wrench ICON_SIG=CD534113
5WH: WHAT=Apply long/micro LEEWAY headers to frontend; WHY=standardize SPA; WHO=RapidWebDevelop; WHERE=tools\Apply-LeewayHeaders-frontend.ps1; WHEN=2025-09-07; HOW=pwsh ./tools/Apply-LeewayHeaders-frontend.ps1 -Root "D:\agentleegeminialmost\frontend"
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
#>

param(
  [Parameter(Mandatory=$true)] [string]$Root,
  [string[]]$IncludeExt = @('.tsx','.ts','.jsx','.js','.mjs','.html','.css','.md'),
  [switch]$WhatIf
)

$LongHeader = @"
LEEWAY HEADER — DO NOT REMOVE
REGION: {REGION}
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT={WHAT}; WHY={WHY}; WHO=RapidWebDevelop; WHERE={WHERE}; WHEN={WHEN}; HOW={HOW}
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
"@

$MicroHeader = 'LEEWAY MICRO: REGION={REGION} SIG=00000000 OWNER=RapidWebDevelop WHEN={WHEN}'

function Get-CommentBlock {
  param([string]$Ext,[string]$Body)
  switch ($Ext) {
    '.html' { return "<!--`n$Body`n-->" }
    '.css'  { return "/*`n$Body`n*/" }
    default { return "/*`n$Body`n*/" }
  }
}

$files = Get-ChildItem -LiteralPath $Root -Recurse -File | Where-Object { $IncludeExt -contains $_.Extension }

$now = (Get-Date).ToString("yyyy-MM-dd")
$report = @()

foreach($f in $files){
  $content = Get-Content -LiteralPath $f.FullName -Raw
  $hasHeader = $content -match 'LEEWAY HEADER — DO NOT REMOVE' -or $content -match 'LEEWAY MICRO:'
  $region = 'UI.UNKNOWN'
  $what = "Module: $($f.Name)"
  $why = 'standardize'
  $how = 'React/Tailwind'
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

$reportPath = Join-Path $Root 'run\leeway_frontend_header_report.json'
$report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportPath
Write-Host "Done. Report: $reportPath"