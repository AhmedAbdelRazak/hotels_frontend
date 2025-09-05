import React, { useEffect, useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import {
	Table,
	Button,
	Modal,
	Form,
	Input,
	Space,
	Select,
	Card as AntCard,
	Tag,
	List,
	Popconfirm,
	Tooltip,
	Divider,
	Switch,
	Empty,
	Typography,
	Alert,
	Spin,
} from "antd";
import {
	PlusOutlined,
	EditOutlined,
	DeleteOutlined,
	CheckCircleTwoTone,
	CreditCardOutlined,
	ReloadOutlined,
	StarFilled,
	StarOutlined,
	SafetyOutlined,
} from "@ant-design/icons";
import { toast } from "react-toastify";
import {
	PayPalScriptProvider,
	PayPalButtons,
	usePayPalScriptReducer,
	PayPalCardFieldsProvider,
	PayPalCardFieldsForm,
	PayPalNameField,
	PayPalNumberField,
	PayPalExpiryField,
	PayPalCVVField,
	usePayPalCardFields,
} from "@paypal/react-paypal-js";
import { countryListWithAbbreviations } from "../../AdminModule/CustomerService/utils";
import { isAuthenticated } from "../../auth";

const { Option } = Select;
const { Title, Text } = Typography;

// API base like rest of the app
const API_BASE = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "");

/* i18n */
const t9n = {
	English: {
		heading: "Payment Settings",
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

		methodsSection: "Saved Company Payment Methods",
		addMethod: "Add Payment Method",
		secure: "Secured by PayPal",
		refresh: "Refresh",
		noMethods: "No saved payment methods yet.",
		defaultCard: "Default",
		makeDefault: "Make default",
		remove: "Remove",
		loading: "Loading…",

		addMethodTitle: "Add a Payment Method",
		labelOptional: "Label (optional)",
		or: "or",
		close: "Close",
		saveCard: "Save Card",

		req: "is required",
	},
	Arabic: {
		heading: "إعدادات الدفع",
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

		methodsSection: "طرق الدفع المحفوظة للشركة",
		addMethod: "إضافة طريقة دفع",
		secure: "محمي بواسطة PayPal",
		refresh: "تحديث",
		noMethods: "لا توجد طرق دفع محفوظة بعد.",
		defaultCard: "افتراضي",
		makeDefault: "تعيين كافتراضي",
		remove: "حذف",
		loading: "جاري التحميل…",

		addMethodTitle: "إضافة طريقة دفع",
		labelOptional: "تسمية (اختياري)",
		or: "أو",
		close: "إغلاق",
		saveCard: "حفظ البطاقة",

		req: "مطلوب",
	},
};

function brandOf(item) {
	if (!item?.card_brand && !item?.card_last4 && !item?.card_exp) {
		return "PayPal";
	}
	const s = String(item.card_brand || "").toUpperCase();
	if (/VISA/.test(s)) return "VISA";
	if (/MASTERCARD|MC/.test(s)) return "Mastercard";
	if (/AMEX|AMERICAN/.test(s)) return "AMEX";
	if (/DISCOVER/.test(s)) return "Discover";
	if (/JCB/.test(s)) return "JCB";
	if (/MAESTRO/.test(s)) return "Maestro";
	if (/UNIONPAY|CUP/.test(s)) return "UnionPay";
	return s || "CARD";
}

