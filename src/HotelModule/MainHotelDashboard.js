/** @format
 *  MainHotelDashboard.jsx  –  unified 6‑step onboarding dashboard
 *  © 2025 Serene Code Labs – free to use in your PMS
 */

import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import { Button, Modal, Card, message, Pagination, Table, Tabs, Tag } from "antd";
import * as XLSX from "xlsx";
import {
	PlusOutlined,
	EditOutlined,
	CheckCircleTwoTone,
	HomeOutlined,
	CalendarOutlined,
	WarningOutlined,
	DatabaseOutlined,
	UploadOutlined,
	DeleteOutlined,
	EyeOutlined,
	WalletOutlined,
} from "@ant-design/icons";

import { useCartContext } from "../cart_context";
import {
	getHotelStaffUsers,
	isAuthenticated,
	previewHotelStaffDashboard,
	signupHotelStaff,
	startDashboardPreview,
	updateHotelStaffUser,
} from "../auth";
import {
	getHotelDetails,
	getHotelDashboardIncompleteReservations,
	getHotelDashboardOpenReservations,
	getHotelMainDashboardStats,
	getAgentWalletSummary,
	getManagerExecutiveIncompleteReservations,
	getManagerExecutiveSummary,
	getReservationSummary,
	hotelAccount,
	updateHotelDetails,
} from "./apiAdmin";

import TopNavbar from "./AdminNavbar/TopNavbar";
import AddHotelForm from "./AddHotelForm";
import EditHotelForm from "./EditHotelForm";
import ManagerFinancialsModal from "./Financials/ManagerFinancialsModal";
import { getStoredMenuCollapsed } from "./utils/menuState";
import { isSuperAdminUser } from "../AdminModule/utils/superUsers";

/* 🔑  step‑modal registry */
import { STEP_MODAL_REGISTRY } from "./utils/hotel‑setup‑modals";

/* ──────────── literals / i18n ──────────── */

const CONTACT_WHATSAPP = "19092223374";
const CONTACT_URL = `https://wa.me/${CONTACT_WHATSAPP}`;

const WORDS = {
	en: {
		ribbon: "Hotel under review",
		ribbonActive: "Hotel is active ✓",
		note:
			"Your request is under review now, our partner‑support team will contact you by WhatsApp or e‑mail in less than 24 hours.\n" +
			"If you want to speed up the registration, please reach us on WhatsApp " +
			CONTACT_WHATSAPP +
			".",
		noteActive: "Everything is set – your hotel is live and bookable!",
		stepsTitle: "Steps to make the hotel ready for operation & booking:",
		steps: [
			"Registration request",
			"Room types & pricing",
			"Upload required photos",
			"Pin hotel location",
			"Complete hotel data",
			"Bank details",
		],
		startNote:
			"You can complete the required data and then start receiving bookings",
		start: "Start receiving bookings",
		startDisabled: "Finish required data first",
	},
	ar: {
		ribbon: "الفندق قيد المراجعة",
		ribbonActive: "الفندق مفعل وجاهز للحجوزات ✓",
		note:
			"طلبكم قيد المراجعة الآن، وسيتم التواصل معكم من قبل فريق خدمة الشركاء على رقم الواتس آب أو الإيميل خلال ٢٤ ساعة أو أقل.\n" +
			"إذا أردت إسراع عملية التسجيل، يرجى التواصل على رقم واتس آب " +
			CONTACT_WHATSAPP,
		noteActive: "تم تفعيل الفندق – يمكنكم الآن استقبال الحجوزات!",
		stepsTitle: "خطوات تجهيز الفندق ليصبح قابلاً للتشغيل والحجز:",
		steps: [
			"تقديم طلب التسجيل",
			"أنواع الغرف والسعر",
			"إكمال الصور المطلوبة",
			"إدخال لوكيشن الفندق",
			"استكمال بيانات الفندق",
			"البيانات البنكية",
		],
		startNote:
			"يمكنكم إستكمال البيانات المطلوبة حتى يمكنكم البدء بإستقبال الحجوزات",
		start: "بدء إستقبال الحجوزات",
		startDisabled: "يجب استكمال البيانات المطلوبة",
	},
};

/* ═══════════════════  Component  ═══════════════════ */

Object.assign(WORDS.en, {
	statsTitle: "Hotel snapshot",
	availableRooms: "Available rooms",
	totalRooms: "Total rooms",
	reservations: "Reservations",
	nonDone: "Open reservations",
	uncompleted: "Incomplete",
	setupReady: "Settings ready",
	statsUnavailable: "Stats loading...",
});

Object.assign(WORDS.ar, {
	statsTitle: "نظرة سريعة",
	availableRooms: "الغرف المتاحة",
	totalRooms: "إجمالي الغرف",
	reservations: "الحجوزات",
	nonDone: "حجوزات مفتوحة",
	uncompleted: "غير مكتملة",
	setupReady: "الإعدادات جاهزة",
	statsUnavailable: "جاري تحميل الأرقام...",
});

WORDS.en.setupPending = "Settings pending";
WORDS.ar.setupPending = "الإعدادات غير مكتملة";
Object.assign(WORDS.en, {
	sourceTitle: "Booking sources",
	openModalTitle: "Open confirmed reservations",
	incompleteModalTitle: "Incomplete reservations",
	searchPlaceholder: "Search confirmation, guest name, or hotel name",
	search: "Search",
	reset: "Reset",
	from: "From",
	to: "To",
	sortBy: "Sort by",
	bookedAt: "Booked at",
	checkin: "Check-in",
	checkout: "Check-out",
	guest: "Guest",
	confirmation: "Confirmation",
	source: "Source",
	total: "Total",
	cycle: "Cycle",
	reason: "Why",
	index: "#",
	exportExcel: "Export Excel",
	exporting: "Exporting...",
	noRows: "No open reservations found.",
	noIncompleteRows: "No incomplete reservations found.",
	executiveSummary: "Executive summary",
	executiveSummarySubtitle:
		"All assigned properties in one operational snapshot.",
	allRooms: "All rooms",
	allAvailableRooms: "Available rooms",
	reservationsPastThreeMonths: "Reservations",
	pastThreeMonths: "Past 3 months",
	allIncompleteReservations: "Incomplete reservations",
	historicalData: "Historical",
	hotelName: "Hotel",
});
Object.assign(WORDS.ar, {
	sourceTitle: "مصادر الحجز",
	openModalTitle: "الحجوزات المؤكدة المفتوحة",
	searchPlaceholder: "ابحث برقم التأكيد أو اسم الضيف أو اسم الفندق",
	search: "بحث",
	reset: "مسح",
	from: "من",
	to: "إلى",
	sortBy: "ترتيب حسب",
	bookedAt: "تاريخ الحجز",
	checkin: "الوصول",
	checkout: "المغادرة",
	guest: "الضيف",
	confirmation: "رقم التأكيد",
	source: "المصدر",
	total: "الإجمالي",
	cycle: "الدورة",
	noRows: "لا توجد حجوزات مفتوحة.",
});

WORDS.ar.incompleteModalTitle = "الحجوزات غير المكتملة";
WORDS.ar.reason = "السبب";
WORDS.ar.index = "#";
WORDS.ar.exportExcel = "تصدير إكسل";
WORDS.ar.exporting = "جاري التصدير...";
WORDS.ar.noIncompleteRows = "لا توجد حجوزات غير مكتملة.";

Object.assign(WORDS.ar, {
	executiveSummary: "الملخص التنفيذي",
	executiveSummarySubtitle:
		"نظرة تشغيلية عامة على كل الفنادق المخصصة.",
	allRooms: "كل الغرف",
	allAvailableRooms: "الغرف المتاحة",
	reservationsPastThreeMonths: "الحجوزات",
	pastThreeMonths: "آخر 3 أشهر",
	allIncompleteReservations: "الحجوزات غير المكتملة",
	historicalData: "كل البيانات",
	hotelName: "الفندق",
});

Object.assign(WORDS.en, {
	accountsButton: "Manager Hotel Accounts",
	financialsButton: "Financials",
	addPropertyButton: "Add New Property",
	addPropertyTitle: "Add New Property",
	accountsTitle: "Manager Hotel Accounts",
	accountsSubtitle:
		"Create and review hotel-level accounts across all properties owned by this manager.",
	availableAccounts: "Available accounts",
	addAccount: "Add new account",
	accountName: "Name",
	accountEmail: "Email",
	accountPhone: "Phone",
	accountCompany: "Company name",
	accountOfficialName: "Official company name",
	accountEin: "Company EIN / tax number",
	accountDocuments: "Company attachments",
	accountRole: "Role",
	accountRoles: "Roles",
	accountHotel: "Hotels",
	chooseHotels: "Choose hotels",
	selectedHotels: "Selected hotels",
	accountAccess: "Access limits",
	accountStatus: "Status",
	accountCreated: "Created",
	active: "Active",
	inactive: "Inactive",
	noAccess: "Role default",
	fullHotelAccess: "Full hotel dashboard",
	chooseHotel: "Choose hotel",
	password: "Password",
	confirmPassword: "Confirm password",
	createAccount: "Create account",
	creating: "Creating...",
	refresh: "Refresh",
	required: "Required",
	optional: "Optional",
	formRequiredNote:
		"Fields marked Required must be completed before creating the account. Optional fields can be updated later.",
	hotelsHint: "Choose every property this account can work on.",
	rolesHint:
		"Choose one or more roles. Access limits will be suggested automatically and can be adjusted.",
	accessHint:
		"Optional fine-tuning. Hotel managers keep full hotel access by default.",
	nameHint: "Required. Use the employee or manager full name.",
	emailHint: "Required. This is the login email.",
	phoneHint: "Required. Use a reachable phone number.",
	companyHint: "Optional. Useful for contractor or company accounts.",
	officialNameHint: "Optional. Use the legal company name when it differs from the display name.",
	einHint: "Optional. Add the EIN, VAT, CR, or tax number if available.",
	documentsHint: "Optional. Upload bank-account PDFs, screenshots, EIN files, or official company documents.",
	uploadDocuments: "Upload documents",
	documentLimitHint: "PDF or image files, up to 3 MB each.",
	removeDocument: "Remove",
	passwordHint: "Required. The user can update it later.",
	confirmPasswordHint: "Required. Must match the password.",
	allAccountsNote:
		"Accounts can cover one hotel or multiple hotels. External agents/order takers only see reservations they created.",
});

Object.assign(WORDS.ar, {
	accountsButton: "حسابات إدارة الفنادق",
	addPropertyButton: "إضافة منشأة جديدة",
	addPropertyTitle: "إضافة منشأة جديدة",
	accountsTitle: "حسابات إدارة الفنادق",
	accountsSubtitle:
		"إنشاء ومراجعة حسابات محددة على مستوى كل فندق من فنادق المدير.",
	availableAccounts: "الحسابات الحالية",
	addAccount: "إضافة حساب جديد",
	accountName: "الاسم",
	accountEmail: "البريد",
	accountPhone: "الهاتف",
	accountCompany: "اسم الشركة",
	accountRole: "الدور",
	accountRoles: "الأدوار",
	accountHotel: "الفنادق",
	chooseHotels: "اختر الفنادق",
	selectedHotels: "الفنادق المختارة",
	accountAccess: "حدود الصلاحية",
	accountStatus: "الحالة",
	accountCreated: "تاريخ الإنشاء",
	active: "نشط",
	inactive: "معطل",
	noAccess: "صلاحيات الدور",
	fullHotelAccess: "لوحة الفندق بالكامل",
	chooseHotel: "اختر الفندق",
	password: "كلمة المرور",
	confirmPassword: "تأكيد كلمة المرور",
	createAccount: "إنشاء الحساب",
	creating: "جاري الإنشاء...",
	refresh: "تحديث",
	required: "إجباري",
	optional: "اختياري",
	formRequiredNote:
		"الحقول المحددة بإجباري يجب تعبئتها قبل إنشاء الحساب. الحقول الاختيارية يمكن تحديثها لاحقاً.",
	hotelsHint: "اختر كل فندق يمكن لهذا الحساب العمل عليه.",
	rolesHint:
		"اختر دوراً واحداً أو أكثر. سيتم اقتراح الصلاحيات تلقائياً ويمكن تعديلها.",
	accessHint:
		"اختياري للتخصيص الدقيق. مدير الفندق يحصل على صلاحية الفندق كاملة افتراضياً.",
	nameHint: "إجباري. اكتب الاسم الكامل للموظف أو المدير.",
	emailHint: "إجباري. هذا البريد سيكون بريد تسجيل الدخول.",
	phoneHint: "إجباري. استخدم رقم هاتف يمكن التواصل عليه.",
	companyHint: "اختياري. مفيد لحسابات الشركات أو المتعاقدين.",
	passwordHint: "إجباري. يمكن للمستخدم تغييره لاحقاً.",
	confirmPasswordHint: "إجباري. يجب أن يطابق كلمة المرور.",
	allAccountsNote:
		"يمكن ربط الحساب بفندق واحد أو عدة فنادق. الوكيل الخارجي أو مستلم الحجوزات يرى فقط الحجوزات التي أنشأها.",
});

Object.assign(WORDS.ar, {
	accountsButton: "حسابات إدارة الفنادق",
	addPropertyButton: "إضافة منشأة جديدة",
	addPropertyTitle: "إضافة منشأة جديدة",
	accountsTitle: "حسابات إدارة الفنادق",
	accountsSubtitle:
		"أنشئ حسابات محددة لكل فندق، وحدد الأدوار والصلاحيات بوضوح.",
	availableAccounts: "الحسابات الحالية",
	addAccount: "إضافة حساب جديد",
	accountName: "الاسم",
	accountEmail: "البريد الإلكتروني",
	accountPhone: "الهاتف",
	accountCompany: "اسم الشركة",
	accountRole: "الدور",
	accountRoles: "الأدوار",
	accountHotel: "الفنادق",
	chooseHotels: "اختر الفنادق",
	selectedHotels: "الفنادق المختارة",
	accountAccess: "الصلاحيات",
	accountStatus: "الحالة",
	accountCreated: "تاريخ الإنشاء",
	active: "نشط",
	inactive: "معطل",
	noAccess: "حسب الدور",
	fullHotelAccess: "صلاحية كاملة",
	chooseHotel: "اختر الفندق",
	password: "كلمة المرور",
	confirmPassword: "تأكيد كلمة المرور",
	createAccount: "إنشاء الحساب",
	creating: "جاري الإنشاء...",
	refresh: "تحديث",
	required: "مطلوب",
	optional: "اختياري",
	formRequiredNote:
		"املأ الحقول المطلوبة، ويمكن ترك الحقول الاختيارية للتحديث لاحقاً.",
	hotelsHint: "يمكن اختيار فندق واحد أو أكثر.",
	rolesHint: "يمكن اختيار أكثر من دور. سيتم ضبط الصلاحيات تلقائياً.",
	accessHint: "اختياري للتخصيص المتقدم حسب حاجة الحساب.",
	nameHint: "الاسم الكامل للحساب.",
	emailHint: "سيُستخدم لتسجيل الدخول.",
	phoneHint: "رقم يمكن التواصل معه.",
	companyHint: "للشركات أو المتعاقدين إن وجد.",
	passwordHint: "يمكن تغييره لاحقاً.",
	confirmPasswordHint: "يجب أن يطابق كلمة المرور.",
	allAccountsNote:
		"يمكن ربط الحساب بفندق واحد أو عدة فنادق. الوكيل الخارجي يرى فقط الحجوزات التي أنشأها.",
});

Object.assign(WORDS.ar, {
	accountOfficialName: "الاسم الرسمي للشركة",
	accountEin: "الرقم الضريبي / السجل",
	accountDocuments: "مرفقات الشركة",
	officialNameHint:
		"اختياري. اكتب الاسم القانوني للشركة إذا كان مختلفاً عن اسم العرض.",
	einHint: "اختياري. أضف الرقم الضريبي أو السجل التجاري إن وجد.",
	documentsHint:
		"اختياري. ارفع ملفات الحساب البنكي أو السجل أو صور المستندات الرسمية.",
	uploadDocuments: "رفع المرفقات",
	documentLimitHint: "PDF أو صور، بحد أقصى 3 ميجابايت لكل ملف.",
	removeDocument: "حذف",
});

WORDS.ar.financialsButton = WORDS.ar.financialsButton || "المالية";
WORDS.ar.addPropertyButton = WORDS.ar.addPropertyButton || "إضافة منشأة جديدة";
WORDS.ar.addPropertyTitle = WORDS.ar.addPropertyTitle || "إضافة منشأة جديدة";

