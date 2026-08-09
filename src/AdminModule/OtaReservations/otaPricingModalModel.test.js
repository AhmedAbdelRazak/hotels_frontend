/** @format */

import {
	applyTouchedOtaDistributions,
	formatOtaAdminListGuestGross,
	formatOtaPricingModalGuestGross,
	formatOtaPricingModalPayout,
	normalizeOtaPricingRoomsForModal,
	otaPricingInitializationDecision,
	otaPricingNumberValue,
	parseLocalizedMoney,
	preferredOtaPricingRooms,
	prepareOtaPricingSave,
	resolveInitialOtaCommissionInput,
	resolveOtaPricingModalSavedTotals,
	resolveSavedOtaCommission,
	roundOtaMoney,
	summarizeOtaPricingRoomsForModal,
} from "./otaPricingModalModel";
import { recalculateOtaPricingDay } from "./otaPricingEditor";
import { getReservationGuestGrossDisplay } from "../AllReservation/hotelRunnerPricingDisplay";

const day = (date, clientPrice, rootPrice, netAfterExpenses) => ({
	date,
	price: clientPrice,
	clientPrice,
	mainPrice: clientPrice,
	totalPriceWithCommission: clientPrice,
	rootPrice,
	totalPriceWithoutCommission: rootPrice,
	netAfterExpenses,
	netAfterOtaExpenses: netAfterExpenses,
	otaExpenseAmount: clientPrice - netAfterExpenses,
	platformMargin: netAfterExpenses - rootPrice,
});

describe("localized OTA pricing money", () => {
	test("matches the backend grammar for localized decimals and grouping", () => {
		expect(parseLocalizedMoney("82,50")).toMatchObject({
			status: "valid",
			value: 82.5,
		});
		expect(parseLocalizedMoney("82.50")).toMatchObject({
			status: "valid",
			value: 82.5,
		});
		expect(parseLocalizedMoney("\u200f١٬٢٣٤٫٥٠\u200e")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("\u2066۱٬۲۳۴٫۵۰\u2069")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("1,234.50")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("1.234,50")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("1 234,50")).toMatchObject({
			status: "valid",
			value: 1234.5,
		});
		expect(parseLocalizedMoney("۱٬۲۳۴")).toMatchObject({
			status: "valid",
			value: 1234,
		});
		expect(parseLocalizedMoney("-۱۲٫۵")).toMatchObject({
			status: "valid",
			value: -12.5,
		});
	});

	test("distinguishes missing input and rejects values the backend rejects", () => {
		expect(parseLocalizedMoney(" \u200f ").status).toBe("missing");
		expect(parseLocalizedMoney(null).status).toBe("missing");
		for (const value of [
			"١٢x",
			"--12",
			"−۱۲٫۵",
			"82.500",
			"82,500",
			"82.5000",
			"1234,567",
			"1,23,4",
			"82,",
			".50",
			"1 23,50",
			"٨٢٬٥٠",
		]) {
			expect(parseLocalizedMoney(value).status).toBe("invalid");
		}
		expect(parseLocalizedMoney(82.555).status).toBe("invalid");
		expect(parseLocalizedMoney("90071992547410").status).toBe("invalid");
	});

	test("keeps computed float tails without relaxing typed-string validation", () => {
		const screenshotClientTotal = 69.85 * 11;
		const screenshotMarginRate = (-31.78 / 43.22) * 100;

		expect(roundOtaMoney(otaPricingNumberValue(screenshotClientTotal))).toBe(
			768.35,
		);
		expect(roundOtaMoney(otaPricingNumberValue(screenshotMarginRate))).toBe(
			-73.53,
		);
		expect(otaPricingNumberValue("82.500")).toBe(0);
	});
});

