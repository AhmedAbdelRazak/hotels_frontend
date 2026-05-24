import React, { useState, useEffect } from "react";
import { Form, Input, Button, Typography, Select } from "antd";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import { PropertySignup } from "../../HotelModule/apiAdmin";
import styled from "styled-components";
import {
	UserOutlined,
	MailOutlined,
	HomeOutlined,
	LockOutlined,
} from "@ant-design/icons";
import { gettingAllHotelAccounts } from "../apiAdmin";

const { Title } = Typography;
const { Option } = Select;

const selectPopupContainer = (triggerNode) => {
	const modalContent = triggerNode?.closest?.(".ant-modal-content");
	if (modalContent) return modalContent;
	if (triggerNode?.parentElement) return triggerNode.parentElement;
	return typeof document !== "undefined" ? document.body : triggerNode;
};

const selectPopupProps = {
	getPopupContainer: selectPopupContainer,
	dropdownStyle: { zIndex: 22000 },
	popupClassName: "admin-add-hotel-select-dropdown",
};

const AddHotelForm = ({ closeAddHotelModal }) => {
	const [step, setStep] = useState(1); // Step 1: Choose Option, Step 2: Choose user or show form
	const [hotelData, setHotelData] = useState({
		hotelName: "",
		hotelCountry: "",
		hotelState: "",
		hotelCity: "",
		phone: "",
		hotelAddress: "",
		hotelFloors: "",
		propertyType: "",
		name: "",
		email: "",
		password: "",
		password2: "",
		existingUser: null,
	});
	const [hotelAccounts, setHotelAccounts] = useState([]); // State to store fetched hotel accounts

	const { user, token } = isAuthenticated(); // Get the authenticated user

	// Fetching hotel accounts when "New Hotel To Existing User" is selected
	useEffect(() => {
		if (step === 2) {
			gettingAllHotelAccounts(user._id, token)
				.then((data) => {
					if (data.error) {
						toast.error(data.error);
					} else {
						setHotelAccounts(data);
					}
				})
				.catch((err) => toast.error("Failed to fetch hotel accounts"));
		}
	}, [step, user._id, token]);

	const handleChange = (name) => (event) => {
		const value = event.target ? event.target.value : event;
		setHotelData({ ...hotelData, [name]: value });
	};

	const handleStepChange = (value) => {
		if (value === "existing") {
			setStep(2);
		} else if (value === "new") {
			setHotelData({ ...hotelData, existingUser: null });
			setStep(3);
		}
	};

	const handleUserSelection = (value) => {
		setHotelData({ ...hotelData, existingUser: value });
		setStep(4);
	};

	const handleSubmit = async () => {
		try {
			const response = await PropertySignup({
				...hotelData,
				existingUser: hotelData.existingUser,
			});
			if (response.error) {
				toast.error(response.error);
			} else {
				toast.success(`Hotel ${hotelData.hotelName} was successfully added`);
				closeAddHotelModal();
				setTimeout(() => {
					window.location.reload();
				}, 2000);
			}
		} catch (error) {
			toast.error("Error adding hotel: " + error.message);
		}
	};

	return (
		<>
			<Form layout='vertical'>
				<Title level={5}>Choose Option</Title>
				<Form.Item label='Please select one'>
					<Select
						{...selectPopupProps}
						onChange={handleStepChange}
						placeholder='Select an option'
					>
						<Option value='existing'>New Hotel To Existing User</Option>
						<Option value='new'>New Hotel</Option>
					</Select>
				</Form.Item>
			</Form>

			{(step === 2 || step === 4) && (
				<Form layout='vertical'>
					<Title level={5}>Choose Existing User</Title>
					<Form.Item label='Select a user'>
						<Select
							{...selectPopupProps}
							onChange={handleUserSelection}
							value={hotelData.existingUser} // Ensure the selected option doesn't disappear
							placeholder='Select a user'
						>
							{hotelAccounts.map((account) => (
								<Option key={account._id} value={account._id}>
									{account.name} | {account.email}
								</Option>
							))}
						</Select>
					</Form.Item>
				</Form>
			)}

			{(step === 3 || step === 4) && (
				<Form onFinish={handleSubmit} layout='vertical'>
					<Title level={3}>Add New Property</Title>

					{hotelData.existingUser === null && (
						<>
							<Form.Item
								name='name'
								label='User Name (Manager/ Owner/ Agent)'
								required
							>
								<Input
									prefix={<UserOutlined />}
									value={hotelData.name}
									onChange={handleChange("name")}
									placeholder='Full Name'
								/>
							</Form.Item>
							<Form.Item name='email' label='Email Address' required>
								<Input
									prefix={<MailOutlined />}
									value={hotelData.email}
									onChange={handleChange("email")}
									placeholder='Email'
								/>
							</Form.Item>
							<Form.Item name='password' label='Password' required>
								<Input.Password
									prefix={<LockOutlined />}
									value={hotelData.password}
									onChange={handleChange("password")}
									placeholder='Password'
								/>
							</Form.Item>
							<Form.Item name='password2' label='Confirm Password' required>
								<Input.Password
									prefix={<LockOutlined />}
									value={hotelData.password2}
									onChange={handleChange("password2")}
									placeholder='Confirm Password'
								/>
							</Form.Item>
						</>
					)}

					<Form.Item label='Hotel Name' required>
						<Input
							prefix={<HomeOutlined />}
							value={hotelData.hotelName}
							onChange={handleChange("hotelName")}
							placeholder='Hotel Name'
						/>
					</Form.Item>
					<Form.Item label='Country' required>
						<Input
							value={hotelData.hotelCountry}
							onChange={handleChange("hotelCountry")}
							placeholder='Country'
						/>
					</Form.Item>
					<Form.Item label='State' required>
						<Input
							value={hotelData.hotelState}
							onChange={handleChange("hotelState")}
							placeholder='State'
						/>
					</Form.Item>
					<Form.Item label='City' required>
						<Input
							value={hotelData.hotelCity}
							onChange={handleChange("hotelCity")}
							placeholder='City'
						/>
					</Form.Item>
					<Form.Item label='Phone' required>
						<Input
							value={hotelData.phone}
							onChange={handleChange("phone")}
							placeholder='Phone'
						/>
					</Form.Item>
					<Form.Item label='Address' required>
						<Input
							value={hotelData.hotelAddress}
							onChange={handleChange("hotelAddress")}
							placeholder='Address'
						/>
					</Form.Item>
					<Form.Item label='Number of Floors' required>
						<Input
							value={hotelData.hotelFloors}
							onChange={handleChange("hotelFloors")}
							placeholder='Number of Floors'
						/>
					</Form.Item>
					<Form.Item label='Property Type' required>
						<Select
							{...selectPopupProps}
							value={hotelData.propertyType}
							onChange={handleChange("propertyType")}
							placeholder='Select Property Type'
						>
							<Option value='Hotel'>Hotel</Option>
							<Option value='Apartments'>Apartments</Option>
							<Option value='Houses'>Houses</Option>
						</Select>
					</Form.Item>
					<Form.Item>
						<StyledButton type='primary' htmlType='submit'>
							Add Hotel
						</StyledButton>
					</Form.Item>
				</Form>
			)}
		</>
	);
};

export default AddHotelForm;

const StyledButton = styled(Button)`
	background-color: var(--button-bg-primary);
	border-color: var(--button-bg-primary);
	color: var(--button-font-color);
	&:hover,
	&:focus {
		background-color: var(--button-bg-primary-hover);
		border-color: var(--button-bg-primary-hover);
	}
`;
