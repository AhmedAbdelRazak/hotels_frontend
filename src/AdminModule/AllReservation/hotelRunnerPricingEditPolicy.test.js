import {
	buildHotelLicenseSupplierUpdatePayload,
	buildReceiptSupplierUpdatePayload,
	canManageReservationFinanceCycle,
	protectHotelRunnerEditorPayload,
} from "./hotelRunnerPricingEditPolicy";
import fs from "fs";
import path from "path";

const hotelRunnerReservation = {
	adminPricing: {
		mode: "hotelrunner_api",
		commercialVerified: false,
	},
	supplierData: {
		hotelRunner: { transport: "hotelrunner_api", reservationId: "HR-1" },
	},
};

test("leaves the legacy non-HotelRunner editor payload exactly unchanged", () => {
	const payload = {
		booking_source: "HotelRunner",
		confirmation_number: "LEGACY-CONFIRMATION",
		reservation_id: "LEGACY-RESERVATION",
		customer_details: {
			name: "Legacy Guest",
			confirmation_number2: "LEGACY-OTA",
		},
		total_amount: 300,
		pickedRoomsPricing: [{ room_type: "double" }],
		adminPricing: { commercialVerified: true },
	};

	expect(protectHotelRunnerEditorPayload({}, payload)).toBe(payload);
});

test("strips direct HotelRunner source identity while preserving guest and lifecycle fields", () => {
	const payload = {
		booking_source: "Manual Override",
		bookingSource: "Manual Override Camel",
		reservation_id: "OTA-CHANGED",
		reservationId: "OTA-CHANGED-CAMEL",
		confirmation_number: "ROOT-CHANGED",
		confirmationNumber: "ROOT-CHANGED-CAMEL",
		confirmation_number2: "ROOT-OTA-CHANGED",
		confirmationNumber2: "ROOT-OTA-CHANGED-CAMEL",
		transport: "manual",
		hrNumber: "HR-CHANGED",
		reservation_status: "checked_in",
		state: "inhouse",
		customer_details: {
			name: "Guest Name",
			email: "guest@example.com",
			phone: "0500000000",
			booking_source: "Nested Override",
			confirmation_number: "NESTED-CONFIRMATION",
			confirmation_number2: "NESTED-OTA-CONFIRMATION",
			reservation_id: "NESTED-RESERVATION",
		},
		customerDetails: {
			passport: "P123",
			nationality: "SA",
			bookingSource: "Nested Camel Override",
			confirmationNumber: "NESTED-CAMEL-CONFIRMATION",
			confirmationNumber2: "NESTED-CAMEL-OTA",
			reservationId: "NESTED-CAMEL-RESERVATION",
		},
		"customer_details.confirmationNumber": "DOTTED-CONFIRMATION",
		"customerDetails.booking_source": "DOTTED-SOURCE",
	};

	expect(
		protectHotelRunnerEditorPayload(hotelRunnerReservation, payload),
	).toEqual({
		reservation_status: "checked_in",
		state: "inhouse",
		customer_details: {
			name: "Guest Name",
			email: "guest@example.com",
			phone: "0500000000",
		},
		customerDetails: {
			passport: "P123",
			nationality: "SA",
		},
	});
});

test("drops an emptied nested identity container instead of sending a destructive empty object", () => {
	expect(
		protectHotelRunnerEditorPayload(hotelRunnerReservation, {
			customerDetails: { confirmation_number2: "OTA-ONLY" },
			comment: "Keep this local note",
		}),
	).toEqual({ comment: "Keep this local note" });
});

test("keeps legacy early-checkout totals but strips them from HotelRunner status payloads", () => {
	const earlyCheckout = {
		reservation_status: "early_checked_out",
		state: "early_checked_out",
		checkout_date: "2026-08-06",
		__reservationDateUpdateIntent: true,
		days_of_residence: 2,
		total_amount: 400,
	};

	expect(protectHotelRunnerEditorPayload({}, earlyCheckout)).toBe(earlyCheckout);
	expect(
		protectHotelRunnerEditorPayload(hotelRunnerReservation, earlyCheckout),
	).toEqual({
		reservation_status: "early_checked_out",
		state: "early_checked_out",
	});
});

test("keeps a HotelRunner operational relocation status without sending hotel ownership", () => {
	const relocation = {
		belongsTo: "new-owner",
		hotelId: "new-hotel",
		state: "relocated",
		requestingUserId: "admin-1",
	};

	expect(protectHotelRunnerEditorPayload({}, relocation)).toBe(relocation);
	expect(
		protectHotelRunnerEditorPayload(hotelRunnerReservation, relocation),
	).toEqual({ state: "relocated", requestingUserId: "admin-1" });
});

