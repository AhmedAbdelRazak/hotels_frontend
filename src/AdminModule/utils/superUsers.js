export const SUPER_ADMIN_ID = (
	process.env.REACT_APP_SUPER_ADMIN_ID || ""
).trim();

export const SUPER_USER_IDS = SUPER_ADMIN_ID ? [SUPER_ADMIN_ID] : [];

export const isSuperAdminUser = (userOrId) => {
	const userId =
		typeof userOrId === "string" ? userOrId : userOrId?._id || userOrId?.id;

	return Boolean(
		SUPER_ADMIN_ID && String(userId || "").trim() === SUPER_ADMIN_ID
	);
};
