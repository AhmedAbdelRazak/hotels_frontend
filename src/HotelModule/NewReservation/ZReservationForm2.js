// src/HotelModule/NewReservation/ZReservationForm2.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import {
	DatePicker,
	Spin,
	Table,
	Modal,
	InputNumber,
	Button,
	Tooltip,
	Select,
} from "antd";
import {
	HomeOutlined,
	PlusOutlined,
	MinusOutlined,
	CalendarOutlined,
	EditOutlined,
	CheckCircleTwoTone,
} from "@ant-design/icons";
import moment from "moment";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import {
	agodaData,
	airbnbData,
	bookingData,
	expediaData,
	janatData,
} from "../apiAdmin";
import { countryListWithAbbreviations } from "../../AdminModule/CustomerService/utils";

/* ───────── helpers ───────── */
const safeParseFloat = (v, fb = 0) => {
	const n = parseFloat(v);
	return Number.isNaN(n) ? fb : n;
};
const pct = (v) => (v > 1 ? v / 100 : v);

/* Build pricing rows like OrderTaker (commission fallback=10%) */
const buildPricingByDay = ({
	pricingRate = [],
	startDate,
	endDate, // end is checkout; nights are start..end-1
	basePrice,
	defaultCost,
	commissionRate,
}) => {
	const start = moment(startDate).startOf("day");
	const endExclusive = moment(endDate).startOf("day");
	const end = endExclusive.clone().subtract(1, "day");
	const comm = commissionRate > 0 ? commissionRate : 10;

	const rows = [];
	for (let d = start.clone(); d.isSameOrBefore(end, "day"); d.add(1, "day")) {
		const ds = d.format("YYYY-MM-DD");
		const rate = (pricingRate || []).find((r) => r.calendarDate === ds) || {};
		const price = safeParseFloat(rate.price, basePrice);
		const rootPrice = safeParseFloat(
			rate.rootPrice ?? rate.defaultCost,
			defaultCost
		);
		const c = safeParseFloat(rate.commissionRate, comm);
		const finalWithComm = price + rootPrice * pct(c);
		rows.push({
			date: ds,
			price, // "no commission" portion
			rootPrice,
			commissionRate: c,
			totalPriceWithCommission: finalWithComm,
			totalPriceWithoutCommission: price,
		});
	}
	return rows;
};

/* Back-solve price & rootPrice from final nightly using saved ratio & commission */
const fromFinalUsingRatio = (
	finalValue,
	avgRootToTotalRatio,
	commissionPct
) => {
	const final = safeParseFloat(finalValue, 0);
	const r = Math.max(0, Math.min(1, safeParseFloat(avgRootToTotalRatio, 0)));
	const c = pct(safeParseFloat(commissionPct, 10));
	const rootPrice = final * r;
	const price = final - rootPrice * c;
	return {
		rootPrice: Number(rootPrice.toFixed(2)),
		price: Number(price.toFixed(2)),
		totalPriceWithCommission: Number(final.toFixed(2)),
		totalPriceWithoutCommission: Number(price.toFixed(2)),
	};
};

