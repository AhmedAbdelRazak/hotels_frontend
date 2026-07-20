import React from "react";
import OverallPendingReservations from "../../HotelModule/TheOverallStructure/OverallReservationsList/OverallPendingReservations";
import {
  exportAdminPendingConfirmationReservations,
  getAdminPendingConfirmationReservations,
} from "../apiAdmin";
import AdminReservationDetailsModal from "./AdminReservationDetailsModal";
import { pendingConfirmationQueryAdapter } from "./adminReservationCycleQuery";

const AdminPendingConfirmationReservations = (props) => (
  <OverallPendingReservations
    {...props}
    confirmationOnly
    adminTheme
    reservationsLoader={getAdminPendingConfirmationReservations}
    reservationsExporter={exportAdminPendingConfirmationReservations}
    DetailsModalComponent={AdminReservationDetailsModal}
    queryStateAdapter={pendingConfirmationQueryAdapter}
  />
);

export default AdminPendingConfirmationReservations;
