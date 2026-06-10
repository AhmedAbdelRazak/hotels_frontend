import React, { Suspense, lazy } from "react";
import { ConfigProvider } from "antd";
import styled from "styled-components";

const OverallSummaryMain = lazy(() =>
	import("./OverallSummary/OverallSummaryMain")
);
const OverallReservationMain = lazy(() =>
	import("./OverallReservationsList/OverallReservationMain")
);
const NewReservationOverall = lazy(() =>
	import("./OverallReservationsList/NewReservationOverall")
);
const OverallPendingReservations = lazy(() =>
	import("./OverallReservationsList/OverallPendingReservations")
);
const OverallHouseKeeping = lazy(() =>
	import("./OverallHouseKeeping/OverallHouseKeeping")
);
const OverallHotelMapMain = lazy(() =>
	import("./OverallHotelMap/OverallHotelMapMain")
);
const OverallFinancialReport = lazy(() =>
	import("./OverallFinancials/OverallFinancialReport")
);
const OverallFinancialActions = lazy(() =>
	import("./OverallFinancials/OverallFinancialActions")
);
const OverallWalletManagement = lazy(() =>
	import("./OverallFinancials/OverallWalletManagement")
);
const AccountManagementMain = lazy(() =>
	import("./OverallAccountManagement/AccountManagementMain")
);
const CreateNewAccount = lazy(() =>
	import("./OverallAccountManagement/CreateNewAccount")
);
const ActivateAccounts = lazy(() =>
	import("./OverallAccountManagement/ActivateAccounts")
);
const UpdateExistingAccount = lazy(() =>
	import("./OverallAccountManagement/UpdateExistingAccount")
);
const OverallSettingsMain = lazy(() =>
	import("./OverallSettings/OverallSettingsMain")
);

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
			return <OverallPendingReservations key='pending-reservations' {...props} />;
		if (activeView === "rejected-reservations")
			return (
				<OverallPendingReservations
					key='rejected-reservations'
					{...props}
					rejectedOnly
				/>
			);
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
			<OverallAntdScope $isRTL={isRTL}>
				<Suspense fallback={<OverallLoading />}>{renderView()}</Suspense>
			</OverallAntdScope>
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

const OverallLoading = styled.div`
	min-height: 220px;
`;
