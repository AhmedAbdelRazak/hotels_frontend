import React, { forwardRef, useMemo } from "react";
import styled from "styled-components";
import "flag-icons/css/flag-icons.min.css";
import "@fontsource/noto-sans-arabic/arabic-400.css";
import "@fontsource/noto-sans-arabic/arabic-800.css";
import {
  buildReceiptRoomRows,
  calculateNights,
  code39Bars,
  countryCodeFromNationality,
  deriveReceiptPayment,
  displayNationality,
  formatReceiptDate,
  receiptStatus,
} from "./receiptUtils";

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const titleCase = (value) =>
  String(value || "")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const EditValue = ({ children, onClick, className = "" }) => {
  if (!onClick) return <span className={className}>{children}</span>;
  return (
    <span
      className={`receipt-edit-value ${className}`.trim()}
      role="button"
      tabIndex={0}
      title="Click to edit reservation details"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
    >
      {children}
    </span>
  );
};

const Barcode = ({ value }) => {
  const barcode = useMemo(() => code39Bars(value), [value]);
  return (
    <svg
      className="receipt-barcode"
      viewBox={`0 0 ${barcode.width} 44`}
      role="img"
      aria-label={`Barcode for ${barcode.value}`}
      preserveAspectRatio="none"
    >
      <rect width={barcode.width} height="44" fill="#fff" />
      {barcode.bars.map((bar, index) => (
        <rect
          key={`${bar.x}-${index}`}
          x={bar.x}
          y="2"
          width={bar.width}
          height="40"
          fill="#111"
        />
      ))}
    </svg>
  );
};

const BilingualLabel = ({ en, ar }) => (
  <span className="bilingual-label">
    <strong>{en}</strong>
    <span dir="rtl" lang="ar">
      {ar}
    </span>
  </span>
);

