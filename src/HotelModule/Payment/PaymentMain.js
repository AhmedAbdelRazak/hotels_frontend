/** @format */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { useCartContext } from "../../cart_context";
import {
	hotelAccount,
	markCommissionPaid,
	listCommissionCandidates,
	currencyConversion,
	getHotelById,
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
	Tooltip,
	message,
} from "antd";

/* ───────── commission helpers (matches your MoreDetails logic) ───────── */
const safeNumber = (val) => {
	const n = Number(val);
	return Number.isFinite(n) ? n : 0;
};

/** Sum ((price - rootPrice) per day) * room.count across pickedRoomsType */
function computeCommissionFromPickedRooms(pickedRoomsType = []) {
	if (!Array.isArray(pickedRoomsType) || pickedRoomsType.length === 0) return 0;

	return pickedRoomsType.reduce((total, room) => {
		const count = safeNumber(room?.count || 1);
		const days = Array.isArray(room?.pricingByDay) ? room.pricingByDay : [];
		if (!days.length) return total; // nothing to add if per-day prices are missing
		const roomCommission =
			days.reduce(
				(acc, d) => acc + (safeNumber(d.price) - safeNumber(d.rootPrice)),
				0
			) * count;
		return total + roomCommission;
	}, 0);
}

const PaymentMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [hotelDetails, setHotelDetails] = useState("");
	const [collapsed, setCollapsed] = useState(false);
	const { user, token } = isAuthenticated();
	const { chosenLanguage } = useCartContext();
	const isArabic = chosenLanguage === "Arabic";

	/* ─────────────────────────  DO NOT CHANGE (as requested)  ───────────────────────── */
	const gettingHotelData = () => {
		const selectedHotel =
			JSON.parse(localStorage.getItem("selectedHotel")) || {};
		const userId = user.role === 2000 ? user._id : selectedHotel.belongsTo._id;

		// Fetching user account details
		hotelAccount(user._id, token, userId).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error rendering");
			} else {
				// Fetching hotel details by hotelId
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
	/* ────────────────────────────────────────────────────────────────────────────────── */

	useEffect(() => {
		if (window.innerWidth <= 1000) setCollapsed(true);
		gettingHotelData(); // unchanged
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/* ================================  Settlements (PayPal)  ================================ */

	// Data
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState(null);
	const [candidates, setCandidates] = useState([]); // reservations returned by listCommissionCandidates
	const [selected, setSelected] = useState(() => new Set());

	// USD preview for the selected commission
	const [usdPreview, setUsdPreview] = useState("0.00");

	const hotelId = useMemo(() => hotelDetails?._id || null, [hotelDetails?._id]);

	// Fetch reservations after we have hotelId
	const fetchCandidates = useCallback(
		async (hid) => {
			try {
				setLoading(true);
				setLoadError(null);
				const resp = await listCommissionCandidates(
					{ hotelId: hid, page: 1, pageSize: 400 },
					{ token }
				);
				setCandidates(
					Array.isArray(resp?.reservations) ? resp.reservations : []
				);
			} catch (e) {
				console.error(e);
				setLoadError(e?.message || "Failed to load settlements.");
			} finally {
				setLoading(false);
			}
		},
		[token]
	);

	useEffect(() => {
		if (hotelId) fetchCandidates(hotelId);
	}, [hotelId, fetchCandidates]);

	// Enrich + helpers (calculate commission using your rootPrice logic)
	const enriched = useMemo(
		() =>
			(candidates || []).map((r) => {
				const calcCommission = computeCommissionFromPickedRooms(
					r?.pickedRoomsType
				);
				const paymentStatus =
					r?.computed_payment_status ||
					r?.payment_status || // fallback if backend placed it here
					"—";
				return {
					...r,
					_commissionSAR: calcCommission, // ← use calculated commission
					_status: paymentStatus,
				};
			}),
		[candidates]
	);

	const selectedCount = selected.size;
	const selectedCommissionSAR = useMemo(
		() =>
			enriched
				.filter((r) => selected.has(String(r._id)))
				.reduce((acc, r) => acc + safeNumber(r?._commissionSAR), 0),
		[selected, enriched]
	);

	// Convert SAR → USD (preview only)
	useEffect(() => {
		const doConvert = async () => {
			try {
				// Accept either array or single-number API shapes
				const res = await currencyConversion([
					Number(selectedCommissionSAR || 0),
				]);
				const usd =
					Array.isArray(res) && res.length
						? Number(res[0]?.amountInUSD || 0)
						: Number(res?.amountInUSD || 0);
				setUsdPreview(usd.toFixed(2));
			} catch {
				setUsdPreview("0.00");
			}
		};
		doConvert();
	}, [selectedCommissionSAR]);

	// Stats / IDs per status (for tiles & bulk toggles)
	const stats = useMemo(() => {
		const all = enriched;
		const paidOffline = all.filter((r) => r._status === "Paid Offline");
		const notPaid = all.filter((r) => r._status === "Not Paid");
		const sum = (arr, get) => arr.reduce((a, x) => a + safeNumber(get(x)), 0);

		return {
			counts: {
				all: all.length,
				paidOffline: paidOffline.length,
				notPaid: notPaid.length,
			},
			totals: {
				allTotalSAR: sum(all, (r) => r.total_amount),
				allCommissionSAR: sum(all, (r) => r._commissionSAR), // ← calculated
				paidOfflineTotalSAR: sum(paidOffline, (r) => r.total_amount),
				paidOfflineCommissionSAR: sum(paidOffline, (r) => r._commissionSAR),
				notPaidTotalSAR: sum(notPaid, (r) => r.total_amount),
				notPaidCommissionSAR: sum(notPaid, (r) => r._commissionSAR),
			},
			ids: {
				all: all.map((r) => String(r._id)),
				paidOffline: paidOffline.map((r) => String(r._id)),
				notPaid: notPaid.map((r) => String(r._id)),
			},
		};
	}, [enriched]);

	// Selection handlers
	const onRowCheck = (id, checked) =>
		setSelected((prev) => {
			const next = new Set(prev);
			if (checked) next.add(String(id));
			else next.delete(String(id));
			return next;
		});

	const toggleBulk = (ids, checked) =>
		setSelected((prev) => {
			const next = new Set(prev);
			ids.forEach((id) =>
				checked ? next.add(String(id)) : next.delete(String(id))
			);
			return next;
		});

	// Pay (mark commission paid)
	const doMarkCommissionPaid = () => {
		if (!hotelId) return;
		const ids = Array.from(selected);
		if (!ids.length) {
			message.error(
				isArabic ? "اختر حجوزات أولاً" : "Select reservations first."
			);
			return;
		}

		Modal.confirm({
			title: isArabic ? "تأكيد دفع العمولة" : "Confirm Commission Payment",
			content: (
				<div>
					<p style={{ marginBottom: 6 }}>
						{isArabic ? "عدد الحجوزات:" : "Reservations:"} <b>{ids.length}</b>
					</p>
					<p style={{ marginBottom: 6 }}>
						{isArabic ? "إجمالي العمولة (SAR):" : "Total commission (SAR):"}{" "}
						<b>{Number(selectedCommissionSAR).toFixed(2)}</b>
					</p>
					<p>
						USD ≈ <b>{usdPreview}</b>
					</p>
				</div>
			),
			okText: isArabic ? "تأكيد" : "Confirm",
			cancelText: isArabic ? "إلغاء" : "Cancel",
			onOk: async () => {
				try {
					await markCommissionPaid(
						{
							hotelId,
							reservationIds: ids,
							paidAt: new Date().toISOString(),
							note: "Dashboard payout",
						},
						{ token }
					);
					message.success(
						isArabic ? "تم التعليم كمدفوعة" : "Marked as commission paid."
					);
					setSelected(new Set());
					await fetchCandidates(hotelId);
				} catch (e) {
					console.error(e);
					message.error(
						isArabic ? "تعذر إتمام العملية" : "Failed to mark as paid."
					);
				}
			},
		});
	};

	// Table columns
	const columns = useMemo(
		() => [
			{
				title: "",
				key: "sel",
				width: 48,
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
				key: "confirmation_number",
				width: 160,
			},
			{
				title: isArabic ? "اسم الضيف" : "Guest",
				key: "guest",
				render: (_, r) => r?.customer_details?.name || "—",
			},
			{
				title: isArabic ? "الحالة المالية" : "Payment Status",
				dataIndex: "computed_payment_status",
				key: "computed_payment_status",
				width: 160,
				render: (v, r) => (
					<Tooltip title={r?.computed_payment_hint || ""}>
						<span>{v || "—"}</span>
					</Tooltip>
				),
			},
			{
				title: isArabic ? "الوصول" : "Check‑in",
				dataIndex: "checkin_date",
				key: "checkin_date",
				width: 130,
				render: (d) => (d ? new Date(d).toLocaleDateString("en-US") : "—"),
			},
			{
				title: isArabic ? "المغادرة" : "Check‑out",
				dataIndex: "checkout_date",
				key: "checkout_date",
				width: 130,
				render: (d) => (d ? new Date(d).toLocaleDateString("en-US") : "—"),
			},
			{
				title: isArabic ? "الإجمالي (SAR)" : "Total (SAR)",
				dataIndex: "total_amount",
				key: "total_amount",
				align: "right",
				width: 140,
				render: (n) => Number(n || 0).toFixed(2),
			},
			{
				title: isArabic ? "عمولة المنصة (SAR)" : "Commission (SAR)",
				key: "commission",
				align: "right",
				width: 160,
				render: (_, r) => Number(r?._commissionSAR || 0).toFixed(2), // ← calculated
			},
		],
		[isArabic, selected]
	);

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
						{/* ───── Settlements UI ───── */}
						{!hotelId ? (
							<div style={{ marginTop: 12 }}>
								<Alert
									type='warning'
									showIcon
									message={isArabic ? "لا يوجد فندق محدد" : "No hotel selected"}
								/>
							</div>
						) : (
							<div style={{ marginTop: 16 }}>
								<Grid>
									{/* LEFT: Card details (from hotelDetails.ownerPaymentMethods if present) */}
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
											<Alert
												type='info'
												showIcon
												message={
													isArabic
														? "لم تُحفظ أي طريقة دفع بعد"
														: "No owner payment method saved yet"
												}
											/>
										)}
									</Left>

									{/* RIGHT: KPIs, quick-select blocks, action bar, table */}
									<Right>
										<SectionHeader>
											{isArabic
												? "التسويات والمدفوعات"
												: "Settlements & Payments"}
										</SectionHeader>

										{/* KPI tiles */}
										<Tiles>
											<Tile>
												<TileLabel>
													{isArabic ? "عدد الحجوزات" : "All Reservations"}
												</TileLabel>
												<TileValue>{stats.counts.all}</TileValue>
											</Tile>
											<Tile>
												<TileLabel>
													{isArabic
														? "إجمالي المبالغ (SAR)"
														: "Total Amount (SAR)"}
												</TileLabel>
												<TileValue>
													{Number(stats.totals.allTotalSAR).toFixed(2)}
												</TileValue>
											</Tile>
											<Tile>
												<TileLabel>
													{isArabic
														? "عمولة المنصة (SAR)"
														: "Platform Commission (SAR)"}
												</TileLabel>
												<TileValue>
													{Number(stats.totals.allCommissionSAR).toFixed(2)}
												</TileValue>
											</Tile>
										</Tiles>

										{/* Quick-select blocks */}
										<Blocks>
											<Block tone='neutral'>
												<BlockTitle>{isArabic ? "الكل" : "All"}</BlockTitle>
												<KV>
													<label>{isArabic ? "عدد:" : "Count:"}</label>
													<span>{stats.counts.all}</span>
												</KV>
												<KV>
													<label>{isArabic ? "مبالغ:" : "Totals:"}</label>
													<span>
														{Number(stats.totals.allTotalSAR).toFixed(2)} SAR
													</span>
												</KV>
												<KV>
													<label>{isArabic ? "عمولة:" : "Commission:"}</label>
													<span>
														{Number(stats.totals.allCommissionSAR).toFixed(2)}{" "}
														SAR
													</span>
												</KV>
												<Space size='small' style={{ marginTop: 6 }}>
													<Checkbox
														onChange={(e) =>
															toggleBulk(stats.ids.all, e.target.checked)
														}
														checked={
															stats.ids.all.every((id) => selected.has(id)) &&
															stats.ids.all.length > 0
														}
													>
														{isArabic ? "تحديد الكل" : "Select all"}
													</Checkbox>
												</Space>
											</Block>

											<Block tone='success'>
												<BlockTitle>
													{isArabic ? "مدفوعة للفندق" : "Paid Offline"}
												</BlockTitle>
												<KV>
													<label>{isArabic ? "عدد:" : "Count:"}</label>
													<span>{stats.counts.paidOffline}</span>
												</KV>
												<KV>
													<label>{isArabic ? "مبالغ:" : "Totals:"}</label>
													<span>
														{Number(stats.totals.paidOfflineTotalSAR).toFixed(
															2
														)}{" "}
														SAR
													</span>
												</KV>
												<KV>
													<label>{isArabic ? "عمولة:" : "Commission:"}</label>
													<span>
														{Number(
															stats.totals.paidOfflineCommissionSAR
														).toFixed(2)}{" "}
														SAR
													</span>
												</KV>
												<Space size='small' style={{ marginTop: 6 }}>
													<Checkbox
														onChange={(e) =>
															toggleBulk(
																stats.ids.paidOffline,
																e.target.checked
															)
														}
														checked={
															stats.ids.paidOffline.every((id) =>
																selected.has(id)
															) && stats.ids.paidOffline.length > 0
														}
													>
														{isArabic ? "تحديد" : "Select"}
													</Checkbox>
												</Space>
											</Block>

											<Block tone='warn'>
												<BlockTitle>
													{isArabic ? "غير مدفوعة" : "Not Paid"}
												</BlockTitle>
												<KV>
													<label>{isArabic ? "عدد:" : "Count:"}</label>
													<span>{stats.counts.notPaid}</span>
												</KV>
												<KV>
													<label>{isArabic ? "مبالغ:" : "Totals:"}</label>
													<span>
														{Number(stats.totals.notPaidTotalSAR).toFixed(2)}{" "}
														SAR
													</span>
												</KV>
												<KV>
													<label>{isArabic ? "عمولة:" : "Commission:"}</label>
													<span>
														{Number(stats.totals.notPaidCommissionSAR).toFixed(
															2
														)}{" "}
														SAR
													</span>
												</KV>
												<Space size='small' style={{ marginTop: 6 }}>
													<Checkbox
														onChange={(e) =>
															toggleBulk(stats.ids.notPaid, e.target.checked)
														}
														checked={
															stats.ids.notPaid.every((id) =>
																selected.has(id)
															) && stats.ids.notPaid.length > 0
														}
													>
														{isArabic ? "تحديد" : "Select"}
													</Checkbox>
												</Space>
											</Block>
										</Blocks>

										{/* Action bar */}
										<ActionBar>
											<div>
												<strong>
													{isArabic ? "محدد:" : "Selected:"} {selectedCount}
												</strong>
												<span style={{ marginInlineStart: 10 }}>
													{isArabic ? "العمولة (SAR):" : "Commission (SAR):"}{" "}
													<b>{Number(selectedCommissionSAR).toFixed(2)}</b>
												</span>
												<span style={{ marginInlineStart: 10 }}>
													USD ≈ <b>{usdPreview}</b>
												</span>
											</div>
											<Button
												type='primary'
												onClick={doMarkCommissionPaid}
												disabled={selectedCount === 0}
												style={{ minWidth: 120 }}
											>
												{isArabic ? "الدفع" : "Pay"}
											</Button>
										</ActionBar>

										{/* Table */}
										{loading ? (
											<Centered>
												<Spin />
											</Centered>
										) : loadError ? (
											<Alert type='error' showIcon message={loadError} />
										) : (
											<Table
												rowKey={(r) => r._id}
												dataSource={enriched}
												columns={columns}
												size='small'
												bordered
												pagination={{ pageSize: 10 }}
											/>
										)}

										{/* Bulk helpers */}
										<div style={{ marginTop: 8 }}>
											<Space size='middle' wrap>
												<Button onClick={() => toggleBulk(stats.ids.all, true)}>
													{isArabic ? "تحديد الكل" : "Select all"}
												</Button>
												<Button danger onClick={() => setSelected(new Set())}>
													{isArabic ? "إلغاء التحديد" : "Clear selection"}
												</Button>
											</Space>
										</div>
									</Right>
								</Grid>
							</div>
						)}
					</div>
				</div>
			</div>
		</PaymentMainWrapper>
	);
};

export default PaymentMain;

/* ---------------- STYLES ---------------- */
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
	grid-template-columns: 320px 1fr;
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
	margin: 0 0 10px 0;
	font-weight: 800;
	color: #0f172a;
`;

const Tiles = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(140px, 1fr));
	gap: 10px;
	margin-bottom: 10px;
	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;
const Tile = styled.div`
	background: #fff;
	border: 1px solid #e9eef3;
	border-radius: 12px;
	padding: 10px 12px;
`;
const TileLabel = styled.div`
	font-size: 12px;
	color: #6b7280;
	margin-bottom: 6px;
`;
const TileValue = styled.div`
	font-size: 18px;
	font-weight: 800;
	color: #0f172a;
`;

const Blocks = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(160px, 1fr));
	gap: 10px;
	margin-bottom: 12px;
	@media (max-width: 980px) {
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
`;
const KV = styled.p`
	display: flex;
	gap: 10px;
	margin: 4px 0;
	label {
		color: #374151;
		min-width: 110px;
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
