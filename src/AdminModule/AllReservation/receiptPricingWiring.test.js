import fs from "fs";
import path from "path";

const receiptPaths = [
  "ReceiptPDF.js",
  "ReceiptPDFB2B.js",
  "../../HotelModule/NewReservation/ReceiptPDF.js",
  "../../HotelModule/NewReservation/ReceiptPDFB2B.js",
  "../../HotelModule/HotelReports/ReceiptPDFB2B.js",
];

const sourceFor = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

test.each(receiptPaths)(
  "%s routes its accommodation summary through the shared HotelRunner-safe adapter",
  (relativePath) => {
    const source = sourceFor(relativePath);

    expect(source).toMatch(/getReceiptPricingDisplay/);
    expect(source).toMatch(/receiptPricing\.accommodationLabel/);
    expect(source).not.toMatch(/<strong>Net Accommodation Charge:/);
  },
);

test.each([
  "ReceiptPDFB2B.js",
  "../../HotelModule/NewReservation/ReceiptPDFB2B.js",
  "../../HotelModule/HotelReports/ReceiptPDFB2B.js",
])("%s identifies root-derived figures as local contracted/base", (relativePath) => {
  const source = sourceFor(relativePath);

  expect(source).toMatch(/Rate \(Local Contracted\/Base\)/);
  expect(source).toMatch(/Local Contracted\/Base Total/);
});

test("the hotel receipt contains no legacy room-spread commission calculation", () => {
  const source = sourceFor("../../HotelModule/NewReservation/ReceiptPDF.js");

  expect(source).not.toMatch(/computeTotalCommission|commissionRate/);
});

test.each(receiptPaths)(
  "%s builds supplier mutations from editable leaves only",
  (relativePath) => {
    const source = sourceFor(relativePath);

    expect(source).toMatch(/buildReceiptSupplierUpdatePayload/);
    expect(source).not.toMatch(/const updateData = \{\s*supplierData\s*:/);
  },
);
