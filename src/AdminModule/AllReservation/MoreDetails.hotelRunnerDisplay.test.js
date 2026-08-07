import fs from "fs";

const source = fs.readFileSync(require.resolve("./MoreDetails"), "utf8");

describe("Admin MoreDetails HotelRunner display guards", () => {
  it("uses canonical guest gross for displayed totals and due arithmetic", () => {
    expect(source).toMatch(/getReservationGuestGrossDisplay/);
    expect(source).toMatch(/financialTotalAmountAvailable/);
    expect(source).toMatch(/financialTotalAmountValue/);
    expect(source).toMatch(/formatOptionalMoney\(financialTotalAmountValue\)/);
  });

  it("gates each daily commercial metric on its own verified consensus", () => {
    expect(source).toMatch(
      /hotelRunnerPayoutDisplay\.netAvailable\s*&&\s*hasExplicitMoney\(explicitNet\)/,
    );
    expect(source).toMatch(
      /hotelRunnerPayoutDisplay\.otaExpenseAvailable\s*&&\s*hasExplicitMoney\(explicitExpense\)/,
    );
    expect(source).toMatch(
      /hotelRunnerPayoutDisplay\.platformMarginAvailable\s*&&\s*hasExplicitMoney\(explicitPlatformMargin\)/,
    );
    expect(source).not.toMatch(/canUseHotelRunnerCommercialAmounts/);
  });

  it("routes payment-breakdown platform profit through the reservation consensus resolver", () => {
    expect(source).toMatch(
      /getPaymentBreakdownTotalDisplay\(\{[\s\S]*?grossTotal: financialTotalAmountValue,[\s\S]*?reservation,[\s\S]*?\}\)/,
    );
  });
});
