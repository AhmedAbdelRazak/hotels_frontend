import React, { useState } from "react";
import styled from "styled-components";
import * as XLSX from "xlsx";
import { Modal, Radio, Select, Button, message, DatePicker } from "antd";
import dayjs from "dayjs";

import { getExportToExcelList } from "../apiAdmin";
import { isAuthenticated } from "../../auth";

const { Option } = Select;

/**
 * @param {Array} allHotelDetailsAdmin - Array of hotels { _id, hotelName }.
 * @param {String} defaultFileName     - Default filename for Excel.
 * @param {String} sheetName           - Sheet name.
 */
const ExportToExcelButton = ({
	allHotelDetailsAdmin = [],
	defaultFileName = "ReservationsData.xlsx",
	sheetName = "Reservations",
}) => {
	const [exportModalVisible, setExportModalVisible] = useState(false);
	const [exporting, setExporting] = useState(false);

	// Date field: createdAt / checkin_date / checkout_date
	const [dateField, setDateField] = useState("createdAt");
	const dateFieldOptions = [
		{ label: "Booked At", value: "createdAt" },
		{ label: "Checkin Date", value: "checkin_date" },
		{ label: "Checkout Date", value: "checkout_date" },
	];

	// Multi-select hotels
	const [selectedHotels, setSelectedHotels] = useState(["all"]);

	// From/To dates (default last 30 days)
	const [fromDate, setFromDate] = useState(dayjs().subtract(29, "day"));
	const [toDate, setToDate] = useState(dayjs());

	const { user, token } = isAuthenticated();

	// Open modal
	const handleOpenModal = () => {
		setExportModalVisible(true);
	};

	// Confirm => fetch data => export
	const handleConfirmExport = async () => {
		try {
			setExporting(true);

			// Build query object for backend
			const paramObj = {
				dateField,
				from: fromDate.format("YYYY-MM-DD"),
				to: toDate.format("YYYY-MM-DD"),
				hotels: selectedHotels.includes("all")
					? "all"
					: selectedHotels.join(","),
			};

			// Call your backend
			const reservations = await getExportToExcelList(
				user._id,
				token,
				paramObj
			);

			if (!Array.isArray(reservations) || reservations.length === 0) {
				message.warning("No data found for the selected filters.");
				return;
			}

			// reservations now have fields like:
			// {
			//   confirmation_number, customer_name, customer_phone, hotel_name,
			//   reservation_status, checkin_date, checkout_date, payment_status,
			//   total_amount, paid_amount, room_type, room_count,
			//   paid_onsite, createdAt
			// }

			doExportToExcel(reservations);
			setExportModalVisible(false);
		} catch (err) {
			console.error("Export error:", err);
			message.error("Failed to export data. Please try again.");
		} finally {
			setExporting(false);
		}
	};

	// Cancel => close modal
	const handleCancel = () => {
		setExportModalVisible(false);
	};

	// Create the XLSX file
	const doExportToExcel = (dataArray) => {
		let finalFileName = defaultFileName;
		if (!finalFileName.toLowerCase().endsWith(".xlsx")) {
			finalFileName += ".xlsx";
		}

		// Determine locale => date format
		const userLocale = navigator.language || "en-US";
		const localeForDate =
			userLocale.endsWith("US") || userLocale.endsWith("CA")
				? "en-US"
				: "en-GB";

		// Map each reservation to the 14 fields you originally had
		const exportData = dataArray.map((item) => ({
			"Confirmation Number": item.confirmation_number || "",
			Name: item.customer_name || "",
			Phone: item.customer_phone || "",
			"Hotel Name": item.hotel_name || "",
			Status: item.reservation_status || "",
			"Checkin Date": item.checkin_date
				? new Date(item.checkin_date).toLocaleDateString(localeForDate)
				: "",
			"Checkout Date": item.checkout_date
				? new Date(item.checkout_date).toLocaleDateString(localeForDate)
				: "",
			"Payment Status": item.payment_status || "",
			"Total Amount": item.total_amount || 0,
			"Paid Amount": item.paid_amount || 0,
			"Room Type": item.room_type || "",
			"Room Count": item.room_count || 0,
			"Paid Onsite": item.paid_onsite || 0,
			"Created At": item.createdAt
				? new Date(item.createdAt).toLocaleDateString(localeForDate)
				: "",
		}));

		// Define headers in desired order
		const headers = [
			"Confirmation Number",
			"Name",
			"Phone",
			"Hotel Name",
			"Status",
			"Checkin Date",
			"Checkout Date",
			"Payment Status",
			"Total Amount",
			"Paid Amount",
			"Room Type",
			"Room Count",
			"Paid Onsite",
			"Created At",
		];

		// Convert to worksheet
		const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });

		// Optional column widths
		ws["!cols"] = [
			{ wch: 15 }, // Confirmation Number
			{ wch: 15 }, // Name
			{ wch: 15 }, // Phone
			{ wch: 25 }, // Hotel Name
			{ wch: 15 }, // Status
			{ wch: 15 }, // Checkin Date
			{ wch: 15 }, // Checkout Date
			{ wch: 15 }, // Payment Status
			{ wch: 15 }, // Total Amount
			{ wch: 15 }, // Paid Amount
			{ wch: 15 }, // Room Type
			{ wch: 10 }, // Room Count
			{ wch: 15 }, // Paid Onsite
			{ wch: 15 }, // Created At
		];

		// Create workbook & append sheet
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, sheetName);
		XLSX.writeFile(wb, finalFileName);
	};

	// Handle hotel multi-select
	const handleHotelSelectChange = (value) => {
		if (value.length === 0) {
			setSelectedHotels(["all"]);
			return;
		}
		if (value.includes("all") && !selectedHotels.includes("all")) {
			setSelectedHotels(["all"]);
			return;
		}
		if (value.includes("all") && value.length > 1) {
			const withoutAll = value.filter((v) => v !== "all");
			setSelectedHotels(withoutAll);
			return;
		}
		setSelectedHotels(value);
	};

	return (
		<>
			<StyledExportButton onClick={handleOpenModal}>
				Export to Excel
			</StyledExportButton>

			<Modal
				title='Export Reservations'
				open={exportModalVisible}
				onCancel={handleCancel}
				footer={null}
			>
				{/* 1) Date Field Radio */}
				<div style={{ marginBottom: 16 }}>
					<strong>Date Field:</strong>{" "}
					<Radio.Group
						options={dateFieldOptions}
						onChange={(e) => setDateField(e.target.value)}
						value={dateField}
						optionType='button'
						style={{ marginLeft: 10 }}
					/>
				</div>

				{/* 2) From/To DatePickers */}
				<div style={{ marginBottom: 16 }}>
					<strong>From:</strong>{" "}
					<DatePicker
						style={{ marginRight: 8 }}
						value={fromDate}
						onChange={(val) => setFromDate(val)}
						format='YYYY-MM-DD'
					/>
					<strong>To:</strong>{" "}
					<DatePicker
						style={{ marginLeft: 8 }}
						value={toDate}
						onChange={(val) => setToDate(val)}
						format='YYYY-MM-DD'
					/>
				</div>

				{/* 3) Hotel Multi-select */}
				<div style={{ marginBottom: "20px" }}>
					<strong>Select Hotels:</strong>
					<Select
						mode='multiple'
						style={{ width: "100%", marginTop: 8 }}
						placeholder='Please select hotels'
						value={selectedHotels}
						onChange={handleHotelSelectChange}
					>
						<Option value='all'>All Hotels</Option>
						{allHotelDetailsAdmin &&
							allHotelDetailsAdmin.map((h, i) => (
								<Option key={h._id || i} value={h.hotelName}>
									{h.hotelName}
								</Option>
							))}
					</Select>
				</div>

				{/* 4) Confirm/Cancel */}
				<div style={{ textAlign: "right" }}>
					<Button onClick={handleCancel} style={{ marginRight: 8 }}>
						Cancel
					</Button>
					<Button
						type='primary'
						onClick={handleConfirmExport}
						loading={exporting}
					>
						Confirm &amp; Export
					</Button>
				</div>
			</Modal>
		</>
	);
};

export default ExportToExcelButton;

/* ----- Styled Button ----- */
const StyledExportButton = styled.button`
	padding: 8px 16px;
	background-color: var(--button-bg-primary, #1e88e5);
	color: var(--button-font-color, #ffffff);
	border: none;
	border-radius: 4px;
	cursor: pointer;
	transition: 0.3s ease;
	font-size: 14px;
	font-weight: 500;
	margin: 10px auto;
	display: block;

	&:hover {
		background-color: #1565c0;
	}
	&:active {
		background-color: #0d47a1;
	}
`;
