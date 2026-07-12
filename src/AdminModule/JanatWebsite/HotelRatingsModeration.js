import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { Button, Input, Modal, Select, Spin, Switch, message } from "antd";
import {
  CheckCircleOutlined,
  ReloadOutlined,
  StarFilled,
  StopOutlined,
} from "@ant-design/icons";
import {
  getAdminHotelReviews,
  updateAdminHotelReviewStatus,
} from "../apiAdmin";

const PAGE_SIZE_OPTIONS = [20, 50];

const TEXT = {
  en: {
    title: "Hotel Ratings",
    subtitle:
      "Moderate genuine guest feedback. Inactive reviews are hidden publicly and excluded from hotel rating calculations.",
    refresh: "Refresh",
    total: "All reviews",
    active: "Active",
    inactive: "Inactive",
    average: "Active average",
    search: "Search guest or confirmation number",
    allStatuses: "All statuses",
    allHotels: "All hotels",
    allRatings: "All ratings",
    stars: "stars",
    pageSize: "Rows per page",
    hotel: "Hotel",
    guest: "Guest",
    confirmation: "Confirmation",
    room: "Room",
    rating: "Rating",
    comment: "Comment",
    date: "Submitted",
    status: "Public status",
    verified: "Verified stay",
    unverified: "Unverified",
    noComment: "No comment provided",
    noRoom: "Not available",
    noRows: "No reviews match these filters.",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    showing: "Showing",
    activateTitle: "Activate this review?",
    deactivateTitle: "Deactivate this review?",
    activateHelp:
      "The review will be visible publicly and included in the hotel rating.",
    deactivateHelp:
      "The review and comment will be hidden publicly and excluded from the hotel rating.",
    activateAction: "Activate",
    deactivateAction: "Deactivate",
    cancel: "Cancel",
    updated: "Review status updated.",
    loadError: "Could not load hotel reviews.",
    updateError: "Could not update the review status.",
  },
  ar: {
    title: "تقييمات الفنادق",
    subtitle:
      "إدارة آراء الضيوف الحقيقية. التقييمات غير النشطة لا تظهر للزوار ولا تدخل في حساب تقييم الفندق.",
    refresh: "تحديث",
    total: "كل التقييمات",
    active: "نشط",
    inactive: "غير نشط",
    average: "متوسط النشط",
    search: "ابحث باسم الضيف أو رقم التأكيد",
    allStatuses: "كل الحالات",
    allHotels: "كل الفنادق",
    allRatings: "كل التقييمات",
    stars: "نجوم",
    pageSize: "عدد الصفوف",
    hotel: "الفندق",
    guest: "الضيف",
    confirmation: "رقم التأكيد",
    room: "الغرفة",
    rating: "التقييم",
    comment: "التعليق",
    date: "تاريخ الإرسال",
    status: "حالة الظهور",
    verified: "إقامة موثقة",
    unverified: "غير موثق",
    noComment: "لم تتم إضافة تعليق",
    noRoom: "غير متاح",
    noRows: "لا توجد تقييمات مطابقة لهذه الفلاتر.",
    previous: "السابق",
    next: "التالي",
    page: "صفحة",
    of: "من",
    showing: "عرض",
    activateTitle: "تفعيل هذا التقييم؟",
    deactivateTitle: "إلغاء تفعيل هذا التقييم؟",
    activateHelp: "سيظهر التقييم للزوار وسيدخل في حساب تقييم الفندق.",
    deactivateHelp:
      "سيتم إخفاء التقييم والتعليق ولن يدخلا في حساب تقييم الفندق.",
    activateAction: "تفعيل",
    deactivateAction: "إلغاء التفعيل",
    cancel: "إلغاء",
    updated: "تم تحديث حالة التقييم.",
    loadError: "تعذر تحميل تقييمات الفنادق.",
    updateError: "تعذر تحديث حالة التقييم.",
  },
};

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanText = (value, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const reviewStatus = (review = {}) =>
  cleanText(review.status, "active").toLowerCase() === "inactive"
    ? "inactive"
    : "active";

const reviewHotel = (review = {}) =>
  cleanText(
    review.hotelName ||
      review.hotel?.hotelName ||
      review.hotelId?.hotelName ||
      review.hotel?.name,
    "—",
  );

const reviewGuest = (review = {}) => {
  const combinedName = [
    review.firstName || review.reviewer?.firstName,
    review.lastName || review.reviewer?.lastName,
  ]
    .map((part) => cleanText(part))
    .filter(Boolean)
    .join(" ");
  return cleanText(
    review.guestName ||
      review.reviewerName ||
      review.displayName ||
      review.reviewer?.displayName ||
      review.name ||
      combinedName,
    "—",
  );
};

const reviewConfirmation = (review = {}) =>
  cleanText(
    review.confirmationNumber ||
      review.confirmation_number ||
      review.reservationSnapshot?.confirmationNumber ||
      review.reservation?.confirmation_number,
    "—",
  );

const reviewRoom = (review = {}) => {
  const raw =
    review.roomLabel ||
    review.roomNumber ||
    review.room_number ||
    review.reservationSnapshot?.roomNumber ||
    review.reservation?.roomNumber;
  if (Array.isArray(raw)) return raw.map(cleanText).filter(Boolean).join(", ");
  return cleanText(raw);
};

const isVerifiedReview = (review = {}) =>
  review.isVerifiedStay === true ||
  review.verifiedStay === true ||
  review.isVerified === true ||
  cleanText(review.verificationStatus).toLowerCase() === "verified" ||
  Boolean(review.reservationId || review.reservation?._id);

const formatSubmittedAt = (value, locale) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const normalizePagination = (pagination = {}, fallback = {}) => {
  const page = Math.max(
    numberValue(pagination.page || pagination.currentPage, fallback.page || 1),
    1,
  );
  const limit = Math.max(
    numberValue(
      pagination.limit || pagination.pageSize,
      fallback.limit || PAGE_SIZE_OPTIONS[0],
    ),
    1,
  );
  const total = Math.max(
    numberValue(
      pagination.total ||
        pagination.totalItems ||
        pagination.totalDocuments ||
        pagination.totalReviews,
      fallback.total || 0,
    ),
    0,
  );
  const totalPages = Math.max(
    numberValue(
      pagination.totalPages || pagination.pages,
      Math.ceil(total / limit) || 1,
    ),
    1,
  );
  return { page, limit, total, totalPages };
};

const summaryValue = (summary, keys, fallback = 0) => {
  for (const key of keys) {
    if (summary?.[key] !== undefined && summary?.[key] !== null) {
      return numberValue(summary[key], fallback);
    }
  }
  return fallback;
};

const HotelRatingsModeration = ({ chosenLanguage, userId, token }) => {
  const isArabic = chosenLanguage === "Arabic";
  const L = TEXT[isArabic ? "ar" : "en"];
  const locale = isArabic ? "ar-SA" : "en-US";
  const requestSequence = useRef(0);
  const mounted = useRef(true);

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({});
  const [hotels, setHotels] = useState([]);
  const [pagination, setPagination] = useState(
    normalizePagination({}, { page: 1, limit: PAGE_SIZE_OPTIONS[0] }),
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
  const [status, setStatus] = useState("all");
  const [hotelId, setHotelId] = useState("all");
  const [rating, setRating] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingReviewId, setUpdatingReviewId] = useState("");

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestSequence.current += 1;
    };
  }, []);

  const loadReviews = useCallback(
    async ({ silent = false } = {}) => {
      if (!userId || !token) return;
      const requestId = requestSequence.current + 1;
      requestSequence.current = requestId;
      if (!silent) setLoading(true);

      const response = await getAdminHotelReviews(userId, token, {
        page,
        limit,
        status,
        hotelId,
        rating,
        search,
      });

      if (!mounted.current || requestId !== requestSequence.current) return;
      if (response?.success === false || response?.error) {
        message.error(response?.error || L.loadError);
        setReviews([]);
        setSummary({});
        setHotels([]);
        setPagination(normalizePagination({}, { page, limit, total: 0 }));
        if (!silent) setLoading(false);
        return;
      }

      const nextReviews = Array.isArray(response?.reviews)
        ? response.reviews
        : [];
      const nextPagination = normalizePagination(response?.pagination, {
        page,
        limit,
        total: nextReviews.length,
      });
      setReviews(nextReviews);
      setSummary(response?.summary || {});
      setHotels(Array.isArray(response?.hotels) ? response.hotels : []);
      setPagination(nextPagination);
      if (page > nextPagination.totalPages) {
        setPage(nextPagination.totalPages);
      }
      if (!silent) setLoading(false);
    },
    [hotelId, L.loadError, limit, page, rating, search, status, token, userId],
  );

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const setFilter = (setter) => (value) => {
    setPage(1);
    setter(value);
  };

  const applySearch = (value) => {
    setPage(1);
    setSearch(cleanText(value));
  };

  const handleStatusChange = (review, shouldActivate) => {
    const id = cleanText(review?._id || review?.id);
    if (!id || updatingReviewId) return;
    const nextStatus = shouldActivate ? "active" : "inactive";

    Modal.confirm({
      title: shouldActivate ? L.activateTitle : L.deactivateTitle,
      content: shouldActivate ? L.activateHelp : L.deactivateHelp,
      okText: shouldActivate ? L.activateAction : L.deactivateAction,
      cancelText: L.cancel,
      okButtonProps: { danger: !shouldActivate },
      onOk: async () => {
        setUpdatingReviewId(id);
        const response = await updateAdminHotelReviewStatus(
          id,
          userId,
          token,
          nextStatus,
        );
        if (!mounted.current) return;
        setUpdatingReviewId("");
        if (response?.success === false || response?.error) {
          message.error(response?.error || L.updateError);
          return;
        }
        message.success(L.updated);
        await loadReviews({ silent: true });
      },
    });
  };

  const metrics = useMemo(() => {
    const total = summaryValue(
      summary,
      ["total", "totalReviews", "all"],
      pagination.total,
    );
    const active = summaryValue(summary, ["active", "activeReviews"]);
    const inactive = summaryValue(summary, ["inactive", "inactiveReviews"]);
    const average = summaryValue(summary, [
      "average",
      "averageRating",
      "activeAverage",
    ]);
    return { total, active, inactive, average };
  }, [pagination.total, summary]);

  const startRow = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const endRow = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <ReviewsSurface dir={isArabic ? "rtl" : "ltr"}>
      <ReviewsHeader>
        <div>
          <h2>{L.title}</h2>
          <p>{L.subtitle}</p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => loadReviews()}
        >
          {L.refresh}
        </Button>
      </ReviewsHeader>

      <SummaryGrid>
        <SummaryCard $tone="blue">
          <span>{L.total}</span>
          <strong>{metrics.total.toLocaleString(locale)}</strong>
        </SummaryCard>
        <SummaryCard $tone="green">
          <span>{L.active}</span>
          <strong>{metrics.active.toLocaleString(locale)}</strong>
        </SummaryCard>
        <SummaryCard $tone="red">
          <span>{L.inactive}</span>
          <strong>{metrics.inactive.toLocaleString(locale)}</strong>
        </SummaryCard>
        <SummaryCard $tone="gold">
          <span>{L.average}</span>
          <strong>
            <StarFilled /> {metrics.average.toFixed(1)}
          </strong>
        </SummaryCard>
      </SummaryGrid>

      <FilterGrid>
        <label className="search-field">
          <span>{L.search}</span>
          <Input.Search
            allowClear
            value={searchInput}
            placeholder={L.search}
            aria-label={L.search}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={applySearch}
          />
        </label>
        <label>
          <span>{L.status}</span>
          <Select
            aria-label={L.status}
            value={status}
            onChange={setFilter(setStatus)}
            options={[
              { value: "all", label: L.allStatuses },
              { value: "active", label: L.active },
              { value: "inactive", label: L.inactive },
            ]}
          />
        </label>
        <label>
          <span>{L.hotel}</span>
          <Select
            aria-label={L.hotel}
            showSearch
            optionFilterProp="label"
            value={hotelId}
            onChange={setFilter(setHotelId)}
            options={[
              { value: "all", label: L.allHotels },
              ...hotels
                .map((hotel) => ({
                  value: cleanText(
                    hotel?._id ||
                      hotel?.id ||
                      (typeof hotel?.hotelId === "object"
                        ? hotel.hotelId?._id || hotel.hotelId?.id
                        : hotel?.hotelId),
                  ),
                  label: cleanText(
                    hotel?.hotelName ||
                      hotel?.name ||
                      hotel?.hotelId?.hotelName,
                    "—",
                  ),
                }))
                .filter((hotel) => hotel.value),
            ]}
          />
        </label>
        <label>
          <span>{L.rating}</span>
          <Select
            aria-label={L.rating}
            value={rating}
            onChange={setFilter(setRating)}
            options={[
              { value: "all", label: L.allRatings },
              ...[5, 4, 3, 2, 1].map((value) => ({
                value: String(value),
                label: `${value} ${L.stars}`,
              })),
            ]}
          />
        </label>
        <label>
          <span>{L.pageSize}</span>
          <Select
            aria-label={L.pageSize}
            value={limit}
            onChange={(value) => {
              setPage(1);
              setLimit(value);
            }}
            options={PAGE_SIZE_OPTIONS.map((value) => ({
              value,
              label: String(value),
            }))}
          />
        </label>
      </FilterGrid>

      {loading ? (
        <LoadingBlock aria-live="polite">
          <Spin size="large" />
        </LoadingBlock>
      ) : (
        <TableWrap>
          <table>
            <caption>{L.subtitle}</caption>
            <thead>
              <tr>
                <th scope="col">{L.hotel}</th>
                <th scope="col">{L.guest}</th>
                <th scope="col">{L.confirmation}</th>
                <th scope="col">{L.room}</th>
                <th scope="col">{L.rating}</th>
                <th scope="col">{L.comment}</th>
                <th scope="col">{L.date}</th>
                <th scope="col">{L.status}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length ? (
                reviews.map((review, index) => {
                  const id = cleanText(
                    review?._id || review?.id,
                    `review-${index}`,
                  );
                  const statusValue = reviewStatus(review);
                  const verified = isVerifiedReview(review);
                  const ratingValue = Math.min(
                    Math.max(numberValue(review?.rating), 0),
                    5,
                  );
                  return (
                    <tr key={id}>
                      <td data-label={L.hotel}>{reviewHotel(review)}</td>
                      <td data-label={L.guest}>
                        <strong>{reviewGuest(review)}</strong>
                        <VerificationBadge $verified={verified}>
                          {verified ? (
                            <CheckCircleOutlined />
                          ) : (
                            <StopOutlined />
                          )}
                          {verified ? L.verified : L.unverified}
                        </VerificationBadge>
                      </td>
                      <td data-label={L.confirmation} dir="ltr">
                        {reviewConfirmation(review)}
                      </td>
                      <td data-label={L.room}>
                        {reviewRoom(review) || L.noRoom}
                      </td>
                      <td data-label={L.rating}>
                        <RatingStars aria-label={`${ratingValue} ${L.stars}`}>
                          <span aria-hidden="true">
                            {"★".repeat(Math.round(ratingValue))}
                            {"☆".repeat(5 - Math.round(ratingValue))}
                          </span>
                          <small>{ratingValue.toFixed(1)}</small>
                        </RatingStars>
                      </td>
                      <td data-label={L.comment}>
                        <CommentText $empty={!cleanText(review?.comment)}>
                          {cleanText(review?.comment, L.noComment)}
                        </CommentText>
                      </td>
                      <td data-label={L.date}>
                        {formatSubmittedAt(
                          review?.submittedAt || review?.createdAt,
                          locale,
                        )}
                      </td>
                      <td data-label={L.status}>
                        <StatusControl>
                          <Switch
                            checked={statusValue === "active"}
                            loading={updatingReviewId === id}
                            disabled={Boolean(updatingReviewId)}
                            checkedChildren={L.active}
                            unCheckedChildren={L.inactive}
                            aria-label={`${L.status}: ${
                              statusValue === "active" ? L.active : L.inactive
                            }`}
                            onChange={(checked) =>
                              handleStatusChange(review, checked)
                            }
                          />
                        </StatusControl>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="empty-row">
                  <td colSpan="8">{L.noRows}</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      )}

      <PaginationRow aria-label={L.page}>
        <Button
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => Math.max(current - 1, 1))}
        >
          {L.previous}
        </Button>
        <div aria-live="polite">
          <strong>
            {L.page} {pagination.page.toLocaleString(locale)} {L.of}{" "}
            {pagination.totalPages.toLocaleString(locale)}
          </strong>
          <span>
            {L.showing} {startRow.toLocaleString(locale)}–
            {endRow.toLocaleString(locale)} /{" "}
            {pagination.total.toLocaleString(locale)}
          </span>
        </div>
        <Button
          disabled={page >= pagination.totalPages || loading}
          onClick={() =>
            setPage((current) => Math.min(current + 1, pagination.totalPages))
          }
        >
          {L.next}
        </Button>
      </PaginationRow>
    </ReviewsSurface>
  );
};

