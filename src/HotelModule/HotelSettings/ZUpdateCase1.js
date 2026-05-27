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
	Radio,
	Checkbox,
} from "antd";
import styled from "styled-components";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { isAuthenticated } from "../../auth";
import ZAgentRoomOverridesButton from "./ZAgentRoomOverridesButton";

const { Option } = Select;

const normalizeId = (value) => String(value || "").trim();

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
	amenitiesList,
	roomTypeSelected,
	setRoomTypeSelected,
	setCustomRoomType,
	customRoomType,
	form,
	existingRoomDetails,
	viewsList = [],
	extraAmenitiesList = [],
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [pricedExtrasData, setPricedExtrasData] = useState([]);
	const [editingKey, setEditingKey] = useState("");
	const [currentRoomTypeValue, setCurrentRoomTypeValue] = useState(
		existingRoomDetails?.roomType || ""
	);
	const [formPricedExtras] = Form.useForm();
	const { user } = isAuthenticated();
	const isArabic = chosenLanguage === "Arabic";

	const labels = {
		roomType: isArabic ? "اختر نوع الغرفة" : "Select Room Type",
		customRoomType: isArabic ? "نوع الغرفة الآخر" : "Other Room Type",
		nameEn: isArabic ? "الاسم بالإنجليزية" : "Name In English",
		nameAr: isArabic ? "الاسم بالعربية" : "Name In Arabic",
		descEn: isArabic
			? "وصف الغرفة باللغة الإنجليزية"
			: "Room Description (English)",
		descAr: isArabic ? "الوصف بالعربية" : "Room Description (Arabic)",
		roomCount: isArabic ? "عدد الغرف" : "Room Count",
		rootCost: isArabic ? "السعر الجذري" : "Root Price",
		basePrice: isArabic ? "سعر الغرفة الأساسي" : "Main Price",
		commission: isArabic ? "العمولة" : "Commission",
		commissionRate: isArabic ? "معدل العمولة (%)" : "Commission Rate (%)",
		amenities: isArabic ? "وسائل الراحة" : "Room Amenities",
		views: isArabic ? "إطلالات" : "Room Views",
		extraAmenities: isArabic
			? "وسائل الراحة الإضافية"
			: "Extra Amenities",
		pricedExtras: isArabic ? "إضافات بسعر" : "Priced Extras",
		active: isArabic ? "نشط / غير نشط" : "Active / Inactive",
		activeHint: isArabic ? "الغرفة نشطة" : "Room is active",
	};

	const getCurrentRoomDetails = () => {
		const id = normalizeId(form.getFieldValue("_id") || existingRoomDetails?._id);
		return (
			(Array.isArray(hotelDetails?.roomCountDetails)
				? hotelDetails.roomCountDetails
				: []
			).find((room) => normalizeId(room._id) === id) ||
			existingRoomDetails ||
			{}
		);
	};

	const updateCurrentRoom = (updates = {}) => {
		const id = normalizeId(form.getFieldValue("_id") || existingRoomDetails?._id);
		if (!id) return;

		setHotelDetails((prevDetails) => {
			const list = Array.isArray(prevDetails.roomCountDetails)
				? [...prevDetails.roomCountDetails]
				: [];
			const existingIndex = list.findIndex(
				(room) => normalizeId(room._id) === id
			);
			const current =
				existingIndex > -1 ? list[existingIndex] : existingRoomDetails || {};
			const next = {
				...current,
				_id: id,
				...updates,
			};

			if (existingIndex > -1) list[existingIndex] = next;
			else list.push(next);

			return { ...prevDetails, roomCountDetails: list };
		});
	};

	useEffect(() => {
		window.scrollTo({ top: 90, behavior: "smooth" });
		if (!roomTypeSelected || !existingRoomDetails) {
			setPricedExtrasData([]);
			return;
		}

		const nextRoomType = existingRoomDetails.roomType || "";
		setCurrentRoomTypeValue(nextRoomType);
		form.setFieldsValue({
			_id: existingRoomDetails._id || "",
			roomType: nextRoomType,
			customRoomType: existingRoomDetails.customRoomType || "",
			displayName: existingRoomDetails.displayName || "",
			displayName_OtherLanguage:
				existingRoomDetails.displayName_OtherLanguage || "",
			roomCount: existingRoomDetails.count || 1,
			bedsCount: existingRoomDetails.bedsCount || 1,
			basePrice:
				existingRoomDetails.price?.basePrice ??
				existingRoomDetails.basePrice ??
				0,
			defaultCost:
				existingRoomDetails.defaultCost ??
				existingRoomDetails.rootPrice ??
				existingRoomDetails.price?.basePrice ??
				0,
			description: existingRoomDetails.description || "",
			description_OtherLanguage:
				existingRoomDetails.description_OtherLanguage || "",
			amenities: existingRoomDetails.amenities || [],
			views: existingRoomDetails.views || [],
			extraAmenities: existingRoomDetails.extraAmenities || [],
			activeRoom: existingRoomDetails.activeRoom ?? false,
			commisionIncluded: existingRoomDetails.commisionIncluded || false,
			roomCommission: existingRoomDetails.roomCommission ?? 10,
			pricedExtras: existingRoomDetails.pricedExtras || [],
			roomForGender: existingRoomDetails.roomForGender || "Unisex",
		});
		setPricedExtrasData(existingRoomDetails.pricedExtras || []);
	}, [roomTypeSelected, existingRoomDetails, form]);

	const handleRoomTypeChange = (value) => {
		setCurrentRoomTypeValue(value);
		setRoomTypeSelected(true);
		form.setFieldsValue({ roomType: value });

		if (value === "other") {
			setCustomRoomType("");
			form.setFieldsValue({ customRoomType: "" });
			return;
		}

		updateCurrentRoom({ roomType: value });
	};

	const handlePricedExtrasSave = () => {
		const cleanedExtras = pricedExtrasData.filter(
			(item) => item.name && item.price !== undefined
		);
		updateCurrentRoom({ pricedExtras: cleanedExtras });
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

			if (index > -1) nextData.splice(index, 1, { ...nextData[index], ...row });
			else nextData.push(row);

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
			render: (text, record) =>
				isEditing(record) ? (
					<Form.Item
						name='paymentFrequency'
						style={{ margin: 0 }}
						rules={[{ required: true, message: "Required" }]}
					>
						<Radio.Group>
							<Radio value='Per Night'>
								{isArabic ? "لكل ليلة" : "Per Night"}
							</Radio>
							<Radio value='One Time'>
								{isArabic ? "مرة واحدة" : "One Time"}
							</Radio>
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

	const roomTypeIsOther = currentRoomTypeValue === "other";
	const activeRoom = getCurrentRoomDetails();

	return (
		<ZUpdateCase1Wrapper $isArabic={isArabic} dir={isArabic ? "rtl" : "ltr"}>
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
						<Input
							onChange={(e) => updateCurrentRoom({ displayName: e.target.value })}
						/>
					</Form.Item>

					<Form.Item name='displayName_OtherLanguage' label={labels.nameAr}>
						<Input
							dir='rtl'
							onChange={(e) =>
								updateCurrentRoom({
									displayName_OtherLanguage: e.target.value,
								})
							}
						/>
					</Form.Item>
				</FieldsGrid>

				{roomTypeIsOther && (
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
									updateCurrentRoom({ roomType: value, customRoomType: value });
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
									onChange={(e) =>
										updateCurrentRoom({ description: e.target.value })
									}
								/>
							</Form.Item>

							<Form.Item name='description_OtherLanguage' label={labels.descAr}>
								<Input.TextArea
									dir='rtl'
									rows={4}
									onChange={(e) =>
										updateCurrentRoom({
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
										updateCurrentRoom({
											count: parseInt(e.target.value, 10) || 0,
										})
									}
								/>
							</Form.Item>

							<Form.Item
								name='defaultCost'
								label={labels.rootCost}
								rules={[{ required: true, message: "Please input the root price" }]}
							>
								<Input
									type='number'
									min={0}
									onChange={(e) =>
										updateCurrentRoom({
											defaultCost: parseFloat(e.target.value) || 0,
											rootPrice: parseFloat(e.target.value) || 0,
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
									onChange={(e) => {
										const basePrice = parseFloat(e.target.value) || 0;
										const current = getCurrentRoomDetails();
										updateCurrentRoom({
											basePrice,
											price: {
												...(current.price || {}),
												basePrice,
											},
										});
									}}
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
											updateCurrentRoom({
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
												updateCurrentRoom({
													roomCommission: parseNonNegativeDecimal(e.target.value),
												})
											}
										/>
									</Form.Item>
								</CommissionField>
							)}
						</FieldsGrid>

						{currentRoomTypeValue === "individualBed" && (
							<FieldsGrid $columns={2}>
								<Form.Item
									name='bedsCount'
									label={isArabic ? "عدد الأسرة لكل غرفة" : "Beds Per Room"}
								>
									<Input
										type='number'
										min={1}
										onChange={(e) =>
											updateCurrentRoom({
												bedsCount: parseInt(e.target.value, 10) || 1,
											})
										}
									/>
								</Form.Item>
								<Form.Item name='roomForGender' label={isArabic ? "غرفة لـ" : "Room For"}>
									<Select
										onChange={(value) => updateCurrentRoom({ roomForGender: value })}
									>
										<Option value='For Men'>{isArabic ? "للرجال" : "For Men"}</Option>
										<Option value='For Women'>
											{isArabic ? "للنساء" : "For Women"}
										</Option>
									</Select>
								</Form.Item>
							</FieldsGrid>
						)}

						<FieldsGrid $columns={4}>
							<Form.Item
								name='amenities'
								label={labels.amenities}
								rules={[{ required: true, message: "Please select room amenities" }]}
							>
								<Select
									mode='multiple'
									allowClear
									onChange={(value) => updateCurrentRoom({ amenities: value })}
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
									onChange={(value) => updateCurrentRoom({ views: value })}
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
									onChange={(value) =>
										updateCurrentRoom({ extraAmenities: value })
									}
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

						<ActiveRow>
							<ActiveStatusFrame>
								<Form.Item
									name='activeRoom'
									label={labels.active}
									valuePropName='checked'
								>
									<Switch
										onChange={(checked) =>
											updateCurrentRoom({ activeRoom: checked })
										}
									/>
								</Form.Item>
								<span>{labels.activeHint}</span>
							</ActiveStatusFrame>
							<AgentActionFrame>
								<ZAgentRoomOverridesButton
									chosenLanguage={chosenLanguage}
									hotelDetails={hotelDetails}
									roomDetails={activeRoom}
									onChange={(updates) => updateCurrentRoom(updates)}
								/>
							</AgentActionFrame>
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
		</ZUpdateCase1Wrapper>
	);
};

export default ZUpdateCase1;

const ZUpdateCase1Wrapper = styled.div`
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
	flex-wrap: wrap;
	gap: 14px;
	width: 100%;
`;

const ActiveStatusFrame = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 12px;
	min-height: 74px;
	padding: 12px 16px;
	border: 1px solid #d7e7f8;
	border-radius: 12px;
	background: #f8fbff;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);

	.ant-form-item {
		margin-bottom: 0;
	}

	span {
		font-weight: 800;
		color: #38506d;
	}
`;

const AgentActionFrame = styled.div`
	display: flex;
	align-items: center;
	min-height: 74px;
	padding: 12px;
	border: 1px solid #bfe6d2;
	border-radius: 12px;
	background: linear-gradient(135deg, #f3fff8 0%, #ffffff 100%);
	box-shadow: 0 8px 18px rgba(8, 112, 71, 0.08);
`;
