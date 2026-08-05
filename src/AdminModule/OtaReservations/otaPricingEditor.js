const numberValue = (value) => {
	if (value === null || value === undefined || value === "") return 0;
	const parsed = Number(String(value).replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : 0;
};

const editableMoneyValue = (value) => {
	if (value === null || value === undefined) {
		return { valid: true, value: 0 };
	}
	if (typeof value === "number") {
		return Number.isFinite(value)
			? { valid: true, value }
			: { valid: false, value: 0 };
	}
	const text = String(value).trim();
	if (!text) return { valid: false, value: 0 };
	const parsed = Number(text);
	return Number.isFinite(parsed)
		? { valid: true, value: parsed }
		: { valid: false, value: 0 };
};

const round2 = (value) => Number(numberValue(value).toFixed(2));
const normalizedLabel = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

export const otaPricingRoomCount = (room = {}) => {
	const count = Number(room.count || room.totalRooms || room.total_rooms || 1);
	return Number.isFinite(count) && count > 0 ? count : 1;
};

export const otaRoomConfigId = (room = {}) =>
	String(
		room.hotelRoomConfigId || room.roomConfigId || room.roomCountDetailId || "",
	).trim();

export const summarizeOtaPricingRooms = (rooms = []) =>
	(Array.isArray(rooms) ? rooms : []).reduce(
		(acc, room) => {
			const count = otaPricingRoomCount(room);
			(Array.isArray(room?.pricingByDay) ? room.pricingByDay : []).forEach(
				(day) => {
					acc.clientTotal += numberValue(day.clientPrice) * count;
					acc.rootTotal += numberValue(day.rootPrice) * count;
					acc.netAfterExpensesTotal +=
						numberValue(day.netAfterExpenses) * count;
					acc.otaExpenseTotal += numberValue(day.otaExpenseAmount) * count;
					acc.platformMarginTotal += numberValue(day.platformMargin) * count;
				},
			);
			acc.totalRooms += count;
			return acc;
		},
		{
			clientTotal: 0,
			rootTotal: 0,
			netAfterExpensesTotal: 0,
			otaExpenseTotal: 0,
			platformMarginTotal: 0,
			totalRooms: 0,
		},
	);

export const applyOtaRoomConfig = (room = {}, option = {}) => {
	const next = {
		...room,
		room_type: option.room_type || option.roomType || "",
		displayName:
			option.displayName ||
			option.display_name ||
			option.room_type ||
			option.roomType ||
			"",
		hotelRoomConfigId: String(option.hotelRoomConfigId || option._id || ""),
		roomMappingStatus: "reviewed",
		count: otaPricingRoomCount(room),
	};
	delete next.roomConfigId;
	delete next.roomCountDetailId;
	return next;
};

const exactOptionForRoom = (room = {}, options = []) => {
	const currentId = otaRoomConfigId(room);
	if (currentId) {
		const byId = options.find(
			(option) => String(option.hotelRoomConfigId || option._id || "") === currentId,
		);
		if (byId) return byId;
	}

	const roomType = normalizedLabel(room.room_type || room.roomType);
	const displayName = normalizedLabel(room.displayName || room.display_name);
	const exact = options.filter((option) => {
		const optionType = normalizedLabel(option.room_type || option.roomType);
		const optionNames = [
			option.displayName,
			option.display_name,
			option.displayNameOtherLanguage,
		]
			.map(normalizedLabel)
			.filter(Boolean);
		return roomType && displayName
			? optionType === roomType && optionNames.includes(displayName)
			: false;
	});
	if (exact.length === 1) return exact[0];

	const sameType = roomType
		? options.filter(
				(option) =>
					normalizedLabel(option.room_type || option.roomType) === roomType,
		  )
		: [];
	if (sameType.length === 1) return sameType[0];

	const sameName = displayName
		? options.filter((option) =>
				[
					option.displayName,
					option.display_name,
					option.displayNameOtherLanguage,
				]
					.map(normalizedLabel)
					.filter(Boolean)
					.includes(displayName),
		  )
		: [];
	return sameName.length === 1 ? sameName[0] : null;
};

export const autoMapOtaPricingRooms = (rooms = [], options = []) =>
	(Array.isArray(rooms) ? rooms : []).map((room) => {
		const option = exactOptionForRoom(room, Array.isArray(options) ? options : []);
		return option ? applyOtaRoomConfig(room, option) : room;
	});

export const hasCurrentOtaRoomMapping = (room = {}, options = []) => {
	const selectedId = otaRoomConfigId(room);
	return Boolean(
		selectedId &&
			(Array.isArray(options) ? options : []).some(
				(option) =>
					String(option.hotelRoomConfigId || option._id || "") === selectedId,
			),
	);
};

export const recalculateOtaPricingDay = (day = {}, patch = {}) => {
	const merged = { ...day, ...patch };
	const rawClientPrice =
		merged.clientPrice ??
		merged.mainPrice ??
		merged.totalPriceWithCommission ??
		merged.price;
	const clientDraft = editableMoneyValue(rawClientPrice);
	const clientPrice = round2(clientDraft.value);
	const rawRootPrice =
		merged.rootPrice ?? merged.totalPriceWithoutCommission;
	const rootDraft = editableMoneyValue(rawRootPrice);
	const rootPrice = round2(rootDraft.value);
	const rawNetAfterExpenses =
		merged.netAfterExpenses ??
		clientPrice - numberValue(merged.otaExpenseAmount);
	const netDraft = editableMoneyValue(rawNetAfterExpenses);
	const netAfterExpenses = round2(netDraft.value);
	const otaExpenseAmount = round2(clientPrice - netAfterExpenses);
	const platformMargin = round2(netAfterExpenses - rootPrice);
	const platformMarginRate =
		netAfterExpenses > 0
			? round2((platformMargin / netAfterExpenses) * 100)
			: 0;
	return {
		...merged,
		price: clientPrice,
		clientPrice: clientDraft.valid ? clientPrice : rawClientPrice,
		mainPrice: clientPrice,
		totalPriceWithCommission: clientPrice,
		rootPrice: rootDraft.valid ? rootPrice : rawRootPrice,
		totalPriceWithoutCommission: rootPrice,
		netAfterExpenses: netDraft.valid
			? netAfterExpenses
			: rawNetAfterExpenses,
		netAfterOtaExpenses: netAfterExpenses,
		otaExpenseAmount,
		platformMargin,
		platformMarginRate,
	};
};

export const copyFirstOtaPricingRowValues = (rooms = []) => {
	const firstDay = (Array.isArray(rooms) ? rooms : [])
		.flatMap((room) => (Array.isArray(room?.pricingByDay) ? room.pricingByDay : []))
		.find(Boolean);
	if (!firstDay) return rooms;
	const first = recalculateOtaPricingDay(firstDay);

	return rooms.map((room) => ({
		...room,
		pricingByDay: (Array.isArray(room?.pricingByDay)
			? room.pricingByDay
			: []
		).map((day) =>
			recalculateOtaPricingDay(day, {
				clientPrice: first.clientPrice,
				rootPrice: first.rootPrice,
				netAfterExpenses: first.netAfterExpenses,
			}),
		),
	}));
};