const ZReservationForm2 = ({
	customer_details,
	setCustomer_details,
	start_date,
	setStart_date,
	end_date,
	setEnd_date,
	disabledDate,
	hotelDetails,
	chosenLanguage,
	clickSubmit2,
	days_of_residence,
	setDays_of_residence,
	setBookingComment,
	booking_comment,
	setBookingSource,
	setPaymentStatus,
	paymentStatus,
	confirmation_number,
	setConfirmationNumber,
	booking_source,
	pickedRoomsType,
	setPickedRoomsType,
	roomInventory,
	total_guests,
	setTotalGuests,
	setSendEmail,
	sendEmail,
	paidAmount,
	setPaidAmount,
	isBoss,
	pickedRoomPricing, // kept for parity
	setPickedRoomPricing,
}) => {
	const { user } = isAuthenticated();

	const [loading, setLoading] = useState(false);
	const [isRoomCountModalOpen, setIsRoomCountModalOpen] = useState(false);
	const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
	const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
	const [updatedRoomCount, setUpdatedRoomCount] = useState(1);
	const [totalDistribute, setTotalDistribute] = useState("");

	const selectedKeys = useMemo(
		() => (pickedRoomsType || []).map((r) => `${r.room_type}_${r.displayName}`),
		[pickedRoomsType]
	);

	const Z_TOP = 5000;

	/* Boss bulk upload */
	const handleFileUpload = (uploadFn) => {
		const isFromUS = window.confirm(
			"Is this upload from the US? Click OK for Yes, Cancel for No."
		);
		const country = isFromUS ? "US" : "NotUS";
		const accountId = hotelDetails?._id;
		const belongsTo = user?._id;

		const input = document.createElement("input");
		input.type = "file";
		input.accept =
			".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";

		input.onchange = async (e) => {
			try {
				setLoading(true);
				const file = e.target.files[0];
				const res = await uploadFn(accountId, belongsTo, file, country);
				if (res?.error) {
					toast.error("Error uploading data");
				} else {
					toast.success("Data uploaded successfully!");
				}
			} finally {
				setLoading(false);
			}
		};
		input.click();
	};

	/* Utilities from hotel room details */
	const commissionForRoom = useCallback(
		(room_type, displayName) => {
			const matched = hotelDetails?.roomCountDetails?.find(
				(r) => r.roomType === room_type && r.displayName === displayName
			);
			const fb = safeParseFloat(
				matched?.roomCommission ?? hotelDetails?.commission,
				10
			);
			return fb > 0 ? fb : 10;
		},
		[hotelDetails?.roomCountDetails, hotelDetails?.commission]
	);

	const findRoomDetail = useCallback(
		(room_type, displayName) =>
			hotelDetails?.roomCountDetails?.find(
				(r) => r.roomType === room_type && r.displayName === displayName
			),
		[hotelDetails?.roomCountDetails]
	);

	/* Dates */
	const onStartDateChange = (value) => {
		const atMid = value ? value.clone().startOf("day").toDate() : null;
		setStart_date(atMid ? atMid.toISOString() : null);
		if (atMid && end_date) {
			const dur = moment(end_date)
				.startOf("day")
				.diff(moment(atMid).startOf("day"), "days");
			setDays_of_residence(dur >= 0 ? dur + 1 : 0);
		} else {
			setDays_of_residence(0);
		}
	};
	const onEndDateChange = (value) => {
		const atMid = value ? value.clone().startOf("day").toDate() : null;
		setEnd_date(atMid ? atMid.toISOString() : null);
		if (atMid && start_date) {
			const dur = moment(atMid)
				.startOf("day")
				.diff(moment(start_date).startOf("day"), "days");
			setDays_of_residence(dur >= 0 ? dur + 1 : 0);
		} else {
			setDays_of_residence(0);
		}
	};
	const disabledEndDate = (current) =>
		start_date ? current && current < moment(start_date).startOf("day") : true;

	/* Build one selected room line with day rows */
	const buildRoomLine = useCallback(
		(room_type, displayName) => {
			if (!start_date || !end_date) return null;
			const detail = findRoomDetail(room_type, displayName);
			if (!detail) return null;

			const rows = buildPricingByDay({
				pricingRate: detail.pricingRate || [],
				startDate: start_date,
				endDate: end_date,
				basePrice: safeParseFloat(detail?.price?.basePrice, 0),
				defaultCost: safeParseFloat(detail?.defaultCost, 0),
				commissionRate: commissionForRoom(room_type, displayName),
			});

			const avgRootToTotal =
				rows.length > 0
					? rows.reduce(
							(acc, d) =>
								acc +
								(d.totalPriceWithCommission > 0
									? d.rootPrice / d.totalPriceWithCommission
									: 0),
							0
					  ) / rows.length
					: 0;

			const totalWithComm = rows.reduce(
				(a, d) => a + safeParseFloat(d.totalPriceWithCommission, 0),
				0
			);
			const avgNight = rows.length ? totalWithComm / rows.length : 0;

			return {
				room_type,
				displayName,
				pricingByDay: rows,
				chosenPrice: Number(avgNight.toFixed(2)),
				count: 1,
				averageRootToTotalRatio: avgRootToTotal,
				commissionRate: commissionForRoom(room_type, displayName),
			};
		},
		[start_date, end_date, findRoomDetail, commissionForRoom]
	);

	/* Toggle room chips */
	const toggleChip = (key) => {
		if (!start_date || !end_date) {
			toast.info(
				chosenLanguage === "Arabic"
					? "من فضلك اختر تاريخ الوصول والمغادرة أولاً"
					: "Please pick check‑in and check‑out first."
			);
			return;
		}
		const [room_type, displayName] = key.split("_");
		const exists = selectedKeys.includes(key);
		if (exists) {
			setPickedRoomsType((prev) =>
				prev.filter((r) => `${r.room_type}_${r.displayName}` !== key)
			);
		} else {
			const built = buildRoomLine(room_type, displayName);
			if (built) setPickedRoomsType((prev) => [...prev, built]);
		}
	};

	/* Count modal */
	const openRoomCountModal = (idx) => {
		setSelectedRoomIndex(idx);
		setUpdatedRoomCount(pickedRoomsType[idx]?.count || 1);
		setIsRoomCountModalOpen(true);
	};
	const closeRoomCountModal = () => setIsRoomCountModalOpen(false);
	const saveRoomCount = () => {
		if (selectedRoomIndex == null) return;
		setPickedRoomsType((prev) => {
			const next = [...prev];
			next[selectedRoomIndex] = {
				...next[selectedRoomIndex],
				count: Math.max(1, Number(updatedRoomCount || 1)),
			};
			return next;
		});
		closeRoomCountModal();
	};
	const removeRoom = () => {
		if (selectedRoomIndex == null) return;
		setPickedRoomsType((prev) =>
			prev.filter((_, i) => i !== selectedRoomIndex)
		);
		closeRoomCountModal();
	};

	const incCount = (idx) =>
		setPickedRoomsType((prev) => {
			const next = [...prev];
			next[idx] = { ...next[idx], count: (next[idx].count || 1) + 1 };
			return next;
		});
	const decCount = (idx) =>
		setPickedRoomsType((prev) => {
			const next = [...prev];
			next[idx] = {
				...next[idx],
				count: Math.max(1, (next[idx].count || 1) - 1),
			};
			return next;
		});

	/* Pricing modal (final nightly only) */
	const openPricingModal = (idx) => {
		setSelectedRoomIndex(idx);
		setIsPricingModalOpen(true);
	};
	const closePricingModal = () => setIsPricingModalOpen(false);

	const updateNightFinalAt = (dayIndex, finalValue) => {
		setPickedRoomsType((prev) => {
			const next = [...prev];
			const line = { ...next[selectedRoomIndex] };
			const ratio = line.averageRootToTotalRatio || 0;
			const c = line.commissionRate || 10;
			const baseDay = { ...line.pricingByDay[dayIndex] };

			next[selectedRoomIndex] = {
				...line,
				pricingByDay: [
					...line.pricingByDay.slice(0, dayIndex),
					{ ...baseDay, ...fromFinalUsingRatio(finalValue, ratio, c) },
					...line.pricingByDay.slice(dayIndex + 1),
				],
			};
			// refresh chosenPrice
			const totalWithComm = next[selectedRoomIndex].pricingByDay.reduce(
				(a, d) => a + safeParseFloat(d.totalPriceWithCommission, 0),
				0
			);
			const avg = next[selectedRoomIndex].pricingByDay.length
				? totalWithComm / next[selectedRoomIndex].pricingByDay.length
				: 0;
			next[selectedRoomIndex].chosenPrice = Number(avg.toFixed(2));
			return next;
		});
	};

	const inheritFirstNight = () => {
		setPickedRoomsType((prev) => {
			const next = [...prev];
			const line = { ...next[selectedRoomIndex] };
			const ratio = line.averageRootToTotalRatio || 0;
			const c = line.commissionRate || 10;
			const firstFinal = line.pricingByDay[0]
				? safeParseFloat(line.pricingByDay[0].totalPriceWithCommission, 0)
				: 0;

			const updated = line.pricingByDay.map((d) => ({
				...d,
				...fromFinalUsingRatio(firstFinal, ratio, c),
			}));
			const avg =
				updated.reduce((a, d) => a + d.totalPriceWithCommission, 0) /
				(updated.length || 1);
			next[selectedRoomIndex] = {
				...line,
				pricingByDay: updated,
				chosenPrice: Number(avg.toFixed(2)),
			};
			return next;
		});
	};

	const distributeTotalEvenly = () => {
		const total = safeParseFloat(totalDistribute, 0);
		if (!total || selectedRoomIndex == null) return;

		setPickedRoomsType((prev) => {
			const next = [...prev];
			const line = { ...next[selectedRoomIndex] };
			const ratio = line.averageRootToTotalRatio || 0;
			const c = line.commissionRate || 10;
			const n = line.pricingByDay.length || 1;
			const cents = Math.round(total * 100);
			let sumSoFar = 0;

			const updated = line.pricingByDay.map((d, i) => {
				const shareCents = i < n - 1 ? Math.round(cents / n) : cents - sumSoFar;
				sumSoFar += shareCents;
				const share = shareCents / 100;
				return { ...d, ...fromFinalUsingRatio(share, ratio, c) };
			});
			const avg =
				updated.reduce((a, d) => a + d.totalPriceWithCommission, 0) / n;

			next[selectedRoomIndex] = {
				...line,
				pricingByDay: updated,
				chosenPrice: Number(avg.toFixed(2)),
			};
			return next;
		});
	};

	/* Rebuild day rows when date range changes */
	useEffect(() => {
		if (!start_date || !end_date || !pickedRoomsType?.length) return;
		setPickedRoomsType((prev) =>
			prev
				.map((r) => buildRoomLine(r.room_type, r.displayName))
				.filter(Boolean)
				.map((built, idx) => ({ ...built, count: prev[idx]?.count || 1 }))
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [start_date, end_date]);

	/**
	 * Flatten to OrderTaker’s transformPickedRooms shape:
	 * - pricingDetails.price = totalPriceWithCommission (final nightly)
	 * - keep rootPrice, commissionRate, totalPriceWithCommission, totalPriceWithoutCommission
	 * - chosenPrice = avg nightly final
	 * - duplicate per count with count: 1
	 */
	useEffect(() => {
		if (!pickedRoomsType?.length) {
			setPickedRoomPricing?.([]);
			return;
		}
		const flattened = [];
		pickedRoomsType.forEach((line) => {
			const unit = {
				room_type: line.room_type,
				displayName: line.displayName,
				chosenPrice: Number(line.chosenPrice).toFixed(2), // avg nightly final
				count: 1,
				pricingByDay: line.pricingByDay.map((d) => ({
					date: d.date,
					// IMPORTANT: OrderTaker semantics — “price” is nightly final with commission
					price: safeParseFloat(d.totalPriceWithCommission),
					rootPrice: safeParseFloat(d.rootPrice),
					commissionRate: safeParseFloat(d.commissionRate),
					totalPriceWithCommission: safeParseFloat(d.totalPriceWithCommission),
					totalPriceWithoutCommission: safeParseFloat(
						d.totalPriceWithoutCommission
					),
				})),
			};
			const totalWithComm = unit.pricingByDay.reduce(
				(a, d) => a + d.totalPriceWithCommission,
				0
			);
			const hotelPortion = unit.pricingByDay.reduce(
				(a, d) => a + d.rootPrice,
				0
			);

			for (let i = 0; i < (line.count || 1); i += 1) {
				flattened.push({
					...unit,
					totalPriceWithCommission: Number(totalWithComm.toFixed(2)),
					hotelShouldGet: Number(hotelPortion.toFixed(2)),
				});
			}
		});
		setPickedRoomPricing?.(flattened);
	}, [pickedRoomsType, setPickedRoomPricing]);

	/* Totals (do not reveal commission) */
	const totalPerDay = useMemo(() => {
		if (!pickedRoomsType?.length) return 0;
		return pickedRoomsType.reduce(
			(sum, r) => sum + (Number(r.chosenPrice) || 0) * (r.count || 1),
			0
		);
	}, [pickedRoomsType]);

	const grandTotal = useMemo(() => {
		const nights = Math.max(0, (Number(days_of_residence) || 0) - 1);
		return Number((totalPerDay * nights).toFixed(2));
	}, [totalPerDay, days_of_residence]);

	const pricingColumns = [
		{
			title: "Date",
			dataIndex: "date",
			key: "date",
			width: 140,
			render: (v) => (
				<span>
					<CalendarOutlined /> <b>{v}</b>
				</span>
			),
		},
		{
			title: "Nightly Rate (SAR)",
			dataIndex: "totalPriceWithCommission",
			key: "final",
			render: (val, record, index) => (
				<InputNumber
					min={0}
					value={safeParseFloat(val, 0)}
					step={0.01}
					onChange={(v) => updateNightFinalAt(index, v)}
					style={{ width: "100%" }}
				/>
			),
		},
	];

	return (
		<>
			{loading ? (
				<div className='text-center my-5'>
					<Spin size='large' />
					<p>Loading...</p>
				</div>
			) : (
				<Wrapper arabic={chosenLanguage === "Arabic"} zIndex={Z_TOP}>
					{/* Count modal */}
					<Modal
						title={
							pickedRoomsType[selectedRoomIndex]
								? `${
										chosenLanguage === "Arabic" ? "تحديث الغرف" : "Update Room"
								  }: ${pickedRoomsType[selectedRoomIndex].displayName}`
								: ""
						}
						open={isRoomCountModalOpen}
						onCancel={closeRoomCountModal}
						zIndex={Z_TOP + 10}
						footer={[
							<Button key='remove' danger onClick={removeRoom}>
								{chosenLanguage === "Arabic" ? "حذف" : "Remove Room"}
							</Button>,
							<Button key='cancel' onClick={closeRoomCountModal}>
								{chosenLanguage === "Arabic" ? "إلغاء" : "Cancel"}
							</Button>,
							<Button key='ok' type='primary' onClick={saveRoomCount}>
								{chosenLanguage === "Arabic" ? "حفظ" : "Save"}
							</Button>,
						]}
					>
						<p style={{ marginBottom: 8 }}>
							{chosenLanguage === "Arabic"
								? "تعديل العدد:"
								: "Update the count:"}
						</p>
						<InputNumber
							min={1}
							value={updatedRoomCount}
							onChange={setUpdatedRoomCount}
						/>
						<div className='mt-3'>
							<Button
								type='dashed'
								onClick={() => {
									setIsRoomCountModalOpen(false);
									setIsPricingModalOpen(true);
								}}
							>
								{chosenLanguage === "Arabic"
									? "تعديل الأسعار"
									: "Adjust Pricing"}
							</Button>
						</div>
					</Modal>

					{/* Pricing modal */}
					<Modal
						title={
							pickedRoomsType[selectedRoomIndex]
								? `${chosenLanguage === "Arabic" ? "أسعار" : "Pricing"}: ${
										pickedRoomsType[selectedRoomIndex].displayName
								  }`
								: ""
						}
						open={isPricingModalOpen}
						onCancel={closePricingModal}
						zIndex={Z_TOP + 20}
						footer={[
							<Button key='inherit' onClick={inheritFirstNight}>
								{chosenLanguage === "Arabic"
									? "توريث أول ليلة"
									: "Inherit First Night"}
							</Button>,
							<InputNumber
								key='distAmt'
								placeholder={
									chosenLanguage === "Arabic"
										? "إجمالي للتوزيع"
										: "Total to distribute"
								}
								value={totalDistribute}
								onChange={setTotalDistribute}
								min={0}
								style={{ width: 180 }}
							/>,
							<Button
								key='distBtn'
								onClick={distributeTotalEvenly}
								type='dashed'
							>
								{chosenLanguage === "Arabic"
									? "وزِّع الإجمالي"
									: "Distribute Total"}
							</Button>,
							<Button key='done' type='primary' onClick={closePricingModal}>
								{chosenLanguage === "Arabic" ? "تم" : "Done"}
							</Button>,
						]}
					>
						<Table
							dataSource={
								pickedRoomsType[selectedRoomIndex]?.pricingByDay?.map((d) => ({
									...d,
									key: d.date,
								})) || []
							}
							columns={pricingColumns}
							pagination={false}
							size='small'
							scroll={{ y: 420 }}
						/>
						<div style={{ marginTop: 10, fontWeight: 700, textAlign: "right" }}>
							{chosenLanguage === "Arabic" ? "المجموع:" : "Grand Total:"}{" "}
							{pickedRoomsType[selectedRoomIndex]
								? pickedRoomsType[selectedRoomIndex].pricingByDay
										.reduce(
											(a, d) =>
												a + safeParseFloat(d.totalPriceWithCommission, 0),
											0
										)
										.toFixed(2)
								: "0.00"}{" "}
							SAR
						</div>
					</Modal>

					{/* Boss tools */}
					{isBoss ? (
						<div className='mx-auto mb-5 mt-4 text-center'>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(agodaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات أجودا"
									: "Agoda Upload"}
							</Button>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(expediaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات إكسبيديا"
									: "Expedia Upload"}
							</Button>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(bookingData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات بوكينج"
									: "Booking Upload"}
							</Button>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(airbnbData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات Airbnb"
									: "Airbnb Upload"}
							</Button>
							<Button
								className='mx-2'
								type='primary'
								onClick={() => handleFileUpload(janatData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات Janat"
									: "Janat Upload"}
							</Button>
						</div>
					) : null}

					<h6 className='warn'>
						{chosenLanguage === "Arabic"
							? "تحذير... هذا حجز أولي"
							: "WARNING... THIS IS A preliminary RESERVATION"}
					</h6>

					{/* Main two-column layout */}
					<Grid>
						{/* Left column */}
						<Left>
							<div className='row'>
								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic" ? "الاسم" : "Guest Name"}
									</Label>
									<input
										type='text'
										value={customer_details.name}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												name: e.target.value,
											})
										}
									/>
								</div>
								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic" ? "الهاتف" : "Guest Phone"}
									</Label>
									<input
										type='text'
										value={customer_details.phone}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												phone: e.target.value,
											})
										}
									/>
								</div>
								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic"
											? "البريد الإلكتروني"
											: "Guest Email"}
									</Label>
									<input
										type='text'
										value={customer_details.email}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												email: e.target.value,
											})
										}
									/>
								</div>

								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic"
											? "رقم جواز السفر"
											: "Guest Passport #"}
									</Label>
									<input
										type='text'
										value={customer_details.passport}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												passport: e.target.value,
											})
										}
									/>
								</div>
								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic"
											? "نسخة جواز السفر"
											: "Passport Copy #"}
									</Label>
									<input
										type='text'
										value={customer_details.copyNumber}
										onChange={(e) =>
											setCustomer_details({
												...customer_details,
												copyNumber: e.target.value,
											})
										}
									/>
								</div>
								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic"
											? "تاريخ الميلاد"
											: "Date of Birth"}
									</Label>
									<DatePicker
										className='ant-field'
										format='YYYY-MM-DD'
										value={
											customer_details.passportExpiry
												? moment(customer_details.passportExpiry)
												: null
										}
										onChange={(v) =>
											setCustomer_details({
												...customer_details,
												passportExpiry: v ? v.startOf("day").toISOString() : "",
											})
										}
										getPopupContainer={() => document.body}
										popupStyle={{ zIndex: Z_TOP + 5 }}
										style={{ width: "100%", minWidth: 240 }}
										placeholder={
											chosenLanguage === "Arabic"
												? "اختر التاريخ"
												: "Pick a date"
										}
									/>
								</div>
								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic" ? "الجنسية" : "Nationality"}
									</Label>
									<Select
										showSearch
										placeholder={
											chosenLanguage === "Arabic"
												? "اختر الجنسية"
												: "Select Nationality"
										}
										optionFilterProp='children'
										filterOption={(input, option) =>
											(option?.children ?? "")
												.toString()
												.toLowerCase()
												.includes(input.toLowerCase())
										}
										value={customer_details.nationality || undefined}
										onChange={(val) =>
											setCustomer_details({
												...customer_details,
												nationality: val,
											})
										}
										style={{ width: "100%", zIndex: 9999 }}
										className='ant-field'
									>
										{countryListWithAbbreviations.map((c) => (
											<Select.Option key={c.code} value={c.code}>
												{c.name}
											</Select.Option>
										))}
									</Select>
								</div>

								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic"
											? "تاريخ الوصول"
											: "Check‑in Date"}{" "}
										{start_date ? (
											<small className='pill-inline'>
												<CalendarOutlined />{" "}
												{moment(start_date).format("YYYY-MM-DD")}
											</small>
										) : null}
									</Label>
									<DatePicker
										className='ant-field'
										disabledDate={disabledDate}
										inputReadOnly
										size='middle'
										format='YYYY-MM-DD'
										value={start_date ? moment(start_date) : null}
										onChange={onStartDateChange}
										getPopupContainer={() => document.body}
										popupStyle={{ zIndex: Z_TOP + 5 }}
										style={{ width: "100%", minWidth: 240 }}
										placeholder={
											chosenLanguage === "Arabic"
												? "اختر التاريخ"
												: "Pick a date"
										}
									/>
								</div>
								<div className='col'>
									<Label>
										{chosenLanguage === "Arabic"
											? "تاريخ المغادرة"
											: "Check‑out Date"}{" "}
										{end_date ? (
											<small className='pill-inline'>
												<CalendarOutlined />{" "}
												{moment(end_date).format("YYYY-MM-DD")}
											</small>
										) : null}
									</Label>
									<DatePicker
										className='ant-field'
										disabledDate={disabledEndDate}
										inputReadOnly
										size='middle'
										format='YYYY-MM-DD'
										value={end_date ? moment(end_date) : null}
										onChange={onEndDateChange}
										getPopupContainer={() => document.body}
										popupStyle={{ zIndex: Z_TOP + 5 }}
										style={{ width: "100%", minWidth: 240 }}
										placeholder={
											chosenLanguage === "Arabic"
												? "اختر التاريخ"
												: "Pick a date"
										}
									/>
								</div>
							</div>

							<Block>
								<div className='row'>
									<div className='col'>
										<Label>
											{chosenLanguage === "Arabic"
												? "مصدر الحجز"
												: "Booking Source"}
										</Label>
										<select
											onChange={(e) => setBookingSource(e.target.value)}
											className='selectlike'
											value={booking_source}
										>
											<option value=''>
												{chosenLanguage === "Arabic"
													? "الرجاء الاختيار"
													: "Please Select"}
											</option>
											<option value='janat'>Janat</option>
											<option value='affiliate'>Affiliate</option>
											<option value='manual'>Manual Reservation</option>
											<option value='booking.com'>Booking.com</option>
											<option value='trivago'>Trivago</option>
											<option value='expedia'>Expedia</option>
											<option value='hotel.com'>Hotel.com</option>
											<option value='airbnb'>Airbnb</option>
										</select>
									</div>

									{booking_source && booking_source !== "manual" && (
										<div className='col'>
											<Label>
												{chosenLanguage === "Arabic"
													? "رقم التأكيد"
													: "Confirmation #"}
											</Label>
											<input
												type='text'
												value={confirmation_number}
												onChange={(e) => setConfirmationNumber(e.target.value)}
											/>
										</div>
									)}

									<div className='col'>
										<Label>
											{chosenLanguage === "Arabic" ? "الدفع" : "Payment"}
										</Label>
										<select
											onChange={(e) => setPaymentStatus(e.target.value)}
											className='selectlike'
											value={paymentStatus}
										>
											<option value=''>
												{chosenLanguage === "Arabic"
													? "الرجاء الاختيار"
													: "Please Select"}
											</option>
											<option value='not paid'>Not Paid</option>
											<option value='credit/ debit'>Credit/ Debit</option>
											<option value='cash'>Cash</option>
											<option value='deposit'>Deposit</option>
										</select>
										{paymentStatus === "deposit" && (
											<div className='mt-2'>
												<input
													value={paidAmount}
													onChange={(e) => setPaidAmount(e.target.value)}
													type='text'
													placeholder={
														chosenLanguage === "Arabic"
															? "المبلغ المودع"
															: "Deposited amount"
													}
												/>
											</div>
										)}
									</div>

									<div className='col'>
										<Label>
											{chosenLanguage === "Arabic"
												? "عدد الضيوف"
												: "Total Guests"}
										</Label>
										<input
											type='number'
											min={1}
											value={total_guests}
											onChange={(e) => setTotalGuests(e.target.value)}
										/>
									</div>

									<div className='col'>
										<Label>
											{chosenLanguage === "Arabic"
												? "إرسال بريد إلكتروني"
												: "Send Email"}
										</Label>
										<div style={{ paddingTop: 6 }}>
											<input
												type='checkbox'
												checked={sendEmail}
												onChange={(e) => setSendEmail(e.target.checked)}
												style={{ width: 20, height: 20 }}
											/>
										</div>
									</div>

									<div className='col col-span-2'>
										<Label>
											{chosenLanguage === "Arabic" ? "تعليق الضيف" : "Comment"}
										</Label>
										<textarea
											rows={3}
											value={booking_comment}
											onChange={(e) => setBookingComment(e.target.value)}
										/>
									</div>
								</div>
							</Block>
						</Left>

						{/* Right column */}
						<Right>
							<h4 className='headline'>
								{chosenLanguage === "Arabic"
									? "حجز غرفة للضيف"
									: "Reserve A Room For The Guest"}
							</h4>

							<div className='summary-list'>
								<div className='item'>
									<span>
										{chosenLanguage === "Arabic"
											? "رقم التأكيد"
											: "Confirmation #"}
									</span>
									<strong>{confirmation_number || "-"}</strong>
								</div>
								<div className='item'>
									<span>
										{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
									</span>
									<div className='pill'>
										{start_date ? moment(start_date).format("YYYY-MM-DD") : "-"}
									</div>
								</div>
								<div className='item'>
									<span>
										{chosenLanguage === "Arabic"
											? "تاريخ المغادرة"
											: "Departure"}
									</span>
									<div className='pill'>
										{end_date ? moment(end_date).format("YYYY-MM-DD") : "-"}
									</div>
								</div>
								<div className='item'>
									<span>
										{chosenLanguage === "Arabic" ? "الدفع" : "Payment"}
									</span>
									<strong>{paymentStatus || "Not Paid"}</strong>
								</div>
							</div>

							<h4 className='total'>
								{chosenLanguage === "Arabic"
									? "المبلغ الإجمالي"
									: "Total Amount"}
								: {grandTotal.toLocaleString()} SAR
							</h4>

							<div className='text-center'>
								<Button
									type='default'
									onClick={() =>
										window.scrollTo({ top: 1000, behavior: "smooth" })
									}
								>
									{chosenLanguage === "Arabic"
										? "تسجيل دخول الزائر..."
										: "Check The Guest In..."}
								</Button>
							</div>
						</Right>
					</Grid>

					{/* Room selection chips */}
					<div className='container'>
						<div className='row'>
							{Array.isArray(roomInventory) && roomInventory.length > 0 && (
								<div className='col-12' style={{ margin: "20px 0" }}>
									<Label>
										{chosenLanguage === "Arabic" ? "نوع الغرفة" : "Room Type"}
									</Label>
									<RoomGrid>
										{roomInventory.map((room) => {
											const key = `${room.room_type}_${room.displayName}`;
											const active = selectedKeys.includes(key);
											return (
												<RoomChip
													key={key}
													active={active}
													onClick={() => toggleChip(key)}
													title={`${room.displayName} (${room.room_type})`}
												>
													<span className='icon'>
														<HomeOutlined />
													</span>
													<span className='text'>
														{room.displayName} <em>({room.room_type})</em>
													</span>
													<span
														className='badge'
														style={{ background: room.roomColor || "#ddd" }}
													/>
													<span className='avail'>
														{chosenLanguage === "Arabic"
															? "المتاح"
															: "Available"}
														: {room.total_available}
													</span>
													{active && (
														<CheckCircleTwoTone
															twoToneColor='#52c41a'
															style={{ fontSize: 16, marginInlineStart: 6 }}
														/>
													)}
												</RoomChip>
											);
										})}
									</RoomGrid>
								</div>
							)}
						</div>
					</div>

					{/* Selected rooms + totals */}
					<div className='container mt-3'>
						{customer_details.name &&
						start_date &&
						end_date &&
						pickedRoomsType.length > 0 ? (
							<>
								<div className='total-amount my-3'>
									<h5>
										{chosenLanguage === "Arabic"
											? "مدة الإقامة"
											: "Days Of Residence"}
										: {days_of_residence}{" "}
										{chosenLanguage === "Arabic" ? "أيام" : "Days"} /{" "}
										{days_of_residence <= 1 ? 1 : days_of_residence - 1}{" "}
										{chosenLanguage === "Arabic" ? "ليالٍ" : "Nights"}
									</h5>

									<h4>
										{chosenLanguage === "Arabic"
											? "المبلغ لكل يوم"
											: "Total Amount Per Day"}
										:{" "}
										{Number(
											pickedRoomsType.reduce(
												(sum, r) =>
													sum + (Number(r.chosenPrice) || 0) * (r.count || 1),
												0
											)
										).toFixed(2)}{" "}
										SAR / {chosenLanguage === "Arabic" ? "اليوم" : "Day"}
									</h4>

									<div className='room-list my-3'>
										{pickedRoomsType.map((room, index) => (
											<div
												key={`${room.room_type}_${room.displayName}_${index}`}
												className='room-item'
											>
												<div className='text'>
													<HomeOutlined />{" "}
													{`Room: ${room.displayName} (${room.room_type}) — `}
													<Tooltip
														title={`${
															chosenLanguage === "Arabic"
																? "معدل الليلة"
																: "Nightly"
														}: ${Number(room.chosenPrice).toFixed(2)} SAR`}
													>
														<span className='price'>
															{Number(room.chosenPrice).toFixed(2)} SAR
														</span>
													</Tooltip>
													{`  × ${room.count} ${
														chosenLanguage === "Arabic" ? "غرف" : "rooms"
													}`}
												</div>
												<div className='actions'>
													<Button
														size='small'
														icon={<MinusOutlined />}
														onClick={() => decCount(index)}
													/>
													<Button
														size='small'
														icon={<PlusOutlined />}
														onClick={() => incCount(index)}
													/>
													<Button
														size='small'
														icon={<EditOutlined />}
														onClick={() => openRoomCountModal(index)}
													>
														{chosenLanguage === "Arabic" ? "العدد" : "Count"}
													</Button>
													<Button
														size='small'
														onClick={() => openPricingModal(index)}
													>
														{chosenLanguage === "Arabic" ? "السعر" : "Pricing"}
													</Button>
												</div>
											</div>
										))}
									</div>

									<h3>
										{chosenLanguage === "Arabic" ? "الإجمالي" : "Total Amount"}:{" "}
										{grandTotal.toLocaleString()} SAR
									</h3>
									{paidAmount && paymentStatus === "deposit" && (
										<h3>
											{chosenLanguage === "Arabic"
												? "المبلغ المدفوع"
												: "Paid Amount"}
											: {Number(paidAmount).toLocaleString()} SAR
										</h3>
									)}
								</div>

								<div className='mt-5 mx-auto text-center col-md-6'>
									<Button
										className='cta'
										type='primary'
										onClick={() => {
											clickSubmit2();
										}}
									>
										{chosenLanguage === "Arabic"
											? "تنفيذ الحجز..."
											: "Make A Reservation..."}
									</Button>
								</div>
							</>
						) : null}
					</div>
				</Wrapper>
			)}
		</>
	);
};

