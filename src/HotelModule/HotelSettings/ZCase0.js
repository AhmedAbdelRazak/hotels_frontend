import React, { useState } from "react";
import {
	Form,
	Input,
	Button,
	Select,
	message,
	Modal,
	Checkbox,
	Switch,
} from "antd";
import styled from "styled-components";
import ImageCardMain from "./ImageCardMain";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import TextArea from "antd/es/input/TextArea";

const { Option } = Select;

const ZCase0 = ({
	hotelDetails,
	setHotelDetails,
	chosenLanguage,
	setLocationModalVisible,
	locationModalVisible,
	setMarkerPosition,
	markerPosition,
	setAddress,
	address,
	setHotelPhotos,
	hotelPhotos,
	setGeocoder,
	geocoder,
	hotelIsActive,
	activationSaving,
	handleActivationChange,
}) => {
	const [manualLat, setManualLat] = useState("");
	const [manualLng, setManualLng] = useState("");
	const [manualInputEnabled, setManualInputEnabled] = useState(false);
	const isArabic = chosenLanguage === "Arabic";
	const switchText = {
		paymentTitle: isArabic
			? "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062f\u0641\u0639 \u0644\u0644\u0636\u064a\u0648\u0641"
			: "Payment Settings For Guests",
		hotelActivation: isArabic
			? "\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0641\u0646\u062f\u0642"
			: "Activate Hotel",
		acceptDeposit: isArabic
			? "\u0642\u0628\u0648\u0644 \u0627\u0644\u0639\u0631\u0628\u0648\u0646 \u0623\u0648\u0646\u0644\u0627\u064a\u0646"
			: "Accept Deposit Online",
		payWholeAmount: isArabic
			? "\u0627\u062f\u0641\u0639 \u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0623\u0648\u0646\u0644\u0627\u064a\u0646"
			: "Pay Whole Amount Online",
		reserveNowPayHotel: isArabic
			? "\u0627\u062d\u062c\u0632 \u0627\u0644\u0622\u0646 \u0648\u0627\u062f\u0641\u0639 \u0641\u064a \u0627\u0644\u0641\u0646\u062f\u0642"
			: "Reserve Now, Pay Later",
	};
	const busText = {
		checkbox: isArabic
			? "\u0647\u0644 \u064a\u0648\u0641\u0631 \u0627\u0644\u0641\u0646\u062f\u0642 \u062e\u062f\u0645\u0629 \u0628\u0627\u0635 \u0644\u0644\u062d\u0631\u0645\u061f"
			: "Does the hotel provide bus service to Al Haram?",
		detailsLabel: isArabic
			? "\u062a\u0641\u0627\u0635\u064a\u0644 \u062e\u062f\u0645\u0629 \u0627\u0644\u0628\u0627\u0635"
			: "Bus Service Details",
		detailsPlaceholder: isArabic
			? "\u0627\u0643\u062a\u0628 \u0646\u0642\u0637\u0629 \u0627\u0644\u0627\u0646\u0637\u0644\u0627\u0642\u060c \u0627\u0644\u0645\u062d\u0637\u0627\u062a\u060c \u0627\u0644\u062c\u062f\u0648\u0644\u060c \u0648\u0647\u0644 \u0627\u0644\u062e\u062f\u0645\u0629 \u0645\u062c\u0627\u0646\u064a\u0629 \u0623\u0648 \u0645\u062f\u0641\u0648\u0639\u0629."
			: "Add pickup point, stations, schedule, and whether it is free or paid.",
		noBusHint: isArabic
			? "\u0639\u0646\u062f \u0639\u062f\u0645 \u062a\u0641\u0639\u064a\u0644\u0647\u0627\u060c \u0633\u064a\u0648\u0636\u062d \u0627\u0644\u0645\u0633\u0627\u0639\u062f \u0623\u0646 \u0627\u0644\u0641\u0646\u062f\u0642 \u0644\u0627 \u064a\u0648\u0641\u0631 \u0628\u0627\u0635\u0627 \u062e\u0627\u0635\u0627 \u0648\u0623\u0646 \u0627\u0644\u0628\u0627\u0635\u0627\u062a \u0627\u0644\u0639\u0627\u0645\u0629 \u0642\u0631\u064a\u0628\u0629 \u0645\u0646 \u0627\u0644\u0641\u0646\u062f\u0642 \u0625\u0644\u0649 \u0627\u0644\u062d\u0631\u0645."
			: "When disabled, the AI assistant will say the hotel does not offer a private bus and that public buses are available nearby to Al Haram.",
	};
	const mealsText = {
		checkbox: isArabic
			? "\u0647\u0644 \u064a\u0648\u0641\u0631 \u0627\u0644\u0641\u0646\u062f\u0642 \u0648\u062c\u0628\u0627\u062a \u0623\u0648 \u0625\u0641\u0637\u0627\u0631 \u0644\u0644\u0636\u064a\u0648\u0641\u061f"
			: "Does the hotel provide meals or breakfast for guests?",
		detailsLabel: isArabic
			? "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0648\u062c\u0628\u0627\u062a \u0648\u0627\u0644\u0625\u0641\u0637\u0627\u0631"
			: "Meals / Breakfast Details",
		detailsPlaceholder: isArabic
			? "\u0623\u0636\u0641 \u0645\u0627 \u0647\u0648 \u0645\u0634\u0645\u0648\u0644\u060c \u0645\u0648\u0627\u0639\u064a\u062f \u0627\u0644\u0648\u062c\u0628\u0627\u062a\u060c \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0627\u0644\u0628\u0648\u0641\u064a\u0647 \u0623\u0648 \u0627\u0644\u0645\u0637\u0639\u0645\u060c \u0648\u0647\u0644 \u0647\u064a \u0645\u062c\u0627\u0646\u064a\u0629 \u0623\u0648 \u0645\u062f\u0641\u0648\u0639\u0629."
			: "Add what is included, meal times, buffet or restaurant notes, and whether meals are free or paid.",
		noMealsHint: isArabic
			? "\u0639\u0646\u062f \u0639\u062f\u0645 \u062a\u0641\u0639\u064a\u0644\u0647\u0627\u060c \u0633\u064a\u0648\u0636\u062d \u0627\u0644\u0645\u0633\u0627\u0639\u062f \u0623\u0646 \u0627\u0644\u0648\u062c\u0628\u0627\u062a \u062f\u0627\u062e\u0644 \u0627\u0644\u0641\u0646\u062f\u0642 \u063a\u064a\u0631 \u0645\u0624\u0643\u062f\u0629 \u062d\u0627\u0644\u064a\u0627."
			: "When disabled, the AI assistant will say in-hotel meals are not currently provided or confirmed.",
	};
	const nusukText = {
		checkbox: isArabic
			? "\u0647\u0644 \u0627\u0644\u0641\u0646\u062f\u0642 \u0645\u062f\u0631\u062c \u0628\u0646\u0633\u0643\u061f"
			: "Is the hotel listed on Nusuk?",
		detailsLabel: isArabic
			? "\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0646\u0633\u0643"
			: "Nusuk Notes",
		detailsPlaceholder: isArabic
			? "\u0623\u0636\u0641 \u0623\u064a \u062a\u0641\u0627\u0635\u064a\u0644 \u0645\u0647\u0645\u0629 \u0639\u0646 \u0638\u0647\u0648\u0631 \u0627\u0644\u0641\u0646\u062f\u0642 \u0641\u064a \u0645\u0646\u0635\u0629 \u0646\u0633\u0643 \u0623\u0648 \u062a\u0639\u0644\u064a\u0645\u0627\u062a \u0627\u0644\u062d\u062c\u0632 \u0645\u0646 \u062e\u0644\u0627\u0644\u0647\u0627."
			: "Add any important notes about the hotel's Nusuk listing or booking guidance through Nusuk.",
		noNusukHint: isArabic
			? "\u0639\u0646\u062f \u0639\u062f\u0645 \u062a\u0641\u0639\u064a\u0644\u0647\u0627\u060c \u0633\u064a\u062c\u064a\u0628 \u0627\u0644\u0645\u0633\u0627\u0639\u062f \u0623\u0646 \u0627\u0644\u0641\u0646\u062f\u0642 \u063a\u064a\u0631 \u0645\u062f\u0631\u062c \u062d\u0627\u0644\u064a\u0627 \u0641\u064a \u0646\u0633\u0643."
			: "When disabled, the AI assistant will say the hotel is not currently listed on Nusuk.",
	};
	const hasBusService = hotelDetails.hasBusService === true;
	const hasMealsService = hotelDetails.hasMealsService === true;
	const isNusuk = hotelDetails.isNusuk === true;

	const handleLoad = () => {
		if (window.google && window.google.maps && window.google.maps.Geocoder) {
			setGeocoder(new window.google.maps.Geocoder());
		} else {
			console.error("Google Maps Geocoder is not loaded");
		}
	};

	const handleAddressChange = (e) => {
		setAddress(e.target.value);
		if (geocoder) {
			geocodeAddress(e.target.value);
		} else {
			console.error("Geocoder is not initialized");
		}
	};

	const geocodeAddress = (address) => {
		if (!geocoder) {
			console.error("Geocoder is not initialized");
			return;
		}

		geocoder.geocode({ address }, (results, status) => {
			if (status === "OK" && results[0]) {
				const location = results[0].geometry.location;
				setMarkerPosition({
					lat: location.lat(),
					lng: location.lng(),
				});
				setHotelDetails((prevDetails) => ({
					...prevDetails,
					location: {
						type: "Point",
						coordinates: [location.lng(), location.lat()],
					},
					hotelAddress: results[0].formatted_address,
				}));
			} else if (status !== "OK" && status !== "ZERO_RESULTS") {
				message.error(
					"Geocode was not successful for the following reason: " + status
				);
			}
		});
	};

	const handleMapClick = (e) => {
		const lat = e.latLng.lat();
		const lng = e.latLng.lng();
		setMarkerPosition({ lat, lng });
		reverseGeocode(lat, lng);
	};

	const reverseGeocode = (lat, lng) => {
		if (!geocoder) {
			console.error("Geocoder is not initialized");
			return;
		}

		geocoder.geocode({ location: { lat, lng } }, (results, status) => {
			if (status === "OK" && results[0]) {
				setAddress(results[0].formatted_address);
				setHotelDetails((prevDetails) => ({
					...prevDetails,
					location: {
						type: "Point",
						coordinates: [lng, lat],
					},
					hotelAddress: results[0].formatted_address,
				}));
			} else {
				message.error(
					"Geocode was not successful for the following reason: " + status
				);
			}
		});
	};

	const handleManualSubmit = () => {
		const lat = parseFloat(manualLat);
		const lng = parseFloat(manualLng);

		if (isNaN(lat) || isNaN(lng)) {
			message.error("Invalid latitude or longitude.");
			return;
		}

		setMarkerPosition({ lat, lng });
		setHotelDetails((prevDetails) => ({
			...prevDetails,
			location: {
				type: "Point",
				coordinates: [lng, lat],
			},
			hotelAddress: `Lat: ${lat}, Lng: ${lng}`,
		}));
		message.success(
			"Location updated successfully based on entered longitude and latitude!"
		);
	};

	const handleLocationModalOk = () => {
		if (!geocoder) {
			message.error("Geocoder is not initialized");
			return;
		}

		geocoder.geocode(
			{ location: { lat: markerPosition.lat, lng: markerPosition.lng } },
			(results, status) => {
				if (status === "OK" && results[0]) {
					const addressComponents = results[0].address_components;
					const hotelCountry = addressComponents.find((comp) =>
						comp.types.includes("country")
					)?.long_name;
					const hotelCity = addressComponents.find((comp) =>
						comp.types.includes("locality")
					)?.long_name;
					const hotelState = addressComponents.find((comp) =>
						comp.types.includes("administrative_area_level_1")
					)?.long_name;

					setHotelDetails((prevDetails) => ({
						...prevDetails,
						location: {
							type: "Point",
							coordinates: [markerPosition.lng, markerPosition.lat],
						},
						hotelAddress: results[0].formatted_address,
						hotelCountry: hotelCountry || prevDetails.hotelCountry,
						hotelCity: hotelCity || prevDetails.hotelCity,
						hotelState: hotelState || prevDetails.hotelState,
					}));
					message.success(
						chosenLanguage === "Arabic"
							? "تم تحديث موقع الفندق بنجاح!"
							: "Hotel location updated successfully!"
					);
				} else {
					message.error(
						"Geocode was not successful for the following reason: " + status
					);
				}
			}
		);
		setLocationModalVisible(false);
	};

	const handleLocationModalCancel = () => {
		setLocationModalVisible(false);
	};

	const handleOpenLocationModal = () => {
		if (
			hotelDetails.location &&
			hotelDetails.location.coordinates.length === 2 &&
			hotelDetails.location.coordinates[0] !== 0 &&
			hotelDetails.location.coordinates[1] !== 0
		) {
			setMarkerPosition({
				lat: hotelDetails.location.coordinates[1],
				lng: hotelDetails.location.coordinates[0],
			});
		} else if (hotelDetails.hotelCountry && hotelDetails.hotelCity) {
			const address = `${hotelDetails.hotelCity}, ${hotelDetails.hotelCountry}`;
			geocodeAddress(address);
		} else {
			setMarkerPosition({ lat: 24.7136, lng: 46.6753 });
		}
		setLocationModalVisible(true);
	};

	// Handle toggle for guestPaymentAcceptance switches
	const handleSwitchChange = (key, value) => {
		setHotelDetails((prevDetails) => ({
			...prevDetails,
			guestPaymentAcceptance: {
				...prevDetails.guestPaymentAcceptance,
				[key]: value,
			},
		}));
	};

	const handleBusServiceChange = (checked) => {
		setHotelDetails((prevDetails) => ({
			...prevDetails,
			hasBusService: checked,
			busDetails: checked ? prevDetails.busDetails || "" : "",
		}));
	};

	const handleMealsServiceChange = (checked) => {
		setHotelDetails((prevDetails) => ({
			...prevDetails,
			hasMealsService: checked,
			mealsDetails: checked ? prevDetails.mealsDetails || "" : "",
		}));
	};

	const handleNusukChange = (checked) => {
		setHotelDetails((prevDetails) => ({
			...prevDetails,
			isNusuk: checked,
			isNusukText: checked ? prevDetails.isNusukText || "" : "",
		}));
	};

	return (
		<ZCase0Wrapper
			isArabic={chosenLanguage === "Arabic"}
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
		>
			<>
				<div className='row'>
					<div className='col-md-2'>
						<Form.Item
							name='parkingLot'
							label={
								chosenLanguage === "Arabic"
									? "هل يوجد موقف سيارات في فندقك؟"
									: "Does Your Hotel Have A Parking Lot?"
							}
							rules={[{ required: true, message: "Please select an option" }]}
						>
							<Select
								onChange={(value) => {
									setHotelDetails((prevDetails) => ({
										...prevDetails,
										parkingLot: value === "1",
									}));
								}}
							>
								<Option
									value='1'
									style={{
										textAlign: chosenLanguage === "Arabic" ? "right" : "",
									}}
								>
									{chosenLanguage === "Arabic" ? "نعم" : "Yes"}
								</Option>
								<Option
									value='0'
									style={{
										textAlign: chosenLanguage === "Arabic" ? "right" : "",
									}}
								>
									{chosenLanguage === "Arabic" ? "لا" : "No"}
								</Option>
							</Select>
						</Form.Item>
					</div>
					<div className='col-md-2'>
						<Form.Item
							name='hotelFloors'
							label={
								chosenLanguage === "Arabic"
									? "كم عدد الطوابق في فندقك؟"
									: "How Many Floors Does your hotel have?"
							}
							rules={[
								{
									required: true,
									message: "Please input the number of floors",
								},
							]}
						>
							<Input
								type='number'
								onChange={(e) => {
									setHotelDetails((prevDetails) => ({
										...prevDetails,
										hotelFloors: e.target.value,
									}));
								}}
							/>
						</Form.Item>
					</div>

					<div className='col-md-4'>
						<Form.Item
							name='aboutHotel'
							label={chosenLanguage === "Arabic" ? "عن الفندق" : "About Hotel"}
							rules={[
								{
									required: true,
									message: "Please write a little bit about your hotel",
								},
							]}
						>
							<TextArea
								type='text'
								onChange={(e) => {
									setHotelDetails((prevDetails) => ({
										...prevDetails,
										aboutHotel: e.target.value,
									}));
								}}
							/>
						</Form.Item>
					</div>

					<div className='col-md-4'>
						<Form.Item
							name='aboutHotelArabic'
							label={
								chosenLanguage === "Arabic"
									? "عن الفندق باللغة العربية"
									: "About Hotel (In Arabic)"
							}
							rules={[
								{
									required: true,
									message: "Please write a little bit about your hotel",
								},
							]}
						>
							<TextArea
								type='text'
								onChange={(e) => {
									setHotelDetails((prevDetails) => ({
										...prevDetails,
										aboutHotelArabic: e.target.value,
									}));
								}}
							/>
						</Form.Item>
					</div>
				</div>

				<BusServiceBlock $isArabic={isArabic}>
					<ServiceCheckboxRow $isArabic={isArabic}>
						<Form.Item name='hasBusService' valuePropName='checked'>
							<Checkbox
								checked={hasBusService}
								onChange={(e) => handleBusServiceChange(e.target.checked)}
							>
								{busText.checkbox}
							</Checkbox>
						</Form.Item>

						<Form.Item name='isNusuk' valuePropName='checked'>
							<Checkbox
								checked={isNusuk}
								onChange={(e) => handleNusukChange(e.target.checked)}
							>
								{nusukText.checkbox}
							</Checkbox>
						</Form.Item>

						<Form.Item name='hasMealsService' valuePropName='checked'>
							<Checkbox
								checked={hasMealsService}
								onChange={(e) => handleMealsServiceChange(e.target.checked)}
							>
								{mealsText.checkbox}
							</Checkbox>
						</Form.Item>
					</ServiceCheckboxRow>

					<ServiceDetailsGrid>
						<ServiceDetailsItem>
							{hasBusService ? (
								<>
									<Form.Item name='busDetails' label={busText.detailsLabel}>
										<TextArea
											rows={3}
											value={hotelDetails.busDetails || ""}
											placeholder={busText.detailsPlaceholder}
											onChange={(e) => {
												const value = e.target.value;
												setHotelDetails((prevDetails) => ({
													...prevDetails,
													busDetails: value,
												}));
											}}
										/>
									</Form.Item>
								</>
							) : (
								<BusServiceHint>{busText.noBusHint}</BusServiceHint>
							)}
						</ServiceDetailsItem>

						<ServiceDetailsItem>
							{hasMealsService ? (
								<>
									<Form.Item name='mealsDetails' label={mealsText.detailsLabel}>
										<TextArea
											rows={3}
											value={hotelDetails.mealsDetails || ""}
											placeholder={mealsText.detailsPlaceholder}
											onChange={(e) => {
												const value = e.target.value;
												setHotelDetails((prevDetails) => ({
													...prevDetails,
													mealsDetails: value,
												}));
											}}
										/>
									</Form.Item>
								</>
							) : (
								<BusServiceHint>{mealsText.noMealsHint}</BusServiceHint>
							)}
						</ServiceDetailsItem>

						<ServiceDetailsItem>
							{isNusuk ? (
								<>
									<Form.Item name='isNusukText' label={nusukText.detailsLabel}>
										<TextArea
											rows={3}
											value={hotelDetails.isNusukText || ""}
											placeholder={nusukText.detailsPlaceholder}
											onChange={(e) => {
												const value = e.target.value;
												setHotelDetails((prevDetails) => ({
													...prevDetails,
													isNusukText: value,
												}));
											}}
										/>
									</Form.Item>
								</>
							) : (
								<BusServiceHint>{nusukText.noNusukHint}</BusServiceHint>
							)}
						</ServiceDetailsItem>
					</ServiceDetailsGrid>
				</BusServiceBlock>

				<div
					dir='ltr'
					style={{
						marginBottom: "10px",
						fontWeight: "bold",
						fontSize: "14px",
						textTransform: "capitalize",
					}}
				>
					{hotelDetails.location.coordinates[0] === 0 &&
					hotelDetails.location.coordinates[1] === 0 ? (
						<span style={{ color: "red" }}>
							{chosenLanguage === "Arabic"
								? "لم يتم تأكيد الموقع"
								: "No location was confirmed"}
						</span>
					) : (
						<span style={{ color: "darkgreen" }}>
							{chosenLanguage === "Arabic"
								? `Location: ${hotelDetails.hotelAddress}`
								: `Location: ${hotelDetails.hotelAddress}`}
						</span>
					)}
				</div>

				<Button
					type={
						hotelDetails.location.coordinates[0] === 0 &&
						hotelDetails.location.coordinates[1] === 0
							? "primary"
							: "primary"
					}
					onClick={handleOpenLocationModal}
					style={{ marginBottom: "16px" }}
				>
					{chosenLanguage === "Arabic"
						? hotelDetails.location.coordinates[0] === 0 &&
						  hotelDetails.location.coordinates[1] === 0
							? "إضافة موقع الفندق"
							: "تعديل موقع الفندق"
						: hotelDetails.location.coordinates[0] === 0 &&
						    hotelDetails.location.coordinates[1] === 0
						  ? "Add Hotel Location"
						  : "Edit Hotel Location"}
				</Button>

				<Modal
					title={
						chosenLanguage === "Arabic"
							? "حدد موقع الفندق"
							: "Select Hotel Location"
					}
					open={locationModalVisible}
					onOk={handleLocationModalOk}
					onCancel={handleLocationModalCancel}
					width={1100}
				>
					<Input
						value={address}
						onChange={handleAddressChange}
						placeholder={
							chosenLanguage === "Arabic"
								? "أدخل عنوان الفندق"
								: "Enter hotel address"
						}
						style={{ marginBottom: "16px" }}
					/>

					<Checkbox
						checked={manualInputEnabled}
						onChange={(e) => setManualInputEnabled(e.target.checked)}
						className='my-3'
					>
						{chosenLanguage === "Arabic"
							? "هل تريد إضافة خطوط الطول والعرض؟"
							: "Would You Like To Add Longitude and Latitude?"}
					</Checkbox>

					{manualInputEnabled && (
						<>
							<Input
								type='number'
								placeholder='Enter Latitude'
								value={manualLat}
								onChange={(e) => setManualLat(e.target.value)}
								style={{ marginTop: "10px", marginBottom: "10px" }}
							/>
							<Input
								type='number'
								placeholder='Enter Longitude'
								value={manualLng}
								onChange={(e) => setManualLng(e.target.value)}
								style={{ marginBottom: "10px" }}
							/>
							<Button
								type='primary'
								onClick={handleManualSubmit}
								className='mb-4'
							>
								{chosenLanguage === "Arabic"
									? "إرسال خط الطول والعرض"
									: "Submit Long & Lat"}
							</Button>
						</>
					)}

					<LoadScript
						googleMapsApiKey={process.env.REACT_APP_MAPS_API_KEY}
						onLoad={handleLoad}
					>
						<GoogleMap
							mapContainerStyle={{ width: "100%", height: "400px" }}
							center={markerPosition}
							zoom={14}
							onClick={handleMapClick}
						>
							<Marker position={markerPosition} draggable={true} />
						</GoogleMap>
					</LoadScript>
				</Modal>

				<GuestPaymentSwitchRow
					$isArabic={isArabic}
				>
					<h5>{switchText.paymentTitle}</h5>

					<SwitchControl $isArabic={isArabic}>
						<Switch
							className='mx-1'
							checked={!!hotelIsActive}
							loading={activationSaving}
							disabled={activationSaving}
							onChange={handleActivationChange}
						/>
						<span>{switchText.hotelActivation}</span>
					</SwitchControl>

					<SwitchControl $isArabic={isArabic}>
						<Switch
							className='mx-1'
							checked={hotelDetails.guestPaymentAcceptance.acceptDeposit}
							onChange={(value) => handleSwitchChange("acceptDeposit", value)}
						/>
						<span>{switchText.acceptDeposit}</span>
					</SwitchControl>
					<SwitchControl $isArabic={isArabic}>
						<Switch
							className='mx-1'
							checked={hotelDetails.guestPaymentAcceptance.acceptPayWholeAmount}
							onChange={(value) =>
								handleSwitchChange("acceptPayWholeAmount", value)
							}
						/>
						<span>{switchText.payWholeAmount}</span>
					</SwitchControl>
					<SwitchControl $isArabic={isArabic}>
						<Switch
							className='mx-1'
							checked={
								hotelDetails.guestPaymentAcceptance.acceptReserveNowPayInHotel
							}
							onChange={(value) =>
								handleSwitchChange("acceptReserveNowPayInHotel", value)
							}
						/>
						<span>{switchText.reserveNowPayHotel}</span>
					</SwitchControl>
				</GuestPaymentSwitchRow>

				<h4 style={{ fontSize: "1.3rem", fontWeight: "bold" }} className='mt-3'>
					{chosenLanguage === "Arabic"
						? "صور عامة عن الفندق (مثل المبنى، الردهة، المصاعد، الخ...)"
						: "General Images About the hotel (e.g. building, lobby, elevators, etc...)"}
				</h4>
				<Form.Item>
					<ImageCardMain
						roomType='hotelPhotos'
						hotelPhotos={hotelPhotos}
						setHotelPhotos={setHotelPhotos}
						setHotelDetails={setHotelDetails}
					/>
				</Form.Item>
			</>
		</ZCase0Wrapper>
	);
};

