import {
  PAYMENT_BREAKDOWN_KEYS,
  RECONCILIATION_STATUSES,
  amountForPaymentKey,
  filterReservationsByReconciliation,
  hasStoredReconciliationEntry,
  isPaymentKeyReconciled,
  moneyCents,
  normalizePaymentBreakdownKeys,
  summarizeReservationReconciliation,
} from "./paymentReconciliation";

const reservation = ({
  cash = 10.1,
  card = 20.2,
  reconciliation = {},
} = {}) => ({
  _id: "reservation-1",
  paid_amount_breakdown: {
    paid_at_hotel_cash: cash,
    paid_at_hotel_card: card,
  },
  payment_reconciliation: { breakdown: reconciliation },
});

describe("payment reconciliation helpers", () => {
  it("keeps the eight supported methods in a stable order", () => {
    expect(PAYMENT_BREAKDOWN_KEYS).toHaveLength(8);
    expect(
      normalizePaymentBreakdownKeys([
        "unknown",
        "paid_at_hotel_card",
        "paid_at_hotel_cash",
        "paid_at_hotel_card",
      ]),
    ).toEqual(["paid_at_hotel_cash", "paid_at_hotel_card"]);
  });

  it("converts values and sums selected methods in exact cents", () => {
    expect(moneyCents("1,234.56")).toBe(123456);
    expect(moneyCents(0.1 + 0.2)).toBe(30);
    expect(moneyCents("not-money")).toBe(0);
    expect(amountForPaymentKey(reservation(), "paid_at_hotel_cash")).toBe(10.1);
    expect(
      amountForPaymentKey(reservation({ cash: -5 }), "paid_at_hotel_cash"),
    ).toBe(0);

    const summary = summarizeReservationReconciliation(reservation(), [
      "paid_at_hotel_cash",
      "paid_at_hotel_card",
    ]);
    expect(summary.totalCents).toBe(3030);
    expect(summary.waitingCents).toBe(3030);
  });

  it("only treats a reconciled snapshot as current when the amount still matches", () => {
    const row = reservation({
      cash: 50,
      card: 0,
      reconciliation: {
        paid_at_hotel_cash: { status: "reconciled", amountCents: 5000 },
      },
    });
    expect(isPaymentKeyReconciled(row, "paid_at_hotel_cash")).toBe(true);

    row.paid_amount_breakdown.paid_at_hotel_cash = 51;
    expect(isPaymentKeyReconciled(row, "paid_at_hotel_cash")).toBe(false);
  });

  it("marks partial multi-method reconciliation as mixed", () => {
    const row = reservation({
      reconciliation: {
        paid_at_hotel_cash: { status: "reconciled", amountCents: 1010 },
      },
    });
    const partial = summarizeReservationReconciliation(row, [
      "paid_at_hotel_cash",
      "paid_at_hotel_card",
    ]);
    expect(partial.status).toBe("mixed");
    expect(partial.hasReconciled).toBe(true);
    expect(partial.hasWaiting).toBe(true);
    expect(partial.reconciledCents).toBe(1010);
    expect(partial.waitingCents).toBe(2020);

    const cashOnly = summarizeReservationReconciliation(row, [
      "paid_at_hotel_cash",
    ]);
    expect(cashOnly.status).toBe(RECONCILIATION_STATUSES.RECONCILED);
  });

  it("keeps a multi-method row when any selected method is positive and ignores zero keys for status", () => {
    const row = reservation({
      cash: 0,
      card: 12.34,
      reconciliation: {
        paid_at_hotel_card: {
          status: "reconciled",
          amountCents: 1234,
        },
      },
    });
    const summary = summarizeReservationReconciliation(row, [
      "paid_at_hotel_cash",
      "paid_at_hotel_card",
    ]);
    expect(summary.positiveKeys).toEqual(["paid_at_hotel_card"]);
    expect(summary.totalCents).toBe(1234);
    expect(summary.status).toBe("reconciled");
  });

  it("filters legacy rows as waiting and honors API-derived snapshot entries", () => {
    const legacy = reservation({ cash: 5, card: 0 });
    const reconciled = {
      ...reservation({ cash: 5, card: 0 }),
      _id: "reservation-2",
      reconciliation_by_breakdown: {
        paid_at_hotel_cash: {
          status: "reconciled",
          amountCents: 500,
        },
      },
    };
    expect(
      filterReservationsByReconciliation(
        [legacy, reconciled],
        ["paid_at_hotel_cash"],
        "reconciled",
      ),
    ).toEqual([reconciled]);
    expect(
      filterReservationsByReconciliation(
        [legacy, reconciled],
        ["paid_at_hotel_cash"],
        "waiting",
      ),
    ).toEqual([legacy]);
  });

  it("includes mixed rows in both filters and trusts only the safe stored-entry flag", () => {
    const mixed = reservation({
      reconciliation: {
        paid_at_hotel_cash: { status: "reconciled", amountCents: 1010 },
      },
    });
    expect(
      filterReservationsByReconciliation(
        [mixed],
        ["paid_at_hotel_cash", "paid_at_hotel_card"],
        "reconciled",
      ),
    ).toEqual([mixed]);
    expect(
      filterReservationsByReconciliation(
        [mixed],
        ["paid_at_hotel_cash", "paid_at_hotel_card"],
        "waiting",
      ),
    ).toEqual([mixed]);

    const safe = {
      reconciliation_by_breakdown: {
        paid_at_hotel_cash: {
          status: "waiting",
          amountCents: 0,
          hasStoredEntry: true,
        },
        paid_at_hotel_card: {
          status: "reconciled",
          amountCents: 0,
          hasStoredEntry: false,
        },
      },
    };
    expect(hasStoredReconciliationEntry(safe, "paid_at_hotel_cash")).toBe(true);
    expect(hasStoredReconciliationEntry(safe, "paid_at_hotel_card")).toBe(
      false,
    );
  });
});
