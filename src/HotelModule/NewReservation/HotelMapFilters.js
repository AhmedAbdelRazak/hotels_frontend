import React from "react";
import styled from "styled-components";
import { Input, Select, Button } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";

const HotelMapFilters = ({
	chosenLanguage,
	distinctRoomTypesWithColors,
	floors,
	handleFilterChange,
	handleResetFilters,
	selectedAvailability,
	selectedRoomType,
	selectedFloor,
	selectedRoomStatus,
	fromComponent,
}) => {
	const roomOptions = Array.isArray(distinctRoomTypesWithColors)
		? distinctRoomTypesWithColors
		: [];

	const handleAvailabilityChange = (value) => {
		handleFilterChange("availability", value === "all" ? null : value);
	};

	const handleRoomTypeChange = (value) => {
		handleFilterChange("roomType", value === "all" ? null : value);
	};

	const handleFloorChange = (value) => {
		handleFilterChange("floor", value === "all" ? null : value);
	};

	const handleRoomStatusChange = (value) => {
		handleFilterChange("roomStatus", value === "all" ? null : value);
	};

	return (
		<Wrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			$filtersOnly={fromComponent === "Taskeen"}
		>
			<SearchSlot $hidden={fromComponent === "Taskeen"}>
				{fromComponent === "Taskeen" ? null : (
					<SearchContainer dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
						<Input
							placeholder={
								chosenLanguage === "Arabic"
									? "البحث عن طريق رقم الحجز أو الضيف"
									: "Search by booking number or guest"
							}
							prefix={<SearchOutlined />}
							style={{ width: "100%" }}
						/>
					</SearchContainer>
				)}
			</SearchSlot>

			<FiltersContainer>
				<StyledSelect
					className='filter-select'
					placeholder={
						chosenLanguage === "Arabic" ? "اسم الغرفة" : "Room Name"
					}
					onChange={handleRoomTypeChange}
					value={selectedRoomType}
					dir={chosenLanguage === "Arabic" ? "ltr" : "ltr"}
				>
					<Select.Option value='all'>
						{chosenLanguage === "Arabic" ? "الكل" : "All"}
					</Select.Option>
					{roomOptions.map((room) => {
						const displayName =
							room.displayName || room.display_name || room.room_type;
						return (
							<Select.Option key={displayName} value={displayName}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									textTransform: "capitalize",
								}}
							>
								<div
									style={{
										width: "10px",
										height: "10px",
										backgroundColor: room.roomColorCode,
										borderRadius: "50%",
										marginRight: "5px",
									}}
								></div>
								{displayName}
							</div>
						</Select.Option>
						);
					})}
				</StyledSelect>
				<StyledSelect
					className='filter-select'
					placeholder={
						chosenLanguage === "Arabic" ? "التوفر" : "Availability"
					}
					onChange={handleAvailabilityChange}
					value={selectedAvailability}
				>
					<Select.Option value='all'>
						{chosenLanguage === "Arabic" ? "الكل" : "All"}
					</Select.Option>
					<Select.Option value='occupied'>
						{chosenLanguage === "Arabic" ? "مشغولة" : "Occupied"}
					</Select.Option>
					<Select.Option value='vacant'>
						{chosenLanguage === "Arabic" ? "متاحة" : "Vacant"}
					</Select.Option>
				</StyledSelect>
				<StyledSelect
					className='filter-select'
					placeholder={chosenLanguage === "Arabic" ? "الطابق" : "Floor"}
					onChange={handleFloorChange}
					value={selectedFloor}
				>
					<Select.Option value='all'>
						{chosenLanguage === "Arabic" ? "الكل" : "All"}
					</Select.Option>
					{floors.map((floor) => (
						<Select.Option key={floor} value={floor}>
							{floor}
						</Select.Option>
					))}
				</StyledSelect>
				<StyledSelect
					className='filter-select'
					placeholder={
						chosenLanguage === "Arabic" ? "حالة الغرفة" : "Room Status"
					}
					onChange={handleRoomStatusChange}
					value={selectedRoomStatus}
				>
					<Select.Option value='all'>
						{chosenLanguage === "Arabic" ? "الكل" : "All"}
					</Select.Option>
					<Select.Option value='clean'>
						{chosenLanguage === "Arabic" ? "نظيفة" : "Clean"}
					</Select.Option>
					<Select.Option value='dirty'>
						{chosenLanguage === "Arabic" ? "متسخة" : "Dirty"}
					</Select.Option>
				</StyledSelect>
				<StyledButton icon={<ReloadOutlined />} onClick={handleResetFilters}>
					{chosenLanguage === "Arabic" ? "إعادة ضبط" : "Reset"}
				</StyledButton>
			</FiltersContainer>
		</Wrapper>
	);
};

export default HotelMapFilters;

const Wrapper = styled.div`
	background: #ffffff;
	padding: 12px;
	border-radius: 8px;
	border: 1px solid #e6edf5;
	display: grid;
	grid-template-columns: ${({ $filtersOnly }) =>
		$filtersOnly
			? "1fr"
			: "minmax(220px, 0.75fr) minmax(0, 1.25fr)"};
	gap: 10px;
	align-items: center;
	margin-bottom: 16px;
	box-shadow: 0 3px 10px rgba(15, 23, 42, 0.04);
	min-width: 0;

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}

	@media (max-width: 560px) {
		padding: 10px;
		gap: 8px;
	}
`;

const SearchSlot = styled.div`
	display: ${({ $hidden }) => ($hidden ? "none" : "block")};
	min-width: 0;
`;

const SearchContainer = styled.div`
	min-width: 0;

	.ant-input-affix-wrapper {
		height: 38px;
		border-radius: 8px;
		border-color: #d7e0ea;
	}

	.ant-input-prefix {
		color: #475569;
	}
`;

const FiltersContainer = styled.div`
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 8px;
	align-items: center;
	min-width: 0;

	@media (max-width: 1180px) {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	@media (max-width: 560px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
`;

const StyledSelect = styled(Select)`
	width: 100% !important;
	min-width: 0;

	.ant-select-selector {
		height: 38px !important;
		border-radius: 8px !important;
		border-color: #d7e0ea !important;
		display: flex;
		align-items: center;
	}

	.ant-select-selection-placeholder,
	.ant-select-selection-item {
		font-size: 0.86rem;
		font-weight: 700;
		color: #334155;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

const StyledButton = styled(Button)`
	width: 100%;
	height: 38px;
	border-radius: 8px;
	border-color: #bfdbfe;
	color: #0f5795;
	font-weight: 800;

	@media (max-width: 560px) {
		grid-column: 1 / -1;
	}
`;
