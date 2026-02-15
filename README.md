
# Batch Image Editor

A powerful and user-friendly desktop application for bulk image editing and conversion. Built with Antigravity, Electron, React, and Python.

![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)

## Features

- **Batch Processing**: Convert multiple images at once.
- **Format Conversion**: Convert multiple images to PNG, JPG, or PDF.
- **Drag & Drop**: Easily select files via drag-and-drop and reorder the list.
- **PDF to Image**: Convert each page of a PDF into an image.
- **Resize**: Resize images by specifying a target width.
- **Aspect Ratio**: Change the aspect ratio based on the selected mode.
- **Crop Adjustment**: Adjust the crop position for each file in the preview when changing the aspect ratio.

## Installation

You can download the latest release from the [Releases](https://github.com/wbk-sz/BatchImageEditor/releases) page.

1. Download the `BatchImageEditor_Portable.zip` file.
2. Extract the ZIP archive.
3. Run `Batch Image Editor.exe`.

## Development

If you want to run the project locally or contribute, follow these steps:

### Prerequisites

- Node.js (v18 or later)
- Python (v3.10 or later)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/wbk-sz/BatchImageEditor.git
   cd BatchImageEditor
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

### Running Locally

To start the application in development mode (with hot reloading):

```bash
npm run dev
```

This command runs both the React frontend (Vite), Electron main process, and the Python backend concurrently.

## Building for Production

To build the application for distribution:

```bash
npm run build:zip
```

This will create a ZIP file in the `release` directory containing the standalone application.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. 
See the [LICENSE](LICENSE) file for details.

This project uses the following third-party libraries:
- **PyMuPDF**: Licensed under AGPL-3.0.
- **Pillow**: Licensed under HPND License.
- **img2pdf**: Licensed under LGPL-3.0.
- **python-pptx**: Licensed under MIT.
- **Flask**: Licensed under BSD-3-Clause.
- **Flask-CORS**: Licensed under MIT.
- **Electron**: Licensed under MIT.
- **React**: Licensed under MIT.

See [THIRDPARTYNOTICES.txt](THIRDPARTYNOTICES.txt) for full license details of third-party components.