export default ZReservationForm2;

/* ───────── styles ───────── */

const Wrapper = styled.div`
	position: relative;
	text-align: ${(p) => (p.arabic ? "right" : "left")};
	direction: ${(p) => (p.arabic ? "rtl" : "ltr")};

	.warn {
		text-transform: uppercase;
		color: darkcyan;
		font-weight: 700;
	}

	input[type="text"],
	input[type="email"],
	input[type="password"],
	input[type="date"],
	input[type="number"],
	select,
	textarea {
		display: block;
		width: 100%;
		padding: 0.55rem 0.6rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		background: #fff;
	}

	.ant-picker,
	.ant-field {
		width: 100% !important;
		min-width: 240px;
		border-radius: 10px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
	}

	.selectlike {
		width: 100%;
		padding: 10px;
		border-radius: 10px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
	}

	.pill-inline {
		background: #eef2ff;
		padding: 2px 6px;
		border-radius: 6px;
		margin-inline-start: 6px;
	}

	h4.headline {
		font-size: 1.35rem;
		font-weight: 800;
		margin: 10px 0 16px;
	}

	h4.total {
		color: #006ad1;
		text-align: center;
		margin: 14px 0;
		font-weight: 800;
	}

	.cta {
		font-weight: 700;
		font-size: 1.05rem;
		padding: 10px 18px;
	}
`;

