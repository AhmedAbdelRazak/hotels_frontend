import React, { useState } from "react";
import { Form, Input, Button, Select } from "antd";
import { toast } from "react-toastify";
import { isAuthenticated } from "../auth"; // Import the authentication method
import { PropertySignup } from "./apiAdmin"; // Import the API method
import styled from "styled-components";

const { Option } = Select;

const FORM_TEXT = {
	English: {
		hotelName: "Hotel Name",
		country: "Country",
		state: "State",
		city: "City",
		phone: "Phone",
		address: "Address",
		floors: "Number of Floors",
		propertyType: "Property Type",
		selectPropertyType: "Select Property Type",
		propertyTypes: {
			Hotel: "Hotel",
			Apartments: "Apartments",
			Houses: "Houses",
		},
		submit: "Add Hotel",
		success: (hotelName) => `Hotel ${hotelName} was successfully added`,
		error: (message) => `Error adding hotel: ${message}`,
	},
	Arabic: {
		hotelName: "اسم الفندق",
		country: "الدولة",
		state: "المنطقة",
		city: "المدينة",
		phone: "الهاتف",
		address: "العنوان",
		floors: "عدد الطوابق",
		propertyType: "نوع المنشأة",
		selectPropertyType: "اختر نوع المنشأة",
		propertyTypes: {
			Hotel: "فندق",
			Apartments: "شقق",
			Houses: "منازل",
		},
		submit: "إضافة الفندق",
		success: () => "تمت إضافة الفندق بنجاح",
		error: (message) => `تعذر إضافة الفندق: ${message}`,
	},
};

const AddHotelForm = ({ closeAddHotelModal, chosenLanguage = "English" }) => {
	const isArabic = chosenLanguage === "Arabic";
	const text = FORM_TEXT[isArabic ? "Arabic" : "English"];
	const [hotelData, setHotelData] = useState({
		hotelName: "",
		hotelCountry: "",
		hotelState: "",
		hotelCity: "",
		phone: "",
		hotelAddress: "",
		hotelFloors: "",
		propertyType: "", // Added propertyType field
	});

	const { user } = isAuthenticated(); // Get the authenticated user

	const handleChange = (name) => (event) => {
		const value = event.target ? event.target.value : event;
		setHotelData({ ...hotelData, [name]: value });
	};

	const handleSubmit = async () => {
		try {
			const response = await PropertySignup({
				...hotelData,
				existingUser: user ? user._id : null, // Pass the user ID if the user is authenticated
			});
			if (response.error) {
				toast.error(isArabic ? text.error(response.error) : response.error);
			} else {
				toast.success(text.success(hotelData.hotelName));
				closeAddHotelModal(); // Close the modal after successful submission
				setTimeout(() => {
					window.location.reload();
				}, 2000); // Refresh the page after 2 seconds
			}
		} catch (error) {
			toast.error(text.error(error.message));
		}
	};

	return (
		<FormShell dir={isArabic ? "rtl" : "ltr"} $isArabic={isArabic}>
			<Form onFinish={handleSubmit} layout='vertical'>
				<Form.Item label={text.hotelName} required>
					<Input
						value={hotelData.hotelName}
						onChange={handleChange("hotelName")}
						placeholder={text.hotelName}
					/>
				</Form.Item>
				<Form.Item label={text.country} required>
					<Input
						value={hotelData.hotelCountry}
						onChange={handleChange("hotelCountry")}
						placeholder={text.country}
					/>
				</Form.Item>
				<Form.Item label={text.state} required>
					<Input
						value={hotelData.hotelState}
						onChange={handleChange("hotelState")}
						placeholder={text.state}
					/>
				</Form.Item>
				<Form.Item label={text.city} required>
					<Input
						value={hotelData.hotelCity}
						onChange={handleChange("hotelCity")}
						placeholder={text.city}
					/>
				</Form.Item>
				<Form.Item label={text.phone} required>
					<Input
						value={hotelData.phone}
						onChange={handleChange("phone")}
						placeholder={text.phone}
					/>
				</Form.Item>
				<Form.Item label={text.address} required>
					<Input
						value={hotelData.hotelAddress}
						onChange={handleChange("hotelAddress")}
						placeholder={text.address}
					/>
				</Form.Item>
				<Form.Item label={text.floors} required>
					<Input
						value={hotelData.hotelFloors}
						onChange={handleChange("hotelFloors")}
						placeholder={text.floors}
					/>
				</Form.Item>
				<Form.Item label={text.propertyType} required>
					<Select
						value={hotelData.propertyType || undefined}
						onChange={handleChange("propertyType")}
						placeholder={text.selectPropertyType}
					>
						<Option value='Hotel'>{text.propertyTypes.Hotel}</Option>
						<Option value='Apartments'>{text.propertyTypes.Apartments}</Option>
						<Option value='Houses'>{text.propertyTypes.Houses}</Option>
					</Select>
				</Form.Item>
				<Form.Item className='submit-row'>
					<StyledButton type='primary' htmlType='submit'>
						{text.submit}
					</StyledButton>
				</Form.Item>
			</Form>
		</FormShell>
	);
};

export default AddHotelForm;

const StyledButton = styled(Button)`
	background-color: var(--button-bg-primary);
	border-color: var(--button-bg-primary);
	color: var(--button-font-color);
	min-height: 42px;
	font-weight: 800;
	&:hover,
	&:focus {
		background-color: var(--button-bg-primary-hover);
		border-color: var(--button-bg-primary-hover);
	}
`;

const FormShell = styled.div`
	direction: ${(p) => (p.$isArabic ? "rtl" : "ltr")};

	.ant-form {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		column-gap: 14px;
	}

	.ant-form-item {
		margin-bottom: 14px;
	}

	.ant-form-item-label {
		text-align: ${(p) => (p.$isArabic ? "right" : "left")};
		font-weight: 800;
	}

	.ant-input,
	.ant-select-selector {
		min-height: 40px;
	}

	.submit-row {
		grid-column: 1 / -1;
		margin-bottom: 0;
	}

	.submit-row .ant-form-item-control-input-content {
		display: flex;
		justify-content: ${(p) => (p.$isArabic ? "flex-start" : "flex-end")};
	}

	@media (max-width: 640px) {
		.ant-form {
			grid-template-columns: 1fr;
		}

		.submit-row .ant-form-item-control-input-content,
		.submit-row button {
			width: 100%;
		}
	}
`;
