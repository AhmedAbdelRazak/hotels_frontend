import React, { useMemo } from "react";
import styled from "styled-components";
import {
  getHotelRunnerPayoutDisplay,
  getHotelRunnerPricingDisplay,
} from "./hotelRunnerPricingDisplay";

const COPY = {
  English: {
    title: "HotelRunner gross pricing breakdown",
    sourceNote:
      "Amounts below are the reservation, room, tax, extra, discount, and payment figures reported by HotelRunner.",
    netTitle: "Hotel net after OTA expenses",
    netPending: "Awaiting verified OTA payout",
    netPendingHelp:
      "HotelRunner has not supplied a verified OTA commission or hotel payout for this reservation. Gross, paid, and local contracted amounts are not used as net.",
    subTotal: "Room subtotal",
    extrasTotal: "Extras",
    adjustmentsTotal: "Adjustments",
    itemTotal: "Item total",
    taxTotal: "Taxes",
    grandTotal: "Gross reservation total",
    paidAmount: "Amount reported paid",
    rooms: "HotelRunner room pricing",
    room: "Room",
    beforeTax: "Room price before tax",
    afterTax: "Room total after tax",
    basePrice: "Room base price",
    roomSubTotal: "Room subtotal before tax",
    fixedAdjustments: "Fixed adjustments",
    includedTaxes: "Included taxes",
    excludedFees: "Excluded taxes and fees",
    promotions: "Promotions / discounts",
    refund: "Cancellation refund",
    penalty: "Cancellation penalty",
    extras: "Room extras",
    name: "Name",
    code: "Code",
    quantity: "Quantity",
    price: "Price",
    base: "Base",
    total: "Total",
    included: "Included in price",
    yes: "Yes",
    no: "No",
    nightly: "Nightly prices",
    date: "Date",
    finalPrice: "Final price",
    originalPrice: "Original price",
    discount: "Discount",
    rate: "Rate",
    payments: "HotelRunner payment records",
    paymentAmount: "Payment amount",
    state: "State",
    method: "Method",
    paidAt: "Paid at",
    exchangedAmount: "Exchanged amount",
    exchangeRate: "Exchange rate",
    noDetailedBreakdown:
      "The gross total is available, but HotelRunner did not supply a more detailed pricing snapshot for this record.",
  },
  Arabic: {
    title:
      "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0645\u0646 HotelRunner",
    sourceNote:
      "\u062a\u0639\u0631\u0636 \u0647\u0630\u0647 \u0627\u0644\u0642\u064a\u0645 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u062c\u0632 \u0648\u0627\u0644\u063a\u0631\u0641 \u0648\u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u0625\u0636\u0627\u0641\u0627\u062a \u0648\u0627\u0644\u062e\u0635\u0648\u0645\u0627\u062a \u0648\u0627\u0644\u062f\u0641\u0639\u0627\u062a \u0627\u0644\u0645\u0631\u0633\u0644\u0629 \u0645\u0646 HotelRunner.",
    netTitle:
      "\u0635\u0627\u0641\u064a \u0627\u0644\u0641\u0646\u062f\u0642 \u0628\u0639\u062f \u0645\u0635\u0627\u0631\u064a\u0641 OTA",
    netPending:
      "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u062a\u062d\u0642\u0642 \u0645\u0628\u0644\u063a \u0627\u0644\u062a\u062d\u0648\u064a\u0644 \u0645\u0646 OTA",
    netPendingHelp:
      "\u0644\u0645 \u064a\u0631\u0633\u0644 HotelRunner \u0639\u0645\u0648\u0644\u0629 OTA \u0623\u0648 \u0635\u0627\u0641\u064a \u0645\u0633\u062a\u062d\u0642\u0627\u062a \u0645\u0648\u062b\u0642\u0627\u064b \u0644\u0647\u0630\u0627 \u0627\u0644\u062d\u062c\u0632. \u0644\u0627 \u064a\u062a\u0645 \u0627\u0639\u062a\u0628\u0627\u0631 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0623\u0648 \u0627\u0644\u0645\u062f\u0641\u0648\u0639 \u0623\u0648 \u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u062d\u0644\u064a \u0635\u0627\u0641\u064a\u0627\u064b.",
    subTotal:
      "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u063a\u0631\u0641 \u0627\u0644\u0641\u0631\u0639\u064a",
    extrasTotal: "\u0627\u0644\u0625\u0636\u0627\u0641\u0627\u062a",
    adjustmentsTotal: "\u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a",
    itemTotal:
      "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0628\u0646\u0648\u062f",
    taxTotal: "\u0627\u0644\u0636\u0631\u0627\u0626\u0628",
    grandTotal:
      "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u062c\u0632",
    paidAmount:
      "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0628\u0644\u063a \u0639\u0646\u0647\u0627 \u0643\u0645\u062f\u0641\u0648\u0639\u0629",
    rooms: "\u062a\u0633\u0639\u064a\u0631 \u063a\u0631\u0641 HotelRunner",
    room: "\u0627\u0644\u063a\u0631\u0641\u0629",
    beforeTax:
      "\u0633\u0639\u0631 \u0627\u0644\u063a\u0631\u0641\u0629 \u0642\u0628\u0644 \u0627\u0644\u0636\u0631\u064a\u0628\u0629",
    afterTax:
      "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u063a\u0631\u0641\u0629 \u0628\u0639\u062f \u0627\u0644\u0636\u0631\u064a\u0628\u0629",
    basePrice:
      "\u0633\u0639\u0631 \u0627\u0644\u063a\u0631\u0641\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064a",
    roomSubTotal:
      "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u063a\u0631\u0641\u0629 \u0627\u0644\u0641\u0631\u0639\u064a \u0642\u0628\u0644 \u0627\u0644\u0636\u0631\u064a\u0628\u0629",
    fixedAdjustments:
      "\u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a \u0627\u0644\u062b\u0627\u0628\u062a\u0629",
    includedTaxes:
      "\u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0627\u0644\u0645\u0634\u0645\u0648\u0644\u0629",
    excludedFees:
      "\u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u0631\u0633\u0648\u0645 \u063a\u064a\u0631 \u0627\u0644\u0645\u0634\u0645\u0648\u0644\u0629",
    promotions:
      "\u0627\u0644\u0639\u0631\u0648\u0636 / \u0627\u0644\u062e\u0635\u0648\u0645\u0627\u062a",
    refund:
      "\u0645\u0628\u0644\u063a \u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0627\u0644\u0625\u0644\u063a\u0627\u0621",
    penalty:
      "\u063a\u0631\u0627\u0645\u0629 \u0627\u0644\u0625\u0644\u063a\u0627\u0621",
    extras:
      "\u0625\u0636\u0627\u0641\u0627\u062a \u0627\u0644\u063a\u0631\u0641\u0629",
    name: "\u0627\u0644\u0627\u0633\u0645",
    code: "\u0627\u0644\u0631\u0645\u0632",
    quantity: "\u0627\u0644\u0643\u0645\u064a\u0629",
    price: "\u0627\u0644\u0633\u0639\u0631",
    base: "\u0627\u0644\u0623\u0633\u0627\u0633\u064a",
    total: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
    included:
      "\u0645\u0634\u0645\u0648\u0644 \u0641\u064a \u0627\u0644\u0633\u0639\u0631",
    yes: "\u0646\u0639\u0645",
    no: "\u0644\u0627",
    nightly:
      "\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0644\u064a\u0644\u064a\u0629",
    date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    finalPrice:
      "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064a",
    originalPrice:
      "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0623\u0635\u0644\u064a",
    discount: "\u0627\u0644\u062e\u0635\u0645",
    rate: "\u0627\u0644\u0633\u0639\u0631",
    payments: "\u0633\u062c\u0644\u0627\u062a \u062f\u0641\u0639 HotelRunner",
    paymentAmount:
      "\u0645\u0628\u0644\u063a \u0627\u0644\u062f\u0641\u0639\u0629",
    state: "\u0627\u0644\u062d\u0627\u0644\u0629",
    method: "\u0627\u0644\u0637\u0631\u064a\u0642\u0629",
    paidAt: "\u0648\u0642\u062a \u0627\u0644\u062f\u0641\u0639",
    exchangedAmount:
      "\u0627\u0644\u0645\u0628\u0644\u063a \u0628\u0639\u062f \u0627\u0644\u062a\u062d\u0648\u064a\u0644",
    exchangeRate: "\u0633\u0639\u0631 \u0627\u0644\u0635\u0631\u0641",
    noDetailedBreakdown:
      "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0645\u062a\u0627\u062d\u060c \u0648\u0644\u0643\u0646 HotelRunner \u0644\u0645 \u064a\u0631\u0633\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u062a\u0633\u0639\u064a\u0631 \u0625\u0636\u0627\u0641\u064a\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0633\u062c\u0644.",
  },
};

