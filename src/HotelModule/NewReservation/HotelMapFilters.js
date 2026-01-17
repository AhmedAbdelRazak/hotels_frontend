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
		<Wrapper dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}>
			<div className='col-md-5'>
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
			</div>

			<FiltersContainer>
				<StyledSelect
					className='filter-select'
					placeholder={
						chosenLanguage === "Arabic" ? "اسم الغرفة" : "Room Name"
					}
					onChange={handleRoomTypeChange}
					value={selectedRoomType}
					style={{ width: "200px" }}
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
					style={{ width: "140px" }}
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
					style={{ width: "140px" }}
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
					style={{ width: "140px" }}
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

// Styled components
const Wrapper = styled.div`
	background-color: white;
	padding: 15px;
	border-radius: 5px;
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

const SearchContainer = styled.div`
	flex: 1;
	margin-right: 20px;
`;

const FiltersContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 3px; /* Set the gap between the elements */
`;

const StyledSelect = styled(Select)`
	width: 180px; /* Adjust width to be longer */
`;

const StyledButton = styled(Button)`
	height: 40px;
`;