const ManagerMainHotelDashboard = () => {
	const history = useHistory();
	const location = useLocation();
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const TXT = WORDS[isRTL ? "ar" : "en"];

	/* side‑nav + data */
	const [adminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed } = getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [userData, setUserData] = useState({});

	/* add / edit property */
	const [addVisible, setAddVisible] = useState(false);
	const [editVisible, setEditVisible] = useState(false);
	const [currentHotel, setCurrentHotel] = useState(null);
	const [accountsVisible, setAccountsVisible] = useState(false);
	const [financialsVisible, setFinancialsVisible] = useState(false);
	const [executiveSummary, setExecutiveSummary] = useState(null);
	const [executiveLoading, setExecutiveLoading] = useState(false);
	const [executiveIncompleteVisible, setExecutiveIncompleteVisible] =
		useState(false);
	const [executiveIncompleteRows, setExecutiveIncompleteRows] = useState([]);
	const [executiveIncompleteTotal, setExecutiveIncompleteTotal] = useState(0);
	const [executiveIncompletePage, setExecutiveIncompletePage] = useState(1);
	const [executiveIncompleteLoading, setExecutiveIncompleteLoading] =
		useState(false);
	const [executiveIncompleteExporting, setExecutiveIncompleteExporting] =
		useState(false);
	const [executiveSearch, setExecutiveSearch] = useState("");
	const [executiveDateFrom, setExecutiveDateFrom] = useState("");
	const [executiveDateTo, setExecutiveDateTo] = useState("");
	const [executiveSortBy, setExecutiveSortBy] = useState("booked_at");
	const executiveListLimit = 10;

	/* onboarding modals */
	const [stepModalIdx, setStepModalIdx] = useState(null);
	const [stepModalHotel, setStepModalHotel] = useState(null);

	const { user, token } = isAuthenticated();
	const userId = user?._id;
	const isConfiguredSuperAdmin = isSuperAdminUser(user);
	const queryDashboardOwnerId = useMemo(() => {
		const params = new URLSearchParams(location.search);
		return normalizeDashboardId(params.get("ownerId"));
	}, [location.search]);
	const storedDashboardOwnerId = useMemo(() => {
		if (!isConfiguredSuperAdmin || typeof window === "undefined") return "";
		try {
			const selectedHotel =
				JSON.parse(localStorage.getItem("selectedHotel") || "{}") || {};
			return normalizeDashboardId(
				selectedHotel.belongsTo?._id ||
					selectedHotel.belongsTo ||
					selectedHotel.ownerId
			);
		} catch (error) {
			return "";
		}
	}, [isConfiguredSuperAdmin]);
	const dashboardOwnerId = isConfiguredSuperAdmin
		? queryDashboardOwnerId || storedDashboardOwnerId || userId
		: userId;
	const assignedHotelId = user?.hotelIdWork || "";
	const assignedOwnerId = user?.belongsToId || "";
	const isSingleHotelUser = Boolean(assignedHotelId && assignedOwnerId);

	const updateDashboardQuery = useCallback(
		(updates = {}) => {
			const params = new URLSearchParams(location.search);
			Object.entries(updates).forEach(([key, value]) => {
				if (value === undefined || value === null || value === "") {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});
			const nextSearch = params.toString();
			const nextSearchString = nextSearch ? `?${nextSearch}` : "";
			if (nextSearchString === location.search) return;
			history.replace({
				pathname: location.pathname,
				search: nextSearchString,
			});
		},
		[history, location.pathname, location.search]
	);

	const clearDashboardModalQuery = useCallback(() => {
		updateDashboardQuery({
			modal: "",
			hotelId: "",
			step: "",
			reservationListType: "",
			listPage: "",
			listSearch: "",
			dateFrom: "",
			dateTo: "",
			sortBy: "",
			executiveListPage: "",
			executiveListSearch: "",
			executiveDateFrom: "",
			executiveDateTo: "",
			executiveSortBy: "",
		});
	}, [updateDashboardQuery]);

	useEffect(() => {
		if (!isSingleHotelUser) return;

		getHotelDetails(assignedHotelId).then((hotel) => {
			if (!hotel || hotel.error || !hotel._id) return;
			localStorage.setItem("selectedHotel", JSON.stringify(hotel));
			const ownerId = hotel.belongsTo?._id || hotel.belongsTo || assignedOwnerId;
			if (ownerId) {
				window.location.replace(
					`/hotel-management/dashboard/${ownerId}/${hotel._id}`,
				);
			}
		});
	}, [assignedHotelId, assignedOwnerId, isSingleHotelUser]);

	/* fetch hotels owned by this admin */
	const fetchHotels = useCallback(() => {
		if (isSingleHotelUser || !userId || !dashboardOwnerId) return;
		hotelAccount(userId, token, dashboardOwnerId).then((d) => {
			if (!d?.error) setUserData(d);
		});
	}, [dashboardOwnerId, isSingleHotelUser, token, userId]);

	useEffect(fetchHotels, [fetchHotels]);

	const fetchExecutiveSummary = useCallback(() => {
		if (isSingleHotelUser || !dashboardOwnerId || !token) return;
		setExecutiveLoading(true);
		getManagerExecutiveSummary(dashboardOwnerId, token)
			.then((data) => {
				if (!data || data.error) {
					setExecutiveSummary(null);
					return;
				}
				setExecutiveSummary(data);
			})
			.finally(() => setExecutiveLoading(false));
	}, [dashboardOwnerId, isSingleHotelUser, token]);

	useEffect(fetchExecutiveSummary, [fetchExecutiveSummary]);

	const syncExecutiveIncompleteQuery = useCallback(
		(page = executiveIncompletePage, overrides = {}) => {
			updateDashboardQuery({
				modal: "executive-incomplete",
				executiveListPage: page,
				executiveListSearch: overrides.search ?? executiveSearch,
				executiveDateFrom: overrides.dateFrom ?? executiveDateFrom,
				executiveDateTo: overrides.dateTo ?? executiveDateTo,
				executiveSortBy: overrides.sortBy ?? executiveSortBy,
			});
		},
		[
			executiveDateFrom,
			executiveDateTo,
			executiveIncompletePage,
			executiveSearch,
			executiveSortBy,
			updateDashboardQuery,
		]
	);

	const loadExecutiveIncompleteReservations = useCallback(
		(page = executiveIncompletePage, overrides = {}) => {
			if (!dashboardOwnerId || !token) return;
			setExecutiveIncompleteLoading(true);
			getManagerExecutiveIncompleteReservations(dashboardOwnerId, token, {
				page,
				limit: executiveListLimit,
				search: overrides.search ?? executiveSearch,
				dateFrom: overrides.dateFrom ?? executiveDateFrom,
				dateTo: overrides.dateTo ?? executiveDateTo,
				sortBy: overrides.sortBy ?? executiveSortBy,
				sortOrder: "asc",
			})
				.then((data) => {
					if (!data || data.error) {
						setExecutiveIncompleteRows([]);
						setExecutiveIncompleteTotal(0);
						return;
					}
					setExecutiveIncompleteRows(
						Array.isArray(data.reservations) ? data.reservations : []
					);
					setExecutiveIncompleteTotal(Number(data.total || 0));
					setExecutiveIncompletePage(Number(data.page || page));
				})
				.finally(() => setExecutiveIncompleteLoading(false));
		},
		[
			executiveDateFrom,
			executiveDateTo,
			executiveIncompletePage,
			executiveSearch,
			executiveSortBy,
			dashboardOwnerId,
			token,
		]
	);

	const handleExportExecutiveIncomplete = useCallback(() => {
		if (!dashboardOwnerId || !token) return;
		setExecutiveIncompleteExporting(true);
		getManagerExecutiveIncompleteReservations(dashboardOwnerId, token, {
			page: 1,
			exportAll: true,
			search: executiveSearch,
			dateFrom: executiveDateFrom,
			dateTo: executiveDateTo,
			sortBy: executiveSortBy,
			sortOrder: "asc",
		})
			.then((data) => {
				const rows = Array.isArray(data?.reservations) ? data.reservations : [];
				if (!rows.length) {
					message.info(TXT.noIncompleteRows);
					return;
				}
				const exportRows = rows.map((reservation, index) => ({
					[TXT.index]: index + 1,
					[TXT.hotelName]: reservation.hotelName || "",
					[TXT.confirmation]: reservation.confirmation_number || "",
					[TXT.guest]: reservation.customer_details?.name || "",
					[TXT.source]: reservation.booking_source || "",
					[TXT.bookedAt]: formatShortDate(reservation.booked_at),
					[TXT.checkin]: formatShortDate(reservation.checkin_date),
					[TXT.checkout]: formatShortDate(reservation.checkout_date),
					[TXT.total]: `${formatMoney(reservation.total_amount)} SAR`,
					[TXT.reason]: getReservationReasonText(reservation, isRTL),
					[TXT.cycle]: reservation.financial_cycle?.status || "incomplete",
				}));
				const worksheet = XLSX.utils.json_to_sheet(exportRows);
				const workbook = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(workbook, worksheet, "Incomplete");
				const fileDate = new Date().toISOString().slice(0, 10);
				XLSX.writeFile(
					workbook,
					`executive-incomplete-reservations-${fileDate}.xlsx`
				);
			})
			.catch(() => {
				message.error("Unable to export reservations right now.");
			})
			.finally(() => setExecutiveIncompleteExporting(false));
	}, [
		TXT,
		executiveDateFrom,
		executiveDateTo,
		executiveSearch,
		executiveSortBy,
		dashboardOwnerId,
		isRTL,
		token,
	]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		if (params.get("modal") !== "executive-incomplete") {
			if (executiveIncompleteVisible) setExecutiveIncompleteVisible(false);
			return;
		}
		setExecutiveSearch(params.get("executiveListSearch") || "");
		setExecutiveDateFrom(params.get("executiveDateFrom") || "");
		setExecutiveDateTo(params.get("executiveDateTo") || "");
		setExecutiveSortBy(params.get("executiveSortBy") || "booked_at");
		setExecutiveIncompletePage(
			Math.max(parseInt(params.get("executiveListPage"), 10) || 1, 1)
		);
		setExecutiveIncompleteVisible(true);
	}, [executiveIncompleteVisible, location.search]);

	useEffect(() => {
		if (!executiveIncompleteVisible) return;
		loadExecutiveIncompleteReservations(executiveIncompletePage);
	}, [
		executiveIncompletePage,
		executiveIncompleteVisible,
		loadExecutiveIncompleteReservations,
	]);

	/* navigation helpers */
	const gotoHotelDashboard = (hotel) => {
		if (!userData?.activeUser) {
			return message.error(
				"Your account is deactivated, please contact administration."
			);
		}
		localStorage.setItem("selectedHotel", JSON.stringify(hotel));
		const ownerId =
			normalizeDashboardId(hotel?.belongsTo?._id || hotel?.belongsTo) ||
			normalizeDashboardId(dashboardOwnerId || user?._id);
		window.location.href = `/hotel-management/dashboard/${ownerId}/${hotel._id}`;
	};

	const goToExecutiveReservationDetails = (reservation = {}) => {
		const ownerId = normalizeDashboardId(
			reservation.hotelOwnerId || dashboardOwnerId || user?._id
		);
		const hotelId = normalizeDashboardId(reservation.hotelId);
		if (!ownerId || !hotelId) return;
		const params = new URLSearchParams();
		params.set("list", "");
		params.set("page", "1");
		if (reservation.confirmation_number) {
			params.set("search", String(reservation.confirmation_number));
		}
		if (reservation.reservationId || reservation._id) {
			params.set("reservationId", String(reservation.reservationId || reservation._id));
		}
		window.location.href = `/hotel-management/new-reservation/${ownerId}/${hotelId}?${params.toString()}`;
	};

	const handleStepClick = (idx, hotel) => {
		setStepModalIdx(idx);
		setStepModalHotel(hotel);
		updateDashboardQuery({
			modal: "setup-step",
			hotelId: hotel?._id || "",
			step: idx,
		});
	};

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const modal = params.get("modal") || "";
		const queryHotelId = params.get("hotelId") || "";
		const stepIndex = params.get("step");
		const hotels = userData?.hotelIdsOwner || [];
		const matchingHotel = queryHotelId
			? hotels.find((hotel) => String(hotel?._id) === String(queryHotelId))
			: null;

		setAccountsVisible(modal === "accounts");
		setFinancialsVisible(modal === "financials");
		setAddVisible(modal === "add-property");

		if (modal === "edit-property" && matchingHotel) {
			setCurrentHotel(matchingHotel);
			setEditVisible(true);
		} else if (modal !== "edit-property") {
			setEditVisible(false);
		}

		if (
			modal === "setup-step" &&
			matchingHotel &&
			stepIndex !== null &&
			STEP_MODAL_REGISTRY[Number(stepIndex)]
		) {
			setStepModalHotel(matchingHotel);
			setStepModalIdx(Number(stepIndex));
		} else if (modal !== "setup-step") {
			setStepModalIdx(null);
			setStepModalHotel(null);
		}
	}, [location.search, userData?.hotelIdsOwner]);

	/* ═════ JSX ═════ */
	return (
		<Wrapper>
			<TopNavbar
				fromPage='AdminDashboard'
				AdminMenuStatus={adminMenuStatus}
				setAdminMenuStatus={setAdminMenuStatus}
				collapsed={collapsed}
				setCollapsed={setCollapsed}
				chosenLanguage={chosenLanguage}
			/>

			<PageActions className='container' $isRTL={isRTL}>
				<ManageAccountsButton
					onClick={() => {
						setAccountsVisible(true);
						updateDashboardQuery({ modal: "accounts" });
					}}
				>
					{TXT.accountsButton}
				</ManageAccountsButton>
				<ManageAccountsButton
					$variant='financials'
					onClick={() => {
						setFinancialsVisible(true);
						updateDashboardQuery({ modal: "financials" });
					}}
				>
					<WalletOutlined />
					{TXT.financialsButton}
				</ManageAccountsButton>
				<ManageAccountsButton
					onClick={() => {
						setAddVisible(true);
						updateDashboardQuery({ modal: "add-property" });
					}}
				>
					<PlusOutlined />
					{TXT.addPropertyButton}
				</ManageAccountsButton>
			</PageActions>

			<ExecutiveSummaryPanel className='container' $isRTL={isRTL}>
				<ExecutiveSummaryHeader>
					<div>
						<strong>{TXT.executiveSummary}</strong>
						<span>{TXT.executiveSummarySubtitle}</span>
					</div>
					<small>
						{executiveSummary?.period?.reservationsFrom
							? `${formatShortDate(
									executiveSummary.period.reservationsFrom
							  )} - ${formatShortDate(executiveSummary.period.reservationsTo)}`
							: ""}
					</small>
				</ExecutiveSummaryHeader>
				<ExecutiveSummaryGrid>
					<ExecutiveSummaryCard $tone='blue'>
						<HomeOutlined />
						<strong>
							{executiveLoading
								? "..."
								: Number(executiveSummary?.stats?.totalRooms || 0)}
						</strong>
						<span>{TXT.allRooms}</span>
					</ExecutiveSummaryCard>
					<ExecutiveSummaryCard $tone='green'>
						<DatabaseOutlined />
						<strong>
							{executiveLoading
								? "..."
								: Number(executiveSummary?.stats?.availableRooms || 0)}
						</strong>
						<span>{TXT.allAvailableRooms}</span>
					</ExecutiveSummaryCard>
					<ExecutiveSummaryCard $tone='purple'>
						<CalendarOutlined />
						<strong>
							{executiveLoading
								? "..."
								: Number(
										executiveSummary?.stats
											?.reservationsPastThreeMonths || 0
								  )}
						</strong>
						<span>{TXT.reservationsPastThreeMonths}</span>
						<em>{TXT.pastThreeMonths}</em>
					</ExecutiveSummaryCard>
					<ExecutiveSummaryCard
						$tone='red'
						$clickable
						role='button'
						tabIndex={0}
						onClick={() => {
							setExecutiveIncompleteRows([]);
							setExecutiveSearch("");
							setExecutiveDateFrom("");
							setExecutiveDateTo("");
							setExecutiveSortBy("booked_at");
							setExecutiveIncompletePage(1);
							setExecutiveIncompleteVisible(true);
							syncExecutiveIncompleteQuery(1, {
								search: "",
								dateFrom: "",
								dateTo: "",
								sortBy: "booked_at",
							});
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								event.currentTarget.click();
							}
						}}
					>
						<WarningOutlined />
						<strong>
							{executiveLoading
								? "..."
								: Number(
										executiveSummary?.stats?.incompleteReservations || 0
								  )}
						</strong>
						<span>{TXT.allIncompleteReservations}</span>
						<em>{TXT.historicalData}</em>
					</ExecutiveSummaryCard>
				</ExecutiveSummaryGrid>
			</ExecutiveSummaryPanel>

			<CardsGrid className='container'>
				{userData?.hotelIdsOwner?.length ? (
					userData.hotelIdsOwner.map((h) => (
						<HotelCard
							key={h._id}
							hotel={h}
							WORDS={TXT}
							isRTL={isRTL}
							adminId={user._id}
							token={token}
							onEdit={() => {
								setCurrentHotel(h);
								setEditVisible(true);
								updateDashboardQuery({
									modal: "edit-property",
									hotelId: h?._id || "",
								});
							}}
							onTitleClick={() => gotoHotelDashboard(h)}
							onStepClick={handleStepClick}
							updateDashboardQuery={updateDashboardQuery}
							clearDashboardModalQuery={clearDashboardModalQuery}
						/>
					))
				) : (
					<p>No hotels found.</p>
				)}
			</CardsGrid>

			{/* add / edit */}
			<Modal
				title={TXT.addPropertyTitle}
				open={addVisible}
				onCancel={() => {
					setAddVisible(false);
					clearDashboardModalQuery();
				}}
				footer={null}
				width='min(94vw, 680px)'
				style={{ top: 10 }}
				modalRender={(modal) => (
					<div dir={isRTL ? "rtl" : "ltr"}>{modal}</div>
				)}
				styles={{
					body: {
						maxHeight: "calc(100vh - 104px)",
						overflowY: "auto",
						paddingTop: 12,
					},
				}}
				destroyOnClose
			>
				<AddHotelForm
					chosenLanguage={chosenLanguage}
					closeAddHotelModal={() => {
						setAddVisible(false);
						clearDashboardModalQuery();
					}}
				/>
			</Modal>

			<Modal
				title='Edit Property'
				open={editVisible}
				onCancel={() => {
					setEditVisible(false);
					clearDashboardModalQuery();
				}}
				footer={null}
				destroyOnClose
			>
				<EditHotelForm
					closeEditHotelModal={() => {
						setEditVisible(false);
						clearDashboardModalQuery();
					}}
					hotelData={currentHotel}
					updateHotelDetails={updateHotelDetails}
					token={token}
					userId={user._id}
				/>
			</Modal>

			<OwnerAccountsModal
				open={accountsVisible}
				onClose={() => {
					setAccountsVisible(false);
					clearDashboardModalQuery();
				}}
				hotels={userData?.hotelIdsOwner || []}
				userId={user?._id}
				token={token}
				WORDS={TXT}
				isRTL={isRTL}
			/>

			<ManagerFinancialsModal
				open={financialsVisible}
				onCancel={() => {
					setFinancialsVisible(false);
					clearDashboardModalQuery();
				}}
				hotels={userData?.hotelIdsOwner || []}
				userId={user?._id}
				token={token}
				isArabic={isRTL}
			/>

			<Modal
				title={TXT.allIncompleteReservations}
				open={executiveIncompleteVisible}
				onCancel={() => {
					setExecutiveIncompleteVisible(false);
					clearDashboardModalQuery();
				}}
				footer={null}
				width='min(96vw, 1160px)'
				destroyOnClose
			>
				<OpenReservationsPanel $isRTL={isRTL}>
					<OpenFilters
						onSubmit={(event) => {
							event.preventDefault();
							setExecutiveIncompletePage(1);
							syncExecutiveIncompleteQuery(1);
							loadExecutiveIncompleteReservations(1);
						}}
					>
						<input
							value={executiveSearch}
							onChange={(event) => setExecutiveSearch(event.target.value)}
							placeholder={TXT.searchPlaceholder}
						/>
						<label>
							<span>{TXT.from}</span>
							<input
								type='date'
								value={executiveDateFrom}
								onChange={(event) => setExecutiveDateFrom(event.target.value)}
							/>
						</label>
						<label>
							<span>{TXT.to}</span>
							<input
								type='date'
								value={executiveDateTo}
								onChange={(event) => setExecutiveDateTo(event.target.value)}
							/>
						</label>
						<label>
							<span>{TXT.sortBy}</span>
							<select
								value={executiveSortBy}
								onChange={(event) => setExecutiveSortBy(event.target.value)}
							>
								<option value='booked_at'>{TXT.bookedAt}</option>
								<option value='checkin_date'>{TXT.checkin}</option>
								<option value='checkout_date'>{TXT.checkout}</option>
							</select>
						</label>
						<button type='submit'>{TXT.search}</button>
						<button
							type='button'
							onClick={() => {
								setExecutiveSearch("");
								setExecutiveDateFrom("");
								setExecutiveDateTo("");
								setExecutiveSortBy("booked_at");
								setExecutiveIncompletePage(1);
								syncExecutiveIncompleteQuery(1, {
									search: "",
									dateFrom: "",
									dateTo: "",
									sortBy: "booked_at",
								});
								loadExecutiveIncompleteReservations(1, {
									search: "",
									dateFrom: "",
									dateTo: "",
									sortBy: "booked_at",
								});
							}}
						>
							{TXT.reset}
						</button>
						<button
							type='button'
							onClick={handleExportExecutiveIncomplete}
							disabled={executiveIncompleteExporting}
							className='export-btn'
						>
							{executiveIncompleteExporting
								? TXT.exporting
								: TXT.exportExcel}
						</button>
					</OpenFilters>

					<OpenTableWrap>
						<OpenTable>
							<thead>
								<tr>
									<th>{TXT.index}</th>
									<th>{TXT.hotelName}</th>
									<th>{TXT.confirmation}</th>
									<th>{TXT.guest}</th>
									<th>{TXT.source}</th>
									<th>{TXT.bookedAt}</th>
									<th>{TXT.checkin}</th>
									<th>{TXT.checkout}</th>
									<th>{TXT.total}</th>
									<th>{TXT.reason}</th>
									<th>{TXT.cycle}</th>
								</tr>
							</thead>
							<tbody>
								{executiveIncompleteLoading ? (
									<tr>
										<td colSpan='11'>Loading...</td>
									</tr>
								) : executiveIncompleteRows.length ? (
									executiveIncompleteRows.map((reservation, index) => (
										<tr key={reservation._id || reservation.confirmation_number}>
											<td>
												{(executiveIncompletePage - 1) *
													executiveListLimit +
													index +
													1}
											</td>
											<td>{reservation.hotelName || "-"}</td>
											<td>
												<ConfirmationButton
													type='button'
													onClick={() =>
														goToExecutiveReservationDetails(reservation)
													}
												>
													{reservation.confirmation_number || "-"}
												</ConfirmationButton>
											</td>
											<td>{reservation.customer_details?.name || "-"}</td>
											<SourceCell>{reservation.booking_source || "-"}</SourceCell>
											<td>{formatShortDate(reservation.booked_at)}</td>
											<td>{formatShortDate(reservation.checkin_date)}</td>
											<td>{formatShortDate(reservation.checkout_date)}</td>
											<td>{formatMoney(reservation.total_amount)} SAR</td>
											<ReasonCell dir={isRTL ? "rtl" : "ltr"}>
												{getReservationReasonText(reservation, isRTL)}
											</ReasonCell>
											<td>{reservation.financial_cycle?.status || "incomplete"}</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan='11'>{TXT.noIncompleteRows}</td>
									</tr>
								)}
							</tbody>
						</OpenTable>
					</OpenTableWrap>

					<Pagination
						current={executiveIncompletePage}
						pageSize={executiveListLimit}
						total={executiveIncompleteTotal}
						onChange={(page) => {
							setExecutiveIncompletePage(page);
							syncExecutiveIncompleteQuery(page);
						}}
						showSizeChanger={false}
						size='small'
					/>
				</OpenReservationsPanel>
			</Modal>

			{/* dynamic step modal (resolved from registry) */}
			{stepModalIdx !== null &&
				stepModalHotel &&
				(() => {
					const ModalComp = STEP_MODAL_REGISTRY[stepModalIdx];
					if (!ModalComp) return null;
					return (
						<ModalComp
							open={true}
							onClose={() => {
								setStepModalIdx(null);
								setStepModalHotel(null);
								clearDashboardModalQuery();
							}}
							hotelDoc={stepModalHotel}
							token={token}
							adminId={user._id}
							language={chosenLanguage}
							refreshCard={fetchHotels}
						/>
					);
				})()}
		</Wrapper>
	);
};

const normalizeDashboardId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const getDashboardRoleNumbers = (user = {}) => {
	const roles = Array.isArray(user.roles) ? user.roles : [];
	return [...new Set([user.role, ...roles].map(Number).filter(Boolean))];
};

const getDashboardRoleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const isLimitedOrderTakerDashboardUser = (user = {}) => {
	const roleNumbers = getDashboardRoleNumbers(user);
	const roleDescriptions = getDashboardRoleDescriptions(user);
	const isFullHotelUser =
		roleNumbers.some((role) => [1000, 2000, 3000, 8000].includes(role)) ||
		roleDescriptions.some((role) =>
			["hotelmanager", "reception", "reservationemployee"].includes(role)
		);
	const isOrderTaker =
		roleNumbers.includes(7000) ||
		roleDescriptions.includes("ordertaker") ||
		(Array.isArray(user.accessTo) && user.accessTo.includes("ownReservations"));

	return isOrderTaker && !isFullHotelUser;
};

const isScopedRoleDashboardUser = (user = {}) => {
	const roleNumbers = getDashboardRoleNumbers(user);
	const roleDescriptions = getDashboardRoleDescriptions(user);
	const isOwnerManager =
		roleNumbers.includes(2000) &&
		!normalizeDashboardId(user.belongsToId) &&
		Array.isArray(user.hotelIdsOwner) &&
		user.hotelIdsOwner.length > 0;
	const hasScopedRole =
		roleNumbers.some((role) =>
			[2000, 3000, 4000, 5000, 6000, 7000, 8000].includes(role)
		) ||
		roleDescriptions.some((role) =>
			[
				"hotelmanager",
				"reception",
				"housekeepingmanager",
				"housekeeping",
				"finance",
				"ordertaker",
				"reservationemployee",
			].includes(role)
		);
	const hasHotelScope =
		Boolean(normalizeDashboardId(user.hotelIdWork)) ||
		(Array.isArray(user.hotelsToSupport) && user.hotelsToSupport.length > 0) ||
		(Array.isArray(user.hotelIdsWork) && user.hotelIdsWork.length > 0);

	return hasScopedRole && hasHotelScope && !isOwnerManager;
};