test("keeps HotelRunner check-in operations but strips echoed source projection fields", () => {
	const checkin = {
		state: "inhouse",
		inhouse_date: "2026-08-06T12:00:00.000Z",
		requestingUserId: "hotel-user",
		roomId: ["room-2"],
		checkin_date: "2026-08-06",
		checkout_date: "2026-08-08",
		days_of_residence: 2,
		pickedRoomsType: [{ room_type: "double" }],
		pickedRoomsPricing: [{ room_type: "double" }],
		total_amount: 900,
		sub_total: 700,
		adjustments_total: -25,
	};

	expect(
		protectHotelRunnerEditorPayload(hotelRunnerReservation, checkin),
	).toEqual({
		state: "inhouse",
		inhouse_date: "2026-08-06T12:00:00.000Z",
		requestingUserId: "hotel-user",
		roomId: ["room-2"],
	});
});

test("keeps explicit local physical-room assignment intent for HotelRunner reservations", () => {
	expect(
		protectHotelRunnerEditorPayload(hotelRunnerReservation, {
			roomId: ["room-606"],
			__roomAssignmentUpdateIntent: true,
			pickedRoomsType: [{ room_type: "familyRooms" }],
			total_amount: 150,
		}),
	).toEqual({
		roomId: ["room-606"],
		__roomAssignmentUpdateIntent: true,
	});
});

test("receipt supplier updates contain only editable dotted leaves", () => {
	const payload = buildReceiptSupplierUpdatePayload({
		supplierName: "Updated Supplier",
		suppliedBookingNo: "SUP-22",
		hotelRunner: { reservationId: "HR-DO-NOT-SEND", pricing: { grandTotal: 999 } },
		otaAmountSar: 999,
	});

	expect(payload).toEqual({
		"supplierData.supplierName": "Updated Supplier",
		"supplierData.suppliedBookingNo": "SUP-22",
		sendEmail: false,
	});
	expect(payload).not.toHaveProperty("supplierData");
	expect(JSON.stringify(payload)).not.toContain("hotelRunner");
});

test("receipt supplier leaves remain editable while HotelRunner booking source is protected", () => {
	const receiptPayload = buildReceiptSupplierUpdatePayload({
		supplierName: "Updated Supplier",
		suppliedBookingNo: "SUP-22",
	});
	receiptPayload.booking_source = "Manual Override";
	receiptPayload.payment = "paid offline";

	expect(
		protectHotelRunnerEditorPayload(hotelRunnerReservation, receiptPayload),
	).toEqual({
		"supplierData.supplierName": "Updated Supplier",
		"supplierData.suppliedBookingNo": "SUP-22",
		payment: "paid offline",
		sendEmail: false,
	});
});

test("AlDawleya hotel-license updates contain only precise dotted leaves", () => {
	expect(buildHotelLicenseSupplierUpdatePayload("LICENSE-22")).toEqual({
		"supplierData.hotelLicenseNo": "LICENSE-22",
		"supplierData.licenseNumber": "LICENSE-22",
		sendEmail: false,
	});
});

test("removes HotelRunner source pricing and fabricated commercial review fields", () => {
	const payload = {
		userId: "admin-1",
		customerDetails: { name: "Updated locally" },
		checkin_date: "2026-08-10",
		checkout_date: "2026-08-12",
		days_of_residence: 2,
		roomId: ["room-2"],
		__reservationDateUpdateIntent: true,
		advancePayment: { finalAdvancePayment: "50.00" },
		hotelId: "another-hotel",
		pickedRoomsType: [{ room_type: "double" }],
		pickedRoomsPricing: [{ room_type: "double" }],
		total_rooms: 1,
		total_amount: 999,
		sub_total: 700,
		adminPricing: {
			commercialVerified: true,
			netAfterExpensesTotal: 900,
			otaExpenseTotal: 99,
			platformMarginTotal: 200,
		},
		ota_financial_summary: { commercialVerified: true },
		commission: 299,
		commission_ota: 99,
		commissionData: { assigned: true, amount: 299 },
		financial_cycle: { commissionAssigned: true, commissionAmount: 299 },
		commissionPaid: true,
		__adminPricingUpdateIntent: true,
	};

	expect(
		protectHotelRunnerEditorPayload(hotelRunnerReservation, payload)
	).toEqual({
		userId: "admin-1",
		customerDetails: { name: "Updated locally" },
		roomId: ["room-2"],
		advancePayment: { finalAdvancePayment: "50.00" },
	});
});

