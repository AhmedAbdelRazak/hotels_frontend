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
  const Select = ({ options = [], onChange, value, ...props }) => (
    <select
      {...props}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

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

describe("PaidReportDateControls", () => {
  beforeEach(() => {
    message.error.mockClear();
  });

  it("shows only All dates, the current Gregorian year, and two prior years", () => {
    renderControls();

    const year = screen.getByLabelText("Year");
    const month = screen.getByLabelText("Month");
    expect(optionLabels(year)).toEqual(["All dates", "2026", "2025", "2024"]);
    expect(month.disabled).toBe(true);
    expect(month.value).toBe("all");

    fireEvent.change(year, { target: { value: "2026" } });
    expect(month.disabled).toBe(false);
    expect(optionLabels(month)).toEqual([
      "All months",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]);
  });

  it("keeps the controls in a clear date-type, calendar, year, month order", () => {
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

  it("applies a complete Gregorian month using canonical API dates", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    fireEvent.change(screen.getByLabelText("Date type"), {
      target: { value: "checkout_date" },
    });
    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "2026" },
    });
    fireEvent.change(screen.getByLabelText("Month"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkout_date",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });
    expect(message.error).not.toHaveBeenCalled();
  });

  it("applies All months as the complete selected year", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "2025" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkin_date",
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
  });

  it("uses Hijri year and month names and sends their Gregorian boundaries", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    fireEvent.change(screen.getByLabelText("Calendar"), {
      target: { value: "hijri" },
    });
    expect(optionLabels(screen.getByLabelText("Year"))).toEqual([
      "All dates",
      "1448",
      "1447",
      "1446",
    ]);
    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "1448" },
    });
    expect(optionLabels(screen.getByLabelText("Month"))).toContain("Safar");
    fireEvent.change(screen.getByLabelText("Month"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkin_date",
      dateFrom: "2026-07-15",
      dateTo: "2026-08-13",
    });
  });

  it("resets an inexact draft on calendar change without applying it", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "2026" },
    });
    fireEvent.change(screen.getByLabelText("Month"), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText("Calendar"), {
      target: { value: "hijri" },
    });

    expect(screen.getByLabelText("Year").value).toBe("all");
    expect(screen.getByLabelText("Month").value).toBe("all");
    expect(screen.getByLabelText("Month").disabled).toBe(true);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("forces All months whenever All dates is selected", () => {
    renderControls();

    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "2026" },
    });
    fireEvent.change(screen.getByLabelText("Month"), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "all" },
    });

    expect(screen.getByLabelText("Month").value).toBe("all");
    expect(screen.getByLabelText("Month").disabled).toBe(true);
  });

  it("applies All dates as the original unfiltered report", () => {
    const onApply = jest.fn();
    renderControls({ onApply });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkin_date",
      dateFrom: "",
      dateTo: "",
    });
  });

  it("clears the period while retaining the selected date type", () => {
    const onApply = jest.fn();
    renderControls({
      value: {
        dateBy: "checkout_date",
        dateFrom: "2026-07-01",
        dateTo: "2026-07-31",
      },
      onApply,
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkout_date",
      dateFrom: "",
      dateTo: "",
    });
    expect(screen.getByLabelText("Year").value).toBe("all");
    expect(screen.getByLabelText("Month").disabled).toBe(true);
  });

  it("synchronizes exact externally applied periods", () => {
    const { rerender } = renderControls();

    rerender(
      <PaidReportDateControls
        value={{
          dateBy: "createdAt",
          dateFrom: "2025-01-01",
          dateTo: "2025-12-31",
        }}
        onApply={jest.fn()}
        referenceDate={REFERENCE_DATE}
      />,
    );

    expect(screen.getByLabelText("Date type").value).toBe("createdAt");
    expect(screen.getByLabelText("Year").value).toBe("2025");
    expect(screen.getByLabelText("Month").value).toBe("all");
  });

  it("localizes the year and month controls in Arabic", () => {
    renderControls({ isArabic: true });

    const year = screen.getByLabelText("\u0627\u0644\u0633\u0646\u0629");
    expect(optionLabels(year)[0]).toBe(
      "\u0643\u0644 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e",
    );
    fireEvent.change(year, { target: { value: "2026" } });
    expect(
      optionLabels(screen.getByLabelText("\u0627\u0644\u0634\u0647\u0631")),
    ).toContain("\u064a\u0648\u0644\u064a\u0648");
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
