// AdminModule/JannatTools/PackagesModal.js
import React, { useMemo, useState, useEffect } from "react";
import { Modal, Select, Radio, Tag, InputNumber, Alert } from "antd";
import dayjs from "dayjs";

const { Option } = Select;

/* ---------------- helpers ---------------- */
const safeNum = (v, d = 0) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : d;
};

// Prefer room commission if >= 1% (0.01 as decimal). Otherwise use hotel's.
// Fallback to env (REACT_APP_COMMISSIONRATE ~ 1.1 => 10%).
const toCommissionDecimal = (room, hotel) => {
	const envFactor = safeNum(process.env.REACT_APP_COMMISSIONRATE, 1.1);
	const defaultPct = (envFactor - 1) * 100;
	const norm = (v) => (v <= 1 ? v : v / 100);

	const r = safeNum(room?.roomCommission, NaN);
	const rn = Number.isFinite(r) && r > 0 ? norm(r) : NaN; // if 0.001 => 0.1%
	const h = safeNum(hotel?.commission, NaN);
	const hn = Number.isFinite(h) && h > 0 ? norm(h) : NaN;

	if (Number.isFinite(rn) && rn >= 0.01) return rn; // >= 1%
	if (Number.isFinite(hn)) return hn;
	return norm(defaultPct) || 0.1;
};

const normalizeOffer = (o) => ({
	type: "offer",
	id: o?._id || o?.id || Math.random().toString(36).slice(2),
	name: o?.offerName || o?.name || "Special Offer",
	from: o?.offerFrom || o?.from || o?.validFrom || null,
	to: o?.offerTo || o?.to || o?.validTo || null,
	base: safeNum(o?.offerPrice ?? o?.price),
	root: safeNum(o?.offerRootPrice ?? o?.rootPrice ?? o?.cost),
	hFrom: o?.offerFromHijri || o?.fromHijri || "",
	hTo: o?.offerToHijri || o?.toHijri || "",
});

const normalizeMonthly = (m) => ({
	type: "monthly",
	id: m?._id || m?.id || Math.random().toString(36).slice(2),
	name: m?.monthName || m?.monthlyName || m?.name || "Monthly",
	from: m?.monthFrom || m?.from || m?.validFrom || null,
	to: m?.monthTo || m?.to || m?.validTo || null,
	base: safeNum(m?.monthPrice ?? m?.price ?? m?.rate),
	root: safeNum(m?.monthRootPrice ?? m?.rootPrice ?? m?.cost),
	hFrom: m?.monthFromHijri || m?.fromHijri || "",
	hTo: m?.monthToHijri || m?.toHijri || "",
});

// End‑exclusive date array
const dateRange = (start, end) => {
	const a = dayjs(start);
	const b = dayjs(end);
	const out = [];
	for (let d = a; d.isBefore(b, "day"); d = d.add(1, "day")) {
		out.push(d.format("YYYY-MM-DD"));
	}
	return out;
};

// Split a total into n parts that sum EXACTLY to total (2 dp)
const splitEven = (total, n) => {
	if (n <= 0) return [];
	const per = Math.floor((total / n) * 100) / 100;
	const arr = Array(n).fill(per);
	const used = per * n;
	const diff = Math.round((total - used) * 100) / 100;
	if (diff !== 0) arr[n - 1] = Math.round((arr[n - 1] + diff) * 100) / 100;
	return arr;
};

const hasValidRange = (from, to) => {
	if (!from || !to) return false;
	const a = dayjs(from);
	const b = dayjs(to);
	return a.isValid() && b.isValid() && b.isAfter(a, "day");
};

