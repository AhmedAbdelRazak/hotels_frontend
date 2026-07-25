const roleNumbers = (account = {}) =>
	[
		Number(account?.role),
		...(Array.isArray(account?.roles) ? account.roles.map(Number) : []),
	].filter((role) => Number.isFinite(role));

const normalizeId = (value) =>
	String(value?._id || value?.id || value || "").trim();

const normalizeRoleKey = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "");

const roleKeys = (account = {}) =>
	[
		account?.roleDescription,
		...(Array.isArray(account?.roleDescriptions)
			? account.roleDescriptions
			: []),
	]
		.map(normalizeRoleKey)
		.filter(Boolean);

const EDITOR_ROLE_NUMBERS = new Set([2000, 3000, 8000, 10000]);
const EDITOR_ROLE_KEYS = new Set([
	"owner",
	"hotelowner",
	"hotelmanager",
	"reception",
	"frontdesk",
	"reservationemployee",
	"reservationmanager",
	"reservationsmanager",
	"bookingresponsible",
	"bookingmanager",
	"systemadmin",
]);

export const canUseHotelReservationEditor = (
	account = {},
	{ isSuperAdmin = false, hotelOwnerId = "" } = {},
) => {
	if (isSuperAdmin) return true;
	if (!account || account.activeUser === false) return false;
	if (
		normalizeId(account) &&
		normalizeId(account) === normalizeId(hotelOwnerId)
	) {
		return true;
	}
	return (
		roleNumbers(account).some((role) => EDITOR_ROLE_NUMBERS.has(role)) ||
		roleKeys(account).some((role) => EDITOR_ROLE_KEYS.has(role))
	);
};
