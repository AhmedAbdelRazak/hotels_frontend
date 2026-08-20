import React from "react";
import styled from "styled-components";

export const BREAKDOWN_UPDATED_FILTERS = Object.freeze({
	ALL: "all",
	TODAY: "today",
	YESTERDAY: "yesterday",
	LAST_7_DAYS: "last_7_days",
});

const FILTER_VALUES = new Set(Object.values(BREAKDOWN_UPDATED_FILTERS));

export const normalizeBreakdownUpdatedFilter = (value) => {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	return FILTER_VALUES.has(normalized)
		? normalized
		: BREAKDOWN_UPDATED_FILTERS.ALL;
};

const COPY = Object.freeze({
	en: Object.freeze({
		title: "Payment breakdown updated",
		hint: "Filter reservations and scorecards by the latest edit day.",
		all: "All",
		today: "Today",
		yesterday: "Yesterday",
		last_7_days: "Last 7 days",
	}),
	ar: Object.freeze({
		title: "\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b \u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062f\u0641\u0639",
		hint:
			"\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0648\u0628\u0637\u0627\u0642\u0627\u062a \u0627\u0644\u0645\u0644\u062e\u0635 \u062d\u0633\u0628 \u064a\u0648\u0645 \u0622\u062e\u0631 \u062a\u0639\u062f\u064a\u0644.",
		all: "\u0627\u0644\u0643\u0644",
		today: "\u0627\u0644\u064a\u0648\u0645",
		yesterday: "\u0623\u0645\u0633",
		last_7_days:
			"\u0622\u062e\u0631 7 \u0623\u064a\u0627\u0645",
	}),
});

const BreakdownUpdatedFilter = ({
	value = BREAKDOWN_UPDATED_FILTERS.ALL,
	onChange,
	isArabic = false,
	disabled = false,
}) => {
	const selected = normalizeBreakdownUpdatedFilter(value);
	const labels = COPY[isArabic ? "ar" : "en"];

	return (
		<FilterCard data-testid='breakdown-updated-filter'>
			<FilterHeading>
				<FilterTitle>{labels.title}</FilterTitle>
				<FilterHint>{labels.hint}</FilterHint>
			</FilterHeading>
			<SegmentedButtons role='group' aria-label={labels.title}>
				{Object.values(BREAKDOWN_UPDATED_FILTERS).map((option) => (
					<button
						key={option}
						type='button'
						className={selected === option ? "active" : ""}
						aria-pressed={selected === option}
						disabled={disabled}
						onClick={() => {
							if (selected !== option) onChange?.(option);
						}}
					>
						{labels[option]}
					</button>
				))}
			</SegmentedButtons>
		</FilterCard>
	);
};

const FilterCard = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	flex: 1 1 430px;
	min-width: 390px;
	max-width: 650px;
	padding: 10px 12px;
	border: 1px solid #cfe0ea;
	border-radius: 12px;
	background: linear-gradient(135deg, #f8fcfe 0%, #f0f7fa 100%);
	box-shadow: 0 4px 14px rgba(20, 78, 108, 0.06);

	@media (max-width: 620px) {
		min-width: 100%;
		max-width: none;
		align-items: stretch;
		flex-direction: column;
	}
`;

const FilterHeading = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 185px;
`;

const FilterTitle = styled.span`
	color: #173f55;
	font-size: 0.84rem;
	font-weight: 800;
	line-height: 1.25;
`;

const FilterHint = styled.span`
	color: #668093;
	font-size: 0.7rem;
	line-height: 1.3;
`;

const SegmentedButtons = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(78px, 1fr));
	gap: 3px;
	min-width: 350px;
	padding: 3px;
	border: 1px solid #d6e4ec;
	border-radius: 10px;
	background: #eaf2f6;

	button {
		min-height: 34px;
		padding: 6px 10px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		color: #46677a;
		font-size: 0.78rem;
		font-weight: 750;
		cursor: pointer;
		transition:
			background 160ms ease,
			box-shadow 160ms ease,
			color 160ms ease,
			transform 160ms ease;
	}

	button:hover:not(:disabled):not(.active) {
		background: rgba(255, 255, 255, 0.72);
		color: #0b658c;
	}

	button:focus-visible {
		outline: 3px solid rgba(15, 126, 167, 0.28);
		outline-offset: 1px;
	}

	button.active {
		background: linear-gradient(135deg, #0c5f86, #087ca6);
		box-shadow: 0 3px 8px rgba(8, 91, 127, 0.22);
		color: #fff;
	}

	button:active:not(:disabled) {
		transform: translateY(1px);
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.52;
	}

	@media (max-width: 620px) {
		min-width: 0;
		width: 100%;
	}

	@media (max-width: 440px) {
		grid-template-columns: repeat(2, minmax(110px, 1fr));
	}
`;

export default BreakdownUpdatedFilter;
