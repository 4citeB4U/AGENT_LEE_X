# Ensure ADB is on PATH (Android platform-tools)
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  Write-Host "ADB not found. Install Android platform-tools and add to PATH." -ForegroundColor Yellow
  exit 1
}
Write-Host "Starting ADB server..." -ForegroundColor Cyan
adb start-server
Write-Host "Connected devices:" -ForegroundColor Cyan
adb devices
Write-Host "If your device is unauthorized, accept the debug prompt on the phone." -ForegroundColor Yellow
