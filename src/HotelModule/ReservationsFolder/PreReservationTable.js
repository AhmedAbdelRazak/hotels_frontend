import React, { useState } from "react";
import styled from "styled-components";
import moment from "moment";
import FilterComponent from "./FilterComponent";
import { Modal, Pagination, Table } from "antd";
import { getReservationSearchAllMatches } from "../apiAdmin";
import ReservationDetail from "./ReservationDetail";
import DownloadExcel from "./DownloadExcel";

const PreReservationTable = ({
	allPreReservations,
	q,
	setQ,
	chosenLanguage,
	handlePageChange,
	handleFilterChange,
	currentPage,
	recordsPerPage,
	selectedFilter,
	setSelectedFilter,
	totalRecords,
	hotelDetails,
	setAllPreReservations,
	setSearchClicked,
	searchClicked,
	selectedDates,
	setSelectedDates,
	reservationObject,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);
	const [modalKey, setModalKey] = useState(0);

	console.log(allPreReservations, "allPreReservations");

	const searchSubmit = (e) => {
		e.preventDefault();
		if (!q) {
			setSearchClicked(!searchClicked);
			setQ("");
			return;
		}

		getReservationSearchAllMatches(q, hotelDetails._id)
			.then((data) => {
				if (data && data.error) {
					console.log("Search error:", data.error);
				} else {
					setAllPreReservations(Array.isArray(data) ? data : [data]);
				}
			})
			.catch((error) => {
				console.error("Error in getReservationSearch:", error);
				// Handle additional error logic here
			});
	};

	// eslint-disable-next-line
	function getTotalAmount(reservation) {
		const dailyTotal =
			reservation.pickedRoomsType.reduce(
				(acc, room) => acc + Number(room.chosenPrice) * room.count,
				0
			) + Number(0);
		return dailyTotal * reservation.days_of_residence;
	}

	const columns = [
		{
			title: "#",
			dataIndex: "index",
			width: 70,
			key: "index",
			render: (text, record, index) =>
				(currentPage - 1) * recordsPerPage + index + 1,
		},
		{
			title: chosenLanguage === "Arabic" ? "اسم الزائر" : "Client Name",
			dataIndex: "customer_details",
			key: "name",
			render: (customer_details) => customer_details.name,
		},
		{
			title: chosenLanguage === "Arabic" ? "الهاتف" : "Client Phone",
			dataIndex: "customer_details",
			width: 120,
			key: "phone",
			render: (customer_details) => customer_details.phone,
		},
		{
			title: chosenLanguage === "Arabic" ? "رقم التأكيد" : "Confirmation",
			dataIndex: "confirmation_number",
			key: "confirmation_number",
		},
		{
			title: chosenLanguage === "Arabic" ? "مصدر الحجز" : "Source",
			dataIndex: "booking_source",
			width: 100,
			key: "booking_source",
		},
		{
			title: chosenLanguage === "Arabic" ? "تاريخ الحجز" : "Booked On",
			dataIndex: "booked_at",
			key: "booked_at",
			render: (booked_at) => new Date(booked_at).toDateString(),
		},
		{
			title: chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Check In",
			dataIndex: "checkin_date",
			key: "checkin_date",
			render: (checkin_date) => moment(checkin_date).format("YYYY-MM-DD"),
		},
		{
			title: chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Check Out",
			dataIndex: "checkout_date",
			key: "checkout_date",
			render: (checkout_date) => moment(checkout_date).format("YYYY-MM-DD"),
		},
		{
			title: chosenLanguage === "Arabic" ? "حالة السداد" : "Payment Status",
			dataIndex: "payment",
			key: "payment",
		},
		{
			title: chosenLanguage === "Arabic" ? "حالة الحجز" : "Status",
			dataIndex: "reservation_status",
			key: "reservation_status",
			render: (reservation_status) => {
				let style = {};
				switch (reservation_status.toLowerCase()) {
					case "cancelled_by_guest":
					case "cancelled by guest":
					case "canceled":
					case "cancelled":
						style = {
							background: "red",
							color: "white",
							padding: "4px",
							textAlign: "center",
						};
						break;
					case "inhouse":
						style = {
							background: "#FFFACD",
							color: "black",
							padding: "4px",
							textAlign: "center",
						}; // Light yellow background
						break;
					case "closed":
					case "checked_out":
					case "early_checked_out":
						style = {
							background: "#90EE90",
							color: "green",
							padding: "4px",
							textAlign: "center",
						}; // Light green background
						break;
					case "confirmed":
						style = {
							background: "",
							color: "black",
							padding: "4px",
							textAlign: "center",
						};
						break;
					default:
						style = { padding: "4px", textAlign: "center" };
				}
				return <div style={style}>{reservation_status}</div>;
			},
		},
		{
			title: chosenLanguage === "Arabic" ? "أنواع الغرف" : "Room Types",
			dataIndex: "pickedRoomsType",
			width: 150,
			key: "pickedRoomsType",
			render: (pickedRoomsType) =>
				pickedRoomsType.map((room, index) => (
					<div key={index}>{`${room.room_type}`}</div>
				)),
		},
		{
			title: chosenLanguage === "Arabic" ? "رقم الغرفة" : "Room Number",
			key: "roomDetails",
			render: (record) => {
				// Check if 'record' and 'roomDetails' are available and have entries
				if (record && record.roomDetails && record.roomDetails.length > 0) {
					if (record.roomDetails.length > 1) {
						return (
							<div>
								<div>{record.roomDetails[0].room_number}</div>
								<button
									style={{
										background: "none",
										border: "none",
										color: "blue",
										cursor: "pointer",
										textDecoration: "underline",
										padding: "0",
										fontSize: "12px",
									}}
									onClick={() => {
										// Toggle visibility of remaining room numbers
										const roomDetailsElement = document.getElementById(
											`room-details-${record.confirmation_number}`
										);
										if (roomDetailsElement.style.display === "none") {
											roomDetailsElement.style.display = "block";
										} else {
											roomDetailsElement.style.display = "none";
										}
									}}
								>
									+{record.roomDetails.length - 1} more
								</button>
								<div
									id={`room-details-${record.confirmation_number}`}
									style={{ display: "none" }}
								>
									{record.roomDetails.slice(1).map((room, index) => (
										<div key={index}>
											{room.room_number ? room.room_number : "No Room"}
										</div>
									))}
								</div>
							</div>
						);
					} else {
						return (
							<div>
								{record.roomDetails[0].room_number
									? record.roomDetails[0].room_number
									: "No Room"}
							</div>
						);
					}
				} else if (record && record.roomId && record.roomId.length > 0) {
					if (record.roomId.length > 1) {
						return (
							<div>
								<div>{record.roomId[0].room_number}</div>
								<button
									style={{
										background: "none",
										border: "none",
										color: "blue",
										cursor: "pointer",
										textDecoration: "underline",
										padding: "0",
										fontSize: "12px",
									}}
									onClick={() => {
										// Toggle visibility of remaining room numbers
										const roomDetailsElement = document.getElementById(
											`room-details-${record.confirmation_number}`
										);
										if (roomDetailsElement.style.display === "none") {
											roomDetailsElement.style.display = "block";
										} else {
											roomDetailsElement.style.display = "none";
										}
									}}
								>
									+{record.roomId.length - 1} more
								</button>
								<div
									id={`room-details-${record.confirmation_number}`}
									style={{ display: "none" }}
								>
									{record.roomId.slice(1).map((room, index) => (
										<div key={index}>
											{room.room_number ? room.room_number : "No Room"}
										</div>
									))}
								</div>
							</div>
						);
					} else {
						return (
							<div>
								{record.roomId[0].room_number
									? record.roomId[0].room_number
									: "No Room"}
							</div>
						);
					}
				}

				// If neither is available, return "No Room"
				return "No Room";
			},
		},

		{
			title: chosenLanguage === "Arabic" ? "المبلغ الإجمالي" : "Total Amount",
			dataIndex: "total_amount",
			width: 110,
			key: "total_amount",
			render: (total_amount) =>
				`${total_amount && total_amount.toLocaleString()} SAR`,
		},
		{
			title: chosenLanguage === "Arabic" ? "تفاصيل" : "DETAILS...",
			key: "details",
			width: 80,
			render: (text, record) => (
				<button
					style={{
						color: "blue",
						cursor: "pointer",
						border: "none",
						backgroundColor: "transparent",
					}}
					onClick={() => showDetailsModal(record)}
				>
					{chosenLanguage === "Arabic" ? "التفاصيل..." : "Details..."}
				</button>
			),
		},
	];

	const columns2 = [
		{
			title: "#",
			dataIndex: "index",
			key: "index",
			render: (text, record, index) =>
				(currentPage - 1) * recordsPerPage + index + 1,
		},
		{
			title: chosenLanguage === "Arabic" ? "اسم الزائر" : "Client Name",
			dataIndex: "customer_details",
			key: "name",
			render: (customer_details) => customer_details.name,
		},

		{
			title: chosenLanguage === "Arabic" ? "رقم التأكيد" : "Confirmation",
			dataIndex: "confirmation_number",
			key: "confirmation_number",
		},
		{
			title: chosenLanguage === "Arabic" ? "مصدر الحجز" : "Source",
			dataIndex: "booking_source",
			key: "booking_source",
		},
		{
			title: chosenLanguage === "Arabic" ? "تاريخ الحجز" : "Booked On",
			dataIndex: "booked_at",
			key: "booked_at",
			render: (booked_at) => new Date(booked_at).toDateString(),
		},
		{
			title: chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Check In",
			dataIndex: "checkin_date",
			key: "checkin_date",
			render: (checkin_date) => moment(checkin_date).format("YYYY-MM-DD"),
		},
		{
			title: chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Check Out",
			dataIndex: "checkout_date",
			key: "checkout_date",
			render: (checkout_date) => moment(checkout_date).format("YYYY-MM-DD"),
		},

		{
			title: chosenLanguage === "Arabic" ? "حالة الحجز" : "Status",
			dataIndex: "reservation_status",
			key: "reservation_status",
			render: (reservation_status) => {
				let style = {};
				switch (reservation_status.toLowerCase()) {
					case "cancelled_by_guest":
					case "cancelled by guest":
					case "canceled":
					case "cancelled":
						style = {
							background: "red",
							color: "white",
							padding: "4px",
							textAlign: "center",
						};
						break;
					case "inhouse":
						style = {
							background: "#FFFACD",
							color: "black",
							padding: "4px",
							textAlign: "center",
						}; // Light yellow background
						break;
					case "closed":
					case "checked_out":
					case "early_checked_out":
						style = {
							background: "#90EE90",
							color: "green",
							padding: "4px",
							textAlign: "center",
						}; // Light green background
						break;
					case "confirmed":
						style = {
							background: "",
							color: "black",
							padding: "4px",
							textAlign: "center",
						};
						break;
					default:
						style = { padding: "4px", textAlign: "center" };
				}
				return <div style={style}>{reservation_status}</div>;
			},
		},
		{
			title: chosenLanguage === "Arabic" ? "أنواع الغرف" : "Room Types",
			dataIndex: "pickedRoomsType",
			key: "pickedRoomsType",
			render: (pickedRoomsType) =>
				pickedRoomsType.map((room, index) => (
					<div key={index}>{`${room.room_type}`}</div>
				)),
		},
		{
			title: chosenLanguage === "Arabic" ? "رقم الغرفة" : "Room Number",
			key: "roomDetails",
			render: (record) => {
				// Check if 'record' and 'roomDetails' are available and have entries
				if (record && record.roomDetails && record.roomDetails.length > 0) {
					return record.roomDetails.map((room, index) => (
						<div key={index}>
							{room.room_number ? room.room_number : "No Room"}
						</div>
					));
				}

				// If 'roomDetails' is not available, check 'roomId'
				else if (record && record.roomId && record.roomId.length > 0) {
					return record.roomId.map((room, index) => (
						<div key={index}>
							{room.room_number ? room.room_number : "No Room"}
						</div>
					));
				}

				// If neither is available, return "No Room"
				return "No Room";
			},
		},

		{
			title: chosenLanguage === "Arabic" ? "المبلغ الإجمالي" : "Total Amount",
			dataIndex: "total_amount",
			key: "total_amount",
			render: (total_amount, record) => {
				return `${total_amount}`;
			},
		},
	];

	const showDetailsModal = (reservation) => {
		setSelectedReservation(reservation);
		setIsModalVisible(true);
	};

	const handleOk = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
		setModalKey((prevKey) => prevKey + 1); // Increment the key
	};

	const handleCancel = () => {
		setSelectedReservation(null);
		setIsModalVisible(false);
		setModalKey((prevKey) => prevKey + 1); // Increment the key
	};

	return (
		<>
			<PreReservationTableWrapper isArabic={chosenLanguage === "Arabic"}>
				<div className='form-group mx-3 text-center'>
					<form className='form' onSubmit={searchSubmit}>
						<label
							className='mt-2 mx-3'
							style={{
								fontWeight: "bold",
								fontSize: "1.05rem",
								color: "black",
							}}
						>
							Search
						</label>
						<input
							className='p-2 my-2 search-input w-50 form-control mx-auto'
							type='text'
							value={q}
							onChange={(e) => setQ(e.target.value.toLowerCase())}
							placeholder={
								chosenLanguage === "Arabic"
									? "البحث حسب هاتف العميل، اسم العميل، البريد الإلكتروني، رقم التأكيد، حالة الدفع"
									: "Search By Client Phone, Client Name, Email, Confirmation #, Payment Status"
							}
							aria-label='Search'
						/>
						<button className='btn btn-success mx-2' type='submit'>
							Search
						</button>
					</form>
				</div>
				<DownloadExcel
					data={allPreReservations}
					columns={columns2}
					title={"Reservations Report"}
					currentPage={currentPage}
					recordsPerPage={recordsPerPage}
				/>
				<div
					className='my-4'
					onClick={() => window.scrollTo({ top: 20, behavior: "smooth" })}
				>
					<Pagination
						current={currentPage}
						pageSize={recordsPerPage}
						total={totalRecords}
						onChange={handlePageChange}
					/>
				</div>

				<FilterComponent
					setSelectedFilter={setSelectedFilter}
					selectedFilter={selectedFilter}
					chosenLanguage={chosenLanguage}
					selectedDates={selectedDates}
					setSelectedDates={setSelectedDates}
					reservationObject={reservationObject}
				/>
				<Table
					key={Date.now()} // Adds a new key every time the component renders
					columns={columns}
					dataSource={allPreReservations}
					rowKey={(record) => record.confirmation_number}
					pagination={false}
					scroll={{ y: 1000 }}
				/>

				<div
					className='my-3'
					onClick={() => window.scrollTo({ top: 20, behavior: "smooth" })}
				>
					<Pagination
						current={currentPage}
						pageSize={recordsPerPage}
						total={totalRecords}
						onChange={handlePageChange}
					/>
				</div>
			</PreReservationTableWrapper>

			<Modal
				key={modalKey} // Add the key here
				title={
					chosenLanguage === "Arabic" ? "تفاصيل الحجز" : "Reservation Details"
				}
				open={isModalVisible}
				onOk={handleOk}
				onCancel={handleCancel}
				width='84.5%' // Set the width to 80%
				style={{
					// If Arabic, align to the left, else align to the right
					position: "absolute",
					left: chosenLanguage === "Arabic" ? "1%" : "auto",
					right: chosenLanguage === "Arabic" ? "auto" : "5%",
					top: "1%",
				}}
			>
				{selectedReservation && (
					<ReservationDetail
						reservation={selectedReservation}
						setReservation={setSelectedReservation}
						hotelDetails={hotelDetails}
					/>
				)}
			</Modal>
		</>
	);
};

