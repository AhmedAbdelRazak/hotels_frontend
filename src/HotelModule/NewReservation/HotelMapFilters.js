import React, { useState } from "react";
import styled from "styled-components";
import { Button, Drawer, Input, Select } from "antd";
import {
	CheckOutlined,
	FilterOutlined,
	ReloadOutlined,
	SearchOutlined,
} from "@ant-design/icons";

const getHotelMapDrawerContainer = () =>
	typeof document !== "undefined" ? document.body : false;

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
	useMobileDrawer = false,
	useRoomMapLayout = false,
}) => {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const isArabic = chosenLanguage === "Arabic";
	const roomOptions = Array.isArray(distinctRoomTypesWithColors)
		? distinctRoomTypesWithColors
		: [];
	const activeFilterCount = [
		selectedAvailability,
		selectedRoomType,
		selectedFloor,
		selectedRoomStatus,
	].filter((value) => value !== null && value !== undefined && value !== "")
		.length;
	const filterButtonLabel = isArabic
		? activeFilterCount > 0
			? `الفلاتر (${activeFilterCount})`
			: "الفلاتر"
		: activeFilterCount > 0
			? `Filters (${activeFilterCount})`
			: "Filters";

	const text = {
		search: isArabic
			? "البحث عن طريق رقم الحجز أو الضيف"
			: "Search by booking number or guest",
		roomName: isArabic ? "اسم الغرفة" : "Room Name",
		availability: isArabic ? "التوفر" : "Availability",
		floor: isArabic ? "الطابق" : "Floor",
		roomStatus: isArabic ? "حالة الغرفة" : "Room Status",
		all: isArabic ? "الكل" : "All",
		occupied: isArabic ? "مشغولة" : "Occupied",
		vacant: isArabic ? "متاحة" : "Vacant",
		clean: isArabic ? "نظيفة" : "Clean",
		dirty: isArabic ? "متسخة" : "Dirty",
		reset: isArabic ? "إعادة ضبط" : "Reset",
		drawerTitle: isArabic ? "فلاتر الخريطة" : "Map Filters",
		done: isArabic ? "تم" : "Done",
	};

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

	const searchInput = (
		<SearchContainer dir={isArabic ? "rtl" : "ltr"}>
			<Input
				placeholder={text.search}
				prefix={<SearchOutlined />}
				style={{ width: "100%" }}
			/>
		</SearchContainer>
	);

	const filterControls = ({ inDrawer = false, includeReset = true } = {}) => (
		<FiltersContainer
			$inDrawer={inDrawer}
			$roomMapLayout={useRoomMapLayout}
			$hasReset={includeReset}
		>
			<StyledSelect
				className='filter-select room-name-select'
				placeholder={text.roomName}
				onChange={handleRoomTypeChange}
				value={selectedRoomType}
				dir='ltr'
				showSearch
				optionFilterProp='label'
				popupMatchSelectWidth={false}
			>
				<Select.Option value='all' label={text.all}>
					{text.all}
				</Select.Option>
				{roomOptions.map((room) => {
					const displayName =
						room.displayName || room.display_name || room.room_type;
					return (
						<Select.Option
							key={displayName}
							value={displayName}
							label={displayName}
						>
							<RoomOption>
								<OptionSwatch $color={room.roomColorCode} />
								<RoomOptionText>{displayName}</RoomOptionText>
							</RoomOption>
						</Select.Option>
					);
				})}
			</StyledSelect>

			<StyledSelect
				className='filter-select'
				placeholder={text.availability}
				onChange={handleAvailabilityChange}
				value={selectedAvailability}
			>
				<Select.Option value='all'>{text.all}</Select.Option>
				<Select.Option value='occupied'>{text.occupied}</Select.Option>
				<Select.Option value='vacant'>{text.vacant}</Select.Option>
			</StyledSelect>

			<StyledSelect
				className='filter-select'
				placeholder={text.floor}
				onChange={handleFloorChange}
				value={selectedFloor}
			>
				<Select.Option value='all'>{text.all}</Select.Option>
				{floors.map((floor) => (
					<Select.Option key={floor} value={floor}>
						{floor}
					</Select.Option>
				))}
			</StyledSelect>

			<StyledSelect
				className='filter-select'
				placeholder={text.roomStatus}
				onChange={handleRoomStatusChange}
				value={selectedRoomStatus}
			>
				<Select.Option value='all'>{text.all}</Select.Option>
				<Select.Option value='clean'>{text.clean}</Select.Option>
				<Select.Option value='dirty'>{text.dirty}</Select.Option>
			</StyledSelect>

			{includeReset ? (
				<StyledButton icon={<ReloadOutlined />} onClick={handleResetFilters}>
					{text.reset}
				</StyledButton>
			) : null}
		</FiltersContainer>
	);

	return (
		<>
			{useMobileDrawer ? (
				<MobileFilterBar
					dir={isArabic ? "rtl" : "ltr"}
					$active={activeFilterCount > 0}
				>
					<MobileFilterButton
						type='button'
						onClick={() => setDrawerOpen(true)}
						aria-pressed={activeFilterCount > 0}
						$active={activeFilterCount > 0}
					>
						<FilterOutlined />
						<span>{filterButtonLabel}</span>
					</MobileFilterButton>
				</MobileFilterBar>
			) : null}

			<Wrapper
				dir={isArabic ? "rtl" : "ltr"}
				$filtersOnly={fromComponent === "Taskeen"}
				$drawerEnabled={useMobileDrawer}
				$roomMapLayout={useRoomMapLayout}
			>
				<SearchSlot $hidden={fromComponent === "Taskeen"}>
					{fromComponent === "Taskeen" ? null : searchInput}
				</SearchSlot>
				{filterControls()}
			</Wrapper>

			{useMobileDrawer ? (
				<Drawer
					title={text.drawerTitle}
					placement={isArabic ? "right" : "left"}
					width='min(92vw, 390px)'
					open={drawerOpen}
					onClose={() => setDrawerOpen(false)}
					getContainer={getHotelMapDrawerContainer}
					destroyOnClose={false}
					className='hotel-map-filter-drawer'
				>
					<DrawerContent dir={isArabic ? "rtl" : "ltr"}>
						{fromComponent === "Taskeen" ? null : searchInput}
						{filterControls({ inDrawer: true, includeReset: false })}
						<DrawerActions>
							<StyledButton icon={<ReloadOutlined />} onClick={handleResetFilters}>
								{text.reset}
							</StyledButton>
							<DoneButton
								type='primary'
								icon={<CheckOutlined />}
								onClick={() => setDrawerOpen(false)}
							>
								{text.done}
							</DoneButton>
						</DrawerActions>
					</DrawerContent>
				</Drawer>
			) : null}
		</>
	);
};

