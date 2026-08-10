import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

    const trigger = screen.getByRole("button", {
      name: "HotelRunner reported pricing breakdown",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText(
        "HotelRunner reported total (commercial role unverified)",
      ),
    ).not.toBeInTheDocument();

    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      within(dialog).getByText(
        "HotelRunner reported total (commercial role unverified)",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText("Gross reservation total"),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText("Amount reported paid")).toBeInTheDocument();

    const netLabel = within(dialog).getByText("Hotel net after OTA expenses");
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

    fireEvent.click(
      screen.getByRole("button", {
        name: "HotelRunner reported pricing breakdown",
      }),
    );

    const netStatus = within(screen.getByRole("dialog"))
      .getByText("Hotel net after OTA expenses")
      .closest(".hr-net-status");
    expect(netStatus).toHaveTextContent("850.00 SAR");
    expect(netStatus).not.toHaveTextContent("Awaiting verified OTA payout");
  });

  test("uses the requested Arabic trigger and an RTL modal without rendering details inline", () => {
    render(
      <HotelRunnerPricingBreakdown
        reservation={hotelRunnerReservation}
        chosenLanguage="Arabic"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "تفاصيل التسعير الإجمالي من HotelRunner",
    });
    expect(screen.queryByText("إجمالي الغرف الفرعي")).not.toBeInTheDocument();

    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("إجمالي الغرف الفرعي"),
    ).toBeInTheDocument();
    expect(dialog.querySelector('[dir="rtl"]')).not.toBeNull();
  });

  test("keeps room, nightly, extra, and payment details inside the modal", () => {
    const detailedReservation = {
      ...hotelRunnerReservation,
      supplierData: {
        hotelRunner: {
          ...hotelRunnerReservation.supplierData.hotelRunner,
          pricing: {
            ...hotelRunnerReservation.supplierData.hotelRunner.pricing,
            rooms: [
              {
                roomId: "room-1",
                invCode: "ROOM-CODE",
                priceBeforeTax: 820,
                totalAfterTax: 1000,
                extras: [
                  {
                    name: "Breakfast",
                    code: "BF",
                    price: 20,
                    includedInPrice: true,
                  },
                ],
                nightly: [
                  {
                    date: "2026-08-10",
                    price: 500,
                    originalPrice: 520,
                    discount: 20,
                    rateCode: "FLEX",
                  },
                ],
              },
            ],
            payments: [
              {
                amount: 250,
                currency: "SAR",
                state: "paid",
                methodName: "Virtual card",
              },
            ],
          },
        },
      },
    };

    render(
      <HotelRunnerPricingBreakdown
        reservation={detailedReservation}
        chosenLanguage="English"
      />,
    );

    expect(screen.queryByText("Nightly prices")).not.toBeInTheDocument();
    expect(screen.queryByText("Breakfast")).not.toBeInTheDocument();
    expect(screen.queryByText("Virtual card")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "HotelRunner reported pricing breakdown",
      }),
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Nightly prices")).toBeInTheDocument();
    expect(within(dialog).getByText("Breakfast")).toBeInTheDocument();
    expect(within(dialog).getByText("Virtual card")).toBeInTheDocument();
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
