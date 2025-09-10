/** @format */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import { isAuthenticated } from "../../auth";
import {
	Alert,
	Button,
	Checkbox,
	Modal,
	Select,
	Space,
	Spin,
	Table,
	Tag,
	message,
	Input,
} from "antd";

import {
	listAdminPayouts,
	getAdminPayoutsOverview,
	listAdminHotelsLite,
	currencyConversion,
	chargeOwnerCommissions, // same capture endpoint (per hotel)
	adminUpdateReservationPayoutFlags, // NEW
	adminAutoReconcileHotel, // NEW
} from "../apiAdmin";

/* ---------------- helpers ---------------- */
const n2 = (v) => Number(v || 0).toFixed(2);
const isNum = (v) => Number.isFinite(Number(v));
const SAR = (isAr) => (isAr ? "ريال" : "SAR");

// Keep scroll.x wide enough to avoid squeezing columns
const ONLINE_TABLE_X = 1840;

/** Find the last relevant change (commission or transfer) and return {note, at} */
function pickLastChange(r, kind /* 'commission' | 'transfer' */) {
	const logs = Array.isArray(r?.adminChangeLog) ? r.adminChangeLog : [];

	const matches = (e) => {
		const f = String(e?.field || "").toLowerCase();
		if (kind === "commission") {
			return (
				f === "commission" ||
				f === "commissionpaid" ||
				f === "commissionstatus" ||
				f === "commissionpaidat"
			);
		} else {
			return (
				f === "transfer" ||
				f === "moneytransferredtohotel" ||
				f === "moneytransferredat"
			);
		}
	};

	let latest = null;
	for (let i = logs.length - 1; i >= 0; i--) {
		const e = logs[i];
		if (!e || !matches(e)) continue;
		latest = e;
		if (e.note) break;
	}

	const fallbackDate =
		r?.adminLastUpdatedAt ||
		(kind === "commission" ? r?.commissionPaidAt : r?.moneyTransferredAt) ||
		r?.updatedAt ||
		null;

	const at = latest?.at || fallbackDate;

	let note = latest?.note || null;

	if (!note && kind === "commission") {
		const last = r?.commissionData?.last;
		if (last?.paypal?.status) {
			const meth = last?.method?.type || "CARD";
			const label = last?.method?.label ? ` • ${last.method.label}` : "";
			const batch = last?.batchKey ? ` • ${last.batchKey}` : "";
			note = `Paid via ${meth}${label}${batch}`.trim();
		}
	}

	return { note, at };
}

/** Renderer for the note/date cell */
function renderLastNoteCell(r) {
	const styleNote = { whiteSpace: "pre-wrap" };
	const styleDate = { color: "#64748b", fontSize: 12, marginTop: 2 };
	return ({ note, at }) => (
		<div>
			<div style={styleNote}>{note || "—"}</div>
			<div style={styleDate}>
				{at ? new Date(at).toLocaleDateString() : "—"}
			</div>
		</div>
	);
}

