export const normalizeSupportChatId = (value) => {
	if (!value) return "";
	if (typeof value === "object") {
		return String(value._id || value.id || value.$oid || "").trim();
	}
	return String(value).trim();
};

const AI_SUPPORT_EMAILS = new Set([
	"support@jannatbooking.com",
	"management@xhotelpro.com",
]);

export const isAiOrSystemSupportMessage = (message = {}) => {
	const email = String(message?.messageBy?.customerEmail || "").toLowerCase();
	const senderId = normalizeSupportChatId(message?.messageBy?.userId).toLowerCase();
	const senderName = String(message?.messageBy?.customerName || "").toLowerCase();
	return (
		message?.isAi === true ||
		message?.isSystem === true ||
		AI_SUPPORT_EMAILS.has(email) ||
		senderId === "jannat-ai-support" ||
		senderName === "system"
	);
};

export const supportCaseAdminUnreadMessages = (supportCase = {}, actorId = "") => {
	if (Number.isFinite(Number(supportCase.adminUnreadCount))) {
		return Number(supportCase.adminUnreadCount);
	}

	const normalizedActorId = normalizeSupportChatId(actorId);
	const conversation = Array.isArray(supportCase.conversation)
		? supportCase.conversation
		: [];

	return conversation.filter((message) => {
		if (message?.seenByAdmin) return false;
		if (isAiOrSystemSupportMessage(message)) return false;

		const senderId = normalizeSupportChatId(message?.messageBy?.userId);
		if (senderId && normalizedActorId && senderId === normalizedActorId) {
			return false;
		}

		return true;
	}).length;
};

export const isActiveEscalatedSupportCase = (supportCase = {}) =>
	supportCase?.escalationStatus === "active";
