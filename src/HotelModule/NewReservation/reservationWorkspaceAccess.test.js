import { canAccessReservationWorkspaceTab } from "./reservationWorkspaceAccess";

const access = (overrides = {}) =>
	canAccessReservationWorkspaceTab({
		tab: "reserveARoom",
		canConfirmReservations: true,
		canAssignPhysicalRooms: true,
		...overrides,
	});

test("allows authorized hotel staff to use room assignment workspaces", () => {
	expect(access()).toBe(true);
	expect(access({ tab: "heatmap" })).toBe(true);
});

test("keeps finance-only accounts in reservation list and commission review", () => {
	expect(
		access({
			financeOnlyReservationView: true,
			canAssignPhysicalRooms: false,
		}),
	).toBe(false);
	expect(
		access({
			financeOnlyReservationView: true,
			canAssignPhysicalRooms: false,
			tab: "newReservation",
		}),
	).toBe(false);
	expect(
		access({
			financeOnlyReservationView: true,
			canAssignPhysicalRooms: false,
			tab: "list",
		}),
	).toBe(true);
	expect(
		access({
			financeOnlyReservationView: true,
			canAssignPhysicalRooms: false,
			tab: "housingreport",
		}),
	).toBe(true);
});

test("does not hide room tools from an actual owner with legacy finance metadata", () => {
	expect(
		access({
			financeOnlyReservationView: true,
			canAssignPhysicalRooms: true,
		}),
	).toBe(true);
});

test("denies direct room workspace access without assignment permission", () => {
	expect(access({ canAssignPhysicalRooms: false })).toBe(false);
	expect(access({ tab: "heatmap", canAssignPhysicalRooms: false })).toBe(false);
});

test("keeps limited order takers in their existing new/list scope", () => {
	expect(access({ limitedOrderTakerAccount: true })).toBe(false);
	expect(
		access({ limitedOrderTakerAccount: true, tab: "newReservation" }),
	).toBe(true);
	expect(access({ limitedOrderTakerAccount: true, tab: "list" })).toBe(true);
});
