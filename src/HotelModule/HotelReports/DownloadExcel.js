import React from "react";
import * as XLSX from "xlsx";
import moment from "moment";

export const normalizeFinancialExcelCell = (value) => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : "";
	}
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	const plainMoney = /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.\d+)?(?:\s*SAR)?$/i;
	if (!plainMoney.test(trimmed)) return value;
	const parsed = Number(trimmed.replace(/SAR/gi, "").replace(/,/g, "").trim());
	return Number.isFinite(parsed) ? parsed : value;
};

const DownloadExcel = ({
	data,
	columns,
	currentPage,
	recordsPerPage,
	title,
}) => {
	const downloadExcelDocument = () => {
		const workbook = XLSX.utils.book_new();

		// Detailed Data Tab
		const detailedData = formatDataForExcel(
			data,
			columns,
			currentPage,
			recordsPerPage
		);
		const detailedWorksheet = XLSX.utils.json_to_sheet(detailedData);
		XLSX.utils.book_append_sheet(workbook, detailedWorksheet, "Detailed Data");

		// Apply styles to headers and set column widths
		setHeaderStyle(detailedWorksheet);
		setColumnWidths(
			detailedWorksheet,
			[5, 10, 10, 12, 12, 12, 20, 15, 15, 15, 20, 15]
		); // Adjust the array numbers based on your desired column widths

		// Write the workbook and trigger the download
		XLSX.writeFile(workbook, title ? `${title}.xlsx` : "Financials.xlsx");
	};

	// Helper function to format the detailed data for Excel
	const formatDataForExcel = (data, columns, currentPage, recordsPerPage) => {
		return data.map((row, index) => {
			const rowIndex = (currentPage - 1) * recordsPerPage + index + 1;
			const formattedRow = {};

			columns.forEach((col) => {
				let cellValue = row[col.dataIndex];

				if (col.key === "index") {
					cellValue = rowIndex;
				} else if (col.key === "roomDetails" && row.roomDetails) {
					cellValue = row.roomDetails
						.map((room) => room.room_number || "No Room")
						.join(", ");
				} else if (col.render && typeof cellValue !== "undefined") {
					// For fields that use render functions in your table
					cellValue = col.render(cellValue, row);
				} else if (col.dataIndex === "reservation_status") {
					// Make sure to call the render function correctly, and handle any missing values appropriately.
					cellValue = row.reservation_status
						? row.reservation_status
						: "No Status";
				} else if (col.dataIndex === "pickedRoomsType") {
					// Handle the case where pickedRoomsType might be undefined or empty
					cellValue =
						row.pickedRoomsType && row.pickedRoomsType.length > 0
							? row.pickedRoomsType.map((room) => room.room_type).join(", ")
							: "No Room Types";
				}

				// Handle reservation_status
				if (col.dataIndex === "reservation_status") {
					cellValue = row["reservation_status"] || "No Status"; // Use the actual property name from your data
				}

				// Handle pickedRoomsType
				if (col.dataIndex === "pickedRoomsType") {
					cellValue =
						row["pickedRoomsType"] && row["pickedRoomsType"].length > 0
							? row["pickedRoomsType"].map((room) => room.room_type).join(", ")
							: "No Room Types"; // Use the actual property name from your data
				}

				// Format date fields directly without using render functions
				if (
					["booked_at", "checkin_date", "checkout_date"].includes(col.dataIndex)
				) {
					cellValue = moment(cellValue).format("YYYY-MM-DD");
				}

				// Ensure "Total Amount" is formatted as a number
				if (col.dataIndex === "total_amount") {
					cellValue = normalizeFinancialExcelCell(cellValue);
				}

				if (["sub_total", "commission"].includes(col.dataIndex)) {
					cellValue = normalizeFinancialExcelCell(cellValue);
				}

				formattedRow[col.title] = cellValue;
			});

			return formattedRow;
		});
	};

	const setHeaderStyle = (worksheet) => {
		const range = XLSX.utils.decode_range(worksheet["!ref"]);
		for (let C = range.s.c; C <= range.e.c; ++C) {
			const address = XLSX.utils.encode_col(C) + "1"; // '1' is the row number for headers
			if (!worksheet[address]) continue;
			worksheet[address].s = {
				fill: {
					fgColor: { rgb: "0070C0" }, // Example blue color
				},
				font: {
					color: { rgb: "FFFFFF" }, // White font color
				},
				alignment: {
					horizontal: "center",
					vertical: "center",
				},
			};
		}
	};

	// Adjust column widths - you may need to tweak these widths
	const setColumnWidths = (worksheet, widths) => {
		worksheet["!cols"] = widths.map((w) => ({ wch: w }));
	};

	return (
		<button onClick={downloadExcelDocument} className='btn btn-info'>
			Download Report To Excel
		</button>
	);
};

export default DownloadExcel;
