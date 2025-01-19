// PaymentSettings.js
import React, { useState } from "react";
import styled from "styled-components";
import { Table, Button, Modal, Form, Input, Space, Select } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { countryListWithAbbreviations } from "../../AdminModule/CustomerService/utils";

const { Option } = Select;

const translations = {
	English: {
		heading: "Payment Settings",
		addNewAccount: "Add New Account",
		addAccountTitle: "Add New Payment Account",
		updateAccountTitle: "Update Payment Account",
		accountType: "Account Type",
		accountCountry: "Business Country",
		accountAddress: "Business Address",
		accountCity: "Business City",
		accountPostalCode: "Business Postal Code",
		accountName: "Business Name",
		accountNumber: "Account Number",
		routingNumber: "Routing Number",
		swiftCode: "SWIFT Code",
		bankHeadQuarterCountry: "Bank Head Quarter Country",
		bankHeadQuarterAddress: "Bank Head Quarter Address",
		bankHeadQuarterCity: "Bank Head Quarter City",
		bankHeadQuarterPostalCode: "Bank Head Quarter Postal Code",
		bankName: "Bank Name",
		accountNickName: "Account Nick Name",
		nameOfAccountOwner: "Name Of Account Owner",
		cancel: "Cancel",
		addAccount: "Add Account",
		updateAccount: "Update Account",
		showDetails: "Show Details...",
	},
	Arabic: {
		heading: "إعدادات الدفع",
		addNewAccount: "إضافة حساب جديد",
		addAccountTitle: "إضافة حساب دفع جديد",
		updateAccountTitle: "تحديث حساب الدفع",
		accountType: "نوع الحساب",
		accountCountry: "بلد الشركة",
		accountAddress: "عنوان الشركة",
		accountCity: "مدينة الشركة",
		accountPostalCode: "Business Postal Code",
		accountName: "اسم الشركة",
		accountNumber: "Account Number",
		routingNumber: "Routing Number",
		swiftCode: "SWIFT Code",
		bankHeadQuarterCountry: "بلد الفرع الرئيسي للبنك",
		bankHeadQuarterAddress: "عنوان الفرع الرئيسي للبنك",
		bankHeadQuarterCity: "مدينة الفرع الرئيسي للبنك",
		bankHeadQuarterPostalCode: "Bank Head Quarter Postal Code",
		bankName: "اسم البنك",
		accountNickName: "اسم مستعار للحساب",
		nameOfAccountOwner: "الاسم الكامل لصاحب الحساب",
		cancel: "إلغاء",
		addAccount: "إضافة الحساب",
		updateAccount: "تحديث الحساب",
		showDetails: "عرض التفاصيل...",
	},
};

