import { isHotelRunnerReservation } from "./hotelRunnerPricingDisplay";

const HOTELRUNNER_SOURCE_PRICING_FIELDS = [
	"hotelId",
	"belongsTo",
	"checkin_date",
	"checkout_date",
	"days_of_residence",
	"pickedRoomsType",
	"pickedRoomsPricing",
	"total_rooms",
	"total_amount",
	"sub_total",
	"extras_total",
	"adjustments_total",
	"tax_total",
	"item_total",
	"currency",
	"commission_ota",
	"adminPricing",
	"adminPricingVisibility",
	"ota_financial_summary",
	"otaFinancialSummary",
	"hotelRunnerPricing",
	"hotelrunnerPricing",
	"supplierData",
	"__reservationDateUpdateIntent",
	"__adminPricingUpdateIntent",
];

// A configured SUPER admin may deliberately correct the local PMS projection.
// HotelRunner identity, ownership and its immutable source snapshot remain
// protected even during that narrowly authorized operation.
const HOTELRUNNER_SUPER_ADMIN_PRICING_FIELDS = new Set([
	"pickedRoomsType",
	"pickedRoomsPricing",
	"total_rooms",
	"total_amount",
	"sub_total",
	"adminPricing",
	"__adminPricingUpdateIntent",
]);

const HOTELRUNNER_SUPER_ADMIN_STAY_FIELDS = new Set([
	"checkin_date",
	"checkout_date",
	"days_of_residence",
	"__reservationDateUpdateIntent",
]);

// These aliases identify the inbound OTA projection itself. They are separate
// from editable guest identity/contact fields and local lifecycle state.
const HOTELRUNNER_SOURCE_IDENTITY_FIELDS = [
	"booking_source",
	"bookingSource",
	"reservation_id",
	"reservationId",
	"confirmation_number",
	"confirmationNumber",
	"confirmation_number2",
	"confirmationNumber2",
	"transport",
	"hrNumber",
];

const HOTELRUNNER_CUSTOMER_SOURCE_IDENTITY_FIELDS = [
	"booking_source",
	"bookingSource",
	"reservation_id",
	"reservationId",
	"confirmation_number",
	"confirmationNumber",
	"confirmation_number2",
	"confirmationNumber2",
];

const HOTELRUNNER_CUSTOMER_CONTAINERS = ["customer_details", "customerDetails"];

const HOTELRUNNER_FINANCE_REVIEW_FIELDS = [
	"commissionData",
	"commissionStatus",
	"commissionPaid",
	"financial_cycle",
];

/**
 * Final client-side boundary for the general reservation editor.
 *
 * HotelRunner owns the projected property, source room type/stay, and source
 * pricing. The PMS physical `roomId` assignment remains locally editable.
 * This editor may save ordinary local reservation fields and, when a super
 * administrator intentionally enters an amount, the standalone PMS platform
 * commission. It must never carry a derived pricing/commercial snapshot back
 * to the API.
 */
export const protectHotelRunnerEditorPayload = (
	reservation,
	payload,
	{
		allowExplicitCommission = false,
		allowExplicitPricing = false,
		allowExplicitStay = false,
	} = {}
) => {
	if (!isHotelRunnerReservation(reservation)) return payload;

	const protectedPayload = { ...(payload || {}) };
	HOTELRUNNER_SOURCE_PRICING_FIELDS.forEach((field) => {
		if (
			(allowExplicitPricing &&
				HOTELRUNNER_SUPER_ADMIN_PRICING_FIELDS.has(field)) ||
			(allowExplicitStay && HOTELRUNNER_SUPER_ADMIN_STAY_FIELDS.has(field))
		) {
			return;
		}
		delete protectedPayload[field];
	});
	HOTELRUNNER_FINANCE_REVIEW_FIELDS.forEach((field) => {
		delete protectedPayload[field];
	});
	HOTELRUNNER_SOURCE_IDENTITY_FIELDS.forEach((field) => {
		delete protectedPayload[field];
	});
	HOTELRUNNER_CUSTOMER_CONTAINERS.forEach((container) => {
		const customerDetails = protectedPayload[container];
		if (
			customerDetails &&
			typeof customerDetails === "object" &&
			!Array.isArray(customerDetails)
		) {
			const protectedCustomerDetails = { ...customerDetails };
			HOTELRUNNER_CUSTOMER_SOURCE_IDENTITY_FIELDS.forEach((field) => {
				delete protectedCustomerDetails[field];
				delete protectedPayload[`${container}.${field}`];
			});
			if (Object.keys(protectedCustomerDetails).length > 0) {
				protectedPayload[container] = protectedCustomerDetails;
			} else {
				delete protectedPayload[container];
			}
			return;
		}

		HOTELRUNNER_CUSTOMER_SOURCE_IDENTITY_FIELDS.forEach((field) => {
			delete protectedPayload[`${container}.${field}`];
		});
	});

	if (!allowExplicitCommission) {
		delete protectedPayload.commission;
	}

	return protectedPayload;
};

/**
 * Preserve every existing finance-cycle permission for legacy reservations,
 * while requiring the separately configured super-administrator identity for
 * a direct HotelRunner reservation. The API remains the final authority; this
 * helper keeps unauthorized HotelRunner controls out of both detail screens.
 */
export const canManageReservationFinanceCycle = ({
	reservation,
	hasLegacyPermission = false,
	isConfiguredSuperAdmin = false,
} = {}) =>
	Boolean(
		hasLegacyPermission &&
			(!isHotelRunnerReservation(reservation) || isConfiguredSuperAdmin),
	);

const RECEIPT_SUPPLIER_FIELDS = ["supplierName", "suppliedBookingNo"];

/**
 * Receipt editors may update only the two user-editable supplier leaves.
 * Dotted keys keep the API update from replacing the supplierData container,
 * which also prevents an inbound HotelRunner snapshot from being echoed back.
 */
export const buildReceiptSupplierUpdatePayload = (editableFields = {}) => {
	const payload = { sendEmail: false };
	RECEIPT_SUPPLIER_FIELDS.forEach((field) => {
		if (Object.prototype.hasOwnProperty.call(editableFields, field)) {
			payload[`supplierData.${field}`] = editableFields[field];
		}
	});
	return payload;
};

/**
 * AlDawleya may edit only the two local hotel-license leaves. Dotted keys keep
 * the source-owned supplierData.hotelRunner snapshot out of the update.
 */
export const buildHotelLicenseSupplierUpdatePayload = (licenseNumber) => ({
	"supplierData.hotelLicenseNo": licenseNumber,
	"supplierData.licenseNumber": licenseNumber,
	sendEmail: false,
});

export {
	HOTELRUNNER_CUSTOMER_SOURCE_IDENTITY_FIELDS,
	HOTELRUNNER_SOURCE_IDENTITY_FIELDS,
	HOTELRUNNER_SOURCE_PRICING_FIELDS,
};
