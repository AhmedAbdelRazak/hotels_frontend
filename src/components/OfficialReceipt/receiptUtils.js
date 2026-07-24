import { formatSaudiGregorianDate } from "../../utils/saudiDates";

export const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const calculateNights = (checkin, checkout) => {
  const start = new Date(checkin);
  const end = new Date(checkout);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const startDay = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const endDay = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  return Math.max(1, Math.round((endDay - startDay) / DAY_MS));
};

export const formatReceiptDate = (value, locale = "en-US") => {
  return formatSaudiGregorianDate(value, {
    language: String(locale).toLowerCase().startsWith("ar")
      ? "Arabic"
      : "English",
    month: "long",
    fallback: "N/A",
  });
};

const ISO_COUNTRY_CODES = Object.freeze(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  ),
);

const NATIONALITY_ALIASES = Object.freeze({
  afgani: "AF",
  afghan: "AF",
  algerian: "DZ",
  american: "US",
  australian: "AU",
  bahraini: "BH",
  bangladeshi: "BD",
  british: "GB",
  canadian: "CA",
  chinese: "CN",
  egyptian: "EG",
  emirati: "AE",
  ethiopian: "ET",
  filipino: "PH",
  indian: "IN",
  indonesian: "ID",
  iraqi: "IQ",
  jordanian: "JO",
  kuwaiti: "KW",
  lebanese: "LB",
  libyan: "LY",
  malaysian: "MY",
  moroccan: "MA",
  nepali: "NP",
  nigerian: "NG",
  omani: "OM",
  pakistani: "PK",
  palestinian: "PS",
  qatari: "QA",
  saudi: "SA",
  "saudi arabian": "SA",
  somali: "SO",
  sudanese: "SD",
  syrian: "SY",
  tunisian: "TN",
  turkish: "TR",
  yemeni: "YE",
  أردني: "JO",
  أردنية: "JO",
  إماراتي: "AE",
  إماراتية: "AE",
  باكستاني: "PK",
  باكستانية: "PK",
  سعودي: "SA",
  سعودية: "SA",
  سوداني: "SD",
  سودانية: "SD",
  سوري: "SY",
  سورية: "SY",
  عراقي: "IQ",
  عراقية: "IQ",
  فلسطيني: "PS",
  فلسطينية: "PS",
  مصري: "EG",
  مصرية: "EG",
  يمني: "YE",
  يمنية: "YE",
});

const normalizeCountryText = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_.,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

let countryNameIndex;

const buildCountryNameIndex = () => {
  if (countryNameIndex) return countryNameIndex;
  countryNameIndex = new Map();
  const locales = ["en", "ar"];
  locales.forEach((locale) => {
    if (typeof Intl === "undefined" || !Intl.DisplayNames) return;
    const names = new Intl.DisplayNames([locale], { type: "region" });
    ISO_COUNTRY_CODES.forEach((code) => {
      const name = normalizeCountryText(names.of(code));
      if (name) countryNameIndex.set(name, code);
    });
  });
  [
    ["united states of america", "US"],
    ["united kingdom of great britain and northern ireland", "GB"],
    ["uae", "AE"],
    ["ksa", "SA"],
    ["palestine state of", "PS"],
  ].forEach(([name, code]) => countryNameIndex.set(name, code));
  return countryNameIndex;
};

export const countryCodeFromNationality = (value) => {
  const normalized = normalizeCountryText(value);
  if (!normalized) return "";
  const possibleCode = normalized.toUpperCase();
  if (
    /^[A-Z]{2}$/.test(possibleCode) &&
    ISO_COUNTRY_CODES.includes(possibleCode)
  ) {
    return possibleCode;
  }
  return (
    NATIONALITY_ALIASES[normalized] ||
    buildCountryNameIndex().get(normalized) ||
    ""
  );
};

export const displayNationality = (
  value,
  code = countryCodeFromNationality(value),
) => {
  const raw = String(value || "").trim();
  if (raw && !/^[A-Za-z]{2}$/.test(raw)) return raw;
  if (!code) return raw || "N/A";
  const preferred = {
    EG: "Egyptian",
    SA: "Saudi Arabian",
    AE: "Emirati",
    US: "American",
    GB: "British",
  };
  if (preferred[code]) return preferred[code];
  if (typeof Intl !== "undefined" && Intl.DisplayNames) {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || raw;
  }
  return raw || code;
};

const normalizeRoomKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const resolveRoomDefinition = (room, hotelDetails) => {
  const definitions = Array.isArray(hotelDetails?.roomCountDetails)
    ? hotelDetails.roomCountDetails
    : [];
  const typeKey = normalizeRoomKey(room?.room_type || room?.roomType);
  const nameKey = normalizeRoomKey(
    room?.displayName || room?.display_name || room?.room_display_name,
  );
  return definitions.find((definition) => {
    const definitionType = normalizeRoomKey(
      definition?.roomType || definition?.room_type,
    );
    const definitionName = normalizeRoomKey(
      definition?.displayName || definition?.display_name,
    );
    return (
      (typeKey && definitionType === typeKey) ||
      (nameKey && definitionName === nameKey)
    );
  });
};

const publicDayPrice = (day) => {
  const candidates = [
    day?.totalPriceWithCommission,
    day?.price,
    day?.clientPrice,
    day?.sellingPrice,
  ];
  const resolved = candidates.find(
    (value) =>
      value !== null && value !== undefined && Number.isFinite(Number(value)),
  );
  return resolved === undefined ? null : safeNumber(resolved);
};

