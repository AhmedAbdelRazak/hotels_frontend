import React from "react";
import { Tooltip } from "antd";
import styled from "styled-components";
import {
	formatSaudiDate as formatSaudiDateForDisplay,
	formatSaudiHijriDate as formatSaudiHijriDateForDisplay,
	formatSaudiDateTime as formatSaudiDateTimeForDisplay,
	isArabicLanguage as isArabicDateLanguage,
} from "../../utils/saudiDates";

export const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

export const titleCase = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

export const formatMoney = (value) => {
	const amount = Number(value || 0);
	return amount.toLocaleString("en-US", {
		maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
	});
};

export const formatDate = (value, chosenLanguage = "English", options = {}) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	if (
		isArabicDateLanguage(chosenLanguage) &&
		(options.useSaudiDisplay || options.includeHijri || options.includeWeekday)
	) {
		return formatSaudiDateForDisplay(date, {
			language: chosenLanguage,
			includeHijri: options.includeHijri ?? false,
			includeWeekday: options.includeWeekday ?? false,
			month: options.month || "short",
		});
	}
	return date.toLocaleDateString("en-CA");
};

export const formatDateByCalendar = (
	value,
	chosenLanguage = "English",
	calendarMode = "gregorian"
) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	if (calendarMode === "hijri") {
		return formatSaudiHijriDateForDisplay(date, {
			language: chosenLanguage,
			month: isArabicDateLanguage(chosenLanguage) ? "long" : "short",
		});
	}
	return date.toLocaleDateString("en-CA");
};

export const getReservationNights = (reservation = {}) => {
	const checkin = reservation.checkin_date
		? new Date(reservation.checkin_date)
		: null;
	const checkout = reservation.checkout_date
		? new Date(reservation.checkout_date)
		: null;
	const fromDates =
		checkin &&
		checkout &&
		!Number.isNaN(checkin.getTime()) &&
		!Number.isNaN(checkout.getTime())
			? Math.round(
					(checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24)
			  )
			: null;
	if (Number.isFinite(fromDates) && fromDates >= 0) return fromDates;
	return Math.max(Number(reservation.days_of_residence || 0), 0);
};

export const getReservationPricePerDay = (reservation = {}) => {
	const nights = Math.max(getReservationNights(reservation), 1);
	const total = Number(reservation.total_amount || 0);
	return Number.isFinite(total) ? total / nights : 0;
};

export const TableTooltipText = ({ value, max = 20, className = "" }) => {
	const text =
		value === null || value === undefined || value === "" ? "-" : String(value);
	const display = text.length > max ? `${text.slice(0, max)}...` : text;
	const content = (
		<span className={className} dir='auto'>
			{display}
		</span>
	);
	if (text.length <= max) return content;
	return (
		<Tooltip title={<span dir='auto'>{text}</span>} placement='top'>
			{content}
		</Tooltip>
	);
};

export const formatDateTime = (
	value,
	chosenLanguage = "English",
	options = {},
) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	if (
		isArabicDateLanguage(chosenLanguage) &&
		(options.useSaudiDisplay || options.includeHijri || options.includeWeekday)
	) {
		return formatSaudiDateTimeForDisplay(date, {
			language: chosenLanguage,
			includeHijri: options.includeHijri ?? false,
			includeWeekday: options.includeWeekday ?? false,
			month: options.month || "short",
		});
	}
	return `${date.toLocaleDateString("en-CA")} ${date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	})}`;
};

export const isArabicLanguage = (chosenLanguage) =>
	isArabicDateLanguage(chosenLanguage);

