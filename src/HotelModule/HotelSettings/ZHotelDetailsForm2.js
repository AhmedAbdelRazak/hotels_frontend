import React, { useState, useEffect, useRef, useCallback } from "react";
import { Form, Input, Button, message } from "antd";
import styled from "styled-components";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import moment from "moment";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ZCustomInput from "./ZCustomInput";
import ZCase0 from "./ZCase0";
import ZCase1 from "./ZCase1";
import ZCase2 from "./ZCase2";
import ZCase3 from "./ZCase3";
import ZOffersMonthly from "./ZOffersMonthly";
import {
	buildCalendarRateTitle,
	getCalendarRateClassNames,
	getCalendarRateColor,
	isCalendarRateRestricted,
} from "./calendarPricingUtils";

const predefinedColors = [
	"#1e90ff",
	"#6495ed",
	"#87ceeb",
	"#b0c4de",
	"#d3d3d3",
	"#f08080",
	"#dda0dd",
	"#ff6347",
	"#4682b4",
	"#32cd32",
	"#ff4500",
	"#7b68ee",
	"#00fa9a",
	"#ffa07a",
	"#8a2be2",
];

let colorIndex = 0;
const priceColorMapping = new Map();

const normalizeRoomIdentity = (value) =>
	String(value || "")
		.trim()
		.toLowerCase();

