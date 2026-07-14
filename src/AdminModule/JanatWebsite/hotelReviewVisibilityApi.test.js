import { updateAdminHotelReviewVisibility } from "../apiAdmin";

jest.mock("axios", () => ({}));

describe("admin hotel review visibility API", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		localStorage.clear();
		process.env.REACT_APP_API_URL = "https://api.example.test/api";
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: jest.fn().mockResolvedValue({ success: true }),
		});
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	it("sends only the deliberately changed boolean", async () => {
		await updateAdminHotelReviewVisibility(
			"review-1",
			"admin-1",
			"token-1",
			{ ratingVisible: false },
		);

		expect(global.fetch).toHaveBeenCalledTimes(1);
		const [url, options] = global.fetch.mock.calls[0];
		expect(url).toBe(
			"https://api.example.test/api/admin/hotel-reviews/review-1/status/admin-1",
		);
		expect(options.method).toBe("PATCH");
		expect(JSON.parse(options.body)).toEqual({ ratingVisible: false });
	});

	it("does not issue a request without a valid visibility boolean", async () => {
		const response = await updateAdminHotelReviewVisibility(
			"review-1",
			"admin-1",
			"token-1",
			{ commentVisible: "false" },
		);

		expect(response.success).toBe(false);
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it("preserves a server conflict code so the UI can refresh stale state", async () => {
		global.fetch.mockResolvedValueOnce({
			ok: false,
			json: jest.fn().mockResolvedValue({
				code: "REVIEW_VISIBILITY_CONFLICT",
				error: "Visibility changed concurrently.",
			}),
		});

		const response = await updateAdminHotelReviewVisibility(
			"review-1",
			"admin-1",
			"token-1",
			{ commentVisible: false },
		);

		expect(response.success).toBe(false);
		expect(response.code).toBe("REVIEW_VISIBILITY_CONFLICT");
	});

	it("aborts a stalled visibility update instead of leaving the row locked", async () => {
		jest.useFakeTimers();
		try {
			let requestSignal;
			global.fetch.mockImplementationOnce((_url, options) => {
				requestSignal = options.signal;
				return Promise.resolve({
					ok: true,
					// Response headers arrived, but the body never finishes. The same
					// deadline must cover JSON consumption as well as the initial fetch.
					json: jest.fn(() => new Promise(() => {})),
				});
			});

			const request = updateAdminHotelReviewVisibility(
				"review-1",
				"admin-1",
				"token-1",
				{ ratingVisible: false },
			);
			await Promise.resolve();
			expect(requestSignal.aborted).toBe(false);

			jest.advanceTimersByTime(15_000);
			const response = await request;

			expect(requestSignal.aborted).toBe(true);
			expect(response).toEqual({
				success: false,
				error: "Could not update the review visibility.",
			});
		} finally {
			jest.useRealTimers();
		}
	});
});