export const overallCommonText = {
	en: {
		all: "All",
		allHotels: "All hotels",
		allStatuses: "All statuses",
		allRoles: "All roles",
		index: "#",
		search: "Search",
		reset: "Reset",
		refresh: "Refresh",
		exportExcel: "Export Excel",
		exportingExcel: "Exporting...",
		exportFailed: "Could not export data.",
		noRowsToExport: "No rows available to export.",
		loading: "Loading...",
		previous: "Prev",
		next: "Next",
		page: "Page",
		of: "of",
		hotel: "Hotel",
		hotels: "Hotels",
		owner: "Owner",
		name: "Name",
		email: "Email",
		phone: "Phone",
		role: "Role",
		status: "Status",
		action: "Action",
		created: "Created",
		updated: "Updated",
		singleHotel: "Single Hotel",
		openHotel: "Open Hotel",
		openDashboard: "Open Dashboard",
		openSettings: "Open Settings",
		openHousekeeping: "Open Housekeeping",
		moreDetails: "Details",
		confirmation: "Confirmation",
		guest: "Guest",
		source: "Source",
		payment: "Payment",
		paidAmount: "Paid Amount",
		commission: "Commission",
		roomNumbers: "Room Numbers",
		booked: "Booked",
		bookedAt: "Booked At",
		createdAt: "Created At",
		checkIn: "Check-in",
		checkOut: "Checkout",
		total: "Total",
		totalAmount: "Total Amount",
		nights: "Nights",
		pricePerDay: "Price / Day",
		sortBy: "Sort by",
		sortAscending: "Ascending",
		sortDescending: "Descending",
		gregorianDates: "Gregorian",
		hijriDates: "Hijri",
		rooms: "Rooms",
		totalRooms: "Total Rooms",
		availableRooms: "Available Rooms",
		available: "Available",
		occupied: "Occupied",
		reservations: "Reservations",
		pending: "Pending",
		housekeeping: "Housekeeping",
		settings: "Settings",
		roomTypes: "Room Types",
		photos: "Photos",
		location: "Location",
		data: "Data",
		bank: "Bank",
		done: "Done",
		ready: "Ready",
		active: "Active",
		inactive: "Inactive",
		confirmed: "Confirmed",
		inHouse: "In House",
		cancelled: "Cancelled",
		noShow: "No Show",
		pendingConfirmation: "Pending Confirmation",
		pendingFinanceReview: "Pending Finance Review",
		pendingAgentCommissionApproval: "Pending Agent Approval",
		financeRejected: "Finance Rejected",
		rejected: "Rejected",
		checkedIn: "Checked In",
		checkedOut: "Checked Out",
		open: "Open",
		unfinished: "Unfinished",
		cleaning: "Cleaning",
		finished: "Finished",
		clean: "Clean",
		notAssigned: "Not Assigned",
		notCleaned: "Not Cleaned",
		taskDate: "Task Date",
		assignedTo: "Assigned To",
		cleanedBy: "Cleaned By",
		totalTasks: "Total Tasks",
		systemAdmin: "Hotel System Admin",
		ownerRole: "Owner",
		superAdmin: "Super Admin",
		hotelManager: "Hotel Manager",
		reservationsOfficer: "Reservations Officer",
		externalAgent: "External Agent",
		housekeepingManager: "Housekeeping Manager",
		housekeepingRole: "Housekeeping",
		reception: "Reception",
		finance: "Finance",
		rolePrefix: "Role",
		sar: "SAR",
		noHotelsFound: "No hotels found.",
		noReservationsFound: "No reservations found.",
		noPendingReservationsFound: "No pending reservations found.",
		noAccountsFound: "No accounts found.",
		noSystemAdminAccountsFound: "No Hotel System Admin accounts found.",
		noHousekeepingTasksFound: "No housekeeping tasks found.",
		searchReservationPlaceholder: "Search guest, confirmation, room, hotel",
		searchHousekeepingPlaceholder:
			"Search hotel, room, employee, confirmation",
		searchAccountPlaceholder: "Search name, email, or phone",
		searchAccountCompanyPlaceholder: "Search name, email, phone, company",
		chooseAtLeastOneHotel: "Choose at least one hotel.",
		chooseAccountFirst: "Choose an account first.",
		couldNotCreateSystemAdmin: "Could not create Hotel System Admin.",
		systemAdminCreated: "Hotel System Admin created.",
		couldNotUpdateSystemAdmin: "Could not update Hotel System Admin.",
		systemAdminUpdated: "Hotel System Admin updated.",
		couldNotUpdateAccount: "Could not update account.",
		accountUpdated: "Account updated.",
		saving: "Saving...",
		creating: "Creating...",
		createSystemAdmin: "Create Hotel System Admin",
		updateSystemAdmin: "Update Hotel System Admin",
		activate: "Activate",
		deactivate: "Deactivate",
		password: "Password",
		newPassword: "New Password",
		findAccount: "Find Account",
		chooseAccount: "Choose account",
		leavePasswordBlank: "Leave blank to keep current password",
		loadingHotels: "Loading hotels...",
		loadingAccounts: "Loading accounts...",
		noHotelsForScope: "No hotels are available for this scope.",
		systemAdminScopeNote:
			"Hotel System Admin accounts are hotel employees with owner-like overall access only for the hotels selected below.",
	},
	ar: {
		index: "#",
		exportExcel: "تصدير Excel",
		exportingExcel: "جار التصدير...",
		exportFailed: "تعذر تصدير البيانات.",
		noRowsToExport: "لا توجد بيانات للتصدير.",
		payment: "الدفع",
		paidAmount: "المبلغ المدفوع",
		commission: "العمولة",
		roomNumbers: "أرقام الغرف",
		all: "الكل",
		allHotels: "كل الفنادق",
		allStatuses: "كل الحالات",
		allRoles: "كل الأدوار",
		search: "بحث",
		reset: "إعادة ضبط",
		refresh: "تحديث",
		loading: "جار التحميل...",
		previous: "السابق",
		next: "التالي",
		page: "صفحة",
		of: "من",
		hotel: "الفندق",
		hotels: "الفنادق",
		owner: "المالك",
		name: "الاسم",
		email: "البريد الإلكتروني",
		phone: "الهاتف",
		role: "الدور",
		status: "الحالة",
		action: "الإجراء",
		created: "تاريخ الإنشاء",
		updated: "آخر تحديث",
		singleHotel: "مسار الفندق",
		openHotel: "فتح الفندق",
		openDashboard: "فتح لوحة الفندق",
		openSettings: "فتح الإعدادات",
		openHousekeeping: "فتح النظافة",
		moreDetails: "تفاصيل",
		confirmation: "رقم التأكيد",
		guest: "الضيف",
		source: "المصدر",
		booked: "تاريخ الحجز",
		bookedAt: "تاريخ الحجز",
		createdAt: "تاريخ الإنشاء",
		checkIn: "الوصول",
		checkOut: "المغادرة",
		total: "الإجمالي",
		totalAmount: "إجمالي المبلغ",
		nights: "الليالي",
		pricePerDay: "سعر الليلة",
		sortBy: "رتب حسب",
		sortAscending: "تصاعدي",
		sortDescending: "تنازلي",
		gregorianDates: "ميلادي",
		hijriDates: "هجري",
		rooms: "الغرف",
		totalRooms: "إجمالي الغرف",
		availableRooms: "الغرف المتاحة",
		available: "المتاح",
		occupied: "المشغول",
		reservations: "الحجوزات",
		pending: "معلق",
		housekeeping: "النظافة",
		settings: "الإعدادات",
		roomTypes: "أنواع الغرف",
		photos: "الصور",
		location: "الموقع",
		data: "البيانات",
		bank: "البنك",
		done: "تم",
		ready: "جاهز",
		active: "نشط",
		inactive: "غير نشط",
		confirmed: "مؤكد",
		inHouse: "داخل الفندق",
		cancelled: "ملغي",
		noShow: "لم يحضر",
		pendingConfirmation: "بانتظار التأكيد",
		pendingFinanceReview: "بانتظار مراجعة المالية",
		pendingAgentCommissionApproval: "بانتظار موافقة الوكيل",
		financeRejected: "مرفوض من المالية",
		rejected: "مرفوض",
		checkedIn: "تم تسجيل الدخول",
		checkedOut: "تم تسجيل الخروج",
		open: "مفتوح",
		unfinished: "غير مكتمل",
		cleaning: "قيد التنظيف",
		finished: "مكتمل",
		clean: "نظيف",
		notAssigned: "غير معين",
		notCleaned: "لم يتم التنظيف",
		taskDate: "تاريخ المهمة",
		assignedTo: "معين إلى",
		cleanedBy: "تم التنظيف بواسطة",
		totalTasks: "إجمالي المهام",
		systemAdmin: "مسؤول نظام الفندق",
		ownerRole: "المالك",
		superAdmin: "المدير العام",
		hotelManager: "مدير الفندق",
		reservationsOfficer: "موظف الحجوزات",
		externalAgent: "وكيل خارجي",
		housekeepingManager: "مدير النظافة",
		housekeepingRole: "موظف النظافة",
		reception: "الاستقبال",
		finance: "المالية",
		rolePrefix: "دور",
		sar: "ر.س",
		noHotelsFound: "لا توجد فنادق.",
		noReservationsFound: "لا توجد حجوزات.",
		noPendingReservationsFound: "لا توجد حجوزات معلقة.",
		noAccountsFound: "لا توجد حسابات.",
		noSystemAdminAccountsFound: "لا توجد حسابات مسؤول نظام الفندق.",
		noHousekeepingTasksFound: "لا توجد مهام نظافة.",
		searchReservationPlaceholder: "ابحث بالضيف، رقم التأكيد، الغرفة، الفندق",
		searchHousekeepingPlaceholder:
			"ابحث بالفندق أو الغرفة أو الموظف أو رقم التأكيد",
		searchAccountPlaceholder: "ابحث بالاسم أو البريد الإلكتروني أو الهاتف",
		searchAccountCompanyPlaceholder:
			"ابحث بالاسم أو البريد الإلكتروني أو الهاتف أو الشركة",
		chooseAtLeastOneHotel: "اختر فندقا واحدا على الأقل.",
		chooseAccountFirst: "اختر حسابا أولا.",
		couldNotCreateSystemAdmin: "تعذر إنشاء مسؤول نظام الفندق.",
		systemAdminCreated: "تم إنشاء مسؤول نظام الفندق.",
		couldNotUpdateSystemAdmin: "تعذر تحديث مسؤول نظام الفندق.",
		systemAdminUpdated: "تم تحديث مسؤول نظام الفندق.",
		couldNotUpdateAccount: "تعذر تحديث الحساب.",
		accountUpdated: "تم تحديث الحساب.",
		saving: "جار الحفظ...",
		creating: "جار الإنشاء...",
		createSystemAdmin: "إنشاء مسؤول نظام الفندق",
		updateSystemAdmin: "تحديث مسؤول نظام الفندق",
		activate: "تفعيل",
		deactivate: "إلغاء التفعيل",
		password: "كلمة المرور",
		newPassword: "كلمة مرور جديدة",
		findAccount: "البحث عن حساب",
		chooseAccount: "اختر الحساب",
		leavePasswordBlank: "اتركه فارغا للإبقاء على كلمة المرور الحالية",
		loadingHotels: "جار تحميل الفنادق...",
		loadingAccounts: "جار تحميل الحسابات...",
		noHotelsForScope: "لا توجد فنادق متاحة لهذا النطاق.",
		systemAdminScopeNote:
			"مسؤول نظام الفندق موظف بصلاحيات واسعة داخل الفنادق المحددة أدناه فقط، وليس مسؤول منصة.",
	},
};

