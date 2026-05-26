import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
	BankOutlined,
	EditOutlined,
	ReloadOutlined,
	SafetyCertificateOutlined,
	TeamOutlined,
	UserAddOutlined,
} from "@ant-design/icons";
import {
	Button,
	Card,
	Form,
	Input,
	message,
	Modal,
	Select,
	Space,
	Statistic,
	Switch,
	Table,
	Tabs,
	Tag,
} from "antd";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import { isAuthenticated } from "../../auth";
import {
	createAdminHotelStaffAccount,
	createAdminPlatformStaffAccount,
	getAdminAccounts,
	updateAdminAccount,
} from "../apiAdmin";

const HOTEL_ROLES = [
	{ value: "systemadmin", label: "Hotel System Admin" },
	{ value: "hotelmanager", label: "Hotel Manager" },
	{ value: "reception", label: "Reception" },
	{ value: "reservationemployee", label: "Reservation Employee" },
	{ value: "finance", label: "Finance" },
	{ value: "ordertaker", label: "External Agent" },
	{ value: "housekeepingmanager", label: "Housekeeping Manager" },
	{ value: "housekeeping", label: "Housekeeping" },
];

const HOTEL_ACCESS = [
	{ value: "overall", label: "Overall" },
	{ value: "dashboard", label: "Dashboard" },
	{ value: "reservations", label: "Reservations" },
	{ value: "newReservation", label: "New Reservation" },
	{ value: "ownReservations", label: "Own Reservations" },
	{ value: "reports", label: "Reports" },
	{ value: "finance", label: "Finance" },
	{ value: "housekeeping", label: "Housekeeping" },
	{ value: "settings", label: "Settings" },
];

const PLATFORM_ROLES = [
	{ value: "platformadmin", label: "Platform Admin" },
	{ value: "platformstaff", label: "Platform Staff" },
	{ value: "customerservice", label: "Customer Service" },
	{ value: "integrator", label: "Integrator" },
	{ value: "reservations", label: "Reservations" },
	{ value: "reports", label: "Hotel Reports" },
	{ value: "finance", label: "Finance" },
	{ value: "content", label: "Website Content" },
	{ value: "tools", label: "Jannat Tools" },
	{ value: "payouts", label: "Payouts" },
	{ value: "support", label: "Support" },
];

const PLATFORM_ACCESS = [
	{ value: "AdminDashboard", label: "Admin Dashboard" },
	{ value: "CustomerService", label: "Customer Service" },
	{ value: "Integrator", label: "Integrator" },
	{ value: "HotelsReservations", label: "Hotels Reservations" },
	{ value: "AllReservations", label: "All Reservations" },
	{ value: "JannatTools", label: "Jannat Tools" },
	{ value: "JannatBookingWebsite", label: "Jannat Website" },
	{ value: "HotelReports", label: "Hotel Reports" },
	{ value: "Financials", label: "Financials" },
	{ value: "Payouts", label: "Payouts" },
	{ value: "AdminAccounts", label: "Employee Accounts" },
];

const HOTEL_ROLE_NUMBER_TO_VALUE = {
	10000: "systemadmin",
	2000: "hotelmanager",
	3000: "reception",
	4000: "housekeepingmanager",
	5000: "housekeeping",
	6000: "finance",
	7000: "ordertaker",
	8000: "reservationemployee",
};

const PLATFORM_ROLE_VALUES = new Set(PLATFORM_ROLES.map((role) => role.value));
const HOTEL_ROLE_VALUES = new Set(HOTEL_ROLES.map((role) => role.value));

const ROLE_LABELS = {
	en: {
		systemadmin: "Hotel System Admin",
		hotelmanager: "Hotel Manager",
		reception: "Reception",
		reservationemployee: "Reservation Employee",
		finance: "Finance",
		ordertaker: "External Agent",
		housekeepingmanager: "Housekeeping Manager",
		housekeeping: "Housekeeping",
		platformadmin: "Platform Admin",
		platformstaff: "Platform Staff",
		customerservice: "Customer Service",
		integrator: "Integrator",
		reservations: "Reservations",
		reports: "Hotel Reports",
		content: "Website Content",
		tools: "Jannat Tools",
		payouts: "Payouts",
		support: "Support",
		platformemployee: "Platform Employee",
	},
	ar: {
		systemadmin: "\u0645\u0633\u0624\u0648\u0644 \u0646\u0638\u0627\u0645 \u0627\u0644\u0641\u0646\u062f\u0642",
		hotelmanager: "\u0645\u062f\u064a\u0631 \u0627\u0644\u0641\u0646\u062f\u0642",
		reception: "\u0627\u0644\u0627\u0633\u062a\u0642\u0628\u0627\u0644",
		reservationemployee: "\u0645\u0648\u0638\u0641 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		finance: "\u0627\u0644\u0645\u0627\u0644\u064a\u0629",
		ordertaker: "\u0648\u0643\u064a\u0644 \u062e\u0627\u0631\u062c\u064a",
		housekeepingmanager: "\u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0638\u0627\u0641\u0629",
		housekeeping: "\u0627\u0644\u0646\u0638\u0627\u0641\u0629",
		platformadmin: "\u0645\u062f\u064a\u0631 \u0627\u0644\u0645\u0646\u0635\u0629",
		platformstaff: "\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0646\u0635\u0629",
		customerservice: "\u062e\u062f\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
		integrator: "\u0627\u0644\u062a\u0643\u0627\u0645\u0644",
		reservations: "\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		reports: "\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		content: "\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0645\u0648\u0642\u0639",
		tools: "\u0623\u062f\u0648\u0627\u062a \u062c\u0646\u0627\u062a",
		payouts: "\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a",
		support: "\u0627\u0644\u062f\u0639\u0645",
		platformemployee: "\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0646\u0635\u0629",
	},
};