describe("OTA pricing draft initialization", () => {
	test("preserves an explicit zero commission instead of replacing it with 10 percent", () => {
		const reservation = {
			adminPricing: { commissionAmount: 0 },
			commission: 165,
		};

		expect(resolveSavedOtaCommission(reservation)).toMatchObject({
			status: "valid",
			value: 0,
			source: "adminPricing.commissionAmount",
		});
		expect(resolveInitialOtaCommissionInput(reservation, 825)).toMatchObject({
			value: 0,
			inputValue: "0.00",
		});
	});

	test("uses the projected saved commission and only defaults when none exists", () => {
		expect(
			resolveInitialOtaCommissionInput({ commission: "١٦٥٫٠٠" }, 825),
		).toMatchObject({
			value: 165,
			inputValue: "165.00",
			source: "commission",
		});
		expect(resolveInitialOtaCommissionInput({}, 825)).toMatchObject({
			status: "default",
			value: 82.5,
			inputValue: "82.50",
		});
	});

	test("prefers non-empty pickedRoomsPricing to match the backend contract", () => {
		const typeRooms = [{ displayName: "type source" }];
		const pricingRooms = [{ displayName: "pricing source" }];
		expect(
			preferredOtaPricingRooms({
				pickedRoomsType: typeRooms,
				pickedRoomsPricing: pricingRooms,
			}),
		).toBe(pricingRooms);
		expect(
			preferredOtaPricingRooms({
				pickedRoomsType: typeRooms,
				pickedRoomsPricing: [],
			}),
		).toBe(typeRooms);
	});

	test("initializes once per open reservation and resets only after close", () => {
		const firstOpen = otaPricingInitializationDecision({
			open: true,
			reservationKey: "reservation-1",
			initializedKey: "",
		});
		expect(firstOpen).toEqual({
			initialize: true,
			nextInitializedKey: "reservation-1",
		});
		expect(
			otaPricingInitializationDecision({
				open: true,
				reservationKey: "reservation-1",
				initializedKey: firstOpen.nextInitializedKey,
			}),
		).toEqual({ initialize: false, nextInitializedKey: "reservation-1" });
		expect(
			otaPricingInitializationDecision({
				open: false,
				reservationKey: "reservation-1",
				initializedKey: "reservation-1",
			}),
		).toEqual({ initialize: false, nextInitializedKey: "" });
	});

	test("keeps unresolved HotelRunner client/net null while preserving protected root rows", () => {
		const netRows = [70.58, 70.58, 70.58, 70.57, 70.57, 70.57];
		const reservation = {
			total_amount: 423.45,
			sub_total: 534,
			currency: "SAR",
			adminPricing: {
				mode: "hotelrunner_api",
				commercialVerified: false,
				clientTotal: 423.45,
				rootTotal: 534,
				netAfterExpensesTotal: 423.45,
			},
			supplierData: {
				hotelRunner: {
					transport: "hotelrunner_api",
					pricing: { currency: "SAR", grandTotal: 423.45 },
				},
			},
			pickedRoomsPricing: [
				{
					count: 1,
					pricingByDay: netRows.map((amount, index) => ({
						date: `2026-10-${String(index + 5).padStart(2, "0")}`,
						clientPrice: amount,
						rootPrice: 89,
						netAfterExpenses: amount,
					})),
				},
			],
		};

		expect(resolveOtaPricingModalSavedTotals(reservation)).toEqual({
			isHotelRunner: true,
			guestGrossAvailable: false,
			guestGrossAmount: null,
			guestGrossCurrency: "",
			guestGrossDisplayBasis: "",
			clientAvailable: false,
			rootAvailable: true,
			netAvailable: false,
			clientTotal: null,
			rootTotal: 534,
			netAfterExpensesTotal: null,
			netCurrency: "",
		});
		expect(formatOtaAdminListGuestGross(reservation)).toBe("\u2014");
		expect(
			formatOtaPricingModalGuestGross(
				resolveOtaPricingModalSavedTotals(reservation),
			),
		).toBe("\u2014");
		expect(
			formatOtaPricingModalPayout(
				resolveOtaPricingModalSavedTotals(reservation),
			),
		).toBe("\u2014");

		const rooms = normalizeOtaPricingRoomsForModal(reservation);
		expect(rooms[0].pricingByDay.map((row) => row.rootPrice)).toEqual([
			89, 89, 89, 89, 89, 89,
		]);
		expect(rooms[0].pricingByDay.map((row) => row.clientPrice)).toEqual([
			null, null, null, null, null, null,
		]);
		expect(rooms[0].pricingByDay.map((row) => row.netAfterExpenses)).toEqual([
			null, null, null, null, null, null,
		]);
		expect(summarizeOtaPricingRoomsForModal(rooms)).toMatchObject({
			clientTotal: null,
			rootTotal: 534,
			netAfterExpensesTotal: null,
			otaExpenseTotal: null,
			platformMarginTotal: null,
		});

		const changedRoot = recalculateOtaPricingDay(rooms[0].pricingByDay[0], {
			rootPrice: "90",
		});
		expect(changedRoot).toMatchObject({
			clientPrice: null,
			rootPrice: 90,
			netAfterExpenses: null,
			otaExpenseAmount: null,
		});
		const distributedRoot = applyTouchedOtaDistributions({
			rooms,
			distributionValues: { root: "540" },
			distributionTouched: { root: true },
		});
		expect(distributedRoot.ok).toBe(true);
		expect(
			distributedRoot.rooms[0].pricingByDay.map((row) => row.clientPrice),
		).toEqual([null, null, null, null, null, null]);
		expect(
			distributedRoot.rooms[0].pricingByDay.map(
				(row) => row.netAfterExpenses,
			),
		).toEqual([null, null, null, null, null, null]);
	});

	test("renders saved Trip 1653715890546842 totals when v1 USD roles and legacy SAR evidence coexist", () => {
		const reservation = {
			_id: "6a78c81038854c10efabfda8",
			reservation_id: "1653715890546842",
			confirmation_number: "3251687269",
			total_amount: 131.93,
			sub_total: 178,
			currency: "sar",
			adminPricing: {
				mode: "hotelrunner_api",
				commercialVerified: true,
				clientTotal: 131.93,
				rootTotal: 178,
				netAfterExpensesTotal: 124.57,
				otaExpenseTotal: 7.36,
				platformMarginTotal: -53.43,
				sourceCurrency: "USD",
				propertyCurrency: "SAR",
			},
			ota_financial_summary: {
				commercialVerified: true,
				clientTotal: 131.93,
				hotelVisibleAmount: 178,
				netAfterExpenses: 124.57,
				netAfterOtaExpenses: 124.57,
				otaExpenseTotal: 7.36,
				platformProfit: -53.43,
				sourceCurrency: "USD",
				propertyCurrency: "SAR",
			},
			supplierData: {
				hotelRunner: {
					transport: "hotelrunner_api",
					reservationId: "40385935",
					pricing: { currency: "USD", grandTotal: 33.22 },
				},
				otaCommercialEvidence: {
					contractVersion: 1,
					provider: "trip",
					sourceType: "authenticated_ota_email",
					sourceCurrency: "USD",
					propertyCurrency: "SAR",
					bookingBasis: "reservation_total",
					verificationState: "verified",
					evidenceHash:
						"ad25d05f8f0039af49915743b24064be8dc78448b88e4939a4288cbc973dd9db",
					provenance: {
						primary: {
							provider: "trip",
							sourceType: "authenticated_ota_email",
							sourceHash: "a".repeat(64),
							sourceTimestamp: "2026-08-09T00:00:00.000Z",
							sourceId: "trip-email-1653715890546842",
						},
						conversion: {
							provider: "trusted-fx",
							sourceType: "trusted_exchange_evidence",
							sourceHash: "b".repeat(64),
							sourceTimestamp: "2026-08-09T00:00:00.000Z",
							sourceId: "trip-usd-sar-1653715890546842",
						},
					},
					currencyConversion: {
						verified: true,
						sourceCurrency: "USD",
						propertyCurrency: "SAR",
						rate: 3.75,
						sourceRef: "conversion",
					},
					roles: {
						guestGross: {
							verified: true,
							sourceAmount: 35.18,
							sourceCurrency: "USD",
							propertyAmount: 131.93,
							propertyCurrency: "SAR",
							bookingBasis: "reservation_total",
							evidenceType: "authenticated_source",
							sourceRef: "primary",
						},
						hotelPayout: {
							verified: true,
							sourceAmount: 33.22,
							sourceCurrency: "USD",
							propertyAmount: 124.57,
							propertyCurrency: "SAR",
							bookingBasis: "reservation_total",
							evidenceType: "authenticated_source",
							sourceRef: "primary",
						},
					},
				},
				hotelRunnerEmailCommercialEvidence: {
					version: 2,
					verified: true,
					source: "authenticated_ota_email",
					provider: "trip",
					grossTotalSar: 131.93,
					payoutTotalSar: 124.57,
					otaExpenseTotalSar: 7.36,
					currency: "SAR",
					evidenceHash:
						"e580ceb5b37962e71156e58bb40a8e0ddcb312f3efc542ced89c3c2a71345c88",
				},
			},
			pickedRoomsPricing: [
				{
					count: 1,
					pricingByDay: [
						day("2026-10-06", 65.97, 89, 62.29),
						day("2026-10-07", 65.96, 89, 62.28),
					],
				},
			],
		};
		const clone = () => JSON.parse(JSON.stringify(reservation));

		expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
			available: true,
			verified: true,
			amount: 131.93,
			currency: "SAR",
			sourceAmount: 35.18,
			sourceCurrency: "USD",
			propertyAvailable: true,
			propertyAmount: 131.93,
			propertyCurrency: "SAR",
			source:
				"supplierData.otaCommercialEvidence,supplierData.hotelRunnerEmailCommercialEvidence",
		});
		expect(formatOtaAdminListGuestGross(reservation)).toBe("131.93 SAR");

		const savedTotals = resolveOtaPricingModalSavedTotals(reservation);
		expect(savedTotals).toEqual({
			isHotelRunner: true,
			guestGrossAvailable: true,
			guestGrossAmount: 131.93,
			guestGrossCurrency: "SAR",
			guestGrossDisplayBasis: "property",
			clientAvailable: true,
			rootAvailable: true,
			netAvailable: true,
			clientTotal: 131.93,
			rootTotal: 178,
			netAfterExpensesTotal: 124.57,
			netCurrency: "SAR",
		});
		expect(formatOtaPricingModalGuestGross(savedTotals)).toBe("131.93 SAR");
		expect(formatOtaPricingModalPayout(savedTotals)).toBe("124.57 SAR");

		const rooms = normalizeOtaPricingRoomsForModal(reservation);
		expect(
			rooms[0].pricingByDay.map(
				({ date, clientPrice, rootPrice, netAfterExpenses }) => ({
					date,
					clientPrice,
					rootPrice,
					netAfterExpenses,
				}),
			),
		).toEqual([
			{
				date: "2026-10-06",
				clientPrice: 65.97,
				rootPrice: 89,
				netAfterExpenses: 62.29,
			},
			{
				date: "2026-10-07",
				clientPrice: 65.96,
				rootPrice: 89,
				netAfterExpenses: 62.28,
			},
		]);
		expect(summarizeOtaPricingRoomsForModal(rooms)).toMatchObject({
			clientTotal: 131.93,
			rootTotal: 178,
			netAfterExpensesTotal: 124.57,
			otaExpenseTotal: 7.36,
			platformMarginTotal: -53.43,
		});

		const grossConflict = clone();
		grossConflict.supplierData.hotelRunnerEmailCommercialEvidence.grossTotalSar = 131.92;
		expect(formatOtaAdminListGuestGross(grossConflict)).toBe("\u2014");
		expect(resolveOtaPricingModalSavedTotals(grossConflict)).toMatchObject({
			clientAvailable: false,
			clientTotal: null,
			netAvailable: true,
			netAfterExpensesTotal: 124.57,
		});

		const payoutConflict = clone();
		payoutConflict.supplierData.hotelRunnerEmailCommercialEvidence.payoutTotalSar = 124.56;
		expect(resolveOtaPricingModalSavedTotals(payoutConflict)).toMatchObject({
			clientAvailable: true,
			clientTotal: 131.93,
			netAvailable: false,
			netAfterExpensesTotal: null,
		});

		const sourceOnlyContract = clone();
		for (const roleName of ["guestGross", "hotelPayout"]) {
			sourceOnlyContract.supplierData.otaCommercialEvidence.roles[
				roleName
			].propertyAmount = null;
			sourceOnlyContract.supplierData.otaCommercialEvidence.roles[
				roleName
			].propertyCurrency = null;
		}
		expect(getReservationGuestGrossDisplay(sourceOnlyContract)).toMatchObject({
			available: false,
			sourceAvailable: true,
			sourceAmount: 35.18,
			sourceCurrency: "USD",
			propertyAvailable: false,
			propertyAmount: null,
		});
		expect(resolveOtaPricingModalSavedTotals(sourceOnlyContract)).toMatchObject(
			{
				clientAvailable: false,
				clientTotal: null,
				netAvailable: false,
				netAfterExpensesTotal: null,
			},
		);

		const missingCanonicalGrossRole = clone();
		delete missingCanonicalGrossRole.supplierData.otaCommercialEvidence.roles
			.guestGross;
		expect(formatOtaAdminListGuestGross(missingCanonicalGrossRole)).toBe(
			"\u2014",
		);
		expect(
			resolveOtaPricingModalSavedTotals(missingCanonicalGrossRole),
		).toMatchObject({
			clientAvailable: false,
			clientTotal: null,
		});

		const invalidCanonicalConversion = clone();
		delete invalidCanonicalConversion.supplierData.otaCommercialEvidence
			.provenance.conversion;
		expect(formatOtaAdminListGuestGross(invalidCanonicalConversion)).toBe(
			"\u2014",
		);
		expect(
			resolveOtaPricingModalSavedTotals(invalidCanonicalConversion),
		).toMatchObject({
			clientAvailable: false,
			clientTotal: null,
			netAvailable: false,
			netAfterExpensesTotal: null,
		});

		const misplacedV1Contract = clone();
		delete misplacedV1Contract.supplierData.otaCommercialEvidence.roles
			.guestGross;
		misplacedV1Contract.supplierData.hotelRunnerEmailCommercialEvidence =
			clone().supplierData.otaCommercialEvidence;
		expect(formatOtaAdminListGuestGross(misplacedV1Contract)).toBe("\u2014");
	});

	test("keeps source-only USD evidence out of UI and shows trusted SAR projections", () => {
		const reservation = {
			total_amount: null,
			sub_total: 534,
			currency: "SAR",
			adminPricing: {
				mode: "hotelrunner_api",
				commercialVerified: false,
				propertyCurrency: "SAR",
				clientTotal: null,
				rootTotal: 534,
				netAfterExpensesTotal: null,
			},
			supplierData: {
				hotelRunner: {
					transport: "hotelrunner_api",
					pricing: { currency: "USD", grandTotal: 112.92 },
				},
				otaCommercialEvidence: {
					contractVersion: 1,
					provider: "expedia",
					sourceType: "authenticated_provider_portal",
					sourceCurrency: "USD",
					propertyCurrency: "SAR",
					bookingBasis: "reservation_total",
					verificationState: "partial",
					evidenceHash: "f".repeat(64),
					provenance: {
						primary: {
							provider: "expedia",
							sourceType: "authenticated_provider_portal",
							sourceHash: "1".repeat(64),
							sourceTimestamp: "2026-08-08T00:00:00.000Z",
							sourceId: "expedia-portal-modal-1",
						},
					},
					roles: {
						guestGross: {
							verified: true,
							sourceAmount: 146.46,
							sourceCurrency: "USD",
							propertyAmount: null,
							propertyCurrency: null,
							bookingBasis: "reservation_total",
							evidenceType: "authenticated_source",
							sourceRef: "primary",
						},
						hotelPayout: {
							verified: true,
							sourceAmount: 112.92,
							sourceCurrency: "USD",
							propertyAmount: null,
							propertyCurrency: null,
							bookingBasis: "reservation_total",
							evidenceType: "authenticated_source",
							sourceRef: "primary",
						},
					},
				},
			},
			pickedRoomsPricing: [
				{
					count: 1,
					pricingByDay: [
						{ date: "2026-10-05", clientPrice: 70.58, rootPrice: 89 },
					],
				},
			],
		};

		expect(resolveOtaPricingModalSavedTotals(reservation)).toMatchObject({
			guestGrossAvailable: false,
			guestGrossAmount: null,
			guestGrossCurrency: "",
			guestGrossDisplayBasis: "",
			clientAvailable: false,
			clientTotal: null,
			rootTotal: 534,
			netAvailable: false,
			netAfterExpensesTotal: null,
			netCurrency: "",
		});
		expect(
			formatOtaPricingModalGuestGross(
				resolveOtaPricingModalSavedTotals(reservation),
			),
		).toBe("\u2014");
		expect(formatOtaAdminListGuestGross(reservation)).toBe("\u2014");
		expect(
			formatOtaPricingModalPayout(
				resolveOtaPricingModalSavedTotals(reservation),
			),
		).toBe("\u2014");

		const evidence = reservation.supplierData.otaCommercialEvidence;
		evidence.roles.guestGross.propertyAmount = 549.23;
		evidence.roles.guestGross.propertyCurrency = "SAR";
		evidence.roles.hotelPayout.propertyAmount = 423.45;
		evidence.roles.hotelPayout.propertyCurrency = "SAR";
		evidence.currencyConversion = {
			verified: true,
			sourceCurrency: "USD",
			propertyCurrency: "SAR",
			rate: 3.75,
			sourceRef: "conversion",
		};
		evidence.provenance.conversion = {
			provider: "trusted-fx",
			sourceType: "trusted_exchange_evidence",
			sourceHash: "2".repeat(64),
			sourceTimestamp: "2026-08-08T00:00:00.000Z",
			sourceId: "usd-sar-modal-2026-08-08",
		};
		const convertedTotals = resolveOtaPricingModalSavedTotals(reservation);
		expect(convertedTotals).toMatchObject({
			guestGrossAvailable: true,
			guestGrossAmount: 549.23,
			guestGrossCurrency: "SAR",
			guestGrossDisplayBasis: "property",
			clientAvailable: true,
			clientTotal: 549.23,
			netAvailable: true,
			netAfterExpensesTotal: 423.45,
			netCurrency: "SAR",
		});
		expect(formatOtaPricingModalGuestGross(convertedTotals)).toBe(
			"549.23 SAR",
		);
		expect(formatOtaAdminListGuestGross(reservation)).toBe("549.23 SAR");
		expect(formatOtaPricingModalPayout(convertedTotals)).toBe("423.45 SAR");
		const rooms = normalizeOtaPricingRoomsForModal(reservation);
		expect(rooms[0].pricingByDay[0]).toMatchObject({
			clientPrice: null,
			rootPrice: 89,
			netAfterExpenses: null,
		});
		expect(summarizeOtaPricingRoomsForModal(rooms)).toMatchObject({
			netAfterExpensesTotal: null,
			otaExpenseTotal: null,
			platformMarginTotal: null,
		});
	});

	test("shows verified HotelRunner roles only when nightly materialization reconciles", () => {
		const reservation = {
			total_amount: 600,
			sub_total: 534,
			currency: "SAR",
			adminPricing: {
				mode: "hotelrunner_api",
				commercialVerified: true,
				clientTotal: 600,
				rootTotal: 534,
				netAfterExpensesTotal: 423.45,
			},
			supplierData: {
				hotelRunner: {
					transport: "hotelrunner_api",
					pricing: { currency: "SAR", grandTotal: 423.45 },
				},
				otaCommercialEvidence: {
					contractVersion: 1,
					verificationState: "verified",
					sourceType: "authenticated_ota_email",
					provider: "expedia",
					evidenceHash: "c".repeat(64),
					sourceCurrency: "SAR",
					propertyCurrency: "SAR",
					bookingBasis: "reservation_total",
					provenance: {
						primary: {
							provider: "expedia",
							sourceType: "authenticated_ota_email",
							sourceHash: "d".repeat(64),
							sourceTimestamp: "2026-08-08T00:00:00.000Z",
							sourceId: "expedia-email-modal-1",
						},
					},
					roles: {
						guestGross: {
							verified: true,
							sourceAmount: 600,
							sourceCurrency: "SAR",
							propertyAmount: 600,
							propertyCurrency: "SAR",
							bookingBasis: "reservation_total",
							evidenceType: "authenticated_source",
							sourceRef: "primary",
						},
						hotelPayout: {
							verified: true,
							sourceAmount: 423.45,
							sourceCurrency: "SAR",
							propertyAmount: 423.45,
							propertyCurrency: "SAR",
							bookingBasis: "reservation_total",
							evidenceType: "authenticated_source",
							sourceRef: "primary",
						},
					},
				},
			},
			pickedRoomsPricing: [
				{
					count: 1,
					pricingByDay: [
						day("2026-10-05", 300, 267, 211.73),
						day("2026-10-06", 300, 267, 211.72),
					],
				},
			],
		};

		const rooms = normalizeOtaPricingRoomsForModal(reservation);
		expect(summarizeOtaPricingRoomsForModal(rooms)).toMatchObject({
			clientTotal: 600,
			rootTotal: 534,
			netAfterExpensesTotal: 423.45,
			otaExpenseTotal: 176.55,
			platformMarginTotal: -110.55,
		});
		const savedTotals = resolveOtaPricingModalSavedTotals(reservation);
		expect(formatOtaPricingModalGuestGross(savedTotals)).toBe("600.00 SAR");
		expect(formatOtaPricingModalPayout(savedTotals)).toBe("423.45 SAR");
		expect(formatOtaAdminListGuestGross(reservation)).toBe("600.00 SAR");

		reservation.pickedRoomsPricing[0].pricingByDay[0].clientPrice = 211.73;
		reservation.pickedRoomsPricing[0].pricingByDay[0].mainPrice = 211.73;
		reservation.pickedRoomsPricing[0].pricingByDay[0].price = 211.73;
		reservation.pickedRoomsPricing[0].pricingByDay[0].totalPriceWithCommission =
			211.73;
		reservation.pickedRoomsPricing[0].pricingByDay[1].clientPrice = 211.72;
		reservation.pickedRoomsPricing[0].pricingByDay[1].mainPrice = 211.72;
		reservation.pickedRoomsPricing[0].pricingByDay[1].price = 211.72;
		reservation.pickedRoomsPricing[0].pricingByDay[1].totalPriceWithCommission =
			211.72;
		const staleRooms = normalizeOtaPricingRoomsForModal(reservation);
		expect(staleRooms[0].pricingByDay.map((row) => row.clientPrice)).toEqual([
			null,
			null,
		]);
		expect(staleRooms[0].pricingByDay.map((row) => row.netAfterExpenses)).toEqual([
			211.73,
			211.72,
		]);
	});

	test("preserves legacy modal fallbacks outside HotelRunner", () => {
		const reservation = {
			total_amount: 100,
			sub_total: 50,
			adminPricing: { mode: "ota_review" },
			pickedRoomsPricing: [
				{
					count: 1,
					pricingByDay: [{ date: "2026-10-05", price: 100, rootPrice: 50 }],
				},
			],
		};

		expect(resolveOtaPricingModalSavedTotals(reservation)).toMatchObject({
			isHotelRunner: false,
			clientTotal: 100,
			rootTotal: 50,
			netAfterExpensesTotal: 0,
		});
		expect(formatOtaAdminListGuestGross(reservation)).toBe("100.00 SAR");
		expect(
			formatOtaAdminListGuestGross({
				total_amount: null,
				adminPricing: { mode: "ota_review" },
			}),
		).toBe("\u2014");
		expect(
			formatOtaAdminListGuestGross({
				total_amount: "not-a-number",
				adminPricing: { mode: "ota_review" },
			}),
		).toBe("\u2014");
		expect(
			formatOtaAdminListGuestGross({
				total_amount: Number.POSITIVE_INFINITY,
				adminPricing: { mode: "ota_review" },
			}),
		).toBe("\u2014");
		expect(
			formatOtaAdminListGuestGross({
				total_amount: 0,
				adminPricing: { mode: "ota_review" },
			}),
		).toBe("0.00 SAR");
		const rooms = normalizeOtaPricingRoomsForModal(reservation);
		expect(rooms[0].pricingByDay[0]).toMatchObject({
			clientPrice: 100,
			rootPrice: 50,
			netAfterExpenses: 100,
			otaExpenseAmount: 0,
		});
	});
});

