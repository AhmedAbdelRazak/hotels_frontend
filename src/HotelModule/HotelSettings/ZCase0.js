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
}) => {
	const [manualLat, setManualLat] = useState("");
	const [manualLng, setManualLng] = useState("");
	const [manualInputEnabled, setManualInputEnabled] = useState(false);

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

				<div
					className='row'
					style={{
						display: "flex",
						marginBottom: "30px",
						marginTop: "10px",
						gap: "20px",
					}}
				>
					<h5
						className='mx-4'
						style={{
							fontWeight: "bold",
							color: "darkred",
							fontSize: "1.1rem",
							textDecoration: "underline",
						}}
					>
						{chosenLanguage === "Arabic"
							? "إعدادات الدفع للضيوف"
							: "Payment Settings For Guests"}
					</h5>

					<div>
						<span style={{ marginRight: "10px", fontWeight: "bold" }}>
							{chosenLanguage === "Arabic"
								? "قبول العربون أونلاين"
								: "Accept Deposit Online"}
						</span>
						<Switch
							className='mx-1'
							checked={hotelDetails.guestPaymentAcceptance.acceptDeposit}
							onChange={(value) => handleSwitchChange("acceptDeposit", value)}
						/>
					</div>
					<div>
						<span style={{ marginRight: "10px", fontWeight: "bold" }}>
							{chosenLanguage === "Arabic"
								? "ادفع المبلغ الإجمالي أونلاين"
								: "Pay Whole Amount Online"}
						</span>
						<Switch
							className='mx-1'
							checked={hotelDetails.guestPaymentAcceptance.acceptPayWholeAmount}
							onChange={(value) =>
								handleSwitchChange("acceptPayWholeAmount", value)
							}
						/>
					</div>
					<div>
						<span style={{ marginRight: "10px", fontWeight: "bold" }}>
							{chosenLanguage === "Arabic"
								? "احجز الآن وادفع في الفندق"
								: "Reserve Now, Pay Later..."}
						</span>
						<Switch
							className='mx-1'
							checked={
								hotelDetails.guestPaymentAcceptance.acceptReserveNowPayInHotel
							}
							onChange={(value) =>
								handleSwitchChange("acceptReserveNowPayInHotel", value)
							}
						/>
					</div>
				</div>

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