export const getOverallText = (chosenLanguage) =>
	overallCommonText[isArabicLanguage(chosenLanguage) ? "ar" : "en"];

export const roleLabel = (account = {}, chosenLanguage) => {
	const text = getOverallText(chosenLanguage);
	const description = String(account.roleDescription || "").toLowerCase();
	if (description === "systemadmin") return text.systemAdmin;
	if (description === "hotelmanager") return text.hotelManager;
	if (description === "reservationemployee") return text.reservationsOfficer;
	if (description === "ordertaker") return text.externalAgent;
	if (description === "housekeepingmanager") return text.housekeepingManager;
	if (description === "housekeeping") return text.housekeepingRole;
	if (description === "reception") return text.reception;
	if (description === "finance") return text.finance;
	if (description) return titleCase(description);
	if (Number(account.role) === 10000) return text.systemAdmin;
	if (Number(account.role) === 2000) return text.ownerRole;
	if (Number(account.role) === 1000) return text.superAdmin;
	return `${text.rolePrefix} ${account.role || ""}`;
};

export const localizeStatus = (status = "", chosenLanguage) => {
	const text = getOverallText(chosenLanguage);
	const normalized = String(status || "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ");
	if (!normalized) return "-";
	const map = {
		active: text.active,
		inactive: text.inactive,
		confirmed: text.confirmed,
		pending: text.pending,
		"pending confirmation": text.pendingConfirmation,
		"pending finance review": text.pendingFinanceReview,
		"pending agent commission approval":
			text.pendingAgentCommissionApproval,
		"finance rejected": text.financeRejected,
		rejected: text.rejected,
		cancelled: text.cancelled,
		canceled: text.cancelled,
		"no show": text.noShow,
		inhouse: text.inHouse,
		"in house": text.inHouse,
		"checked in": text.checkedIn,
		"checked out": text.checkedOut,
		ready: text.ready,
		done: text.done,
		open: text.open,
		unfinished: text.unfinished,
		cleaning: text.cleaning,
		finished: text.finished,
		clean: text.clean,
	};
	return isArabicLanguage(chosenLanguage) ? map[normalized] || status || "-" : status || "-";
};

export const statusTone = (status = "") => {
	const normalized = String(status || "")
		.toLowerCase()
		.replace(/[_-]+/g, " ");
	if (/cancel|reject|inactive|no[-_\s]?show/.test(normalized)) return "red";
	if (/early checked out|checked out|closed/.test(normalized)) return "green";
	if (/inhouse|in house|checked in/.test(normalized)) return "softGreen";
	if (/agent|commission/.test(normalized)) return "purple";
	if (/pending|review|unfinished|cleaning/.test(normalized)) return "orange";
	if (/confirm|approved/.test(normalized)) return "blue";
	if (/active|finish|done|clean/.test(normalized)) return "green";
	return "slate";
};

