import subprocess
import os
import sys
import ctypes

def main():
    # Helper to get the absolute path to the resource
    if getattr(sys, 'frozen', False):
        base_path = os.path.dirname(sys.executable)
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    # Target executable in 'bin' subdirectory
    # We will rename the inner executable to avoiding naming conflict in ZIP if extracted flatly?
    # No, 'bin/Batch Image Editor.exe' is fine.
    target = os.path.join(base_path, 'bin', 'Batch Image Editor.exe')
    
    if not os.path.exists(target):
        # Try 'app' folder just in case
        target_alt = os.path.join(base_path, 'app', 'Batch Image Editor.exe')
        if os.path.exists(target_alt):
            target = target_alt
        else:
            ctypes.windll.user32.MessageBoxW(0, f"Error: Could not find application at {target}", "Launch Error", 16)
            sys.exit(1)
        
    # Launch without console window
    # cwd should be the bin folder so Electron finds its resources
    subprocess.Popen([target], cwd=os.path.dirname(target))

if __name__ == '__main__':
    main()
