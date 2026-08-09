import {
  formatHotelRunnerReportAmount,
  getHotelRunnerPlatformFinanceDisplay,
  getHotelRunnerPayoutDisplay,
  getHotelRunnerPricingDisplay,
  getHotelRunnerReportPricingDisplay,
  getReservationGuestGrossDisplay,
  getReservationPropertyGuestGrossDisplay,
  isHotelRunnerReservation,
} from "./hotelRunnerPricingDisplay";

const hotelRunnerReservation = (overrides = {}) => ({
  total_amount: 1000,
  currency: "SAR",
  adminPricing: {
    mode: "hotelrunner_api",
    commercialVerified: false,
    netAfterExpensesTotal: null,
  },
  supplierData: {
    hotelRunner: {
      transport: "hotelrunner_api",
      reservationId: "hr-reservation",
    },
  },
  ...overrides,
});

const verifiedEmailEvidence = (overrides = {}) => ({
  version: 2,
  verified: true,
  source: "authenticated_ota_email",
  provider: "agoda",
  otaIdentityKey: "agoda:provider-confirmation",
  grossTotalSar: 1000,
  payoutTotalSar: 850,
  currency: "SAR",
  evidenceHash: "a".repeat(64),
  ...overrides,
});

describe("HotelRunner pricing display", () => {
  it("recognizes direct and linked HotelRunner reservations without relying on booking-source text", () => {
    expect(isHotelRunnerReservation(hotelRunnerReservation())).toBe(true);
    expect(
      isHotelRunnerReservation({
        adminPricing: { mode: "ota_platform_sync" },
        supplierData: { hotelRunner: { reservationId: "linked-id" } },
      }),
    ).toBe(true);
    expect(
      isHotelRunnerReservation({ booking_source: "HotelRunner-looking text" }),
    ).toBe(false);
  });

  it("preserves the complete canonical source breakdown without assigning a gross role", () => {
    const reservation = hotelRunnerReservation({
      supplierData: {
        hotelRunner: {
          transport: "hotelrunner_api",
          pricing: {
            currency: "sar",
            subTotal: 820,
            extrasTotal: 50,
            adjustmentsTotal: -20,
            itemTotal: 850,
            taxTotal: 150,
            grandTotal: 1000,
            paidAmount: 250,
            rooms: [
              {
                roomId: "room-1",
                invCode: "DOUBLE",
                priceBeforeTax: 850,
                totalAfterTax: 1000,
                roomBasePrice: 800,
                roomSubTotal: 850,
                extrasTotal: 50,
                fixedAdjustmentsTotal: -10,
                includedTaxesTotal: 100,
                excludedFeesAndTaxesTotal: 50,
                promotionsTotal: 20,
                cancelationRefundTotal: 0,
                cancelationPenaltyTotal: 100,
                extras: [
                  {
                    name: "Breakfast",
                    code: "BF",
                    price: 50,
                    basePrice: 45,
                    promotionsTotal: 5,
                    total: 50,
                    quantity: 1,
                    includedInPrice: true,
                  },
                ],
                nightly: [
                  {
                    date: "2026-08-07",
                    price: 500,
                    originalPrice: 550,
                    discount: 50,
                    rateCode: "FLEX",
                    version: "v1",
                  },
                ],
              },
            ],
            payments: [
              {
                amount: 250,
                state: "paid",
                currency: "SAR",
                exchangedAmount: 250,
                exchangeCurrency: "SAR",
                exchangeRate: 1,
                paidAt: "2026-08-06T12:00:00Z",
                methodName: "Virtual card",
              },
            ],
          },
        },
      },
    });

    const display = getHotelRunnerPricingDisplay(reservation);

    expect(display).toMatchObject({
      isHotelRunner: true,
      available: true,
      currency: "SAR",
      summary: {
        subTotal: 820,
        extrasTotal: 50,
        adjustmentsTotal: -20,
        itemTotal: 850,
        taxTotal: 150,
        grandTotal: null,
        paidAmount: 250,
      },
      sourceGrandTotal: 1000,
      sourceSummary: { grandTotal: 1000 },
    });
    expect(display.rooms[0]).toMatchObject({
      priceBeforeTax: 850,
      totalAfterTax: 1000,
      roomBasePrice: 800,
      roomSubTotal: 850,
      fixedAdjustmentsTotal: -10,
      promotionsTotal: 20,
      cancellationRefund: 0,
      cancellationPenalty: 100,
    });
    expect(display.rooms[0].dailyPrices[0]).toEqual({
      date: "2026-08-07",
      price: 500,
      originalPrice: 550,
      discount: 50,
      rateCode: "FLEX",
      ratePlanCode: "",
      version: "v1",
    });
    expect(display.rooms[0].extras[0]).toMatchObject({
      name: "Breakfast",
      code: "BF",
      price: 50,
      basePrice: 45,
      promotionsTotal: 5,
      total: 50,
      quantity: 1,
      includedInPrice: true,
    });
    expect(display.payments[0]).toMatchObject({
      amount: 250,
      state: "paid",
      currency: "SAR",
      exchangedAmount: 250,
      propertyCurrency: "SAR",
      exchangeRate: 1,
      method: "Virtual card",
    });
  });

  it("does not substitute local total_amount when canonical gross is absent", () => {
    expect(
      getHotelRunnerPricingDisplay(hotelRunnerReservation()),
    ).toMatchObject({
      isHotelRunner: true,
      available: false,
      currency: "SAR",
      summary: {
        grandTotal: null,
        paidAmount: null,
      },
    });
  });

  it("keeps an unverified HotelRunner grandTotal unavailable as guest gross and preserves legacy totals", () => {
    const reservation = hotelRunnerReservation({
      total_amount: 700,
      supplierData: {
        hotelRunner: {
          transport: "hotelrunner_api",
          pricing: { grandTotal: 1000 },
        },
      },
    });

    expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
      isHotelRunner: true,
      available: false,
      amount: null,
    });
    expect(
      getReservationGuestGrossDisplay({ total_amount: 700, currency: "SAR" }),
    ).toMatchObject({
      isHotelRunner: false,
      available: true,
      amount: 700,
    });
  });

  it("accepts the existing authenticated-email evidence only when materialized commercial state agrees", () => {
    const reservation = hotelRunnerReservation({
      total_amount: 1000,
      adminPricing: {
        mode: "hotelrunner_api",
        commercialVerified: true,
        clientTotal: 1000,
        netAfterExpensesTotal: 850,
      },
      supplierData: {
        hotelRunner: {
          transport: "hotelrunner_api",
          pricing: { currency: "SAR", grandTotal: 1000 },
        },
        hotelRunnerEmailCommercialEvidence: verifiedEmailEvidence(),
      },
    });

    expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
      isHotelRunner: true,
      available: true,
      verified: true,
      amount: 1000,
      currency: "SAR",
    });
    expect(getHotelRunnerPricingDisplay(reservation)).toMatchObject({
      summary: { grandTotal: 1000 },
      sourceGrandTotal: 1000,
    });

    reservation.adminPricing.clientTotal = 999;
    expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
      available: false,
      amount: null,
    });
  });

  it("supports an explicit provider-neutral verified guestGross role and fails closed on currency mismatch", () => {
    const reservation = hotelRunnerReservation({
      total_amount: 1200,
      currency: "SAR",
      adminPricing: {
        mode: "hotelrunner_api",
        commercialVerified: true,
        clientTotal: 1200,
        netAfterExpensesTotal: 423.45,
      },
      supplierData: {
        hotelRunner: {
          transport: "hotelrunner_api",
          pricing: { currency: "SAR", grandTotal: 423.45 },
        },
        otaCommercialEvidence: {
          contractVersion: 1,
          verificationState: "partial",
          sourceType: "authenticated_ota_email",
          provider: "expedia",
          evidenceHash: "b".repeat(64),
          sourceCurrency: "SAR",
          propertyCurrency: "SAR",
          bookingBasis: "reservation_total",
          provenance: {
            primary: {
              provider: "expedia",
              sourceType: "authenticated_ota_email",
              sourceHash: "c".repeat(64),
              sourceTimestamp: "2026-08-08T00:00:00.000Z",
              sourceId: "expedia-email-1",
            },
          },
          roles: {
            guestGross: {
              verified: true,
              sourceAmount: 1200,
              sourceCurrency: "SAR",
              propertyAmount: 1200,
              propertyCurrency: "SAR",
              bookingBasis: "reservation_total",
              evidenceType: "authenticated_source",
              sourceRef: "primary",
            },
          },
        },
      },
    });

    expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
      available: true,
      amount: 1200,
      currency: "SAR",
    });
    // The unmatched HotelRunner total remains raw evidence, never semantic gross.
    expect(getHotelRunnerPricingDisplay(reservation)).toMatchObject({
      summary: { grandTotal: null },
      sourceGrandTotal: 423.45,
    });
    expect(getHotelRunnerPayoutDisplay(reservation)).toMatchObject({
      verified: false,
      netAvailable: false,
      netAmount: null,
    });

    reservation.supplierData.otaCommercialEvidence.roles.guestGross.propertyCurrency =
      "USD";
    expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
      available: false,
      amount: null,
    });

    reservation.supplierData.otaCommercialEvidence.roles.guestGross.propertyCurrency =
      "SAR";
    reservation.supplierData.otaCommercialEvidence.sourceType =
      "authenticated_unregistered_source";
    reservation.supplierData.otaCommercialEvidence.provenance.primary.sourceType =
      "authenticated_unregistered_source";
    expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
      available: false,
      amount: null,
    });
  });

  it("shows only a trusted SAR guest-gross projection while retaining USD as provenance", () => {
    const reservation = hotelRunnerReservation({
      total_amount: null,
      currency: "SAR",
      adminPricing: {
        mode: "hotelrunner_api",
        commercialVerified: false,
        propertyCurrency: "SAR",
        clientTotal: null,
        rootTotal: 534,
        netAfterExpensesTotal: null,
      },
      supplierData: {
        hotelRunner: {
          transport: "hotelrunner_api",
          pricing: { currency: "USD", grandTotal: 112.92 },
        },
        otaCommercialEvidence: {
          contractVersion: 1,
          provider: "expedia",
          sourceType: "authenticated_provider_portal",
          sourceCurrency: "USD",
          propertyCurrency: "SAR",
          bookingBasis: "reservation_total",
          verificationState: "partial",
          evidenceHash: "d".repeat(64),
          provenance: {
            primary: {
              provider: "expedia",
              sourceType: "authenticated_provider_portal",
              sourceHash: "e".repeat(64),
              sourceTimestamp: "2026-08-08T00:00:00.000Z",
              sourceId: "expedia-portal-1",
            },
            conversion: {
              provider: "trusted-fx",
              sourceType: "trusted_exchange_evidence",
              sourceHash: "f".repeat(64),
              sourceTimestamp: "2026-08-08T00:00:00.000Z",
              sourceId: "usd-sar-2026-08-08",
            },
          },
          currencyConversion: {
            verified: true,
            sourceCurrency: "USD",
            propertyCurrency: "SAR",
            rate: 3.75,
            sourceRef: "conversion",
          },
          roles: {
            guestGross: {
              verified: true,
              sourceAmount: 146.46,
              sourceCurrency: "USD",
              propertyAmount: 549.23,
              propertyCurrency: "SAR",
              bookingBasis: "reservation_total",
              evidenceType: "authenticated_source",
              sourceRef: "primary",
            },
          },
          hotelRunnerReportedAmount: {
            amount: 112.92,
            currency: "USD",
            role: "unknown",
            roleVerified: false,
          },
        },
      },
    });

    expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
      available: true,
      verified: true,
      amount: 549.23,
      currency: "SAR",
      displayBasis: "property",
      sourceAmount: 146.46,
      sourceCurrency: "USD",
      propertyAvailable: true,
      propertyAmount: 549.23,
      propertyCurrency: "SAR",
    });
    expect(getReservationPropertyGuestGrossDisplay(reservation)).toMatchObject({
      available: true,
      amount: 549.23,
      currency: "SAR",
      sourceAmount: 146.46,
      sourceCurrency: "USD",
    });
    expect(getHotelRunnerPricingDisplay(reservation)).toMatchObject({
      summary: { grandTotal: null },
      sourceGrandTotal: 112.92,
    });
    expect(getHotelRunnerReportPricingDisplay(reservation)).toMatchObject({
      grossAmount: 549.23,
      currency: "SAR",
      grossDisplayBasis: "property",
      grossSourceAmount: 146.46,
      grossSourceCurrency: "USD",
      grossPropertyAmount: 549.23,
      localBaseAmount: 534,
      netAmount: null,
    });

    // A property projection without the contract's trusted conversion
    // evidence is rejected instead of being labelled SAR.
    delete reservation.supplierData.otaCommercialEvidence.currencyConversion;
    delete reservation.supplierData.otaCommercialEvidence.provenance.conversion;
    expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
      available: false,
      amount: null,
      propertyAvailable: false,
    });

    // Valid USD-only evidence remains available as provenance, never as the
    // primary UI amount and never under a SAR label.
    reservation.supplierData.otaCommercialEvidence.roles.guestGross.propertyAmount =
      null;
    reservation.supplierData.otaCommercialEvidence.roles.guestGross.propertyCurrency =
      null;
    expect(getReservationGuestGrossDisplay(reservation)).toMatchObject({
      available: false,
      verified: false,
      amount: null,
      currency: "SAR",
      displayBasis: "",
      sourceAvailable: true,
      sourceAmount: 146.46,
      sourceCurrency: "USD",
      propertyAvailable: false,
      propertyAmount: null,
      propertyCurrency: "SAR",
    });
  });

  it("authorizes a v1 payout only after a trusted SAR projection", () => {
    const reservation = hotelRunnerReservation({
      total_amount: null,
      currency: "SAR",
      adminPricing: {
        mode: "hotelrunner_api",
        commercialVerified: false,
        propertyCurrency: "SAR",
        rootTotal: 534,
        netAfterExpensesTotal: null,
      },
      supplierData: {
        hotelRunner: {
          transport: "hotelrunner_api",
          pricing: { currency: "USD", grandTotal: 112.92 },
        },
        otaCommercialEvidence: {
          contractVersion: 1,
          provider: "expedia",
          sourceType: "authenticated_provider_portal",
          sourceCurrency: "USD",
          propertyCurrency: "SAR",
          bookingBasis: "reservation_total",
          verificationState: "partial",
          evidenceHash: "7".repeat(64),
          provenance: {
            primary: {
              provider: "expedia",
              sourceType: "authenticated_provider_portal",
              sourceHash: "8".repeat(64),
              sourceTimestamp: "2026-08-08T00:00:00.000Z",
              sourceId: "expedia-portal-payout-display-1",
            },
          },
          roles: {
            hotelPayout: {
              verified: true,
              sourceAmount: 112.92,
              sourceCurrency: "USD",
              propertyAmount: null,
              propertyCurrency: null,
              bookingBasis: "reservation_total",
              evidenceType: "authenticated_source",
              sourceRef: "primary",
            },
          },
        },
      },
    });

    expect(getHotelRunnerPayoutDisplay(reservation)).toMatchObject({
      verified: false,
      netAvailable: false,
      netAmount: null,
      otaExpenseAvailable: false,
      platformMarginAvailable: false,
    });
    expect(getHotelRunnerReportPricingDisplay(reservation)).toMatchObject({
      payoutVerified: false,
      netAmount: null,
      otaExpenseAmount: null,
    });

    reservation.supplierData.otaCommercialEvidence.currencyConversion = {
      verified: true,
      sourceCurrency: "USD",
      propertyCurrency: "SAR",
      rate: 3.75,
      sourceRef: "conversion",
    };
    reservation.supplierData.otaCommercialEvidence.provenance.conversion = {
      provider: "trusted-fx",
      sourceType: "trusted_exchange_evidence",
      sourceHash: "9".repeat(64),
      sourceTimestamp: "2026-08-08T00:00:00.000Z",
      sourceId: "usd-sar-payout-2026-08-08",
    };
    reservation.supplierData.otaCommercialEvidence.roles.hotelPayout.propertyAmount =
      423.45;
    reservation.supplierData.otaCommercialEvidence.roles.hotelPayout.propertyCurrency =
      "SAR";
    expect(getHotelRunnerPayoutDisplay(reservation)).toMatchObject({
      verified: true,
      netAvailable: true,
      netAmount: 423.45,
      propertyCurrency: "SAR",
      otaExpenseAvailable: false,
      platformMarginAvailable: false,
    });
    expect(getHotelRunnerReportPricingDisplay(reservation)).toMatchObject({
      payoutVerified: true,
      netAmount: 423.45,
      otaExpenseAmount: null,
    });

    // A numerically familiar projection is not authority once its conversion
    // evidence disappears.
    delete reservation.supplierData.otaCommercialEvidence.currencyConversion;
    delete reservation.supplierData.otaCommercialEvidence.provenance.conversion;
    const unsafeProjection = getHotelRunnerPayoutDisplay(reservation);
    expect(unsafeProjection.netAvailable).toBe(false);
    expect(unsafeProjection.netAmount).toBeNull();
  });

  it("formats missing report money as unavailable while preserving zero", () => {
    expect(formatHotelRunnerReportAmount(null)).toBe("—");
    expect(formatHotelRunnerReportAmount(undefined)).toBe("—");
    expect(formatHotelRunnerReportAmount(0)).toBe("0");
    expect(formatHotelRunnerReportAmount("0")).toBe("0");
  });

  it("never treats gross, paid amount, or local root as hotel net", () => {
    const reservation = hotelRunnerReservation({
      sub_total: 700,
      paid_amount: 300,
      adminPricing: {
        mode: "hotelrunner_api",
        rootTotal: 700,
        commercialVerified: false,
        netAfterExpensesTotal: null,
      },
      supplierData: {
        hotelRunner: {
          transport: "hotelrunner_api",
          pricing: { grandTotal: 1000, paidAmount: 300 },
        },
      },
    });

    expect(getHotelRunnerPayoutDisplay(reservation)).toEqual({
      isHotelRunner: true,
      verified: false,
      netAvailable: false,
      otaExpenseAvailable: false,
      platformMarginAvailable: false,
      netAmount: null,
      otaExpenseAmount: null,
      platformMarginAmount: null,
    });
  });

  it("keeps direct HotelRunner platform commission unavailable until staff review", () => {
    const reservation = hotelRunnerReservation({
      sub_total: 700,
      commission: 0,
      pickedRoomsType: [
        {
          count: 1,
          pricingByDay: [
            { totalPriceWithCommission: 1000, rootPrice: 700 },
          ],
        },
      ],
    });

    expect(getHotelRunnerPlatformFinanceDisplay(reservation)).toEqual({
      isHotelRunner: true,
      available: false,
      amount: null,
      reason: "hotelrunner_platform_commission_unreviewed",
    });
  });

  it("accepts explicitly reviewed HotelRunner commission, including zero", () => {
    expect(
      getHotelRunnerPlatformFinanceDisplay(
        hotelRunnerReservation({
          financial_cycle: {
            commissionAssigned: true,
            commissionAmount: 0,
          },
        }),
      ),
    ).toMatchObject({ available: true, amount: 0 });

    expect(
      getHotelRunnerPlatformFinanceDisplay(
        hotelRunnerReservation({
          commission: 25,
          commissionData: { assigned: true, amount: 25 },
          financial_cycle: {
            commissionAssigned: true,
            commissionAmount: 25,
          },
        }),
      ),
    ).toMatchObject({ available: true, amount: 25 });
  });

  it("fails closed for conflicting assigned HotelRunner commission", () => {
    expect(
      getHotelRunnerPlatformFinanceDisplay(
        hotelRunnerReservation({
          commissionData: { assigned: true, amount: 25 },
          financial_cycle: {
            commissionAssigned: true,
            commissionAmount: 30,
          },
        }),
      ),
    ).toMatchObject({
      available: false,
      amount: null,
      reason: "hotelrunner_platform_commission_conflict",
    });
  });

  it("fails closed when assigned financial-cycle fields conflict", () => {
    expect(
      getHotelRunnerPlatformFinanceDisplay(
        hotelRunnerReservation({
          financial_cycle: {
            commissionAssigned: true,
            commissionAmount: 10,
            commissionValue: 12,
          },
        }),
      ),
    ).toMatchObject({
      available: false,
      amount: null,
      reason: "hotelrunner_platform_commission_conflict",
    });
  });

  it("fails closed when assigned commission data conflicts with top-level commission", () => {
    expect(
      getHotelRunnerPlatformFinanceDisplay(
        hotelRunnerReservation({
          commission: 12,
          commissionData: { assigned: true, amount: 10 },
        }),
      ),
    ).toMatchObject({
      available: false,
      amount: null,
      reason: "hotelrunner_platform_commission_conflict",
    });
  });

  it("fails closed when invalid assigned evidence accompanies a valid value", () => {
    expect(
      getHotelRunnerPlatformFinanceDisplay(
        hotelRunnerReservation({
          financial_cycle: {
            commissionAssigned: true,
            commissionAmount: 10,
            commissionValue: "invalid",
          },
        }),
      ),
    ).toMatchObject({
      available: false,
      amount: null,
      reason: "hotelrunner_platform_commission_invalid",
    });

    expect(
      getHotelRunnerPlatformFinanceDisplay(
        hotelRunnerReservation({
          commission: 10,
          commissionData: {
            assigned: true,
            amount: 10,
            commissionValue: -1,
          },
        }),
      ),
    ).toMatchObject({
      available: false,
      amount: null,
      reason: "hotelrunner_platform_commission_invalid",
    });
  });

  it("exposes an explicit net only after commercial evidence is verified", () => {
    const reservation = hotelRunnerReservation({
      adminPricing: {
        mode: "hotelrunner_api",
        commercialVerified: true,
        netAfterExpensesTotal: 850,
        otaExpenseTotal: 150,
        platformMarginTotal: 100,
      },
    });

    expect(getHotelRunnerPayoutDisplay(reservation)).toEqual({
      isHotelRunner: true,
      verified: true,
      netAvailable: true,
      otaExpenseAvailable: true,
      platformMarginAvailable: true,
      netAmount: 850,
      otaExpenseAmount: 150,
      platformMarginAmount: 100,
    });
  });

  it("fails closed when a verified flag exists without an explicit net", () => {
    const reservation = hotelRunnerReservation({
      adminPricing: {
        mode: "hotelrunner_api",
        commercialVerified: true,
        netAfterExpensesTotal: null,
      },
      ota_financial_summary: {
        commercialVerified: true,
        netAfterExpenses: null,
      },
    });

    expect(getHotelRunnerPayoutDisplay(reservation).verified).toBe(false);
    expect(getHotelRunnerPayoutDisplay(reservation).netAmount).toBeNull();
  });

  it("resolves each verified metric independently when net evidence is missing", () => {
    expect(
      getHotelRunnerPayoutDisplay(
        hotelRunnerReservation({
          adminPricing: {
            mode: "hotelrunner_api",
            commercialVerified: true,
            netAfterExpensesTotal: null,
            otaExpenseTotal: 0,
            platformMarginTotal: -12.5,
          },
        }),
      ),
    ).toMatchObject({
      verified: false,
      netAvailable: false,
      netAmount: null,
      otaExpenseAvailable: true,
      otaExpenseAmount: 0,
      platformMarginAvailable: true,
      platformMarginAmount: -12.5,
    });
  });

  it("does not borrow an amount from an unverified commercial source", () => {
    const reservation = hotelRunnerReservation({
      adminPricing: {
        mode: "hotelrunner_api",
        commercialVerified: false,
        netAfterExpensesTotal: 1000,
      },
      ota_financial_summary: {
        commercialVerified: true,
        netAfterExpenses: 850,
        otaExpenseTotal: 150,
      },
    });

    expect(getHotelRunnerPayoutDisplay(reservation)).toMatchObject({
      verified: true,
      netAmount: 850,
      otaExpenseAmount: 150,
    });
  });

  it("fails closed when verified payout evidence conflicts or is malformed", () => {
    expect(
      getHotelRunnerPayoutDisplay(
        hotelRunnerReservation({
          adminPricing: {
            mode: "hotelrunner_api",
            commercialVerified: true,
            netAfterExpensesTotal: 850,
          },
          ota_financial_summary: {
            commercialVerified: true,
            netAfterExpenses: 840,
          },
        }),
      ),
    ).toMatchObject({ verified: false, netAmount: null });

    expect(
      getHotelRunnerPayoutDisplay(
        hotelRunnerReservation({
          ota_financial_summary: {
            commercialVerified: true,
            netAfterExpenses: 850,
            netAfterOtaExpenses: "invalid",
          },
        }),
      ),
    ).toMatchObject({ verified: false, netAmount: null });
  });

  it("fails closed per optional payout metric while preserving reviewed zero", () => {
    expect(
      getHotelRunnerPayoutDisplay(
        hotelRunnerReservation({
          adminPricing: {
            mode: "hotelrunner_api",
            commercialVerified: true,
            netAfterExpensesTotal: 850,
            otaExpenseTotal: 150,
            platformMarginTotal: 0,
          },
          ota_financial_summary: {
            commercialVerified: true,
            netAfterExpenses: 850,
            otaExpenseTotal: 140,
            platformProfit: 0,
          },
        }),
      ),
    ).toMatchObject({
      verified: true,
      netAvailable: true,
      otaExpenseAvailable: false,
      platformMarginAvailable: true,
      netAmount: 850,
      otaExpenseAmount: null,
      platformMarginAmount: 0,
    });
  });

  it("does not let an empty snake-case summary hide verified camel-case evidence", () => {
    const reservation = hotelRunnerReservation({
      ota_financial_summary: {},
      otaFinancialSummary: {
        commercialVerified: true,
        netAfterExpenses: 850,
        otaExpenseTotal: 150,
      },
    });

    expect(getHotelRunnerPayoutDisplay(reservation)).toMatchObject({
      verified: true,
      netAmount: 850,
      otaExpenseAmount: 150,
    });
  });

  it("does not change non-HotelRunner reservations", () => {
    expect(
      getHotelRunnerPayoutDisplay({
        adminPricing: {
          mode: "ota_platform_sync",
          commercialVerified: true,
          netAfterExpensesTotal: 850,
        },
      }),
    ).toEqual({ isHotelRunner: false, verified: false, netAmount: null });
  });

  it("labels the PMS root amount as local base without inventing OTA commission", () => {
    expect(
      getHotelRunnerReportPricingDisplay(
        hotelRunnerReservation({
          sub_total: 700,
          supplierData: {
            hotelRunner: {
              transport: "hotelrunner_api",
              pricing: { grandTotal: 1000 },
            },
          },
        }),
      ),
    ).toMatchObject({
      isHotelRunner: true,
      grossAmount: null,
      localBaseAmount: 700,
      payoutVerified: false,
      netAmount: null,
      otaExpenseAmount: null,
    });
  });

  it("shows only explicitly verified HotelRunner payout evidence in reports", () => {
    expect(
      getHotelRunnerReportPricingDisplay(
        hotelRunnerReservation({
          sub_total: 700,
          adminPricing: {
            mode: "hotelrunner_api",
            rootTotal: 700,
            commercialVerified: true,
            netAfterExpensesTotal: 850,
            otaExpenseTotal: 150,
          },
        }),
      ),
    ).toMatchObject({
      grossAmount: null,
      localBaseAmount: 700,
      payoutVerified: true,
      netAmount: 850,
      otaExpenseAmount: 150,
    });
  });
});
