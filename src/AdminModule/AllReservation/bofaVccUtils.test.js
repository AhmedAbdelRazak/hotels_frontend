import {
	formatPostalCode,
	getCheckinEligibility,
	initialVccForm,
	resolveVccProvider,
	requiresBillingPostalCode,
	validateVccForm,
} from "./bofaVccUtils";

describe("BofA OTA virtual-card form policy", () => {
	test("formats the only optional browser billing field", () => {
		expect(formatPostalCode("1011 dl")).toBe("1011 DL");
	});

	test("enforces check-in today or in the past using Riyadh dates", () => {
		const now = new Date("2026-07-23T12:00:00.000Z");
		expect(getCheckinEligibility("2026-07-23T00:00:00.000Z", now).ok).toBe(true);
		expect(getCheckinEligibility("2026-07-24T00:00:00.000Z", now).ok).toBe(false);
	});

	test("prefills only the saved USD amount, never browser-managed billing", () => {
		const form = initialVccForm({
			booking_source: "Expedia",
			vcc_payment: {
				metadata: { amount_to_charge_usd: 235.5 },
			},
		});
		expect(form.amountUsd).toBe("235.50");
		expect(form).not.toHaveProperty("cardholderName");
		expect(form).not.toHaveProperty("address1");
		expect(form).not.toHaveProperty("postalCode");
		expect(form).not.toHaveProperty("billingPostalCode");
	});

	test("validates only the USD amount because card fields are hosted by BofA", () => {
		const form = {
			...initialVccForm({ booking_source: "Expedia" }),
			amountUsd: "100.00",
			cardNumber: "4111 1111 1111 1111",
			expiry: "12/31",
			cvv: "123",
		};
		expect(validateVccForm(form, new Date("2026-07-23T00:00:00.000Z"))).toBe("");
		expect(initialVccForm({ booking_source: "Expedia" })).not.toHaveProperty("cardNumber");
		expect(validateVccForm({ ...form, amountUsd: "100.001" })).toMatch(/two decimals/i);
	});

	test("requires a ZIP or postal code only outside Expedia and Agoda", () => {
		expect(requiresBillingPostalCode("expedia")).toBe(false);
		expect(requiresBillingPostalCode("agoda")).toBe(false);
		expect(requiresBillingPostalCode("booking")).toBe(true);
		expect(requiresBillingPostalCode("other")).toBe(true);

		const form = {
			...initialVccForm({ booking_source: "Booking.com" }),
			amountUsd: "100.00",
			cardNumber: "4111 1111 1111 1111",
			expiry: "12/31",
			cvv: "123",
		};
		expect(form).toHaveProperty("billingPostalCode", "");
		expect(
			validateVccForm(form, new Date("2026-07-23T00:00:00.000Z"), {
				requirePostalCode: true,
			}),
		).toMatch(/ZIP \/ postal code/i);
		expect(
			validateVccForm(
				{ ...form, billingPostalCode: "1011 DL" },
				new Date("2026-07-23T00:00:00.000Z"),
				{ requirePostalCode: true },
			),
		).toBe("");
	});

	test("does not classify Jannat Booking as Booking.com", () => {
		expect(resolveVccProvider("Booking.com")).toBe("booking");
		expect(resolveVccProvider("Online Jannat Booking")).toBe("other");
	});
});
