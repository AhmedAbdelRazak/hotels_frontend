/** @format */

export const GUEST_CARD_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GUEST_CARD_WIDTH = 1200;
export const GUEST_CARD_HEIGHT = 820;
export const GUEST_CARD_CAPTURE_SCALE = 2;

export const normalizeGuestCardEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const isValidGuestCardEmail = (value) => {
  const email = normalizeGuestCardEmail(value);
  return (
    email.length > 0 &&
    email.length <= 254 &&
    !/[\r\n,;]/.test(email) &&
    GUEST_CARD_EMAIL_PATTERN.test(email)
  );
};

const guestCardFilenameStem = (confirmationNumber) => {
  const safe = String(confirmationNumber || "")
    .normalize("NFKC")
    .trim()
    .slice(0, 70)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `Jannat_Guest_Card_${safe || "reservation"}`;
};

export const guestCardPdfFilename = (confirmationNumber) =>
  `${guestCardFilenameStem(confirmationNumber)}.pdf`;

export const guestCardPngFilename = (confirmationNumber) =>
  `${guestCardFilenameStem(confirmationNumber)}.png`;

export const calculateGuestCardPreviewScale = (
  availableWidth,
  availableHeight,
) => {
  const width = Number(availableWidth);
  const height = Number(availableHeight);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    return 0;
  return Math.min(1, width / GUEST_CARD_WIDTH, height / GUEST_CARD_HEIGHT);
};

const boundedWait = (value, timeoutMs, message) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([Promise.resolve(value), timeout]).finally(() =>
    clearTimeout(timeoutId),
  );
};

const waitForImages = async (element) => {
  const images = Array.from(element?.querySelectorAll?.("img") || []);
  await Promise.all(
    images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      if (typeof image.decode === "function") {
        try {
          await boundedWait(
            image.decode(),
            3_000,
            "Guest Card image loading timed out.",
          );
          return;
        } catch (_error) {
          // The load/error listeners below provide the final bounded fallback.
        }
      }
      await new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          image.removeEventListener?.("load", done);
          image.removeEventListener?.("error", done);
          resolve();
        };
        const timeoutId = setTimeout(done, 3_000);
        image.addEventListener?.("load", done, { once: true });
        image.addEventListener?.("error", done, { once: true });
      });
    }),
  );
};

export const waitForGuestCardAssets = async (element) => {
  if (!element) throw new Error("Guest Card preview is not available.");
  const ownerDocument =
    element.ownerDocument ||
    (typeof document !== "undefined" ? document : undefined);
  if (ownerDocument?.fonts?.ready) {
    await boundedWait(
      ownerDocument.fonts.ready,
      3_000,
      "Guest Card font loading timed out. Please try again.",
    );
  }
  await waitForImages(element);
};

export const prepareGuestCardCaptureClone = (clonedDocument, clonedElement) => {
  if (!clonedElement) return;
  const body = clonedDocument?.body;
  if (body && clonedElement.parentNode !== body)
    body.appendChild(clonedElement);
  if (body?.style) {
    body.style.height = `${GUEST_CARD_HEIGHT}px`;
    body.style.margin = "0";
    body.style.overflow = "hidden";
    body.style.width = `${GUEST_CARD_WIDTH}px`;
  }
  Object.assign(clonedElement.style, {
    boxShadow: "none",
    direction: "ltr",
    height: `${GUEST_CARD_HEIGHT}px`,
    left: "0",
    margin: "0",
    maxHeight: "none",
    maxWidth: "none",
    minHeight: "0",
    minWidth: "0",
    position: "absolute",
    top: "0",
    transform: "none",
    visibility: "visible",
    width: `${GUEST_CARD_WIDTH}px`,
  });
};

export const captureGuestCardCanvas = async ({ element, html2canvasImpl }) => {
  if (!element) throw new Error("Guest Card preview is not available.");
  if (typeof html2canvasImpl !== "function")
    throw new Error("Guest Card capture tools are unavailable.");
  await waitForGuestCardAssets(element);
  const canvas = await boundedWait(
    html2canvasImpl(element, {
      backgroundColor: "#ffffff",
      scale: GUEST_CARD_CAPTURE_SCALE,
      useCORS: true,
      logging: false,
      width: GUEST_CARD_WIDTH,
      height: GUEST_CARD_HEIGHT,
      windowWidth: GUEST_CARD_WIDTH,
      windowHeight: GUEST_CARD_HEIGHT,
      scrollX: 0,
      scrollY: 0,
      onclone: prepareGuestCardCaptureClone,
    }),
    30_000,
    "Guest Card image generation timed out. Please try again.",
  );
  if (!canvas?.width || !canvas?.height) {
    throw new Error("Guest Card preview could not be captured.");
  }
  return canvas;
};

export const downloadGuestCardPdf = async ({
  element,
  confirmationNumber,
  html2canvasImpl,
  jsPDFImpl,
}) => {
  if (typeof jsPDFImpl !== "function")
    throw new Error("Guest Card PDF tools are unavailable.");
  const canvas = await captureGuestCardCanvas({ element, html2canvasImpl });
  if (typeof canvas.toDataURL !== "function")
    throw new Error("Guest Card PDF image could not be prepared.");
  const pdf = new jsPDFImpl({
    orientation: "landscape",
    unit: "px",
    format: [GUEST_CARD_WIDTH, GUEST_CARD_HEIGHT],
    hotfixes: ["px_scaling"],
    compress: true,
  });
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    0,
    0,
    GUEST_CARD_WIDTH,
    GUEST_CARD_HEIGHT,
    undefined,
    "FAST",
  );
  const filename = guestCardPdfFilename(confirmationNumber);
  pdf.save(filename);
  return filename;
};

const canvasToPngBlob = (canvas) => {
  if (typeof canvas?.toBlob !== "function")
    throw new Error("Guest Card PNG tools are unavailable.");
  return boundedWait(
    new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob?.size) resolve(blob);
        else reject(new Error("Guest Card PNG could not be prepared."));
      }, "image/png");
    }),
    10_000,
    "Guest Card PNG generation timed out. Please try again.",
  );
};

export const downloadGuestCardPng = async ({
  element,
  confirmationNumber,
  html2canvasImpl,
  documentImpl,
  urlImpl,
}) => {
  const targetDocument =
    documentImpl ||
    element?.ownerDocument ||
    (typeof document !== "undefined" ? document : undefined);
  const targetUrl =
    urlImpl ||
    targetDocument?.defaultView?.URL ||
    (typeof URL !== "undefined" ? URL : undefined);
  if (
    !targetDocument?.body?.appendChild ||
    typeof targetDocument.createElement !== "function" ||
    typeof targetUrl?.createObjectURL !== "function" ||
    typeof targetUrl?.revokeObjectURL !== "function"
  ) {
    throw new Error("Guest Card PNG download tools are unavailable.");
  }
  const canvas = await captureGuestCardCanvas({ element, html2canvasImpl });
  const blob = await canvasToPngBlob(canvas);
  const filename = guestCardPngFilename(confirmationNumber);
  const objectUrl = targetUrl.createObjectURL(blob);
  const anchor = targetDocument.createElement("a");
  try {
    anchor.download = filename;
    anchor.href = objectUrl;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    targetDocument.body.appendChild(anchor);
    anchor.click();
  } finally {
    if (typeof anchor.remove === "function") anchor.remove();
    else anchor.parentNode?.removeChild(anchor);
    targetUrl.revokeObjectURL(objectUrl);
  }
  return filename;
};
