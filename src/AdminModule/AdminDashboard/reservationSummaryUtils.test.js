import {
	buildReservationSummaryExportRows,
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
				activityTypes: ["checkout"],
				checkoutDate: "2026-07-19T00:00:00.000Z",
				totalAmount: 560,
				currency: "SAR",
			},
		],
		{ activityLabels: { checkout: "Check-out" } }
	);

	expect(rows).toHaveLength(1);
	expect(rows[0]["Activity"]).toBe("Check-out");
	expect(rows[0]["Hotel"]).toBe("Zad Ajyad");
	expect(rows[0]["Guest"]).toBe('\'=HYPERLINK("unsafe")');
	expect(rows[0]["Total Amount"]).toBe(560);
	expect(Object.keys(rows[0])).not.toContain("Card Number");
});

test("spreadsheet text keeps normal content and neutralizes formula prefixes", () => {
	expect(spreadsheetSafeText("Normal guest")).toBe("Normal guest");
	expect(spreadsheetSafeText(" +SUM(1,2)")).toBe("' +SUM(1,2)");
});
