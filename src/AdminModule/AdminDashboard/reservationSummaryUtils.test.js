import * as XLSX from "xlsx";

import {
	RESERVATION_SUMMARY_EXPORT_HEADERS,
	buildReservationSummaryExportRows,
	formatReservationSummaryDate,
	getReservationSummaryExportHeaders,
	reservationActivityText,
	spreadsheetSafeText,
} from "./reservationSummaryUtils";

test("reservation activity text combines every summary reason", () => {
	expect(
		reservationActivityText(["checkin", "new-reservation"], {
			checkin: "Check-in",
			"new-reservation": "New reservation",
		})
	).toBe("Check-in, New reservation");
});

test("executive export contains professional fields without private payment data", () => {
	const rows = buildReservationSummaryExportRows(
		[
			{
				confirmationNumber: "CONF-1",
				hotel: { name: "Zad Ajyad" },
				guestName: '=HYPERLINK("unsafe")',
				roomTypes: ["doubleRooms - City View"],
				roomNumbers: ["101", "305"],
				activityTypes: ["checkout"],
				checkoutDate: "2026-07-19T00:00:00.000Z",
				createdAt: "2026-07-19T18:46:08.000Z",
				nights: 8,
				averageNightlyAmount: 70,
				totalAmount: 560,
				grossTotalAmount: 560,
				netTotalAmount: 510,
				grossTotalAvailable: true,
				netTotalAvailable: true,
				financialTotalsCurrency: "SAR",
				amountQuality: { status: "verified" },
				currency: "SAR",
			},
		],
		{ activityLabels: { checkout: "Check-out" } }
	);

	expect(rows).toHaveLength(1);
	expect(rows[0]["Activity"]).toBe("Check-out");
	expect(rows[0]["Hotel"]).toBe("Zad Ajyad");
	expect(rows[0]["Guest"]).toBe('\'=HYPERLINK("unsafe")');
	expect(rows[0]["Room Type"]).toBe("City View");
	expect(rows[0]["Room Number"]).toBe("101, 305");
	expect(rows[0]["Total Amount"]).toBe(560);
	expect(rows[0]["Gross Total (Before OTA Deductions)"]).toBe(560);
	expect(rows[0]["Net Total (After OTA Deductions)"]).toBe(510);
	expect(rows[0]["Nights"]).toBe(8);
	expect(rows[0]["Average Per Night"]).toBe(70);
	expect(rows[0]["Amount Verification"]).toBe("verified");
	expect(rows[0]["Created"]).not.toMatch(/:/);
	expect(Object.keys(rows[0])).not.toContain("Card Number");
});

test("spreadsheet text keeps normal content and neutralizes formula prefixes", () => {
	expect(spreadsheetSafeText("Normal guest")).toBe("Normal guest");
	expect(spreadsheetSafeText(" +SUM(1,2)")).toBe("' +SUM(1,2)");
	expect(spreadsheetSafeText("OTA-\u0661\u0662\u06f3")).toBe("OTA-123");
});

test("executive export header order is complete and localized", () => {
	expect(RESERVATION_SUMMARY_EXPORT_HEADERS).toEqual([
		"Activity",
		"Confirmation Number",
		"Hotel",
		"Guest",
		"Room Type",
		"Room Number",
		"Check-in",
		"Check-out",
		"Created",
		"Status",
		"Rooms",
		"Guests",
		"Nights",
		"Average Per Night",
		"Total Amount",
		"Gross Total (Before OTA Deductions)",
		"Net Total (After OTA Deductions)",
		"Amount Verification",
		"Currency",
		"Booking Source",
	]);
	const arabicHeaders = getReservationSummaryExportHeaders("ar-SA-u-nu-latn");
	expect(arabicHeaders).toHaveLength(RESERVATION_SUMMARY_EXPORT_HEADERS.length);
	expect(arabicHeaders[15]).toBe(
		"إجمالي الحجز قبل خصم مصاريف منصات الحجز (OTA)",
	);
	expect(arabicHeaders[16]).toBe(
		"صافي الحجز بعد خصم مصاريف منصات الحجز (OTA)",
	);
	expect(arabicHeaders[18]).toBe("العملة");
});

