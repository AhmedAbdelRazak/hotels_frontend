import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as XLSX from "xlsx";

import ExportToExcelButton from "./ExportToExcelButton";
import { getExportToExcelList } from "../apiAdmin";

jest.mock("../apiAdmin", () => ({
	getExportToExcelList: jest.fn(),
}));

jest.mock("../../auth", () => ({
	isAuthenticated: () => ({ user: { _id: "admin-1" }, token: "token-1" }),
}));

jest.mock("xlsx", () => ({
	utils: {
		json_to_sheet: jest.fn(() => ({})),
		sheet_add_aoa: jest.fn(),
		book_new: jest.fn(() => ({})),
		book_append_sheet: jest.fn(),
	},
	writeFile: jest.fn(),
}));

jest.mock("antd", () => ({
	Modal: ({ children, open, title }) =>
		open ? (
			<div>
				<h2>{title}</h2>
				{children}
			</div>
		) : null,
	Radio: { Group: () => null },
	Select: Object.assign(() => null, { Option: () => null }),
	Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
	DatePicker: () => null,
	message: { warning: jest.fn(), error: jest.fn() },
}));

describe("ExportToExcelButton report export", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		XLSX.utils.json_to_sheet.mockReturnValue({});
		XLSX.utils.book_new.mockReturnValue({});
	});

	it("exports exactly the supplied filtered table rows without a second API request", () => {
		render(
			<ExportToExcelButton
				exportCurrentData
				data={[
					{
						confirmation_number: "BAR-FILTER-1",
						customer_name: "First filtered guest",
						booking_source: "agoda",
						room_number_display: "424",
					},
					{
						confirmation_number: "BAR-FILTER-2",
						customer_name: "Second filtered guest",
						room_number_display: "",
					},
				]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Export to Excel" }));

		expect(getExportToExcelList).not.toHaveBeenCalled();
		expect(XLSX.utils.json_to_sheet).toHaveBeenCalledTimes(1);
		const [rows] = XLSX.utils.json_to_sheet.mock.calls[0];
		expect(rows).toHaveLength(2);
		expect(rows.map((row) => row["Confirmation Number"])).toEqual([
			"BAR-FILTER-1",
			"BAR-FILTER-2",
		]);
		expect(rows[0]["Room Number"]).toBe("424");
		expect(rows[1]["Room Number"]).toBe("");
		expect(rows[0]["Booking Source"]).toBe("agoda");
		expect(XLSX.writeFile).toHaveBeenCalledWith(
			expect.any(Object),
			"ReservationsData.xlsx",
		);
		expect(screen.queryByText("Export Reservations")).toBeNull();
	});

	it("uses Arabic worksheet headers for the Arabic one-click export", () => {
		render(
			<ExportToExcelButton
				exportCurrentData
				chosenLanguage="Arabic"
				data={[
					{
						confirmation_number: "AR-1",
						booking_source: "airbnb",
						reservation_status: "confirmed",
						payment_status: "Not Captured",
					},
				]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "تصدير إلى Excel" }));
		expect(XLSX.utils.sheet_add_aoa).toHaveBeenCalledWith(
			expect.any(Object),
			[
				expect.arrayContaining([
					"مصدر الحجز",
					"نوع الغرفة",
					"رقم الغرفة",
				]),
			],
			{ origin: "A1" },
		);
		const [rows] = XLSX.utils.json_to_sheet.mock.calls[0];
		expect(rows[0]["Booking Source"]).toBe("airbnb");
		expect(rows[0].Status).toBe("مؤكد");
		expect(rows[0]["Payment Status"]).toBe("لم يتم التحصيل");
		expect(XLSX.utils.sheet_add_aoa.mock.calls[0][0]["!cols"]).toHaveLength(16);
		expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
			expect.any(Object),
			expect.any(Object),
			"الحجوزات",
		);
		expect(XLSX.writeFile).toHaveBeenCalledWith(
			expect.any(Object),
			"بيانات الحجوزات.xlsx",
		);
	});

	it("preserves the configurable API export on non-report reservation pages", async () => {
		getExportToExcelList.mockResolvedValue([
			{ confirmation_number: "CONFIGURABLE-EXPORT" },
		]);
		render(<ExportToExcelButton data={[{ confirmation_number: "TABLE-ROW" }]} />);

		fireEvent.click(screen.getByRole("button", { name: "Export to Excel" }));
		expect(screen.getByText("Export Reservations")).not.toBeNull();
		fireEvent.click(
			screen.getByRole("button", { name: "Confirm & Export" }),
		);

		await waitFor(() => {
			expect(getExportToExcelList).toHaveBeenCalledTimes(1);
			expect(XLSX.utils.json_to_sheet).toHaveBeenCalledTimes(1);
		});
		const [rows] = XLSX.utils.json_to_sheet.mock.calls[0];
		expect(rows.map((row) => row["Confirmation Number"])).toEqual([
			"CONFIGURABLE-EXPORT",
		]);
	});
});
