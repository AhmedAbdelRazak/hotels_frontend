import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import styled from "styled-components";
import { Button, DatePicker, Input, Select, message } from "antd";
import { ClearOutlined, FilterOutlined } from "@ant-design/icons";
import {
  PAID_REPORT_DATE_ERRORS,
  gregorianDateToCalendarKey,
  normalizeDateDigits,
  normalizeGregorianDateKey,
  resolvePaidReportDateRange,
} from "./paidReportDateFilter";

const DEFAULT_DATE_FIELD = "checkin_date";

const TEXT = {
  en: {
    groupLabel: "Paid report date filter",
    dateField: "Date type",
    calendar: "Calendar",
    createdAt: "Created at",
    checkin: "Check-in",
    checkout: "Check-out",
    gregorian: "Gregorian",
    hijri: "Hijri",
    from: "From date",
    to: "To date",
    hijriFrom: "Hijri from (YYYY-MM-DD)",
    hijriTo: "Hijri to (YYYY-MM-DD)",
    apply: "Apply",
    clear: "Clear",
    invalidFrom: "Enter a valid from date in YYYY-MM-DD format.",
    invalidTo: "Enter a valid to date in YYYY-MM-DD format.",
    reversedRange: "The from date must be on or before the to date.",
    conversionError:
      "These dates cannot be represented in the selected calendar.",
  },
  ar: {
    groupLabel:
      "\u062a\u0635\u0641\u064a\u0629 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    dateField: "\u0646\u0648\u0639 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    calendar: "\u0627\u0644\u062a\u0642\u0648\u064a\u0645",
    createdAt:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
    checkin:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0648\u0635\u0648\u0644",
    checkout:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
    gregorian: "\u0645\u064a\u0644\u0627\u062f\u064a",
    hijri: "\u0647\u062c\u0631\u064a",
    from: "\u0645\u0646 \u062a\u0627\u0631\u064a\u062e",
    to: "\u0625\u0644\u0649 \u062a\u0627\u0631\u064a\u062e",
    hijriFrom:
      "\u0645\u0646 \u062a\u0627\u0631\u064a\u062e \u0647\u062c\u0631\u064a (YYYY-MM-DD)",
    hijriTo:
      "\u0625\u0644\u0649 \u062a\u0627\u0631\u064a\u062e \u0647\u062c\u0631\u064a (YYYY-MM-DD)",
    apply: "\u062a\u0637\u0628\u064a\u0642",
    clear: "\u0645\u0633\u062d",
    invalidFrom:
      "\u0623\u062f\u062e\u0644 \u062a\u0627\u0631\u064a\u062e \u0628\u062f\u0627\u064a\u0629 \u0635\u062d\u064a\u062d\u0627\u064b \u0628\u0627\u0644\u0635\u064a\u063a\u0629 YYYY-MM-DD.",
    invalidTo:
      "\u0623\u062f\u062e\u0644 \u062a\u0627\u0631\u064a\u062e \u0646\u0647\u0627\u064a\u0629 \u0635\u062d\u064a\u062d\u0627\u064b \u0628\u0627\u0644\u0635\u064a\u063a\u0629 YYYY-MM-DD.",
    reversedRange:
      "\u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629 \u0642\u0628\u0644 \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0646\u0647\u0627\u064a\u0629 \u0623\u0648 \u0645\u0633\u0627\u0648\u064a\u0627\u064b \u0644\u0647.",
    conversionError:
      "\u0644\u0627 \u064a\u0645\u0643\u0646 \u0639\u0631\u0636 \u0647\u0630\u0647 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0641\u064a \u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0645\u062d\u062f\u062f.",
  },
};

const asDatePickerValue = (value) => {
  const normalized = normalizeGregorianDateKey(value);
  return normalized ? dayjs(normalized) : null;
};

