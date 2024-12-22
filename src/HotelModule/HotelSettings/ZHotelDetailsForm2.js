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
}) => {
	const [selectedDateRange, setSelectedDateRange] = useState([null, null]);
	const [pricingRate, setPricingRate] = useState("");
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
			hotelFloors: hotelDetails.hotelFloors,
		});
	}, [form, hotelDetails]);

	useEffect(() => {
		if (selectedDateRange[0] && selectedDateRange[1]) {
			const calendarApi = calendarRef.current.getApi();
			const tempEvent = {
				title: "Selected",
				start: selectedDateRange[0].toISOString().split("T")[0],
				end: selectedDateRange[1].toISOString().split("T")[0],
				allDay: true,
				backgroundColor: "lightgrey",
			};
			calendarApi.addEvent(tempEvent);
		}
	}, [selectedDateRange]);

	const handleNext = () => {
		form
			.validateFields()
			.then((values) => {
				const roomType =
					values.roomType === "other" ? customRoomType : values.roomType;

				const updatedRoomDetails = {
					roomType,
					displayName: values.displayName || "",
					displayName_OtherLanguage: values.displayName_OtherLanguage || "",
					description: values.description || "",
					description_OtherLanguage: values.description_OtherLanguage || "",
					count: values.roomCount || 0,
					price: { basePrice: values.basePrice || 0 },
					amenities: values.amenities || [],
					extraAmenities: values.extraAmenities || [],
					views: values.views || [],
					activeRoom: values.activeRoom || false,
					commisionIncluded: values.commisionIncluded || false,
					roomCommission: values.roomCommission || 0,
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

				setCurrentStep(currentStep + 1);
			})
			.catch((error) => {
				message.error("Please fill in all required fields.");
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
			date.setHours(0, 0, 0, 0); // Set time to 00:00:00
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

		if (start && end) {
			const adjustedEnd = new Date(end);
			adjustedEnd.setDate(adjustedEnd.getDate() + 1);

			const calendarApi = calendarRef.current.getApi();

			const existingSelectedEvents = calendarApi
				.getEvents()
				.filter((event) => event.title === "Selected");
			existingSelectedEvents.forEach((event) => event.remove());

			const tempEvent = {
				title: "Selected",
				start: start.toISOString().split("T")[0],
				end: adjustedEnd.toISOString().split("T")[0],
				allDay: true,
				backgroundColor: "lightgrey",
			};

			calendarApi.addEvent(tempEvent);
		}
	};

	useEffect(() => {
		if (currentStep === 3 && calendarRef.current) {
			const calendarApi = calendarRef.current.getApi();
			calendarApi.getEvents().forEach((event) => event.remove()); // Clear existing events

			if (selectedRoomType) {
				const room = hotelDetails.roomCountDetails.find(
					(r) =>
						r.roomType ===
						(selectedRoomType === "other" ? customRoomType : selectedRoomType)
				);

				if (room && room.pricingRate && room.pricingRate.length > 0) {
					const pricingEvents = room.pricingRate.map((rate) => ({
						title: `${room.displayName}: ${rate.price} SAR`,
						start: rate.calendarDate,
						end: rate.calendarDate,
						allDay: true,
						backgroundColor:
							rate.color || getColorForPrice(rate.price, rate.calendarDate),
					}));

					pricingEvents.forEach((event) => calendarApi.addEvent(event)); // Add the events
				}
			}
		}
		// eslint-disable-next-line
	}, [currentStep, hotelDetails, selectedRoomType, customRoomType]);

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
			case 3:
				const pricingEvents =
					selectedRoomType && hotelDetails.roomCountDetails
						? hotelDetails.roomCountDetails
								.find(
									(room) =>
										room.roomType ===
										(selectedRoomType === "other"
											? customRoomType
											: selectedRoomType)
								)
								?.pricingRate?.map((rate) => ({
									title: `${
										(form.getFieldValue("displayName").length > 8
											? form.getFieldValue("displayName").slice(0, 8) + "..."
											: form.getFieldValue("displayName")) || selectedRoomType
									}: ${rate.price} SAR`,
									start: rate.calendarDate,
									end: rate.calendarDate,
									allDay: true,
									backgroundColor: rate.color || getColorForPrice(rate.price),
								})) || [] // Default to an empty array if no pricingRate is available
						: [];

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
										(newRate) => newRate.calendarDate === rate.calendarDate
									)
							);

							updatedRoomCountDetails[roomIndex].pricingRate = [
								...existingRates,
								...newPricingRates,
							];
						} else {
							updatedRoomCountDetails.push({
								roomType,
								displayName: fullDisplayName,
								pricingRate: newPricingRates,
							});
						}

						return {
							...prevDetails,
							roomCountDetails: updatedRoomCountDetails,
						};
					});

					const calendarApi = calendarRef.current.getApi();
					newPricingRates.forEach((rate) => {
						const existingEvents = calendarApi
							.getEvents()
							.filter(
								(event) =>
									event.startStr === rate.calendarDate &&
									event.title.includes(fullDisplayName)
							);
						existingEvents.forEach((event) => event.remove());

						calendarApi.addEvent({
							title: `${fullDisplayName}: ${rate.price} SAR`,
							start: rate.calendarDate,
							end: rate.calendarDate,
							allDay: true,
							backgroundColor: rate.color,
						});
					});

					handleCancelSelection();
					message.success("Date range added successfully!");
				};

				const handleCancelSelection = () => {
					setSelectedDateRange([null, null]);
					setPricingRate("");
					setPriceError(false);

					const calendarApi = calendarRef.current.getApi();
					const existingSelectedEvents = calendarApi
						.getEvents()
						.filter((event) => event.title === "Selected");
					existingSelectedEvents.forEach((event) => event.remove());
				};

				return (
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
									<div>
										<label>
											{chosenLanguage === "Arabic"
												? "سعر النطاق:"
												: "Price Range:"}
										</label>
										<Input
											type='number'
											value={pricingRate}
											onChange={(e) => {
												setPricingRate(e.target.value);
												setPriceError(false);
											}}
											ref={priceInputRef}
											placeholder={
												chosenLanguage === "Arabic"
													? "سعر النطاق"
													: "Price Range"
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
											}}
										/>
										{priceError && (
											<div style={{ color: "red" }}>
												{chosenLanguage === "Arabic"
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
				);

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
						<Button style={{ margin: "0 8px" }} onClick={handlePrev}>
							{chosenLanguage === "Arabic" ? "السابق" : "Previous"}
						</Button>
					)}

					{currentStep < 3 && currentStep !== 0 && (
						<Button type='primary' onClick={handleNext}>
							{chosenLanguage === "Arabic" ? "التالي" : "Next"}
						</Button>
					)}

					{currentStep < 3 && currentStep === 0 && (
						<button
							className='btn btn-primary'
							onClick={handleNext}
							style={{ fontSize: "20px", fontWeight: "bold" }}
						>
							{chosenLanguage === "Arabic"
								? "إضافة غرفة جديدة"
								: "Add A New Room"}
						</button>
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
		height: calc(100vh - 300px); // Adjust the value as needed
		width: 90% !important;
		max-width: 90%;
		margin: 0 auto;
		overflow: hidden;
	}

	.fc {
		height: 100%;
	}

	text-align: ${(props) => (props.isArabic ? "right" : "left")};
	.steps-action {
		display: flex;
		justify-content: center;
		margin-top: 20px;
	}

	button {
		text-transform: capitalize !important;
	}
`;
