import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreakdownUpdatedFilter, {
	BREAKDOWN_UPDATED_FILTERS,
	normalizeBreakdownUpdatedFilter,
} from "./BreakdownUpdatedFilter";

describe("BreakdownUpdatedFilter", () => {
	it("renders exactly All, Yesterday, and Today with All selected", () => {
		render(<BreakdownUpdatedFilter />);
		const group = screen.getByRole("group", {
			name: "Payment breakdown updated",
		});
		const buttons = within(group).getAllByRole("button");
		expect(buttons.map((button) => button.textContent)).toEqual([
			"All",
			"Yesterday",
			"Today",
		]);
		expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
		expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
		expect(buttons[2]).toHaveAttribute("aria-pressed", "false");
	});

	it("emits one single-select change and does not re-emit the active value", () => {
		const onChange = jest.fn();
		render(
			<BreakdownUpdatedFilter
				value={BREAKDOWN_UPDATED_FILTERS.YESTERDAY}
				onChange={onChange}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Yesterday" }));
		fireEvent.click(screen.getByRole("button", { name: "Today" }));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith("today");
	});

	it("normalizes only the supported values", () => {
		expect(normalizeBreakdownUpdatedFilter(" TODAY ")).toBe("today");
		expect(normalizeBreakdownUpdatedFilter("tomorrow")).toBe("all");
	});
});