export const emptyOption = { value: "", label: "All" };

export const OVERALL_PAGE_SIZE = 15;

export const pageRowNumber = (
	page = 1,
	index = 0,
	limit = OVERALL_PAGE_SIZE
) => {
	const safePage = Math.max(Number(page) || 1, 1);
	const safeLimit = Math.max(Number(limit) || OVERALL_PAGE_SIZE, 1);
	return (safePage - 1) * safeLimit + index + 1;
};

export const buildOwnerParams = (ownerId = "") =>
	ownerId ? { ownerId } : {};

export const singleHotelRoute = (ownerId = "", hotelId = "", section = "dashboard") => {
	const owner = normalizeId(ownerId);
	const hotel = normalizeId(hotelId);
	if (!owner || !hotel) return "";

	if (section === "reservations") {
		return `/hotel-management/new-reservation/${owner}/${hotel}?list=&page=1`;
	}
	if (section === "pending") {
		return `/hotel-management/new-reservation/${owner}/${hotel}?pendingConfirmation`;
	}
	if (section === "housekeeping") {
		return `/hotel-management/house-keeping/${owner}/${hotel}`;
	}
	if (section === "settings") {
		return `/hotel-management/settings/${owner}/${hotel}?activeTab=HotelDetails&currentStep=0`;
	}
	if (section === "heatmap") {
		return `/hotel-management/new-reservation/${owner}/${hotel}?heatmap`;
	}
	return `/hotel-management/dashboard/${owner}/${hotel}`;
};

export const reservationSingleHotelRoute = (
	reservation = {},
	fallbackOwnerId = "",
	section = "reservations"
) => {
	const hotelId = normalizeId(reservation.hotelId);
	const ownerId = normalizeId(
		reservation.hotelOwnerId ||
			reservation.ownerId ||
			reservation.belongsTo ||
			fallbackOwnerId
	);
	if (!hotelId || !ownerId) return "";

	const params = new URLSearchParams();
	if (section === "pending") {
		params.set("pendingConfirmation", "");
	} else {
		params.set("list", "");
		params.set("page", "1");
	}
	if (reservation.confirmation_number) {
		params.set("search", reservation.confirmation_number);
	}
	if (reservation._id) params.set("reservationId", reservation._id);
	return `/hotel-management/new-reservation/${ownerId}/${hotelId}?${params.toString()}`;
};

export const OverallPageShell = styled.section`
	display: grid;
	gap: 1rem;
	min-width: 0;
	max-width: 100%;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	font-family: ${(props) =>
		props.$isRTL
			? `"Droid Arabic Kufi", "Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif`
			: `"Inter", "Segoe UI", Arial, sans-serif`};
	letter-spacing: 0;

	@media (max-width: 640px) {
		gap: 0.8rem;
	}
