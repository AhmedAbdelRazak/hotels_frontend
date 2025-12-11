import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { gettingHotelDetailsForAdmin } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import MainHotelDashboard from "./MainHotelDashboard";

const AddedHotelsMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	// eslint-disable-next-line
	const [allHotelDetailsAdmin, setAllHotelDetailsAdmin] = useState("");

	const { user, token } = isAuthenticated();
	const adminAllHotelDetails = () => {
		gettingHotelDetailsForAdmin(user._id, token).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error getting all hotel details");
			} else {
				setAllHotelDetailsAdmin(data);
				console.log(data);
			}
		});
	};

	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
		adminAllHotelDetails();
		// eslint-disable-next-line
	}, []);

	return (
		<AddedHotelsMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='AddedHotels'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='AddedHotels'
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
						<h3 className='mb-3'>All Added Hotels</h3>
						<div>
							<MainHotelDashboard />
						</div>
					</div>
				</div>
			</div>
		</AddedHotelsMainWrapper>
	);
};

export default AddedHotelsMain;

const AddedHotelsMainWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.show ? "70px 1fr" : "285px 1fr"};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 20px 10px;
	}

	h3 {
		font-weight: bold;
		font-size: 1.5rem;
		text-align: center;
		color: #006ad1;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;
