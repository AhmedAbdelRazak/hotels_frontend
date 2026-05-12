import React, { useRef, useEffect, useCallback, useState } from "react";
import { Form, Input, Button, message, Checkbox, Modal } from "antd";
import styled from "styled-components";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import moment from "moment";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ZCustomInput from "./ZCustomInput";
import { isAuthenticated } from "../../auth";
import {
	buildCalendarRateTitle,
	getCalendarRateClassNames,
	getCalendarRateColor,
	isCalendarRateRestricted,
} from "./calendarPricingUtils";

const ZCase3 = ({
	hotelDetails,
	setHotelDetails,
	chosenLanguage,
	selectedRoomType,
	customRoomType,
	selectedDateRange,
	setSelectedDateRange,
	pricingRate,
	setPricingRate,
	priceError,
	setPriceError,
	getColorForPrice,
	form,
	rootPrice,
	setRootPrice,
}) => {
	const calendarRef = useRef(null);
	const pricingRatesRef = useRef([]);
	const priceInputRef = useRef(null);
	const [isBlocked, setIsBlocked] = useState(false);
	const { user } = isAuthenticated();
	const isArabic = chosenLanguage === "Arabic";
	const calendarText = {
		dateRangeRequired: isArabic
			? "يرجى اختيار نطاق التاريخ"
			: "Please select a date range",
	};
	const selectedRangeEventId = "selected-date-range-highlight";
	const selectedRangeColor = "#dbeeff";

	const getActivePricingRates = useCallback(() => {
		const roomType =
			selectedRoomType === "other" ? customRoomType : selectedRoomType;
		const fullDisplayName = form.getFieldValue("displayName");

		return (
			hotelDetails.roomCountDetails?.find(
				(room) =>
					room.roomType === roomType &&
					(!fullDisplayName || room.displayName === fullDisplayName)
			)?.pricingRate || []
		);
	}, [customRoomType, form, hotelDetails.roomCountDetails, selectedRoomType]);

	useEffect(() => {
		pricingRatesRef.current = getActivePricingRates();
		if (calendarRef.current) {
			calendarRef.current.getApi().refetchEvents();
		}
	}, [getActivePricingRates]);

	const removeSelectedRangeEvents = (calendarApi) => {
		if (!calendarApi) return;
		calendarApi
			.getEvents()
			.filter(
				(event) =>
					event.id === selectedRangeEventId || event.title === "Selected"
			)
			.forEach((event) => event.remove());
	};

	const addSelectedRangeEvent = (start, end) => {
		if (!start || !end || !calendarRef.current) return;
		const calendarApi = calendarRef.current.getApi();
		if (!calendarApi) return;

		const adjustedEnd = new Date(end);
		adjustedEnd.setDate(adjustedEnd.getDate() + 1);

		removeSelectedRangeEvents(calendarApi);
		calendarApi.addEvent({
			id: selectedRangeEventId,
			title: "Selected",
			start: start.toISOString().split("T")[0],
			end: adjustedEnd.toISOString().split("T")[0],
			allDay: true,
			display: "background",
			backgroundColor: selectedRangeColor,
			classNames: ["selected-range-highlight"],
		});
	};

	useEffect(() => {
		if (selectedDateRange[0] && selectedDateRange[1]) {
			addSelectedRangeEvent(selectedDateRange[0], selectedDateRange[1]);
		}
		// eslint-disable-next-line
	}, [selectedDateRange]);

	const handleVisibleRangeChange = () => {
		if (selectedDateRange?.[0] && selectedDateRange?.[1]) {
			addSelectedRangeEvent(selectedDateRange[0], selectedDateRange[1]);
		}
	};

	const getCalendarEvents = useCallback(
		(fetchInfo, successCallback) => {
			const visibleStart = fetchInfo.start;
			const visibleEnd = fetchInfo.end;
			const displayName = form.getFieldValue("displayName") || selectedRoomType;
			const events = [];

			(pricingRatesRef.current || []).forEach((rate) => {
				if (!rate?.calendarDate) return;
				const eventDate = new Date(`${rate.calendarDate}T00:00:00`);
				if (eventDate < visibleStart || eventDate >= visibleEnd) return;

				const isRestricted = isCalendarRateRestricted(rate);
				events.push({
					title: buildCalendarRateTitle({
						rate,
						isArabic,
						includeRoot: user?.role === 1000,
					}),
					start: rate.calendarDate,
					end: rate.calendarDate,
					allDay: true,
					backgroundColor: getCalendarRateColor(rate, getColorForPrice),
					borderColor: getCalendarRateColor(rate, getColorForPrice),
					textColor: "#ffffff",
					classNames: getCalendarRateClassNames(rate),
					extendedProps: {
						displayName,
						isRestricted,
					},
				});
			});

			successCallback(events);
		},
		[form, getColorForPrice, isArabic, selectedRoomType, user?.role]
	);

	const generateDateRangeArray = (startDate, endDate) => {
		const dateArray = [];
		let currentDate = new Date(
			startDate.getFullYear(),
			startDate.getMonth(),
			startDate.getDate()
		);
		const end = new Date(
			endDate.getFullYear(),
			endDate.getMonth(),
			endDate.getDate()
		);

		while (currentDate <= end) {
			const date = new Date(currentDate);
			date.setHours(0, 0, 0, 0);
			dateArray.push(date);
			currentDate.setDate(currentDate.getDate() + 1);
		}
		return dateArray;
	};

	const handleDatePickerChange = (dates) => {
		const [start, end] = dates;
		setSelectedDateRange([start, end]);

		if (start && end && calendarRef.current) {
			const calendarApi = calendarRef.current.getApi();
			removeSelectedRangeEvents(calendarApi);
			addSelectedRangeEvent(start, end);
		} else if (calendarRef.current) {
			removeSelectedRangeEvents(calendarRef.current.getApi());
		}
	};

	const handleCalendarSelect = (info) => {
		const selectedStart = new Date(
			info.start.getFullYear(),
			info.start.getMonth(),
			info.start.getDate(),
			0,
			0,
			0
		);

		const selectedEnd = new Date(
			info.end.getFullYear(),
			info.end.getMonth(),
			info.end.getDate() - 1,
			23,
			59,
			59
		);

		setSelectedDateRange([selectedStart, selectedEnd]);

		const dates = [moment(selectedStart), moment(selectedEnd)];
		form.setFieldsValue({
			dateRange: dates,
		});

		handleDatePickerChange([selectedStart, selectedEnd]);
	};

	const handleDateRangeSubmit = (isBlocking = false) => {
		if (!selectedDateRange?.[0] || !selectedDateRange?.[1]) {
			setPriceError(true);
			message.error(
				isArabic
					? "يرجى تحديد نطاق التاريخ أولاً."
					: "Please select a date range first."
			);
			return;
		}

		const resolvedRootPrice =
			rootPrice ||
			form.getFieldValue("defaultCost") ||
			form.getFieldValue("basePrice") ||
			pricingRate;

		if ((!pricingRate && !isBlocking) || (!resolvedRootPrice && !isBlocking)) {
			setPriceError(true);
			message.error(
				isArabic
					? "يرجى إدخال سعر النطاق قبل الإضافة."
					: "Please enter the price before adding this range."
			);
			return;
		}

		const roomType =
			selectedRoomType === "other" ? customRoomType : selectedRoomType;
		const fullDisplayName = form.getFieldValue("displayName");

		const roomIndex = hotelDetails.roomCountDetails.findIndex(
			(room) =>
				room.roomType === roomType && room.displayName === fullDisplayName
		);

		const newPricingRates = generateDateRangeArray(
			selectedDateRange[0],
			selectedDateRange[1]
		).map((date) => ({
			calendarDate: date.toISOString().split("T")[0],
			room_type: roomType,
			price: isBlocking ? 0 : pricingRate,
			rootPrice: isBlocking ? 0 : resolvedRootPrice,
			color: isBlocking
				? "black"
				: getColorForPrice(pricingRate, selectedDateRange.join("-")),
		}));

		const newPricingDateSet = new Set(
			newPricingRates.map((rate) => rate.calendarDate)
		);
		const previousPricingRates = Array.isArray(pricingRatesRef.current)
			? pricingRatesRef.current
			: [];
		const mergedPricingRates = [
			...previousPricingRates.filter(
				(rate) => !newPricingDateSet.has(rate.calendarDate)
			),
			...newPricingRates,
		];
		pricingRatesRef.current = mergedPricingRates;

		const updatedRoomCountDetails = [...hotelDetails.roomCountDetails];

		if (roomIndex > -1) {
			updatedRoomCountDetails[roomIndex].pricingRate = mergedPricingRates;
		} else {
			updatedRoomCountDetails.push({
				roomType,
				displayName: fullDisplayName,
				pricingRate: mergedPricingRates,
				myKey: "ThisIsNewKey",
			});
		}

		setHotelDetails((prevDetails) => ({
			...prevDetails,
			roomCountDetails: updatedRoomCountDetails,
		}));

		if (calendarRef.current) {
			calendarRef.current.getApi().refetchEvents();
		}

		handleCancelSelection();

		message.success(
			isArabic
				? isBlocking
					? "تم حظر النطاق بنجاح."
					: "تمت إضافة النطاق بنجاح."
				: isBlocking
				? "Date range blocked successfully."
				: "Date range added successfully."
		);
	};

	const handleCancelSelection = () => {
		setSelectedDateRange([null, null]);
		setPricingRate("");
		setPriceError(false);
		setIsBlocked(false);

		if (calendarRef.current) {
			removeSelectedRangeEvents(calendarRef.current.getApi());
		}
	};

	const handleBlockChange = (e) => {
		const checked = e.target.checked;

		if (!selectedDateRange?.[0] || !selectedDateRange?.[1]) {
			setIsBlocked(false);
			message.error(
				isArabic
					? "يرجى تحديد نطاق التاريخ أولاً."
					: "Please select a date range first."
			);
			return;
		}

		setIsBlocked(checked);
		if (!checked) return;

		const [start, end] = selectedDateRange;
		Modal.confirm({
			title: isArabic
				? `هل أنت متأكد أنك تريد حظر النطاق الزمني من ${start.toLocaleDateString(
						"ar-EG"
				  )} إلى ${end.toLocaleDateString("ar-EG")}؟`
				: `Are you sure you want to block the date range from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}?`,
			okText: isArabic ? "نعم" : "Yes",
			cancelText: isArabic ? "لا" : "No",
			onOk: () => handleDateRangeSubmit(true),
			onCancel: () => setIsBlocked(false),
		});
	};

	const renderEventContent = (eventInfo) => {
		const { title } = eventInfo.event;
		const isRestricted = eventInfo.event.extendedProps?.isRestricted;
		const [priceLabel, rootLabel] = title.split(" | ");

		return (
			<div
				className={isRestricted ? "calendar-blocked-event-label" : undefined}
				style={{
					display: "flex",
					flexDirection: "column",
					textAlign: "center",
					fontSize: "0.75rem",
					fontWeight: "bold",
				}}
			>
				{priceLabel && <div>{priceLabel}</div>}
				{rootLabel && user?.role === 1000 && <div>{rootLabel}</div>}
			</div>
		);
	};

	return (
		<ZCase3Wrapper
			isArabic={isArabic}
			dir={isArabic ? "rtl" : "ltr"}
		>
			<div className='row'>
				<div className='col-md-9'>
					<FullCalendar
						ref={calendarRef}
						plugins={[dayGridPlugin, interactionPlugin]}
						initialView='dayGridMonth'
						events={getCalendarEvents}
						selectable={true}
						selectMirror={true}
						headerToolbar={{
							left: "prev,next today",
							center: "title",
							right: "dayGridMonth",
						}}
						select={handleCalendarSelect}
						selectAllow={() => true}
						eventContent={renderEventContent}
						datesSet={handleVisibleRangeChange}
						height='auto'
					/>
				</div>
				<div
					className='col-md-3'
					style={{ textAlign: isArabic ? "right" : "" }}
				>
					<h4 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
						{chosenLanguage === "Arabic"
							? `تسعير الغرفة: ${form.getFieldValue("displayName")}`
							: `Pricing for room: ${form.getFieldValue("displayName")}`}
					</h4>
					<label>
						{chosenLanguage === "Arabic" ? "نطاق التاريخ" : "Date Range"}
					</label>
					<Form.Item
						dir='ltr'
						className='w-100'
						name='dateRange'
						rules={[{ required: true, message: calendarText.dateRangeRequired }]}
					>
						<DatePicker
							selected={selectedDateRange[0]}
							onChange={handleDatePickerChange}
							startDate={selectedDateRange[0]}
							endDate={selectedDateRange[1]}
							className='w-100'
							selectsRange
							customInput={<ZCustomInput />}
						/>
					</Form.Item>
					{selectedDateRange[0] && selectedDateRange[1] ? (
						<>
							<h4 style={{ fontSize: "1.1rem", fontWeight: "bold" }}>
								{chosenLanguage === "Arabic"
									? `النطاق الزمني المحدد هو من ${selectedDateRange[0].toLocaleDateString(
											"ar-EG"
									  )} إلى ${selectedDateRange[1].toLocaleDateString(
											"ar-EG"
									  )}, هل ترغب في الإلغاء؟`
									: `The selected date range is from ${selectedDateRange[0].toLocaleDateString()} to ${selectedDateRange[1].toLocaleDateString()}, would you like to cancel?`}
								<label className='mx-3' style={{ color: "darkred" }}>
									<input
										type='radio'
										name='cancel'
										onClick={handleCancelSelection}
									/>
									{chosenLanguage === "Arabic" ? "نعم" : "Yes"}
								</label>
							</h4>
							<h4
								style={{
									fontSize: "1.1rem",
									fontWeight: "bold",
									textAlign: isArabic ? "right" : "",
								}}
							>
								{isArabic ? "هل ترغب في حظر؟" : "Would you like to block?"}
								<Checkbox
									className='mx-3'
									checked={isBlocked}
									onChange={handleBlockChange}
								/>
							</h4>
							<div>
								<label>
									{chosenLanguage === "Arabic" ? "سعر النطاق:" : "Price Range:"}
								</label>
								<Input
									type='number'
									value={pricingRate}
									onChange={(e) => {
										setPricingRate(e.target.value);
										setPriceError(false);
										setIsBlocked(false);
									}}
									ref={priceInputRef}
									placeholder={
										chosenLanguage === "Arabic" ? "سعر النطاق" : "Price Range"
									}
									style={{
										width: "100%",
										padding: "8px",
										marginTop: "8px",
										fontSize: "1rem",
										border: "1px solid #d9d9d9",
										borderRadius: "4px",
										backgroundColor: "#fff",
										transition: "all 0.3s",
										boxSizing: "border-box",
										textAlign: isArabic ? "right" : "",
									}}
									disabled={isBlocked}
								/>
								{priceError && (
									<div style={{ color: "red" }}>
										{chosenLanguage === "Arabic"
											? "الرجاء إدخال سعر النطاق"
											: "Please enter the price range"}
									</div>
								)}
							</div>
							{user && user.role === 1000 ? (
								<div>
									<label className='mt-3'>
										{isArabic ? "السعر الجذري:" : "Root Price:"}
									</label>
									<Input
										type='number'
										value={rootPrice}
										onChange={(e) => {
											setRootPrice?.(e.target.value);
											setPriceError(false);
											setIsBlocked(false);
										}}
										placeholder={isArabic ? "السعر الجذري" : "Root Price"}
										style={{
											width: "100%",
											padding: "8px",
											marginTop: "8px",
											fontSize: "1rem",
											border: "1px solid #d9d9d9",
											borderRadius: "4px",
											backgroundColor: "#fff",
											transition: "all 0.3s",
											boxSizing: "border-box",
											textAlign: isArabic ? "right" : "",
										}}
										disabled={isBlocked}
									/>
									{priceError && !rootPrice && (
										<div style={{ color: "red" }}>
											{isArabic
												? "الرجاء إدخال السعر الأساسي"
												: "Please enter the root price"}
										</div>
									)}
								</div>
							) : null}
							<div className='text-center mt-3'>
								<Button
									onClick={() => handleDateRangeSubmit()}
									className='btn btn-primary'
								>
									{chosenLanguage === "Arabic"
										? "إضافة سعر النطاق"
										: "Add Pricing Rate Range"}
								</Button>
							</div>
						</>
					) : (
						<div className='text-center mt-3'>
							<Button className='btn btn-primary' disabled>
								{chosenLanguage === "Arabic"
									? "الرجاء تحديد نطاق تاريخ"
									: "Please select a date range"}
							</Button>
						</div>
					)}
				</div>
			</div>
		</ZCase3Wrapper>
	);
};

