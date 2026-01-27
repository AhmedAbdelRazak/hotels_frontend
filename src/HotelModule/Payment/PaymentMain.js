/** @format */
import React, {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useRef,
} from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { useCartContext } from "../../cart_context";
import {
	hotelAccount,
	getHotelById,
	listHotelCommissions,
	currencyConversion,
	getHotelFinanceOverview,
	listOwnerPaymentMethods,
	getOwnerPayPalClientToken,
	createOwnerPayPalSetupToken,
	saveOwnerVaultCard,
	chargeOwnerCommissions,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import {
	Alert,
	Button,
	Checkbox,
	Modal,
	Space,
	Spin,
	Table,
	Tag,
	message,
} from "antd";
import { getStoredMenuCollapsed } from "../utils/menuState";

import {
	PayPalScriptProvider,
	PayPalButtons,
	PayPalCardFieldsProvider,
	PayPalCardFieldsForm,
	PayPalNameField,
	PayPalNumberField,
	PayPalExpiryField,
	PayPalCVVField,
	usePayPalCardFields,
} from "@paypal/react-paypal-js";

/* ---------------- helpers ---------------- */
const n2 = (v) => Number(v || 0).toFixed(2);
const isNum = (v) => Number.isFinite(Number(v));
const SAR = (isAr) => (isAr ? "ريال" : "SAR");

/* ---------- NEW: last note / last updated extractors (safe fallbacks) ---------- */
// Uses grouped admin logs (field: "commission" | "transfer") when available,
// otherwise falls back to legacy single-field logs, then to timestamps.
const pickLastRelevantLog = (row, group) => {
	const logs = Array.isArray(row?.adminChangeLog) ? row.adminChangeLog : [];
	if (!logs.length) return null;

	// Prefer grouped logs introduced in the admin backend update
	const grouped = logs.filter(
		(e) => e && typeof e === "object" && e.field === group && e.changes
	);
	if (grouped.length) {
		// Prefer the most recent one that actually has a note
		const withNote = [...grouped]
			.reverse()
			.find((e) => e?.note && String(e.note).trim());
		return withNote || grouped[grouped.length - 1];
	}

	// Fallback: legacy single-field entries
	const legacyFields =
		group === "commission"
			? ["commissionPaid", "commissionStatus", "commissionPaidAt"]
			: ["moneyTransferredToHotel", "moneyTransferredAt"];

	const legacy = [...logs]
		.reverse()
		.find((e) => legacyFields.includes(e?.field));
	return legacy || null;
};

const getLastNoteAndDate = (row, group /* "commission" | "transfer" */) => {
	const entry = pickLastRelevantLog(row, group);

	// Note (prefer the entry note)
	const note =
		entry && entry.note && String(entry.note).trim()
			? String(entry.note).trim()
			: null;

	// Date preference:
	// 1) adminLastUpdatedAt  2) entry.at  3) group-specific timestamp  4) updatedAt  5) createdAt
	const groupDate =
		group === "commission" ? row?.commissionPaidAt : row?.moneyTransferredAt;

	const when =
		row?.adminLastUpdatedAt ||
		entry?.at ||
		groupDate ||
		row?.updatedAt ||
		row?.createdAt ||
		null;

	return {
		note: note || "—",
		date: when ? new Date(when).toLocaleDateString() : "—",
	};
};

/* ========= Quick "Add Method" modal ========= */
// (unchanged)
function QuickAddMethodModal({
	open,
	onClose,
	hotelId,
	isArabic,
	onSaved,
	authToken,
}) {
	const [paypalOptions, setPaypalOptions] = useState(null);
	const [busy, setBusy] = useState(false);
	const lastSetupRef = useRef(null);

	useEffect(() => {
		if (!open || !hotelId) return;
		(async () => {
			try {
				const tok = await getOwnerPayPalClientToken({
					debug: true,
					token: authToken,
				});
				const env = (tok?.env || "sandbox").toLowerCase();
				const feClientId =
					env === "live"
						? process.env.REACT_APP_PAYPAL_CLIENT_ID_LIVE
						: process.env.REACT_APP_PAYPAL_CLIENT_ID_SANDBOX;

				setPaypalOptions({
					"client-id": feClientId,
					"data-client-token": tok.clientToken,
					components: "buttons,card-fields",
					currency: "USD",
					intent: "authorize",
					commit: true,
					"enable-funding": "paypal,card,venmo",
					"disable-funding": "credit,paylater",
					vault: true,
					locale: isArabic ? "ar_EG" : "en_US",
				});
			} catch {
				message.error(isArabic ? "فشل تهيئة PayPal" : "PayPal init failed.");
			}
		})();
	}, [open, hotelId, isArabic, authToken]);

	const createSetupToken = async (payment_source) => {
		const id = await createOwnerPayPalSetupToken({
			paymentSource: payment_source,
			token: authToken,
		});
		lastSetupRef.current = id;
		return id;
	};

	const handleApprove = async (data, src) => {
		try {
			const id =
				data?.vaultSetupToken ||
				data?.vault_setup_token ||
				data?.setupToken ||
				data?.setup_token ||
				data?.paymentToken ||
				data?.payment_token ||
				data?.id ||
				lastSetupRef.current;

			if (!id) {
				message.error(
					isArabic ? "تعذر الحصول على رمز التهيئة" : "Could not get setup token"
				);
				return;
			}
			setBusy(true);
			await saveOwnerVaultCard(
				{
					hotelId,
					setup_token: id,
					label:
						src === "paypal" ? "PayPal" : src === "venmo" ? "Venmo" : "Card",
					setDefault: true,
				},
				{ token: authToken }
			);
			setBusy(false);
			message.success(isArabic ? "تم الحفظ" : "Saved.");
			onSaved?.();
			onClose();
		} catch {
			setBusy(false);
			message.error(isArabic ? "فشل حفظ الطريقة" : "Failed to save method");
		}
	};

	const SubmitCard = () => {
		const ctx = usePayPalCardFields();
		const submit = async () => {
			try {
				const f =
					(ctx.cardFieldsForm && ctx.cardFieldsForm.submit) ||
					(ctx.cardFields && ctx.cardFields.submit);
				if (typeof f === "function") await f();
			} catch {
				message.error(isArabic ? "فشل حفظ البطاقة" : "Card save failed");
			}
		};
		return (
			<Button type='primary' block onClick={submit} disabled={busy}>
				{isArabic ? "حفظ البطاقة" : "Save card"}
			</Button>
		);
	};

	return (
		<Modal
			open={open}
			footer={null}
			onCancel={onClose}
			destroyOnClose
			title={isArabic ? "إضافة طريقة دفع" : "Add Payment Method"}
		>
			{!paypalOptions ? (
				<Centered>
					<Spin />
				</Centered>
			) : (
				<PayPalScriptProvider options={paypalOptions}>
					<div
						style={{
							display: "grid",
							gap: 8,
							maxWidth: 380,
							margin: "0 auto 8px",
						}}
					>
						<PayPalButtons
							fundingSource='paypal'
							style={{ layout: "vertical", label: "paypal" }}
							createVaultSetupToken={() => createSetupToken("paypal")}
							onApprove={(d) => handleApprove(d, "paypal")}
						/>
						<PayPalButtons
							fundingSource='venmo'
							style={{ layout: "vertical", label: "venmo" }}
							createVaultSetupToken={() => createSetupToken("venmo")}
							onApprove={(d) => handleApprove(d, "venmo")}
						/>
					</div>

					<PayPalCardFieldsProvider
						createVaultSetupToken={() => createSetupToken("card")}
						onApprove={(d) => handleApprove(d, "card")}
					>
						<PayPalCardFieldsForm>
							<div style={{ marginBottom: 8 }}>
								<label style={{ fontWeight: 600 }}>
									{isArabic ? "اسم حامل البطاقة" : "Cardholder name"}
								</label>
								<div
									style={{
										border: "1px solid #d0d5dd",
										borderRadius: 8,
										padding: "6px 10px",
									}}
								>
									<PayPalNameField />
								</div>
							</div>
							<div style={{ marginBottom: 8 }}>
								<label style={{ fontWeight: 600 }}>
									{isArabic ? "رقم البطاقة" : "Card number"}
								</label>
								<div
									style={{
										border: "1px solid #d0d5dd",
										borderRadius: 8,
										padding: "6px 10px",
									}}
								>
									<PayPalNumberField />
								</div>
							</div>
							<div style={{ display: "flex", gap: 10 }}>
								<div style={{ flex: 1 }}>
									<label style={{ fontWeight: 600 }}>
										{isArabic ? "تاريخ الانتهاء" : "Expiry"}
									</label>
									<div
										style={{
											border: "1px solid #d0d5dd",
											borderRadius: 8,
											padding: "6px 10px",
										}}
									>
										<PayPalExpiryField />
									</div>
								</div>
								<div style={{ flex: 1 }}>
									<label style={{ fontWeight: 600 }}>CVV</label>
									<div
										style={{
											border: "1px solid #d0d5dd",
											borderRadius: 8,
											padding: "6px 10px",
										}}
									>
										<PayPalCVVField />
									</div>
								</div>
							</div>
						</PayPalCardFieldsForm>
						<div style={{ marginTop: 8 }}>
							<SubmitCard />
						</div>
					</PayPalCardFieldsProvider>
				</PayPalScriptProvider>
			)}
		</Modal>
	);
}
/* ======================= Component ======================= */
const PaymentMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [hotelDetails, setHotelDetails] = useState("");
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const { user, token } = isAuthenticated();
	const { chosenLanguage } = useCartContext();
	const isArabic = chosenLanguage === "Arabic";

	// original fetch (unchanged)
	const gettingHotelData = () => {
		const selectedHotel =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userId = user.role === 2000 ? user._id : selectedHotel.belongsTo._id;

		hotelAccount(user._id, token, userId).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error rendering");
			} else {
				getHotelById(selectedHotel._id).then((data2) => {
					if (data2 && data2.error) {
						console.log(data2.error, "Error rendering");
					} else {
						if (data && data.name && data._id && data2 && data2._id) {
							setHotelDetails(data2);
						}
					}
				});
			}
		});
	};

	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) setCollapsed(true);
		gettingHotelData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const hotelId = useMemo(() => hotelDetails?._id || null, [hotelDetails?._id]);

	/* ---------- Score cards (overview) ---------- */
	const [overview, setOverview] = useState(null);
	const [loadingOverview, setLoadingOverview] = useState(false);

	const fetchOverview = useCallback(
		async (hid) => {
			setLoadingOverview(true);
			try {
				const data = await getHotelFinanceOverview(hid, { token });
				setOverview(data?.summary || null);
			} catch (e) {
				console.error(e);
				setOverview(null);
			} finally {
				setLoadingOverview(false);
			}
		},
		[token]
	);

	/* ---------- OFFLINE tables (pending / paid commission) ---------- */
	const [pending, setPending] = useState({
		rows: [],
		total: 0,
		page: 1,
		pageSize: 10,
	});
	const [paid, setPaid] = useState({
		rows: [],
		total: 0,
		page: 1,
		pageSize: 10,
	});

	const [loadingPending, setLoadingPending] = useState(false);
	const [loadingPaid, setLoadingPaid] = useState(false);
	const [loadError, setLoadError] = useState(null);

	const fetchPending = useCallback(
		async (hid, page = 1, pageSize = 10) => {
			try {
				setLoadingPending(true);
				setLoadError(null);
				const resp = await listHotelCommissions(
					{
						hotelId: hid,
						commissionPaid: 0,
						paymentChannel: "offline",
						page,
						pageSize,
					},
					{ token }
				);
				setPending({
					rows: Array.isArray(resp?.reservations) ? resp.reservations : [],
					total: Number(resp?.total || 0),
					page: Number(resp?.page || page),
					pageSize: Number(resp?.pageSize || pageSize),
				});
			} catch (e) {
				console.error(e);
				setLoadError(e?.message || "Failed to load pending commissions.");
			} finally {
				setLoadingPending(false);
			}
		},
		[token]
	);

	const fetchPaid = useCallback(
		async (hid, page = 1, pageSize = 10) => {
			try {
				setLoadingPaid(true);
				setLoadError(null);
				const resp = await listHotelCommissions(
					{
						hotelId: hid,
						commissionPaid: 1,
						paymentChannel: "offline",
						page,
						pageSize,
					},
					{ token }
				);
				setPaid({
					rows: Array.isArray(resp?.reservations) ? resp.reservations : [],
					total: Number(resp?.total || 0),
					page: Number(resp?.page || page),
					pageSize: Number(resp?.pageSize || pageSize),
				});
			} catch (e) {
				console.error(e);
				setLoadError(e?.message || "Failed to load paid commissions.");
			} finally {
				setLoadingPaid(false);
			}
		},
		[token]
	);

	/* ---------- ONLINE tables (transfers due / completed) ---------- */
	const [onlineDue, setOnlineDue] = useState({
		rows: [],
		total: 0,
		page: 1,
		pageSize: 10,
	});
	const [onlineSent, setOnlineSent] = useState({
		rows: [],
		total: 0,
		page: 1,
		pageSize: 10,
	});
	const [loadingOnlineDue, setLoadingOnlineDue] = useState(false);
	const [loadingOnlineSent, setLoadingOnlineSent] = useState(false);
	const [loadErrorOnline, setLoadErrorOnline] = useState(null);

	const fetchOnlineDue = useCallback(
		async (hid, page = 1, pageSize = 10) => {
			try {
				setLoadingOnlineDue(true);
				setLoadErrorOnline(null);
				const resp = await listHotelCommissions(
					{
						hotelId: hid,
						paymentChannel: "online",
						transferStatus: "not_transferred",
						page,
						pageSize,
					},
					{ token }
				);
				setOnlineDue({
					rows: Array.isArray(resp?.reservations) ? resp.reservations : [],
					total: Number(resp?.total || 0),
					page: Number(resp?.page || page),
					pageSize: Number(resp?.pageSize || pageSize),
				});
			} catch (e) {
				console.error(e);
				setLoadErrorOnline(e?.message || "Failed to load online (due) list.");
			} finally {
				setLoadingOnlineDue(false);
			}
		},
		[token]
	);

	const fetchOnlineSent = useCallback(
		async (hid, page = 1, pageSize = 10) => {
			try {
				setLoadingOnlineSent(true);
				setLoadErrorOnline(null);
				const resp = await listHotelCommissions(
					{
						hotelId: hid,
						paymentChannel: "online",
						transferStatus: "transferred",
						page,
						pageSize,
					},
					{ token }
				);
				setOnlineSent({
					rows: Array.isArray(resp?.reservations) ? resp.reservations : [],
					total: Number(resp?.total || 0),
					page: Number(resp?.page || page),
					pageSize: Number(resp?.pageSize || pageSize),
				});
			} catch (e) {
				console.error(e);
				setLoadErrorOnline(
					e?.message || "Failed to load online (transferred) list."
				);
			} finally {
				setLoadingOnlineSent(false);
			}
		},
		[token]
	);

	useEffect(() => {
		if (!hotelId) return;
		fetchOverview(hotelId);

		// offline buckets
		fetchPending(hotelId, 1, pending.pageSize);
		fetchPaid(hotelId, 1, paid.pageSize);

		// online buckets
		fetchOnlineDue(hotelId, 1, onlineDue.pageSize);
		fetchOnlineSent(hotelId, 1, onlineSent.pageSize);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hotelId]);

	/* ---------- Selection + Pay modal (offline only) ---------- */
	const [selected, setSelected] = useState(() => new Set());
	const selectedRows = useMemo(
		() => pending.rows.filter((r) => selected.has(String(r._id))),
		[pending.rows, selected]
	);

	const commissionSelectedSAR = useMemo(
		() =>
			selectedRows.reduce(
				(a, r) =>
					a +
					(isNum(r?.computed_commission_sar)
						? Number(r.computed_commission_sar)
						: 0),
				0
			),
		[selectedRows]
	);

	const [usdPreview, setUsdPreview] = useState("0.00");
	useEffect(() => {
		const doConv = async () => {
			try {
				const res = await currencyConversion([
					Number(commissionSelectedSAR || 0),
				]);
				const usd = Array.isArray(res)
					? Number(res?.[0]?.amountInUSD || 0)
					: Number(res?.amountInUSD || 0);
				setUsdPreview(usd.toFixed(2));
			} catch {
				setUsdPreview("0.00");
			}
		};
		doConv();
	}, [commissionSelectedSAR]);

	const onRowCheck = (id, checked) =>
		setSelected((prev) => {
			const next = new Set(prev);
			if (checked) next.add(String(id));
			else next.delete(String(id));
			return next;
		});

	const selectAllPending = () =>
		setSelected(new Set(pending.rows.map((r) => String(r._id))));
	const clearSel = () => setSelected(new Set());

	const [addOpen, setAddOpen] = useState(false);
	const refreshOwnerMethods = useCallback(async () => {
		if (!hotelId) return;
		const res = await listOwnerPaymentMethods(hotelId, { token });
		const methods = Array.isArray(res?.ownerPaymentMethods)
			? res.ownerPaymentMethods
			: [];
		setHotelDetails((prev) => ({
			...(prev || {}),
			ownerPaymentMethods: methods,
		}));
	}, [hotelId, token, setHotelDetails]);

	const hasAnyMethod = useMemo(() => {
		const arr = (hotelDetails?.ownerPaymentMethods || []).filter(
			(m) => m?.delete !== true && m?.active !== false
		);
		return arr.length > 0;
	}, [hotelDetails?.ownerPaymentMethods]);

	const [confirmOpen, setConfirmOpen] = useState(false);
	const openConfirm = async () => {
		if (selected.size === 0) {
			message.error(
				isArabic ? "اختر حجوزات أولاً" : "Select reservations first."
			);
			return;
		}
		if (!hasAnyMethod) {
			setAddOpen(true);
			return;
		}
		setConfirmOpen(true);
	};

	const doConfirmPay = async () => {
		try {
			const ids = Array.from(selected);
			const sar = Number(commissionSelectedSAR || 0);
			const usd = Number(usdPreview || 0);
			const sarToUsdRate = sar > 0 ? usd / sar : undefined;

			const resp = await chargeOwnerCommissions(
				{ hotelId, reservationIds: ids, sarToUsdRate },
				{ token }
			);
			const isCompleted =
				String(resp?.capture?.status || "").toUpperCase() === "COMPLETED";
			if (!resp?.ok || !isCompleted) {
				message.error(
					isArabic ? "فشل الدفع أو لم يُسوى" : "Payment failed or not settled."
				);
				return;
			}
			message.success(
				isArabic
					? `تم الدفع بنجاح • المعاملة ${resp.capture.id} • ${resp.batch.totalUsd} USD`
					: `Paid successfully • ${resp.capture.id} • ${resp.batch.totalUsd} USD`
			);
			clearSel();
			setConfirmOpen(false);
			await Promise.all([
				fetchOverview(hotelId),
				fetchPending(hotelId, pending.page, pending.pageSize),
				fetchPaid(hotelId, paid.page, paid.pageSize),
				refreshOwnerMethods(),
			]);
		} catch (e) {
			const msg = e?.response?.data?.message || e?.message || "";
			message.error((isArabic ? "خطأ: " : "Error: ") + msg);
		}
	};

	/* ---------- Columns ---------- */
	const pendingCols = useMemo(
		() => [
			{
				title: "",
				key: "sel",
				width: 44,
				render: (_, r) => (
					<Checkbox
						checked={selected.has(String(r._id))}
						onChange={(e) => onRowCheck(r._id, e.target.checked)}
					/>
				),
			},
			{
				title: isArabic ? "رقم التأكيد" : "Confirmation",
				dataIndex: "confirmation_number",
				key: "conf",
				width: 150,
			},
			{
				title: isArabic ? "اسم الضيف" : "Guest",
				key: "guest",
				render: (_, r) => r?.customer_details?.name || "—",
			},
			{
				title: isArabic ? "الحالة المالية" : "Payment Status",
				dataIndex: "computed_payment_status",
				key: "fin",
				width: 150,
				render: (v) => (
					<Tag
						color={
							v === "Captured"
								? "green"
								: v === "Paid Offline"
								  ? "blue"
								  : "orange"
						}
					>
						{v || "—"}
					</Tag>
				),
			},
			{
				title: isArabic ? "الوصول" : "Check‑in",
				dataIndex: "checkin_date",
				key: "in",
				width: 120,
				render: (d) => (d ? new Date(d).toLocaleDateString("en-US") : "—"),
			},
			{
				title: isArabic ? "المغادرة" : "Check‑out",
				dataIndex: "checkout_date",
				key: "out",
				width: 120,
				render: (d) => (d ? new Date(d).toLocaleDateString("en-US") : "—"),
			},
			{
				title: isArabic
					? `الإجمالي (${SAR(isArabic)})`
					: `Total (${SAR(isArabic)})`,
				dataIndex: "total_amount",
				align: "right",
				width: 140,
				render: (n) => n2(n),
			},
			{
				title: isArabic
					? `عمولة المنصة (${SAR(isArabic)})`
					: `Commission (${SAR(isArabic)})`,
				key: "comm",
				align: "right",
				width: 160,
				render: (_, r) => n2(r?.computed_commission_sar),
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isArabic, selected]
	);

	const paidCols = useMemo(
		() => [
			{
				title: isArabic ? "رقم التأكيد" : "Confirmation",
				dataIndex: "confirmation_number",
				key: "conf",
				width: 150,
			},
			{
				title: isArabic ? "اسم الضيف" : "Guest",
				key: "guest",
				width: 180,
				render: (_, r) => r?.customer_details?.name || "—",
			},
			{
				title: isArabic ? "تاريخ دفع العمولة" : "Commission Paid At",
				dataIndex: "commissionPaidAt",
				key: "paidAt",
				width: 150,
				render: (d) => (d ? new Date(d).toLocaleString() : "—"),
			},
			{
				title: isArabic
					? `العمولة (${SAR(isArabic)})`
					: `Commission (${SAR(isArabic)})`,
				key: "comm2",
				align: "right",
				width: 80,
				render: (_, r) => n2(r?.computed_commission_sar),
			},

			// NEW: Last Note / Updated (for already-paid commissions)
			{
				title: isArabic ? "آخر ملاحظة / آخر تحديث" : "Last Note / Updated",
				key: "lastNotePaid",
				width: 300,
				render: (_, r) => {
					const { note, date } = getLastNoteAndDate(r, "commission");
					return (
						<div>
							<div
								style={{
									fontWeight: 600,
									maxWidth: 240,
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
								}}
								title={note === "—" ? "" : note}
							>
								{note}
							</div>
							<small style={{ color: "#64748b" }}>{date}</small>
						</div>
					);
				},
			},
		],
		[isArabic]
	);

	// Online: keep Due columns unchanged, add a Notes column only for "Transferred" table
	const onlineColsDue = useMemo(
		() => [
			{
				title: isArabic ? "رقم التأكيد" : "Confirmation",
				dataIndex: "confirmation_number",
				key: "conf",
				width: 150,
			},
			{
				title: isArabic ? "اسم الضيف" : "Guest",
				key: "guest",
				render: (_, r) => r?.customer_details?.name || "—",
			},
			{
				title: isArabic ? "الحالة المالية" : "Payment Status",
				dataIndex: "computed_payment_status",
				key: "fin",
				width: 150,
				render: (v) => (
					<Tag color={v === "Captured" ? "green" : "orange"}>{v || "—"}</Tag>
				),
			},
			{
				title: isArabic ? "الوصول" : "Check‑in",
				dataIndex: "checkin_date",
				key: "in",
				width: 120,
				render: (d) => (d ? new Date(d).toLocaleDateString("en-US") : "—"),
			},
			{
				title: isArabic ? "المغادرة" : "Check‑out",
				dataIndex: "checkout_date",
				key: "out",
				width: 120,
				render: (d) => (d ? new Date(d).toLocaleDateString("en-US") : "—"),
			},
			{
				title: isArabic
					? `الإجمالي (${SAR(isArabic)})`
					: `Total (${SAR(isArabic)})`,
				dataIndex: "total_amount",
				align: "right",
				width: 140,
				render: (n) => n2(n),
			},
			{
				title: isArabic
					? `عمولة (${SAR(isArabic)})`
					: `Commission (${SAR(isArabic)})`,
				key: "comm3",
				align: "right",
				width: 150,
				render: (_, r) => n2(r?.computed_commission_sar),
			},
			{
				title: isArabic
					? `تحويل للفندق (${SAR(isArabic)})`
					: `Hotel Payout (${SAR(isArabic)})`,
				key: "payout",
				align: "right",
				width: 170,
				render: (_, r) => n2(r?.computed_online_payout_sar),
			},
			{
				title: isArabic ? "تم التحويل؟" : "Transferred?",
				key: "tf",
				width: 130,
				render: (_, r) =>
					r?.moneyTransferredToHotel === true ? (
						<Tag color='green'>{isArabic ? "نعم" : "Yes"}</Tag>
					) : (
						<Tag color='orange'>{isArabic ? "لا" : "No"}</Tag>
					),
			},
		],
		[isArabic]
	);

	const onlineColsSent = useMemo(
		() => [
			...onlineColsDue,
			// NEW: Last Note / Updated (for already-transferred money)
			{
				title: isArabic ? "آخر ملاحظة / آخر تحديث" : "Last Note / Updated",
				key: "lastNoteTf",
				width: 300,
				render: (_, r) => {
					const { note, date } = getLastNoteAndDate(r, "transfer");
					return (
						<div>
							<div
								style={{
									fontWeight: 600,
									maxWidth: 240,
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis",
								}}
								title={note === "—" ? "" : note}
							>
								{note}
							</div>
							<small style={{ color: "#64748b" }}>{date}</small>
						</div>
					);
				},
			},
		],
		[isArabic, onlineColsDue]
	);

	/* ---------- Simple 2-tab switcher ---------- */
	const [activeTab, setActiveTab] = useState("offline"); // 'offline' | 'online'

	/* ---------- Render ---------- */
	return (
		<PaymentMainWrapper
			dir={isArabic ? "rtl" : "ltr"}
			show={collapsed}
			isArabic={isArabic}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{isArabic ? (
						<AdminNavbarArabic
							fromPage='Payment'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='Payment'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					)}
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						{!hotelId ? (
							<Alert
								type='warning'
								showIcon
								message={isArabic ? "لا يوجد فندق محدد" : "No hotel selected"}
							/>
						) : (
							<>
								<Grid>
									<Left>
										<LeftTitle>
											{isArabic ? "تفاصيل البطاقة" : "Card Details"}
										</LeftTitle>
										{Array.isArray(hotelDetails?.ownerPaymentMethods) &&
										hotelDetails.ownerPaymentMethods.length ? (
											(() => {
												const methods = hotelDetails.ownerPaymentMethods.filter(
													(m) => m?.delete !== true
												);
												const def =
													methods.find((m) => m.default) || methods[0] || null;
												return def ? (
													<CardBox>
														<p style={{ margin: "0 0 6px 0", fontWeight: 700 }}>
															{def.label || def.method_type || "CARD"}
														</p>
														<p style={{ margin: "0 0 6px 0" }}>
															{def.method_type === "CARD"
																? `${(
																		def.card_brand || "Card"
																  ).toUpperCase()} •••• ${
																		def.card_last4 || "****"
																  }`
																: def.method_type === "PAYPAL"
																  ? `PayPal ${
																			def.paypal_email
																				? `• ${def.paypal_email}`
																				: ""
																    }`
																  : def.method_type === "VENMO"
																    ? `Venmo ${
																				def.venmo_username
																					? `• @${def.venmo_username}`
																					: ""
																      }`
																    : def.method_type}
														</p>
														<small style={{ color: "#64748b" }}>
															{isArabic
																? "طريقة التسوية الافتراضية"
																: "Default settlement method"}
														</small>
														<div style={{ marginTop: 8 }}>
															<Button
																size='small'
																onClick={() => setAddOpen(true)}
															>
																{isArabic ? "تغيير / إضافة" : "Change / Add"}
															</Button>
														</div>
													</CardBox>
												) : (
													<Alert
														type='info'
														showIcon
														message={
															isArabic
																? "لم تُحفظ أي طريقة دفع بعد"
																: "No owner payment method saved yet"
														}
													/>
												);
											})()
										) : (
											<>
												<Alert
													type='info'
													showIcon
													message={
														isArabic
															? "لم تُحفظ أي طريقة دفع بعد"
															: "No owner payment method saved yet"
													}
												/>
												<div style={{ marginTop: 8 }}>
													<Button
														type='primary'
														onClick={() => setAddOpen(true)}
													>
														{isArabic ? "إضافة طريقة دفع" : "Add Method"}
													</Button>
												</div>
											</>
										)}
									</Left>

									<Right>
										<SectionHeader>
											{isArabic
												? "التسويات والمدفوعات"
												: "Settlements & Payments"}
										</SectionHeader>

										{/* Score cards (unchanged) */}
										<Blocks>
											<Block tone='warn'>
												<BlockTitle>
													{isArabic
														? "عمولة مستحقة على الفندق"
														: "Commission Due from Hotel"}
												</BlockTitle>
												{loadingOverview ? (
													<Spin size='small' />
												) : (
													<>
														<KV>
															<label>{isArabic ? "عدد:" : "Count:"}</label>
															<span>
																{overview?.commissionDueFromHotel?.count || 0}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `المبالغ (${SAR(isArabic)}):`
																	: `Totals (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(overview?.commissionDueFromHotel?.totalSAR)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `عمولة (${SAR(isArabic)}):`
																	: `Commission (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(
																	overview?.commissionDueFromHotel
																		?.commissionSAR
																)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
													</>
												)}
											</Block>

											<Block tone='success'>
												<BlockTitle>
													{isArabic
														? "عمولة مدفوعة (من الفندق)"
														: "Commission Paid (by Hotel)"}
												</BlockTitle>
												{loadingOverview ? (
													<Spin size='small' />
												) : (
													<>
														<KV>
															<label>{isArabic ? "عدد:" : "Count:"}</label>
															<span>
																{overview?.commissionPaidByHotel?.count || 0}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `المبالغ (${SAR(isArabic)}):`
																	: `Totals (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(overview?.commissionPaidByHotel?.totalSAR)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `عمولة (${SAR(isArabic)}):`
																	: `Commission (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(
																	overview?.commissionPaidByHotel?.commissionSAR
																)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
													</>
												)}
											</Block>

											{/* Online Due */}
											<Block tone='neutral'>
												<BlockTitle>
													{isArabic
														? "تحويلات مستحقة للفندق (مدفوعة أونلاين)"
														: "Transfers Due to Hotel (paid online)"}
												</BlockTitle>
												{loadingOverview ? (
													<Spin size='small' />
												) : (
													<>
														<KV>
															<label>{isArabic ? "عدد:" : "Count:"}</label>
															<span>
																{overview?.transfersDueToHotel?.count || 0}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `الإجمالي (جروس) (${SAR(isArabic)}):`
																	: `Gross Totals (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(overview?.transfersDueToHotel?.totalSAR)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `إجمالي العمولة (${SAR(isArabic)}):`
																	: `Commission Totals (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(
																	overview?.transfersDueToHotel?.commissionSAR
																)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `الإجمالي الصافي (${SAR(isArabic)}):`
																	: `Net Totals (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(overview?.transfersDueToHotel?.netSAR)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
													</>
												)}
											</Block>

											{/* Online Completed */}
											<Block tone='neutral'>
												<BlockTitle>
													{isArabic
														? "تحويلات مُسددة للفندق"
														: "Transfers Completed to Hotel"}
												</BlockTitle>
												{loadingOverview ? (
													<Spin size='small' />
												) : (
													<>
														<KV>
															<label>{isArabic ? "عدد:" : "Count:"}</label>
															<span>
																{overview?.transfersCompletedToHotel?.count ||
																	0}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `الإجمالي (جروس) (${SAR(isArabic)}):`
																	: `Gross Totals (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(
																	overview?.transfersCompletedToHotel?.totalSAR
																)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `إجمالي العمولة (${SAR(isArabic)}):`
																	: `Commission Totals (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(
																	overview?.transfersCompletedToHotel
																		?.commissionSAR
																)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
														<KV>
															<label>
																{isArabic
																	? `الإجمالي الصافي (${SAR(isArabic)}):`
																	: `Net Totals (${SAR(isArabic)}):`}
															</label>
															<span>
																{n2(
																	overview?.transfersCompletedToHotel?.netSAR
																)}{" "}
																{SAR(isArabic)}
															</span>
														</KV>
													</>
												)}
											</Block>
										</Blocks>

										{/* ───────── Tabs ───────── */}
										<TabsBar role='tablist'>
											<TabBtn
												type={activeTab === "offline" ? "primary" : "default"}
												onClick={() => setActiveTab("offline")}
												aria-selected={activeTab === "offline"}
											>
												{isArabic
													? "قائمة المدفوعات داخل الفندق"
													: "Paid Offline List"}
											</TabBtn>
											<TabBtn
												type={activeTab === "online" ? "primary" : "default"}
												onClick={() => setActiveTab("online")}
												aria-selected={activeTab === "online"}
											>
												{isArabic
													? "قائمة المدفوعات الأونلاين"
													: "Paid Online List"}
											</TabBtn>
										</TabsBar>

										{activeTab === "offline" ? (
											<>
												{/* Action bar for pending offline commissions */}
												<ActionBar>
													<div>
														<strong>
															{isArabic ? "محدد:" : "Selected:"} {selected.size}
														</strong>
														<span style={{ marginInlineStart: 10 }}>
															{isArabic
																? `العمولة (${SAR(isArabic)}):`
																: `Commission (${SAR(isArabic)}):`}{" "}
															<b>
																{n2(commissionSelectedSAR)} {SAR(isArabic)}
															</b>
														</span>
														<span style={{ marginInlineStart: 10 }}>
															{isArabic ? "≈ بالدولار:" : "≈ USD:"}{" "}
															<b>{usdPreview} USD</b>
														</span>
													</div>
													<Space>
														<Button onClick={selectAllPending}>
															{isArabic ? "تحديد الكل" : "Select all"}
														</Button>
														<Button onClick={clearSel}>
															{isArabic ? "مسح التحديد" : "Clear"}
														</Button>
														<Button
															type='primary'
															onClick={openConfirm}
															disabled={selected.size === 0}
														>
															{isArabic ? "ادفع الآن" : "Pay Now"}
														</Button>
													</Space>
												</ActionBar>

												{/* Pending OFFLINE table */}
												{loadingPending ? (
													<Centered>
														<Spin />
													</Centered>
												) : loadError ? (
													<Alert type='error' showIcon message={loadError} />
												) : (
													<Table
														rowKey={(r) => r._id}
														dataSource={pending.rows}
														columns={pendingCols}
														size='small'
														bordered
														pagination={{
															current: pending.page,
															pageSize: pending.pageSize,
															total: pending.total,
															onChange: (p, ps) => fetchPending(hotelId, p, ps),
															showTotal: (t) =>
																isArabic ? `الإجمالي: ${t}` : `Total: ${t}`,
														}}
													/>
												)}

												{/* Paid OFFLINE table */}
												<SectionHeader style={{ marginTop: 14 }}>
													{isArabic ? "العمولات المدفوعة" : "Commission Paid"}
												</SectionHeader>
												{loadingPaid ? (
													<Centered>
														<Spin />
													</Centered>
												) : (
													<Table
														rowKey={(r) => r._id}
														dataSource={paid.rows}
														columns={paidCols}
														size='small'
														bordered
														pagination={{
															current: paid.page,
															pageSize: paid.pageSize,
															total: paid.total,
															onChange: (p, ps) => fetchPaid(hotelId, p, ps),
															showTotal: (t) =>
																isArabic ? `الإجمالي: ${t}` : `Total: ${t}`,
														}}
													/>
												)}
											</>
										) : (
											<>
												{/* ONLINE — Transfers Due to Hotel */}
												<SectionHeader>
													{isArabic
														? "تحويلات مستحقة للفندق"
														: "Transfers Due to Hotel"}
												</SectionHeader>
												{loadingOnlineDue ? (
													<Centered>
														<Spin />
													</Centered>
												) : loadErrorOnline ? (
													<Alert
														type='error'
														showIcon
														message={loadErrorOnline}
													/>
												) : (
													<Table
														rowKey={(r) => r._id}
														dataSource={onlineDue.rows}
														columns={onlineColsDue}
														size='small'
														bordered
														pagination={{
															current: onlineDue.page,
															pageSize: onlineDue.pageSize,
															total: onlineDue.total,
															onChange: (p, ps) =>
																fetchOnlineDue(hotelId, p, ps),
															showTotal: (t) =>
																isArabic ? `الإجمالي: ${t}` : `Total: ${t}`,
														}}
													/>
												)}

												{/* ONLINE — Transfers Completed to Hotel */}
												<SectionHeader style={{ marginTop: 14 }}>
													{isArabic
														? "تحويلات مُسددة للفندق"
														: "Transfers Completed to Hotel"}
												</SectionHeader>
												{loadingOnlineSent ? (
													<Centered>
														<Spin />
													</Centered>
												) : (
													<Table
														rowKey={(r) => r._id}
														dataSource={onlineSent.rows}
														columns={onlineColsSent}
														size='small'
														bordered
														pagination={{
															current: onlineSent.page,
															pageSize: onlineSent.pageSize,
															total: onlineSent.total,
															onChange: (p, ps) =>
																fetchOnlineSent(hotelId, p, ps),
															showTotal: (t) =>
																isArabic ? `الإجمالي: ${t}` : `Total: ${t}`,
														}}
													/>
												)}
											</>
										)}
									</Right>
								</Grid>

								{/* Confirm pay modal (offline commissions) */}
								<Modal
									open={confirmOpen}
									onCancel={() => setConfirmOpen(false)}
									onOk={doConfirmPay}
									okText={isArabic ? "تأكيد الدفع" : "Confirm Payment"}
									cancelText={isArabic ? "إلغاء" : "Cancel"}
									title={
										isArabic
											? "تأكيد دفع العمولة"
											: "Confirm Commission Payment"
									}
								>
									<p style={{ marginBottom: 6 }}>
										{isArabic ? "عدد الحجوزات:" : "Reservations:"}{" "}
										<b>{selected.size}</b>
									</p>
									<p style={{ marginBottom: 6 }}>
										{isArabic
											? `إجمالي العمولة (${SAR(isArabic)}):`
											: `Total commission (${SAR(isArabic)}):`}{" "}
										<b>
											{n2(commissionSelectedSAR)} {SAR(isArabic)}
										</b>
									</p>
									<p>
										≈ <b>{usdPreview} USD</b>
									</p>
									<p style={{ color: "#64748b" }}>
										{isArabic
											? "لن تُعلَم العمولة كمدفوعة إلا بعد عودة PayPal بحالة COMPLETED."
											: "Commissions are marked paid only after PayPal returns COMPLETED."}
									</p>
								</Modal>

								{/* Add method modal */}
								<QuickAddMethodModal
									open={addOpen}
									onClose={() => setAddOpen(false)}
									hotelId={hotelId}
									isArabic={isArabic}
									onSaved={refreshOwnerMethods}
									authToken={token}
								/>
							</>
						)}
					</div>
				</div>
			</div>
		</PaymentMainWrapper>
	);
};

export default PaymentMain;

/* ---------------- styles ---------------- */
const PaymentMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 70px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 85%" : "15% 84%")};
	}
	text-align: ${(props) => (props.isArabic ? "right" : "")};

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;
const Grid = styled.div`
	display: grid;
	grid-template-columns: 220px 1fr;
	gap: 16px;
	@media (max-width: 980px) {
		grid-template-columns: 1fr;
	}
`;
const Left = styled.div``;
const LeftTitle = styled.h4`
	margin: 0 0 10px 0;
	font-weight: 800;
	color: #0f172a;
`;
const CardBox = styled.div`
	background: #fff;
	border: 1.25px solid #e9eef3;
	border-radius: 12px;
	padding: 14px;
	box-shadow: 0 4px 14px rgba(16, 24, 40, 0.05);
`;
const Right = styled.div``;
const SectionHeader = styled.h3`
	margin: 8px 0;
	font-weight: 800;
	color: #0f172a;
`;
const Blocks = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(220px, 1fr));
	gap: 10px;
	margin-bottom: 12px;
	@media (max-width: 1200px) {
		grid-template-columns: 1fr 1fr;
	}
	@media (max-width: 720px) {
		grid-template-columns: 1fr;
	}
`;
const Block = styled.div`
	border: 1px solid
		${({ tone }) =>
			tone === "success" ? "#bbf7d0" : tone === "warn" ? "#fde68a" : "#e5e7eb"};
	background: ${({ tone }) =>
		tone === "success" ? "#f0fdf4" : tone === "warn" ? "#fffbeb" : "#fff"};
	border-radius: 12px;
	padding: 10px 12px;
`;
const BlockTitle = styled.h4`
	margin: 0 0 6px 0;
	font-weight: 800;
	color: #0f172a;
	font-size: 1.3rem;
`;
const KV = styled.p`
	display: flex;
	gap: 10px;
	margin: 4px 0;
	label {
		color: #374151;
		min-width: 180px;
		font-weight: 600;
	}
	span {
		color: #111827;
	}
`;
const ActionBar = styled.div`
	margin: 6px 0 10px;
	padding: 8px 10px;
	border: 1px solid #e5e7eb;
	background: #f8fafc;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: space-between;
`;
const Centered = styled.div`
	text-align: center;
	padding: 18px 0;
`;

// Simple tab bar
const TabsBar = styled.div`
	display: inline-flex;
	gap: 8px;
	margin: 6px 0 10px;
`;
const TabBtn = styled(Button)`
	border-radius: 999px !important;
`;
