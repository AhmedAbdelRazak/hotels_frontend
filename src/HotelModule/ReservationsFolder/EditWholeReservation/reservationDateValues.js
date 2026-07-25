import dayjs from "dayjs";

export const dateOnlyKey = (value) => {
	if (!value) return "";
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}

	// Ant Design's DatePicker returns a Day.js object. Passing that object to
	// Moment treats its internal fields as an unknown object and can resolve to
	// today's date, so date-library values must format themselves first.
	if (
		typeof value === "object" &&
		typeof value.isValid === "function" &&
		typeof value.format === "function"
	) {
		return value.isValid() ? value.format("YYYY-MM-DD") : "";
	}

	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

export const datePickerValue = (value) => {
	const key = dateOnlyKey(value);
	return key ? dayjs(key, "YYYY-MM-DD") : null;
};
