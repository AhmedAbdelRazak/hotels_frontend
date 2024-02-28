import React from "react";
import { Table, Pagination } from "antd";
import styled from "styled-components";
import moment from "moment";
import DownloadExcel from "../../HotelModule/HotelReports/DownloadExcel";
import ScoreCards from "./ScoreCards";
import DropInPayment from "./DropInPayment";

const TableViewReportPending = ({
	allReservations,
	setCurrentPage,
	currentPage,
	totalRecords,
	chosenLanguage,
	hotelDetails,
	recordsPerPage,
	scoreCardObject,
	data,
	buy,
}) => {
	// Define the table columns

	const calculateExpediaTotalAmount = (reservation) => {
		let totalAmount = 0;
		const checkinDate = moment(reservation.checkin_date);
		const checkoutDate = moment(reservation.checkout_date);

		hotelDetails.pricingCalendar.forEach((pricing) => {
			const calendarDate = moment(pricing.calendarDate);
			if (
				calendarDate.isSameOrAfter(checkinDate) &&
				calendarDate.isSameOrBefore(checkoutDate)
			) {
				totalAmount += Number(pricing.price);
			}
		});

		return totalAmount;
	};
	const columns = [
		{
			title: "#",
			dataIndex: "index",
			key: "index",
			width: 50,
			render: (text, record, index) =>
				(currentPage - 1) * recordsPerPage + index + 1,
		},
		{
			title: chosenLanguage === "Arabic" ? "حالة الحجز" : "Status",
			dataIndex: "reservation_status",
			key: "reservation_status",
			render: (reservation_status) => {
				let style = {};
				switch (reservation_status.toLowerCase()) {
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
			title: chosenLanguage === "Arabic" ? "حالة السداد" : "Payment Status",
			dataIndex: "payment",
			key: "payment",
			render: (payment, record) => {
				const paidOnlinePayments = [
					"agoda collect",
					"expedia collect",
					"booking.com collect",
				];
				const isPaidOnline =
					paidOnlinePayments.includes(payment) ||
					record.booking_source === "agoda";
				return isPaidOnline ? "Paid Online" : "Paid in Cash";
			},
		},

		{
			title: chosenLanguage === "Arabic" ? " صافي البیع" : "Subtotal",
			dataIndex: "sub_total",
			key: "sub_total",
			render: (total_amount, record) => {
				let displayAmount = total_amount;
				if (record.payment === "expedia collect") {
					displayAmount = calculateExpediaTotalAmount(record) - total_amount;
				}
				return `${displayAmount.toLocaleString()}`;
			},
		},

		{
			title: chosenLanguage === "Arabic" ? "اجمالي العمولة" : "Commission",
			dataIndex: "commission",
			key: "commission",
			render: (commission, record) => {
				let displayCommission = commission;
				if (record.payment === "expedia collect") {
					// displayCommission = record.total_amount;
					displayCommission = 0;
				} else if (["janat", "affiliate"].includes(record.booking_source)) {
					displayCommission = record.total_amount * 0.1;
				} else {
					displayCommission = record.total_amount - record.sub_total;
				}
				return `${displayCommission.toLocaleString()}`;
			},
		},

		// {
		// 	title: chosenLanguage === "Arabic" ? "المبلغ الإجمالي" : "Total Amount",
		// 	dataIndex: "total_amount",
		// 	key: "total_amount",
		// 	render: (total_amount, record) => {
		// 		let displayAmount = total_amount;
		// 		if (record.payment === "expedia collect") {
		// 			displayAmount = calculateExpediaTotalAmount(record);
		// 		}
		// 		return `${displayAmount.toLocaleString()} SAR`;
		// 	},
		// },

		{
			title: chosenLanguage === "Arabic" ? "المبلغ الإجمالي" : "Total Amount",
			dataIndex: "total_amount",
			key: "total_amount",
			render: (total_amount, record) => {
				return `${total_amount.toLocaleString()}`;
			},
		},

		{
			title: chosenLanguage === "Arabic" ? "اسم الزائر" : "Client Name",
			dataIndex: "customer_details",
			key: "name",
			width: 120,

			render: (customer_details) => customer_details.name,
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
			title: chosenLanguage === "Arabic" ? "أنواع الغرف" : "Room Types",
			dataIndex: "pickedRoomsType",
			key: "pickedRoomsType",
			render: (pickedRoomsType) =>
				pickedRoomsType.map((room, index) => (
					<div
						style={{ textTransform: "capitalize" }}
						key={index}
					>{`${room.room_type}`}</div>
				)),
		},

		{
			title: chosenLanguage === "Arabic" ? "رقم التأكيد" : "Confirmation",
			dataIndex: "confirmation_number",
			key: "confirmation_number",
		},
		{
			title: chosenLanguage === "Arabic" ? "المصدر" : "Source",
			dataIndex: "booking_source",
			width: 80,
			key: "booking_source",
		},
	];

	// Define the pagination config
	const paginationConfig = {
		current: currentPage,
		pageSize: 400, // This should match your state or props
		total: totalRecords,
		onChange: (page) => setCurrentPage(page),
	};

	return (
		<TableViewReportPendingWrapper>
			<div className='my-3'>
				<ScoreCards
					scoreCardObject={scoreCardObject}
					chosenLanguage={chosenLanguage}
				/>
			</div>
			<div className='my-3'>
				<DropInPayment
					data={data}
					chosenLanguage={chosenLanguage}
					buy={buy}
					scoreCardObject={scoreCardObject}
				/>
			</div>
			<div className='channel-buttons mt-3'></div>
			<div className='float-left my-3'>
				<DownloadExcel
					data={allReservations}
					columns={columns}
					title={"Financial Report"}
					currentPage={currentPage}
					recordsPerPage={recordsPerPage}
				/>
			</div>

			<Table
				columns={columns}
				dataSource={allReservations}
				pagination={false}
				scroll={{ y: 1060 }}
				sticky
			/>
			<div
				className='my-3'
				onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
			>
				<Pagination {...paginationConfig} />
			</div>
		</TableViewReportPendingWrapper>
	);
};

export default TableViewReportPending;

const TableViewReportPendingWrapper = styled.div`
	table {
		font-size: 11px !important;
		text-transform: capitalize;
	}

	.channel-buttons {
		margin-bottom: 20px;

		button {
			margin-right: 10px;
		}
	}
`;
