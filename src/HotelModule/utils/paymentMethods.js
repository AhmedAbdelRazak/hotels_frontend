/** @format */

export const PAYMENT_METHOD_OPTIONS = [
	{
		value: "paid offline",
		label: "Pay To Hotel",
		arLabel: "الدفع للفندق",
	},
	{
		value: "paid online",
		label: "Paid Online",
		arLabel: "مدفوع إلكترونياً",
	},
	{
		value: "not paid",
		label: "Not Paid",
		arLabel: "غير مدفوع",
	},
	{
		value: "bank transfer to hotel",
		label: "Bank Transfer To Hotel",
		arLabel: "تحويل بنكي للفندق",
	},
	{
		value: "other",
		label: "Other",
		arLabel: "أخرى",
	},
];

const PAYMENT_ALIASES = {
	"pay to hotel": "paid offline",
	"pay at hotel": "paid offline",
	"paid at hotel": "paid offline",
	"paid to hotel": "paid offline",
	cash: "paid offline",
	"credit/ debit": "paid online",
	"credit/debit": "paid online",
	"credit debit": "paid online",
	deposit: "paid online",
	"bank transfer": "bank transfer to hotel",
	"bank transfer to zad": "bank transfer to hotel",
};

export const normalizePaymentMethod = (value, fallback = "not paid") => {
	const raw = String(value || "").trim().toLowerCase();
	if (!raw) return fallback;
	return PAYMENT_ALIASES[raw] || raw;
};

export const getPaymentMethodLabel = (value, isArabic = false) => {
	const normalized = normalizePaymentMethod(value, "");
	const option = PAYMENT_METHOD_OPTIONS.find((item) => item.value === normalized);
	if (option) return isArabic ? option.arLabel : option.label;
	return value || "";
};

export const paymentMethodOptionsWithCurrent = (currentValue) => {
	const normalizedCurrent = normalizePaymentMethod(currentValue, "");
	const hasCurrent =
		!normalizedCurrent ||
		PAYMENT_METHOD_OPTIONS.some((item) => item.value === normalizedCurrent);
	return hasCurrent
		? PAYMENT_METHOD_OPTIONS
		: [
				{
					value: normalizedCurrent,
					label: currentValue,
					arLabel: currentValue,
				},
				...PAYMENT_METHOD_OPTIONS,
		  ];
};
