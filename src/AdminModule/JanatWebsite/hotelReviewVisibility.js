const explicitBoolean = (value) =>
	typeof value === "boolean" ? value : null;

export const effectiveReviewVisibility = (review = {}) => {
	const legacyVisible =
		String(review?.status || "").trim().toLowerCase() === "active";
	const ratingVisible = explicitBoolean(review?.ratingVisible);
	const commentVisible = explicitBoolean(review?.commentVisible);

	return {
		ratingVisible:
			ratingVisible === null ? legacyVisible : ratingVisible,
		commentVisible:
			commentVisible === null ? legacyVisible : commentVisible,
	};
};

export const reviewVisibilityMode = (review = {}) => {
	const { ratingVisible, commentVisible } =
		effectiveReviewVisibility(review);
	if (ratingVisible && commentVisible) return "both";
	if (ratingVisible) return "ratingOnly";
	if (commentVisible) return "commentOnly";
	return "hidden";
};

export const hasPendingReviewOperations = (operations = {}) =>
	Object.values(operations || {}).some(
		(operation) =>
			operation?.phase === "confirming" || operation?.phase === "saving",
	);

export const shouldReleaseReviewOperationOnCancel = (phase) =>
	phase !== "saving";

export const hasAuthoritativeReviewVisibility = (review = {}) =>
	typeof review?.ratingVisible === "boolean" &&
	typeof review?.commentVisible === "boolean";

export const serverConfirmedVisibilityChange = (
	review,
	field,
	expectedValue,
) =>
	hasAuthoritativeReviewVisibility(review) &&
	["ratingVisible", "commentVisible"].includes(field) &&
	typeof expectedValue === "boolean" &&
	review[field] === expectedValue;

export const runVisibilityMutationIfMounted = async ({
	isMounted,
	mutate,
}) => {
	if (
		typeof isMounted !== "function" ||
		!isMounted() ||
		typeof mutate !== "function"
	) {
		return { skipped: true, response: null };
	}
	return { skipped: false, response: await mutate() };
};

export const mergeServerReviewVisibility = (currentReview, serverReview) => {
	if (!currentReview || !serverReview) return currentReview;
	if (
		typeof serverReview.ratingVisible !== "boolean" ||
		typeof serverReview.commentVisible !== "boolean"
	) {
		return currentReview;
	}

	const nextReview = {
		...currentReview,
		ratingVisible: serverReview.ratingVisible,
		commentVisible: serverReview.commentVisible,
	};
	const normalizedStatus = String(serverReview.status || "")
		.trim()
		.toLowerCase();
	if (["active", "inactive"].includes(normalizedStatus)) {
		nextReview.status = normalizedStatus;
	}
	if (Object.prototype.hasOwnProperty.call(serverReview, "moderation")) {
		nextReview.moderation = serverReview.moderation;
	}
	if (Object.prototype.hasOwnProperty.call(serverReview, "updatedAt")) {
		nextReview.updatedAt = serverReview.updatedAt;
	}

	return nextReview;
};
