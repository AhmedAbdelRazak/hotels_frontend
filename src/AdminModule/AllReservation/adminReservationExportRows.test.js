import * as XLSX from "xlsx";

import {
	ADMIN_RESERVATION_EXPORT_HEADERS,
	buildAdminReservationExportRows,
	getAdminReservationExportHeaders,
} from "./adminReservationExportRows";

test("shared admin export includes room type and assigned room number", () => {
	const [row] = buildAdminReservationExportRows([
		{
			confirmation_number: "CONF-1",
			room_type: "Family Quintuple Room",
			room_number: "424",
			paid_amount: 125,
			booking_source: "agoda",
		},
	]);

	expect(ADMIN_RESERVATION_EXPORT_HEADERS).toContain("Room Type");
	expect(ADMIN_RESERVATION_EXPORT_HEADERS).toContain("Room Number");
	expect(ADMIN_RESERVATION_EXPORT_HEADERS).toContain("Booking Source");
	expect(ADMIN_RESERVATION_EXPORT_HEADERS).toContain(
		"Gross Total (Before OTA Deductions)",
	);
	expect(ADMIN_RESERVATION_EXPORT_HEADERS).toContain(
		"Net Total (After OTA Deductions)",
	);
	expect(ADMIN_RESERVATION_EXPORT_HEADERS).toContain("Currency");
	expect(row["Room Type"]).toBe("Family Quintuple Room");
	expect(row["Room Number"]).toBe("424");
	expect(row["Paid Amount (Online)"]).toBe(125);
	expect(row["Booking Source"]).toBe("agoda");
	expect(row).not.toHaveProperty("Paid Amount");
});

test("shared admin export uses localized month-name-first dates", () => {
	const [english] = buildAdminReservationExportRows([
		{ checkin_date: "2026-07-24T12:00:00.000Z" },
	]);
	const [arabic] = buildAdminReservationExportRows(
		[{ checkin_date: "2026-07-24T12:00:00.000Z" }],
		"ar-SA",
		"Arabic",
	);

	expect(english["Checkin Date"]).toBe("July 24, 2026");
	expect(arabic["Checkin Date"]).toBe("يوليو 24، 2026");
});

test("shared admin export leaves unavailable room fields blank", () => {
	const [row] = buildAdminReservationExportRows([
		{ confirmation_number: "CONF-2" },
	]);

	expect(row["Room Type"]).toBe("");
	expect(row["Room Number"]).toBe("");
});

test("shared admin export uses the exact formatted table values and populated room details", () => {
	const [row] = buildAdminReservationExportRows([
		{
			confirmation_number: "FILTERED-1",
			customer_details: { name: "Filtered Guest", phone: "500000000" },
			hotelId: { hotelName: "Filtered Hotel" },
			total_amount: 900,
			display_total_amount: 750,
			paid_amount: 100,
			paid_amount_display: 225,
			net_total_amount: 600,
			roomDetails: [
				{
					room_type: "familyRooms",
					display_name: "Family Suite",
					room_number: "424",
				},
			],
		},
	]);

	expect(row).toMatchObject({
		Name: "Filtered Guest",
		Phone: "500000000",
		"Hotel Name": "Filtered Hotel",
		"Gross Total (Before OTA Deductions)": 750,
		"Net Total (After OTA Deductions)": 600,
		Currency: "SAR",
		"Paid Amount (Online)": 225,
		"Room Type": "Family Suite",
		"Room Number": "424",
	});
});

test("shared admin export skips placeholder room fields when populated details are available", () => {
	const [row] = buildAdminReservationExportRows([
		{
			room_type: "N/A",
			room_number: "-",
			roomDetails: [
				{ room_type: "doubleRooms", display_name: "Double", room_number: "303" },
			],
		},
	]);

	expect(row["Room Type"]).toBe("Double");
	expect(row["Room Number"]).toBe("303");
});

test("shared admin export removes legacy internal room type prefixes", () => {
	const [row] = buildAdminReservationExportRows([
		{
			room_type: "quadRooms - Quadruple Room – Comfort & Privacy",
		},
	]);

	expect(row["Room Type"]).toBe("Quadruple Room – Comfort & Privacy");
});

test("filtered rows round-trip through the real XLSX library without changing row scope", () => {
	const rows = buildAdminReservationExportRows([
		{ confirmation_number: "FILTER-A", room_number: "101" },
		{ confirmation_number: "FILTER-B", room_number: "" },
	]);
	const worksheet = XLSX.utils.json_to_sheet(rows, {
		header: ADMIN_RESERVATION_EXPORT_HEADERS,
	});
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Reservations");
	const serialized = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
	const restoredWorkbook = XLSX.read(serialized, { type: "array" });
	const restoredRows = XLSX.utils.sheet_to_json(
		restoredWorkbook.Sheets.Reservations,
		{ defval: "" },
	);

	expect(restoredRows).toHaveLength(2);
	expect(restoredRows.map((row) => row["Confirmation Number"])).toEqual([
		"FILTER-A",
		"FILTER-B",
	]);
	expect(restoredRows[0]["Room Number"]).toBe("101");
	expect(restoredRows[1]["Room Number"]).toBe("");
	expect(restoredRows[0]).toHaveProperty("Room Type");
	expect(restoredRows[0]).toHaveProperty("Booking Source");
	expect(restoredRows[0]).toHaveProperty("Gross Total (Before OTA Deductions)");
	expect(restoredRows[0]).toHaveProperty("Net Total (After OTA Deductions)");
	expect(restoredRows[0]).toHaveProperty("Currency");
});