const ZHotelDetailsForm2 = ({
	hotelDetails,
	setHotelDetails,
	chosenLanguage,
	roomTypes,
	currentStep,
	setCurrentStep,
	setSelectedRoomType,
	selectedRoomType,
	amenitiesList,
	roomTypeSelected,
	setRoomTypeSelected,
	submittingHotelDetails,
	fromPage,
	existingRoomDetails,
	viewsList,
	extraAmenitiesList,
	hotelIsActive,
	activationSaving,
	activationToggleDisabled,
	handleActivationChange,
}) => {
	const [selectedDateRange, setSelectedDateRange] = useState([null, null]);
	const [pricingRate, setPricingRate] = useState("");
	const [rootPrice, setRootPrice] = useState("");
	const [customRoomType, setCustomRoomType] = useState("");
	const [priceError, setPriceError] = useState(false);
	const [locationModalVisible, setLocationModalVisible] = useState(false);
	const [newRoomCountDetailsObject, setNewRoomCountDetailsObject] =
		useState("");
	const [markerPosition, setMarkerPosition] = useState({
		lat: 24.7136,
		lng: 46.6753,
	});
	const [address, setAddress] = useState("");
	const calendarRef = useRef(null);
	const priceInputRef = useRef(null);
	const [form] = Form.useForm();
	const [hotelPhotos, setHotelPhotos] = useState(
		hotelDetails.hotelPhotos || []
	);
	const [photos, setPhotos] = useState([]); // Always starts with an empty array
	const [geocoder, setGeocoder] = useState(null);

	// NEW: sub-tabs inside Step 3
	const [activePricingTab, setActivePricingTab] = useState("custom"); // "custom" | "offers" | "monthly"
	const isArabic = chosenLanguage === "Arabic";

	useEffect(() => {
		const hasRootPriceValue =
			rootPrice !== "" && rootPrice !== null && rootPrice !== undefined;
		if (currentStep !== 3 || hasRootPriceValue) return;

		const draftRoom = (hotelDetails.roomCountDetails || []).find(
			(room) => room.myKey === "ThisIsNewKey"
		);
		const fallbackRoot =
			draftRoom?.defaultCost ??
			draftRoom?.rootPrice ??
			draftRoom?.price?.basePrice ??
			"";

		if (fallbackRoot !== "" && fallbackRoot !== null && fallbackRoot !== undefined) {
			setRootPrice(String(fallbackRoot));
		}
	}, [currentStep, hotelDetails.roomCountDetails, rootPrice]);

	const getColorForPrice = useCallback((price, dateRange) => {
		const key = `${price}-${dateRange}`;
		if (!priceColorMapping.has(key)) {
			const assignedColor =
				predefinedColors[colorIndex % predefinedColors.length];
			priceColorMapping.set(key, assignedColor);
			colorIndex++;
		}
		return priceColorMapping.get(key);
	}, []);

	useEffect(() => {
		form.setFieldsValue({
			parkingLot: hotelDetails.parkingLot ? "1" : "0",
			hasBusService: hotelDetails.hasBusService === true,
			busDetails: hotelDetails.busDetails || "",
			hasMealsService: hotelDetails.hasMealsService === true,
			mealsDetails: hotelDetails.mealsDetails || "",
			isNusuk: hotelDetails.isNusuk === true,
			isNusukText: hotelDetails.isNusukText || "",
			hotelFloors: hotelDetails.hotelFloors,
		});
	}, [form, hotelDetails]);

	const handleNext = () => {
		form
			.validateFields()
			.then((values) => {
				if (currentStep === 0) {
					setCurrentStep(1);
					return;
				}

				const draftRoom = (hotelDetails.roomCountDetails || []).find(
					(room) => room.myKey === "ThisIsNewKey"
				);
				const selectedTypeValue = values.roomType ?? draftRoom?.roomType;
				const roomType =
					selectedTypeValue === "other" ? customRoomType : selectedTypeValue;
				const normalizedRoomType = String(roomType || "").trim();
				const displayName = String(
					values.displayName ?? draftRoom?.displayName ?? ""
				).trim();

				if (currentStep >= 1 && (!normalizedRoomType || !displayName)) {
					message.error(
						isArabic
							? "يرجى اختيار نوع الغرفة وإدخال اسم العرض قبل المتابعة."
							: "Please select a room type and enter the display name before continuing."
					);
					return;
				}

				if (currentStep === 1) {
					const duplicateRoom = (hotelDetails.roomCountDetails || []).some(
						(room) =>
							room.myKey !== "ThisIsNewKey" &&
							normalizeRoomIdentity(room.roomType) ===
								normalizeRoomIdentity(normalizedRoomType) &&
							normalizeRoomIdentity(room.displayName) ===
								normalizeRoomIdentity(displayName)
					);

					if (duplicateRoom) {
						message.error(
							isArabic
								? "يوجد نوع غرفة بنفس اسم العرض بالفعل. غيّر نوع الغرفة أو اسم العرض."
								: "A room with this room type and display name already exists. Change one of them first."
						);
						return;
					}
				}

				const updatedRoomDetails = {
					...(draftRoom || {}),
					roomType: normalizedRoomType,
					displayName,
					displayName_OtherLanguage:
						values.displayName_OtherLanguage ||
						draftRoom?.displayName_OtherLanguage ||
						"",
					description: values.description ?? draftRoom?.description ?? "",
					description_OtherLanguage:
						values.description_OtherLanguage ||
						draftRoom?.description_OtherLanguage ||
						"",
					count: Number(values.roomCount ?? draftRoom?.count ?? 0),
					price: {
						basePrice: Number(
							values.basePrice ?? draftRoom?.price?.basePrice ?? 0
						),
					},
					defaultCost: Number(values.defaultCost ?? draftRoom?.defaultCost ?? 0),
					bedsCount: Number(values.bedsCount ?? draftRoom?.bedsCount ?? 1),
					roomForGender:
						values.roomForGender || draftRoom?.roomForGender || "Unisex",
					amenities: values.amenities ?? draftRoom?.amenities ?? [],
					extraAmenities:
						values.extraAmenities ?? draftRoom?.extraAmenities ?? [],
					views: values.views ?? draftRoom?.views ?? [],
					activeRoom: values.activeRoom ?? draftRoom?.activeRoom ?? false,
					commisionIncluded:
						values.commisionIncluded ?? draftRoom?.commisionIncluded ?? false,
					roomCommission: Number(
						values.roomCommission ?? draftRoom?.roomCommission ?? 0
					),
					pricedExtras: draftRoom?.pricedExtras || [],
					pricingRate: draftRoom?.pricingRate || [],
					roomColor: draftRoom?.roomColor || getRoomColor(normalizedRoomType),
					myKey: "ThisIsNewKey", // Ensure the key is consistent
				};

				setHotelDetails((prevDetails) => {
					const updatedRoomCountDetails = [...prevDetails.roomCountDetails];
					const existingRoomIndex = updatedRoomCountDetails.findIndex(
						(room) => room.myKey === "ThisIsNewKey"
					);

					if (existingRoomIndex > -1) {
						updatedRoomCountDetails[existingRoomIndex] = {
							...updatedRoomCountDetails[existingRoomIndex],
							...updatedRoomDetails,
						};
					} else {
						updatedRoomCountDetails.push(updatedRoomDetails);
					}

					return {
						...prevDetails,
						roomCountDetails: updatedRoomCountDetails,
					};
				});

				if (currentStep === 1) {
					setRootPrice(
						String(
							updatedRoomDetails.defaultCost ||
								updatedRoomDetails.price?.basePrice ||
								""
						)
					);
				}

				setCurrentStep(currentStep + 1);
			})
			.catch(() => {
				message.error(
					isArabic
						? "يرجى إكمال الحقول المطلوبة قبل المتابعة."
						: "Please complete the required fields before continuing."
				);
			});
	};

	const handlePrev = () => {
		setCurrentStep(currentStep - 1);
	};

	const handleFinish = (values) => {
		setHotelDetails((prevDetails) => ({
			...prevDetails,
			...values,
		}));
		message.success("Hotel details updated successfully!");
	};

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

	const getRoomColor = (roomType) => {
		const predefinedRoomColors = {
			standardRooms: "#003366", // Dark Blue
			singleRooms: "#8B0000", // Dark Red
			doubleRooms: "#004d00", // Dark Green
			twinRooms: "#800080", // Dark Purple
			queenRooms: "#FF8C00", // Dark Orange
			kingRooms: "#2F4F4F", // Dark Slate Gray
			tripleRooms: "#8B4513", // Saddle Brown
			quadRooms: "#00008B", // Navy
			studioRooms: "#696969", // Dim Gray
			suite: "#483D8B", // Dark Slate Blue
			masterSuite: "#556B2F", // Dark Olive Green
			familyRooms: "#A52A2A", // Brown
		};

		return (
			predefinedRoomColors[roomType] ||
			`#${Math.floor(Math.random() * 16777215)
				.toString(16)
				.padStart(6, "0")}`
		);
	};

	const handleDatePickerChange = (dates) => {
		const [start, end] = dates;
		setSelectedDateRange([start, end]);

		if (start && end && calendarRef.current) {
			const adjustedEnd = new Date(end);
			adjustedEnd.setDate(adjustedEnd.getDate() + 1);

			const calendarApi = calendarRef.current.getApi();

			const existingSelectedEvents = calendarApi
				.getEvents()
				.filter((event) => event.title === "Selected");
			existingSelectedEvents.forEach((event) => event.remove());

			calendarApi.addEvent({
				title: "Selected",
				start: start.toISOString().split("T")[0],
				end: adjustedEnd.toISOString().split("T")[0],
				allDay: true,
				backgroundColor: "lightgrey",
			});
		}
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 0:
				return (
					<>
						<ZCase0
							hotelDetails={hotelDetails}
							setHotelDetails={setHotelDetails}
							chosenLanguage={chosenLanguage}
							setLocationModalVisible={setLocationModalVisible}
							locationModalVisible={locationModalVisible}
							setMarkerPosition={setMarkerPosition}
							markerPosition={markerPosition}
							setAddress={setAddress}
							address={address}
							setHotelPhotos={setHotelPhotos}
							hotelPhotos={hotelPhotos}
							setGeocoder={setGeocoder}
							geocoder={geocoder}
							hotelIsActive={hotelIsActive}
							activationSaving={activationSaving}
							activationToggleDisabled={activationToggleDisabled}
							handleActivationChange={handleActivationChange}
						/>
					</>
				);

			case 1:
				return (
					<>
						<ZCase1
							hotelDetails={hotelDetails}
							setHotelDetails={setHotelDetails}
							chosenLanguage={chosenLanguage}
							roomTypes={roomTypes}
							setSelectedRoomType={setSelectedRoomType}
							amenitiesList={amenitiesList}
							roomTypeSelected={roomTypeSelected}
							setRoomTypeSelected={setRoomTypeSelected}
							fromPage={fromPage}
							setCustomRoomType={setCustomRoomType}
							customRoomType={customRoomType}
							form={form}
							viewsList={viewsList}
							extraAmenitiesList={extraAmenitiesList}
							newRoomCountDetailsObject={newRoomCountDetailsObject}
							setNewRoomCountDetailsObject={setNewRoomCountDetailsObject}
							getRoomColor={getRoomColor}
						/>
					</>
				);

			case 2:
				return (
					<>
						<ZCase2
							hotelDetails={hotelDetails}
							setHotelDetails={setHotelDetails}
							chosenLanguage={chosenLanguage}
							fromPage={fromPage}
							customRoomType={customRoomType}
							form={form}
							photos={photos}
							setPhotos={setPhotos}
						/>
					</>
				);

			case 3: {
				const draftRoom = (hotelDetails.roomCountDetails || []).find(
					(roomItem) => roomItem.myKey === "ThisIsNewKey"
				);
				const roomTypeValue =
					draftRoom?.roomType ||
					(selectedRoomType === "other" ? customRoomType : selectedRoomType);
				const displayNameForPricing =
					form.getFieldValue("displayName") || draftRoom?.displayName || "";

				if (!roomTypeValue || !displayNameForPricing) {
					return (
						<EmptyStep>
							{isArabic
								? "يرجى إكمال نوع الغرفة واسم العرض قبل إضافة التقويم."
								: "Complete the room type and display name before adding calendar pricing."}
						</EmptyStep>
					);
				}

				if (roomTypeValue && displayNameForPricing) {
					return (
						<>
						<TabsRow>
							<TopTab
								isActive={activePricingTab === "custom"}
								onClick={() => setActivePricingTab("custom")}
							>
								{isArabic ? "تقويم مخصص" : "Custom Calendar"}
							</TopTab>
							<TopTab
								isActive={activePricingTab === "offers"}
								onClick={() => setActivePricingTab("offers")}
							>
								{isArabic ? "العروض" : "Offers"}
							</TopTab>
							<TopTab
								isActive={activePricingTab === "monthly"}
								onClick={() => setActivePricingTab("monthly")}
							>
								{isArabic ? "شهري" : "Monthly"}
							</TopTab>
						</TabsRow>

						{activePricingTab === "custom" ? (
							<ZCase3
								hotelDetails={hotelDetails}
								setHotelDetails={setHotelDetails}
								chosenLanguage={chosenLanguage}
								selectedRoomType={roomTypeValue}
								customRoomType=''
								selectedDateRange={selectedDateRange}
								setSelectedDateRange={setSelectedDateRange}
								pricingRate={pricingRate}
								setPricingRate={setPricingRate}
								priceError={priceError}
								setPriceError={setPriceError}
								getColorForPrice={getColorForPrice}
								form={form}
								getRoomColor={getRoomColor}
								fromPage={fromPage}
								rootPrice={rootPrice}
								setRootPrice={setRootPrice}
							/>
						) : activePricingTab === "offers" ? (
							<ZOffersMonthly
								mode='Offers'
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
								setHotelDetails={setHotelDetails}
								selectedRoomType={roomTypeValue}
								customRoomType=''
								form={form}
							/>
						) : (
							<ZOffersMonthly
								mode='Monthly'
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
								setHotelDetails={setHotelDetails}
								selectedRoomType={roomTypeValue}
								customRoomType=''
								form={form}
							/>
						)}
						</>
					);
				}

				// ----- Subtabs for Step 3 -----
				const room =
					selectedRoomType && hotelDetails.roomCountDetails
						? hotelDetails.roomCountDetails.find(
								(r) =>
									r.roomType ===
									(selectedRoomType === "other"
										? customRoomType
										: selectedRoomType)
						  )
						: null;

				const displayNameValue =
					form.getFieldValue("displayName") ||
					room?.displayName ||
					selectedRoomType ||
					"";

				// pricingEvents for the calendar view (custom tab)
				const pricingEvents =
					room?.pricingRate?.map((rate) => {
						const isRestricted = isCalendarRateRestricted(rate);
						const eventColor = getCalendarRateColor(rate, getColorForPrice);

						return {
							title: buildCalendarRateTitle({
								rate,
								isArabic,
							}),
							start: rate.calendarDate,
							end: rate.calendarDate,
							allDay: true,
							backgroundColor: eventColor,
							borderColor: eventColor,
							textColor: "#ffffff",
							classNames: getCalendarRateClassNames(rate),
							extendedProps: {
								displayName: displayNameValue,
								isRestricted,
							},
						};
					}) || [];

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
					); // Adjust the end date

					setSelectedDateRange([selectedStart, selectedEnd]);

					const dates = [moment(selectedStart), moment(selectedEnd)];
					form.setFieldsValue({
						dateRange: dates,
					});
				};

				const handleDateRangeSubmit = () => {
					if (!pricingRate) {
						setPriceError(true);
						return;
					}

					const rType =
						selectedRoomType === "other" ? customRoomType : selectedRoomType;
					const fullDisplayName = displayNameValue;

					const roomIndex = hotelDetails.roomCountDetails.findIndex(
						(r) => r.roomType === rType && r.displayName === fullDisplayName
					);

					const newPricingRates = generateDateRangeArray(
						selectedDateRange[0],
						selectedDateRange[1]
					).map((date) => ({
						calendarDate: date.toISOString().split("T")[0],
						room_type: rType,
						price: pricingRate,
						color: getColorForPrice(pricingRate, selectedDateRange.join("-")),
					}));

					setHotelDetails((prevDetails) => {
						const updatedRoomCountDetails = [...prevDetails.roomCountDetails];

						if (roomIndex > -1) {
							let existingRates =
								updatedRoomCountDetails[roomIndex].pricingRate || [];

							// Remove overlapping dates
							existingRates = existingRates.filter(
								(rate) =>
									!newPricingRates.some(
										(nr) => nr.calendarDate === rate.calendarDate
									)
							);

							updatedRoomCountDetails[roomIndex].pricingRate = [
								...existingRates,
								...newPricingRates,
							];
						} else {
							updatedRoomCountDetails.push({
								roomType: rType,
								displayName: fullDisplayName,
								pricingRate: newPricingRates,
							});
						}

						return {
							...prevDetails,
							roomCountDetails: updatedRoomCountDetails,
						};
					});

					if (calendarRef.current) {
						const calendarApi = calendarRef.current.getApi();

						newPricingRates.forEach((rate) => {
							const existingEvents = calendarApi
								.getEvents()
								.filter(
									(event) =>
										event.startStr === rate.calendarDate &&
										(event.title.includes(fullDisplayName) ||
											event.extendedProps?.displayName === fullDisplayName)
								);
							existingEvents.forEach((event) => event.remove());

							const eventColor = getCalendarRateColor(
								rate,
								getColorForPrice
							);
							calendarApi.addEvent({
								title: buildCalendarRateTitle({
									rate,
									isArabic,
								}),
								start: rate.calendarDate,
								end: rate.calendarDate,
								allDay: true,
								backgroundColor: eventColor,
								borderColor: eventColor,
								textColor: "#ffffff",
								classNames: getCalendarRateClassNames(rate),
								extendedProps: {
									displayName: fullDisplayName,
									isRestricted: isCalendarRateRestricted(rate),
								},
							});
						});
					}

					handleCancelSelection();
					message.success("Date range added successfully!");
				};

				const handleCancelSelection = () => {
					setSelectedDateRange([null, null]);
					setPricingRate("");
					setPriceError(false);

					if (calendarRef.current) {
						const calendarApi = calendarRef.current.getApi();
						const existingSelectedEvents = calendarApi
							.getEvents()
							.filter((event) => event.title === "Selected");
						existingSelectedEvents.forEach((event) => event.remove());
					}
				};

				return (
					<>
						{/* Subtabs */}
						<TabsRow>
							<TopTab
								isActive={activePricingTab === "custom"}
								onClick={() => setActivePricingTab("custom")}
							>
								{isArabic ? "تقويم مخصص" : "Custom Calendar"}
							</TopTab>
							<TopTab
								isActive={activePricingTab === "offers"}
								onClick={() => setActivePricingTab("offers")}
							>
								{isArabic ? "العروض" : "Offers"}
							</TopTab>
							<TopTab
								isActive={activePricingTab === "monthly"}
								onClick={() => setActivePricingTab("monthly")}
							>
								{isArabic ? "شهري" : "Monthly"}
							</TopTab>
						</TabsRow>

						{activePricingTab === "custom" ? (
							<div className='row'>
								<div className='col-md-9'>
									<FullCalendar
										ref={calendarRef}
										plugins={[dayGridPlugin, interactionPlugin]}
										initialView='dayGridMonth'
										events={pricingEvents}
										selectable={true}
										headerToolbar={{
											left: "prev,next today",
											center: "title",
											right: "dayGridMonth",
										}}
										select={handleCalendarSelect}
										selectAllow={() => true}
									/>
								</div>
								<div className='col-md-3'>
									<h4 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
										{isArabic
											? `تسعير الغرفة: ${displayNameValue}`
											: `Pricing for room: ${displayNameValue}`}
									</h4>
									<label>{isArabic ? "نطاق التاريخ" : "Date Range"}</label>
									<Form.Item
										dir='ltr'
										className='w-100'
										name='dateRange'
										rules={[
											{ required: true, message: "Please select a date range" },
										]}
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
												{isArabic
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
													{isArabic ? "نعم" : "Yes"}
												</label>
											</h4>
											<div>
												<label>
													{isArabic ? "سعر النطاق:" : "Price Range:"}
												</label>
												<Input
													type='number'
													value={pricingRate}
													onChange={(e) => {
														setPricingRate(e.target.value);
														setPriceError(false);
													}}
													ref={priceInputRef}
													placeholder={isArabic ? "سعر النطاق" : "Price Range"}
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
													}}
												/>
												{priceError && (
													<div style={{ color: "red" }}>
														{isArabic
															? "الرجاء إدخال سعر النطاق"
															: "Please enter the price range"}
													</div>
												)}
											</div>
											<div className='text-center mt-3'>
												<Button
													onClick={handleDateRangeSubmit}
													className='btn btn-primary'
												>
													{isArabic
														? "إضافة سعر النطاق"
														: "Add Pricing Rate Range"}
												</Button>
											</div>
										</>
									) : (
										<div className='text-center mt-3'>
											<Button className='btn btn-primary' disabled>
												{isArabic
													? "الرجاء تحديد نطاق تاريخ"
													: "Please select a date range"}
											</Button>
										</div>
									)}
								</div>
							</div>
						) : activePricingTab === "offers" ? (
							<ZOffersMonthly
								mode='Offers'
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
								setHotelDetails={setHotelDetails}
								selectedRoomType={selectedRoomType}
								customRoomType={customRoomType}
								form={form}
							/>
						) : (
							<ZOffersMonthly
								mode='Monthly'
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
								setHotelDetails={setHotelDetails}
								selectedRoomType={selectedRoomType}
								customRoomType={customRoomType}
								form={form}
							/>
						)}
					</>
				);
			}

			default:
				return null;
		}
	};

	return (
		<ZHotelDetailsForm2Wrapper
			isArabic={chosenLanguage === "Arabic"}
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
		>
			<Form
				form={form}
				layout='vertical'
				initialValues={hotelDetails}
				onFinish={handleFinish}
			>
				{renderStepContent()}
				<div className='steps-action'>
					{currentStep > 0 && (
						<Button className='step-button secondary' onClick={handlePrev}>
							{chosenLanguage === "Arabic" ? "السابق" : "Previous"}
						</Button>
					)}

					{currentStep < 3 && currentStep !== 0 && (
						<Button className='step-button primary' type='primary' onClick={handleNext}>
							{chosenLanguage === "Arabic" ? "التالي" : "Next"}
						</Button>
					)}

					{currentStep < 3 && currentStep === 0 && (
						<Button className='step-button primary' type='primary' onClick={handleNext}>
							{chosenLanguage === "Arabic"
								? "إضافة غرفة جديدة"
								: "Add A New Room"}
						</Button>
					)}
				</div>
			</Form>
		</ZHotelDetailsForm2Wrapper>
	);
};

