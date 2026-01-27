import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import styled from "styled-components";
import {
	Button,
	Card,
	DatePicker,
	Form,
	Input,
	InputNumber,
	Modal,
	Popconfirm,
	Select,
	Table,
	Tooltip,
} from "antd";
import {
	CloseCircleOutlined,
	DeleteOutlined,
	EditOutlined,
	FileImageOutlined,
	FilePdfOutlined,
	PlusOutlined,
	ReloadOutlined,
	UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import { isAuthenticated } from "../../auth";
import { SUPER_USER_IDS } from "../utils/superUsers";
import {
	cloudinaryUpload1,
	createExpense,
	deleteExpense,
	gettingHotelDetailsForAdmin,
	listExpenseHotels,
	listExpenses,
	updateExpense,
} from "../apiAdmin";

const { TextArea } = Input;

const extractHotels = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (payload?.hotels && Array.isArray(payload.hotels)) return payload.hotels;
	const firstArray = Object.values(payload || {}).find(Array.isArray);
	return firstArray || [];
};

const normalizeExpenses = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	return [];
};

const formatCurrency = (value) => {
	const num = Number(value || 0);
	if (Number.isNaN(num)) return "0.00";
	return num.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

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

const pickerPopupStyle = { zIndex: 20010 };

const getDateValue = (value) => {
	const parsed = dayjs(value);
	if (!parsed.isValid()) return Number.MAX_SAFE_INTEGER;
	return parsed.valueOf();
};

const DEFAULT_HOTEL_FILTER = "all";
const DEFAULT_SORT_STATE = { columnKey: "expenseDate", order: "ascend" };

const ALLOWED_RECEIPT_TYPES = ["application/pdf"];
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const formatBytes = (bytes) => {
	if (!Number(bytes)) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const index = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1
	);
	const value = bytes / Math.pow(1024, index);
	return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const getFileExtension = (name = "") => {
	const parts = String(name).split(".");
	if (parts.length < 2) return "";
	return parts.pop().toLowerCase();
};

const isReceiptTypeAllowed = (file) => {
	if (!file) return false;
	const ext = getFileExtension(file.name);
	if (ALLOWED_RECEIPT_TYPES.includes(file.type)) return true;
	if (file.type && file.type.startsWith("image/")) return true;
	return [
		"pdf",
		"jpg",
		"jpeg",
		"png",
		"gif",
		"webp",
		"bmp",
		"tiff",
		"svg",
	].includes(ext);
};

const isReceiptPdf = (receipt) => {
	if (!receipt) return false;
	if (receipt.fileType === "application/pdf") return true;
	const url = String(receipt.url || "").toLowerCase();
	const name = String(receipt.fileName || "").toLowerCase();
	return url.endsWith(".pdf") || name.endsWith(".pdf");
};

const getReceiptLabel = (receipt) => {
	if (!receipt) return "";
	return (
		receipt.fileName || (isReceiptPdf(receipt) ? "Receipt.pdf" : "Receipt")
	);
};

const fileToBase64 = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});

