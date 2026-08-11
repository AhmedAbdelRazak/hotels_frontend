import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { message } from "antd";
import PaidReportDateControls from "./PaidReportDateControls";

jest.mock("@ant-design/icons", () => ({
  ClearOutlined: () => <span aria-hidden="true" />,
  FilterOutlined: () => <span aria-hidden="true" />,
}));

jest.mock("antd", () => {
  const Button = ({ children, icon, ...props }) => (
    <button type="button" {...props}>
      {icon}
      {children}
    </button>
  );
  const Select = ({
    options = [],
    onChange,
    value,
    mode,
    maxTagCount: _maxTagCount,
    ...props
  }) => {
    const multiple = mode === "multiple";
    return (
      <select
        {...props}
        multiple={multiple}
        value={value}
        onChange={(event) =>
          onChange?.(
            multiple
              ? Array.from(event.target.selectedOptions).map(
                  (option) => option.value,
                )
              : event.target.value,
          )
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  return {
    Button,
    Select,
    message: { error: jest.fn() },
  };
});

const REFERENCE_DATE = new Date("2026-07-14T12:00:00.000Z");
const EMPTY_FILTER = {
  dateBy: "checkin_date",
  dateFrom: "",
  dateTo: "",
  dateRanges: [],
};

const renderControls = (props = {}) =>
  render(
    <PaidReportDateControls
      value={EMPTY_FILTER}
      onApply={jest.fn()}
      referenceDate={REFERENCE_DATE}
      {...props}
    />,
  );

const optionLabels = (control) =>
  within(control)
    .getAllByRole("option")
    .map((option) => option.textContent);

const selectedValues = (control) =>
  Array.from(control.selectedOptions).map((option) => option.value);

const changeMultiple = (control, values) => {
  Array.from(control.options).forEach((option) => {
    option.selected = values.includes(option.value);
  });
  fireEvent.change(control);
};

describe("PaidReportDateControls", () => {
  beforeEach(() => {
    message.error.mockClear();
  });

  it("defaults to the stable current Riyadh Hijri year and month without applying", () => {
    const onApply = jest.fn();
    const { rerender } = renderControls({ onApply });

    expect(screen.getByLabelText("Calendar").value).toBe("hijri");
    expect(optionLabels(screen.getByLabelText("Year"))).toEqual([
      "All dates",
      "1448",
      "1447",
      "1446",
    ]);
    expect(screen.getByLabelText("Year").value).toBe("1448");
    expect(screen.getByLabelText("Month").multiple).toBe(true);
    expect(selectedValues(screen.getByLabelText("Month"))).toEqual(["1"]);
    expect(optionLabels(screen.getByLabelText("Month"))).toContain("Safar");
    expect(onApply).not.toHaveBeenCalled();

    rerender(
      <PaidReportDateControls
        value={{ ...EMPTY_FILTER, dateRanges: [] }}
        onApply={onApply}
        referenceDate={new Date("2030-01-01T00:00:00.000Z")}
      />,
    );
    expect(screen.getByLabelText("Year").value).toBe("1448");
    expect(selectedValues(screen.getByLabelText("Month"))).toEqual(["1"]);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("keeps date type, calendar, year, multi-month, and actions in order", () => {
    renderControls();

    const controls = [
      screen.getByLabelText("Date type"),
      screen.getByLabelText("Calendar"),
      screen.getByLabelText("Year"),
      screen.getByLabelText("Month"),
      screen.getByRole("button", { name: "Apply" }),
      screen.getByRole("button", { name: "Clear" }),
    ];
    controls.slice(0, -1).forEach((control, index) => {
      expect(
        control.compareDocumentPosition(controls[index + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it("applies the default current Hijri month using canonical API dates", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkin_date",
      dateFrom: "2026-06-16",
      dateTo: "2026-07-14",
      dateRanges: [],
    });
  });

  it("applies non-contiguous Hijri months as exact sorted ranges", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    changeMultiple(screen.getByLabelText("Month"), ["3", "1"]);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkin_date",
      dateFrom: "",
      dateTo: "",
      dateRanges: [
        { dateFrom: "2026-06-16", dateTo: "2026-07-14" },
        { dateFrom: "2026-08-14", dateTo: "2026-09-11" },
      ],
    });
  });

  it("keeps All months mutually exclusive with concrete months", () => {
    const onApply = jest.fn();
    renderControls({ onApply });
    const month = screen.getByLabelText("Month");

    changeMultiple(month, ["1", "all"]);
    expect(selectedValues(month)).toEqual(["all"]);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenLastCalledWith({
      dateBy: "checkin_date",
      dateFrom: "2026-06-16",
      dateTo: "2027-06-05",
      dateRanges: [],
    });

    changeMultiple(month, ["all", "2"]);
    expect(selectedValues(month)).toEqual(["2"]);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenLastCalledWith({
      dateBy: "checkin_date",
      dateFrom: "2026-07-15",
      dateTo: "2026-08-13",
      dateRanges: [],
    });
  });

  it("can safely switch to Gregorian and apply one Gregorian month", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    fireEvent.change(screen.getByLabelText("Calendar"), {
      target: { value: "gregorian" },
    });
    expect(screen.getByLabelText("Year").value).toBe("all");
    expect(screen.getByLabelText("Month").disabled).toBe(true);
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Date type"), {
      target: { value: "checkout_date" },
    });
    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "2026" },
    });
    changeMultiple(screen.getByLabelText("Month"), ["7"]);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkout_date",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      dateRanges: [],
    });
  });

  it("applies All dates only after the year is explicitly cleared", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "all" },
    });
    expect(selectedValues(screen.getByLabelText("Month"))).toEqual(["all"]);
    expect(screen.getByLabelText("Month").disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkin_date",
      dateFrom: "",
      dateTo: "",
      dateRanges: [],
    });
  });

  it("clears every period while retaining the selected date type", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    fireEvent.change(screen.getByLabelText("Date type"), {
      target: { value: "checkout_date" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkout_date",
      dateFrom: "",
      dateTo: "",
      dateRanges: [],
    });
    expect(screen.getByLabelText("Year").value).toBe("all");
    expect(selectedValues(screen.getByLabelText("Month"))).toEqual(["all"]);
  });

  it("synchronizes externally applied exact Hijri date ranges", () => {
    const onApply = jest.fn();
    const { rerender } = renderControls({ onApply });

    rerender(
      <PaidReportDateControls
        value={{
          dateBy: "createdAt",
          dateFrom: "",
          dateTo: "",
          dateRanges: [
            { dateFrom: "2026-08-14", dateTo: "2026-09-11" },
            { dateFrom: "2026-06-16", dateTo: "2026-07-14" },
          ],
        }}
        onApply={onApply}
        referenceDate={REFERENCE_DATE}
      />,
    );

    expect(screen.getByLabelText("Date type").value).toBe("createdAt");
    expect(screen.getByLabelText("Year").value).toBe("1448");
    expect(selectedValues(screen.getByLabelText("Month"))).toEqual(["1", "3"]);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("localizes the default Hijri multi-month controls in Arabic", () => {
    renderControls({ isArabic: true });

    const calendar = screen.getByLabelText("التقويم");
    const year = screen.getByLabelText("السنة");
    const month = screen.getByLabelText("الشهر");
    expect(calendar.value).toBe("hijri");
    expect(year.value).toBe("1448");
    expect(month.multiple).toBe(true);
    expect(optionLabels(month)).toContain("صفر");
  });

  it("disables every action and selector until a hotel is selected", () => {
    renderControls({ disabled: true });

    expect(screen.getByLabelText("Date type").disabled).toBe(true);
    expect(screen.getByLabelText("Calendar").disabled).toBe(true);
    expect(screen.getByLabelText("Year").disabled).toBe(true);
    expect(screen.getByLabelText("Month").disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Apply" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Clear" }).disabled).toBe(true);
  });
});
