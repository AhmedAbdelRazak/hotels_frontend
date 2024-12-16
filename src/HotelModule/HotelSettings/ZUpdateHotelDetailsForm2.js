import React, { useState, useEffect, useRef, useCallback } from "react";
import { Form, Button, message } from "antd";
import styled from "styled-components";
import ZUpdateCase1 from "./ZUpdateCase1";
import ZUpdateCase2 from "./ZUpdateCase2";
import ZUpdateCase3 from "./ZUpdateCase3";

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

const ZUpdateHotelDetailsForm2 = ({
	existingRoomDetails,
	hotelDetails,
	setHotelDetails,
	chosenLanguage,
	roomTypes,
	amenitiesList,
	currentStep,
	setCurrentStep,
	selectedRoomType,
	setSelectedRoomType,
	roomTypeSelected,
	setRoomTypeSelected,
	submittingHotelDetails,
	fromPage,
	photos, // Receive photos from props
	setPhotos, // Receive setPhotos from props
	viewsList,
	extraAmenitiesList,
}) => {
	const [selectedDateRange, setSelectedDateRange] = useState([null, null]);
	const [pricingRate, setPricingRate] = useState("");
	const [customRoomType, setCustomRoomType] = useState("");
	const [priceError, setPriceError] = useState(false);
	const [rootPrice, setRootPrice] = useState("");
	const calendarRef = useRef(null);
	const [form] = Form.useForm();

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
		if (existingRoomDetails && selectedRoomType) {
			form.resetFields(); // Reset fields before setting new values
			form.setFieldsValue({
				roomType: existingRoomDetails.roomType,
				customRoomType:
					existingRoomDetails.roomType === "other"
						? existingRoomDetails.roomType || ""
						: "",
				displayName: existingRoomDetails.displayName || "",
				roomCount: existingRoomDetails.count || 0,
				basePrice: existingRoomDetails.price?.basePrice || 0,
				description: existingRoomDetails.description || "",
				amenities: existingRoomDetails.amenities || [],
				views: existingRoomDetails.views || [],
				extraAmenities: existingRoomDetails.extraAmenities || [],
				pricedExtras: existingRoomDetails.pricedExtras || [],
			});

			// Prepopulate rootPrice if it exists
			setRootPrice(existingRoomDetails.rootPrice || ""); // Set initial value for rootPrice

			setRoomTypeSelected(true);

			if (calendarRef.current) {
				const calendarApi = calendarRef.current.getApi();
				calendarApi.getEvents().forEach((event) => event.remove());

				if (existingRoomDetails.pricingRate) {
					const pricingEvents = existingRoomDetails.pricingRate.map((rate) => ({
						title: `${
							existingRoomDetails.displayName || selectedRoomType.displayName
						}: ${rate.price} SAR`,
						start: rate.calendarDate,
						end: rate.calendarDate,
						allDay: true,
						backgroundColor:
							rate.color || getColorForPrice(rate.price, rate.calendarDate),
					}));

					pricingEvents.forEach((event) => calendarApi.addEvent(event));
				}
			}
		}
	}, [
		selectedRoomType,
		existingRoomDetails,
		form,
		setRoomTypeSelected,
		getColorForPrice,
		selectedRoomType.displayName,
	]);

	const handleNext = () => {
		form
			.validateFields()
			.then((values) => {
				const roomType =
					values.roomType === "other" ? customRoomType : values.roomType;

				// Merge existing data with updated data
				const updatedRoomDetails = {
					...existingRoomDetails,
					roomType,
					displayName: values.displayName || existingRoomDetails.displayName,
					count: values.roomCount || existingRoomDetails.count,
					price: {
						basePrice: values.basePrice || existingRoomDetails.price.basePrice,
					},
					description: values.description || existingRoomDetails.description,
					amenities: values.amenities || existingRoomDetails.amenities,
					views: values.views || existingRoomDetails.views,
					extraAmenities:
						values.extraAmenities || existingRoomDetails.extraAmenities,
					pricedExtras: values.pricedExtras || existingRoomDetails.pricedExtras,
					photos: photos.length ? photos : existingRoomDetails.photos || [],
					pricingRate: existingRoomDetails.pricingRate || [], // Retain pricingRate if not updated
					rootPrice: rootPrice || existingRoomDetails.rootPrice || "", // Add rootPrice
				};

				// Update the hotelDetails state with the updated room details
				const updatedRoomCountDetails = hotelDetails.roomCountDetails.map(
					(room) =>
						room._id === existingRoomDetails._id ? updatedRoomDetails : room
				);

				setHotelDetails((prevDetails) => ({
					...prevDetails,
					roomCountDetails: updatedRoomCountDetails,
				}));

				setCurrentStep(currentStep + 1);
			})
			.catch((info) => {
				message.error("Please fill in the required fields.");
			});
	};

	const handleFinish = (values) => {
		setHotelDetails((prevDetails) => ({
			...prevDetails,
			...values,
		}));
		message.success("Room details updated successfully!");
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 1:
				return (
					<ZUpdateCase1
						hotelDetails={hotelDetails}
						setHotelDetails={setHotelDetails}
						chosenLanguage={chosenLanguage}
						roomTypes={roomTypes}
						setSelectedRoomType={setSelectedRoomType}
						amenitiesList={amenitiesList}
						roomTypeSelected={roomTypeSelected}
						setRoomTypeSelected={setRoomTypeSelected}
						fromPage={fromPage}
						customRoomType={customRoomType}
						setCustomRoomType={setCustomRoomType}
						form={form}
						existingRoomDetails={existingRoomDetails}
						viewsList={viewsList}
						extraAmenitiesList={extraAmenitiesList}
					/>
				);

			case 2:
				return (
					<ZUpdateCase2
						hotelDetails={hotelDetails}
						setHotelDetails={setHotelDetails}
						chosenLanguage={chosenLanguage}
						form={form}
						photos={photos} // Pass photos to case 2
						setPhotos={setPhotos} // Pass setPhotos to case 2
						existingRoomDetails={existingRoomDetails}
					/>
				);

			case 3:
				return (
					<ZUpdateCase3
						hotelDetails={hotelDetails}
						setHotelDetails={setHotelDetails}
						chosenLanguage={chosenLanguage}
						selectedRoomType={selectedRoomType}
						existingRoomDetails={existingRoomDetails}
						calendarRef={calendarRef}
						selectedDateRange={selectedDateRange}
						setSelectedDateRange={setSelectedDateRange}
						pricingRate={pricingRate}
						setPricingRate={setPricingRate}
						priceError={priceError}
						setPriceError={setPriceError}
						getColorForPrice={getColorForPrice}
						handleFinish={handleFinish}
						form={form}
						rootPrice={rootPrice} // Pass rootPrice to the child
						setRootPrice={setRootPrice} // Pass setRootPrice to the child
					/>
				);

			default:
				return null;
		}
	};

	return (
		<ZUpdateHotelDetailsForm2Wrapper
			isArabic={chosenLanguage === "Arabic"}
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
		>
			<Form
				form={form}
				layout='vertical'
				initialValues={existingRoomDetails || {}}
				onFinish={handleFinish}
			>
				{renderStepContent()}
				<div className='steps-action'>
					{currentStep > 1 && (
						<Button
							style={{ margin: "0 8px" }}
							onClick={() => setCurrentStep(currentStep - 1)}
						>
							{chosenLanguage === "Arabic" ? "السابق" : "Previous"}
						</Button>
					)}

					{currentStep < 3 && (
						<Button type='primary' onClick={handleNext}>
							{chosenLanguage === "Arabic" ? "التالي" : "Next"}
						</Button>
					)}
				</div>
			</Form>
		</ZUpdateHotelDetailsForm2Wrapper>
	);
};

export default ZUpdateHotelDetailsForm2;

const ZUpdateHotelDetailsForm2Wrapper = styled.div`
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
