import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import styled from "styled-components";
import {
	Table,
	Tag,
	Space,
	Button,
	Input,
	Checkbox,
	message,
	Spin,
	Alert,
	Tooltip,
	Modal,
} from "antd";
import {
	PayPalScriptProvider,
	PayPalCardFieldsProvider,
	PayPalCardFieldsForm,
	PayPalNameField,
	PayPalNumberField,
	PayPalExpiryField,
	PayPalCVVField,
	PayPalButtons,
	usePayPalCardFields,
	usePayPalScriptReducer,
} from "@paypal/react-paypal-js";

import {
	getOwnerPayPalClientToken,
	createOwnerPayPalSetupToken,
	saveOwnerVaultCard,
	listOwnerPaymentMethods,
	setOwnerDefaultPaymentMethod,
	deactivateOwnerPaymentMethod,
	activateOwnerPaymentMethod,
	deleteOwnerPaymentMethod,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import BankAccountData from "./BankAccountData";

const mapLocale = (isArabic) => (isArabic ? "ar_EG" : "en_US");
const idSig = (s) => {
	try {
		const t = String(s || "");
		let h = 0;
		for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) >>> 0;
		return h.toString(16).slice(0, 8);
	} catch {
		return "na";
	}
};

function extractSetupTokenFromApprove(data) {
	return (
		data?.vaultSetupToken ||
		data?.vault_setup_token ||
		data?.setupToken ||
		data?.setup_token ||
		data?.paymentToken ||
		data?.payment_token ||
		data?.token ||
		data?.id ||
		null
	);
}

/* Submit for Card Fields */
function SubmitOwnerCard({ allowInteract, labels }) {
	const ctx = usePayPalCardFields();
	const cardFieldsForm = ctx?.cardFieldsForm;
	const cardFields = ctx?.cardFields;

	const [busy, setBusy] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let cancelled = false;
		let tries = 0;
		const tick = () => {
			if (cancelled) return;
			const submitFn =
				(cardFieldsForm && cardFieldsForm.submit) ||
				(cardFields && cardFields.submit) ||
				null;
			const eligible =
				(cardFieldsForm?.isEligible?.() ?? true) &&
				(cardFields?.isEligible?.() ?? true);
			setReady(typeof submitFn === "function" && eligible);
			if ((!submitFn || !eligible) && tries < 60) {
				tries += 1;
				setTimeout(tick, 250);
			}
		};
		tick();
		return () => {
			cancelled = true;
		};
	}, [cardFieldsForm, cardFields]);

	const submit = async () => {
		const submitFn =
			(cardFieldsForm && cardFieldsForm.submit) ||
			(cardFields && cardFields.submit) ||
			null;
		if (!allowInteract || typeof submitFn !== "function") return;
		setBusy(true);
		try {
			if (cardFieldsForm?.getState) {
				const state = await cardFieldsForm.getState();
				if (state && !state.isFormValid) {
					message.error(
						labels?.incomplete || "Please complete your card details."
					);
					setBusy(false);
					return;
				}
			}
			await submitFn(); // triggers SCA if needed → then onApprove runs
		} catch (e) {
			console.error("[Owner] CardFields submit error:", e);
			message.error(labels?.failed || "Card save failed.");
		} finally {
			setBusy(false);
		}
	};

	const disabled = !allowInteract || !ready || busy;
	return (
		<PrimaryBtn
			type='button'
			onClick={submit}
			disabled={disabled}
			aria-disabled={disabled}
		>
			{busy ? labels?.processing || "Processing…" : labels?.save || "Save Card"}
		</PrimaryBtn>
	);
}

