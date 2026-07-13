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
	message,
} from "antd";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// Use the hijri-enabled build of moment
import moment from "moment-hijri";
import {
	canonicalPackageDateKey,
	classifyFixedPackage,
	getDefaultEligibleGregorianMonth,
	getGregorianMonthRange,
	getHijriMonthRange,
	getSaudiTodayKey,
	isGregorianMonthEligible,
	localCalendarDateKey,
	localDateFromPackageDateKey,
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

function ZOffersMonthly({
	mode = "Offers", // "Offers" | "Monthly"
	chosenLanguage,
	hotelDetails,
	setHotelDetails,
	selectedRoomType,
	customRoomType,
	form, // parent AntD form instance (used for displayName)
}) {
	const isArabic = chosenLanguage === "Arabic";
	const monthLabelsGreg = isArabic ? gregorianMonthsAr : gregorianMonthsEn;
	const monthLabelsHijri = isArabic ? hijriMonthsAr : hijriMonthsEn;
	const saudiTodayKey = getSaudiTodayKey();
	const minSelectableDate = localDateFromPackageDateKey(saudiTodayKey);
	const defaultGregorian = getDefaultEligibleGregorianMonth(saudiTodayKey);
	const maximumPackageStartYear = Number(saudiTodayKey.slice(0, 4)) + 5;

	// Hijri support guard (true when using moment-hijri)
	const supportsHijri =
		!!moment?.fn &&
		typeof moment.fn.iMonth === "function" &&
		typeof moment.fn.iYear === "function";

	// ------- target room (roomType + displayName) -------
	const roomType =
		selectedRoomType === "other" ? customRoomType : selectedRoomType;
	const displayName = form?.getFieldValue("displayName") || "";

	// two local AntD form instances (rendered without <form> tags)
	const [offersForm] = Form.useForm();
	const [monthlyForm] = Form.useForm();

	const currentRoomIndex = useMemo(() => {
		if (!hotelDetails?.roomCountDetails || !roomType || !displayName) return -1;
		return hotelDetails.roomCountDetails.findIndex(
			(r) => r.roomType === roomType && r.displayName === displayName
		);
	}, [hotelDetails, roomType, displayName]);

	const currentRoom = useMemo(() => {
		if (currentRoomIndex === -1) return null;
		return hotelDetails.roomCountDetails[currentRoomIndex] || null;
	}, [hotelDetails, currentRoomIndex]);

	const existingOffers = useMemo(() => currentRoom?.offers || [], [currentRoom]);
	const existingMonthly = useMemo(
		() => currentRoom?.monthly || [],
		[currentRoom],
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
		[existingOffers, saudiTodayKey],
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
		[existingMonthly, saudiTodayKey],
	);

	const ensureRoomEntryAndUpdate = (updater) => {
		if (!roomType || !displayName) {
			message.error(
				isArabic
					? "يرجى اختيار نوع الغرفة والاسم المعروض"
					: "Please select room type and display name"
			);
			return;
		}
		setHotelDetails((prev) => {
			const details = { ...prev };
			const list = Array.isArray(details.roomCountDetails)
				? [...details.roomCountDetails]
				: [];
			let idx = list.findIndex(
				(r) => r.roomType === roomType && r.displayName === displayName
			);
			if (idx === -1) {
				list.push({
					roomType,
					displayName,
					pricingRate: [],
					offers: [],
					monthly: [],
				});
				idx = list.length - 1;
			}
			const updated = updater({ ...list[idx] });
			list[idx] = { ...list[idx], ...updated };
			return { ...details, roomCountDetails: list };
		});
	};

	// Block Enter key from bubbling to the parent form (prevents outer submit)
	const preventEnterSubmit = useCallback((e) => {
		if (e.key === "Enter") e.preventDefault();
	}, []);

	// ============================ OFFERS ============================
	const [offerRange, setOfferRange] = useState([null, null]);

	const handleAddOffer = (values) => {
		const { offerName, offerPrice, offerRootPrice } = values;
		const [start, end] = offerRange;
		if (!start || !end) {
			message.error(
				isArabic
					? "يرجى اختيار تاريخ البداية والنهاية"
					: "Please select offer start and end dates"
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
			saudiTodayKey,
		);
		if (!policy.eligible) {
			message.error(
				isArabic
					? "يجب أن يبدأ العرض الكامل اليوم أو في المستقبل، وأن يكون له نطاق وسعر صالحان"
					: "A full offer must start today or later and have a valid range and positive total.",
			);
			return;
		}

		ensureRoomEntryAndUpdate((room) => {
			const offers = Array.isArray(room.offers) ? [...room.offers] : [];
			const record = {
				offerName,
				offerFrom,
				offerTo,
				offerPrice: Number(offerPrice),
				offerRootPrice:
					offerRootPrice !== undefined && offerRootPrice !== null
						? Number(offerRootPrice)
						: undefined,
			};
			offers.push(record);
			return { ...room, offers };
		});

		offersForm.resetFields();
		setOfferRange([null, null]);
		message.success(
			isArabic
				? "تمت إضافة/تحديث العرض بنجاح"
				: "Offer added/updated successfully"
		);
	};

	// ============================ MONTHLY ============================
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
		[maximumPackageStartYear],
	);
	const [hijriMonth, setHijriMonth] = useState(
		defaultHijri.month
	); // 0..11
	const [hijriYear, setHijriYear] = useState(defaultHijri.year);

	useEffect(() => {
		setOfferRange([null, null]);
		setCalendarType("gregorian");
		setGregMonth(defaultGregorian.month);
		setGregYear(defaultGregorian.year);
		setHijriMonth(defaultHijri.month);
		setHijriYear(defaultHijri.year);
		offersForm.resetFields();
		monthlyForm.resetFields();
	}, [
		roomType,
		displayName,
		offersForm,
		monthlyForm,
		defaultGregorian.month,
		defaultGregorian.year,
		defaultHijri.month,
		defaultHijri.year,
	]);

	const onAddMonthly = (values) => {
		const { monthPrice, monthRootPrice } = values;

		let monthName = "";
		let monthFrom = null;
		let monthTo = null;
		let monthFromHijri = "";
		let monthToHijri = "";

		if (calendarType === "gregorian") {
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
			saudiTodayKey,
		);
		if (!policy.eligible) {
			message.error(
				isArabic
					? "يجب أن تبدأ الباقة الشهرية الكاملة اليوم أو في المستقبل، وأن يكون سعرها صالحًا"
					: "A full monthly package must start today or later and have a positive total.",
			);
			return;
		}

		ensureRoomEntryAndUpdate((room) => {
			const monthly = Array.isArray(room.monthly) ? [...room.monthly] : [];
			const record = {
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
			monthly.push(record);
			return { ...room, monthly };
		});

		monthlyForm.resetFields();
		message.success(
			isArabic ? "تم حفظ التسعير الشهري بنجاح" : "Monthly pricing saved"
		);
	};

	const renderOffersTable = (entries, showStatus = false) => (
		<MiniTable role='table' $columns={showStatus ? 6 : 5}>
			<div className='thead'>
				<div>{isArabic ? "الاسم" : "Name"}</div>
				<div>{isArabic ? "من" : "From"}</div>
				<div>{isArabic ? "إلى" : "To"}</div>
				<div>{isArabic ? "إجمالي العرض" : "Guest Offer Total"}</div>
				<div>{isArabic ? "إجمالي التكلفة" : "Internal Root Total"}</div>
				{showStatus && <div>{isArabic ? "الحالة" : "Status"}</div>}
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
				</div>
			))}
		</MiniTable>
	);

	const renderMonthlyTable = (entries, showStatus = false) => (
		<MiniTable role='table' $columns={showStatus ? 8 : 7}>
			<div className='thead'>
				<div>{isArabic ? "الشهر" : "Month"}</div>
				<div>{isArabic ? "من" : "From (G)"}</div>
				<div>{isArabic ? "إلى" : "To (G)"}</div>
				<div>{isArabic ? "من (هـ)" : "From (H)"}</div>
				<div>{isArabic ? "إلى (هـ)" : "To (H)"}</div>
				<div>{isArabic ? "إجمالي الباقة" : "Guest Package Total"}</div>
				<div>{isArabic ? "إجمالي التكلفة" : "Internal Root Total"}</div>
				{showStatus && <div>{isArabic ? "الحالة" : "Status"}</div>}
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
				</div>
			))}
		</MiniTable>
	);

	const isHijriSelectionEligible = (year, month) => {
		if (!supportsHijri) return false;
		const range = getHijriMonthRange(year, month);
		return classifyFixedPackage(
			{ type: "monthly", from: range.from, to: range.to, total: 1 },
			saudiTodayKey,
		).eligible;
	};

	// --------------------------- UI ---------------------------
	return (
		<Wrapper
			isArabic={isArabic}
			dir={isArabic ? "rtl" : "ltr"}
			onKeyDown={preventEnterSubmit}
		>
			<RoomHeader>
				{isArabic ? "الغرفة:" : "Room:"}{" "}
				<strong>
					{displayName ||
						(isArabic ? "(لم يتم تحديد اسم العرض)" : "(no displayName)")}
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

					{/* component={false} avoids rendering an inner <form> element */}
					<Form
						form={offersForm}
						layout='vertical'
						onFinish={handleAddOffer}
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

						{/* Use button (not submit) and call .submit() manually */}
						<Button
							type='primary'
							htmlType='button'
							onClick={() => offersForm.submit()}
						>
							{isArabic ? "حفظ العرض" : "Save Offer"}
						</Button>
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

					{/* component={false} avoids nested <form> */}
					<Form
						form={monthlyForm}
						layout='vertical'
						onFinish={onAddMonthly}
						component={false}
					>
						{calendarType === "gregorian" ? (
							<>
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
													saudiTodayKey,
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
							</>
						) : (
							<>
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
							</>
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

						{/* Use button (not submit) and call .submit() manually */}
						<Button
							type='primary'
							htmlType='button'
							onClick={() => monthlyForm.submit()}
						>
							{isArabic ? "حفظ التسعير الشهري" : "Save Monthly Pricing"}
						</Button>
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

export default ZOffersMonthly;

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
			${({ $columns = 5 }) => $columns},
			minmax(120px, 1fr)
		);
		min-width: ${({ $columns = 5 }) => $columns * 130}px;
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
