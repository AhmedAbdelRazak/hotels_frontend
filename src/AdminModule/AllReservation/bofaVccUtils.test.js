import {
	formatCardNumber,
	formatExpiry,
	getCheckinEligibility,
	initialVccForm,
	isLuhnValid,
	validateVccForm,
} from "./bofaVccUtils";

describe("BofA OTA virtual-card form policy", () => {
	test("formats card fields without persisting anything", () => {
		expect(formatCardNumber("4111-1111-1111-1111")).toBe("4111 1111 1111 1111");
		expect(formatExpiry("1231")).toBe("12/31");
		expect(isLuhnValid("4111111111111111")).toBe(true);
		expect(isLuhnValid("4111111111111112")).toBe(false);
	});

	test("enforces check-in today or in the past using Riyadh dates", () => {
		const now = new Date("2026-07-23T12:00:00.000Z");
		expect(getCheckinEligibility("2026-07-23T00:00:00.000Z", now).ok).toBe(true);
		expect(getCheckinEligibility("2026-07-24T00:00:00.000Z", now).ok).toBe(false);
	});

	test("prefills Expedia billing and saved USD amount", () => {
		const form = initialVccForm({
			booking_source: "Expedia",
			vcc_payment: {
				metadata: { amount_to_charge_usd: 235.5 },
			},
		});
		expect(form.amountUsd).toBe("235.50");
		expect(form.address1).toBe("1111 Expedia Group Way W");
		expect(form.postalCode).toBe("98119");
	});

	test("requires a valid USD amount, card, and complete billing address", () => {
		const form = {
			...initialVccForm({ booking_source: "Expedia" }),
			amountUsd: "100.00",
			cardNumber: "4111 1111 1111 1111",
			expiry: "12/31",
			cvv: "123",
		};
		expect(validateVccForm(form, new Date("2026-07-23T00:00:00.000Z"))).toBe("");
		expect(validateVccForm({ ...form, amountUsd: "100.001" })).toMatch(/two decimals/i);
		expect(validateVccForm({ ...form, address1: "" })).toMatch(/billing address/i);
	});
});