const SUMMARY_FIELDS = [
  ["subTotal", "subTotal"],
  ["extrasTotal", "extrasTotal"],
  ["adjustmentsTotal", "adjustmentsTotal"],
  ["itemTotal", "itemTotal"],
  ["taxTotal", "taxTotal"],
  ["grandTotal", "grandTotal"],
  ["paidAmount", "paidAmount"],
];

const ROOM_FIELDS = [
  ["priceBeforeTax", "beforeTax"],
  ["totalAfterTax", "afterTax"],
  ["roomBasePrice", "basePrice"],
  ["roomSubTotal", "roomSubTotal"],
  ["extrasTotal", "extrasTotal"],
  ["fixedAdjustmentsTotal", "fixedAdjustments"],
  ["includedTaxesTotal", "includedTaxes"],
  ["excludedFeesAndTaxesTotal", "excludedFees"],
  ["promotionsTotal", "promotions"],
  ["cancellationRefund", "refund"],
  ["cancellationPenalty", "penalty"],
];

const formatAmount = (amount, language) =>
  new Intl.NumberFormat(language === "Arabic" ? "ar-SA" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const MoneyValue = ({ amount, currency, language }) => (
  <span className="hr-money" dir="ltr">
    {formatAmount(amount, language)} {currency}
  </span>
);

const AmountGrid = ({ fields, source, copy, currency, language }) => (
  <div className="hr-amount-grid">
    {fields.map(([field, label]) =>
      source[field] === null || source[field] === undefined ? null : (
        <div className="hr-amount-card" key={field}>
          <span>{copy[label]}</span>
          <strong>
            <MoneyValue
              amount={source[field]}
              currency={currency}
              language={language}
            />
          </strong>
        </div>
      ),
    )}
  </div>
);

const HotelRunnerPricingBreakdown = ({
  reservation,
  chosenLanguage = "English",
}) => {
  const language = chosenLanguage === "Arabic" ? "Arabic" : "English";
  const copy = COPY[language];
  const pricing = useMemo(
    () => getHotelRunnerPricingDisplay(reservation),
    [reservation],
  );
  const payout = useMemo(
    () => getHotelRunnerPayoutDisplay(reservation),
    [reservation],
  );

  if (!pricing.isHotelRunner) return null;

  const hasDetailedBreakdown =
    [
      "subTotal",
      "extrasTotal",
      "adjustmentsTotal",
      "itemTotal",
      "taxTotal",
    ].some((field) => pricing.summary[field] !== null) ||
    pricing.rooms.length > 0 ||
    pricing.payments.length > 0;

  return (
    <Breakdown $isArabic={language === "Arabic"}>
      <header>
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.sourceNote}</p>
        </div>
        <span className="hr-source-pill">HotelRunner API</span>
      </header>

      <AmountGrid
        fields={SUMMARY_FIELDS}
        source={pricing.summary}
        copy={copy}
        currency={pricing.currency}
        language={language}
      />

      <div
        className={`hr-net-status ${payout.verified ? "verified" : "pending"}`}
      >
        <div>
          <span>{copy.netTitle}</span>
          <strong>
            {payout.verified ? (
              <MoneyValue
                amount={payout.netAmount}
                currency={pricing.currency}
                language={language}
              />
            ) : (
              copy.netPending
            )}
          </strong>
        </div>
        {!payout.verified ? <p>{copy.netPendingHelp}</p> : null}
      </div>

      {!hasDetailedBreakdown ? (
        <p className="hr-empty">{copy.noDetailedBreakdown}</p>
      ) : null}

      {pricing.rooms.length ? (
        <section>
          <h5>{copy.rooms}</h5>
          {pricing.rooms.map((room, roomIndex) => (
            <article className="hr-room" key={`${room.key}-${roomIndex}`}>
              <div className="hr-room-heading">
                <strong>{room.name || `${copy.room} ${roomIndex + 1}`}</strong>
                <small dir="ltr">
                  {[
                    room.invCode && `inv: ${room.invCode}`,
                    room.rateCode && `rate: ${room.rateCode}`,
                    room.ratePlanCode && `plan: ${room.ratePlanCode}`,
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </small>
              </div>
              <AmountGrid
                fields={ROOM_FIELDS}
                source={room}
                copy={copy}
                currency={pricing.currency}
                language={language}
              />
              {room.extras.length ? (
                <div className="hr-table-wrap">
                  <h6>{copy.extras}</h6>
                  <table>
                    <thead>
                      <tr>
                        <th>{copy.name}</th>
                        <th>{copy.code}</th>
                        <th>{copy.quantity}</th>
                        <th>{copy.price}</th>
                        <th>{copy.base}</th>
                        <th>{copy.promotions}</th>
                        <th>{copy.total}</th>
                        <th>{copy.included}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {room.extras.map((extra, extraIndex) => (
                        <tr key={`${extra.key}-${extraIndex}`}>
                          <td>{extra.name || "-"}</td>
                          <td dir="ltr">{extra.code || "-"}</td>
                          <td>{extra.quantity ?? "-"}</td>
                          {[
                            "price",
                            "basePrice",
                            "promotionsTotal",
                            "total",
                          ].map((field) => (
                            <td key={field}>
                              {extra[field] === null ? (
                                "-"
                              ) : (
                                <MoneyValue
                                  amount={extra[field]}
                                  currency={pricing.currency}
                                  language={language}
                                />
                              )}
                            </td>
                          ))}
                          <td>
                            {extra.includedInPrice === null
                              ? "-"
                              : extra.includedInPrice
                                ? copy.yes
                                : copy.no}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {room.dailyPrices.length ? (
                <div className="hr-table-wrap">
                  <h6>{copy.nightly}</h6>
                  <table>
                    <thead>
                      <tr>
                        <th>{copy.date}</th>
                        <th>{copy.finalPrice}</th>
                        <th>{copy.originalPrice}</th>
                        <th>{copy.discount}</th>
                        <th>{copy.rate}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {room.dailyPrices.map((night, nightIndex) => (
                        <tr key={`${night.date}-${nightIndex}`}>
                          <td dir="ltr">{night.date || "-"}</td>
                          {["price", "originalPrice", "discount"].map(
                            (field) => (
                              <td key={field}>
                                {night[field] === null ? (
                                  "-"
                                ) : (
                                  <MoneyValue
                                    amount={night[field]}
                                    currency={pricing.currency}
                                    language={language}
                                  />
                                )}
                              </td>
                            ),
                          )}
                          <td dir="ltr">
                            {night.rateCode || night.ratePlanCode || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {pricing.payments.length ? (
        <section>
          <h5>{copy.payments}</h5>
          <div className="hr-payment-list">
            {pricing.payments.map((payment, index) => (
              <div className="hr-payment" key={`${payment.key}-${index}`}>
                <div>
                  <span>{copy.paymentAmount}</span>
                  <strong>
                    {payment.amount === null ? (
                      "-"
                    ) : (
                      <MoneyValue
                        amount={payment.amount}
                        currency={payment.currency}
                        language={language}
                      />
                    )}
                  </strong>
                </div>
                {payment.state ? (
                  <div>
                    <span>{copy.state}</span>
                    <strong>{payment.state}</strong>
                  </div>
                ) : null}
                {payment.method ? (
                  <div>
                    <span>{copy.method}</span>
                    <strong>{payment.method}</strong>
                  </div>
                ) : null}
                {payment.paidAt ? (
                  <div>
                    <span>{copy.paidAt}</span>
                    <strong dir="ltr">{payment.paidAt}</strong>
                  </div>
                ) : null}
                {payment.exchangedAmount !== null ? (
                  <div>
                    <span>{copy.exchangedAmount}</span>
                    <strong>
                      <MoneyValue
                        amount={payment.exchangedAmount}
                        currency={payment.propertyCurrency}
                        language={language}
                      />
                    </strong>
                  </div>
                ) : null}
                {payment.exchangeRate !== null ? (
                  <div>
                    <span>{copy.exchangeRate}</span>
                    <strong dir="ltr">{payment.exchangeRate}</strong>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Breakdown>
  );
};

const Breakdown = styled.div`
  direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  background: linear-gradient(145deg, #f8fbff, #eff6ff);
  text-align: ${(props) => (props.$isArabic ? "right" : "left")};

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  h4,
  h5,
  h6,
  p {
    margin: 0;
  }

  h4,
  h5,
  h6,
  strong {
    color: #0f2742;
  }

  h4 {
    font-size: 1rem;
    font-weight: 950;
  }

  header p,
  .hr-net-status p,
  .hr-empty {
    color: #53657c;
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.5;
    margin-top: 3px;
  }

  .hr-source-pill {
    flex: 0 0 auto;
    padding: 4px 9px;
    border-radius: 999px;
    background: #dbeafe;
    color: #1d4ed8;
    font-size: 0.72rem;
    font-weight: 950;
  }

  .hr-amount-grid,
  .hr-payment,
  .hr-payment-list {
    display: grid;
    gap: 8px;
  }

  .hr-amount-grid {
    grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  }

  .hr-amount-card,
  .hr-payment > div {
    padding: 8px 10px;
    border: 1px solid #dbe7f5;
    border-radius: 9px;
    background: #fff;
  }

  .hr-amount-card > span,
  .hr-payment span,
  .hr-net-status span {
    display: block;
    color: #64748b;
    font-size: 0.72rem;
    font-weight: 850;
  }

  .hr-amount-card strong,
  .hr-payment strong,
  .hr-net-status strong {
    display: block;
    font-size: 0.9rem;
    font-weight: 950;
    margin-top: 2px;
  }

  .hr-money {
    display: inline-block;
    unicode-bidi: isolate;
  }

  .hr-net-status {
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 10px;
  }

  .hr-net-status.pending {
    border: 1px solid #f59e0b;
    background: #fffbeb;
  }

  .hr-net-status.pending strong {
    color: #92400e;
  }

  .hr-net-status.verified {
    border: 1px solid #86efac;
    background: #f0fdf4;
  }

  .hr-empty {
    margin-top: 10px;
    padding: 10px;
    border: 1px dashed #93c5fd;
    border-radius: 9px;
    background: #fff;
  }

  section {
    margin-top: 14px;
  }

  section > h5 {
    font-size: 0.9rem;
    font-weight: 950;
    margin-bottom: 7px;
  }

  .hr-room {
    overflow: hidden;
    margin-top: 8px;
    border: 1px solid #bfdbfe;
    border-radius: 11px;
    background: #fff;
  }

  .hr-room > .hr-amount-grid {
    padding: 10px;
  }

  .hr-room-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    background: #eaf3ff;
  }

  .hr-room-heading small {
    color: #52677f;
    font-size: 0.7rem;
  }

  .hr-table-wrap {
    overflow-x: auto;
    padding: 0 10px 10px;
  }

  .hr-table-wrap h6 {
    font-size: 0.78rem;
    font-weight: 950;
    margin: 0 0 5px;
  }

  table {
    width: 100%;
    min-width: 590px;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 6px 8px;
    border-top: 1px solid #e2e8f0;
    font-size: 0.76rem;
    text-align: center;
    white-space: nowrap;
  }

  th {
    color: #52677f;
    background: #f8fafc;
    font-weight: 900;
  }

  .hr-payment-list {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .hr-payment {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 8px;
    border: 1px solid #bfdbfe;
    border-radius: 10px;
    background: #f8fafc;
  }

  @media (max-width: 640px) {
    header,
    .hr-room-heading {
      align-items: stretch;
      flex-direction: column;
    }

    .hr-source-pill {
      align-self: flex-start;
    }

    .hr-amount-grid,
    .hr-payment {
      grid-template-columns: 1fr;
    }
  }
`;

export default HotelRunnerPricingBreakdown;
