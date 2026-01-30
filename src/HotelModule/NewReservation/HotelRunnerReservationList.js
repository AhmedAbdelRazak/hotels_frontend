import React, { useState, useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
	agodaData,
	airbnbData,
	bookingData,
	expediaData,
	getReservationSummary,
	janatData,
	reservationsList,
	reservationsTotalRecords,
} from "../apiAdmin";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import PreReservationTable from "../ReservationsFolder/PreReservationTable";
import { Spin } from "antd";
import { toast } from "react-toastify";

const HotelRunnerReservationList = ({
	chosenLanguage,
	hotelDetails,
	isBoss,
}) => {
	const history = useHistory();
	const location = useLocation();
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
	const [recordsPerPage] = useState(70); // You can adjust this as needed
	const [selectedFilter, setSelectedFilter] = useState(""); // New state for selected filter
	const [totalRecords, setTotalRecords] = useState(0);
	const [selectedDates, setSelectedDates] = useState("");
	const [reservationObject, setReservationObject] = useState("");

	const [searchTerm, setSearchTerm] = useState(() =>
		getSearchTermFromSearch(location.search)
	);
	const [q, setQ] = useState(() => getSearchTermFromSearch(location.search));

	// eslint-disable-next-line
	const { user } = isAuthenticated();

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
		const dateToUse = selectedDates ? selectedDates : formatDate(new Date());
		const filtersPayload = JSON.stringify({
			selectedFilter,
			searchQuery: activeSearchTerm || "",
		});
		reservationsList(
			currentPage,
			recordsPerPage,
			filtersPayload,
			hotelDetails._id,
			dateToUse // Pass the formatted date
		)
			.then((data) => {
				if (data && data.error) {
					console.log(data.error);
				} else {
					setAllPreReservations(data && data.length > 0 ? data : []);
					getReservationSummary(hotelDetails._id, dateToUse).then((data2) => {
						if (data2 && data2.error) {
							console.log("Error summary");
						} else {
							setReservationObject(data2);
						}
					});
				}
			})
			.catch((err) => console.log(err))
			.finally(() => setLoading(false)); // Set loading to false after fetching
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
		const dateToUse = selectedDates ? selectedDates : formatDate(new Date());
		const filtersPayload = JSON.stringify({
			selectedFilter,
			searchQuery: searchTerm || "",
		});

		// Fetch total records
		reservationsTotalRecords(
			currentPage,
			recordsPerPage,
			filtersPayload,
			hotelDetails._id,
			dateToUse // Pass the formatted date
		).then((data) => {
			if (data && data.error) {
				console.log(data.error);
			} else {
				setTotalRecords(data.total); // Set total records
			}
		});
		getAllPreReservation(searchTerm);
		// eslint-disable-next-line
	}, [currentPage, selectedFilter, selectedDates, searchTerm]);

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

	const handleFileUpload = (uploadFunction) => {
		// Ask the user if the upload is from the US
		const isFromUS = window.confirm(
			"Is this upload from the US? Click OK for Yes, Cancel for No."
		);

		// Determine the country parameter based on user response
		const country = isFromUS ? "US" : "NotUS";

		const accountId = hotelDetails._id; // Get the account ID
		const belongsTo = user._id;
		const fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept =
			".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"; // Accept Excel and CSV files
		fileInput.onchange = (e) => {
			setLoading(true);
			const file = e.target.files[0];
			uploadFunction(accountId, belongsTo, file, country).then((data) => {
				setLoading(false);
				if (data.error) {
					console.log(data.error);
					toast.error("Error uploading data");
				} else {
					toast.success("Data uploaded successfully!");
				}
			});
		};
		fileInput.click(); // Simulate a click on the file input
	};

	return (
		<HotelRunnerReservationListWrapper>
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
					{isBoss ? (
						<div className='mx-auto mb-5 mt-4 text-center'>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(agodaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات أجودا"
									: "Agoda Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(expediaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات إكسبيديا"
									: "Expedia Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(bookingData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات بوكينج"
									: "Booking Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(airbnbData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات Airbnb"
									: "Airbnb Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(janatData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات Janat"
									: "Janat Upload"}
							</button>
						</div>
					) : null}
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
							selectedDates={selectedDates}
							setSelectedDates={setSelectedDates}
							reservationObject={reservationObject}
						/>
					</div>
				</>
			)}
		</HotelRunnerReservationListWrapper>
	);
};

export default HotelRunnerReservationList;

const HotelRunnerReservationListWrapper = styled.div`
	margin-top: 50px;
	margin-bottom: 50px;
	margin-right: 20px;
`;
