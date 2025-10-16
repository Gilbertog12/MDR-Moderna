param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('test','prod')]
    [string]$Ambiente
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  MDR - Generador de Paquete de Despliegue" -ForegroundColor Cyan
Write-Host "  Matriz de Riesgos - Collahuasi" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuración por ambiente
$config = @{
    test = @{
        baseHref = "/matriz/"
        rutaDeploy = "Ruta de test (consultar con infraestructura)"
        url = "URL de test (consultar con infraestructura)"
    }
    prod = @{
        baseHref = "/matriz/"
        rutaDeploy = "F:\DATA\IISAPP\Summa\Risk\Matriz\"
        url = "https://mdr.collahuasi.cl/matriz/"
    }
}

$cfg = $config[$Ambiente]

Write-Host "Configuracion del ambiente:" -ForegroundColor Yellow
Write-Host "  Ambiente:    $Ambiente" -ForegroundColor Cyan
Write-Host "  Base Href:   $($cfg.baseHref)" -ForegroundColor Cyan
Write-Host "  Ruta Deploy: $($cfg.rutaDeploy)" -ForegroundColor Cyan
Write-Host "  URL Final:   $($cfg.url)" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la raíz del proyecto
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: No se encuentra package.json" -ForegroundColor Red
    Write-Host "Ejecuta este script desde la raiz del proyecto" -ForegroundColor Yellow
    exit 1
}

# 1. Limpiar build anterior
Write-Host "Limpiando builds anteriores..." -ForegroundColor Yellow
Remove-Item "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item ".angular" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "OK - Cache limpiado" -ForegroundColor Green

# 2. Build
Write-Host ""
Write-Host "Compilando aplicacion..." -ForegroundColor Yellow
Write-Host "  ng build --configuration production --base-href=`"$($cfg.baseHref)`"" -ForegroundColor Gray

ng build --configuration production --base-href="$($cfg.baseHref)"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en la compilacion" -ForegroundColor Red
    exit 1
}
Write-Host "OK - Compilacion exitosa" -ForegroundColor Green

# 3. Verificar archivos críticos en el build
Write-Host ""
Write-Host "Verificando archivos criticos..." -ForegroundColor Yellow
$archivosCriticos = @(
    "dist\mdr\browser\index.html",
    "dist\mdr\browser\assets\images\logo_collahuasi.png",
    "dist\mdr\browser\assets\images\mining-background.png"
)

$todosOk = $true
foreach ($archivo in $archivosCriticos) {
    if (Test-Path $archivo) {
        Write-Host "  OK - $($archivo.Split('\')[-1])" -ForegroundColor Green
    } else {
        Write-Host "  FALTA - $archivo" -ForegroundColor Red
        $todosOk = $false
    }
}

if (-not $todosOk) {
    Write-Host "ERROR: Faltan archivos criticos" -ForegroundColor Red
    exit 1
}

# 4. Copiar web.config
Write-Host ""
Write-Host "Agregando web.config..." -ForegroundColor Yellow
if (-not (Test-Path "web.config")) {
    Write-Host "ERROR: No se encuentra web.config" -ForegroundColor Red
    exit 1
}
Copy-Item web.config dist\mdr\browser\ -Force
Write-Host "OK - web.config agregado" -ForegroundColor Green

# 5. Crear ZIP
Write-Host ""
$fecha = Get-Date -Format "yyyyMMdd-HHmm"
$nombreZip = "MDR-$Ambiente-$fecha.zip"

Write-Host "Creando paquete: $nombreZip..." -ForegroundColor Yellow
if (Test-Path $nombreZip) {
    Remove-Item $nombreZip -Force
}

Compress-Archive -Path "dist\mdr\browser\*" -DestinationPath $nombreZip -CompressionLevel Optimal

$tamanoMB = [math]::Round((Get-Item $nombreZip).Length / 1MB, 2)
$archivosCount = (Get-ChildItem -Path "dist\mdr\browser" -Recurse -File).Count

Write-Host "OK - Paquete creado" -ForegroundColor Green
Write-Host "  Tamaño: $tamanoMB MB" -ForegroundColor Cyan
Write-Host "  Archivos: $archivosCount" -ForegroundColor Cyan

# 6. Verificar contenido del ZIP
Write-Host ""
Write-Host "Verificando contenido del paquete..." -ForegroundColor Yellow
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $nombreZip))
$tieneIndex = $zip.Entries | Where-Object { $_.Name -eq "index.html" }
$tieneWebConfig = $zip.Entries | Where-Object { $_.Name -eq "web.config" }
$zip.Dispose()

if ($tieneIndex -and $tieneWebConfig) {
    Write-Host "OK - Paquete verificado correctamente" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: El paquete puede estar incompleto" -ForegroundColor Yellow
}

# 7. Crear instrucciones de despliegue
Write-Host ""
Write-Host "Generando instrucciones..." -ForegroundColor Yellow

$instrucciones = @"
╔═══════════════════════════════════════════════════════════════╗
║     INSTRUCCIONES DE DESPLIEGUE - MDR (Matriz de Riesgos)   ║
╚═══════════════════════════════════════════════════════════════╝

INFORMACIÓN DEL PAQUETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Ambiente:          $Ambiente
  Fecha:             $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
  Archivo:           $nombreZip
  Tamaño:            $tamanoMB MB
  Base Href:         $($cfg.baseHref)
  URL Final:         $($cfg.url)

RUTA DE DESPLIEGUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  $($cfg.rutaDeploy)

PASOS DE DESPLIEGUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. BACKUP (CRÍTICO)
   Crear respaldo de la versión actual:

   `$fecha = Get-Date -Format "yyyyMMdd_HHmmss"
   `$origen = "$($cfg.rutaDeploy)"
   `$destino = "$($cfg.rutaDeploy.TrimEnd('\'))-Backup-`$fecha"
   Copy-Item -Path `$origen -Destination `$destino -Recurse
   Write-Host "Backup creado: `$destino" -ForegroundColor Green

