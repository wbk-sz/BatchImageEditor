$source = "C:\Users\sazu_\Documents\画像一括編集"
$dest = "C:\Users\sazu_\Documents\画像一括編集\batch-image-editor-pub"

Write-Host "Syncing from $source to $dest..."

robocopy "$source" "$dest" /MIR `
    /XD .git .venv node_modules dist dist-electron dist-final release batch-image-editor-pub build test_output backend\__pycache__ `
    /XF *.log *.zip *.7z *.exe *.spec *.pyc *.idb *.pdb

# Robocopy exit codes:
# < 8 is success
if ($LASTEXITCODE -ge 8) {
    Write-Error "Robocopy failed with exit code $LASTEXITCODE"
    exit 1
}
else {
    Write-Host "Sync completed successfully."
    exit 0
}
