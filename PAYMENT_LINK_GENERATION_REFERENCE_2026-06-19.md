# Payment Link Generation Reference - 2026-06-19

This note documents the hotel PMS payment-link modal updates used by the Jannat Booking SSR public payment route.

## Purpose

Hotel staff can generate a guest payment link from reservation detail screens. Before generating/copying/opening the link, the modal now asks for:

- Link language, defaulting to English.
- Display currency, defaulting to SAR.

The selected values are presentation settings for the public SSR guest page. They do not change the reservation ledger currency.

## Generated Link Shape

The PMS generates links in this shape:

```text
{REACT_APP_MAIN_URL_JANNAT}/client-payment/{reservationId}/{confirmationNumber}?lang={language}&currency={currency}
```

Examples:

```text
https://www.jannatbooking.com/client-payment/RESERVATION_ID/CONFIRMATION?lang=en&currency=sar
https://www.jannatbooking.com/client-payment/RESERVATION_ID/CONFIRMATION?lang=ar&currency=usd
```

## Safety Rules

- Default language is `en`.
- Default currency is `sar`.
- Supported link languages are Arabic and English.
- Supported display currencies mirror the SSR currency selector.
- Reservation and hotel ledger amounts remain SAR.
- PayPal charges are handled by the SSR/backend payment flow in USD when needed.
- Email and WhatsApp payment messages should use the same generated link so language/currency choices are preserved.

## Updated PMS Screens

- `src/AdminModule/AllReservation/MoreDetails.js`
- `src/HotelModule/ReservationsFolder/ReservationDetail.js`

