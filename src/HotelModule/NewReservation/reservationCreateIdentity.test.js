import {
  otaProviderForReservationSource,
  withReservationCreateIdentity,
} from "./reservationCreateIdentity";
import fs from "fs";
import path from "path";

describe("NewReservation identity payload", () => {
  test.each([
    ["Agoda", "agoda"],
    ["Agoda.com", "agoda"],
    ["Expedia", "expedia"],
    ["Expedia.com", "expedia"],
    ["Trip.com", "trip"],
    ["Trip.com V2", "trip"],
    ["Ctrip", "trip"],
    ["Airbnb", "airbnb"],
    ["Booking.com", "booking"],
    ["Trivago", "trivago"],
    ["hotel.com", "hotels"],
    ["Hotels.com", "hotels"],
  ])("normalizes recognized OTA source %s", (source, provider) => {
    expect(otaProviderForReservationSource(source)).toBe(provider);
  });

  test("recognized OTA sends the entered provider ID only as the external field", () => {
    const payload = withReservationCreateIdentity(
      {
        booking_source: "booking.com",
        customer_details: { name: "Example Guest" },
        total_amount: 75,
      },
      " OTA-EXAMPLE-7001 ",
    );

    expect(payload).not.toHaveProperty("confirmation_number");
    expect(payload.customer_details).toEqual({
      name: "Example Guest",
      confirmation_number2: "OTA-EXAMPLE-7001",
    });
    expect(payload.total_amount).toBe(75);
  });

  test("recognized OTA refuses an empty external confirmation", () => {
    expect(() =>
      withReservationCreateIdentity(
        { booking_source: "trivago", customer_details: {} },
        "  ",
      ),
    ).toThrow("OTA Confirmation # is required");
  });

  test.each(["manual", "janat", "affiliate", "walk in"])(
    "non-OTA source %s preserves caller canonical behavior",
    (source) => {
      const payload = withReservationCreateIdentity(
        {
          booking_source: source,
          customer_details: { name: "Example Guest" },
        },
        "MANUAL-CONF-1",
      );

      expect(payload.confirmation_number).toBe("MANUAL-CONF-1");
      expect(payload.customer_details).toEqual({ name: "Example Guest" });
    },
  );

  test("Reception can preserve its existing non-OTA create payload while applying the OTA contract explicitly", () => {
    const receptionPayload = {
      booking_source: "manual",
      customer_details: { name: "Example Guest" },
    };
    const createPayload = otaProviderForReservationSource(
      receptionPayload.booking_source,
    )
      ? withReservationCreateIdentity(receptionPayload, "MANUAL-CONF-2")
      : receptionPayload;

    expect(createPayload).toBe(receptionPayload);
    expect(createPayload).not.toHaveProperty("confirmation_number");
  });

  test("both reachable create screens apply the shared OTA payload contract", () => {
    const hotelSource = fs.readFileSync(
      path.join(__dirname, "NewReservationMain.js"),
      "utf8",
    );
    const receptionSource = fs.readFileSync(
      path.join(__dirname, "../../ReceptionModule/NewReservationMain.js"),
      "utf8",
    );

    expect(hotelSource).toMatch(/withReservationCreateIdentity\(/);
    expect(receptionSource).toMatch(
      /otaProviderForReservationSource\(booking_source\)[\s\S]+?withReservationCreateIdentity\(new_reservation, confirmation_number\)/,
    );
  });

  test("all manual reservation forms expose Trip through the same OTA contract", () => {
    for (const relative of [
      "ZReservationForm.js",
      "ZReservationForm2.js",
      "../../ReceptionModule/ZReservationForm.js",
      "../../ReceptionModule/ZReservationForm2.js",
    ]) {
      const source = fs.readFileSync(path.join(__dirname, relative), "utf8");
      expect(source).toMatch(/<option value=['"]trip\.com['"]>Trip\.com<\/option>/);
    }
  });
});
