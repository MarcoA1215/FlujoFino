Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Generador de Keystore Oficial (FinoWork) " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$targetPath = "apps/frontend/android/app/release.keystore"

if (Test-Path $targetPath) {
    Write-Host "`n[AVISO] El archivo $targetPath ya existe. No se sobrescribirá para evitar invalidar firmas previas." -ForegroundColor Yellow
} else {
    Write-Host "`nGenerando release.keystore con clave RSA de 2048 bits..." -ForegroundColor Yellow
    keytool -genkey -v -keystore $targetPath -alias finowork -keyalg RSA -keysize 2048 -validity 10000 -storepass finowork2026 -keypass finowork2026 -dname "CN=FinoWork, OU=FinoWork, O=FinoWork, L=Caracas, ST=Miranda, C=VE"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n¡Keystore generado con éxito en $targetPath!" -ForegroundColor Green
        Write-Host "Contraseña por defecto: finowork2026" -ForegroundColor Green
        Write-Host "Alias: finowork" -ForegroundColor Green
    } else {
        Write-Host "`nHubo un detalle al ejecutar keytool. Asegúrate de tener el JDK / Java instalado en tu PATH." -ForegroundColor Red
    }
}