/* ======================= Component ======================= */
const AdminPaymentMain = () => {
	/* ---------- Navbar controls ---------- */
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	/* ---------- Language / Auth ---------- */
	const chosenLanguage = "English"; // keep as-is
	const isArabic = chosenLanguage === "Arabic";
	const { token, user } = isAuthenticated();

	useEffect(() => {
		if (window.innerWidth <= 1000) setCollapsed(true);
	}, []);

	/* ---------- Hotel filter ---------- */
	const [hotels, setHotels] = useState([]);
	const [selectedHotelId, setSelectedHotelId] = useState(""); // "" = All Hotels

	const fetchHotels = useCallback(async () => {
		try {
			const res = await listAdminHotelsLite({ token });
			setHotels(Array.isArray(res?.hotels) ? res.hotels : []);
		} catch (e) {
			console.error(e);
			setHotels([]);
		}
	}, [token]);

	/* ---------- Overview tiles ---------- */
	const [overview, setOverview] = useState(null);
	const [loadingOverview, setLoadingOverview] = useState(false);

	const fetchOverview = useCallback(
		async (hid) => {
			setLoadingOverview(true);
			try {
				const params = {};
				if (hid) params.hotelId = hid;
				const data = await getAdminPayoutsOverview(params, { token });
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

	/* ---------- OFFLINE tables ---------- */
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
				const params = {
					paymentChannel: "offline",
					commissionPaid: 0,
					page,
					pageSize,
				};
				if (hid) params.hotelId = hid;
				const resp = await listAdminPayouts(params, { token });
				setPending({
					rows: Array.isArray(resp?.reservations) ? resp.reservations : [],
					total: Number(resp?.total || 0),
					page: Number(resp?.page || page),
					pageSize: Number(resp?.pageSize || pageSize),
				});
			} catch (e) {
				console.error(e);
				setLoadError(e?.message || "Failed to load pending (offline).");
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
				const params = {
					paymentChannel: "offline",
					commissionPaid: 1,
					page,
					pageSize,
				};
				if (hid) params.hotelId = hid;
				const resp = await listAdminPayouts(params, { token });
				setPaid({
					rows: Array.isArray(resp?.reservations) ? resp.reservations : [],
					total: Number(resp?.total || 0),
					page: Number(resp?.page || page),
					pageSize: Number(resp?.pageSize || pageSize),
				});
			} catch (e) {
				console.error(e);
				setLoadError(e?.message || "Failed to load paid (offline).");
			} finally {
				setLoadingPaid(false);
			}
		},
		[token]
	);

	/* ---------- ONLINE tables ---------- */
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
				const params = {
					paymentChannel: "online",
					transferStatus: "not_transferred",
					page,
					pageSize,
				};
				if (hid) params.hotelId = hid;
				const resp = await listAdminPayouts(params, { token });
				setOnlineDue({
					rows: Array.isArray(resp?.reservations) ? resp.reservations : [],
					total: Number(resp?.total || 0),
					page: Number(resp?.page || page),
					pageSize: Number(resp?.pageSize || pageSize),
				});
			} catch (e) {
				console.error(e);
				setLoadErrorOnline(e?.message || "Failed to load online (due).");
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
				const params = {
					paymentChannel: "online",
					transferStatus: "transferred",
					page,
					pageSize,
				};
				if (hid) params.hotelId = hid;
				const resp = await listAdminPayouts(params, { token });
				setOnlineSent({
					rows: Array.isArray(resp?.reservations) ? resp.reservations : [],
					total: Number(resp?.total || 0),
					page: Number(resp?.page || page),
					pageSize: Number(resp?.pageSize || pageSize),
				});
			} catch (e) {
				console.error(e);
				setLoadErrorOnline(
					e?.message || "Failed to load online (transferred)."
				);
			} finally {
				setLoadingOnlineSent(false);
			}
		},
		[token]
	);

	/* ---------- Initial loads ---------- */
	useEffect(() => {
		fetchHotels();
	}, [fetchHotels]);

	useEffect(() => {
		const hid = selectedHotelId || undefined;
		fetchOverview(hid);
		fetchPending(hid, 1, pending.pageSize);
		fetchPaid(hid, 1, paid.pageSize);
		fetchOnlineDue(hid, 1, onlineDue.pageSize);
		fetchOnlineSent(hid, 1, onlineSent.pageSize);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedHotelId]);

	/* ---------- Selection & charge (offline; only when a hotel is selected) ---------- */
	const [activeTab, setActiveTab] = useState("offline"); // 'offline' | 'online'
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

	const [confirmOpen, setConfirmOpen] = useState(false);
	const openConfirm = async () => {
		if (!selectedHotelId) {
			message.info(isArabic ? "اختر فندقاً أولاً" : "Select a hotel first.");
			return;
		}
		if (selected.size === 0) {
			message.error(
				isArabic ? "اختر حجوزات أولاً" : "Select reservations first."
			);
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
				{ hotelId: selectedHotelId, reservationIds: ids, sarToUsdRate },
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

			const hid = selectedHotelId;
			await Promise.all([
				fetchOverview(hid),
				fetchPending(hid, pending.page, pending.pageSize),
				fetchPaid(hid, paid.page, paid.pageSize),
			]);
		} catch (e) {
			const msg = e?.response?.data?.message || e?.message || "";
			message.error((isArabic ? "خطأ: " : "Error: ") + msg);
		}
	};

	/* ---------- Edit modal (admin override) ---------- */
	const [editOpen, setEditOpen] = useState(false);
	const [editRow, setEditRow] = useState(null);
	const [editCommissionPaid, setEditCommissionPaid] = useState(false);
	const [editTransferred, setEditTransferred] = useState(false);
	const [editNote, setEditNote] = useState("");
	const [savingEdit, setSavingEdit] = useState(false);

	const openEdit = useCallback((row) => {
		setEditRow(row || null);
		setEditCommissionPaid(!!row?.commissionPaid);
		setEditTransferred(!!row?.moneyTransferredToHotel);
		setEditNote("");
		setEditOpen(true);
	}, []);

	const closeEdit = () => {
		setEditOpen(false);
		setEditRow(null);
		setEditNote("");
	};

	const doSaveEdit = async () => {
		if (!editRow?._id) return;

		const payload = { reservationId: String(editRow._id) };
		const prevCommissionPaid = !!editRow?.commissionPaid;
		const prevTransferred = !!editRow?.moneyTransferredToHotel;

		let hasDiff = false;

		if (
			typeof editCommissionPaid === "boolean" &&
			editCommissionPaid !== prevCommissionPaid
		) {
			payload.commissionPaid = editCommissionPaid;
			hasDiff = true;
		}

		if (
			typeof editTransferred === "boolean" &&
			editTransferred !== prevTransferred
		) {
			payload.moneyTransferredToHotel = editTransferred;
			hasDiff = true;
		}

		if (editNote && editNote.trim() && hasDiff) {
			payload.note = editNote.trim();
		}

		if (user) {
			payload.adminId = user._id;
			payload.adminName = user.name;
			payload.adminRole = user.role || "admin";
		}

		if (!hasDiff) {
			message.info(isArabic ? "لا تغييرات لحفظها." : "No changes to save.");
			return;
		}

		setSavingEdit(true);
		try {
			await adminUpdateReservationPayoutFlags(payload, { token });
			message.success(isArabic ? "تم الحفظ" : "Saved");

			const hid = selectedHotelId || undefined;
			await Promise.all([
				fetchOverview(hid),
				fetchPending(hid, pending.page, pending.pageSize),
				fetchPaid(hid, paid.page, paid.pageSize),
				fetchOnlineDue(hid, onlineDue.page, onlineDue.pageSize),
				fetchOnlineSent(hid, onlineSent.page, onlineSent.pageSize),
			]);

			closeEdit();
		} catch (e) {
			const msg = e?.response?.data?.message || e?.message || "Failed";
			message.error((isArabic ? "خطأ: " : "Error: ") + msg);
		} finally {
			setSavingEdit(false);
		}
	};

	/* ---------- NEW: Auto Reconcile ---------- */
	const [reconLoading, setReconLoading] = useState(false);
	const doAutoReconcile = async () => {
		if (!selectedHotelId) {
			message.error(
				isArabic
					? "اختر فندقًا قبل المصالحة."
					: "Select a hotel before reconciling."
			);
			return;
		}
		Modal.confirm({
			title: isArabic ? "تأكيد المصالحة" : "Confirm Reconciliation",
			content: isArabic
				? "سيتم تسوية المدفوعات الأونلاين المستحقة مع عمولات المدفوعات داخل الفندق المتاحة حتى أقصى حد ممكن. هل تريد المتابعة؟"
				: "We will net online payouts due to the hotel against offline commissions due from the hotel, as much as possible. Continue?",
			okText: isArabic ? "متابعة" : "Proceed",
			cancelText: isArabic ? "إلغاء" : "Cancel",
			onOk: async () => {
				try {
					setReconLoading(true);
					const resp = await adminAutoReconcileHotel(
						{ hotelId: selectedHotelId },
						{ token }
					);
					message.success(
						(isArabic ? "تمت المصالحة" : "Reconciled") +
							` • ${resp.batchKey} • ${n2(resp.settledSAR)} SAR` +
							` • ${isArabic ? "محفظة الفندق" : "Hotel wallet"}=${n2(
								resp.remainder?.hotel_wallet_sar || 0
							)} ` +
							`• ${isArabic ? "محفظة المنصة" : "Platform wallet"}=${n2(
								resp.remainder?.platform_wallet_sar || 0
							)}`
					);

					const hid = selectedHotelId || undefined;
					await Promise.all([
						fetchOverview(hid),
						fetchPending(hid, pending.page, pending.pageSize),
						fetchPaid(hid, paid.page, paid.pageSize),
						fetchOnlineDue(hid, onlineDue.page, onlineDue.pageSize),
						fetchOnlineSent(hid, onlineSent.page, onlineSent.pageSize),
					]);
				} catch (e) {
					message.error(
						(isArabic ? "فشل المصالحة: " : "Reconciliation failed: ") +
							(e.message || "")
					);
				} finally {
					setReconLoading(false);
				}
			},
		});
	};

	/* ---------- Columns ---------- */
	const hotelCol = useMemo(
		() => ({
			title: isArabic ? "الفندق" : "Hotel",
			dataIndex: "hotelName",
			key: "hotel",
			width: 200,
			ellipsis: true,
			render: (name) => <span title={name || "—"}>{name || "—"}</span>,
		}),
		[isArabic]
	);

	const actionCol = useMemo(
		() => ({
			title: isArabic ? "إجراء" : "Actions",
			key: "act",
			fixed: "right",
			width: 90,
			render: (_, r) => (
				<Button size='small' onClick={() => openEdit(r)}>
					{isArabic ? "تحديث" : "Edit"}
				</Button>
			),
		}),
		[isArabic, openEdit]
	);

	const lastNoteTitle = isArabic
		? "آخر ملاحظة / آخر تحديث"
		: "Last note / Last updated";

	const lastNoteCommissionCol = useMemo(
		() => ({
			title: lastNoteTitle,
			key: "lastNoteCommission",
			width: 260,
			render: (_, r) => renderLastNoteCell(r)(pickLastChange(r, "commission")),
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[lastNoteTitle]
	);

	const lastNoteTransferCol = useMemo(
		() => ({
			title: lastNoteTitle,
			key: "lastNoteTransfer",
			width: 260,
			render: (_, r) => renderLastNoteCell(r)(pickLastChange(r, "transfer")),
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[lastNoteTitle]
	);

	const pendingCols = useMemo(
		() => [
			{
				title: "",
				key: "sel",
				width: 44,
				render: (_, r) => (
					<Checkbox
						checked={selected.has(String(r._id))}
						disabled={!selectedHotelId}
						onChange={(e) => onRowCheck(r._id, e.target.checked)}
					/>
				),
			},
			hotelCol,
			{
				title: isArabic ? "رقم التأكيد" : "Confirmation",
				dataIndex: "confirmation_number",
				key: "conf",
				width: 130,
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
					? `عمولة (${SAR(isArabic)})`
					: `Commission (${SAR(isArabic)})`,
				key: "comm",
				align: "right",
				width: 165,
				render: (_, r) => n2(r?.computed_commission_sar),
			},
			actionCol,
		],
		[isArabic, selected, selectedHotelId, hotelCol, actionCol]
	);

	const paidCols = useMemo(
		() => [
			lastNoteCommissionCol,
			hotelCol,
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
				title: isArabic ? "تاريخ دفع العمولة" : "Commission Paid At",
				dataIndex: "commissionPaidAt",
				key: "paidAt",
				width: 180,
				render: (d) => (d ? new Date(d).toLocaleString() : "—"),
			},
			{
				title: isArabic
					? `العمولة (${SAR(isArabic)})`
					: `Commission (${SAR(isArabic)})`,
				key: "comm2",
				align: "right",
				width: 165,
				render: (_, r) => n2(r?.computed_commission_sar),
			},
			actionCol,
		],
		[isArabic, hotelCol, actionCol, lastNoteCommissionCol]
	);

	const onlineColsDue = useMemo(
		() => [
			hotelCol, // width 200
			{
				title: isArabic ? "رقم التأكيد" : "Confirmation",
				dataIndex: "confirmation_number",
				key: "conf",
				width: 140,
				ellipsis: true,
				render: (v) => <span title={v || "—"}>{v || "—"}</span>,
			},
			{
				title: isArabic ? "اسم الضيف" : "Guest",
				key: "guest",
				width: 200,
				ellipsis: true,
				render: (_, r) => {
					const name = r?.customer_details?.name || "—";
					return <span title={name}>{name}</span>;
				},
			},
			{
				title: isArabic ? "الحالة المالية" : "Payment Status",
				dataIndex: "computed_payment_status",
				key: "fin",
				width: 140,
				align: "center",
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
				width: 130,
				render: (n) => n2(n),
			},
			{
				title: isArabic
					? `عمولة (${SAR(isArabic)})`
					: `Commission (${SAR(isArabic)})`,
				key: "comm3",
				align: "right",
				width: 165,
				render: (_, r) => n2(r?.computed_commission_sar),
			},
			{
				title: isArabic
					? `تحويل للفندق (${SAR(isArabic)})`
					: `Hotel Payout (${SAR(isArabic)})`,
				key: "payout",
				align: "right",
				width: 160,
				render: (_, r) => n2(r?.computed_online_payout_sar),
			},
			{
				title: isArabic ? "تم التحويل؟" : "Transferred?",
				key: "tf",
				width: 110,
				align: "center",
				render: (_, r) =>
					r?.moneyTransferredToHotel === true ? (
						<Tag color='green'>{isArabic ? "نعم" : "Yes"}</Tag>
					) : (
						<Tag color='orange'>{isArabic ? "لا" : "No"}</Tag>
					),
			},
			actionCol,
		],
		[isArabic, hotelCol, actionCol]
	);

	const onlineColsSent = useMemo(
		() => [
			lastNoteTransferCol, // width 260
			hotelCol, // width 200
			{
				title: isArabic ? "رقم التأكيد" : "Confirmation",
				dataIndex: "confirmation_number",
				key: "conf",
				width: 140,
				ellipsis: true,
				render: (v) => <span title={v || "—"}>{v || "—"}</span>,
			},
			{
				title: isArabic ? "اسم الضيف" : "Guest",
				key: "guest",
				width: 200,
				ellipsis: true,
				render: (_, r) => {
					const name = r?.customer_details?.name || "—";
					return <span title={name}>{name}</span>;
				},
			},
			{
				title: isArabic ? "الحالة المالية" : "Payment Status",
				dataIndex: "computed_payment_status",
				key: "fin",
				width: 140,
				align: "center",
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
				width: 130,
				render: (n) => n2(n),
			},
			{
				title: isArabic
					? `عمولة (${SAR(isArabic)})`
					: `Commission (${SAR(isArabic)})`,
				key: "comm3",
				align: "right",
				width: 165,
				render: (_, r) => n2(r?.computed_commission_sar),
			},
			{
				title: isArabic
					? `تحويل للفندق (${SAR(isArabic)})`
					: `Hotel Payout (${SAR(isArabic)})`,
				key: "payout",
				align: "right",
				width: 160,
				render: (_, r) => n2(r?.computed_online_payout_sar),
			},
			{
				title: isArabic ? "تم التحويل؟" : "Transferred?",
				key: "tf",
				width: 110,
				align: "center",
				render: (_, r) =>
					r?.moneyTransferredToHotel === true ? (
						<Tag color='green'>{isArabic ? "نعم" : "Yes"}</Tag>
					) : (
						<Tag color='orange'>{isArabic ? "لا" : "No"}</Tag>
					),
			},
			actionCol,
		],
		[isArabic, hotelCol, actionCol, lastNoteTransferCol]
	);

	return (
		<AdminPaymentMainWrapper show={collapsed} isArabic={isArabic}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					<AdminNavbar
						fromPage='Payouts'
						AdminMenuStatus={AdminMenuStatus}
						setAdminMenuStatus={setAdminMenuStatus}
						collapsed={collapsed}
						setCollapsed={setCollapsed}
						chosenLanguage={chosenLanguage}
					/>
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						<Header>
							<h2>
								{isArabic
									? "تقرير المنصة — المدفوعات"
									: "Platform Report — Payments"}
							</h2>
							<div className='filters'>
								<span style={{ fontWeight: 600, marginInlineEnd: 8 }}>
									{isArabic ? "الفندق:" : "Hotel:"}
								</span>
								<Select
									showSearch
									allowClear
									style={{ minWidth: 280 }}
									placeholder={isArabic ? "كل الفنادق" : "All Hotels"}
									value={selectedHotelId || undefined}
									onChange={(v) => {
										setSelected(new Set());
										setSelectedHotelId(v || "");
									}}
									optionFilterProp='label'
									options={[
										{
											value: "",
											label: isArabic ? "كل الفنادق" : "All Hotels",
										},
										...hotels.map((h) => ({
											value: h._id,
											label: h.hotelName,
										})),
									]}
								/>
								<Button
									type='primary'
									onClick={doAutoReconcile}
									loading={reconLoading}
									disabled={!selectedHotelId}
									style={{ marginInlineStart: 8 }}
								>
									{isArabic ? "مصالحة تلقائية" : "Reconcile (Auto)"}
								</Button>
							</div>
						</Header>

						{/* Tiles */}
						<Blocks>
							<Block tone='warn'>
								<BlockTitle>
									{isArabic
										? "عمولة مستحقة على الفنادق"
										: "Commission Due from Hotels"}
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
												{n2(overview?.commissionDueFromHotel?.commissionSAR)}{" "}
												{SAR(isArabic)}
											</span>
										</KV>
									</>
								)}
							</Block>

							<Block tone='success'>
								<BlockTitle>
									{isArabic
										? "عمولة مدفوعة (من الفنادق)"
										: "Commission Paid (by Hotels)"}
								</BlockTitle>
								{loadingOverview ? (
									<Spin size='small' />
								) : (
									<>
										<KV>
											<label>{isArabic ? "عدد:" : "Count:"}</label>
											<span>{overview?.commissionPaidByHotel?.count || 0}</span>
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
												{n2(overview?.commissionPaidByHotel?.commissionSAR)}{" "}
												{SAR(isArabic)}
											</span>
										</KV>
									</>
								)}
							</Block>

							<Block tone='neutral'>
								<BlockTitle>
									{isArabic
										? "تحويلات مستحقة للفنادق (أونلاين)"
										: "Transfers Due to Hotels (online)"}
								</BlockTitle>
								{loadingOverview ? (
									<Spin size='small' />
								) : (
									<>
										<KV>
											<label>{isArabic ? "عدد:" : "Count:"}</label>
											<span>{overview?.transfersDueToHotel?.count || 0}</span>
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
												{n2(overview?.transfersDueToHotel?.commissionSAR)}{" "}
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

							<Block tone='neutral'>
								<BlockTitle>
									{isArabic
										? "تحويلات مُسددة للفنادق"
										: "Transfers Completed to Hotels"}
								</BlockTitle>
								{loadingOverview ? (
									<Spin size='small' />
								) : (
									<>
										<KV>
											<label>{isArabic ? "عدد:" : "Count:"}</label>
											<span>
												{overview?.transfersCompletedToHotel?.count || 0}
											</span>
										</KV>
										<KV>
											<label>
												{isArabic
													? `الإجمالي (جروس) (${SAR(isArabic)}):`
													: `Gross Totals (${SAR(isArabic)}):`}
											</label>
											<span>
												{n2(overview?.transfersCompletedToHotel?.totalSAR)}{" "}
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
												{n2(overview?.transfersCompletedToHotel?.commissionSAR)}{" "}
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
												{n2(overview?.transfersCompletedToHotel?.netSAR)}{" "}
												{SAR(isArabic)}
											</span>
										</KV>
									</>
								)}
							</Block>
						</Blocks>

						{/* Tabs */}
						<TabsBar role='tablist'>
							<TabBtn
								type={activeTab === "offline" ? "primary" : "default"}
								onClick={() => setActiveTab("offline")}
								aria-selected={activeTab === "offline"}
							>
								{isArabic ? "قائمة المدفوعات داخل الفندق" : "Paid Offline List"}
							</TabBtn>
							<TabBtn
								type={activeTab === "online" ? "primary" : "default"}
								onClick={() => setActiveTab("online")}
								aria-selected={activeTab === "online"}
							>
								{isArabic ? "قائمة المدفوعات الأونلاين" : "Paid Online List"}
							</TabBtn>
						</TabsBar>

						{activeTab === "offline" ? (
							<>
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
										<Button
											onClick={selectAllPending}
											disabled={!selectedHotelId}
										>
											{isArabic ? "تحديد الكل" : "Select all"}
										</Button>
										<Button onClick={clearSel}>
											{isArabic ? "مسح التحديد" : "Clear"}
										</Button>
										<Button
											type='primary'
											onClick={openConfirm}
											disabled={!selectedHotelId || selected.size === 0}
										>
											{isArabic ? "ادفع الآن" : "Pay Now"}
										</Button>
									</Space>
								</ActionBar>

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
											onChange: (p, ps) =>
												fetchPending(selectedHotelId || undefined, p, ps),
											showTotal: (t) =>
												isArabic ? `الإجمالي: ${t}` : `Total: ${t}`,
										}}
										scroll={{ x: 980 }}
									/>
								)}

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
											onChange: (p, ps) =>
												fetchPaid(selectedHotelId || undefined, p, ps),
											showTotal: (t) =>
												isArabic ? `الإجمالي: ${t}` : `Total: ${t}`,
										}}
										scroll={{ x: 1100 }}
									/>
								)}
							</>
						) : (
							<>
								<SectionHeader>
									{isArabic
										? "تحويلات مستحقة للفنادق"
										: "Transfers Due to Hotels"}
								</SectionHeader>
								{loadingOnlineDue ? (
									<Centered>
										<Spin />
									</Centered>
								) : loadErrorOnline ? (
									<Alert type='error' showIcon message={loadErrorOnline} />
								) : (
									<Table
										rowKey={(r) => r._id}
										dataSource={onlineDue.rows}
										columns={onlineColsDue}
										size='small'
										bordered
										tableLayout='fixed'
										pagination={{
											current: onlineDue.page,
											pageSize: onlineDue.pageSize,
											total: onlineDue.total,
											onChange: (p, ps) =>
												fetchOnlineDue(selectedHotelId || undefined, p, ps),
											showTotal: (t) =>
												isArabic ? `الإجمالي: ${t}` : `Total: ${t}`,
										}}
										scroll={{ x: ONLINE_TABLE_X }}
									/>
								)}

								<SectionHeader style={{ marginTop: 14 }}>
									{isArabic
										? "تحويلات مُسددة للفنادق"
										: "Transfers Completed to Hotels"}
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
										tableLayout='fixed'
										pagination={{
											current: onlineSent.page,
											pageSize: onlineSent.pageSize,
											total: onlineSent.total,
											onChange: (p, ps) =>
												fetchOnlineSent(selectedHotelId || undefined, p, ps),
											showTotal: (t) =>
												isArabic ? `الإجمالي: ${t}` : `Total: ${t}`,
										}}
										scroll={{ x: ONLINE_TABLE_X }}
									/>
								)}
							</>
						)}

						{/* Confirm modal (offline charge) */}
						<Modal
							open={confirmOpen}
							onCancel={() => setConfirmOpen(false)}
							onOk={doConfirmPay}
							okText={isArabic ? "تأكيد الدفع" : "Confirm Payment"}
							cancelText={isArabic ? "إلغاء" : "Cancel"}
							title={
								isArabic ? "تأكيد دفع العمولة" : "Confirm Commission Payment"
							}
						>
							<p style={{ marginBottom: 6 }}>
								{isArabic ? "الفندق:" : "Hotel:"}{" "}
								<b>
									{selectedHotelId
										? hotels.find((h) => h._id === selectedHotelId)
												?.hotelName || selectedHotelId
										: "—"}
								</b>
							</p>
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

						{/* Edit modal (admin override) */}
						<Modal
							open={editOpen}
							onCancel={closeEdit}
							onOk={doSaveEdit}
							okButtonProps={{ loading: savingEdit }}
							okText={isArabic ? "حفظ" : "Save"}
							cancelText={isArabic ? "إلغاء" : "Cancel"}
							title={isArabic ? "تعديل الحالة" : "Edit Status"}
						>
							<div style={{ marginBottom: 8 }}>
								<b>{isArabic ? "رقم التأكيد:" : "Confirmation:"}</b>{" "}
								<span>{editRow?.confirmation_number || "—"}</span>
							</div>
							<div style={{ display: "grid", gap: 10, marginTop: 8 }}>
								<label
									style={{ display: "flex", gap: 8, alignItems: "center" }}
								>
									<Checkbox
										checked={editCommissionPaid}
										onChange={(e) => setEditCommissionPaid(e.target.checked)}
									/>
									{isArabic
										? "عمولة مُسددة (من الفندق)"
										: "Commission paid (by hotel)"}
								</label>
								<label
									style={{ display: "flex", gap: 8, alignItems: "center" }}
								>
									<Checkbox
										checked={editTransferred}
										onChange={(e) => setEditTransferred(e.target.checked)}
									/>
									{isArabic
										? "تم تحويل المبلغ للفندق"
										: "Money transferred to hotel"}
								</label>
								<div>
									<div style={{ fontWeight: 600, marginBottom: 4 }}>
										{isArabic ? "ملاحظة (اختياري)" : "Note (optional)"}
									</div>
									<Input.TextArea
										value={editNote}
										onChange={(e) => setEditNote(e.target.value)}
										rows={3}
										maxLength={500}
										placeholder={isArabic ? "اكتب ملاحظة..." : "Add a note..."}
									/>
								</div>
							</div>
						</Modal>
					</div>
				</div>
			</div>
		</AdminPaymentMainWrapper>
	);
};

export default AdminPaymentMain;

/* ---------------- styles ---------------- */
const AdminPaymentMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 20px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 75%" : "17% 75%")};
	}

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

const Header = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	h2 {
		margin: 6px 0 12px;
		font-weight: 800;
		color: #0f172a;
	}
	.filters {
		display: flex;
		align-items: center;
		gap: 8px;
	}
`;

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

const TabsBar = styled.div`
	display: inline-flex;
	gap: 8px;
	margin: 6px 0 10px;
`;

const TabBtn = styled(Button)`
	border-radius: 999px !important;
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
