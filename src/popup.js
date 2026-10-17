
document.addEventListener("DOMContentLoaded", () => {
  const captureButton = document.getElementById("captureVisible");
  const selectButton = document.getElementById("selectArea");

  captureButton.addEventListener("click", async () => {
    captureButton.disabled = true;
    captureButton.textContent = "Capturing...";

    try {
      const imageData = await chrome.tabs.captureVisibleTab(
        null,
        { format: "png" }
      );

      await chrome.storage.session.set({
        capturedImage: imageData
      });

      await chrome.tabs.create({
        url: chrome.runtime.getURL("editor.html")
      });

      window.close();
    } catch (error) {
      captureButton.disabled = false;
      captureButton.textContent = "Capture visible tab";

      alert("Could not capture this tab. Try a regular website.");
      console.error("SnapText capture error:", error);
    }
  });

  selectButton.addEventListener("click", async () => {
    selectButton.disabled = true;
    selectButton.textContent = "Preparing selection...";

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tab?.id) {
        throw new Error("No active browser tab found.");
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["src/selection.js"]
      });

      window.close();
    } catch (error) {
      selectButton.disabled = false;
      selectButton.textContent = "Select an area";

      alert(
        "SnapText cannot select an area on this page. " +
        "Try a regular website instead."
      );

      console.error("SnapText selection error:", error);
    }
  });
});