test("Arabic export localizes headers and known status values while preserving booking source", () => {
	const headers = getAdminReservationExportHeaders("Arabic");
	const rows = buildAdminReservationExportRows(
		[
			{
				confirmation_number: "AR-FILTER",
				booking_source: "booking.com",
				reservation_status: "inhouse",
				payment_status: "Captured",
				room_number: "424",
				gross_total_amount: 73.5,
				net_total_amount: 45.47,
				financial_totals_currency: "usd",
			},
		],
		"en-US",
		"Arabic",
	);
	const worksheet = XLSX.utils.json_to_sheet(rows, {
		header: ADMIN_RESERVATION_EXPORT_HEADERS,
	});
	XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "الحجوزات");
	const serialized = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
	const restoredWorkbook = XLSX.read(serialized, { type: "array" });
	const restoredRows = XLSX.utils.sheet_to_json(
		restoredWorkbook.Sheets["الحجوزات"],
		{ defval: "" },
	);

	expect(headers).toHaveLength(ADMIN_RESERVATION_EXPORT_HEADERS.length);
	expect(headers).toContain("مصدر الحجز");
	expect(headers).toContain("نوع الغرفة");
	expect(headers).toContain("رقم الغرفة");
	expect(headers).toContain("إجمالي الحجز قبل خصم مصاريف منصات الحجز (OTA)");
	expect(headers).toContain("صافي الحجز بعد خصم مصاريف منصات الحجز (OTA)");
	expect(headers).toContain("العملة");
	expect(restoredRows).toHaveLength(1);
	expect(restoredRows[0]["رقم التأكيد"]).toBe("AR-FILTER");
	expect(restoredRows[0]["مصدر الحجز"]).toBe("booking.com");
	expect(restoredRows[0]["حالة الحجز"]).toBe("داخل الفندق");
	expect(restoredRows[0]["حالة الدفع"]).toBe("تم التحصيل");
	expect(restoredRows[0]["رقم الغرفة"]).toBe("424");
	expect(
		restoredRows[0]["إجمالي الحجز قبل خصم مصاريف منصات الحجز (OTA)"],
	).toBe(73.5);
	expect(
		restoredRows[0]["صافي الحجز بعد خصم مصاريف منصات الحجز (OTA)"],
	).toBe(45.47);
	expect(restoredRows[0]["العملة"]).toBe("USD");
});

test("gross and net amount cells remain numeric in the generated worksheet", () => {
	const rows = buildAdminReservationExportRows([
		{
			booking_source: "agoda",
			gross_total_amount: "1,234.50",
			net_total_amount: "987.25",
			financial_totals_currency: "eur",
		},
		{
			booking_source: "agoda",
			gross_total_amount: null,
			net_total_amount: null,
			total_amount: 500,
			paid_amount: 500,
		},
		{
			booking_source: "agoda",
			gross_total_amount: 0,
			net_total_amount: -12.5,
			total_amount: 500,
		},
	]);
	const worksheet = XLSX.utils.json_to_sheet(rows, {
		header: ADMIN_RESERVATION_EXPORT_HEADERS,
	});

	expect(rows[0]["Gross Total (Before OTA Deductions)"]).toBe(1234.5);
	expect(rows[0]["Net Total (After OTA Deductions)"]).toBe(987.25);
	expect(rows[0].Currency).toBe("EUR");
	expect(rows[1]["Gross Total (Before OTA Deductions)"]).toBe(500);
	expect(rows[1]["Net Total (After OTA Deductions)"]).toBe(500);
	expect(rows[1].Currency).toBe("SAR");
	expect(rows[2]["Gross Total (Before OTA Deductions)"]).toBe(0);
	expect(rows[2]["Net Total (After OTA Deductions)"]).toBe(-12.5);
	expect(worksheet.J2.t).toBe("n");
	expect(worksheet.K2.t).toBe("n");
	expect(worksheet.L2.v).toBe("EUR");
});

test("export identifiers and room numbers always use Latin digits", () => {
	const [row] = buildAdminReservationExportRows(
		[
			{
				confirmation_number: "OTA-\u0661\u0662\u06f3",
				customer_phone: "+\u0669\u0666\u0666\u0665\u0660",
				room_number: "\u06f4\u06f2\u06f4",
				gross_total_amount: 73.5,
				net_total_amount: 45.47,
			},
		],
		"en-US",
		"Arabic",
	);

	expect(row["Confirmation Number"]).toBe("OTA-123");
	expect(row.Phone).toBe("+96650");
	expect(row["Room Number"]).toBe("424");
});