const errorMessageFor = (error, labels) => {
  if (error === PAID_REPORT_DATE_ERRORS.INVALID_FROM) return labels.invalidFrom;
  if (error === PAID_REPORT_DATE_ERRORS.INVALID_TO) return labels.invalidTo;
  if (error === PAID_REPORT_DATE_ERRORS.REVERSED_RANGE) {
    return labels.reversedRange;
  }
  return labels.conversionError;
};

const PaidReportDateControls = ({
  isArabic = false,
  disabled = false,
  value = {},
  onApply,
}) => {
  const labels = TEXT[isArabic ? "ar" : "en"];
  const [dateField, setDateField] = useState(
    value.dateBy || DEFAULT_DATE_FIELD,
  );
  const [calendarType, setCalendarType] = useState("gregorian");
  const [fromInput, setFromInput] = useState(value.dateFrom || "");
  const [toInput, setToInput] = useState(value.dateTo || "");
  const appliedSignature = `${value.dateBy || DEFAULT_DATE_FIELD}|${
    value.dateFrom || ""
  }|${value.dateTo || ""}`;
  const syncedSignatureRef = useRef(appliedSignature);

  useEffect(() => {
    if (syncedSignatureRef.current === appliedSignature) return;
    syncedSignatureRef.current = appliedSignature;
    setDateField(value.dateBy || DEFAULT_DATE_FIELD);
    setFromInput(
      gregorianDateToCalendarKey(value.dateFrom || "", calendarType),
    );
    setToInput(gregorianDateToCalendarKey(value.dateTo || "", calendarType));
  }, [
    appliedSignature,
    calendarType,
    value.dateBy,
    value.dateFrom,
    value.dateTo,
  ]);

  const dateFieldOptions = useMemo(
    () => [
      { value: "checkin_date", label: labels.checkin },
      { value: "checkout_date", label: labels.checkout },
      { value: "createdAt", label: labels.createdAt },
    ],
    [labels],
  );

  const calendarOptions = useMemo(
    () => [
      { value: "gregorian", label: labels.gregorian },
      { value: "hijri", label: labels.hijri },
    ],
    [labels],
  );

  const hasAppliedRange = Boolean(value.dateFrom || value.dateTo);
  const hasDraftRange = Boolean(fromInput || toInput);

  const handleCalendarChange = (nextCalendar) => {
    if (nextCalendar === calendarType) return;

    const resolved = resolvePaidReportDateRange({
      calendarType,
      from: fromInput,
      to: toInput,
    });
    if (resolved.error) {
      message.error(errorMessageFor(resolved.error, labels));
      return;
    }

    const nextFrom = resolved.dateFrom
      ? gregorianDateToCalendarKey(resolved.dateFrom, nextCalendar)
      : "";
    const nextTo = resolved.dateTo
      ? gregorianDateToCalendarKey(resolved.dateTo, nextCalendar)
      : "";
    if ((resolved.dateFrom && !nextFrom) || (resolved.dateTo && !nextTo)) {
      message.error(labels.conversionError);
      return;
    }

    setCalendarType(nextCalendar);
    setFromInput(nextFrom);
    setToInput(nextTo);
  };

  const handleApply = () => {
    const resolved = resolvePaidReportDateRange({
      calendarType,
      from: fromInput,
      to: toInput,
    });
    if (resolved.error) {
      message.error(errorMessageFor(resolved.error, labels));
      return;
    }

    onApply?.({
      dateBy: dateField,
      dateFrom: resolved.dateFrom,
      dateTo: resolved.dateTo,
    });
  };

  const handleClear = () => {
    setFromInput("");
    setToInput("");
    onApply?.({ dateBy: dateField, dateFrom: "", dateTo: "" });
  };

  const normalizeInputOnBlur = (setter) => (event) => {
    setter(normalizeDateDigits(event.target.value).trim());
  };

  return (
    <FilterGroup
      dir={isArabic ? "rtl" : "ltr"}
      role="group"
      aria-label={labels.groupLabel}
      $active={hasAppliedRange}
    >
      <Select
        value={dateField}
        onChange={setDateField}
        options={dateFieldOptions}
        disabled={disabled}
        aria-label={labels.dateField}
        className="date-field-select"
      />
      <Select
        value={calendarType}
        onChange={handleCalendarChange}
        options={calendarOptions}
        disabled={disabled}
        aria-label={labels.calendar}
        className="calendar-select"
      />

      {calendarType === "gregorian" ? (
        <>
          <DatePicker
            value={asDatePickerValue(fromInput)}
            onChange={(date) =>
              setFromInput(date?.isValid() ? date.format("YYYY-MM-DD") : "")
            }
            disabledDate={(current) =>
              Boolean(toInput && current.format("YYYY-MM-DD") > toInput)
            }
            placeholder={labels.from}
            format="YYYY-MM-DD"
            disabled={disabled}
            allowClear
            aria-label={labels.from}
            className="date-input"
          />
          <DatePicker
            value={asDatePickerValue(toInput)}
            onChange={(date) =>
              setToInput(date?.isValid() ? date.format("YYYY-MM-DD") : "")
            }
            disabledDate={(current) =>
              Boolean(fromInput && current.format("YYYY-MM-DD") < fromInput)
            }
            placeholder={labels.to}
            format="YYYY-MM-DD"
            disabled={disabled}
            allowClear
            aria-label={labels.to}
            className="date-input"
          />
        </>
      ) : (
        <>
          <Input
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
            onBlur={normalizeInputOnBlur(setFromInput)}
            onPressEnter={handleApply}
            placeholder={labels.hijriFrom}
            disabled={disabled}
            allowClear
            maxLength={10}
            aria-label={labels.hijriFrom}
            title={labels.hijriFrom}
            className="date-input hijri-input"
          />
          <Input
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
            onBlur={normalizeInputOnBlur(setToInput)}
            onPressEnter={handleApply}
            placeholder={labels.hijriTo}
            disabled={disabled}
            allowClear
            maxLength={10}
            aria-label={labels.hijriTo}
            title={labels.hijriTo}
            className="date-input hijri-input"
          />
        </>
      )}

      <Button
        type="primary"
        icon={<FilterOutlined />}
        onClick={handleApply}
        disabled={disabled}
        aria-label={labels.apply}
      >
        {labels.apply}
      </Button>
      <Button
        icon={<ClearOutlined />}
        onClick={handleClear}
        disabled={disabled || (!hasDraftRange && !hasAppliedRange)}
        aria-label={labels.clear}
        title={labels.clear}
        className="clear-date-filter"
      >
        <span className="clear-label">{labels.clear}</span>
      </Button>
    </FilterGroup>
  );
};