2. DETENER SITIO IIS
   • Abrir IIS Manager
   • Buscar el sitio "matriz" o el correspondiente
   • Click derecho → Stop
   • Verificar estado: Stopped

3. LIMPIAR CARPETA
   Eliminar TODOS los archivos de la carpeta de despliegue:

   Remove-Item -Path "$($cfg.rutaDeploy)*" -Recurse -Force

4. DESCOMPRIMIR PAQUETE
   • Ubicar archivo: $nombreZip
   • Extraer TODO el contenido
   • Copiar a: $($cfg.rutaDeploy)

   IMPORTANTE: Los archivos deben quedar DIRECTAMENTE en la carpeta,
   NO en una subcarpeta.

5. VERIFICAR ARCHIVOS
   Ejecutar en PowerShell:

   `$archivos = @(
       "$($cfg.rutaDeploy)index.html",
       "$($cfg.rutaDeploy)web.config",
       "$($cfg.rutaDeploy)assets\images\logo_collahuasi.png"
   )
   foreach (`$a in `$archivos) {
       if (Test-Path `$a) {
           Write-Host "OK - `$a" -ForegroundColor Green
       } else {
           Write-Host "FALTA - `$a" -ForegroundColor Red
       }
   }

6. VERIFICAR PERMISOS
   El usuario de IIS debe tener permisos de lectura:

   • Usuario: IIS AppPool\DefaultAppPool (o el que corresponda)
   • Permisos: Lectura y Ejecución

7. INICIAR SITIO IIS
   • IIS Manager → Sitio
   • Click derecho → Start
   • Verificar estado: Started

8. REINICIAR IIS (Opcional pero recomendado)

   iisreset

VERIFICACIÓN POST-DESPLIEGUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Abrir navegador en: $($cfg.url)

2. Verificar que carga la pantalla de login (con hash):
   $($cfg.url)#/login

3. Presionar F12 → Console
   • Buscar: "✅ Configuration loaded"
   • NO debe haber errores en rojo

4. Presionar F12 → Network
   • NO debe haber errores 404 en archivos JS/CSS
   • Las imágenes deben cargar correctamente

5. Probar login con credenciales de prueba

NOTAS TÉCNICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• La aplicación usa routing con HASH (#/login)
• Las URLs del backend son relativas (/MatrizRsk/...)
• NO requiere configuración adicional de URLs
• El base href está configurado en: $($cfg.baseHref)

ROLLBACK (En caso de problemas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Detener sitio IIS

2. Restaurar el backup más reciente:

   `$backups = Get-ChildItem "$($cfg.rutaDeploy.TrimEnd('\'))-Backup-*" |
                Sort-Object Name -Descending
   `$ultimoBackup = `$backups[0]

   Remove-Item -Path "$($cfg.rutaDeploy)*" -Recurse -Force
   Copy-Item -Path "`$ultimoBackup\*" -Destination "$($cfg.rutaDeploy)" -Recurse

   Write-Host "Rollback completado desde: `$ultimoBackup" -ForegroundColor Green

3. Iniciar sitio IIS

CONTACTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

En caso de problemas durante el despliegue:
• Verificar logs de IIS
• Verificar permisos de carpetas
• Verificar que el backend esté funcionando
• Contactar al equipo de desarrollo

════════════════════════════════════════════════════════════════

Generado: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
"@

$nombreInstrucciones = "INSTRUCCIONES-DESPLIEGUE-$Ambiente.txt"
$instrucciones | Out-File $nombreInstrucciones -Encoding UTF8
Write-Host "OK - Instrucciones generadas" -ForegroundColor Green

# 8. Resumen final
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ PAQUETE LISTO PARA DESPLIEGUE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Archivos generados:" -ForegroundColor Cyan
Write-Host "   • $nombreZip ($tamanoMB MB)" -ForegroundColor White
Write-Host "   • $nombreInstrucciones" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Ambiente:      $Ambiente" -ForegroundColor Cyan
Write-Host "📁 Deploy en:     $($cfg.rutaDeploy)" -ForegroundColor Cyan
Write-Host "🌐 URL final:     $($cfg.url)" -ForegroundColor Cyan
Write-Host "🔗 Base Href:     $($cfg.baseHref)" -ForegroundColor Cyan
Write-Host ""
Write-Host "📧 Próximo paso:" -ForegroundColor Yellow
Write-Host "   Enviar ambos archivos al equipo de infraestructura" -ForegroundColor White
Write-Host ""

# 9. Opción de abrir carpeta
$respuesta = Read-Host "¿Abrir carpeta con los archivos? (S/N)"
if ($respuesta -eq "S" -or $respuesta -eq "s") {
    explorer.exe .
}

Write-Host ""
Write-Host "Listo! ✨" -ForegroundColor Green
Write-Host ""
