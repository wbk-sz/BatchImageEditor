import os
import subprocess
import sys

source = r"C:\Users\sazu_\Documents\画像一括編集"
dest = r"C:\Users\sazu_\Documents\画像一括編集\batch-image-editor-pub"

# Exclude list
exclude_dirs = [
    ".git", ".venv", "node_modules", "dist", "dist-electron", 
    "dist-final", "release", "batch-image-editor-pub", 
    "build", "test_output", "__pycache__",
    "python_embed", "backend_dist", "backend_build",
    "dist_old_*", "build_old_*", "dist_test*", "build_test*"
]

exclude_files = [
    "*.log", "*.zip", "*.7z", "*.exe", "*.spec", "*.pyc", "*.idb", "*.pdb", "build_log.txt"
]

cmd = [
    "robocopy",
    source,
    dest,
    "/MIR",
    "/XD", *exclude_dirs,
    "/XF", *exclude_files,
    "/R:0", "/W:0", "/NJH", "/NJS"
]

print(f"Syncing from {source} to {dest}...")
# encoding='utf-8' might be needed for printing, but subprocess handles args as native strings (which are unicode in Python 3 on Windows)
try:
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Robocopy exit codes:
    # < 8 is success
    if result.returncode < 8:
        print("Sync completed successfully.")
        print(result.stdout)
        sys.exit(0)
    else:
        print(f"Robocopy failed with exit code {result.returncode}")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)

except Exception as e:
    print(f"Error executing robocopy: {e}")
    sys.exit(1)
