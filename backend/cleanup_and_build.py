import shutil
import os
import time
import datetime
import subprocess

timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")

def try_rename_or_remove(path):
    if os.path.exists(path):
        try:
            shutil.rmtree(path)
            print(f"Removed {path}")
        except Exception as e:
            print(f"Failed to remove {path}: {e}")
            new_path = f"{path}_old_{timestamp}"
            try:
                os.rename(path, new_path)
                print(f"Renamed {path} to {new_path}")
            except Exception as e2:
                print(f"Failed to rename {path}: {e2}")

print("Starting cleanup...")
try_rename_or_remove("build")
try_rename_or_remove("dist")

print("Cleanup finished. Starting PyInstaller...")
subprocess.run(["pyinstaller", "build_backend.spec", "--noconfirm"], check=True)
