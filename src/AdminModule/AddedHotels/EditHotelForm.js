import React, { useState, useEffect } from "react";
import { Form, Input, Button, Typography, Select } from "antd";
import styled from "styled-components";
import { toast } from "react-toastify";

const { Title } = Typography;
const { Option } = Select;

const EditHotelForm = ({
	closeEditHotelModal,
	hotelData,
	updateHotelDetails,
	gettingHotelData,
	token,
	userId,
}) => {
	const [form] = Form.useForm();
	const [hotel, setHotel] = useState(hotelData);

	console.log(hotelData, "hotelData");
	useEffect(() => {
		setHotel(hotelData);
		form.setFieldsValue(hotelData);
	}, [hotelData, form]);

	const handleChange = (name) => (event) => {
		const value = event.target ? event.target.value : event;
		setHotel({ ...hotel, [name]: value });
	};

	const handleSubmit = async () => {
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
				window.setTimeout(() => {
					window.location.reload();
				}, 1500);
			}
		} catch (error) {
			toast.error("Error updating hotel: " + error.message);
		}
	};

	return (
		<Form form={form} onFinish={handleSubmit} layout='vertical'>
			<Title level={3}>Edit Property</Title>
			<Form.Item
				label='Hotel Name'
				name='hotelName'
				rules={[{ required: true }]}
			>
				<Input
					value={hotel.hotelName}
					onChange={handleChange("hotelName")}
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
					onChange={handleChange("hotelName_OtherLanguage")}
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
					onChange={handleChange("hotelCountry")}
					placeholder='Country'
				/>
			</Form.Item>
			<Form.Item label='State' name='hotelState' rules={[{ required: true }]}>
				<Input
					value={hotel.hotelState}
					onChange={handleChange("hotelState")}
					placeholder='State'
				/>
			</Form.Item>
			<Form.Item label='City' name='hotelCity' rules={[{ required: true }]}>
				<Input
					value={hotel.hotelCity}
					onChange={handleChange("hotelCity")}
					placeholder='City'
				/>
			</Form.Item>
			<Form.Item label='Phone' name='phone' rules={[{ required: true }]}>
				<Input
					value={hotel.phone}
					onChange={handleChange("phone")}
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
					onChange={handleChange("hotelAddress")}
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
						transform: (value) => Number(value), // Transform the input to a number
						message: "Please enter a number between 1 and 5",
					},
				]}
			>
				<Input
					value={hotel.hotelRating}
					onChange={handleChange("hotelRating")}
					placeholder='Add A Number From 1 to 5'
					type='number' // Set input type to "number"
				/>
			</Form.Item>
			<Form.Item
				label='Number of Floors'
				name='hotelFloors'
				rules={[{ required: true }]}
			>
				<Input
					value={hotel.hotelFloors}
					onChange={handleChange("hotelFloors")}
					placeholder='Number of Floors'
				/>
			</Form.Item>
			<Form.Item
				label='Commission (Only Numbers e.g. 10, 15, 20, etc...)'
				name='commission'
				rules={[{ required: true }]}
			>
				<Input
					value={hotel.commission}
					onChange={handleChange("commission")}
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
					onChange={(value) =>
						handleChange("propertyType")({ target: { value } })
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
