import os
import tempfile
temp_dir = tempfile.gettempdir()
with open(os.path.join(temp_dir, "test_success.txt"), "w") as f:
    f.write("Test App Success!")