/* Inner area (ScriptProvider context) */
function OwnerVaultArea({
	isArabic,
	allowInteract,
	label,
	setLabel,
	setDefault,
	setSetDefault,
	onApproveSource, // (data, source) => void | Promise
	onErrorVault,
	createSetupTokenCard,
	createSetupTokenPaypal,
	createSetupTokenVenmo,
}) {
	const [{ isResolved, isRejected, options }] = usePayPalScriptReducer();

	if (isRejected) {
		try {
			const u = new URL("https://www.paypal.com/sdk/js");
			Object.entries(options || {}).forEach(([k, v]) => {
				if (v != null && v !== "") u.searchParams.set(k, String(v));
			});
			console.log("[Owner][PP][script url]", u.toString(), { options });
		} catch {}
		return (
			<Alert
				type='error'
				showIcon
				message={
					isArabic ? "تعذر تحميل بوابة الدفع" : "Payment module failed to load"
				}
				description={
					isArabic
						? "تحقق من الاتصال أو جرّب متصفح/شبكة مختلفة."
						: "Check your internet or try another browser/network."
				}
			/>
		);
	}
	if (!isResolved) return <Spin />;

	return (
		<>
			{/* Wallet Buttons */}
			<ButtonsBox>
				{/* PayPal wallet button (auto‑hides if ineligible) */}
				<PayPalButtons
					fundingSource='paypal'
					style={{ layout: "vertical", label: "paypal" }}
					createVaultSetupToken={createSetupTokenPaypal}
					onApprove={(data) => onApproveSource(data, "paypal")}
					onError={onErrorVault}
					disabled={!allowInteract}
				/>
				{/* Venmo button (will be hidden on most desktops / non‑US configs) */}
				<PayPalButtons
					fundingSource='venmo'
					style={{ layout: "vertical", label: "venmo" }}
					createVaultSetupToken={createSetupTokenVenmo}
					onApprove={(data) => onApproveSource(data, "venmo")}
					onError={onErrorVault}
					disabled={!allowInteract}
				/>
			</ButtonsBox>

			<BrandFootnote>
				Powered by <b>PayPal</b>
			</BrandFootnote>
			<Divider />

			{/* Card Fields */}
			<CardBox aria-disabled={!allowInteract}>
				<CardTitle>
					{isArabic ? "إضافة بطاقة الفندق" : "Add Hotel Card"}
				</CardTitle>

				<FieldRow dir={isArabic ? "rtl" : "ltr"}>
					<div className='field' style={{ flex: 1 }}>
						<label>
							{isArabic ? "اسم للبطاقة (اختياري)" : "Card label (optional)"}
						</label>
						<Input
							placeholder={
								isArabic ? "مثال: Visa رئيسية" : "e.g., Primary Visa"
							}
							maxLength={60}
							value={label}
							onChange={(e) => setLabel(e.target.value)}
						/>
					</div>
					<div
						className='field'
						style={{ width: 220, display: "flex", alignItems: "end" }}
					>
						<Checkbox
							checked={setDefault}
							onChange={(e) => setSetDefault(e.target.checked)}
						>
							{isArabic ? "تعيين كافتراضي" : "Set as default"}
						</Checkbox>
					</div>
				</FieldRow>

				<PayPalCardFieldsProvider
					createVaultSetupToken={createSetupTokenCard}
					onApprove={(data) => onApproveSource(data, "card")}
					onError={onErrorVault}
				>
					<PayPalCardFieldsForm dir='ltr'>
						<div className='field' dir='ltr'>
							<label>{isArabic ? "اسم حامل البطاقة" : "Cardholder name"}</label>
							<div className='hosted'>
								<PayPalNameField />
							</div>
						</div>
						<div className='field' dir='ltr'>
							<label>{isArabic ? "رقم البطاقة" : "Card number"}</label>
							<div className='hosted'>
								<PayPalNumberField />
							</div>
						</div>
						<Row dir='ltr'>
							<div className='field half' dir='ltr'>
								<label>{isArabic ? "تاريخ الانتهاء" : "Expiry date"}</label>
								<div className='hosted'>
									<PayPalExpiryField />
								</div>
							</div>
							<div className='field half' dir='ltr'>
								<label>CVV</label>
								<div className='hosted'>
									<PayPalCVVField />
								</div>
							</div>
						</Row>
					</PayPalCardFieldsForm>

					<div style={{ marginTop: 8 }}>
						<SubmitOwnerCard
							allowInteract={allowInteract}
							labels={{
								save: isArabic ? "حفظ البطاقة" : "Save Card",
								processing: isArabic ? "جار المعالجة..." : "Processing…",
								incomplete: isArabic
									? "يرجى إكمال بيانات البطاقة."
									: "Please complete your card details.",
								failed: isArabic ? "فشل حفظ البطاقة" : "Card save failed.",
							}}
						/>
					</div>
				</PayPalCardFieldsProvider>
			</CardBox>
		</>
	);
}

