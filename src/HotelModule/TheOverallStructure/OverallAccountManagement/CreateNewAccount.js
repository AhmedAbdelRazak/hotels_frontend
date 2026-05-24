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
	{ value: "systemadmin", role: 10000, en: "System Admin", ar: "مسؤول النظام" },
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

	const changeInvitationType = (type) => {
		setInvitationForm((previous) => ({
			...previous,
			accountType: type,
			hotelIds:
				type === "job" && previous.hotelIds.length
					? [previous.hotelIds[0]]
					: previous.hotelIds,
			requestedRoleDescription:
				type === "job" ? previous.requestedRoleDescription : "",
		}));
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
		setForm(initialForm);
	};

	const submit = (event) => {
		event.preventDefault();
		if (
			!form.hotelIds.length ||
			!form.roleDescriptions.length ||
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

		const selectedRoles = form.roleDescriptions.map((role) =>
			roleOptions.find((option) => option.value === role)
		);
		const primaryRole =
			selectedRoles.find((role) => role.value === "systemadmin") ||
			selectedRoles.find((role) => role.value === "hotelmanager") ||
			selectedRoles[0];
		const isAgentAccount = form.roleDescriptions.includes("ordertaker");
		const openingWalletCredit = isAgentAccount
			? form.agentCommercialModel === "commission_only"
				? 0
				: parseMoney(form.agentOpeningWalletCredit)
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
			accessTo: form.accessTo,
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

	const isSystemAdminSelected = form.roleDescriptions.includes("systemadmin");
	const isAgentSelected = form.roleDescriptions.includes("ordertaker");

	return (
		<OverallPageShell $isRTL={isRTL}>
			<InlineAccountShell $isRTL={isRTL}>
				<InviteToolbar>
					<InviteButton
						type='button'
						onClick={() => {
							setInvitationForm(initialInvitationForm);
							setInvitationCode("");
							setInvitationToken("");
							setInvitationOpen(true);
						}}
					>
						<LinkOutlined />
						<span>{labels.generateCustomLink}</span>
					</InviteButton>
				</InviteToolbar>

				<Modal
					open={invitationOpen}
					onCancel={() => setInvitationOpen(false)}
					footer={null}
					width={860}
					title={labels.invitationTitle}
					destroyOnClose={false}
				>
					<InvitationModalBody $isRTL={isRTL}>
						<SelectionBlock>
							<SelectionHeader>
								<span>{labels.invitationType}</span>
								<Requirement $required>{labels.required}</Requirement>
							</SelectionHeader>
							<ChoiceRow>
								<SelectionPill
									type='button'
									$active={invitationForm.accountType === "agent"}
									onClick={() => changeInvitationType("agent")}
								>
									<strong>{labels.agentInvite}</strong>
									<input
										type='radio'
										readOnly
										checked={invitationForm.accountType === "agent"}
									/>
								</SelectionPill>
								<SelectionPill
									type='button'
									$active={invitationForm.accountType === "job"}
									onClick={() => changeInvitationType("job")}
								>
									<strong>{labels.employeeInvite}</strong>
									<input
										type='radio'
										readOnly
										checked={invitationForm.accountType === "job"}
									/>
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

					<SelectionBlock>
						<SelectionHeader>
							<span>{labels.roles}</span>
							<Requirement $required>{labels.required}</Requirement>
						</SelectionHeader>
						<SelectionGrid>
							{roleOptions.map((option) => (
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
						{creating ? labels.creating : labels.createAccount}
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
	gap: 0.6rem;
	min-width: 0;
	padding: 0.75rem;
	border: 1px solid #dce8f6;
	border-radius: 12px;
	background: #f8fbff;
	box-shadow: 0 8px 18px rgba(15, 79, 134, 0.08);
`;

const InviteToolbar = styled.div`
	display: flex;
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
	gap: 0.45rem;
	min-height: 40px;
	padding: 0 0.95rem;
	border: 1px solid #1677ff;
	border-radius: 10px;
	background: #1677ff;
	color: #fff;
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
	grid-template-columns: repeat(2, minmax(0, 1fr));
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
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.85rem;
	min-width: 0;
	padding: 0.35rem 0 0;

	input,
	select {
		width: 100%;
		min-height: 40px;
		border: 1px solid #c8daee;
		border-radius: 9px;
		background: #fff;
		color: #1f2937;
		font-weight: 700;
		padding: 0 0.75rem;
	}

	@media (max-width: 1100px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
`;

const Field = styled.label`
	display: grid;
	gap: 0.35rem;
	margin: 0;
	min-width: 0;
	color: #25364b;
	font-weight: 800;
`;

const StyledPasswordInput = styled(Input.Password)`
	min-height: 40px;
	border: 1px solid #c8daee;
	border-radius: 9px;
	background: #fff;
	color: #1f2937;
	font-weight: 700;

	input {
		min-height: 38px !important;
		border: 0 !important;
		box-shadow: none !important;
		padding: 0 !important;
	}
`;

const FieldLabel = styled.span`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
`;

const FieldHint = styled.small`
	color: #62748f;
	font-weight: 700;
	line-height: 1.35;
`;

const Requirement = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 20px;
	padding: 0.1rem 0.45rem;
	border: 1px solid ${(props) => (props.$required ? "#ff7875" : "#91caff")};
	border-radius: 999px;
	background: ${(props) => (props.$required ? "#fff1f0" : "#eef7ff")};
	color: ${(props) => (props.$required ? "#cf1322" : "#0b63b6")};
	font-size: 0.68rem;
	font-weight: 900;
`;

const SelectionBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.55rem;
	min-width: 0;
	padding: 0.75rem;
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
	font-weight: 900;
`;

const SelectionGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 0.5rem;
	min-width: 0;
`;

const SelectionPill = styled.button`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.55rem;
	min-height: 44px;
	min-width: 0;
	padding: 0.45rem 0.65rem;
	border: 1px solid ${(props) =>
		props.$active ? "#1677ff" : props.$disabled ? "#e4e7ec" : "#cfe1f4"};
	border-radius: 10px;
	background: ${(props) =>
		props.$active ? "#eef6ff" : props.$disabled ? "#f3f6fa" : "#fff"};
	color: ${(props) => (props.$disabled ? "#8a95a3" : "#102033")};
	box-shadow: ${(props) =>
		props.$active ? "0 8px 18px rgba(22, 119, 255, 0.12)" : "none"};
	text-align: start;
	cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};

	strong {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	input {
		flex: 0 0 auto;
		width: 16px;
		min-height: 16px;
	}
`;

const AgentBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.65rem;
	padding: 0.75rem;
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
	min-height: 82px;
	padding: 0.65rem;
	border: 1px solid ${(props) => (props.$active ? "#1677ff" : "#cfe1f4")};
	border-radius: 10px;
	background: ${(props) => (props.$active ? "#eef6ff" : "#fff")};
	color: #102033;
	text-align: start;

	span {
		color: #62748f;
		font-size: 0.78rem;
		font-weight: 700;
	}
`;

const DocumentBlock = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.55rem;
	padding: 0.75rem;
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
	min-height: 38px;
	padding: 0 0.9rem;
	border: 1px solid #8ec5ff;
	border-radius: 999px;
	background: #eef7ff;
	color: #0b63b6;
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
	gap: 0.55rem;
	padding: 0.75rem;
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
		font-weight: 800;
	}

	input {
		width: 15px;
		min-height: 15px;
	}
`;

const CreateButton = styled.button`
	grid-column: 1 / -1;
	justify-self: end;
	min-width: 180px;
	min-height: 42px;
	border: 0;
	border-radius: 10px;
	background: #1677ff;
	color: #fff;
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
