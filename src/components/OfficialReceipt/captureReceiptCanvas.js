import html2canvas from "html2canvas";

const nextFrame = () =>
  new Promise((resolve) => window.requestAnimationFrame(resolve));

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
