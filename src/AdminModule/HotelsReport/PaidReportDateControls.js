import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Button, Select, message } from "antd";
import { ClearOutlined, FilterOutlined } from "@ant-design/icons";
import {
  PAID_REPORT_ALL_PERIODS,
  PAID_REPORT_DATE_ERRORS,
  getPaidReportYearValues,
  inferPaidReportPeriodSelection,
  resolvePaidReportPeriod,
} from "./paidReportDateFilter";

const DEFAULT_DATE_FIELD = "checkin_date";

const TEXT = {
  en: {
    groupLabel: "Paid report date filter",
    dateField: "Date type",
    calendar: "Calendar",
    year: "Year",
    month: "Month",
    createdAt: "Created at",
    checkin: "Check-in",
    checkout: "Check-out",
    gregorian: "Gregorian",
    hijri: "Hijri",
    allYears: "All dates",
    allMonths: "All months",
    apply: "Apply",
    clear: "Clear",
    selectYearFirst: "Select a specific year before choosing a month.",
    invalidSelection: "The selected calendar period is not available.",
  },
  ar: {
    groupLabel:
      "\u062a\u0635\u0641\u064a\u0629 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    dateField: "\u0646\u0648\u0639 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    calendar: "\u0627\u0644\u062a\u0642\u0648\u064a\u0645",
    year: "\u0627\u0644\u0633\u0646\u0629",
    month: "\u0627\u0644\u0634\u0647\u0631",
    createdAt:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
    checkin:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0648\u0635\u0648\u0644",
    checkout:
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629",
    gregorian: "\u0645\u064a\u0644\u0627\u062f\u064a",
    hijri: "\u0647\u062c\u0631\u064a",
    allYears: "\u0643\u0644 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e",
    allMonths: "\u0643\u0644 \u0627\u0644\u0623\u0634\u0647\u0631",
    apply: "\u062a\u0637\u0628\u064a\u0642",
    clear: "\u0645\u0633\u062d",
    selectYearFirst:
      "\u0627\u062e\u062a\u0631 \u0633\u0646\u0629 \u0645\u062d\u062f\u062f\u0629 \u0642\u0628\u0644 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0634\u0647\u0631.",
    invalidSelection:
      "\u0627\u0644\u0641\u062a\u0631\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629.",
  },
};

const MONTHS = {
  gregorian: {
    en: [
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
    ],
    ar: [
      "\u064a\u0646\u0627\u064a\u0631",
      "\u0641\u0628\u0631\u0627\u064a\u0631",
      "\u0645\u0627\u0631\u0633",
      "\u0623\u0628\u0631\u064a\u0644",
      "\u0645\u0627\u064a\u0648",
      "\u064a\u0648\u0646\u064a\u0648",
      "\u064a\u0648\u0644\u064a\u0648",
      "\u0623\u063a\u0633\u0637\u0633",
      "\u0633\u0628\u062a\u0645\u0628\u0631",
      "\u0623\u0643\u062a\u0648\u0628\u0631",
      "\u0646\u0648\u0641\u0645\u0628\u0631",
      "\u062f\u064a\u0633\u0645\u0628\u0631",
    ],
  },
  hijri: {
    en: [
      "Muharram",
      "Safar",
      "Rabi' al-Awwal",
      "Rabi' al-Thani",
      "Jumada al-Awwal",
      "Jumada al-Thani",
      "Rajab",
      "Sha'ban",
      "Ramadan",
      "Shawwal",
      "Dhu al-Qi'dah",
      "Dhu al-Hijjah",
    ],
    ar: [
      "\u0645\u062d\u0631\u0645",
      "\u0635\u0641\u0631",
      "\u0631\u0628\u064a\u0639 \u0627\u0644\u0623\u0648\u0644",
      "\u0631\u0628\u064a\u0639 \u0627\u0644\u0622\u062e\u0631",
      "\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0623\u0648\u0644\u0649",
      "\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0622\u062e\u0631\u0629",
      "\u0631\u062c\u0628",
      "\u0634\u0639\u0628\u0627\u0646",
      "\u0631\u0645\u0636\u0627\u0646",
      "\u0634\u0648\u0627\u0644",
      "\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629",
      "\u0630\u0648 \u0627\u0644\u062d\u062c\u0629",
    ],
  },
};

const errorMessageFor = (error, labels) =>
  error === PAID_REPORT_DATE_ERRORS.YEAR_REQUIRED
    ? labels.selectYearFirst
    : labels.invalidSelection;

