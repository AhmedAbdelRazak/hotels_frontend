import React, { useEffect, useMemo, useState } from "react";
import { CopyOutlined, LinkOutlined, MailOutlined, SendOutlined, UploadOutlined } from "@ant-design/icons";
import { Input, message, Modal } from "antd";
import styled from "styled-components";
import { signupHotelStaff } from "../../../auth";
import { createSignupInvitation, getOverallAccounts } from "../../apiAdmin";
import {
	buildOwnerParams,
	getOverallText,
	InlineNote,
	normalizeId,
	OverallPageShell,
	titleCase,
} from "../overallShared";

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

const jobRoleOptions = [
	"reception",
	"reservationemployee",
	"finance",
	"housekeeping",
	"housekeepingmanager",
	"hotelmanager",
];

const ACCOUNT_MODE_STAFF = "staff";
const ACCOUNT_MODE_AGENT = "agent";

const staffRoleOptions = roleOptions.filter((option) => option.value !== "ordertaker");

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

const textByLang = {
	en: {
		currentAccounts: "Current accounts",
		addAccount: "Add new account",
		required: "Required",
		optional: "Optional",
		chooseHotels: "Choose hotels",
		roles: "Roles",
		name: "Name",
		email: "Email",
		phone: "Phone",
		companyName: "Company name",
		companyOfficialName: "Official company name",
		companyEin: "Company EIN / tax number",
		companyDocuments: "Company attachments",
		uploadDocuments: "Upload documents",
		documentLimitHint: "PDF or image files, up to 3 MB each.",
		password: "Password",
		confirmPassword: "Confirm password",
		access: "Access limits",
		createAccount: "Create account",
		creating: "Creating...",
		loadingHotels: "Loading hotels...",
		noHotels: "No hotels are available for this owner scope.",
		requiredFields: "Please complete the required account fields.",
		passwordsMismatch: "Passwords do not match.",
		created: "Account created successfully.",
		fileTooLarge: "is larger than 3 MB.",
		fileReadFailed: "Could not read one of the selected files.",
		agentCommercialModel: "Agent business model",
		openingWalletCredit: "Opening wallet credit",
		openingWalletHint:
			"Leave as zero when this agent has no starting wallet credit.",
		generateCustomLink: "Generate custom link for an agent",
		agentCreationTab: "External Agents",
		staffCreationTab: "Internal Staff",
		generateAgentLink: "Generate agent link",
		generateStaffLink: "Generate staff link",
		createAgentAccount: "Create agent account",
		createStaffAccount: "Create staff account",
		invitationTitle: "Signup invitation link",
		invitationType: "Application type",
		agentInvite: "Agent",
		employeeInvite: "Employee",
		employeeRole: "Employee role",
		optionalPrefill: "Optional prefill",
		linkUpdates: "The link updates automatically as you change the options.",
		generatedLink: "Generated link",
		copyLink: "Copy link",
		copied: "Link copied.",
		emailLink: "Email link",
		whatsappLink: "WhatsApp",
		generateLink: "Generate link",
		linkGenerated: "Link generated successfully.",
		securingLink: "Securing link...",
	},
	ar: {
		currentAccounts: "الحسابات الحالية",
		addAccount: "إضافة حساب جديد",
		required: "مطلوب",
		optional: "اختياري",
		chooseHotels: "اختر الفنادق",
		roles: "الأدوار",
		name: "الاسم",
		email: "البريد الإلكتروني",
		phone: "الهاتف",
		companyName: "اسم الشركة",
		companyOfficialName: "الاسم الرسمي للشركة",
		companyEin: "الرقم الضريبي / السجل",
		companyDocuments: "مرفقات الشركة",
		uploadDocuments: "رفع المرفقات",
		documentLimitHint: "PDF أو صور، بحد أقصى 3 ميجابايت لكل ملف.",
		password: "كلمة المرور",
		confirmPassword: "تأكيد كلمة المرور",
		access: "الصلاحيات",
		createAccount: "إنشاء الحساب",
		creating: "جاري الإنشاء...",
		loadingHotels: "جاري تحميل الفنادق...",
		noHotels: "لا توجد فنادق متاحة لهذا النطاق.",
		requiredFields: "يرجى إكمال الحقول المطلوبة للحساب.",
		passwordsMismatch: "كلمتا المرور غير متطابقتين.",
		created: "تم إنشاء الحساب بنجاح.",
		fileTooLarge: "أكبر من 3 ميجابايت.",
		fileReadFailed: "تعذر قراءة أحد الملفات المحددة.",
		agentCommercialModel: "طريقة عمل الوكيل",
		openingWalletCredit: "رصيد افتتاحي للمحفظة",
		openingWalletHint:
			"اتركه صفرا إذا لم يكن للوكيل رصيد افتتاحي.",
		generateCustomLink: "إنشاء رابط مخصص لوكيل",
		agentCreationTab: "الوكلاء الخارجيون",
		staffCreationTab: "موظفو الفندق",
		generateAgentLink: "إنشاء رابط وكيل",
		generateStaffLink: "إنشاء رابط موظف",
		createAgentAccount: "إنشاء حساب وكيل",
		createStaffAccount: "إنشاء حساب موظف",
		invitationTitle: "رابط دعوة التسجيل",
		invitationType: "نوع الطلب",
		agentInvite: "وكيل",
		employeeInvite: "موظف",
		employeeRole: "دور الموظف",
		optionalPrefill: "بيانات اختيارية للتعبئة المسبقة",
		linkUpdates: "يتم تحديث الرابط تلقائيا عند تغيير الاختيارات.",
		generatedLink: "الرابط المولد",
		copyLink: "نسخ الرابط",
		copied: "تم نسخ الرابط.",
		emailLink: "إرسال بالبريد",
		whatsappLink: "واتساب",
		securingLink: "جاري تأمين الرابط...",
	},
};