const ACCESS_LABELS = {
	en: {
		overall: "Overall",
		dashboard: "Dashboard",
		reservations: "Reservations",
		newreservation: "New Reservation",
		ownreservations: "Own Reservations",
		reports: "Reports",
		finance: "Finance",
		housekeeping: "Housekeeping",
		settings: "Settings",
		admindashboard: "Admin Dashboard",
		customerservice: "Customer Service",
		integrator: "Integrator",
		hotelsreservations: "Hotel Reservations",
		allreservations: "All Reservations",
		jannattools: "Jannat Tools",
		jannatbookingwebsite: "Jannat Website",
		hotelreports: "Hotel Reports",
		financials: "Financials",
		payouts: "Payouts",
		adminaccounts: "Employee Accounts",
	},
	ar: {
		overall: "\u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u0639\u0627\u0645",
		dashboard: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645",
		reservations: "\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		newreservation: "\u062d\u062c\u0632 \u062c\u062f\u064a\u062f",
		ownreservations: "\u062d\u062c\u0648\u0632\u0627\u062a\u064a",
		reports: "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631",
		finance: "\u0627\u0644\u0645\u0627\u0644\u064a\u0629",
		housekeeping: "\u0627\u0644\u0646\u0638\u0627\u0641\u0629",
		settings: "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",
		admindashboard: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645",
		customerservice: "\u062e\u062f\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
		integrator: "\u0627\u0644\u062a\u0643\u0627\u0645\u0644",
		hotelsreservations: "\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		allreservations: "\u0643\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
		jannattools: "\u0623\u062f\u0648\u0627\u062a \u062c\u0646\u0627\u062a",
		jannatbookingwebsite: "\u0645\u0648\u0642\u0639 \u062c\u0646\u0627\u062a",
		hotelreports: "\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		financials: "\u0627\u0644\u0645\u0627\u0644\u064a\u0629",
		payouts: "\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a",
		adminaccounts: "\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646",
	},
};

const TEXT = {
	en: {
		title: "Employee Accounts",
		subtitle: "Create and manage hotel staff plus internal platform employees.",
		overview: "Overview",
		create: "Create Account",
		activate: "Activate Accounts",
		update: "Update Existing",
		refresh: "Refresh",
		search: "Search name, email, phone, or role",
		scope: "Scope",
		hotelScope: "Hotel employees",
		platformScope: "Platform employees",
		allScopes: "All accounts",
		hotel: "Hotel",
		hotels: "Hotels",
		status: "Status",
		allStatus: "All statuses",
		active: "Active",
		inactive: "Inactive",
		name: "Name",
		email: "Email",
		phone: "Phone",
		password: "Password",
		roles: "Roles",
		access: "Access",
		actions: "Actions",
		accountType: "Account type",
		createHotel: "Create Hotel Account",
		createPlatform: "Create Platform Account",
		save: "Save Changes",
		edit: "Edit Account",
		cancel: "Cancel",
		total: "Total accounts",
		hotelAccounts: "Hotel accounts",
		platformAccounts: "Platform accounts",
		activeAccounts: "Active accounts",
		noHotel: "No hotel selected",
		platformHotels: "Allowed hotels",
		successCreate: "Account created successfully",
		successUpdate: "Account updated successfully",
	},
	ar: {
		title: "\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646",
		subtitle:
			"\u0625\u0646\u0634\u0627\u0621 \u0648\u0625\u062f\u0627\u0631\u0629 \u0645\u0648\u0638\u0641\u064a \u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0648\u0645\u0648\u0638\u0641\u064a \u062c\u0646\u0627\u062a \u0627\u0644\u062f\u0627\u062e\u0644\u064a\u064a\u0646.",
		overview: "\u0644\u0648\u062d\u0629 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a",
		create: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u062c\u062f\u064a\u062f",
		activate: "\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a",
		update: "\u062a\u062d\u062f\u064a\u062b \u062d\u0633\u0627\u0628 \u0645\u0648\u062c\u0648\u062f",
		refresh: "\u062a\u062d\u062f\u064a\u062b",
		search:
			"\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0628\u0631\u064a\u062f \u0623\u0648 \u0627\u0644\u0647\u0627\u062a\u0641",
		scope: "\u0646\u0637\u0627\u0642 \u0627\u0644\u062d\u0633\u0627\u0628",
		hotelScope: "\u0645\u0648\u0638\u0641\u0648 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		platformScope: "\u0645\u0648\u0638\u0641\u0648 \u0627\u0644\u0645\u0646\u0635\u0629",
		allScopes: "\u0643\u0644 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a",
		hotel: "\u0627\u0644\u0641\u0646\u062f\u0642",
		hotels: "\u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		status: "\u0627\u0644\u062d\u0627\u0644\u0629",
		allStatus: "\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a",
		active: "\u0645\u0641\u0639\u0644",
		inactive: "\u0645\u0639\u0637\u0644",
		name: "\u0627\u0644\u0627\u0633\u0645",
		email: "\u0627\u0644\u0628\u0631\u064a\u062f",
		phone: "\u0627\u0644\u0647\u0627\u062a\u0641",
		password: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		roles: "\u0627\u0644\u0623\u062f\u0648\u0627\u0631",
		access: "\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a",
		actions: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
		accountType: "\u0646\u0648\u0639 \u0627\u0644\u062d\u0633\u0627\u0628",
		createHotel: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0641\u0646\u062f\u0642",
		createPlatform:
			"\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0644\u0644\u0645\u0646\u0635\u0629",
		save: "\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a",
		edit: "\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0633\u0627\u0628",
		cancel: "\u0625\u0644\u063a\u0627\u0621",
		total: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a",
		hotelAccounts: "\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		platformAccounts: "\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629",
		activeAccounts: "\u062d\u0633\u0627\u0628\u0627\u062a \u0645\u0641\u0639\u0644\u0629",
		noHotel: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0641\u0646\u062f\u0642",
		platformHotels: "\u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0645\u0633\u0645\u0648\u062d\u0629",
		successCreate: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628",
		successUpdate: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0633\u0627\u0628",
	},
};