const Label = styled.label`
	font-weight: 700;
	font-size: 0.95rem;
	color: #32322b;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 6px;
`;

const Grid = styled.div`
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: 16px;
	@media (max-width: 1200px) {
		grid-template-columns: 1fr;
	}
`;

const Left = styled.div`
	.row {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 12px;
	}
	.col {
		grid-column: span 4;
	}
	.col-span-2 {
		grid-column: span 12;
	}
	@media (max-width: 1200px) {
		.col {
			grid-column: span 6;
		}
	}
	@media (max-width: 768px) {
		.col,
		.col-span-2 {
			grid-column: span 12;
		}
	}
`;

const Block = styled.div`
	margin-top: 18px;
	background: #f6f7f9;
	border: 1px solid #e9edf4;
	border-radius: 10px;
	padding: 14px;

	.row {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 12px;
	}
	.col {
		grid-column: span 3;
	}
	.col-span-2 {
		grid-column: span 6;
	}
	@media (max-width: 1200px) {
		.col {
			grid-column: span 6;
		}
		.col-span-2 {
			grid-column: span 12;
		}
	}
	@media (max-width: 768px) {
		.col,
		.col-span-2 {
			grid-column: span 12;
		}
	}
`;

const Right = styled.div`
	background: #fff;
	border-radius: 8px;
	padding: 14px;
	border: 1px solid #eee;
	min-height: 250px;

	.summary-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-bottom: 8px;
	}
	.item {
		background: #fafafa;
		border: 1px solid #f0f0f0;
		border-radius: 8px;
		padding: 10px 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.price {
		color: darkgoldenrod;
		font-weight: 700;
	}
	.room-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #fffdf5;
		border: 1px dashed #eadca6;
		padding: 10px 12px;
		border-radius: 8px;
		margin-bottom: 8px;
	}
	.actions > * {
		margin-inline-start: 8px;
	}

	@media (max-width: 768px) {
		.summary-list {
			grid-template-columns: 1fr;
		}
	}
`;

const RoomGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(410px, 1fr));
	gap: 10px;
`;

const RoomChip = styled.button`
	appearance: none;
	border: 1px solid ${(p) => (p.active ? "#1a9f42" : "#e5e7eb")};
	background: ${(p) => (p.active ? "#e7f7ed" : "#ffffff")};
	color: #111827;
	padding: 10px 12px;
	border-radius: 10px;
	display: grid;
	grid-template-columns: auto 1fr auto auto auto;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	transition:
		box-shadow 0.2s ease,
		transform 0.05s ease;
	text-align: start;

	&:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		transform: translateY(-1px);
	}

	.icon {
		font-size: 18px;
	}
	.text {
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.text em {
		font-style: normal;
		opacity: 0.7;
		font-weight: 600;
	}
	.badge {
		width: 12px;
		height: 12px;
		border-radius: 3px;
	}
	.avail {
		font-size: 12px;
		opacity: 0.8;
	}
`;
