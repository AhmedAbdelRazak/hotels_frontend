import React, { useCallback, useEffect, useMemo, useState } from "react";
import { UploadOutlined } from "@ant-design/icons";
import { message, Modal } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { updateHotelStaffUser } from "../../../auth";
import {
	getOverallAccounts,
	updateOverallSystemAdmin,
} from "../../apiAdmin";
import {
	ActionButton,
	buildOwnerParams,
	getOverallText,
	InlineNote,
	localizeStatus,
	normalizeId,
	OVERALL_PAGE_SIZE,
	OverallPageShell,
	OverallTableWrap,
	OverallToolbar,
	Pager,
	pageRowNumber,
	StatusPill,
	statusTone,
	titleCase,
} from "../overallShared";
import MultiSelectFilter from "./MultiSelectFilter";

const roleOptions = [
	{ value: "systemadmin", role: 10000, en: "Hotel System Admin", ar: "مسؤول نظام الفندق" },
	{ value: "hotelmanager", role: 2000, en: "Hotel Manager", ar: "مدير الفندق" },
	{ value: "reception", role: 3000, en: "Front Desk Reception", ar: "موظف الاستقبال" },
	{
		value: "ordertaker",
		role: 7000,
		en: "External Agent / Order Taker",
		ar: "وكيل خارجي / مستلم حجوزات",
	},
	{ value: "finance", role: 6000, en: "Finance", ar: "المالية" },
	{ value: "reservationemployee", role: 8000, en: "Reservations Officer", ar: "مسؤول الحجوزات" },
	{ value: "housekeepingmanager", role: 4000, en: "Housekeeping Manager", ar: "مدير النظافة" },
	{ value: "housekeeping", role: 5000, en: "Housekeeping", ar: "النظافة" },
];

const accessOptions = [
	{ value: "overall", en: "Overall Dashboard", ar: "لوحة التحكم العامة" },
	{ value: "dashboard", en: "Dashboard", ar: "لوحة التحكم" },
	{ value: "reservations", en: "Reservations", ar: "الحجوزات" },
	{ value: "ownReservations", en: "Own Reservation List", ar: "حجوزاته فقط" },
	{ value: "newReservation", en: "New Reservation", ar: "حجز جديد" },
	{ value: "reports", en: "Reports", ar: "التقارير" },
	{ value: "finance", en: "Finance", ar: "المالية" },
	{ value: "housekeeping", en: "Housekeeping", ar: "النظافة" },
	{ value: "settings", en: "Settings", ar: "الإعدادات" },
];

const commercialModelOptions = [
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
		enHint: "Track reservations for commission without wallet debt.",
		arHint: "تتبع الحجوزات للعمولة بدون مديونية محفظة.",
	},
	{
		value: "mixed",
		en: "Wallet + commission",
		ar: "محفظة وعمولة",
		enHint: "Use wallet tracking and commission reporting together.",
		arHint: "استخدم المحفظة مع تتبع العمولة معا.",
	},
];

const TEXT = {
	en: {
		currentAccounts: "Current accounts",
		addAccount: "Add new account",
		updateAccount: "Update account",
		selectAccount: "Select an account",
		selectedAccount: "Selected account",
		noSelection:
			"Please click an account from the table, or search for the account you want to update.",
		required: "Required",
		optional: "Optional",
		chooseHotels: "Choose hotels",
		roles: "Roles",
		access: "Access limits",
		name: "Name",
		email: "Email",
		phone: "Phone",
		companyName: "Company name",
		companyOfficialName: "Official company name",
		companyEin: "Company EIN / tax number",
		companyDocuments: "Company attachments",
		attachmentPreview: "Attachment preview",
		previewUnavailable: "This attachment cannot be previewed here.",
		removeAttachment: "Remove attachment",
		uploadDocuments: "Upload documents",
		documentLimitHint: "PDF or image files, up to 3 MB each.",
		newPassword: "New password",
		newPasswordHint: "Leave blank to keep the current password.",
		activeAccount: "Account is active",
		saveAccount: "Save account",
		savingAccount: "Saving...",
		accountSaved: "Account updated successfully.",
		couldNotLoad: "Could not load accounts.",
		requiredFields: "Please complete the required account fields.",
		chooseAtLeastOneHotel: "Choose at least one hotel.",
		fileTooLarge: "is larger than 3 MB.",
		fileReadFailed: "Could not read one of the selected files.",
		agentCommercialModel: "Agent business model",
		openingWalletCredit: "Opening wallet credit",
		openingWalletHint:
			"Leave as zero when this agent has no starting wallet credit.",
		systemAdminRoleLocked:
			"Hotel System Admin must be the only selected role. Remove it to choose another role.",
	},
	ar: {
		currentAccounts: "الحسابات الحالية",
		addAccount: "إضافة حساب جديد",
		updateAccount: "تحديث حساب",
		selectAccount: "اختيار حساب",
		selectedAccount: "الحساب المحدد",
		noSelection: "اختر حسابا من الجدول لتحديثه.",
		required: "مطلوب",
		optional: "اختياري",
		chooseHotels: "اختر الفنادق",
		roles: "الأدوار",
		access: "الصلاحيات",
		name: "الاسم",
		email: "البريد الإلكتروني",
		phone: "الهاتف",
		companyName: "اسم الشركة",
		companyOfficialName: "الاسم الرسمي للشركة",
		companyEin: "الرقم الضريبي / السجل",
		companyDocuments: "مرفقات الشركة",
		attachmentPreview: "معاينة المرفق",
		previewUnavailable: "تعذر عرض هذا المرفق داخل الصفحة.",
		removeAttachment: "حذف المرفق",
		uploadDocuments: "رفع المرفقات",
		documentLimitHint: "PDF أو صور، بحد أقصى 3 ميجابايت لكل ملف.",
		newPassword: "كلمة مرور جديدة",
		newPasswordHint: "اتركها فارغة للإبقاء على كلمة المرور الحالية.",
		activeAccount: "الحساب نشط",
		saveAccount: "حفظ الحساب",
		savingAccount: "جاري الحفظ...",
		accountSaved: "تم تحديث الحساب بنجاح.",
		couldNotLoad: "تعذر تحميل الحسابات.",
		requiredFields: "يرجى إكمال الحقول المطلوبة للحساب.",
		chooseAtLeastOneHotel: "اختر فندقا واحدا على الأقل.",
		fileTooLarge: "أكبر من 3 ميجابايت.",
		fileReadFailed: "تعذر قراءة أحد الملفات المحددة.",
		agentCommercialModel: "طريقة عمل الوكيل",
		openingWalletCredit: "رصيد افتتاحي للمحفظة",
		openingWalletHint:
			"اتركه صفرا إذا لم يكن للوكيل رصيد افتتاحي.",
		systemAdminRoleLocked:
			"حسابات مسؤول نظام الفندق الحالية تبقى بدور مسؤول نظام الفندق في هذه الصفحة.",
	},
};

