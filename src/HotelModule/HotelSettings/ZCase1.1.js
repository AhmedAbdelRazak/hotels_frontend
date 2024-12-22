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
	newRoomCountDetailsObject,
	setNewRoomCountDetailsObject,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isArabicModalVisible, setIsArabicModalVisible] = useState(false);
	const [arabicField, setArabicField] = useState(""); // 'name' or 'description'
	const [pricedExtrasData, setPricedExtrasData] = useState([]);
	const [editingKey, setEditingKey] = useState("");
	const [displayNameAdded, setDisplayNameAdded] = useState(false);
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
				(room) => room.roomType === roomType
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

		// Get the previously saved value for the selected field
		const roomType =
			form.getFieldValue("roomType") === "other"
				? customRoomType
				: form.getFieldValue("roomType");

		const existingRoomDetails =
			hotelDetails.roomCountDetails?.find(
				(room) => room.roomType === roomType
			) || {};

		const arabicValue = existingRoomDetails[`${field}_Arabic`] || ""; // Dynamically access the Arabic field

		formArabic.setFieldsValue({ arabicValue }); // Populate the modal form
		setIsArabicModalVisible(true);
	};

	const handleArabicModalOk = () => {
		const roomType =
			form.getFieldValue("roomType") === "other"
				? customRoomType
				: form.getFieldValue("roomType");

		const value = formArabic.getFieldValue("arabicValue");

		setHotelDetails((prevDetails) => {
			const updatedRoomCountDetails = [...(prevDetails.roomCountDetails || [])];

			const existingRoomIndex = updatedRoomCountDetails.findIndex(
				(room) => room.roomType === roomType
			);

			if (existingRoomIndex > -1) {
				updatedRoomCountDetails[existingRoomIndex] = {
					...updatedRoomCountDetails[existingRoomIndex],
					[`${arabicField}_Arabic`]: value, // Dynamically update the Arabic field
				};
			} else {
				updatedRoomCountDetails.push({
					roomType,
					[`${arabicField}_Arabic`]: value,
				});
			}

			return {
				...prevDetails,
				roomCountDetails: updatedRoomCountDetails,
			};
		});

		// Close and reset the modal
		setIsArabicModalVisible(false);
		formArabic.resetFields();
	};

	const handleArabicModalCancel = () => {
		setIsArabicModalVisible(false);
		formArabic.resetFields();
	};

	const handleCheckboxChange = (checked) => {
		form.setFieldsValue({ commisionIncluded: checked });

		const selectedRoomId = form.getFieldValue("_id");

		setHotelDetails((prevDetails) => {
			const updatedRoomCountDetails = Array.isArray(
				prevDetails.roomCountDetails
			)
				? [...prevDetails.roomCountDetails]
				: [];

			const existingRoomIndex = updatedRoomCountDetails.findIndex(
				(room) => room._id === selectedRoomId
			);

			if (existingRoomIndex > -1) {
				updatedRoomCountDetails[existingRoomIndex].commisionIncluded = checked;
			} else {
				updatedRoomCountDetails.push({
					_id: selectedRoomId,
					commisionIncluded: checked,
				});
			}

			return {
				...prevDetails,
				roomCountDetails: updatedRoomCountDetails,
			};
		});
	};

	const handleFieldChange = (field, value) => {
		console.log("Field being updated:", field);
		console.log("Value being set:", value);

		const roomType =
			form.getFieldValue("roomType") === "other"
				? customRoomType
				: form.getFieldValue("roomType");

		const displayName = form.getFieldValue("displayName");

		console.log("Current roomType:", roomType);
		console.log("Current displayName:", displayName);

		if (field === "roomType" || field === "displayName") {
			// Reset `newRoomCountDetailsObject` if these fields change
			setNewRoomCountDetailsObject({});
			setDisplayNameAdded(false);

			setHotelDetails((prevDetails) => {
				const filteredRoomCountDetails = prevDetails.roomCountDetails.filter(
					(room) =>
						room.roomType !== roomType || room.displayName !== displayName
				);
				console.log(
					"Filtered roomCountDetails after reset:",
					filteredRoomCountDetails
				);

				return {
					...prevDetails,
					roomCountDetails: filteredRoomCountDetails,
				};
			});
		}

		// Update `newRoomCountDetailsObject` state
		setNewRoomCountDetailsObject((prev) => ({
			...prev,
			[field]: value,
			roomType: roomType || prev.roomType, // Ensure roomType is not undefined
			displayName: displayName || prev.displayName, // Ensure displayName is not undefined
		}));

		console.log("Updated newRoomCountDetailsObject:", {
			...newRoomCountDetailsObject,
			[field]: value,
			roomType: roomType || newRoomCountDetailsObject.roomType,
			displayName: displayName || newRoomCountDetailsObject.displayName,
		});
	};

	const handleContinue = () => {
		const { roomType, displayName } = newRoomCountDetailsObject;

		if (!roomType || !displayName) {
			console.warn("Room Type or Display Name is missing, cannot proceed.");
			return;
		}

		setHotelDetails((prevDetails) => {
			const existingRoomCountDetails = Array.isArray(
				prevDetails.roomCountDetails
			)
				? prevDetails.roomCountDetails
				: [];

			// Remove invalid entries where roomType or displayName is undefined
			const filteredRoomCountDetails = existingRoomCountDetails.filter(
				(room) => room.roomType && room.displayName
			);

			// Check if an entry with the same roomType already exists
			const existingRoomIndex = filteredRoomCountDetails.findIndex(
				(room) => room.roomType === roomType
			);

			if (existingRoomIndex > -1) {
				// Overwrite the existing entry
				filteredRoomCountDetails[existingRoomIndex] = {
					...filteredRoomCountDetails[existingRoomIndex], // Retain existing fields
					...newRoomCountDetailsObject, // Overwrite with new data
				};
				console.log("Overwriting existing room at index:", existingRoomIndex);
			} else {
				// Add the new entry
				filteredRoomCountDetails.push(newRoomCountDetailsObject);
				console.log("Adding new room details.");
			}

			console.log("Updated roomCountDetails:", filteredRoomCountDetails);

			return {
				...prevDetails,
				roomCountDetails: filteredRoomCountDetails,
			};
		});

		// Mark that the displayName has been added
		setDisplayNameAdded(true);
	};

	useEffect(() => {
		console.log("Updated hotelDetails:", hotelDetails);
		console.log(
			"Updated newRoomCountDetailsObject:",
			newRoomCountDetailsObject
		);
	}, [hotelDetails, newRoomCountDetailsObject]);

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
					label={chosenLanguage === "Arabic" ? "نوع الغرفة" : "Room Type"}
					rules={[{ required: true, message: "Please select a room type" }]}
				>
					<Select
						value={form.getFieldValue("roomType")} // Ensure value reflects form state
						onChange={(value) => {
							setRoomTypeSelected(true);
							setNewRoomCountDetailsObject({
								...newRoomCountDetailsObject,
								roomType: value,
							});
						}}
					>
						{roomTypes.map((room) => (
							<Option key={room.value} value={room.value}>
								{room.label}
							</Option>
						))}
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
							onChange={(e) => {
								setNewRoomCountDetailsObject({
									...newRoomCountDetailsObject,
									roomType: e.target.value,
								});
								setCustomRoomType(e.target.value);
							}} // Sync with state
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
									message:
										chosenLanguage === "Arabic"
											? "يرجى إدخال اسم العرض"
											: "Please input the display name",
								},
							]}
						>
							<Input
								onChange={(e) => {
									setNewRoomCountDetailsObject({
										...newRoomCountDetailsObject,
										displayName: e.target.value,
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
							{hotelDetails?.roomCountDetails?.find(
								(room) =>
									room.roomType ===
									(form.getFieldValue("roomType") === "other"
										? customRoomType
										: form.getFieldValue("roomType"))
							)?.displayName_Arabic && (
								<div
									style={{
										marginTop: "8px",
										color: "gray",
										fontStyle: "italic",
									}}
								>
									{"Arabic Name: " +
										hotelDetails.roomCountDetails.find(
											(room) =>
												room.roomType ===
												(form.getFieldValue("roomType") === "other"
													? customRoomType
													: form.getFieldValue("roomType"))
										).displayName_Arabic}
								</div>
							)}
							<div className='mx-auto text-center mb-4'>
								<Button
									disabled={!newRoomCountDetailsObject.displayName}
									onClick={handleContinue}
								>
									Continue
								</Button>
							</div>
						</Form.Item>
						{displayNameAdded ? (
							<>
								<div className='row'>
									{/* Room Count */}
									<div className='col-md-4'>
										<Form.Item
											name='roomCount'
											label={
												chosenLanguage === "Arabic" ? "عدد الغرف" : "Room Count"
											}
											rules={[
												{
													required: true,
													message: "Please input the room count",
												},
											]}
										>
											<Input
												type='number'
												onChange={(e) =>
													handleFieldChange(
														"count",
														parseInt(e.target.value, 10)
													)
												}
											/>
										</Form.Item>
									</div>

									{/* Beds Count - Only for individualBed */}
									{newRoomCountDetailsObject?.roomType === "individualBed" && (
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
													onChange={(e) =>
														handleFieldChange(
															"bedsCount",
															parseInt(e.target.value, 10)
														)
													}
												/>
											</Form.Item>
										</div>
									)}

									{/* Room Gender - Only for individualBed */}
									{newRoomCountDetailsObject?.roomType === "individualBed" && (
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
													onChange={(value) =>
														handleFieldChange("roomForGender", value)
													}
												>
													<Select.Option value='For Men'>
														{chosenLanguage === "Arabic" ? "للرجال" : "For Men"}
													</Select.Option>
													<Select.Option value='For Women'>
														{chosenLanguage === "Arabic"
															? "للنساء"
															: "For Women"}
													</Select.Option>
												</Select>
											</Form.Item>
										</div>
									)}
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
												onChange={(e) =>
													handleFieldChange(
														"defaultCost",
														parseInt(e.target.value, 10)
													)
												}
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
												onChange={(e) =>
													handleFieldChange("price", {
														basePrice: parseInt(e.target.value, 10),
													})
												}
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
													onChange={(e) =>
														handleFieldChange(
															"commisionIncluded",
															e.target.checked
														)
													}
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
														onChange={(e) =>
															handleFieldChange(
																"roomCommission",
																parseInt(e.target.value, 10)
															)
														}
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
										onChange={(e) =>
											handleFieldChange("description", e.target.value)
										}
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
										onClick={() => handleArabicModalOpen("description")}
									>
										Add Description In Arabic
									</Button>
									{hotelDetails?.roomCountDetails?.find(
										(room) =>
											room.roomType ===
											(form.getFieldValue("roomType") === "other"
												? customRoomType
												: form.getFieldValue("roomType"))
									)?.description_Arabic && (
										<div
											style={{
												marginTop: "8px",
												color: "gray",
												fontStyle: "italic",
											}}
										>
											{"Arabic Description: " +
												hotelDetails.roomCountDetails.find(
													(room) =>
														room.roomType ===
														(form.getFieldValue("roomType") === "other"
															? customRoomType
															: form.getFieldValue("roomType"))
												)?.description_Arabic}
										</div>
									)}
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
											{
												required: true,
												message: "Please select room amenities",
											},
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
															(room) => room.roomType === roomType
														);

													if (existingRoomIndex > -1) {
														updatedRoomCountDetails[
															existingRoomIndex
														].amenities = value;
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
														textAlign:
															chosenLanguage === "Arabic" ? "right" : "",
													}}
												>
													{amenity}
												</Option>
											))}
										</Select>
									</Form.Item>

									<Form.Item
										name='views'
										label={
											chosenLanguage === "Arabic" ? "إطلالات" : "Room Views"
										}
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
															(room) => room.roomType === roomType
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
														textAlign:
															chosenLanguage === "Arabic" ? "right" : "",
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
															(room) => room.roomType === roomType
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
														textAlign:
															chosenLanguage === "Arabic" ? "right" : "",
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

												const existingRoomIndex =
													updatedRoomCountDetails.findIndex(
														(room) => room.roomType === roomType
													);

												if (existingRoomIndex > -1) {
													updatedRoomCountDetails[
														existingRoomIndex
													].activeRoom = checked;
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
						) : null}
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
