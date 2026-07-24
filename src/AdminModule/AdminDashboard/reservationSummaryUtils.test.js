import {
	buildReservationSummaryExportRows,
	formatReservationSummaryDate,
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
	expect(rows[0]["Nights"]).toBe(8);
	expect(rows[0]["Average Per Night"]).toBe(70);
	expect(rows[0]["Amount Verification"]).toBe("verified");
	expect(rows[0]["Created"]).not.toMatch(/:/);
	expect(Object.keys(rows[0])).not.toContain("Card Number");
});

test("spreadsheet text keeps normal content and neutralizes formula prefixes", () => {
	expect(spreadsheetSafeText("Normal guest")).toBe("Normal guest");
	expect(spreadsheetSafeText(" +SUM(1,2)")).toBe("' +SUM(1,2)");
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