const ExpensesManagement = () => {
	const { user, token } = isAuthenticated() || {};
	const history = useHistory();
	const [form] = Form.useForm();
	const [editForm] = Form.useForm();
	const receiptInputRef = useRef(null);
	const editReceiptInputRef = useRef(null);
	const isAllowed = SUPER_USER_IDS.includes(user?._id);

	const [hotels, setHotels] = useState([]);
	const [expenseHotels, setExpenseHotels] = useState([]);
	const [expenses, setExpenses] = useState([]);
	const [loadingHotels, setLoadingHotels] = useState(false);
	const [loadingExpenseHotels, setLoadingExpenseHotels] = useState(false);
	const [loadingExpenses, setLoadingExpenses] = useState(false);
	const [saving, setSaving] = useState(false);
	const [receipt, setReceipt] = useState(null);
	const [receiptUploading, setReceiptUploading] = useState(false);
	const [receiptMissing, setReceiptMissing] = useState(false);
	const [selectedHotelFilter, setSelectedHotelFilter] =
		useState(DEFAULT_HOTEL_FILTER);
	const [sortState, setSortState] = useState(DEFAULT_SORT_STATE);
	const [editOpen, setEditOpen] = useState(false);
	const [editingExpense, setEditingExpense] = useState(null);
	const [editSaving, setEditSaving] = useState(false);
	const [editReceipt, setEditReceipt] = useState(null);
	const [editReceiptUploading, setEditReceiptUploading] = useState(false);
	const [editReceiptMissing, setEditReceiptMissing] = useState(false);
	const [deletingId, setDeletingId] = useState(null);

	useEffect(() => {
		if (!user?._id || !isAllowed) {
			history.push("/");
		}
	}, [history, isAllowed, user?._id]);

	const sortedHotels = useMemo(() => {
		const list = Array.isArray(hotels) ? hotels : [];
		return list
			.map((hotel) => ({
				_id: hotel?._id,
				hotelName: hotel?.hotelName || "",
			}))
			.filter((hotel) => hotel._id && hotel.hotelName)
			.sort((a, b) =>
				a.hotelName.localeCompare(b.hotelName, undefined, {
					sensitivity: "base",
				})
			);
	}, [hotels]);

	const sortedExpenseHotels = useMemo(() => {
		const list = Array.isArray(expenseHotels) ? expenseHotels : [];
		return list
			.map((hotel) => ({
				_id: hotel?._id,
				hotelName: hotel?.hotelName || "",
			}))
			.filter((hotel) => hotel._id && hotel.hotelName)
			.sort((a, b) =>
				a.hotelName.localeCompare(b.hotelName, undefined, {
					sensitivity: "base",
				})
			);
	}, [expenseHotels]);

	const expenseHotelOptions = useMemo(
		() => [
			{ value: DEFAULT_HOTEL_FILTER, label: "All Hotels" },
			...sortedExpenseHotels.map((hotel) => ({
				value: hotel._id,
				label: hotel.hotelName,
			})),
		],
		[sortedExpenseHotels]
	);

	const totalAmount = useMemo(
		() =>
			(expenses || []).reduce(
				(sum, expense) => sum + Number(expense?.amount || 0),
				0
			),
		[expenses]
	);

	const totalPaidAmount = useMemo(
		() =>
			(expenses || []).reduce(
				(sum, expense) => sum + Number(expense?.paid_amount || 0),
				0
			),
		[expenses]
	);

	const loadHotels = useCallback(async () => {
		if (!user?._id || !token || !isAllowed) return;
		setLoadingHotels(true);
		try {
			const payload = await gettingHotelDetailsForAdmin(user._id, token);
			if (!payload) {
				toast.error("Unable to load hotels. Please try again.");
				setHotels([]);
				return;
			}
			if (payload?.error) {
				toast.error(payload.error);
				setHotels([]);
			} else {
				setHotels(extractHotels(payload));
			}
		} catch (error) {
			console.error(error);
			setHotels([]);
			toast.error("Unable to load hotels. Please try again.");
		} finally {
			setLoadingHotels(false);
		}
	}, [isAllowed, token, user?._id]);

	const loadExpenseHotels = useCallback(async () => {
		if (!user?._id || !token || !isAllowed) return;
		setLoadingExpenseHotels(true);
		try {
			const payload = await listExpenseHotels(user._id, token);
			if (!payload) {
				toast.error("Unable to load expense hotels. Please try again.");
				setExpenseHotels([]);
				return;
			}
			if (payload?.error) {
				toast.error(payload.error);
				setExpenseHotels([]);
			} else {
				setExpenseHotels(extractHotels(payload));
			}
		} catch (error) {
			console.error(error);
			setExpenseHotels([]);
			toast.error("Unable to load expense hotels. Please try again.");
		} finally {
			setLoadingExpenseHotels(false);
		}
	}, [isAllowed, token, user?._id]);

	const loadExpenses = useCallback(
		async (hotelFilterId) => {
			if (!user?._id || !token || !isAllowed) return;
			setLoadingExpenses(true);
			try {
				const filterId =
					hotelFilterId && hotelFilterId !== DEFAULT_HOTEL_FILTER
						? hotelFilterId
						: null;
				const payload = await listExpenses(
					user._id,
					token,
					filterId ? { hotelId: filterId } : undefined
				);
				if (!payload) {
					toast.error("Unable to load expenses. Please try again.");
					setExpenses([]);
					return;
				}
				if (payload?.error) {
					toast.error(payload.error);
					setExpenses([]);
				} else {
					setExpenses(normalizeExpenses(payload));
				}
			} catch (error) {
				console.error(error);
				setExpenses([]);
				toast.error("Unable to load expenses. Please try again.");
			} finally {
				setLoadingExpenses(false);
			}
		},
		[isAllowed, token, user?._id]
	);

	const handleHotelFilterChange = useCallback((value) => {
		setSelectedHotelFilter(value || DEFAULT_HOTEL_FILTER);
	}, []);

	const handleResetFilters = useCallback(() => {
		setSelectedHotelFilter(DEFAULT_HOTEL_FILTER);
		setSortState(DEFAULT_SORT_STATE);
	}, []);

	const handleTableChange = useCallback((_, __, sorter) => {
		const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
		if (!normalizedSorter?.order) {
			setSortState(DEFAULT_SORT_STATE);
			return;
		}
		setSortState({
			columnKey: normalizedSorter.columnKey || normalizedSorter.field,
			order: normalizedSorter.order,
		});
	}, []);

	const handleRefresh = useCallback(async () => {
		await Promise.all([loadExpenses(selectedHotelFilter), loadExpenseHotels()]);
	}, [loadExpenses, loadExpenseHotels, selectedHotelFilter]);

	const uploadReceiptFile = useCallback(
		async (file) => {
			if (!user?._id || !token) {
				toast.error("Please sign in again to continue.");
				return null;
			}
			const base64File = await fileToBase64(file);
			const uploadResponse = await cloudinaryUpload1(user._id, token, {
				image: base64File,
			});
			if (!uploadResponse?.url || !uploadResponse?.public_id) {
				throw new Error("Receipt upload failed");
			}
			return {
				public_id: uploadResponse.public_id,
				url: uploadResponse.url,
				fileName: file.name,
				fileType: file.type,
			};
		},
		[token, user?._id]
	);

	const handleReceiptChange = useCallback(
		async (event) => {
			const file = event.target.files?.[0];
			if (receiptInputRef.current) {
				receiptInputRef.current.value = "";
			}
			if (!file) return;
			if (!isReceiptTypeAllowed(file)) {
				toast.error("Only PDF or image receipts are allowed.");
				return;
			}
			if (file.size > MAX_RECEIPT_BYTES) {
				toast.error(
					`Receipt must be ${formatBytes(MAX_RECEIPT_BYTES)} or less.`
				);
				return;
			}

			setReceiptUploading(true);
			setReceiptMissing(false);
			try {
				const uploadedReceipt = await uploadReceiptFile(file);
				if (!uploadedReceipt) return;
				setReceipt(uploadedReceipt);
			} catch (error) {
				console.error(error);
				toast.error("Failed to upload receipt. Please try again.");
			} finally {
				setReceiptUploading(false);
			}
		},
		[uploadReceiptFile]
	);

	const handleEditReceiptChange = useCallback(
		async (event) => {
			const file = event.target.files?.[0];
			if (editReceiptInputRef.current) {
				editReceiptInputRef.current.value = "";
			}
			if (!file) return;
			if (!isReceiptTypeAllowed(file)) {
				toast.error("Only PDF or image receipts are allowed.");
				return;
			}
			if (file.size > MAX_RECEIPT_BYTES) {
				toast.error(
					`Receipt must be ${formatBytes(MAX_RECEIPT_BYTES)} or less.`
				);
				return;
			}

			setEditReceiptUploading(true);
			setEditReceiptMissing(false);
			try {
				const uploadedReceipt = await uploadReceiptFile(file);
				if (!uploadedReceipt) return;
				setEditReceipt(uploadedReceipt);
			} catch (error) {
				console.error(error);
				toast.error("Failed to upload receipt. Please try again.");
			} finally {
				setEditReceiptUploading(false);
			}
		},
		[uploadReceiptFile]
	);

	const clearReceipt = () => {
		setReceipt(null);
		setReceiptMissing(false);
	};

	const clearEditReceipt = () => {
		setEditReceipt(null);
		setEditReceiptMissing(false);
	};

	useEffect(() => {
		loadHotels();
	}, [loadHotels]);

	useEffect(() => {
		loadExpenseHotels();
	}, [loadExpenseHotels]);

	useEffect(() => {
		loadExpenses(selectedHotelFilter);
	}, [loadExpenses, selectedHotelFilter]);

	const handleCreateExpense = async (values) => {
		if (!user?._id || !token) {
			toast.error("Please sign in again to continue.");
			return;
		}
		if (receiptUploading) {
			toast.error("Please wait for the receipt upload to finish.");
			return;
		}
		if (!values?.expenseDate) {
			toast.error("Please select an expense date.");
			return;
		}
		if (
			values?.paid_amount === undefined ||
			values?.paid_amount === null ||
			Number.isNaN(Number(values.paid_amount))
		) {
			toast.error("Please enter the paid amount.");
			return;
		}
		if (!receipt?.url || !receipt?.public_id) {
			setReceiptMissing(true);
			toast.error("Please upload a receipt (PDF or image) before saving.");
			return;
		}

		setSaving(true);
		try {
			const formattedDate = dayjs(values.expenseDate).format("YYYY-MM-DD");
			const payload = {
				...values,
				expenseDate: formattedDate,
				amount: Number(values.amount),
				paid_amount: Number(values.paid_amount),
				currency: "SAR",
				receipt: {
					public_id: receipt.public_id,
					url: receipt.url,
					fileName: receipt.fileName || "",
					fileType: receipt.fileType || "",
				},
			};
			const response = await createExpense(user._id, token, payload);
			if (!response) {
				toast.error("Unable to add expense. Please try again.");
				return;
			}
			if (response?.error) {
				toast.error(response.error);
				return;
			}

			const createdExpense = response?.data || response;
			if (!createdExpense?._id) {
				toast.error("Expense created, but could not read the response.");
				return;
			}

			form.resetFields();
			form.setFieldsValue({ hotelId: values.hotelId });
			setReceipt(null);
			setReceiptMissing(false);
			toast.success("Expense added successfully.");
			await handleRefresh();
		} catch (error) {
			console.error(error);
			toast.error(error?.message || "Failed to add expense.");
		} finally {
			setSaving(false);
		}
	};

	const openEditModal = useCallback(
		(expense) => {
			setEditingExpense(expense);
			editForm.setFieldsValue({
				label: expense?.label || "",
				amount: Number(expense?.amount || 0),
				paid_amount: Number(expense?.paid_amount || 0),
				description: expense?.description || "",
				hotelId: expense?.hotelId?._id || expense?.hotelId || "",
				expenseDate: expense?.expenseDate ? dayjs(expense.expenseDate) : null,
			});
			setEditReceipt(expense?.receipt || null);
			setEditReceiptMissing(false);
			setEditOpen(true);
		},
		[editForm]
	);

	const closeEditModal = () => {
		setEditOpen(false);
		setEditingExpense(null);
		editForm.resetFields();
		setEditReceipt(null);
		setEditReceiptMissing(false);
	};

	const handleUpdateExpense = async () => {
		if (!editingExpense?._id) return;
		if (!user?._id || !token) {
			toast.error("Please sign in again to continue.");
			return;
		}
		try {
			const values = await editForm.validateFields();
			if (editReceiptUploading) {
				toast.error("Please wait for the receipt upload to finish.");
				return;
			}
			if (!values?.expenseDate) {
				toast.error("Please select an expense date.");
				return;
			}
			if (
				values?.paid_amount === undefined ||
				values?.paid_amount === null ||
				Number.isNaN(Number(values.paid_amount))
			) {
				toast.error("Please enter the paid amount.");
				return;
			}
			if (!editReceipt?.url || !editReceipt?.public_id) {
				setEditReceiptMissing(true);
				toast.error("Please upload a receipt (PDF or image) before saving.");
				return;
			}
			setEditSaving(true);

			const formattedDate = dayjs(values.expenseDate).format("YYYY-MM-DD");
			const payload = {
				...values,
				expenseDate: formattedDate,
				amount: Number(values.amount),
				paid_amount: Number(values.paid_amount),
				currency: "SAR",
				receipt: {
					public_id: editReceipt.public_id,
					url: editReceipt.url,
					fileName: editReceipt.fileName || "",
					fileType: editReceipt.fileType || "",
				},
			};
			const response = await updateExpense(
				editingExpense._id,
				user._id,
				token,
				payload
			);

			if (!response) {
				toast.error("Unable to update expense. Please try again.");
				return;
			}
			if (response?.error) {
				toast.error(response.error);
				return;
			}

			toast.success("Expense updated successfully.");
			closeEditModal();
			await handleRefresh();
		} catch (error) {
			if (!error?.errorFields) {
				console.error(error);
				toast.error(error?.message || "Failed to update expense.");
			}
		} finally {
			setEditSaving(false);
		}
	};

	const handleDeleteExpense = useCallback(
		async (expenseId) => {
			if (!expenseId) return;
			if (!user?._id || !token) {
				toast.error("Please sign in again to continue.");
				return;
			}
			setDeletingId(expenseId);
			try {
				const response = await deleteExpense(expenseId, user._id, token);
				if (!response) {
					toast.error("Unable to delete expense. Please try again.");
					return;
				}
				if (response?.error) {
					toast.error(response.error);
					return;
				}
				toast.success("Expense deleted successfully.");
				await handleRefresh();
			} catch (error) {
				console.error(error);
				toast.error(error?.message || "Failed to delete expense.");
			} finally {
				setDeletingId(null);
			}
		},
		[handleRefresh, token, user?._id]
	);

	const columns = useMemo(
		() => [
			{
				title: "Label",
				dataIndex: "label",
				key: "label",
				render: (text) => text || "-",
			},
			{
				title: "Hotel",
				key: "hotel",
				render: (_, record) =>
					record?.hotelId?.hotelName ||
					record?.hotelName ||
					record?.hotelId ||
					"-",
			},
			{
				title: "Date",
				dataIndex: "expenseDate",
				key: "expenseDate",
				render: (value) => (value ? dayjs(value).format("YYYY-MM-DD") : "-"),
				sorter: (a, b) =>
					getDateValue(a?.expenseDate) - getDateValue(b?.expenseDate),
				sortOrder:
					sortState.columnKey === "expenseDate" ? sortState.order : null,
				sortDirections: ["ascend", "descend"],
			},
			{
				title: "Amount (SAR)",
				dataIndex: "amount",
				key: "amount",
				align: "right",
				render: (value) => formatCurrency(value),
				sorter: (a, b) => Number(a?.amount || 0) - Number(b?.amount || 0),
				sortOrder: sortState.columnKey === "amount" ? sortState.order : null,
				sortDirections: ["ascend", "descend"],
			},
			{
				title: "Paid Amount (SAR)",
				dataIndex: "paid_amount",
				key: "paid_amount",
				align: "right",
				render: (value) => formatCurrency(value),
				sorter: (a, b) =>
					Number(a?.paid_amount || 0) - Number(b?.paid_amount || 0),
				sortOrder:
					sortState.columnKey === "paid_amount" ? sortState.order : null,
				sortDirections: ["ascend", "descend"],
			},
			{
				title: "Description",
				dataIndex: "description",
				key: "description",
				render: (value) => {
					const text = value || "-";
					if (text.length <= 45) return text;
					return (
						<Tooltip title={text}>
							<span className='truncate'>{text}</span>
						</Tooltip>
					);
				},
			},
			{
				title: "Receipt",
				key: "receipt",
				render: (_, record) => {
					const receiptData = record?.receipt;
					if (!receiptData?.url) return "-";
					const isPdf = isReceiptPdf(receiptData);
					const label = getReceiptLabel(receiptData);
					return (
						<Tooltip title={label}>
							<ReceiptLink
								href={receiptData.url}
								target='_blank'
								rel='noreferrer'
							>
								{isPdf ? <FilePdfOutlined /> : <FileImageOutlined />}
								<span>{label}</span>
							</ReceiptLink>
						</Tooltip>
					);
				},
			},
			{
				title: "Edit",
				key: "edit",
				align: "center",
				render: (_, record) => (
					<Tooltip title='Edit expense'>
						<IconButton
							type='text'
							icon={<EditOutlined />}
							onClick={() => openEditModal(record)}
						/>
					</Tooltip>
				),
			},
			{
				title: "Delete",
				key: "delete",
				align: "center",
				render: (_, record) => (
					<Popconfirm
						title='Delete this expense?'
						description='This action cannot be undone.'
						okText='Delete'
						cancelText='Cancel'
						onConfirm={() => handleDeleteExpense(record._id)}
					>
						<Tooltip title='Delete expense'>
							<IconButton
								type='text'
								danger
								icon={<DeleteOutlined />}
								loading={deletingId === record._id}
							/>
						</Tooltip>
					</Popconfirm>
				),
			},
		],
		[deletingId, handleDeleteExpense, openEditModal, sortState]
	);

	return (
		<ExpensesManagementWrapper>
			<Card
				title='Add Expense'
				size='small'
				extra={
					<SmallNote>
						Currency: <strong>SAR</strong>
					</SmallNote>
				}
			>
				<Form form={form} layout='vertical' onFinish={handleCreateExpense}>
					<FormGrid>
						<Form.Item
							name='hotelId'
							label='Hotel'
							rules={[{ required: true, message: "Please select a hotel" }]}
						>
							<Select
								showSearch
								loading={loadingHotels}
								placeholder='Select hotel'
								optionFilterProp='label'
								options={sortedHotels.map((hotel) => ({
									value: hotel._id,
									label: hotel.hotelName,
								}))}
							/>
						</Form.Item>

						<Form.Item
							name='label'
							label='Label'
							rules={[{ required: true, message: "Please add a label" }]}
						>
							<Input placeholder='Expense label' />
						</Form.Item>

						<Form.Item
							name='amount'
							label='Amount'
							rules={[{ required: true, message: "Please enter the amount" }]}
						>
							<InputNumber
								min={0}
								precision={2}
								style={{ width: "100%" }}
								placeholder='0.00'
							/>
						</Form.Item>

						<Form.Item
							name='paid_amount'
							label='Paid Amount'
							rules={[
								{ required: true, message: "Please enter the paid amount" },
							]}
						>
							<InputNumber
								min={0}
								precision={2}
								style={{ width: "100%" }}
								placeholder='0.00'
							/>
						</Form.Item>

						<Form.Item
							name='expenseDate'
							label='Expense Date'
							rules={[
								{ required: true, message: "Please select the expense date" },
							]}
						>
							<DatePicker
								style={{ width: "100%" }}
								format='YYYY-MM-DD'
								getPopupContainer={resolvePopupContainer}
								popupStyle={pickerPopupStyle}
							/>
						</Form.Item>
					</FormGrid>

					<Form.Item name='description' label='Description (optional)'>
						<TextArea rows={3} placeholder='Short description' />
					</Form.Item>

					<Form.Item label='Receipt (PDF or image)' required>
						<ReceiptUploadBox $error={receiptMissing}>
							<ReceiptActions>
								<input
									ref={receiptInputRef}
									type='file'
									accept='image/*,.pdf'
									onChange={handleReceiptChange}
									style={{ display: "none" }}
								/>
								<Button
									icon={<UploadOutlined />}
									loading={receiptUploading}
									disabled={receiptUploading}
									onClick={() => receiptInputRef.current?.click()}
								>
									Upload receipt
								</Button>
								{receipt ? (
									<Button
										type='link'
										danger
										icon={<CloseCircleOutlined />}
										onClick={clearReceipt}
									>
										Remove
									</Button>
								) : null}
							</ReceiptActions>
							<ReceiptHint>
								Accepted: PDF or image - Max {formatBytes(MAX_RECEIPT_BYTES)}
							</ReceiptHint>
							{receipt ? (
								<ReceiptPreview>
									{isReceiptPdf(receipt) ? (
										<FilePdfOutlined />
									) : (
										<FileImageOutlined />
									)}
									<a href={receipt.url} target='_blank' rel='noreferrer'>
										{getReceiptLabel(receipt)}
									</a>
								</ReceiptPreview>
							) : (
								<ReceiptEmpty>No receipt uploaded yet.</ReceiptEmpty>
							)}
							{receiptMissing && (
								<ReceiptError>Receipt is required.</ReceiptError>
							)}
						</ReceiptUploadBox>
					</Form.Item>

					<FormActions>
						<Button
							onClick={() => {
								form.resetFields();
								clearReceipt();
							}}
						>
							Clear
						</Button>
						<Button
							type='primary'
							htmlType='submit'
							icon={<PlusOutlined />}
							loading={saving || receiptUploading}
							disabled={receiptUploading}
						>
							Add Expense
						</Button>
					</FormActions>
				</Form>
			</Card>

			<Card title='Expenses' size='small'>
				<FilterBar>
					<FilterGroup>
						<FilterLabel>Filter by hotel</FilterLabel>
						<Select
							showSearch
							loading={loadingExpenseHotels}
							placeholder='All hotels'
							optionFilterProp='label'
							value={selectedHotelFilter}
							style={{ width: "100%" }}
							options={expenseHotelOptions}
							onChange={handleHotelFilterChange}
						/>
					</FilterGroup>
					<FilterActions>
						<Button
							icon={<CloseCircleOutlined />}
							onClick={handleResetFilters}
							disabled={
								selectedHotelFilter === DEFAULT_HOTEL_FILTER &&
								sortState.columnKey === DEFAULT_SORT_STATE.columnKey &&
								sortState.order === DEFAULT_SORT_STATE.order
							}
						>
							Reset
						</Button>
						<Button
							icon={<ReloadOutlined />}
							onClick={handleRefresh}
							loading={loadingExpenses || loadingExpenseHotels}
						>
							Refresh
						</Button>
					</FilterActions>
				</FilterBar>
				<TableWrapper>
					<Table
						rowKey={(record) => record._id}
						dataSource={expenses}
						columns={columns}
						loading={loadingExpenses}
						size='small'
						bordered
						onChange={handleTableChange}
						pagination={{ pageSize: 10, showSizeChanger: true }}
						summary={() => (
							<Table.Summary.Row>
								<Table.Summary.Cell index={0} colSpan={3}>
									Total
								</Table.Summary.Cell>
								<Table.Summary.Cell index={1} align='right'>
									{formatCurrency(totalAmount)}
								</Table.Summary.Cell>
								<Table.Summary.Cell index={2} align='right'>
									{formatCurrency(totalPaidAmount)}
								</Table.Summary.Cell>
								<Table.Summary.Cell index={3} colSpan={4} />
							</Table.Summary.Row>
						)}
					/>
				</TableWrapper>
			</Card>

			<Modal
				title='Edit Expense'
				open={editOpen}
				onCancel={closeEditModal}
				onOk={handleUpdateExpense}
				okText='Save Changes'
				cancelText='Cancel'
				okButtonProps={{ loading: editSaving || editReceiptUploading }}
			>
				<Form form={editForm} layout='vertical'>
					<Form.Item
						name='hotelId'
						label='Hotel'
						rules={[{ required: true, message: "Please select a hotel" }]}
					>
						<Select
							showSearch
							loading={loadingHotels}
							placeholder='Select hotel'
							optionFilterProp='label'
							options={sortedHotels.map((hotel) => ({
								value: hotel._id,
								label: hotel.hotelName,
							}))}
						/>
					</Form.Item>

					<Form.Item
						name='label'
						label='Label'
						rules={[{ required: true, message: "Please add a label" }]}
					>
						<Input placeholder='Expense label' />
					</Form.Item>

					<Form.Item
						name='amount'
						label='Amount'
						rules={[{ required: true, message: "Please enter the amount" }]}
					>
						<InputNumber
							min={0}
							precision={2}
							style={{ width: "100%" }}
							placeholder='0.00'
						/>
					</Form.Item>

					<Form.Item
						name='paid_amount'
						label='Paid Amount'
						rules={[
							{ required: true, message: "Please enter the paid amount" },
						]}
					>
						<InputNumber
							min={0}
							precision={2}
							style={{ width: "100%" }}
							placeholder='0.00'
						/>
					</Form.Item>

					<Form.Item
						name='expenseDate'
						label='Expense Date'
						rules={[
							{ required: true, message: "Please select the expense date" },
						]}
					>
						<DatePicker
							style={{ width: "100%" }}
							format='YYYY-MM-DD'
							getPopupContainer={resolvePopupContainer}
							popupStyle={pickerPopupStyle}
						/>
					</Form.Item>

					<Form.Item name='description' label='Description (optional)'>
						<TextArea rows={3} placeholder='Short description' />
					</Form.Item>

					<Form.Item label='Receipt (PDF or image)' required>
						<ReceiptUploadBox $error={editReceiptMissing}>
							<ReceiptActions>
								<input
									ref={editReceiptInputRef}
									type='file'
									accept='image/*,.pdf'
									onChange={handleEditReceiptChange}
									style={{ display: "none" }}
								/>
								<Button
									icon={<UploadOutlined />}
									loading={editReceiptUploading}
									disabled={editReceiptUploading}
									onClick={() => editReceiptInputRef.current?.click()}
								>
									Replace receipt
								</Button>
								{editReceipt ? (
									<Button
										type='link'
										danger
										icon={<CloseCircleOutlined />}
										onClick={clearEditReceipt}
									>
										Remove
									</Button>
								) : null}
							</ReceiptActions>
							<ReceiptHint>
								Accepted: PDF or image - Max {formatBytes(MAX_RECEIPT_BYTES)}
							</ReceiptHint>
							{editReceipt ? (
								<ReceiptPreview>
									{isReceiptPdf(editReceipt) ? (
										<FilePdfOutlined />
									) : (
										<FileImageOutlined />
									)}
									<a href={editReceipt.url} target='_blank' rel='noreferrer'>
										{getReceiptLabel(editReceipt)}
									</a>
								</ReceiptPreview>
							) : (
								<ReceiptEmpty>No receipt uploaded yet.</ReceiptEmpty>
							)}
							{editReceiptMissing && (
								<ReceiptError>Receipt is required.</ReceiptError>
							)}
						</ReceiptUploadBox>
					</Form.Item>
				</Form>
			</Modal>
		</ExpensesManagementWrapper>
	);
};

