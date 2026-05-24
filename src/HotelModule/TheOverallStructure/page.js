import React from "react";
import { ConfigProvider } from "antd";
import styled from "styled-components";
import OverallSummaryMain from "./OverallSummary/OverallSummaryMain";
import OverallReservationMain from "./OverallReservationsList/OverallReservationMain";
import NewReservationOverall from "./OverallReservationsList/NewReservationOverall";
import OverallPendingReservations from "./OverallReservationsList/OverallPendingReservations";
import OverallHouseKeeping from "./OverallHouseKeeping/OverallHouseKeeping";
import OverallHotelMapMain from "./OverallHotelMap/OverallHotelMapMain";
import OverallFinancialReport from "./OverallFinancials/OverallFinancialReport";
import OverallFinancialActions from "./OverallFinancials/OverallFinancialActions";
import OverallWalletManagement from "./OverallFinancials/OverallWalletManagement";
import AccountManagementMain from "./OverallAccountManagement/AccountManagementMain";
import CreateNewAccount from "./OverallAccountManagement/CreateNewAccount";
import ActivateAccounts from "./OverallAccountManagement/ActivateAccounts";
import UpdateExistingAccount from "./OverallAccountManagement/UpdateExistingAccount";
import OverallSettingsMain from "./OverallSettings/OverallSettingsMain";

const getOverallPopupContainer = (triggerNode) =>
	triggerNode?.parentElement ||
	(typeof document !== "undefined" ? document.body : undefined);

const OverallStructurePage = ({
	view = "summary",
	userId,
	user,
	token,
	ownerId = "",
	chosenLanguage,
	setAccountsModalHotels,
}) => {
	const activeView = view === "page" ? "summary" : view;
	const isRTL = chosenLanguage === "Arabic";
	const props = {
		userId,
		user,
		token,
		ownerId,
		chosenLanguage,
		setAccountsModalHotels,
	};

	const renderView = () => {
		if (activeView === "pending-reservations")
			return <OverallPendingReservations {...props} />;
		if (activeView === "new-reservation")
			return <NewReservationOverall {...props} />;
		if (
			activeView === "reservation-main" ||
			activeView === "reservations-list" ||
			activeView === "reservations"
		) {
			return <OverallReservationMain {...props} />;
		}
		if (activeView === "hotel-map") return <OverallHotelMapMain {...props} />;
		if (activeView === "housekeeping") return <OverallHouseKeeping {...props} />;
		if (activeView === "financial-report")
			return <OverallFinancialReport {...props} />;
		if (activeView === "financial-actions")
			return <OverallFinancialActions {...props} />;
		if (activeView === "wallet-management")
			return <OverallWalletManagement {...props} />;
		if (activeView === "account-management")
			return <AccountManagementMain {...props} />;
		if (activeView === "create-account") return <CreateNewAccount {...props} />;
		if (activeView === "activate-accounts")
			return <ActivateAccounts {...props} />;
		if (activeView === "update-account")
			return <UpdateExistingAccount {...props} />;
		if (activeView === "settings") return <OverallSettingsMain {...props} />;

		return <OverallSummaryMain {...props} />;
	};

	return (
		<ConfigProvider
			direction={isRTL ? "rtl" : "ltr"}
			getPopupContainer={getOverallPopupContainer}
		>
			<OverallAntdScope $isRTL={isRTL}>{renderView()}</OverallAntdScope>
		</ConfigProvider>
	);
};

export default OverallStructurePage;

const OverallAntdScope = styled.div`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	.ant-select {
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.ant-select-selector {
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")} !important;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")} !important;
	}

	.ant-select-selection-search-input,
	.ant-select-selection-item,
	.ant-select-selection-placeholder {
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")} !important;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")} !important;
	}

	.ant-select-item-option-content {
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}
`;
