/** @format */

import React from "react";
import { ConfigProvider } from "antd";
import { Route, Redirect } from "react-router-dom";
import { isAuthenticated } from "./index";

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
		render={(props) =>
			isAuthenticated() && isAuthenticated().user.role === 1000 ? (
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
			)
		}
	/>
);

export default AdminRoute;