const initialForm = {
	hotelIds: [],
	roleDescriptions: [],
	accessTo: [],
	name: "",
	email: "",
	phone: "",
	companyName: "",
	companyOfficialName: "",
	companyEin: "",
	companyDocuments: [],
	agentCommercialModel: "",
	agentOpeningWalletCredit: "",
	password: "",
	password2: "",
};

const initialInvitationForm = {
	accountType: "",
	hotelIds: [],
	requestedRoleDescription: "",
	name: "",
	email: "",
	phone: "",
	companyName: "",
	companyOfficialName: "",
	companyEin: "",
	agentCommercialModel: "",
	agentOpeningWalletCredit: "",
	applicationNotes: "",
};

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
	...new Set((Array.isArray(roles) ? roles : []).flatMap(defaultAccessForRole)),
];

const initialFormForMode = (mode) => {
	if (mode === ACCOUNT_MODE_AGENT) {
		return {
			...initialForm,
			roleDescriptions: ["ordertaker"],
			accessTo: defaultAccessForRoles(["ordertaker"]),
			agentCommercialModel: "wallet_inventory",
		};
	}
	return initialForm;
};

const invitationFormForMode = (mode, hotelIds = []) => {
	const scopedHotelIds = Array.isArray(hotelIds) ? hotelIds.filter(Boolean) : [];
	const accountType = mode === ACCOUNT_MODE_AGENT ? "agent" : "job";
	return {
		...initialInvitationForm,
		accountType,
		hotelIds: accountType === "job" ? scopedHotelIds.slice(0, 1) : scopedHotelIds,
		agentCommercialModel: accountType === "agent" ? "wallet_inventory" : "",
	};
};

const parseMoney = (value) => {
	const parsed = Number(String(value ?? 0).replace(/,/g, "").trim());
	return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0;
};

const buildAgentOpeningBalances = (hotelIds = [], amount = 0) =>
	hotelIds.filter(Boolean).map((hotelId) => ({ hotelId, amount: parseMoney(amount) }));

