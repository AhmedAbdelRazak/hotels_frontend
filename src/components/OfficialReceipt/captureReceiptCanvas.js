import html2canvas from "html2canvas";

const nextFrame = () =>
  new Promise((resolve) => window.requestAnimationFrame(resolve));

const cssBackgroundUrl = (backgroundImage) => {
  const match = String(backgroundImage || "").match(
    /^url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)$/i,
  );
  return (match?.[1] || match?.[2] || match?.[3] || "").trim();
};

const loadImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Receipt flag could not be loaded."));
    image.src = source;
  });

/**
 * html2canvas 1.4 can mispaint SVG background images as a tiny sliver. Convert
 * only the detached receipt flag backgrounds to PNG first; the live UI and the
 * generic flag-icons country mapping remain untouched.
 */
export const rasterizeReceiptFlags = async (captureNode) => {
  const flags = Array.from(
    captureNode?.querySelectorAll?.(".nationality-flag") || [],
  );

  await Promise.all(
    flags.map(async (flag) => {
      try {
        const source = cssBackgroundUrl(
          window.getComputedStyle(flag).backgroundImage,
        );
        if (!source) return;

        const image = await loadImage(source);
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || 200;
        canvas.height = image.naturalHeight || 150;
        const context = canvas.getContext("2d");
        if (!context) return;

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        flag.style.backgroundImage = `url("${canvas.toDataURL("image/png")}")`;
      } catch {
        // Preserve the original flag background if an unexpected asset fails.
      }
    }),
  );
};

/**
 * Captures a natural-width clone so screen-only modal scaling never lowers the
 * downloaded PDF resolution or changes its pagination.
 */
export const captureReceiptCanvas = async (receiptNode) => {
  if (!receiptNode) {
    throw new Error("Receipt is not available for PDF capture.");
  }

  const captureHost = document.createElement("div");
  const captureNode = receiptNode.cloneNode(true);
  captureHost.setAttribute("aria-hidden", "true");
  captureHost.dataset.receiptCaptureHost = "true";
  Object.assign(captureHost.style, {
    left: "-100000px",
    position: "fixed",
    top: "0",
    width: "1080px",
    zIndex: "-1",
  });
  Object.assign(captureNode.style, {
    boxShadow: "none",
    margin: "0",
    maxWidth: "none",
    transform: "none",
    width: "1080px",
    zoom: "1",
  });
  captureHost.appendChild(captureNode);
  document.body.appendChild(captureHost);

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await rasterizeReceiptFlags(captureNode);
    await nextFrame();
    return await html2canvas(captureNode, {
      backgroundColor: "#ffffff",
      scale: 1,
      useCORS: true,
    });
  } finally {
    captureHost.remove();
  }
};

export const downloadReceiptCanvasAsPng = (
  canvas,
  filename = "receipt.png",
) => {
  if (!canvas || typeof canvas.toDataURL !== "function") {
    throw new Error("Receipt image is not available for download.");
  }

  const downloadLink = document.createElement("a");
  downloadLink.href = canvas.toDataURL("image/png");
  downloadLink.download = filename;
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
};
