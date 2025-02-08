// ExportToExcelButton.jsx
import React from "react";
import styled from "styled-components";
import * as XLSX from "xlsx"; // or use the browser build if preferred

/**
 * @param {Array} data        - The array of reservations to be exported
 * @param {String} fileName   - (optional) The file name for the Excel file
 * @param {String} sheetName  - (optional) The sheet name inside the workbook
 */
const ExportToExcelButton = ({
	data,
	fileName = "ReservationsData.xlsx", // default name
	sheetName = "Reservations",
}) => {
	// Determine the user locale. If ends in 'US' or 'CA', use 'en-US' => mm/dd/yyyy
	// Otherwise, use 'en-GB' => dd/mm/yyyy
	const userLocale = navigator.language || "en-US";
	const localeForDate =
		userLocale.endsWith("US") || userLocale.endsWith("CA") ? "en-US" : "en-GB";

	// This array maps room_type values to human‐readable labels.
	const roomTypes = [
		{ value: "standardRooms", label: "Standard Rooms" },
		{ value: "singleRooms", label: "Single Rooms" },
		{ value: "doubleRooms", label: "Double Room" },
		{ value: "twinRooms", label: "Twin Rooms" },
		{ value: "queenRooms", label: "Queen Rooms" },
		{ value: "kingRooms", label: "King Rooms" },
		{ value: "tripleRooms", label: "Triple Room" },
		{ value: "quadRooms", label: "Quad Rooms" },
		{ value: "studioRooms", label: "Studio Rooms" },
		{ value: "suite", label: "Suite" },
		{ value: "masterSuite", label: "Master Suite" },
		{ value: "familyRooms", label: "Family Rooms" },
		{
			value: "individualBed",
			label: "Rooms With Individual Beds (Shared Rooms)",
		},
		// { value: "other", label: "Other" },
	];

	const handleExport = () => {
		// 1) Ensure fileName ends with .xlsx
		let finalFileName = fileName;
		if (!finalFileName.toLowerCase().endsWith(".xlsx")) {
			finalFileName += ".xlsx";
		}

		// 2) Transform data to match the columns you want.
		//    Format dates according to the locale determined above.
		//    Also ensure money-related fields are never empty (default to 0).
		const exportData = data.map((item) => {
			// --- Compute "Room Type" from pickedRoomsType ---
			let roomTypeString = "";
			let roomCount = 0;
			if (
				Array.isArray(item.pickedRoomsType) &&
				item.pickedRoomsType.length > 0
			) {
				// Grab unique room_type values
				const distinctRoomTypes = [
					...new Set(item.pickedRoomsType.map((rt) => rt.room_type)),
				];
				// Map to the nice label using our roomTypes array.
				const roomTypeLabels = distinctRoomTypes.map((rt) => {
					const found = roomTypes.find((r) => r.value === rt);
					return found ? found.label : rt;
				});
				roomTypeString = roomTypeLabels.join(", ");
				roomCount = item.pickedRoomsType.length;
			}

			// --- Paid Onsite (from payment_details) ---
			const paidOnsite =
				item.payment_details && item.payment_details.onside_paid_amount
					? item.payment_details.onside_paid_amount
					: 0;

			return {
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
				"Room Type": roomTypeString,
				"Room Count": roomCount,
				"Paid Onsite": paidOnsite,
				"Created At": item.createdAt
					? new Date(item.createdAt).toLocaleDateString(localeForDate)
					: "N/A",
			};
		});

		// Define the desired header order
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

		// 3) Convert the JSON array to a Worksheet.
		//    Passing the header array ensures the columns are in the proper order.
		const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });

		// 4) Set column widths so data fits nicely.
		worksheet["!cols"] = [
			{ wch: 20 }, // Confirmation Number
			{ wch: 20 }, // Name
			{ wch: 15 }, // Phone
			{ wch: 25 }, // Hotel Name
			{ wch: 15 }, // Status
			{ wch: 15 }, // Checkin Date
			{ wch: 15 }, // Checkout Date
			{ wch: 15 }, // Payment Status
			{ wch: 15 }, // Total Amount
			{ wch: 15 }, // Paid Amount
			{ wch: 20 }, // Room Type
			{ wch: 10 }, // Room Count
			{ wch: 15 }, // Paid Onsite
			{ wch: 15 }, // Created At
		];

		// 5) (Optional) Apply header styling.
		//    (Note: For styling to work, you may need to use a library like xlsx-style.)
		const headerStyle = {
			font: { bold: true, color: { rgb: "FFFFFF" } },
			fill: { fgColor: { rgb: "1E88E5" } }, // using your primary blue color
			alignment: { horizontal: "center", vertical: "center" },
		};

		// Get the range of the worksheet (ex: A1:N{numRows})
		const range = XLSX.utils.decode_range(worksheet["!ref"]);
		// Iterate over the first row (header row) and assign the style.
		for (let C = range.s.c; C <= range.e.c; C++) {
			const cellAddress = { c: C, r: 0 };
			const cellRef = XLSX.utils.encode_cell(cellAddress);
			if (worksheet[cellRef]) {
				worksheet[cellRef].s = headerStyle;
			}
		}

		// 6) Create a new Workbook and append the Worksheet.
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

		// 7) Trigger a file download in the browser.
		XLSX.writeFile(workbook, finalFileName);
	};

	return (
		<StyledExportButton onClick={handleExport}>
			Export to Excel
		</StyledExportButton>
	);
};

export default ExportToExcelButton;

/* ----------------- Styled Components ----------------- */
const StyledExportButton = styled.button`
	padding: 8px 16px;
	background-color: var(--button-bg-primary, #1e88e5);
	color: var(--button-font-color, #ffffff);
	border: none;
	border-radius: 4px;
	cursor: pointer;
	transition: var(--main-transition, all 0.3s ease-in-out);
	font-size: 14px;
	font-weight: 500;
	margin: 10px auto;
	display: block;

	&:hover {
		background-color: var(--primary-color-dark-blue, #1565c0);
	}

	&:active {
		background-color: var(--primary-color-darker-blue, #0d47a1);
	}
`;
