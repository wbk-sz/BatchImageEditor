# Build Script for Batch Image Editor (Custom ZIP Structure)

$ErrorActionPreference = "Stop"

Write-Host "1. Building Electron App..."
cmd /c npm run electron:build -- --x64 --dir
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

$releaseDir = "release/win-unpacked"
$distDir = "dist-final"
$appName = "BatchImageEditor"
$targetDir = "$distDir/$appName"
$binDir = "$targetDir/bin"

# Clean previous dist
if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
New-Item -ItemType Directory -Path $binDir -Force

Write-Host "2. Reorganizing files..."
# Move everything from release to bin
Get-ChildItem -Path $releaseDir | Copy-Item -Destination $binDir -Recurse

# Create Launcher Batch File
$launcherPath = "$targetDir/Batch Image Editor.bat"
$batContent = '@echo off
start "" "bin\Batch Image Editor.exe"'
Set-Content -Path $launcherPath -Value $batContent

# Copy documentation files
Copy-Item "LICENSE" -Destination $targetDir
Copy-Item "README.md" -Destination $targetDir
if (Test-Path "THIRDPARTYNOTICES.txt") {
    Copy-Item "THIRDPARTYNOTICES.txt" -Destination $targetDir
}

Write-Host "3. Creating ZIP..."
$zipPath = "release/${appName}_Portable.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Compress-Archive -Path "$targetDir/*" -DestinationPath $zipPath

Write-Host "Success! ZIP created at $zipPath"