const emptyForm = {
	accountId: "",
	hotelIds: [],
	roleDescriptions: ["reception"],
	accessTo: ["reservations", "newReservation"],
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
	activeUser: true,
};

const roleByValue = (value, role) =>
	roleOptions.find((option) => option.value === value) ||
	roleOptions.find((option) => option.role === Number(role)) ||
	roleOptions[2];

const defaultAccessForRole = (role) => {
	if (["systemadmin", "hotelmanager"].includes(role)) {
		return accessOptions.map((option) => option.value);
	}
	if (role === "finance") return ["dashboard", "reservations", "reports", "finance"];
	if (role === "reservationemployee") return ["reservations", "newReservation", "settings"];
	if (role === "housekeepingmanager") return ["dashboard", "housekeeping"];
	if (role === "housekeeping") return ["housekeeping"];
	if (role === "ordertaker") return ["newReservation", "ownReservations"];
	return ["reservations", "newReservation"];
};

const defaultAccessForRoles = (roles = []) => [
	...new Set((roles.length ? roles : ["reception"]).flatMap(defaultAccessForRole)),
];

const parseMoney = (value) => {
	const parsed = Number(String(value ?? 0).replace(/,/g, "").trim());
	return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
};

const buildAgentOpeningBalances = (hotelIds = [], amount = 0) =>
	hotelIds.filter(Boolean).map((hotelId) => ({ hotelId, amount: parseMoney(amount) }));

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

const documentPreviewSource = (document = {}) =>
	document.dataUrl || document.url || "";

const isPdfDocument = (document = {}) => {
	const source = documentPreviewSource(document);
	return (
		/^data:application\/pdf/i.test(source) ||
		String(document.fileType || "").toLowerCase().includes("pdf") ||
		/\.pdf($|\?)/i.test(String(document.fileName || source))
	);
};

const isImageDocument = (document = {}) => {
	const source = documentPreviewSource(document);
	return (
		/^data:image\//i.test(source) ||
		String(document.fileType || "").toLowerCase().startsWith("image/") ||
		/\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(
			String(document.fileName || source)
		)
	);
};

const pdfViewerSource = (source = "") => {
	const value = String(source || "");
	if (!value) return "";
	const separatorIndex = value.indexOf("#");
	const base = separatorIndex >= 0 ? value.slice(0, separatorIndex) : value;
	const fragment = separatorIndex >= 0 ? value.slice(separatorIndex + 1) : "";
	const params = new URLSearchParams(fragment);
	params.set("page", "1");
	params.set("zoom", "100");
	params.set("pagemode", "none");
	params.set("navpanes", "0");
	params.set("scrollbar", "1");
	params.set("toolbar", "1");
	return `${base}#${params.toString()}`;
};

const isSystemAdminAccount = (account = {}) => {
	const roles = [
		Number(account.role),
		...(Array.isArray(account.roles) ? account.roles.map(Number) : []),
	];
	const descriptions = [
		account.roleDescription,
		...(Array.isArray(account.roleDescriptions) ? account.roleDescriptions : []),
	].map((item) => String(item || "").toLowerCase());
	return roles.includes(10000) || descriptions.includes("systemadmin");
};

const isAgentRoleSelected = (roles = []) =>
	(Array.isArray(roles) ? roles : []).includes("ordertaker");

const accountRoleDescriptions = (account = {}) => {
	const descriptions = [
		...(Array.isArray(account.roleDescriptions) ? account.roleDescriptions : []),
		account.roleDescription,
		...(Array.isArray(account.roles)
			? account.roles.map((role) => roleByValue("", role).value)
			: []),
	]
		.map((item) => String(item || "").toLowerCase())
		.filter(Boolean);
	const unique = [...new Set(descriptions)];
	return unique.length ? unique : [roleByValue(account.roleDescription, account.role).value];
};

const accountHotelIds = (account = {}, hotels = []) => {
	const allowed = new Set(hotels.map((hotel) => normalizeId(hotel._id)).filter(Boolean));
	const ids = [
		account.hotelId,
		account.hotelIdWork,
		...(Array.isArray(account.hotelIdsWork) ? account.hotelIdsWork : []),
		...(Array.isArray(account.hotelsToSupport) ? account.hotelsToSupport : []),
		...(Array.isArray(account.hotelIdsOwner) ? account.hotelIdsOwner : []),
	]
		.map(normalizeId)
		.filter((id) => id && (!allowed.size || allowed.has(id)));
	return [...new Set(ids)];
};

const accountHotelNames = (account = {}, hotels = []) => {
	const hotelMap = new Map(
		hotels.map((hotel) => [normalizeId(hotel._id), hotel.hotelName || "Hotel"])
	);
	return accountHotelIds(account, hotels)
		.map((id) => titleCase(hotelMap.get(id) || id))
		.join(", ") || "-";
};

const accountRoleText = (account = {}, isRTL = false) =>
	accountRoleDescriptions(account)
		.map((role) => {
			const option = roleByValue(role);
			return isRTL ? option.ar : option.en;
		})
		.join(" / ");

