import styled from "styled-components";

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

export const formatDate = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString("en-CA");
};

export const formatDateTime = (value) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return `${date.toLocaleDateString("en-CA")} ${date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	})}`;
};

export const isArabicLanguage = (chosenLanguage) => chosenLanguage === "Arabic";

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
		moreDetails: "More Details",
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
		systemAdmin: "System Admin",
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
		noSystemAdminAccountsFound: "No System Admin accounts found.",
		noHousekeepingTasksFound: "No housekeeping tasks found.",
		searchReservationPlaceholder: "Search guest, confirmation, room, hotel",
		searchHousekeepingPlaceholder:
			"Search hotel, room, employee, confirmation",
		searchAccountPlaceholder: "Search name, email, or phone",
		searchAccountCompanyPlaceholder: "Search name, email, phone, company",
		chooseAtLeastOneHotel: "Choose at least one hotel.",
		chooseAccountFirst: "Choose an account first.",
		couldNotCreateSystemAdmin: "Could not create System Admin.",
		systemAdminCreated: "System Admin created.",
		couldNotUpdateSystemAdmin: "Could not update System Admin.",
		systemAdminUpdated: "System Admin updated.",
		couldNotUpdateAccount: "Could not update account.",
		accountUpdated: "Account updated.",
		saving: "Saving...",
		creating: "Creating...",
		createSystemAdmin: "Create System Admin",
		updateSystemAdmin: "Update System Admin",
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
			"System Admin accounts can see the same overall views as the owner for the hotels selected below.",
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
		moreDetails: "تفاصيل أكثر",
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
		systemAdmin: "مسؤول النظام",
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
		noSystemAdminAccountsFound: "لا توجد حسابات مسؤول نظام.",
		noHousekeepingTasksFound: "لا توجد مهام نظافة.",
		searchReservationPlaceholder: "ابحث بالضيف، رقم التأكيد، الغرفة، الفندق",
		searchHousekeepingPlaceholder:
			"ابحث بالفندق أو الغرفة أو الموظف أو رقم التأكيد",
		searchAccountPlaceholder: "ابحث بالاسم أو البريد الإلكتروني أو الهاتف",
		searchAccountCompanyPlaceholder:
			"ابحث بالاسم أو البريد الإلكتروني أو الهاتف أو الشركة",
		chooseAtLeastOneHotel: "اختر فندقا واحدا على الأقل.",
		chooseAccountFirst: "اختر حسابا أولا.",
		couldNotCreateSystemAdmin: "تعذر إنشاء مسؤول النظام.",
		systemAdminCreated: "تم إنشاء مسؤول النظام.",
		couldNotUpdateSystemAdmin: "تعذر تحديث مسؤول النظام.",
		systemAdminUpdated: "تم تحديث مسؤول النظام.",
		couldNotUpdateAccount: "تعذر تحديث الحساب.",
		accountUpdated: "تم تحديث الحساب.",
		saving: "جار الحفظ...",
		creating: "جار الإنشاء...",
		createSystemAdmin: "إنشاء مسؤول نظام",
		updateSystemAdmin: "تحديث مسؤول النظام",
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
			"يمكن لحسابات مسؤول النظام مشاهدة نفس الواجهات العامة التي يراها المالك للفنادق المحددة أدناه.",
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
	const normalized = String(status || "").toLowerCase();
	if (/cancel|reject|inactive|no[-_\s]?show/.test(normalized)) return "red";
	if (/pending|review|unfinished|cleaning/.test(normalized)) return "orange";
	if (/confirm|active|finish|done|clean|approved/.test(normalized)) return "green";
	return "blue";
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

	@media (max-width: 640px) {
		gap: 0.8rem;
	}
