import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { useCartContext } from "../../cart_context";
import CustomerServiceDetailsHotels from "./CustomerServiceDetailsHotels";
import { getStoredMenuCollapsed } from "../utils/menuState";

const CustomerServiceHotelMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const { chosenLanguage } = useCartContext();

	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		// eslint-disable-next-line
	}, [hasStoredCollapsed]);

	return (
		<CustomerServiceHotelMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
			isArabic={chosenLanguage === "Arabic"}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='HotelSettings'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='HotelSettings'
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
						<CustomerServiceDetailsHotels />
					</div>
				</div>
			</div>
		</CustomerServiceHotelMainWrapper>
	);
};

export default CustomerServiceHotelMain;

const CustomerServiceHotelMainWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */
	margin-top: 76px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 85%" : "15% 84%")};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}

	tr {
		text-align: ${(props) => (props.isArabic ? "right" : "")};
	}

	.tab-grid {
		display: flex;
		/* Additional styling for grid layout */
	}

	@media (max-width: 1600px) {
		.grid-container-main {
			grid-template-columns: ${(props) =>
				props.show ? "5% 90%" : props.showList ? "13% 87%" : "19% 81%"};
		}
	}
`;
