export const PENDING_CONFIRMATION_STATUS_REGEX =
	/(?:pending[\s_-]?confirmation|^pending$)/i;

export const isPendingConfirmationReservation = (reservation = {}) => {
	const status = String(
		reservation?.reservation_status || reservation?.state || "",
	).trim();
	const pendingStatus = String(
		reservation?.pendingConfirmation?.status || "",
	)
		.trim()
		.toLowerCase();
	const decisionStatus = String(
		reservation?.agentDecisionSnapshot?.status || "",
	)
		.trim()
		.toLowerCase();

	return (
		PENDING_CONFIRMATION_STATUS_REGEX.test(status) ||
		pendingStatus === "pending" ||
		decisionStatus === "pending"
	);
};
