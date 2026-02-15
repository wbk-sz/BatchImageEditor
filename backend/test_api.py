import requests
import json
from PIL import Image
import os

# Setup
TEST_IMG = "test_image.png"
img = Image.new('RGB', (1000, 1000), color = 'red')
img.save(TEST_IMG)
abs_path = os.path.abspath(TEST_IMG)

url = "http://127.0.0.1:5000/process"
payload = {
    "images": [abs_path],
    "resize": [100, 100],
    "format": "JPEG"
}
headers = {'Content-Type': 'application/json'}

try:
    print(f"Sending request to {url} with payload: {payload}")
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 200:
        data = response.json()
        result = data['results'][0]
        if result['status'] == 'success':
            processed_path = result['processed']
            if os.path.exists(processed_path):
                with Image.open(processed_path) as p_img:
                    print(f"Processed image size: {p_img.size} (Expected: (100, 100))")
                    print(f"Processed image format: {p_img.format} (Expected: JPEG)")
                    if p_img.size == (100, 100) and p_img.format == 'JPEG':
                        print("TEST PASSED")
                    else:
                        print("TEST FAILED: Incorrect size or format")
            else:
                print("TEST FAILED: Processed file not found")
        else:
             print(f"TEST FAILED: Backend reported error: {result.get('error')}")
    else:
        print("TEST FAILED: Non-200 status code")

except Exception as e:
    print(f"TEST FAILED: Exception: {e}")

# Cleanup (optional, keeping for inspection)
# if os.path.exists(TEST_IMG): os.remove(TEST_IMG)
