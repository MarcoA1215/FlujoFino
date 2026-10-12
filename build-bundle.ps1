Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Compilando Bundle para Google Play (AAB)   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Compilar Frontend
Write-Host "`n1. Compilando Frontend de FinoWork..." -ForegroundColor Yellow
Set-Location "apps/frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al compilar el frontend" -ForegroundColor Red
    Set-Location "../.."
    Exit $LASTEXITCODE
}

# 2. Sincronizar Capacitor con Android
Write-Host "`n2. Sincronizando con Android nativo..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al sincronizar con Capacitor" -ForegroundColor Red
    Set-Location "../.."
    Exit $LASTEXITCODE
}

# 3. Compilar AAB
Write-Host "`n3. Generando Android App Bundle (.aab)..." -ForegroundColor Yellow
Set-Location "android"
.\gradlew.bat bundleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al compilar el bundle de Android" -ForegroundColor Red
    Set-Location "../../.."
    Exit $LASTEXITCODE
}

Set-Location "../../.."

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "   ¡Bundle generado con éxito para Google Play Store!    " -ForegroundColor Green
Write-Host "   Ubicación: apps/frontend/android/app/build/outputs/bundle/release/app-release.aab" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
