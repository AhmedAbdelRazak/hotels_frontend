import React, { useEffect, useMemo } from "react";
import {
	Modal,
	Input,
	Select,
	Form,
	Row,
	Col,
	InputNumber,
	message,
} from "antd";

const resolvePopupContainer = (triggerNode) => {
	if (typeof document === "undefined") {
		return triggerNode || null;
	}
	if (!triggerNode) {
		return document.body;
	}
	return (
		triggerNode.closest(".ant-modal-content, .ant-drawer-content") ||
		triggerNode.parentNode ||
		document.body
	);
};

/**
 * UpdatePDF (modal)
 * - Adds robust "Not Captured" (credit/ debit) handling.
 * - For "credit/ debit", the amount is REQUIRED and treated as a paid (authorized) amount.
 * - Validates amount <= totalAmount.
 * - Returns normalized values to parent for persistence.
 *
 * Props:
 *  - open, loading, onCancel, onSave
 *  - initialValues: {
 *      supplierName, supplierBookingNo, bookingNo, bookingSource, paymentStatus,
 *      guestName, guestEmail, guestPhone, nationality, passport, reservedBy,
 *      paidAmount? // optional, used to prefill when status is "credit/ debit"
 *    }
 *  - totalAmount: number
 *  - currentPaidOnline: number
 *  - currentPaidOffline: number
 */
const paymentOptions = [
	{ label: "Not Paid", value: "not paid" },
	{ label: "Paid Online", value: "paid online" },
	{ label: "Paid Offline", value: "paid offline" },
	// Business meaning: card on file, authorized (paid) but NOT captured yet
	{ label: "Not Captured", value: "credit/ debit" },
];

// Normalize incoming status variants to this component's values
const normalizePaymentStatus = (raw) => {
	const s = (raw || "").toString().trim().toLowerCase();

	// Common variants for "Not Captured"
	if (
		s === "not captured" ||
		s === "credit/debit" ||
		s === "credit / debit" ||
		s === "credit- debit" ||
		s === "credit - debit" ||
		s === "credit debit" ||
		s === "credit card" ||
		s === "credit" ||
		s === "debit"
	) {
		return "credit/ debit";
	}
	if (s === "paid online" || s === "paid_online") return "paid online";
	if (s === "paid offline" || s === "paid_offline") return "paid offline";
	if (s === "not paid" || s === "unpaid") return "not paid";
	return s; // already in expected values or empty
};

const shouldShowAmount = (status) =>
	status === "paid online" ||
	status === "paid offline" ||
	status === "credit/ debit";

// Per your requirement: treat "credit/ debit" as paid (authorized) -> required
const isAmountRequired = (status) =>
	status === "paid online" ||
	status === "paid offline" ||
	status === "credit/ debit";

const amountLabelFor = (status) => {
	if (status === "paid offline") return "Onsite Paid Amount (SAR)";
	if (status === "credit/ debit") return "Paid Amount (SAR) — Not Captured";
	return "Paid Amount (SAR)";
};

