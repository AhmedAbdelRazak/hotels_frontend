/** @format */

export const GUEST_CARD_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export const guestCardPdfFilename = (confirmationNumber) => {
  const safe = String(confirmationNumber || "")
    .normalize("NFKC")
    .trim()
    .slice(0, 70)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `Jannat_Guest_Card_${safe || "reservation"}.pdf`;
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
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await boundedWait(
      document.fonts.ready,
      3_000,
      "Guest Card font loading timed out. Please try again.",
    );
  }
  await waitForImages(element);
};

export const downloadGuestCardPdf = async ({
  element,
  confirmationNumber,
  html2canvasImpl,
  jsPDFImpl,
}) => {
  if (!element) throw new Error("Guest Card preview is not available.");
  if (
    typeof html2canvasImpl !== "function" ||
    typeof jsPDFImpl !== "function"
  ) {
    throw new Error("Guest Card PDF tools are unavailable.");
  }
  await waitForGuestCardAssets(element);
  const width = Math.max(element.scrollWidth || element.offsetWidth || 0, 1);
  const height = Math.max(element.scrollHeight || element.offsetHeight || 0, 1);
  const canvas = await boundedWait(
    html2canvasImpl(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      width,
      height,
    }),
    30_000,
    "Guest Card PDF generation timed out. Please try again.",
  );
  if (
    !canvas?.width ||
    !canvas?.height ||
    typeof canvas.toDataURL !== "function"
  ) {
    throw new Error("Guest Card preview could not be captured.");
  }
  const pdf = new jsPDFImpl({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
    compress: true,
  });
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    0,
    0,
    width,
    height,
    undefined,
    "FAST",
  );
  const filename = guestCardPdfFilename(confirmationNumber);
  pdf.save(filename);
  return filename;
};
