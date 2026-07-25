import { canUseHotelReservationEditor } from "./hotelReservationEditPermissions";

describe("hotel reservation editor permissions", () => {
	test.each([
		{ role: 2000 },
		{ role: 3000 },
		{ role: 8000 },
		{ role: 10000 },
		{ roleDescription: "hotel manager" },
		{ roleDescription: "booking responsible" },
		{ roleDescriptions: ["reception"] },
	])("allows hotel reservation staff: %p", (account) => {
		expect(
			canUseHotelReservationEditor({ ...account, activeUser: true }),
		).toBe(true);
	});

	test.each([
		{ role: 6000, roleDescription: "finance" },
		{ role: 7000, roleDescription: "ordertaker" },
		{ role: 5000, roleDescription: "housekeeping" },
	])("denies unrelated hotel roles: %p", (account) => {
		expect(
			canUseHotelReservationEditor({ ...account, activeUser: true }),
		).toBe(false);
	});

	test("denies inactive staff and always allows the configured super admin", () => {
		expect(
			canUseHotelReservationEditor({ role: 3000, activeUser: false }),
		).toBe(false);
		expect(
			canUseHotelReservationEditor(
				{ role: 0, activeUser: false },
				{ isSuperAdmin: true },
			),
		).toBe(true);
	});

	test("allows the active hotel owner even when a legacy account has no role metadata", () => {
		expect(
			canUseHotelReservationEditor(
				{ _id: "owner-1", activeUser: true },
				{ hotelOwnerId: { _id: "owner-1" } },
			),
		).toBe(true);
	});
});
