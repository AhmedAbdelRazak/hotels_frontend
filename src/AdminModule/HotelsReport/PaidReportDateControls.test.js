import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { message } from "antd";
import PaidReportDateControls from "./PaidReportDateControls";

jest.mock("@ant-design/icons", () => ({
  ClearOutlined: () => <span aria-hidden="true" />,
  FilterOutlined: () => <span aria-hidden="true" />,
}));

jest.mock("antd", () => {
  const dayjsModule = require("dayjs");

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
  const Input = ({ allowClear, onPressEnter, onChange, ...props }) => (
    <input
      {...props}
      onChange={onChange}
      onKeyDown={(event) => {
        if (event.key === "Enter") onPressEnter?.(event);
      }}
    />
  );
  const DatePicker = ({
    allowClear,
    disabledDate,
    format,
    onChange,
    value,
    ...props
  }) => (
    <input
      {...props}
      value={value?.format?.("YYYY-MM-DD") || ""}
      onChange={(event) =>
        onChange?.(event.target.value ? dayjsModule(event.target.value) : null)
      }
    />
  );

  return {
    Button,
    DatePicker,
    Input,
    Select,
    message: { error: jest.fn() },
  };
});

const EMPTY_FILTER = {
  dateBy: "checkin_date",
  dateFrom: "",
  dateTo: "",
};

describe("PaidReportDateControls", () => {
  beforeEach(() => {
    message.error.mockClear();
  });

  it("switches calendars without changing the canonical applied days", () => {
    render(
      <PaidReportDateControls
        value={{
          dateBy: "checkin_date",
          dateFrom: "2026-07-14",
          dateTo: "2026-07-15",
        }}
        onApply={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Calendar"), {
      target: { value: "hijri" },
    });
    expect(screen.getByLabelText("Hijri from (YYYY-MM-DD)").value).toBe(
      "1448-01-29",
    );
    expect(screen.getByLabelText("Hijri to (YYYY-MM-DD)").value).toBe(
      "1448-02-01",
    );

    fireEvent.change(screen.getByLabelText("Calendar"), {
      target: { value: "gregorian" },
    });
    expect(screen.getByLabelText("From date").value).toBe("2026-07-14");
    expect(screen.getByLabelText("To date").value).toBe("2026-07-15");
  });

  it("normalizes localized Hijri digits and applies canonical Gregorian API keys", () => {
    const onApply = jest.fn();
    render(<PaidReportDateControls value={EMPTY_FILTER} onApply={onApply} />);

    fireEvent.change(screen.getByLabelText("Calendar"), {
      target: { value: "hijri" },
    });
    fireEvent.change(screen.getByLabelText("Hijri from (YYYY-MM-DD)"), {
      target: { value: "\u0661\u0664\u0664\u0668-\u0660\u0661-\u0662\u0669" },
    });
    fireEvent.change(screen.getByLabelText("Hijri to (YYYY-MM-DD)"), {
      target: { value: "\u06f1\u06f4\u06f4\u06f8-\u06f0\u06f2-\u06f0\u06f1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkin_date",
      dateFrom: "2026-07-14",
      dateTo: "2026-07-15",
    });
    expect(message.error).not.toHaveBeenCalled();
  });

  it("blocks a calendar switch when an entered Hijri date is impossible", () => {
    render(<PaidReportDateControls value={EMPTY_FILTER} onApply={jest.fn()} />);

    fireEvent.change(screen.getByLabelText("Calendar"), {
      target: { value: "hijri" },
    });
    fireEvent.change(screen.getByLabelText("Hijri from (YYYY-MM-DD)"), {
      target: { value: "1448-01-30" },
    });
    fireEvent.change(screen.getByLabelText("Calendar"), {
      target: { value: "gregorian" },
    });

    expect(screen.getByLabelText("Calendar").value).toBe("hijri");
    expect(message.error).toHaveBeenCalledTimes(1);
  });

  it("clears both boundaries while retaining the selected date type", () => {
    const onApply = jest.fn();
    render(
      <PaidReportDateControls
        value={{
          dateBy: "checkout_date",
          dateFrom: "2026-07-14",
          dateTo: "2026-07-15",
        }}
        onApply={onApply}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onApply).toHaveBeenCalledWith({
      dateBy: "checkout_date",
      dateFrom: "",
      dateTo: "",
    });
  });
});
