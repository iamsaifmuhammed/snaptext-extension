
document.addEventListener("DOMContentLoaded", async () => {
  const preview = document.getElementById("preview");
  const imageContainer = document.getElementById("imageContainer");
  const emptyState = document.getElementById("emptyState");
  const imageMeta = document.getElementById("imageMeta");
  const status = document.getElementById("status");

  const recaptureButton = document.getElementById("recapture");
  const copyScreenshotButton = document.getElementById("copyScreenshot");
  const saveScreenshotButton = document.getElementById("saveScreenshot");
  const cropScreenshotButton = document.getElementById("cropScreenshot");
  const extractTextButton = document.getElementById("extractText");
  const ocrLanguage = document.getElementById("ocrLanguage");

  const selectionLayer = document.getElementById("selectionLayer");
  const selectionBox = document.getElementById("selectionBox");
  const cropControls = document.getElementById("cropControls");
  const applyCropButton = document.getElementById("applyCrop");
  const cancelCropButton = document.getElementById("cancelCrop");
  const resetCropButton = document.getElementById("resetCrop");

  const extractedText = document.getElementById("extractedText");
  const copyTextButton = document.getElementById("copyText");
  const clearTextButton = document.getElementById("clearText");
  const textCount = document.getElementById("textCount");

  let originalImageData = null;
  let currentImageData = null;
  let selectionStart = null;
  let selectionEnd = null;
  let isSelecting = false;
  let cropMode = false;

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = "status";

    if (type) {
      status.classList.add(type);
    }
  }


let ocrInProgress = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "snaptext-editor-progress") {
    return;
  }

  if (message.type === "OCR_PROGRESS" && ocrInProgress) {
    const percent = Number(message.progress);

    if (message.status === "Complete") {
      setStatus("Finishing text extraction…");
    } else if (message.status === "Error") {
      setStatus("OCR encountered an error. See the error details below.", "error");
    } else if (Number.isFinite(percent) && percent > 0) {
      setStatus(`${message.status || "Processing OCR"}… ${percent}%`);
    } else {
      setStatus(`${message.status || "Processing OCR"}…`);
    }
  }
});


  function updateTextCount() {
    const count = extractedText.value.length;
    textCount.textContent = `${count} character${count === 1 ? "" : "s"}`;
  }

  function updateImageMeta() {
    if (!preview.naturalWidth || !preview.naturalHeight) {
      imageMeta.textContent = "No image loaded";
      return;
    }

    imageMeta.textContent =
      `${preview.naturalWidth} × ${preview.naturalHeight} px`;
  }

  function showImage(dataUrl) {
    currentImageData = dataUrl;
    preview.src = dataUrl;
    preview.hidden = false;
    imageContainer.hidden = false;
    emptyState.hidden = true;

    preview.onload = () => {
      updateImageMeta();
    };

    if (preview.complete && preview.naturalWidth) {
      updateImageMeta();
    }
  }

  async function loadScreenshot() {
    try {
      const result = await chrome.storage.session.get("capturedImage");

      if (!result.capturedImage) {
        imageContainer.hidden = true;
        emptyState.hidden = false;
        setStatus(
          "No screenshot found. Open SnapText on a regular website and capture a tab.",
          "error"
        );
        return;
      }

      originalImageData = result.capturedImage;
      showImage(originalImageData);
      setStatus("Screenshot loaded. Choose an action above.", "success");
    } catch (error) {
      console.error("SnapText load error:", error);
      setStatus("Could not load the screenshot.", "error");
    }
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);

    if (!mimeMatch) {
      throw new Error("Invalid image data.");
    }

    const mime = mimeMatch[1];
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
  }

  async function copyImageToClipboard(dataUrl) {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      throw new Error(
        "Image clipboard access is unavailable in this browser context."
      );
    }

    const blob = dataUrlToBlob(dataUrl);
    const pngBlob = blob.type === "image/png"
      ? blob
      : await convertBlobToPng(blob);

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngBlob })
    ]);
  }

  function convertBlobToPng(blob) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not create image canvas."));
          return;
        }

        context.drawImage(image, 0, 0);

        canvas.toBlob((pngBlob) => {
          URL.revokeObjectURL(objectUrl);

          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error("Could not convert image to PNG."));
          }
        }, "image/png");
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read image."));
      };

      image.src = URL.createObjectURL(blob);
    });
  }

  function downloadImage(dataUrl) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `snaptext-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function setCropMode(enabled) {
    cropMode = enabled;
    isSelecting = false;
    selectionStart = null;
    selectionEnd = null;

    selectionLayer.classList.toggle("enabled", enabled);
    cropControls.classList.toggle("visible", enabled);
    cropScreenshotButton.classList.toggle("active", enabled);

    selectionBox.style.display = "none";

    if (enabled) {
      setStatus(
        "Drag across the screenshot to select the area you want to keep."
      );
    } else {
      setStatus("Crop selection closed.");
    }
  }

  function getPointerPosition(event) {
    const rect = selectionLayer.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(event.clientY - rect.top, rect.height))
    };
  }

  function drawSelection() {
    if (!selectionStart || !selectionEnd) {
      selectionBox.style.display = "none";
      return;
    }

    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);

    selectionBox.style.display = "block";
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  }

  selectionLayer.addEventListener("pointerdown", (event) => {
    if (!cropMode || preview.hidden) {
      return;
    }

    event.preventDefault();
    selectionLayer.setPointerCapture(event.pointerId);

    selectionStart = getPointerPosition(event);
    selectionEnd = { ...selectionStart };
    isSelecting = true;
    drawSelection();
  });

  selectionLayer.addEventListener("pointermove", (event) => {
    if (!isSelecting) {
      return;
    }

    selectionEnd = getPointerPosition(event);
    drawSelection();
  });

  function finishSelection(event) {
    if (!isSelecting) {
      return;
    }

    if (event && selectionLayer.hasPointerCapture(event.pointerId)) {
      selectionLayer.releasePointerCapture(event.pointerId);
    }

    selectionEnd = event
      ? getPointerPosition(event)
      : selectionEnd;

    isSelecting = false;
    drawSelection();

    if (
      !selectionStart ||
      !selectionEnd ||
      Math.abs(selectionEnd.x - selectionStart.x) < 5 ||
      Math.abs(selectionEnd.y - selectionStart.y) < 5
    ) {
      setStatus("Selection is too small. Drag a larger rectangle.");
      return;
    }

    setStatus("Area selected. Click Apply crop to keep this region.");
  }

  selectionLayer.addEventListener("pointerup", finishSelection);
  selectionLayer.addEventListener("pointercancel", finishSelection);

  recaptureButton.addEventListener("click", () => {
    setStatus(
      "Close this editor tab, return to your website, and click SnapText in the toolbar to capture again."
    );
  });

  copyScreenshotButton.addEventListener("click", async () => {
    if (!currentImageData) {
      setStatus("There is no screenshot to copy.", "error");
      return;
    }

    copyScreenshotButton.disabled = true;

    try {
      await copyImageToClipboard(currentImageData);
      setStatus("Screenshot copied to your clipboard.", "success");
    } catch (error) {
      console.error("SnapText image copy error:", error);
      setStatus(
        `${error.message} Check clipboard permissions or try Save screenshot.`,
        "error"
      );
    } finally {
      copyScreenshotButton.disabled = false;
    }
  });

  saveScreenshotButton.addEventListener("click", () => {
    if (!currentImageData) {
      setStatus("There is no screenshot to save.", "error");
      return;
    }

    downloadImage(currentImageData);
    setStatus("Screenshot download requested.", "success");
  });

  cropScreenshotButton.addEventListener("click", () => {
    if (!currentImageData || preview.hidden) {
      setStatus("Capture a screenshot before cropping.", "error");
      return;
    }

    setCropMode(!cropMode);
  });

  applyCropButton.addEventListener("click", async () => {
    if (!selectionStart || !selectionEnd || !preview.naturalWidth) {
      setStatus("Select an area before applying the crop.", "error");
      return;
    }

    const displayRect = selectionLayer.getBoundingClientRect();

    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);

    if (width < 5 || height < 5 || !displayRect.width || !displayRect.height) {
      setStatus("Select a larger area and try again.", "error");
      return;
    }

    const scaleX = preview.naturalWidth / displayRect.width;
    const scaleY = preview.naturalHeight / displayRect.height;

    const sourceX = Math.round(left * scaleX);
    const sourceY = Math.round(top * scaleY);
    const sourceWidth = Math.round(width * scaleX);
    const sourceHeight = Math.round(height * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, sourceWidth);
    canvas.height = Math.max(1, sourceHeight);

    const context = canvas.getContext("2d");

    if (!context) {
      setStatus("Could not create a crop canvas.", "error");
      return;
    }

    try {
      context.drawImage(
        preview,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const croppedImage = canvas.toDataURL("image/png");

      showImage(croppedImage);
      setCropMode(false);

      await chrome.storage.session.set({
        capturedImage: croppedImage
      });

      setStatus("Crop applied. Copy, save, or extract text from this image.", "success");
    } catch (error) {
      console.error("SnapText crop error:", error);
      setStatus("Could not crop the screenshot. Please try again.", "error");
    }
  });

  cancelCropButton.addEventListener("click", () => {
    setCropMode(false);
  });

  resetCropButton.addEventListener("click", async () => {
    if (!originalImageData) {
      setStatus("The original screenshot is not available.", "error");
      return;
    }

    showImage(originalImageData);
    setCropMode(false);

    try {
      await chrome.storage.session.set({
        capturedImage: originalImageData
      });

      setStatus("Original screenshot restored.", "success");
    } catch (error) {
      console.error("SnapText reset error:", error);
      setStatus("Restored the preview, but couldn't update saved image data.", "error");
    }
  });



extractTextButton.addEventListener("click", async () => {
  if (ocrInProgress) return;

  if (!currentImageData) {
    setStatus("Capture a screenshot before extracting text.", "error");
    return;
  }

  const languages = ocrLanguage.value;

  ocrInProgress = true;
  extractTextButton.disabled = true;
  ocrLanguage.disabled = true;
  extractTextButton.textContent = "Processing…";

  setStatus(
    "Starting local OCR. The first run may take longer while language data loads."
  );

  try {
    const result = await chrome.runtime.sendMessage({
      type: "SNAPTEXT_EXTRACT_TEXT",
      imageData: currentImageData,
      languages
    });

    if (!result || !result.success) {
      throw new Error(result?.error || "Text recognition failed.");
    }

    const text = result.text || "";
    extractedText.value = text;
    updateTextCount();

    if (text.trim()) {
      extractedText.focus();
      setStatus(
        `Text extracted successfully (${result.languages || languages}). Review the result before copying.`,
        "success"
      );
    } else {
      setStatus(
        "OCR finished, but no readable text was found. Try a clearer image or a different language.",
        "error"
      );
    }
  } catch (error) {
    console.error("SnapText text extraction error:", error);

    setStatus(
      `Text extraction failed: ${error.message || "Unknown error"}. Try again; if it persists, check the extension errors.`,
      "error"
    );
  } finally {
    ocrInProgress = false;
    extractTextButton.disabled = false;
    ocrLanguage.disabled = false;
    extractTextButton.textContent = "Aa Extract text";
  }
});



  extractedText.addEventListener("input", updateTextCount);

  copyTextButton.addEventListener("click", async () => {
    const text = extractedText.value;

    if (!text.trim()) {
      setStatus("There is no text to copy yet.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus("Text copied to your clipboard.", "success");
    } catch (error) {
      console.error("SnapText text copy error:", error);

      extractedText.focus();
      extractedText.select();

      const copied = document.execCommand("copy");

      setStatus(
        copied
          ? "Text copied to your clipboard."
          : "Could not copy text. Select it and copy manually.",
        copied ? "success" : "error"
      );
    }
  });

  clearTextButton.addEventListener("click", () => {
    extractedText.value = "";
    updateTextCount();
    setStatus("Text panel cleared.");
  });

  await loadScreenshot();
  updateTextCount();
});
