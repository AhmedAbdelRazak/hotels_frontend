export const parseSuperAdminIds = (value = "") =>
	String(value || "")
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean);

export const SUPER_USER_IDS = [
	...new Set(parseSuperAdminIds(process.env.REACT_APP_SUPER_ADMIN_ID || "")),
];

export const SUPER_ADMIN_ID = SUPER_USER_IDS[0] || "";

const normalizeUserId = (userOrId) =>
	String(
		typeof userOrId === "string" ? userOrId : userOrId?._id || userOrId?.id || ""
	).trim();

export const isConfiguredSuperAdminUser = (userOrId) => {
	const userId = normalizeUserId(userOrId);
	return Boolean(userId && SUPER_USER_IDS.includes(userId));
};

export const isSuperAdminUser = (userOrId) => {
	const userId = normalizeUserId(userOrId);
	return isConfiguredSuperAdminUser(userId);
};
