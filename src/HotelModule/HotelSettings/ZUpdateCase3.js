import React, { useRef, useEffect, useState, useCallback } from "react";
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
import { isSuperAdminUser } from "../../AdminModule/utils/superUsers";
import { prepareOtaCalendarJob } from "../apiAdmin";
import {
	buildCalendarRateTitle,
	getCalendarRateClassNames,
	getCalendarRateColor,
	isCalendarRateRestricted,
} from "./calendarPricingUtils";

const ZUpdateCase3 = ({
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
	getRoomColor,
	fromPage,
	existingRoomDetails, // Pass the selected room's details
	rootPrice,
	setRootPrice,
}) => {
	const calendarRef = useRef(null);
	const pricingRatesRef = useRef(existingRoomDetails?.pricingRate || []);
	const priceInputRef = useRef(null);
	const [isBlocked, setIsBlocked] = useState(false);
	const [otaModalOpen, setOtaModalOpen] = useState(false);
	const [otaPreparing, setOtaPreparing] = useState(false);
	const [otaSelected, setOtaSelected] = useState([
		"expedia",
		"agoda",
		"airbnb",
		"booking",
	]);
	const [otaAvailability, setOtaAvailability] = useState(
		Number(existingRoomDetails?.count || 0)
	);
	const [otaNotes, setOtaNotes] = useState("");
	const [otaAccounts, setOtaAccounts] = useState({
		expedia: "",
		agoda: "",
		airbnb: "",
		booking: "",
	});
	const isArabic = chosenLanguage === "Arabic";
	const auth = isAuthenticated() || {};
	const user = auth?.user || {};
	const roleNumbers = [
		Number(user?.role),
		...(Array.isArray(user?.roles) ? user.roles.map(Number) : []),
	];
	const roleDescriptions = [
		String(user?.roleDescription || ""),
		...(Array.isArray(user?.roleDescriptions) ? user.roleDescriptions : []),
	].map((role) => String(role || "").toLowerCase().replace(/[\s_-]+/g, ""));
	const canPrepareOtaCalendar =
		isSuperAdminUser(user) ||
		roleNumbers.includes(1000) ||
		roleDescriptions.includes("superadmin");
	const calendarText = {
		dateRangeRequired: isArabic
			? "يرجى اختيار نطاق التاريخ"
			: "Please select a date range",
	};
	const otaOptions = [
		{ label: "Expedia", value: "expedia" },
		{ label: "Agoda", value: "agoda" },
		{ label: "Airbnb", value: "airbnb" },
		{ label: "Booking.com", value: "booking" },
	];
	const selectedRangeEventId = "selected-date-range-highlight";
	const selectedRangeColor = "#dbeeff";

	useEffect(() => {
		pricingRatesRef.current = existingRoomDetails?.pricingRate || [];
		setOtaAvailability(Number(existingRoomDetails?.count || 0));
		if (calendarRef.current) {
			calendarRef.current.getApi().refetchEvents();
		}
	}, [existingRoomDetails?.pricingRate, existingRoomDetails?.count]);

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
			start: moment(start).format("YYYY-MM-DD"),
			end: moment(adjustedEnd).format("YYYY-MM-DD"),
			allDay: true,
			display: "background",
			backgroundColor: selectedRangeColor,
			classNames: ["selected-range-highlight"],
		});
	};
	// Prepopulate selected date range and pricing events for the selected room
	useEffect(() => {
		if (
			existingRoomDetails &&
			existingRoomDetails.pricingRate &&
			calendarRef.current
		) {
			// Ensure the calendar API is initialized before accessing it
			const calendarApi = calendarRef.current.getApi();
			if (calendarApi) {
				handleVisibleRangeChange(); // Initialize the calendar with current month's events
			}
		}
		// eslint-disable-next-line
	}, [existingRoomDetails]);

	const handleVisibleRangeChange = () => {
		if (selectedDateRange?.[0] && selectedDateRange?.[1]) {
			addSelectedRangeEvent(selectedDateRange[0], selectedDateRange[1]);
		}
	};

	const getCalendarEvents = useCallback(
		(fetchInfo, successCallback) => {
			const visibleStart = fetchInfo.start;
			const visibleEnd = fetchInfo.end;
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
						includeRoot: true,
					}),
					start: rate.calendarDate,
					end: rate.calendarDate,
					allDay: true,
					backgroundColor: getCalendarRateColor(rate, getColorForPrice),
					borderColor: getCalendarRateColor(rate, getColorForPrice),
					textColor: "#ffffff",
					classNames: getCalendarRateClassNames(rate),
					extendedProps: {
						isRestricted,
					},
				});
			});

			successCallback(events);
		},
		[getColorForPrice, isArabic]
	);

	// Helper function to generate an array of dates between two dates
	const generateDateRangeArray = (startDate, endDate) => {
		const dateArray = [];
		let currentDate = new Date(startDate);
		const end = new Date(endDate);

		while (currentDate <= end) {
			dateArray.push(new Date(currentDate));
			currentDate.setDate(currentDate.getDate() + 1);
		}
		return dateArray;
	};

	// Handle the date range selection from the date picker
	const handleDatePickerChange = (dates) => {
		const [start, end] = dates;
		setSelectedDateRange([start, end]);

		if (start && end) {
			const calendarApi = calendarRef.current.getApi();
			removeSelectedRangeEvents(calendarApi);
			addSelectedRangeEvent(start, end);
		} else if (calendarRef.current) {
			removeSelectedRangeEvents(calendarRef.current.getApi());
		}
	};

	// Handle calendar selection
	const handleCalendarSelect = (info) => {
		const selectedStart = new Date(info.start);
		const selectedEnd = new Date(info.end);
		selectedEnd.setDate(selectedEnd.getDate() - 1);

		setSelectedDateRange([selectedStart, selectedEnd]);

		const dates = [moment(selectedStart), moment(selectedEnd)];
		form.setFieldsValue({
			dateRange: dates,
		});

		// Keep the selected range visibly highlighted on the calendar.
		handleDatePickerChange([selectedStart, selectedEnd]);
	};

	// Submit the pricing data for the selected date range
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
			existingRoomDetails?.defaultCost ||
			existingRoomDetails?.rootPrice ||
			existingRoomDetails?.price?.basePrice ||
			pricingRate;
		const hasValidRegularPrice = Number(pricingRate) > 0;
		const hasValidRootPrice = Number(resolvedRootPrice) > 0;

		if (
			(!hasValidRegularPrice && !isBlocking) ||
			(!hasValidRootPrice && !isBlocking)
		) {
			setPriceError(true);
			message.error(
				isArabic
					? "يرجى إدخال السعر قبل إضافة النطاق."
					: "Please enter the price before adding this range."
			);
			return;
		}

		const roomType =
			selectedRoomType === "other"
				? customRoomType
				: existingRoomDetails?.roomType || selectedRoomType;
		const fallbackBasePrice =
			pricingRate || existingRoomDetails?.price?.basePrice || resolvedRootPrice || 0;

		const newPricingRates = generateDateRangeArray(
			selectedDateRange[0],
			selectedDateRange[1]
		).map((date) => ({
			calendarDate: moment(date).format("YYYY-MM-DD"),
			room_type: roomType,
			price: isBlocking ? 0 : Number(pricingRate),
			rootPrice: isBlocking ? 0 : Number(resolvedRootPrice),
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

		// Update the roomCountDetails state
		setHotelDetails((prevDetails) => {
			const updatedRoomCountDetails = [...prevDetails.roomCountDetails];

			const roomIndex = updatedRoomCountDetails.findIndex(
				(room) => String(room._id) === String(existingRoomDetails._id)
			);

			if (roomIndex > -1) {
				updatedRoomCountDetails[roomIndex].pricingRate = mergedPricingRates;
			} else {
				updatedRoomCountDetails.push({
					_id: existingRoomDetails._id,
					...existingRoomDetails,
					roomType,
					price: {
						...(existingRoomDetails?.price || {}),
						basePrice: Number(fallbackBasePrice) || 0,
					},
					defaultCost: Number(resolvedRootPrice) || 0,
					pricingRate: mergedPricingRates,
				});
			}

			return {
				...prevDetails,
				roomCountDetails: updatedRoomCountDetails,
			};
		});

		if (calendarRef.current) {
			const calendarApi = calendarRef.current.getApi();
			calendarApi.refetchEvents();
		}

		handleCancelSelection();

		message.success(
			chosenLanguage === "Arabic"
				? "تمت إضافة النطاق بنجاح!"
				: "Date range added successfully!"
		);
	};

	// Handle blocking checkbox change
	const handleBlockChange = (e) => {
		const checked = e.target.checked;

		if (checked && (!selectedDateRange?.[0] || !selectedDateRange?.[1])) {
			setIsBlocked(false);
			message.error(
				isArabic
					? "يرجى تحديد نطاق التاريخ أولاً."
					: "Please select a date range first."
			);
			return;
		}

		setIsBlocked(checked);
		if (checked) {
			const [start, end] = selectedDateRange;
			const messageText =
				chosenLanguage === "Arabic"
					? `هل أنت متأكد أنك تريد حظر النطاق الزمني من ${start.toLocaleDateString(
							"ar-EG"
					  )} إلى ${end.toLocaleDateString("ar-EG")}\u061F`
					: `Are you sure you want to block the date range from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}?`;

			Modal.confirm({
				title: messageText,
				okText: chosenLanguage === "Arabic" ? "نعم" : "Yes",
				cancelText: chosenLanguage === "Arabic" ? "لا" : "No",
				onOk: () => {
					handleDateRangeSubmit(true); // Trigger submission with blocking enabled
				},
				onCancel: () => {
					setIsBlocked(false); // Uncheck the block checkbox
				},
			});
		}
	};

	// Cancel the date range selection
	const handleCancelSelection = () => {
		setSelectedDateRange([null, null]);
		setPricingRate("");
		setPriceError(false);
		setIsBlocked(false);

		const calendarApi = calendarRef.current.getApi();
		removeSelectedRangeEvents(calendarApi);
	};

	const openOtaModal = () => {
		if (!selectedDateRange?.[0] || !selectedDateRange?.[1]) {
			message.error(
				isArabic
					? "ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ù†Ø·Ø§Ù‚ Ø§Ù„ØªØ§Ø±ÙŠØ® Ø£ÙˆÙ„Ø§Ù‹."
					: "Please select a date range first."
			);
			return;
		}
		if (!isBlocked && !(Number(pricingRate) > 0)) {
			message.error(
				isArabic
					? "يرجى إدخال سعر النطاق أولاً."
					: "Please enter the price before preparing the OTA update."
			);
			return;
		}
		setOtaAvailability(isBlocked ? 0 : Number(existingRoomDetails?.count || 0));
		setOtaModalOpen(true);
	};

	const buildOtaPayload = () => {
		const resolvedRootPrice =
			rootPrice ||
			existingRoomDetails?.defaultCost ||
			existingRoomDetails?.rootPrice ||
			existingRoomDetails?.price?.basePrice ||
			pricingRate;
		const accounts = Object.entries(otaAccounts).reduce((acc, [ota, username]) => {
			const clean = String(username || "").trim();
			if (clean) acc[ota] = { username: clean };
			return acc;
		}, {});
		return {
			hotelId: hotelDetails?._id,
			roomId: existingRoomDetails?._id,
			dateFrom: moment(selectedDateRange[0]).format("YYYY-MM-DD"),
			dateTo: moment(selectedDateRange[1]).format("YYYY-MM-DD"),
			timezone: "Asia/Riyadh",
			nightlyRateSar: isBlocked ? null : Number(pricingRate),
			rootRateSar: isBlocked ? null : Number(resolvedRootPrice || 0),
			availability: isBlocked ? 0 : Number(otaAvailability),
			closed: isBlocked,
			selectedOtas: otaSelected,
			otaAccounts: accounts,
			notes: otaNotes,
			source: "hotel_settings_calendar",
			confirmSupervisedOnly: true,
		};
	};

	const handlePrepareOtaCalendar = async () => {
		if (!otaSelected.length) {
			message.error("Select at least one OTA.");
			return;
		}
		if (
			!isBlocked &&
			(!Number.isInteger(Number(otaAvailability)) || Number(otaAvailability) < 0)
		) {
			message.error("Availability must be a whole number.");
			return;
		}
		setOtaPreparing(true);
		try {
			const data = await prepareOtaCalendarJob(user?._id, buildOtaPayload());
			if (!data || data.error || data.ok === false) {
				message.error(data?.error || "Could not prepare OTA calendar job.");
				return;
			}
			setOtaModalOpen(false);
			Modal.success({
				title: "OTA calendar job prepared",
				content: (
					<div>
						<div>Job: {data.job?.jobNumber || data.job?._id}</div>
						<div>Status: {data.job?.status || "prepared"}</div>
					</div>
				),
			});
		} catch (error) {
			message.error("Could not prepare OTA calendar job.");
		} finally {
			setOtaPreparing(false);
		}
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
				{rootLabel && <div>{rootLabel}</div>}
			</div>
		);
	};

	return (
		<ZUpdateCase3Wrapper
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
							? `تسعير الغرفة: ${existingRoomDetails.displayName || ""}`
							: `Pricing for room: ${existingRoomDetails.displayName || ""}`}
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
							<h4
								style={{
									fontSize: "1.1rem",
									fontWeight: "bold",
									textAlign: chosenLanguage === "Arabic" ? "right" : "",
								}}
							>
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
									textAlign: chosenLanguage === "Arabic" ? "right" : "",
								}}
							>
								{chosenLanguage === "Arabic"
									? `هل ترغب في حظر؟`
									: `Would you like to block?`}
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
										textAlign: chosenLanguage === "Arabic" ? "right" : "",
									}}
									disabled={isBlocked} // Disable input if blocked is selected
								/>
								{priceError && (
									<div style={{ color: "red" }}>
										{chosenLanguage === "Arabic"
											? "الرجاء إدخال سعر النطاق"
											: "Please enter the price range"}
									</div>
								)}
							</div>
							<div>
									<label className='mt-3'>
										{chosenLanguage === "Arabic"
											? "السعر الجذري:"
											: "Root Price:"}
									</label>
									<Input
										type='number'
										value={rootPrice}
										onChange={(e) => {
											setRootPrice(e.target.value);
											setPriceError(false);
										}}
										placeholder={
											chosenLanguage === "Arabic"
												? "السعر الجذري"
												: "Root Price"
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
											textAlign: chosenLanguage === "Arabic" ? "right" : "",
										}}
										disabled={isBlocked} // Disable input if blocked is selected
									/>
									{priceError && !rootPrice && (
										<div style={{ color: "red" }}>
											{chosenLanguage === "Arabic"
												? "الرجاء إدخال السعر الأساسي"
												: "Please enter the root price"}
										</div>
									)}
							</div>

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
							{canPrepareOtaCalendar ? (
								<div className='text-center mt-3'>
									<OtaCalendarButton type='button' onClick={openOtaModal}>
										Update Calendar to OTA
									</OtaCalendarButton>
								</div>
							) : null}
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
			<Modal
				title='Update Calendar to OTA'
				open={otaModalOpen}
				onCancel={() => setOtaModalOpen(false)}
				onOk={handlePrepareOtaCalendar}
				okText='Prepare'
				cancelText='Cancel'
				confirmLoading={otaPreparing}
				destroyOnClose
			>
				<OtaModalBody>
					<FieldLabel>OTAs</FieldLabel>
					<Checkbox.Group
						options={otaOptions}
						value={otaSelected}
						onChange={setOtaSelected}
					/>
					<FieldLabel>Date range</FieldLabel>
					<SummaryLine>
						{selectedDateRange?.[0]
							? moment(selectedDateRange[0]).format("YYYY-MM-DD")
							: ""}{" "}
						to{" "}
						{selectedDateRange?.[1]
							? moment(selectedDateRange[1]).format("YYYY-MM-DD")
							: ""}
					</SummaryLine>
					<FieldLabel>Nightly rate</FieldLabel>
					<SummaryLine>
						{isBlocked ? "Closed" : `${Number(pricingRate || 0)} SAR`}
					</SummaryLine>
					<FieldLabel>Availability</FieldLabel>
					<Input
						type='number'
						min={0}
						value={isBlocked ? 0 : otaAvailability}
						disabled={isBlocked}
						onChange={(event) => setOtaAvailability(event.target.value)}
					/>
					<FieldLabel>OTA usernames</FieldLabel>
					{otaOptions.map((option) => (
						<Input
							key={option.value}
							placeholder={`${option.label} username/email`}
							value={otaAccounts[option.value]}
							onChange={(event) =>
								setOtaAccounts((previous) => ({
									...previous,
									[option.value]: event.target.value,
								}))
							}
						/>
					))}
					<FieldLabel>Notes</FieldLabel>
					<Input.TextArea
						rows={3}
						value={otaNotes}
						onChange={(event) => setOtaNotes(event.target.value)}
					/>
					<GuardrailLine>
						Supervised calendar/availability job only. Password is read from
						OTA_PASSWORD on the backend.
					</GuardrailLine>
				</OtaModalBody>
			</Modal>
		</ZUpdateCase3Wrapper>
	);
};

export default ZUpdateCase3;

const ZUpdateCase3Wrapper = styled.div`
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

const OtaCalendarButton = styled.button`
	width: 100%;
	min-height: 38px;
	border: 0;
	border-radius: 8px;
	background: #0f766e;
	color: #ffffff;
	font-weight: 900;
	cursor: pointer;
	box-shadow: 0 10px 20px rgba(15, 118, 110, 0.22);

	&:hover {
		background: #0d625c;
	}
`;

const OtaModalBody = styled.div`
	display: grid;
	gap: 10px;

	.ant-checkbox-group {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
`;

const FieldLabel = styled.div`
	font-weight: 900;
	color: #172033;
	margin-top: 4px;
`;

const SummaryLine = styled.div`
	padding: 8px 10px;
	border: 1px solid #d9e8f8;
	border-radius: 8px;
	background: #f8fbff;
	font-weight: 800;
`;

const GuardrailLine = styled.div`
	padding: 8px 10px;
	border-radius: 8px;
	background: #fff7ed;
	color: #7c2d12;
	font-size: 0.85rem;
	font-weight: 800;
`;