const UpdatePDF = ({
	open,
	loading,
	initialValues,
	totalAmount = 0,
	currentPaidOnline = 0,
	currentPaidOffline = 0,
	onCancel,
	onSave,
}) => {
	const [form] = Form.useForm();

	const init = useMemo(() => {
		const normalizedStatus = normalizePaymentStatus(
			initialValues?.paymentStatus
		);
		// Preserve any previously stored amount for "credit/ debit"
		const initialPaid =
			typeof initialValues?.paidAmount === "number" &&
			Number.isFinite(initialValues.paidAmount)
				? initialValues.paidAmount
				: undefined;

		return {
			supplierName: initialValues?.supplierName || "",
			supplierBookingNo: initialValues?.supplierBookingNo || "",
			bookingNo: initialValues?.bookingNo || "",
			bookingSource: initialValues?.bookingSource || "",
			paymentStatus: normalizedStatus,

			guestName: initialValues?.guestName || "",
			guestEmail: initialValues?.guestEmail || "",
			guestPhone: initialValues?.guestPhone || "",
			nationality: initialValues?.nationality || "",
			passport: initialValues?.passport || "",
			reservedBy: initialValues?.reservedBy || "",

			// For Not Captured we want to show whatever is already stored (if any)
			paidAmount:
				normalizedStatus === "credit/ debit" ? initialPaid : undefined,
		};
	}, [initialValues]);

	// Prefill when opening; preset amount by paymentStatus
	useEffect(() => {
		if (!open) return;
		form.resetFields();
		form.setFieldsValue(init);

		const s = (init.paymentStatus || "").toLowerCase();
		let preset;
		if (s === "paid online") {
			preset = currentPaidOnline;
		} else if (s === "paid offline") {
			preset = currentPaidOffline;
		} else if (s === "credit/ debit") {
			// If we already have a stored authorized amount, preserve it
			preset =
				typeof init.paidAmount === "number" && Number.isFinite(init.paidAmount)
					? init.paidAmount
					: undefined;
		} else {
			preset = undefined;
		}
		form.setFieldsValue({ paidAmount: preset });
	}, [open, init, form, currentPaidOnline, currentPaidOffline]);

	// Keep amount in sync with payment status changes
	const handlePaymentChange = (val) => {
		const s = (val || "").toLowerCase();
		if (s === "paid online") {
			form.setFieldsValue({ paidAmount: currentPaidOnline });
		} else if (s === "paid offline") {
			form.setFieldsValue({ paidAmount: currentPaidOffline });
		} else if (s === "credit/ debit") {
			// Require user entry for Not Captured (paid, not captured) flow
			form.setFieldsValue({ paidAmount: undefined });
		} else {
			// Not Paid or cleared
			form.setFieldsValue({ paidAmount: undefined });
		}
	};

	const handleOk = async () => {
		try {
			const vals = await form.validateFields();

			// Normalize status for consistency
			const normalizedStatus = normalizePaymentStatus(vals.paymentStatus);
			const normalizedAmount =
				typeof vals.paidAmount === "number"
					? Number(Number(vals.paidAmount).toFixed(2))
					: undefined;

			const payload = {
				...vals,
				paymentStatus: normalizedStatus,
				paidAmount: normalizedAmount,
			};

			await onSave(payload);
		} catch (err) {
			if (err && err.errorFields) return; // inline validation already shown
			const msg =
				err?.message ||
				err?.error ||
				err?.data?.message ||
				(typeof err === "string" ? err : "Failed to save changes.");
			message.error(msg);
		}
	};

	const cap = Number(totalAmount || 0);

	return (
		<Modal
			title='Update Reservation (Receipt Fields)'
			open={open}
			rootClassName='update-pdf-modal'
			wrapClassName='update-pdf-modal'
			zIndex={13020}
			styles={{ mask: { zIndex: 13019 } }}
			getContainer={() => document.body}
			onOk={handleOk}
			okText={loading ? "Saving..." : "Save"}
			confirmLoading={loading}
			onCancel={onCancel}
			destroyOnClose
			width='820px'
		>
			<Form
				form={form}
				layout='vertical'
				initialValues={init}
				autoComplete='off'
			>
				<Row gutter={16}>
					<Col span={12}>
						<Form.Item label='Supplied By (Supplier)' name='supplierName'>
							<Input placeholder='Enter supplier name' />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label='Supplier Booking No' name='supplierBookingNo'>
							<Input placeholder='Enter supplier booking no' />
						</Form.Item>
					</Col>
				</Row>

				<Row gutter={16}>
					<Col span={12}>
						<Form.Item
							label='Booking No (display)'
							name='bookingNo'
							tooltip='Shown on the PDF. Backend keeps confirmation number immutable unless hotelId changes (relocation).'
						>
							<Input disabled />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label='Booking Source' name='bookingSource'>
							<Input placeholder='e.g., Jannat Employee / Website / Partner' />
						</Form.Item>
					</Col>
				</Row>

				<Row gutter={16}>
					<Col span={12}>
						<Form.Item label='Payment Status' name='paymentStatus'>
							<Select
								allowClear
								options={paymentOptions}
								placeholder='Select payment status'
								onChange={handlePaymentChange}
								getPopupContainer={resolvePopupContainer}
							/>
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label='Reserved By (Customer Details)' name='reservedBy'>
							<Input placeholder='Employee / Affiliate / etc.' />
						</Form.Item>
					</Col>
				</Row>

				{/* Conditionally render Paid/Authorization Amount when needed */}
				<Form.Item noStyle shouldUpdate>
					{({ getFieldValue }) => {
						const status = (getFieldValue("paymentStatus") || "").toLowerCase();
						if (shouldShowAmount(status)) {
							const label = amountLabelFor(status);
							const required = isAmountRequired(status);
							return (
								<Row gutter={16}>
									<Col span={12}>
										<Form.Item
											label={label}
											name='paidAmount'
											rules={[
												...(required
													? [
															{
																required: true,
																message: "Please enter the amount.",
															},
													  ]
													: []),
												{
													validator: (_, value) => {
														if (
															value === undefined ||
															value === null ||
															value === ""
														) {
															// If required, the "required" rule above will catch empties.
															return Promise.resolve();
														}
														const n = Number(value);
														if (!Number.isFinite(n) || n < 0) {
															return Promise.reject(
																new Error(
																	"Amount must be a valid non-negative number."
																)
															);
														}
														if (n > cap) {
															return Promise.reject(
																new Error(
																	`Amount must be ≤ ${cap.toFixed(2)} SAR.`
																)
															);
														}
														return Promise.resolve();
													},
												},
											]}
											extra={
												status === "credit/ debit"
													? "Card authorized (paid) but not captured yet. This amount will be considered paid until captured/refunded."
													: undefined
											}
										>
											<InputNumber
												min={0}
												step={0.01}
												style={{ width: "100%" }}
												placeholder='0.00'
											/>
										</Form.Item>
									</Col>
								</Row>
							);
						}
						return null;
					}}
				</Form.Item>

				<Row gutter={16}>
					<Col span={12}>
						<Form.Item label='Guest Name' name='guestName'>
							<Input placeholder='Guest full name' />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item
							label='Guest Email'
							name='guestEmail'
							rules={[{ type: "email", message: "Invalid email address" }]}
						>
							<Input placeholder='guest@email.com' />
						</Form.Item>
					</Col>
				</Row>

				<Row gutter={16}>
					<Col span={12}>
						<Form.Item label='Guest Phone' name='guestPhone'>
							<Input placeholder='+966...' />
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item label='Nationality' name='nationality'>
							<Input placeholder='Nationality' />
						</Form.Item>
					</Col>
				</Row>

				<Row gutter={16}>
					<Col span={12}>
						<Form.Item label='Passport #' name='passport'>
							<Input placeholder='Passport number' />
						</Form.Item>
					</Col>
					<Col span={12} />
				</Row>
			</Form>
		</Modal>
	);
};

export default UpdatePDF;