export default ZCase3;

const ZCase3Wrapper = styled.div`
	.row {
		align-items: stretch;
		gap: 1rem;
	}

	.col-md-9,
	.col-md-3 {
		border: 1px solid #d7e7f8;
		border-radius: 16px;
		background: #ffffff;
		padding: 1rem;
		box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
	}

	.col-md-9 {
		flex: 1 1 68%;
		max-width: none;
	}

	.col-md-3 {
		flex: 1 1 280px;
		max-width: 360px;
	}

	.fc .fc-toolbar-title {
		font-size: 1.2rem;
		font-weight: 900;
		color: #172033;
	}

	.fc .fc-button {
		border-radius: 10px !important;
		font-weight: 800 !important;
	}

	.fc-daygrid-day {
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.fc-daygrid-day:hover {
		background: #f0f7ff;
	}

	.fc .fc-highlight,
	.fc .selected-range-highlight,
	.fc .selected-range-highlight.fc-bg-event {
		background: #dbeeff !important;
		opacity: 1 !important;
	}

	.fc .selected-range-highlight.fc-bg-event {
		border-radius: 8px;
		box-shadow: inset 0 0 0 1px rgba(22, 119, 255, 0.2);
	}

	.fc .calendar-rate-blocked {
		background: #111827 !important;
		border-color: #111827 !important;
	}

	.fc .calendar-rate-blocked .fc-event-main,
	.fc .calendar-rate-blocked .fc-event-title,
	.calendar-blocked-event-label {
		color: #ffffff !important;
	}

	@media (max-width: 990px) {
		.col-md-3 {
			max-width: none;
		}
	}
`;
