import {
	effectiveReviewVisibility,
	hasAuthoritativeReviewVisibility,
	hasPendingReviewOperations,
	mergeServerReviewVisibility,
	reviewVisibilityMode,
	runVisibilityMutationIfMounted,
	serverConfirmedVisibilityChange,
	shouldReleaseReviewOperationOnCancel,
} from "./hotelReviewVisibility";

describe("hotel review visibility", () => {
	it("keeps a review locked when Cancel is pressed during a save", () => {
		expect(shouldReleaseReviewOperationOnCancel("confirming")).toBe(true);
		expect(shouldReleaseReviewOperationOnCancel("saving")).toBe(false);
		expect(shouldReleaseReviewOperationOnCancel(undefined)).toBe(true);
	});

	it("uses explicit independent values before the legacy status", () => {
		expect(
			effectiveReviewVisibility({
				status: "inactive",
				ratingVisible: true,
				commentVisible: false,
			}),
		).toEqual({ ratingVisible: true, commentVisible: false });
	});

	it("maps active legacy reviews to both visible and fails closed otherwise", () => {
		expect(effectiveReviewVisibility({ status: "active" })).toEqual({
			ratingVisible: true,
			commentVisible: true,
		});
		expect(effectiveReviewVisibility({ status: "inactive" })).toEqual({
			ratingVisible: false,
			commentVisible: false,
		});
		expect(effectiveReviewVisibility({})).toEqual({
			ratingVisible: false,
			commentVisible: false,
		});
	});

	it.each([
		[true, true, "both"],
		[true, false, "ratingOnly"],
		[false, true, "commentOnly"],
		[false, false, "hidden"],
	])("identifies every supported combination", (ratingVisible, commentVisible, mode) => {
		expect(reviewVisibilityMode({ ratingVisible, commentVisible })).toBe(mode);
	});

	it("merges only authoritative server visibility metadata", () => {
		const current = {
			_id: "review-1",
			guestName: "Current guest",
			comment: "Current comment",
			ratingVisible: true,
			commentVisible: true,
		};
		const merged = mergeServerReviewVisibility(current, {
			guestName: "Stale server guest",
			comment: "Stale server comment",
			ratingVisible: false,
			commentVisible: true,
			status: "active",
			updatedAt: "2026-07-13T12:00:00.000Z",
		});

		expect(merged).toEqual({
			...current,
			ratingVisible: false,
			commentVisible: true,
			status: "active",
			updatedAt: "2026-07-13T12:00:00.000Z",
		});
	});

	it("does not invent visibility when a response omits effective booleans", () => {
		const current = {
			_id: "review-1",
			ratingVisible: true,
			commentVisible: false,
		};
		expect(
			mergeServerReviewVisibility(current, {
				status: "inactive",
				ratingVisible: false,
			}),
		).toBe(current);
	});

	it("locks view-changing controls throughout confirmation and saving", () => {
		expect(hasPendingReviewOperations({})).toBe(false);
		expect(
			hasPendingReviewOperations({
				"review-1": { field: "ratingVisible", phase: "confirming" },
			}),
		).toBe(true);
		expect(
			hasPendingReviewOperations({
				"review-1": { field: "commentVisible", phase: "saving" },
			}),
		).toBe(true);
	});

	it("confirms success only when the server returns the requested value", () => {
		const response = { ratingVisible: false, commentVisible: true };
		expect(hasAuthoritativeReviewVisibility(response)).toBe(true);
		expect(
			serverConfirmedVisibilityChange(
				response,
				"ratingVisible",
				false,
			),
		).toBe(true);
		expect(
			serverConfirmedVisibilityChange(
				response,
				"ratingVisible",
				true,
			),
		).toBe(false);
		expect(
			serverConfirmedVisibilityChange(
				{ ratingVisible: false },
				"ratingVisible",
				false,
			),
		).toBe(false);
	});

	it("does not invoke a mutation after the moderation view unmounts", async () => {
		const mutate = jest.fn();
		const result = await runVisibilityMutationIfMounted({
			isMounted: () => false,
			mutate,
		});

		expect(result).toEqual({ skipped: true, response: null });
		expect(mutate).not.toHaveBeenCalled();
	});
});
