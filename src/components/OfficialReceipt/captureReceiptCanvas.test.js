import html2canvas from "html2canvas";
import {
  captureReceiptCanvas,
  downloadReceiptCanvasAsPng,
  rasterizeReceiptFlags,
} from "./captureReceiptCanvas";

jest.mock("html2canvas", () => jest.fn());

beforeAll(() => {
  window.requestAnimationFrame = (callback) => callback();
});

afterEach(() => {
  jest.clearAllMocks();
  document.querySelector('[data-receipt-capture-host="true"]')?.remove();
});

test("PDF capture uses a detached natural-width clone and cleans it up", async () => {
  const canvas = document.createElement("canvas");
  html2canvas.mockResolvedValue(canvas);
  const receipt = document.createElement("article");
  receipt.innerHTML = '<div class="stay-table">Receipt content</div>';
  document.body.appendChild(receipt);

  const result = await captureReceiptCanvas(receipt);
  const capturedNode = html2canvas.mock.calls[0][0];

  expect(result).toBe(canvas);
  expect(capturedNode).not.toBe(receipt);
  expect(capturedNode.style.width).toBe("1080px");
  expect(capturedNode.style.transform).toBe("none");
  expect(
    document.querySelector('[data-receipt-capture-host="true"]'),
  ).toBeNull();

  receipt.remove();
});

test("PNG download preserves the captured image and cleans up its link", () => {
  const click = jest
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  const canvas = document.createElement("canvas");
  canvas.toDataURL = jest.fn(() => "data:image/png;base64,receipt-image");

  downloadReceiptCanvasAsPng(canvas, "booking-receipt.png");

  expect(canvas.toDataURL).toHaveBeenCalledWith("image/png");
  expect(click).toHaveBeenCalledTimes(1);
  expect(
    document.querySelector('a[download="booking-receipt.png"]'),
  ).toBeNull();

  click.mockRestore();
});

test("receipt flags are rasterized before html2canvas captures the clone", async () => {
  const OriginalImage = global.Image;
  const drawImage = jest.fn();
  const getContext = jest
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({ drawImage });
  const toDataURL = jest
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue("data:image/png;base64,rasterized-flag");

  global.Image = class MockImage {
    naturalWidth = 640;
    naturalHeight = 480;

    set src(value) {
      this.currentSrc = value;
      Promise.resolve().then(() => this.onload());
    }
  };

  const receipt = document.createElement("article");
  receipt.innerHTML =
    '<span class="nationality-flag" style="background-image: url(&quot;/static/media/kw.svg&quot;)"></span>';
  document.body.appendChild(receipt);
  html2canvas.mockResolvedValue(document.createElement("canvas"));

  await captureReceiptCanvas(receipt);

  const capturedFlag =
    html2canvas.mock.calls[0][0].querySelector(".nationality-flag");
  expect(drawImage).toHaveBeenCalledTimes(1);
  expect(capturedFlag.style.backgroundImage).toContain(
    "data:image/png;base64,rasterized-flag",
  );

  receipt.remove();
  global.Image = OriginalImage;
  getContext.mockRestore();
  toDataURL.mockRestore();
});

test("a flag loading failure keeps the original background and still exports", async () => {
  const OriginalImage = global.Image;
  global.Image = class MockImage {
    set src(value) {
      this.currentSrc = value;
      Promise.resolve().then(() => this.onerror());
    }
  };

  const captureNode = document.createElement("article");
  captureNode.innerHTML =
    '<span class="nationality-flag" style="background-image: url(&quot;/missing.svg&quot;)"></span>';
  const flag = captureNode.querySelector(".nationality-flag");
  const originalBackground = flag.style.backgroundImage;

  await expect(rasterizeReceiptFlags(captureNode)).resolves.toBeUndefined();
  expect(flag.style.backgroundImage).toBe(originalBackground);

  global.Image = OriginalImage;
});