/* --------------------- SaveMethodModal --------------------- */
const SaveMethodModal = ({
	open,
	onClose,
	onSaved,
	hotelId,
	authHeaders,
	chosenLanguage,
}) => {
	const lang = t9n[chosenLanguage] || t9n.English;
	const isArabic = chosenLanguage === "Arabic";
	const locale = isArabic ? "ar_EG" : "en_US";

	const [scriptOptions, setScriptOptions] = useState(null);
	const [label, setLabel] = useState("");
	const [makeDefault, setMakeDefault] = useState(true);

	// ---- Single-toast helper (avoid double error noise) ----
	const toastOnce = (() => {
		let busy = false;
		return (type, msg) => {
			if (busy) return;
			busy = true;
			const reset = () => (busy = false);
			if (type === "success") {
				toast.success(msg);
				reset();
				return;
			}
			toast.error(msg);
			setTimeout(reset, 400);
		};
	})();

	// Prepare PayPal SDK options using server env + client token
	useEffect(() => {
		let cancelled = false;
		async function init() {
			try {
				const resp = await fetch(`${API_BASE}/paypal/token-generated`);
				const data = await resp.json();
				if (!resp.ok || !data?.clientToken)
					throw new Error("Failed to init PayPal");

				const envName =
					String(data.env || "").toLowerCase() === "live" ? "live" : "sandbox";
				const feClientId =
					envName === "live"
						? process.env.REACT_APP_PAYPAL_CLIENT_ID_LIVE
						: process.env.REACT_APP_PAYPAL_CLIENT_ID_SANDBOX;

				const opts = {
					"client-id": feClientId || "",
					"data-client-token": data.clientToken,
					components: "buttons,card-fields",
					currency: "USD",
					intent: "authorize",
					commit: true,
					// IMPORTANT: do NOT set 'vault' and do NOT force 'buyer-country' here.
					"enable-funding": "paypal,venmo,card",
					"disable-funding": "credit,paylater",
					locale, // ar_EG or en_US as you do today
				};
				setScriptOptions(opts);
				if (!cancelled) setScriptOptions(opts);
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(e);
				toastOnce(
					"error",
					isArabic ? "فشل تهيئة PayPal" : "Failed to initialize PayPal"
				);
			}
		}
		if (open) init();
		return () => {
			cancelled = true;
			setScriptOptions(null);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, locale, isArabic]);

	/* Wallet (PayPal/Venmo) vaulting — client creates setup token, server exchanges it */
	async function onWalletApprove(data) {
		try {
			const setup_token =
				data?.vault_token ||
				data?.payment_token ||
				data?.orderID ||
				data?.billingToken;
			if (!setup_token) throw new Error("Missing wallet setup token");
			const resp = await fetch(
				`${API_BASE}/hotels/${hotelId}/paypal/owner/save-card`,
				{
					method: "POST",
					headers: authHeaders,
					body: JSON.stringify({
						setup_token,
						label: label || "PayPal",
						setDefault: !!makeDefault,
					}),
				}
			);
			const json = await resp.json();
			if (!resp.ok) throw new Error(json?.message || "Failed to save wallet");
			toastOnce(
				"success",
				isArabic ? "تم ربط حساب PayPal" : "PayPal account connected"
			);
			onSaved(Array.isArray(json.methods) ? json.methods : []);
			onClose();
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error("Wallet vault error:", e);
			toastOnce(
				"error",
				isArabic ? "فشل ربط الحساب" : "Failed to connect PayPal"
			);
		}
	}

	function createWalletSetupToken(_data, actions) {
		if (!actions?.vault?.setup) throw new Error("Vaulting not supported");
		return actions.vault.setup({ payment_source: { paypal: {} } });
	}

	/* Shared order builder for card “save” flows (inline Card Fields and the hosted Card button) */
	const MIN_AUTH_USD = "50.00";
	const buildVaultOrder = () => ({
		intent: "AUTHORIZE",
		purchase_units: [
			{
				reference_id: "precheck",
				amount: { currency_code: "USD", value: MIN_AUTH_USD },
			},
		],
		application_context: {
			brand_name: "Jannat Booking",
			user_action: "PAY_NOW",
			shipping_preference: "NO_SHIPPING",
		},
		payment_source: {
			card: { attributes: { vault: { store_in_vault: "ON_SUCCESS" } } },
		},
	});

	/* Inline Card Fields area — determine eligibility AFTER SDK resolves */
	const CardFieldsArea = () => {
		const [{ isResolved }] = usePayPalScriptReducer();
		const ctx = usePayPalCardFields();
		const cardFieldsForm = ctx?.cardFieldsForm;
		const cardFields = ctx?.cardFields;
		const [busy, setBusy] = useState(false);
		const [ready, setReady] = useState(false);
		const [cfEligible, setCfEligible] = useState(false);

		useEffect(() => {
			if (!isResolved) return;
			let eligible = false;
			try {
				eligible = !!window?.paypal?.CardFields?.isEligible?.();
			} catch {
				eligible = false;
			}
			setCfEligible(eligible);
		}, [isResolved]);

		useEffect(() => {
			if (!isResolved || !cfEligible) return;
			let cancelled = false;
			const checkReady = () => {
				if (cancelled) return;
				const submitFn =
					(cardFieldsForm && cardFieldsForm.submit) ||
					(cardFields && cardFields.submit) ||
					null;
				const eligible =
					(cardFieldsForm?.isEligible?.() ?? true) &&
					(cardFields?.isEligible?.() ?? true);
				setReady(typeof submitFn === "function" && eligible);
			};
			checkReady();
			return () => {
				cancelled = true;
			};
		}, [isResolved, cfEligible, cardFieldsForm, cardFields]);

		if (!isResolved) {
			return (
				<div style={{ textAlign: "center", padding: 12 }}>
					<Spin />
				</div>
			);
		}

		if (!cfEligible) {
			return (
				<div style={{ marginTop: 10 }}>
					<Alert
						type='info'
						showIcon
						message={
							isArabic
								? "حقول البطاقة داخل الصفحة غير متاحة في منطقتك/حسابك. استخدم زر البطاقة أعلاه."
								: "Inline card fields aren’t available in your region/account. Use the card button above."
						}
					/>
				</div>
			);
		}

		const createOrder = (_data, actions) => {
			if (!actions?.order?.create)
				throw new Error("Card Fields not eligible in this browser/region");
			return actions.order.create(buildVaultOrder());
		};

		async function onApprove({ orderID }) {
			try {
				const resp = await fetch(
					`${API_BASE}/hotels/${hotelId}/paypal/owner/save-card`,
					{
						method: "POST",
						headers: authHeaders,
						body: JSON.stringify({
							order_id: orderID,
							label: label || undefined,
							setDefault: !!makeDefault,
						}),
					}
				);
				const json = await resp.json();
				if (!resp.ok) throw new Error(json?.message || "Failed to save card");
				toastOnce("success", isArabic ? "تم حفظ البطاقة" : "Card saved");
				onSaved(Array.isArray(json.methods) ? json.methods : []);
				onClose();
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error("CardFields approve error:", e);
				toastOnce(
					"error",
					isArabic ? "فشل حفظ البطاقة" : "Failed to save card"
				);
			}
		}

		return (
			<CardBox dir={isArabic ? "rtl" : "ltr"}>
				<CardTitle>{isArabic ? "أو احفظ بطاقة" : "Or save a card"}</CardTitle>

				<PayPalCardFieldsProvider
					createOrder={createOrder}
					onApprove={onApprove}
					onError={(e) => {
						// log only; avoid double toasts (submit/onApprove already handle UX)
						// eslint-disable-next-line no-console
						console.error("CardFields SDK error:", e);
					}}
				>
					<PayPalCardFieldsForm>
						<div className='field'>
							<label>{isArabic ? "اسم حامل البطاقة" : "Cardholder name"}</label>
							<div className='hosted'>
								<PayPalNameField />
							</div>
						</div>
						<div className='field'>
							<label>{isArabic ? "رقم البطاقة" : "Card number"}</label>
							<div className='hosted'>
								<PayPalNumberField />
							</div>
						</div>
						<Row>
							<div className='field half'>
								<label>{isArabic ? "تاريخ الانتهاء" : "Expiry date"}</label>
								<div className='hosted'>
									<PayPalExpiryField />
								</div>
							</div>
							<div className='field half'>
								<label>CVV</label>
								<div className='hosted'>
									<PayPalCVVField />
								</div>
							</div>
						</Row>
					</PayPalCardFieldsForm>

					<div style={{ marginTop: 8 }}>
						<PayCardButton
							type='button'
							disabled={!ready || busy}
							aria-disabled={!ready || busy}
							onClick={async () => {
								const submitFn =
									(cardFieldsForm && cardFieldsForm.submit) ||
									(cardFields && cardFields.submit) ||
									null;
								if (typeof submitFn !== "function") return;
								setBusy(true);
								try {
									if (cardFieldsForm?.getState) {
										const state = await cardFieldsForm.getState();
										if (state && !state.isFormValid) {
											toastOnce(
												"error",
												isArabic
													? "بيانات البطاقة غير مكتملة."
													: "Card details are incomplete."
											);
											setBusy(false);
											return;
										}
									}
									await submitFn(); // triggers 3‑D Secure if needed → then onApprove runs
								} catch (e) {
									// eslint-disable-next-line no-console
									console.error("CardFields submit error:", e);
									toastOnce(
										"error",
										isArabic ? "فشل عملية البطاقة" : "Card operation failed."
									);
								} finally {
									setBusy(false);
								}
							}}
							title={!ready ? "Initializing secure card fields..." : undefined}
						>
							{busy
								? isArabic
									? "جارٍ الحفظ…"
									: "Processing…"
								: lang.saveCard}
						</PayCardButton>
					</div>
				</PayPalCardFieldsProvider>
			</CardBox>
		);
	};

	/* PayPal-hosted "Save a Card" button (no invalid label usage) */
	const CardHostedButton = () => (
		<PayPalButtons
			fundingSource='card'
			style={{ layout: "vertical" }} // <-- no 'label: "card"'
			createOrder={(data, actions) => actions?.order?.create(buildVaultOrder())}
			onApprove={async ({ orderID }) => {
				try {
					const resp = await fetch(
						`${API_BASE}/hotels/${hotelId}/paypal/owner/save-card`,
						{
							method: "POST",
							headers: authHeaders,
							body: JSON.stringify({
								order_id: orderID,
								label: label || undefined,
								setDefault: !!makeDefault,
							}),
						}
					);
					const json = await resp.json();
					if (!resp.ok) throw new Error(json?.message || "Failed to save card");
					toastOnce("success", isArabic ? "تم حفظ البطاقة" : "Card saved");
					onSaved(Array.isArray(json.methods) ? json.methods : []);
					onClose();
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error("Card hosted button error:", e);
					toastOnce(
						"error",
						isArabic ? "فشل حفظ البطاقة" : "Failed to save card"
					);
				}
			}}
			onError={(e) => {
				// log only; avoid duplicate toasts
				// eslint-disable-next-line no-console
				console.error("Card hosted button SDK error:", e);
			}}
		/>
	);

	return (
		<Modal
			title={lang.addMethodTitle}
			open={open}
			onCancel={onClose}
			footer={null}
			destroyOnClose
		>
			{!scriptOptions ? (
				<div style={{ textAlign: "center", padding: 16 }}>
					<Spin />
				</div>
			) : (
				<PayPalScriptProvider options={scriptOptions}>
					<div style={{ marginBottom: 10 }}>
						<Text type='secondary'>{lang.secure}</Text>
					</div>

					{/* Wallet vault buttons (no invalid labels) */}
					<ButtonsRow>
						<PayPalButtons
							fundingSource='paypal'
							style={{ layout: "vertical" }} // <-- no 'label: "paypal"'
							createVaultSetupToken={createWalletSetupToken}
							onApprove={onWalletApprove}
							onError={(e) => {
								// eslint-disable-next-line no-console
								console.error("PayPal button error:", e);
							}}
						/>
						<PayPalButtons
							fundingSource='venmo'
							style={{ layout: "vertical" }} // <-- no 'label: "venmo"'
							createVaultSetupToken={createWalletSetupToken}
							onApprove={onWalletApprove}
							onError={(e) => {
								// eslint-disable-next-line no-console
								console.error("Venmo button error:", e);
							}}
						/>
					</ButtonsRow>

					{/* EXTRA: PayPal-hosted Card save button (above the form) */}
					<div style={{ marginTop: 12, maxWidth: 420, marginInline: "auto" }}>
						<CardHostedButton />
					</div>

					<Divider plain>{lang.or}</Divider>

					{/* Label + default toggle (form stays as-is) */}
					<Form layout='vertical' autoComplete='off'>
						<Form.Item label={lang.labelOptional}>
							<Input
								placeholder='Finance - Corporate Visa'
								value={label}
								onChange={(e) => setLabel(e.target.value)}
							/>
						</Form.Item>
						{/* Always English per request */}
						<Form.Item label='Default Card'>
							<Switch checked={makeDefault} onChange={setMakeDefault} />
						</Form.Item>
					</Form>

					{/* Inline Card Fields area with graceful fallback */}
					<CardFieldsArea />

					<div style={{ marginTop: 10 }}>
						<Button onClick={onClose}>{lang.close}</Button>
					</div>
				</PayPalScriptProvider>
			)}
		</Modal>
	);
};

/* --------------------- Main PaymentSettings --------------------- */
const PaymentSettings = ({
	setHotelDetails,
	hotelDetails,
	submittingHotelDetails,
	chosenLanguage,
}) => {
	const lang = t9n[chosenLanguage] || t9n.English;
	const dir = chosenLanguage === "Arabic" ? "rtl" : "ltr";

	// Wire accounts
	const [isAddModalVisible, setIsAddModalVisible] = useState(false);
	const [isEditModalVisible, setIsEditModalVisible] = useState(false);
	const [editingAccount, setEditingAccount] = useState(null);
	const [form] = Form.useForm();
	const paymentSettingsData = hotelDetails?.paymentSettings || [];

	// Methods list
	const [methods, setMethods] = useState([]);
	const [methodsLoading, setMethodsLoading] = useState(false);

	// Add method modal
	const [methodModalOpen, setMethodModalOpen] = useState(false);

	// Auth headers
	const { token } = isAuthenticated() || {};
	const authHeaders = useMemo(
		() => ({
			Accept: "application/json",
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		}),
		[token]
	);

	// Hotel id
	const selectedHotel = JSON.parse(
		localStorage.getItem("selectedHotel") || "{}"
	);
	const hotelId = hotelDetails?._id || selectedHotel?._id;

	const fetchMethods = useCallback(async () => {
		if (!hotelId) return;
		setMethodsLoading(true);
		try {
			const res = await fetch(
				`${API_BASE}/hotels/${hotelId}/paypal/owner/methods`,
				{ headers: authHeaders }
			);
			const data = await res.json();
			if (res.ok) {
				const list = Array.isArray(data.methods) ? data.methods : [];
				setMethods(list.filter((m) => m.active !== false));
			} else {
				toast.error(data?.message || "Failed to load saved methods");
			}
		} catch {
			toast.error("Failed to load saved methods");
		} finally {
			setMethodsLoading(false);
		}
	}, [hotelId, authHeaders]);

	async function setDefaultMethod(vaultId) {
		try {
			const res = await fetch(
				`${API_BASE}/hotels/${hotelId}/paypal/owner/methods/${vaultId}/default`,
				{ method: "POST", headers: authHeaders }
			);
			const data = await res.json();
			if (res.ok) {
				const list = Array.isArray(data.methods) ? data.methods : [];
				setMethods(list.filter((m) => m.active !== false));
				toast.success("Default updated");
			} else {
				toast.error(data?.message || "Failed to set default");
			}
		} catch {
			toast.error("Failed to set default");
		}
	}

	async function removeMethod(vaultId) {
		try {
			const res = await fetch(
				`${API_BASE}/hotels/${hotelId}/paypal/owner/methods/${vaultId}`,
				{ method: "DELETE", headers: authHeaders }
			);
			const data = await res.json();
			if (res.ok) {
				const list = Array.isArray(data.methods) ? data.methods : [];
				setMethods(list.filter((m) => m.active !== false));
				toast.success("Removed");
			} else {
				toast.error(data?.message || "Failed to remove");
			}
		} catch {
			toast.error("Failed to remove");
		}
	}

	useEffect(() => {
		if (hotelId) fetchMethods();
	}, [hotelId, fetchMethods]);

	// Wire accounts helpers
	const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

	async function handleWireSubmit(values) {
		let newPaymentSettings;
		if (editingAccount) {
			newPaymentSettings = paymentSettingsData.map((acc) =>
				acc._id && editingAccount._id && acc._id === editingAccount._id
					? { ...acc, ...values }
					: acc
			);
			setEditingAccount(null);
			setIsEditModalVisible(false);
		} else {
			newPaymentSettings = [...paymentSettingsData, values];
			setIsAddModalVisible(false);
		}

		const updated = { ...hotelDetails, paymentSettings: newPaymentSettings };

		if (!deepEqual(hotelDetails.paymentSettings, newPaymentSettings)) {
			try {
				const resp = await submittingHotelDetails("paymentSettings", updated);
				if (resp && resp._id) setHotelDetails(resp);
				else setHotelDetails(updated);
				toast.success("Bank account saved");
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(err);
				toast.error("Failed to save bank account");
			}
		}
		form.resetFields();
	}

	function showEditModal(record) {
		setEditingAccount(record);
		form.setFieldsValue(record);
		setIsEditModalVisible(true);
	}

	const columns = [
		{ title: lang.accountName, dataIndex: "accountName", key: "accountName" },
		{ title: lang.bankName, dataIndex: "bankName", key: "bankName" },
		{
			title: lang.accountCountry,
			dataIndex: "accountCountry",
			key: "accountCountry",
			render: (code) => {
				const found = countryListWithAbbreviations.find((c) => c.code === code);
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

	return (
		<Wrapper dir={dir} style={{ textAlign: dir === "rtl" ? "right" : "left" }}>
			<div className='header'>
				<h2>{lang.heading}</h2>
			</div>

			{/* Methods */}
			<SectionCard>
				<SectionHeader>
					<Title level={4} style={{ margin: 0 }}>
						<CreditCardOutlined style={{ marginInlineEnd: 8 }} />
						{lang.methodsSection}
					</Title>
				</SectionHeader>

				<ButtonsBar>
					<Tooltip title={lang.secure}>
						<SafetyOutlined />
					</Tooltip>
					<Button icon={<ReloadOutlined />} onClick={fetchMethods}>
						{lang.refresh}
					</Button>
					<Button
						type='primary'
						icon={<PlusOutlined />}
						onClick={() => setMethodModalOpen(true)}
					>
						{lang.addMethod}
					</Button>
				</ButtonsBar>

				<Divider style={{ margin: "12px 0" }} />

				{methodsLoading ? (
					<div style={{ padding: 16 }}>
						<Text>{lang.loading}</Text>
					</div>
				) : methods.length === 0 ? (
					<Empty
						description={<span>{lang.noMethods}</span>}
						image={Empty.PRESENTED_IMAGE_SIMPLE}
					/>
				) : (
					<List
						grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }}
						dataSource={methods}
						renderItem={(item) => {
							const brand = brandOf(item);
							const isWallet = !item.card_brand && !item.card_last4;
							const last4 = isWallet ? null : item.card_last4 || "••••";
							const exp = isWallet ? "" : item.card_exp || "";
							const isDefault = !!item.default;
							return (
								<List.Item>
									<AntCard
										size='small'
										title={
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: 8,
												}}
											>
												<span style={{ fontWeight: 600 }}>{brand}</span>
												{!isWallet && <span>• • • • {last4}</span>}
												{isDefault ? (
													<Tag
														color='green'
														icon={<CheckCircleTwoTone twoToneColor='#52c41a' />}
													>
														{lang.defaultCard}
													</Tag>
												) : null}
											</div>
										}
										actions={[
											isDefault ? (
												<Tooltip title={lang.defaultCard} key='def'>
													<StarFilled style={{ color: "#faad14" }} />
												</Tooltip>
											) : (
												<Tooltip title={lang.makeDefault} key='mkdef'>
													<StarOutlined
														onClick={() => setDefaultMethod(item.vault_id)}
													/>
												</Tooltip>
											),
											<Popconfirm
												key='rm'
												title={lang.remove}
												onConfirm={() => removeMethod(item.vault_id)}
											>
												<Tooltip title={lang.remove}>
													<DeleteOutlined />
												</Tooltip>
											</Popconfirm>,
										]}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
											}}
										>
											<div>
												<div style={{ fontSize: 12, opacity: 0.7 }}>
													{item.label || brand}
												</div>
												<div style={{ fontSize: 12, opacity: 0.7 }}>
													{item.vault_status || "ACTIVE"}
												</div>
											</div>
											{!isWallet && (
												<div style={{ textAlign: "right" }}>
													<div style={{ fontSize: 12, opacity: 0.7 }}>EXP</div>
													<div style={{ fontWeight: 600 }}>{exp || "—"}</div>
												</div>
											)}
										</div>
									</AntCard>
								</List.Item>
							);
						}}
					/>
				)}
			</SectionCard>

			{/* Wire accounts */}
			<SectionCard style={{ marginTop: 24 }}>
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
			</SectionCard>

			{/* Add method modal */}
			{methodModalOpen && (
				<SaveMethodModal
					open={methodModalOpen}
					onClose={() => setMethodModalOpen(false)}
					onSaved={(list) => setMethods(list.filter((m) => m.active !== false))}
					hotelId={hotelId}
					authHeaders={authHeaders}
					chosenLanguage={chosenLanguage}
				/>
			)}

			{/* Add / Edit wire account */}
			<Modal
				title={editingAccount ? lang.updateAccountTitle : lang.addAccountTitle}
				open={isAddModalVisible || isEditModalVisible}
				onCancel={() => {
					if (isEditModalVisible) {
						setIsEditModalVisible(false);
						setEditingAccount(null);
					}
					if (isAddModalVisible) setIsAddModalVisible(false);
					form.resetFields();
				}}
				footer={null}
				destroyOnClose
			>
				<Form
					form={form}
					layout='vertical'
					onFinish={handleWireSubmit}
					style={{ textAlign: dir === "rtl" ? "right" : "left" }}
				>
					<Form.Item
						name='accountType'
						label={lang.accountType}
						initialValue='Business'
					>
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
					<Form.Item shouldUpdate noStyle>
						{({ getFieldValue }) => (
							<Form.Item
								name='routingNumber'
								label={lang.routingNumber}
								rules={[
									{
										validator(_, value) {
											const country = getFieldValue("accountCountry");
											const isUS = String(country || "").toUpperCase() === "US";
											if (!isUS) return Promise.resolve();
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
						)}
					</Form.Item>

					{/* SWIFT (non-US only) */}
					<Form.Item shouldUpdate noStyle>
						{({ getFieldValue }) => (
							<Form.Item
								name='swiftCode'
								label={lang.swiftCode}
								rules={[
									{
										validator(_, value) {
											const country = getFieldValue("accountCountry");
											const isUS = String(country || "").toUpperCase() === "US";
											if (isUS) return Promise.resolve();
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
						)}
					</Form.Item>

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
									if (isEditModalVisible) {
										setIsEditModalVisible(false);
										setEditingAccount(null);
									}
									if (isAddModalVisible) setIsAddModalVisible(false);
									form.resetFields();
								}}
							>
								{lang.cancel}
							</Button>
						</Space>
					</Form.Item>
				</Form>
			</Modal>
		</Wrapper>
	);
};

export default PaymentSettings;

/* --------------------- styled --------------------- */

const Wrapper = styled.div`
	padding: 20px;
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 18px;
	}
`;
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
const ButtonsBar = styled.div`
	display: flex;
	align-items: center;
	gap: 10px;
	margin-top: 8px;
`;
const ButtonsRow = styled.div`
	width: 100%;
	max-width: 420px;
	margin: 0 auto;
	display: grid;
	gap: 10px;
`;
const CardBox = styled.div`
	width: 100%;
	max-width: 520px;
	margin: 0 auto 6px auto;
	padding: 14px 14px 16px;
	background: #fff;
	border: 1.25px solid #e9eef3;
	border-radius: 12px;
	box-shadow: 0 4px 14px rgba(16, 24, 40, 0.05);
	.field {
		margin-bottom: 10px;
	}
	label {
		display: block;
		font-size: 0.92rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 6px;
	}
	.hosted {
		position: relative;
		display: block;
		background: #fff;
		border: 1.25px solid #d0d5dd;
		border-radius: 10px;
		padding: 0 10px;
		min-height: 42px;
		line-height: 42px;
		transition:
			border-color 0.15s,
			box-shadow 0.15s,
			background 0.15s;
		z-index: 0;
	}
	.hosted:focus-within {
		border-color: #1677ff;
		box-shadow: 0 0 0 4px rgba(22, 119, 255, 0.12);
		background: #fff;
	}
`;
const CardTitle = styled.h4`
	margin: 2px 0 10px 0;
	font-size: 16px;
	font-weight: 800;
	color: #0f172a;
	text-align: center;
`;
const Row = styled.div`
	display: flex;
	gap: 10px;
	.half {
		flex: 1;
	}
	@media (max-width: 520px) {
		flex-direction: column;
	}
`;
const PayCardButton = styled.button`
	width: 100%;
	margin-top: 8px;
	height: 42px;
	border: none;
	border-radius: 10px;
	background: #0f172a;
	color: #fff;
	font-weight: 700;
	letter-spacing: 0.2px;
	cursor: pointer;
	transition:
		opacity 0.15s,
		transform 0.02s;
	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	&:active {
		transform: translateY(0.5px);
	}
`;
