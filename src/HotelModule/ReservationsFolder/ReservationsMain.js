import React, { useState, useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import {
	getHotelDetails,
	getReservationSummary,
	hotelAccount,
	reservationsList,
	reservationsTotalRecords,
} from "../apiAdmin";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import PreReservationTable from "../ReservationsFolder/PreReservationTable";
import { Spin } from "antd";
import { useCartContext } from "../../cart_context";
import { getStoredMenuCollapsed } from "../utils/menuState";

const ReservationsMain = () => {
	const history = useHistory();
	const location = useLocation();
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed } = getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [allPreReservations, setAllPreReservations] = useState([]);
	const [loading, setLoading] = useState(false);
	const getPageFromSearch = (search) => {
		const params = new URLSearchParams(search || "");
		const pageParam = parseInt(params.get("page"), 10);
		return Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
	};
	const getSearchTermFromSearch = (search) => {
		const params = new URLSearchParams(search || "");
		return params.get("search") || "";
	};

	const [currentPage, setCurrentPage] = useState(() =>
		getPageFromSearch(location.search)
	); // New state for current page
	const [recordsPerPage] = useState(50); // You can adjust this as needed
	const [selectedFilter, setSelectedFilter] = useState(""); // New state for selected filter
	const [totalRecords, setTotalRecords] = useState(0);
	const [hotelDetails, setHotelDetails] = useState(0);
	const [reservationObject, setReservationObject] = useState("");
	const [selectedDates, setSelectedDates] = useState("");
	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState("desc");

	const [searchTerm, setSearchTerm] = useState(() =>
		getSearchTermFromSearch(location.search)
	);
	const [q, setQ] = useState(() => getSearchTermFromSearch(location.search));

	// eslint-disable-next-line
	const { user, token } = isAuthenticated();
	const { chosenLanguage, languageToggle } = useCartContext();
	const isOrderTakingUser =
		Number(user?.role) === 7000 ||
		(Array.isArray(user?.roles) && user.roles.map(Number).includes(7000)) ||
		String(user?.roleDescription || "").toLowerCase() === "ordertaker" ||
		(Array.isArray(user?.roleDescriptions) &&
			user.roleDescriptions
				.map((item) => String(item || "").toLowerCase())
				.includes("ordertaker")) ||
		(Array.isArray(user?.accessTo) && user.accessTo.includes("ownReservations"));

	const formatDate = (date) => {
		const d = new Date(date);
		let month = "" + (d.getMonth() + 1);
		let day = "" + d.getDate();
		const year = d.getFullYear();

		if (month.length < 2) month = "0" + month;
		if (day.length < 2) day = "0" + day;

		return [year, month, day].join("-");
	};

	const getAllPreReservation = (activeSearchTerm = "") => {
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
							const dateToUse = selectedDates
								? selectedDates
								: formatDate(new Date());
							const filtersPayload = JSON.stringify({
								selectedFilter,
								searchQuery: activeSearchTerm || "",
								sortBy,
								sortOrder,
								createdByUserId: isOrderTakingUser ? user?._id : "",
							});

							reservationsList(
								currentPage,
								recordsPerPage,
								filtersPayload,
								data2[0]._id,
								dateToUse // Pass the formatted date
							)
								.then((data) => {
									if (data && data.error) {
										console.log(data.error);
									} else {
										setAllPreReservations(data && data.length > 0 ? data : []);
										reservationsTotalRecords(
											currentPage,
											recordsPerPage,
											filtersPayload,
											data2[0]._id,
											dateToUse // Pass the formatted date
										).then((data) => {
											if (data && data.error) {
												console.log(data.error);
											} else {
												setTotalRecords(data.total); // Set total records
											}
										});

										getReservationSummary(data2[0]._id, dateToUse).then(
											(data2) => {
												if (data2 && data2.error) {
													console.log("Error summary");
												} else {
													console.log(data2, "data2");
													setReservationObject(data2);
												}
											}
										);

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
		const pageFromQuery = getPageFromSearch(location.search);
		const searchFromQuery = getSearchTermFromSearch(location.search);
		setCurrentPage((prev) =>
			prev !== pageFromQuery ? pageFromQuery : prev
		);
		setSearchTerm((prev) =>
			prev !== searchFromQuery ? searchFromQuery : prev
		);
		setQ((prev) => (prev !== searchFromQuery ? searchFromQuery : prev));
	}, [location.search]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const desiredPage = String(currentPage);
		const desiredSearch = (searchTerm || "").trim();
		let changed = false;

		if (params.get("page") !== desiredPage) {
			params.set("page", desiredPage);
			changed = true;
		}

		if (desiredSearch) {
			if (params.get("search") !== desiredSearch) {
				params.set("search", desiredSearch);
				changed = true;
			}
		} else if (params.has("search")) {
			params.delete("search");
			changed = true;
		}

		if (!changed) return;
		const nextSearch = params.toString();
		history.replace({
			pathname: location.pathname,
			search: nextSearch ? `?${nextSearch}` : "",
		});
	}, [
		currentPage,
		searchTerm,
		history,
		location.pathname,
		location.search,
	]);

	useEffect(() => {
		// Fetch total records

		getAllPreReservation(searchTerm);
		// eslint-disable-next-line
	}, [currentPage, selectedFilter, selectedDates, searchTerm, sortBy, sortOrder]);

	const handleSearch = (value) => {
		const trimmed = String(value || "").trim();
		setSearchTerm(trimmed);
		setCurrentPage(1);
	};

	const handlePageChange = (newPage) => {
		setCurrentPage(newPage);
	};

	const handleFilterChange = (newFilter) => {
		setSelectedFilter(newFilter);
		setCurrentPage(1); // Reset to first page when filter changes
	};

	const handleSortChange = (nextSortBy) => {
		setSortBy((previousSortBy) => {
			setSortOrder((previousSortOrder) =>
				previousSortBy === nextSortBy && previousSortOrder === "asc"
					? "desc"
					: "asc"
			);
			return nextSortBy;
		});
		setCurrentPage(1);
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
								<div>
									<PreReservationTable
										allPreReservations={allPreReservations}
										setQ={setQ}
										q={q}
										chosenLanguage={chosenLanguage}
										onSearch={handleSearch}
										handlePageChange={handlePageChange}
										handleFilterChange={handleFilterChange}
										currentPage={currentPage}
										recordsPerPage={recordsPerPage}
										selectedFilter={selectedFilter}
										setSelectedFilter={setSelectedFilter}
										totalRecords={totalRecords}
										setAllPreReservations={setAllPreReservations}
										getAllPreReservation={getAllPreReservation}
										hotelDetails={hotelDetails}
										reservationObject={reservationObject}
										setSelectedDates={setSelectedDates}
										selectedDates={selectedDates}
										sortBy={sortBy}
										sortOrder={sortOrder}
										onSortChange={handleSortChange}
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
	margin-top: 50px;
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
