# SnapText v1.0.0

SnapText is a lightweight, local-first browser extension for capturing screenshots and extracting text from images.

## Features

- Capture the visible browser tab.
- Select and crop a specific screen area.
- Extract text locally using Tesseract.js.
- Support English and Bengali OCR.
- Edit and copy extracted text.
- Copy or save screenshots.
- Capture again and continue the workflow.

## Installation

1. Download `SnapText-v1.0.0.zip` from the GitHub Release assets.
2. Extract the ZIP to a folder.
3. Open `brave://extensions` or `chrome://extensions`.
4. Enable Developer mode.
5. Select **Load unpacked** and choose the extracted extension folder.

Other Chromium-based browsers may support the same installation process.

## Privacy

OCR is designed to run locally in the browser. This release does not require a SnapText backend for its core capture and OCR workflow.

## Known issues

The bundled OCR engine may log warnings about unrecognized configuration parameters. English and Bengali OCR were tested successfully in the extracted release ZIP.

## Third-party licensing notice

SnapText includes Tesseract.js, Tesseract.js Core, compiled OCR assets, and English and Bengali language data.

The third-party licensing and language-model provenance review is not yet complete. The included notices document the current known information and limitations. Do not interpret this release as confirmation that every bundled asset's provenance and redistribution terms have been fully verified.

The review remains outstanding and should be completed before treating the distribution as fully license-verified.

## Feedback

Please report reproducible bugs and feature requests through the repository's GitHub Issues page.
