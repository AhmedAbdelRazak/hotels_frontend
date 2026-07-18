import html2canvas from "html2canvas";
import { captureReceiptCanvas } from "./captureReceiptCanvas";

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
  expect(document.querySelector('[data-receipt-capture-host="true"]')).toBeNull();

  receipt.remove();
});
