import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import ContentOfIntegrator from "./ContentOfIntegrator";
import { isAuthenticated } from "../../auth";
import { gettingHotelDetailsForAdmin } from "../apiAdmin";

const IntegratorMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [allHotelDetailsAdmin, setAllHotelDetailsAdmin] = useState("");

	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, []);

	const { user, token } = isAuthenticated();
	const adminAllHotelDetails = () => {
		gettingHotelDetailsForAdmin(user._id, token).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error getting all hotel details");
			} else {
				setAllHotelDetailsAdmin(data);
			}
		});
	};

	useEffect(() => {
		adminAllHotelDetails();
		// eslint-disable-next-line
	}, []);

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