test("executive export falls unavailable totals back safely and preserves zero or negative values", () => {
	const rows = buildReservationSummaryExportRows([
		{
			grossTotalAmount: 0,
			netTotalAmount: -12.5,
			grossTotalAvailable: true,
			netTotalAvailable: true,
			financialTotalsCurrency: "usd",
		},
		{
			grossTotalAmount: null,
			netTotalAmount: null,
			grossTotalAvailable: false,
			netTotalAvailable: false,
			totalAmount: 500,
			paidAmount: 500,
			rootTotal: 550,
		},
		{
			grossTotalAmount: null,
			netTotalAmount: 0,
			grossTotalAvailable: false,
			netTotalAvailable: true,
			totalAmount: -20,
		},
	]);

	expect(rows[0]["Gross Total (Before OTA Deductions)"]).toBe(0);
	expect(rows[0]["Net Total (After OTA Deductions)"]).toBe(-12.5);
	expect(rows[0].Currency).toBe("USD");
	expect(rows[1]["Gross Total (Before OTA Deductions)"]).toBe(500);
	expect(rows[1]["Net Total (After OTA Deductions)"]).toBe(500);
	expect(rows[1]["Total Amount"]).toBe(500);
	expect(rows[1].Currency).toBe("SAR");
	expect(rows[2]["Gross Total (Before OTA Deductions)"]).toBe(-20);
	expect(rows[2]["Net Total (After OTA Deductions)"]).toBe(0);
});

test("Arabic executive export round-trips numeric totals with Latin identifiers and dates", () => {
	const rows = buildReservationSummaryExportRows(
		[
			{
				confirmationNumber: "OTA-\u0661\u0662\u06f3",
				checkinDate: "2026-07-19T00:00:00.000Z",
				grossTotalAmount: 73.5,
				netTotalAmount: 45.47,
				grossTotalAvailable: true,
				netTotalAvailable: true,
				financialTotalsCurrency: "sar",
			},
		],
		{ locale: "ar-SA-u-nu-latn" },
	);
	const worksheet = XLSX.utils.json_to_sheet(rows, {
		header: RESERVATION_SUMMARY_EXPORT_HEADERS,
	});
	XLSX.utils.sheet_add_aoa(
		worksheet,
		[getReservationSummaryExportHeaders("ar-SA-u-nu-latn")],
		{ origin: "A1" },
	);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "ملخص الحجوزات");
	const serialized = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
	const restored = XLSX.read(serialized, { type: "array" });
	const [row] = XLSX.utils.sheet_to_json(restored.Sheets["ملخص الحجوزات"], {
		defval: "",
	});

	expect(row["رقم التأكيد"]).toBe("OTA-123");
	expect(row["تاريخ الوصول"]).toBe("يوليو 19، 2026");
	expect(
		row["إجمالي الحجز قبل خصم مصاريف منصات الحجز (OTA)"],
	).toBe(73.5);
	expect(
		row["صافي الحجز بعد خصم مصاريف منصات الحجز (OTA)"],
	).toBe(45.47);
	expect(row["العملة"]).toBe("SAR");
});

test("executive export leaves unavailable room fields blank", () => {
	const [row] = buildReservationSummaryExportRows([{}]);

	expect(row["Room Type"]).toBe("");
	expect(row["Room Number"]).toBe("");
});

test("Arabic Miladi and Hijri dates put the localized month name first", () => {
	const value = "2026-07-19T18:46:08.000Z";
	const miladi = formatReservationSummaryDate(value, {
		locale: "ar-SA",
		calendar: "gregory",
		month: "long",
	});
	const hijri = formatReservationSummaryDate(value, {
		locale: "ar-SA",
		calendar: "islamic-umalqura",
		month: "long",
	});

	expect(miladi).toBe("يوليو 19، 2026");
	expect(hijri).toMatch(/^صفر 5، 1448/);
	expect(`${miladi}${hijri}`).not.toMatch(/[\u0660-\u0669]/);
	expect(`${miladi}${hijri}`).not.toMatch(/:/);
});