export default PreReservationTable;

const PreReservationTableWrapper = styled.div`
	text-align: ${(props) => (props.isArabic ? "right" : "")};

	td,
	tr,
	tbody {
		text-transform: capitalize !important;
		font-size: 12px;
	}

	.table thead th {
		position: sticky;
		top: 0;
		z-index: 10; // Ensure the header is above other content when scrolling
		background-color: white; // Match the header background color
	}

	.table {
		border-collapse: collapse; // Ensure borders are well aligned
	}

	.ant-table-tbody > tr > td {
		white-space: nowrap; // Prevent content from wrapping to the next line
		overflow: hidden; // Ensure overflow content is hidden
		text-overflow: ellipsis; // Add ellipsis for overflow content
		max-height: 50px; // Set a max height for rows
		height: 50px; // Set a consistent height for all rows
		vertical-align: middle; // Center content vertically
		padding: 8px; // Add padding to keep content well-aligned
	}

	.ant-table-tbody > tr {
		height: 50px; // Set a consistent row height
	}

	.ant-table-tbody > tr:hover > td {
		background: #f5f5f5; // Add a hover effect if needed
	}

	.ant-table-thead > tr > th {
		white-space: nowrap; // Prevent header content from wrapping
		padding: 8px; // Adjust padding for better alignment
	}
`;