`;

export const OverallHeader = styled.header`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
	flex-wrap: wrap;
	min-width: 0;
	padding: 14px 16px;
	border: 1px solid #b8dcff;
	border-radius: 10px;
	background: linear-gradient(135deg, #e9f6ff 0%, #f7fbff 100%);

	> div {
		min-width: 0;
		max-width: 100%;
	}

	h2 {
		margin: 0;
		color: #0f4f86;
		font-size: clamp(1.15rem, 2vw, 1.65rem);
		font-weight: 900;
		overflow-wrap: anywhere;
	}

	p {
		margin: 0.25rem 0 0;
		color: #47627d;
		font-size: 0.88rem;
		font-weight: 700;
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

export const OverallToolbar = styled.form`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 8px;
	min-width: 0;
	padding: 12px;
	border: 1px solid #cfe5fb;
	border-radius: 8px;
	background: #e3f2fd;

	> input,
	> select {
		min-width: 0;
		min-height: 38px;
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

	> input:focus,
	> select:focus {
		border-color: #1e88e5;
		box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.12);
	}

	button {
		min-width: 0;
		min-height: 38px;
		border: 0;
		border-radius: 8px;
		background: #1e88e5;
		color: #fff;
		font-weight: 800;
		padding: 0 18px;
		white-space: nowrap;
	}

	button:hover {
		background: #0f6fc3;
	}

	button:disabled {
		opacity: 0.58;
		cursor: not-allowed;
	}

	button.secondary {
		border: 1px solid rgba(16, 24, 40, 0.08);
		background: #fff;
		color: #18212f;
	}

	button.secondary:hover {
		background: #f3f7fb;
	}

	@media (max-width: 720px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		padding: 0.7rem;
	}

	@media (max-width: 480px) {
		grid-template-columns: 1fr;

		> input,
		> select,
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
	border: 1px solid rgba(16, 24, 40, 0.08);
	border-radius: 8px;
	background: #fff;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);

	strong {
		color: #0f4f86;
		font-size: 1.5rem;
		line-height: 1;
	}

	span {
		color: #47627d;
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
	border: 1px solid rgba(16, 24, 40, 0.08);
	border-radius: 8px;
	background: #fff;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);

	table {
		width: 100%;
		min-width: 920px;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 8px 10px;
		border: 1px solid #edf2f7;
		color: #101828;
		font-size: 12px;
		text-align: start;
		vertical-align: middle;
		white-space: nowrap;
		line-height: 1.3;
	}

	th {
		background: #f8fafc;
		color: #344054;
		font-weight: 800;
	}

	tbody tr:hover td {
		background: #f7fbff;
	}

	button.link-btn,
	a.link-btn {
		border: 0;
		background: transparent;
		color: #0b6fdc;
		font-weight: 900;
		text-decoration: underline;
		text-underline-offset: 3px;
		padding: 0;
		text-align: start;
	}

	@media (max-width: 720px) {
		border-radius: 10px;

		table {
			min-width: 760px;
		}

		th,
		td {
			padding: 6px 8px;
			font-size: 11px;
		}

		th {
			font-size: 11px;
		}
	}

	@media (max-width: 420px) {
		margin-inline: -0.25rem;
		width: calc(100% + 0.5rem);

		table {
			min-width: 700px;
		}
	}
`;

export const StatusPill = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 24px;
	padding: 0.18rem 0.55rem;
	border: 1px solid
		${(props) =>
			props.$tone === "red"
				? "#ff7875"
				: props.$tone === "orange"
				  ? "#ffd666"
				  : props.$tone === "green"
				    ? "#8ce99a"
				    : "#b8dcff"};
	border-radius: 999px;
	background: ${(props) =>
		props.$tone === "red"
			? "#fff1f0"
			: props.$tone === "orange"
			  ? "#fff7df"
			  : props.$tone === "green"
			    ? "#ecfdf3"
			    : "#eef7ff"};
	color: ${(props) =>
		props.$tone === "red"
			? "#a8071a"
			: props.$tone === "orange"
			  ? "#8a5600"
			  : props.$tone === "green"
			    ? "#087f2e"
			    : "#0b5cad"};
	font-size: 0.72rem;
	font-weight: 950;
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
	gap: 0.5rem;

	button {
		min-width: 38px;
		min-height: 34px;
		border: 1px solid rgba(16, 24, 40, 0.08);
		border-radius: 8px;
		background: #fff;
		color: #18212f;
		font-weight: 900;
	}

	button:not(:disabled):hover {
		border-color: #9ecdf8;
		color: #1e88e5;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	span {
		color: #47627d;
		font-weight: 900;
	}

	@media (max-width: 560px) {
		justify-content: stretch;
		flex-wrap: wrap;

		button {
			flex: 1 1 86px;
			min-height: 38px;
		}

		span {
			order: -1;
			flex: 1 0 100%;
			text-align: center;
			font-size: 0.78rem;
		}
	}
`;

export const ActionButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.35rem;
	min-width: 0;
	min-height: 38px;
	border: 1px solid ${(props) => (props.$danger ? "#ef4444" : "#1e88e5")};
	border-radius: 8px;
	background: ${(props) => (props.$danger ? "#ef4444" : "#1e88e5")};
	color: #fff;
	font-weight: 800;
	padding: 0.42rem 0.8rem;
	text-align: center;
	line-height: 1.2;

	&:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	&:not(:disabled):hover {
		background: ${(props) => (props.$danger ? "#dc2626" : "#0f6fc3")};
		border-color: ${(props) => (props.$danger ? "#dc2626" : "#0f6fc3")};
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
