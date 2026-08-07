import { normalizeFinancialExcelCell } from "./DownloadExcel";

describe("financial report Excel values", () => {
	it("keeps normal legacy amounts numeric", () => {
		expect(normalizeFinancialExcelCell("1,250.50 SAR")).toBe(1250.5);
		expect(normalizeFinancialExcelCell(700)).toBe(700);
	});

	it("does not concatenate HotelRunner local-base and verified-net figures", () => {
		const label = "Local base: 800 | Verified OTA net: 700";
		expect(normalizeFinancialExcelCell(label)).toBe(label);
	});

	it("preserves an unavailable HotelRunner payout warning as text", () => {
		const label = "Awaiting verified OTA expense";
		expect(normalizeFinancialExcelCell(label)).toBe(label);
	});
});
