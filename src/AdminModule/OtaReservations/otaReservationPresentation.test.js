/** @format */

import { formatOtaReservationStatus } from "./otaReservationPresentation";

test("OTA queue statuses use stable operator-facing labels", () => {
	expect(formatOtaReservationStatus("ota platform review")).toBe(
		"OTA Platform Review"
	);
	expect(formatOtaReservationStatus("cancelled")).toBe("Cancelled");
	expect(formatOtaReservationStatus("pending confirmation")).toBe(
		"Pending Confirmation"
	);
});