const getAssignedHotelIdsFromUser = (user = {}) => {
	const values = [
		user.hotelIdWork,
		...(Array.isArray(user.hotelIdsWork) ? user.hotelIdsWork : []),
		...(Array.isArray(user.hotelsToSupport) ? user.hotelsToSupport : []),
	];
	return [...new Set(values.map(normalizeDashboardId).filter(Boolean))];
};

const getPrimaryScopedRole = (user = {}) => {
	const roleNumbers = getDashboardRoleNumbers(user);
	const roleDescriptions = getDashboardRoleDescriptions(user);
	const hasRole = (role) => roleNumbers.includes(Number(role));
	const hasRoleDescription = (description) =>
		roleDescriptions.includes(String(description || "").toLowerCase());

	if (hasRole(2000) || hasRoleDescription("hotelmanager")) return "hotelmanager";
	if (hasRole(3000) || hasRoleDescription("reception")) return "reception";
	if (
		hasRole(4000) ||
		hasRoleDescription("housekeepingmanager")
	) {
		return "housekeepingmanager";
	}
	if (hasRole(5000) || hasRoleDescription("housekeeping")) return "housekeeping";
	if (hasRole(6000) || hasRoleDescription("finance")) return "finance";
	if (hasRole(8000) || hasRoleDescription("reservationemployee"))
		return "reservationemployee";
	if (hasRole(7000) || hasRoleDescription("ordertaker")) return "ordertaker";
	return "user";
};

const getScopedOwnerId = (hotel, user) =>
	normalizeDashboardId(hotel?.belongsTo?._id || hotel?.belongsTo) ||
	normalizeDashboardId(user?.belongsToId || user?._id);

const getScopedRouteForRole = (roleKey, ownerId, hotelId, action = "primary") => {
	if (!ownerId || !hotelId) return "/hotel-management/main-dashboard";

	if (roleKey === "ordertaker") {
		if (action === "finance") {
			return `/hotel-management/financials/${ownerId}/${hotelId}`;
		}
		return `/hotel-management/new-reservation/${ownerId}/${hotelId}${
			action === "list" ? "?list=&page=1" : "?newReservation"
		}`;
	}
	if (roleKey === "reception") {
		return `/hotel-management/new-reservation/${ownerId}/${hotelId}${
			action === "list" ? "?list=&page=1" : "?reserveARoom"
		}`;
	}
	if (roleKey === "reservationemployee") {
		return `/hotel-management/new-reservation/${ownerId}/${hotelId}${
			action === "list"
				? "?list=&page=1"
				: action === "newReservation"
				  ? "?newReservation"
				  : "?pendingConfirmation"
		}`;
	}
	if (roleKey === "housekeeping" || roleKey === "housekeepingmanager") {
		return `/hotel-management/house-keeping/${ownerId}/${hotelId}`;
	}
	if (roleKey === "finance") {
		return action === "payment"
			? `/hotel-management-payment/${ownerId}/${hotelId}`
			: action === "reservations"
			  ? `/hotel-management/new-reservation/${ownerId}/${hotelId}?list=&page=1`
			  : `/hotel-management/financials/${ownerId}/${hotelId}`;
	}

	if (action === "reservations") {
		return `/hotel-management/new-reservation/${ownerId}/${hotelId}?list=&page=1`;
	}
	if (action === "reports") {
		return `/hotel-management/hotel-reports/${ownerId}/${hotelId}`;
	}
	if (action === "housekeeping") {
		return `/hotel-management/house-keeping/${ownerId}/${hotelId}`;
	}
	if (action === "settings") {
		return `/hotel-management/settings/${ownerId}/${hotelId}?activeTab=HotelDetails&currentStep=0`;
	}
	return `/hotel-management/dashboard/${ownerId}/${hotelId}`;
};

const titleCaseWords = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

const getHotelAddressLine = (hotel = {}) =>
	[
		hotel.hotelAddress,
		hotel.hotelCity,
		hotel.hotelState,
		hotel.hotelCountry,
	]
		.filter(Boolean)
		.join(", ");

const normalizeAgentHotel = (hotel, fallback, user) => {
	const source = hotel && !hotel.error && hotel._id ? hotel : fallback || {};
	const hotelId = normalizeDashboardId(source._id || fallback?._id);
	if (!hotelId) return null;
	const rawBelongsTo = source.belongsTo;
	const ownerId =
		normalizeDashboardId(
			rawBelongsTo && typeof rawBelongsTo === "object"
				? rawBelongsTo._id
				: rawBelongsTo
		) || normalizeDashboardId(user.belongsToId || user._id);

	return {
		...source,
		_id: hotelId,
		hotelName: source.hotelName || fallback?.hotelName || user.hotelName || "Hotel",
		belongsTo: ownerId
			? {
					...(rawBelongsTo && typeof rawBelongsTo === "object"
						? rawBelongsTo
						: {}),
					_id: ownerId,
			  }
			: rawBelongsTo,
	};
};

const SCOPED_DASHBOARD_WORDS = {
	en: {
		eyebrow: "Assigned hotel workspace",
		title: "My Assigned Hotels",
		subtitle:
			"Choose a property and continue to the tools available for your role.",
		assignedHotels: "Assigned hotels",
		totalReservations: "Reservations",
		newToday: "New today",
		cancelled: "Cancelled",
		incomplete: "Needs follow-up",
		newReservation: "New reservation",
		myReservations: "Reservation list",
		openDashboard: "Open dashboard",
		reports: "Reports",
		housekeeping: "Housekeeping",
		settings: "Settings",
		payments: "Payments",
		financials: "Financials",
		walletBalance: "Wallet balance",
		outstandingReservations: "Outstanding reservations",
		commissionOnly: "Commission only",
		openHotel: "Open hotel",
		loading: "Loading assigned hotels...",
		noHotels: "No hotels are assigned to this account yet.",
		assigned: "Assigned",
		toggleHint: "Switch between hotels",
		redirecting: "Opening your assigned hotel...",
		roleLabels: {
			hotelmanager: "Hotel manager workspace",
			reception: "Reception workspace",
			ordertaker: "External agent workspace",
			reservationemployee: "Reservations employee workspace",
			finance: "Finance workspace",
			housekeepingmanager: "Housekeeping manager workspace",
			housekeeping: "Housekeeping workspace",
			user: "Hotel workspace",
		},
	},
	ar: {
		eyebrow: "مساحة عمل الوكيل الخارجي",
		title: "الفنادق المخصصة لي",
		subtitle:
			"اختر الفندق، أنشئ حجوزات جديدة، وراجع فقط الحجوزات التي قمت بإنشائها.",
		assignedHotels: "الفنادق المخصصة",
		totalReservations: "حجوزاتي",
		newToday: "جديد اليوم",
		cancelled: "ملغاة",
		incomplete: "تحتاج متابعة",
		newReservation: "حجز جديد",
		myReservations: "قائمة حجوزاتي",
		openHotel: "فتح الفندق",
		loading: "جاري تحميل الفنادق المخصصة...",
		noHotels: "لا توجد فنادق مخصصة لهذا الحساب حتى الآن.",
		assigned: "مخصص",
		toggleHint: "التبديل بين الفنادق",
	},
};

SCOPED_DASHBOARD_WORDS.ar = {
	...SCOPED_DASHBOARD_WORDS.en,
	...SCOPED_DASHBOARD_WORDS.ar,
	openDashboard: "لوحة التحكم",
	reports: "التقارير",
	housekeeping: "النظافة",
	settings: "الإعدادات",
	payments: "المدفوعات",
	redirecting: "جاري فتح الفندق المخصص...",
	roleLabels: {
		hotelmanager: "مساحة مدير الفندق",
		reception: "مساحة الاستقبال",
		ordertaker: "مساحة الوكيل الخارجي",
		finance: "مساحة المالية",
		housekeepingmanager: "مساحة مدير النظافة",
		housekeeping: "مساحة النظافة",
		user: "مساحة الفندق",
	},
};

SCOPED_DASHBOARD_WORDS.ar.financials = "المالية";
SCOPED_DASHBOARD_WORDS.ar.walletBalance = "رصيد المحفظة";
SCOPED_DASHBOARD_WORDS.ar.roleLabels.reservationemployee =
	"مساحة مسؤول الحجوزات";

SCOPED_DASHBOARD_WORDS.ar.outstandingReservations = "قيمة حجوزات معلقة";
SCOPED_DASHBOARD_WORDS.ar.commissionOnly = "عمولة فقط";

const agentWalletDisplay = (wallet = {}, text = SCOPED_DASHBOARD_WORDS.en) => {
	const commercialModel =
		wallet.commercialModel || wallet.agent?.agentCommercialModel || "";
	if (commercialModel === "commission_only" || wallet.walletRequired === false) {
		return {
			value: text.commissionOnly || "Commission only",
			label: text.walletBalance || "Wallet balance",
		};
	}
	const balance = Number(wallet.balance || 0);
	return {
		value: Math.abs(balance).toLocaleString("en-US"),
		label:
			balance < 0
				? text.outstandingReservations || "Outstanding reservations"
				: text.walletBalance || "Wallet balance",
	};
};