const normalizeCompanyDocuments = (documents = []) =>
	(Array.isArray(documents) ? documents : [])
		.filter((document) => document && (document.fileName || document.dataUrl))
		.map((document) => ({
			fileName: String(document.fileName || "Company document"),
			fileType: String(document.fileType || ""),
			fileSize: Number(document.fileSize || 0),
			dataUrl: document.dataUrl || "",
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

const normalizeHotelOption = (hotel) => {
	const id = normalizeId(hotel);
	if (!id) return null;
	return {
		...(hotel && typeof hotel === "object" ? hotel : {}),
		_id: id,
		hotelName:
			(hotel && typeof hotel === "object" && (hotel.hotelName || hotel.name)) ||
			"Hotel",
		ownerId:
			(hotel && typeof hotel === "object" && normalizeId(hotel.ownerId || hotel.belongsTo)) ||
			"",
	};
};

const hotelOptionSignature = (hotel) => {
	const normalizedHotel = normalizeHotelOption(hotel);
	if (!normalizedHotel) return "";
	return [
		normalizedHotel._id,
		normalizedHotel.hotelName || "",
		normalizedHotel.ownerId || "",
	].join("::");
};

const hotelOptionsSignature = (hotelList = []) =>
	(Array.isArray(hotelList) ? hotelList : [])
		.map(hotelOptionSignature)
		.filter(Boolean)
		.join("|");

const stringListSignature = (values = []) =>
	(Array.isArray(values) ? values : []).map(String).join("|");

const hotelFallbackKeyForUser = (user = {}) =>
	JSON.stringify(
		[
			...(Array.isArray(user?.hotelIdsOwner) ? user.hotelIdsOwner : []),
			...(Array.isArray(user?.hotelIdsWork) ? user.hotelIdsWork : []),
			...(Array.isArray(user?.hotelsToSupport) ? user.hotelsToSupport : []),
		]
			.map(normalizeHotelOption)
			.filter(Boolean)
			.map(({ _id, hotelName, ownerId }) => ({ _id, hotelName, ownerId }))
	);

const CreateNewAccount = ({
	userId,
	user,
	token,
	ownerId,
	chosenLanguage,
	setAccountsModalHotels,
}) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = { ...common, ...textByLang[isRTL ? "ar" : "en"] };
	const [form, setForm] = useState(initialForm);
	const [activeAccountMode, setActiveAccountMode] = useState(ACCOUNT_MODE_STAFF);
	const [hotels, setHotels] = useState([]);
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [invitationOpen, setInvitationOpen] = useState(false);
	const [invitationForm, setInvitationForm] = useState(initialInvitationForm);
	const [invitationToken, setInvitationToken] = useState("");
	const [invitationCode, setInvitationCode] = useState("");
	const [invitationLoading, setInvitationLoading] = useState(false);

	const params = useMemo(
		() => ({ ...buildOwnerParams(ownerId), limit: 1 }),
		[ownerId]
	);
	const userHotelFallbackKey = hotelFallbackKeyForUser(user);
	const userHotelFallbacks = useMemo(() => {
		try {
			return JSON.parse(userHotelFallbackKey);
		} catch {
			return [];
		}
	}, [userHotelFallbackKey]);
	const userHotelFallbacksSignature = useMemo(
		() => hotelOptionsSignature(userHotelFallbacks),
		[userHotelFallbacks]
	);

	useEffect(() => {
		if (!userId || !token) return;
		let active = true;
		setLoading(true);
		getOverallAccounts(userId, token, params)
			.then((data) => {
				if (!active) return;
				const scopedHotels = Array.isArray(data?.hotels)
					? data.hotels.map(normalizeHotelOption).filter(Boolean)
					: [];
				const nextHotels = scopedHotels.length
					? scopedHotels
					: userHotelFallbacks;
				setHotels((previousHotels) =>
					hotelOptionsSignature(previousHotels) ===
					hotelOptionsSignature(nextHotels)
						? previousHotels
						: nextHotels
				);
				setForm((previous) => {
					const nextHotelIds = previous.hotelIds.length
						? previous.hotelIds.filter((hotelId) =>
								nextHotels.some((hotel) => hotel._id === hotelId)
						  )
						: [];
					if (
						stringListSignature(previous.hotelIds) ===
						stringListSignature(nextHotelIds)
					) {
						return previous;
					}
					return {
						...previous,
						hotelIds: nextHotelIds,
					};
				});
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [params, token, userHotelFallbacks, userHotelFallbacksSignature, userId]);

	useEffect(() => {
		if (typeof setAccountsModalHotels === "function") {
			setAccountsModalHotels(hotels);
		}
	}, [hotels, setAccountsModalHotels]);

	useEffect(() => {
		setInvitationForm((previous) => {
			const availableIds = new Set(hotels.map((hotel) => hotel._id));
			const nextHotelIds = previous.hotelIds.filter((hotelId) =>
				availableIds.has(hotelId)
			);
			const normalizedHotelIds =
				previous.accountType === "job" && nextHotelIds.length
					? [nextHotelIds[0]]
					: nextHotelIds;
			if (
				stringListSignature(previous.hotelIds) ===
				stringListSignature(normalizedHotelIds)
			) {
				return previous;
			}
			return { ...previous, hotelIds: normalizedHotelIds };
		});
	}, [hotels]);

	useEffect(() => {
		setInvitationToken("");
		setInvitationCode("");
	}, [invitationForm]);

	const invitationLink = useMemo(() => {
		if (!invitationCode && !invitationToken) return "";
		const origin =
			typeof window !== "undefined" && window.location?.origin
				? window.location.origin
				: "";
		const params = new URLSearchParams();
		if (invitationCode) params.set("invite", invitationCode);
		else if (invitationToken) params.set("invitationToken", invitationToken);
		const query = params.toString();
		return query ? `${origin}/signup?${query}` : `${origin}/signup`;
	}, [invitationCode, invitationToken]);

	const invitationReady = Boolean(invitationCode || invitationToken);
	const canGenerateInvitationLink =
		Boolean(invitationForm.accountType) &&
		invitationForm.hotelIds.length > 0 &&
		(invitationForm.accountType !== "job" ||
			Boolean(invitationForm.requestedRoleDescription));

	const updateForm = (field, value) => {
		setForm((previous) => ({ ...previous, [field]: value }));
	};

	const updateInvitationForm = (field, value) => {
		setInvitationForm((previous) => ({ ...previous, [field]: value }));
	};

	const switchAccountMode = (mode) => {
		if (mode === activeAccountMode) return;
		setActiveAccountMode(mode);
		setInvitationOpen(false);
		setInvitationCode("");
		setInvitationToken("");
		setInvitationForm(invitationFormForMode(mode, form.hotelIds));
		setForm((previous) => {
			if (mode === ACCOUNT_MODE_AGENT) {
				return {
					...previous,
					roleDescriptions: ["ordertaker"],
					accessTo: defaultAccessForRoles(["ordertaker"]),
					agentCommercialModel:
						previous.agentCommercialModel || "wallet_inventory",
				};
			}
			const staffRoles = previous.roleDescriptions.filter(
				(role) => role !== "ordertaker"
			);
			return {
				...previous,
				roleDescriptions: staffRoles,
				accessTo: staffRoles.length ? defaultAccessForRoles(staffRoles) : [],
				agentCommercialModel: "",
				agentOpeningWalletCredit: "",
			};
		});
	};

	const openInvitationModal = () => {
		setInvitationForm(invitationFormForMode(activeAccountMode, form.hotelIds));
		setInvitationCode("");
		setInvitationToken("");
		setInvitationOpen(true);
	};

	const toggleInvitationHotel = (hotelId) => {
		setInvitationForm((previous) => {
			if (previous.accountType === "job") {
				return { ...previous, hotelIds: [hotelId] };
			}
			const current = previous.hotelIds || [];
			const next = current.includes(hotelId)
				? current.filter((item) => item !== hotelId)
				: [...current, hotelId];
			return { ...previous, hotelIds: next };
		});
	};

	const validateInvitationForm = () => {
		if (
			!canGenerateInvitationLink ||
			(invitationForm.accountType === "job" &&
				!invitationForm.requestedRoleDescription)
		) {
			message.error(labels.requiredFields);
			return false;
		}
		return true;
	};

	const generateInvitationLink = () => {
		if (!validateInvitationForm() || !userId || !token) return;
		setInvitationLoading(true);
		setInvitationCode("");
		setInvitationToken("");
		const payload = {
			...invitationForm,
			hotelIds:
				invitationForm.accountType === "job"
					? invitationForm.hotelIds.slice(0, 1)
					: invitationForm.hotelIds,
			roleDescription:
				invitationForm.accountType === "agent"
					? "ordertaker"
					: invitationForm.requestedRoleDescription,
		};
		createSignupInvitation(userId, token, payload, buildOwnerParams(ownerId))
			.then((data) => {
				if (data?.code || data?.token) {
					setInvitationCode(data.code || "");
					setInvitationToken(data.token || "");
					message.success(
						isRTL
							? "تم إنشاء الرابط بنجاح."
							: labels.linkGenerated || "Link generated successfully."
					);
				} else if (data?.error) {
					message.error(data.error);
				}
			})
			.finally(() => setInvitationLoading(false));
	};

	const copyInvitationLink = async () => {
		if (!invitationReady) return;
		try {
			await navigator.clipboard.writeText(invitationLink);
			message.success(labels.copied);
		} catch {
			const textArea = document.createElement("textarea");
			textArea.value = invitationLink;
			textArea.style.position = "fixed";
			textArea.style.opacity = "0";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
			message.success(labels.copied);
		}
	};

	const emailInvitationLink = () => {
		if (!invitationReady) return;
		const subject = isRTL
			? "رابط التسجيل في نظام إدارة الفنادق"
			: "Hotel management signup link";
		const body = isRTL
			? `يرجى إكمال طلب التسجيل من خلال الرابط التالي:\n${invitationLink}`
			: `Please complete your signup request using this link:\n${invitationLink}`;
		window.location.href = `mailto:${encodeURIComponent(
			invitationForm.email || ""
		)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	};

	const whatsappInvitationLink = () => {
		if (!invitationReady) return;
		const phone = String(invitationForm.phone || "").replace(/\D/g, "");
		const text = isRTL
			? `يرجى إكمال طلب التسجيل من خلال الرابط التالي:\n${invitationLink}`
			: `Please complete your signup request using this link:\n${invitationLink}`;
		const url = phone
			? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
			: `https://wa.me/?text=${encodeURIComponent(text)}`;
		window.open(url, "_blank", "noopener,noreferrer");
	};

	const toggleHotel = (hotelId) => {
		setForm((previous) => {
			const current = previous.hotelIds || [];
			const next = current.includes(hotelId)
				? current.filter((item) => item !== hotelId)
				: [...current, hotelId];
			return { ...previous, hotelIds: next };
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
		} catch (error) {
			message.error(labels.fileReadFailed);
		}
	};

	const removeDocument = (index) => {
		setForm((previous) => ({
			...previous,
			companyDocuments: normalizeCompanyDocuments(previous.companyDocuments).filter(
				(_, itemIndex) => itemIndex !== index
			),
		}));
	};

	const resetForm = () => {
		setForm(initialFormForMode(activeAccountMode));
	};

	const submit = (event) => {
		event.preventDefault();
		const roleDescriptionsForSubmit =
			activeAccountMode === ACCOUNT_MODE_AGENT
				? ["ordertaker"]
				: form.roleDescriptions.filter((role) => role !== "ordertaker");
		if (
			!form.hotelIds.length ||
			!roleDescriptionsForSubmit.length ||
			!form.name ||
			!form.email ||
			!form.phone ||
			!form.password
		) {
			message.error(labels.requiredFields);
			return;
		}
		if (form.password !== form.password2) {
			message.error(labels.passwordsMismatch);
			return;
		}

		const selectedRoles = roleDescriptionsForSubmit
			.map((role) => roleOptions.find((option) => option.value === role))
			.filter(Boolean);
		const primaryRole =
			selectedRoles.find((role) => role.value === "systemadmin") ||
			selectedRoles.find((role) => role.value === "hotelmanager") ||
			selectedRoles[0];
		const isAgentAccount = activeAccountMode === ACCOUNT_MODE_AGENT;
		const openingWalletCredit = isAgentAccount
			? form.agentCommercialModel === "commission_only"
				? 0
				: parseMoney(form.agentOpeningWalletCredit)
			: 0;
		const accessToForPayload = form.accessTo.length
			? form.accessTo
			: defaultAccessForRoles(roleDescriptionsForSubmit);

		setCreating(true);
		signupHotelStaff(userId, token, {
			name: form.name,
			email: form.email,
			phone: form.phone,
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
			password: form.password,
			password2: form.password2,
			role: primaryRole.role,
			roleDescription: primaryRole.value,
			roles: selectedRoles.map((role) => role.role),
			roleDescriptions: selectedRoles.map((role) => role.value),
			hotelIdWork: form.hotelIds[0],
			hotelIdsWork: form.hotelIds,
			hotelsToSupport: form.hotelIds,
			accessTo: accessToForPayload,
		})
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					return;
				}
				message.success(data?.message || labels.created);
				resetForm();
			})
			.finally(() => setCreating(false));
	};

	const isAgentMode = activeAccountMode === ACCOUNT_MODE_AGENT;
	const isSystemAdminSelected =
		!isAgentMode && form.roleDescriptions.includes("systemadmin");
	const isAgentSelected = isAgentMode;
	const accountModeTabs = [
		{ value: ACCOUNT_MODE_STAFF, label: labels.staffCreationTab },
		{ value: ACCOUNT_MODE_AGENT, label: labels.agentCreationTab },
	];
	const invitationButtonLabel = isAgentMode
		? labels.generateAgentLink
		: labels.generateStaffLink;

	return (
		<OverallPageShell $isRTL={isRTL}>
			<InlineAccountShell $isRTL={isRTL}>
				<WorkflowHeader>
					<AccountModeTabs>
						{accountModeTabs.map((tab) => (
							<button
								type='button'
								key={tab.value}
								className={activeAccountMode === tab.value ? "active" : ""}
								onClick={() => switchAccountMode(tab.value)}
							>
								{tab.label}
							</button>
						))}
					</AccountModeTabs>
					<InviteToolbar>
						<InviteButton type='button' onClick={openInvitationModal}>
							<LinkOutlined />
							<span>{invitationButtonLabel}</span>
						</InviteButton>
					</InviteToolbar>
				</WorkflowHeader>

				<Modal
					open={invitationOpen}
					onCancel={() => setInvitationOpen(false)}
					footer={null}
					width={860}
					title={labels.invitationTitle}
					destroyOnClose={false}
				>
					<InvitationModalBody $isRTL={isRTL}>
						<SelectionBlock $compact>
							<SelectionHeader>
								<span>{labels.invitationType}</span>
								<Requirement $required>{labels.required}</Requirement>
							</SelectionHeader>
							<ChoiceRow $single>
								<SelectionPill type='button' $active $passive tabIndex={-1}>
									<strong>
										{invitationForm.accountType === "agent"
											? labels.agentInvite
											: labels.employeeInvite}
									</strong>
								</SelectionPill>
							</ChoiceRow>
						</SelectionBlock>

						<SelectionBlock>
							<SelectionHeader>
								<span>{labels.chooseHotels}</span>
								<Requirement $required>{labels.required}</Requirement>
							</SelectionHeader>
							<SelectionGrid>
								{loading ? (
									<InlineNote>{labels.loadingHotels}</InlineNote>
								) : hotels.length ? (
									hotels.map((hotel) => (
										<SelectionPill
											type='button'
											key={hotel._id}
											$active={invitationForm.hotelIds.includes(hotel._id)}
											onClick={() => toggleInvitationHotel(hotel._id)}
										>
											<strong>{titleCase(hotel.hotelName || "Hotel")}</strong>
											<input
												type={invitationForm.accountType === "job" ? "radio" : "checkbox"}
												readOnly
												checked={invitationForm.hotelIds.includes(hotel._id)}
											/>
										</SelectionPill>
									))
								) : (
									<InlineNote $error>{labels.noHotels}</InlineNote>
								)}
							</SelectionGrid>
						</SelectionBlock>

						{invitationForm.accountType === "job" ? (
							<Field>
								<FieldLabel>
									<span>{labels.employeeRole}</span>
									<Requirement $required>{labels.required}</Requirement>
								</FieldLabel>
								<select
									value={invitationForm.requestedRoleDescription}
									onChange={(event) =>
										updateInvitationForm(
											"requestedRoleDescription",
											event.target.value
										)
									}
								>
									<option value=''>{labels.employeeRole}</option>
									{jobRoleOptions.map((role) => {
										const option = roleOptions.find((item) => item.value === role);
										return (
											<option key={role} value={role}>
												{isRTL ? option?.ar || role : option?.en || role}
											</option>
										);
									})}
								</select>
							</Field>
						) : invitationForm.accountType === "agent" ? (
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
											$active={
												invitationForm.agentCommercialModel === option.value
											}
											onClick={() =>
												updateInvitationForm(
													"agentCommercialModel",
													option.value
												)
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
										value={invitationForm.agentOpeningWalletCredit}
										disabled={
											invitationForm.agentCommercialModel === "commission_only"
										}
										onChange={(event) =>
											updateInvitationForm(
												"agentOpeningWalletCredit",
												event.target.value
											)
										}
									/>
									<FieldHint>{labels.openingWalletHint}</FieldHint>
								</Field>
							</AgentBlock>
						) : null}

						<SelectionBlock>
							<SelectionHeader>
								<span>{labels.optionalPrefill}</span>
								<Requirement>{labels.optional}</Requirement>
							</SelectionHeader>
							<InvitationFields>
								{[
									["name", labels.name],
									["email", labels.email],
									["phone", labels.phone],
									["companyName", labels.companyName],
									["companyOfficialName", labels.companyOfficialName],
									["companyEin", labels.companyEin],
								].map(([field, label]) => (
									<Field key={field}>
										<FieldLabel>
											<span>{label}</span>
											<Requirement>{labels.optional}</Requirement>
										</FieldLabel>
										<input
											dir={["email", "phone", "companyEin"].includes(field) ? "ltr" : undefined}
											value={invitationForm[field]}
											onChange={(event) =>
												updateInvitationForm(field, event.target.value)
											}
										/>
									</Field>
								))}
							</InvitationFields>
						</SelectionBlock>

						<LinkBox>
							<FieldLabel>
								<span>{labels.generatedLink}</span>
								<Requirement>{invitationLoading ? labels.securingLink : labels.optional}</Requirement>
							</FieldLabel>
							<textarea readOnly dir='ltr' value={invitationLink} />
						</LinkBox>

						<InviteActions>
							<InviteActionButton
								type='button'
								onClick={generateInvitationLink}
								disabled={invitationLoading || !canGenerateInvitationLink}
							>
								<LinkOutlined />
								<span>
									{invitationLoading
										? labels.securingLink
										: isRTL
										? "إنشاء الرابط"
										: labels.generateLink || "Generate link"}
								</span>
							</InviteActionButton>
							<InviteActionButton
								type='button'
								onClick={copyInvitationLink}
								disabled={!invitationReady}
							>
								<CopyOutlined />
								<span>{labels.copyLink}</span>
							</InviteActionButton>
							<InviteActionButton
								type='button'
								onClick={emailInvitationLink}
								disabled={!invitationReady}
							>
								<MailOutlined />
								<span>{labels.emailLink}</span>
							</InviteActionButton>
							<InviteActionButton
								type='button'
								onClick={whatsappInvitationLink}
								disabled={!invitationReady}
							>
								<SendOutlined />
								<span>{labels.whatsappLink}</span>
							</InviteActionButton>
						</InviteActions>
					</InvitationModalBody>
				</Modal>

				<AccountForm onSubmit={submit}>
					<SelectionBlock $halfOnDesktop={!isAgentMode}>
						<SelectionHeader>
							<span>{labels.chooseHotels}</span>
							<Requirement $required>{labels.required}</Requirement>
						</SelectionHeader>
						<SelectionGrid>
							{loading ? (
								<InlineNote>{labels.loadingHotels}</InlineNote>
							) : hotels.length ? (
								hotels.map((hotel) => (
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
								))
							) : (
								<InlineNote $error>{labels.noHotels}</InlineNote>
							)}
						</SelectionGrid>
					</SelectionBlock>

					{!isAgentMode && (
						<SelectionBlock $halfOnDesktop>
							<SelectionHeader>
								<span>{labels.roles}</span>
								<Requirement $required>{labels.required}</Requirement>
							</SelectionHeader>
							<SelectionGrid>
								{staffRoleOptions.map((option) => (
									<SelectionPill
										type='button'
										key={option.value}
										disabled={
											isSystemAdminSelected && option.value !== "systemadmin"
										}
										$disabled={
											isSystemAdminSelected && option.value !== "systemadmin"
										}
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
								))}
							</SelectionGrid>
						</SelectionBlock>
					)}

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
										onClick={() => updateForm("agentCommercialModel", option.value)}
									>
										<strong>{isRTL ? option.ar : option.en}</strong>
										<span>{isRTL ? option.arHint : option.enHint}</span>
									</CommercialOption>
								))}
							</CommercialGrid>
							<label>
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
										updateForm("agentOpeningWalletCredit", event.target.value)
									}
								/>
								<FieldHint>{labels.openingWalletHint}</FieldHint>
							</label>
						</AgentBlock>
					)}

					<Field>
						<FieldLabel>
							<span>{labels.name}</span>
							<Requirement $required>{labels.required}</Requirement>
						</FieldLabel>
						<input value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
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
							onChange={(event) => updateForm("companyName", event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel>
							<span>{labels.companyOfficialName}</span>
							<Requirement>{labels.optional}</Requirement>
						</FieldLabel>
						<input
							value={form.companyOfficialName}
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
							onChange={(event) => updateForm("companyEin", event.target.value)}
						/>
					</Field>

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
						{form.companyDocuments.length > 0 && (
							<DocumentList>
								{form.companyDocuments.map((document, index) => (
									<DocumentChip key={`${document.fileName}-${index}`}>
										<span>{document.fileName}</span>
										<button type='button' onClick={() => removeDocument(index)}>
											x
										</button>
									</DocumentChip>
								))}
							</DocumentList>
						)}
					</DocumentBlock>

					<Field>
						<FieldLabel>
							<span>{labels.password}</span>
							<Requirement $required>{labels.required}</Requirement>
						</FieldLabel>
						<StyledPasswordInput
							value={form.password}
							onChange={(event) => updateForm("password", event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel>
							<span>{labels.confirmPassword}</span>
							<Requirement $required>{labels.required}</Requirement>
						</FieldLabel>
						<StyledPasswordInput
							value={form.password2}
							onChange={(event) => updateForm("password2", event.target.value)}
						/>
					</Field>

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

					<CreateButton type='submit' disabled={creating || loading}>
						{creating
							? labels.creating
							: isAgentMode
							? labels.createAgentAccount
							: labels.createStaffAccount}
					</CreateButton>
				</AccountForm>
			</InlineAccountShell>
		</OverallPageShell>
	);
};

export default CreateNewAccount;

const InlineAccountShell = styled.section`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	display: grid;
	gap: 0.45rem;
	min-width: 0;
	padding: 0.55rem;
	border: 1px solid #dce8f6;
	border-radius: 10px;
	background: #f8fbff;
	box-shadow: 0 8px 18px rgba(15, 79, 134, 0.08);
`;

const WorkflowHeader = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: stretch;
	gap: 0.5rem;
	min-width: 0;

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const AccountModeTabs = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 6px;
	min-width: 0;
	padding: 6px;
	border: 1px solid rgba(45, 93, 145, 0.22);
	border-radius: 8px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 251, 255, 0.98) 100%),
		linear-gradient(180deg, rgba(141, 76, 157, 0.12), rgba(16, 32, 51, 0.08));
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.9),
		0 8px 18px rgba(16, 32, 51, 0.05);

	button {
		position: relative;
		overflow: hidden;
		min-width: 0;
		min-height: 34px;
		padding: 6px 10px;
		border: 1px solid rgba(45, 93, 145, 0.18);
		border-radius: 7px;
		background: linear-gradient(180deg, #ffffff 0%, #f4f8fe 100%);
		color: #102033;
		cursor: pointer;
		font-size: 0.78rem;
		font-weight: 950;
		line-height: 1.15;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease,
			color 0.18s ease,
			transform 0.18s ease;
	}

	button.active {
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 36%),
			linear-gradient(135deg, #102033 0%, #352044 48%, #6f1f78 100%);
		border-color: rgba(183, 123, 198, 0.72);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.2),
			inset 0 -1px 0 rgba(0, 0, 0, 0.22),
			0 8px 18px rgba(80, 23, 96, 0.2);
		color: #ffffff;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.22);
		transform: translateY(-1px);
	}

	button.active::after {
		content: "";
		position: absolute;
		inset-inline: 18px;
		bottom: 5px;
		height: 2px;
		border-radius: 999px;
		background: linear-gradient(90deg, #d7b5df, #ffffff, #67a7df);
		box-shadow: 0 0 10px rgba(215, 181, 223, 0.62);
	}

	button:hover:not(.active),
	button:focus-visible:not(.active) {
		background: linear-gradient(180deg, #244e7d 0%, #102033 100%);
		border-color: rgba(45, 93, 145, 0.35);
		color: #ffffff;
		outline: none;
	}
`;

const InviteToolbar = styled.div`
	display: flex;
	align-items: stretch;
	justify-content: flex-end;
	min-width: 0;

	@media (max-width: 560px) {
		justify-content: stretch;
	}
`;

const InviteButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.35rem;
	min-height: 34px;
	padding: 0 0.72rem;
	border: 1px solid #1677ff;
	border-radius: 8px;
	background: #1677ff;
	color: #fff;
	font-size: 0.78rem;
	font-weight: 900;
	box-shadow: 0 8px 18px rgba(22, 119, 255, 0.18);

	@media (max-width: 560px) {
		width: 100%;
		min-height: 44px;
	}
`;

const InvitationModalBody = styled.div`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	display: grid;
	gap: 0.75rem;
	min-width: 0;

	input,
	select,
	textarea {
		width: 100%;
		min-height: 40px;
		border: 1px solid #c8daee;
		border-radius: 9px;
		background: #fff;
		color: #1f2937;
		font-weight: 700;
		padding: 0 0.75rem;
	}

	textarea {
		min-height: 92px;
		padding: 0.75rem;
		resize: vertical;
	}
`;

const ChoiceRow = styled.div`
	display: grid;
	grid-template-columns: ${(props) =>
		props.$single ? "minmax(0, 220px)" : "repeat(2, minmax(0, 1fr))"};
	justify-content: ${(props) => (props.$single ? "start" : "stretch")};
	gap: 0.55rem;

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
	}
`;

const InvitationFields = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.65rem;

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
`;

const LinkBox = styled.label`
	display: grid;
	gap: 0.4rem;
	min-width: 0;
	padding: 0.75rem;
	border: 1px solid #dce8f6;
	border-radius: 12px;
	background: #fff;
	color: #25364b;
	font-weight: 800;
`;

const InviteActions = styled.div`
	display: flex;
	justify-content: flex-end;
	flex-wrap: wrap;
	gap: 0.5rem;

	@media (max-width: 560px) {
		display: grid;
		grid-template-columns: 1fr;
	}
`;

const InviteActionButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.4rem;
	min-height: 38px;
	padding: 0 0.8rem;
	border: 1px solid #cfe1f4;
	border-radius: 9px;
	background: #f7fbff;
	color: #0b5cad;
	font-weight: 900;

	&:hover {
		border-color: #1677ff;
		background: #eef6ff;
	}

	&:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
`;

const AccountForm = styled.form`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.52rem;
	min-width: 0;
	padding: 0.18rem 0 0;

	input,
	select {
		width: 100%;
		min-height: 34px;
		border: 1px solid #c8daee;
		border-radius: 8px;
		background: #fff;
		color: #1f2937;
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0 0.55rem;
	}

	@media (max-width: 1280px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
`;

const Field = styled.label`
	display: grid;
	gap: 0.22rem;
	margin: 0;
	min-width: 0;
	color: #25364b;
	font-size: 0.78rem;
	font-weight: 800;
`;

const StyledPasswordInput = styled(Input.Password)`
	min-height: 34px;
	border: 1px solid #c8daee;
	border-radius: 8px;
	background: #fff;
	color: #1f2937;
	font-size: 0.78rem;
	font-weight: 700;

	input {
		min-height: 32px !important;
		border: 0 !important;
		box-shadow: none !important;
		padding: 0 !important;
	}
`;

const FieldLabel = styled.span`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.35rem;
	min-width: 0;
	font-size: 0.74rem;
	line-height: 1.25;
`;

const FieldHint = styled.small`
	color: #62748f;
	font-size: 0.68rem;
	font-weight: 700;
	line-height: 1.25;
`;

const Requirement = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	min-height: 17px;
	padding: 0.06rem 0.34rem;
	border: 1px solid ${(props) => (props.$required ? "#ff7875" : "#91caff")};
	border-radius: 999px;
	background: ${(props) => (props.$required ? "#fff1f0" : "#eef7ff")};
	color: ${(props) => (props.$required ? "#cf1322" : "#0b63b6")};
	font-size: 0.6rem;
	font-weight: 900;
`;

const SelectionBlock = styled.div`
	grid-column: ${(props) => (props.$halfOnDesktop ? "span 2" : "1 / -1")};
	display: grid;
	gap: 0.38rem;
	min-width: 0;
	padding: ${(props) => (props.$compact ? "0.42rem" : "0.52rem")};
	border: 1px solid #dce8f6;
	border-radius: 10px;
	background: #fff;

	@media (max-width: 1280px) {
		grid-column: 1 / -1;
	}
`;

const SelectionHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.4rem;
	color: #17324d;
	font-size: 0.8rem;
	line-height: 1.2;
	font-weight: 900;
`;

const SelectionGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(142px, 1fr));
	gap: 0.35rem;
	min-width: 0;
`;

const SelectionPill = styled.button`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.42rem;
	min-height: 34px;
	min-width: 0;
	padding: 0.28rem 0.48rem;
	border: 1px solid ${(props) =>
		props.$active ? "#1677ff" : props.$disabled ? "#e4e7ec" : "#cfe1f4"};
	border-radius: 8px;
	background: ${(props) =>
		props.$active ? "#eef6ff" : props.$disabled ? "#f3f6fa" : "#fff"};
	color: ${(props) => (props.$disabled ? "#8a95a3" : "#102033")};
	font-size: 0.76rem;
	font-weight: 800;
	box-shadow: ${(props) =>
		props.$active ? "0 8px 18px rgba(22, 119, 255, 0.12)" : "none"};
	text-align: start;
	cursor: ${(props) =>
		props.$disabled ? "not-allowed" : props.$passive ? "default" : "pointer"};

	strong {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	input {
		flex: 0 0 auto;
		width: 14px;
		min-height: 14px;
	}
`;

const AgentBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.45rem;
	padding: 0.55rem;
	border: 1px solid #cfe8ff;
	border-radius: 10px;
	background: #f4f9ff;
`;

const CommercialGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 0.38rem;
`;

const CommercialOption = styled.button`
	display: grid;
	gap: 0.18rem;
	min-height: 62px;
	padding: 0.46rem;
	border: 1px solid ${(props) => (props.$active ? "#1677ff" : "#cfe1f4")};
	border-radius: 8px;
	background: ${(props) => (props.$active ? "#eef6ff" : "#fff")};
	color: #102033;
	text-align: start;

	span {
		color: #62748f;
		font-size: 0.68rem;
		font-weight: 700;
	}
`;

const DocumentBlock = styled.div`
	grid-column: span 2;
	display: grid;
	align-content: start;
	gap: 0.34rem;
	padding: 0.52rem;
	border: 1px dashed #b8dcff;
	border-radius: 10px;
	background: #fff;

	@media (max-width: 1280px) {
		grid-column: 1 / -1;
	}
`;

const UploadButton = styled.button`
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.35rem;
	justify-self: start;
	min-height: 32px;
	padding: 0 0.72rem;
	border: 1px solid #8ec5ff;
	border-radius: 999px;
	background: #eef7ff;
	color: #0b63b6;
	font-size: 0.74rem;
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
	gap: 0.3rem;
`;

const DocumentChip = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	max-width: 100%;
	padding: 0.2rem 0.42rem;
	border: 1px solid #b8dcff;
	border-radius: 999px;
	background: #f7fbff;
	font-size: 0.68rem;
	font-weight: 800;

	span {
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	button {
		border: 0;
		background: transparent;
		color: #b42318;
		font-weight: 900;
	}
`;

const AccessBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.36rem;
	padding: 0.52rem;
	border: 1px solid #dce8f6;
	border-radius: 10px;
	background: #fff;

	> div:last-child {
		display: flex;
		flex-wrap: wrap;
		gap: 0.32rem;
	}

	label {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		padding: 0.22rem 0.44rem;
		border: 1px solid #b8dcff;
		border-radius: 999px;
		background: #f7fbff;
		font-size: 0.72rem;
		font-weight: 800;
	}

	input {
		width: 13px;
		min-height: 13px;
	}
`;

const CreateButton = styled.button`
	grid-column: 1 / -1;
	justify-self: end;
	min-width: 150px;
	min-height: 36px;
	padding: 0 0.85rem;
	border: 0;
	border-radius: 8px;
	background: #1677ff;
	color: #fff;
	font-size: 0.82rem;
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