test("permits only an explicitly authorized standalone HotelRunner commission", () => {
	const result = protectHotelRunnerEditorPayload(
		{
			supplierData: {
				hotelRunner: { reservationId: "HR-2" },
			},
		},
		{
			userId: "super-admin",
			commission: 0,
			commissionData: { assigned: true, amount: 0 },
			adminPricing: { commercialVerified: true },
		},
		{ allowExplicitCommission: true }
	);

	expect(result).toEqual({ userId: "super-admin", commission: 0 });
});

test("permits a SUPER admin pricing and stay correction without exposing HotelRunner identity or source snapshots", () => {
	const pricingRows = [
		{
			room_type: "familyRooms",
			displayName: "Spacious Six-Bed Room",
			hotelRoomConfigId: "6a4a84216022cd7f31729011",
			sourceRoomName: "Family - 6 Persons",
			pricingByDay: [
				{
					date: "2026-08-07",
					clientPrice: 91.14,
					rootPrice: 75,
				},
			],
		},
	];
	const result = protectHotelRunnerEditorPayload(
		hotelRunnerReservation,
		{
			userId: "super-admin",
			pickedRoomsType: pricingRows,
			pickedRoomsPricing: pricingRows,
			total_rooms: 1,
			total_amount: 91.14,
			sub_total: 75,
			adminPricing: {
				mode: "hotelrunner_api",
				clientTotal: 91.14,
				rootTotal: 75,
			},
			checkin_date: "2026-08-07",
			checkout_date: "2026-08-09",
			days_of_residence: 2,
			__reservationDateUpdateIntent: true,
			__adminPricingUpdateIntent: true,
			hotelId: "different-hotel",
			supplierData: { hotelRunner: { reservationId: "tampered" } },
			commission_ota: 999,
		},
		{ allowExplicitPricing: true, allowExplicitStay: true },
	);

	expect(result).toEqual({
		userId: "super-admin",
		pickedRoomsType: pricingRows,
		pickedRoomsPricing: pricingRows,
		total_rooms: 1,
		total_amount: 91.14,
		sub_total: 75,
		adminPricing: {
			mode: "hotelrunner_api",
			clientTotal: 91.14,
			rootTotal: 75,
		},
		checkin_date: "2026-08-07",
		checkout_date: "2026-08-09",
		days_of_residence: 2,
		__reservationDateUpdateIntent: true,
		__adminPricingUpdateIntent: true,
	});
});

test("keeps legacy finance permissions but gates HotelRunner finance to the configured super admin", () => {
	expect(
		canManageReservationFinanceCycle({
			reservation: {},
			hasLegacyPermission: true,
			isConfiguredSuperAdmin: false,
		}),
	).toBe(true);
	expect(
		canManageReservationFinanceCycle({
			reservation: hotelRunnerReservation,
			hasLegacyPermission: true,
			isConfiguredSuperAdmin: false,
		}),
	).toBe(false);
	expect(
		canManageReservationFinanceCycle({
			reservation: hotelRunnerReservation,
			hasLegacyPermission: true,
			isConfiguredSuperAdmin: true,
		}),
	).toBe(true);
	expect(
		canManageReservationFinanceCycle({
			reservation: hotelRunnerReservation,
			hasLegacyPermission: false,
			isConfiguredSuperAdmin: true,
		}),
	).toBe(false);
});

test("the admin editor keeps source locking except for explicit SUPER admin OTA corrections", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "EditReservationMain.js"),
		"utf8"
	);

	expect(source).toMatch(/isHotelRunnerReservation\(reservation\)/);
	expect(source).toMatch(
		/pricingPayloadNeeded\s*=\s*\(!directHotelRunnerReservation \|\| superAdminOtaOverride\)/
	);
	expect(source).toMatch(/protectHotelRunnerEditorPayload\(/);
	expect(source).toMatch(
		/hotelRunnerSourceOwned=\{hotelRunnerSourceEditingLocked\}/
	);
	expect(source).toMatch(/allowExplicitPricing:/);
	expect(source).toMatch(/allowExplicitStay:/);
	expect(source).toMatch(
		/const handleRoomCountChange[\s\S]*?if \(directHotelRunnerReservation\) return;/
	);
	expect(source).toMatch(
		/const addRoomSelection[\s\S]*?if \(directHotelRunnerReservation\) return;/
	);
	expect(source).toMatch(/hotelRunnerCommercialVerified=/);
	expect(source).toMatch(
		/\(!directHotelRunnerReservation && !superAdminOtaOverride\) \|\|\s*hasExplicitAdvancePaymentEdit/,
	);
});

