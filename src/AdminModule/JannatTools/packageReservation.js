const finiteMoney = (value) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
};

export const buildPackageRoomMetadata = ({
	type,
	pkgId,
	roomId,
	name,
	totalSar,
	totalRootSar,
	nights,
	from,
	to,
}) => ({
	fromPackagesOffers: true,
	lockDates: true,
	datesLocked: true,
	packageMeta: {
		type: String(type || ""),
		pkgId: String(pkgId || ""),
		roomId: String(roomId || ""),
		name: String(name || ""),
		usesSelectedStayDates: false,
		totalSar: finiteMoney(totalSar),
		totalRootSar: finiteMoney(totalRootSar),
		nights: Math.max(0, Number(nights) || 0),
		from: String(from || ""),
		to: String(to || ""),
	},
});

export const copyPackageRoomMetadata = (room) => {
	if (room?.fromPackagesOffers !== true || !room?.packageMeta) return {};
	return buildPackageRoomMetadata(room.packageMeta);
};