const OfficialReceipt = forwardRef(function OfficialReceipt(
  {
    reservation,
    hotelDetails,
    onEdit,
    onSupplierNameClick,
    onSupplierBookingNoClick,
  },
  ref,
) {
  const customer =
    reservation?.customer_details || reservation?.customerDetails || {};
  const nights = calculateNights(
    reservation?.checkin_date,
    reservation?.checkout_date,
  );
  const payment = deriveReceiptPayment(reservation);
  const roomRows = buildReceiptRoomRows(reservation, hotelDetails, nights);
  const status = receiptStatus(
    reservation?.reservation_status || reservation?.state,
  );
  const hotelName = titleCase(
    hotelDetails?.hotelName ||
      reservation?.hotelName ||
      reservation?.hotelId?.hotelName ||
      "Hotel",
  );
  const hotelNameArabic =
    hotelDetails?.hotelName_OtherLanguage ||
    reservation?.hotelName_OtherLanguage ||
    reservation?.hotelId?.hotelName_OtherLanguage ||
    "";
  const supplierName = String(
    reservation?.supplierData?.supplierName ||
      reservation?.supplierData?.suppliedBy ||
      hotelDetails?.suppliedBy ||
      hotelDetails?.belongsTo?.name ||
      reservation?.belongsTo?.name ||
      "N/A",
  ).trim();
  const supplierBookingNo = String(
    reservation?.supplierData?.suppliedBookingNo ||
      reservation?.supplierData?.supplierBookingNo ||
      reservation?.supplierData?.supplierBookingNumber ||
      reservation?.confirmation_number ||
      "N/A",
  ).trim();
  const bookingNo = String(reservation?.confirmation_number || "N/A").trim();
  const nationality = String(customer?.nationality || "N/A").trim();
  const countryCode = countryCodeFromNationality(nationality);
  const nationalityLabel = displayNationality(nationality, countryCode);
  const totalRooms = roomRows.reduce((sum, room) => sum + room.count, 0);
  const guests = Number(reservation?.total_guests || 0) || totalRooms || 1;
  const bookingDate = formatReceiptDate(
    reservation?.createdAt || reservation?.booked_at,
  );
  const bookingSource = String(
    reservation?.booking_source || "Jannatbooking.com",
  ).trim();

  return (
    <ReceiptCanvas ref={ref} dir="ltr">
      <header className="receipt-hero">
        <div className="brand-lockup" aria-label="Jannat Booking">
          <div className="brand-name">JANNAT</div>
          <div className="brand-site">Booking.com</div>
        </div>
        <div className="receipt-title">
          <strong>Booking Receipt</strong>
          <span dir="rtl" lang="ar">
            فاتورة الحجز
          </span>
        </div>
      </header>
      <div className="receipt-accent" />
      <section className="hotel-banner">
        <div>{hotelName}</div>
        {hotelNameArabic ? (
          <div dir="rtl" lang="ar">
            {hotelNameArabic}
          </div>
        ) : null}
      </section>
      <section className="booking-band">
        <div>
          <strong>Booking No:</strong>{" "}
          <EditValue onClick={onEdit} className="ltr-value">
            {bookingNo}
            {supplierBookingNo !== bookingNo ? ` / ${supplierBookingNo}` : ""}
          </EditValue>
        </div>
        <div>
          <strong>Booking Date:</strong> {bookingDate}
        </div>
      </section>

      <main className="receipt-body">
        <div className="identity-layout">
          <div className="identity-main">
            <div className="supplier-lines">
              <div>
                <strong>Supplied By:</strong>{" "}
                <EditValue onClick={onSupplierNameClick || onEdit}>
                  {supplierName}
                </EditValue>
              </div>
              <div>
                <strong>Supplier Booking No:</strong>{" "}
                <EditValue
                  onClick={onSupplierBookingNoClick || onEdit}
                  className="ltr-value"
                >
                  {supplierBookingNo}
                </EditValue>
              </div>
            </div>
            <div className="section-heading">
              <strong>Reservation Details</strong>
              <span dir="rtl" lang="ar">
                تفاصيل الحجز
              </span>
            </div>
            <div className="guest-card">
              <BilingualLabel en="Guest Name" ar="اسم الضيف" />
              <span className="detail-colon">:</span>
              <EditValue onClick={onEdit} className="guest-name">
                {customer?.name || "Guest"}
              </EditValue>
            </div>
          </div>
          <aside className="confirmation-panel">
            <div className="confirmation-title" dir="rtl" lang="ar">
              رقم حجز الفندق
            </div>
            <div className="confirmation-box">
              <strong>Hotel Confirmation No.</strong>
              <EditValue onClick={onEdit} className="confirmation-number">
                {bookingNo}
              </EditValue>
              <Barcode value={bookingNo} />
            </div>
            <div className="nationality-card">
              <BilingualLabel en="Nationality" ar="الجنسية" />
              <span className="detail-colon">:</span>
              <EditValue onClick={onEdit}>{nationalityLabel}</EditValue>
              {countryCode ? (
                <span
                  className={`fi fi-${countryCode.toLowerCase()} nationality-flag`}
                  role="img"
                  aria-label={`${nationalityLabel} flag`}
                />
              ) : null}
            </div>
          </aside>
        </div>

        <table className="stay-table">
          <thead>
            <tr>
              <th>
                <BilingualLabel en="Check-in Date" ar="تاريخ الوصول" />
              </th>
              <td>
                <strong>{formatReceiptDate(reservation?.checkin_date)}</strong>
                <span dir="rtl" lang="ar">
                  {formatReceiptDate(reservation?.checkin_date, "ar-EG")}
                </span>
              </td>
              <th>
                <BilingualLabel en="Guests" ar="عدد الضيوف" />
              </th>
              <th>
                <BilingualLabel en="Nights" ar="الليالي" />
              </th>
              <th>
                <BilingualLabel en="Booking Status" ar="حالة الحجز" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>
                <BilingualLabel en="Checkout Date" ar="تاريخ المغادرة" />
              </th>
              <td>
                <strong>{formatReceiptDate(reservation?.checkout_date)}</strong>
                <span dir="rtl" lang="ar">
                  {formatReceiptDate(reservation?.checkout_date, "ar-EG")}
                </span>
              </td>
              <td className="large-value">{guests}</td>
              <td className="large-value">{nights}</td>
              <td
                className={
                  status.positive ? "status-positive" : "status-neutral"
                }
              >
                <strong dir="rtl" lang="ar">
                  {status.ar}
                </strong>
                <span>{titleCase(status.en)}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="finance-layout">
          <section className="rooms-section">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th>
                    <BilingualLabel en="No. of rooms" ar="عدد الغرف" />
                  </th>
                  <th>
                    <BilingualLabel en="Room Type" ar="نوع الغرفة" />
                  </th>
                  <th>
                    <BilingualLabel en="Night price" ar="سعر الليلة" />
                  </th>
                  <th>
                    <BilingualLabel en="Total price" ar="إجمالي السعر" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {roomRows.length ? (
                  roomRows.map((room, index) => (
                    <tr key={`${room.englishName}-${room.rate}-${index}`}>
                      <td className="large-value">{room.count}</td>
                      <td>
                        <strong>{room.englishName}</strong>
                        {room.arabicName ? (
                          <span dir="rtl" lang="ar">
                            {room.arabicName}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {room.rate > 0 ? `${money(room.rate)} SAR` : "N/A"}
                      </td>
                      <td>
                        {room.total > 0 ? `${money(room.total)} SAR` : "N/A"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">
                      Room details are available from Jannat Booking support.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="booking-source">
              <strong>Booking Source:</strong>{" "}
              <EditValue onClick={onEdit}>{bookingSource}</EditValue>
            </div>
            <div className={`payment-method payment-${payment.method.tone}`}>
              <div>
                <BilingualLabel en="Payment Method" ar="طريقة الدفع" />
              </div>
              <div>
                <EditValue onClick={onEdit}>
                  <strong>{payment.method.en}</strong>
                  <span dir="rtl" lang="ar">
                    {payment.method.ar}
                  </span>
                </EditValue>
              </div>
            </div>
          </section>
          <aside className="payment-details">
            <div className="payment-heading">
              <strong>Payment Details</strong>
              <span dir="rtl" lang="ar">
                تفاصيل الدفع
              </span>
            </div>
            <div className="payment-row payment-total">
              <BilingualLabel en="Total Amount" ar="السعر الإجمالي" />
              <span>:</span>
              <strong>{money(payment.total)} SAR</strong>
            </div>
            <div className="payment-row payment-deposit">
              <BilingualLabel en="Deposit" ar="عربون" />
              <span>:</span>
              <strong>{money(payment.paid)} SAR</strong>
            </div>
            <div className="payment-row payment-remaining">
              <BilingualLabel en="Remaining Due" ar="المبلغ المتبقي" />
              <span>:</span>
              <strong>{money(payment.remaining)} SAR</strong>
            </div>
          </aside>
        </div>
      </main>

      <footer className="receipt-footer">
        <div>
          Many Thanks For Staying With Us At <strong>{hotelName}</strong>
        </div>
        <div>For Better Rates Next Time, Please Check Jannatbooking.com</div>
      </footer>
    </ReceiptCanvas>
  );
});

export default OfficialReceipt;

const ReceiptCanvas = styled.article`
  --receipt-charcoal: #575757;
  --receipt-orange: #ff984b;
  --receipt-peach: #ffd2aa;
  --receipt-paper: #fffdf7;
  --receipt-gray: #dedede;
  --receipt-soft-gray: #f0f0f0;
  --receipt-green: #2f8c4b;
  --receipt-soft-green: #e4f7cb;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  background: var(--receipt-paper);
  color: #101010;
  font-family: Arial, Tahoma, "Noto Sans Arabic", sans-serif;
  font-size: 14px;
  line-height: 1.2;
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  text-transform: none;
  overflow: hidden;
  box-shadow: 0 14px 34px rgba(16, 24, 40, 0.12);

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  .receipt-hero {
    min-height: 158px;
    padding: 28px 48px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
    background: var(--receipt-charcoal);
    color: #fff;
  }
  .brand-lockup {
    min-width: 250px;
    text-align: center;
    line-height: 1;
  }
  .brand-name {
    font-size: 58px;
    font-weight: 300;
    letter-spacing: 2px;
  }
  .brand-site {
    margin-top: -1px;
    color: var(--receipt-orange);
    font-size: 22px;
    font-weight: 800;
  }
  .receipt-title {
    display: grid;
    text-align: center;
    color: var(--receipt-orange);
    line-height: 1.03;
  }
  .receipt-title strong {
    font-size: 38px;
  }
  .receipt-title span {
    font-size: 34px;
    font-weight: 800;
  }
  .receipt-accent {
    height: 23px;
    background: var(--receipt-peach);
  }
  .hotel-banner {
    min-height: 74px;
    display: grid;
    place-content: center;
    text-align: center;
    background: var(--receipt-charcoal);
    color: #fff;
    font-size: 27px;
    line-height: 1.05;
  }
  .hotel-banner [lang="ar"] {
    font-size: 23px;
    font-weight: 700;
  }
  .booking-band {
    min-height: 82px;
    display: grid;
    place-content: center;
    text-align: center;
    background: var(--receipt-gray);
    font-size: 18px;
    line-height: 1.55;
  }
  .receipt-body {
    padding: 24px 34px 0;
  }
  .identity-layout {
    display: grid;
    grid-template-columns: minmax(0, 2.35fr) minmax(260px, 0.95fr);
    gap: 28px;
  }
  .supplier-lines {
    padding: 8px 4px 17px;
    font-size: 18px;
    line-height: 1.45;
  }
  .section-heading {
    min-height: 62px;
    display: grid;
    place-content: center;
    text-align: center;
    border-top: 3px solid #151515;
    border-bottom: 3px solid #151515;
    background: #ffe9d5;
    font-size: 23px;
    line-height: 1.05;
  }
  .section-heading [lang="ar"] {
    font-size: 22px;
    font-weight: 800;
  }
  .guest-card,
  .nationality-card {
    display: grid;
    grid-template-columns: auto 12px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    background: var(--receipt-soft-gray);
  }
  .guest-card {
    min-height: 64px;
    margin: 12px 3px 0;
    padding: 10px 26px;
  }
  .guest-name {
    font-size: 21px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }
  .bilingual-label {
    display: grid;
    text-align: center;
    line-height: 1.02;
  }
  .bilingual-label [lang="ar"] {
    font-weight: 800;
  }
  .detail-colon {
    font-size: 26px;
    font-weight: 800;
  }
  .confirmation-panel {
    display: grid;
    align-content: start;
    gap: 10px;
  }
  .confirmation-title {
    text-align: center;
    font-size: 25px;
    font-weight: 900;
  }
  .confirmation-box {
    min-height: 112px;
    padding: 8px 16px 7px;
    display: grid;
    place-items: center;
    border-top: 2px solid #1a1a1a;
    border-bottom: 2px solid #1a1a1a;
    background: #f1f3f5;
  }
  .confirmation-number {
    color: #19723a;
    font-size: clamp(18px, 2.7vw, 30px);
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
  }
  .receipt-barcode {
    width: 100%;
    height: 42px;
    display: block;
  }
  .nationality-card {
    min-height: 58px;
    padding: 8px 18px;
    font-size: 17px;
  }
  .nationality-flag {
    width: 34px;
    height: 25px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
  }
  .receipt-edit-value {
    cursor: pointer;
    border-radius: 3px;
    transition:
      box-shadow 120ms ease,
      background 120ms ease;
  }
  .receipt-edit-value:hover,
  .receipt-edit-value:focus {
    background: rgba(255, 152, 75, 0.13);
    box-shadow: 0 0 0 3px rgba(255, 152, 75, 0.13);
    outline: none;
  }
  .ltr-value {
    direction: ltr;
    unicode-bidi: isolate;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  .stay-table {
    margin-top: 16px;
    table-layout: fixed;
  }
  .stay-table th,
  .stay-table td {
    border: 2px solid #1a1a1a;
    padding: 7px 8px;
    text-align: center;
    vertical-align: middle;
  }
  .stay-table th {
    background: #fff;
  }
  .stay-table thead th:first-child,
  .stay-table tbody th:first-child {
    width: 17%;
  }
  .stay-table thead td,
  .stay-table tbody td:nth-child(2) {
    width: 23%;
  }
  .stay-table td > span,
  .stay-table td > strong {
    display: block;
  }
  .stay-table .large-value,
  .rooms-table .large-value {
    font-size: 21px;
    font-weight: 800;
  }
  .status-positive {
    background: var(--receipt-soft-green);
    box-shadow: inset 0 -4px 0 #63c77f;
  }
  .status-neutral {
    background: #fff2ce;
  }
  .status-positive span,
  .status-positive strong,
  .status-neutral span,
  .status-neutral strong {
    display: block;
  }
  .finance-layout {
    margin-top: 30px;
    padding-top: 8px;
    border-top: 3px solid #111;
    display: grid;
    grid-template-columns: minmax(0, 2.35fr) minmax(260px, 0.95fr);
    gap: 28px;
    align-items: start;
  }
  .rooms-table {
    table-layout: fixed;
  }
  .rooms-table th,
  .rooms-table td {
    padding: 8px;
    text-align: center;
    vertical-align: middle;
  }
  .rooms-table th {
    font-size: 13px;
  }
  .rooms-table th:first-child {
    width: 17%;
  }
  .rooms-table th:nth-child(2) {
    width: 47%;
  }
  .rooms-table th:nth-child(3),
  .rooms-table th:nth-child(4) {
    width: 18%;
  }
  .rooms-table td {
    background: var(--receipt-soft-gray);
    border: 7px solid var(--receipt-paper);
    overflow-wrap: anywhere;
  }
  .rooms-table td span,
  .rooms-table td strong {
    display: block;
  }
  .booking-source {
    padding: 3px 8px 10px;
    color: #474747;
    text-align: end;
    font-size: 12px;
  }
  .payment-method {
    margin: 16px auto 0;
    max-width: 600px;
    min-height: 74px;
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    text-align: center;
  }
  .payment-method > div {
    display: grid;
    place-content: center;
    padding: 10px;
  }
  .payment-method > div:first-child {
    background: var(--receipt-charcoal);
    color: #fff;
    font-size: 20px;
  }
  .payment-method > div:last-child {
    background: var(--receipt-soft-green);
    color: var(--receipt-green);
    font-size: 26px;
  }
  .payment-method > div:last-child span,
  .payment-method > div:last-child strong {
    display: block;
  }
  .payment-unpaid > div:last-child {
    background: #f2f2f2;
    color: #4a4a4a;
  }
  .payment-pending > div:last-child,
  .payment-partial > div:last-child {
    background: #fff0d5;
    color: #b1661f;
  }
  .payment-details {
    display: grid;
    gap: 8px;
  }
  .payment-heading {
    min-height: 76px;
    display: grid;
    place-content: center;
    text-align: center;
    background: var(--receipt-charcoal);
    color: #fff;
    font-size: 23px;
  }
  .payment-heading span,
  .payment-heading strong {
    display: block;
  }
  .payment-row {
    min-height: 61px;
    padding: 8px 14px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 10px auto;
    align-items: center;
    gap: 7px;
    background: #d4d4d4;
  }
  .payment-row > strong {
    font-size: 23px;
    white-space: nowrap;
  }
  .payment-deposit > strong,
  .payment-remaining > strong {
    color: var(--receipt-green);
  }
  .receipt-footer {
    min-height: 83px;
    margin-top: 12px;
    padding: 15px 28px;
    display: grid;
    place-content: center;
    text-align: center;
    background: #080808;
    color: #fff;
    font-size: 16px;
    line-height: 1.55;
  }

  @media (max-width: 760px) {
    .receipt-hero {
      min-height: 120px;
      padding: 22px;
    }
    .brand-name {
      font-size: 42px;
    }
    .brand-site {
      font-size: 17px;
    }
    .receipt-title strong {
      font-size: 27px;
    }
    .receipt-title span {
      font-size: 25px;
    }
    .receipt-body {
      padding-inline: 18px;
    }
    .identity-layout,
    .finance-layout {
      grid-template-columns: 1fr;
      gap: 18px;
    }
    .confirmation-panel {
      grid-template-columns: 1fr 1fr;
    }
    .confirmation-title {
      grid-column: 1 / -1;
    }
    .stay-table {
      font-size: 11px;
    }
    .stay-table th,
    .stay-table td {
      padding: 5px 3px;
    }
  }

  @media print {
    box-shadow: none;
    max-width: none;
    .receipt-edit-value:hover,
    .receipt-edit-value:focus {
      background: transparent;
      box-shadow: none;
    }
    .rooms-table tr,
    .payment-details,
    .payment-method {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;
