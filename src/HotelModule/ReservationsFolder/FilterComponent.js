import React, { useState } from "react";
import styled from "styled-components";
import { Modal, DatePicker, Button } from "antd";

const FiltersContainer = styled.div`
	display: flex;
	justify-content: space-around;
	background: #f8f8f8;
	padding: 10px;
	border-bottom: 2px solid #e1e1e1;
`;

const FilterGroup = styled.div`
	display: flex;
	gap: 10px;
	align-items: center;
`;

const FilterButton = styled(Button)`
	&.ant-btn {
		background: ${({ active }) => (active ? "lightgrey" : "white")};
		border: 1px solid #ccc;
		position: relative; // For notification positioning
		font-weight: ${({ active }) => (active ? "bold" : "normal")};
	}
`;

const Notification = styled.span`
	background-color: #00468b;
	border-radius: 50%;
	color: white;
	padding: 2px 6px;
	font-size: 12px;
	position: absolute;
	top: -20px;
	right: -0px;
`;

const FilterComponent = ({
	selectedFilter,
	setSelectedFilter,
	chosenLanguage,
	setSelectedDates, // Adjusted to handle setting date as a string
	reservationObject,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isModalVisible2, setIsModalVisible2] = useState(false);
	const [dateString, setDateString] = useState(""); // Temporary state to hold the date string

	const handleOk = () => {
		setSelectedDates(dateString); // Set selected date on OK
		setIsModalVisible(false); // Close modal
	};

	const handleCancel = () => {
		setIsModalVisible(false);
	};

	const handleOk2 = () => {
		setSelectedDates(dateString); // Set selected date on OK
		setIsModalVisible2(false); // Close modal
	};

	const handleCancel2 = () => {
		setIsModalVisible2(false);
	};

	const handleDateChange = (date, dateString) => {
		setDateString(dateString); // Update temporary date string state
	};

	const handleDateChange2 = (date, dateString) => {
		setDateString(dateString); // Update temporary date string state
	};

	const safeReservationObject =
		reservationObject && typeof reservationObject === "object"
			? reservationObject
			: {};

	const getCount = (value) => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	};

	// Define filter labels in both English and Arabic
	const filterLabels = {
		All: chosenLanguage === "Arabic" ? "إختيار الكل" : "All",
		"Today's New Reservations":
			chosenLanguage === "Arabic" ? "حجز جديد" : "New Reservation",
		Cancelations: chosenLanguage === "Arabic" ? "الإلغاءات" : "Cancelations",
		"Today's Arrivals":
			chosenLanguage === "Arabic" ? "وصول اليوم" : "Today's Arrivals",
		"Today's Departures":
			chosenLanguage === "Arabic" ? "مغادرة اليوم" : "Today's Departures",
		"In House": chosenLanguage === "Arabic" ? "في المنزل" : "In House",
		"Incomplete reservations":
			chosenLanguage === "Arabic"
				? "الحجوزات الغير مكتملة"
				: "Incomplete reservations",
		"Specific Date":
			chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Checkin Date",
		"Specific Date2":
			chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Checkout Date",
		no_show: chosenLanguage === "Arabic" ? "No Show" : "No Show",
	};

	const handleFilterClick = (filterName) => {
		if (filterName === "Specific Date" || filterName === "Specific Date2") {
			setIsModalVisible(true); // Directly show modal for date filters
		} else if (filterName === "no_show") {
			setIsModalVisible2(true); // Directly show modal for date filters
		} else {
			setIsModalVisible(false); // Ensure modal is not shown for other filters
			setIsModalVisible2(false); // Ensure modal is not shown for other filters
			setSelectedDates(""); // Clear date string for non-date filters
		}
		setSelectedFilter(filterName); // Update selected filter
	};

	// Map filter names to their corresponding keys in reservationObject for count display
	const filterCounts = {
		"Today's New Reservations": getCount(safeReservationObject.newReservations),
		Cancelations: getCount(safeReservationObject.cancellations),
		"Today's Arrivals": getCount(safeReservationObject.todayArrival),
		"Today's Departures": getCount(safeReservationObject.departureToday),
		"In House": getCount(safeReservationObject.inHouse),
		"Incomplete reservations": getCount(safeReservationObject.inComplete),
		All: getCount(safeReservationObject.allReservations),
	};

	console.log(filterCounts, "filterCounts");

	return (
		<FiltersContainer>
			<FilterGroup>
				{Object.entries(filterLabels).map(([key, label]) => (
					<FilterButton
						key={key}
						active={selectedFilter === key}
						onClick={() => handleFilterClick(key)}
					>
						{label}
						{/* Display count if available */}
						{filterCounts[key] ? (
							<Notification>{filterCounts[key]}</Notification>
						) : null}
					</FilterButton>
				))}
			</FilterGroup>
			<Modal
				title={
					selectedFilter === "Specific Date"
						? chosenLanguage === "Arabic"
							? "اختر تاريخ الوصول"
							: "Select Checkin Date"
						: chosenLanguage === "Arabic"
						  ? "اختر تاريخ المغادرة"
						  : "Select Checkout Date"
				}
				open={isModalVisible}
				onOk={handleOk}
				onCancel={handleCancel}
			>
				<DatePicker onChange={handleDateChange} />
			</Modal>

			<Modal
				title={
					selectedFilter === "no_show"
						? "Select No Show Date"
						: "Select No Show Date"
				}
				open={isModalVisible2}
				onOk={handleOk2}
				onCancel={handleCancel2}
			>
				<DatePicker onChange={handleDateChange2} />
			</Modal>
		</FiltersContainer>
	);
};

export default FilterComponent;
