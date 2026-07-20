import React from "react";
import OverallFinancialActions from "../../HotelModule/TheOverallStructure/OverallFinancials/OverallFinancialActions";
import { getAdminPendingFinanceReservations } from "../apiAdmin";
import AdminReservationDetailsModal from "./AdminReservationDetailsModal";
import { pendingFinanceQueryAdapter } from "./adminReservationCycleQuery";

const AdminPendingFinancialActions = (props) => (
  <OverallFinancialActions
    {...props}
    adminTheme
    actionsLoader={getAdminPendingFinanceReservations}
    actionsExporter={getAdminPendingFinanceReservations}
    DetailsModalComponent={AdminReservationDetailsModal}
    queryStateAdapter={pendingFinanceQueryAdapter}
  />
);

export default AdminPendingFinancialActions;