export default ZHotelDetailsForm2;

const ZHotelDetailsForm2Wrapper = styled.div`
	max-width: 1600px;
	margin: auto;

	h3 {
		font-weight: bold;
		font-size: 2rem;
		text-align: center;
		color: #006ad1;
	}

	.fc,
	.fc-media-screen,
	.fc-direction-ltr,
	.fc-theme-standard {
		max-height: 650px !important;
	}

	.ant-form-item {
		margin-bottom: 1rem;
	}

	.ant-upload-list-picture .ant-upload-list-item {
		height: auto;
		line-height: 1.5;
	}

	input[type="text"],
	input[type="email"],
	input[type="password"],
	input[type="date"],
	input[type="number"],
	select,
	textarea {
		display: block;
		width: 100%;
		padding: 0.5rem;
		font-size: 1rem;
		border: 1px solid #d9d9d9;
		border-radius: 4px;
		background-color: #fff;
		transition: all 0.3s;
		box-sizing: border-box;
	}

	input[type="text"]:focus,
	input[type="email"]:focus,
	input[type="password"]:focus,
	input[type="number"]:focus,
	input[type="date"]:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #40a9ff;
		box-shadow: 2px 5px 0 2px rgba(0, 0, 0, 0.5);
	}

	.col-md-2 {
		font-weight: bold;
	}

	.calendar-container {
		height: calc(100vh - 300px);
		width: 90% !important;
		max-width: 90%;
		margin: 0 auto;
		overflow: hidden;
	}

	.fc {
		height: 100%;
	}

	.fc .calendar-rate-blocked {
		background: #111827 !important;
		border-color: #111827 !important;
	}

	.fc .calendar-rate-blocked .fc-event-main,
	.fc .calendar-rate-blocked .fc-event-title {
		color: #ffffff !important;
	}

	text-align: ${(props) => (props.isArabic ? "right" : "left")};
	.steps-action {
		position: sticky;
		bottom: 12px;
		z-index: 30;
		display: flex;
		justify-content: center;
		gap: 10px;
		width: fit-content;
		margin: 22px auto 0;
		padding: 8px;
		border: 1px solid #d7e7f8;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
	}

	.step-button {
		min-width: 145px;
		height: 40px;
		border-radius: 999px;
		font-weight: 900;
	}

	.step-button.secondary {
		border-color: #cfe1f5;
		color: #24415f;
		background: #f8fbff;
	}

	button {
		text-transform: capitalize !important;
	}
`;

// NEW: simple tab styles used inside Step 3
const TabsRow = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(120px, 1fr));
	gap: 6px;
	margin-bottom: 12px;
`;

const TopTab = styled.div`
	cursor: pointer;
	padding: 12px 8px;
	text-align: center;
	font-weight: ${(p) => (p.isActive ? "700" : "600")};
	background: ${(p) => (p.isActive ? "white" : "#e9e9e9")};
	border: 1px solid #d0d0d0;
	border-bottom-width: ${(p) => (p.isActive ? "2px" : "1px")};
	box-shadow: ${(p) =>
		p.isActive ? "inset 5px 5px 5px rgba(0,0,0,0.08)" : "none"};
	transition: all 0.2s ease;
	border-radius: 6px;
`;

const EmptyStep = styled.div`
	display: grid;
	place-items: center;
	min-height: 220px;
	padding: 1.5rem;
	border: 1px dashed #bdd7f4;
	border-radius: 14px;
	background: #f8fbff;
	color: #38506d;
	font-weight: 900;
	text-align: center;
`;
