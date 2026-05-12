import React, { useEffect, useMemo, useState } from "react";
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
	Radio,
	Checkbox,
} from "antd";
import styled from "styled-components";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { isAuthenticated } from "../../auth";

const { Option } = Select;
const DRAFT_ROOM_KEY = "ThisIsNewKey";

const parseNonNegativeDecimal = (value) => {
	if (value === "" || value === null || value === undefined) return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

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
	const [pricedExtrasData, setPricedExtrasData] = useState([]);
	const [editingKey, setEditingKey] = useState("");
	const [formPricedExtras] = Form.useForm();
	const { user } = isAuthenticated();
	const isArabic = chosenLanguage === "Arabic";

	const labels = {
		roomType: isArabic ? "نوع الغرفة" : "Room Type",
		customRoomType: isArabic ? "نوع الغرفة الآخر" : "Other Room Type",
		nameEn: isArabic ? "الاسم بالإنجليزية" : "Name In English",
		nameAr: isArabic ? "الاسم بالعربية" : "Name In Arabic",
		descEn: isArabic ? "الوصف بالإنجليزية" : "Room Description (English)",
		descAr: isArabic ? "الوصف بالعربية" : "Room Description (Arabic)",
		roomCount: isArabic ? "عدد الغرف" : "Room Count",
		rootCost: isArabic ? "التكلفة الجذرية" : "Root Price",
		basePrice: isArabic ? "سعر الغرفة الأساسي" : "Main Price",
		commission: isArabic ? "العمولة" : "Commission",
		commissionRate: isArabic ? "معدل العمولة (%)" : "Commission Rate (%)",
		amenities: isArabic ? "وسائل الراحة" : "Room Amenities",
		views: isArabic ? "إطلالات" : "Room Views",
		extraAmenities: isArabic ? "وسائل الراحة الإضافية" : "Extra Amenities",
		pricedExtras: isArabic ? "إضافات بسعر" : "Priced Extras",
		active: isArabic ? "نشط / غير نشط" : "Active / Inactive",
		activeHint: isArabic ? "الغرفة نشطة" : "Room is active",
	};

	const draftRoom = useMemo(
		() =>
			Array.isArray(hotelDetails?.roomCountDetails)
				? hotelDetails.roomCountDetails.find(
						(room) => room.myKey === DRAFT_ROOM_KEY
				  )
				: null,
		[hotelDetails?.roomCountDetails]
	);

	const currentRoomType = form.getFieldValue("roomType") || draftRoom?.roomType;

	const updateDraftRoom = (updates) => {
		setHotelDetails((prevDetails) => {
			const list = Array.isArray(prevDetails.roomCountDetails)
				? [...prevDetails.roomCountDetails]
				: [];
			const draftIndex = list.findIndex((room) => room.myKey === DRAFT_ROOM_KEY);
			const current = draftIndex > -1 ? list[draftIndex] : {};
			const nextRoomType =
				updates.roomType ??
				current.roomType ??
				(form.getFieldValue("roomType") === "other"
					? customRoomType
					: form.getFieldValue("roomType"));
			const next = {
				...current,
				roomType: nextRoomType,
				myKey: DRAFT_ROOM_KEY,
				activeRoom: updates.activeRoom ?? current.activeRoom ?? true,
				roomColor:
					current.roomColor ||
					(getRoomColor && nextRoomType ? getRoomColor(nextRoomType) : undefined),
				...updates,
			};

			if (draftIndex > -1) {
				list[draftIndex] = next;
			} else {
				list.push(next);
			}

			return { ...prevDetails, roomCountDetails: list };
		});
	};

	useEffect(() => {
		if (fromPage !== "Updating") {
			form.setFieldsValue({ activeRoom: true });
			updateDraftRoom({ activeRoom: true });
		}
		// eslint-disable-next-line
	}, []);

	useEffect(() => {
		if (!draftRoom) return;
		form.setFieldsValue({
			roomType: draftRoom.roomType || "",
			customRoomType: draftRoom.customRoomType || "",
			displayName: draftRoom.displayName || "",
			displayName_OtherLanguage: draftRoom.displayName_OtherLanguage || "",
			description: draftRoom.description || "",
			description_OtherLanguage: draftRoom.description_OtherLanguage || "",
			roomCount: draftRoom.count || 0,
			bedsCount: draftRoom.bedsCount || 1,
			roomForGender: draftRoom.roomForGender || "Unisex",
			defaultCost: draftRoom.defaultCost || 0,
			basePrice: draftRoom.price?.basePrice || 0,
			amenities: draftRoom.amenities || [],
			views: draftRoom.views || [],
			extraAmenities: draftRoom.extraAmenities || [],
			commisionIncluded: draftRoom.commisionIncluded || false,
			roomCommission: draftRoom.roomCommission ?? 0,
			activeRoom: draftRoom.activeRoom ?? true,
		});
		setPricedExtrasData(draftRoom.pricedExtras || []);
	}, [draftRoom, form]);

	const handleRoomTypeChange = (value) => {
		if (value === "other") {
			setCustomRoomType("");
			form.setFieldsValue({ customRoomType: "" });
		}

		setRoomTypeSelected(true);
		setSelectedRoomType(value);
		updateDraftRoom({
			roomType: value === "other" ? customRoomType : value,
			customRoomType: value === "other" ? "" : undefined,
		});
	};

	const handlePricedExtrasSave = () => {
		const cleanedExtras = pricedExtrasData.filter(
			(item) => item.name && item.price !== undefined
		);
		updateDraftRoom({ pricedExtras: cleanedExtras });
		setIsModalVisible(false);
	};

	const handleAddRow = () => {
		setPricedExtrasData((current) => [
			...current,
			{ key: Date.now(), name: "", price: undefined, paymentFrequency: "" },
		]);
	};

	const handleDeleteRow = (key) => {
		setPricedExtrasData((current) => current.filter((item) => item.key !== key));
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

	const save = async (key) => {
		try {
			const row = await formPricedExtras.validateFields();
			const nextData = [...pricedExtrasData];
			const index = nextData.findIndex((item) => item.key === key);

			if (index > -1) {
				nextData.splice(index, 1, { ...nextData[index], ...row });
			} else {
				nextData.push(row);
			}

			setPricedExtrasData(nextData);
			setEditingKey("");
		} catch (error) {
			return;
		}
	};

	const columns = [
		{
			title: isArabic ? "الاسم" : "Name",
			dataIndex: "name",
			width: "30%",
			editable: true,
			render: (text, record) =>
				isEditing(record) ? (
					<Form.Item
						name='name'
						style={{ margin: 0 }}
						rules={[{ required: true, message: "Required" }]}
					>
						<Input />
					</Form.Item>
				) : (
					text
				),
		},
		{
			title: isArabic ? "السعر" : "Price",
			dataIndex: "price",
			width: "20%",
			editable: true,
			render: (text, record) =>
				isEditing(record) ? (
					<Form.Item
						name='price'
						style={{ margin: 0 }}
						rules={[{ required: true, message: "Required" }]}
					>
						<InputNumber min={0} style={{ width: "100%" }} />
					</Form.Item>
				) : text !== undefined ? (
					`${text} SAR`
				) : (
					""
				),
		},
		{
			title: isArabic ? "التكرار" : "Payment Frequency",
			dataIndex: "paymentFrequency",
			width: "30%",
			editable: true,
			render: (text, record) =>
				isEditing(record) ? (
					<Form.Item
						name='paymentFrequency'
						style={{ margin: 0 }}
						rules={[{ required: true, message: "Required" }]}
					>
						<Radio.Group>
							<Radio value='Per Night'>{isArabic ? "لكل ليلة" : "Per Night"}</Radio>
							<Radio value='One Time'>{isArabic ? "مرة واحدة" : "One Time"}</Radio>
						</Radio.Group>
					</Form.Item>
				) : (
					text || ""
				),
		},
		{
			title: isArabic ? "الإجراء" : "Action",
			dataIndex: "action",
			render: (_, record) =>
				isEditing(record) ? (
					<span>
						<Button type='link' onClick={() => save(record.key)}>
							{isArabic ? "حفظ" : "Save"}
						</Button>
						<Popconfirm
							title={isArabic ? "إلغاء التعديل؟" : "Cancel edit?"}
							onConfirm={() => setEditingKey("")}
						>
							<Button type='link'>{isArabic ? "إلغاء" : "Cancel"}</Button>
						</Popconfirm>
					</span>
				) : (
					<span>
						<Button
							type='link'
							disabled={editingKey !== ""}
							onClick={() => edit(record)}
						>
							{isArabic ? "تعديل" : "Edit"}
						</Button>
						<Popconfirm
							title={isArabic ? "حذف الإضافة؟" : "Delete this extra?"}
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
				),
		},
	];

	return (
		<ZCase1Wrapper
			$isArabic={isArabic}
			dir={isArabic ? "rtl" : "ltr"}
		>
			<FormSection>
				<FieldsGrid $columns={3}>
					<Form.Item
						name='roomType'
						label={labels.roomType}
						rules={[{ required: true, message: "Please select a room type" }]}
					>
						<Select onChange={handleRoomTypeChange}>
							{roomTypes.map((room) => (
								<Option key={room.value} value={room.value}>
									{room.label}
								</Option>
							))}
							<Option key='other' value='other'>
								{isArabic ? "أخرى" : "Other"}
							</Option>
						</Select>
					</Form.Item>

					<Form.Item
						name='displayName'
						label={labels.nameEn}
						rules={[{ required: true, message: "Please input the display name" }]}
					>
						<Input onChange={(e) => updateDraftRoom({ displayName: e.target.value })} />
					</Form.Item>

					<Form.Item name='displayName_OtherLanguage' label={labels.nameAr}>
						<Input
							dir='rtl'
							onChange={(e) =>
								updateDraftRoom({ displayName_OtherLanguage: e.target.value })
							}
						/>
					</Form.Item>
				</FieldsGrid>

				{form.getFieldValue("roomType") === "other" && (
					<FieldsGrid $columns={1}>
						<Form.Item
							name='customRoomType'
							label={labels.customRoomType}
							rules={[{ required: true, message: "Please specify the room type" }]}
						>
							<Input
								value={customRoomType}
								onChange={(e) => {
									const value = e.target.value;
									setCustomRoomType(value);
									updateDraftRoom({ roomType: value, customRoomType: value });
								}}
							/>
						</Form.Item>
					</FieldsGrid>
				)}

				{roomTypeSelected && (
					<>
						<FieldsGrid $columns={2}>
							<Form.Item
								name='description'
								label={labels.descEn}
								rules={[
									{ required: true, message: "Please input the room description" },
								]}
							>
								<Input.TextArea
									rows={4}
									onChange={(e) => updateDraftRoom({ description: e.target.value })}
								/>
							</Form.Item>

							<Form.Item name='description_OtherLanguage' label={labels.descAr}>
								<Input.TextArea
									dir='rtl'
									rows={4}
									onChange={(e) =>
										updateDraftRoom({
											description_OtherLanguage: e.target.value,
										})
									}
								/>
							</Form.Item>
						</FieldsGrid>

						<FieldsGrid $columns={user?.role === 1000 ? 4 : 3}>
							<Form.Item
								name='roomCount'
								label={labels.roomCount}
								rules={[{ required: true, message: "Please input the room count" }]}
							>
								<Input
									type='number'
									min={0}
									onChange={(e) =>
										updateDraftRoom({ count: parseInt(e.target.value, 10) || 0 })
									}
								/>
							</Form.Item>

							<Form.Item
								name='defaultCost'
								label={labels.rootCost}
								rules={[{ required: true, message: "Please input the root cost" }]}
							>
								<Input
									type='number'
									min={0}
									onChange={(e) =>
										updateDraftRoom({
											defaultCost: parseFloat(e.target.value) || 0,
										})
									}
								/>
							</Form.Item>

							<Form.Item
								name='basePrice'
								label={labels.basePrice}
								rules={[{ required: true, message: "Please input the room price" }]}
							>
								<Input
									type='number'
									min={0}
									onChange={(e) =>
										updateDraftRoom({
											price: { basePrice: parseFloat(e.target.value) || 0 },
										})
									}
								/>
							</Form.Item>

							{user?.role === 1000 && (
								<CommissionField>
									<Checkbox
										checked={form.getFieldValue("commisionIncluded")}
										onChange={(e) => {
											form.setFieldsValue({
												commisionIncluded: e.target.checked,
											});
											updateDraftRoom({
												commisionIncluded: e.target.checked,
											});
										}}
									>
										{labels.commission}
									</Checkbox>
									<Form.Item
										name='roomCommission'
										label={labels.commissionRate}
										rules={[
											{ required: true, message: "Please input the commission rate" },
											{
												validator: (_, value) =>
													value === undefined || value === "" || Number(value) >= 0
														? Promise.resolve()
														: Promise.reject(
																new Error(
																	isArabic
																		? "يمكن إدخال 1% أو أي نسبة موجبة."
																		: "You can enter 1% or any positive rate."
																)
														  ),
											},
										]}
									>
										<Input
											type='number'
											min={0}
											step='any'
											onChange={(e) =>
												updateDraftRoom({
													roomCommission: parseNonNegativeDecimal(e.target.value),
												})
											}
										/>
									</Form.Item>
								</CommissionField>
							)}
						</FieldsGrid>

						<FieldsGrid $columns={4}>
							<Form.Item
								name='amenities'
								label={labels.amenities}
								rules={[{ required: true, message: "Please select room amenities" }]}
							>
								<Select
									mode='multiple'
									allowClear
									onChange={(value) => updateDraftRoom({ amenities: value })}
								>
									{amenitiesList.map((amenity) => (
										<Option key={amenity} value={amenity}>
											{amenity}
										</Option>
									))}
								</Select>
							</Form.Item>

							<Form.Item name='views' label={labels.views}>
								<Select
									mode='multiple'
									allowClear
									onChange={(value) => updateDraftRoom({ views: value })}
								>
									{viewsList.map((view) => (
										<Option key={view} value={view}>
											{view}
										</Option>
									))}
								</Select>
							</Form.Item>

							<Form.Item name='extraAmenities' label={labels.extraAmenities}>
								<Select
									mode='multiple'
									allowClear
									onChange={(value) => updateDraftRoom({ extraAmenities: value })}
								>
									{extraAmenitiesList.map((amenity) => (
										<Option key={amenity} value={amenity}>
											{amenity}
										</Option>
									))}
								</Select>
							</Form.Item>

							<ActionField>
								<Button
									type='primary'
									icon={<PlusOutlined />}
									onClick={() => setIsModalVisible(true)}
								>
									{labels.pricedExtras}
								</Button>
							</ActionField>
						</FieldsGrid>

						{currentRoomType === "individualBed" && (
							<FieldsGrid $columns={2}>
								<Form.Item
									name='bedsCount'
									label={isArabic ? "عدد الأسرة لكل غرفة" : "Beds Per Room"}
								>
									<Input
										type='number'
										min={1}
										onChange={(e) =>
											updateDraftRoom({
												bedsCount: parseInt(e.target.value, 10) || 1,
											})
										}
									/>
								</Form.Item>
								<Form.Item name='roomForGender' label={isArabic ? "غرفة لـ" : "Room For"}>
									<Select
										onChange={(value) => updateDraftRoom({ roomForGender: value })}
									>
										<Option value='For Men'>{isArabic ? "للرجال" : "For Men"}</Option>
										<Option value='For Women'>
											{isArabic ? "للنساء" : "For Women"}
										</Option>
									</Select>
								</Form.Item>
							</FieldsGrid>
						)}

						<ActiveRow>
							<Form.Item
								name='activeRoom'
								label={labels.active}
								valuePropName='checked'
							>
								<Switch
									defaultChecked
									onChange={(checked) => updateDraftRoom({ activeRoom: checked })}
								/>
							</Form.Item>
							<span>{labels.activeHint}</span>
						</ActiveRow>
					</>
				)}
			</FormSection>

			<Modal
				title={labels.pricedExtras}
				open={isModalVisible}
				onOk={handlePricedExtrasSave}
				onCancel={() => setIsModalVisible(false)}
				okText={isArabic ? "حفظ" : "Save"}
				cancelText={isArabic ? "إلغاء" : "Cancel"}
				width={760}
			>
				<Form form={formPricedExtras} component={false}>
					<Table
						bordered
						dataSource={pricedExtrasData}
						columns={columns}
						rowClassName='editable-row'
						pagination={false}
					/>
				</Form>
				<Button
					type='dashed'
					onClick={handleAddRow}
					block
					icon={<PlusOutlined />}
					style={{ marginTop: 16 }}
				>
					{isArabic ? "إضافة جديد" : "Add New Extra"}
				</Button>
			</Modal>
		</ZCase1Wrapper>
	);
};

export default ZCase1;

const ZCase1Wrapper = styled.div`
	.ant-form-item {
		margin-bottom: 0;
	}

	.ant-form-item-label {
		font-weight: 800;
	}
`;

const FormSection = styled.div`
	display: grid;
	gap: 16px;
`;

const FieldsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(${({ $columns }) => $columns || 3}, minmax(0, 1fr));
	gap: 14px 18px;
	align-items: start;

	@media (max-width: 1100px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 720px) {
		grid-template-columns: 1fr;
	}
`;

const CommissionField = styled.div`
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 10px;
	align-items: end;
`;

const ActionField = styled.div`
	display: flex;
	align-items: end;
	min-height: 74px;

	button {
		width: 100%;
		border-radius: 10px;
		font-weight: 800;
	}
`;

const ActiveRow = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 14px;
	border: 1px solid #d7e7f8;
	border-radius: 12px;
	background: #f8fbff;
	width: fit-content;

	span {
		font-weight: 800;
		color: #38506d;
	}
`;
