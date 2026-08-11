import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ReportTotalModeToggle from "./ReportTotalModeToggle";
import { REPORT_TOTAL_MODES } from "./reportTotalMode";

describe("ReportTotalModeToggle", () => {
	it("renders Net Total as the default and emits only a real mode change", () => {
		const onChange = jest.fn();
		render(<ReportTotalModeToggle onChange={onChange} />);

		const group = screen.getByRole("group", {
			name: "Reservation total basis",
		});
		const grossButton = within(group).getByRole("button", {
			name: "Gross Total",
		});
		const netButton = within(group).getByRole("button", {
			name: "Net Total",
		});

		expect(netButton.getAttribute("aria-pressed")).toBe("true");
		expect(grossButton.getAttribute("aria-pressed")).toBe("false");

		fireEvent.click(netButton);
		expect(onChange).not.toHaveBeenCalled();

		fireEvent.click(grossButton);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith(REPORT_TOTAL_MODES.GROSS);
	});

	it("renders localized Arabic labels in RTL mode", () => {
		render(<ReportTotalModeToggle isArabic />);

		const group = screen.getByRole("group", { name: "أساس قيمة الحجز" });
		expect(group.getAttribute("dir")).toBe("rtl");
		within(group).getByRole("button", { name: "الإجمالي" });
		const netButton = within(group).getByRole("button", { name: "الصافي" });
		expect(netButton.getAttribute("aria-pressed")).toBe("true");
	});
});
