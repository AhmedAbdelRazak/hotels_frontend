import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import OwnerRegisterForm from "./OwnerRegisterForm";
import { isAuthenticated } from "../../auth";
import { gettingHotelDetailsForAdmin } from "../apiAdmin";

const AddOwnerAccount = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [allHotelDetailsAdmin, setAllHotelDetailsAdmin] = useState("");

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
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		adminAllHotelDetails();
		// eslint-disable-next-line
	}, []);

	return (
		<AddOwnerAccountWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='OwnerAccount'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='OwnerAccount'
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
						{allHotelDetailsAdmin && allHotelDetailsAdmin.length > 0 ? (
							<OwnerRegisterForm allHotelDetailsAdmin={allHotelDetailsAdmin} />
						) : null}
					</div>
				</div>
			</div>
		</AddOwnerAccountWrapper>
	);
};

export default AddOwnerAccount;

const AddOwnerAccountWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */
	margin-top: 0;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => {
			const nav = props.show ? "70px" : "285px";
			return props.dir === "rtl" ? `1fr ${nav}` : `${nav} 1fr`;
		}};
		grid-template-areas: ${(props) =>
			props.dir === "rtl" ? "'content nav'" : "'nav content'"};
	}

	.navcontent {
		grid-area: nav;
	}

	.otherContentWrapper {
		grid-area: content;
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 20px 10px;
	}

	@media (max-width: 1400px) {
		background: white;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "nav" "content";
		}
	}
`;
