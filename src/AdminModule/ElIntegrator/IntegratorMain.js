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
	const [allHotelDetailsAdmin, setAllHotelDetailsAdmin] = useState([]); // ← array, not string
	const [getUser, setGetUser] = useState(null);

	const { user, token } = isAuthenticated() || {};
	const history = useHistory();

	// ---- helpers ----
	const extractHotels = (payload) => {
		// If it's already an array
		if (Array.isArray(payload)) return payload;

		// Common shapes: {hotels: [...]}, {data: [...]}, {results: [...]}, {items: [...]}
		const candidateKeys = [
			"hotels",
			"data",
			"results",
			"items",
			"docs",
			"list",
		];
		if (payload && typeof payload === "object") {
			for (const k of candidateKeys) {
				if (Array.isArray(payload[k])) return payload[k];
			}
			// Fallback: first array-valued property
			const firstArray = Object.values(payload).find(Array.isArray);
			if (Array.isArray(firstArray)) return firstArray;
		}

		return [];
	};

	// Fetch user details (guarded)
	const gettingUserId = useCallback(() => {
		if (!user?._id || !token) return;
		readUserId(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error fetching user details");
			} else {
				setGetUser(data);
			}
		});
	}, [user?._id, token]);

	// Determine if the user is a Super Admin
	const isSuperAdmin =
		!getUser?.accessTo ||
		getUser?.accessTo.length === 0 ||
		getUser?.accessTo.includes("all");

	// Validate user and handle access control
	useEffect(() => {
		if (!getUser) return;

		if (!getUser.activeUser) {
			history.push("/");
			return;
		}

		const accessTo = getUser.accessTo || [];

		if (isSuperAdmin || accessTo.includes("Integrator")) {
			return;
		}

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
			history.push("/");
		}
	}, [getUser, history, isSuperAdmin]);

	// Fetch all hotel details for admin (guarded + normalized)
	const adminAllHotelDetails = useCallback(() => {
		if (!user?._id || !token) return;

		gettingHotelDetailsForAdmin(user._id, token)
			.then((data) => {
				const hotels = extractHotels(data);

				const sorted = [...hotels].filter(Boolean).sort((a, b) =>
					(a?.hotelName || "").localeCompare(b?.hotelName || "", undefined, {
						sensitivity: "base",
					})
				);

				setAllHotelDetailsAdmin(sorted);
			})
			.catch((err) => {
				console.error("Error getting all hotel details", err);
				setAllHotelDetailsAdmin([]);
			});
	}, [user?._id, token]);

	// On mount
	useEffect(() => {
		gettingUserId();
		adminAllHotelDetails();

		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
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
							{Array.isArray(allHotelDetailsAdmin) &&
							allHotelDetailsAdmin.length > 0 ? (
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