/* Save‑method modal (wraps OwnerVaultArea) */
function SaveMethodModal({
	open,
	onClose,
	paypalOptions,
	isArabic,
	allowInteract,
	label,
	setLabel,
	setDefault,
	setSetDefault,
	onApproveSource, // must return true on success to auto-close
	onErrorVault,
	createSetupTokenCard,
	createSetupTokenPaypal,
	createSetupTokenVenmo,
}) {
	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			destroyOnClose
			title={isArabic ? "إضافة طريقة دفع" : "Add Payment Method"}
		>
			{!paypalOptions ? (
				<Centered>
					<Spin />
				</Centered>
			) : (
				<ScriptShell>
					<PayPalScriptProvider options={paypalOptions}>
						<OwnerVaultArea
							isArabic={isArabic}
							allowInteract={allowInteract}
							label={label}
							setLabel={setLabel}
							setDefault={setDefault}
							setSetDefault={setSetDefault}
							onApproveSource={async (data, src) => {
								const ok = await onApproveSource(data, src);
								if (ok) onClose();
							}}
							onErrorVault={onErrorVault}
							createSetupTokenCard={createSetupTokenCard}
							createSetupTokenPaypal={createSetupTokenPaypal}
							createSetupTokenVenmo={createSetupTokenVenmo}
						/>
					</PayPalScriptProvider>
				</ScriptShell>
			)}
		</Modal>
	);
}

/* Manage modal */
function ManageMethodModal({
	isArabic,
	open,
	onClose,
	method,
	hotelId,
	token,
	refresh,
}) {
	if (!method) return null;
	const doDefault = async () => {
		try {
			await setOwnerDefaultPaymentMethod(
				{ hotelId, methodId: method._id },
				{ token }
			);
			message.success(isArabic ? "تم التعيين كافتراضي" : "Set as default.");
			await refresh();
			onClose();
		} catch (e) {
			console.error("[Owner] set default error:", e);
			message.error(
				isArabic ? "تعذر التعيين كافتراضي" : "Failed to set default."
			);
		}
	};
	const doActivate = async () => {
		try {
			await activateOwnerPaymentMethod(
				{ hotelId, methodId: method._id },
				{ token }
			);
			message.success(isArabic ? "تم التفعيل" : "Activated.");
			await refresh();
			onClose();
		} catch (e) {
			console.error("[Owner] activate error:", e);
			message.error(isArabic ? "تعذر التفعيل" : "Failed to activate.");
		}
	};
	const doDeactivate = async () => {
		try {
			await deactivateOwnerPaymentMethod(
				{ hotelId, methodId: method._id },
				{ token }
			);
			message.success(isArabic ? "تم التعطيل" : "Deactivated.");
			await refresh();
			onClose();
		} catch (e) {
			console.error("[Owner] deactivate error:", e);
			message.error(isArabic ? "تعذر التعطيل" : "Failed to deactivate.");
		}
	};
	const doDelete = async () => {
		Modal.confirm({
			title: isArabic ? "احذف هذه الطريقة؟" : "Delete this method?",
			content: isArabic
				? "لن تظهر هذه البطاقة/المحفظة في القائمة بعد الآن"
				: "This method will be deleted from the list.",
			okText: isArabic ? "احذف" : "Delete",
			cancelText: isArabic ? "إلغاء" : "Cancel",
			onOk: async () => {
				try {
					await deleteOwnerPaymentMethod(
						{ hotelId, methodId: method._id },
						{ token }
					);
					message.success(isArabic ? "تم احذف" : "Deleted.");
					await refresh();
					onClose();
				} catch (e) {
					console.error("[Owner] delete error:", e);
					message.error(isArabic ? "تعذر حذف" : "Failed to Delete.");
				}
			},
		});
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			title={isArabic ? "إدارة طريقة الدفع" : "Manage Payment Method"}
		>
			<p style={{ marginBottom: 6, fontWeight: 600 }}>{method.label || "—"}</p>
			<div style={{ marginBottom: 8 }}>
				<Tag color='geekblue'>{method.method_type || "CARD"}</Tag>
				{method.default ? (
					<Tag color='blue'>{isArabic ? "افتراضي" : "Default"}</Tag>
				) : null}
				{method.active ? (
					<Tag color='green'>{isArabic ? "نشط" : "Active"}</Tag>
				) : (
					<Tag color='orange'>{isArabic ? "غير نشط" : "Inactive"}</Tag>
				)}
			</div>

			<Space wrap>
				<Button
					type='primary'
					disabled={method.default || method.delete}
					onClick={doDefault}
				>
					{isArabic ? "تعيين كافتراضي" : "Set as Default"}
				</Button>
				<Button onClick={doActivate} disabled={method.active}>
					{isArabic ? "تفعيل" : "Activate"}
				</Button>
				<Button danger onClick={doDeactivate} disabled={!method.active}>
					{isArabic ? "تعطيل" : "Deactivate"}
				</Button>
				<Button danger onClick={doDelete}>
					{isArabic ? "احذف" : "Delete"}
				</Button>
			</Space>
		</Modal>
	);
}

