import React from "react";
import { Button, Tooltip } from "antd";
import styled from "styled-components";
import {
	DEFAULT_REPORT_TOTAL_MODE,
	REPORT_TOTAL_MODES,
	normalizeReportTotalMode,
} from "./reportTotalMode";

const TEXT = {
	en: {
		groupLabel: "Reservation total basis",
		label: "Total basis",
		gross: "Gross Total",
		net: "Net Total",
		grossHint: "Guest total before OTA deductions",
		netHint: "Verified total after OTA deductions",
	},
	ar: {
		groupLabel: "أساس قيمة الحجز",
		label: "أساس الإجمالي",
		gross: "الإجمالي",
		net: "الصافي",
		grossHint: "إجمالي قيمة حجز النزيل قبل خصومات منصات الحجز",
		netHint: "صافي قيمة الحجز بعد خصومات منصات الحجز",
	},
};

const ReportTotalModeToggle = ({
	value = DEFAULT_REPORT_TOTAL_MODE,
	onChange,
	isArabic = false,
	disabled = false,
	showLabel = true,
	className,
}) => {
	const labels = TEXT[isArabic ? "ar" : "en"];
	const activeMode = normalizeReportTotalMode(value);
	const options = [
		{
			value: REPORT_TOTAL_MODES.GROSS,
			label: labels.gross,
			hint: labels.grossHint,
		},
		{
			value: REPORT_TOTAL_MODES.NET,
			label: labels.net,
			hint: labels.netHint,
		},
	];

	return (
		<ToggleGroup
			className={className}
			dir={isArabic ? "rtl" : "ltr"}
			role='group'
			aria-label={labels.groupLabel}
		>
			{showLabel ? <span className='toggle-label'>{labels.label}</span> : null}
			<div className='toggle-buttons'>
				{options.map((option) => {
					const active = activeMode === option.value;
					return (
						<Tooltip key={option.value} title={option.hint}>
							<Button
								type={active ? "primary" : "default"}
								aria-pressed={active}
								disabled={disabled}
								onClick={() => {
									if (!active) onChange?.(option.value);
								}}
							>
								{option.label}
							</Button>
						</Tooltip>
					);
				})}
			</div>
		</ToggleGroup>
	);
};

export default ReportTotalModeToggle;

const ToggleGroup = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;

	.toggle-label {
		font-size: 12px;
		font-weight: 700;
		color: #102033;
	}

	.toggle-buttons {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.ant-btn {
		min-width: 112px;
		font-weight: 700;
	}
`;