export default PaidReportDateControls;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 5px;
  border: 1px solid ${(props) => (props.$active ? "#91caff" : "#e5e7eb")};
  background: ${(props) => (props.$active ? "#f0f7ff" : "#fafafa")};
  border-radius: 8px;
  flex: 0 1 570px;
  min-width: 520px;

  .date-field-select {
    width: 115px;
  }

  .calendar-select {
    width: 82px;
  }

  .date-input {
    width: 116px;
  }

  .hijri-input {
    width: 116px;
    direction: ltr;
  }

  button {
    padding-inline: 10px;
  }

  .clear-date-filter {
    width: 32px;
    padding-inline: 0;
  }

  .clear-label {
    display: none;
  }

  @media (max-width: 1400px) {
    min-width: min(100%, 520px);
  }

  @media (max-width: 768px) {
    width: 100%;
    min-width: 100%;
    padding: 8px;

    .date-field-select,
    .calendar-select,
    .date-input,
    .hijri-input {
      width: calc(50% - 3px);
    }

    button {
      flex: 1;
      min-width: calc(50% - 3px);
    }

    .clear-date-filter {
      width: auto;
      padding-inline: 10px;
    }

    .clear-label {
      display: inline;
    }
  }

  @media (max-width: 480px) {
    .date-field-select,
    .calendar-select,
    .date-input,
    .hijri-input,
    button {
      width: 100%;
      min-width: 100%;
    }
  }
`;
