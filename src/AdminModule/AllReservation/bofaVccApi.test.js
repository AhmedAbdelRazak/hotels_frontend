jest.mock("axios", () => ({
	__esModule: true,
	default: {},
}));

import { createBofaHostedCheckoutSession } from "../apiAdmin";

describe("Bank of America OTA virtual-card API payload", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: jest.fn().mockResolvedValue('{"success":true}'),
		});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		jest.clearAllMocks();
	});

	test("never sends PAN, expiry, CVV, or browser billing fields", async () => {
		await createBofaHostedCheckoutSession({
			token: "super-admin-token",
			reservationId: "reservation-1",
			usdAmount: 125.5,
			currency: "USD",
			cardNumber: "4111111111111111",
			cardExpiry: "12/31",
			cardCVV: "123",
			proceedWithoutRoom: false,
			cardholderName: "Untrusted browser value",
			postalCode: "00000",
			billingAddress: { address1: "Untrusted browser address" },
		});

		const [, options] = global.fetch.mock.calls[0];
		const payload = JSON.parse(options.body);
		expect(payload).toEqual({
			reservationId: "reservation-1",
			usdAmount: "125.5",
			currency: "USD",
			proceedWithoutRoom: false,
		});
		expect(global.fetch.mock.calls[0][0]).toMatch(/\/bofa\/checkout\/session$/);
		expect(JSON.stringify(payload)).not.toContain("4111111111111111");
		expect(JSON.stringify(payload)).not.toContain("123");
		expect(payload).not.toHaveProperty("card");
		expect(payload).not.toHaveProperty("billingAddress");
		expect(payload).not.toHaveProperty("cardholderName");
		expect(payload).not.toHaveProperty("postalCode");
		expect(payload).not.toHaveProperty("billingPostalCode");
	});

	test("keeps the exact two-decimal amount in the signed-session request", async () => {
		await createBofaHostedCheckoutSession({
			token: "super-admin-token",
			reservationId: "reservation-decimal",
			usdAmount: "67.30",
		});

		const [, options] = global.fetch.mock.calls[0];
		expect(JSON.parse(options.body).usdAmount).toBe("67.30");
	});

	test("sends only the explicit postal-code override for other OTA cards", async () => {
		await createBofaHostedCheckoutSession({
			token: "super-admin-token",
			reservationId: "reservation-2",
			usdAmount: 55,
			cardNumber: "4111111111111111",
			cardExpiry: "12/31",
			cardCVV: "123",
			billingPostalCode: " 1011 dl ",
			billingAddress: { address1: "Must never be sent" },
		});

		const [, options] = global.fetch.mock.calls[0];
		const payload = JSON.parse(options.body);
		expect(payload.billingPostalCode).toBe("1011 DL");
		expect(payload).not.toHaveProperty("billingAddress");
		expect(payload).not.toHaveProperty("cardholderName");
	});
});