/* ---------------- component ---------------- */
const PackagesModal = ({
	open,
	onClose,
	hotel, // full hotel object
	onApply, // ({room, deal, nights, start, end, count, pricingByDay, totals})
	initialRoomId = "",
}) => {
	const rooms = useMemo(() => hotel?.roomCountDetails || [], [hotel]);

	const roomOptions = useMemo(() => {
		return rooms.map((r) => ({
			id: r._id,
			label:
				(r.displayName || r.roomType || "Room") +
				(r.displayName && r.roomType ? ` (${r.roomType})` : ""),
		}));
	}, [rooms]);

	const [roomId, setRoomId] = useState(
		initialRoomId || roomOptions[0]?.id || ""
	);
	const activeRoom = useMemo(
		() => rooms.find((r) => r._id === roomId) || rooms[0],
		[rooms, roomId]
	);

	// Collect valid deals for the selected room
	const deals = useMemo(() => {
		if (!activeRoom) return [];

		const offers =
			(activeRoom.offers || [])
				.map(normalizeOffer)
				.filter(
					(o) =>
						Number.isFinite(o.base) && o.base > 0 && hasValidRange(o.from, o.to)
				) || [];

		const monthly =
			(activeRoom.monthly || [])
				.map(normalizeMonthly)
				.filter(
					(m) =>
						Number.isFinite(m.base) && m.base > 0 && hasValidRange(m.from, m.to)
				) || [];

		return [
			...monthly.map((m) => ({ ...m, badge: "Monthly", color: "blue" })),
			...offers.map((o) => ({ ...o, badge: "Offer", color: "green" })),
		].sort((a, b) => dayjs(a.from).valueOf() - dayjs(b.from).valueOf());
	}, [activeRoom]);

	const [selectedId, setSelectedId] = useState("");
	const selectedDeal = useMemo(
		() => deals.find((d) => d.id === selectedId),
		[deals, selectedId]
	);

	// default count = 1 room
	const [count, setCount] = useState(1);

	// Compute totals (final = base + root * commission)
	const totals = useMemo(() => {
		if (!selectedDeal || !activeRoom || !hotel) return null;

		const start = dayjs(selectedDeal.from);
		const end = dayjs(selectedDeal.to);
		const nights = Math.max(end.diff(start, "day"), 1);

		const comm = toCommissionDecimal(activeRoom, hotel);
		const base = safeNum(selectedDeal.base, 0);
		const root = safeNum(selectedDeal.root, 0);
		const final = Math.round((base + root * comm) * 100) / 100;

		return {
			nights,
			start,
			end,
			base,
			root,
			commissionDecimal: comm,
			finalTotal: final, // total to be charged for ONE room
			finalPerNight: final / nights,
		};
	}, [selectedDeal, activeRoom, hotel]);

	// Create nightly rows that sum EXACTLY to the package total
	const pricingByDay = useMemo(() => {
		if (!totals) return [];
		const dates = dateRange(totals.start, totals.end);
		const rootParts = splitEven(totals.root, dates.length);
		const finalParts = splitEven(totals.finalTotal, dates.length);

		return dates.map((d, i) => {
			const root = rootParts[i];
			const total = finalParts[i];
			// choose “price” = root so editors remain intuitive (final - root is commission)
			const priceNoCommission = root;
			const pct = root > 0 ? ((total - root) / root) * 100 : 0;

			return {
				date: d,
				price: priceNoCommission,
				rootPrice: root,
				commissionRate: Math.max(0, Math.round(pct * 1000) / 1000), // 3 dp
				totalPriceWithCommission: Math.round(total * 100) / 100,
				totalPriceWithoutCommission: priceNoCommission,
			};
		});
	}, [totals]);

	// if initialRoomId changes after modal open
	useEffect(() => {
		if (initialRoomId && initialRoomId !== roomId) {
			setRoomId(initialRoomId);
			setSelectedId("");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialRoomId]);

	const okDisabled =
		!selectedDeal || !totals || pricingByDay.length === 0 || count < 1;

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title='Choose a Package / Offer'
			okText='OK'
			onOk={() => {
				if (okDisabled) return;
				onApply({
					room: activeRoom,
					deal: selectedDeal,
					nights: totals.nights,
					start: totals.start,
					end: totals.end,
					count,
					// Important: we pass the nightly rows for one room.
					pricingByDay,
					totals: {
						base: totals.base,
						root: totals.root,
						commissionDecimal: totals.commissionDecimal,
						finalTotal: totals.finalTotal,
					},
				});
			}}
			okButtonProps={{ disabled: okDisabled }}
			destroyOnClose
			// keep the modal above everything and its dropdowns inside:
			zIndex={20000}
			styles={{ mask: { zIndex: 19999 } }}
		>
			{/* Room selector */}
			<div style={{ marginBottom: 10 }}>
				<div style={{ fontWeight: 700, marginBottom: 6 }}>Room</div>
				<Select
					value={roomId}
					onChange={(v) => {
						setRoomId(v);
						setSelectedId("");
					}}
					style={{ width: "100%" }}
					placeholder='Select room'
					// Anchor dropdown to the modal body to inherit z-index:
					getPopupContainer={(trigger) => trigger.parentNode}
				>
					{roomOptions.map((r) => (
						<Option key={r.id} value={r.id}>
							{r.label}
						</Option>
					))}
				</Select>
			</div>

			{/* Deals list */}
			<div style={{ fontWeight: 700, margin: "12px 0 6px" }}>
				Available Packages
			</div>

			<Radio.Group
				value={selectedId}
				onChange={(e) => setSelectedId(e.target.value)}
				style={{ width: "100%" }}
			>
				<div style={{ display: "grid", gap: 8 }}>
					{deals.map((d) => {
						const start = dayjs(d.from);
						const end = dayjs(d.to);
						const nights = Math.max(end.diff(start, "day"), 1);
						const fromStr = start.isValid() ? start.format("DD MMM YYYY") : "—";
						const toStr = end.isValid() ? end.format("DD MMM YYYY") : "—";

						// inline preview so each option shows accurate price at a glance
						const comm = toCommissionDecimal(activeRoom, hotel);
						const total = safeNum(d.base, 0) + safeNum(d.root, 0) * comm;

						// Provide very strong fallbacks for the label:
						const labelName =
							(d.name && String(d.name).trim()) ||
							(d.hFrom && d.hTo
								? `${d.hFrom} → ${d.hTo}`
								: fromStr !== "—" && toStr !== "—"
								  ? `${fromStr} → ${toStr}`
								  : d.type === "monthly"
								    ? "Monthly Package"
								    : "Offer");

						return (
							<label
								key={d.id}
								htmlFor={`pkg-${d.id}`}
								onClick={() => setSelectedId(d.id)}
								style={{
									border: "1px solid var(--border-color-light)",
									borderRadius: 8,
									padding: 10,
									display: "grid",
									gridTemplateColumns: "auto 1fr auto",
									gap: 10,
									alignItems: "center",
									cursor: "pointer",
								}}
							>
								<Radio id={`pkg-${d.id}`} value={d.id} />

								{/* Middle column: name + date range */}
								<div style={{ minWidth: 0, lineHeight: 1.25 }}>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											color: "#0f1f2e",
											overflow: "hidden",
										}}
									>
										<Tag color={d.color} style={{ marginInlineEnd: 2 }}>
											{d.badge}
										</Tag>
										<Tag color={d.color} style={{ marginInlineEnd: 2 }}>
											{labelName}
										</Tag>

										<Tag>
											<div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
												<div style={{ fontWeight: 700, color: "#0f1f2e" }}>
													{total.toFixed(2)} SAR
												</div>
												<small style={{ color: "#666" }}>
													{(total / nights).toFixed(2)} / night
												</small>
											</div>
										</Tag>
									</div>
								</div>

								{/* Right column: price preview */}
							</label>
						);
					})}
				</div>
			</Radio.Group>

			{/* Count */}
			<div style={{ marginTop: 12 }}>
				<div style={{ fontWeight: 700, marginBottom: 6 }}>Count</div>
				<InputNumber
					min={1}
					value={count}
					onChange={(v) => setCount(v || 1)}
					style={{ width: "100%" }}
				/>
			</div>

			{/* Locking and total preview for the *selected* deal */}
			{totals && (
				<>
					<Alert
						type='warning'
						showIcon
						style={{ marginTop: 14 }}
						message={
							<div>
								<b>Dates will be locked</b> to the selected package window.
								<div style={{ marginTop: 6, fontWeight: 700 }}>
									{totals.start.format("DD MMM YYYY")} &rarr{" "}
									{totals.end.format("DD MMM YYYY")}{" "}
									<span style={{ color: "#666" }}>
										({totals.nights} {totals.nights === 1 ? "night" : "nights"})
									</span>
								</div>
							</div>
						}
					/>

					<Alert
						type='success'
						showIcon
						style={{ marginTop: 10 }}
						message={
							<div>
								<b>Total to be charged:</b> {totals.finalTotal.toFixed(2)} SAR{" "}
								<span style={{ color: "#666" }}>
									(package total for one room)
								</span>
							</div>
						}
					/>
				</>
			)}
		</Modal>
	);
};

export default PackagesModal;
