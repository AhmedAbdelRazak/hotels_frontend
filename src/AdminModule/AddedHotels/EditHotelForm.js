/** @format
 * EditHotelForm – drop‑in replacement
 */

import React, { useState, useEffect, useMemo } from "react";
import { Form, Input, Button, Typography, Select, Tabs, message } from "antd";
import styled from "styled-components";
import axios from "axios";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
import { isAuthenticated } from "../../auth";

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const EditHotelForm = ({
	closeEditHotelModal,
	hotelData,
	updateHotelDetails, // (hotelId, userId, token, hotelPayload)
	token: tokenProp, // optional; will fallback to isAuthenticated()
	userId: adminIdProp, // optional; will fallback to isAuthenticated()
	refreshList, // optional callback to refresh table
	gettingHotelData, // kept for back-compat; if provided, will be called
}) => {
	/* ==== Auth fallback ==== */
	const auth = isAuthenticated?.();
	const token = tokenProp || auth?.token || null;
	const adminId = adminIdProp || auth?.user?._id || null;

	/* ==== HOTEL FORM STATE ==== */
	const [formHotel] = Form.useForm();
	const [hotel, setHotel] = useState(hotelData);

	/* ==== OWNER (belongsTo) FORM STATE ==== */
	const [formUser] = Form.useForm();
	const belongsToId = useMemo(
		() => hotelData?.belongsTo?._id || hotelData?.belongsTo || null,
		[hotelData]
	);
	const initialOwner = useMemo(
		() => ({
			name: hotelData?.belongsTo?.name || "",
			email: hotelData?.belongsTo?.email || "",
			password: "",
			password2: "",
		}),
		[hotelData]
	);

	useEffect(() => {
		setHotel(hotelData);
		formHotel.setFieldsValue(hotelData);
		formUser.setFieldsValue(initialOwner);
	}, [hotelData, formHotel, formUser, initialOwner]);

	/* =================== HOTEL: submit =================== */
	const handleHotelChange = (fieldName) => (eventOrValue) => {
		const value = eventOrValue?.target
			? eventOrValue.target.value
			: eventOrValue;
		setHotel((h) => ({ ...h, [fieldName]: value }));
	};

	const handleSubmitHotel = async () => {
		if (!token || !adminId) {
			return message.error("Missing admin authentication");
		}
		try {
			const res = await updateHotelDetails(hotel._id, adminId, token, hotel);
			if (res?.error) throw new Error(res.error);
			message.success(`Hotel “${hotel.hotelName}” updated`);
			if (typeof refreshList === "function") refreshList();
			if (typeof gettingHotelData === "function") gettingHotelData();
			closeEditHotelModal?.();
		} catch (e) {
			message.error(e?.message || "Error updating hotel");
		}
	};

	/* =================== OWNER: submit =================== */
	const handleSubmitUser = async (values) => {
		if (!belongsToId) {
			return message.error("No owner user found on this property");
		}
		if (!token || !adminId) {
			return message.error("Missing admin authentication");
		}

		const { name, email, password, password2 } = values;

		// Send only changed fields
		const updatePayload = {};
		if (name && name !== initialOwner.name) updatePayload.name = name;
		if (email && email !== initialOwner.email) updatePayload.email = email;

		// Password optional — only send if present
		if (password || password2) {
			if (password !== password2) {
				return message.error("Passwords do not match");
			}
			updatePayload.password = password;
		}

		if (Object.keys(updatePayload).length === 0) {
			return message.info("Nothing to update");
		}

		try {
			const url = `${process.env.REACT_APP_API_URL}/user/${belongsToId}/${adminId}`;
			// eslint-disable-next-line
			const { data } = await axios.put(url, updatePayload, {
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			// success
			message.success("Owner account updated");
			// Update local displayed owner fields
			formUser.setFieldsValue({
				...values,
				password: "",
				password2: "",
			});
			// Optionally refresh table/list
			if (typeof refreshList === "function") refreshList();

			// Update in-memory hotelData (owner name/email shown in table)
			if (hotel?.belongsTo) {
				setHotel((h) => ({
					...h,
					belongsTo: {
						...(typeof h.belongsTo === "object" ? h.belongsTo : {}),
						name: updatePayload.name || h.belongsTo?.name,
						email: updatePayload.email || h.belongsTo?.email,
					},
				}));
			}
		} catch (err) {
			const apiMsg =
				err?.response?.data?.error ||
				err?.response?.data?.message ||
				err?.message ||
				"Update failed";
			message.error(apiMsg);
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
							value={hotel?.hotelName}
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
							value={hotel?.hotelName_OtherLanguage}
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
							value={hotel?.hotelCountry}
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
							value={hotel?.hotelState}
							onChange={handleHotelChange("hotelState")}
							placeholder='State'
						/>
					</Form.Item>

					<Form.Item label='City' name='hotelCity' rules={[{ required: true }]}>
						<Input
							value={hotel?.hotelCity}
							onChange={handleHotelChange("hotelCity")}
							placeholder='City'
						/>
					</Form.Item>

					<Form.Item label='Phone' name='phone' rules={[{ required: true }]}>
						<Input
							value={hotel?.phone}
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
							value={hotel?.hotelAddress}
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
							value={hotel?.hotelRating}
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
							value={hotel?.hotelFloors}
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
							value={hotel?.commission}
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
							value={hotel?.propertyType}
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

			{/* ====== TAB 2: OWNER ACCOUNT ====== */}
			<TabPane tab='Owner Account' key='2'>
				<Form
					form={formUser}
					onFinish={handleSubmitUser}
					layout='vertical'
					style={{ marginTop: "1rem" }}
					initialValues={initialOwner}
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
							{ type: "email", message: "Invalid email address" },
						]}
					>
						<Input prefix={<MailOutlined />} placeholder='Email' />
					</Form.Item>

					<Form.Item
						label='Password'
						name='password'
						rules={[
							({ getFieldValue }) => ({
								validator(_, value) {
									if (!value || value.length >= 6) return Promise.resolve();
									return Promise.reject(
										new Error("Password should be min 6 characters long")
									);
								},
							}),
						]}
					>
						<Input.Password
							prefix={<LockOutlined />}
							placeholder='(leave empty to keep unchanged)'
						/>
					</Form.Item>

					<Form.Item
						label='Confirm Password'
						name='password2'
						dependencies={["password"]}
						rules={[
							({ getFieldValue }) => ({
								validator(_, value) {
									const pwd = getFieldValue("password");
									if (!pwd && !value) return Promise.resolve(); // both empty
									if (pwd && value === pwd) return Promise.resolve();
									return Promise.reject(new Error("Passwords do not match"));
								},
							}),
						]}
					>
						<Input.Password
							prefix={<LockOutlined />}
							placeholder='Confirm Password'
						/>
					</Form.Item>

					<Form.Item>
						<StyledButton
							type='primary'
							htmlType='submit'
							disabled={!belongsToId}
						>
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
