const dateOnlyKey = (value) => {
	if (!value) return "";
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime())
		? ""
		: parsed.toISOString().slice(0, 10);
};

const moneyNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const finalNightlyPrice = (row = {}, fallback = 0) => {
	const value = moneyNumber(
		row?.totalPriceWithCommission ?? row?.price,
		fallback,
	);
	return value > 0 ? value : moneyNumber(fallback, 0);
};

const buildInheritedRow = (template = {}, date, fallbackPrice = 0) => {
	const inheritedPrice = finalNightlyPrice(template, fallbackPrice);
	return {
		...template,
		date,
		price: inheritedPrice,
		totalPriceWithCommission: inheritedPrice,
		totalPriceWithoutCommission:
			template?.totalPriceWithoutCommission === undefined
				? inheritedPrice
				: template.totalPriceWithoutCommission,
	};
};

export const reconcilePricingRowsToStay = ({
	existingRows = [],
	stayDates = [],
	fallbackNightlyPrice = 0,
} = {}) => {
	const expectedDates = (Array.isArray(stayDates) ? stayDates : [])
		.map(dateOnlyKey)
		.filter(Boolean);
	if (!expectedDates.length || !Array.isArray(existingRows) || !existingRows.length) {
		return [];
	}

	const sortedRows = existingRows
		.map((row, index) => ({
			row,
			index,
			date: dateOnlyKey(row?.date || row?.calendarDate),
		}))
		.filter((entry) => entry.row && typeof entry.row === "object")
		.sort((left, right) => {
			if (!left.date && !right.date) return left.index - right.index;
			if (!left.date) return 1;
			if (!right.date) return -1;
			return left.date.localeCompare(right.date);
		});
	if (!sortedRows.length) return [];

	return expectedDates.map((date, index) => {
		const exact = sortedRows.find((entry) => entry.date === date)?.row;
		if (exact) return { ...exact, date };

		const previous = sortedRows
			.filter((entry) => entry.date && entry.date < date)
			.pop()?.row;
		const next = sortedRows.find(
			(entry) => entry.date && entry.date > date,
		)?.row;
		const template =
			previous || next || sortedRows[index % sortedRows.length]?.row || {};
		return buildInheritedRow(template, date, fallbackNightlyPrice);
	});
};

export const totalFromRoomPricingRows = (rooms = []) =>
	Number(
		(Array.isArray(rooms) ? rooms : [])
			.reduce(
				(total, room) =>
					total +
					Math.max(1, Number(room?.count) || 1) *
					(Array.isArray(room?.pricingByDay)
						? room.pricingByDay.reduce(
								(sum, day) => sum + finalNightlyPrice(day, 0),
								0,
						  )
						: 0),
				0,
			)
			.toFixed(2),
	);
