import React, { useEffect, useState, useCallback } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { getAllReservationForAdmin } from "../apiAdmin";
import ContentTable from "./ContentTable";

const AllReservationMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [allReservationsForAdmin, setAllReservationForAdmin] = useState([]);
	const [currentPage, setCurrentPage] = useState(1); // Current page number
	const [pageSize, setPageSize] = useState(300); // Number of records per page

	useEffect(() => {
		const handleResize = () => {
			setCollapsed(window.innerWidth <= 1000);
		};

		// Initial check
		handleResize();

		// Add event listener
		window.addEventListener("resize", handleResize);

		// Cleanup on unmount
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	const { user, token } = isAuthenticated();

	const gettingAllReservationForAdmin = useCallback(() => {
		getAllReservationForAdmin(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error getting all hotel details");
				alert("Failed to fetch reservations. Please try again.");
			} else {
				setAllReservationForAdmin(data);
			}
		});
	}, [user._id, token]);

	useEffect(() => {
		gettingAllReservationForAdmin();
	}, [gettingAllReservationForAdmin]);

	return (
		<AllReservationMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='AllReservations'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='AllReservations'
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
							{allReservationsForAdmin &&
							allReservationsForAdmin.data &&
							allReservationsForAdmin.data.length > 0 ? (
								<ContentTable
									allReservationsForAdmin={allReservationsForAdmin}
									currentPage={currentPage}
									setCurrentPage={setCurrentPage}
									pageSize={pageSize}
									setPageSize={setPageSize}
								/>
							) : (
								<div>No Reservations Found</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</AllReservationMainWrapper>
	);
};

export default AllReservationMain;

const AllReservationMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 20px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 75%" : "17% 83%")};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}

	@media (max-width: 768px) {
		.grid-container-main {
			grid-template-columns: 1fr;
		}
	}
`;
