import React, { forwardRef, useEffect, useMemo, useState } from "react";
import moment from "moment";
import styled from "styled-components";
import { QRCodeCanvas } from "qrcode.react";
import { Input, Modal } from "antd";
import { updateSingleReservation } from "../apiAdmin";
import websiteLogo from "../../GeneralImages/websiteLogo.png";

const safeNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const toCents = (value) => Math.round(safeNumber(value) * 100);

const formatDateShort = (value) => {
	if (!value) return "N/A";
	const parsed = moment(value);
	return parsed.isValid() ? parsed.format("DD-MMM-YY") : "N/A";
};

const calculateNights = (checkin, checkout) => {
	const start = moment(checkin).startOf("day");
	const end = moment(checkout).startOf("day");
	if (!start.isValid() || !end.isValid()) return 1;
	const diff = end.diff(start, "days");
	return diff > 0 ? diff : 1;
};

const formatSar = (value) => {
	const numeric = safeNumber(value);
	if (Number.isInteger(numeric)) return numeric.toString();
	return numeric.toFixed(2);
};

const getBreakdownTotal = (breakdown = {}) => {
	const keys = [
		"paid_online_via_link",
		"paid_online_via_instapay",
		"paid_no_show",
		"paid_at_hotel_cash",
		"paid_at_hotel_card",
		"paid_to_zad",
		"paid_online_jannatbooking",
		"paid_online_other_platforms",
	];

	return keys.reduce((sum, key) => sum + safeNumber(breakdown?.[key]), 0);
};

const splitBookingSource = (source) => {
	const normalized = String(source || "")
		.replace(/_/g, " ")
		.trim();

	if (!normalized) return ["Jannat", ""];

	if (normalized.includes("-")) {
		const [left, ...right] = normalized.split("-");
		return [`${left.trim()}-`, right.join("-").trim()];
	}

	if (normalized.includes("/")) {
		const [left, ...right] = normalized.split("/");
		return [`${left.trim()}/`, right.join("/").trim()];
	}

	if (normalized.length <= 10) return [normalized, ""];

	const middle = Math.ceil(normalized.length / 2);
	return [normalized.slice(0, middle).trim(), normalized.slice(middle).trim()];
};

const normalizeRoomTypeLabel = (value) =>
	String(value || "")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_]+/g, " ")
		.replace(/\s*-\s*/g, " - ")
		.replace(/\s+/g, " ")
		.trim();

const titleCase = (value) =>
	String(value || "")
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());

const getRoomTypePreset = (value) => {
	const token = normalizeRoomTypeLabel(value).toLowerCase();
	if (!token) return null;
	if (token.includes("quad")) return { label: "Quad Room", beds: 4 };
	if (token.includes("triple")) return { label: "Triple Room", beds: 3 };
	if (token.includes("double")) return { label: "Double Room", beds: 2 };
	if (token.includes("family")) return { label: "Family Room", beds: 5 };
	return { label: null, beds: 1 };
};

const getPrimaryRoomData = (reservation) => {
	const firstPicked = Array.isArray(reservation?.pickedRoomsType)
		? reservation.pickedRoomsType[0] || {}
		: {};
	const firstDetails = Array.isArray(reservation?.roomDetails)
		? reservation.roomDetails[0] || {}
		: {};

	const rawRoomType =
		firstPicked.room_type ||
		firstPicked.roomType ||
		firstDetails.room_type ||
		firstDetails.roomType ||
		"";

	return {
		firstPicked,
		firstDetails,
		rawRoomType,
		normalizedRoomType: normalizeRoomTypeLabel(rawRoomType),
	};
};

const resolveRoomType = (reservation) => {
	const { firstPicked, firstDetails, normalizedRoomType } =
		getPrimaryRoomData(reservation);
	const roomTypePreset = getRoomTypePreset(normalizedRoomType);

	const english =
		roomTypePreset?.label ||
		(normalizedRoomType ? titleCase(normalizedRoomType) : "") ||
		firstPicked.displayName ||
		firstDetails.displayName ||
		"N/A";

	const arabic =
		firstPicked.room_type_ar ||
		firstPicked.roomTypeArabic ||
		firstDetails.room_type_ar ||
		firstDetails.roomTypeArabic ||
		roomTypePreset?.label ||
		(normalizedRoomType ? titleCase(normalizedRoomType) : "") ||
		firstPicked.displayName_OtherLanguage ||
		firstDetails.displayName_OtherLanguage ||
		english;

	return { english, arabic };
};

