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
	Modal,
	message,
} from "antd";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// Use the hijri-enabled build (guarantees iMonth/iYear)
import moment from "moment-hijri";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

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

	const supportsHijri =
		!!moment.fn &&
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

	const existingOffers = currentRoom?.offers || [];
	const existingMonthly = currentRoom?.monthly || [];

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
		setOfferRange([new Date(rec.offerFrom), new Date(rec.offerTo)]);
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

		ensureRoomEntryAndUpdateById((room) => {
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
			if (editingOfferIndex > -1) {
				offers[editingOfferIndex] = record;
			} else {
				// de-dupe (by same name + exact range)
				const existsIdx = offers.findIndex(
					(o) =>
						o.offerName === offerName &&
						new Date(o.offerFrom).toDateString() === offerFrom.toDateString() &&
						new Date(o.offerTo).toDateString() === offerTo.toDateString()
				);
				if (existsIdx > -1) offers[existsIdx] = record;
				else offers.push(record);
			}
			return { ...room, offers };
		});

		cancelEditOffer();
		message.success(isArabic ? "تم الحفظ" : "Saved");
	};

	/* =========================== MONTHLY =========================== */
	const [calendarType, setCalendarType] = useState("gregorian"); // "gregorian" | "hijri"
	const [gregMonth, setGregMonth] = useState(new Date().getMonth()); // 0..11
	const [gregYear, setGregYear] = useState(new Date().getFullYear());
	const [hijriMonth, setHijriMonth] = useState(
		supportsHijri ? moment().iMonth() : 0
	); // 0..11
	const [hijriYear, setHijriYear] = useState(
		supportsHijri ? moment().iYear() : new Date().getFullYear()
	);
	const [editingMonthlyIndex, setEditingMonthlyIndex] = useState(-1);

	const prefillMonthlyFromRecord = (rec) => {
		if (!rec) return;
		// decide type: if it has Hijri fields, prefer hijri; else gregorian
		const hasHijri = !!rec.monthFromHijri || !!rec.monthToHijri;
		if (hasHijri && supportsHijri) {
			setCalendarType("hijri");
			const hStart = moment(rec.monthFrom);
			setHijriYear(hStart.iYear());
			setHijriMonth(hStart.iMonth());
			monthlyForm.setFieldsValue({
				monthPrice: rec.monthPrice,
				monthRootPrice: rec.monthRootPrice,
			});
		} else {
			setCalendarType("gregorian");
			const gStart = new Date(rec.monthFrom);
			setGregYear(gStart.getFullYear());
			setGregMonth(gStart.getMonth());
			monthlyForm.setFieldsValue({
				monthPrice: rec.monthPrice,
				monthRootPrice: rec.monthRootPrice,
			});
		}
	};

	const beginEditMonthly = (idx) => {
		const rec = existingMonthly[idx];
		if (!rec) return;
		setEditingMonthlyIndex(idx);
		prefillMonthlyFromRecord(rec);
	};

	const cancelEditMonthly = () => {
		setEditingMonthlyIndex(-1);
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

		ensureRoomEntryAndUpdateById((room) => {
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

			if (editingMonthlyIndex > -1) {
				monthly[editingMonthlyIndex] = record;
			} else {
				// de-dupe by same name + exact range
				const existsIdx = monthly.findIndex(
					(m) =>
						m.monthName === monthName &&
						new Date(m.monthFrom).toDateString() === monthFrom.toDateString() &&
						new Date(m.monthTo).toDateString() === monthTo.toDateString()
				);
				if (existsIdx > -1) monthly[existsIdx] = record;
				else monthly.push(record);
			}
			return { ...room, monthly };
		});

		cancelEditMonthly();
		message.success(isArabic ? "تم الحفظ" : "Saved");
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
					<SectionTitle>{isArabic ? "العروض" : "Offers"}</SectionTitle>

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
								className='w-100'
								placeholderText={isArabic ? "اختر المدة" : "Select range"}
							/>
						</Form.Item>

						<Columns>
							<Form.Item
								name='offerPrice'
								// label={isArabic ? "السعر المخفض" : "Offer Price"}
								label='Offer Price / Night'
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
								// 	isArabic ? "السعر الأصلي (اختياري)" : "Root Price"
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
								<div style={{ textAlign: "center" }}>
									{isArabic ? "إجراءات" : "Actions"}
								</div>
							</div>
							{existingOffers.map((o, i) => (
								<div className='trow' key={i}>
									<div>{o.offerName}</div>
									<div>{new Date(o.offerFrom).toLocaleDateString()}</div>
									<div>{new Date(o.offerTo).toLocaleDateString()}</div>
									<div>{o.offerPrice}</div>
									<div>{o.offerRootPrice ?? "-"}</div>
									<ActionsCell>
										<Button
											size='small'
											onClick={() => beginEditOffer(i)}
											icon={<EditOutlined />}
										>
											{isArabic ? "تعديل" : "Edit"}
										</Button>
										<Button
											size='small'
											danger
											onClick={() => deleteOffer(i)}
											icon={<DeleteOutlined />}
											style={{ marginInlineStart: 6 }}
										>
											{isArabic ? "حذف" : "Delete"}
										</Button>
									</ActionsCell>
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
						)}

						<Columns>
							<Form.Item
								name='monthPrice'
								// label={isArabic ? "سعر الشهر" : "Month Price"}
								label='Month Price / Month'
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
								<div>{isArabic ? "Root Price" : "Root Price"}</div>
								<div style={{ textAlign: "center" }}>
									{isArabic ? "إجراءات" : "Actions"}
								</div>
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
									<ActionsCell>
										<Button
											size='small'
											onClick={() => beginEditMonthly(i)}
											icon={<EditOutlined />}
										>
											{isArabic ? "تعديل" : "Edit"}
										</Button>
										<Button
											size='small'
											danger
											onClick={() => deleteMonthly(i)}
											icon={<DeleteOutlined />}
											style={{ marginInlineStart: 6 }}
										>
											{isArabic ? "حذف" : "Delete"}
										</Button>
									</ActionsCell>
								</div>
							))}
						</MiniTable>
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
		grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr 0.8fr 0.8fr 0.9fr;
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

const ActionsCell = styled.div`
	display: flex;
	justify-content: center;
	gap: 6px;
`;