test.each([
	[
		"../../HotelModule/HotelReports/MoreDetails.js",
		/if \(!hotelRunnerPricing\.isHotelRunner\) \{[\s\S]{0,500}updateData\.total_amount/,
	],
	[
		"../../HotelModule/ReservationsFolder/ReservationDetail.js",
		/if \(!isHotelRunnerFinanceReservation\) \{[\s\S]{0,500}updateData\.total_amount/,
	],
])("%s does not derive an early-checkout total for HotelRunner", (file, guard) => {
	const source = fs.readFileSync(path.resolve(__dirname, file), "utf8");
	expect(source).toMatch(guard);
	expect(source).toMatch(/protectHotelRunnerEditorPayload\(/);
	expect(source).toMatch(
		/updateSingleReservation\(reservation\._id, safeUpdateData\)/,
	);
});

const countMatches = (source, pattern) => (source.match(pattern) || []).length;

test("the active hotel editor protects both outgoing update branches", () => {
	const source = fs.readFileSync(
		path.resolve(
			__dirname,
			"../../HotelModule/ReservationsFolder/EditWholeReservation/EditReservationMain.js",
		),
		"utf8",
	);

	expect(source).toMatch(/protectHotelRunnerEditorPayload/);
	expect(countMatches(source, /protectHotelRunnerEditorPayload\(/g)).toBe(2);
	expect(
		countMatches(
			source,
			/updateHotelManagementReservation\(\s*reservation\._id,\s*safeUpdateData/gs,
		),
	).toBe(2);
});

test("both admin early-checkout handlers and relocation protect outgoing payloads", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "MoreDetails.js"),
		"utf8",
	);

	expect(countMatches(source, /protectHotelRunnerEditorPayload\(/g)).toBeGreaterThanOrEqual(3);
	expect(
		countMatches(
			source,
			/updateSingleReservation\(reservation\._id, safeUpdateData\)/g,
		),
	).toBeGreaterThanOrEqual(3);
});

test.each([
	"MoreDetails.js",
	"../../HotelModule/ReservationsFolder/ReservationDetail.js",
])("%s gates and protects HotelRunner finance-cycle updates", (file) => {
	const source = fs.readFileSync(path.resolve(__dirname, file), "utf8");
	const handlerStart = source.indexOf("const handleSaveFinanceCycle");
	const handlerSource = source.slice(handlerStart, handlerStart + 5200);

	expect(handlerStart).toBeGreaterThanOrEqual(0);
	expect(source).toMatch(/canManageReservationFinanceCycle\(\{/);
	expect(handlerSource).toMatch(/if \(!canManageFinanceCycle\)/);
	expect(handlerSource).toMatch(
		/protectHotelRunnerEditorPayload\(\s*reservation,\s*updateData,\s*\{ allowExplicitCommission: isConfiguredSuperAdmin \}/,
	);
	expect(handlerSource).toMatch(
		/updateSingleReservation\(reservation\._id, safeUpdateData\)/,
	);
});

test.each([
	"../../HotelModule/HotelReports/MoreDetails.js",
	"../../HotelModule/ReservationsFolder/ReservationDetail.js",
])("%s protects its relocation payload", (file) => {
	const source = fs.readFileSync(path.resolve(__dirname, file), "utf8");
	const relocationStart = source.indexOf("const handleUpdateReservationStatus3");
	const relocationSource = source.slice(relocationStart, relocationStart + 2200);

	expect(relocationStart).toBeGreaterThanOrEqual(0);
	expect(relocationSource).toMatch(/protectHotelRunnerEditorPayload\(/);
	expect(relocationSource).toMatch(
		/updateSingleReservation\(reservation\._id, safeUpdateData\)/,
	);
});

test("AlDawleya uses the precise hotel-license leaf builder", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "AlDawleya.js"),
		"utf8",
	);

	expect(source).toMatch(/buildHotelLicenseSupplierUpdatePayload\(nextValue\)/);
	expect(source).not.toMatch(/supplierData:\s*\{[\s\S]{0,300}hotelLicenseNo/);
});

test("the check-in update protects its outgoing payload", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "../../HotelModule/NewReservation/NewReservationMain.js"),
		"utf8",
	);

	expect(source).toMatch(
		/const safeUpdatePayload = protectHotelRunnerEditorPayload\(\s*searchedReservation/,
	);
	expect(source).toMatch(
		/updateSingleReservation\(searchedReservation\._id, safeUpdatePayload\)/,
	);
});

test("the official receipt protects source identity at its final update boundary", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "ReceiptPDF.js"),
		"utf8",
	);

	expect(source).toMatch(
		/const safeUpdateData = protectHotelRunnerEditorPayload\(\s*localResv,\s*updateData/,
	);
	expect(source).toMatch(
		/updateSingleReservation\(localResv\._id, safeUpdateData\)/,
	);
});