const PaidReportDateControls = ({
  isArabic = false,
  disabled = false,
  value = {},
  onApply,
  referenceDate,
}) => {
  const labels = TEXT[isArabic ? "ar" : "en"];
  const referenceDateRef = useRef(null);
  if (!referenceDateRef.current) {
    referenceDateRef.current = referenceDate || new Date();
  }
  const stableReferenceDate = referenceDateRef.current;
  const initialSelectionRef = useRef(null);
  if (!initialSelectionRef.current) {
    initialSelectionRef.current = inferPaidReportPeriodSelection({
      calendarType: "gregorian",
      dateFrom: value.dateFrom || "",
      dateTo: value.dateTo || "",
      referenceDate: stableReferenceDate,
    });
  }
  const initialSelection = initialSelectionRef.current;
  const [dateField, setDateField] = useState(
    value.dateBy || DEFAULT_DATE_FIELD,
  );
  const [calendarType, setCalendarType] = useState("gregorian");
  const [selectedYear, setSelectedYear] = useState(initialSelection.year);
  const [selectedMonth, setSelectedMonth] = useState(initialSelection.month);
  const appliedSignature = `${value.dateBy || DEFAULT_DATE_FIELD}|${
    value.dateFrom || ""
  }|${value.dateTo || ""}`;
  const syncedSignatureRef = useRef(appliedSignature);

  useEffect(() => {
    if (syncedSignatureRef.current === appliedSignature) return;
    syncedSignatureRef.current = appliedSignature;
    setDateField(value.dateBy || DEFAULT_DATE_FIELD);
    const selection = inferPaidReportPeriodSelection({
      calendarType,
      dateFrom: value.dateFrom || "",
      dateTo: value.dateTo || "",
      referenceDate: stableReferenceDate,
    });
    setSelectedYear(selection.year);
    setSelectedMonth(selection.month);
  }, [
    appliedSignature,
    calendarType,
    stableReferenceDate,
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

  const yearOptions = useMemo(
    () => [
      { value: PAID_REPORT_ALL_PERIODS, label: labels.allYears },
      ...getPaidReportYearValues(calendarType, stableReferenceDate).map(
        (year) => ({ value: year, label: year }),
      ),
    ],
    [calendarType, labels.allYears, stableReferenceDate],
  );

  const monthOptions = useMemo(
    () => [
      { value: PAID_REPORT_ALL_PERIODS, label: labels.allMonths },
      ...MONTHS[calendarType][isArabic ? "ar" : "en"].map(
        (monthName, index) => ({
          value: String(index + 1),
          label: monthName,
        }),
      ),
    ],
    [calendarType, isArabic, labels.allMonths],
  );

  const hasAppliedRange = Boolean(value.dateFrom || value.dateTo);
  const hasDraftPeriod = selectedYear !== PAID_REPORT_ALL_PERIODS;
  const monthDisabled = disabled || !hasDraftPeriod;

  const handleCalendarChange = (nextCalendar) => {
    if (nextCalendar === calendarType) return;

    const resolved = resolvePaidReportPeriod({
      calendarType,
      year: selectedYear,
      month: selectedMonth,
      referenceDate: stableReferenceDate,
    });
    if (resolved.error) {
      message.error(errorMessageFor(resolved.error, labels));
      return;
    }

    const selection = inferPaidReportPeriodSelection({
      calendarType: nextCalendar,
      dateFrom: resolved.dateFrom,
      dateTo: resolved.dateTo,
      referenceDate: stableReferenceDate,
    });
    setCalendarType(nextCalendar);
    setSelectedYear(selection.year);
    setSelectedMonth(selection.month);
  };

  const handleYearChange = (nextYear) => {
    setSelectedYear(nextYear);
    if (nextYear === PAID_REPORT_ALL_PERIODS) {
      setSelectedMonth(PAID_REPORT_ALL_PERIODS);
    }
  };

  const handleApply = () => {
    const resolved = resolvePaidReportPeriod({
      calendarType,
      year: selectedYear,
      month: selectedMonth,
      referenceDate: stableReferenceDate,
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
    setSelectedYear(PAID_REPORT_ALL_PERIODS);
    setSelectedMonth(PAID_REPORT_ALL_PERIODS);
    onApply?.({ dateBy: dateField, dateFrom: "", dateTo: "" });
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
      <Select
        value={selectedYear}
        onChange={handleYearChange}
        options={yearOptions}
        disabled={disabled}
        aria-label={labels.year}
        className="year-select"
      />
      <Select
        value={selectedMonth}
        onChange={setSelectedMonth}
        options={monthOptions}
        disabled={monthDisabled}
        aria-label={labels.month}
        title={!hasDraftPeriod ? labels.selectYearFirst : labels.month}
        className="month-select"
      />
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
        disabled={disabled || (!hasDraftPeriod && !hasAppliedRange)}
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
  flex: 0 1 600px;
  min-width: 560px;

  .date-field-select {
    width: 120px;
  }

  .calendar-select {
    width: 88px;
  }

  .year-select {
    width: 96px;
  }

  .month-select {
    width: 130px;
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
    min-width: min(100%, 560px);
  }

  @media (max-width: 768px) {
    width: 100%;
    min-width: 100%;
    padding: 8px;

    .date-field-select,
    .calendar-select,
    .year-select,
    .month-select {
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
    .year-select,
    .month-select,
    button {
      width: 100%;
      min-width: 100%;
    }
  }
`;