const ScopedUserMainDashboard = ({ user, token }) => {
	const history = useHistory();
	const location = useLocation();
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const TXT = SCOPED_DASHBOARD_WORDS[isRTL ? "ar" : "en"];
	const roleKey = getPrimaryScopedRole(user);
	const canUseFinancialsModal = roleKey === "finance" || roleKey === "hotelmanager";
	const [adminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed } = getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [hotels, setHotels] = useState([]);
	const [summaries, setSummaries] = useState({});
	const [walletSummaries, setWalletSummaries] = useState({});
	const [loading, setLoading] = useState(false);
	const [summaryLoading, setSummaryLoading] = useState(false);
	const [selectedHotelId, setSelectedHotelId] = useState("");
	const [financialsVisible, setFinancialsVisible] = useState(false);

	const assignedHotelIds = useMemo(
		() => getAssignedHotelIdsFromUser(user),
		[user]
	);
	const assignedHotelKey = assignedHotelIds.join("|");
	const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
	const isOrderTakerOnly = isLimitedOrderTakerDashboardUser(user);

	const updateScopedDashboardQuery = useCallback(
		(updates = {}) => {
			const params = new URLSearchParams(location.search);
			Object.entries(updates).forEach(([key, value]) => {
				if (value === undefined || value === null || value === "") {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});
			const nextSearch = params.toString();
			const nextSearchString = nextSearch ? `?${nextSearch}` : "";
			if (nextSearchString === location.search) return;
			history.replace({
				pathname: location.pathname,
				search: nextSearchString,
			});
		},
		[history, location.pathname, location.search]
	);

	const clearScopedDashboardModalQuery = useCallback(() => {
		updateScopedDashboardQuery({
			modal: "",
			hotelId: "",
		});
	}, [updateScopedDashboardQuery]);

	useEffect(() => {
		if (!assignedHotelIds.length) {
			setHotels([]);
			return;
		}
		let isMounted = true;
		setLoading(true);
		const rawAssignedHotels = [
			user.hotelIdWork,
			...(Array.isArray(user.hotelIdsWork) ? user.hotelIdsWork : []),
			...(Array.isArray(user.hotelsToSupport) ? user.hotelsToSupport : []),
		];

		Promise.all(
			assignedHotelIds.map((hotelId) => {
				const rawFallback =
					rawAssignedHotels.find(
						(item) => normalizeDashboardId(item) === hotelId
					) || {};
				const fallback =
					rawFallback && typeof rawFallback === "object"
						? rawFallback
						: { _id: hotelId };
				return getHotelDetails(hotelId)
					.then((hotel) => normalizeAgentHotel(hotel, fallback, user))
					.catch(() => normalizeAgentHotel(null, fallback, user));
			})
		)
			.then((loadedHotels) => {
				if (!isMounted) return;
				const cleanHotels = loadedHotels.filter(Boolean);
				setHotels(cleanHotels);
				setSelectedHotelId((current) =>
					cleanHotels.some((hotel) => hotel._id === current)
						? current
						: cleanHotels[0]?._id || ""
				);
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [assignedHotelKey, user, assignedHotelIds]);

	useEffect(() => {
		if (!hotels.length || !user?._id) {
			setSummaries({});
			return;
		}
		let isMounted = true;
		setSummaryLoading(true);
		Promise.all(
			hotels.map((hotel) =>
				getReservationSummary(
					hotel._id,
					today,
					isOrderTakerOnly ? { createdByUserId: user._id } : {}
				).then((summary) => [hotel._id, summary || {}])
			)
		)
			.then((entries) => {
				if (!isMounted) return;
				setSummaries(Object.fromEntries(entries));
			})
			.finally(() => {
				if (isMounted) setSummaryLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, [hotels, isOrderTakerOnly, today, user?._id]);

	useEffect(() => {
		if (!hotels.length || !user?._id || !token || roleKey !== "ordertaker") {
			setWalletSummaries({});
			return;
		}
		let isMounted = true;
		Promise.all(
			hotels.map((hotel) =>
				getAgentWalletSummary(hotel._id, user._id, token, {
					agentId: user._id,
				}).then((wallet) => [hotel._id, wallet?.agents?.[0] || {}])
			)
		)
			.then((entries) => {
				if (isMounted) setWalletSummaries(Object.fromEntries(entries));
			})
			.catch(() => {
				if (isMounted) setWalletSummaries({});
			});

		return () => {
			isMounted = false;
		};
	}, [hotels, roleKey, token, user?._id]);

	const orderedHotels = useMemo(() => {
		if (!selectedHotelId) return hotels;
		return [
			...hotels.filter((hotel) => hotel._id === selectedHotelId),
			...hotels.filter((hotel) => hotel._id !== selectedHotelId),
		];
	}, [hotels, selectedHotelId]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const shouldOpenFinancials =
			params.get("modal") === "financials" && canUseFinancialsModal;
		if (!shouldOpenFinancials) {
			if (financialsVisible) setFinancialsVisible(false);
			return;
		}
		const queryHotelId = normalizeDashboardId(params.get("hotelId"));
		const nextHotelId =
			queryHotelId && hotels.some((hotel) => hotel._id === queryHotelId)
				? queryHotelId
				: selectedHotelId || hotels[0]?._id || "";
		if (nextHotelId) {
			setSelectedHotelId(nextHotelId);
		}
		setFinancialsVisible(true);
	}, [
		canUseFinancialsModal,
		financialsVisible,
		hotels,
		location.search,
		selectedHotelId,
	]);

	useEffect(() => {
		if (loading || hotels.length !== 1) return;
		const params = new URLSearchParams(location.search);
		if (params.get("modal") === "financials" && canUseFinancialsModal) return;
		const hotel = hotels[0];
		const ownerId = getScopedOwnerId(hotel, user);
		const hotelId = normalizeDashboardId(hotel?._id);
		if (!ownerId || !hotelId) return;
		localStorage.setItem("selectedHotel", JSON.stringify(hotel));
		history.replace(getScopedRouteForRole(roleKey, ownerId, hotelId));
	}, [
		canUseFinancialsModal,
		history,
		hotels,
		loading,
		location.search,
		roleKey,
		user,
	]);

	const totals = useMemo(
		() =>
			Object.values(summaries).reduce(
				(acc, summary) => ({
					allReservations:
						acc.allReservations + Number(summary?.allReservations || 0),
					newReservations:
						acc.newReservations + Number(summary?.newReservations || 0),
					cancellations:
						acc.cancellations + Number(summary?.cancellations || 0),
					inComplete: acc.inComplete + Number(summary?.inComplete || 0),
				}),
				{
					allReservations: 0,
					newReservations: 0,
					cancellations: 0,
					inComplete: 0,
				}
			),
		[summaries]
	);

	const goToHotel = (hotel, action = "primary") => {
		const hotelId = normalizeDashboardId(hotel?._id);
		const ownerId = getScopedOwnerId(hotel, user);
		if (!hotelId || !ownerId) return;
		localStorage.setItem("selectedHotel", JSON.stringify(hotel));
		if (
			canUseFinancialsModal &&
			(action === "finance" || (roleKey === "finance" && action === "primary"))
		) {
			setSelectedHotelId(hotelId);
			setFinancialsVisible(true);
			updateScopedDashboardQuery({
				modal: "financials",
				hotelId: "",
			});
			return;
		}
		history.push(getScopedRouteForRole(roleKey, ownerId, hotelId, action));
	};

	const getHotelActions = () => {
		if (roleKey === "ordertaker") {
			return [
				{ action: "primary", label: TXT.newReservation, icon: <PlusOutlined /> },
				{ action: "list", label: TXT.myReservations, icon: <DatabaseOutlined /> },
				{ action: "finance", label: TXT.financials, icon: <WalletOutlined /> },
			];
		}
		if (roleKey === "reception") {
			return [
				{ action: "primary", label: TXT.newReservation, icon: <PlusOutlined /> },
				{ action: "list", label: TXT.myReservations, icon: <DatabaseOutlined /> },
			];
		}
		if (roleKey === "reservationemployee") {
			return [
				{
					action: "primary",
					label: isRTL ? "تأكيد الحجوزات" : "Confirm reservations",
					icon: <DatabaseOutlined />,
				},
				{ action: "list", label: TXT.myReservations, icon: <DatabaseOutlined /> },
				{
					action: "newReservation",
					label: TXT.newReservation,
					icon: <PlusOutlined />,
				},
			];
		}
		if (roleKey === "finance") {
			return [
				{ action: "primary", label: TXT.financials || "Financials", icon: <WalletOutlined /> },
				{ action: "reservations", label: TXT.myReservations, icon: <DatabaseOutlined /> },
				{ action: "payment", label: TXT.payments || "Payments", icon: <CalendarOutlined /> },
			];
		}
		if (roleKey === "housekeeping" || roleKey === "housekeepingmanager") {
			return [
				{
					action: "primary",
					label: TXT.housekeeping || "Housekeeping",
					icon: <HomeOutlined />,
				},
			];
		}
		return [
			{
				action: "primary",
				label: TXT.openDashboard || "Open dashboard",
				icon: <HomeOutlined />,
			},
			...(canUseFinancialsModal
				? [
						{
							action: "finance",
							label: TXT.financials || "Financials",
							icon: <WalletOutlined />,
						},
				  ]
				: []),
			{ action: "reservations", label: TXT.myReservations, icon: <DatabaseOutlined /> },
			{ action: "reports", label: TXT.reports || "Reports", icon: <CalendarOutlined /> },
			{ action: "housekeeping", label: TXT.housekeeping || "Housekeeping", icon: <HomeOutlined /> },
			{ action: "settings", label: TXT.settings || "Settings", icon: <EditOutlined /> },
		].filter(Boolean);
	};

	const renderSummaryTile = (value, label, tone, icon) => (
		<AgentSummaryTile $tone={tone}>
			<span>{icon}</span>
			<strong>{summaryLoading ? "..." : value}</strong>
			<small>{label}</small>
		</AgentSummaryTile>
	);

	return (
		<Wrapper>
			<TopNavbar
				fromPage='AgentDashboard'
				AdminMenuStatus={adminMenuStatus}
				setAdminMenuStatus={setAdminMenuStatus}
				collapsed={collapsed}
				setCollapsed={setCollapsed}
				chosenLanguage={chosenLanguage}
			/>

			<AgentDashboardShell className='container' $isRTL={isRTL}>
				<AgentHero>
					<div>
						<span>{TXT.roleLabels?.[roleKey] || TXT.eyebrow}</span>
						<h1>{TXT.title}</h1>
						<p>{TXT.subtitle}</p>
					</div>
					<AgentTotals>
						{renderSummaryTile(
							totals.allReservations,
							TXT.totalReservations,
							"purple",
							<CalendarOutlined />
						)}
						{renderSummaryTile(
							totals.newReservations,
							TXT.newToday,
							"blue",
							<PlusOutlined />
						)}
						{renderSummaryTile(
							totals.cancellations,
							TXT.cancelled,
							"red",
							<WarningOutlined />
						)}
						{renderSummaryTile(
							totals.inComplete,
							TXT.incomplete,
							"orange",
							<DatabaseOutlined />
						)}
					</AgentTotals>
				</AgentHero>

				<AgentSwitcher>
					<AgentSectionHeader>
						<strong>{TXT.assignedHotels}</strong>
						<span>{TXT.toggleHint}</span>
					</AgentSectionHeader>
					<AgentHotelToggleGrid>
						{hotels.map((hotel) => (
							<button
								type='button'
								key={hotel._id}
								data-active={hotel._id === selectedHotelId ? "true" : "false"}
								onClick={() => setSelectedHotelId(hotel._id)}
							>
								<HomeOutlined />
								<span>{titleCaseWords(hotel.hotelName || "Hotel")}</span>
							</button>
						))}
					</AgentHotelToggleGrid>
				</AgentSwitcher>

				{loading ? (
					<AgentEmpty>{TXT.loading}</AgentEmpty>
				) : orderedHotels.length ? (
					<AgentHotelGrid>
						{orderedHotels.map((hotel) => {
							const summary = summaries[hotel._id] || {};
							const walletDisplay = agentWalletDisplay(
								walletSummaries[hotel._id] || {},
								TXT
							);
							const active = hotel._id === selectedHotelId;
							return (
								<AgentHotelCard key={hotel._id} $active={active}>
									<AgentHotelCardHeader>
										<button
											type='button'
											onClick={() => goToHotel(hotel, "primary")}
										>
											{titleCaseWords(hotel.hotelName || "Hotel")}
										</button>
										<Tag color={active ? "blue" : "cyan"}>{TXT.assigned}</Tag>
									</AgentHotelCardHeader>
									<p>{getHotelAddressLine(hotel) || user.companyName || "-"}</p>
									<AgentCardStats>
										<AgentMiniStat>
											<strong>
												{summaryLoading
													? "..."
													: Number(summary.allReservations || 0)}
											</strong>
											<span>{TXT.totalReservations}</span>
										</AgentMiniStat>
										<AgentMiniStat>
											<strong>
												{summaryLoading
													? "..."
													: Number(summary.newReservations || 0)}
											</strong>
											<span>{TXT.newToday}</span>
										</AgentMiniStat>
										<AgentMiniStat>
											<strong>
												{summaryLoading
													? "..."
													: Number(summary.cancellations || 0)}
											</strong>
											<span>{TXT.cancelled}</span>
										</AgentMiniStat>
										<AgentMiniStat>
											<strong>
												{summaryLoading
													? "..."
													: Number(summary.inComplete || 0)}
											</strong>
											<span>{TXT.incomplete}</span>
										</AgentMiniStat>
										{roleKey === "ordertaker" && (
											<AgentMiniStat>
												<strong>{walletDisplay.value}</strong>
												<span>{walletDisplay.label}</span>
											</AgentMiniStat>
										)}
									</AgentCardStats>
									<AgentCardActions>
										{getHotelActions().map((item) => (
											<button
												type='button'
												key={`${hotel._id}-${item.action}`}
												onClick={() => goToHotel(hotel, item.action)}
											>
												{item.icon}
												{item.label}
											</button>
										))}
									</AgentCardActions>
								</AgentHotelCard>
							);
						})}
					</AgentHotelGrid>
				) : (
					<AgentEmpty>{TXT.noHotels}</AgentEmpty>
				)}
			</AgentDashboardShell>

			<ManagerFinancialsModal
				open={financialsVisible}
				onCancel={() => {
					setFinancialsVisible(false);
					clearScopedDashboardModalQuery();
				}}
				hotels={hotels}
				userId={user?._id}
				token={token}
				isArabic={isRTL}
			/>
		</Wrapper>
	);
};

const MainHotelDashboard = () => {
	const auth = isAuthenticated();
	const user = auth?.user || {};
	const token = auth?.token;

	if (isScopedRoleDashboardUser(user)) {
		return <ScopedUserMainDashboard user={user} token={token} />;
	}

	return <ManagerMainHotelDashboard />;
};

export default MainHotelDashboard;

const accountRoleOptions = [
	{ value: "hotelmanager", role: 2000, en: "Hotel Manager", ar: "مدير الفندق" },
	{ value: "reception", role: 3000, en: "Front Desk Reception", ar: "موظف الاستقبال" },
	{
		value: "ordertaker",
		role: 7000,
		en: "External Agent / Order Taker",
		ar: "وكيل خارجي / مستلم حجوزات",
	},
	{ value: "finance", role: 6000, en: "Finance", ar: "المالية" },
	{
		value: "reservationemployee",
		role: 8000,
		en: "Reservations Officer",
		ar: "مسؤول الحجوزات",
	},
	{
		value: "housekeepingmanager",
		role: 4000,
		en: "Housekeeping Manager",
		ar: "مدير النظافة",
	},
	{ value: "housekeeping", role: 5000, en: "Housekeeping", ar: "النظافة" },
];

const accountAccessOptions = [
	{ value: "dashboard", en: "Dashboard", ar: "لوحة التحكم" },
	{ value: "reservations", en: "Reservations", ar: "الحجوزات" },
	{ value: "ownReservations", en: "Own Reservation List", ar: "حجوزاته فقط" },
	{ value: "newReservation", en: "New Reservation", ar: "حجز جديد" },
	{ value: "reports", en: "Reports", ar: "التقارير" },
	{ value: "finance", en: "Finance", ar: "المالية" },
	{ value: "housekeeping", en: "Housekeeping", ar: "النظافة" },
	{ value: "settings", en: "Settings", ar: "الإعدادات" },
];

const getAccountRoleOption = (roleDescription, role) =>
	accountRoleOptions.find((option) => option.value === roleDescription) ||
	accountRoleOptions.find((option) => option.role === Number(role)) ||
	accountRoleOptions[0];

const getDefaultAccess = (roleDescription) => {
	if (roleDescription === "hotelmanager") {
		return accountAccessOptions.map((option) => option.value);
	}
	if (roleDescription === "finance")
		return ["dashboard", "reservations", "reports", "finance"];
	if (roleDescription === "reservationemployee")
		return ["reservations", "newReservation", "settings"];
	if (roleDescription === "housekeepingmanager")
		return ["dashboard", "housekeeping"];
	if (roleDescription === "housekeeping") return ["housekeeping"];
	if (roleDescription === "reception") return ["reservations", "newReservation"];
	if (roleDescription === "ordertaker")
		return ["newReservation", "ownReservations"];
	return [];
};

const getDefaultAccessForRoles = (roleDescriptions = []) => [
	...new Set(roleDescriptions.flatMap((role) => getDefaultAccess(role))),
];

const agentCommercialModelOptions = [
	{
		value: "wallet_inventory",
		en: "Inventory wallet",
		ar: "محفظة مخزون",
		enHint: "Reservations reduce the agent wallet balance.",
		arHint: "الحجوزات تخصم من رصيد محفظة الوكيل.",
	},
	{
		value: "commission_only",
		en: "Commission only",
		ar: "عمولة فقط",
		enHint: "Reservations are tracked for commission without wallet debt.",
		arHint: "تظهر الحجوزات للعمولة بدون مديونية محفظة.",
	},
	{
		value: "mixed",
		en: "Wallet + commission",
		ar: "محفظة وعمولة",
		enHint: "Use wallet tracking and commission reporting together.",
		arHint: "استخدم المحفظة مع تتبع العمولة معاً.",
	},
];

const normalizeAgentCommercialModel = (value) =>
	agentCommercialModelOptions.some((option) => option.value === value)
		? value
		: "wallet_inventory";

const parseAccountMoney = (value) => {
	const parsed = Number(String(value ?? 0).replace(/,/g, "").trim());
	return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
};

const isAgentRoleSelected = (roleDescriptions = []) =>
	(Array.isArray(roleDescriptions) ? roleDescriptions : []).includes("ordertaker");

const buildAgentOpeningBalances = (hotelIds = [], amount = 0) =>
	(Array.isArray(hotelIds) ? hotelIds : [])
		.filter(Boolean)
		.map((hotelId) => ({ hotelId, amount: parseAccountMoney(amount) }));

const getAgentOpeningCreditForHotels = (account = {}, hotelIds = []) => {
	const balances = Array.isArray(account.agentWalletOpeningBalances)
		? account.agentWalletOpeningBalances
		: [];
	const normalizedHotelIds = (Array.isArray(hotelIds) ? hotelIds : [])
		.map((hotelId) => String(hotelId || ""))
		.filter(Boolean);
	const matched = balances.find((entry) =>
		normalizedHotelIds.includes(String(entry?.hotelId || entry?.hotel || ""))
	);
	return parseAccountMoney(
		matched?.amount ?? account.agentOpeningWalletCredit ?? 0
	);
};

const ACCOUNT_DOCUMENT_MAX_BYTES = 3 * 1024 * 1024;

const fileToCompanyDocument = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			resolve({
				fileName: file.name,
				fileType: file.type || "application/octet-stream",
				fileSize: file.size || 0,
				dataUrl: reader.result,
				uploadedAt: new Date().toISOString(),
			});
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});

const normalizeCompanyDocuments = (documents = []) =>
	(Array.isArray(documents) ? documents : [])
		.filter((document) => document && (document.fileName || document.url || document.dataUrl))
		.map((document) => ({
			fileName: String(document.fileName || document.name || "Company document"),
			fileType: String(document.fileType || document.type || ""),
			fileSize: Number(document.fileSize || document.size || 0),
			dataUrl: document.dataUrl || document.url || "",
			uploadedAt: document.uploadedAt || new Date().toISOString(),
			notes: document.notes || "",
		}));

const getCompanyDocumentSource = (document = {}) =>
	document.dataUrl || document.url || document.fileUrl || document.secure_url || "";

const isCompanyDocumentPdf = (document = {}) => {
	const fileType = String(document.fileType || document.type || "").toLowerCase();
	const fileName = String(document.fileName || document.name || "").toLowerCase();
	const source = String(getCompanyDocumentSource(document)).toLowerCase();
	return (
		fileType.includes("pdf") ||
		fileName.endsWith(".pdf") ||
		source.startsWith("data:application/pdf")
	);
};

const isCompanyDocumentImage = (document = {}) => {
	const fileType = String(document.fileType || document.type || "").toLowerCase();
	const fileName = String(document.fileName || document.name || "").toLowerCase();
	const source = String(getCompanyDocumentSource(document)).toLowerCase();
	return (
		fileType.startsWith("image/") ||
		/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName) ||
		source.startsWith("data:image/")
	);
};

const OwnerAccountsModal = ({
	open,
	onClose,
	hotels,
	userId,
	token,
	WORDS,
	isRTL,
}) => {
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [previewingAccountId, setPreviewingAccountId] = useState("");
	const [accounts, setAccounts] = useState([]);
	const [activeAccountTab, setActiveAccountTab] = useState("new");
	const [documentPreview, setDocumentPreview] = useState(null);
	const [form, setForm] = useState({
		hotelIds: [],
		name: "",
		email: "",
		phone: "",
		companyName: "",
		companyOfficialName: "",
		companyEin: "",
		companyDocuments: [],
		agentCommercialModel: "wallet_inventory",
		agentOpeningWalletCredit: "",
		password: "",
		password2: "",
		roleDescriptions: ["reception"],
		accessTo: getDefaultAccessForRoles(["reception"]),
	});
	const [editingAccount, setEditingAccount] = useState(null);
	const [savingAccount, setSavingAccount] = useState(false);
	const [editForm, setEditForm] = useState({
		hotelIds: [],
		name: "",
		email: "",
		phone: "",
		companyName: "",
		companyOfficialName: "",
		companyEin: "",
		companyDocuments: [],
		agentCommercialModel: "wallet_inventory",
		agentOpeningWalletCredit: "",
		password: "",
		roleDescriptions: ["reception"],
		accessTo: getDefaultAccessForRoles(["reception"]),
		activeUser: true,
	});

	const accountText = useMemo(
		() =>
			isRTL
				? {
						actions: "إجراءات",
						edit: "تعديل",
						activate: "تفعيل",
						deactivate: "تعطيل",
						save: "حفظ الحساب",
						saving: "جاري الحفظ...",
						editTitle: "تعديل حساب الموظف",
						password: "كلمة مرور جديدة",
						passwordHint: "اتركها فارغة إذا لا تريد تغيير كلمة المرور.",
						activeUser: "الحساب نشط",
						updated: "تم تحديث الحساب بنجاح.",
						previewDocument: "عرض المرفق",
						openDocument: "فتح في تبويب جديد",
						close: "إغلاق",
						previewUnavailable:
							"لا يمكن عرض هذا المرفق. احذفه ثم ارفعه مرة اخرى اذا كان ملفا قديما.",
						confirmDeactivate: "هل تريد تعطيل هذا الحساب؟",
						confirmActivate: "هل تريد تفعيل هذا الحساب؟",
				  }
				: {
						actions: "Actions",
						edit: "Edit",
						activate: "Activate",
						deactivate: "Deactivate",
						save: "Save Account",
						saving: "Saving...",
						editTitle: "Edit Staff Account",
						password: "New Password",
						passwordHint: "Leave blank if you do not want to change it.",
						activeUser: "Account is active",
						updated: "Account updated successfully.",
						previewDocument: "Preview attachment",
						openDocument: "Open in new tab",
						close: "Close",
						previewUnavailable:
							"This attachment has no saved preview file. Remove it and upload it again if it is an older record.",
						confirmDeactivate: "Deactivate this account?",
						confirmActivate: "Activate this account?",
				  },
		[isRTL]
	);
	const agentAccountText = useMemo(
		() =>
			isRTL
				? {
						commercialModel: "طريقة عمل الوكيل",
						openingWalletCredit: "رصيد افتتاحي للمحفظة",
						openingWalletHint:
							"اتركه صفر إذا لم يكن لدى الوكيل رصيد مسبق. يطبق على الفنادق المختارة.",
						commercialHint:
							"حدد هل الوكيل يشتري مخزوناً من المحفظة أو يعمل بعمولة فقط.",
				  }
				: {
						commercialModel: "Agent business model",
						openingWalletCredit: "Opening wallet credit",
						openingWalletHint:
							"Leave as zero when this agent has no starting wallet credit. Applies to the selected hotels.",
						commercialHint:
							"Choose whether this agent buys inventory by wallet, works by commission, or uses both.",
				  },
		[isRTL]
	);

	const hotelOptions = useMemo(
		() => (Array.isArray(hotels) ? hotels.filter((hotel) => hotel?._id) : []),
		[hotels]
	);

	const normalizeHotelId = useCallback((value) => {
		const raw = value && typeof value === "object" ? value._id : value;
		return raw ? String(raw) : "";
	}, []);

	const knownHotelIds = useMemo(
		() => new Set(hotelOptions.map((hotel) => normalizeHotelId(hotel._id))),
		[hotelOptions, normalizeHotelId]
	);

	const hotelNameById = useMemo(() => {
		const names = new Map();
		hotelOptions.forEach((hotel) => {
			const id = normalizeHotelId(hotel._id);
			if (id) names.set(id, hotel.hotelName || hotel.name || "Hotel");
		});
		return names;
	}, [hotelOptions, normalizeHotelId]);

	const accountHotelIds = useCallback(
		(account, fallbackHotelId) => {
			const rawIds = [
				account?.hotelId,
				account?.hotelIdWork,
				...(Array.isArray(account?.hotelIdsWork) ? account.hotelIdsWork : []),
				...(Array.isArray(account?.hotelsToSupport)
					? account.hotelsToSupport
					: []),
				fallbackHotelId,
			];
			const ids = rawIds
				.map(normalizeHotelId)
				.filter((id) => id && knownHotelIds.has(id));
			return [...new Set(ids)];
		},
		[knownHotelIds, normalizeHotelId]
	);

	const accountHotelNames = useCallback(
		(account, ids, fallbackName) => {
			const populatedNames = new Map();
			if (Array.isArray(account?.hotelsToSupport)) {
				account.hotelsToSupport.forEach((hotel) => {
					const id = normalizeHotelId(hotel);
					const name = hotel?.hotelName || hotel?.name;
					if (id && name) populatedNames.set(id, name);
				});
			}
			return ids.map(
				(id) => populatedNames.get(id) || hotelNameById.get(id) || fallbackName || "Hotel"
			);
		},
		[hotelNameById, normalizeHotelId]
	);

	const roleLabel = useCallback(
		(roleDescription, role) => {
			const option = getAccountRoleOption(roleDescription, role);
			return isRTL ? option.ar : option.en;
		},
		[isRTL]
	);

	const roleLabels = useCallback(
		(account) => {
			const descriptions = Array.isArray(account.roleDescriptions)
				? account.roleDescriptions
				: [];
			const roles = Array.isArray(account.roles) ? account.roles : [];
			const normalized = [
				...descriptions,
				account.roleDescription,
				...roles.map((role) => getAccountRoleOption("", role).value),
			]
				.map((item) => String(item || "").toLowerCase())
				.filter(Boolean);
			const unique = [...new Set(normalized)];
			return unique.length
				? unique.map((item) => roleLabel(item)).join(" + ")
				: roleLabel(account.roleDescription, account.role);
		},
		[roleLabel]
	);

	const accessLabel = useCallback(
		(value) => {
			const option = accountAccessOptions.find((item) => item.value === value);
			return option ? (isRTL ? option.ar : option.en) : value;
		},
		[isRTL]
	);

	const refreshAccounts = useCallback(() => {
		if (!open || !userId || !token || hotelOptions.length === 0) return;
		setLoading(true);
		Promise.all(
			hotelOptions.map((hotel) =>
				getHotelStaffUsers(userId, token, hotel._id).then((staff) => ({
					hotel,
					staff: Array.isArray(staff) ? staff : [],
				}))
			)
		)
			.then((results) => {
				const byAccount = new Map();
				results.forEach(({ hotel, staff }) => {
					staff.forEach((account) => {
						const key = account._id;
						if (!key) return;
						const hotelScopeIds = accountHotelIds(account, hotel._id);
						const hotelNames = accountHotelNames(
							account,
							hotelScopeIds,
							hotel.hotelName || "Hotel"
						);
						const existing = byAccount.get(key);
						if (existing) {
							existing.hotelScopeIds = [
								...new Set([...existing.hotelScopeIds, ...hotelScopeIds]),
							];
							existing.hotelNames = [
								...new Set([...existing.hotelNames, ...hotelNames]),
							];
							existing.hotelId = existing.hotelScopeIds[0] || existing.hotelId;
							existing.hotelName = existing.hotelNames.join(", ");
							return;
						}
						byAccount.set(key, {
							...account,
							hotelId: hotelScopeIds[0] || account.hotelIdWork || hotel._id,
							hotelScopeIds,
							hotelNames: [...new Set(hotelNames)],
							hotelName: hotelNames.join(", "),
						});
					});
				});
				setAccounts([...byAccount.values()]);
			})
			.finally(() => setLoading(false));
	}, [accountHotelIds, accountHotelNames, hotelOptions, open, token, userId]);

	useEffect(() => {
		if (!open) return;
		setActiveAccountTab("new");
		setForm((prev) => ({
			...prev,
			hotelIds:
				Array.isArray(prev.hotelIds) && prev.hotelIds.length
					? prev.hotelIds
					: hotelOptions[0]?._id
					? [hotelOptions[0]._id]
					: [],
		}));
		refreshAccounts();
	}, [hotelOptions, open, refreshAccounts]);

	useEffect(() => {
		if (!open) setDocumentPreview(null);
	}, [open]);

	const updateForm = (field, value) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleDocumentUpload = async (event, target = "new") => {
		const files = Array.from(event.target.files || []);
		event.target.value = "";
		if (!files.length) return;
		const oversized = files.find((file) => file.size > ACCOUNT_DOCUMENT_MAX_BYTES);
		if (oversized) {
			message.error(
				isRTL
					? `${oversized.name} أكبر من 3 ميجابايت.`
					: `${oversized.name} is larger than 3 MB.`
			);
			return;
		}
		try {
			const documents = await Promise.all(files.map(fileToCompanyDocument));
			const setter = target === "edit" ? setEditForm : setForm;
			setter((prev) => ({
				...prev,
				companyDocuments: [
					...normalizeCompanyDocuments(prev.companyDocuments),
					...documents,
				].slice(0, 8),
			}));
		} catch (error) {
			message.error(
				isRTL
					? "تعذر قراءة أحد الملفات المحددة."
					: "Could not read one of the selected files."
			);
		}
	};

	const removeCompanyDocument = (index, target = "new") => {
		const setter = target === "edit" ? setEditForm : setForm;
		setter((prev) => ({
			...prev,
			companyDocuments: normalizeCompanyDocuments(prev.companyDocuments).filter(
				(_, itemIndex) => itemIndex !== index
			),
		}));
	};

	const openCompanyDocumentPreview = (document) => {
		const normalizedDocument =
			normalizeCompanyDocuments([document])[0] || document || {};
		setDocumentPreview({
			...normalizedDocument,
			dataUrl: getCompanyDocumentSource(normalizedDocument),
			fileName: normalizedDocument.fileName || "Company document",
		});
	};

	const renderCompanyDocuments = (documents, target = "new") => (
		<DocumentList>
			{normalizeCompanyDocuments(documents).map((document, index) => (
				<DocumentChip key={`${document.fileName}-${index}`}>
					<DocumentPreviewButton
						type='button'
						onClick={() => openCompanyDocumentPreview(document)}
						title={accountText.previewDocument}
						aria-label={`${accountText.previewDocument}: ${document.fileName}`}
					>
						<EyeOutlined />
						<span>{document.fileName}</span>
					</DocumentPreviewButton>
					<DocumentRemoveButton
						type='button'
						onClick={() => removeCompanyDocument(index, target)}
						aria-label={WORDS.removeDocument}
						title={WORDS.removeDocument}
					>
						<DeleteOutlined />
					</DocumentRemoveButton>
				</DocumentChip>
			))}
		</DocumentList>
	);

	const toggleRole = (value) => {
		setForm((prev) => ({
			...prev,
			roleDescriptions: (() => {
				const current = Array.isArray(prev.roleDescriptions)
					? prev.roleDescriptions
					: [];
				const next = current.includes(value)
					? current.filter((item) => item !== value)
					: [...current, value];
				return next.length ? next : ["reception"];
			})(),
			accessTo: getDefaultAccessForRoles(
				(() => {
					const current = Array.isArray(prev.roleDescriptions)
						? prev.roleDescriptions
						: [];
					const next = current.includes(value)
						? current.filter((item) => item !== value)
						: [...current, value];
					return next.length ? next : ["reception"];
				})()
			),
		}));
	};

	const toggleHotel = (hotelId) => {
		setForm((prev) => {
			const current = Array.isArray(prev.hotelIds) ? prev.hotelIds : [];
			const next = current.includes(hotelId)
				? current.filter((item) => item !== hotelId)
				: [...current, hotelId];
			return {
				...prev,
				hotelIds: next.length ? next : current,
			};
		});
	};

	const toggleAccess = (value) => {
		setForm((prev) => {
			const current = Array.isArray(prev.accessTo) ? prev.accessTo : [];
			return {
				...prev,
				accessTo: current.includes(value)
					? current.filter((item) => item !== value)
					: [...current, value],
			};
		});
	};

	const resetForm = () => {
		setForm({
			hotelIds: hotelOptions[0]?._id ? [hotelOptions[0]._id] : [],
			name: "",
			email: "",
			phone: "",
			companyName: "",
			companyOfficialName: "",
			companyEin: "",
			companyDocuments: [],
			agentCommercialModel: "wallet_inventory",
			agentOpeningWalletCredit: "",
			password: "",
			password2: "",
			roleDescriptions: ["reception"],
			accessTo: getDefaultAccessForRoles(["reception"]),
		});
	};

	const createAccount = (event) => {
		event.preventDefault();
		const selectedHotelIds = Array.isArray(form.hotelIds) ? form.hotelIds : [];
		const selectedRoleDescriptions = Array.isArray(form.roleDescriptions)
			? form.roleDescriptions
			: [];
		if (
			!selectedHotelIds.length ||
			!selectedRoleDescriptions.length ||
			!form.name ||
			!form.email ||
			!form.phone ||
			!form.password
		) {
			message.error("Please complete the required account fields.");
			return;
		}
		if (form.password !== form.password2) {
			message.error("Passwords do not match.");
			return;
		}

		const selectedRoles = selectedRoleDescriptions.map((item) =>
			getAccountRoleOption(item)
		);
		const primaryRole =
			selectedRoles.find((item) => item.value === "hotelmanager") ||
			selectedRoles[0];
		const isAgentAccount = selectedRoleDescriptions.includes("ordertaker");
		const commercialModel = normalizeAgentCommercialModel(
			form.agentCommercialModel
		);
		const openingWalletCredit = isAgentAccount
			? commercialModel === "commission_only"
				? 0
				: parseAccountMoney(form.agentOpeningWalletCredit)
			: 0;
		setCreating(true);
		signupHotelStaff(userId, token, {
			name: form.name,
			email: form.email,
			phone: form.phone,
			companyName: form.companyName,
			companyOfficialName: form.companyOfficialName,
			companyEin: form.companyEin,
			companyDocuments: normalizeCompanyDocuments(form.companyDocuments),
			agentCommercialModel: isAgentAccount ? commercialModel : "wallet_inventory",
			agentOpeningWalletCredit: openingWalletCredit,
			agentWalletOpeningBalances: buildAgentOpeningBalances(
				selectedHotelIds,
				openingWalletCredit
			),
			password: form.password,
			password2: form.password2,
			role: primaryRole.role,
			roleDescription: primaryRole.value,
			roles: selectedRoles.map((item) => item.role),
			roleDescriptions: selectedRoles.map((item) => item.value),
			hotelIdWork: selectedHotelIds[0],
			hotelIdsWork: selectedHotelIds,
			hotelsToSupport: selectedHotelIds,
			accessTo: form.accessTo,
		})
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					return;
				}
				message.success("Account created successfully.");
				resetForm();
				refreshAccounts();
			})
			.finally(() => setCreating(false));
	};

	const updateEditForm = (field, value) => {
		setEditForm((prev) => ({ ...prev, [field]: value }));
	};

	const openEditAccount = (account) => {
		const descriptions = Array.isArray(account.roleDescriptions)
			? account.roleDescriptions
			: [account.roleDescription || getAccountRoleOption("", account.role).value];
		const normalizedRoles = [...new Set(descriptions.filter(Boolean))];
		const selectedHotelIds = accountHotelIds(
			account,
			account.hotelId || account.hotelIdWork
		);

		setEditingAccount(account);
		setEditForm({
			hotelIds: selectedHotelIds.length
				? selectedHotelIds
				: hotelOptions[0]?._id
				? [hotelOptions[0]._id]
				: [],
			name: account.name || "",
			email: account.email || "",
			phone: account.phone || "",
			companyName: account.companyName || "",
			companyOfficialName: account.companyOfficialName || "",
			companyEin: account.companyEin || "",
			companyDocuments: normalizeCompanyDocuments(account.companyDocuments),
			agentCommercialModel: normalizeAgentCommercialModel(
				account.agentCommercialModel
			),
			agentOpeningWalletCredit: getAgentOpeningCreditForHotels(
				account,
				selectedHotelIds
			),
			password: "",
			roleDescriptions: normalizedRoles.length ? normalizedRoles : ["reception"],
			accessTo: Array.isArray(account.accessTo)
				? account.accessTo
				: getDefaultAccessForRoles(normalizedRoles),
			activeUser: account.activeUser !== false,
		});
	};

	const toggleEditHotel = (hotelId) => {
		setEditForm((prev) => {
			const current = Array.isArray(prev.hotelIds) ? prev.hotelIds : [];
			const next = current.includes(hotelId)
				? current.filter((item) => item !== hotelId)
				: [...current, hotelId];
			return {
				...prev,
				hotelIds: next.length ? next : current,
			};
		});
	};

	const toggleEditRole = (value) => {
		setEditForm((prev) => {
			const current = Array.isArray(prev.roleDescriptions)
				? prev.roleDescriptions
				: [];
			const next = current.includes(value)
				? current.filter((item) => item !== value)
				: [...current, value];
			const roleDescriptions = next.length ? next : ["reception"];
			return {
				...prev,
				roleDescriptions,
				accessTo: getDefaultAccessForRoles(roleDescriptions),
			};
		});
	};

	const toggleEditAccess = (value) => {
		setEditForm((prev) => {
			const current = Array.isArray(prev.accessTo) ? prev.accessTo : [];
			return {
				...prev,
				accessTo: current.includes(value)
					? current.filter((item) => item !== value)
					: [...current, value],
			};
		});
	};

	const saveEditedAccount = () => {
		if (!editingAccount) return;
		if (!editForm.name || !editForm.email || !editForm.phone) {
			message.error("Please complete the required account fields.");
			return;
		}
		const selectedHotelIds = Array.isArray(editForm.hotelIds)
			? editForm.hotelIds
			: [];
		if (!selectedHotelIds.length) {
			message.error("Please select at least one hotel for this account.");
			return;
		}

		const selectedRoles = (Array.isArray(editForm.roleDescriptions)
			? editForm.roleDescriptions
			: ["reception"]
		).map((item) => getAccountRoleOption(item));
		const primaryRole =
			selectedRoles.find((item) => item.value === "hotelmanager") ||
			selectedRoles[0];
		const isAgentAccount = selectedRoles.some(
			(item) => item.value === "ordertaker"
		);
		const commercialModel = normalizeAgentCommercialModel(
			editForm.agentCommercialModel
		);
		const openingWalletCredit = isAgentAccount
			? commercialModel === "commission_only"
				? 0
				: parseAccountMoney(editForm.agentOpeningWalletCredit)
			: 0;
		const payload = {
			name: editForm.name,
			email: editForm.email,
			phone: editForm.phone,
			companyName: editForm.companyName,
			companyOfficialName: editForm.companyOfficialName,
			companyEin: editForm.companyEin,
			companyDocuments: normalizeCompanyDocuments(editForm.companyDocuments),
			agentCommercialModel: isAgentAccount ? commercialModel : "wallet_inventory",
			agentOpeningWalletCredit: openingWalletCredit,
			agentWalletOpeningBalances: buildAgentOpeningBalances(
				selectedHotelIds,
				openingWalletCredit
			),
			role: primaryRole.role,
			roleDescription: primaryRole.value,
			roles: selectedRoles.map((item) => item.role),
			roleDescriptions: selectedRoles.map((item) => item.value),
			hotelIdWork: selectedHotelIds[0],
			hotelIdsWork: selectedHotelIds,
			hotelsToSupport: selectedHotelIds,
			accessTo: editForm.accessTo,
			activeUser: editForm.activeUser,
		};

		if (editForm.password) {
			payload.password = editForm.password;
		}

		const targetHotelId =
			editingAccount.hotelId ||
			editingAccount.hotelIdWork ||
			(Array.isArray(editingAccount.hotelScopeIds) &&
				editingAccount.hotelScopeIds[0]) ||
			(Array.isArray(editingAccount.hotelsToSupport) &&
				(editingAccount.hotelsToSupport[0]?._id ||
					editingAccount.hotelsToSupport[0])) ||
			selectedHotelIds[0];

		if (!targetHotelId) {
			message.error("Hotel scope was not found for this account.");
			return;
		}

		setSavingAccount(true);
		updateHotelStaffUser(userId, token, targetHotelId, editingAccount._id, payload)
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					return;
				}
				message.success(accountText.updated);
				setEditingAccount(null);
				refreshAccounts();
			})
			.finally(() => setSavingAccount(false));
	};

	const toggleAccountActive = (account) => {
		const nextActive = account.activeUser === false;
		const confirmed = window.confirm(
			nextActive ? accountText.confirmActivate : accountText.confirmDeactivate
		);
		if (!confirmed) return;

		const targetHotelId =
			account.hotelId ||
			account.hotelIdWork ||
			(Array.isArray(account.hotelsToSupport) &&
				(account.hotelsToSupport[0]?._id || account.hotelsToSupport[0]));
		if (!targetHotelId) {
			message.error("Hotel scope was not found for this account.");
			return;
		}

		updateHotelStaffUser(userId, token, targetHotelId, account._id, {
			activeUser: nextActive,
		}).then((data) => {
			if (data?.error) {
				message.error(data.error);
				return;
			}
			message.success(accountText.updated);
			refreshAccounts();
		});
	};

	const getPreviewHotelId = (account = {}) => {
		const possibleIds = [
			account.hotelId,
			account.hotelIdWork,
			...(Array.isArray(account.hotelScopeIds) ? account.hotelScopeIds : []),
			...(Array.isArray(account.hotelsToSupport) ? account.hotelsToSupport : []),
		];
		return possibleIds.map(normalizeHotelId).find(Boolean) || "";
	};

	const buildPreviewSelectedHotel = (account = {}, hotelId, preview = {}) => {
		const hotel =
			hotelOptions.find((item) => normalizeHotelId(item._id) === hotelId) || {};
		const ownerId =
			preview.ownerId ||
			normalizeHotelId(hotel.belongsTo?._id || hotel.belongsTo) ||
			normalizeHotelId(account.belongsToId);
		return {
			...hotel,
			_id: hotelId,
			hotelName:
				hotel.hotelName ||
				(Array.isArray(account.hotelNames) ? account.hotelNames[0] : "") ||
				account.hotelName ||
				preview.hotelName ||
				"Hotel",
			belongsTo: ownerId
				? {
						...(hotel.belongsTo && typeof hotel.belongsTo === "object"
							? hotel.belongsTo
							: {}),
						_id: ownerId,
				  }
				: hotel.belongsTo,
		};
	};

	const startAccountPreview = (account) => {
		const hotelId = getPreviewHotelId(account);
		if (!hotelId) {
			message.error("Hotel scope was not found for this account.");
			return;
		}
		setPreviewingAccountId(account._id);
		previewHotelStaffDashboard(userId, token, hotelId, account._id)
			.then((data) => {
				if (data?.error || !data?.token || !data?.user) {
					message.error(data?.error || "Unable to start account preview.");
					return;
				}
				const selectedHotel = buildPreviewSelectedHotel(
					account,
					hotelId,
					data.preview
				);
				startDashboardPreview({
					auth: { token: data.token, user: data.user },
					preview: data.preview,
					selectedHotel,
				});
				const roleKey = getPrimaryScopedRole(data.user);
				const ownerId =
					normalizeHotelId(data.preview?.ownerId) ||
					normalizeHotelId(data.user?.belongsToId);
				message.success(
					isRTL ? "تم فتح معاينة الحساب." : "Account preview opened."
				);
				onClose?.();
				history.push(getScopedRouteForRole(roleKey, ownerId, hotelId));
			})
			.finally(() => setPreviewingAccountId(""));
	};

	const columns = [
		{
			title: WORDS.accountName,
			dataIndex: "name",
			key: "name",
			width: 210,
			render: (name, row) => (
				<AccountNameCell>
					<AccountPreviewButton
						type='button'
						onClick={() => startAccountPreview(row)}
						disabled={previewingAccountId === row._id}
						title={isRTL ? "معاينة لوحة هذا الحساب" : "Preview this account dashboard"}
					>
						<EyeOutlined />
						<strong>{name}</strong>
					</AccountPreviewButton>
					<span dir='ltr'>{row.email}</span>
				</AccountNameCell>
			),
		},
		{
			title: WORDS.accountHotel,
			dataIndex: "hotelNames",
			key: "hotelName",
			width: 165,
			render: (hotelNames, row) => (
				<AccessTags>
					{(Array.isArray(hotelNames) && hotelNames.length
						? hotelNames
						: [row.hotelName || "Hotel"]
					).map((hotelName) => (
						<Tag color='cyan' key={`${row._id}-${hotelName}`}>
							{hotelName}
						</Tag>
					))}
				</AccessTags>
			),
		},
		{
			title: WORDS.accountRoles || WORDS.accountRole,
			key: "role",
			width: 150,
			render: (_, row) => roleLabels(row),
		},
		{
			title: WORDS.accountCompany,
			dataIndex: "companyName",
			key: "companyName",
			width: 125,
			render: (companyName) => companyName || "-",
		},
		{
			title: WORDS.accountAccess,
			key: "accessTo",
			width: 210,
			render: (_, row) => {
				const access = Array.isArray(row.accessTo) ? row.accessTo : [];
				const descriptions = Array.isArray(row.roleDescriptions)
					? row.roleDescriptions
					: [row.roleDescription];
				if (descriptions.includes("hotelmanager")) {
					return <Tag color='blue'>{WORDS.fullHotelAccess}</Tag>;
				}
				if (!access.length) return <Tag>{WORDS.noAccess}</Tag>;
				return (
					<AccessTags>
						{access.map((item) => (
							<Tag color='geekblue' key={`${row._id}-${item}`}>
								{accessLabel(item)}
							</Tag>
						))}
					</AccessTags>
				);
			},
		},
		{
			title: WORDS.accountStatus,
			key: "status",
			width: 95,
			render: (_, row) => (
				<Tag color={row.activeUser === false ? "red" : "green"}>
					{row.activeUser === false ? WORDS.inactive : WORDS.active}
				</Tag>
			),
		},
		{
			title: WORDS.accountCreated,
			dataIndex: "createdAt",
			key: "createdAt",
			width: 105,
			render: formatShortDate,
		},
		{
			title: accountText.actions,
			key: "actions",
			width: 145,
			render: (_, row) => (
				<AccountActions>
					<Button size='small' onClick={() => openEditAccount(row)}>
						{accountText.edit}
					</Button>
					<Button
						size='small'
						danger={row.activeUser !== false}
						type={row.activeUser === false ? "primary" : "default"}
						onClick={() => toggleAccountActive(row)}
					>
						{row.activeUser === false
							? accountText.activate
							: accountText.deactivate}
					</Button>
				</AccountActions>
			),
		},
	];

	const documentPreviewSource = documentPreview
		? getCompanyDocumentSource(documentPreview)
		: "";
	const documentPreviewIsPdf = documentPreview
		? isCompanyDocumentPdf(documentPreview)
		: false;
	const documentPreviewIsImage = documentPreview
		? isCompanyDocumentImage(documentPreview)
		: false;

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			width='min(97vw, 1540px)'
			style={{ top: 58 }}
			bodyStyle={{ padding: "14px 18px 16px" }}
			destroyOnClose={false}
			className='manager-accounts-modal'
		>
			<AccountsModalShell $isRTL={isRTL}>
				<AccountsHero>
					<Button onClick={refreshAccounts} loading={loading}>
						{WORDS.refresh}
					</Button>
				</AccountsHero>

				<Tabs
					className='manager-account-tabs'
					activeKey={activeAccountTab}
					onChange={setActiveAccountTab}
					tabBarGutter={8}
					items={[
						{
							key: "new",
							label: (
								<span className='account-tab-label'>
									<PlusOutlined />
									<span>{WORDS.addAccount}</span>
								</span>
							),
							children: (
								<AccountForm onSubmit={createAccount}>
									<SelectionBlock>
										<SelectionHeader>
											<span>{WORDS.chooseHotels || WORDS.chooseHotel}</span>
											<Requirement $required>{WORDS.required}</Requirement>
										</SelectionHeader>
										<SelectionGrid>
											{hotelOptions.map((hotel) => (
												<SelectionPill
													type='button'
													key={hotel._id}
													$active={form.hotelIds.includes(hotel._id)}
													onClick={() => toggleHotel(hotel._id)}
												>
													<input
														type='checkbox'
														readOnly
														checked={form.hotelIds.includes(hotel._id)}
													/>
													<strong>{hotel.hotelName || "Hotel"}</strong>
												</SelectionPill>
											))}
										</SelectionGrid>
									</SelectionBlock>
									<SelectionBlock>
										<SelectionHeader>
											<span>{WORDS.accountRoles || WORDS.accountRole}</span>
											<Requirement $required>{WORDS.required}</Requirement>
										</SelectionHeader>
										<SelectionGrid>
											{accountRoleOptions.map((option) => (
												<SelectionPill
													type='button'
													key={option.value}
													$active={form.roleDescriptions.includes(option.value)}
													onClick={() => toggleRole(option.value)}
												>
													<input
														type='checkbox'
														readOnly
														checked={form.roleDescriptions.includes(option.value)}
													/>
													<strong>{isRTL ? option.ar : option.en}</strong>
												</SelectionPill>
											))}
										</SelectionGrid>
									</SelectionBlock>
									{isAgentRoleSelected(form.roleDescriptions) && (
										<AgentCommercialBlock>
											<SelectionHeader>
												<span>{agentAccountText.commercialModel}</span>
												<Requirement>{WORDS.optional}</Requirement>
											</SelectionHeader>
											<FieldHint>{agentAccountText.commercialHint}</FieldHint>
											<AgentCommercialOptions>
												{agentCommercialModelOptions.map((option) => (
													<AgentCommercialOption
														type='button'
														key={option.value}
														$active={form.agentCommercialModel === option.value}
														onClick={() =>
															updateForm("agentCommercialModel", option.value)
														}
													>
														<strong>{isRTL ? option.ar : option.en}</strong>
														<span>
															{isRTL ? option.arHint : option.enHint}
														</span>
													</AgentCommercialOption>
												))}
											</AgentCommercialOptions>
											<label>
												<FieldLabel>
													<span>{agentAccountText.openingWalletCredit}</span>
													<Requirement>{WORDS.optional}</Requirement>
												</FieldLabel>
												<input
													type='number'
													min='0'
													step='0.01'
													dir='ltr'
													value={form.agentOpeningWalletCredit}
													disabled={
														form.agentCommercialModel === "commission_only"
													}
													onChange={(event) =>
														updateForm(
															"agentOpeningWalletCredit",
															event.target.value
														)
													}
												/>
												<FieldHint>{agentAccountText.openingWalletHint}</FieldHint>
											</label>
										</AgentCommercialBlock>
									)}
									<label>
										<FieldLabel>
											<span>{WORDS.accountName}</span>
											<Requirement $required>{WORDS.required}</Requirement>
										</FieldLabel>
										<input
											value={form.name}
											onChange={(event) => updateForm("name", event.target.value)}
										/>
										<FieldHint>{WORDS.nameHint}</FieldHint>
									</label>
									<label>
										<FieldLabel>
											<span>{WORDS.accountEmail}</span>
											<Requirement $required>{WORDS.required}</Requirement>
										</FieldLabel>
										<input
											type='email'
											dir='ltr'
											value={form.email}
											onChange={(event) => updateForm("email", event.target.value)}
										/>
										<FieldHint>{WORDS.emailHint}</FieldHint>
									</label>
									<label>
										<FieldLabel>
											<span>{WORDS.accountPhone}</span>
											<Requirement $required>{WORDS.required}</Requirement>
										</FieldLabel>
										<input
											dir='ltr'
											value={form.phone}
											onChange={(event) => updateForm("phone", event.target.value)}
										/>
										<FieldHint>{WORDS.phoneHint}</FieldHint>
									</label>
									<label>
										<FieldLabel>
											<span>{WORDS.accountCompany}</span>
											<Requirement>{WORDS.optional}</Requirement>
										</FieldLabel>
										<input
											value={form.companyName}
											onChange={(event) =>
												updateForm("companyName", event.target.value)
											}
										/>
										<FieldHint>{WORDS.companyHint}</FieldHint>
									</label>
									<label>
										<FieldLabel>
											<span>{WORDS.accountOfficialName}</span>
											<Requirement>{WORDS.optional}</Requirement>
										</FieldLabel>
										<input
											value={form.companyOfficialName}
											onChange={(event) =>
												updateForm("companyOfficialName", event.target.value)
											}
										/>
										<FieldHint>{WORDS.officialNameHint}</FieldHint>
									</label>
									<label>
										<FieldLabel>
											<span>{WORDS.accountEin}</span>
											<Requirement>{WORDS.optional}</Requirement>
										</FieldLabel>
										<input
											dir='ltr'
											value={form.companyEin}
											onChange={(event) =>
												updateForm("companyEin", event.target.value)
											}
										/>
										<FieldHint>{WORDS.einHint}</FieldHint>
									</label>
									<DocumentUploadBlock>
										<SelectionHeader>
											<span>{WORDS.accountDocuments}</span>
											<Requirement>{WORDS.optional}</Requirement>
										</SelectionHeader>
										<FieldHint>{WORDS.documentsHint}</FieldHint>
										<UploadButton type='button'>
											<UploadOutlined />
											<span>{WORDS.uploadDocuments}</span>
											<input
												type='file'
												accept='image/*,.pdf,application/pdf'
												multiple
												onChange={(event) => handleDocumentUpload(event)}
											/>
										</UploadButton>
										<FieldHint>{WORDS.documentLimitHint}</FieldHint>
										{renderCompanyDocuments(form.companyDocuments)}
									</DocumentUploadBlock>
									<label>
										<FieldLabel>
											<span>{WORDS.password}</span>
											<Requirement $required>{WORDS.required}</Requirement>
										</FieldLabel>
										<input
											type='password'
											value={form.password}
											onChange={(event) =>
												updateForm("password", event.target.value)
											}
										/>
										<FieldHint>{WORDS.passwordHint}</FieldHint>
									</label>
									<label>
										<FieldLabel>
											<span>{WORDS.confirmPassword}</span>
											<Requirement $required>{WORDS.required}</Requirement>
										</FieldLabel>
										<input
											type='password'
											value={form.password2}
											onChange={(event) =>
												updateForm("password2", event.target.value)
											}
										/>
										<FieldHint>{WORDS.confirmPasswordHint}</FieldHint>
									</label>
									<AccessPicker>
										<SelectionHeader>
											<span>{WORDS.accountAccess}</span>
											<Requirement>{WORDS.optional}</Requirement>
										</SelectionHeader>
										<FieldHint>{WORDS.accessHint}</FieldHint>
										<div>
											{accountAccessOptions.map((option) => (
												<label key={option.value}>
													<input
														type='checkbox'
														checked={form.accessTo.includes(option.value)}
														onChange={() => toggleAccess(option.value)}
													/>
													{isRTL ? option.ar : option.en}
												</label>
											))}
										</div>
									</AccessPicker>
									<CreateAccountButton
										type='submit'
										disabled={creating}
										$isRTL={isRTL}
									>
										{creating ? WORDS.creating : WORDS.createAccount}
									</CreateAccountButton>
								</AccountForm>
							),
						},
						{
							key: "accounts",
							label: (
								<span className='account-tab-label'>
									<DatabaseOutlined />
									<span>{WORDS.availableAccounts}</span>
								</span>
							),
							children: (
								<AccountsTableWrap $isRTL={isRTL}>
									<p>{WORDS.allAccountsNote}</p>
									<Table
										rowKey={(row) => row._id}
										columns={columns}
										dataSource={accounts}
										loading={loading}
										pagination={{ pageSize: 8, size: "small" }}
										scroll={{ x: 1205 }}
										size='small'
										tableLayout='fixed'
									/>
								</AccountsTableWrap>
							),
						},
					]}
				/>
				<Modal
					open={!!editingAccount}
					title={accountText.editTitle}
					onCancel={() => setEditingAccount(null)}
					onOk={saveEditedAccount}
					okText={savingAccount ? accountText.saving : accountText.save}
					confirmLoading={savingAccount}
					destroyOnClose
					width='min(94vw, 780px)'
				>
					<StaffEditForm $isRTL={isRTL}>
						<SelectionBlock>
							<SelectionHeader>
								<span>{WORDS.chooseHotels || WORDS.chooseHotel}</span>
								<Requirement $required>{WORDS.required}</Requirement>
							</SelectionHeader>
							<SelectionGrid>
								{hotelOptions.map((hotel) => {
									const hotelId = normalizeHotelId(hotel._id);
									return (
										<SelectionPill
											type='button'
											key={hotelId}
											$active={editForm.hotelIds.includes(hotelId)}
											onClick={() => toggleEditHotel(hotelId)}
										>
											<input
												type='checkbox'
												readOnly
												checked={editForm.hotelIds.includes(hotelId)}
											/>
											<strong>{hotel.hotelName || "Hotel"}</strong>
										</SelectionPill>
									);
								})}
							</SelectionGrid>
						</SelectionBlock>
						<label>
							<FieldLabel>
								<span>{WORDS.accountName}</span>
								<Requirement $required>{WORDS.required}</Requirement>
							</FieldLabel>
							<input
								value={editForm.name}
								onChange={(event) => updateEditForm("name", event.target.value)}
							/>
						</label>
						<label>
							<FieldLabel>
								<span>{WORDS.accountEmail}</span>
								<Requirement $required>{WORDS.required}</Requirement>
							</FieldLabel>
							<input
								type='email'
								dir='ltr'
								value={editForm.email}
								onChange={(event) => updateEditForm("email", event.target.value)}
							/>
						</label>
						<label>
							<FieldLabel>
								<span>{WORDS.accountPhone}</span>
								<Requirement $required>{WORDS.required}</Requirement>
							</FieldLabel>
							<input
								dir='ltr'
								value={editForm.phone}
								onChange={(event) => updateEditForm("phone", event.target.value)}
							/>
						</label>
						<label>
							<FieldLabel>
								<span>{WORDS.accountCompany}</span>
								<Requirement>{WORDS.optional}</Requirement>
							</FieldLabel>
							<input
								value={editForm.companyName}
								onChange={(event) =>
									updateEditForm("companyName", event.target.value)
								}
							/>
						</label>
						<label>
							<FieldLabel>
								<span>{WORDS.accountOfficialName}</span>
								<Requirement>{WORDS.optional}</Requirement>
							</FieldLabel>
							<input
								value={editForm.companyOfficialName}
								onChange={(event) =>
									updateEditForm("companyOfficialName", event.target.value)
								}
							/>
						</label>
						<label>
							<FieldLabel>
								<span>{WORDS.accountEin}</span>
								<Requirement>{WORDS.optional}</Requirement>
							</FieldLabel>
							<input
								dir='ltr'
								value={editForm.companyEin}
								onChange={(event) =>
									updateEditForm("companyEin", event.target.value)
								}
							/>
						</label>
						<DocumentUploadBlock>
							<SelectionHeader>
								<span>{WORDS.accountDocuments}</span>
								<Requirement>{WORDS.optional}</Requirement>
							</SelectionHeader>
							<UploadButton type='button'>
								<UploadOutlined />
								<span>{WORDS.uploadDocuments}</span>
								<input
									type='file'
									accept='image/*,.pdf,application/pdf'
									multiple
									onChange={(event) => handleDocumentUpload(event, "edit")}
								/>
							</UploadButton>
							<FieldHint>{WORDS.documentLimitHint}</FieldHint>
							{renderCompanyDocuments(editForm.companyDocuments, "edit")}
						</DocumentUploadBlock>
						<label>
							<FieldLabel>
								<span>{accountText.password}</span>
								<Requirement>{WORDS.optional}</Requirement>
							</FieldLabel>
							<input
								type='password'
								value={editForm.password}
								onChange={(event) =>
									updateEditForm("password", event.target.value)
								}
							/>
							<FieldHint>{accountText.passwordHint}</FieldHint>
						</label>
						<ActiveAccountToggle>
							<input
								type='checkbox'
								checked={editForm.activeUser}
								onChange={(event) =>
									updateEditForm("activeUser", event.target.checked)
								}
							/>
							<span>{accountText.activeUser}</span>
						</ActiveAccountToggle>
						<SelectionBlock>
							<SelectionHeader>
								<span>{WORDS.accountRoles || WORDS.accountRole}</span>
								<Requirement $required>{WORDS.required}</Requirement>
							</SelectionHeader>
							<SelectionGrid>
								{accountRoleOptions.map((option) => (
									<SelectionPill
										type='button'
										key={option.value}
										$active={editForm.roleDescriptions.includes(option.value)}
										onClick={() => toggleEditRole(option.value)}
									>
										<input
											type='checkbox'
											readOnly
											checked={editForm.roleDescriptions.includes(option.value)}
										/>
										<strong>{isRTL ? option.ar : option.en}</strong>
									</SelectionPill>
								))}
							</SelectionGrid>
						</SelectionBlock>
						{isAgentRoleSelected(editForm.roleDescriptions) && (
							<AgentCommercialBlock>
								<SelectionHeader>
									<span>{agentAccountText.commercialModel}</span>
									<Requirement>{WORDS.optional}</Requirement>
								</SelectionHeader>
								<FieldHint>{agentAccountText.commercialHint}</FieldHint>
								<AgentCommercialOptions>
									{agentCommercialModelOptions.map((option) => (
										<AgentCommercialOption
											type='button'
											key={option.value}
											$active={editForm.agentCommercialModel === option.value}
											onClick={() =>
												updateEditForm("agentCommercialModel", option.value)
											}
										>
											<strong>{isRTL ? option.ar : option.en}</strong>
											<span>{isRTL ? option.arHint : option.enHint}</span>
										</AgentCommercialOption>
									))}
								</AgentCommercialOptions>
								<label>
									<FieldLabel>
										<span>{agentAccountText.openingWalletCredit}</span>
										<Requirement>{WORDS.optional}</Requirement>
									</FieldLabel>
									<input
										type='number'
										min='0'
										step='0.01'
										dir='ltr'
										value={editForm.agentOpeningWalletCredit}
										disabled={editForm.agentCommercialModel === "commission_only"}
										onChange={(event) =>
											updateEditForm(
												"agentOpeningWalletCredit",
												event.target.value
											)
										}
									/>
									<FieldHint>{agentAccountText.openingWalletHint}</FieldHint>
								</label>
							</AgentCommercialBlock>
						)}
						<AccessPicker>
							<SelectionHeader>
								<span>{WORDS.accountAccess}</span>
								<Requirement>{WORDS.optional}</Requirement>
							</SelectionHeader>
							<div>
								{accountAccessOptions.map((option) => (
									<label key={option.value}>
										<input
											type='checkbox'
											checked={editForm.accessTo.includes(option.value)}
											onChange={() => toggleEditAccess(option.value)}
										/>
										{isRTL ? option.ar : option.en}
									</label>
								))}
							</div>
						</AccessPicker>
					</StaffEditForm>
				</Modal>
				<Modal
					open={!!documentPreview}
					title={documentPreview?.fileName || accountText.previewDocument}
					onCancel={() => setDocumentPreview(null)}
					width='min(94vw, 920px)'
					zIndex={2600}
					destroyOnClose
					footer={
						documentPreviewSource
							? [
									<Button
										key='close'
										onClick={() => setDocumentPreview(null)}
									>
										{accountText.close}
									</Button>,
									<Button
										key='open'
										type='primary'
										onClick={() =>
											window.open(
												documentPreviewSource,
												"_blank",
												"noopener,noreferrer"
											)
										}
									>
										{accountText.openDocument}
									</Button>,
							  ]
							: [
									<Button
										key='close'
										type='primary'
										onClick={() => setDocumentPreview(null)}
									>
										{accountText.close}
									</Button>,
							  ]
					}
				>
					<DocumentPreviewBody>
						{documentPreviewSource && documentPreviewIsImage ? (
							<DocumentPreviewImage
								src={documentPreviewSource}
								alt={documentPreview?.fileName || accountText.previewDocument}
							/>
						) : documentPreviewSource && documentPreviewIsPdf ? (
							<DocumentPreviewFrame
								src={documentPreviewSource}
								title={documentPreview?.fileName || accountText.previewDocument}
							/>
						) : documentPreviewSource ? (
							<DocumentPreviewUnavailable>
								<p>{accountText.previewUnavailable}</p>
								<Button
									type='primary'
									onClick={() =>
										window.open(
											documentPreviewSource,
											"_blank",
											"noopener,noreferrer"
										)
									}
								>
									{accountText.openDocument}
								</Button>
							</DocumentPreviewUnavailable>
						) : (
							<DocumentPreviewUnavailable>
								<p>{accountText.previewUnavailable}</p>
							</DocumentPreviewUnavailable>
						)}
					</DocumentPreviewBody>
				</Modal>
			</AccountsModalShell>
		</Modal>
	);
};

