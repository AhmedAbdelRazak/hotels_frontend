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