const hotelName = (hotel = {}) =>
	hotel?.hotelName_OtherLanguage || hotel?.hotelName || hotel?.name || "";

const normalizeId = (value) => String(value?._id || value?.id || value || "").trim();

const normalizeKey = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, "");

const uniqueValues = (values = []) => [
	...new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
];

const roleNumbers = (account = {}) => [
	Number(account.role),
	...(Array.isArray(account.roles) ? account.roles.map(Number) : []),
];

const normalizeRoleValue = (value) => {
	const roleNumber = Number(value);
	if (HOTEL_ROLE_NUMBER_TO_VALUE[roleNumber]) {
		return HOTEL_ROLE_NUMBER_TO_VALUE[roleNumber];
	}
	if (roleNumber === 1000) return "platformemployee";
	return normalizeKey(value);
};

const labelFor = (labels, value, isArabic) => {
	const language = isArabic ? "ar" : "en";
	const key = normalizeKey(value);
	return labels[language]?.[key] || labels.en?.[key] || String(value || "-");
};

const accountHotelIds = (account = {}) => {
	const values = [
		account.hotelIdWork,
		...(Array.isArray(account.hotelIdsWork) ? account.hotelIdsWork : []),
		...(Array.isArray(account.hotelsToSupport) ? account.hotelsToSupport : []),
		...(Array.isArray(account.hotelIdsOwner) ? account.hotelIdsOwner : []),
	];
	return [...new Set(values.map(normalizeId).filter(Boolean))];
};

const isPlatformAccount = (account = {}) => {
	const safeAccount = account || {};
	const descriptions = uniqueValues([
		safeAccount.platformEmployeeType,
		safeAccount.roleDescription,
		...(Array.isArray(safeAccount.roleDescriptions)
			? safeAccount.roleDescriptions
			: []),
	]).map(normalizeKey);
	return (
		safeAccount.accountScope === "platform" ||
		safeAccount.platformEmployee === true ||
		roleNumbers(safeAccount).includes(1000) ||
		descriptions.some((description) => PLATFORM_ROLE_VALUES.has(description))
	);
};

const accountRoleValues = (account = {}) => {
	const descriptions = uniqueValues([
		account.platformEmployeeType,
		account.roleDescription,
		...(Array.isArray(account.roleDescriptions) ? account.roleDescriptions : []),
	]);
	const normalizedDescriptions = descriptions.map(normalizeRoleValue);

	if (isPlatformAccount(account)) {
		const platformValues = normalizedDescriptions.filter((role) =>
			PLATFORM_ROLE_VALUES.has(role)
		);
		return platformValues.length ? platformValues : ["platformemployee"];
	}

	const hotelValues = uniqueValues([
		...normalizedDescriptions,
		...roleNumbers(account).map((role) => HOTEL_ROLE_NUMBER_TO_VALUE[role]),
	]).filter((role) => HOTEL_ROLE_VALUES.has(role));

	return hotelValues.length ? hotelValues : uniqueValues([account.role || "-"]);
};

