jest.mock("axios", () => ({
	__esModule: true,
	default: {},
}));

import { chargeReservationViaBofaVcc } from "../apiAdmin";

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

	test("sends only payment inputs and never sends browser billing fields", async () => {
		await chargeReservationViaBofaVcc({
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
			usdAmount: 125.5,
			currency: "USD",
			proceedWithoutRoom: false,
			card: {
				number: "4111111111111111",
				expiry: "12/31",
				cvv: "123",
			},
		});
		expect(payload).not.toHaveProperty("billingAddress");
		expect(payload).not.toHaveProperty("cardholderName");
		expect(payload).not.toHaveProperty("postalCode");
	});
});
