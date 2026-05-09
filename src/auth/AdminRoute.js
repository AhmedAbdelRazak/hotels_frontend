/** @format */

import React from "react";
import { ConfigProvider } from "antd";
import { Route, Redirect } from "react-router-dom";
import { isAuthenticated } from "./index";
import { isSuperAdminUser } from "../AdminModule/utils/superUsers";

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

const AdminRoute = ({ component: Component, ...rest }) => (
	<Route
		{...rest}
		render={(props) => {
			const auth = isAuthenticated();
			const user = auth?.user;
			const hasAdminAccess =
				auth &&
				user?.activeUser !== false &&
				(user.role === 1000 || isSuperAdminUser(user));

			return hasAdminAccess ? (
				<ConfigProvider getPopupContainer={resolvePopupContainer}>
					<Component {...props} />
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

export default AdminRoute;