export default ExpensesManagement;

const ExpensesManagementWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 20px;

	.ant-card {
		border-radius: 12px;
		border: 1px solid #f0f0f0;
	}
`;

const FormGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 12px;
`;

const FormActions = styled.div`
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	flex-wrap: wrap;
`;

const TableWrapper = styled.div`
	width: 100%;
	overflow-x: auto;

	.ant-table {
		min-width: 980px;
	}

	.ant-table-thead > tr > th {
		background: #f6f8f8;
		font-weight: 600;
	}

	.ant-table-summary {
		background: #fafafa;
	}

	.ant-table-summary > tr > td {
		font-weight: 600;
	}

	.truncate {
		max-width: 320px;
		display: inline-block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: bottom;
	}
`;

const FilterBar = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 12px;
`;

const FilterGroup = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 220px;
`;

const FilterLabel = styled.span`
	font-size: 12px;
	color: #667085;
`;

const FilterActions = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
`;

const ReceiptUploadBox = styled.div`
	border: 1px dashed ${(props) => (props.$error ? "#ff4d4f" : "#d0d7de")};
	background: #fafbfc;
	border-radius: 10px;
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

const ReceiptActions = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
`;

const ReceiptHint = styled.div`
	font-size: 12px;
	color: #667085;
`;

const ReceiptPreview = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;

	a {
		color: #0f172a;
		text-decoration: none;
		max-width: 260px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	a:hover {
		text-decoration: underline;
	}
`;

const ReceiptEmpty = styled.div`
	font-size: 12px;
	color: #98a2b3;
`;

const ReceiptError = styled.div`
	font-size: 12px;
	color: #d92d20;
`;

const ReceiptLink = styled.a`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	color: #0f172a;
	text-decoration: none;
	max-width: 180px;

	span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&:hover {
		text-decoration: underline;
	}
`;

const IconButton = styled(Button)`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
`;

const SmallNote = styled.span`
	font-size: 12px;
	color: #667085;
`;
