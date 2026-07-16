import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import HotelRatingsModeration, {
  canOpenReviewReservationDetails,
  mergeMatchingReservationDetails,
  reviewReservationId,
} from "./HotelRatingsModeration";
import {
  getAdminHotelReviews,
  getAdminHotelReviewReservationDetails,
} from "../apiAdmin";

jest.mock("@ant-design/icons", () => ({
  CheckCircleOutlined: () => <span aria-hidden="true" />,
  ReloadOutlined: () => <span aria-hidden="true" />,
  StarFilled: () => <span aria-hidden="true" />,
  StopOutlined: () => <span aria-hidden="true" />,
}));

jest.mock("antd", () => {
  const React = require("react");

  const Button = ({ children, onClick, disabled, "aria-label": ariaLabel }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
  const Input = ({ value, onChange, ...props }) => (
    <input value={value || ""} onChange={onChange} {...props} />
  );
  Input.Search = ({ value, onChange, onSearch, placeholder, disabled }) => (
    <input
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSearch?.(event.currentTarget.value);
      }}
    />
  );
  const Modal = ({ open, children, title, onCancel }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button type="button" aria-label="close details" onClick={onCancel} />
        {children}
      </div>
    ) : null;
  Modal.useModal = () => [{ confirm: jest.fn() }, null];

  return {
    Alert: ({ message, description }) => (
      <div role="alert">
        {message} {description}
      </div>
    ),
    Button,
    Input,
    Modal,
    Select: ({ "aria-label": ariaLabel }) => (
      <button type="button" aria-label={ariaLabel} />
    ),
    Spin: () => <span role="status">loading</span>,
    Switch: ({ "aria-label": ariaLabel, disabled, checked }) => (
      <button
        type="button"
        role="switch"
        aria-label={ariaLabel}
        aria-checked={Boolean(checked)}
        disabled={disabled}
      />
    ),
    message: {
      error: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
    },
  };
});

jest.mock("../AllReservation/MoreDetails", () => ({ reservation }) => (
  <div data-testid="reservation-details">{reservation?._id}</div>
));

jest.mock("../apiAdmin", () => ({
  getAdminHotelReviews: jest.fn(),
  getAdminHotelReviewReservationDetails: jest.fn(),
  updateAdminHotelReviewVisibility: jest.fn(),
}));

const linkedReview = (overrides = {}) => ({
  _id: "review-1",
  hotel: { hotelName: "Zad Ajyad" },
  firstName: "Test",
  lastName: "Guest",
  confirmationNumber: "CONF-123",
  reservationId: "reservation-123",
  roomLabel: "Room 301",
  rating: 5,
  comment: "Excellent",
  ratingVisible: true,
  commentVisible: true,
  verifiedStay: true,
  createdAt: "2026-07-15T10:00:00.000Z",
  ...overrides,
});

const reviewResponse = (reviews) => ({
  reviews,
  summary: { total: reviews.length, active: reviews.length, inactive: 0 },
  hotels: [],
  pagination: {
    page: 1,
    limit: 20,
    total: reviews.length,
    totalPages: 1,
  },
});

const authorizedUser = {
  _id: "admin-1",
  activeUser: true,
  role: 1000,
  accessTo: ["JannatBookingWebsite", "AllReservations"],
};

const ratingsElement = (
  currentUser = authorizedUser,
  chosenLanguage = "English",
) => (
  <HotelRatingsModeration
    chosenLanguage={chosenLanguage}
    userId="admin-1"
    token="token-1"
    currentUser={currentUser}
  />
);

const renderRatings = (
  currentUser = authorizedUser,
  chosenLanguage = "English",
) =>
  render(
    ratingsElement(currentUser, chosenLanguage),
  );

