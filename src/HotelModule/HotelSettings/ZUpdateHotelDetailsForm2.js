import React, { useState, useEffect, useRef, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { Form, Button, message } from "antd";
import styled from "styled-components";
import ZUpdateCase1 from "./ZUpdateCase1";
import ZUpdateCase2 from "./ZUpdateCase2";
import ZUpdateCase3 from "./ZUpdateCase3";
import ZUpdateOffersMonthly from "./ZUpdateOffersMonthly";

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
	photos,
	setPhotos,
	viewsList,
	extraAmenitiesList,
}) => {
	const [selectedDateRange, setSelectedDateRange] = useState([null, null]);
	const [pricingRate, setPricingRate] = useState("");
	const [customRoomType, setCustomRoomType] = useState(""); // used in Case1 + Case3
	const [priceError, setPriceError] = useState(false);
	const [rootPrice, setRootPrice] = useState("");
	const calendarRef = useRef(null);
	const [form] = Form.useForm();
	const history = useHistory();

	// NEW: tabs inside step 3
	const [activePricingTab, setActivePricingTab] = useState("custom"); // "custom" | "offers" | "monthly"
	const isArabic = chosenLanguage === "Arabic";

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
			form.resetFields();
			form.setFieldsValue({
				roomType: existingRoomDetails.roomType,
				customRoomType:
					existingRoomDetails.roomType === "other"
						? existingRoomDetails.roomType || ""
						: "",
				displayName: existingRoomDetails.displayName || "",
				roomCount: existingRoomDetails.count || 1,
				basePrice: existingRoomDetails.price?.basePrice || 0,
				description: existingRoomDetails.description || "",
				amenities: existingRoomDetails.amenities || [],
				views: existingRoomDetails.views || [],
				extraAmenities: existingRoomDetails.extraAmenities || [],
				pricedExtras: existingRoomDetails.pricedExtras || [],
			});

			setRootPrice(existingRoomDetails.rootPrice || 30);
			setRoomTypeSelected(true);
		}
	}, [selectedRoomType, existingRoomDetails, form, setRoomTypeSelected]);

	const handleNext = () => {
		form
			.validateFields()
			.then((values) => {
				const roomType =
					values.roomType === "other" ? customRoomType : values.roomType;

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
					pricingRate: existingRoomDetails.pricingRate || [],
				};

				const updatedRoomCountDetails = hotelDetails.roomCountDetails.map(
					(room) =>
						room._id === existingRoomDetails._id ? updatedRoomDetails : room
				);

				setHotelDetails((prevDetails) => ({
					...prevDetails,
					roomCountDetails: updatedRoomCountDetails,
				}));

				const updatedUrl = `/hotel-management/settings/${
					hotelDetails.belongsTo
				}/${hotelDetails._id}?activeTab=roomcount&currentStep=${
					currentStep + 1
				}&selectedRoomType=${selectedRoomType}`;
				history.push(updatedUrl);

				setCurrentStep(currentStep + 1);
			})
			.catch(() => {
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
						photos={photos}
						setPhotos={setPhotos}
						existingRoomDetails={existingRoomDetails}
					/>
				);

			case 3:
				// Step 3 with subtabs
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
							<ZUpdateCase3
								hotelDetails={hotelDetails}
								setHotelDetails={setHotelDetails}
								chosenLanguage={chosenLanguage}
								selectedRoomType={selectedRoomType}
								customRoomType={customRoomType}
								existingRoomDetails={existingRoomDetails}
								calendarRef={calendarRef}
								selectedDateRange={selectedDateRange}
								setSelectedDateRange={setSelectedDateRange}
								pricingRate={pricingRate}
								setPricingRate={setPricingRate}
								priceError={priceError}
								setPriceError={setPriceError}
								getColorForPrice={getColorForPrice}
								form={form}
								rootPrice={rootPrice}
								setRootPrice={setRootPrice}
							/>
						) : activePricingTab === "offers" ? (
							<ZUpdateOffersMonthly
								mode='Offers'
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
								setHotelDetails={setHotelDetails}
								existingRoomDetails={existingRoomDetails}
								form={form}
							/>
						) : (
							<ZUpdateOffersMonthly
								mode='Monthly'
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
								setHotelDetails={setHotelDetails}
								existingRoomDetails={existingRoomDetails}
								form={form}
							/>
						)}
					</>
				);

			default:
				return null;
		}
	};

	return (
		<ZUpdateHotelDetailsForm2Wrapper
			isArabic={isArabic}
			dir={isArabic ? "rtl" : "ltr"}
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
							{isArabic ? "السابق" : "Previous"}
						</Button>
					)}
					{currentStep < 3 && (
						<Button type='primary' onClick={handleNext}>
							{isArabic ? "التالي" : "Next"}
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
		height: calc(100vh - 300px);
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

// Tabs used in step 3
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
