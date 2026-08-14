const OTA_SOURCE_PROVIDERS = Object.freeze({
  agoda: "agoda",
  "agoda.com": "agoda",
  agodacom: "agoda",
  expedia: "expedia",
  "expedia.com": "expedia",
  expediacom: "expedia",
  trip: "trip",
  "trip.com": "trip",
  tripcom: "trip",
  "trip.com v2": "trip",
  "trip.comv2": "trip",
  tripcomv2: "trip",
  ctrip: "trip",
  airbnb: "airbnb",
  "airbnb.com": "airbnb",
  airbnbcom: "airbnb",
  booking: "booking",
  "booking.com": "booking",
  bookingcom: "booking",
  trivago: "trivago",
  hotel: "hotels",
  hotels: "hotels",
  "hotel.com": "hotels",
  "hotels.com": "hotels",
  hotelcom: "hotels",
  hotelscom: "hotels",
});

const clean = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

export const otaProviderForReservationSource = (bookingSource) =>
  OTA_SOURCE_PROVIDERS[clean(bookingSource).toLowerCase()] || "";

export const withReservationCreateIdentity = (
  reservation = {},
  enteredConfirmation = "",
) => {
  const provider = otaProviderForReservationSource(reservation.booking_source);
  if (!provider) {
    return {
      ...reservation,
      confirmation_number: enteredConfirmation,
    };
  }

  const externalConfirmation = clean(enteredConfirmation);
  if (!externalConfirmation) {
    const error = new Error("OTA Confirmation # is required");
    error.code = "manual_ota_external_confirmation_required";
    throw error;
  }

  const payload = {
    ...reservation,
    customer_details: {
      ...(reservation.customer_details || {}),
      confirmation_number2: externalConfirmation,
    },
  };
  delete payload.confirmation_number;
  return payload;
};

export { OTA_SOURCE_PROVIDERS };