describe("touched OTA pricing distributions", () => {
	const variedRooms = () => [
		{
			room_type: "doubleRooms",
			displayName: "Double",
			count: 1,
			pricingByDay: [
				day("2026-08-16", 100, 50, 80),
				day("2026-08-17", 200, 60, 150),
			],
		},
	];

	test("changes only fields the user deliberately touched", () => {
		const original = variedRooms();
		const result = applyTouchedOtaDistributions({
			rooms: original,
			distributionValues: { client: "300", root: "١٢٠٫٠٠", net: "230" },
			distributionTouched: { client: false, root: true, net: false },
		});

		expect(result.ok).toBe(true);
		expect(result.appliedFields).toEqual(["root"]);
		expect(result.rooms[0].pricingByDay.map((row) => row.clientPrice)).toEqual([
			100, 200,
		]);
		expect(
			result.rooms[0].pricingByDay.map((row) => row.netAfterExpenses),
		).toEqual([80, 150]);
		expect(result.rooms[0].pricingByDay.map((row) => row.rootPrice)).toEqual([
			60, 60,
		]);
	});

	test("applies a valid touched draft during Save and preserves commission", () => {
		const result = prepareOtaPricingSave({
			rooms: variedRooms(),
			distributionValues: { root: "١٢٠٫٠٠" },
			distributionTouched: { root: true },
			commissionInput: "٨٢٫٥٠",
		});

		expect(result.ok).toBe(true);
		expect(result.appliedFields).toEqual(["root"]);
		expect(result.payload).toMatchObject({
			total_amount: 300,
			sub_total: 120,
			commission: 82.5,
			adminPricing: {
				clientTotal: 300,
				rootTotal: 120,
				commissionAmount: 82.5,
			},
		});
		expect(JSON.stringify(result.payload)).not.toContain(
			"pricingRoleAvailability",
		);
	});

	test("builds the screenshot totals without floating-point loss", () => {
		const rooms = [
			{
				room_type: "doubleRooms",
				displayName: "Double Room – Comfort & Relaxation",
				count: 1,
				pricingByDay: Array.from({ length: 11 }, (_, index) =>
					day(`2026-08-${String(index + 16).padStart(2, "0")}`, 69.85, 75, 43.22),
				),
			},
		];

		const result = prepareOtaPricingSave({
			rooms,
			commissionInput: "82,50",
		});

		expect(result.ok).toBe(true);
		expect(result.payload).toMatchObject({
			total_amount: 768.35,
			sub_total: 825,
			commission: 82.5,
			adminPricing: {
				netAfterExpensesTotal: 475.42,
				otaExpenseTotal: 292.93,
				platformMarginTotal: -349.58,
				commissionAmount: 82.5,
			},
		});
	});

	test("blocks a total that cannot be represented exactly for the room count", () => {
		const rooms = [
			{
				room_type: "doubleRooms",
				displayName: "Double",
				count: 2,
				pricingByDay: [day("2026-08-16", 20, 5, 15)],
			},
		];
		const result = applyTouchedOtaDistributions({
			rooms,
			distributionValues: { root: "10.01" },
			distributionTouched: { root: true },
		});

		expect(result).toMatchObject({
			ok: false,
			code: "inexact_distribution",
			requestedTotal: 10.01,
			actualTotal: 10,
		});
		expect(rooms[0].pricingByDay[0].rootPrice).toBe(5);
	});

	test("preserves exact cents with mixed room weights and supports explicit zero", () => {
		const rooms = [
			{
				room_type: "doubleRooms",
				displayName: "Double",
				count: 2,
				pricingByDay: [day("2026-08-16", 20, 5, 15)],
			},
			{
				room_type: "singleRooms",
				displayName: "Single",
				count: 1,
				pricingByDay: [day("2026-08-16", 10, 5, 8)],
			},
		];
		const exact = applyTouchedOtaDistributions({
			rooms,
			distributionValues: { root: "10.01" },
			distributionTouched: { root: true },
		});
		expect(exact.ok).toBe(true);
		expect(exact.rooms.map((room) => room.pricingByDay[0].rootPrice)).toEqual([
			3.34, 3.33,
		]);

		const zero = applyTouchedOtaDistributions({
			rooms: exact.rooms,
			distributionValues: { root: "٠" },
			distributionTouched: { root: true },
		});
		expect(zero.ok).toBe(true);
		expect(zero.rooms.map((room) => room.pricingByDay[0].rootPrice)).toEqual([
			0, 0,
		]);
	});

	test("never coerces missing, malformed, or negative commission to zero", () => {
		for (const commissionInput of ["", "٨٢x", "-١", "82.5000"]) {
			const result = prepareOtaPricingSave({
				rooms: variedRooms(),
				commissionInput,
			});
			expect(result.ok).toBe(false);
			expect(["invalid_commission", "negative_commission"]).toContain(
				result.code,
			);
		}
	});

	test("blocks cleared or malformed daily prices while allowing explicit zero", () => {
		const rooms = variedRooms();
		const cleared = recalculateOtaPricingDay(rooms[0].pricingByDay[0], {
			rootPrice: "",
		});
		const changedAnotherCell = recalculateOtaPricingDay(cleared, {
			clientPrice: "101",
		});
		rooms[0].pricingByDay[0] = changedAnotherCell;
		expect(changedAnotherCell.rootPrice).toBe("");
		expect(
			prepareOtaPricingSave({ rooms, commissionInput: "10" }),
		).toMatchObject({ ok: false, code: "invalid_daily_pricing" });

		const corrected = recalculateOtaPricingDay(changedAnotherCell, {
			rootPrice: "0",
		});
		rooms[0].pricingByDay[0] = corrected;
		expect(corrected.rootPrice).toBe(0);
		expect(prepareOtaPricingSave({ rooms, commissionInput: "10" }).ok).toBe(
			true,
		);

		for (const patch of [
			{ netAfterExpenses: "not-money" },
			{ rootPrice: "82,50" },
		]) {
			rooms[0].pricingByDay[0] = recalculateOtaPricingDay(corrected, patch);
			expect(
				prepareOtaPricingSave({ rooms, commissionInput: "10" }),
			).toMatchObject({ ok: false, code: "invalid_daily_pricing" });
		}
	});
});