const resolveBedCount = (reservation) => {
	const { normalizedRoomType } = getPrimaryRoomData(reservation);
	const roomTypePreset = getRoomTypePreset(normalizedRoomType);
	return roomTypePreset?.beds || 1;
};

const resolveRoomQuantity = (reservation) => {
	if (!Array.isArray(reservation?.pickedRoomsType)) {
		return Math.max(safeNumber(reservation?.total_rooms), 1);
	}

	const qty = reservation.pickedRoomsType.reduce(
		(sum, room) => sum + Math.max(safeNumber(room?.count), 0),
		0,
	);

	return qty > 0 ? qty : Math.max(safeNumber(reservation?.total_rooms), 1);
};

const AlDawleya = forwardRef(({ reservation, hotelDetails }, ref) => {
	const defaultFooterLogo = websiteLogo;
	const [footerLogoSrc, setFooterLogoSrc] = useState(defaultFooterLogo);
	const bookingNumber =
		reservation?.confirmation_number ||
		reservation?.customer_details?.confirmation_number ||
		"N/A";

	const invoiceDate = moment().format("DD-MMM-YY");
	const arrivalDate = formatDateShort(reservation?.checkin_date);
	const departureDate = formatDateShort(reservation?.checkout_date);
	const nights = calculateNights(
		reservation?.checkin_date,
		reservation?.checkout_date,
	);

	const guestName =
		reservation?.customer_details?.fullName ||
		reservation?.customer_details?.name ||
		"N/A";

	const reservationTotalAmount = safeNumber(reservation?.total_amount);
	const paidAmountRaw = safeNumber(reservation?.paid_amount);
	const breakdownTotal = getBreakdownTotal(reservation?.paid_amount_breakdown);
	const onsitePaid = safeNumber(
		reservation?.payment_details?.onsite_paid_amount,
	);
	const resolvedPaidAmount =
		paidAmountRaw > 0 ? paidAmountRaw : breakdownTotal + onsitePaid;
	const [totalAmount, setTotalAmount] = useState(reservationTotalAmount);
	const [paidAmountDisplay, setPaidAmountDisplay] =
		useState(resolvedPaidAmount);
	const [amountsModalOpen, setAmountsModalOpen] = useState(false);
	const [amountsDraft, setAmountsDraft] = useState({
		total: String(reservationTotalAmount),
		paid: String(resolvedPaidAmount),
	});

	useEffect(() => {
		setTotalAmount(reservationTotalAmount);
		setPaidAmountDisplay(resolvedPaidAmount);
		setAmountsDraft({
			total: String(reservationTotalAmount),
			paid: String(resolvedPaidAmount),
		});
	}, [reservation?._id, reservationTotalAmount, resolvedPaidAmount]);

	const amountLeft = Math.max(totalAmount - paidAmountDisplay, 0);

	const isFullyPaidByRule =
		totalAmount > 0 && toCents(paidAmountDisplay) >= toCents(totalAmount);

	let paymentMethodText = "Not Paid غير مدفوع";
	if (paidAmountDisplay > 0 && onsitePaid > 0 && paidAmountRaw <= 0) {
		paymentMethodText = "Paid at Hotel تم الدفع في الفندق";
	} else if (paidAmountDisplay > 0) {
		paymentMethodText = "Paid on Platform تم الدفع بالمنصة";
	}

	const { english: roomTypeLabel } = resolveRoomType(reservation);
	const bedCount = resolveBedCount(reservation);
	const roomQuantity = resolveRoomQuantity(reservation);
	const guests = Math.max(safeNumber(reservation?.total_guests), 1);
	const [bookingSourceLineOne, bookingSourceLineTwo] = splitBookingSource(
		reservation?.booking_source || "Jannat",
	);

	const hotelNameArabic =
		hotelDetails?.hotelName_OtherLanguage || "فندق زاد الرحاب";
	const hotelNameEnglish = String(
		hotelDetails?.hotelName ||
			reservation?.hotelId?.hotelName ||
			"ZAD AL-REHAB",
	).toUpperCase();
	const initialHotelLicense = useMemo(
		() =>
			reservation?.supplierData?.hotelLicenseNo ||
			reservation?.supplierData?.licenseNumber ||
			reservation?.hotelId?.licenseNumber ||
			hotelDetails?.licenseNumber ||
			hotelDetails?.hotelLicense ||
			hotelDetails?.registrationNo ||
			hotelDetails?.registrationNumber ||
			hotelDetails?.commercialRegistration ||
			"1008934",
		[
			reservation?.supplierData?.hotelLicenseNo,
			reservation?.supplierData?.licenseNumber,
			reservation?.hotelId?.licenseNumber,
			hotelDetails?.licenseNumber,
			hotelDetails?.hotelLicense,
			hotelDetails?.registrationNo,
			hotelDetails?.registrationNumber,
			hotelDetails?.commercialRegistration,
		],
	);
	const [hotelLicense, setHotelLicense] = useState(initialHotelLicense);
	const [licenseModalOpen, setLicenseModalOpen] = useState(false);
	const [licenseDraft, setLicenseDraft] = useState(initialHotelLicense);
	const [isSavingLicense, setIsSavingLicense] = useState(false);

	useEffect(() => {
		setHotelLicense(initialHotelLicense);
		setLicenseDraft(initialHotelLicense);
	}, [initialHotelLicense, reservation?._id]);

	const openLicenseModal = () => {
		setLicenseDraft(hotelLicense || "");
		setLicenseModalOpen(true);
	};

	const handleSaveLicense = async () => {
		const nextValue = String(licenseDraft || "").trim();
		setIsSavingLicense(true);
		try {
			if (reservation?._id) {
				const updateData = {
					supplierData: {
						...(reservation?.supplierData || {}),
						hotelLicenseNo: nextValue,
						licenseNumber: nextValue,
					},
					sendEmail: false,
				};
				const resp = await updateSingleReservation(reservation._id, updateData);
				if (resp?.error) {
					console.error(resp.error);
					return;
				}
			}

			setHotelLicense(nextValue || "1008934");
			setLicenseModalOpen(false);
		} finally {
			setIsSavingLicense(false);
		}
	};

	const openAmountsModal = () => {
		setAmountsDraft({
			total: String(totalAmount),
			paid: String(paidAmountDisplay),
		});
		setAmountsModalOpen(true);
	};

	const handleSaveAmounts = () => {
		const nextTotal = Math.max(safeNumber(amountsDraft.total), 0);
		const nextPaid = Math.max(safeNumber(amountsDraft.paid), 0);
		setTotalAmount(nextTotal);
		setPaidAmountDisplay(nextPaid);
		setAmountsModalOpen(false);
	};

	return (
		<CanvasWrap>
			<Page ref={ref}>
				{isFullyPaidByRule ? (
					<>
						<div className='watermark'>Paid</div>
						<div className='watermark-sub'>Paid on Platform</div>
					</>
				) : null}

				<div className='top-row'>
					<div className='contact-block'>
						<div>Tel: +966 546745729</div>
						<div>+1 (909) 222-3374</div>
						<div>support@jannatbooking.com</div>
						<div>PO BOX 2219 - Zip Code 7721</div>
						<div>Kinedom Of Saudi Arabia. Mekkah.</div>
					</div>

					<div className='brand-block'>
						<div className='brand-ar'>جنات للحجز الفندقي</div>
						<div className='brand-en'>Jannat Booking LLC.</div>
						<div className='brand-ar-small'>
							المنظومة العالمية للخدمات السياحية
						</div>
					</div>
				</div>

				<div className='id-row'>
					<div className='booking-id-box'>
						<div className='booking-id-value'>{bookingNumber}</div>
						<div className='booking-id-label'>رقم الحجز</div>
					</div>

					<div className='hotel-id-box'>
						<div className='hotel-id-ar'>{hotelNameArabic}</div>
						<div className='hotel-id-en'>{hotelNameEnglish}</div>
						<div className='hotel-license-line'>
							<span
								className='license-value-clickable'
								onClick={openLicenseModal}
								title='Click to edit license number'
							>
								{hotelLicense}
							</span>
							<span>ترخيص رقم</span>
						</div>
					</div>
				</div>

				<div className='heading-area'>
					<div className='heading-ar'>بيان تأكيد حجز فندق</div>
					<div className='heading-en'>Booking Confirmation</div>
				</div>

				<div className='content-grid'>
					<div className='left-col'>
						<table className='date-table'>
							<thead>
								<tr>
									<th>Departure Date</th>
									<th>ArrivalDate</th>
									<th>Nights</th>
								</tr>
							</thead>
							<tbody>
								<tr className='label-row'>
									<td>تاريخ المغادرة</td>
									<td>تاريخ الوصول</td>
									<td>عدد الليالي</td>
								</tr>
								<tr className='value-row'>
									<td>{departureDate}</td>
									<td>{arrivalDate}</td>
									<td>{nights}</td>
								</tr>
							</tbody>
						</table>

						<table className='payment-table'>
							<tbody>
								<tr>
									<td>
										<div className='en'>Payment Method</div>
										<div className='ar'>طريقة الدفع</div>
									</td>
								</tr>
								<tr>
									<td className='payment-value'>{paymentMethodText}</td>
								</tr>
							</tbody>
						</table>

						<table className='amount-table'>
							<tbody>
								<tr>
									<td
										className='money money-clickable'
										onClick={openAmountsModal}
										title='Click to edit total and paid amounts'
									>
										SAR {formatSar(totalAmount)}
									</td>
									<td className='desc'>
										<div>Total Price</div>
										<div>إجمالي السعر</div>
									</td>
								</tr>
								<tr>
									<td
										className='money money-clickable'
										onClick={openAmountsModal}
										title='Click to edit total and paid amounts'
									>
										SAR {formatSar(paidAmountDisplay)}
									</td>
									<td className='desc'>
										<div>Paid</div>
										<div>مدفوع</div>
									</td>
								</tr>
								<tr>
									<td className='money'>SAR {formatSar(amountLeft)}</td>
									<td className='desc'>
										<div>Amount</div>
										<div>باقي</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<div className='right-col'>
						<div className='invoice-date-row'>
							<div className='invoice-date-value'>{invoiceDate}</div>
							<div className='invoice-date-label'>تاريخ الفاتورة</div>
						</div>

						<div className='guest-box'>
							<div className='guest-name'>{guestName}</div>
							<div className='guest-label'>
								<div>Guest Name</div>
								<div>اسم النزيل</div>
							</div>
						</div>

						<table className='meta-table'>
							<tbody>
								<tr>
									<td className='left'>
										{bedCount} {bedCount === 1 ? "Bed" : "Beds"}
									</td>
									<td
										className='middle'
										style={{ textTransform: "capitalize" }}
									>
										{roomTypeLabel}
									</td>
									<td className='right'>
										<div>Room Type</div>
										<div>نوع الغرفة</div>
									</td>
								</tr>
								<tr>
									<td className='left'>{guests}</td>
									<td className='middle'></td>
									<td className='right'>
										<div>Guests</div>
										<div>النزلاء</div>
									</td>
								</tr>
								<tr>
									<td className='left'>{roomQuantity}</td>
									<td className='middle'></td>
									<td className='right'>
										<div>Room Quantity</div>
										<div>عدد الغرف</div>
									</td>
								</tr>
								<tr>
									<td className='left booking-source'>
										<div>{bookingSourceLineOne}</div>
										{bookingSourceLineTwo ? (
											<div>{bookingSourceLineTwo}</div>
										) : null}
									</td>
									<td className='middle'></td>
									<td className='right'>
										<div>BookingSource</div>
										<div>مصدر الحجز</div>
									</td>
								</tr>
							</tbody>
						</table>

						<div className='qr-strip'>
							<div className='qr-box'>
								<QRCodeCanvas
									value='https://jannatbooking.com'
									size={74}
									fgColor='#111111'
									bgColor='#ffffff'
									level='M'
									includeMargin={false}
								/>
							</div>
						</div>
					</div>
				</div>

				<div className='instructions-area'>
					<div className='arabic-title'>تعليمات الفاتورة</div>
					<div className='arabic-text'>
						تسجيل الدخول يبدأ الساعة 12:00 ظهراً. يُرجى إبراز نسخة من هذه
						الفاتورة لموظف الاستقبال عند الوصول. تُعتبر حجوزات شهر رمضان نهائية
						وغير قابلة للإلغاء أو التعديل بعد إصدار الفاتورة. يحتفظ الفندق بالحق
						في طلب هوية سارية. في حال الدفع عبر منصة سفر إلكترونية، يجب إرفاق
						إثبات الدفع مع هذه الفاتورة عند تقديمها للجهات الرسمية مثل السفارات
						أو شركات الطيران.
					</div>

					<div className='english-title'>- Invoice Instructions</div>
					<div className='english-text'>
						Check-in starts at 12:00 PM (noon). A copy of this invoice must be
						presented at reception upon arrival. Ramadan bookings are final and
						non-refundable once the invoice is issued. The hotel reserves the
						right to request valid identification. If payment was made through
						an online travel platform, the payment confirmation must be attached
						to this invoice when presented to official authorities such as
						embassies or airline offices.
					</div>
				</div>

				<div className='footer-wrap'>
					<div className='footer-orange'>Jannatbooking.com</div>
					<div className='footer-blue'>
						<div className='footer-left'>
							<div>Makkah, KSA, Al Bdel Al Aziziya St, AL Aziziya</div>
							<div>Support@jannatbooking.com</div>
							<div>WhatsApp: +96622223374</div>
						</div>
						<div className='footer-center'>
							<div>Your Booking is Our Responsibility</div>
							<div>www.jannatbooking.com</div>
						</div>
						<div className='footer-right'>
							<img
								className='footer-logo-image'
								src={footerLogoSrc}
								alt='Jannat Booking'
								onError={(event) => {
									event.currentTarget.onerror = null;
									setFooterLogoSrc(websiteLogo);
								}}
							/>
						</div>
					</div>
				</div>
			</Page>
			<Modal
				title='Edit Hotel License'
				open={licenseModalOpen}
				onOk={handleSaveLicense}
				onCancel={() => setLicenseModalOpen(false)}
				okText='Save'
				cancelText='Cancel'
				confirmLoading={isSavingLicense}
				getContainer={() => document.body}
				wrapClassName='update-pdf-modal'
				rootClassName='update-pdf-modal'
				zIndex={13020}
				styles={{ mask: { zIndex: 13019 } }}
			>
				<Input
					value={licenseDraft}
					onChange={(event) => setLicenseDraft(event.target.value)}
					placeholder='Enter hotel license number'
				/>
			</Modal>
			<Modal
				title='Edit PDF Amounts'
				open={amountsModalOpen}
				onOk={handleSaveAmounts}
				onCancel={() => setAmountsModalOpen(false)}
				okText='Apply'
				cancelText='Cancel'
				getContainer={() => document.body}
				wrapClassName='update-pdf-modal'
				rootClassName='update-pdf-modal'
				zIndex={13020}
				styles={{ mask: { zIndex: 13019 } }}
			>
				<div className='amounts-modal-field'>
					<div className='amounts-modal-label'>Total Price (SAR)</div>
					<Input
						type='number'
						step='0.01'
						min='0'
						value={amountsDraft.total}
						onChange={(event) =>
							setAmountsDraft((prev) => ({
								...prev,
								total: event.target.value,
							}))
						}
						placeholder='Enter total amount'
					/>
				</div>
				<div className='amounts-modal-field'>
					<div className='amounts-modal-label'>Paid Amount (SAR)</div>
					<Input
						type='number'
						step='0.01'
						min='0'
						value={amountsDraft.paid}
						onChange={(event) =>
							setAmountsDraft((prev) => ({
								...prev,
								paid: event.target.value,
							}))
						}
						placeholder='Enter paid amount'
					/>
				</div>
			</Modal>
		</CanvasWrap>
	);
});

