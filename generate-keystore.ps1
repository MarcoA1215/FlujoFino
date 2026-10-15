Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Generador de Keystore Oficial (FinoWork) " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$targetPath = "apps/frontend/android/app/release.keystore"

if (Test-Path $targetPath) {
    Write-Host "`n[AVISO] El archivo $targetPath ya existe. No se sobrescribirá para evitar invalidar firmas previas." -ForegroundColor Yellow
} else {
    $alias = if ($env:KEY_ALIAS) { $env:KEY_ALIAS } else { "finowork" }
    $password = $env:KEYSTORE_PASSWORD

    if (-not $password) {
        $secPass = Read-Host "`nIngresa la contraseña para la nueva Keystore" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass)
        $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }

    if (-not $password -or $password.Length -lt 6) {
        Write-Host "`n[ERROR] La contraseña debe tener al menos 6 caracteres." -ForegroundColor Red
        exit 1
    }

    Write-Host "`nGenerando release.keystore con clave RSA de 2048 bits..." -ForegroundColor Yellow
    keytool -genkey -v -keystore $targetPath -alias $alias -keyalg RSA -keysize 2048 -validity 10000 -storepass $password -keypass $password -dname "CN=FinoWork, OU=FinoWork, O=FinoWork, L=Caracas, ST=Miranda, C=VE"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n¡Keystore generado con éxito en $targetPath!" -ForegroundColor Green
        Write-Host "Alias: $alias" -ForegroundColor Green
        Write-Host "IMPORTANTE: Guarda tu contraseña en un gestor seguro y configura KEYSTORE_PASSWORD en tu entorno o en keystore.properties." -ForegroundColor Yellow
    } else {
        Write-Host "`nHubo un detalle al ejecutar keytool. Asegúrate de tener el JDK / Java instalado en tu PATH." -ForegroundColor Red
    }
}

