import React, { useState, useEffect } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import {
	getHotelDetails,
	getPaginatedListHotelRunner,
	hotelAccount,
	prerservationAuto,
	reservationsList,
	reservationsTotalRecords,
} from "../apiAdmin";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import PreReservationTable from "../ReservationsFolder/PreReservationTable";
import { Spin } from "antd";
import { useCartContext } from "../../cart_context";

const ReservationsMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [allPreReservations, setAllPreReservations] = useState([]);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1); // New state for current page
	const [recordsPerPage] = useState(50); // You can adjust this as needed
	const [selectedFilter, setSelectedFilter] = useState(""); // New state for selected filter
	const [totalRecords, setTotalRecords] = useState(0);
	const [hotelDetails, setHotelDetails] = useState(0);

	const [q, setQ] = useState("");
	const [searchClicked, setSearchClicked] = useState(false);
	const [decrement, setDecrement] = useState(0);

	// eslint-disable-next-line
	const { user, token } = isAuthenticated();
	const { chosenLanguage, languageToggle } = useCartContext();

	const formatDate = (date) => {
		const d = new Date(date);
		let month = "" + (d.getMonth() + 1);
		let day = "" + d.getDate();
		const year = d.getFullYear();

		if (month.length < 2) month = "0" + month;
		if (day.length < 2) day = "0" + day;

		return [year, month, day].join("-");
	};

	const getAllPreReservation = () => {
		setLoading(true); // Set loading to true when fetching data

		hotelAccount(user._id, token, user._id).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error rendering");
			} else {
				getHotelDetails(data._id).then((data2) => {
					if (data2 && data2.error) {
						console.log(data2.error, "Error rendering");
					} else {
						if (data && data.name && data._id && data2 && data2.length > 0) {
							setHotelDetails(data2[0]);
							const today = formatDate(new Date()); // Format today's date

							reservationsList(
								currentPage,
								recordsPerPage,
								JSON.stringify({ selectedFilter }),
								data2[0]._id,
								today // Pass the formatted date
							)
								.then((data) => {
									if (data && data.error) {
										console.log(data.error);
									} else {
										setAllPreReservations(data && data.length > 0 ? data : []);
										reservationsTotalRecords(data2[0]._id).then((data) => {
											if (data && data.error) {
												console.log(data.error);
											} else {
												setTotalRecords(data.total); // Set total records
											}
										});
										setLoading(false);
									}
								})
								.catch((err) => console.log(err))
								.finally(() => setLoading(false)); // Set loading to false after fetching
						}
					}
				});
			}
		});
	};

	useEffect(() => {
		// Fetch total records

		if (!searchClicked || !q) {
			getAllPreReservation();
		}
		// eslint-disable-next-line
	}, [currentPage, selectedFilter, searchClicked]);

	const handlePageChange = (newPage) => {
		setCurrentPage(newPage);
	};

	const handleFilterChange = (newFilter) => {
		setSelectedFilter(newFilter);
		setCurrentPage(1); // Reset to first page when filter changes
	};

	const addPreReservations = () => {
		const isConfirmed = window.confirm(
			chosenLanguage === "Arabic"
				? "قد تستغرق هذه العملية بضع دقائق، هل تريد المتابعة؟"
				: "This may take a few minutes, Do you want to proceed?"
		);
		if (!isConfirmed) return;

		setLoading(true);
		getPaginatedListHotelRunner(1, 15).then((data0) => {
			if (data0 && data0.error) {
				console.log(data0.error);
			} else {
				prerservationAuto(
					data0.pages - decrement,
					hotelDetails._id,
					hotelDetails.belongsTo._id
				).then((data) => {
					if (data) {
						console.log(data, "data from prereservation");
					}
					setDecrement(decrement + 3);
					setLoading(false);
				});
			}
		});
	};

	return (
		<ReservationsMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
			isArabic={chosenLanguage === "Arabic"}
		>
			{loading ? (
				<>
					<div className='text-center my-5'>
						<Spin size='large' />
						<p>
							{" "}
							{chosenLanguage === "Arabic" ? "" : ""} Loading Reservations...
						</p>
					</div>
				</>
			) : (
				<>
					<div className='grid-container-main'>
						<div className='navcontent'>
							{chosenLanguage === "Arabic" ? (
								<AdminNavbarArabic
									fromPage='Reservations'
									AdminMenuStatus={AdminMenuStatus}
									setAdminMenuStatus={setAdminMenuStatus}
									collapsed={collapsed}
									setCollapsed={setCollapsed}
									chosenLanguage={chosenLanguage}
								/>
							) : (
								<AdminNavbar
									fromPage='Reservations'
									AdminMenuStatus={AdminMenuStatus}
									setAdminMenuStatus={setAdminMenuStatus}
									collapsed={collapsed}
									setCollapsed={setCollapsed}
									chosenLanguage={chosenLanguage}
								/>
							)}
						</div>

						<div className='otherContentWrapper'>
							<div
								style={{
									textAlign: chosenLanguage === "Arabic" ? "left" : "right",
									fontWeight: "bold",
									textDecoration: "underline",
									cursor: "pointer",
								}}
								onClick={() => {
									if (chosenLanguage === "English") {
										languageToggle("Arabic");
									} else {
										languageToggle("English");
									}
								}}
							>
								{chosenLanguage === "English" ? "ARABIC" : "English"}
							</div>

							<div className='container-wrapper'>
								<div
									className='mx-auto mb-5 mt-4 text-center'
									onClick={() => {
										addPreReservations();
									}}
								>
									<button
										className='btn btn-success'
										style={{ fontWeight: "bold" }}
									>
										{chosenLanguage === "Arabic"
											? "تنزيل جميع الحجوزات من Booking.com وExpedia وTrivago؟"
											: "Get All Reservations from Booking.com, Expedia & Trivago?"}
									</button>
								</div>
								<div>
									<PreReservationTable
										allPreReservations={allPreReservations}
										setQ={setQ}
										q={q}
										chosenLanguage={chosenLanguage}
										handlePageChange={handlePageChange}
										handleFilterChange={handleFilterChange}
										currentPage={currentPage}
										recordsPerPage={recordsPerPage}
										selectedFilter={selectedFilter}
										setSelectedFilter={setSelectedFilter}
										totalRecords={totalRecords}
										setAllPreReservations={setAllPreReservations}
										setSearchClicked={setSearchClicked}
										searchClicked={searchClicked}
										getAllPreReservation={getAllPreReservation}
									/>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</ReservationsMainWrapper>
	);
};

export default ReservationsMain;

const ReservationsMainWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */
	margin-top: 20px;
	min-height: 750px;
	/* background-color: #f0f0f0; */

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 90%" : "15% 85%")};
	}

	text-align: ${(props) => (props.isArabic ? "right" : "")};

	.container-wrapper {
		/* border: 2px solid lightgrey; */
		padding: 20px;
		border-radius: 20px;
		/* background: white; */
		margin: 0px 10px;
	}

	.tab-grid {
		display: flex;
		/* Additional styling for grid layout */
	}

	h3 {
		font-weight: bold;
		font-size: 2rem;
		text-align: center;
		color: #006ad1;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;