describe("hotel rating reservation details", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves linked reservation IDs and requires reservation access", () => {
    expect(reviewReservationId({ reservationId: " reservation-1 " })).toBe(
      "reservation-1",
    );
    expect(
      reviewReservationId({ reservationId: { _id: "reservation-2" } }),
    ).toBe("reservation-2");
    expect(reviewReservationId({})).toBe("");
    expect(canOpenReviewReservationDetails(authorizedUser)).toBe(true);
    expect(
      canOpenReviewReservationDetails({
        activeUser: true,
        role: 1000,
        accessTo: ["JannatBookingWebsite"],
      }),
    ).toBe(false);
    expect(
      canOpenReviewReservationDetails({
        activeUser: false,
        role: 1000,
        accessTo: ["AllReservations"],
      }),
    ).toBe(false);
    expect(
      canOpenReviewReservationDetails({
        activeUser: true,
        role: 1000,
        accessTo: ["AllReservations"],
      }),
    ).toBe(false);
    expect(
      canOpenReviewReservationDetails({
        activeUser: true,
        role: 2000,
        accessTo: ["JannatBookingWebsite", "HotelsReservations"],
      }),
    ).toBe(false);
    expect(
      mergeMatchingReservationDetails(
        { _id: "reservation-1", hotelId: { _id: "hotel-1" } },
        { _id: "reservation-2", payment: "paid" },
      ),
    ).toEqual({ _id: "reservation-1", hotelId: { _id: "hotel-1" } });
    expect(
      mergeMatchingReservationDetails(
        {
          _id: "reservation-1",
          payment: "not paid",
          hotelId: { _id: "hotel-1" },
        },
        { _id: "reservation-1", payment: "paid" },
      ),
    ).toEqual({
      _id: "reservation-1",
      payment: "paid",
      hotelId: { _id: "hotel-1" },
    });
  });

  it("keeps the cell RTL-aligned, fetches by reservation ID, and opens MoreDetails", async () => {
    getAdminHotelReviews.mockResolvedValue(reviewResponse([linkedReview()]));
    getAdminHotelReviewReservationDetails.mockResolvedValue({
      _id: "reservation-123",
      confirmation_number: "CONF-123",
      hotelId: { _id: "hotel-1", hotelName: "Zad Ajyad" },
    });

    renderRatings(authorizedUser, "Arabic");

    const trigger = await screen.findByRole("button", {
      name: "فتح تفاصيل الحجز لرقم التأكيد CONF-123",
    });
    expect(screen.getAllByRole("columnheader")).toHaveLength(8);
    expect(screen.getAllByRole("cell")).toHaveLength(8);
    const confirmationCell = screen.getAllByRole("cell")[2];
    expect(confirmationCell).not.toHaveAttribute("dir");
    expect(screen.getByText("CONF-123")).toHaveAttribute("dir", "ltr");

    fireEvent.click(trigger);

    await waitFor(() =>
      expect(getAdminHotelReviewReservationDetails).toHaveBeenCalledWith(
        "reservation-123",
        "admin-1",
        "token-1",
      ),
    );
    expect(await screen.findByTestId("reservation-details")).toHaveTextContent(
      "reservation-123",
    );
  });

  it("leaves unlinked or website-only confirmations as isolated plain text", async () => {
    getAdminHotelReviews.mockResolvedValue(
      reviewResponse([
        linkedReview({ _id: "review-linked" }),
        linkedReview({
          _id: "review-unlinked",
          confirmationNumber: "MANUAL-456",
          reservationId: null,
          verifiedStay: false,
        }),
      ]),
    );

    renderRatings({
      _id: "website-only-1",
      activeUser: true,
      role: 1000,
      accessTo: ["JannatBookingWebsite"],
    });

    expect(await screen.findByText("CONF-123")).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("MANUAL-456")).toHaveAttribute("dir", "ltr");
    expect(
      screen.queryByRole("button", { name: /Open reservation details for/ }),
    ).not.toBeInTheDocument();
    expect(getAdminHotelReviewReservationDetails).not.toHaveBeenCalled();
  });

  it("ignores an older request when a second confirmation is opened", async () => {
    let resolveFirstRequest;
    getAdminHotelReviews.mockResolvedValue(
      reviewResponse([
        linkedReview(),
        linkedReview({
          _id: "review-2",
          confirmationNumber: "CONF-456",
          reservationId: "reservation-456",
        }),
      ]),
    );
    getAdminHotelReviewReservationDetails.mockImplementation((reservationId) => {
      if (reservationId === "reservation-123") {
        return new Promise((resolve) => {
          resolveFirstRequest = resolve;
        });
      }
      return Promise.resolve({
        _id: "reservation-456",
        confirmation_number: "CONF-456",
        hotelId: { _id: "hotel-1" },
      });
    });

    renderRatings();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open reservation details for CONF-123",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open reservation details for CONF-456",
      }),
    );

    expect(await screen.findByTestId("reservation-details")).toHaveTextContent(
      "reservation-456",
    );

    await act(async () => {
      resolveFirstRequest({
        _id: "reservation-123",
        confirmation_number: "CONF-123",
        hotelId: { _id: "hotel-1" },
      });
    });

    expect(screen.getByTestId("reservation-details")).toHaveTextContent(
      "reservation-456",
    );
  });

  it("does not render late details after the modal is closed", async () => {
    let resolveRequest;
    getAdminHotelReviews.mockResolvedValue(reviewResponse([linkedReview()]));
    getAdminHotelReviewReservationDetails.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    renderRatings();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open reservation details for CONF-123",
      }),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "close details" }));

    await act(async () => {
      resolveRequest({
        _id: "reservation-123",
        confirmation_number: "CONF-123",
        hotelId: { _id: "hotel-1" },
      });
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reservation-details")).not.toBeInTheDocument();
  });

  it("closes and cancels details when authoritative access is removed", async () => {
    let resolveRequest;
    getAdminHotelReviews.mockResolvedValue(reviewResponse([linkedReview()]));
    getAdminHotelReviewReservationDetails.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const view = renderRatings();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open reservation details for CONF-123",
      }),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    view.rerender(
      ratingsElement({
        _id: "admin-1",
        activeUser: true,
        role: 1000,
        accessTo: ["JannatBookingWebsite"],
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    await act(async () => {
      resolveRequest({
        _id: "reservation-123",
        confirmation_number: "CONF-123",
        hotelId: { _id: "hotel-1" },
      });
    });

    expect(screen.queryByTestId("reservation-details")).not.toBeInTheDocument();
  });
});