export default ZCase0;

const ZCase0Wrapper = styled.div``;

const BusServiceBlock = styled.div`
	background: #f8fbff;
	border: 1px solid #dbe8f6;
	border-radius: 8px;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	margin: 4px 0 18px;
	padding: 14px 16px;
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};

	.ant-form-item {
		margin-bottom: 10px;
	}

	.ant-checkbox-wrapper {
		font-weight: 700;
	}

	textarea {
		min-height: 92px;
	}
`;

const ServiceCheckboxRow = styled.div`
	align-items: center;
	display: grid;
	gap: 12px 16px;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	margin-bottom: 12px;
	width: 100%;

	.ant-form-item {
		margin-bottom: 0;
		min-width: 0;
	}

	.ant-checkbox-wrapper {
		align-items: center;
		display: flex;
		line-height: 1.35;
		width: 100%;
	}

	@media (max-width: 991px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 767px) {
		grid-template-columns: 1fr;
	}
`;

const ServiceDetailsGrid = styled.div`
	display: grid;
	gap: 12px 16px;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
`;

const ServiceDetailsItem = styled.div`
	min-width: 0;
`;

const BusServiceHint = styled.div`
	color: #526173;
	font-size: 0.92rem;
	line-height: 1.5;
`;

const GuestPaymentSwitchRow = styled.div`
	align-items: center;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	display: flex;
	flex-wrap: wrap;
	gap: 0;
	justify-content: flex-start;
	margin: 10px 0 30px;
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};
	width: 100%;

	h5 {
		color: darkred;
		font-size: 1.1rem;
		font-weight: bold;
		margin: 0;
		text-decoration: underline;
		white-space: nowrap;
	}

	> div + div {
		border-inline-start: 1px solid #d6dde8;
		margin-inline-start: 18px;
		padding-inline-start: 18px;
	}

	@media (max-width: 900px) {
		align-items: ${(props) => (props.$isArabic ? "flex-end" : "flex-start")};
		flex-direction: column;
		gap: 12px;

		h5 {
			margin: 0;
			white-space: normal;
		}

		> div + div {
			border-inline-start: 0;
			border-block-start: 1px solid #e2e7ef;
			margin-inline-start: 0;
			padding-block-start: 12px;
			padding-inline-start: 0;
		}
	}
`;

const SwitchControl = styled.div`
	align-items: center;
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	display: inline-flex;
	flex-direction: row;
	gap: 8px;
	white-space: nowrap;

	.ant-switch {
		direction: ltr !important;
		flex: 0 0 auto;
		margin: 0 !important;
	}

	> span {
		font-weight: bold;
		margin: 0 !important;
	}
`;
