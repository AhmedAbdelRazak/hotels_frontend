export const toLatinDigits = (value) =>
	String(value === null || value === undefined ? "" : value)
		.replace(/[\u0660-\u0669]/g, (digit) =>
			String(digit.charCodeAt(0) - 0x0660),
		)
		.replace(/[\u06f0-\u06f9]/g, (digit) =>
			String(digit.charCodeAt(0) - 0x06f0),
		);
