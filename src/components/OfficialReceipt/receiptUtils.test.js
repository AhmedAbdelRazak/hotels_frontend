import {
  buildReceiptRoomRows,
  calculateNights,
  countryCodeFromNationality,
  deriveReceiptPayment,
  displayNationality,
} from "./receiptUtils";

describe("official receipt utilities", () => {
  it("resolves ISO codes, country names, and legacy nationalities", () => {
    expect(countryCodeFromNationality("EG")).toBe("EG");
    expect(countryCodeFromNationality("Egypt")).toBe("EG");
    expect(countryCodeFromNationality("Egyptian")).toBe("EG");
    expect(countryCodeFromNationality("مصري")).toBe("EG");
    expect(displayNationality("EG", "EG")).toBe("Egyptian");
  });

  it("calculates nights by UTC calendar date", () => {
    expect(calculateNights("2026-07-14", "2026-07-16")).toBe(2);
  });

  it("does not count an uncaptured authorization as paid", () => {
    const payment = deriveReceiptPayment({
      total_amount: 600,
      paid_amount: 200,
      payment: "credit/ debit",
    });
    expect(payment.paid).toBe(0);
    expect(payment.remaining).toBe(600);
    expect(payment.method.en).toBe("Not captured");
  });

  it("groups a 20-room agency reservation without losing totals", () => {
    const pickedRoomsType = Array.from({ length: 20 }, () => ({
      room_type: "quadrupleRooms",
      displayName: "Quadruple Room",
      count: 1,
      chosenPrice: 75,
      pricingByDay: [{ price: 75 }, { price: 80 }],
    }));
    const rows = buildReceiptRoomRows({ pickedRoomsType }, {}, 2);
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(20);
    expect(rows[0].rate).toBe(77.5);
    expect(rows[0].total).toBe(3100);
  });
});
