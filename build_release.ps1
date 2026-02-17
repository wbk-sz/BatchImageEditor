$ErrorActionPreference = "Stop"

Write-Host "Starting Build Process..."

# 1. Clean previous build
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
if (Test-Path "release") { Remove-Item "release" -Recurse -Force }

# 2. Run npm dist (Builds backend and electron)
Write-Host "Running npm run dist..."
cmd /c "npm run dist"
if ($LASTEXITCODE -ne 0) { throw "npm run dist failed" }

# 3. Restructure Output
Write-Host "Restructuring output..."
$releaseDir = "release"
$unpackedDir = Join-Path $releaseDir "win-unpacked"
if (-not (Test-Path $unpackedDir)) {
    $unpackedDir = Join-Path $releaseDir "win-arm64-unpacked"
}
if (-not (Test-Path $unpackedDir)) {
    throw "Could not find unpacked directory. Checked win-unpacked and win-arm64-unpacked."
}
$finalDir = Join-Path $releaseDir "BatchImageEditor"
$binDir = Join-Path $finalDir "bin"

# Create directories
New-Item -ItemType Directory -Path $finalDir -Force | Out-Null
New-Item -ItemType Directory -Path $binDir -Force | Out-Null

# Move content
Get-ChildItem $unpackedDir | Move-Item -Destination $binDir

# 4. Compile Launcher
Write-Host "Compiling Launcher..."
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
    throw "csc.exe not found at $cscPath"
}

$launcherSrc = "launcher.cs"
$launcherExe = Join-Path $finalDir "Batch Image Editor.exe"

# Compile as Winexe (no console window)
& $cscPath /target:winexe /out:"$launcherExe" $launcherSrc

if (-not (Test-Path $launcherExe)) { throw "Launcher compilation failed" }

# 5. Create ZIP
Write-Host "Creating ZIP..."
$zipFile = Join-Path $releaseDir "Batch Image Editor-Portable.zip"
Compress-Archive -Path $finalDir -DestinationPath $zipFile -Force

Write-Host "Build Complete! Output: $zipFile"