export const buildReceiptRoomRows = (reservation, hotelDetails, nights) => {
  const rooms = Array.isArray(reservation?.pickedRoomsType)
    ? reservation.pickedRoomsType
    : [];
  const grouped = new Map();

  rooms.forEach((room) => {
    const definition = resolveRoomDefinition(room, hotelDetails);
    const englishName =
      room?.displayName ||
      room?.display_name ||
      room?.room_display_name ||
      definition?.displayName ||
      room?.room_type ||
      room?.roomType ||
      "Room";
    const arabicName =
      room?.displayName_OtherLanguage ||
      room?.displayNameArabic ||
      definition?.displayName_OtherLanguage ||
      "";
    const pricingByDay = Array.isArray(room?.pricingByDay)
      ? room.pricingByDay
      : [];
    const dailyPrices = pricingByDay
      .map(publicDayPrice)
      .filter((price) => price !== null);
    const chosenPrice = safeNumber(room?.chosenPrice);
    const averageNightPrice =
      dailyPrices.length > 0
        ? dailyPrices.reduce((sum, price) => sum + price, 0) /
          dailyPrices.length
        : chosenPrice;
    const unitStayTotal =
      dailyPrices.length > 0
        ? dailyPrices.reduce((sum, price) => sum + price, 0)
        : averageNightPrice * nights;
    const count = Math.max(1, Math.round(safeNumber(room?.count) || 1));
    const key = [
      normalizeRoomKey(room?.room_type || room?.roomType || englishName),
      normalizeRoomKey(englishName),
      averageNightPrice.toFixed(2),
      unitStayTotal.toFixed(2),
    ].join("|");
    const existing = grouped.get(key);
    if (existing) {
      existing.count += count;
      existing.total += unitStayTotal * count;
      return;
    }
    grouped.set(key, {
      englishName,
      arabicName,
      count,
      rate: averageNightPrice,
      total: unitStayTotal * count,
    });
  });

  return Array.from(grouped.values());
};

export const deriveReceiptPayment = (reservation) => {
  const total = safeNumber(reservation?.total_amount);
  const normalizedStatus = String(reservation?.payment || "")
    .trim()
    .toLowerCase();
  const isNotCaptured = [
    "credit/ debit",
    "credit/debit",
    "credit / debit",
    "not captured",
  ].includes(normalizedStatus);
  const onlinePaid = isNotCaptured ? 0 : safeNumber(reservation?.paid_amount);
  const offlinePaid = safeNumber(
    reservation?.payment_details?.onsite_paid_amount,
  );
  const paid = Math.max(0, onlinePaid + offlinePaid);
  const remaining = Math.max(0, total - paid);
  const toCents = (value) => Math.round(safeNumber(value) * 100);
  const fullyPaid = paid > 0 && toCents(paid) >= toCents(total);
  const partiallyPaid = paid > 0 && !fullyPaid;

  let method = { en: "Not paid", ar: "غير مدفوع", tone: "unpaid" };
  if (isNotCaptured) {
    method = { en: "Not captured", ar: "غير محصل", tone: "pending" };
  } else if (fullyPaid) {
    method = { en: "Paid", ar: "مدفوع", tone: "paid" };
  } else if (partiallyPaid) {
    method =
      offlinePaid > 0
        ? { en: "Paid at property", ar: "مدفوع في الفندق", tone: "partial" }
        : { en: "Deposit", ar: "عربون", tone: "partial" };
  }

  return {
    total,
    paid,
    remaining,
    onlinePaid,
    offlinePaid,
    fullyPaid,
    partiallyPaid,
    isNotCaptured,
    method,
  };
};

const STATUS_TRANSLATIONS = Object.freeze({
  confirmed: "مؤكد",
  inhouse: "مقيم",
  "in house": "مقيم",
  "pending confirmation": "بانتظار التأكيد",
  pending: "قيد الانتظار",
  cancelled: "ملغي",
  canceled: "ملغي",
  completed: "مكتمل",
  "checked out": "تمت المغادرة",
});

export const receiptStatus = (value) => {
  const en = String(value || "Confirmed").trim() || "Confirmed";
  const normalized = en.toLowerCase();
  return {
    en,
    ar: STATUS_TRANSLATIONS[normalized] || "حالة الحجز",
    positive: ["confirmed", "inhouse", "in house", "completed"].includes(
      normalized,
    ),
  };
};

const CODE39_PATTERNS = Object.freeze({
  0: "nnnwwnwnn",
  1: "wnnwnnnnw",
  2: "nnwwnnnnw",
  3: "wnwwnnnnn",
  4: "nnnwwnnnw",
  5: "wnnwwnnnn",
  6: "nnwwwnnnn",
  7: "nnnwnnwnw",
  8: "wnnwnnwnn",
  9: "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
});

export const code39Bars = (value) => {
  const normalized = String(value || "N/A")
    .toUpperCase()
    .replace(/[^0-9A-Z. $/+%-]/g, "-")
    .slice(0, 32);
  const encoded = `*${normalized}*`;
  const bars = [];
  let cursor = 10;
  encoded.split("").forEach((character) => {
    const pattern = CODE39_PATTERNS[character] || CODE39_PATTERNS["-"];
    pattern.split("").forEach((widthCode, index) => {
      const width = widthCode === "w" ? 3 : 1;
      if (index % 2 === 0) bars.push({ x: cursor, width });
      cursor += width;
    });
    cursor += 1;
  });
  return { bars, width: cursor + 9, value: normalized };
};
