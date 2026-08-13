/** @format */

import { formatOtaReservationStatus } from "./otaReservationPresentation";

test("OTA queue statuses use stable operator-facing labels", () => {
	expect(formatOtaReservationStatus("ota platform review")).toBe(
		"OTA Platform Review"
	);
	expect(
		formatOtaReservationStatus("ota platform review", {
			otaPlatformReview: { source: "hotelrunner_api" },
		})
	).toBe("OTA Platform Review");
	expect(
		formatOtaReservationStatus("OTA Platform Review", {
			supplierData: {
				hotelRunner: { transport: "hotelrunner_api" },
			},
		})
	).toBe("OTA Platform Review");
	expect(
		formatOtaReservationStatus("confirmed", {
			otaPlatformReview: { source: "hotelrunner_api" },
		})
	).toBe("Confirmed");
	expect(
		formatOtaReservationStatus("OTA Platform Review", {
			otaPlatformReview: {
				source: "ota_email_create",
				hotelRunnerManaged: true,
			},
		})
	).toBe("OTA Platform Review");
	expect(formatOtaReservationStatus("cancelled")).toBe("Cancelled");
	expect(formatOtaReservationStatus("pending confirmation")).toBe(
		"Pending Confirmation"
	);
});
