/** @format */

import { normalizeId, titleCase } from "../overallShared";

export const pricingAssignmentKey = (
	priceVariantDataId = "",
	priceVariantItemId = ""
) => `${normalizeId(priceVariantDataId)}:${normalizeId(priceVariantItemId)}`;

const uniqueIds = (values = []) => [
	...new Set((Array.isArray(values) ? values : [values]).map(normalizeId).filter(Boolean)),
];

const moneyText = (value) => {
	const amount = Number(value || 0);
	if (!Number.isFinite(amount)) return "0";
	return amount.toLocaleString("en-US", {
		maximumFractionDigits: 2,
		minimumFractionDigits: amount % 1 ? 2 : 0,
	});
};

export const buildPriceVariantAssignmentOptions = ({
	priceVariantData = [],
	hotelIds = [],
	isRTL = false,
} = {}) => {
	const selectedHotelIds = new Set(uniqueIds(hotelIds));
	if (!selectedHotelIds.size) return [];
	return (Array.isArray(priceVariantData) ? priceVariantData : []).flatMap(
		(variantData) => {
			const variantHotelIds = uniqueIds(variantData?.hotelIds);
			const scopedHotelIds = variantHotelIds.filter((hotelId) =>
				selectedHotelIds.has(hotelId)
			);
			if (!scopedHotelIds.length || variantData?.active === false) return [];
			const hotelNames = Array.isArray(variantData?.hotelNames)
				? variantData.hotelNames.filter(Boolean)
				: [];
			const hotelLabel = hotelNames.length
				? hotelNames.map((name) => titleCase(name)).join(", ")
				: scopedHotelIds.join(", ");

			return (Array.isArray(variantData?.pricingItems)
				? variantData.pricingItems
				: []
			)
				.filter(
					(item) =>
						item &&
						String(item.status || "open").toLowerCase() !== "blocked" &&
						Number(item.sellingPrice || 0) > 0
				)
				.map((item) => {
					const labelName =
						(isRTL && item.nameOtherLanguage) || item.name || item.nameOtherLanguage;
					const value = pricingAssignmentKey(variantData._id, item._id);
					const label = `${labelName || "Pricing"} - ${moneyText(
						item.sellingPrice
					)}${hotelLabel ? ` (${hotelLabel})` : ""}`;
					return {
						value,
						label,
						priceVariantDataId: normalizeId(variantData._id),
						priceVariantItemId: normalizeId(item._id),
						pricingName: item.name || "",
						pricingNameOtherLanguage: item.nameOtherLanguage || "",
						hotelIds: scopedHotelIds,
					};
				});
		}
	);
};

export const buildPriceVariantAssignmentsFromKeys = (
	keys = [],
	options = []
) => {
	const optionMap = new Map((Array.isArray(options) ? options : []).map((option) => [
		option.value,
		option,
	]));
	return uniqueIds(keys)
		.map((key) => optionMap.get(key))
		.filter(Boolean)
		.map((option) => ({
			priceVariantDataId: option.priceVariantDataId,
			priceVariantItemId: option.priceVariantItemId,
			pricingName: option.pricingName,
			pricingNameOtherLanguage: option.pricingNameOtherLanguage,
			hotelIds: option.hotelIds,
		}));
};

export const pricingAssignmentKeysFromAssignments = (assignments = []) =>
	uniqueIds(
		(Array.isArray(assignments) ? assignments : [])
			.map((assignment) =>
				pricingAssignmentKey(
					assignment?.priceVariantDataId,
					assignment?.priceVariantItemId
				)
			)
			.filter((key) => key && !key.startsWith(":") && !key.endsWith(":"))
	);
