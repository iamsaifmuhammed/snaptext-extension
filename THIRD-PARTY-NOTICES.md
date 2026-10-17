# Third-Party Notices

SnapText includes third-party OCR software and language data. These
components remain subject to their respective licenses. The proprietary
SnapText notice does not override those licenses.

## Tesseract.js

- Package version: 5.1.1
- Declared license: Apache License 2.0
- Upstream: https://github.com/naptha/tesseract.js
- Bundled license text: `third-party-licenses/tesseract-js-LICENSE.md`

The installed development dependency metadata and its license file were
inspected. The exact correspondence between that package and every
bundled JavaScript file has not been independently verified.

## Tesseract.js Core

- Package version: 5.1.1
- Declared license: Apache License 2.0
- Upstream: https://github.com/naptha/tesseract.js-core
- Bundled license text: `third-party-licenses/tesseract-js-core-LICENSE`

The compiled core assets may contain additional third-party components
with separate attribution requirements. See the upstream licensing
discussion:
https://github.com/naptha/tesseract.js-core/issues/44

The complete notices applicable to the exact bundled core files have
not yet been verified.

## OCR Language Data

SnapText includes:

- `ocr/lang/eng.traineddata.gz` — English
- `ocr/lang/ben.traineddata.gz` — Bengali

Official Tesseract language-data repositories include:
https://github.com/tesseract-ocr/tessdata
https://github.com/tesseract-ocr/tessdata_fast
https://github.com/tesseract-ocr/tessdata_best

Tesseract documents these as distinct model sets:
https://github.com/tesseract-ocr/tessdoc/blob/main/Data-Files.md

The original source, model variant, and applicable license provenance
of the two files bundled with SnapText have not been established. Do not
assume that a repository link alone proves the origin of these files.

## Verification Status

This notice records the information currently verified; it is not a
claim that every bundled component has received a complete license
review.

Before public distribution, verify the origins and applicable notices
for the bundled JavaScript, WebAssembly, compiled OCR core, and language
data. Preserve required copyright, license, and attribution notices.

SnapText's proprietary terms apply only to material for which the
project owner can grant those terms. They do not remove rights or
obligations arising from third-party licenses.