export default HotelMapFilters;

const MobileFilterBar = styled.div`
	display: none;
	margin-bottom: 10px;

	@media (max-width: 760px) {
		display: block;
	}
`;

const MobileFilterButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	width: 100%;
	min-height: 40px;
	border: 1px solid ${({ $active }) => ($active ? "#1677ff" : "#c7d7ea")};
	border-radius: 8px;
	background: ${({ $active }) => ($active ? "#eaf4ff" : "#ffffff")};
	color: #0f4f86;
	font-size: 0.88rem;
	font-weight: 900;
	box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
`;

const Wrapper = styled.div`
	background: #ffffff;
	padding: 12px;
	border-radius: 8px;
	border: 1px solid #e6edf5;
	display: grid;
	grid-template-columns: ${({ $filtersOnly, $roomMapLayout }) =>
		$filtersOnly
			? "1fr"
			: $roomMapLayout
				? "minmax(260px, 0.55fr) minmax(0, 1.45fr)"
				: "minmax(220px, 0.75fr) minmax(0, 1.25fr)"};
	gap: 10px;
	align-items: center;
	margin-bottom: 16px;
	box-shadow: 0 3px 10px rgba(15, 23, 42, 0.04);
	min-width: 0;

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}

	@media (max-width: 760px) {
		display: ${({ $drawerEnabled }) => ($drawerEnabled ? "none" : "grid")};
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
	grid-template-columns: ${({ $inDrawer, $roomMapLayout, $hasReset }) => {
		if ($inDrawer) return "1fr";
		if ($roomMapLayout && $hasReset) {
			return "minmax(240px, 1.7fr) repeat(3, minmax(126px, 0.95fr)) minmax(126px, 0.85fr)";
		}
		return "repeat(5, minmax(0, 1fr))";
	}};
	gap: ${({ $inDrawer }) => ($inDrawer ? "10px" : "8px")};
	align-items: center;
	min-width: 0;

	@media (max-width: 1180px) {
		grid-template-columns: ${({ $inDrawer, $roomMapLayout }) =>
			$inDrawer
				? "1fr"
				: $roomMapLayout
					? "minmax(230px, 1.45fr) repeat(2, minmax(128px, 1fr))"
					: "repeat(4, minmax(0, 1fr))"};
	}

	@media (max-width: 760px) {
		grid-template-columns: ${({ $inDrawer }) =>
			$inDrawer ? "1fr" : "repeat(2, minmax(0, 1fr))"};
	}

	@media (max-width: 560px) {
		grid-template-columns: ${({ $inDrawer }) =>
			$inDrawer ? "1fr" : "repeat(2, minmax(0, 1fr))"};
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
		min-width: 0;
	}

	.ant-select-selection-placeholder,
	.ant-select-selection-item {
		min-width: 0;
		font-size: 0.86rem;
		font-weight: 700;
		color: #334155;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&.room-name-select .ant-select-selection-item {
		text-align: start;
	}
`;

const RoomOption = styled.div`
	display: flex;
	align-items: center;
	gap: 7px;
	min-width: 0;
	max-width: min(420px, 82vw);
	text-transform: capitalize;
`;

const OptionSwatch = styled.span`
	flex: 0 0 auto;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: ${({ $color }) => $color || "#64748b"};
	border: 1px solid rgba(15, 23, 42, 0.22);
`;

const RoomOptionText = styled.span`
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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

const DrawerContent = styled.div`
	display: grid;
	gap: 12px;
	min-width: 0;
`;

const DrawerActions = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
`;

const DoneButton = styled(Button)`
	width: 100%;
	height: 38px;
	border-radius: 8px;
	font-weight: 900;
`;
