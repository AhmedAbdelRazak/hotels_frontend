import React, { useState, useEffect } from "react";
import { Form, Input, Button, Typography, Select, Tabs, message } from "antd";
import styled from "styled-components";
import { toast } from "react-toastify";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const EditHotelForm = ({
	closeEditHotelModal,
	hotelData,
	updateHotelDetails,
	gettingHotelData,
	token,
	userId,
	currentUser, // e.g. from isAuthenticated() or passed in as prop
}) => {
	// ---- HOTEL FORM STATE & HOOKS ----
	const [formHotel] = Form.useForm();
	const [hotel, setHotel] = useState(hotelData);

	// ---- USER ACCOUNT (belongsTo) FORM STATE & HOOKS ----
	const [formUser] = Form.useForm();
	const [ownerUser, setOwnerUser] = useState(hotelData.belongsTo || {});

	// On mount or when hotelData changes, populate states & form fields
	useEffect(() => {
		setHotel(hotelData);
		formHotel.setFieldsValue(hotelData);

		setOwnerUser(hotelData.belongsTo || {});
		formUser.setFieldsValue({
			name: hotelData.belongsTo?.name || "",
			email: hotelData.belongsTo?.email || "",
			password: "",
			password2: "",
		});
	}, [hotelData, formHotel, formUser]);

	// ---- HANDLERS FOR HOTEL DETAILS UPDATE ----
	const handleHotelChange = (fieldName) => (eventOrValue) => {
		const value = eventOrValue?.target
			? eventOrValue.target.value
			: eventOrValue;
		setHotel({ ...hotel, [fieldName]: value });
	};

	const handleSubmitHotel = async () => {
		try {
			const response = await updateHotelDetails(
				hotel._id,
				userId,
				token,
				hotel
			);
			if (response.error) {
				toast.error(response.error);
			} else {
				toast.success(`Hotel ${hotel.hotelName} was successfully updated`);
				gettingHotelData();
				closeEditHotelModal();
				// If you want to force a reload after some time
				window.setTimeout(() => {
					window.location.reload();
				}, 1500);
			}
		} catch (error) {
			toast.error("Error updating hotel: " + error.message);
		}
	};

	// ---- HANDLERS FOR BELONGSTO (OWNER) USER UPDATE ----
	const handleSubmitUser = async (values) => {
		try {
			const { name, email, password, password2 } = values;
			console.log("Form values =>", values);

			if (password !== password2) {
				console.log("Passwords do not match =>", password, password2);
				return message.error("Passwords do not match!");
			}

			// "belongsToId" is the user we want to update
			const belongsToId = hotelData?.belongsTo?._id || hotelData?.belongsTo;
			if (!belongsToId) {
				console.log("No valid belongsTo user found on this hotel!");
				return message.error("No valid belongsTo user found on this hotel!");
			}

			// As an admin (role=1000), the route is:
			//    PUT /user/:belongsToId/:adminId
			// The first param is the user to update, the second param is the admin user ID
			const adminId = currentUser?._id; // The currently logged-in admin making the request
			const url = `${process.env.REACT_APP_API_URL}/user/${belongsToId}/${adminId}`;

			// Match the payload structure from TopNavbar for admin:
			// { name, email, password, userId: belongsToId }
			const payload = {
				name,
				email,
				password,
				userId: belongsToId,
			};
			console.log("Constructed payload =>", payload);
			console.log("Final URL =>", url);

			const config = {
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			};
			console.log("Request config =>", config);

			// ---- Make the PUT request ----
			console.log("About to call axios.put...");
			const response = await axios.put(url, payload, config);
			console.log("Server response =>", response.data);

			message.success("Owner user updated successfully!");

			// Optionally update local state or re-fetch hotel data
			setOwnerUser((prev) => ({ ...prev, name, email }));
		} catch (error) {
			console.error("Error updating belongsTo user:", error);

			// Additional logs of error/response for debugging:
			if (error?.response) {
				console.log("error.response.status =>", error.response.status);
				console.log("error.response.data =>", error.response.data);
			} else {
				console.log(
					"No server response, possible network error or early logic exit."
				);
			}

			message.error(
				error?.response?.data?.error || "Something went wrong updating user"
			);
		}
	};

	return (
		<Tabs defaultActiveKey='1'>
			{/* ====== TAB 1: HOTEL DETAILS ====== */}
			<TabPane tab='Hotel Details' key='1'>
				<Form
					form={formHotel}
					onFinish={handleSubmitHotel}
					layout='vertical'
					style={{ marginTop: "1rem" }}
				>
					<Title level={3}>Edit Property</Title>

					<Form.Item
						label='Hotel Name'
						name='hotelName'
						rules={[{ required: true }]}
					>
						<Input
							value={hotel.hotelName}
							onChange={handleHotelChange("hotelName")}
							placeholder='Hotel Name'
						/>
					</Form.Item>

					<Form.Item
						label='Hotel Name (Arabic)'
						name='hotelName_OtherLanguage'
						rules={[{ required: true }]}
					>
						<Input
							value={hotel.hotelName_OtherLanguage}
							onChange={handleHotelChange("hotelName_OtherLanguage")}
							placeholder='Hotel Name In Arabic'
						/>
					</Form.Item>

					<Form.Item
						label='Country'
						name='hotelCountry'
						rules={[{ required: true }]}
					>
						<Input
							value={hotel.hotelCountry}
							onChange={handleHotelChange("hotelCountry")}
							placeholder='Country'
						/>
					</Form.Item>

					<Form.Item
						label='State'
						name='hotelState'
						rules={[{ required: true }]}
					>
						<Input
							value={hotel.hotelState}
							onChange={handleHotelChange("hotelState")}
							placeholder='State'
						/>
					</Form.Item>

					<Form.Item label='City' name='hotelCity' rules={[{ required: true }]}>
						<Input
							value={hotel.hotelCity}
							onChange={handleHotelChange("hotelCity")}
							placeholder='City'
						/>
					</Form.Item>

					<Form.Item label='Phone' name='phone' rules={[{ required: true }]}>
						<Input
							value={hotel.phone}
							onChange={handleHotelChange("phone")}
							placeholder='Phone'
						/>
					</Form.Item>

					<Form.Item
						label='Address'
						name='hotelAddress'
						rules={[{ required: true }]}
					>
						<Input
							value={hotel.hotelAddress}
							onChange={handleHotelChange("hotelAddress")}
							placeholder='Address'
						/>
					</Form.Item>

					<Form.Item
						label='Hotel Rating'
						name='hotelRating'
						rules={[
							{ required: true, message: "Hotel rating is required" },
							{
								type: "number",
								min: 1,
								max: 5,
								transform: (value) => Number(value),
								message: "Please enter a number between 1 and 5",
							},
						]}
					>
						<Input
							value={hotel.hotelRating}
							onChange={handleHotelChange("hotelRating")}
							placeholder='Add A Number From 1 to 5'
							type='number'
						/>
					</Form.Item>

					<Form.Item
						label='Number of Floors'
						name='hotelFloors'
						rules={[{ required: true }]}
					>
						<Input
							value={hotel.hotelFloors}
							onChange={handleHotelChange("hotelFloors")}
							placeholder='Number of Floors'
						/>
					</Form.Item>

					<Form.Item
						label='Commission (Only Numbers e.g. 10, 15, 20...)'
						name='commission'
						rules={[{ required: true }]}
					>
						<Input
							value={hotel.commission}
							onChange={handleHotelChange("commission")}
							placeholder='Commission: Only Numbers'
						/>
					</Form.Item>

					<Form.Item
						label='Property Type'
						name='propertyType'
						rules={[{ required: true }]}
					>
						<Select
							value={hotel.propertyType}
							onChange={(val) =>
								handleHotelChange("propertyType")({ target: { value: val } })
							}
							placeholder='Select Property Type'
						>
							<Option value='Hotel'>Hotel</Option>
							<Option value='Apartments'>Apartments</Option>
							<Option value='Houses'>Houses</Option>
						</Select>
					</Form.Item>

					<Form.Item>
						<StyledButton type='primary' htmlType='submit'>
							Update Hotel
						</StyledButton>
					</Form.Item>
				</Form>
			</TabPane>

			{/* ====== TAB 2: USER ACCOUNT (BELONGSTO) DETAILS ====== */}
			<TabPane tab='Owner Account' key='2'>
				<Form
					form={formUser}
					onFinish={handleSubmitUser}
					layout='vertical'
					style={{ marginTop: "1rem" }}
					initialValues={{
						name: ownerUser.name || "",
						email: ownerUser.email || "",
						password: "",
						password2: "",
					}}
				>
					<Title level={3}>Owner/Manager Account</Title>

					<Form.Item
						label='Name'
						name='name'
						rules={[
							{ required: true, message: "Please enter the owner's name" },
						]}
					>
						<Input prefix={<UserOutlined />} placeholder='Full Name' />
					</Form.Item>

					<Form.Item
						label='Email Address'
						name='email'
						rules={[
							{ required: true, message: "Please enter the owner's email" },
						]}
					>
						<Input prefix={<MailOutlined />} placeholder='Email' />
					</Form.Item>

					<Form.Item
						label='Password'
						name='password'
						rules={[{ required: true, message: "Please enter a password" }]}
					>
						<Input.Password prefix={<LockOutlined />} placeholder='Password' />
					</Form.Item>

					<Form.Item
						label='Confirm Password'
						name='password2'
						dependencies={["password"]}
						rules={[
							{ required: true, message: "Please confirm your password" },
							// Optional direct check:
							// ({ getFieldValue }) => ({
							//   validator(_, value) {
							//     if (!value || getFieldValue('password') === value) {
							//       return Promise.resolve();
							//     }
							//     return Promise.reject(new Error('Passwords do not match!'));
							//   },
							// }),
						]}
					>
						<Input.Password
							prefix={<LockOutlined />}
							placeholder='Confirm Password'
						/>
					</Form.Item>

					<Form.Item>
						<StyledButton type='primary' htmlType='submit'>
							Update Owner
						</StyledButton>
					</Form.Item>
				</Form>
			</TabPane>
		</Tabs>
	);
};

export default EditHotelForm;

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
