
(() => {
  // Prevent multiple selection overlays.
  const existing = document.getElementById("snaptext-selection-overlay");

  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement("div");
  overlay.id = "snaptext-selection-overlay";

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    cursor: "crosshair",
    background: "rgba(0, 15, 22, 0.28)",
    userSelect: "none",
    touchAction: "none"
  });

  const instruction = document.createElement("div");

  instruction.textContent =
    "SnapText — Drag to select an area · Esc to cancel";

  Object.assign(instruction.style, {
    position: "absolute",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 18px",
    borderRadius: "10px",
    background: "#000f16",
    color: "#e8fff7",
    border: "1px solid #42e8b4",
    font: "14px Arial, sans-serif",
    boxShadow: "0 4px 20px rgba(0,0,0,.3)",
    whiteSpace: "nowrap",
    pointerEvents: "none"
  });

  const selection = document.createElement("div");

  Object.assign(selection.style, {
    position: "absolute",
    display: "none",
    border: "2px solid #42e8b4",
    background: "rgba(66, 232, 180, 0.12)",
    boxSizing: "border-box",
    pointerEvents: "none"
  });

  overlay.append(instruction, selection);
  document.documentElement.appendChild(overlay);

  let startX = 0;
  let startY = 0;
  let dragging = false;

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  function removeOverlay() {
    overlay.remove();
    document.removeEventListener("keydown", onKeyDown, true);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      removeOverlay();
    }
  }

  function updateSelection(x, y) {
    const left = Math.min(startX, x);
    const top = Math.min(startY, y);
    const width = Math.abs(x - startX);
    const height = Math.abs(y - startY);

    Object.assign(selection.style, {
      display: "block",
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    });
  }

  overlay.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    startX = Math.max(0, Math.min(event.clientX, viewport.width));
    startY = Math.max(0, Math.min(event.clientY, viewport.height));
    dragging = true;

    overlay.setPointerCapture(event.pointerId);
    updateSelection(startX, startY);
  }, true);

  overlay.addEventListener("pointermove", (event) => {
    if (!dragging) return;

    event.preventDefault();
    event.stopPropagation();

    const x = Math.max(0, Math.min(event.clientX, viewport.width));
    const y = Math.max(0, Math.min(event.clientY, viewport.height));

    updateSelection(x, y);
  }, true);

  overlay.addEventListener("pointerup", async (event) => {
    if (!dragging) return;

    event.preventDefault();
    event.stopPropagation();
    dragging = false;

    const endX = Math.max(0, Math.min(event.clientX, viewport.width));
    const endY = Math.max(0, Math.min(event.clientY, viewport.height));

    const rect = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY)
    };

    removeOverlay();

    if (rect.width < 5 || rect.height < 5) return;

    try {
      await chrome.runtime.sendMessage({
        type: "SNAPTEXT_SELECTION_COMPLETE",
        rect,
        viewport
      });
    } catch (error) {
      console.error("SnapText could not process the selection:", error);
    }
  }, true);

  document.addEventListener("keydown", onKeyDown, true);
})();
