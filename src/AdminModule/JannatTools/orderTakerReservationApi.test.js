jest.mock("axios", () => ({
	__esModule: true,
	default: {},
}));

import { createNewReservationClient } from "../apiAdmin";

describe("OrderTaker reservation API", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: jest.fn().mockResolvedValue({
				message: "Reservation created successfully",
			}),
		});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		jest.clearAllMocks();
	});

	it("authenticates the platform employee reservation request", async () => {
		const payload = { sentFrom: "employee", hotelId: "hotel-1" };

		await createNewReservationClient(payload, "platform-token");

		expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining("/new-reservation-client-employee"),
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					Authorization: "Bearer platform-token",
				}),
				body: JSON.stringify(payload),
			}),
		);
	});
});
