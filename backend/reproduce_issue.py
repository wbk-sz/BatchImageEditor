import requests
import os
from PIL import Image

# Setup dummy images
img1_path = os.path.abspath("test_img_A.png")
img2_path = os.path.abspath("test_img_B.png")

# Create images if not exist
if not os.path.exists(img1_path):
    Image.new('RGB', (100, 100), color='red').save(img1_path)
if not os.path.exists(img2_path):
    Image.new('RGB', (100, 100), color='blue').save(img2_path)

output_dir = os.path.abspath("test_output")
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Payload with specific order: B then A
payload = {
    "images": [img2_path, img1_path],
    "output_dir": output_dir,
    "format": "PNG",
    "overwrite": True
}

try:
    print("Sending request...")
    response = requests.post("http://localhost:5001/process", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

    # Check results
    expected_1 = os.path.join(output_dir, "001_test_img_B.png")
    expected_2 = os.path.join(output_dir, "002_test_img_A.png")

    if os.path.exists(expected_1) and os.path.exists(expected_2):
        print("SUCCESS: Files created with correct prefixes in expected order.")
    else:
        print("FAILURE: Files NOT created as expected.")
        print(f"Expected: {expected_1}, {expected_2}")
        print("Actual files in output dir:")
        for f in os.listdir(output_dir):
            print(f" - {f}")

except Exception as e:
    print(f"Error: {e}")
