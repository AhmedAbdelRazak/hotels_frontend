/** @format */

import React from "react";
import { Route, Redirect } from "react-router-dom";
import { isAuthenticated } from "./index";
import { isSuperAdminUser } from "../AdminModule/utils/superUsers";

const ReceptionRoute = ({ component: Component, ...rest }) => (
	<Route
		{...rest}
		render={(props) => {
			const auth = isAuthenticated();
			const user = auth?.user;
			const allowedRoles = [1000, 2000, 3000];
			return auth &&
				user?.activeUser !== false &&
				(allowedRoles.includes(Number(user.role)) || isSuperAdminUser(user)) ? (
				<Component {...props} />
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

export default ReceptionRoute;
