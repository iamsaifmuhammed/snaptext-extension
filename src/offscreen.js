
let workerPromise = null;
let activeWorker = null;
let activeLanguages = "eng";

function sendProgress(status, progress = 0) {
  chrome.runtime.sendMessage({
    target: "snaptext-editor-progress",
    type: "OCR_PROGRESS",
    status,
    progress: Math.round(progress * 100)
  }).catch(() => {
    // The editor may not be listening yet.
  });
}




async function preprocessImage(imageData) {
  const image = new Image();
  image.src = imageData;

  await image.decode();

  const originalWidth = image.naturalWidth;
  const originalHeight = image.naturalHeight;

  // Upscale by at most 1.5x and limit memory use.
  const scale = Math.min(
    1.5,
    2400 / Math.max(originalWidth, originalHeight)
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(originalWidth * scale));
  canvas.height = Math.max(1, Math.round(originalHeight * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare the screenshot for OCR.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  // Let the browser handle grayscale and contrast efficiently.
  context.filter = "grayscale(1) contrast(1.12)";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.filter = "none";

  return canvas;
}




async function getOCRWorker(languages) {
  if (!workerPromise) {
    activeLanguages = languages;

    workerPromise = Tesseract.createWorker(languages.split("+"), 1, {
      workerPath: chrome.runtime.getURL("ocr/worker.min.js"),
      corePath: chrome.runtime.getURL("ocr/core/"),
      langPath: chrome.runtime.getURL("ocr/lang"),
      workerBlobURL: false,
      logger: (message) => {
        sendProgress(message.status || "Preparing OCR", message.progress || 0);
      }
    }).then((worker) => {
      activeWorker = worker;
      return worker;
    }).catch((error) => {
      workerPromise = null;
      activeWorker = null;
      throw error;
    });
  }

  const worker = await workerPromise;

  if (activeLanguages !== languages) {
    sendProgress("Loading selected language", 0);

    await worker.reinitialize(languages.split("+"), 1);
    activeLanguages = languages;
  }

  return worker;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    message.target !== "snaptext-offscreen" ||
    message.type !== "EXTRACT_TEXT"
  ) {
    return;
  }

  (async () => {
    if (!message.imageData) {
      throw new Error("No screenshot image was provided.");
    }

    const allowedLanguages = ["eng", "ben", "eng+ben"];
    const languages = allowedLanguages.includes(message.languages)
      ? message.languages
      : "eng";

    sendProgress("Starting OCR", 0);

    const worker = await getOCRWorker(languages);

    sendProgress("Recognizing text", 0);

    await worker.setParameters({
  tessedit_pageseg_mode: "11"
});

const result = await worker.recognize(message.imageData);
    const text = (result.data.text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    sendProgress("Complete", 1);

    sendResponse({
      success: true,
      text,
      languages
    });
  })().catch((error) => {
    console.error("SnapText OCR error:", error);

    sendProgress("Error", 0);

    sendResponse({
      success: false,
      error: error.message || "Text recognition failed."
    });
  });

  return true;
});
