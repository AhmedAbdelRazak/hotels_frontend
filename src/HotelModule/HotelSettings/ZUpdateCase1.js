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

const parseNonNegativeDecimal = (value) => {
	if (value === "" || value === null || value === undefined) return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const ZUpdateCase1 = ({
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
	existingRoomDetails,
	viewsList = [],
	extraAmenitiesList = [],
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isArabicModalVisible, setIsArabicModalVisible] = useState(false);
	const [arabicField, setArabicField] = useState(""); // 'displayName' or 'description'
	const [pricedExtrasData, setPricedExtrasData] = useState([]);
	const [editingKey, setEditingKey] = useState("");
	const [formPricedExtras] = Form.useForm();
	const [formArabic] = Form.useForm();

	const { user } = isAuthenticated();
	const isArabic = chosenLanguage === "Arabic";
	const currentRoomType =
		form.getFieldValue("roomType") || existingRoomDetails?.roomType;

	const getSelectedRoomId = () =>
		form.getFieldValue("_id") || existingRoomDetails?._id;

	const updateRoomCountDetails = (roomId, updates) => {
		if (!roomId) return;
		setHotelDetails((prevDetails) => {
			const updatedRoomCountDetails = Array.isArray(
				prevDetails.roomCountDetails
			)
				? [...prevDetails.roomCountDetails]
				: [];

			const existingRoomIndex = updatedRoomCountDetails.findIndex(
				(room) => room._id === roomId
			);

			if (existingRoomIndex > -1) {
				updatedRoomCountDetails[existingRoomIndex] = {
					...updatedRoomCountDetails[existingRoomIndex],
					...updates,
				};
			} else {
				updatedRoomCountDetails.push({
					_id: roomId,
					...updates,
				});
			}

			return {
				...prevDetails,
				roomCountDetails: updatedRoomCountDetails,
			};
		});
	};

	// Prepopulate fields based on selectedRoomType
	useEffect(() => {
		window.scrollTo({ top: 90, behavior: "smooth" });
		if (roomTypeSelected && existingRoomDetails) {
			form.setFieldsValue({
				_id: existingRoomDetails._id || "",
				displayName: existingRoomDetails.displayName || "",
				displayName_OtherLanguage:
					existingRoomDetails.displayName_OtherLanguage || "",
				roomCount: existingRoomDetails.count || 1,
				bedsCount: existingRoomDetails.bedsCount || 1,
				basePrice: existingRoomDetails.price?.basePrice || 50,
				defaultCost: existingRoomDetails.defaultCost || 30,
				description: existingRoomDetails.description || "",
				description_OtherLanguage:
					existingRoomDetails.description_OtherLanguage || "",
				amenities: existingRoomDetails.amenities || [],
				views: existingRoomDetails.views || [],
				extraAmenities: existingRoomDetails.extraAmenities || [],
				activeRoom: existingRoomDetails.activeRoom || false,
				commisionIncluded: existingRoomDetails.commisionIncluded || false,
				roomCommission: existingRoomDetails.roomCommission ?? 10, // Preserve 0; default only when missing.
				pricedExtras: existingRoomDetails.pricedExtras || [],
				roomForGender: existingRoomDetails.roomForGender || "Unisex",
			});

			setPricedExtrasData(existingRoomDetails.pricedExtras || []); // Ensure pricedExtrasData updates
		} else {
			setPricedExtrasData([]); // Reset pricedExtrasData when no room is selected
		}
	}, [roomTypeSelected, existingRoomDetails, form, arabicField, formArabic]);

	const handleOpenModal = () => {
		// Re-set the formPricedExtras fields with the current pricedExtrasData
		formPricedExtras.setFieldsValue({
			pricedExtras: pricedExtrasData || [],
		});
		setIsModalVisible(true);
	};

	const handleModalOk = () => {
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
				updatedRoomCountDetails[existingRoomIndex].pricedExtras =
					pricedExtrasData.filter(
						(item) => item.name && item.price !== undefined
					);
			} else {
				updatedRoomCountDetails.push({
					_id: selectedRoomId,
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
	};

	const handleModalCancel = () => {
		setIsModalVisible(false);
	};

	const handleAddRow = () => {
		setPricedExtrasData([
			...pricedExtrasData,
			{
				key: Date.now(),
				name: "",
				price: undefined,
				paymentFrequency: "", // Start as empty
			},
		]);
	};

	const handleDeleteRow = (key) => {
		setPricedExtrasData(pricedExtrasData.filter((item) => item.key !== key));
	};

	const isEditing = (record) => record.key === editingKey;

	const edit = (record) => {
		formPricedExtras.setFieldsValue({
			name: "",
			price: "",
			paymentFrequency: "", // Default to empty
			...record,
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
			return;
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
					return text;
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

		const selectedRoomId = form.getFieldValue("_id");

		// Find the existing room details based on selectedRoomId
		const roomDetails = hotelDetails.roomCountDetails.find(
			(room) => room._id === selectedRoomId
		);

		// Set the initial value for the Arabic field in the form
		if (roomDetails) {
			formArabic.setFieldsValue({
				arabicValue: roomDetails[`${field}_OtherLanguage`] || "",
			});
		}

		setIsArabicModalVisible(true);
	};

	const handleArabicModalOk = () => {
		const selectedRoomId = form.getFieldValue("_id");
		const value = String(formArabic.getFieldValue("arabicValue") || "").trim();
		const fieldName = `${arabicField}_OtherLanguage`;

		if (!value) {
			message.error(
				isArabic
					? "يرجى إدخال النص العربي أولاً."
					: "Please enter the Arabic text first."
			);
			return;
		}

		form.setFieldsValue({ [fieldName]: value });

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
				updatedRoomCountDetails[existingRoomIndex][fieldName] = value;
			} else {
				updatedRoomCountDetails.push({
					_id: selectedRoomId,
					[fieldName]: value,
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

	const arabicModalTitle =
		arabicField === "displayName"
			? isArabic
				? "اسم الغرفة بالعربية"
				: "Arabic Room Name"
			: isArabic
			  ? "وصف الغرفة بالعربية"
			  : "Arabic Room Description";
	const arabicModalHelp =
		arabicField === "displayName"
			? isArabic
				? "اكتب الاسم الذي سيظهر للمستخدمين عند اختيار اللغة العربية."
				: "Enter the name guests will see when Arabic is selected."
			: isArabic
			  ? "اكتب الوصف العربي للغرفة. الوصف الإنجليزي لن يتغير."
			  : "Enter the Arabic room description. The English description will stay unchanged.";

	return (
		<ZUpdateCase1Wrapper
			isArabic={chosenLanguage === "Arabic"}
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
		>
			<Modal
				title={arabicModalTitle}
				open={isArabicModalVisible}
				onOk={handleArabicModalOk}
				onCancel={handleArabicModalCancel}
				okText={isArabic ? "حفظ" : "Save"}
				cancelText={isArabic ? "إلغاء" : "Cancel"}
			>
				<ModalHelp>{arabicModalHelp}</ModalHelp>
				<Form form={formArabic} layout='vertical'>
					<Form.Item
						name='arabicValue'
						label={
							arabicField === "displayName"
								? isArabic
									? "الاسم بالعربية"
									: "Arabic Name"
								: isArabic
								  ? "الوصف بالعربية"
								  : "Arabic Description"
						}
						rules={[
							{
								required: true,
								message: isArabic
									? "يرجى إدخال النص العربي"
									: "Please enter the Arabic text",
							},
						]}
					>
						{arabicField === "displayName" ? (
							<Input dir='rtl' />
						) : (
							<Input.TextArea dir='rtl' rows={4} />
						)}
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
						value={form.getFieldValue("roomType")}
						style={{ textAlign: chosenLanguage === "Arabic" ? "right" : "" }}
						onChange={(value) => {
							const selectedRoomId = getSelectedRoomId();

							form.setFieldsValue({ roomType: value });
							if (value === "other") {
								setCustomRoomType("");
								form.setFieldsValue({ customRoomType: "" });
							}
							setRoomTypeSelected(true);

							if (value !== "other") {
								updateRoomCountDetails(selectedRoomId, { roomType: value });
							}
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
							onChange={(e) => {
								const nextValue = e.target.value;
								setCustomRoomType(nextValue);
								form.setFieldsValue({ customRoomType: nextValue });

								if (form.getFieldValue("roomType") === "other") {
									const selectedRoomId = getSelectedRoomId();
									updateRoomCountDetails(selectedRoomId, {
										roomType: nextValue,
									});
								}
							}}
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
									: "Display Name (In English)"
							}
							rules={[
								{ required: true, message: "Please input the display name" },
							]}
						>
							<Input
								onChange={(e) => {
									setHotelDetails((prevDetails) => {
										const updatedRoomCountDetails = Array.isArray(
											prevDetails.roomCountDetails
										)
											? prevDetails.roomCountDetails
											: [];

										const existingRoomIndex = updatedRoomCountDetails.findIndex(
											(room) => room._id === existingRoomDetails._id
										);

										if (existingRoomIndex > -1) {
											updatedRoomCountDetails[existingRoomIndex].displayName =
												e.target.value;
										} else {
											updatedRoomCountDetails.push({
												_id: existingRoomDetails._id,
												roomType: form.getFieldValue("roomType"),
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
						</Form.Item>
						<Button
							className='mb-4'
							style={{
								marginLeft: "8px",
								fontWeight: "bold",
								fontSize: "small",
								color: "white",
								background: "black",
								marginBottom: "5px",
							}}
							type='link'
						onClick={() => handleArabicModalOpen("displayName")}
					>
						{isArabic ? "الاسم بالعربية" : "Arabic Name"}
					</Button>

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
											const selectedRoomId = form.getFieldValue("_id");

											setHotelDetails((prevDetails) => {
												const updatedRoomCountDetails = Array.isArray(
													prevDetails.roomCountDetails
												)
													? prevDetails.roomCountDetails
													: [];

												const existingRoomIndex =
													updatedRoomCountDetails.findIndex(
														(room) => room._id === selectedRoomId
													);

												if (existingRoomIndex > -1) {
													updatedRoomCountDetails[existingRoomIndex].count =
														parseInt(e.target.value, 10);
												} else {
													updatedRoomCountDetails.push({
														_id: selectedRoomId,
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

							{currentRoomType === "individualBed" ? (
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
															(room) => room._id === selectedRoomId
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
							) : null}

							{currentRoomType === "individualBed" ? (
								<div className='col-md-4'>
									<Form.Item
										name='roomForGender'
										label={chosenLanguage === "Arabic" ? "غرفة ل" : "Room For"}
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
															(room) => room._id === selectedRoomId
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
														(room) => room._id === selectedRoomId
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
														(room) => room._id === selectedRoomId
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
												{
													validator: (_, value) => {
														if (
															value === undefined ||
															value === "" ||
															Number(value) >= 0
														) {
															return Promise.resolve();
														}
														return Promise.reject(
															new Error(
																isArabic
																	? "يمكن إدخال 1% أو أي نسبة موجبة."
																	: "You can enter 1% or any positive rate."
															)
														);
													},
												},
											]}
										>
											<Input
												type='number'
												min={0}
												step='any'
												onChange={(e) => {
													const selectedRoomId = form.getFieldValue("_id");
													const nextCommission = parseNonNegativeDecimal(
														e.target.value
													);

													setHotelDetails((prevDetails) => {
														const updatedRoomCountDetails = Array.isArray(
															prevDetails.roomCountDetails
														)
															? prevDetails.roomCountDetails
															: [];

														const existingRoomIndex =
															updatedRoomCountDetails.findIndex(
																(room) => room._id === selectedRoomId
															);

														if (existingRoomIndex > -1) {
															updatedRoomCountDetails[
																existingRoomIndex
															].roomCommission = nextCommission;
														} else {
															updatedRoomCountDetails.push({
																_id: selectedRoomId,
																roomCommission: nextCommission,
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
									const selectedRoomId = form.getFieldValue("_id");

									setHotelDetails((prevDetails) => {
										const updatedRoomCountDetails = Array.isArray(
											prevDetails.roomCountDetails
										)
											? prevDetails.roomCountDetails
											: [];

										const existingRoomIndex = updatedRoomCountDetails.findIndex(
											(room) => room._id === selectedRoomId
										);

										if (existingRoomIndex > -1) {
											updatedRoomCountDetails[existingRoomIndex].description =
												e.target.value;
										} else {
											updatedRoomCountDetails.push({
												_id: selectedRoomId,
												description: e.target.value,
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
						<Button
							className='mb-4'
							style={{
								marginLeft: "8px",
								fontWeight: "bold",
								fontSize: "small",
								color: "white",
								background: "black",
								marginBottom: "5px",
							}}
							type='link'
							onClick={() => handleArabicModalOpen("description")}
						>
							{isArabic ? "الوصف بالعربية" : "Arabic Description"}
						</Button>
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
										const selectedRoomId = form.getFieldValue("_id");

										setHotelDetails((prevDetails) => {
											const updatedRoomCountDetails = Array.isArray(
												prevDetails.roomCountDetails
											)
												? prevDetails.roomCountDetails
												: [];

											const existingRoomIndex =
												updatedRoomCountDetails.findIndex(
													(room) => room._id === selectedRoomId
												);

											if (existingRoomIndex > -1) {
												updatedRoomCountDetails[existingRoomIndex].amenities =
													value;
											} else {
												updatedRoomCountDetails.push({
													_id: selectedRoomId,
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
										const selectedRoomId = form.getFieldValue("_id");

										setHotelDetails((prevDetails) => {
											const updatedRoomCountDetails = Array.isArray(
												prevDetails.roomCountDetails
											)
												? prevDetails.roomCountDetails
												: [];

											const existingRoomIndex =
												updatedRoomCountDetails.findIndex(
													(room) => room._id === selectedRoomId
												);

											if (existingRoomIndex > -1) {
												updatedRoomCountDetails[existingRoomIndex].views =
													value;
											} else {
												updatedRoomCountDetails.push({
													_id: selectedRoomId,
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
										const selectedRoomId = form.getFieldValue("_id");

										setHotelDetails((prevDetails) => {
											const updatedRoomCountDetails = Array.isArray(
												prevDetails.roomCountDetails
											)
												? prevDetails.roomCountDetails
												: [];

											const existingRoomIndex =
												updatedRoomCountDetails.findIndex(
													(room) => room._id === selectedRoomId
												);

											if (existingRoomIndex > -1) {
												updatedRoomCountDetails[
													existingRoomIndex
												].extraAmenities = value;
											} else {
												updatedRoomCountDetails.push({
													_id: selectedRoomId,
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
							<div className='mt-4 px-5'>
								<Button
									type='primary'
									onClick={handleOpenModal}
									icon={<PlusOutlined />}
									style={{ marginBottom: 16 }}
								>
									Priced Extras
								</Button>
							</div>

							<Modal
								title='Priced Extras'
								open={isModalVisible}
								onOk={handleModalOk}
								onCancel={handleModalCancel}
								width={700}
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
									/>
								</Form>
								<Button
									onClick={handleAddRow}
									type='dashed'
									style={{ marginTop: 16, width: "100%" }}
									icon={<PlusOutlined />}
								>
									Add a row
								</Button>
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
								onChange={(checked) => {
									const selectedRoomId = form.getFieldValue("_id");

									setHotelDetails((prevDetails) => {
										const updatedRoomCountDetails = Array.isArray(
											prevDetails.roomCountDetails
										)
											? prevDetails.roomCountDetails
											: [];

										const existingRoomIndex = updatedRoomCountDetails.findIndex(
											(room) => room._id === selectedRoomId
										);

										if (existingRoomIndex > -1) {
											updatedRoomCountDetails[existingRoomIndex].activeRoom =
												checked;
										} else {
											updatedRoomCountDetails.push({
												_id: selectedRoomId,
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
		</ZUpdateCase1Wrapper>
	);
};

export default ZUpdateCase1;

const ZUpdateCase1Wrapper = styled.div``;

const ModalHelp = styled.p`
	margin: 0 0 12px;
	padding: 10px 12px;
	border: 1px solid #d7e7f8;
	border-radius: 10px;
	background: #f8fbff;
	color: #38506d;
	font-weight: 700;
	line-height: 1.5;
`;

const MultiSelectWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;

	.ant-form-item {
		flex: 1;
	}
`;

// Editable cell component for the table
const EditableCell = ({ title, editable, children, ...restProps }) => {
	return (
		<td {...restProps}>
			{editable ? (
				<Form.Item
					style={{ margin: 0 }}
					name={restProps.dataIndex}
					rules={[
						{
							required: true,
							message: `Please Input ${title}!`,
						},
					]}
				>
					{restProps.children}
				</Form.Item>
			) : (
				children
			)}
		</td>
	);
};
