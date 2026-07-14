import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Spin,
  Switch,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  ReloadOutlined,
  StarFilled,
  StopOutlined,
} from "@ant-design/icons";
import {
  getAdminHotelReviews,
  updateAdminHotelReviewVisibility,
} from "../apiAdmin";
import {
  effectiveReviewVisibility,
  hasAuthoritativeReviewVisibility,
  hasPendingReviewOperations,
  mergeServerReviewVisibility,
  reviewVisibilityMode,
  runVisibilityMutationIfMounted,
  serverConfirmedVisibilityChange,
  shouldReleaseReviewOperationOnCancel,
} from "./hotelReviewVisibility";

const PAGE_SIZE_OPTIONS = [20, 50];

const TEXT = {
  en: {
    title: "Hotel Ratings",
    subtitle:
      "Control the public star rating and written comment independently. Every change affects only the setting you choose.",
    refresh: "Refresh",
    total: "All reviews",
    active: "Has public content",
    inactive: "Fully hidden",
    average: "Public rating average",
    search: "Search guest or confirmation number",
    allStatuses: "All visibility states",
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
    status: "Overall visibility",
    visibility: "Public visibility",
    visibilityHint: "Rating and comment are controlled separately.",
    ratingPublic: "Rating public",
    commentPublic: "Comment public",
    shown: "Shown",
    hidden: "Hidden",
    bothPublic: "Rating and comment shown",
    ratingOnly: "Rating shown; comment hidden",
    commentOnly: "Comment shown; rating hidden",
    nothingPublic: "Rating and comment hidden",
    ratingShownHelp:
      "The stars are public and included in the hotel rating calculation.",
    ratingHiddenHelp:
      "The stars are not public and are excluded from the hotel rating calculation.",
    commentShownHelp: "The written guest comment is public.",
    commentHiddenHelp: "The written guest comment is not public.",
    noCommentVisibilityHelp:
      "The guest did not provide text, so comment visibility cannot be changed.",
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
    showRatingTitle: "Show this rating publicly?",
    hideRatingTitle: "Hide this rating publicly?",
    showCommentTitle: "Show this comment publicly?",
    hideCommentTitle: "Hide this comment publicly?",
    showRatingHelp:
      "The stars will appear publicly and be included in the hotel rating calculation. The comment setting will not change.",
    hideRatingHelp:
      "The stars will be hidden and excluded from the hotel rating calculation. The comment setting will not change.",
    showCommentHelp:
      "The written comment will appear publicly. The rating setting will not change.",
    hideCommentHelp:
      "The written comment will be hidden. The rating setting will not change.",
    showRatingAction: "Show rating",
    hideRatingAction: "Hide rating",
    showCommentAction: "Show comment",
    hideCommentAction: "Hide comment",
    cancel: "Cancel",
    ratingShown: "Rating is now public. The comment setting was not changed.",
    ratingHidden: "Rating is now hidden. The comment setting was not changed.",
    commentShown: "Comment is now public. The rating setting was not changed.",
    commentHidden: "Comment is now hidden. The rating setting was not changed.",
    loadError: "Could not load hotel reviews.",
    loadErrorTitle: "Hotel reviews are unavailable",
    retry: "Try again",
    updateError: "Could not update this visibility setting.",
    syncError:
      "The change was saved, but the server did not return its effective visibility. Refreshing the review list.",
    conflictError:
      "The review changed before this update finished. The server's current visibility will be shown after refresh.",
  },
  ar: {
    title: "تقييمات الفنادق",
    subtitle:
      "تحكّم في ظهور النجوم والتعليق المكتوب بشكل مستقل. كل تغيير يؤثر فقط في الخيار الذي تحدده.",
    refresh: "تحديث",
    total: "كل التقييمات",
    active: "يوجد محتوى ظاهر",
    inactive: "مخفي بالكامل",
    average: "متوسط التقييمات الظاهرة",
    search: "ابحث باسم الضيف أو رقم التأكيد",
    allStatuses: "كل حالات الظهور",
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
    status: "الظهور العام",
    visibility: "الظهور للزوار",
    visibilityHint: "يتم التحكم في التقييم والتعليق بشكل منفصل.",
    ratingPublic: "إظهار التقييم",
    commentPublic: "إظهار التعليق",
    shown: "ظاهر",
    hidden: "مخفي",
    bothPublic: "التقييم والتعليق ظاهران",
    ratingOnly: "التقييم ظاهر والتعليق مخفي",
    commentOnly: "التعليق ظاهر والتقييم مخفي",
    nothingPublic: "التقييم والتعليق مخفيان",
    ratingShownHelp: "النجوم ظاهرة وتدخل في حساب تقييم الفندق.",
    ratingHiddenHelp: "النجوم مخفية ولا تدخل في حساب تقييم الفندق.",
    commentShownHelp: "تعليق الضيف المكتوب ظاهر للزوار.",
    commentHiddenHelp: "تعليق الضيف المكتوب مخفي عن الزوار.",
    noCommentVisibilityHelp:
      "لم يكتب الضيف تعليقاً، لذلك لا يمكن تغيير ظهور التعليق.",
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
    showRatingTitle: "إظهار هذا التقييم للزوار؟",
    hideRatingTitle: "إخفاء هذا التقييم عن الزوار؟",
    showCommentTitle: "إظهار هذا التعليق للزوار؟",
    hideCommentTitle: "إخفاء هذا التعليق عن الزوار؟",
    showRatingHelp:
      "ستظهر النجوم وتدخل في حساب تقييم الفندق. لن يتغير إعداد التعليق.",
    hideRatingHelp:
      "ستُخفى النجوم ولن تدخل في حساب تقييم الفندق. لن يتغير إعداد التعليق.",
    showCommentHelp:
      "سيظهر التعليق المكتوب للزوار. لن يتغير إعداد التقييم.",
    hideCommentHelp:
      "سيُخفى التعليق المكتوب عن الزوار. لن يتغير إعداد التقييم.",
    showRatingAction: "إظهار التقييم",
    hideRatingAction: "إخفاء التقييم",
    showCommentAction: "إظهار التعليق",
    hideCommentAction: "إخفاء التعليق",
    cancel: "إلغاء",
    ratingShown: "أصبح التقييم ظاهراً. لم يتغير إعداد التعليق.",
    ratingHidden: "أصبح التقييم مخفياً. لم يتغير إعداد التعليق.",
    commentShown: "أصبح التعليق ظاهراً. لم يتغير إعداد التقييم.",
    commentHidden: "أصبح التعليق مخفياً. لم يتغير إعداد التقييم.",
    loadError: "تعذر تحميل تقييمات الفنادق.",
    loadErrorTitle: "تعذر عرض تقييمات الفنادق",
    retry: "إعادة المحاولة",
    updateError: "تعذر تحديث إعداد الظهور هذا.",
    syncError:
      "تم حفظ التغيير، لكن الخادم لم يُرجع حالة الظهور الفعلية. جارٍ تحديث القائمة.",
    conflictError:
      "تغيّرت حالة المراجعة قبل اكتمال التحديث. ستظهر حالة الخادم الحالية بعد تحديث القائمة.",
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
  const visibleLoadRequests = useRef(new Set());
  const reviewOperationIds = useRef(new Set());
  const reviewOperationPhases = useRef(new Map());
  const [modalApi, modalContextHolder] = Modal.useModal();

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
  const [loadError, setLoadError] = useState("");
  const [reviewOperations, setReviewOperations] = useState({});
  const navigationLocked = hasPendingReviewOperations(reviewOperations);

  useEffect(() => {
    const activeLoadRequests = visibleLoadRequests.current;
    const activeReviewOperations = reviewOperationIds.current;
    const activeReviewOperationPhases = reviewOperationPhases.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestSequence.current += 1;
      activeLoadRequests.clear();
      activeReviewOperations.clear();
      activeReviewOperationPhases.clear();
    };
  }, []);

  const loadReviews = useCallback(
    async ({ silent = false, notifyError = true } = {}) => {
      if (!userId || !token) return;
      const requestId = requestSequence.current + 1;
      requestSequence.current = requestId;
      if (!silent) {
        visibleLoadRequests.current.add(requestId);
        setLoading(true);
      }

      let response;
      try {
        response = await getAdminHotelReviews(userId, token, {
          page,
          limit,
          status,
          hotelId,
          rating,
          search,
        });
      } catch (error) {
        response = { success: false, error: error?.message || L.loadError };
      } finally {
        if (!silent) {
          visibleLoadRequests.current.delete(requestId);
          if (mounted.current) {
            setLoading(visibleLoadRequests.current.size > 0);
          }
        }
      }

      if (!mounted.current || requestId !== requestSequence.current) return;
      if (response?.success === false || response?.error) {
        const errorText = response?.error || L.loadError;
        setLoadError(errorText);
        if (notifyError) message.error(errorText);
        return false;
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
      setLoadError("");
      if (page > nextPagination.totalPages) {
        setPage(nextPagination.totalPages);
      }
      return true;
    },
    [hotelId, L.loadError, limit, page, rating, search, status, token, userId],
  );

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const setFilter = (setter) => (value) => {
    if (reviewOperationIds.current.size) return;
    setPage(1);
    setter(value);
  };

  const applySearch = (value) => {
    if (reviewOperationIds.current.size) return;
    setPage(1);
    setSearch(cleanText(value));
  };

  const refreshReviews = () => {
    if (reviewOperationIds.current.size) return;
    loadReviews();
  };

  const changePage = (nextPage) => {
    if (reviewOperationIds.current.size) return;
    setPage(nextPage);
  };

  const releaseReviewOperation = (id) => {
    reviewOperationIds.current.delete(id);
    reviewOperationPhases.current.delete(id);
    if (!mounted.current) return;
    setReviewOperations((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const handleVisibilityChange = (review, field, nextVisible) => {
    const id = cleanText(review?._id || review?.id);
    if (
      !id ||
      !["ratingVisible", "commentVisible"].includes(field) ||
      typeof nextVisible !== "boolean" ||
      reviewOperationIds.current.has(id)
    ) {
      return;
    }
    const currentVisibility = effectiveReviewVisibility(review);
    if (currentVisibility[field] === nextVisible) return;
    if (field === "commentVisible" && !cleanText(review?.comment)) return;

    const ratingOperation = field === "ratingVisible";
    const title = ratingOperation
      ? nextVisible
        ? L.showRatingTitle
        : L.hideRatingTitle
      : nextVisible
        ? L.showCommentTitle
        : L.hideCommentTitle;
    const help = ratingOperation
      ? nextVisible
        ? L.showRatingHelp
        : L.hideRatingHelp
      : nextVisible
        ? L.showCommentHelp
        : L.hideCommentHelp;
    const action = ratingOperation
      ? nextVisible
        ? L.showRatingAction
        : L.hideRatingAction
      : nextVisible
        ? L.showCommentAction
        : L.hideCommentAction;
    const successText = ratingOperation
      ? nextVisible
        ? L.ratingShown
        : L.ratingHidden
      : nextVisible
        ? L.commentShown
        : L.commentHidden;

    // The ref closes the tiny window before React applies the disabled state,
    // preventing two confirmations/mutations for the same review.
    reviewOperationIds.current.add(id);
    reviewOperationPhases.current.set(id, "confirming");
    setReviewOperations((current) => ({
      ...current,
      [id]: { field, phase: "confirming" },
    }));

    modalApi.confirm({
      title,
      content: help,
      okText: action,
      cancelText: L.cancel,
      okButtonProps: { danger: !nextVisible },
      onCancel: () => {
        if (
          !shouldReleaseReviewOperationOnCancel(
            reviewOperationPhases.current.get(id),
          )
        ) {
          return;
        }
        releaseReviewOperation(id);
      },
      onOk: async () => {
        if (!mounted.current) {
          releaseReviewOperation(id);
          return;
        }
        reviewOperationPhases.current.set(id, "saving");
        if (mounted.current) {
          setReviewOperations((current) => ({
            ...current,
            [id]: { field, phase: "saving" },
          }));
        }
        try {
          const mutation = await runVisibilityMutationIfMounted({
            isMounted: () => mounted.current,
            mutate: () =>
              updateAdminHotelReviewVisibility(id, userId, token, {
                [field]: nextVisible,
              }),
          });
          if (mutation.skipped) return;
          const response = mutation.response;
          if (!mounted.current) return;
          if (response?.success === false || response?.error) {
            if (response?.code === "REVIEW_VISIBILITY_CONFLICT") {
              message.warning(L.conflictError);
            } else {
              message.error(response?.error || L.updateError);
            }
            // A timeout or transport failure has an unknown server outcome. Always
            // reconcile before unlocking so a late commit cannot leave stale switches.
            await loadReviews({ silent: true, notifyError: false });
            return;
          }

          const returnedReview = response?.review;
          const hasEffectiveVisibility =
            hasAuthoritativeReviewVisibility(returnedReview);
          if (hasEffectiveVisibility) {
            setReviews((current) =>
              current.map((currentReview) =>
                cleanText(currentReview?._id || currentReview?.id) === id
                  ? mergeServerReviewVisibility(currentReview, returnedReview)
                  : currentReview,
              ),
            );
            if (
              serverConfirmedVisibilityChange(
                returnedReview,
                field,
                nextVisible,
              )
            ) {
              message.success(successText);
            } else {
              message.warning(L.conflictError);
            }
          } else {
            message.warning(L.syncError);
          }
          await loadReviews({ silent: true });
        } catch (error) {
          if (mounted.current) {
            message.error(error?.message || L.updateError);
            await loadReviews({ silent: true, notifyError: false });
          }
        } finally {
          releaseReviewOperation(id);
        }
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
      {modalContextHolder}
      <ReviewsHeader>
        <div>
          <h2>{L.title}</h2>
          <p>{L.subtitle}</p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          disabled={loading || navigationLocked}
          aria-label={L.refresh}
          onClick={refreshReviews}
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
            disabled={loading || navigationLocked}
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
            disabled={loading || navigationLocked}
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
            disabled={loading || navigationLocked}
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
            disabled={loading || navigationLocked}
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
            disabled={loading || navigationLocked}
            onChange={(value) => {
              if (reviewOperationIds.current.size) return;
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

      {loadError && (
        <Alert
          type="error"
          showIcon
          message={L.loadErrorTitle}
          description={loadError}
          action={
            <Button
              size="small"
              loading={loading}
              disabled={loading || navigationLocked}
              onClick={refreshReviews}
            >
              {L.retry}
            </Button>
          }
        />
      )}

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
                <th scope="col">{L.visibility}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length ? (
                reviews.map((review, index) => {
                  const id = cleanText(
                    review?._id || review?.id,
                    `review-${index}`,
                  );
                  const verified = isVerifiedReview(review);
                  const hasComment = Boolean(cleanText(review?.comment));
                  const visibility = effectiveReviewVisibility(review);
                  const visibilityMode = reviewVisibilityMode({
                    ratingVisible: visibility.ratingVisible,
                    commentVisible:
                      hasComment && visibility.commentVisible,
                  });
                  const visibilityModeLabel = {
                    both: L.bothPublic,
                    ratingOnly: L.ratingOnly,
                    commentOnly: L.commentOnly,
                    hidden: L.nothingPublic,
                  }[visibilityMode];
                  const operation = reviewOperations[id];
                  const rowBusy = Boolean(operation);
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
                      <td data-label={L.visibility}>
                        <VisibilityControl
                          role="group"
                          aria-label={`${L.visibility}: ${reviewGuest(review)}`}
                          aria-busy={operation?.phase === "saving"}
                        >
                          <VisibilitySummary
                            $mode={visibilityMode}
                            aria-live="polite"
                          >
                            {visibilityModeLabel}
                          </VisibilitySummary>
                          <span className="visibility-hint">
                            {L.visibilityHint}
                          </span>

                          <VisibilityOption
                            $visible={visibility.ratingVisible}
                          >
                            <div>
                              <strong>{L.ratingPublic}</strong>
                              <span>
                                {visibility.ratingVisible
                                  ? L.ratingShownHelp
                                  : L.ratingHiddenHelp}
                              </span>
                            </div>
                            <VisibilityAction>
                              <Switch
                                checked={visibility.ratingVisible}
                                loading={
                                  operation?.field === "ratingVisible" &&
                                  operation?.phase === "saving"
                                }
                                disabled={rowBusy}
                                aria-label={`${L.ratingPublic}: ${
                                  visibility.ratingVisible
                                    ? L.shown
                                    : L.hidden
                                }`}
                                onChange={(checked) =>
                                  handleVisibilityChange(
                                    review,
                                    "ratingVisible",
                                    checked,
                                  )
                                }
                              />
                              <VisibilityState
                                $visible={visibility.ratingVisible}
                              >
                                {visibility.ratingVisible
                                  ? L.shown
                                  : L.hidden}
                              </VisibilityState>
                            </VisibilityAction>
                          </VisibilityOption>

                          {hasComment ? (
                            <VisibilityOption
                              $visible={visibility.commentVisible}
                            >
                              <div>
                                <strong>{L.commentPublic}</strong>
                                <span>
                                  {visibility.commentVisible
                                    ? L.commentShownHelp
                                    : L.commentHiddenHelp}
                                </span>
                              </div>
                              <VisibilityAction>
                                <Switch
                                  checked={visibility.commentVisible}
                                  loading={
                                    operation?.field === "commentVisible" &&
                                    operation?.phase === "saving"
                                  }
                                  disabled={rowBusy}
                                  aria-label={`${L.commentPublic}: ${
                                    visibility.commentVisible
                                      ? L.shown
                                      : L.hidden
                                  }`}
                                  onChange={(checked) =>
                                    handleVisibilityChange(
                                      review,
                                      "commentVisible",
                                      checked,
                                    )
                                  }
                                />
                                <VisibilityState
                                  $visible={visibility.commentVisible}
                                >
                                  {visibility.commentVisible
                                    ? L.shown
                                    : L.hidden}
                                </VisibilityState>
                              </VisibilityAction>
                            </VisibilityOption>
                          ) : (
                            <VisibilityOption
                              $unavailable
                              aria-disabled="true"
                              aria-label={`${L.commentPublic}: ${L.noComment}`}
                            >
                              <div>
                                <strong>{L.commentPublic}</strong>
                                <span>{L.noCommentVisibilityHelp}</span>
                              </div>
                              <VisibilityAction>
                                <Switch
                                  checked={false}
                                  disabled
                                  aria-label={`${L.commentPublic}: ${L.noComment}`}
                                />
                                <NoCommentVisibility role="status">
                                  {L.noComment}
                                </NoCommentVisibility>
                              </VisibilityAction>
                            </VisibilityOption>
                          )}
                        </VisibilityControl>
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
          disabled={page <= 1 || loading || navigationLocked}
          onClick={() => changePage(Math.max(page - 1, 1))}
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
          disabled={
            page >= pagination.totalPages || loading || navigationLocked
          }
          onClick={() =>
            changePage(Math.min(page + 1, pagination.totalPages))
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
    min-width: 1280px;
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

  th:last-child,
  td:last-child {
    min-width: 360px;
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

    th:last-child,
    td:last-child {
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

  @media (max-width: 420px) {
    td {
      grid-template-columns: 1fr;
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

const VisibilityControl = styled.div`
  display: grid;
  gap: 8px;
  min-width: 330px;

  .visibility-hint {
    color: #60768a;
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1.4;
  }

  @media (max-width: 760px) {
    min-width: 0;
  }
`;

const VisibilitySummary = styled.strong`
  width: fit-content;
  max-width: 100%;
  padding: 4px 9px;
  border: 1px solid
    ${(props) =>
      props.$mode === "both"
        ? "#8fcdb2"
        : props.$mode === "ratingOnly"
          ? "#9bc9e7"
          : props.$mode === "commentOnly"
            ? "#c5b5df"
            : "#d9b5b8"};
  border-radius: 999px;
  background: ${(props) =>
    props.$mode === "both"
      ? "#e8f7ef"
      : props.$mode === "ratingOnly"
        ? "#edf7fd"
        : props.$mode === "commentOnly"
          ? "#f5f0fb"
          : "#fff3f3"};
  color: ${(props) =>
    props.$mode === "both"
      ? "#08724c"
      : props.$mode === "ratingOnly"
        ? "#126a9d"
        : props.$mode === "commentOnly"
          ? "#6d4b94"
          : "#a23f48"};
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1.35;
`;

const VisibilityOption = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 9px;
  border: 1px solid
    ${(props) =>
      props.$unavailable
        ? "#dce4eb"
        : props.$visible
          ? "#a8dac3"
          : "#d9e2eb"};
  border-inline-start: 3px solid
    ${(props) =>
      props.$unavailable
        ? "#91a1b1"
        : props.$visible
          ? "#0f8a5f"
          : "#9aa9b7"};
  border-radius: 7px;
  background: ${(props) =>
    props.$unavailable
      ? "#f7f9fb"
      : props.$visible
        ? "#f3fbf7"
        : "#fbfcfd"};

  > div:first-child {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  strong {
    color: #183c5d;
    font-size: 0.78rem;
    font-weight: 950;
  }

  > div:first-child > span {
    color: #61768a;
    font-size: 0.68rem;
    font-weight: 650;
    line-height: 1.4;
  }

  .ant-switch-checked {
    background: #0f8a5f;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;

    > div:last-child {
      justify-items: start;
    }
  }
`;

const VisibilityAction = styled.div`
  display: grid;
  gap: 3px;
  justify-items: end;
`;

const VisibilityState = styled.span`
  color: ${(props) => (props.$visible ? "#08724c" : "#6f7f8f")};
  font-size: 0.66rem;
  font-weight: 900;
`;

const NoCommentVisibility = styled.span`
  max-width: 118px;
  padding: 4px 7px;
  border-radius: 5px;
  background: #e9eef3;
  color: #5d7082;
  font-size: 0.67rem;
  font-weight: 850;
  line-height: 1.35;
  text-align: center;
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
