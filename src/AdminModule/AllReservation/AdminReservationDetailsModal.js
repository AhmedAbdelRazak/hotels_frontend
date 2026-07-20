import React from "react";
import OverallReservationDetailsModal from "../../HotelModule/TheOverallStructure/OverallReservationsList/OverallReservationDetailsModal";
import MoreDetails from "./MoreDetails";

const AdminReservationDetailsModal = (props) => (
  <OverallReservationDetailsModal
    {...props}
    DetailsComponent={MoreDetails}
    adminTheme
  />
);

export default AdminReservationDetailsModal;
