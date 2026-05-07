# Builds app-debug.apk using Gradle. Capacitor 7 needs JDK 21; this prefers Android Studio's JBR.
$ErrorActionPreference = "Stop"

$candidates = @(
  "$env:ProgramFiles\Android\Android Studio\jbr",
  "$env:LocalAppData\Programs\Android\Android Studio\jbr",
  "${env:ProgramFiles(x86)}\Android\Android Studio\jbr"
)

$jbr = $candidates | Where-Object { Test-Path "$_\bin\java.exe" } | Select-Object -First 1
if ($jbr) {
  $env:JAVA_HOME = $jbr
  Write-Host "Using JAVA_HOME=$env:JAVA_HOME"
} else {
  Write-Host "No Android Studio JBR found; using existing JAVA_HOME or PATH java."
}

$androidDir = (Resolve-Path (Join-Path (Join-Path $PSScriptRoot "..") "android")).Path
Push-Location $androidDir
try {
  & .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

$apk = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apk) {
  Write-Host ""
  Write-Host "APK ready:"
  Write-Host $apk
}