const roleLabels = (account = {}, isArabic = false) => {
	const values = accountRoleValues(account);
	return values.length
		? values.map((role) => labelFor(ROLE_LABELS, role, isArabic))
		: ["-"];
};

const accessLabel = (access, isArabic = false) =>
	labelFor(ACCESS_LABELS, access, isArabic);

const accountMatchesScope = (account = {}, scope = "hotel") => {
	const platform = isPlatformAccount(account);
	if (scope === "platform") return platform;
	if (scope === "hotel") return !platform;
	return true;
};

const AdminAccountsMain = ({ chosenLanguage }) => {
	const isArabic = chosenLanguage === "Arabic";
	const L = TEXT[isArabic ? "ar" : "en"];
	const { user, token } = isAuthenticated() || {};
	const [collapsed, setCollapsed] = useState(false);
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [accounts, setAccounts] = useState([]);
	const [hotels, setHotels] = useState([]);
	const [canManagePlatform, setCanManagePlatform] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [filters, setFilters] = useState({
		scope: "hotel",
		status: "",
		hotelId: "",
		search: "",
	});
	const [pagination, setPagination] = useState({
		current: 1,
		pageSize: 25,
		total: 0,
	});
	const [createForm] = Form.useForm();
	const [editForm] = Form.useForm();
	const [accountScope, setAccountScope] = useState("hotel");
	const [editingAccount, setEditingAccount] = useState(null);
	const [activeAccountTab, setActiveAccountTab] = useState("overview");

	const hotelOptions = useMemo(
		() =>
			hotels.map((hotel) => ({
				value: normalizeId(hotel._id),
				label: hotelName(hotel),
			})),
		[hotels],
	);

	const fetchAccounts = useCallback(
		(next = {}) => {
			if (!user?._id || !token) return;
			const page = next.page || 1;
			const limit = next.limit || 25;
			setLoading(true);
			getAdminAccounts(user._id, token, {
				...filters,
				...next.filters,
				page,
				limit,
			}).then((data) => {
				setLoading(false);
				if (!data || data.error) {
					message.error(data?.error || "Unable to load accounts");
					return;
				}
				setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
				setHotels(Array.isArray(data.hotels) ? data.hotels : []);
				setCanManagePlatform(Boolean(data.canManagePlatform));
				setPagination({
					current: Number(data.page || page),
					pageSize: Number(data.limit || limit),
					total: Number(data.total || 0),
				});
			});
		},
		[filters, token, user?._id],
	);

	useEffect(() => {
		if (window.innerWidth <= 1000) setCollapsed(true);
	}, []);

	useEffect(() => {
		fetchAccounts({ page: 1 });
	}, [fetchAccounts]);

	const stats = useMemo(() => {
		const platform = accounts.filter(isPlatformAccount).length;
		const active = accounts.filter((account) => account.activeUser !== false).length;
		return {
			total: pagination.total,
			hotel: Math.max(accounts.length - platform, 0),
			platform,
			active,
		};
	}, [accounts, pagination.total]);

	const visibleAccounts = useMemo(
		() => accounts.filter((account) => accountMatchesScope(account, filters.scope)),
		[accounts, filters.scope],
	);

	const updateFilters = (patch) => {
		const nextFilters = { ...filters, ...patch };
		setFilters(nextFilters);
		setPagination((current) => ({ ...current, current: 1 }));
	};

	const submitCreate = async () => {
		try {
			const values = await createForm.validateFields();
			setSaving(true);
			const isPlatform = values.accountScope === "platform";
			const selectedHotels = values.hotelIds || [];
			const payload = isPlatform
				? {
						name: values.name,
						email: values.email,
						phone: values.phone,
						password: values.password,
						roleDescription: values.platformRole,
						accessTo: values.platformAccess,
						hotelIdWork: (values.platformHotelIds || [])[0] || "",
						hotelIdsWork: values.platformHotelIds || [],
						hotelsToSupport: values.platformHotelIds || [],
						activeUser: values.activeUser !== false,
				  }
				: {
						name: values.name,
						email: values.email,
						phone: values.phone,
						password: values.password,
						hotelIdWork: selectedHotels[0],
						hotelIdsWork: selectedHotels,
						hotelsToSupport: selectedHotels,
						roleDescriptions: values.hotelRoles,
						accessTo: values.hotelAccess,
						activeUser: values.activeUser !== false,
				  };
			const data = isPlatform
				? await createAdminPlatformStaffAccount(user._id, token, payload)
				: await createAdminHotelStaffAccount(user._id, token, payload);
			setSaving(false);
			if (!data || data.error) {
				message.error(data?.error || "Account creation failed");
				return;
			}
			message.success(data.message || L.successCreate);
			createForm.resetFields();
			setAccountScope("hotel");
			fetchAccounts({ page: 1 });
		} catch (error) {
			setSaving(false);
			if (error?.errorFields) return;
			message.error(error?.message || "Account creation failed");
		}
	};

	const openEdit = (account) => {
		const platform = isPlatformAccount(account);
		const roleValues = accountRoleValues(account);
		const platformRole =
			roleValues.find((role) => PLATFORM_ROLE_VALUES.has(role)) || "platformstaff";
		setEditingAccount(account);
		editForm.setFieldsValue({
			accountScope: platform ? "platform" : "hotel",
			name: account.name,
			email: account.emailIsPlaceholder ? "" : account.email,
			phone: account.phone,
			activeUser: account.activeUser !== false,
			hotelIds: accountHotelIds(account),
			hotelRoles: platform
				? []
				: roleValues.filter((role) => HOTEL_ROLE_VALUES.has(role)),
			hotelAccess: Array.isArray(account.accessTo) ? account.accessTo : [],
			platformRole: platform ? platformRole : "platformstaff",
			platformAccess: platform && Array.isArray(account.accessTo) ? account.accessTo : [],
			platformHotelIds: platform ? accountHotelIds(account) : [],
		});
	};

	const submitEdit = async () => {
		if (!editingAccount) return;
		try {
			const values = await editForm.validateFields();
			const platform = values.accountScope === "platform";
			const selectedHotels = values.hotelIds || [];
			const payload = platform
				? {
						accountScope: "platform",
						name: values.name,
						email: values.email,
						phone: values.phone,
						password: values.password || "",
						roleDescription: values.platformRole,
						accessTo: values.platformAccess,
						hotelIdWork: (values.platformHotelIds || [])[0] || "",
						hotelIdsWork: values.platformHotelIds || [],
						hotelsToSupport: values.platformHotelIds || [],
						activeUser: values.activeUser !== false,
				  }
				: {
						accountScope: "hotel",
						name: values.name,
						email: values.email,
						phone: values.phone,
						password: values.password || "",
						hotelIdWork: selectedHotels[0],
						hotelIdsWork: selectedHotels,
						hotelsToSupport: selectedHotels,
						roleDescriptions: values.hotelRoles,
						accessTo: values.hotelAccess,
						activeUser: values.activeUser !== false,
				  };
			setSaving(true);
			const data = await updateAdminAccount(
				user._id,
				token,
				editingAccount._id,
				payload,
			);
			setSaving(false);
			if (!data || data.error) {
				message.error(data?.error || "Account update failed");
				return;
			}
			message.success(data.message || L.successUpdate);
			setEditingAccount(null);
			editForm.resetFields();
			fetchAccounts();
		} catch (error) {
			setSaving(false);
			if (error?.errorFields) return;
			message.error(error?.message || "Account update failed");
		}
	};

	const toggleActive = async (account, activeUser) => {
		const payload = {
			accountScope: isPlatformAccount(account) ? "platform" : "hotel",
			activeUser,
		};
		const data = await updateAdminAccount(user._id, token, account._id, payload);
		if (!data || data.error) {
			message.error(data?.error || "Status update failed");
			return;
		}
		message.success(L.successUpdate);
		fetchAccounts();
	};

	const columns = [
		{
			title: "#",
			width: 64,
			render: (_, __, index) =>
				(pagination.current - 1) * pagination.pageSize + index + 1,
		},
		{
			title: L.name,
			dataIndex: "name",
			width: 260,
			render: (_, account) => (
				<div className='account-person'>
					<strong>{account.name}</strong>
					<span>{account.emailIsPlaceholder ? "-" : account.email}</span>
					<span>{account.phone || "-"}</span>
				</div>
			),
		},
		{
			title: L.accountType,
			width: 170,
			render: (_, account) => (
				<Tag color={isPlatformAccount(account) ? "geekblue" : "cyan"}>
					{isPlatformAccount(account) ? L.platformScope : L.hotelScope}
				</Tag>
			),
		},
		{
			title: L.roles,
			width: 240,
			render: (_, account) => (
				<Space size={[4, 4]} wrap>
					{roleLabels(account, isArabic).map((role) => (
						<Tag key={role}>{role}</Tag>
					))}
				</Space>
			),
		},
		{
			title: L.hotels,
			width: 280,
			render: (_, account) => {
				const ids = accountHotelIds(account);
				const selected = hotelOptions.filter((hotel) => ids.includes(hotel.value));
				return selected.length ? (
					<Space size={[4, 4]} wrap>
						{selected.slice(0, 4).map((hotel) => (
							<Tag key={hotel.value} color='blue'>
								{hotel.label}
							</Tag>
						))}
						{selected.length > 4 && <Tag>+{selected.length - 4}</Tag>}
					</Space>
				) : (
					<span className='muted'>{L.noHotel}</span>
				);
			},
		},
		{
			title: L.access,
			width: 260,
			render: (_, account) => (
				<Space size={[4, 4]} wrap>
					{(Array.isArray(account.accessTo) ? account.accessTo : [])
						.slice(0, 5)
						.map((access) => (
							<Tag key={access} color='purple'>
								{accessLabel(access, isArabic)}
							</Tag>
						))}
					{Array.isArray(account.accessTo) && account.accessTo.length > 5 && (
						<Tag>+{account.accessTo.length - 5}</Tag>
					)}
				</Space>
			),
		},
		{
			title: L.status,
			width: 130,
			render: (_, account) => (
				<Switch
					checked={account.activeUser !== false}
					checkedChildren={L.active}
					unCheckedChildren={L.inactive}
					onChange={(checked) => toggleActive(account, checked)}
				/>
			),
		},
		{
			title: L.actions,
			width: 120,
			fixed: "right",
			render: (_, account) => (
				<Button icon={<EditOutlined />} onClick={() => openEdit(account)}>
					{L.edit}
				</Button>
			),
		},
	];

	const accountTable = (
		<Table
			rowKey='_id'
			loading={loading}
			columns={columns}
			dataSource={visibleAccounts}
			scroll={{ x: 1500 }}
			pagination={{
				current: pagination.current,
				pageSize: pagination.pageSize,
				total: pagination.total,
				showSizeChanger: true,
			}}
			onChange={(nextPagination) => {
				fetchAccounts({
					page: nextPagination.current,
					limit: nextPagination.pageSize,
				});
			}}
		/>
	);

	const createContent = (
		<Card className='surface-card'>
			<Form
				form={createForm}
				layout='vertical'
				initialValues={{
					accountScope: "hotel",
					hotelRoles: ["reception"],
					platformRole: "platformstaff",
					activeUser: true,
				}}
				onValuesChange={(changed) => {
					if (changed.accountScope) setAccountScope(changed.accountScope);
				}}
			>
				<div className='form-grid'>
					<Form.Item name='accountScope' label={L.accountType}>
						<Select
							options={[
								{ value: "hotel", label: L.hotelScope },
								...(canManagePlatform
									? [{ value: "platform", label: L.platformScope }]
									: []),
							]}
						/>
					</Form.Item>
					<Form.Item
						name='name'
						label={L.name}
						rules={[{ required: true, message: L.name }]}
					>
						<Input />
					</Form.Item>
					<Form.Item
						name='email'
						label={L.email}
						rules={[
							{
								required: accountScope === "platform",
								message: L.email,
							},
							{ type: "email", message: L.email },
						]}
					>
						<Input />
					</Form.Item>
					<Form.Item
						name='phone'
						label={L.phone}
						rules={[
							{
								required: accountScope === "hotel",
								message: L.phone,
							},
						]}
					>
						<Input />
					</Form.Item>
					<Form.Item
						name='password'
						label={L.password}
						rules={[{ required: true, min: 6, message: L.password }]}
					>
						<Input.Password />
					</Form.Item>
					{accountScope === "hotel" ? (
						<>
							<Form.Item
								name='hotelIds'
								label={L.hotels}
								rules={[{ required: true, message: L.hotels }]}
							>
								<Select
									mode='multiple'
									showSearch
									optionFilterProp='label'
									options={hotelOptions}
								/>
							</Form.Item>
							<Form.Item
								name='hotelRoles'
								label={L.roles}
								rules={[{ required: true, message: L.roles }]}
							>
								<Select mode='multiple' options={HOTEL_ROLES} />
							</Form.Item>
							<Form.Item name='hotelAccess' label={L.access}>
								<Select mode='multiple' options={HOTEL_ACCESS} />
							</Form.Item>
						</>
					) : (
						<>
							<Form.Item
								name='platformRole'
								label={L.roles}
								rules={[{ required: true, message: L.roles }]}
							>
								<Select options={PLATFORM_ROLES} />
							</Form.Item>
							<Form.Item
								name='platformAccess'
								label={L.access}
								rules={[{ required: true, message: L.access }]}
							>
								<Select mode='multiple' options={PLATFORM_ACCESS} />
							</Form.Item>
							<Form.Item name='platformHotelIds' label={L.platformHotels}>
								<Select
									mode='multiple'
									showSearch
									optionFilterProp='label'
									options={hotelOptions}
								/>
							</Form.Item>
						</>
					)}
					<Form.Item name='activeUser' label={L.status} valuePropName='checked'>
						<Switch checkedChildren={L.active} unCheckedChildren={L.inactive} />
					</Form.Item>
				</div>
				<Button
					type='primary'
					size='large'
					icon={<UserAddOutlined />}
					loading={saving}
					onClick={submitCreate}
				>
					{accountScope === "platform" ? L.createPlatform : L.createHotel}
				</Button>
			</Form>
		</Card>
	);

	const accountTabItems = [
		{
			key: "overview",
			label: L.overview,
		},
		{
			key: "create",
			label: L.create,
		},
		{
			key: "activate",
			label: L.activate,
		},
		{
			key: "update",
			label: L.update,
		},
	];

	const activeTabContent =
		activeAccountTab === "create" ? createContent : accountTable;

	return (
		<AdminAccountsWrapper
			dir={isArabic ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{isArabic ? (
						<AdminNavbarArabic
							fromPage='AdminAccounts'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
						/>
					) : (
						<AdminNavbar
							fromPage='AdminAccounts'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
						/>
					)}
				</div>
				<main className='otherContentWrapper'>
					<section className='top-tabs-row'>
						<Tabs
							className='admin-tabs'
							activeKey={activeAccountTab}
							onChange={setActiveAccountTab}
							items={accountTabItems}
						/>
						<Button
							className='refresh-button'
							icon={<ReloadOutlined />}
							onClick={() => fetchAccounts()}
							loading={loading}
						>
							{L.refresh}
						</Button>
					</section>
					<section className='stats-grid'>
						<Card>
							<Statistic title={L.total} value={stats.total} prefix={<TeamOutlined />} />
						</Card>
						<Card>
							<Statistic title={L.hotelAccounts} value={stats.hotel} prefix={<BankOutlined />} />
						</Card>
						<Card>
							<Statistic
								title={L.platformAccounts}
								value={stats.platform}
								prefix={<SafetyCertificateOutlined />}
							/>
						</Card>
						<Card>
							<Statistic title={L.activeAccounts} value={stats.active} />
						</Card>
					</section>
					<Card className='filter-card'>
						<div className='filters-grid'>
							<Input.Search
								allowClear
								placeholder={L.search}
								value={filters.search}
								onChange={(event) => updateFilters({ search: event.target.value })}
								onSearch={(value) => updateFilters({ search: value })}
							/>
							<Select
								value={filters.scope}
								onChange={(scope) => updateFilters({ scope })}
								options={[
									{ value: "hotel", label: L.hotelScope },
									...(canManagePlatform
										? [
												{ value: "platform", label: L.platformScope },
												{ value: "all", label: L.allScopes },
										  ]
										: []),
								]}
							/>
							<Select
								allowClear
								value={filters.hotelId || undefined}
								placeholder={L.hotel}
								showSearch
								optionFilterProp='label'
								onChange={(hotelId) => updateFilters({ hotelId: hotelId || "" })}
								options={hotelOptions}
							/>
							<Select
								value={filters.status || ""}
								onChange={(status) => updateFilters({ status })}
								options={[
									{ value: "", label: L.allStatus },
									{ value: "active", label: L.active },
									{ value: "inactive", label: L.inactive },
								]}
							/>
						</div>
					</Card>
					{activeTabContent}
				</main>
			</div>
			<Modal
				title={L.edit}
				open={Boolean(editingAccount)}
				onCancel={() => setEditingAccount(null)}
				onOk={submitEdit}
				okText={L.save}
				cancelText={L.cancel}
				confirmLoading={saving}
				width={920}
			>
				<Form form={editForm} layout='vertical'>
					<div className='form-grid modal-grid'>
						<Form.Item name='accountScope' label={L.accountType}>
							<Select
								disabled={isPlatformAccount(editingAccount) && !canManagePlatform}
								options={[
									{ value: "hotel", label: L.hotelScope },
									...(canManagePlatform
										? [{ value: "platform", label: L.platformScope }]
										: []),
								]}
							/>
						</Form.Item>
						<Form.Item name='name' label={L.name} rules={[{ required: true }]}>
							<Input />
						</Form.Item>
						<Form.Item name='email' label={L.email} rules={[{ type: "email" }]}>
							<Input />
						</Form.Item>
						<Form.Item name='phone' label={L.phone}>
							<Input />
						</Form.Item>
						<Form.Item name='password' label={L.password}>
							<Input.Password placeholder='Leave blank to keep current password' />
						</Form.Item>
						<Form.Item name='hotelIds' label={L.hotels}>
							<Select
								mode='multiple'
								showSearch
								optionFilterProp='label'
								options={hotelOptions}
							/>
						</Form.Item>
						<Form.Item name='hotelRoles' label={L.roles}>
							<Select mode='multiple' options={HOTEL_ROLES} />
						</Form.Item>
						<Form.Item name='hotelAccess' label={L.access}>
							<Select mode='multiple' options={HOTEL_ACCESS} />
						</Form.Item>
						<Form.Item name='platformRole' label={L.roles}>
							<Select options={PLATFORM_ROLES} />
						</Form.Item>
						<Form.Item name='platformAccess' label={L.access}>
							<Select mode='multiple' options={PLATFORM_ACCESS} />
						</Form.Item>
						<Form.Item name='platformHotelIds' label={L.platformHotels}>
							<Select
								mode='multiple'
								showSearch
								optionFilterProp='label'
								options={hotelOptions}
							/>
						</Form.Item>
						<Form.Item name='activeUser' label={L.status} valuePropName='checked'>
							<Switch checkedChildren={L.active} unCheckedChildren={L.inactive} />
						</Form.Item>
					</div>
				</Form>
			</Modal>
		</AdminAccountsWrapper>
	);
};

export default AdminAccountsMain;

const AdminAccountsWrapper = styled.div`
	min-height: calc(100vh - var(--admin-topbar-height, 0px));
	background: linear-gradient(180deg, #eef7ff 0%, #f8fbff 42%, #ffffff 100%);

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.dir === "rtl"
				? "minmax(0, 1fr) var(--admin-sidebar-width, 285px)"
				: "var(--admin-sidebar-width, 285px) minmax(0, 1fr)"};
		grid-template-areas: ${(props) =>
			props.dir === "rtl" ? "'content nav'" : "'nav content'"};
		min-height: calc(100vh - var(--admin-topbar-height, 0px));
	}

	.navcontent {
		grid-area: nav;
	}

	.otherContentWrapper {
		grid-area: content;
		min-width: 0;
		padding: 18px;
	}

	.top-tabs-row {
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 14px;
	}

	.refresh-button {
		min-height: 58px;
		border-color: rgba(139, 190, 227, 0.56);
		border-radius: 8px;
		font-weight: 900;
		box-shadow: 0 8px 18px rgba(13, 49, 88, 0.06);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(160px, 1fr));
		gap: 12px;
		margin-bottom: 14px;
	}

	.ant-card {
		border: 1px solid #cfe3f6;
		box-shadow: 0 10px 26px rgba(21, 75, 118, 0.08);
	}

	.filter-card {
		margin-bottom: 12px;
	}

	.filters-grid {
		display: grid;
		grid-template-columns: minmax(260px, 1.4fr) repeat(3, minmax(190px, 1fr));
		gap: 10px;
		align-items: center;
	}

	.admin-tabs {
		flex: 1 1 auto;
		min-width: 0;
	}

	.admin-tabs > .ant-tabs-nav {
		margin: 0;
		padding: 6px;
		border: 1px solid rgba(139, 190, 227, 0.36);
		border-radius: 8px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 251, 255, 0.96)),
			#f8fbff;
		box-shadow: 0 10px 24px rgba(13, 49, 88, 0.05);
	}

	.admin-tabs > .ant-tabs-nav::before {
		display: none;
	}

	.admin-tabs .ant-tabs-nav-wrap {
		min-width: 0;
	}

	.admin-tabs .ant-tabs-nav-list {
		display: flex;
		gap: 8px;
		width: 100%;
	}

	.admin-tabs .ant-tabs-tab {
		flex: 1 1 175px;
		justify-content: center;
		min-height: 44px;
		margin: 0 !important;
		padding: 9px 14px;
		border: 1px solid rgba(139, 190, 227, 0.46);
		border-radius: 6px;
		background: #ffffff;
		box-shadow: 0 8px 18px rgba(13, 49, 88, 0.06);
		transition:
			background 160ms ease,
			border-color 160ms ease,
			color 160ms ease,
			box-shadow 160ms ease,
			transform 160ms ease;
	}

	.admin-tabs .ant-tabs-tab:hover {
		border-color: rgba(36, 144, 200, 0.7);
		transform: translateY(-1px);
	}

	.admin-tabs .ant-tabs-tab-btn {
		min-width: 0;
		color: #173a5f;
		font-weight: 950;
		line-height: 1.2;
		overflow: hidden;
		text-align: center;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.admin-tabs .ant-tabs-tab-active {
		border-color: rgba(122, 209, 245, 0.95);
		background: var(
			--admin-metal-blue-bg,
			linear-gradient(135deg, #081a2d 0%, #155d95 52%, #071827 100%)
		);
		box-shadow:
			inset 0 1px rgba(255, 255, 255, 0.22),
			0 10px 22px rgba(8, 42, 75, 0.18);
	}

	.admin-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
		color: #fff;
	}

	.admin-tabs .ant-tabs-ink-bar,
	.admin-tabs .ant-tabs-content-holder {
		display: none;
	}

	.surface-card {
		max-width: 1200px;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(220px, 1fr));
		gap: 4px 14px;
	}

	.modal-grid {
		grid-template-columns: repeat(2, minmax(220px, 1fr));
	}

	.account-person {
		display: grid;
		gap: 2px;
	}

	.account-person span,
	.muted {
		color: #61778b;
		font-size: 0.82rem;
	}

	.ant-table-wrapper {
		background: #fff;
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid #d8e8f5;
	}

	.ant-table-thead > tr > th {
		background: linear-gradient(180deg, #154a78 0%, #09223a 100%) !important;
		color: #fff !important;
		font-weight: 800;
	}

	@media (max-width: 1200px) {
		.stats-grid {
			grid-template-columns: repeat(2, minmax(160px, 1fr));
		}

		.filters-grid,
		.form-grid,
		.modal-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "content";
		}

		.otherContentWrapper {
			padding: 12px;
		}
	}

	@media (max-width: 720px) {
		.top-tabs-row {
			align-items: stretch;
			flex-direction: column;
		}

		.refresh-button {
			min-height: 44px;
		}

		.admin-tabs .ant-tabs-nav-list {
			flex-wrap: wrap;
		}

		.stats-grid,
		.filters-grid,
		.form-grid,
		.modal-grid {
			grid-template-columns: 1fr;
		}
	}
`;
