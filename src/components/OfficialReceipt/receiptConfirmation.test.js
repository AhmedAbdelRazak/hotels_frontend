import {
  getReceiptConfirmationDisplay,
  getReceiptConfirmationValues,
} from "./receiptConfirmation";

describe("receipt confirmation display", () => {
  it("pairs the PMS confirmation with a provider-neutral OTA record", () => {
    expect(
      getReceiptConfirmationDisplay({
        confirmation_number: "PRIMARY-3130",
        supplierData: { suppliedBookingNo: "SUPPLIER-2040" },
      }),
    ).toBe("PRIMARY-3130 / SUPPLIER-2040");
  });

  it("supports alternate OTA fields without provider-specific logic", () => {
    expect(
      getReceiptConfirmationDisplay({
        confirmation_number: "PMS-1",
        supplierData: { otaConfirmationNumber: "OTA-2" },
      }),
    ).toBe("PMS-1 / OTA-2");
  });

  it("prefers an explicit supplier record over a conflicting nested primary", () => {
    expect(
      getReceiptConfirmationDisplay({
        confirmation_number: "PMS-1",
        customer_details: { confirmation_number: "OLD-PMS-RECORD" },
        supplierData: { suppliedBookingNo: "OTA-2" },
      }),
    ).toBe("PMS-1 / OTA-2");
  });

  it("keeps legacy customer confirmation records available", () => {
    expect(
      getReceiptConfirmationDisplay({
        confirmation_number: "PMS-1",
        customer_details: { name: "Guest" },
        customerDetails: { confirmation_number2: "LEGACY-OTA-2" },
      }),
    ).toBe("PMS-1 / LEGACY-OTA-2");
  });

  it("deduplicates values and ignores empty or placeholder records", () => {
    expect(
      getReceiptConfirmationValues({
        confirmation_number: " ABC-1 ",
        supplierData: {
          platformConfirmationNumber: "abc-1",
          otaConfirmationNumber: "Not Provided",
          suppliedBookingNo: "SUP-2",
        },
        confirmation_number2: "SUP-2",
      }),
    ).toEqual(["ABC-1", "SUP-2"]);
  });

  it("falls back cleanly when no valid confirmation exists", () => {
    expect(
      getReceiptConfirmationDisplay({
        confirmation_number: "N/A",
        supplierData: { suppliedBookingNo: "-" },
      }),
    ).toBe("N/A");
  });
});