export default HotelRatingsModeration;

const ReviewsSurface = styled.section`
  display: grid;
  gap: 16px;
  min-width: 0;
  color: #173a5f;
`;

const ReviewsHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(139, 190, 227, 0.42);
  border-radius: 8px;
  background: linear-gradient(135deg, #f7fbff, #ffffff);

  h2 {
    margin: 0 0 6px;
    color: #0b3158;
    font-size: clamp(1.18rem, 1.8vw, 1.55rem);
    font-weight: 950;
  }

  p {
    max-width: 760px;
    margin: 0;
    color: #4b647c;
    font-weight: 650;
    line-height: 1.55;
  }

  .ant-btn {
    min-height: 40px;
    font-weight: 850;
  }

  @media (max-width: 620px) {
    align-items: stretch;
    flex-direction: column;

    .ant-btn {
      width: 100%;
    }
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 440px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.article`
  --accent: ${(props) =>
    props.$tone === "green"
      ? "#0f8a5f"
      : props.$tone === "red"
        ? "#c2414b"
        : props.$tone === "gold"
          ? "#d18b00"
          : "#1677b8"};
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #d8e7f3;
  border-inline-start: 4px solid var(--accent);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(13, 49, 88, 0.06);

  span {
    color: #526b82;
    font-size: 0.82rem;
    font-weight: 850;
  }

  strong {
    color: var(--accent);
    font-size: 1.45rem;
    font-weight: 950;
  }
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1.7fr) repeat(4, minmax(145px, 0.8fr));
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(139, 190, 227, 0.36);
  border-radius: 8px;
  background: #f8fbff;

  label {
    display: grid;
    align-content: end;
    gap: 6px;
    min-width: 0;
  }

  label > span:first-child {
    color: #36546f;
    font-size: 0.78rem;
    font-weight: 900;
  }

  .ant-select,
  .ant-input-search {
    width: 100%;
  }

  @media (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));

    .search-field {
      grid-column: span 2;
    }
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr 1fr;

    .search-field {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;

    .search-field {
      grid-column: auto;
    }
  }
`;

const LoadingBlock = styled.div`
  display: grid;
  min-height: 260px;
  place-items: center;
  border: 1px solid rgba(139, 190, 227, 0.32);
  border-radius: 8px;
  background: #ffffff;
`;

const TableWrap = styled.div`
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid rgba(139, 190, 227, 0.42);
  border-radius: 8px;
  background: #ffffff;

  table {
    width: 100%;
    min-width: 1040px;
    border-collapse: collapse;
  }

  caption {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  th,
  td {
    padding: 11px 10px;
    border-bottom: 1px solid #e5eef7;
    text-align: start;
    vertical-align: top;
  }

  th {
    background: #eaf4fb;
    color: #0b3158;
    font-size: 0.78rem;
    font-weight: 950;
    white-space: nowrap;
  }

  td {
    color: #243f59;
    font-size: 0.86rem;
    font-weight: 650;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr:hover td {
    background: #f9fcff;
  }

  .empty-row td {
    padding: 42px 16px;
    color: #627990;
    font-weight: 800;
    text-align: center;
  }

  @media (max-width: 760px) {
    overflow: visible;
    border: 0;
    background: transparent;

    table,
    tbody,
    tr,
    td {
      display: block;
      width: 100%;
      min-width: 0;
    }

    thead {
      display: none;
    }

    tr {
      margin-bottom: 12px;
      border: 1px solid rgba(139, 190, 227, 0.42);
      border-radius: 8px;
      background: #ffffff;
      overflow: hidden;
    }

    td {
      display: grid;
      grid-template-columns: minmax(105px, 0.42fr) minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      padding: 10px 12px;
    }

    td::before {
      content: attr(data-label);
      color: #526b82;
      font-size: 0.76rem;
      font-weight: 950;
    }

    .empty-row td {
      display: block;
    }

    .empty-row td::before {
      display: none;
    }
  }
`;

const VerificationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  padding: 2px 7px;
  border: 1px solid ${(props) => (props.$verified ? "#9bd7ba" : "#d9e2ec")};
  border-radius: 999px;
  background: ${(props) => (props.$verified ? "#eaf8f1" : "#f6f8fa")};
  color: ${(props) => (props.$verified ? "#08724c" : "#617487")};
  font-size: 0.7rem;
  font-weight: 850;
`;

const RatingStars = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #d18b00;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 1px;
  white-space: nowrap;

  small {
    color: #526b82;
    font-size: 0.76rem;
    letter-spacing: 0;
  }
`;

const CommentText = styled.p`
  max-width: 340px;
  margin: 0;
  color: ${(props) => (props.$empty ? "#7b8c9d" : "#243f59")};
  font-style: ${(props) => (props.$empty ? "italic" : "normal")};
  font-weight: ${(props) => (props.$empty ? 600 : 700)};
  line-height: 1.48;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const StatusControl = styled.div`
  display: flex;
  justify-content: flex-start;
  min-width: 104px;

  .ant-switch {
    min-width: 82px;
  }

  .ant-switch-checked {
    background: #0f8a5f;
  }
`;

const PaginationRow = styled.nav`
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(139, 190, 227, 0.36);
  border-radius: 8px;
  background: #f8fbff;

  div {
    display: grid;
    gap: 2px;
    justify-items: center;
    color: #526b82;
    font-size: 0.78rem;
  }

  strong {
    color: #173a5f;
    font-size: 0.88rem;
  }

  .ant-btn {
    min-width: 102px;
    font-weight: 850;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr 1fr;

    div {
      grid-column: 1 / -1;
      grid-row: 1;
    }

    .ant-btn {
      width: 100%;
    }
  }
`;
