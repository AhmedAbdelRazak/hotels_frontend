/** @format */

import React, { forwardRef } from "react";
import "@fontsource/noto-sans-arabic/arabic-400.css";
import "@fontsource/noto-sans-arabic/arabic-800.css";
import "./GuestCard.css";

const valueOr = (value, fallback = "N/A") =>
  value === null || value === undefined || String(value).trim() === ""
    ? fallback
    : value;

const textDensity = (value, compactAt = 70, denseAt = 145) => {
  const length = String(value || "").length;
  if (length > denseAt) return "dense";
  if (length > compactAt) return "compact";
  return "";
};

const GuestCard = forwardRef(({ card }, ref) => {
  if (!card) return null;
  const requestedBarcodeWidth = Number(card.barcodeDisplayWidth);
  const barcodeDisplayWidth =
    Number.isFinite(requestedBarcodeWidth) && requestedBarcodeWidth > 0
      ? Math.min(requestedBarcodeWidth, 370)
      : 330;
  return (
    <main
      className="guest-card-page"
      ref={ref}
      aria-label="Jannat Guest Card"
      data-guest-card-capture="true"
    >
      <article className="jannat-guest-card">
        <header className="jgc-header">
          <div className="jgc-brand">
            <span className="jgc-brand-main">JANNAT</span>
            <span className="jgc-brand-sub">Booking.com</span>
          </div>
          <div className="jgc-title">Guest Card</div>
        </header>
        <div className="jgc-stripe" />
        <section className="jgc-hotel">
          <div
            className={`jgc-hotel-en ${textDensity(
              card.hotelNameEnglish,
              45,
              85,
            )}`}
            lang="en"
          >
            {valueOr(card.hotelNameEnglish, "Jannat Booking")}
          </div>
          <div
            className={`jgc-hotel-ar ${textDensity(
              card.hotelNameArabic,
              45,
              85,
            )}`}
            lang="ar"
            dir="rtl"
          >
            {valueOr(card.hotelNameArabic, "غير متاح")}
          </div>
        </section>
        <section
          className={`jgc-booking ${textDensity(
            card.bookingReference,
            45,
            90,
          )}`}
        >
          <div>
            Booking No:{" "}
            <bdi className="jgc-ltr">{valueOr(card.bookingReference)}</bdi>
          </div>
          <div>
            Booking Date:{" "}
            <bdi className="jgc-ltr">{valueOr(card.bookingDate?.english)}</bdi>
          </div>
        </section>
        <div className="jgc-body">
          <div className="jgc-main">
            <section>
              <h2 className="jgc-section-title">
                Reservation Details
                <span className="ar" lang="ar" dir="rtl">
                  تفاصيل الحجز
                </span>
              </h2>
              <div className="jgc-detail-list">
                <div className="jgc-detail-row">
                  <div className="jgc-detail-label">
                    Guest Name
                    <span lang="ar" dir="rtl">
                      اسم الضيف
                    </span>
                  </div>
                  <div
                    className={`jgc-detail-value ${textDensity(
                      card.guestName,
                      55,
                      100,
                    )}`}
                  >
                    {valueOr(card.guestName)}
                  </div>
                </div>
                <div className="jgc-detail-row">
                  <div className="jgc-detail-label">
                    Room Type
                    <span lang="ar" dir="rtl">
                      نوع الغرفة
                    </span>
                  </div>
                  <div
                    className={`jgc-detail-value ${textDensity(
                      `${card.roomTypeEnglish || ""}${
                        card.roomTypeArabic || ""
                      }`,
                      90,
                      180,
                    )}`}
                  >
                    <span lang="en">{valueOr(card.roomTypeEnglish)}</span>
                    <span lang="ar" dir="rtl">
                      {valueOr(card.roomTypeArabic, "غير متاح")}
                    </span>
                  </div>
                </div>
              </div>
            </section>
            <section className="jgc-confirm">
              <h2 className="jgc-confirm-heading" lang="ar" dir="rtl">
                رقم حجز الفندق
              </h2>
              <div className="jgc-confirm-box">
                <div className="jgc-confirm-label">
                  {valueOr(
                    card.hotelConfirmationLabel?.english,
                    "Confirmation Number",
                  )}
                </div>
                <bdi
                  className={`jgc-confirm-number jgc-ltr ${textDensity(
                    card.hotelConfirmationNumber,
                    18,
                    32,
                  )}`}
                >
                  {valueOr(card.hotelConfirmationNumber)}
                </bdi>
                {card.barcodeDataUri ? (
                  <img
                    className="jgc-barcode"
                    alt={`Barcode for confirmation ${
                      card.confirmationNumber || ""
                    }`}
                    src={card.barcodeDataUri}
                    style={{ width: barcodeDisplayWidth }}
                  />
                ) : null}
              </div>
            </section>
          </div>
          <div className="jgc-stay">
            <div className="jgc-dates">
              <div className="jgc-date-row">
                <div className="jgc-date-label">
                  Check-in Date
                  <span lang="ar" dir="rtl">
                    تاريخ الوصول
                  </span>
                </div>
                <div className="jgc-date-value">
                  <span>{valueOr(card.checkin?.english)}</span>
                  <span lang="ar" dir="rtl">
                    {valueOr(card.checkin?.arabic, "غير متاح")}
                  </span>
                </div>
              </div>
              <div className="jgc-date-row">
                <div className="jgc-date-label">
                  Checkout Date
                  <span lang="ar" dir="rtl">
                    تاريخ المغادرة
                  </span>
                </div>
                <div className="jgc-date-value">
                  <span>{valueOr(card.checkout?.english)}</span>
                  <span lang="ar" dir="rtl">
                    {valueOr(card.checkout?.arabic, "غير متاح")}
                  </span>
                </div>
              </div>
            </div>
            <div className="jgc-metric">
              <div className="jgc-metric-label">
                Guests
                <span lang="ar" dir="rtl">
                  عدد الضيوف
                </span>
              </div>
              <div className="jgc-metric-value">{valueOr(card.guests)}</div>
            </div>
            <div className="jgc-metric">
              <div className="jgc-metric-label">
                Nights
                <span lang="ar" dir="rtl">
                  الليالي
                </span>
              </div>
              <div className="jgc-metric-value">{valueOr(card.nights)}</div>
            </div>
            <div className="jgc-metric">
              <div className="jgc-metric-label">
                Payment Status
                <span lang="ar" dir="rtl">
                  حالة الدفع
                </span>
              </div>
              <div
                className={`jgc-metric-value jgc-payment ${
                  card.paymentStatus?.tone || "unpaid"
                }`}
              >
                <span>{valueOr(card.paymentStatus?.english, "Not Paid")}</span>
                <span lang="ar" dir="rtl">
                  {valueOr(card.paymentStatus?.arabic, "غير مدفوع")}
                </span>
              </div>
            </div>
          </div>
        </div>
        <footer className="jgc-footer">
          <div className="jgc-footer-en">
            <strong>Our Dear Guest,</strong>
            <br />
            We are waiting for your arrival. Kindly present this card to the
            receptionist. Thank you for booking with our hotel.
          </div>
          <div className="jgc-footer-ar" lang="ar" dir="rtl">
            <strong>ضيفنا العزيز،</strong>
            <br />
            يرجى تقديم هذه البطاقة إلى موظف الاستقبال. نحن في انتظار وصولكم،
            ونشكركم على حجزكم في فندقنا.
          </div>
        </footer>
      </article>
    </main>
  );
});

GuestCard.displayName = "GuestCard";

export default GuestCard;
