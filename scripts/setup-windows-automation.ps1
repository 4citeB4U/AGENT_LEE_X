# Optional: install modules commonly used by Windows UI automation or Start menu enumeration
# We keep it minimal; your Windows MCP server will do most heavy lifting.

Write-Host "Current execution policy:" -ForegroundColor Cyan
Get-ExecutionPolicy
Write-Host "If Restricted, run: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force" -ForegroundColor Yellow