const PaymentSettings = ({
	setHotelDetails,
	hotelDetails,
	submittingHotelDetails,
	chosenLanguage,
}) => {
	// Choose translations based on language
	const lang = translations[chosenLanguage] || translations["English"];

	// Component state
	const [isAddModalVisible, setIsAddModalVisible] = useState(false);
	const [isEditModalVisible, setIsEditModalVisible] = useState(false);
	const [editingAccount, setEditingAccount] = useState(null);

	// AntD form instance for both modals
	const [form] = Form.useForm();

	// Payment settings – if not defined, default to an empty array
	const paymentSettingsData = hotelDetails.paymentSettings || [];

	// Simple deep equality check using JSON.stringify
	const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

	// Handler for form submission
	const handleFormSubmit = async (values) => {
		console.log("Form submitted with values:", values);
		let newPaymentSettings;

		if (editingAccount) {
			// Update mode: compare by _id if available
			newPaymentSettings = paymentSettingsData.map((acc) =>
				acc._id && editingAccount._id && acc._id === editingAccount._id
					? { ...acc, ...values }
					: acc
			);
			setEditingAccount(null);
			setIsEditModalVisible(false);
		} else {
			// Add mode: simply append the new payment setting
			newPaymentSettings = [...paymentSettingsData, values];
			setIsAddModalVisible(false);
		}
		console.log("New payment settings:", newPaymentSettings);

		// Build the updated hotelDetails locally
		const updatedDetails = {
			...hotelDetails,
			paymentSettings: newPaymentSettings,
		};

		console.log("Constructed updated hotelDetails:", updatedDetails);

		// Only trigger the API update if paymentSettings has truly changed.
		if (!deepEqual(hotelDetails.paymentSettings, newPaymentSettings)) {
			try {
				const response = await submittingHotelDetails(
					"paymentSettings",
					updatedDetails
				);
				console.log("Response from updateHotelDetails:", response);
				// Use the API response to update parent state (or fallback to updatedDetails)
				if (response) {
					setHotelDetails(response);
				} else {
					setHotelDetails(updatedDetails);
				}
			} catch (err) {
				console.error("Error updating hotelDetails:", err);
			}
		} else {
			console.log("No change in paymentSettings, not triggering API update.");
		}
		form.resetFields();
	};

	const showEditModal = (record) => {
		setEditingAccount(record);
		form.setFieldsValue(record);
		setIsEditModalVisible(true);
	};

	// Table column definitions remain unchanged.
	const columns = [
		{
			title: lang.accountType,
			dataIndex: "accountType",
			key: "accountType",
		},
		{
			title: lang.accountName,
			dataIndex: "accountName",
			key: "accountName",
		},
		{
			title: lang.accountNumber,
			dataIndex: "accountNumber",
			key: "accountNumber",
		},
		{
			title: lang.bankName,
			dataIndex: "bankName",
			key: "bankName",
		},
		{
			title: "Actions",
			key: "actions",
			render: (text, record) => (
				<Space>
					<Button
						type='link'
						icon={<EditOutlined />}
						onClick={() => showEditModal(record)}
					>
						{lang.showDetails}
					</Button>
				</Space>
			),
		},
	];

	// Common props for the Select components with type-to-search enabled
	const countrySelectProps = {
		showSearch: true,
		placeholder: lang.accountCountry,
		optionFilterProp: "children",
		filterOption: (input, option) =>
			option.children.toLowerCase().includes(input.toLowerCase()),
	};

	const bankCountrySelectProps = {
		showSearch: true,
		placeholder: lang.bankHeadQuarterCountry,
		optionFilterProp: "children",
		filterOption: (input, option) =>
			option.children.toLowerCase().includes(input.toLowerCase()),
	};

	return (
		<PaymentSettingsWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			style={{ textAlign: chosenLanguage === "Arabic" ? "right" : "" }}
		>
			<div
				className='header'
				style={{ textAlign: chosenLanguage === "Arabic" ? "right" : "" }}
			>
				<h2 style={{ textAlign: chosenLanguage === "Arabic" ? "right" : "" }}>
					{lang.heading}
				</h2>
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
			</div>

			<Table
				dataSource={paymentSettingsData.map((item, index) => ({
					key: index,
					...item,
				}))}
				columns={columns}
				pagination={false}
			/>

			{/* Add New Account Modal */}
			<Modal
				title={lang.addAccountTitle}
				open={isAddModalVisible}
				onCancel={() => setIsAddModalVisible(false)}
				footer={null}
			>
				<Form
					form={form}
					layout='vertical'
					onFinish={handleFormSubmit}
					style={{ textAlign: chosenLanguage === "Arabic" ? "right" : "" }}
				>
					<Form.Item
						style={{ textAlign: chosenLanguage === "Arabic" ? "right" : "" }}
						name='accountType'
						label={lang.accountType}
						initialValue='Business'
						rules={[
							{ required: true, message: `${lang.accountType} is required` },
						]}
					>
						<Input />
					</Form.Item>

					{/* Use Select for accountCountry */}
					<Form.Item
						name='accountCountry'
						label={lang.accountCountry}
						rules={[
							{ required: true, message: `${lang.accountCountry} is required` },
						]}
					>
						<Select {...countrySelectProps}>
							{countryListWithAbbreviations.map((country) => (
								<Option key={country.code} value={country.code}>
									{country.name}
								</Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item
						name='accountAddress'
						label={lang.accountAddress}
						rules={[
							{ required: true, message: `${lang.accountAddress} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountCity'
						label={lang.accountCity}
						rules={[
							{ required: true, message: `${lang.accountCity} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountPostalCode'
						label={lang.accountPostalCode}
						rules={[
							{
								required: true,
								message: `${lang.accountPostalCode} is required`,
							},
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountName'
						label={lang.accountName}
						rules={[
							{ required: true, message: `${lang.accountName} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountNumber'
						label={lang.accountNumber}
						rules={[
							{ required: true, message: `${lang.accountNumber} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='routingNumber'
						label={lang.routingNumber}
						rules={[
							{ required: true, message: `${lang.routingNumber} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='swiftCode'
						label={lang.swiftCode}
						rules={[
							{ required: true, message: `${lang.swiftCode} is required` },
						]}
					>
						<Input />
					</Form.Item>

					{/* Use Select for bankHeadQuarterCountry */}
					<Form.Item
						name='bankHeadQuarterCountry'
						label={lang.bankHeadQuarterCountry}
						rules={[
							{
								required: true,
								message: `${lang.bankHeadQuarterCountry} is required`,
							},
						]}
					>
						<Select {...bankCountrySelectProps}>
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
						rules={[
							{
								required: true,
								message: `${lang.bankHeadQuarterAddress} is required`,
							},
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='bankHeadQuarterCity'
						label={lang.bankHeadQuarterCity}
						rules={[
							{
								required: true,
								message: `${lang.bankHeadQuarterCity} is required`,
							},
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='bankHeadQuarterPostalCode'
						label={lang.bankHeadQuarterPostalCode}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='bankName'
						label={lang.bankName}
						rules={[
							{ required: true, message: `${lang.bankName} is required` },
						]}
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
								{lang.addAccount}
							</Button>
							<Button onClick={() => setIsAddModalVisible(false)}>
								{lang.cancel}
							</Button>
						</Space>
					</Form.Item>
				</Form>
			</Modal>

			{/* Update Account Modal */}
			<Modal
				title={lang.updateAccountTitle}
				open={isEditModalVisible}
				onCancel={() => {
					setIsEditModalVisible(false);
					setEditingAccount(null);
					form.resetFields();
				}}
				footer={null}
			>
				<Form
					form={form}
					layout='vertical'
					onFinish={handleFormSubmit}
					style={{ textAlign: chosenLanguage === "Arabic" ? "right" : "" }}
				>
					<Form.Item
						name='accountType'
						label={lang.accountType}
						rules={[
							{ required: true, message: `${lang.accountType} is required` },
						]}
					>
						<Input />
					</Form.Item>

					{/* Use Select for accountCountry */}
					<Form.Item
						name='accountCountry'
						label={lang.accountCountry}
						rules={[
							{ required: true, message: `${lang.accountCountry} is required` },
						]}
					>
						<Select {...countrySelectProps}>
							{countryListWithAbbreviations.map((country) => (
								<Option key={country.code} value={country.code}>
									{country.name}
								</Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item
						name='accountAddress'
						label={lang.accountAddress}
						rules={[
							{ required: true, message: `${lang.accountAddress} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountCity'
						label={lang.accountCity}
						rules={[
							{ required: true, message: `${lang.accountCity} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountPostalCode'
						label={lang.accountPostalCode}
						rules={[
							{
								required: true,
								message: `${lang.accountPostalCode} is required`,
							},
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountName'
						label={lang.accountName}
						rules={[
							{ required: true, message: `${lang.accountName} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='accountNumber'
						label={lang.accountNumber}
						rules={[
							{ required: true, message: `${lang.accountNumber} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='routingNumber'
						label={lang.routingNumber}
						rules={[
							{ required: true, message: `${lang.routingNumber} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='swiftCode'
						label={lang.swiftCode}
						rules={[
							{ required: true, message: `${lang.swiftCode} is required` },
						]}
					>
						<Input />
					</Form.Item>

					{/* Use Select for bankHeadQuarterCountry */}
					<Form.Item
						name='bankHeadQuarterCountry'
						label={lang.bankHeadQuarterCountry}
						rules={[
							{
								required: true,
								message: `${lang.bankHeadQuarterCountry} is required`,
							},
						]}
					>
						<Select {...bankCountrySelectProps}>
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
						rules={[
							{
								required: true,
								message: `${lang.bankHeadQuarterAddress} is required`,
							},
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='bankHeadQuarterCity'
						label={lang.bankHeadQuarterCity}
						rules={[
							{
								required: true,
								message: `${lang.bankHeadQuarterCity} is required`,
							},
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='bankHeadQuarterPostalCode'
						label={lang.bankHeadQuarterPostalCode}
						rules={[
							{
								required: true,
								message: `${lang.bankHeadQuarterPostalCode} is required`,
							},
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='bankName'
						label={lang.bankName}
						rules={[
							{ required: true, message: `${lang.bankName} is required` },
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name='nameOfAccountOwner'
						label={lang.nameOfAccountOwner}
						rules={[
							{
								required: true,
								message: `${lang.nameOfAccountOwner} is required`,
							},
						]}
					>
						<Input />
					</Form.Item>

					<Form.Item name='accountNickName' label={lang.accountNickName}>
						<Input />
					</Form.Item>

					<Form.Item>
						<Space>
							<Button type='primary' htmlType='submit'>
								{lang.updateAccount}
							</Button>
							<Button
								onClick={() => {
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
		</PaymentSettingsWrapper>
	);
};

export default PaymentSettings;

const PaymentSettingsWrapper = styled.div`
	padding: 20px;
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}
`;