export default AlDawleya;

const CanvasWrap = styled.div`
	background: #e6e6e6;
	padding: 8px;
`;

const Page = styled.div`
	position: relative;
	background: #fff;
	border: 1px solid #cfcfcf;
	width: 760px;
	padding: 16px 20px 0;
	box-sizing: border-box;
	font-family: Arial, Helvetica, sans-serif;
	color: #000;

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.contact-block {
		font-size: 13px;
		font-weight: 700;
		line-height: 1.28;
	}

	.brand-block {
		text-align: right;
	}

	.brand-ar {
		font-size: 34px;
		font-weight: 800;
		line-height: 1;
	}

	.brand-en {
		font-size: 18px;
		font-weight: 800;
		line-height: 1;
		margin-top: 2px;
	}

	.brand-ar-small {
		font-size: 8px;
		font-weight: 700;
		margin-top: 6px;
	}

	.id-row {
		margin-top: 14px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.booking-id-box {
		width: 195px;
		height: 36px;
		border: 2px solid #2c2c2c;
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.booking-id-value,
	.booking-id-label {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 700;
	}

	.booking-id-value {
		border-right: 2px solid #2c2c2c;
	}

	.hotel-id-box {
		width: 250px;
		border: 2px solid #2c2c2c;
		text-align: center;
		padding: 5px 8px;
		box-sizing: border-box;
	}

	.hotel-id-ar {
		font-size: 20px;
		font-weight: 800;
		line-height: 1.05;
	}

	.hotel-id-en {
		font-size: 22px;
		font-weight: 800;
		line-height: 1.05;
		margin-top: 2px;
	}

	.hotel-license-line {
		display: flex;
		justify-content: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 700;
		margin-top: 2px;
	}

	.license-value-clickable {
		cursor: pointer;
		text-decoration: underline;
	}

	.heading-area {
		margin-top: 12px;
		text-align: center;
	}

	.heading-ar {
		font-size: 14px;
		font-weight: 700;
	}

	.heading-en {
		font-size: 24px;
		font-weight: 800;
		line-height: 1.06;
		margin-top: 2px;
	}

	.content-grid {
		margin-top: 10px;
		display: grid;
		grid-template-columns: 1fr 0.96fr;
		gap: 16px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	.date-table {
		border: 2px solid #2c2c2c;
	}

	.date-table th,
	.date-table td {
		border: 1px solid #2c2c2c;
		text-align: center;
	}

	.date-table th {
		font-family: "Times New Roman", serif;
		font-size: 10px;
		font-weight: 500;
		padding: 3px;
	}

	.date-table .label-row td {
		font-size: 12px;
		font-weight: 700;
		padding: 3px;
	}

	.date-table .value-row td {
		font-size: 16px;
		font-weight: 700;
		padding: 5px 4px;
	}

	.payment-table {
		margin-top: 10px;
	}

	.payment-table td {
		border: 1px solid #d1d1d1;
		background: #efefef;
		text-align: center;
		padding: 6px 5px;
	}

	.payment-table .en {
		font-size: 12px;
		font-weight: 700;
	}

	.payment-table .ar {
		font-size: 12px;
		font-weight: 700;
	}

	.payment-table .payment-value {
		font-size: 11px;
		font-weight: 700;
	}

	.amount-table {
		margin-top: 12px;
	}

	.amount-table td {
		border-top: 1px solid #4a4a4a;
		border-bottom: 1px solid #4a4a4a;
		padding: 6px 6px;
	}

	.amount-table .money {
		width: 55%;
		font-size: 16px;
		font-weight: 800;
	}

	.amount-table .money-clickable {
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.amount-table .desc {
		text-align: right;
		font-size: 11px;
		font-weight: 700;
		line-height: 1.2;
	}

	.invoice-date-row {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;
	}

	.invoice-date-value {
		font-size: 13px;
		font-weight: 700;
		line-height: 1;
	}

	.invoice-date-label {
		font-size: 12px;
		font-weight: 700;
	}

	.guest-box {
		border: 2px solid #2c2c2c;
		margin-top: 8px;
		display: grid;
		grid-template-columns: 1fr 92px;
	}

	.guest-name {
		font-size: 13px;
		font-weight: 700;
		padding: 8px 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.guest-label {
		border-left: 2px solid #2c2c2c;
		padding: 5px 6px;
		font-size: 11px;
		font-weight: 700;
		text-align: right;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.meta-table {
		border: 1px solid #2c2c2c;
		margin-top: 10px;
	}

	.meta-table td {
		border: 1px solid #2c2c2c;
		padding: 3px 5px;
	}

	.meta-table .left {
		width: 31%;
		font-size: 13px;
		font-weight: 700;
		text-align: center;
	}

	.meta-table .middle {
		width: 29%;
		font-size: 12px;
		font-weight: 700;
		text-align: center;
	}

	.meta-table .right {
		width: 40%;
		font-size: 10px;
		font-weight: 700;
		text-align: right;
		line-height: 1.1;
	}

	.meta-table .booking-source {
		font-size: 9px;
		line-height: 1.1;
	}

	.qr-strip {
		margin-top: 10px;
		padding: 10px 0;
		border-top: 1px solid #2c2c2c;
		border-bottom: 1px solid #2c2c2c;
		display: flex;
		justify-content: center;
	}

	.qr-box {
		background: #fff;
		border: 1px solid #2c2c2c;
		padding: 4px;
	}

	.instructions-area {
		margin-top: 10px;
	}

	.instructions-area .arabic-title {
		font-size: 14px;
		font-weight: 700;
		text-align: right;
	}

	.instructions-area .arabic-text {
		font-size: 12px;
		font-weight: 700;
		line-height: 1.45;
		text-align: right;
		margin-top: 3px;
	}

	.instructions-area .english-title {
		font-size: 20px;
		font-weight: 700;
		margin-top: 9px;
	}

	.instructions-area .english-text {
		font-size: 12px;
		font-weight: 700;
		line-height: 1.55;
		margin-top: 3px;
	}

	.footer-wrap {
		margin-top: 14px;
	}

	.footer-orange {
		background: #ff9e02;
		color: #fff;
		padding: 6px 10px;
		font-size: 9px;
		font-weight: 700;
	}

	.footer-blue {
		background: #056090;
		color: #fff;
		padding: 10px 10px 12px;
		display: grid;
		grid-template-columns: 1.2fr 1fr auto;
		align-items: center;
		column-gap: 8px;
	}

	.footer-left {
		font-size: 7px;
		line-height: 1.35;
	}

	.footer-center {
		text-align: center;
		font-size: 10px;
		font-weight: 700;
	}

	.footer-center div:last-child {
		font-size: 8px;
		letter-spacing: 1px;
		margin-top: 2px;
	}

	.footer-right {
		display: flex;
		justify-content: flex-end;
		align-items: flex-end;
	}

	.footer-logo-image {
		width: 125px;
		height: auto;
		display: block;
	}

	.amounts-modal-field {
		margin-bottom: 12px;
	}

	.amounts-modal-label {
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 6px;
	}

	.watermark {
		position: absolute;
		left: 50%;
		top: 73%;
		transform: translate(-50%, -50%) rotate(-13deg);
		font-size: 86px;
		font-weight: 800;
		color: rgba(90, 90, 90, 0.34);
		pointer-events: none;
		user-select: none;
	}

	.watermark-sub {
		position: absolute;
		left: 50%;
		top: 76%;
		transform: translate(-50%, -50%) rotate(-13deg);
		font-size: 16px;
		font-weight: 700;
		color: rgba(90, 90, 90, 0.34);
		pointer-events: none;
		user-select: none;
	}
`;