const queryValues = (query, key) =>
	String(query.get(key) || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

const UpdateExistingAccount = ({
	userId,
	token,
	ownerId,
	chosenLanguage,
	setAccountsModalHotels,
}) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = { ...common, ...TEXT[isRTL ? "ar" : "en"] };
	const history = useHistory();
	const location = useLocation();
	const query = useMemo(
		() => new URLSearchParams(location.search || ""),
		[location.search]
	);
	const queryPage = Math.max(parseInt(query.get("accountPage"), 10) || 1, 1);
	const [filters, setFilters] = useState({
		search: query.get("accountSearch") || "",
		role: queryValues(query, "accountRole"),
		status: queryValues(query, "accountStatus"),
		hotelId: queryValues(query, "accountHotelId"),
	});
	const [page, setPage] = useState(queryPage);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState({ accounts: [], hotels: [], total: 0 });
	const [selectedAccountId, setSelectedAccountId] = useState("");
	const [form, setForm] = useState(emptyForm);
	const [previewDocument, setPreviewDocument] = useState(null);

	const accounts = useMemo(
		() => (Array.isArray(result.accounts) ? result.accounts : []),
		[result.accounts]
	);
	const hotels = useMemo(
		() => (Array.isArray(result.hotels) ? result.hotels : []),
		[result.hotels]
	);
	const pages = Math.max(Number(result.pages || 1), 1);
	const selectedAccount = useMemo(
		() =>
			accounts.find(
				(account) => normalizeId(account._id || account.id) === selectedAccountId
			) || null,
		[accounts, selectedAccountId]
	);
	const isSystemAdminSelected = form.roleDescriptions.includes("systemadmin");
	const isAgentSelected = isAgentRoleSelected(form.roleDescriptions);

	const buildSearch = useCallback(
		(updates = {}) => {
			const params = new URLSearchParams(location.search || "");
			params.set("overall", "update-account");
			params.delete("modal");
			params.delete("accountTab");
			Object.entries(updates).forEach(([key, value]) => {
				if (
					value === "" ||
					value == null ||
					value === false ||
					(Array.isArray(value) && !value.length)
				) {
					params.delete(key);
				} else {
					params.set(key, String(value));
				}
			});
			return `?${params.toString()}`;
		},
		[location.search]
	);

	const syncQuery = useCallback(
		(updates = {}, replace = true) => {
			const nextLocation = {
				pathname: location.pathname,
				search: buildSearch(updates),
			};
			if (replace) history.replace(nextLocation);
			else history.push(nextLocation);
		},
		[buildSearch, history, location.pathname]
	);

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			page,
			limit: OVERALL_PAGE_SIZE,
		}),
		[filters, ownerId, page]
	);

	const loadAccounts = useCallback(() => {
		if (!userId || !token) return;
		setLoading(true);
		setError("");
		getOverallAccounts(userId, token, params)
			.then((data) => {
				if (!data || data.error) {
					setResult({ accounts: [], hotels: [], total: 0 });
					setError(data?.error || labels.couldNotLoad);
					return;
				}
				setResult({
					accounts: Array.isArray(data.accounts) ? data.accounts : [],
					hotels: Array.isArray(data.hotels) ? data.hotels : [],
					total: Number(data.total || 0),
					pages: Number(data.pages || 1),
				});
			})
			.catch(() => {
				setResult({ accounts: [], hotels: [], total: 0 });
				setError(labels.couldNotLoad);
			})
			.finally(() => setLoading(false));
	}, [labels.couldNotLoad, params, token, userId]);

	useEffect(() => {
		loadAccounts();
	}, [loadAccounts]);

	useEffect(() => {
		if (typeof setAccountsModalHotels === "function") {
			setAccountsModalHotels(hotels);
		}
	}, [hotels, setAccountsModalHotels]);

	useEffect(() => {
		if (!selectedAccount) {
			setForm(emptyForm);
			return;
		}
		const roles = isSystemAdminAccount(selectedAccount)
			? ["systemadmin"]
			: accountRoleDescriptions(selectedAccount);
		const selectedHotelIds = accountHotelIds(selectedAccount, hotels);
		setForm({
			accountId: selectedAccount._id || "",
			hotelIds: selectedHotelIds,
			roleDescriptions: roles,
			accessTo: Array.isArray(selectedAccount.accessTo)
				? selectedAccount.accessTo
				: defaultAccessForRoles(roles),
			name: selectedAccount.name || "",
			email: selectedAccount.emailIsPlaceholder ? "" : selectedAccount.email || "",
			phone: selectedAccount.phone || "",
			companyName: selectedAccount.companyName || "",
			companyOfficialName: selectedAccount.companyOfficialName || "",
			companyEin: selectedAccount.companyEin || "",
			companyDocuments: normalizeCompanyDocuments(selectedAccount.companyDocuments),
			agentCommercialModel: selectedAccount.agentCommercialModel || "wallet_inventory",
			agentOpeningWalletCredit:
				selectedAccount.agentOpeningWalletCredit ||
				(Array.isArray(selectedAccount.agentWalletOpeningBalances)
					? selectedAccount.agentWalletOpeningBalances[0]?.amount || ""
					: ""),
			password: "",
			activeUser: selectedAccount.activeUser !== false,
		});
	}, [hotels, selectedAccount]);

	const updateFilter = (key, value) => {
		const nextFilters = { ...filters, [key]: value };
		setFilters(nextFilters);
		setPage(1);
		syncQuery(
			{
				accountSearch: nextFilters.search,
				accountRole: nextFilters.role,
				accountStatus: nextFilters.status,
				accountHotelId: nextFilters.hotelId,
				accountPage: 1,
				accountId: "",
			},
			true
		);
		setSelectedAccountId("");
	};

	const goToPage = (nextPage) => {
		const safePage = Math.max(nextPage, 1);
		setPage(safePage);
		setSelectedAccountId("");
		syncQuery({ accountPage: safePage, accountId: "" }, true);
	};

	const selectAccount = (accountId) => {
		const normalizedAccountId = normalizeId(accountId);
		if (!normalizedAccountId) return;
		setSelectedAccountId(normalizedAccountId);
		syncQuery({ accountId: normalizedAccountId }, false);
	};

	const updateForm = (field, value) => {
		setForm((previous) => ({ ...previous, [field]: value }));
	};

	const toggleHotel = (hotelId) => {
		setForm((previous) => {
			const current = previous.hotelIds || [];
			const next = current.includes(hotelId)
				? current.filter((item) => item !== hotelId)
				: [...current, hotelId];
			return { ...previous, hotelIds: next.length ? next : current };
		});
	};

	const toggleRole = (role) => {
		setForm((previous) => {
			const current = previous.roleDescriptions || [];
			if (role === "systemadmin") {
				const roleDescriptions = current.includes("systemadmin")
					? []
					: ["systemadmin"];
				return {
					...previous,
					roleDescriptions,
					accessTo: defaultAccessForRoles(roleDescriptions),
				};
			}
			const next = current.includes(role)
				? current.filter((item) => item !== role)
				: [...current.filter((item) => item !== "systemadmin"), role];
			const roleDescriptions = next.filter((item) => item !== "systemadmin");
			return {
				...previous,
				roleDescriptions,
				accessTo: defaultAccessForRoles(roleDescriptions),
			};
		});
	};

	const toggleAccess = (access) => {
		setForm((previous) => {
			const current = previous.accessTo || [];
			return {
				...previous,
				accessTo: current.includes(access)
					? current.filter((item) => item !== access)
					: [...current, access],
			};
		});
	};

	const handleDocumentUpload = async (event) => {
		const files = Array.from(event.target.files || []);
		event.target.value = "";
		if (!files.length) return;
		const oversized = files.find((file) => file.size > 3 * 1024 * 1024);
		if (oversized) {
			message.error(`${oversized.name} ${labels.fileTooLarge}`);
			return;
		}
		try {
			const documents = await Promise.all(files.map(fileToCompanyDocument));
			setForm((previous) => ({
				...previous,
				companyDocuments: [
					...normalizeCompanyDocuments(previous.companyDocuments),
					...documents,
				].slice(0, 8),
			}));
		} catch (uploadError) {
			message.error(labels.fileReadFailed);
		}
	};

	const removeDocument = (index) => {
		setPreviewDocument(null);
		setForm((previous) => ({
			...previous,
			companyDocuments: normalizeCompanyDocuments(previous.companyDocuments).filter(
				(_, itemIndex) => itemIndex !== index
			),
		}));
	};

	const openDocumentPreview = (document) => {
		const normalizedDocument = normalizeCompanyDocuments([document])[0] || document;
		if (!documentPreviewSource(normalizedDocument)) {
			message.error(labels.previewUnavailable);
			return;
		}
		setPreviewDocument(normalizedDocument);
	};

	const submit = (event) => {
		event.preventDefault();
		if (!selectedAccount) {
			message.error(labels.noSelection);
			return;
		}
		if (!form.hotelIds.length) {
			message.error(labels.chooseAtLeastOneHotel);
			return;
		}
		if (!form.roleDescriptions.length || !form.name || !form.email || !form.phone) {
			message.error(labels.requiredFields);
			return;
		}

		const rolesForPayload = isSystemAdminSelected
			? ["systemadmin"]
			: form.roleDescriptions;
		const selectedRoles = rolesForPayload.map((role) => roleByValue(role));
		const primaryRole =
			selectedRoles.find((role) => role.value === "systemadmin") ||
			selectedRoles.find((role) => role.value === "hotelmanager") ||
			selectedRoles[0];
		const isAgentAccount = rolesForPayload.includes("ordertaker");
		const openingWalletCredit = isAgentAccount
			? form.agentCommercialModel === "commission_only"
				? 0
				: parseMoney(form.agentOpeningWalletCredit)
			: 0;
		const commonPayload = {
			name: form.name,
			email: form.email,
			phone: form.phone,
			activeUser: form.activeUser,
			hotelIdWork: form.hotelIds[0],
			hotelIdsWork: form.hotelIds,
			hotelsToSupport: form.hotelIds,
			hotelIdsOwner: rolesForPayload.includes("systemadmin") ? form.hotelIds : [],
			accessTo: form.accessTo,
		};
		if (form.password) commonPayload.password = form.password;

		const staffPayload = {
			...commonPayload,
			companyName: form.companyName,
			companyOfficialName: form.companyOfficialName,
			companyEin: form.companyEin,
			companyDocuments: normalizeCompanyDocuments(form.companyDocuments),
			agentCommercialModel: isAgentAccount
				? form.agentCommercialModel
				: "wallet_inventory",
			agentOpeningWalletCredit: openingWalletCredit,
			agentWalletOpeningBalances: buildAgentOpeningBalances(
				form.hotelIds,
				openingWalletCredit
			),
			role: primaryRole.role,
			roleDescription: primaryRole.value,
			roles: selectedRoles.map((role) => role.role),
			roleDescriptions: selectedRoles.map((role) => role.value),
		};

		setSaving(true);
		const request = isSystemAdminSelected
			? updateOverallSystemAdmin(userId, token, selectedAccount._id, commonPayload)
			: updateHotelStaffUser(
					userId,
					token,
					form.hotelIds[0] ||
						normalizeId(selectedAccount.hotelIdWork) ||
						accountHotelIds(selectedAccount, hotels)[0],
					selectedAccount._id,
					staffPayload
			  );
		request
			.then((data) => {
				if (!data || data.error) {
					message.error(data?.error || labels.couldNotUpdateAccount);
					return;
				}
				message.success(data?.message || labels.accountSaved);
				loadAccounts();
			})
			.finally(() => setSaving(false));
	};

	const roleSelectOptions = [
		...roleOptions.map((option) => ({
			value: option.value,
			label: isRTL ? option.ar : option.en,
		})),
	];
	const statusOptions = [
		{ value: "active", label: labels.active },
		{ value: "inactive", label: labels.inactive },
	];
	const hotelOptions = hotels.map((hotel) => ({
		value: hotel._id,
		label: titleCase(hotel.hotelName || "Hotel"),
	}));
	const selectedLabel = isRTL ? "محدد" : "selected";

	const noSelectionPrompt = isRTL
		? "يرجى الضغط على حساب من الجدول، أو البحث عن الحساب المراد تحديثه."
		: labels.noSelection;
	const previewSource = documentPreviewSource(previewDocument || {});
	const previewTitle = previewDocument?.fileName || labels.attachmentPreview;
	const previewIsImage = isImageDocument(previewDocument || {});
	const previewIsPdf = isPdfDocument(previewDocument || {});
	const previewFrameSource = previewIsPdf
		? pdfViewerSource(previewSource)
		: previewSource;

	return (
		<OverallPageShell $isRTL={isRTL}>
			<InlineAccountShell $isRTL={isRTL}>
				<OverallToolbar
					onSubmit={(event) => {
						event.preventDefault();
						setPage(1);
						loadAccounts();
					}}
				>
					<input
						value={filters.search}
						onChange={(event) => updateFilter("search", event.target.value)}
						placeholder={labels.searchAccountCompanyPlaceholder}
					/>
					<MultiSelectFilter
						value={filters.hotelId}
						options={hotelOptions}
						onChange={(value) => updateFilter("hotelId", value)}
						allLabel={labels.allHotels}
						selectedLabel={selectedLabel}
						isRTL={isRTL}
					/>
					<MultiSelectFilter
						value={filters.role}
						options={roleSelectOptions}
						onChange={(value) => updateFilter("role", value)}
						allLabel={labels.allRoles}
						selectedLabel={selectedLabel}
						isRTL={isRTL}
					/>
					<MultiSelectFilter
						value={filters.status}
						options={statusOptions}
						onChange={(value) => updateFilter("status", value)}
						allLabel={labels.allStatuses}
						selectedLabel={selectedLabel}
						isRTL={isRTL}
					/>
					<button type='submit'>{labels.search}</button>
					<button
						type='button'
						className='secondary'
						onClick={() => {
							setFilters({ search: "", role: [], status: [], hotelId: [] });
							setPage(1);
							setSelectedAccountId("");
							syncQuery(
								{
									accountSearch: "",
									accountRole: "",
									accountStatus: "",
									accountHotelId: "",
									accountPage: 1,
									accountId: "",
								},
								true
							);
						}}
					>
						{labels.reset}
					</button>
				</OverallToolbar>

				{error && <InlineNote $error>{error}</InlineNote>}

				<UpdateLayout>
					<AccountListPanel>
						<PanelTitle>
							<strong>{labels.currentAccounts}</strong>
							<span>{Number(result.total || 0)}</span>
						</PanelTitle>
						<OverallTableWrap>
							<table>
								<thead>
									<tr>
										<th>#</th>
										<th>{labels.name}</th>
										<th>{labels.hotels}</th>
										<th>{labels.role}</th>
										<th>{labels.status}</th>
										<th>{labels.action}</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan='6'>{labels.loading}</td>
										</tr>
									) : accounts.length ? (
										accounts.map((account, index) => {
											const accountId = normalizeId(account._id || account.id);
											const isSelected = accountId === selectedAccountId;
											return (
											<tr
												key={accountId || `${account.email || "account"}-${index}`}
												role='button'
												tabIndex={0}
												className={isSelected ? "selected" : ""}
												data-selected={isSelected ? "true" : "false"}
												aria-pressed={isSelected}
												onClick={() => selectAccount(accountId)}
												onKeyDown={(event) => {
													if (event.key === "Enter" || event.key === " ") {
														event.preventDefault();
														selectAccount(accountId);
													}
												}}
											>
												<td>{pageRowNumber(page, index, OVERALL_PAGE_SIZE)}</td>
												<td>
													<AccountIdentity>
														<strong>{account.name || "-"}</strong>
														<span>{account.email || account.phone || "-"}</span>
													</AccountIdentity>
												</td>
												<td>{accountHotelNames(account, hotels)}</td>
												<td>{accountRoleText(account, isRTL)}</td>
												<td>
													{(() => {
														const isPendingApplication =
															account.activeUser === false &&
															String(
																account.applicationReview?.status || ""
															).toLowerCase() === "pending";
														const statusValue = isPendingApplication
															? "pending review"
															: account.activeUser
															? "active"
															: "inactive";
														return (
															<StatusPill $tone={statusTone(statusValue)}>
																{isPendingApplication
																	? isRTL
																		? "قيد المراجعة"
																		: "Pending review"
																	: localizeStatus(statusValue, chosenLanguage)}
															</StatusPill>
														);
													})()}
												</td>
												<td>
													<ActionButton
														type='button'
														onClick={(event) => {
															event.stopPropagation();
															selectAccount(accountId);
														}}
													>
														{labels.updateAccount}
													</ActionButton>
												</td>
											</tr>
											);
										})
									) : (
										<tr>
											<td colSpan='6'>{labels.noAccountsFound}</td>
										</tr>
									)}
								</tbody>
							</table>
						</OverallTableWrap>
						<Pager>
							<button type='button' disabled={page <= 1} onClick={() => goToPage(page - 1)}>
								{labels.previous}
							</button>
							<span>
								{labels.page} {page} {labels.of} {pages}
							</span>
							<button type='button' disabled={page >= pages} onClick={() => goToPage(page + 1)}>
								{labels.next}
							</button>
						</Pager>
					</AccountListPanel>

					<EditorPanel>
						<PanelTitle>
							<strong>{labels.selectedAccount}</strong>
							<span>{selectedAccount ? selectedAccount.name : "-"}</span>
						</PanelTitle>
						{selectedAccount ? (
							<AccountForm onSubmit={submit}>
								<SelectionBlock>
									<SelectionHeader>
										<span>{labels.chooseHotels}</span>
										<Requirement $required>{labels.required}</Requirement>
									</SelectionHeader>
									<SelectionGrid>
										{hotels.map((hotel) => (
											<SelectionPill
												type='button'
												key={hotel._id}
												$active={form.hotelIds.includes(hotel._id)}
												onClick={() => toggleHotel(hotel._id)}
											>
												<strong>{titleCase(hotel.hotelName || "Hotel")}</strong>
												<input
													type='checkbox'
													readOnly
													checked={form.hotelIds.includes(hotel._id)}
												/>
											</SelectionPill>
										))}
									</SelectionGrid>
								</SelectionBlock>

								<SelectionBlock>
									<SelectionHeader>
										<span>{labels.roles}</span>
										<Requirement $required>{labels.required}</Requirement>
									</SelectionHeader>
									<SelectionGrid>
										{roleOptions.map((option) => {
											const disabled =
												isSystemAdminSelected &&
												option.value !== "systemadmin";
											return (
												<SelectionPill
													type='button'
													key={option.value}
													disabled={disabled}
													$disabled={disabled}
													$active={form.roleDescriptions.includes(option.value)}
													onClick={() => toggleRole(option.value)}
												>
													<strong>{isRTL ? option.ar : option.en}</strong>
													<input
														type='checkbox'
														readOnly
														checked={form.roleDescriptions.includes(option.value)}
													/>
												</SelectionPill>
											);
										})}
									</SelectionGrid>
									{isSystemAdminSelected && (
										<FieldHint>{labels.systemAdminRoleLocked}</FieldHint>
									)}
								</SelectionBlock>

								{isAgentSelected && (
									<AgentBlock>
										<SelectionHeader>
											<span>{labels.agentCommercialModel}</span>
											<Requirement>{labels.optional}</Requirement>
										</SelectionHeader>
										<CommercialGrid>
											{commercialModelOptions.map((option) => (
												<CommercialOption
													type='button'
													key={option.value}
													$active={form.agentCommercialModel === option.value}
													onClick={() =>
														updateForm("agentCommercialModel", option.value)
													}
												>
													<strong>{isRTL ? option.ar : option.en}</strong>
													<span>{isRTL ? option.arHint : option.enHint}</span>
												</CommercialOption>
											))}
										</CommercialGrid>
										<Field>
											<FieldLabel>
												<span>{labels.openingWalletCredit}</span>
												<Requirement>{labels.optional}</Requirement>
											</FieldLabel>
											<input
												type='number'
												min='0'
												step='0.01'
												dir='ltr'
												value={form.agentOpeningWalletCredit}
												disabled={form.agentCommercialModel === "commission_only"}
												onChange={(event) =>
													updateForm(
														"agentOpeningWalletCredit",
														event.target.value
													)
												}
											/>
											<FieldHint>{labels.openingWalletHint}</FieldHint>
										</Field>
									</AgentBlock>
								)}

								<Field>
									<FieldLabel>
										<span>{labels.name}</span>
										<Requirement $required>{labels.required}</Requirement>
									</FieldLabel>
									<input
										value={form.name}
										onChange={(event) => updateForm("name", event.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel>
										<span>{labels.email}</span>
										<Requirement $required>{labels.required}</Requirement>
									</FieldLabel>
									<input
										type='email'
										dir='ltr'
										value={form.email}
										onChange={(event) => updateForm("email", event.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel>
										<span>{labels.phone}</span>
										<Requirement $required>{labels.required}</Requirement>
									</FieldLabel>
									<input
										dir='ltr'
										value={form.phone}
										onChange={(event) => updateForm("phone", event.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel>
										<span>{labels.companyName}</span>
										<Requirement>{labels.optional}</Requirement>
									</FieldLabel>
									<input
										value={form.companyName}
										disabled={isSystemAdminSelected}
										onChange={(event) =>
											updateForm("companyName", event.target.value)
										}
									/>
								</Field>
								<Field>
									<FieldLabel>
										<span>{labels.companyOfficialName}</span>
										<Requirement>{labels.optional}</Requirement>
									</FieldLabel>
									<input
										value={form.companyOfficialName}
										disabled={isSystemAdminSelected}
										onChange={(event) =>
											updateForm("companyOfficialName", event.target.value)
										}
									/>
								</Field>
								<Field>
									<FieldLabel>
										<span>{labels.companyEin}</span>
										<Requirement>{labels.optional}</Requirement>
									</FieldLabel>
									<input
										dir='ltr'
										value={form.companyEin}
										disabled={isSystemAdminSelected}
										onChange={(event) =>
											updateForm("companyEin", event.target.value)
										}
									/>
								</Field>

								{!isSystemAdminSelected && (
									<DocumentBlock>
										<SelectionHeader>
											<span>{labels.companyDocuments}</span>
											<Requirement>{labels.optional}</Requirement>
										</SelectionHeader>
										<UploadButton type='button'>
											<UploadOutlined />
											<span>{labels.uploadDocuments}</span>
											<input
												type='file'
												accept='image/*,.pdf,application/pdf'
												multiple
												onChange={handleDocumentUpload}
											/>
										</UploadButton>
										<FieldHint>{labels.documentLimitHint}</FieldHint>
										{!!form.companyDocuments.length && (
											<DocumentList>
												{form.companyDocuments.map((document, index) => (
													<DocumentChip key={`${document.fileName}-${index}`}>
														<DocumentPreviewButton
															type='button'
															title={document.fileName}
															onClick={() => openDocumentPreview(document)}
														>
															{document.fileName}
														</DocumentPreviewButton>
														<RemoveDocumentButton
															type='button'
															aria-label={`${labels.removeAttachment} ${
																document.fileName || ""
															}`}
															onClick={() => removeDocument(index)}
														>
															x
														</RemoveDocumentButton>
													</DocumentChip>
												))}
											</DocumentList>
										)}
									</DocumentBlock>
								)}

								<Field>
									<FieldLabel>
										<span>{labels.newPassword}</span>
										<Requirement>{labels.optional}</Requirement>
									</FieldLabel>
									<input
										type='password'
										value={form.password}
										onChange={(event) =>
											updateForm("password", event.target.value)
										}
									/>
									<FieldHint>{labels.newPasswordHint}</FieldHint>
								</Field>

								<ActiveToggle>
									<input
										type='checkbox'
										checked={form.activeUser}
										onChange={(event) =>
											updateForm("activeUser", event.target.checked)
										}
									/>
									<span>{labels.activeAccount}</span>
								</ActiveToggle>

								<AccessBlock>
									<SelectionHeader>
										<span>{labels.access}</span>
										<Requirement>{labels.optional}</Requirement>
									</SelectionHeader>
									<div>
										{accessOptions.map((option) => (
											<label key={option.value}>
												<input
													type='checkbox'
													checked={form.accessTo.includes(option.value)}
													onChange={() => toggleAccess(option.value)}
												/>
												<span>{isRTL ? option.ar : option.en}</span>
											</label>
										))}
									</div>
								</AccessBlock>

								<SaveButton type='submit' disabled={saving || loading}>
									{saving ? labels.savingAccount : labels.saveAccount}
								</SaveButton>
							</AccountForm>
						) : (
							<EmptySelection $isRTL={isRTL}>
								<strong>{labels.selectAccount}</strong>
								<span>{noSelectionPrompt}</span>
							</EmptySelection>
						)}
					</EditorPanel>
				</UpdateLayout>
			</InlineAccountShell>
			<Modal
				open={Boolean(previewDocument)}
				title={`${labels.attachmentPreview}: ${previewTitle}`}
				footer={null}
				width='min(96vw, 1280px)'
				centered
				destroyOnClose
				onCancel={() => setPreviewDocument(null)}
			>
				<DocumentPreviewBody $isRTL={isRTL}>
					{previewSource ? (
						previewIsImage ? (
							<img src={previewSource} alt={previewTitle} />
						) : previewIsPdf ? (
							<iframe
								src={previewFrameSource}
								title={previewTitle}
								loading='lazy'
							/>
						) : (
							<PreviewUnavailable>{labels.previewUnavailable}</PreviewUnavailable>
						)
					) : (
						<PreviewUnavailable>{labels.previewUnavailable}</PreviewUnavailable>
					)}
				</DocumentPreviewBody>
			</Modal>
		</OverallPageShell>
	);
};

export default UpdateExistingAccount;

const InlineAccountShell = styled.section`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	display: grid;
	gap: 0.75rem;
	min-width: 0;
	padding: 0.75rem;
	border: 1px solid #dce8f6;
	border-radius: 12px;
	background: #f8fbff;
	box-shadow: 0 8px 18px rgba(15, 79, 134, 0.08);
`;

const UpdateLayout = styled.div`
	display: grid;
	grid-template-columns: minmax(520px, 0.95fr) minmax(0, 1.15fr);
	gap: 0.75rem;
	align-items: start;
	min-width: 0;

	@media (max-width: 1180px) {
		grid-template-columns: 1fr;
	}
`;

const AccountListPanel = styled.section`
	display: grid;
	gap: 0.55rem;
	min-width: 0;

	${OverallTableWrap} {
		table {
			min-width: 900px;
		}

		tbody tr {
			cursor: pointer;
			transition: background 0.18s ease, box-shadow 0.18s ease,
				transform 0.18s ease;
		}

		tbody tr:hover td {
			background: #f4f9ff;
		}

		tbody tr:focus-visible td {
			background: #f2f8ff;
			box-shadow: inset 0 0 0 2px rgba(22, 119, 255, 0.25);
		}

		tr.selected td {
			background: #e8f3ff;
			border-top-color: #8ec5ff;
			border-bottom-color: #8ec5ff;
			box-shadow: inset 0 1px 0 #8ec5ff, inset 0 -1px 0 #8ec5ff;
		}

		tr.selected td:first-child {
			position: relative;
			box-shadow: inset 0 1px 0 #8ec5ff, inset 0 -1px 0 #8ec5ff;
		}

		tr.selected td:first-child::before {
			content: "";
			position: absolute;
			inset-block: 0;
			inset-inline-start: 0;
			width: 4px;
			border-radius: 4px;
			background: #1677ff;
		}

		tr.selected td:nth-child(2) strong {
			color: #064f9f;
		}
	}
`;

const EditorPanel = styled.section`
	display: grid;
	gap: 0.55rem;
	min-width: 0;
	padding: 0.75rem;
	border: 1px solid #dce8f6;
	border-radius: 12px;
	background: #fff;
	font-size: clamp(0.8rem, 0.76rem + 0.16vw, 0.86rem);
	line-height: 1.38;
`;

const EmptySelection = styled.div`
	display: grid;
	align-content: center;
	justify-items: stretch;
	gap: 0.45rem;
	min-height: 220px;
	padding: 1.25rem;
	border: 1px dashed #b8dcff;
	border-radius: 12px;
	background: #f8fbff;
	color: #17324d;
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	strong {
		width: 100%;
		font-size: 1rem;
		font-weight: 950;
		text-align: inherit;
	}

	span {
		width: 100%;
		color: #52677a;
		font-weight: 850;
		line-height: 1.55;
		text-align: inherit;
	}
`;

const PanelTitle = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	min-width: 0;
	color: #17324d;

	strong {
		font-size: 0.88rem;
		font-weight: 950;
	}

	span {
		min-width: 0;
		color: #52708f;
		font-size: 0.76rem;
		font-weight: 900;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const AccountIdentity = styled.div`
	display: grid;
	gap: 0.18rem;
	min-width: 0;

	strong {
		color: #0f4f86;
		font-size: 0.82rem;
		font-weight: 950;
	}

	span {
		color: #47627d;
		font-size: 0.72rem;
		font-weight: 800;
	}
`;

const AccountForm = styled.form`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.72rem;
	min-width: 0;

	input,
	select {
		width: 100%;
		min-height: 38px;
		border: 1px solid #c8daee;
		border-radius: 9px;
		background: #fff;
		color: #1f2937;
		font-size: 0.84rem;
		font-weight: 700;
		line-height: 1.35;
		padding: 0 0.75rem;
	}

	input:disabled {
		background: #f3f6fa;
		color: #7b8794;
		cursor: not-allowed;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const Field = styled.label`
	display: grid;
	gap: 0.35rem;
	margin: 0;
	min-width: 0;
	color: #25364b;
	font-size: 0.82rem;
	font-weight: 800;
`;

const FieldLabel = styled.span`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	font-size: 0.82rem;
	line-height: 1.35;
`;

const FieldHint = styled.small`
	color: #62748f;
	font-size: 0.73rem;
	font-weight: 800;
	line-height: 1.35;
`;

const Requirement = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 18px;
	padding: 0.08rem 0.38rem;
	border: 1px solid ${(props) => (props.$required ? "#ff7875" : "#91caff")};
	border-radius: 999px;
	background: ${(props) => (props.$required ? "#fff1f0" : "#eef7ff")};
	color: ${(props) => (props.$required ? "#cf1322" : "#0b63b6")};
	font-size: 0.62rem;
	font-weight: 900;
`;

const SelectionBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.5rem;
	min-width: 0;
	padding: 0.65rem;
	border: 1px solid #dce8f6;
	border-radius: 12px;
	background: #fff;
`;

const SelectionHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	color: #17324d;
	font-size: 0.83rem;
	font-weight: 900;
`;

const SelectionGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 0.5rem;
	min-width: 0;
`;

const SelectionPill = styled.button`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.55rem;
	min-height: 40px;
	min-width: 0;
	padding: 0.4rem 0.58rem;
	border: 1px solid
		${(props) =>
			props.$active ? "#1677ff" : props.$disabled ? "#e4e7ec" : "#cfe1f4"};
	border-radius: 10px;
	background: ${(props) =>
		props.$active ? "#eef6ff" : props.$disabled ? "#f3f6fa" : "#fff"};
	color: ${(props) => (props.$disabled ? "#8a95a3" : "#102033")};
	font-size: 0.84rem;
	box-shadow: ${(props) =>
		props.$active ? "0 8px 18px rgba(22, 119, 255, 0.12)" : "none"};
	text-align: start;
	cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};

	strong {
		min-width: 0;
		font-size: 0.84rem;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	input {
		flex: 0 0 auto;
		width: 15px;
		min-height: 15px;
	}
`;

const AgentBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.58rem;
	padding: 0.65rem;
	border: 1px solid #cfe8ff;
	border-radius: 12px;
	background: #f4f9ff;
`;

const CommercialGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 0.5rem;
`;

const CommercialOption = styled.button`
	display: grid;
	gap: 0.25rem;
	min-height: 74px;
	padding: 0.58rem;
	border: 1px solid ${(props) => (props.$active ? "#1677ff" : "#cfe1f4")};
	border-radius: 10px;
	background: ${(props) => (props.$active ? "#eef6ff" : "#fff")};
	color: #102033;
	font-size: 0.82rem;
	text-align: start;

	span {
		color: #62748f;
		font-size: 0.72rem;
		font-weight: 700;
	}
`;

const DocumentBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.55rem;
	padding: 0.65rem;
	border: 1px dashed #b8dcff;
	border-radius: 12px;
	background: #fff;
`;

const UploadButton = styled.button`
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.45rem;
	justify-self: start;
	min-height: 34px;
	padding: 0 0.78rem;
	border: 1px solid #8ec5ff;
	border-radius: 999px;
	background: #eef7ff;
	color: #0b63b6;
	font-size: 0.78rem;
	font-weight: 900;
	overflow: hidden;

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
`;

const DocumentChip = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	max-width: 100%;
	padding: 0.28rem 0.5rem;
	border: 1px solid #b8dcff;
	border-radius: 999px;
	background: #f7fbff;
	font-size: 0.75rem;
	font-weight: 800;
	min-width: 0;
`;

const DocumentPreviewButton = styled.button`
	max-width: min(320px, 64vw);
	min-width: 0;
	border: 0;
	background: transparent;
	color: #17324d;
	font: inherit;
	font-weight: 850;
	overflow: hidden;
	padding: 0;
	text-align: start;
	text-overflow: ellipsis;
	white-space: nowrap;
	cursor: pointer;

	&:hover,
	&:focus-visible {
		color: #0b63b6;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
`;

const RemoveDocumentButton = styled.button`
	flex: 0 0 auto;
	border: 0;
	background: transparent;
	color: #b42318;
	font-size: 0.8rem;
	font-weight: 950;
	line-height: 1;
	padding: 0.1rem;
	cursor: pointer;
`;

const DocumentPreviewBody = styled.div`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	display: grid;
	gap: 0.75rem;
	min-height: 320px;
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};

	img {
		display: block;
		width: 100%;
		max-height: min(78vh, 820px);
		object-fit: contain;
		border: 1px solid #dce8f6;
		border-radius: 10px;
		background: #f8fbff;
	}

	iframe {
		width: 100%;
		height: min(78vh, 820px);
		min-height: 560px;
		border: 1px solid #dce8f6;
		border-radius: 10px;
		background: #f8fbff;
	}

	@media (max-width: 640px) {
		min-height: 260px;

		iframe {
			min-height: 360px;
		}
	}
`;

const PreviewUnavailable = styled.p`
	margin: 0;
	padding: 1rem;
	border: 1px dashed #b8dcff;
	border-radius: 10px;
	background: #f8fbff;
	color: #52677a;
	font-weight: 850;
`;

const ActiveToggle = styled.label`
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	min-height: 36px;
	margin: 0;
	padding: 0.42rem 0.65rem;
	border: 1px solid #b8dcff;
	border-radius: 999px;
	background: #f7fbff;
	color: #17324d;
	font-size: 0.8rem;
	font-weight: 900;

	input {
		width: 15px;
		min-height: 15px;
	}
`;

const AccessBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.55rem;
	padding: 0.65rem;
	border: 1px solid #dce8f6;
	border-radius: 12px;
	background: #fff;

	> div:last-child {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.32rem 0.55rem;
		border: 1px solid #b8dcff;
		border-radius: 999px;
		background: #f7fbff;
		font-size: 0.78rem;
		font-weight: 800;
	}

	input {
		width: 15px;
		min-height: 15px;
	}
`;

const SaveButton = styled.button`
	grid-column: 1 / -1;
	justify-self: end;
	min-width: 180px;
	min-height: 40px;
	border: 0;
	border-radius: 10px;
	background: #1677ff;
	color: #fff;
	font-size: 0.84rem;
	font-weight: 900;
	box-shadow: 0 8px 18px rgba(22, 119, 255, 0.18);

	&:disabled {
		opacity: 0.58;
		cursor: not-allowed;
	}

	@media (max-width: 560px) {
		width: 100%;
	}
`;