export default function PaymentSettings({
	setHotelDetails,
	hotelDetails,
	chosenLanguage,
	submittingHotelDetails,
}) {
	const isArabic = chosenLanguage === "Arabic";
	const locale = mapLocale(isArabic);
	const hotelId = hotelDetails?._id;
	const { token } = isAuthenticated() || {};

	const [clientToken, setClientToken] = useState(null);
	const [isLive, setIsLive] = useState(null);
	const [tokenError, setTokenError] = useState(null);
	const [reloadKey, setReloadKey] = useState(0);

	const [methods, setMethods] = useState(
		() => hotelDetails?.ownerPaymentMethods || []
	);
	const [label, setLabel] = useState("");
	const [setDefault, setSetDefault] = useState(true);

	// remember last setup token (any source)
	const lastSetupTokenRef = useRef(null);

	// manage modal
	const [manageOpen, setManageOpen] = useState(false);
	const [selectedMethod, setSelectedMethod] = useState(null);

	// add method modal
	const [addOpen, setAddOpen] = useState(false);

	const allowInteract = !!hotelId;

	const refreshFromServer = useCallback(async () => {
		if (!hotelId) return;
		try {
			const data = await listOwnerPaymentMethods(hotelId, { token });
			const arr = Array.isArray(data?.ownerPaymentMethods)
				? data.ownerPaymentMethods
				: [];
			setMethods(arr);
			if (typeof setHotelDetails === "function") {
				setHotelDetails((prev) => ({
					...(prev || {}),
					ownerPaymentMethods: arr,
				}));
			}
		} catch (e) {
			console.error("[Owner] list methods error:", e);
			message.error(isArabic ? "تعذر تحميل الطرق" : "Failed to load methods.");
		}
	}, [hotelId, setHotelDetails, isArabic, token]);

	useEffect(() => {
		setMethods(hotelDetails?.ownerPaymentMethods || []);
	}, [hotelDetails?.ownerPaymentMethods]);

	// Load client token once
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const tok = await getOwnerPayPalClientToken({ debug: true });
				const ct = tok?.clientToken;
				let env = (tok?.env || "").toLowerCase();
				if (!ct) throw new Error("Missing owner PayPal client token");
				if (env !== "live" && env !== "sandbox") {
					const node = (process.env.REACT_APP_NODE_ENV || "").toUpperCase();
					env = node === "PRODUCTION" ? "live" : "sandbox";
					console.warn(
						"[Owner][PayPal] 'env' not returned by API. Falling back to",
						env
					);
				}
				if (mounted) {
					setClientToken(ct);
					setIsLive(env === "live");
				}
				const feClientId =
					env === "live"
						? process.env.REACT_APP_PAYPAL_CLIENT_ID_LIVE
						: process.env.REACT_APP_PAYPAL_CLIENT_ID_SANDBOX;
				console.log(
					"[Owner][PP][diag] FE clientIdSig:",
					idSig(feClientId || "na"),
					"BE clientIdSig:",
					tok?.diag?.clientIdSig || "(n/a)",
					"env:",
					env,
					"cached:",
					!!tok?.cached
				);
			} catch (e) {
				console.error("[Owner] PayPal init failed:", e);
				setTokenError(e);
				message.error(isArabic ? "فشل تهيئة PayPal" : "PayPal init failed.");
			}
		})();
		return () => {
			mounted = false;
		};
	}, [isArabic, reloadKey]);

	useEffect(() => {
		refreshFromServer();
	}, [refreshFromServer]);

	const reloadPayment = useCallback(() => {
		setReloadKey((k) => k + 1);
		setClientToken(null);
		setIsLive(null);
		setTokenError(null);
	}, []);

	const feClientId = useMemo(() => {
		if (isLive == null) return "";
		return (
			(isLive
				? process.env.REACT_APP_PAYPAL_CLIENT_ID_LIVE
				: process.env.REACT_APP_PAYPAL_CLIENT_ID_SANDBOX) || ""
		);
	}, [isLive]);

	// IMPORTANT: vault:true so wallet + card tokenization works
	const paypalOptions =
		clientToken && isLive != null
			? {
					"client-id": feClientId,
					"data-client-token": clientToken,
					components: "buttons,card-fields",
					currency: "USD",
					intent: "authorize",
					commit: true,
					"enable-funding": "paypal,card,venmo",
					"disable-funding": "credit,paylater",
					vault: true,
					locale,
			  }
			: null;

	// Setup-token creators per source
	const createSetupTokenCard = useCallback(async () => {
		const id = await createOwnerPayPalSetupToken({
			paymentSource: "card",
			token,
		});
		lastSetupTokenRef.current = id;
		return id;
	}, [token]);

	const createSetupTokenPaypal = useCallback(
		(data, actions) => {
			if (actions?.vaultSetupToken) {
				return actions.vaultSetupToken().then((id) => {
					lastSetupTokenRef.current = id;
					return id;
				});
			}
			// Fallback (rare)
			return createOwnerPayPalSetupToken({
				paymentSource: "paypal",
				token,
			}).then((id) => {
				lastSetupTokenRef.current = id;
				return id;
			});
		},
		[token]
	);

	const createSetupTokenVenmo = useCallback(
		(data, actions) => {
			if (actions?.vaultSetupToken) {
				return actions.vaultSetupToken().then((id) => {
					lastSetupTokenRef.current = id;
					return id;
				});
			}
			return createOwnerPayPalSetupToken({
				paymentSource: "venmo",
				token,
			}).then((id) => {
				lastSetupTokenRef.current = id;
				return id;
			});
		},
		[token]
	);

	const onApproveSource = useCallback(
		async (data, source) => {
			try {
				const fromData = extractSetupTokenFromApprove(data);
				const setupTokenId = fromData || lastSetupTokenRef.current || null;

				if (!setupTokenId) {
					message.error(
						isArabic
							? "تعذر الحصول على رمز التهيئة من PayPal"
							: "Could not get setup token from PayPal"
					);
					return false;
				}

				const auto =
					source === "paypal"
						? "PayPal"
						: source === "venmo"
						  ? "Venmo"
						  : "Card";
				const save = await saveOwnerVaultCard(
					{
						hotelId,
						setup_token: setupTokenId,
						label: (label || "").trim() || auto,
						setDefault,
					},
					{ token }
				);

				const arr = Array.isArray(save?.ownerPaymentMethods)
					? save.ownerPaymentMethods
					: [];
				setMethods(arr);
				if (typeof setHotelDetails === "function") {
					setHotelDetails((prev) => ({
						...(prev || {}),
						ownerPaymentMethods: arr,
					}));
				}
				setLabel("");
				setSetDefault(true);
				message.success(isArabic ? "تم الحفظ بنجاح" : "Saved successfully.");
				return true;
			} catch (e) {
				console.error("[Owner] vault save error:", e);
				message.error(isArabic ? "فشل حفظ الطريقة" : "Failed to save method.");
				return false;
			}
		},
		[hotelId, label, setDefault, setHotelDetails, isArabic, token]
	);

	const onErrorVault = (e) => {
		console.error("[Owner] PayPal vault error:", e);
		message.error(isArabic ? "خطأ من PayPal" : "PayPal vault error.");
	};

	// Only show non-deleted
	const visibleMethods = useMemo(
		() =>
			Array.isArray(methods) ? methods.filter((m) => m?.delete !== true) : [],
		[methods]
	);

	const columns = useMemo(
		() => [
			{
				title: isArabic ? "النوع" : "Type",
				dataIndex: "method_type",
				key: "method_type",
				render: (t) => <Tag color='geekblue'>{t || "CARD"}</Tag>,
			},
			{
				title: isArabic ? "التسمية" : "Label",
				dataIndex: "label",
				key: "label",
				render: (text, record) => (
					<Space size='small'>
						<span style={{ fontWeight: 600 }}>{text || "—"}</span>
						{record.default ? (
							<Tag color='blue'>{isArabic ? "افتراضي" : "Default"}</Tag>
						) : null}
						{!record.active ? (
							<Tag color='orange'>{isArabic ? "غير نشط" : "Inactive"}</Tag>
						) : null}
					</Space>
				),
			},
			{
				title: isArabic ? "البطاقة/المحفظة" : "Card/Wallet",
				key: "card",
				render: (_, r) =>
					r.method_type === "CARD" ? (
						<span>
							{(r.card_brand || "").toUpperCase() || "Card"} ••••{" "}
							{r.card_last4 || "****"}
						</span>
					) : r.method_type === "PAYPAL" ? (
						<span>PayPal {r.paypal_email ? `• ${r.paypal_email}` : ""}</span>
					) : (
						<span>
							Venmo {r.venmo_username ? `• @${r.venmo_username}` : ""}
						</span>
					),
			},
			{
				title: isArabic ? "الصلاحية" : "Expiry",
				dataIndex: "card_exp",
				key: "card_exp",
				render: (v, r) => (r.method_type === "CARD" ? v || "—" : "—"),
			},
			{
				title: isArabic ? "حالة الخزينة" : "Vault Status",
				dataIndex: "vault_status",
				key: "vault_status",
				render: (s) => (
					<Tag
						color={String(s).toUpperCase() === "ACTIVE" ? "green" : "orange"}
					>
						{s || "—"}
					</Tag>
				),
			},
			{
				title: isArabic ? "أُضيفت" : "Added",
				dataIndex: "vaulted_at",
				key: "vaulted_at",
				render: (d) => (d ? new Date(d).toLocaleString() : "—"),
			},
			{
				title: isArabic ? "الإجراء" : "Action",
				key: "action",
				render: (_, r) => (
					<Space>
						<Button
							size='small'
							onClick={() => {
								setSelectedMethod(r);
								setManageOpen(true);
							}}
						>
							{isArabic ? "إدارة" : "Manage"}
						</Button>
						<Tooltip title={isArabic ? "نسخ معرف الخزينة" : "Copy vault id"}>
							<Button
								size='small'
								onClick={() => {
									navigator.clipboard?.writeText?.(r.vault_id || "");
									message.success(isArabic ? "تم النسخ" : "Copied.");
								}}
							>
								{isArabic ? "نسخ" : "Copy"}
							</Button>
						</Tooltip>
					</Space>
				),
			},
		],
		[isArabic]
	);

	if (!hotelId) {
		return (
			<Alert
				type='warning'
				showIcon
				message={isArabic ? "لا يوجد فندق محدد" : "No hotel selected"}
			/>
		);
	}

	if (clientToken && isLive != null && !feClientId) {
		return (
			<Alert
				type='error'
				showIcon
				message='Missing PayPal client-id on the frontend'
				description={
					isLive
						? "Set REACT_APP_PAYPAL_CLIENT_ID_LIVE in your .env"
						: "Set REACT_APP_PAYPAL_CLIENT_ID_SANDBOX in your .env"
				}
			/>
		);
	}

	if (tokenError) {
		return (
			<Centered>
				<Alert
					type='error'
					showIcon
					message={
						isArabic ? "فشل تهيئة PayPal" : "PayPal initialization failed"
					}
					description={
						isArabic ? "يرجى المحاولة مرة أخرى." : "Please try again."
					}
				/>
				<div style={{ marginTop: 10 }}>
					<ReloadBtn onClick={reloadPayment}>
						{isArabic ? "إعادة المحاولة" : "Try again"}
					</ReloadBtn>
				</div>
			</Centered>
		);
	}

	return (
		<Wrapper>
			{/* Header + actions for methods */}
			<HeaderRow>
				<h4 style={{ margin: 0 }}>
					{isArabic ? "الطرق المحفوظة" : "Saved Methods"}
				</h4>
				<Space>
					<Button onClick={refreshFromServer}>
						{isArabic ? "تحديث" : "Refresh"}
					</Button>
					<Button type='primary' onClick={() => setAddOpen(true)}>
						{isArabic ? "إضافة طريقة دفع" : "Add Payment Method"}
					</Button>
				</Space>
			</HeaderRow>

			<Table
				rowKey={(r) => r._id || r.vault_id}
				dataSource={visibleMethods}
				columns={columns}
				pagination={{ pageSize: 6 }}
				size='middle'
				bordered
			/>

			<ManageMethodModal
				isArabic={isArabic}
				open={manageOpen}
				onClose={() => setManageOpen(false)}
				method={selectedMethod}
				hotelId={hotelId}
				token={token}
				refresh={refreshFromServer}
			/>

			{/* Bank accounts block (unchanged) */}
			<Divider />
			<div className='my-4'>
				<BankAccountData
					hotelDetails={hotelDetails}
					setHotelDetails={setHotelDetails}
					submittingHotelDetails={submittingHotelDetails}
					chosenLanguage={chosenLanguage}
				/>
			</div>

			{/* Add method modal (new) */}
			<SaveMethodModal
				open={addOpen}
				onClose={() => setAddOpen(false)}
				paypalOptions={paypalOptions}
				isArabic={isArabic}
				allowInteract={allowInteract}
				label={label}
				setLabel={setLabel}
				setDefault={setDefault}
				setSetDefault={setSetDefault}
				onApproveSource={onApproveSource}
				onErrorVault={onErrorVault}
				createSetupTokenCard={createSetupTokenCard}
				createSetupTokenPaypal={createSetupTokenPaypal}
				createSetupTokenVenmo={createSetupTokenVenmo}
			/>
		</Wrapper>
	);
}

