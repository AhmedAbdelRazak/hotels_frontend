import { calculateReceiptScale, MIN_RECEIPT_SCALE } from "./ReceiptViewport";

test("normal desktop receipts scale down to the visible modal height", () => {
  const scale = calculateReceiptScale({
    availableHeight: 820,
    availableWidth: 1400,
    contentHeight: 1100,
    contentWidth: 1080,
  });
  expect(scale).toBeCloseTo(820 / 1100, 5);
});

test("very tall receipts keep a readable minimum scale and can scroll", () => {
  const scale = calculateReceiptScale({
    availableHeight: 700,
    availableWidth: 1400,
    contentHeight: 1800,
    contentWidth: 1080,
  });
  expect(scale).toBe(MIN_RECEIPT_SCALE);
});

test("narrow responsive receipts stay full-size and scroll when necessary", () => {
  const scale = calculateReceiptScale({
    availableHeight: 700,
    availableWidth: 390,
    contentHeight: 1400,
    contentWidth: 390,
    fitEnabled: false,
  });
  expect(scale).toBe(1);
});
