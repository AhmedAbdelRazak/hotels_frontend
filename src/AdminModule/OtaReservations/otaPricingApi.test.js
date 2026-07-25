import {
	getOtaReservationRoomOptions,
	updateOtaReservationPricing,
} from "../apiAdmin";

jest.mock("axios", () => ({}));

describe("OTA pricing review API", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		localStorage.clear();
		process.env.REACT_APP_API_URL = "https://api.example.test/api";
		global.fetch = jest.fn().mockResolvedValue({
			json: jest.fn().mockResolvedValue({ success: true, rooms: [] }),
		});
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	test("loads active PMS room identities through the protected reservation route", async () => {
		await getOtaReservationRoomOptions("reservation-1", "admin-1", "token-1");

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.example.test/api/admin/ota-reservations/reservation-1/room-options/admin-1",
			expect.objectContaining({
				method: "GET",
				cache: "no-store",
				headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
			}),
		);
	});

	test("sends room count, canonical mapping, and pricing together in one save", async () => {
		const payload = {
			total_rooms: 2,
			total_amount: 406.02,
			sub_total: 300,
			pickedRoomsType: [
				{
					hotelRoomConfigId: "triple-current",
					room_type: "tripleRooms",
					count: 2,
					pricingByDay: [
						{
							date: "2026-07-27",
							clientPrice: 67.67,
							rootPrice: 50,
						},
					],
				},
			],
		};

		await updateOtaReservationPricing(
			"reservation-1",
			"admin-1",
			"token-1",
			payload,
		);

		const [url, options] = global.fetch.mock.calls[0];
		expect(url).toBe(
			"https://api.example.test/api/admin/ota-reservations/reservation-1/pricing/admin-1",
		);
		expect(options.method).toBe("PUT");
		expect(options.headers.Authorization).toBe("Bearer token-1");
		expect(JSON.parse(options.body)).toEqual(payload);
	});
});
