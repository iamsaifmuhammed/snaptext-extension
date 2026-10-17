async function clearLegacyTemporaryData() {
  try {
    await chrome.storage.local.remove([
      "capturedImage",
      "pendingCrop"
    ]);
  } catch (error) {
    console.error(
      "SnapText legacy storage cleanup failed:",
      error
    );
  }
}

chrome.runtime.onInstalled.addListener(clearLegacyTemporaryData);
chrome.runtime.onStartup.addListener(clearLegacyTemporaryData);




let creatingOffscreenDocument = null;

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");

  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  if (contexts.length > 0) {
    return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["WORKERS"],
      justification: "Run local OCR to extract text from screenshots."
    });
  }

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Existing area-selection workflow.
  if (message.type === "SNAPTEXT_SELECTION_COMPLETE") {
    (async () => {
      try {
        if (sender.tab?.windowId == null) {
          throw new Error("Could not identify the source browser window.");
        }

        const imageData = await chrome.tabs.captureVisibleTab(
          sender.tab.windowId,
          { format: "png" }
        );

        await chrome.storage.session.set({
          capturedImage: imageData,
          pendingCrop: {
            ...message.rect,
            viewport: message.viewport
          }
        });

        await chrome.tabs.create({
          url: chrome.runtime.getURL("crop.html")
        });

        sendResponse({ success: true });
      } catch (error) {
        console.error("SnapText area capture error:", error);

        sendResponse({
          success: false,
          error: error.message || "Area capture failed."
        });
      }
    })();

    return true;
  }

  // New OCR workflow.
  if (message.type === "SNAPTEXT_EXTRACT_TEXT") {
    (async () => {
      try {
        if (!message.imageData) {
          throw new Error("No screenshot is available for text extraction.");
        }

        await ensureOffscreenDocument();

        const result = await chrome.runtime.sendMessage({
          target: "snaptext-offscreen",
          type: "EXTRACT_TEXT",
          imageData: message.imageData,
          languages: message.languages || "eng"
        });

        if (!result) {
          throw new Error("The OCR worker returned no response.");
        }

        sendResponse(result);
      } catch (error) {
        console.error("SnapText OCR request error:", error);

        sendResponse({
          success: false,
          error: error.message || "Could not start text recognition."
        });
      }
    })();

    return true;
  }
});

