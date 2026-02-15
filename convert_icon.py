from PIL import Image
import os

def convert_to_ico(source, target):
    try:
        img = Image.open(source)
        img.save(target, format='ICO', sizes=[(256, 256)])
        print(f"Successfully converted {source} to {target}")
    except Exception as e:
        print(f"Error converting {source} to {target}: {e}")

if __name__ == "__main__":
    source_path = os.path.join("resources", "BatchImageEditor_icon.jpeg")
    target_path = os.path.join("resources", "BatchImageEditor_icon.ico")
    
    if os.path.exists(source_path):
        convert_to_ico(source_path, target_path)
    else:
        print(f"Source file not found: {source_path}")
