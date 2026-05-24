import React, { useMemo, useState } from "react";
import { Select } from "antd";
import styled from "styled-components";

const ALL_OPTION_VALUE = "__overall_filter_all__";

const normalizeValue = (value) =>
	(Array.isArray(value) ? value : String(value || "").split(","))
		.map((item) => String(item || "").trim())
		.filter(Boolean);

const MultiSelectFilter = ({
	value,
	options = [],
	onChange,
	allLabel = "All",
	selectedLabel = "selected",
	isRTL = false,
	multiple = true,
}) => {
	const [open, setOpen] = useState(false);
	const selectedValues = useMemo(() => normalizeValue(value), [value]);
	const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
	const selectedOptions = options.filter((option) => selectedSet.has(option.value));
	const summary =
		selectedOptions.length === 0
			? allLabel
			: selectedOptions.length === 1
			? selectedOptions[0].label
			: `${selectedOptions.length} ${selectedLabel}`;

	const selectOptions = useMemo(
		() => [
			{ value: ALL_OPTION_VALUE, label: allLabel },
			...options.map((option) => ({
				value: option.value,
				label: option.label,
			})),
		],
		[allLabel, options]
	);

	const closeDropdown = () => setOpen(false);

	const clearValues = () => {
		onChange([]);
		closeDropdown();
	};

	const handleMultipleChange = (nextValues = []) => {
		const normalizedValues = normalizeValue(nextValues);
		if (normalizedValues.includes(ALL_OPTION_VALUE)) {
			clearValues();
			return;
		}
		onChange(normalizedValues);
	};

	const handleSingleChange = (nextValue) => {
		if (!nextValue || nextValue === ALL_OPTION_VALUE) {
			clearValues();
			return;
		}
		onChange([nextValue]);
		closeDropdown();
	};
	const selectClassName = `overall-filter-select${
		isRTL ? " overall-filter-select-rtl" : ""
	}`;
	const popupClassName = `overall-filter-dropdown${
		isRTL ? " overall-filter-dropdown-rtl" : ""
	}`;

	return (
		<FilterMenu $isRTL={isRTL}>
			<Select
				mode={multiple ? "multiple" : undefined}
				open={open}
				value={multiple ? selectedValues : selectedValues[0] || undefined}
				options={selectOptions}
				placeholder={allLabel}
				allowClear
				showSearch={false}
				direction={isRTL ? "rtl" : "ltr"}
				optionFilterProp='label'
				maxTagCount={multiple ? 0 : undefined}
				maxTagPlaceholder={() => summary}
				popupMatchSelectWidth={false}
				className={selectClassName}
				popupClassName={popupClassName}
				placement={isRTL ? "bottomRight" : "bottomLeft"}
				getPopupContainer={(triggerNode) =>
					triggerNode.parentElement || document.body
				}
				onDropdownVisibleChange={setOpen}
				onClear={closeDropdown}
				onChange={multiple ? handleMultipleChange : handleSingleChange}
				onInputKeyDown={(event) => {
					if (event.key === "Escape") closeDropdown();
				}}
			/>
		</FilterMenu>
	);
};

export default MultiSelectFilter;

const FilterMenu = styled.div`
	position: relative;
	min-width: 0;
	width: 100%;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	.overall-filter-select {
		width: 100%;
		min-width: 0;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.overall-filter-select .ant-select-selector {
		min-height: 38px;
		height: 38px;
		border: 1px solid #d0d5dd;
		border-radius: 8px;
		background: #fff !important;
		box-shadow: none !important;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")} !important;
		padding-inline: 12px 34px !important;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")} !important;
	}

	.overall-filter-select.ant-select-focused .ant-select-selector,
	.overall-filter-select.ant-select-open .ant-select-selector {
		border-color: #1e88e5 !important;
		box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.12) !important;
	}

	.overall-filter-select .ant-select-selection-search-input {
		min-height: 36px !important;
		height: 36px !important;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")} !important;
		font-size: 14px;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")} !important;
	}

	.overall-filter-select .ant-select-selection-placeholder,
	.overall-filter-select .ant-select-selection-item,
	.overall-filter-select .ant-select-selection-overflow-item-rest {
		color: #101828;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")} !important;
		font-size: 14px;
		font-weight: 800;
		line-height: 36px;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")} !important;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.overall-filter-select .ant-select-selection-placeholder {
		inset-inline-start: 12px !important;
		inset-inline-end: 34px !important;
		width: auto;
	}

	.overall-filter-select .ant-select-selection-overflow {
		flex-wrap: nowrap;
		min-width: 0;
		width: 100%;
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		justify-content: flex-start;
	}

	.overall-filter-select .ant-select-selection-overflow-item {
		max-width: 100%;
		min-width: 0;
	}

	.overall-filter-select .ant-select-selection-overflow-item-rest {
		flex: 1 1 auto;
		max-width: 100%;
		min-width: 0;
	}

	.overall-filter-select .ant-select-arrow,
	.overall-filter-select .ant-select-clear {
		color: #344054;
		font-weight: 900;
	}

	.ant-select-dropdown {
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		z-index: 2100;
		width: min(320px, 92vw);
		max-height: 270px;
		padding: 8px;
		border: 1px solid #cfe5fb;
		border-radius: 10px;
		background: #fff;
		box-shadow: 0 12px 28px rgba(15, 79, 134, 0.18);
	}

	.ant-select-item-option {
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		min-height: 34px;
		border-radius: 8px;
		color: #18212f;
		font-size: 13px;
		font-weight: 850;
	}

	.ant-select-item-option-active,
	.ant-select-item-option-selected {
		background: #eef7ff !important;
	}

	.ant-select-item-option-content {
		direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	@media (max-width: 480px) {
		.overall-filter-select .ant-select-selector {
			min-height: 42px;
			height: 42px;
		}

		.overall-filter-select .ant-select-selection-search-input {
			min-height: 40px !important;
			height: 40px !important;
			font-size: 0.82rem;
		}

		.overall-filter-select .ant-select-selection-placeholder,
		.overall-filter-select .ant-select-selection-item,
		.overall-filter-select .ant-select-selection-overflow-item-rest {
			font-size: 0.82rem;
			line-height: 40px;
		}
	}
`;
