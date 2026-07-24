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