/* ═══════════  Single hotel card  ═══════════ */

const HotelCard = memo(
	({
		hotel,
		WORDS,
		isRTL,
		adminId,
		token,
		onEdit,
		onTitleClick,
		onStepClick,
		updateDashboardQuery,
		clearDashboardModalQuery,
	}) => {
		const location = useLocation();
		const isActive = !!hotel.activateHotel;
		const [hotelStats, setHotelStats] = useState(null);
		const [openListVisible, setOpenListVisible] = useState(false);
		const [openList, setOpenList] = useState([]);
		const [openListTotal, setOpenListTotal] = useState(0);
		const [openListPage, setOpenListPage] = useState(1);
		const [openListLoading, setOpenListLoading] = useState(false);
		const [openListExporting, setOpenListExporting] = useState(false);
		const [openListType, setOpenListType] = useState("incomplete");
		const [openSearch, setOpenSearch] = useState("");
		const [dateFrom, setDateFrom] = useState("");
		const [dateTo, setDateTo] = useState("");
		const [sortBy, setSortBy] = useState("booked_at");
		const openListLimit = 10;
		const hotelId = String(hotel?._id || "");

		const syncReservationModalQuery = useCallback(
			(type = openListType, page = openListPage, overrides = {}) => {
				if (!hotelId || typeof updateDashboardQuery !== "function") return;
				updateDashboardQuery({
					modal: "reservations",
					hotelId,
					reservationListType: type,
					listPage: page,
					listSearch: overrides.openSearch ?? openSearch,
					dateFrom: overrides.dateFrom ?? dateFrom,
					dateTo: overrides.dateTo ?? dateTo,
					sortBy: overrides.sortBy ?? sortBy,
				});
			},
			[
				dateFrom,
				dateTo,
				hotelId,
				openListPage,
				openListType,
				openSearch,
				sortBy,
				updateDashboardQuery,
			]
		);

		const closeReservationModal = useCallback(() => {
			setOpenListVisible(false);
			if (typeof clearDashboardModalQuery === "function") {
				clearDashboardModalQuery();
			}
		}, [clearDashboardModalQuery]);

		useEffect(() => {
			const params = new URLSearchParams(location.search);
			const modal = params.get("modal");
			const queryHotelId = params.get("hotelId");
			const isThisModal =
				modal === "reservations" && String(queryHotelId || "") === hotelId;

			if (!isThisModal) {
				if (openListVisible) setOpenListVisible(false);
				return;
			}

			const queryType =
				params.get("reservationListType") === "open" ? "open" : "incomplete";
			const queryPage = Math.max(parseInt(params.get("listPage"), 10) || 1, 1);
			setOpenListType(queryType);
			setOpenSearch(params.get("listSearch") || "");
			setDateFrom(params.get("dateFrom") || "");
			setDateTo(params.get("dateTo") || "");
			setSortBy(params.get("sortBy") || "booked_at");
			setOpenListPage(queryPage);
			setOpenListVisible(true);
		}, [hotelId, location.search, openListVisible]);

		useEffect(() => {
			let mounted = true;
			if (!hotel?._id || !adminId || !token) return undefined;

			getHotelMainDashboardStats(hotel._id, adminId, token).then((data) => {
				if (!mounted || !data || data.error) return;
				setHotelStats(data);
			});

			return () => {
				mounted = false;
			};
		}, [adminId, hotel?._id, token]);

		const loadOpenReservations = useCallback(
			(page = openListPage, overrides = {}) => {
				if (!hotel?._id || !adminId || !token) return;
				setOpenListLoading(true);
				const listType = overrides.openListType || openListType;
				const loader =
					listType === "incomplete"
						? getHotelDashboardIncompleteReservations
						: getHotelDashboardOpenReservations;
				loader(hotel._id, adminId, token, {
					page,
					limit: openListLimit,
					search: overrides.openSearch ?? openSearch,
					dateFrom: overrides.dateFrom ?? dateFrom,
					dateTo: overrides.dateTo ?? dateTo,
					sortBy: overrides.sortBy ?? sortBy,
					sortOrder: "asc",
				})
					.then((data) => {
						if (!data || data.error) {
							setOpenList([]);
							setOpenListTotal(0);
							return;
						}
						setOpenList(Array.isArray(data.reservations) ? data.reservations : []);
						setOpenListTotal(Number(data.total || 0));
						setOpenListPage(Number(data.page || page));
					})
					.finally(() => setOpenListLoading(false));
			},
			[
				adminId,
				dateFrom,
				dateTo,
				hotel?._id,
				openListType,
				openListPage,
				openSearch,
				sortBy,
				token,
			],
		);

		const handleExportOpenReservations = useCallback(() => {
			if (!hotel?._id || !adminId || !token) return;

			const loader =
				openListType === "incomplete"
					? getHotelDashboardIncompleteReservations
					: getHotelDashboardOpenReservations;

			setOpenListExporting(true);
			loader(hotel._id, adminId, token, {
				page: 1,
				exportAll: true,
				search: openSearch,
				dateFrom,
				dateTo,
				sortBy,
				sortOrder: "asc",
			})
				.then((data) => {
					const rows = Array.isArray(data?.reservations)
						? data.reservations
						: [];
					if (!rows.length) {
						message.info(
							openListType === "incomplete"
								? WORDS.noIncompleteRows
								: WORDS.noRows
						);
						return;
					}

					const exportRows = rows.map((reservation, index) => ({
						[WORDS.index]: index + 1,
						[WORDS.confirmation]: reservation.confirmation_number || "",
						[WORDS.guest]: reservation.customer_details?.name || "",
						[WORDS.source]: reservation.booking_source || "",
						[WORDS.bookedAt]: formatShortDate(reservation.booked_at),
						[WORDS.checkin]: formatShortDate(reservation.checkin_date),
						[WORDS.checkout]: formatShortDate(reservation.checkout_date),
						[WORDS.total]: `${formatMoney(reservation.total_amount)} SAR`,
						[WORDS.reason]: getReservationReasonText(reservation, isRTL),
						[WORDS.cycle]:
							reservation.financial_cycle?.status ||
							(openListType === "incomplete" ? "incomplete" : "open"),
					}));
					const worksheet = XLSX.utils.json_to_sheet(exportRows);
					const workbook = XLSX.utils.book_new();
					XLSX.utils.book_append_sheet(workbook, worksheet, "Reservations");
					const hotelName = String(hotel.hotelName || "hotel")
						.replace(/[\\/:*?"<>|]+/g, "-")
						.replace(/\s+/g, "-");
					const fileDate = new Date().toISOString().slice(0, 10);
					XLSX.writeFile(
						workbook,
						`${hotelName}-${openListType}-reservations-${fileDate}.xlsx`
					);
				})
				.catch(() => {
					message.error("Unable to export reservations right now.");
				})
				.finally(() => setOpenListExporting(false));
		}, [
			adminId,
			dateFrom,
			dateTo,
			hotel?._id,
			hotel?.hotelName,
			isRTL,
			openListType,
			openSearch,
			sortBy,
			token,
			WORDS,
		]);

		useEffect(() => {
			if (!openListVisible) return;
			loadOpenReservations(openListPage);
		}, [loadOpenReservations, openListPage, openListVisible]);

		/* progress flags */
		const photosDone = !!hotel?.hotelPhotos?.length;
		const roomsDone = !!hotel?.roomCountDetails?.length;
		const locationDone =
			Array.isArray(hotel?.location?.coordinates) &&
			hotel.location.coordinates[0] !== 0 &&
			hotel.location.coordinates[1] !== 0;
		const dataDone =
			hotel?.aboutHotel || hotel?.aboutHotelArabic || hotel?.overallRoomsCount;
		const bankDone = !!hotel?.paymentSettings?.length;

		const stepsDone = [
			true,
			roomsDone,
			photosDone,
			locationDone,
			dataDone,
			bankDone,
		];
		const requiredStepsDone = [
			true,
			roomsDone,
			photosDone,
			locationDone,
			dataDone,
		];

		/* click on start */
		const handleStart = () => {
			if (!requiredStepsDone.every(Boolean)) return;
			window.location.href = `/hotel-management/new-reservation/${adminId}/${hotel._id}?newReservation`;
		};

		/* replace WhatsApp number with clickable anchor */
		const renderNoteLine = (ln, idx) => {
			if (ln.includes(CONTACT_WHATSAPP)) {
				const parts = ln.split(CONTACT_WHATSAPP);
				return (
					<span key={idx}>
						{parts[0]}
						<a
							href={CONTACT_URL}
							target='_blank'
							rel='noopener noreferrer'
							style={{ fontWeight: 700 }}
						>
							{CONTACT_WHATSAPP}
						</a>
						{parts[1]}
						<br />
					</span>
				);
			}
			return (
				<span key={idx}>
					{ln}
					<br />
				</span>
			);
		};

		/* ─── JSX ─── */
		const goToReservationDetails = (reservation = {}) => {
			const ownerId = hotel?.belongsTo?._id || hotel?.belongsTo || adminId;
			const params = new URLSearchParams();
			params.set("list", "");
			params.set("page", "1");
			if (reservation.confirmation_number) {
				params.set("search", String(reservation.confirmation_number));
			}
			if (reservation.reservationId || reservation.linkedReservationId || reservation._id) {
				params.set(
					"reservationId",
					String(
						reservation.reservationId ||
							reservation.linkedReservationId ||
							reservation._id
					)
				);
			}
			window.location.href = `/hotel-management/new-reservation/${ownerId}/${hotel._id}?${params.toString()}`;
		};

		const stats = hotelStats?.stats || {};
		const setupReady =
			hotelStats?.setup?.settingsDone || requiredStepsDone.every(Boolean);
		const bookingSources = Array.isArray(stats.bookingSources)
			? stats.bookingSources
			: [];
		const statItems = [
			{
				key: "available",
				label: WORDS.availableRooms,
				value: stats.availableRooms,
				icon: <HomeOutlined />,
				tone: "blue",
			},
			{
				key: "rooms",
				label: WORDS.totalRooms,
				value: stats.totalRooms,
				icon: <DatabaseOutlined />,
				tone: "green",
			},
			{
				key: "reservations",
				label: WORDS.reservations,
				value: stats.totalReservations,
				icon: <CalendarOutlined />,
				tone: "purple",
			},
			{
				key: "incomplete",
				label: WORDS.uncompleted,
				value: stats.uncompletedReservations,
				icon: <WarningOutlined />,
				tone: "red",
				onClick: () => {
					setOpenListType("incomplete");
					setOpenList([]);
					setOpenSearch("");
					setDateFrom("");
					setDateTo("");
					setSortBy("booked_at");
					setOpenListVisible(true);
					setOpenListPage(1);
					syncReservationModalQuery("incomplete", 1, {
						openSearch: "",
						dateFrom: "",
						dateTo: "",
						sortBy: "booked_at",
					});
				},
			},
		];

		return (
			<>
			<CardShell>
				<div className='row'>
					{/* LEFT */}
					<div className='col-md-7 mx-auto'>
						<LeftCol>
							<ReviewRibbon $active={isActive}>
								{isActive ? WORDS.ribbonActive : WORDS.ribbon}
							</ReviewRibbon>

							<NameRow onClick={onTitleClick} $isRTL={isRTL}>
								{hotel?.hotelName || "Unnamed hotel"}
								<EditOutlined
									onClick={(e) => {
										e.stopPropagation();
										onEdit();
									}}
								/>
							</NameRow>

							<Address $isRTL={isRTL}>
								{hotel?.hotelAddress}
								{hotel?.hotelCity && `, ${hotel.hotelCity}`}
								{hotel?.hotelCountry && `, ${hotel.hotelCountry}`}
								{(hotel?.hotelAddress || hotel?.phone) && <br />}
								{hotel?.phone && <small>+{hotel.phone}</small>}
							</Address>

							<StatsPanel $isRTL={isRTL}>
								<StatsHeader>
									<span>{WORDS.statsTitle}</span>
									<SetupPill $ready={setupReady}>
										{setupReady ? WORDS.setupReady : WORDS.setupPending}
									</SetupPill>
								</StatsHeader>
								<StatsGrid>
									{statItems.map((item) => (
										<StatTile
											key={item.key}
											$tone={item.tone}
											$clickable={!!item.onClick}
											onClick={item.onClick}
											role={item.onClick ? "button" : undefined}
											tabIndex={item.onClick ? 0 : undefined}
											onKeyDown={(event) => {
												if (!item.onClick) return;
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													item.onClick();
												}
											}}
										>
											<StatIcon>{item.icon}</StatIcon>
											<StatText>
												<strong>{item.value ?? "..."}</strong>
												<span>{item.label}</span>
											</StatText>
										</StatTile>
									))}
								</StatsGrid>
								{bookingSources.length ? (
									<SourceSummary>
										<SourceSummaryTitle>{WORDS.sourceTitle}</SourceSummaryTitle>
										{bookingSources.slice(0, 4).map((source) => (
											<SourceRow key={source.source || "unknown"}>
												<span>{source.source || "Unknown"}</span>
												<strong>{source.count || 0}</strong>
											</SourceRow>
										))}
									</SourceSummary>
								) : null}
							</StatsPanel>

							<BigNote $isRTL={isRTL}>
								{(isActive ? WORDS.noteActive : WORDS.note)
									.split("\n")
									.map(renderNoteLine)}
							</BigNote>
						</LeftCol>
					</div>

					{/* RIGHT */}
					<div className='col-md-5 mx-auto'>
						<RightCol $isRTL={isRTL}>
							<StepsHeading $isRTL={isRTL}>{WORDS.stepsTitle}</StepsHeading>

							<StepsUL>
								{WORDS.steps.map((label, idx) => (
									<StepLi
										key={idx}
										$done={stepsDone[idx]}
										$isRTL={isRTL}
										onClick={() => onStepClick(idx, hotel)}
									>
										<StepBadge $done={stepsDone[idx]}>{idx + 1}</StepBadge>
										{stepsDone[idx] && (
											<CheckCircleTwoTone
												twoToneColor='#52c41a'
												style={{ fontSize: 16 }}
											/>
										)}
										<span>{label}</span>
									</StepLi>
								))}
							</StepsUL>

							<StepNote $isRTL={isRTL}>{WORDS.startNote}</StepNote>

							<ProceedBtn
								disabled={!requiredStepsDone.every(Boolean)}
								onClick={handleStart}
							>
								{requiredStepsDone.every(Boolean)
									? WORDS.start
									: WORDS.startDisabled}
							</ProceedBtn>
						</RightCol>
					</div>
				</div>
			</CardShell>
			<Modal
				title={
					openListType === "incomplete"
						? WORDS.incompleteModalTitle
						: WORDS.openModalTitle
				}
				open={openListVisible}
				onCancel={closeReservationModal}
				footer={null}
				width='min(96vw, 1080px)'
				destroyOnClose
			>
				<OpenReservationsPanel $isRTL={isRTL}>
					<OpenFilters
						onSubmit={(event) => {
							event.preventDefault();
							setOpenListPage(1);
							syncReservationModalQuery(openListType, 1);
							loadOpenReservations(1);
						}}
					>
						<input
							value={openSearch}
							onChange={(event) => setOpenSearch(event.target.value)}
							placeholder={WORDS.searchPlaceholder}
						/>
						<label>
							<span>{WORDS.from}</span>
							<input
								type='date'
								value={dateFrom}
								onChange={(event) => setDateFrom(event.target.value)}
							/>
						</label>
						<label>
							<span>{WORDS.to}</span>
							<input
								type='date'
								value={dateTo}
								onChange={(event) => setDateTo(event.target.value)}
							/>
						</label>
						<label>
							<span>{WORDS.sortBy}</span>
							<select
								value={sortBy}
								onChange={(event) => setSortBy(event.target.value)}
							>
								<option value='booked_at'>{WORDS.bookedAt}</option>
								<option value='checkin_date'>{WORDS.checkin}</option>
								<option value='checkout_date'>{WORDS.checkout}</option>
							</select>
						</label>
						<button type='submit'>{WORDS.search}</button>
						<button
							type='button'
							onClick={() => {
								setOpenSearch("");
								setDateFrom("");
								setDateTo("");
								setSortBy("booked_at");
								setOpenListPage(1);
								syncReservationModalQuery(openListType, 1, {
									openSearch: "",
									dateFrom: "",
									dateTo: "",
									sortBy: "booked_at",
								});
								loadOpenReservations(1, {
									openSearch: "",
									dateFrom: "",
									dateTo: "",
									sortBy: "booked_at",
								});
							}}
						>
							{WORDS.reset}
						</button>
						<button
							type='button'
							onClick={handleExportOpenReservations}
							disabled={openListExporting}
							className='export-btn'
						>
							{openListExporting ? WORDS.exporting : WORDS.exportExcel}
						</button>
					</OpenFilters>

					<OpenTableWrap>
						<OpenTable>
							<thead>
								<tr>
									<th>{WORDS.index}</th>
									<th>{WORDS.confirmation}</th>
									<th>{WORDS.guest}</th>
									<th>{WORDS.source}</th>
									<th>{WORDS.bookedAt}</th>
									<th>{WORDS.checkin}</th>
									<th>{WORDS.checkout}</th>
									<th>{WORDS.total}</th>
									<th>{WORDS.reason}</th>
									<th>{WORDS.cycle}</th>
								</tr>
							</thead>
							<tbody>
								{openListLoading ? (
									<tr>
										<td colSpan='10'>Loading...</td>
									</tr>
								) : openList.length ? (
									openList.map((reservation, index) => (
										<tr key={reservation._id || reservation.confirmation_number}>
											<td>
												{(openListPage - 1) * openListLimit + index + 1}
											</td>
											<td>
												<ConfirmationButton
													type='button'
													onClick={() => goToReservationDetails(reservation)}
												>
													{reservation.confirmation_number || "-"}
												</ConfirmationButton>
											</td>
											<td>{reservation.customer_details?.name || "-"}</td>
											<SourceCell>{reservation.booking_source || "-"}</SourceCell>
											<td>{formatShortDate(reservation.booked_at)}</td>
											<td>{formatShortDate(reservation.checkin_date)}</td>
											<td>{formatShortDate(reservation.checkout_date)}</td>
											<td>{formatMoney(reservation.total_amount)} SAR</td>
											<ReasonCell dir={isRTL ? "rtl" : "ltr"}>
												{getReservationReasonText(reservation, isRTL)}
											</ReasonCell>
											<td>
												{reservation.financial_cycle?.status ||
													(openListType === "incomplete"
														? "incomplete"
														: "open")}
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan='10'>
											{openListType === "incomplete"
												? WORDS.noIncompleteRows
												: WORDS.noRows}
										</td>
									</tr>
								)}
							</tbody>
						</OpenTable>
					</OpenTableWrap>

					<Pagination
						current={openListPage}
						pageSize={openListLimit}
						total={openListTotal}
						onChange={(page) => {
							setOpenListPage(page);
							syncReservationModalQuery(openListType, page);
						}}
						showSizeChanger={false}
						size='small'
					/>
				</OpenReservationsPanel>
			</Modal>
			</>
		);
	}
);

/* ═════════════  styled parts  ═════════════ */

const formatShortDate = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString("en-CA");
};

const formatMoney = (value) => {
	const amount = Number(value || 0);
	return amount.toLocaleString("en-US", {
		maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
	});
};

const getReservationReasonText = (reservation = {}, isRTL = false) => {
	const directText = isRTL ? reservation.reasonArabic : reservation.reason;
	if (directText) return directText;

	const localizedReasons = isRTL
		? reservation.reasonsArabic
		: reservation.reasons;
	if (Array.isArray(localizedReasons) && localizedReasons.length) {
		return localizedReasons.filter(Boolean).join(isRTL ? "؛ " : "; ");
	}

	if (Array.isArray(reservation.reasonDetails) && reservation.reasonDetails.length) {
		return reservation.reasonDetails
			.map((reason) => (isRTL ? reason.ar : reason.en) || reason.en)
			.filter(Boolean)
			.join(isRTL ? "؛ " : "; ");
	}

	return "-";
};

const Wrapper = styled.div`
	margin-top: 70px;
	min-height: 100vh;
	padding: 24px;
	background: var(--background-light);
`;

const CardsGrid = styled.div`
	display: grid;
	gap: 1.8rem;
`;

const PageActions = styled.div`
	display: flex;
	justify-content: ${(p) => (p.$isRTL ? "flex-end" : "flex-start")};
	direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	gap: 0.65rem;
	flex-wrap: wrap;
	margin: 1rem auto 1.2rem;

	@media (max-width: 640px) {
		margin-top: 0.75rem;
	}
`;

const ManageAccountsButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.45rem;
	border: 1px solid ${(p) => (p.$variant === "financials" ? "#6dd4a4" : "#98ceff")};
	background: ${(p) =>
		p.$variant === "financials"
			? "linear-gradient(135deg, #ecfff5 0%, #ffffff 100%)"
			: "linear-gradient(135deg, #e8f4ff 0%, #ffffff 100%)"};
	color: ${(p) => (p.$variant === "financials" ? "#087047" : "#0b5fa8")};
	border-radius: 12px;
	padding: 0.74rem 1rem;
	font-weight: 900;
	box-shadow: ${(p) =>
		p.$variant === "financials"
			? "0 10px 24px rgba(8, 112, 71, 0.12)"
			: "0 10px 24px rgba(13, 110, 200, 0.12)"};
	transition: transform 0.18s ease, box-shadow 0.18s ease;

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 14px 28px rgba(13, 110, 200, 0.18);
	}

	@media (max-width: 640px) {
		width: 100%;
		min-height: 44px;
	}
`;

const ExecutiveSummaryPanel = styled.section`
	direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	margin: 0 auto 1.25rem;
	padding: 1rem;
	border: 1px solid #cfe8ff;
	border-radius: 16px;
	background: linear-gradient(135deg, #f3faff 0%, #ffffff 100%);
	box-shadow: 0 14px 30px rgba(15, 23, 42, 0.06);
`;

const ExecutiveSummaryHeader = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 0.85rem;
	margin-bottom: 0.85rem;

	div {
		display: grid;
		gap: 0.18rem;
	}

	strong {
		color: #102033;
		font-size: clamp(1.05rem, 1.6vw, 1.28rem);
		font-weight: 950;
	}

	span,
	small {
		color: #58708c;
		font-size: 0.82rem;
		font-weight: 800;
	}

	small {
		white-space: nowrap;
	}

	@media (max-width: 640px) {
		flex-direction: column;
	}
`;

const ExecutiveSummaryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.75rem;

	@media (max-width: 992px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 480px) {
		gap: 0.55rem;
	}
`;

const executiveTone = {
	blue: { bg: "#e8f4ff", border: "#91caff", color: "#0b63b6" },
	green: { bg: "#eafaf0", border: "#9ee3b4", color: "#0b7a3d" },
	purple: { bg: "#f1ecff", border: "#c8b6ff", color: "#5b21b6" },
	red: { bg: "#fff0f2", border: "#ffb3bd", color: "#be123c" },
};

const ExecutiveSummaryCard = styled.div`
	${(p) => {
		const tone = executiveTone[p.$tone] || executiveTone.blue;
		return css`
			background: ${tone.bg};
			border-color: ${tone.border};
			color: ${tone.color};
		`;
	}}
	position: relative;
	min-height: 108px;
	border-width: 1px;
	border-style: solid;
	border-radius: 14px;
	padding: 0.9rem;
	display: grid;
	align-content: center;
	justify-items: start;
	gap: 0.25rem;
	cursor: ${(p) => (p.$clickable ? "pointer" : "default")};
	box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
	transition: transform 0.18s ease, box-shadow 0.18s ease;

	> .anticon {
		position: absolute;
		inset-inline-end: 0.85rem;
		top: 0.85rem;
		width: 34px;
		height: 34px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.78);
	}

	strong {
		font-size: clamp(1.45rem, 3vw, 2.1rem);
		line-height: 1;
		color: #071526;
		font-weight: 950;
		font-variant-numeric: tabular-nums;
	}

	span {
		color: #17324d;
		font-size: 0.84rem;
		font-weight: 900;
		line-height: 1.2;
	}

	em {
		color: #58708c;
		font-size: 0.72rem;
		font-style: normal;
		font-weight: 800;
	}

	&:hover {
		transform: ${(p) => (p.$clickable ? "translateY(-2px)" : "none")};
		box-shadow: ${(p) =>
			p.$clickable
				? "0 16px 30px rgba(15, 23, 42, 0.12)"
				: "0 10px 22px rgba(15, 23, 42, 0.05)"};
	}

	&:focus-visible {
		outline: 3px solid rgba(24, 144, 255, 0.28);
		outline-offset: 2px;
	}

	@media (max-width: 480px) {
		min-height: 96px;
		padding: 0.75rem;
	}
`;

const AgentDashboardShell = styled.div`
	direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	display: grid;
	gap: 1rem;
	max-width: 1180px;
	margin: 0 auto;

	@media (max-width: 640px) {
		padding-inline: 0.35rem;
	}
`;

const AgentHero = styled.section`
	display: grid;
	grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr);
	gap: 1rem;
	align-items: stretch;
	padding: 1rem;
	border: 1px solid #cfe8ff;
	border-radius: 14px;
	background: linear-gradient(135deg, #eef8ff 0%, #ffffff 100%);
	box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);

	> div:first-child {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
	}

	> div:first-child > span {
		font-size: 0.78rem;
		font-weight: 900;
		color: #0d6ec8;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	h1 {
		margin: 0.25rem 0 0.35rem;
		font-size: clamp(1.3rem, 2vw, 2rem);
		font-weight: 950;
		color: #102033;
	}

	p {
		margin: 0;
		max-width: 560px;
		color: #54708f;
		font-weight: 800;
		line-height: 1.45;
	}

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const AgentTotals = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.65rem;

	@media (max-width: 760px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const agentTone = {
	blue: { bg: "#e8f4ff", border: "#91caff", color: "#0b63b6" },
	purple: { bg: "#f0e8ff", border: "#cbb7ff", color: "#5b21b6" },
	red: { bg: "#fff1f2", border: "#fecdd3", color: "#be123c" },
	orange: { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" },
};

const AgentSummaryTile = styled.div`
	${(p) => {
		const tone = agentTone[p.$tone] || agentTone.blue;
		return css`
			background: ${tone.bg};
			border-color: ${tone.border};
			color: ${tone.color};
		`;
	}}
	min-height: 92px;
	display: grid;
	align-content: center;
	justify-items: center;
	gap: 0.22rem;
	border: 1px solid;
	border-radius: 12px;
	padding: 0.75rem;
	text-align: center;

	> span {
		width: 30px;
		height: 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.82);
		font-size: 1rem;
	}

	strong {
		font-size: 1.3rem;
		line-height: 1;
		color: #0f172a;
	}

	small {
		color: #475569;
		font-weight: 900;
		line-height: 1.2;
	}
`;

const AgentSwitcher = styled.section`
	display: grid;
	gap: 0.65rem;
	padding: 0.85rem;
	border: 1px solid #cfe8ff;
	border-radius: 14px;
	background: #f8fbff;
`;

const AgentSectionHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;

	strong {
		color: #102033;
		font-size: 1rem;
	}

	span {
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 800;
	}

	@media (max-width: 520px) {
		align-items: flex-start;
		flex-direction: column;
	}
`;

const AgentHotelToggleGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 0.55rem;

	button {
		min-height: 42px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		border: 1px solid #c8daee;
		border-radius: 10px;
		background: #fff;
		color: #17324d;
		font-weight: 900;
		transition: background 0.18s ease, border-color 0.18s ease,
			box-shadow 0.18s ease;
	}

	button[data-active="true"] {
		background: #e8f4ff;
		border-color: #1677ff;
		box-shadow: 0 8px 18px rgba(22, 119, 255, 0.14);
		color: #0b63b6;
	}

	span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const AgentHotelGrid = styled.section`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	gap: 1rem;

	@media (max-width: 420px) {
		grid-template-columns: 1fr;
	}
`;

const AgentHotelCard = styled.article`
	display: grid;
	gap: 0.8rem;
	padding: 1rem;
	border: 1px solid ${(p) => (p.$active ? "#91caff" : "#dce8f6")};
	border-radius: 14px;
	background: #fff;
	box-shadow: ${(p) =>
		p.$active
			? "0 14px 30px rgba(13, 110, 200, 0.14)"
			: "0 10px 24px rgba(15, 23, 42, 0.06)"};

	p {
		margin: -0.2rem 0 0;
		min-height: 21px;
		color: #64748b;
		font-weight: 700;
		line-height: 1.35;
	}
`;

const AgentHotelCardHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;

	button {
		border: none;
		background: transparent;
		color: #075aa5;
		font-size: 1.08rem;
		font-weight: 950;
		text-align: inherit;
		text-decoration: underline;
		text-underline-offset: 4px;
		padding: 0;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		cursor: pointer;
	}
`;

const AgentCardStats = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.45rem;

	@media (max-width: 520px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const AgentMiniStat = styled.div`
	display: grid;
	justify-items: center;
	gap: 0.16rem;
	min-height: 66px;
	padding: 0.55rem 0.35rem;
	border: 1px solid #d9ecff;
	border-radius: 10px;
	background: #f7fbff;
	text-align: center;

	strong {
		color: #0f172a;
		font-size: 1.08rem;
		line-height: 1;
	}

	span {
		color: #475569;
		font-size: 0.72rem;
		font-weight: 900;
		line-height: 1.2;
	}
`;

const AgentCardActions = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.55rem;

	button {
		min-height: 42px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.42rem;
		border: 1px solid #1677ff;
		border-radius: 10px;
		background: #1677ff;
		color: #fff;
		font-weight: 900;
		box-shadow: 0 8px 18px rgba(22, 119, 255, 0.16);
	}

	button:last-child {
		background: #e8f4ff;
		color: #0b63b6;
	}

	@media (max-width: 430px) {
		grid-template-columns: 1fr;
	}
`;

const AgentEmpty = styled.div`
	padding: 1.2rem;
	border: 1px dashed #b8dcff;
	border-radius: 14px;
	background: #f8fbff;
	color: #475569;
	font-weight: 900;
	text-align: center;
`;

const AccountsModalShell = styled.div`
	direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	max-height: min(86vh, 780px);
	overflow-y: auto;
	overflow-x: hidden;
	padding: 0;

	.ant-modal-body {
		padding: 0;
	}

	.ant-tabs-nav {
		margin: 0 0 0.42rem;
		padding: 0.22rem;
		border: 1px solid #cfe8ff;
		border-radius: 12px;
		background: #f4f9ff;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
	}

	.ant-tabs,
	.ant-tabs-content-holder,
	.ant-tabs-content,
	.ant-tabs-tabpane {
		min-width: 0;
		max-width: 100%;
	}

	.ant-tabs-tabpane {
		overflow: hidden;
	}

	.ant-tabs-nav::before {
		display: none;
	}

	.ant-tabs-nav-wrap {
		min-width: 0;
	}

	.ant-tabs-nav-list {
		max-width: 100%;
		gap: 0.35rem;
		flex-wrap: wrap;
		justify-content: ${(p) => (p.$isRTL ? "flex-end" : "flex-start")};
	}

	.ant-tabs-tab {
		min-height: 38px;
		margin: 0 !important;
		padding: 0.42rem 0.9rem;
		border: 1px solid #d7e8fb;
		border-radius: 10px;
		background: #ffffff;
		font-weight: 900;
		color: #35506f;
		transition: background 0.18s ease, border-color 0.18s ease,
			box-shadow 0.18s ease, color 0.18s ease;
	}

	.ant-tabs-tab:hover {
		color: #0d6ec8;
		border-color: #98ceff;
	}

	.ant-tabs-tab-active {
		background: linear-gradient(135deg, #1677ff 0%, #0d6ec8 100%);
		border-color: #1677ff;
		box-shadow: 0 8px 18px rgba(22, 119, 255, 0.2);
	}

	.account-tab-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-width: 156px;
	}

	.ant-tabs-tab-active .ant-tabs-tab-btn {
		color: #fff !important;
		text-shadow: none;
	}

	.ant-tabs-ink-bar {
		display: none;
	}

	.ant-tabs-content {
		direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	}

	@media (max-width: 560px) {
		.ant-tabs-nav-list {
			display: grid !important;
			grid-template-columns: 1fr;
		}

		.ant-tabs-tab {
			justify-content: center;
			width: 100%;
		}
	}
`;

const AccountsHero = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 1rem;
	padding: 0 0 0.35rem;
	margin-bottom: 0.2rem;

	.ant-btn {
		font-weight: 900;
		border-radius: 9px;
	}

	@media (max-width: 620px) {
		justify-content: stretch;

		.ant-btn {
			width: 100%;
		}
	}
`;

const AccountsTableWrap = styled.div`
	display: grid;
	gap: 0.45rem;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};

	> p {
		margin: 0;
		padding: 0.52rem 0.7rem;
		border-radius: 10px;
		background: #f7fbff;
		color: #475569;
		font-weight: 700;
	}

	.ant-table-wrapper,
	.ant-spin-nested-loading,
	.ant-spin-container {
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
	}

	.ant-table-container,
	.ant-table-content {
		max-width: 100%;
		overflow-x: auto !important;
		direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	}

	.ant-table {
		width: 100%;
		border: 1px solid #dce8f6;
		border-radius: 12px;
		overflow: hidden;
		table-layout: fixed;
	}

	.ant-table table {
		width: 100% !important;
		min-width: 1205px;
	}

	.ant-table-thead > tr > th {
		background: #e8f4ff;
		font-weight: 900;
		color: #17324d;
		padding: 0.58rem 0.62rem;
		text-align: center;
	}

	.ant-table-cell {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: middle;
		padding: 0.48rem 0.62rem;
		text-align: center;
	}

	.ant-table-tbody > tr > td {
		border-bottom-color: #edf3fa;
	}

	.ant-table-pagination {
		margin: 0.55rem 0 0 !important;
		justify-content: ${(p) => (p.$isRTL ? "flex-start" : "flex-end")};
	}

	.ant-table-placeholder .ant-table-cell {
		padding: 1rem;
	}

	.ant-tag {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: middle;
	}
`;

const AccountNameCell = styled.div`
	display: grid;
	gap: 0.18rem;
	min-width: 0;
	text-align: inherit;

	strong {
		color: #102033;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	span {
		color: #64748b;
		font-size: 0.8rem;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

const AccountPreviewButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.32rem;
	min-width: 0;
	border: 0;
	background: transparent;
	color: #0f4c81;
	font: inherit;
	font-weight: 900;
	cursor: pointer;
	padding: 0;

	strong {
		color: inherit;
	}

	&:hover {
		color: #0b74de;
		text-decoration: underline;
	}

	&:disabled {
		cursor: wait;
		opacity: 0.65;
		text-decoration: none;
	}
`;

const AccessTags = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem;
	min-width: 0;
	justify-content: center;
`;

const AccountActions = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.32rem;
	flex-wrap: wrap;

	button {
		font-weight: 800;
		min-width: 60px;
		padding-inline: 0.45rem;
	}
`;

const AccountForm = styled.form`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.85rem;
	padding: 1rem;
	border: 1px solid #dce8f6;
	border-radius: 14px;
	background: #f8fbff;

	label {
		display: grid;
		gap: 0.35rem;
		margin: 0;
		font-weight: 800;
		color: #25364b;
	}

	input,
	select {
		width: 100%;
		min-height: 40px;
		border: 1px solid #c8daee;
		border-radius: 9px;
		background: #fff;
		padding: 0 0.75rem;
		font-weight: 700;
		color: #1f2937;
	}

	small {
		line-height: 1.25;
	}

	@media (max-width: 680px) {
		grid-template-columns: 1fr;
		padding: 0.8rem;
	}
`;

const StaffEditForm = styled.div`
	direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.85rem;
	padding-top: 0.4rem;

	label {
		display: grid;
		gap: 0.35rem;
		margin: 0;
		font-weight: 800;
		color: #25364b;
	}

	input {
		width: 100%;
		min-height: 40px;
		border: 1px solid #c8daee;
		border-radius: 9px;
		background: #fff;
		padding: 0 0.75rem;
		font-weight: 700;
		color: #1f2937;
	}

	@media (max-width: 680px) {
		grid-template-columns: 1fr;
	}
`;

const ActiveAccountToggle = styled.label`
	display: inline-flex !important;
	align-items: center;
	justify-content: flex-start;
	gap: 0.5rem;
	min-height: 40px;
	padding: 0.5rem 0.75rem;
	border: 1px solid #cfe8ff;
	border-radius: 10px;
	background: #f7fbff;

	input {
		width: 17px;
		height: 17px;
		min-height: auto;
		padding: 0;
		accent-color: #1677ff;
	}

	span {
		font-weight: 900;
		color: #17324d;
	}
`;

const FieldLabel = styled.span`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.55rem;
	font-weight: 900;
`;

const SelectionHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.55rem;
`;

const Requirement = styled.small`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 20px;
	padding: 0.08rem 0.44rem;
	border-radius: 999px;
	border: 1px solid ${(p) => (p.$required ? "#ffb4b4" : "#badcff")};
	background: ${(p) => (p.$required ? "#fff1f1" : "#edf7ff")};
	color: ${(p) => (p.$required ? "#b42318" : "#0b5fa8")};
	font-size: 0.68rem;
	font-weight: 900;
	white-space: nowrap;
`;

const FieldHint = styled.small`
	color: #64748b;
	font-size: 0.68rem;
	font-weight: 700;
`;

const DocumentUploadBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.48rem;
	padding: 0.75rem;
	border: 1px dashed #b9d8f5;
	border-radius: 12px;
	background: #ffffff;
`;

const UploadButton = styled.button`
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.45rem;
	min-height: 38px;
	width: fit-content;
	padding: 0 0.95rem;
	border: 1px solid #96c8f6;
	border-radius: 999px;
	background: linear-gradient(135deg, #eef8ff 0%, #ffffff 100%);
	color: #075ca8;
	font-weight: 900;
	cursor: pointer;

	input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
`;

const DocumentList = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem;
	min-height: 4px;
`;

const DocumentChip = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	max-width: 100%;
	padding: 0.35rem 0.5rem;
	border-radius: 999px;
	border: 1px solid #cfe8ff;
	background: #f4fbff;
	color: #19324d;
	font-size: 0.78rem;
	font-weight: 800;
`;

const DocumentPreviewButton = styled.button`
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	min-width: 0;
	max-width: min(50vw, 330px);
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: pointer;

	svg {
		flex: 0 0 auto;
		color: #1677ff;
	}

	span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	&:hover span,
	&:focus-visible span {
		text-decoration: underline;
	}
`;

const DocumentRemoveButton = styled.button`
	border: 0;
	background: #fff;
	color: #b42318;
	border-radius: 999px;
	width: 28px;
	height: 28px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	flex: 0 0 auto;
	font-size: 0.92rem;

	&:hover,
	&:focus-visible {
		background: #fee4e2;
	}
`;

const DocumentPreviewBody = styled.div`
	min-height: min(60vh, 520px);
	display: grid;
	place-items: center;
	background: #f8fbff;
	border: 1px solid #d9e9fb;
	border-radius: 12px;
	padding: 0.75rem;
`;

const DocumentPreviewImage = styled.img`
	display: block;
	max-width: 100%;
	max-height: min(70vh, 620px);
	object-fit: contain;
	border-radius: 10px;
	background: #fff;
`;

const DocumentPreviewFrame = styled.iframe`
	width: 100%;
	height: min(72vh, 650px);
	border: 1px solid #d3e4f6;
	border-radius: 10px;
	background: #fff;
`;

const DocumentPreviewUnavailable = styled.div`
	display: grid;
	place-items: center;
	gap: 0.75rem;
	min-height: 240px;
	text-align: center;
	color: #31445f;
	font-weight: 800;

	p {
		max-width: 540px;
		margin: 0;
	}
`;

const SelectionBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.38rem;
	font-weight: 900;
	color: #17324d;
`;

const SelectionGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
	gap: 0.5rem;
`;

const AgentCommercialBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.5rem;
	padding: 0.75rem;
	border: 1px solid #cfe8ff;
	border-radius: 12px;
	background: #ffffff;

	label {
		max-width: 360px;
	}
`;

const AgentCommercialOptions = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
	gap: 0.5rem;
`;

const AgentCommercialOption = styled.button`
	display: grid;
	gap: 0.18rem;
	min-height: 72px;
	padding: 0.62rem 0.72rem;
	border: 1px solid ${(p) => (p.$active ? "#1677ff" : "#d8e6f5")};
	border-radius: 10px;
	background: ${(p) => (p.$active ? "#eef7ff" : "#ffffff")};
	color: #102033;
	text-align: inherit;
	cursor: pointer;
	box-shadow: ${(p) =>
		p.$active ? "0 8px 18px rgba(22, 119, 255, 0.12)" : "none"};

	strong {
		font-size: 0.86rem;
		font-weight: 950;
	}

	span {
		color: #61738a;
		font-size: 0.72rem;
		font-weight: 800;
		line-height: 1.25;
	}
`;

const SelectionPill = styled.button`
	min-height: 44px;
	border: 1px solid ${(p) => (p.$active ? "#1677ff" : "#cfe1f5")};
	border-radius: 12px;
	background: ${(p) =>
		p.$active ? "linear-gradient(135deg, #e7f3ff, #ffffff)" : "#ffffff"};
	color: #102033;
	padding: 0.42rem 0.58rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.55rem;
	text-align: start;
	box-shadow: ${(p) =>
		p.$active ? "0 8px 18px rgba(22, 119, 255, 0.12)" : "none"};
	cursor: pointer;

	input {
		width: 16px;
		height: 16px;
		min-height: auto;
		padding: 0;
		accent-color: #1677ff;
	}

	strong {
		font-size: 0.84rem;
		line-height: 1.25;
		flex: 1;
	}
`;

const AccessPicker = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.32rem;
	font-weight: 800;
	color: #25364b;

	> div {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	label {
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		gap: 0.35rem;
		min-height: 32px;
		padding: 0.35rem 0.56rem;
		border: 1px solid #cfe8ff;
		border-radius: 999px;
		background: #ffffff;
		font-size: 0.82rem;
	}

	input {
		width: 16px;
		height: 16px;
		min-height: auto;
		padding: 0;
		accent-color: #1677ff;
	}
`;

const CreateAccountButton = styled.button`
	grid-column: 1 / -1;
	justify-self: ${(p) => (p.$isRTL ? "start" : "end")};
	min-width: 210px;
	min-height: 42px;
	border: none;
	border-radius: 10px;
	background: #1677ff;
	color: #fff;
	font-weight: 900;
	padding: 0 1.25rem;

	&:disabled {
		opacity: 0.68;
	}

	@media (max-width: 680px) {
		width: 100%;
	}
`;

const statTone = {
	blue: { bg: "#e7f3ff", border: "#9dd1ff", color: "#0d6ec8" },
	green: { bg: "#e9f9ef", border: "#9be2b1", color: "#0d8d46" },
	purple: { bg: "#f2ebff", border: "#c7adff", color: "#6741d9" },
	orange: { bg: "#fff3df", border: "#ffd199", color: "#c46b00" },
	red: { bg: "#ffecec", border: "#ffb7b7", color: "#d4380d" },
};

const CardShell = styled(Card)`
	display: flex;
	flex-wrap: wrap;
	direction: ltr;
	padding: 0 !important;
	border: 1px solid #d8e7f7;
	border-radius: 12px;
	overflow: hidden;
	box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);

	.ant-card-body {
		width: 100%;
		padding: 0 !important;
	}

	@media (max-width: 767px) {
		flex-direction: column;
	}
`;

const LeftCol = styled.div`
	flex: 0 0 58%;
	padding: 1.7rem 2rem;
	background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);

	@media (max-width: 767px) {
		flex: 1 1 100%;
		padding: 1.15rem;
	}
`;

const RightCol = styled.div`
	flex: 0 0 42%;
	padding: 1.7rem;
	background: linear-gradient(180deg, #f4f9ff 0%, #eef7ff 100%);
	border-radius: 10px;

	@media (max-width: 767px) {
		flex: 1 1 100%;
		padding: 1.15rem;
	}
`;

const ReviewRibbon = styled.div`
	background: ${(p) =>
		p.$active
			? "linear-gradient(90deg, #0ea95b, #42c46b)"
			: "linear-gradient(90deg, #d88416, #f0ae43)"};
	color: #fff;
	text-align: center;
	font-weight: 700;
	padding: 0.72rem 1rem;
	margin-bottom: 1.25rem;
	border-radius: 8px;
`;

const NameRow = styled.h2`
	margin: 0 0 0.8rem;
	font-size: 1.45rem;
	font-weight: 700;
	display: flex;
	align-items: center;
	gap: 0.55rem;
	cursor: pointer;
	width: fit-content;
	color: #0f4c81;
	border-bottom: 2px solid rgba(13, 110, 200, 0.18);
	text-transform: capitalize;
	transition: color 0.18s ease, border-color 0.18s ease;

	&:hover {
		color: #0b74d1;
		border-color: rgba(13, 110, 200, 0.55);
	}

	${(p) =>
		p.$isRTL &&
		css`
			svg {
				order: -1;
			}
		`}
`;

const Address = styled.p`
	margin: 0 0 1rem;
	line-height: 1.45;
	text-align: ${(p) => (p.$isRTL ? "right" : "left")};
`;

const StatsPanel = styled.div`
	direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	background: #f7fbff;
	border: 1px solid #cfe8ff;
	border-radius: 10px;
	padding: 0.9rem;
	margin-bottom: 1rem;
`;

const StatsHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	margin-bottom: 0.75rem;
	font-weight: 800;
	color: #102033;
`;

const SetupPill = styled.span`
	font-size: 0.78rem;
	padding: 0.28rem 0.58rem;
	border-radius: 999px;
	background: ${(p) => (p.$ready ? "#dff8e8" : "#fff4d7")};
	color: ${(p) => (p.$ready ? "#08763d" : "#9b6100")};
	border: 1px solid ${(p) => (p.$ready ? "#96e3b2" : "#ffd77a")};
	white-space: nowrap;
`;

const StatsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.7rem;

	@media (max-width: 991px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const StatTile = styled.div`
	${(p) => {
		const tone = statTone[p.$tone] || statTone.blue;
		return css`
			background: ${tone.bg};
			border: 1px solid ${tone.border};
			color: ${tone.color};
		`;
	}}
	border-radius: 10px;
	padding: 0.75rem;
	min-height: 76px;
	display: flex;
	align-items: center;
	gap: 0.65rem;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
	cursor: ${(p) => (p.$clickable ? "pointer" : "default")};
	transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;

	&:hover {
		transform: ${(p) => (p.$clickable ? "translateY(-2px)" : "none")};
		box-shadow: ${(p) =>
			p.$clickable
				? "0 12px 24px rgba(15, 23, 42, 0.1)"
				: "0 8px 18px rgba(15, 23, 42, 0.04)"};
	}

	&:focus-visible {
		outline: 3px solid rgba(24, 144, 255, 0.28);
		outline-offset: 2px;
	}
`;

const StatIcon = styled.span`
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, 0.8);
	font-size: 1rem;
	flex: 0 0 auto;
`;

const StatText = styled.span`
	display: flex;
	flex-direction: column;
	min-width: 0;

	strong {
		font-size: 1.18rem;
		line-height: 1;
		color: #0f172a;
	}

	span {
		margin-top: 0.28rem;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.2;
		color: #475569;
	}
`;

const SourceSummary = styled.div`
	margin-top: 0.8rem;
	padding: 0.65rem;
	border-radius: 10px;
	background: #ffffff;
	border: 1px solid #d9ecff;
	display: grid;
	gap: 0.42rem;
`;

const SourceSummaryTitle = styled.div`
	font-size: 0.78rem;
	font-weight: 800;
	color: #1e4f7a;
`;

const SourceRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	font-size: 0.8rem;
	font-weight: 700;
	color: #334155;
	border-radius: 8px;
	background: #f5faff;
	padding: 0.42rem 0.55rem;

	span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-transform: capitalize;
	}

	strong {
		color: #0d6ec8;
		font-variant-numeric: tabular-nums;
	}
`;

const OpenReservationsPanel = styled.div`
	direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	display: grid;
	gap: 0.9rem;
`;

const OpenFilters = styled.form`
	display: grid;
	grid-template-columns: minmax(210px, 1fr) repeat(3, minmax(130px, 0.45fr)) auto auto auto;
	gap: 0.6rem;
	align-items: end;

	input,
	select {
		width: 100%;
		height: 38px;
		border: 1px solid #c8daee;
		border-radius: 8px;
		padding: 0 0.7rem;
		background: #fff;
		font-weight: 700;
		color: #1f2937;
	}

	label {
		display: grid;
		gap: 0.25rem;
		margin: 0;
		font-size: 0.72rem;
		font-weight: 800;
		color: #4b6584;
	}

	button {
		height: 38px;
		border: 1px solid #91caff;
		border-radius: 8px;
		padding: 0 0.85rem;
		font-weight: 800;
		background: #e8f4ff;
		color: #0b63b6;
		white-space: nowrap;
	}

	button[type="submit"] {
		background: #1677ff;
		color: #fff;
		border-color: #1677ff;
	}

	.export-btn {
		background: #12a4bd;
		border-color: #12a4bd;
		color: #fff;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.68;
	}

	@media (max-width: 850px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 480px) {
		grid-template-columns: 1fr;
	}
`;

const OpenTableWrap = styled.div`
	overflow-x: auto;
	border: 1px solid #dce8f6;
	border-radius: 10px;
	background: #fff;
`;

const OpenTable = styled.table`
	width: 100%;
	min-width: 1080px;
	border-collapse: collapse;
	font-size: 0.82rem;

	th,
	td {
		padding: 0.58rem 0.7rem;
		border-bottom: 1px solid #edf2f7;
		text-align: center;
		vertical-align: middle;
		white-space: nowrap;
	}

	th {
		background: #e8f4ff;
		color: #17324d;
		font-weight: 900;
	}

	tbody tr:hover {
		background: #f8fbff;
	}
`;

const SourceCell = styled.td`
	text-transform: capitalize;
`;

const ConfirmationButton = styled.button`
	border: none;
	background: transparent;
	color: #0d6ec8;
	font-weight: 900;
	text-decoration: underline;
	text-underline-offset: 3px;
	padding: 0.15rem 0.2rem;
	cursor: pointer;

	&:hover,
	&:focus {
		color: #064c94;
		outline: none;
	}
`;

const ReasonCell = styled.td`
	min-width: 230px;
	max-width: 320px;
	white-space: normal !important;
	text-align: ${(p) => (p.dir === "rtl" ? "right" : "left")} !important;
	line-height: 1.45;
	color: #17324d;
	font-weight: 700;
`;

const BigNote = styled.p`
	font-weight: 700;
	line-height: 1.55;
	white-space: pre-line;
	text-align: ${(p) => (p.$isRTL ? "right" : "left")};
`;

const StepsHeading = styled.h3`
	margin: 0 0 1.5rem;
	font-size: 1.05rem;
	font-weight: 700;
	text-align: ${(p) => (p.$isRTL ? "right" : "left")};
`;

const StepsUL = styled.ul`
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
`;

const StepLi = styled.li`
	direction: ${(p) => (p.$isRTL ? "rtl" : "ltr")};
	background: ${(p) => (p.$done ? "#d6f4d9" : "#d7d7d7")};
	padding: 0.75rem 1rem;
	border-radius: 3px;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 0.55rem;

	&:hover {
		background: ${(p) => (p.$done ? "#c8efcd" : "#cfcfcf")};
	}
`;

const StepBadge = styled.span`
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: ${(p) => (p.$done ? "#0a8f3d" : "#ffc107")};
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-weight: 700;
	font-size: 0.9rem;
	flex-shrink: 0;
`;

const StepNote = styled.p`
	margin: 1.4rem 0 1.6rem;
	font-size: 0.88rem;
	line-height: 1.45;
	font-weight: 700;
	text-align: ${(p) => (p.$isRTL ? "right" : "left")};
`;

const ProceedBtn = styled.button`
	width: 100%;
	padding: 0.9rem;
	background: ${(p) => (p.disabled ? "#9e9e9e" : "#0a8fab")};
	color: #fff;
	border: none;
	font-weight: 700;
	cursor: ${(p) => (p.disabled ? "default" : "pointer")};
	transition: opacity 0.25s;

	&:hover {
		opacity: ${(p) => (p.disabled ? 1 : 0.88)};
	}
`;