`;

export const OverallHeader = styled.header`
	display: flex;
	align-items: flex-start;
	justify-content: center;
	gap: 1rem;
	flex-wrap: wrap;
	min-width: 0;
	padding: 12px 16px;
	border: 1px solid #b8cce3;
	border-radius: 0;
	background:
		linear-gradient(115deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.96)),
		linear-gradient(180deg, #dcecff 0%, #f8fbff 100%);
	box-shadow:
		0 1px 0 rgba(16, 32, 51, 0.1),
		0 8px 22px rgba(16, 32, 51, 0.06);
	text-align: center;

	> div {
		min-width: 0;
		max-width: 100%;
	}

	h2 {
		margin: 0;
		color: var(--pms-metal-blue-dark, #102033);
		font-size: clamp(1.18rem, 1.8vw, 1.55rem);
		font-weight: 950;
		overflow-wrap: anywhere;
		line-height: 1.45;
	}

	p {
		margin: 0.25rem 0 0;
		color: #536f8d;
		font-size: 0.88rem;
		font-weight: 850;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}

	@media (max-width: 640px) {
		padding: 0.82rem;
		border-radius: 10px;

		h2 {
			font-size: 1.05rem;
		}

		p {
			font-size: 0.78rem;
		}
	}
`;

export const OverallCenteredSearch = styled.div`
	display: flex;
	justify-content: center;
	width: 100%;
	min-width: 0;
	padding: 0 0.25rem;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	.overall-centered-search-input {
		width: min(50%, 720px);
		min-width: min(360px, 100%);
		max-width: 100%;
	}

	.overall-centered-search-input .ant-input,
	.overall-centered-search-input.ant-input {
		min-height: 44px;
		border-color: #cfd3da;
		border-radius: 6px;
		color: #202334;
		font-size: 0.92rem;
		font-weight: 850;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}

	.overall-centered-search-input.ant-input-affix-wrapper {
		min-height: 44px;
		border-color: #cfd3da;
		border-radius: 6px;
		background: #ffffff;
		box-shadow: 0 1px 0 rgba(16, 24, 40, 0.08);
	}

	.overall-centered-search-input.ant-input-affix-wrapper-focused,
	.overall-centered-search-input.ant-input-affix-wrapper:focus-within {
		border-color: var(--pms-metal-purple-lift, #8d4c9d);
		box-shadow: 0 0 0 3px rgba(100, 22, 110, 0.14);
	}

	@media (max-width: 720px) {
		.overall-centered-search-input {
			width: 95%;
			min-width: 0;
		}
	}
`;

export const OverallToolbar = styled.form`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 10px;
	min-width: 0;
	padding: 12px 14px;
	border: 1px solid #dcc5e2;
	border-radius: 0;
	background: linear-gradient(135deg, #ffffff 0%, #fbf7ff 100%);
	box-shadow:
		0 1px 0 rgba(80, 23, 96, 0.08),
		0 8px 22px rgba(40, 16, 52, 0.05);

	> input,
	> select {
		min-width: 0;
		min-height: 40px;
		width: 100%;
		border: 1px solid #cfd3da;
		border-radius: 2px;
		background: #fbfbfc;
		color: #202334;
		font-size: 0.82rem;
		font-weight: 850;
		padding: 0 12px;
		outline: none;
		text-align: inherit;
	}

	> input:focus,
	> select:focus {
		border-color: var(--pms-metal-purple-lift, #8d4c9d);
		box-shadow: 0 0 0 3px rgba(100, 22, 110, 0.14);
		background: #fff;
	}

	.overall-filter-select {
		min-width: 0;
		width: 100%;
	}

	.overall-date-picker.ant-picker {
		min-width: 0;
		min-height: 40px;
		width: 100%;
		border-color: #cfd3da;
		border-radius: 2px;
		background: #fbfbfc;
		color: #202334;
		font-size: 0.82rem;
		font-weight: 850;
		text-align: inherit;
	}

	.overall-date-picker .ant-picker-input > input {
		color: #202334;
		font-size: 0.82rem;
		font-weight: 850;
		text-align: inherit;
	}

	.overall-filter-select .ant-select-selector {
		min-height: 40px !important;
		border-color: #cfd3da !important;
		border-radius: 2px !important;
		background: #fbfbfc !important;
		color: #202334;
		font-size: 0.82rem;
		font-weight: 850;
		text-align: inherit;
	}

	.overall-filter-select .ant-select-selection-placeholder,
	.overall-filter-select .ant-select-selection-item {
		color: #202334;
		font-weight: 850;
		text-align: inherit;
	}

	.overall-filter-select .ant-select-selection-overflow {
		align-items: center;
		min-height: 38px;
	}

	.overall-filter-select.ant-select-focused .ant-select-selector {
		border-color: var(--pms-metal-purple-lift, #8d4c9d) !important;
		box-shadow: 0 0 0 3px rgba(100, 22, 110, 0.14) !important;
		background: #fff !important;
	}

	.overall-date-picker.ant-picker-focused {
		border-color: var(--pms-metal-purple-lift, #8d4c9d);
		box-shadow: 0 0 0 3px rgba(100, 22, 110, 0.14);
		background: #fff;
	}

	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.42rem;
		min-width: 0;
		min-height: 40px;
		border: 1px solid rgba(141, 76, 157, 0.86);
		border-radius: 5px;
		background: var(--pms-metal-purple-bg, linear-gradient(135deg, #24102d, #64166e));
		color: #fff;
		font-weight: 950;
		padding: 0 18px;
		white-space: nowrap;
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.18),
			0 8px 18px rgba(80, 23, 96, 0.2);
		transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
	}

	button:hover {
		filter: brightness(1.07) saturate(1.05);
		transform: translateY(-1px);
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.22),
			0 12px 24px rgba(80, 23, 96, 0.28);
	}

	button:disabled {
		opacity: 0.58;
		cursor: not-allowed;
	}

	button.secondary {
		border: 1px solid #d9b8df;
		background: linear-gradient(180deg, #ffffff 0%, #fbf6ff 100%);
		color: #3b1248;
		box-shadow: 0 5px 14px rgba(80, 23, 96, 0.08);
	}

	button.secondary:hover {
		background: #fbf6ff;
	}

	@media (max-width: 720px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		padding: 0.7rem;
	}

	@media (max-width: 480px) {
		grid-template-columns: 1fr;

		> input,
		> select,
		.overall-filter-select,
		.overall-date-picker,
		button {
			min-height: 42px;
			font-size: 0.82rem;
		}
	}
`;

export const OverallCards = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 0.75rem;

	@media (max-width: 560px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.55rem;
	}

	@media (max-width: 390px) {
		grid-template-columns: 1fr;
	}
`;

export const OverallCard = styled.article`
	min-height: 96px;
	display: grid;
	align-content: center;
	gap: 0.25rem;
	padding: 0.9rem;
	border: 1px solid rgba(134, 92, 146, 0.34);
	border-radius: 8px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(246, 249, 252, 0.98) 42%, rgba(234, 239, 246, 0.96) 100%),
		linear-gradient(155deg, rgba(255, 255, 255, 0.9), rgba(120, 141, 166, 0.16));
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.98),
		inset 0 -1px 0 rgba(88, 101, 121, 0.08),
		0 12px 26px rgba(32, 43, 58, 0.1);
	position: relative;
	overflow: hidden;
	transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;

	&::before {
		content: "";
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			linear-gradient(118deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0.08) 32%, transparent 54%),
			radial-gradient(circle at 18% 0%, rgba(141, 76, 157, 0.14), transparent 42%);
	}

	> * {
		position: relative;
		z-index: 1;
	}

	${(props) =>
		props.$clickable
			? `
		cursor: pointer;

		&:hover,
		&:focus-visible {
			border-color: rgba(141, 76, 157, 0.68);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 1),
				0 16px 32px rgba(55, 36, 72, 0.16);
			transform: translateY(-2px);
			outline: none;
		}
	`
			: ""}

	strong {
		color: #3d2448;
		font-size: 1.5rem;
		line-height: 1;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.78);
	}

	span {
		color: #475467;
		font-size: 0.78rem;
		font-weight: 900;
	}

	@media (max-width: 560px) {
		min-height: 82px;
		padding: 0.75rem;
		border-radius: 10px;

		strong {
			font-size: 1.18rem;
		}

		span {
			font-size: 0.68rem;
			line-height: 1.25;
		}
	}
`;

export const OverallTableWrap = styled.div`
	width: 100%;
	max-width: 100%;
	overflow-x: auto;
	overflow-y: hidden;
	-webkit-overflow-scrolling: touch;
	border: 1px solid #e6d3eb;
	border-radius: 8px;
	background: #fff;
	box-shadow: 0 8px 22px rgba(40, 16, 52, 0.06);

	table {
		width: 100%;
		min-width: 1180px;
		border-collapse: separate;
		border-spacing: 0;
	}

	th,
	td {
		padding: 8px 10px;
		border-right: 1px solid #edf2f7;
		border-bottom: 1px solid #edf2f7;
		color: #101828;
		font-size: 12.5px;
		font-weight: 800;
		text-align: start;
		vertical-align: middle;
		white-space: nowrap;
		line-height: 1.35;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--pms-table-header-bg, linear-gradient(180deg, #fbf6ff 0%, #eadcf3 100%));
		color: var(--pms-table-header-color, #24102d);
		font-size: 13.5px;
		font-weight: 900;
		text-align: start;
		border-bottom: 1px solid var(--pms-table-header-border, #d9b8df);
	}

	td:first-child,
	th:first-child {
		text-align: center;
		width: 54px;
	}

	tbody tr:nth-child(even) td {
		background: #fcfdff;
	}

	tbody tr:hover td {
		background: #fbf6ff;
	}

	.hotel-cell,
	.guest-cell {
		font-weight: 950;
		color: #111827;
	}

	.source-cell {
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.table-truncate {
		display: inline-block;
		max-width: 230px;
		vertical-align: middle;
		overflow: hidden;
	}

	table.reservation-list-table {
		table-layout: fixed;
	}

	table.reservation-list-table td {
		overflow: hidden;
		padding-inline: 7px;
		text-overflow: ellipsis;
	}

	table.reservation-list-table th {
		overflow: visible;
		padding-inline: 8px;
		text-overflow: clip;
		white-space: nowrap;
	}

	table.reservation-list-table .table-truncate,
	table.reservation-list-table button.link-btn,
	table.reservation-list-table a.link-btn {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	table.reservation-list-table .status-pill {
		max-width: 100%;
		min-width: 0;
		padding-inline: 0.42rem;
	}

	table.reservation-list-table .sortable-heading {
		display: inline-flex;
		align-items: center;
		justify-content: inherit;
		gap: 0.22rem;
		max-width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font: inherit;
		font-weight: 950;
		padding: 0;
		white-space: nowrap;
	}

	table.reservation-list-table .sortable-heading:hover {
		color: #f3dcff;
	}

	table.reservation-list-table .sort-arrow {
		color: #f4c84f;
		font-size: 0.72rem;
		line-height: 1;
	}

	@media (min-width: 992px) {
		table.reservation-list-table {
			min-width: 0;
		}

		table.reservation-list-table th,
		table.reservation-list-table td {
			font-size: 0.74rem;
			line-height: 1.32;
		}

		table.reservation-list-table th {
			font-size: 0.8rem;
		}

		table.reservation-main-table th:nth-child(1),
		table.reservation-main-table td:nth-child(1) {
			width: 2.6%;
		}

		table.reservation-main-table th:nth-child(2),
		table.reservation-main-table td:nth-child(2) {
			width: 6.7%;
		}

		table.reservation-main-table th:nth-child(3),
		table.reservation-main-table td:nth-child(3) {
			width: 6.2%;
		}

		table.reservation-main-table th:nth-child(4),
		table.reservation-main-table td:nth-child(4) {
			width: 12%;
		}

		table.reservation-main-table th:nth-child(5),
		table.reservation-main-table td:nth-child(5) {
			width: 9.7%;
		}

		table.reservation-main-table th:nth-child(6),
		table.reservation-main-table td:nth-child(6) {
			width: 7.4%;
		}

		table.reservation-main-table th:nth-child(7),
		table.reservation-main-table td:nth-child(7) {
			width: 5.8%;
		}

		table.reservation-main-table th:nth-child(8),
		table.reservation-main-table td:nth-child(8),
		table.reservation-main-table th:nth-child(9),
		table.reservation-main-table td:nth-child(9),
		table.reservation-main-table th:nth-child(10),
		table.reservation-main-table td:nth-child(10) {
			width: 5.7%;
		}

		table.reservation-main-table th:nth-child(11),
		table.reservation-main-table td:nth-child(11) {
			width: 3.7%;
		}

		table.reservation-main-table th:nth-child(12),
		table.reservation-main-table td:nth-child(12) {
			width: 6.8%;
		}

		table.reservation-main-table th:nth-child(13),
		table.reservation-main-table td:nth-child(13) {
			width: 6.8%;
		}

		table.reservation-main-table th:nth-child(14),
		table.reservation-main-table td:nth-child(14) {
			width: 6.5%;
		}

		table.reservation-main-table th:nth-child(15),
		table.reservation-main-table td:nth-child(15) {
			width: 4.3%;
		}

		table.reservation-pending-table th:nth-child(1),
		table.reservation-pending-table td:nth-child(1) {
			width: 2.8%;
		}

		table.reservation-pending-table th:nth-child(2),
		table.reservation-pending-table td:nth-child(2) {
			width: 7%;
		}

		table.reservation-pending-table th:nth-child(3),
		table.reservation-pending-table td:nth-child(3) {
			width: 6.4%;
		}

		table.reservation-pending-table th:nth-child(4),
		table.reservation-pending-table td:nth-child(4) {
			width: 13.4%;
		}

		table.reservation-pending-table th:nth-child(5),
		table.reservation-pending-table td:nth-child(5) {
			width: 10.8%;
		}

		table.reservation-pending-table th:nth-child(6),
		table.reservation-pending-table td:nth-child(6) {
			width: 9%;
		}

		table.reservation-pending-table th:nth-child(7),
		table.reservation-pending-table td:nth-child(7) {
			width: 6.2%;
		}

		table.reservation-pending-table th:nth-child(8),
		table.reservation-pending-table td:nth-child(8),
		table.reservation-pending-table th:nth-child(9),
		table.reservation-pending-table td:nth-child(9),
		table.reservation-pending-table th:nth-child(10),
		table.reservation-pending-table td:nth-child(10) {
			width: 6.1%;
		}

		table.reservation-pending-table th:nth-child(11),
		table.reservation-pending-table td:nth-child(11) {
			width: 3.8%;
		}

		table.reservation-pending-table th:nth-child(12),
		table.reservation-pending-table td:nth-child(12) {
			width: 7.2%;
		}

		table.reservation-pending-table th:nth-child(13),
		table.reservation-pending-table td:nth-child(13) {
			width: 7.2%;
		}

		table.reservation-pending-table th:nth-child(14),
		table.reservation-pending-table td:nth-child(14) {
			width: 5.1%;
		}
	}

	.date-cell,
	.amount-cell {
		font-family: "Segoe UI", Tahoma, Arial, sans-serif;
		text-align: center;
	}

	.date-cell {
		direction: inherit;
		line-height: 1.45;
		unicode-bidi: plaintext;
	}

	.date-cell .date-truncate {
		display: inline-block;
		max-width: 16ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		vertical-align: middle;
	}

	.amount-cell {
		direction: ltr;
		font-weight: 950;
		min-width: 82px;
		overflow: visible !important;
		text-overflow: clip !important;
		white-space: nowrap;
	}

	button.link-btn,
	a.link-btn {
		border: 0;
		background: transparent;
		color: #0050b3;
		font-weight: 900;
		text-decoration: underline;
		text-underline-offset: 3px;
		padding: 2px 0;
		text-align: start;
	}

	button.link-btn:hover,
	a.link-btn:hover {
		color: var(--pms-metal-purple, #64166e);
	}

	@media (max-width: 720px) {
		border-radius: 8px;

		table {
			min-width: 980px;
		}

		th,
		td {
			padding: 8px 9px;
			font-size: 0.7rem;
		}

		th {
			font-size: 0.7rem;
		}
	}

	@media (max-width: 420px) {
		margin-inline: 0;
		width: 100%;

		table {
			min-width: 920px;
		}
	}
`;

export const ReservationTableControls = styled.div`
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 0.7rem 1rem;
	padding: 0.75rem 0.9rem;
	border: 1px solid #e6d3eb;
	border-radius: 8px;
	background: linear-gradient(135deg, #ffffff 0%, #fbf7ff 100%);
	box-shadow: 0 4px 16px rgba(40, 16, 52, 0.05);

	.control-group {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
		min-width: 0;
	}

	.control-label {
		color: #344054;
		font-size: 0.78rem;
		font-weight: 950;
	}

	.summary-control {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	button {
		min-height: 34px;
		border: 1px solid #d0d5dd;
		border-radius: 0;
		background: #f8fafc;
		color: #1f2937;
		padding: 0.35rem 0.85rem;
		font-size: 0.78rem;
		font-weight: 950;
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	}

	button:hover {
		border-color: var(--pms-metal-purple-lift, #8d4c9d);
		color: var(--pms-metal-purple, #64166e);
	}

	button.active {
		border-color: var(--pms-metal-purple-lift, #8d4c9d);
		background: var(--pms-metal-purple-bg, linear-gradient(135deg, #24102d, #64166e));
		color: #ffffff;
		box-shadow: 0 8px 18px rgba(80, 23, 96, 0.2);
	}

	button.calendar-hijri.active {
		border-color: #079b35;
		background: #079b35;
	}

	button.summary-trigger {
		min-width: 148px;
		border-color: rgba(141, 76, 157, 0.88);
		background: var(--pms-metal-purple-bg, linear-gradient(135deg, #24102d, #64166e));
		color: #ffffff;
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.18),
			0 10px 22px rgba(80, 23, 96, 0.22);
		pointer-events: auto;
	}

	button.summary-trigger:hover {
		border-color: rgba(243, 220, 255, 0.9);
		filter: brightness(1.06) saturate(1.05);
		color: #ffffff;
	}

	@media (max-width: 1100px) {
		.summary-control {
			position: static;
			order: -1;
			width: 100%;
			transform: none;
		}
	}

	@media (max-width: 640px) {
		align-items: stretch;

		.control-group {
			width: 100%;
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.control-label {
			grid-column: 1 / -1;
		}

		.summary-control {
			display: grid;
			width: 100%;
		}

		button {
			width: 100%;
		}
	}
`;

export const StatusPill = styled.span.attrs((props) => ({
	className: ["status-pill", props.className].filter(Boolean).join(" "),
}))`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.34rem;
	min-height: 26px;
	min-width: 78px;
	padding: 0.2rem 0.66rem;
	border: 1px solid
		${(props) =>
			props.$tone === "red"
				? "#d45b68"
				: props.$tone === "orange"
				  ? "#d89b2e"
				  : props.$tone === "green"
				    ? "#14a064"
				    : props.$tone === "softGreen"
				      ? "#87d6a0"
				    : props.$tone === "blue"
				      ? "#5b8bdc"
				      : props.$tone === "purple"
				        ? "#b47dc2"
				        : "#aab2c0"};
	border-radius: 999px;
	background: ${(props) =>
		props.$tone === "red"
			? "linear-gradient(135deg, #7f1d1d 0%, #c33546 100%)"
			: props.$tone === "orange"
			  ? "linear-gradient(135deg, #fff3d8 0%, #f7bf4b 100%)"
			  : props.$tone === "green"
			    ? "linear-gradient(135deg, #064e3b 0%, #0fa66b 100%)"
			    : props.$tone === "softGreen"
			      ? "linear-gradient(135deg, #eefbf3 0%, #d8f7e4 100%)"
			    : props.$tone === "blue"
			      ? "linear-gradient(135deg, #eef4ff 0%, #dfeaff 100%)"
			      : props.$tone === "purple"
			        ? "linear-gradient(135deg, #fffaff 0%, #ecd9f3 100%)"
			        : "linear-gradient(135deg, #f7f8fb 0%, #e9edf7 100%)"};
	color: ${(props) =>
		props.$tone === "red" || props.$tone === "green"
			? "#ffffff"
			: props.$tone === "orange"
			  ? "#4c3000"
			  : props.$tone === "softGreen"
			    ? "#08722c"
			    : props.$tone === "blue"
			      ? "#1d4f9d"
			      : props.$tone === "purple"
			        ? "#5d1d6e"
			        : "#263452"};
	font-size: 0.72rem;
	font-weight: 950;
	line-height: 1.25;
	box-shadow:
		inset 0 1px rgba(255, 255, 255, 0.28),
		0 4px 10px rgba(40, 16, 52, 0.08);

	&::before {
		content: "";
		width: 7px;
		height: 7px;
		flex: 0 0 7px;
		border-radius: 999px;
		background: ${(props) =>
			props.$tone === "red"
				? "#ffd1d6"
				: props.$tone === "orange"
				  ? "#7a4c00"
				  : props.$tone === "green"
				    ? "#c9ffe1"
				    : props.$tone === "softGreen"
				      ? "#14a064"
				      : props.$tone === "blue"
				        ? "#356ed1"
				        : props.$tone === "purple"
				          ? "#8d4c9d"
				          : "#6d7a99"};
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.28);
	}
`;

export const EmptyState = styled.div`
	padding: 1.4rem;
	border: 1px dashed #b8dcff;
	border-radius: 10px;
	background: #f7fbff;
	color: #47627d;
	font-weight: 900;
	text-align: center;
	overflow-wrap: anywhere;

	@media (max-width: 560px) {
		padding: 1rem;
		font-size: 0.82rem;
	}
`;

export const Pager = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-wrap: wrap;
	gap: 0.45rem;
	padding: 0.25rem 0;

	button {
		min-width: 40px;
		min-height: 36px;
		border: 1px solid #bfd7f4;
		border-radius: 8px;
		background: #ffffff;
		color: #0f315f;
		font-size: 0.8rem;
		font-weight: 950;
		box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
		transition: border-color 0.15s ease, background 0.15s ease,
			color 0.15s ease, transform 0.15s ease;
	}

	button:not(:disabled):hover {
		border-color: var(--pms-metal-purple-lift, #8d4c9d);
		background: #fbf6ff;
		color: var(--pms-metal-purple, #64166e);
		transform: translateY(-1px);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	span {
		color: #47627d;
		font-weight: 900;
	}

	.pager-summary {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 36px;
		padding: 0 0.8rem;
		border: 1px solid #d7e7f8;
		border-radius: 999px;
		background: linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%);
		color: #35516d;
		font-size: 0.86rem;
		font-weight: 900;
		white-space: nowrap;
	}

	.pager-summary strong {
		color: #0b5cad;
		font-size: 0.95rem;
	}

	.pager-summary small {
		color: #667085;
		font-size: 0.75rem;
		font-weight: 850;
	}

	@media (max-width: 560px) {
		justify-content: center;

		button {
			flex: 1 1 42px;
			min-height: 38px;
		}

		.pager-summary {
			order: -1;
			justify-content: center;
			width: 100%;
		}
	}
`;

export const ActionButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.35rem;
	min-width: 0;
	min-height: 32px;
	border: 1px solid
		${(props) =>
			props.$danger ? "#b00000" : props.$success ? "#009b2b" : "#8d4c9d"};
	border-radius: 2px;
	background: ${(props) =>
		props.$danger
			? "#b00000"
			: props.$success
			  ? "#009b2b"
			  : "var(--pms-metal-purple-bg, linear-gradient(135deg, #24102d, #64166e))"};
	color: #fff;
	font-weight: 950;
	padding: 0.34rem 0.82rem;
	text-align: center;
	line-height: 1.2;

	&:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	&:not(:disabled):hover {
		background: ${(props) =>
			props.$danger
				? "#930000"
				: props.$success
				  ? "#008022"
				  : "var(--pms-metal-purple-bg, linear-gradient(135deg, #24102d, #64166e))"};
		border-color: ${(props) =>
			props.$danger ? "#930000" : props.$success ? "#008022" : "#f3dcff"};
		filter: ${(props) => (props.$danger || props.$success ? "none" : "brightness(1.06)")};
	}

	@media (max-width: 480px) {
		width: 100%;
		min-height: 42px;
	}
`;

export const OverallFormPanel = styled.form`
	display: grid;
	gap: 0.85rem;
	padding: 1rem;
	border: 1px solid rgba(16, 24, 40, 0.08);
	border-radius: 8px;
	background: #fff;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);

	label {
		display: grid;
		gap: 0.35rem;
		margin: 0;
		color: #18212f;
		font-size: 0.78rem;
		font-weight: 900;
		text-align: start;
	}

	input,
	select {
		min-width: 0;
		min-height: 40px;
		width: 100%;
		border: 1px solid #d0d5dd;
		border-radius: 8px;
		background: #fff;
		color: #101828;
		font-size: 14px;
		font-weight: 700;
		padding: 0 12px;
		outline: none;
	}

	input:focus,
	select:focus {
		border-color: #1e88e5;
		box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.12);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 0.75rem;
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.55rem;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		padding: 0.8rem;
		border-radius: 10px;

		.form-grid {
			grid-template-columns: 1fr;
			gap: 0.65rem;
		}

		.form-actions {
			justify-content: stretch;
		}
	}
`;

export const CheckboxGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	gap: 0.5rem;

	label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.55rem;
		min-height: 44px;
		padding: 0.55rem 0.65rem;
		border: 1px solid #d7e8fb;
		border-radius: 8px;
		background: #f7fbff;
		color: #18212f;
		font-size: 0.82rem;
		font-weight: 900;
	}

	input {
		width: 17px;
		height: 17px;
		min-height: auto;
		accent-color: #1e88e5;
	}

	@media (max-width: 560px) {
		grid-template-columns: 1fr;

		label {
			min-height: 46px;
		}
	}
`;

export const InlineNote = styled.div`
	padding: 0.65rem 0.75rem;
	border: 1px solid ${(props) => (props.$error ? "#ff7875" : "#b8dcff")};
	border-radius: 10px;
	background: ${(props) => (props.$error ? "#fff1f0" : "#eef7ff")};
	color: ${(props) => (props.$error ? "#a8071a" : "#0b5cad")};
	font-size: 0.82rem;
	font-weight: 900;
`;
