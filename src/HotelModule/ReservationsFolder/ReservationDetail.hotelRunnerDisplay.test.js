import fs from "fs";

const source = fs.readFileSync(require.resolve("./ReservationDetail"), "utf8");

describe("hotel ReservationDetail HotelRunner gross safety", () => {
	it("keeps a missing canonical gross unavailable for due, wallet, and payment validation", () => {
		expect(source).toMatch(
			/const financialTotalAmountAvailable\s*=\s*!guestGrossDisplay\.isHotelRunner \|\| guestGrossDisplay\.available/,
		);
		expect(source).toMatch(
			/const financialTotalAmountValue = guestGrossDisplay\.isHotelRunner\s*\? guestGrossDisplay\.amount\s*:\s*totalAmountValue/,
		);
		expect(source).toMatch(
			/const amountDue = financialTotalAmountAvailable[\s\S]{0,220}: null/,
		);
		expect(source).toMatch(
			/const remainingPaymentAmount = financialTotalAmountAvailable[\s\S]{0,180}: null/,
		);
		expect(source).toMatch(
			/const after = financialTotalAmountAvailable[\s\S]{0,180}: null/,
		);
		expect(source).toMatch(/if \(!financialTotalAmountAvailable\)/);
		expect(source).not.toMatch(/guestGrossTotalAmountValue/);
	});

	it("renders optional canonical totals instead of formatting null as zero", () => {
		expect(source).toMatch(/const formatOptionalMoney = useCallback/);
		expect(source).toMatch(/formatOptionalMoney\(financialTotalAmountValue\)/);
		expect(source).toMatch(/formatOptionalMoney\(amountDue\)/);
		expect(source).not.toMatch(/formatMoney\(financialTotalAmountValue\)/);
	});
});
