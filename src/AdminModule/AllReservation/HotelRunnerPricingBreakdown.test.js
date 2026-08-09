import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import HotelRunnerPricingBreakdown from "./HotelRunnerPricingBreakdown";

const hotelRunnerReservation = {
  total_amount: 1000,
  currency: "SAR",
  adminPricing: {
    mode: "hotelrunner_api",
    rootTotal: 700,
    commercialVerified: false,
    netAfterExpensesTotal: null,
  },
  supplierData: {
    hotelRunner: {
      transport: "hotelrunner_api",
      reservationId: "hr-reservation",
      pricing: {
        currency: "SAR",
        subTotal: 820,
        taxTotal: 180,
        grandTotal: 1000,
        paidAmount: 250,
      },
    },
  },
};

describe("HotelRunner reported pricing breakdown", () => {
  test("shows the raw total with an unverified role while net remains explicitly unverified", () => {
    render(
      <HotelRunnerPricingBreakdown
        reservation={hotelRunnerReservation}
        chosenLanguage="English"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "HotelRunner reported pricing breakdown",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "HotelRunner reported total (commercial role unverified)",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Gross reservation total")).not.toBeInTheDocument();
    expect(screen.getByText("Amount reported paid")).toBeInTheDocument();

    const netLabel = screen.getByText("Hotel net after OTA expenses");
    const netStatus = netLabel.closest(".hr-net-status");
    expect(netStatus).not.toBeNull();
    expect(
      within(netStatus).getByText("Awaiting verified OTA payout"),
    ).toBeInTheDocument();
    expect(netStatus).toHaveTextContent(
      "Gross, paid, and local contracted amounts are not used as net.",
    );
    expect(netStatus).not.toHaveTextContent("1,000.00 SAR");
    expect(netStatus).not.toHaveTextContent("250.00 SAR");
    expect(netStatus).not.toHaveTextContent("700.00 SAR");
  });

  test("shows net only after explicit commercial verification", () => {
    render(
      <HotelRunnerPricingBreakdown
        reservation={{
          ...hotelRunnerReservation,
          adminPricing: {
            ...hotelRunnerReservation.adminPricing,
            commercialVerified: true,
            netAfterExpensesTotal: 850,
            otaExpenseTotal: 150,
          },
        }}
        chosenLanguage="English"
      />,
    );

    const netStatus = screen
      .getByText("Hotel net after OTA expenses")
      .closest(".hr-net-status");
    expect(netStatus).toHaveTextContent("850.00 SAR");
    expect(netStatus).not.toHaveTextContent("Awaiting verified OTA payout");
  });

  test("does not render for a non-HotelRunner reservation", () => {
    const { container } = render(
      <HotelRunnerPricingBreakdown
        reservation={{ total_amount: 1000, booking_source: "Direct" }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
