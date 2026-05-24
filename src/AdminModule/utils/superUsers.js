export const SUPER_ADMIN_ID = (
	process.env.REACT_APP_SUPER_ADMIN_ID || ""
).trim();

export const SUPER_USER_IDS = SUPER_ADMIN_ID ? [SUPER_ADMIN_ID] : [];

export const isSuperAdminUser = (userOrId) => {
	const userId =
		typeof userOrId === "string" ? userOrId : userOrId?._id || userOrId?.id;
	const roles =
		typeof userOrId === "object"
			? [
					Number(userOrId?.role),
					...(Array.isArray(userOrId?.roles)
						? userOrId.roles.map((role) => Number(role))
						: []),
			  ]
			: [];
	const roleDescriptions =
		typeof userOrId === "object"
			? [
					String(userOrId?.roleDescription || "").toLowerCase(),
					...(Array.isArray(userOrId?.roleDescriptions)
						? userOrId.roleDescriptions.map((role) =>
								String(role || "").toLowerCase()
						  )
						: []),
			  ]
			: [];

	return Boolean(
		roles.includes(1000) ||
			roleDescriptions.includes("superadmin") ||
			roleDescriptions.includes("super admin") ||
			(SUPER_ADMIN_ID && String(userId || "").trim() === SUPER_ADMIN_ID)
	);
};
