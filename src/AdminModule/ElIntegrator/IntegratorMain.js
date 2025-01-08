import React, { useEffect, useState, useCallback } from "react";
import { useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import ContentOfIntegrator from "./ContentOfIntegrator";
import { isAuthenticated } from "../../auth";
import { gettingHotelDetailsForAdmin, readUserId } from "../apiAdmin";

const IntegratorMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [allHotelDetailsAdmin, setAllHotelDetailsAdmin] = useState("");
	const [getUser, setGetUser] = useState(null); // State to hold user details

	const { user, token } = isAuthenticated(); // To retrieve user token
	const history = useHistory();

	// Fetch user details
	const gettingUserId = useCallback(() => {
		readUserId(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error fetching user details");
			} else {
				setGetUser(data);
			}
		});
	}, [user._id, token]);

	// Determine if the user is a Super Admin
	const isSuperAdmin =
		!getUser?.accessTo ||
		getUser?.accessTo.length === 0 ||
		getUser?.accessTo.includes("all");

	// Validate user and handle access control
	useEffect(() => {
		if (getUser) {
			// Check if activeUser is false
			if (!getUser.activeUser) {
				history.push("/");
				return;
			}

			const accessTo = getUser.accessTo || [];

			// Allow access if user is a superAdmin or has Integrator access
			if (isSuperAdmin || accessTo.includes("Integrator")) {
				return;
			}

			// Redirect based on the first valid route in accessTo
			if (accessTo.includes("JannatTools")) {
				history.push("/admin/jannatbooking-tools?tab=calculator");
			} else if (accessTo.includes("CustomerService")) {
				history.push("/admin/customer-service?tab=active-client-cases");
			} else if (accessTo.includes("HotelsReservations")) {
				history.push("/admin/all-reservations");
			} else if (accessTo.includes("JannatBookingWebsite")) {
				history.push("/admin/janat-website");
			} else if (accessTo.includes("AdminDashboard")) {
				history.push("/admin/dashboard");
			} else {
				history.push("/"); // Redirect to home if no valid route
			}
		}
	}, [getUser, history, isSuperAdmin]);

	// Fetch all hotel details for admin
	const adminAllHotelDetails = useCallback(() => {
		gettingHotelDetailsForAdmin(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error getting all hotel details");
			} else {
				// Sort data alphabetically by hotelName before setting it in state
				const sortedData = data.sort((a, b) =>
					a.hotelName.localeCompare(b.hotelName)
				);
				setAllHotelDetailsAdmin(sortedData);
			}
		});
	}, [user._id, token]);

	// Fetch user details and hotel data on component mount
	useEffect(() => {
		gettingUserId();
		adminAllHotelDetails();

		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [gettingUserId, adminAllHotelDetails]);

	return (
		<IntegratorMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='ElIntegrator'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='ElIntegrator'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					)}
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						<div>
							{allHotelDetailsAdmin && allHotelDetailsAdmin.length > 0 ? (
								<ContentOfIntegrator
									allHotelDetailsAdmin={allHotelDetailsAdmin}
								/>
							) : (
								<div>No Hotel Found</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</IntegratorMainWrapper>
	);
};

export default IntegratorMain;

const IntegratorMainWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */
	margin-top: 20px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 75%" : "17% 75%")};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;
