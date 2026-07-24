import * as XLSX from "xlsx";

import {
	ADMIN_RESERVATION_EXPORT_HEADERS,
	buildAdminReservationExportRows,
} from "./adminReservationExportRows";

test("shared admin export includes room type and assigned room number", () => {
	const [row] = buildAdminReservationExportRows([
		{
			confirmation_number: "CONF-1",
			room_type: "Family Quintuple Room",
			room_number: "424",
			paid_amount: 125,
		},
	]);

	expect(ADMIN_RESERVATION_EXPORT_HEADERS).toContain("Room Type");
	expect(ADMIN_RESERVATION_EXPORT_HEADERS).toContain("Room Number");
	expect(row["Room Type"]).toBe("Family Quintuple Room");
	expect(row["Room Number"]).toBe("424");
	expect(row["Paid Amount (Online)"]).toBe(125);
	expect(row).not.toHaveProperty("Paid Amount");
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
		"Total Amount": 750,
		"Paid Amount (Online)": 225,
		"Room Type": "familyRooms - Family Suite",
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

	expect(row["Room Type"]).toBe("doubleRooms - Double");
	expect(row["Room Number"]).toBe("303");
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
});
