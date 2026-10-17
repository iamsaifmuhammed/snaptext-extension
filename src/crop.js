
async function prepareCroppedImage() {
  const status = document.getElementById("status");

  try {
    const stored = await chrome.storage.session.get([
      "capturedImage",
      "pendingCrop"
    ]);

    const { capturedImage, pendingCrop } = stored;

    if (!capturedImage || !pendingCrop) {
      throw new Error("The screenshot or selection coordinates are missing.");
    }

    const image = new Image();

    image.src = capturedImage;

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Could not load screenshot."));
    });

    const { x, y, width, height, viewport } = pendingCrop;

    const scaleX = image.naturalWidth / viewport.width;
    const scaleY = image.naturalHeight / viewport.height;

    const cropX = Math.round(x * scaleX);
    const cropY = Math.round(y * scaleY);
    const cropWidth = Math.round(width * scaleX);
    const cropHeight = Math.round(height * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = Math.min(cropWidth, image.naturalWidth - cropX);
    canvas.height = Math.min(cropHeight, image.naturalHeight - cropY);

    if (canvas.width <= 0 || canvas.height <= 0) {
      throw new Error("The selected area is outside the screenshot.");
    }

    const context = canvas.getContext("2d");

    context.drawImage(
      image,
      cropX,
      cropY,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedImage = canvas.toDataURL("image/png");

    await chrome.storage.session.set({
      capturedImage: croppedImage
    });

    await chrome.storage.session.remove("pendingCrop");

    status.textContent = "Opening editorâ€¦";
    window.location.replace(chrome.runtime.getURL("editor.html"));
  } catch (error) {
    console.error("SnapText cropping error:", error);
    status.textContent = `Could not crop image: ${error.message}`;
  }
}

prepareCroppedImage();