/* styles */
const Wrapper = styled.div`
	width: 100%;
`;
const HeaderRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 8px 0 12px;
`;

const ScriptShell = styled.div`
	width: 100%;
	margin-top: 6px;
`;
const ButtonsBox = styled.div`
	width: 100%;
	max-width: 420px;
	margin: 0 auto;
	display: grid;
	gap: 10px;
`;
const BrandFootnote = styled.div`
	text-align: center;
	font-size: 12px;
	color: #6b7280;
	margin-top: 6px;
	b {
		color: #1f2937;
	}
`;
const Divider = styled.hr`
	max-width: 100%;
	margin: 18px auto;
	border: none;
	border-top: 1px solid #eef2f6;
`;
const CardBox = styled.div`
	width: 100%;
	max-width: 560px;
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
	}
	.hosted:focus-within {
		border-color: #1677ff;
		box-shadow: 0 0 0 4px rgba(22, 119, 255, 0.12);
		background: #fff;
	}
	&[aria-disabled="true"] {
		opacity: 0.6;
		pointer-events: none;
	}
	@media (max-width: 560px) {
		padding: 12px;
		.hosted {
			min-height: 40px;
			line-height: 40px;
		}
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
const FieldRow = styled.div`
	display: flex;
	gap: 10px;
	margin-bottom: 8px;
	@media (max-width: 560px) {
		flex-direction: column;
	}
`;
const PrimaryBtn = styled.button`
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
const Centered = styled.div`
	width: 100%;
	text-align: center;
	padding: 10px 0;
`;
const ReloadBtn = styled.button`
	background: #0f172a;
	color: #fff;
	border: none;
	border-radius: 8px;
	padding: 8px 14px;
	font-weight: 700;
	cursor: pointer;
`;
