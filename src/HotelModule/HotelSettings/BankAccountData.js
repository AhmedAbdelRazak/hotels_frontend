import React, { useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import {
	Table,
	Button,
	Modal,
	Form,
	Input,
	Space,
	Select,
	Divider,
	Typography,
	Popconfirm,
	Tooltip,
	message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { countryListWithAbbreviations } from "../../AdminModule/CustomerService/utils";

const { Option } = Select;
const { Title } = Typography;

/* ───────────────────────────── i18n (bank section only) ───────────────────────────── */
const t9n = {
	English: {
		bankSection: "Wire Transfer Accounts",
		addNewAccount: "Add New Account",
		addAccountTitle: "Add New Payment Account",
		updateAccountTitle: "Update Payment Account",
		accountType: "Account Type",
		accountCountry: "Business Country",
		accountAddress: "Business Address",
		accountCity: "Business City",
		accountPostalCode: "Business Postal Code",
		accountName: "Beneficiary / Business Name",
		accountNumber: "Account Number",
		routingNumber: "Routing Number (US)",
		swiftCode: "SWIFT / BIC (non‑US)",
		bankHeadQuarterCountry: "Bank HQ Country (optional)",
		bankHeadQuarterAddress: "Bank HQ Address (optional)",
		bankHeadQuarterCity: "Bank HQ City (optional)",
		bankHeadQuarterPostalCode: "Bank HQ Postal Code (optional)",
		bankName: "Bank Name",
		accountNickName: "Account Nickname (optional)",
		nameOfAccountOwner: "Full Name of Account Owner (optional)",
		cancel: "Cancel",
		addAccount: "Add Account",
		updateAccount: "Update Account",
		showDetails: "Show Details…",
		actions: "Actions",
		req: "is required",
		removed: "Removed",
		remove: "Remove",
		confirmRemove: "Remove this bank account?",
	},
	Arabic: {
		bankSection: "حسابات التحويل البنكي",
		addNewAccount: "إضافة حساب جديد",
		addAccountTitle: "إضافة حساب دفع جديد",
		updateAccountTitle: "تحديث حساب الدفع",
		accountType: "نوع الحساب",
		accountCountry: "بلد الشركة",
		accountAddress: "عنوان الشركة",
		accountCity: "مدينة الشركة",
		accountPostalCode: "الرمز البريدي للشركة",
		accountName: "اسم المستفيد / الشركة",
		accountNumber: "رقم الحساب",
		routingNumber: "رقم التوجيه (الولايات المتحدة)",
		swiftCode: "رمز السويفت / BIC (لغير الولايات المتحدة)",
		bankHeadQuarterCountry: "بلد المقر الرئيسي للبنك (اختياري)",
		bankHeadQuarterAddress: "عنوان المقر الرئيسي للبنك (اختياري)",
		bankHeadQuarterCity: "مدينة المقر الرئيسي للبنك (اختياري)",
		bankHeadQuarterPostalCode: "الرمز البريدي لمقر البنك (اختياري)",
		bankName: "اسم البنك",
		accountNickName: "اسم مستعار للحساب (اختياري)",
		nameOfAccountOwner: "الاسم الكامل لصاحب الحساب (اختياري)",
		cancel: "إلغاء",
		addAccount: "إضافة الحساب",
		updateAccount: "تحديث الحساب",
		showDetails: "عرض التفاصيل…",
		actions: "إجراءات",
		req: "مطلوب",
		removed: "تم الحذف",
		remove: "حذف",
		confirmRemove: "هل تريد حذف حساب البنك؟",
	},
};

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const BankAccountData = ({
	hotelDetails,
	setHotelDetails,
	submittingHotelDetails,
	chosenLanguage = "English",
}) => {
	const lang = t9n[chosenLanguage] || t9n.English;
	const dir = chosenLanguage === "Arabic" ? "rtl" : "ltr";

	const [isAddModalVisible, setIsAddModalVisible] = useState(false);
	const [isEditModalVisible, setIsEditModalVisible] = useState(false);
	const [editingAccount, setEditingAccount] = useState(null);
	const [form] = Form.useForm();

	const paymentSettingsData = useMemo(
		() => hotelDetails?.paymentSettings || [],
		[hotelDetails?.paymentSettings]
	);

	// Save (add or update)
	const handleSubmit = async (values) => {
		let newPaymentSettings;
		if (editingAccount?._id) {
			newPaymentSettings = paymentSettingsData.map((acc) =>
				acc._id === editingAccount._id ? { ...acc, ...values } : acc
			);
		} else {
			newPaymentSettings = [...paymentSettingsData, values];
		}

		const updated = { ...hotelDetails, paymentSettings: newPaymentSettings };

		if (!deepEqual(hotelDetails.paymentSettings, newPaymentSettings)) {
			try {
				const resp = await submittingHotelDetails("paymentSettings", updated);
				if (resp && resp._id) setHotelDetails(resp);
				else setHotelDetails(updated);
				message.success(
					chosenLanguage === "Arabic"
						? "تم حفظ الحساب البنكي"
						: "Bank account saved"
				);
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(err);
				message.error(
					chosenLanguage === "Arabic"
						? "فشل حفظ الحساب"
						: "Failed to save account"
				);
			}
		}

		form.resetFields();
		setEditingAccount(null);
		setIsAddModalVisible(false);
		setIsEditModalVisible(false);
	};

	// Remove (hard remove from array)
	const handleRemove = useCallback(
		async (record) => {
			try {
				const filtered = paymentSettingsData.filter(
					(acc) =>
						(acc._id || acc.accountNumber) !==
						(record._id || record.accountNumber)
				);
				const updated = { ...hotelDetails, paymentSettings: filtered };
				const resp = await submittingHotelDetails("paymentSettings", updated);
				if (resp && resp._id) setHotelDetails(resp);
				else setHotelDetails(updated);
				message.success(lang.removed);
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(err);
				message.error(
					chosenLanguage === "Arabic" ? "فشل الحذف" : "Failed to remove account"
				);
			}
		},
		[
			paymentSettingsData,
			hotelDetails,
			submittingHotelDetails,
			setHotelDetails,
			lang.removed,
			chosenLanguage,
		]
	);

	// Open edit (memoized for columns dependency)
	const showEditModal = useCallback(
		(record) => {
			setEditingAccount(record);
			form.setFieldsValue(record);
			setIsEditModalVisible(true);
		},
		[form]
	);

	// Table columns
	const columns = useMemo(
		() => [
			{ title: lang.accountName, dataIndex: "accountName", key: "accountName" },
			{ title: lang.bankName, dataIndex: "bankName", key: "bankName" },
			{
				title: lang.accountCountry,
				dataIndex: "accountCountry",
				key: "accountCountry",
				render: (code) => {
					const found = countryListWithAbbreviations.find(
						(c) => c.code === code
					);
					return found ? `${found.name} (${found.code})` : code || "-";
				},
			},
			{
				title: lang.accountNumber,
				dataIndex: "accountNumber",
				key: "accountNumber",
				render: (v) => (v ? `•••• ${String(v).slice(-4)}` : "-"),
			},
			{
				title: lang.actions,
				key: "actions",
				render: (_text, record) => (
					<Space>
						<Button
							type='link'
							icon={<EditOutlined />}
							onClick={() => showEditModal(record)}
						>
							{lang.showDetails}
						</Button>
						<Popconfirm
							title={lang.confirmRemove}
							okText={lang.remove}
							cancelText={lang.cancel}
							onConfirm={() => handleRemove(record)}
						>
							<Tooltip title={lang.remove}>
								<Button type='text' icon={<DeleteOutlined />} danger />
							</Tooltip>
						</Popconfirm>
					</Space>
				),
			},
		],
		[lang, showEditModal, handleRemove]
	);

	// Country-sensitive validation helpers
	const isUS = () =>
		String(form.getFieldValue("accountCountry") || "").toUpperCase() === "US";

	return (
		<SectionCard
			dir={dir}
			style={{ textAlign: dir === "rtl" ? "right" : "left" }}
		>
			<SectionHeader>
				<Title level={4} style={{ margin: 0 }}>
					{lang.bankSection}
				</Title>
				<Button
					type='primary'
					icon={<PlusOutlined />}
					onClick={() => {
						form.resetFields();
						setEditingAccount(null);
						setIsAddModalVisible(true);
					}}
				>
					{lang.addNewAccount}
				</Button>
			</SectionHeader>

			<Divider style={{ margin: "12px 0" }} />

			<Table
				dataSource={paymentSettingsData.map((item, index) => ({
					key: item._id || index,
					...item,
				}))}
				columns={columns}
				pagination={false}
			/>

			{/* Add / Edit Modal */}
			<Modal
				title={editingAccount ? lang.updateAccountTitle : lang.addAccountTitle}
				open={isAddModalVisible || isEditModalVisible}
				onCancel={() => {
					setIsAddModalVisible(false);
					setIsEditModalVisible(false);
					setEditingAccount(null);
					form.resetFields();
				}}
				footer={null}
				destroyOnClose
			>
				<Form
					form={form}
					layout='vertical'
					onFinish={handleSubmit}
					style={{ textAlign: dir === "rtl" ? "right" : "left" }}
					initialValues={{ accountType: "Business" }}
				>
					<Form.Item name='accountType' label={lang.accountType}>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountCountry'
						label={lang.accountCountry}
						rules={[
							{ required: true, message: `${lang.accountCountry} ${lang.req}` },
						]}
					>
						<Select
							showSearch
							placeholder={lang.accountCountry}
							optionFilterProp='children'
							filterOption={(input, option) =>
								String(option?.children ?? "")
									.toLowerCase()
									.includes(input.toLowerCase())
							}
						>
							{countryListWithAbbreviations.map((country) => (
								<Option key={country.code} value={country.code}>
									{country.name}
								</Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item
						name='accountName'
						label={lang.accountName}
						rules={[
							{ required: true, message: `${lang.accountName} ${lang.req}` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='bankName'
						label={lang.bankName}
						rules={[
							{ required: true, message: `${lang.bankName} ${lang.req}` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountNumber'
						label={lang.accountNumber}
						rules={[
							{ required: true, message: `${lang.accountNumber} ${lang.req}` },
						]}
					>
						<Input />
					</Form.Item>

					{/* Routing (US only) */}
					<Form.Item
						name='routingNumber'
						label={lang.routingNumber}
						rules={[
							{
								validator(_, value) {
									if (!isUS()) return Promise.resolve();
									if (!value)
										return Promise.reject(
											new Error(`${lang.routingNumber} ${lang.req}`)
										);
									return Promise.resolve();
								},
							},
						]}
					>
						<Input placeholder='For US accounts' />
					</Form.Item>

					{/* SWIFT (non-US only) */}
					<Form.Item
						name='swiftCode'
						label={lang.swiftCode}
						rules={[
							{
								validator(_, value) {
									if (isUS()) return Promise.resolve();
									if (!value)
										return Promise.reject(
											new Error(`${lang.swiftCode} ${lang.req}`)
										);
									return Promise.resolve();
								},
							},
						]}
					>
						<Input placeholder='For international wires' />
					</Form.Item>

					{/* Optional address fields */}
					<Form.Item name='accountAddress' label={lang.accountAddress}>
						<Input />
					</Form.Item>
					<Form.Item name='accountCity' label={lang.accountCity}>
						<Input />
					</Form.Item>
					<Form.Item name='accountPostalCode' label={lang.accountPostalCode}>
						<Input />
					</Form.Item>

					<Form.Item
						name='bankHeadQuarterCountry'
						label={lang.bankHeadQuarterCountry}
					>
						<Select
							showSearch
							allowClear
							placeholder={lang.bankHeadQuarterCountry}
							optionFilterProp='children'
							filterOption={(input, option) =>
								String(option?.children ?? "")
									.toLowerCase()
									.includes(input.toLowerCase())
							}
						>
							{countryListWithAbbreviations.map((country) => (
								<Option key={country.code} value={country.code}>
									{country.name}
								</Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item
						name='bankHeadQuarterAddress'
						label={lang.bankHeadQuarterAddress}
					>
						<Input />
					</Form.Item>
					<Form.Item
						name='bankHeadQuarterCity'
						label={lang.bankHeadQuarterCity}
					>
						<Input />
					</Form.Item>
					<Form.Item
						name='bankHeadQuarterPostalCode'
						label={lang.bankHeadQuarterPostalCode}
					>
						<Input />
					</Form.Item>

					<Form.Item name='nameOfAccountOwner' label={lang.nameOfAccountOwner}>
						<Input />
					</Form.Item>
					<Form.Item name='accountNickName' label={lang.accountNickName}>
						<Input />
					</Form.Item>

					<Form.Item>
						<Space>
							<Button type='primary' htmlType='submit'>
								{editingAccount ? lang.updateAccount : lang.addAccount}
							</Button>
							<Button
								onClick={() => {
									setIsAddModalVisible(false);
									setIsEditModalVisible(false);
									setEditingAccount(null);
									form.resetFields();
								}}
							>
								{lang.cancel}
							</Button>
						</Space>
					</Form.Item>
				</Form>
			</Modal>
		</SectionCard>
	);
};

export default BankAccountData;

/* ───────────────────────────── styles ───────────────────────────── */
const SectionCard = styled.div`
	border: 1px solid #e8e8e8;
	border-radius: 12px;
	padding: 16px;
	background: #fff;
`;
const SectionHeader = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;
