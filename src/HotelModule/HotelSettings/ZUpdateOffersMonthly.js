/** @format */
import React, { useMemo, useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import {
	Form,
	Input,
	InputNumber,
	Button,
	Select,
	Radio,
	Divider,
	Modal,
	message,
} from "antd";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// Use the hijri-enabled build (guarantees iMonth/iYear)
import moment from "moment-hijri";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import {
	canonicalPackageDateKey,
	classifyFixedPackage,
	getDefaultEligibleGregorianMonth,
	getGregorianMonthRange,
	getHijriMonthRange,
	getSaudiTodayKey,
	isSameMonthlyPackageSelection,
	isGregorianMonthEligible,
	localCalendarDateKey,
	localDateFromPackageDateKey,
	parseHijriMonthSelection,
	partitionFixedPackageRows,
} from "../../utils/packagePolicy";

const { Option } = Select;

const gregorianMonthsEn = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const gregorianMonthsAr = [
	"يناير",
	"فبراير",
	"مارس",
	"أبريل",
	"مايو",
	"يونيو",
	"يوليو",
	"أغسطس",
	"سبتمبر",
	"أكتوبر",
	"نوفمبر",
	"ديسمبر",
];

const hijriMonthsEn = [
	"Muharram",
	"Safar",
	"Rabi’ al‑Awwal",
	"Rabi’ al‑Thani",
	"Jumada al‑Ula",
	"Jumada al‑Akhirah",
	"Rajab",
	"Sha’ban",
	"Ramadan",
	"Shawwal",
	"Dhul‑Qa’dah",
	"Dhul‑Hijjah",
];
const hijriMonthsAr = [
	"محرم",
	"صفر",
	"ربيع الأول",
	"ربيع الآخر",
	"جمادى الأولى",
	"جمادى الآخرة",
	"رجب",
	"شعبان",
	"رمضان",
	"شوال",
	"ذو القعدة",
	"ذو الحجة",
];

const packageRowKey = (prefix, row, sourceIndex) =>
	`${prefix}-${
		row?._id ||
		row?.id ||
		`${canonicalPackageDateKey(row?.offerFrom || row?.monthFrom)}-${sourceIndex}`
	}`;

const unavailableStatusLabel = (status, isArabic) => {
	if (status === "started") return isArabic ? "بدأ بالفعل" : "Already started";
	if (status === "expired") return isArabic ? "منتهي" : "Expired";
	if (status === "invalid-price")
		return isArabic ? "سعر غير صالح" : "Invalid total";
	if (status === "invalid-root")
		return isArabic ? "تكلفة داخلية غير صالحة" : "Invalid root total";
	if (status === "invalid-duration")
		return isArabic ? "المدة أطول من المسموح" : "Duration exceeds limit";
	if (status === "too-far")
		return isArabic ? "تاريخ بعيد جدًا" : "Start year exceeds limit";
	return isArabic ? "بيانات غير صالحة" : "Invalid dates";
};

function ZUpdateOffersMonthly({
	mode = "Offers", // "Offers" | "Monthly"
	chosenLanguage,
	hotelDetails,
	setHotelDetails,
	existingRoomDetails, // target room (has _id)
	form, // parent AntD form (can provide displayName if needed)
}) {
	const isArabic = chosenLanguage === "Arabic";
	const monthLabelsGreg = isArabic ? gregorianMonthsAr : gregorianMonthsEn;
	const monthLabelsHijri = isArabic ? hijriMonthsAr : hijriMonthsEn;
	const saudiTodayKey = getSaudiTodayKey();
	const minSelectableDate = localDateFromPackageDateKey(saudiTodayKey);
	const defaultGregorian = getDefaultEligibleGregorianMonth(saudiTodayKey);
	const maximumPackageStartYear = Number(saudiTodayKey.slice(0, 4)) + 5;

	const supportsHijri =
		!!moment?.fn &&
		typeof moment.fn.iMonth === "function" &&
		typeof moment.fn.iYear === "function";

	const roomId = existingRoomDetails?._id;
	const roomDisplayName =
		existingRoomDetails?.displayName ||
		form?.getFieldValue("displayName") ||
		"";

	// AntD inner forms rendered without <form> elements (prevents nested submit)
	const [offersForm] = Form.useForm();
	const [monthlyForm] = Form.useForm();

	const currentRoomIndex = useMemo(() => {
		if (!hotelDetails?.roomCountDetails || !roomId) return -1;
		return hotelDetails.roomCountDetails.findIndex(
			(r) => r._id?.toString?.() === roomId?.toString?.()
		);
	}, [hotelDetails, roomId]);

	const currentRoom = useMemo(() => {
		if (currentRoomIndex === -1) return null;
		return hotelDetails.roomCountDetails[currentRoomIndex] || null;
	}, [hotelDetails, currentRoomIndex]);

	const existingOffers = useMemo(() => currentRoom?.offers || [], [currentRoom]);
	const existingMonthly = useMemo(
		() => currentRoom?.monthly || [],
		[currentRoom]
	);
	const offerRows = useMemo(
		() =>
			partitionFixedPackageRows(existingOffers, {
				type: "offer",
				getFrom: (row) => row.offerFrom,
				getTo: (row) => row.offerTo,
				getTotal: (row) => row.offerPrice,
				getRootTotal: (row) => row.offerRootPrice,
				todayKey: saudiTodayKey,
			}),
		[existingOffers, saudiTodayKey]
	);
	const monthlyRows = useMemo(
		() =>
			partitionFixedPackageRows(existingMonthly, {
				type: "monthly",
				getFrom: (row) => row.monthFrom,
				getTo: (row) => row.monthTo,
				getTotal: (row) => row.monthPrice,
				getRootTotal: (row) => row.monthRootPrice,
				todayKey: saudiTodayKey,
			}),
		[existingMonthly, saudiTodayKey]
	);

	const ensureRoomEntryAndUpdateById = (updater) => {
		if (!roomId) {
			message.error(
				isArabic
					? "لم يتم العثور على الغرفة المحددة"
					: "Selected room not found"
			);
			return;
		}
		setHotelDetails((prev) => {
			const details = { ...prev };
			const list = Array.isArray(details.roomCountDetails)
				? [...details.roomCountDetails]
				: [];
			let idx = list.findIndex(
				(r) => r._id?.toString?.() === roomId.toString()
			);
			if (idx === -1) {
				// create minimal room entry if somehow missing (keeps identity from existingRoomDetails)
				list.push({
					_id: roomId,
					roomType: existingRoomDetails?.roomType || "",
					displayName:
						existingRoomDetails?.displayName || roomDisplayName || "",
					pricingRate: [],
					offers: [],
					monthly: [],
				});
				idx = list.length - 1;
			}
			const updatedRoom = updater({ ...list[idx] });
			list[idx] = { ...list[idx], ...updatedRoom };
			return { ...details, roomCountDetails: list };
		});
	};

	// Prevent Enter from bubbling and submitting parent form
	const preventEnterSubmit = useCallback((e) => {
		if (e.key === "Enter") e.preventDefault();
	}, []);

	/* =========================== OFFERS =========================== */
	const [offerRange, setOfferRange] = useState([null, null]);
	const [editingOfferIndex, setEditingOfferIndex] = useState(-1);

	const beginEditOffer = (idx) => {
		const rec = existingOffers[idx];
		if (!rec) return;
		offersForm.setFieldsValue({
			offerName: rec.offerName,
			offerPrice: rec.offerPrice,
			offerRootPrice: rec.offerRootPrice,
		});
		setOfferRange([
			localDateFromPackageDateKey(rec.offerFrom),
			localDateFromPackageDateKey(rec.offerTo),
		]);
		setEditingOfferIndex(idx);
	};

	const cancelEditOffer = () => {
		setEditingOfferIndex(-1);
		offersForm.resetFields();
		setOfferRange([null, null]);
	};

	const deleteOffer = (idx) => {
		const rec = existingOffers[idx];
		Modal.confirm({
			title: isArabic ? "تأكيد الحذف" : "Confirm Delete",
			content: isArabic
				? `هل تريد حذف العرض "${rec?.offerName}"؟`
				: `Delete offer "${rec?.offerName}"?`,
			okText: isArabic ? "حذف" : "Delete",
			cancelText: isArabic ? "إلغاء" : "Cancel",
			okButtonProps: { danger: true },
			onOk: () => {
				ensureRoomEntryAndUpdateById((room) => {
					const offers = [...(room.offers || [])];
					offers.splice(idx, 1);
					return { ...room, offers };
				});
				message.success(isArabic ? "تم الحذف" : "Deleted");
				cancelEditOffer();
			},
		});
	};

	const handleAddOrUpdateOffer = (values) => {
		const { offerName, offerPrice, offerRootPrice } = values;
		const [start, end] = offerRange;
		if (!start || !end) {
			message.error(
				isArabic
					? "يرجى اختيار تاريخ البداية والنهاية"
					: "Please select start/end dates"
			);
			return;
		}
		const offerFrom = localCalendarDateKey(start);
		const offerTo = localCalendarDateKey(end);
		const policy = classifyFixedPackage(
			{
				type: "offer",
				from: offerFrom,
				to: offerTo,
				total: offerPrice,
				rootTotal: offerRootPrice,
			},
			saudiTodayKey
		);
		if (!policy.eligible) {
			message.error(
				isArabic
					? "يجب أن يبدأ العرض الكامل اليوم أو في المستقبل، وأن يكون له نطاق وسعر صالحان"
					: "A full offer must start today or later and have a valid range and positive total."
			);
			return;
		}

		ensureRoomEntryAndUpdateById((room) => {
			const offers = Array.isArray(room.offers) ? [...room.offers] : [];
			const previousRecord =
				editingOfferIndex > -1 ? offers[editingOfferIndex] || {} : {};
			const record = {
				...previousRecord,
				offerName,
				offerFrom,
				offerTo,
				offerPrice: Number(offerPrice),
				offerRootPrice:
					offerRootPrice !== undefined && offerRootPrice !== null
						? Number(offerRootPrice)
						: undefined,
			};
			if (editingOfferIndex > -1) {
				offers[editingOfferIndex] = record;
			} else {
				offers.push(record);
			}
			return { ...room, offers };
		});

		cancelEditOffer();
		message.success(isArabic ? "تم الحفظ" : "Saved");
	};

	/* =========================== MONTHLY =========================== */
	const [calendarType, setCalendarType] = useState("gregorian"); // "gregorian" | "hijri"
	const [gregMonth, setGregMonth] = useState(defaultGregorian.month); // 0..11
	const [gregYear, setGregYear] = useState(defaultGregorian.year);
	const defaultHijri = useMemo(() => {
		if (!supportsHijri) return { month: 0, year: defaultGregorian.year };
		const selected = moment(saudiTodayKey, "YYYY-MM-DD");
		if (selected.iDate() > 1) selected.add(1, "iMonth");
		return { month: selected.iMonth(), year: selected.iYear() };
	}, [defaultGregorian.year, saudiTodayKey, supportsHijri]);
	const maximumHijriStartYear = useMemo(
		() =>
			moment(`${maximumPackageStartYear}-12-31`, "YYYY-MM-DD").iYear(),
		[maximumPackageStartYear]
	);
	const [hijriMonth, setHijriMonth] = useState(
		defaultHijri.month
	); // 0..11
	const [hijriYear, setHijriYear] = useState(defaultHijri.year);
	const [editingMonthlyIndex, setEditingMonthlyIndex] = useState(-1);
	const [editingMonthlySnapshot, setEditingMonthlySnapshot] = useState(null);

	useEffect(() => {
		setEditingOfferIndex(-1);
		setEditingMonthlyIndex(-1);
		setEditingMonthlySnapshot(null);
		setOfferRange([null, null]);
		setCalendarType("gregorian");
		setGregMonth(defaultGregorian.month);
		setGregYear(defaultGregorian.year);
		setHijriMonth(defaultHijri.month);
		setHijriYear(defaultHijri.year);
		offersForm.resetFields();
		monthlyForm.resetFields();
	}, [
		roomId,
		offersForm,
		monthlyForm,
		defaultGregorian.month,
		defaultGregorian.year,
		defaultHijri.month,
		defaultHijri.year,
	]);

	const prefillMonthlyFromRecord = (rec) => {
		if (!rec) return null;
		// decide type: if it has Hijri fields, prefer hijri; else gregorian
		const hasHijri = !!rec.monthFromHijri || !!rec.monthToHijri;
		if (hasHijri && supportsHijri) {
			setCalendarType("hijri");
			const explicitSelection = parseHijriMonthSelection(
				rec.monthFromHijri
			);
			let selection = explicitSelection;
			if (explicitSelection) {
				setHijriYear(explicitSelection.year);
				setHijriMonth(explicitSelection.month);
			} else {
				const hStart = moment(
					canonicalPackageDateKey(rec.monthFrom),
					"YYYY-MM-DD"
				);
				setHijriYear(hStart.iYear());
				setHijriMonth(hStart.iMonth());
				selection = { year: hStart.iYear(), month: hStart.iMonth() };
			}
			if (
				!selection ||
				!Number.isInteger(Number(selection.year)) ||
				!Number.isInteger(Number(selection.month))
			) {
				return null;
			}
			monthlyForm.setFieldsValue({
				monthPrice: rec.monthPrice,
				monthRootPrice: rec.monthRootPrice,
			});
			return { calendarType: "hijri", ...selection };
		} else {
			setCalendarType("gregorian");
			const gStart = localDateFromPackageDateKey(rec.monthFrom);
			if (!gStart) return null;
			setGregYear(gStart.getFullYear());
			setGregMonth(gStart.getMonth());
			monthlyForm.setFieldsValue({
				monthPrice: rec.monthPrice,
				monthRootPrice: rec.monthRootPrice,
			});
			return {
				calendarType: "gregorian",
				year: gStart.getFullYear(),
				month: gStart.getMonth(),
			};
		}
	};

	const beginEditMonthly = (idx) => {
		const rec = existingMonthly[idx];
		if (!rec) return;
		const selection = prefillMonthlyFromRecord(rec);
		if (!selection) return;
		setEditingMonthlyIndex(idx);
		setEditingMonthlySnapshot({
			selection,
			window: {
				monthName: rec.monthName,
				monthFrom: rec.monthFrom,
				monthTo: rec.monthTo,
				monthFromHijri: rec.monthFromHijri,
				monthToHijri: rec.monthToHijri,
			},
		});
	};

	const cancelEditMonthly = () => {
		setEditingMonthlyIndex(-1);
		setEditingMonthlySnapshot(null);
		monthlyForm.resetFields();
	};

	const deleteMonthly = (idx) => {
		const rec = existingMonthly[idx];
		Modal.confirm({
			title: isArabic ? "تأكيد الحذف" : "Confirm Delete",
			content: isArabic
				? `هل تريد حذف تسعير الشهر "${rec?.monthName}"؟`
				: `Delete monthly pricing "${rec?.monthName}"?`,
			okText: isArabic ? "حذف" : "Delete",
			cancelText: isArabic ? "إلغاء" : "Cancel",
			okButtonProps: { danger: true },
			onOk: () => {
				ensureRoomEntryAndUpdateById((room) => {
					const monthly = [...(room.monthly || [])];
					monthly.splice(idx, 1);
					return { ...room, monthly };
				});
				message.success(isArabic ? "تم الحذف" : "Deleted");
				cancelEditMonthly();
			},
		});
	};

	const onAddOrUpdateMonthly = (values) => {
		const { monthPrice, monthRootPrice } = values;

		let monthName = "";
		let monthFrom = null;
		let monthTo = null;
		let monthFromHijri = "";
		let monthToHijri = "";
		const currentSelection =
			calendarType === "hijri"
				? { calendarType, year: hijriYear, month: hijriMonth }
				: { calendarType, year: gregYear, month: gregMonth };
		const preserveStoredWindow =
			editingMonthlyIndex > -1 &&
			isSameMonthlyPackageSelection(
				editingMonthlySnapshot?.selection,
				currentSelection
			);

		if (preserveStoredWindow) {
			({
				monthName,
				monthFrom,
				monthTo,
				monthFromHijri,
				monthToHijri,
			} = editingMonthlySnapshot.window);
		} else if (calendarType === "gregorian") {
			monthName = monthLabelsGreg[gregMonth] + " " + gregYear;
			const range = getGregorianMonthRange(gregYear, gregMonth);
			monthFrom = range.from;
			monthTo = range.to;

			const hijriStart = moment(monthFrom);
			const hijriEnd = moment(monthTo);
			monthFromHijri = supportsHijri ? hijriStart.format("iYYYY-iMM-iDD") : "";
			monthToHijri = supportsHijri ? hijriEnd.format("iYYYY-iMM-iDD") : "";
		} else {
			if (!supportsHijri) {
				message.error(
					isArabic
						? "دعم التقويم الهجري غير متوفر"
						: "Hijri calendar support is unavailable."
				);
				return;
			}
			monthName = monthLabelsHijri[hijriMonth] + " " + hijriYear;

			const range = getHijriMonthRange(hijriYear, hijriMonth);
			monthFromHijri = range.fromHijri;
			monthToHijri = range.toHijri;
			monthFrom = range.from;
			monthTo = range.to;
		}

		const policy = classifyFixedPackage(
			{
				type: "monthly",
				from: monthFrom,
				to: monthTo,
				total: monthPrice,
				rootTotal: monthRootPrice,
			},
			saudiTodayKey
		);
		if (!policy.eligible) {
			message.error(
				isArabic
					? "يجب أن تبدأ الباقة الشهرية الكاملة اليوم أو في المستقبل، وأن يكون سعرها صالحًا"
					: "A full monthly package must start today or later and have a positive total."
			);
			return;
		}

		ensureRoomEntryAndUpdateById((room) => {
			const monthly = Array.isArray(room.monthly) ? [...room.monthly] : [];
			const previousRecord =
				editingMonthlyIndex > -1 ? monthly[editingMonthlyIndex] || {} : {};
			const record = {
				...previousRecord,
				monthName,
				monthFrom,
				monthTo,
				monthFromHijri,
				monthToHijri,
				monthPrice: Number(monthPrice),
				monthRootPrice:
					monthRootPrice !== undefined && monthRootPrice !== null
						? Number(monthRootPrice)
						: undefined,
			};

			if (editingMonthlyIndex > -1) {
				monthly[editingMonthlyIndex] = record;
			} else {
				monthly.push(record);
			}
			return { ...room, monthly };
		});

		cancelEditMonthly();
		message.success(isArabic ? "تم الحفظ" : "Saved");
	};

	const renderOffersTable = (entries, showStatus = false) => (
		<MiniTable role='table' $columns={showStatus ? 7 : 6}>
			<div className='thead'>
				<div>{isArabic ? "الاسم" : "Name"}</div>
				<div>{isArabic ? "من" : "From"}</div>
				<div>{isArabic ? "إلى" : "To"}</div>
				<div>{isArabic ? "إجمالي العرض" : "Guest Offer Total"}</div>
				<div>{isArabic ? "إجمالي التكلفة" : "Internal Root Total"}</div>
				{showStatus && <div>{isArabic ? "الحالة" : "Status"}</div>}
				<div style={{ textAlign: "center" }}>
					{isArabic ? "إجراءات" : "Actions"}
				</div>
			</div>
			{entries.map(({ row: offer, sourceIndex, status }) => (
				<div
					className='trow'
					key={packageRowKey("offer", offer, sourceIndex)}
				>
					<div>{offer.offerName}</div>
					<div>{canonicalPackageDateKey(offer.offerFrom) || "-"}</div>
					<div>{canonicalPackageDateKey(offer.offerTo) || "-"}</div>
					<div>{offer.offerPrice}</div>
					<div>{offer.offerRootPrice ?? "-"}</div>
					{showStatus && (
						<StatusText>{unavailableStatusLabel(status, isArabic)}</StatusText>
					)}
					<ActionsCell>
						<Button
							size='small'
							onClick={() => beginEditOffer(sourceIndex)}
							icon={<EditOutlined />}
						>
							{isArabic ? "تعديل" : "Edit"}
						</Button>
						<Button
							size='small'
							danger
							onClick={() => deleteOffer(sourceIndex)}
							icon={<DeleteOutlined />}
						>
							{isArabic ? "حذف" : "Delete"}
						</Button>
					</ActionsCell>
				</div>
			))}
		</MiniTable>
	);

	const renderMonthlyTable = (entries, showStatus = false) => (
		<MiniTable role='table' $columns={showStatus ? 9 : 8}>
			<div className='thead'>
				<div>{isArabic ? "الشهر" : "Month"}</div>
				<div>{isArabic ? "من" : "From (G)"}</div>
				<div>{isArabic ? "إلى" : "To (G)"}</div>
				<div>{isArabic ? "من (هـ)" : "From (H)"}</div>
				<div>{isArabic ? "إلى (هـ)" : "To (H)"}</div>
				<div>{isArabic ? "إجمالي الباقة" : "Guest Package Total"}</div>
				<div>{isArabic ? "إجمالي التكلفة" : "Internal Root Total"}</div>
				{showStatus && <div>{isArabic ? "الحالة" : "Status"}</div>}
				<div style={{ textAlign: "center" }}>
					{isArabic ? "إجراءات" : "Actions"}
				</div>
			</div>
			{entries.map(({ row: monthly, sourceIndex, status }) => (
				<div
					className='trow'
					key={packageRowKey("monthly", monthly, sourceIndex)}
				>
					<div>{monthly.monthName}</div>
					<div>{canonicalPackageDateKey(monthly.monthFrom) || "-"}</div>
					<div>{canonicalPackageDateKey(monthly.monthTo) || "-"}</div>
					<div>{monthly.monthFromHijri || "-"}</div>
					<div>{monthly.monthToHijri || "-"}</div>
					<div>{monthly.monthPrice}</div>
					<div>{monthly.monthRootPrice ?? "-"}</div>
					{showStatus && (
						<StatusText>{unavailableStatusLabel(status, isArabic)}</StatusText>
					)}
					<ActionsCell>
						<Button
							size='small'
							onClick={() => beginEditMonthly(sourceIndex)}
							icon={<EditOutlined />}
						>
							{isArabic ? "تعديل" : "Edit"}
						</Button>
						<Button
							size='small'
							danger
							onClick={() => deleteMonthly(sourceIndex)}
							icon={<DeleteOutlined />}
						>
							{isArabic ? "حذف" : "Delete"}
						</Button>
					</ActionsCell>
				</div>
			))}
		</MiniTable>
	);

	const isHijriSelectionEligible = (year, month) => {
		if (!supportsHijri) return false;
		const range = getHijriMonthRange(year, month);
		return classifyFixedPackage(
			{ type: "monthly", from: range.from, to: range.to, total: 1 },
			saudiTodayKey
		).eligible;
	};

	return (
		<Wrapper
			isArabic={isArabic}
			dir={isArabic ? "rtl" : "ltr"}
			onKeyDown={preventEnterSubmit}
		>
			<RoomHeader>
				{isArabic ? "الغرفة:" : "Room:"}{" "}
				<strong>
					{roomDisplayName || (isArabic ? "(غير محدد)" : "(unset)")}
				</strong>
			</RoomHeader>

			{mode === "Offers" ? (
				<section>
					<SectionTitle>
						{isArabic ? "عروض الباقات الكاملة" : "Fixed Package Offers"}
					</SectionTitle>
					<PackageHint>
						{isArabic
							? "كل صف عرض كامل مستقل بسعر إجمالي ثابت، ولا يمكن تقصير مدته."
							: "Each row is one independent full package with a fixed total and cannot be shortened."}
					</PackageHint>

					{/* No nested <form>: component={false} */}
					<Form
						form={offersForm}
						layout='vertical'
						onFinish={handleAddOrUpdateOffer}
						component={false}
					>
						<Form.Item
							name='offerName'
							label={isArabic ? "اسم العرض" : "Offer Name"}
							rules={[
								{ required: true, message: isArabic ? "مطلوب" : "Required" },
							]}
						>
							<Input
								placeholder={
									isArabic
										? "مثال: خصم نهاية الأسبوع"
										: "e.g., Weekend Discount"
								}
							/>
						</Form.Item>

						<Form.Item label={isArabic ? "المدة" : "Date Range"} required>
							<DatePicker
								selected={offerRange[0]}
								onChange={(dates) => setOfferRange(dates || [null, null])}
								startDate={offerRange[0]}
								endDate={offerRange[1]}
								selectsRange
								minDate={minSelectableDate}
								className='w-100'
								placeholderText={isArabic ? "اختر المدة" : "Select range"}
							/>
						</Form.Item>

						<Columns>
							<Form.Item
								name='offerPrice'
								label={isArabic ? "إجمالي العرض للضيف" : "Guest Offer Total"}
								rules={[
									{ required: true, message: isArabic ? "مطلوب" : "Required" },
								]}
							>
								<InputNumber
									min={0.01}
									style={{ width: "100%" }}
									placeholder='0'
								/>
							</Form.Item>

							<Form.Item
								name='offerRootPrice'
								label={
									isArabic ? "إجمالي التكلفة الداخلية" : "Internal Root Total"
								}
							>
								<InputNumber
									min={0}
									style={{ width: "100%" }}
									placeholder='0'
								/>
							</Form.Item>
						</Columns>

						<div style={{ display: "flex", gap: 8 }}>
							<Button
								type='primary'
								htmlType='button'
								onClick={() => offersForm.submit()}
							>
								{editingOfferIndex > -1
									? isArabic
										? "تحديث"
										: "Update"
									: isArabic
									  ? "حفظ العرض"
									  : "Save Offer"}
							</Button>
							{editingOfferIndex > -1 && (
								<Button htmlType='button' onClick={cancelEditOffer}>
									{isArabic ? "إلغاء" : "Cancel"}
								</Button>
							)}
						</div>
					</Form>

					<Divider />

					<h4>{isArabic ? "العروض القادمة" : "Upcoming Offers"}</h4>
					{offerRows.active.length === 0 ? (
						<Muted>{isArabic ? "لا توجد عروض قادمة" : "No upcoming offers"}</Muted>
					) : (
						renderOffersTable(offerRows.active)
					)}
					{offerRows.history.length > 0 && (
						<HistoryDetails>
							<summary>
								{isArabic
									? `السجل غير المتاح (${offerRows.history.length})`
									: `Unavailable history (${offerRows.history.length})`}
							</summary>
							<HistoryNote>
								{isArabic
									? "هذه العروض منتهية أو بدأت بالفعل ولن تكون قابلة للحجز."
									: "These offers are expired, already started, or invalid and are never selectable for booking."}
							</HistoryNote>
							{renderOffersTable(offerRows.history, true)}
						</HistoryDetails>
					)}
				</section>
			) : (
				<section>
					<SectionTitle>
						{isArabic ? "عروض الباقات الشهرية" : "Monthly Package Offers"}
					</SectionTitle>
					<PackageHint>
						{isArabic
							? "كل صف باقة شهرية كاملة مستقلة بسعر إجمالي ثابت، ولا يمكن تقصير مدتها."
							: "Each row is one independent full-month package with a fixed total and cannot be shortened."}
					</PackageHint>

					<Radio.Group
						value={calendarType}
						onChange={(e) => {
							const val = e.target.value;
							if (val === "hijri" && !supportsHijri) {
								message.error(
									isArabic
										? "دعم التقويم الهجري غير متوفر"
										: "Hijri support is unavailable."
								);
								return;
							}
							setCalendarType(val);
						}}
						style={{ marginBottom: 12 }}
					>
						<Radio value='gregorian'>
							{isArabic ? "ميلادي" : "Gregorian (Western)"}
						</Radio>
						<Radio value='hijri' disabled={!supportsHijri}>
							{isArabic ? "هجري" : "Hijri"}
						</Radio>
					</Radio.Group>

					{/* No nested <form> */}
					<Form
						form={monthlyForm}
						layout='vertical'
						onFinish={onAddOrUpdateMonthly}
						component={false}
					>
						{calendarType === "gregorian" ? (
							<Columns>
								<Form.Item label={isArabic ? "الشهر" : "Month"} required>
									<Select
										value={gregMonth}
										onChange={(v) => setGregMonth(Number(v))}
									>
										{monthLabelsGreg.map((m, idx) => (
										<Option
											key={idx}
											value={idx}
											disabled={
												!isGregorianMonthEligible(
													gregYear,
													idx,
													saudiTodayKey
												)
											}
										>
												{m}
											</Option>
										))}
									</Select>
								</Form.Item>
								<Form.Item label={isArabic ? "السنة" : "Year"} required>
									<InputNumber
									min={Number(saudiTodayKey.slice(0, 4))}
									max={maximumPackageStartYear}
										value={gregYear}
										onChange={(val) =>
										setGregYear(Number(val) || defaultGregorian.year)
										}
										style={{ width: "100%" }}
									/>
								</Form.Item>
							</Columns>
						) : (
							<Columns>
								<Form.Item
									label={isArabic ? "الشهر الهجري" : "Hijri Month"}
									required
								>
									<Select
										value={hijriMonth}
										onChange={(v) => setHijriMonth(Number(v))}
									>
										{monthLabelsHijri.map((m, idx) => (
										<Option
											key={idx}
											value={idx}
											disabled={!isHijriSelectionEligible(hijriYear, idx)}
										>
												{m}
											</Option>
										))}
									</Select>
								</Form.Item>
								<Form.Item
									label={isArabic ? "السنة الهجرية" : "Hijri Year"}
									required
								>
									<InputNumber
									min={defaultHijri.year}
									max={maximumHijriStartYear}
										value={hijriYear}
										onChange={(val) =>
											setHijriYear(
												Number(val) ||
													(supportsHijri
												? defaultHijri.year
												: defaultGregorian.year)
											)
										}
										style={{ width: "100%" }}
									/>
								</Form.Item>
							</Columns>
						)}

						<Columns>
							<Form.Item
								name='monthPrice'
								label={isArabic ? "إجمالي الباقة للضيف" : "Guest Package Total"}
								rules={[
									{ required: true, message: isArabic ? "مطلوب" : "Required" },
								]}
							>
								<InputNumber min={0.01} style={{ width: "100%" }} />
							</Form.Item>
							<Form.Item
								name='monthRootPrice'
								label={
									isArabic ? "إجمالي التكلفة الداخلية" : "Internal Root Total"
								}
							>
								<InputNumber min={0} style={{ width: "100%" }} />
							</Form.Item>
						</Columns>

						<div style={{ display: "flex", gap: 8 }}>
							<Button
								type='primary'
								htmlType='button'
								onClick={() => monthlyForm.submit()}
							>
								{editingMonthlyIndex > -1
									? isArabic
										? "تحديث"
										: "Update"
									: isArabic
									  ? "حفظ"
									  : "Save"}
							</Button>
							{editingMonthlyIndex > -1 && (
								<Button htmlType='button' onClick={cancelEditMonthly}>
									{isArabic ? "إلغاء" : "Cancel"}
								</Button>
							)}
						</div>
					</Form>

					<Divider />

					<h4>{isArabic ? "الباقات الشهرية القادمة" : "Upcoming Monthly Packages"}</h4>
					{monthlyRows.active.length === 0 ? (
						<Muted>
							{isArabic ? "لا توجد باقات قادمة" : "No upcoming monthly packages"}
						</Muted>
					) : (
						renderMonthlyTable(monthlyRows.active)
					)}
					{monthlyRows.history.length > 0 && (
						<HistoryDetails>
							<summary>
								{isArabic
									? `السجل غير المتاح (${monthlyRows.history.length})`
									: `Unavailable history (${monthlyRows.history.length})`}
							</summary>
							<HistoryNote>
								{isArabic
									? "هذه الباقات منتهية أو بدأت بالفعل ولن تكون قابلة للحجز."
									: "These packages are expired, already started, or invalid and are never selectable for booking."}
							</HistoryNote>
							{renderMonthlyTable(monthlyRows.history, true)}
						</HistoryDetails>
					)}
				</section>
			)}
		</Wrapper>
	);
}

export default ZUpdateOffersMonthly;

const Wrapper = styled.div`
	.w-100 {
		width: 100%;
	}
`;

const RoomHeader = styled.div`
	font-weight: 600;
	margin-bottom: 10px;
`;

const SectionTitle = styled.h3`
	font-size: 1.2rem;
	font-weight: 700;
	margin-bottom: 4px;
`;

const PackageHint = styled.p`
	margin: 0 0 14px;
	color: #4f5b67;
`;

const Columns = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
	@media (max-width: 768px) {
		grid-template-columns: 1fr;
	}
`;

const MiniTable = styled.div`
	border: 1px solid #ddd;
	border-radius: 8px;
	overflow-x: auto;

	.thead,
	.trow {
		display: grid;
		grid-template-columns: repeat(
			${({ $columns = 6 }) => $columns},
			minmax(120px, 1fr)
		);
		min-width: ${({ $columns = 6 }) => $columns * 130}px;
		gap: 8px;
		padding: 8px 10px;
		align-items: center;
	}
	.thead {
		background: #f6f6f6;
		font-weight: 600;
	}
	.trow:nth-child(odd) {
		background: #fafafa;
	}
`;

const Muted = styled.div`
	color: #666;
`;

const HistoryDetails = styled.details`
	margin-top: 18px;

	summary {
		cursor: pointer;
		font-weight: 700;
		color: #6b4b00;
		margin-bottom: 8px;
	}
`;

const HistoryNote = styled.p`
	color: #7a5b10;
	margin: 0 0 10px;
`;

const StatusText = styled.div`
	color: #a23b00;
	font-weight: 600;
`;

const ActionsCell = styled.div`
	display: flex;
	justify-content: center;
	gap: 6px;
`;
