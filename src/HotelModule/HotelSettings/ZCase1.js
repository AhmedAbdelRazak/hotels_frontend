import React, { useEffect, useState } from "react";
import {
	Form,
	Input,
	Select,
	Switch,
	Button,
	Modal,
	Table,
	InputNumber,
	Popconfirm,
	message,
	Radio,
	Checkbox,
} from "antd";
import styled from "styled-components";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { isAuthenticated } from "../../auth";

const { Option } = Select;

const ZCase1 = ({
	hotelDetails,
	setHotelDetails,
	chosenLanguage,
	roomTypes,
	setSelectedRoomType,
	amenitiesList,
	roomTypeSelected,
	setRoomTypeSelected,
	fromPage,
	setCustomRoomType,
	customRoomType,
	form,
	viewsList = [],
	extraAmenitiesList = [],
	getRoomColor,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isArabicModalVisible, setIsArabicModalVisible] = useState(false);
	const [arabicField, setArabicField] = useState(""); // 'name' or 'description'
	const [pricedExtrasData, setPricedExtrasData] = useState([]);
	const [editingKey, setEditingKey] = useState("");
	const [formPricedExtras] = Form.useForm();
	const [formArabic] = Form.useForm();
	const { user } = isAuthenticated();

	// Set default value for activeRoom to true when adding a new room
	useEffect(() => {
		if (fromPage !== "Updating") {
			form.setFieldsValue({ activeRoom: true });
		}
	}, [form, fromPage]);

	const handleOpenModal = () => {
		setIsModalVisible(true);
	};

	const handleModalOk = () => {
		const roomType =
			form.getFieldValue("roomType") === "other"
				? customRoomType
				: form.getFieldValue("roomType");

		setHotelDetails((prevDetails) => {
			const updatedRoomCountDetails = Array.isArray(
				prevDetails.roomCountDetails
			)
				? [...prevDetails.roomCountDetails]
				: [];

			const existingRoomIndex = updatedRoomCountDetails.findIndex(
				(room) => room.myKey === "ThisIsNewKey"
			);

			if (existingRoomIndex > -1) {
				updatedRoomCountDetails[existingRoomIndex].pricedExtras =
					pricedExtrasData.filter(
						(item) => item.name && item.price !== undefined
					);
			} else {
				updatedRoomCountDetails.push({
					roomType,
					pricedExtras: pricedExtrasData.filter(
						(item) => item.name && item.price !== undefined
					),
				});
			}

			return {
				...prevDetails,
				roomCountDetails: updatedRoomCountDetails,
			};
		});

		setIsModalVisible(false);
		message.success("Priced Extras updated successfully!");
	};

	const handleModalCancel = () => {
		setIsModalVisible(false);
		// Reset pricedExtrasData if needed
		if (fromPage !== "Updating") {
			setPricedExtrasData([]);
		}
	};

	const handleAddRow = () => {
		setPricedExtrasData([
			...pricedExtrasData,
			{ key: Date.now(), name: "", price: undefined, paymentFrequency: "" },
		]);
	};

	const handleDeleteRow = (key) => {
		setPricedExtrasData(pricedExtrasData.filter((item) => item.key !== key));
	};

	const isEditing = (record) => record.key === editingKey;

	const edit = (record) => {
		formPricedExtras.setFieldsValue({
			name: record.name || "",
			price: record.price || "",
			paymentFrequency: record.paymentFrequency || "",
		});
		setEditingKey(record.key);
	};

	const cancel = () => {
		setEditingKey("");
	};

	const save = async (key) => {
		try {
			const row = await formPricedExtras.validateFields();
			const newData = [...pricedExtrasData];
			const index = newData.findIndex((item) => item.key === key);

			if (index > -1) {
				const item = newData[index];
				newData.splice(index, 1, { ...item, ...row });
				setPricedExtrasData(newData);
				setEditingKey("");
			} else {
				newData.push(row);
				setPricedExtrasData(newData);
				setEditingKey("");
			}
		} catch (errInfo) {
			console.log("Validate Failed:", errInfo);
		}
	};

	const columns = [
		{
			title: "Name",
			dataIndex: "name",
			width: "30%",
			editable: true,
			render: (text, record) => {
				if (isEditing(record)) {
					return (
						<Form.Item
							name='name'
							style={{ margin: 0 }}
							rules={[
								{
									required: true,
									message: "Please Input Name!",
								},
							]}
						>
							<Input placeholder='Enter Name' />
						</Form.Item>
					);
				} else {
					return text;
				}
			},
		},
		{
			title: "Price",
			dataIndex: "price",
			width: "20%",
			editable: true,
			render: (text, record) => {
				if (isEditing(record)) {
					return (
						<Form.Item
							name='price'
							style={{ margin: 0 }}
							rules={[
								{
									required: true,
									message: "Please Input Price!",
								},
							]}
						>
							<InputNumber
								min={0}
								style={{ width: "100%" }}
								placeholder='Enter Price'
							/>
						</Form.Item>
					);
				} else {
					return text !== undefined ? `${text} SAR` : "";
				}
			},
		},
		{
			title: "Payment Frequency",
			dataIndex: "paymentFrequency",
			width: "30%",
			editable: true,
			render: (text, record) => {
				if (isEditing(record)) {
					return (
						<Form.Item
							name='paymentFrequency'
							style={{ margin: 0 }}
							rules={[
								{
									required: true,
									message: "Please select a payment frequency!",
								},
							]}
						>
							<Radio.Group>
								<Radio value='Per Night'>Per Night</Radio>
								<Radio value='One Time'>One Time</Radio>
							</Radio.Group>
						</Form.Item>
					);
				} else {
					return text || "";
				}
			},
		},
		{
			title: "Action",
			dataIndex: "action",
			render: (_, record) => {
				const editable = isEditing(record);
				return editable ? (
					<span>
						<Button
							onClick={() => save(record.key)}
							type='link'
							style={{ marginRight: 8 }}
						>
							Save
						</Button>
						<Popconfirm title='Sure to cancel?' onConfirm={cancel}>
							<Button type='link'>Cancel</Button>
						</Popconfirm>
					</span>
				) : (
					<span>
						<Button
							disabled={editingKey !== ""}
							onClick={() => edit(record)}
							type='link'
						>
							Edit
						</Button>
						<Popconfirm
							title='Sure to delete?'
							onConfirm={() => handleDeleteRow(record.key)}
						>
							<Button
								type='link'
								danger
								icon={<DeleteOutlined />}
								disabled={editingKey !== ""}
							/>
						</Popconfirm>
					</span>
				);
			},
		},
	];

	const mergedColumns = columns.map((col) => {
		if (!col.editable) {
			return col;
		}

		return {
			...col,
			onCell: (record) => ({
				record,
				inputType: col.dataIndex === "price" ? "number" : "text",
				dataIndex: col.dataIndex,
				title: col.title,
				editing: isEditing(record),
			}),
		};
	});

	const handleArabicModalOpen = (field) => {
		setArabicField(field);

		const existingRoomDetails = hotelDetails.roomCountDetails.find(
			(room) => room.myKey === "ThisIsNewKey"
		);

		if (existingRoomDetails) {
			const fieldName =
				field === "displayName"
					? "displayName_OtherLanguage"
					: "description_OtherLanguage";

			formArabic.setFieldsValue({
				arabicValue: existingRoomDetails[fieldName] || "",
			});
		}

		setIsArabicModalVisible(true);
	};

	const handleArabicModalOk = () => {
		const value = formArabic.getFieldValue("arabicValue");
		const fieldName =
			arabicField === "displayName"
				? "displayName_OtherLanguage"
				: "description_OtherLanguage";

		setHotelDetails((prevDetails) => {
			const updatedRoomCountDetails = [...prevDetails.roomCountDetails];
			const existingRoomIndex = updatedRoomCountDetails.findIndex(
				(room) => room.myKey === "ThisIsNewKey"
			);

			if (existingRoomIndex > -1) {
				updatedRoomCountDetails[existingRoomIndex][fieldName] = value;
			} else {
				updatedRoomCountDetails.push({
					[fieldName]: value,
					myKey: "ThisIsNewKey",
				});
			}

			return {
				...prevDetails,
				roomCountDetails: updatedRoomCountDetails,
			};
		});

		setIsArabicModalVisible(false);
		formArabic.resetFields();
	};

	const handleArabicModalCancel = () => {
		setIsArabicModalVisible(false);
		formArabic.resetFields();
	};

	const handleCheckboxChange = (checked) => {
		const roomType =
			form.getFieldValue("roomType") === "other"
				? customRoomType
				: form.getFieldValue("roomType");

		setHotelDetails((prevDetails) => {
			const updatedRoomCountDetails = Array.isArray(
				prevDetails.roomCountDetails
			)
				? [...prevDetails.roomCountDetails]
				: [];

			const existingRoomIndex = updatedRoomCountDetails.findIndex(
				(room) => room.myKey === "ThisIsNewKey"
			);

			if (existingRoomIndex > -1) {
				updatedRoomCountDetails[existingRoomIndex].commisionIncluded = checked;
			} else {
				updatedRoomCountDetails.push({
					roomType,
					commisionIncluded: checked,
				});
			}

			return {
				...prevDetails,
				roomCountDetails: updatedRoomCountDetails,
			};
		});
	};

	useEffect(() => {
		console.log("Updated hotelDetails:", hotelDetails);
	}, [hotelDetails]);

	const existingRoomDetails =
		hotelDetails &&
		hotelDetails.roomCountDetails.filter((i) => i.myKey === "ThisIsNewKey")[0];

	useEffect(() => {
		const existingRoomDetails = hotelDetails.roomCountDetails.find(
			(room) => room.myKey === "ThisIsNewKey"
		);

		if (existingRoomDetails) {
			form.setFieldsValue({
				displayName: existingRoomDetails.displayName || "",
				displayName_OtherLanguage:
					existingRoomDetails.displayName_OtherLanguage || "",
				description: existingRoomDetails.description || "",
				description_OtherLanguage:
					existingRoomDetails.description_OtherLanguage || "",
				roomType: existingRoomDetails.roomType || "",
				customRoomType: existingRoomDetails.customRoomType || "",
				roomCount: existingRoomDetails.count || 0,
				bedsCount: existingRoomDetails.bedsCount || 0,
				roomForGender: existingRoomDetails.roomForGender || "",
				defaultCost: existingRoomDetails.defaultCost || 0,
				basePrice: existingRoomDetails.price?.basePrice || 0,
				amenities: existingRoomDetails.amenities || [],
				extraAmenities: existingRoomDetails.extraAmenities || [],
				views: existingRoomDetails.views || [],
				activeRoom: existingRoomDetails.activeRoom || false,
				commisionIncluded: existingRoomDetails.commisionIncluded || false,
				roomCommission: existingRoomDetails.roomCommission || 0,
			});
		}
	}, [hotelDetails, form]);

	return (
		<ZCase1Wrapper
			isArabic={chosenLanguage === "Arabic"}
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
		>
			<Modal
				title={`Add ${
					arabicField === "displayName" ? "Name" : "Description"
				} in Arabic`}
				visible={isArabicModalVisible}
				onOk={handleArabicModalOk}
				onCancel={handleArabicModalCancel}
			>
				<Form form={formArabic} layout='vertical'>
					<Form.Item
						name='arabicValue'
						label={`${
							arabicField === "displayName" ? "Display Name" : "Description"
						} (Arabic)`}
						rules={[
							{ required: true, message: "Please enter the Arabic value" },
						]}
					>
						{arabicField === "displayName" ? <Input /> : <Input.TextArea />}
					</Form.Item>
				</Form>
			</Modal>
			<>
				<Form.Item
					name='roomType'
					label={
						chosenLanguage === "Arabic" ? "اختر نوع الغرفة" : "Select Room Type"
					}
					rules={[{ required: true, message: "Please select a room type" }]}
				>
					<Select
						onChange={(value) => {
							// If user selects "other", reset the customRoomType field
							if (value === "other") {
								form.setFieldsValue({ customRoomType: "" });
							}

							// Set the roomTypeSelected and selectedRoomType states
							setRoomTypeSelected(true);
							setSelectedRoomType(value);

							const roomType = value === "other" ? customRoomType : value;

							setHotelDetails((prevDetails) => {
								// Create a copy of the existing roomCountDetails array
								const updatedRoomCountDetails = Array.isArray(
									prevDetails.roomCountDetails
								)
									? [...prevDetails.roomCountDetails]
									: [];

								// Remove any object with roomType as undefined
								const filteredRoomCountDetails = updatedRoomCountDetails.filter(
									(room) => room.roomType !== undefined
								);

								// Define a new room object for the selected roomType
								const newRoomObject = {
									roomType,
									displayName: form.getFieldValue("displayName") || "",
									count: form.getFieldValue("roomCount") || 0,
									price: { basePrice: form.getFieldValue("basePrice") || 0 },
									description: form.getFieldValue("description") || "",
									amenities: form.getFieldValue("amenities") || [],
									extraAmenities: form.getFieldValue("extraAmenities") || [],
									views: form.getFieldValue("views") || [],
									activeRoom: form.getFieldValue("activeRoom") || false,
									commisionIncluded:
										form.getFieldValue("commisionIncluded") || false,
									roomCommission: form.getFieldValue("roomCommission") || 0,
									roomColor: getRoomColor(roomType), // Assign a color
									myKey: "ThisIsNewKey",
								};

								filteredRoomCountDetails.push(newRoomObject);

								// Return the updated hotelDetails state
								return {
									...prevDetails,
									roomCountDetails: filteredRoomCountDetails,
								};
							});
						}}
					>
						{roomTypes.map((room) => (
							<Option
								key={room.value}
								value={room.value}
								style={{
									textAlign: chosenLanguage === "Arabic" ? "right" : "",
									paddingRight: chosenLanguage === "Arabic" ? "20px" : "",
								}}
							>
								{room.label}
							</Option>
						))}
						<Option
							key='other'
							value='other'
							style={{
								textAlign: chosenLanguage === "Arabic" ? "right" : "",
								paddingRight: chosenLanguage === "Arabic" ? "20px" : "",
							}}
						>
							{chosenLanguage === "Arabic" ? "أخرى" : "Other"}
						</Option>
					</Select>
				</Form.Item>
				{form.getFieldValue("roomType") === "other" && (
					<Form.Item
						name='customRoomType'
						label={
							chosenLanguage === "Arabic"
								? "حدد نوع الغرفة الأخرى"
								: "Specify Other Room Type"
						}
						rules={[
							{ required: true, message: "Please specify the room type" },
						]}
					>
						<Input
							value={customRoomType}
							onChange={(e) => setCustomRoomType(e.target.value)}
						/>
					</Form.Item>
				)}

				{roomTypeSelected && (
					<>
						<Form.Item
							name='displayName'
							label={
								chosenLanguage === "Arabic"
									? "اسم العرض (الاسم المعروض للعملاء باللغة الإنجليزية)"
									: "Display Name (English)"
							}
							rules={[
								{
									required: true,
									message: "Please input the display name",
								},
							]}
						>
							<Input
								onChange={(e) => {
									const roomType =
										form.getFieldValue("roomType") === "other"
											? customRoomType
											: form.getFieldValue("roomType");

									setHotelDetails((prevDetails) => {
										const updatedRoomCountDetails = Array.isArray(
											prevDetails.roomCountDetails
										)
											? prevDetails.roomCountDetails
											: [];

										const existingRoomIndex = updatedRoomCountDetails.findIndex(
											(room) => room.myKey === "ThisIsNewKey"
										);

										if (existingRoomIndex > -1) {
											updatedRoomCountDetails[existingRoomIndex].displayName =
												e.target.value;
										} else {
											updatedRoomCountDetails.push({
												roomType,
												displayName: e.target.value,
											});
										}

										return {
											...prevDetails,
											roomCountDetails: updatedRoomCountDetails,
										};
									});
								}}
							/>
							<Button
								style={{
									marginLeft: "8px",
									fontWeight: "bold",
									fontSize: "small",
									color: "white",
									background: "black",
									marginBottom: "5px",
									marginTop: "5px",
								}}
								type='link'
								onClick={() => handleArabicModalOpen("displayName")}
							>
								Add Name In Arabic
							</Button>
						</Form.Item>

						<div className='row'>
							<div className='col-md-4'>
								<Form.Item
									name='roomCount'
									label={
										chosenLanguage === "Arabic" ? "عدد الغرف" : "Room Count"
									}
									rules={[
										{ required: true, message: "Please input the room count" },
									]}
								>
									<Input
										type='number'
										onChange={(e) => {
											const roomType =
												form.getFieldValue("roomType") === "other"
													? customRoomType
													: form.getFieldValue("roomType");

											setHotelDetails((prevDetails) => {
												const updatedRoomCountDetails = Array.isArray(
													prevDetails.roomCountDetails
												)
													? prevDetails.roomCountDetails
													: [];

												const existingRoomIndex =
													updatedRoomCountDetails.findIndex(
														(room) => room.myKey === "ThisIsNewKey"
													);

												if (existingRoomIndex > -1) {
													updatedRoomCountDetails[existingRoomIndex].count =
														parseInt(e.target.value, 10);
												} else {
													updatedRoomCountDetails.push({
														roomType,
														count: parseInt(e.target.value, 10),
													});
												}

												return {
													...prevDetails,
													roomCountDetails: updatedRoomCountDetails,
												};
											});
										}}
									/>
								</Form.Item>
							</div>
							{existingRoomDetails &&
							existingRoomDetails.roomType === "individualBed" ? (
								<>
									<div className='col-md-4'>
										<Form.Item
											name='bedsCount'
											label={
												chosenLanguage === "Arabic"
													? "عدد ٱلْأَسِرَّةُ لكل غرفة"
													: "Beds Per Room"
											}
											rules={[
												{
													required: true,
													message: "Please input the beds count per room",
												},
											]}
										>
											<Input
												type='number'
												onChange={(e) => {
													const selectedRoomId = form.getFieldValue("_id");

													setHotelDetails((prevDetails) => {
														const updatedRoomCountDetails = Array.isArray(
															prevDetails.roomCountDetails
														)
															? prevDetails.roomCountDetails
															: [];

														const existingRoomIndex =
															updatedRoomCountDetails.findIndex(
																(room) => room.myKey === "ThisIsNewKey"
															);

														if (existingRoomIndex > -1) {
															updatedRoomCountDetails[
																existingRoomIndex
															].bedsCount = parseInt(e.target.value, 10);
														} else {
															updatedRoomCountDetails.push({
																_id: selectedRoomId,
																bedsCount: parseInt(e.target.value, 10),
															});
														}

														return {
															...prevDetails,
															roomCountDetails: updatedRoomCountDetails,
														};
													});
												}}
											/>
										</Form.Item>
									</div>
									<div className='col-md-4'>
										<Form.Item
											name='roomForGender'
											label={
												chosenLanguage === "Arabic" ? "غرفة ل" : "Room For"
											}
											rules={[
												{
													required: true,
													message: "Please select the room's guest gender",
												},
											]}
										>
											<Select
												placeholder={
													chosenLanguage === "Arabic"
														? "اختر الغرفة لرجال أو نساء"
														: "Select For Men or Women"
												}
												onChange={(value) => {
													const selectedRoomId = form.getFieldValue("_id");

													setHotelDetails((prevDetails) => {
														const updatedRoomCountDetails = Array.isArray(
															prevDetails.roomCountDetails
														)
															? prevDetails.roomCountDetails
															: [];

														const existingRoomIndex =
															updatedRoomCountDetails.findIndex(
																(room) => room.myKey === "ThisIsNewKey"
															);

														if (existingRoomIndex > -1) {
															updatedRoomCountDetails[
																existingRoomIndex
															].roomForGender = value;
														} else {
															updatedRoomCountDetails.push({
																_id: selectedRoomId,
																roomForGender: value,
															});
														}

														return {
															...prevDetails,
															roomCountDetails: updatedRoomCountDetails,
														};
													});
												}}
											>
												<Select.Option value='For Men'>
													{chosenLanguage === "Arabic" ? "للرجال" : "For Men"}
												</Select.Option>
												<Select.Option value='For Women'>
													{chosenLanguage === "Arabic" ? "للنساء" : "For Women"}
												</Select.Option>
											</Select>
										</Form.Item>
									</div>
									\
								</>
							) : null}
						</div>

						<div className='row'>
							{/* Default Cost Input */}
							<div className='col-md-6'>
								<Form.Item
									name='defaultCost'
									label={
										chosenLanguage === "Arabic"
											? "التكلفة الجذرية"
											: "Root Cost"
									}
									rules={[
										{
											required: true,
											message:
												chosenLanguage === "Arabic"
													? "يرجى إدخال التكلفة الجذرية"
													: "Please input the root cost",
										},
									]}
								>
									<Input
										type='number'
										onChange={(e) => {
											const selectedRoomId = form.getFieldValue("_id");

											setHotelDetails((prevDetails) => {
												const updatedRoomCountDetails = Array.isArray(
													prevDetails.roomCountDetails
												)
													? prevDetails.roomCountDetails
													: [];

												const existingRoomIndex =
													updatedRoomCountDetails.findIndex(
														(room) => room.myKey === "ThisIsNewKey"
													);

												if (existingRoomIndex > -1) {
													updatedRoomCountDetails[
														existingRoomIndex
													].defaultCost = parseFloat(e.target.value);
												} else {
													updatedRoomCountDetails.push({
														_id: selectedRoomId,
														defaultCost: parseFloat(e.target.value),
													});
												}

												return {
													...prevDetails,
													roomCountDetails: updatedRoomCountDetails,
												};
											});
										}}
									/>
								</Form.Item>
							</div>

							{/* Base Price Input */}
							<div className='col-md-6'>
								<Form.Item
									name='basePrice'
									label={
										chosenLanguage === "Arabic"
											? "سعر الغرفة الأساسي"
											: "Base Room Price"
									}
									rules={[
										{
											required: true,
											message:
												chosenLanguage === "Arabic"
													? "يرجى إدخال سعر الغرفة الأساسي"
													: "Please input the base room price",
										},
									]}
								>
									<Input
										type='number'
										onChange={(e) => {
											const selectedRoomId = form.getFieldValue("_id");

											setHotelDetails((prevDetails) => {
												const updatedRoomCountDetails = Array.isArray(
													prevDetails.roomCountDetails
												)
													? prevDetails.roomCountDetails
													: [];

												const existingRoomIndex =
													updatedRoomCountDetails.findIndex(
														(room) => room.myKey === "ThisIsNewKey"
													);

												if (existingRoomIndex > -1) {
													updatedRoomCountDetails[existingRoomIndex].price = {
														basePrice: parseFloat(e.target.value),
													};
												} else {
													updatedRoomCountDetails.push({
														_id: selectedRoomId,
														price: { basePrice: parseFloat(e.target.value) },
													});
												}

												return {
													...prevDetails,
													roomCountDetails: updatedRoomCountDetails,
												};
											});
										}}
									/>
								</Form.Item>
							</div>
						</div>

						<Form.Item className='mb-4'>
							{user && user.role === 1000 ? (
								<div className='row'>
									{/* Include commission checkbox */}
									<div className='col-md-2 my-auto'>
										<Checkbox
											onChange={(e) => handleCheckboxChange(e.target.checked)}
											checked={form.getFieldValue("commisionIncluded")}
										>
											{chosenLanguage === "Arabic"
												? "العمولة"
												: "Include Commission"}
										</Checkbox>
									</div>

									{/* Commission rate input field */}
									<div className='col-md-6'>
										<Form.Item
											name='roomCommission'
											label={
												chosenLanguage === "Arabic"
													? "معدل العمولة (%)"
													: "Commission Rate (%)"
											}
											rules={[
												{
													required: true,
													message:
														chosenLanguage === "Arabic"
															? "يرجى إدخال معدل العمولة (يجب أن يكون رقمًا)"
															: "Please input the commission rate (should be a number)",
												},
											]}
										>
											<Input
												type='number'
												onChange={(e) => {
													const selectedRoomId = form.getFieldValue("_id");

													setHotelDetails((prevDetails) => {
														const updatedRoomCountDetails = Array.isArray(
															prevDetails.roomCountDetails
														)
															? prevDetails.roomCountDetails
															: [];

														const existingRoomIndex =
															updatedRoomCountDetails.findIndex(
																(room) => room.myKey === "ThisIsNewKey"
															);

														if (existingRoomIndex > -1) {
															updatedRoomCountDetails[
																existingRoomIndex
															].roomCommission = parseFloat(e.target.value);
														} else {
															updatedRoomCountDetails.push({
																_id: selectedRoomId,
																roomCommission: parseFloat(e.target.value),
															});
														}

														return {
															...prevDetails,
															roomCountDetails: updatedRoomCountDetails,
														};
													});
												}}
											/>
										</Form.Item>
									</div>
								</div>
							) : null}
						</Form.Item>

						<Form.Item
							name='description'
							label={
								chosenLanguage === "Arabic"
									? "وصف الغرفة باللغة الإنجليزية"
									: "Room Description (English)"
							}
							rules={[
								{
									required: true,
									message: "Please input the room description",
								},
							]}
						>
							<Input.TextArea
								onChange={(e) => {
									const roomType =
										form.getFieldValue("roomType") === "other"
											? customRoomType
											: form.getFieldValue("roomType");

									setHotelDetails((prevDetails) => {
										const updatedRoomCountDetails = Array.isArray(
											prevDetails.roomCountDetails
										)
											? prevDetails.roomCountDetails
											: [];

										const existingRoomIndex = updatedRoomCountDetails.findIndex(
											(room) => room.myKey === "ThisIsNewKey"
										);

										if (existingRoomIndex > -1) {
											updatedRoomCountDetails[existingRoomIndex].description =
												e.target.value;
										} else {
											updatedRoomCountDetails.push({
												roomType,
												description: e.target.value,
											});
										}

										return {
											...prevDetails,
											roomCountDetails: updatedRoomCountDetails,
											// Set activeRoom to true by default
											activeRoom: true,
										};
									});
								}}
							/>{" "}
							<Button
								style={{
									marginLeft: "8px",
									fontWeight: "bold",
									fontSize: "small",
									color: "white",
									background: "black",
									marginBottom: "5px",
									marginTop: "5px",
								}}
								type='link'
								onClick={() => handleArabicModalOpen("description")}
							>
								Add Description In Arabic
							</Button>
						</Form.Item>

						<MultiSelectWrapper>
							<Form.Item
								name='amenities'
								label={
									chosenLanguage === "Arabic"
										? "وسائل الراحة"
										: "Room Amenities"
								}
								rules={[
									{ required: true, message: "Please select room amenities" },
								]}
							>
								<Select
									mode='multiple'
									allowClear
									onChange={(value) => {
										const roomType =
											form.getFieldValue("roomType") === "other"
												? customRoomType
												: form.getFieldValue("roomType");

										setHotelDetails((prevDetails) => {
											const updatedRoomCountDetails = Array.isArray(
												prevDetails.roomCountDetails
											)
												? prevDetails.roomCountDetails
												: [];

											const existingRoomIndex =
												updatedRoomCountDetails.findIndex(
													(room) => room.myKey === "ThisIsNewKey"
												);

											if (existingRoomIndex > -1) {
												updatedRoomCountDetails[existingRoomIndex].amenities =
													value;
											} else {
												updatedRoomCountDetails.push({
													roomType,
													amenities: value,
												});
											}

											return {
												...prevDetails,
												roomCountDetails: updatedRoomCountDetails,
											};
										});
									}}
								>
									{amenitiesList.map((amenity, index) => (
										<Option
											key={index}
											value={amenity}
											style={{
												textAlign: chosenLanguage === "Arabic" ? "right" : "",
											}}
										>
											{amenity}
										</Option>
									))}
								</Select>
							</Form.Item>

							<Form.Item
								name='views'
								label={chosenLanguage === "Arabic" ? "إطلالات" : "Room Views"}
								// rules={[
								// 	{ required: true, message: "Please select room views" },
								// ]}
							>
								<Select
									mode='multiple'
									allowClear
									onChange={(value) => {
										const roomType =
											form.getFieldValue("roomType") === "other"
												? customRoomType
												: form.getFieldValue("roomType");

										setHotelDetails((prevDetails) => {
											const updatedRoomCountDetails = Array.isArray(
												prevDetails.roomCountDetails
											)
												? prevDetails.roomCountDetails
												: [];

											const existingRoomIndex =
												updatedRoomCountDetails.findIndex(
													(room) => room.myKey === "ThisIsNewKey"
												);

											if (existingRoomIndex > -1) {
												updatedRoomCountDetails[existingRoomIndex].views =
													value;
											} else {
												updatedRoomCountDetails.push({
													roomType,
													views: value,
												});
											}

											return {
												...prevDetails,
												roomCountDetails: updatedRoomCountDetails,
											};
										});
									}}
								>
									{viewsList.map((view, index) => (
										<Option
											key={index}
											value={view}
											style={{
												textAlign: chosenLanguage === "Arabic" ? "right" : "",
											}}
										>
											{view}
										</Option>
									))}
								</Select>
							</Form.Item>

							<Form.Item
								name='extraAmenities'
								label={
									chosenLanguage === "Arabic"
										? "وسائل الراحة الإضافية"
										: "Extra Amenities"
								}
								// rules={[
								// 	{ required: true, message: "Please select extra amenities" },
								// ]}
							>
								<Select
									mode='multiple'
									allowClear
									onChange={(value) => {
										const roomType =
											form.getFieldValue("roomType") === "other"
												? customRoomType
												: form.getFieldValue("roomType");

										setHotelDetails((prevDetails) => {
											const updatedRoomCountDetails = Array.isArray(
												prevDetails.roomCountDetails
											)
												? prevDetails.roomCountDetails
												: [];

											const existingRoomIndex =
												updatedRoomCountDetails.findIndex(
													(room) => room.myKey === "ThisIsNewKey"
												);

											if (existingRoomIndex > -1) {
												updatedRoomCountDetails[
													existingRoomIndex
												].extraAmenities = value;
											} else {
												updatedRoomCountDetails.push({
													roomType,
													extraAmenities: value,
												});
											}

											return {
												...prevDetails,
												roomCountDetails: updatedRoomCountDetails,
											};
										});
									}}
								>
									{extraAmenitiesList.map((amenity, index) => (
										<Option
											key={index}
											value={amenity}
											style={{
												textAlign: chosenLanguage === "Arabic" ? "right" : "",
											}}
										>
											{amenity}
										</Option>
									))}
								</Select>
							</Form.Item>

							{roomTypeSelected && (
								<Form.Item className='my-auto px-5'>
									<Button
										style={{ background: "grey", color: "wheat" }}
										onClick={handleOpenModal}
										icon={<PlusOutlined />}
									>
										Priced Extras
									</Button>
								</Form.Item>
							)}

							{/* Priced Extras Modal */}
							<Modal
								title='Priced Extras'
								open={isModalVisible}
								onOk={handleModalOk}
								onCancel={handleModalCancel}
								width={700}
								okText='Save'
								cancelText='Cancel'
							>
								<Form form={formPricedExtras} component={false}>
									<Table
										components={{
											body: {
												cell: EditableCell,
											},
										}}
										bordered
										dataSource={pricedExtrasData}
										columns={mergedColumns}
										rowClassName='editable-row'
										pagination={false}
										footer={() => (
											<Button type='dashed' onClick={handleAddRow} block>
												Add New Extra
											</Button>
										)}
									/>
								</Form>
							</Modal>
						</MultiSelectWrapper>

						<Form.Item
							name='activeRoom'
							label={
								chosenLanguage === "Arabic"
									? "نشط / غير نشط"
									: "Active / Inactive"
							}
							valuePropName='checked'
						>
							<Switch
								defaultChecked={true}
								onChange={(checked) => {
									const roomType =
										form.getFieldValue("roomType") === "other"
											? customRoomType
											: form.getFieldValue("roomType");

									setHotelDetails((prevDetails) => {
										const updatedRoomCountDetails = Array.isArray(
											prevDetails.roomCountDetails
										)
											? prevDetails.roomCountDetails
											: [];

										const existingRoomIndex = updatedRoomCountDetails.findIndex(
											(room) => room.myKey === "ThisIsNewKey"
										);

										if (existingRoomIndex > -1) {
											updatedRoomCountDetails[existingRoomIndex].activeRoom =
												checked;
										} else {
											updatedRoomCountDetails.push({
												roomType,
												activeRoom: checked,
											});
										}

										return {
											...prevDetails,
											roomCountDetails: updatedRoomCountDetails,
										};
									});
								}}
							/>
						</Form.Item>
					</>
				)}
			</>
		</ZCase1Wrapper>
	);
};

export default ZCase1;

const ZCase1Wrapper = styled.div``;

const MultiSelectWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;

	.ant-form-item {
		flex: 1;
	}
`;

const EditableCell = ({
	editing,
	dataIndex,
	title,
	inputType,
	record,
	index,
	children,
	...restProps
}) => {
	const inputNode =
		dataIndex === "price" ? (
			<InputNumber min={0} style={{ width: "100%" }} />
		) : dataIndex === "paymentFrequency" ? (
			<Radio.Group>
				<Radio value='Per Night'>Per Night</Radio>
				<Radio value='One Time'>One Time</Radio>
			</Radio.Group>
		) : (
			<Input />
		);

	return (
		<td {...restProps}>
			{editing ? (
				<Form.Item
					name={dataIndex}
					style={{ margin: 0 }}
					rules={[
						{
							required: true,
							message: `Please select ${title}!`,
						},
					]}
				>
					{inputNode}
				</Form.Item>
			) : (
				children
			)}
		</td>
	);
};
