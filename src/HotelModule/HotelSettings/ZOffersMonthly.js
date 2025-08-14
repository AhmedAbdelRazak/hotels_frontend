/** @format */
import React, { useMemo, useState, useCallback } from "react";
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

	// Hijri support guard (true when using moment-hijri)
	const supportsHijri =
		!!moment.fn &&
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

	const existingOffers = currentRoom?.offers || [];
	const existingMonthly = currentRoom?.monthly || [];

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
		const offerFrom = new Date(
			start.getFullYear(),
			start.getMonth(),
			start.getDate(),
			0,
			0,
			0
		);
		const offerTo = new Date(
			end.getFullYear(),
			end.getMonth(),
			end.getDate(),
			23,
			59,
			59
		);

		ensureRoomEntryAndUpdate((room) => {
			const offers = Array.isArray(room.offers) ? [...room.offers] : [];
			const existsIdx = offers.findIndex(
				(o) =>
					o.offerName === offerName &&
					new Date(o.offerFrom).toDateString() === offerFrom.toDateString() &&
					new Date(o.offerTo).toDateString() === offerTo.toDateString()
			);
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
			if (existsIdx > -1) {
				offers[existsIdx] = record;
			} else {
				offers.push(record);
			}
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
	const [gregMonth, setGregMonth] = useState(new Date().getMonth()); // 0..11
	const [gregYear, setGregYear] = useState(new Date().getFullYear());
	const [hijriMonth, setHijriMonth] = useState(
		supportsHijri ? moment().iMonth() : 0
	); // 0..11
	const [hijriYear, setHijriYear] = useState(
		supportsHijri ? moment().iYear() : new Date().getFullYear()
	);

	const onAddMonthly = (values) => {
		const { monthPrice, monthRootPrice } = values;

		let monthName = "";
		let monthFrom = null;
		let monthTo = null;
		let monthFromHijri = "";
		let monthToHijri = "";

		if (calendarType === "gregorian") {
			monthName = monthLabelsGreg[gregMonth] + " " + gregYear;
			const start = new Date(gregYear, gregMonth, 1);
			const end = new Date(gregYear, gregMonth + 1, 0);
			monthFrom = new Date(
				start.getFullYear(),
				start.getMonth(),
				start.getDate(),
				0,
				0,
				0
			);
			monthTo = new Date(
				end.getFullYear(),
				end.getMonth(),
				end.getDate(),
				23,
				59,
				59
			);

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

			const hStart = moment()
				.iYear(hijriYear)
				.iMonth(hijriMonth)
				.startOf("iMonth");
			const hEnd = moment().iYear(hijriYear).iMonth(hijriMonth).endOf("iMonth");

			monthFromHijri = hStart.format("iYYYY-iMM-iDD");
			monthToHijri = hEnd.format("iYYYY-iMM-iDD");

			monthFrom = hStart.toDate();
			monthTo = hEnd.toDate();
			monthFrom = new Date(
				monthFrom.getFullYear(),
				monthFrom.getMonth(),
				monthFrom.getDate(),
				0,
				0,
				0
			);
			monthTo = new Date(
				monthTo.getFullYear(),
				monthTo.getMonth(),
				monthTo.getDate(),
				23,
				59,
				59
			);
		}

		ensureRoomEntryAndUpdate((room) => {
			const monthly = Array.isArray(room.monthly) ? [...room.monthly] : [];
			const existsIdx = monthly.findIndex(
				(m) =>
					m.monthName === monthName &&
					new Date(m.monthFrom).toDateString() === monthFrom.toDateString() &&
					new Date(m.monthTo).toDateString() === monthTo.toDateString()
			);
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
			if (existsIdx > -1) {
				monthly[existsIdx] = record;
			} else {
				monthly.push(record);
			}
			return { ...room, monthly };
		});

		monthlyForm.resetFields();
		message.success(
			isArabic ? "تم حفظ التسعير الشهري بنجاح" : "Monthly pricing saved"
		);
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
					<SectionTitle>{isArabic ? "العروض" : "Offers"}</SectionTitle>

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
								className='w-100'
								placeholderText={isArabic ? "اختر المدة" : "Select range"}
							/>
						</Form.Item>

						<Columns>
							<Form.Item
								name='offerPrice'
								// label={isArabic ? "السعر المخفض" : "Offer Price"}
								label='Offer Price'
								rules={[
									{ required: true, message: isArabic ? "مطلوب" : "Required" },
								]}
							>
								<InputNumber
									min={0}
									style={{ width: "100%" }}
									placeholder='0'
								/>
							</Form.Item>

							<Form.Item
								name='offerRootPrice'
								// label={
								// 	isArabic ? "السعر الأصلي (اختياري)" : "Root Price (optional)"
								// }
								label='Root Price/ Night'
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

					<h4>{isArabic ? "العروض الحالية" : "Existing Offers"}</h4>
					{existingOffers.length === 0 ? (
						<Muted>{isArabic ? "لا توجد عروض" : "No offers yet"}</Muted>
					) : (
						<MiniTable role='table'>
							<div className='thead'>
								<div>{isArabic ? "الاسم" : "Name"}</div>
								<div>{isArabic ? "من" : "From"}</div>
								<div>{isArabic ? "إلى" : "To"}</div>
								<div>{isArabic ? "السعر" : "Price"}</div>
								<div>{isArabic ? "Root Price" : "Root Price"}</div>
							</div>
							{existingOffers.map((o, i) => (
								<div className='trow' key={i}>
									<div>{o.offerName}</div>
									<div>{new Date(o.offerFrom).toLocaleDateString()}</div>
									<div>{new Date(o.offerTo).toLocaleDateString()}</div>
									<div>{o.offerPrice}</div>
									<div>{o.offerRootPrice ?? "-"}</div>
								</div>
							))}
						</MiniTable>
					)}
				</section>
			) : (
				<section>
					<SectionTitle>
						{isArabic ? "التسعير الشهري" : "Monthly Pricing"}
					</SectionTitle>

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
												<Option key={idx} value={idx}>
													{m}
												</Option>
											))}
										</Select>
									</Form.Item>

									<Form.Item label={isArabic ? "السنة" : "Year"} required>
										<InputNumber
											min={1900}
											max={3000}
											value={gregYear}
											onChange={(val) =>
												setGregYear(Number(val) || new Date().getFullYear())
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
												<Option key={idx} value={idx}>
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
											min={1300}
											max={1600}
											value={hijriYear}
											onChange={(val) =>
												setHijriYear(
													Number(val) ||
														(supportsHijri
															? moment().iYear()
															: new Date().getFullYear())
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
								label={isArabic ? "سعر الشهر" : "Month Price"}
								rules={[
									{ required: true, message: isArabic ? "مطلوب" : "Required" },
								]}
							>
								<InputNumber min={0} style={{ width: "100%" }} />
							</Form.Item>

							<Form.Item
								name='monthRootPrice'
								// label={
								// 	isArabic ? "السعر الأصلي (اختياري)" : "Root Price (optional)"
								// }
								label='Root Price/ Month'
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

					<h4>
						{isArabic ? "التسعير الشهري الحالي" : "Existing Monthly Pricing"}
					</h4>
					{existingMonthly.length === 0 ? (
						<Muted>
							{isArabic ? "لا توجد بيانات" : "No monthly entries yet"}
						</Muted>
					) : (
						<MiniTable role='table'>
							<div className='thead'>
								<div>{isArabic ? "الشهر" : "Month"}</div>
								<div>{isArabic ? "من" : "From (G)"}</div>
								<div>{isArabic ? "إلى" : "To (G)"}</div>
								<div>{isArabic ? "من (هـ)" : "From (H)"}</div>
								<div>{isArabic ? "إلى (هـ)" : "To (H)"}</div>
								<div>{isArabic ? "السعر" : "Price"}</div>
								<div>{isArabic ? "Root" : "Root"}</div>
							</div>
							{existingMonthly.map((m, i) => (
								<div className='trow' key={i}>
									<div>{m.monthName}</div>
									<div>{new Date(m.monthFrom).toLocaleDateString()}</div>
									<div>{new Date(m.monthTo).toLocaleDateString()}</div>
									<div>{m.monthFromHijri || "-"}</div>
									<div>{m.monthToHijri || "-"}</div>
									<div>{m.monthPrice}</div>
									<div>{m.monthRootPrice ?? "-"}</div>
								</div>
							))}
						</MiniTable>
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
	margin-bottom: 10px;
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
	overflow: hidden;

	.thead,
	.trow {
		display: grid;
		grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 0.7fr 0.7fr;
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
