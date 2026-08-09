export const canAccessReservationWorkspaceTab = ({
	tab,
	limitedOrderTakerAccount = false,
	financeOnlyReservationView = false,
	canConfirmReservations = false,
	canAssignPhysicalRooms = false,
} = {}) => {
	if (limitedOrderTakerAccount) {
		return ["newReservation", "list"].includes(tab);
	}
	if (financeOnlyReservationView && !canAssignPhysicalRooms) {
		return (
			tab === "list" ||
			(tab === "housingreport" && canConfirmReservations)
		);
	}
	if (tab === "housingreport") return canConfirmReservations;
	if (["reserveARoom", "heatmap"].includes(tab)) {
		return canAssignPhysicalRooms;
	}
	return true;
};
