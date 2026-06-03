/** @format */

import React from "react";
import { ConfigProvider } from "antd";
import { Route, Redirect } from "react-router-dom";
import { isAuthenticated } from "./index";
import { useCartContext } from "../cart_context";
import {
	isConfiguredSuperAdminUser,
} from "../AdminModule/utils/superUsers";
import AdminTopNavbar from "../AdminModule/AdminNavbar/AdminTopNavbar";

const ADMIN_ROUTE_ACCESS = {
	"/admin/dashboard": ["AdminDashboard"],
	"/admin/customer-service": ["CustomerService"],
	"/admin/el-integrator": ["Integrator"],
	"/admin/all-reservations": ["HotelsReservations", "AllReservations"],
	"/admin/ota-reservations": ["OTAReservations"],
	"/admin/jannatbooking-tools": ["JannatTools"],
	"/admin/new-hotel": ["AdminDashboard"],
	"/admin/add-owner-account": ["AdminDashboard"],
	"/admin/janat-website": ["JannatBookingWebsite"],
	"/admin/added-hotels": ["AdminDashboard"],
	"/admin/overall-hotel-reports": ["AdminDashboard", "HotelReports"],
	"/admin/expenses-financials": ["Financials", "AdminDashboard"],
	"/admin/payouts-report": ["Financials", "Payouts", "AdminDashboard"],
	"/admin/accounts-management": ["AdminAccounts"],
};

const normalizeAccessList = (accessTo) =>
	Array.isArray(accessTo)
		? accessTo.map((item) => String(item || "").trim()).filter(Boolean)
		: [];

const hasExplicitAdminAccess = (user = {}, routePath = "") => {
	if (isConfiguredSuperAdminUser(user)) return true;
	const roleNumbers = [
		Number(user.role),
		...(Array.isArray(user.roles) ? user.roles.map(Number) : []),
	];
	const adminStaffRole = roleNumbers.includes(1000);
	if (!adminStaffRole) return false;

	const accessTo = normalizeAccessList(user.accessTo);
	const allowed = ADMIN_ROUTE_ACCESS[routePath] || [];
	return allowed.some((key) => accessTo.includes(key));
};

const resolvePopupContainer = (triggerNode) => {
	if (typeof document === "undefined") {
		return triggerNode || null;
	}
	if (!triggerNode) {
		return document.body;
	}
	const container = triggerNode.closest(".ant-modal, .ant-drawer");
	return container || document.body;
};

const AdminRoute = ({ component: Component, ...rest }) => {
	const { chosenLanguage, languageToggle } = useCartContext();

	return (
		<Route
			{...rest}
			render={(props) => {
				const auth = isAuthenticated();
				const user = auth?.user;
				const routePath = props.match?.path || rest.path || props.location.pathname;
				const hasAdminAccess =
					auth &&
					user?.activeUser !== false &&
					hasExplicitAdminAccess(user, routePath);

				return hasAdminAccess ? (
					<ConfigProvider
						direction={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
						getPopupContainer={resolvePopupContainer}
					>
						<div
							className='admin-route-shell'
							dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
						>
							<AdminTopNavbar
								chosenLanguage={chosenLanguage}
								languageToggle={languageToggle}
							/>
							<Component
								{...props}
								Language={chosenLanguage}
								chosenLanguage={chosenLanguage}
								languageToggle={languageToggle}
							/>
						</div>
					</ConfigProvider>
				) : (
					<Redirect
						to={{
							pathname: "/",
							state: { from: props.location },
						}}
					/>
				);
			}}
		/>
	);
};

export default AdminRoute;
