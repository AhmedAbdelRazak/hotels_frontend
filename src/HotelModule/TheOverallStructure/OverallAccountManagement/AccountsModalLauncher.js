import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { ActionButton } from "../overallShared";

const TEXT = {
	en: {
		title: "Employee Accounts Modal",
		subtitle:
			"Create and edit hotel staff with the same owner dashboard accounts modal.",
		button: "Open Accounts Modal",
	},
	ar: {
		title: "نافذة حسابات الموظفين",
		subtitle:
			"إنشاء وتعديل موظفي الفنادق بنفس نافذة الحسابات في لوحة المالك.",
		button: "فتح نافذة الحسابات",
	},
};

const AccountsModalLauncher = ({ chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const labels = TEXT[isRTL ? "ar" : "en"];
	const history = useHistory();
	const location = useLocation();

	const openAccountsModal = () => {
		const params = new URLSearchParams(location.search || "");
		if (!params.get("overall")) params.set("overall", "account-management");
		params.set("modal", "accounts");
		history.push({
			pathname: location.pathname,
			search: `?${params.toString()}`,
		});
	};

	return (
		<LauncherBand $isRTL={isRTL}>
			<div>
				<strong>{labels.title}</strong>
				<span>{labels.subtitle}</span>
			</div>
			<ActionButton type='button' onClick={openAccountsModal}>
				{labels.button}
			</ActionButton>
		</LauncherBand>
	);
};

export default AccountsModalLauncher;

const LauncherBand = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.85rem;
	min-width: 0;
	padding: 12px;
	border: 1px solid #b8dcff;
	border-radius: 8px;
	background: #e3f2fd;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	> div {
		display: grid;
		gap: 3px;
		min-width: 0;
	}

	strong {
		color: #0f4f86;
		font-size: 0.95rem;
		font-weight: 900;
		overflow-wrap: anywhere;
	}

	span {
		color: #47627d;
		font-size: 0.82rem;
		font-weight: 700;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}

	button {
		flex: 0 0 auto;
	}

	@media (max-width: 640px) {
		align-items: stretch;
		flex-direction: column;
		padding: 0.78rem;

		button {
			width: 100%;
			justify-content: center;
		}
	}
`;
