/** @format */

import React, { useEffect, useMemo, useState } from "react";
import { Link, Redirect } from "react-router-dom";
import { Input } from "antd";
import styled, { css } from "styled-components";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { signup, signin, authenticate, isAuthenticated } from "../auth";
import { useCartContext } from "../cart_context";

const FILE_LIMIT_BYTES = 3 * 1024 * 1024;

const ROLE_BY_DESCRIPTION = {
	hotelmanager: 2000,
	reception: 3000,
	housekeepingmanager: 4000,
	housekeeping: 5000,
	finance: 6000,
	reservationemployee: 8000,
};

const TEXT = {
	en: {
		title: "Registration request",
		welcome: "Welcome to",
		brand: "X-Hotel",
		fill: "Please fill the required information, then submit your request.",
		accountType: "Please choose",
		chooseTypeFirst: "Please choose the request type first.",
		invitedOnly: "This application is locked to the invitation link.",
		loadingInvitation: "Verifying your invitation link...",
		inviteRequired:
			"Agent and employee applications are by invitation only. Please reach out to the hotel management team, and they will send you the correct application link.",
		agentInvitationOnly: "Agent (invitation link only)",
		jobInvitationOnly: "Employee / job applicant (invitation link only)",
		firstName: "First name",
		lastName: "Last name",
		owner: "Hotel Manager / Owner",
		agent: "Agent",
		job: "Looking for a job",
		fullName: "Full name",
		email: "Email address",
		phone: "Phone (WhatsApp)",
		hotelName: "Hotel name",
		country: "Country",
		state: "State / Region",
		city: "City",
		address: "Street address",
		property: "Property type",
		floors: "Number of floors",
		rooms: "Number of rooms",
		password: "Password",
		password2: "Confirm password",
		terms: "I confirm the information is accurate and accept the terms and conditions.",
		termsLink: "Click here to read our terms and conditions",
		note: "Please make sure the information is accurate. Submitted applications remain pending until the hotel reviews and approves them.",
		btnOwner: "Register now",
		btnAgent: "Submit agent application",
		btnJob: "Submit job application",
		have: "If you already have an account please",
		login: "Login here",
		req: "Please fill the following required fields:",
		mismatch: "Passwords do not match",
		selectHotels: "Agent hotels",
		selectOneHotel: "Apply to hotel",
		loadingHotels: "Loading active hotels...",
		noHotels: "No active published hotels are available right now.",
		agentHint:
			"Your account will stay pending until at least one selected hotel approves it.",
		jobHint:
			"Job applications can be submitted to one hotel only and remain pending until approval or interview review.",
		companyName: "Company name",
		companyOfficialName: "Official company name",
		companyEin: "Company EIN / tax number",
		commercialModel: "Agent business model",
		walletInventory: "Inventory wallet",
		commissionOnly: "Commission only",
		mixed: "Wallet + commission",
		openingWalletCredit: "Opening wallet credit",
		openingWalletHint:
			"Optional. Use zero when there is no starting wallet credit or proof of paid wallet balance.",
		attachments: "Attachments / payment proof",
		upload: "Upload files",
		attachmentHint: "Optional PDF or image files, up to 3 MB each.",
		notes: "Notes",
		jobRole: "Position",
		hotelmanager: "Hotel Manager",
		reception: "Front Desk Reception",
		housekeepingmanager: "Housekeeping Manager",
		housekeeping: "Housekeeping",
		finance: "Finance Clerk",
		reservationemployee: "Reservation Clerk",
		applicationSubmitted: "Application submitted. You can sign in to see the pending status.",
		fileTooLarge: "is larger than 3 MB.",
		fileReadFailed: "Could not read one of the selected files.",
	},
	ar: {
		title: "طلب التسجيل",
		welcome: "مرحبا بشركائنا على منصة",
		brand: "إكس أوتيل",
		fill: "يرجى تعبئة البيانات المطلوبة ثم إرسال الطلب.",
		accountType: "يرجى الاختيار",
		chooseTypeFirst: "يرجى اختيار نوع الطلب أولا.",
		invitedOnly: "هذا الطلب مرتبط برابط الدعوة فقط.",
		loadingInvitation: "جاري التحقق من رابط الدعوة...",
		inviteRequired:
			"طلبات الوكلاء والموظفين تتم من خلال رابط دعوة فقط. يرجى التواصل مع إدارة الفندق وسيقومون بإرسال رابط التقديم المناسب لك.",
		agentInvitationOnly: "وكيل (برابط دعوة فقط)",
		jobInvitationOnly: "موظف / متقدم لوظيفة (برابط دعوة فقط)",
		firstName: "الاسم الأول",
		lastName: "اسم العائلة",
		owner: "مدير / مالك فندق",
		agent: "وكيل",
		job: "أبحث عن وظيفة",
		fullName: "الاسم الكامل",
		email: "البريد الإلكتروني",
		phone: "رقم الهاتف (واتساب)",
		hotelName: "اسم الفندق",
		country: "البلد",
		state: "المنطقة / الولاية",
		city: "المدينة",
		address: "العنوان التفصيلي",
		property: "نوع العقار",
		floors: "عدد الأدوار",
		rooms: "عدد الغرف",
		password: "كلمة المرور",
		password2: "إعادة كتابة كلمة المرور",
		terms: "أقر أن جميع البيانات صحيحة وأوافق على الشروط والأحكام.",
		termsLink: "اضغط هنا لقراءة الشروط والأحكام",
		note: "يرجى التأكد من صحة البيانات. طلبات الوكلاء والوظائف تبقى قيد المراجعة حتى موافقة الفندق.",
		btnOwner: "سجل الآن",
		btnAgent: "إرسال طلب الوكيل",
		btnJob: "إرسال طلب الوظيفة",
		have: "إذا كنت تملك حسابا مسبقا يرجى",
		login: "تسجيل الدخول",
		req: "الحقول التالية مطلوبة:",
		mismatch: "كلمتا المرور غير متطابقتين",
		selectHotels: "الفنادق المطلوبة للوكيل",
		selectOneHotel: "الفندق المراد التقديم عليه",
		loadingHotels: "جاري تحميل الفنادق النشطة...",
		noHotels: "لا توجد فنادق منشورة ونشطة حاليا.",
		agentHint:
			"سيبقى حسابك قيد المراجعة حتى يوافق أحد الفنادق المختارة على طلبك.",
		jobHint:
			"طلبات الوظائف يتم إرسالها لفندق واحد فقط وتبقى قيد المراجعة أو المقابلة حتى الموافقة.",
		companyName: "اسم الشركة",
		companyOfficialName: "الاسم الرسمي للشركة",
		companyEin: "الرقم الضريبي / السجل",
		commercialModel: "طريقة عمل الوكيل",
		walletInventory: "محفظة مخزون",
		commissionOnly: "عمولة فقط",
		mixed: "محفظة + عمولة",
		openingWalletCredit: "رصيد افتتاحي للمحفظة",
		openingWalletHint:
			"اختياري. اتركه صفرا إذا لم يوجد رصيد افتتاحي أو إثبات تحويل.",
		attachments: "مرفقات / إثبات تحويل",
		upload: "رفع الملفات",
		attachmentHint: "اختياري. ملفات PDF أو صور، بحد أقصى 3 ميجابايت لكل ملف.",
		notes: "ملاحظات",
		jobRole: "الوظيفة المطلوبة",
		hotelmanager: "مدير فندق",
		reception: "موظف استقبال",
		housekeepingmanager: "مشرف نظافة",
		housekeeping: "موظف نظافة",
		finance: "موظف مالية",
		reservationemployee: "موظف حجوزات",
		applicationSubmitted:
			"تم إرسال الطلب. يمكنك تسجيل الدخول لمتابعة حالة المراجعة.",
		fileTooLarge: "أكبر من 3 ميجابايت.",
		fileReadFailed: "تعذر قراءة أحد الملفات المحددة.",
	},
};

const commercialModelOptions = [
	{ value: "wallet_inventory", labelKey: "walletInventory" },
	{ value: "commission_only", labelKey: "commissionOnly" },
	{ value: "mixed", labelKey: "mixed" },
];

const jobRoleOptions = [
	"reception",
	"reservationemployee",
	"finance",
	"housekeeping",
	"housekeepingmanager",
	"hotelmanager",
];

const normalizeAccountType = (value = "") => {
	const normalized = String(value || "").trim().toLowerCase();
	if (["owner", "hotel-owner", "hotel_manager_owner", "manager_owner"].includes(normalized)) {
		return "owner";
	}
	if (["agent", "ordertaker", "order-taker", "external_agent"].includes(normalized)) {
		return "agent";
	}
	if (["job", "employee", "staff", "jobseeker", "job_applicant", "looking_for_job"].includes(normalized)) {
		return "job";
	}
	return "";
};

const normalizeJobRole = (value = "") => {
	const normalized = String(value || "").trim().toLowerCase();
	return jobRoleOptions.includes(normalized) ? normalized : "reception";
};

const getFirstQueryValue = (params, keys = []) => {
	for (const key of keys) {
		const value = params.get(key);
		if (value) return value;
	}
	return "";
};

const splitQueryIds = (...values) => [
	...new Set(
		values
			.flatMap((value) => String(value || "").split(","))
			.map((value) => value.trim())
			.filter(Boolean)
	),
];

const toEnglishDigits = (str = "") =>
	String(str)
		.replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
		.replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);

const numericOnly = ["phone", "hotelFloors", "hotelRooms"];

const titleCase = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());

const apiErrorMessage = (error) => {
	const raw = error?.message || "";
	try {
		const parsed = JSON.parse(raw);
		return parsed?.error || parsed?.message || raw;
	} catch {
		return raw || "Something went wrong, please try again.";
	}
};

const normalizeCompanyDocuments = (documents = []) =>
	(Array.isArray(documents) ? documents : [])
		.filter((document) => document && (document.fileName || document.dataUrl))
		.map((document) => ({
			fileName: String(document.fileName || "Attachment"),
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

const normalizeInvitationHotel = (hotel, fallbackName = "") => {
	const id = String(hotel?._id || hotel?.id || hotel || "").trim();
	if (!id) return null;
	return {
		_id: id,
		hotelName: String(
			hotel && typeof hotel === "object"
				? hotel.hotelName || hotel.name || fallbackName || "Hotel"
				: fallbackName || "Hotel"
		),
		hotelCity: hotel?.hotelCity || "",
		hotelState: hotel?.hotelState || "",
		hotelCountry: hotel?.hotelCountry || "",
	};
};

const buildInvitationHotels = (invitation = {}, hotelIds = []) => {
	const hotels = Array.isArray(invitation.hotels) ? invitation.hotels : [];
	const names = Array.isArray(invitation.hotelNames) ? invitation.hotelNames : [];
	const source = hotels.length ? hotels : hotelIds;
	return source
		.map((hotel, index) => normalizeInvitationHotel(hotel, names[index]))
		.filter(Boolean);
};

const resolveSignupInvitation = async ({ code = "", token = "" }) => {
	const apiBase = process.env.REACT_APP_API_URL;
	if (!apiBase || (!code && !token)) return null;
	const url = code
		? `${apiBase}/signup-invitation/${encodeURIComponent(code)}`
		: `${apiBase}/signup-invitation?token=${encodeURIComponent(token)}`;
	const response = await fetch(url);
	const data = await response.json().catch(() => ({}));
	if (!response.ok || data?.error) {
		throw new Error(data?.error || "Could not verify invitation link.");
	}
	return data?.invitation || null;
};

const initialForm = {
	accountType: "owner",
	invitationCode: "",
	invitationToken: "",
	invitationLocked: false,
	invitationResolved: false,
	invitationHotels: [],
	firstName: "",
	lastName: "",
	name: "",
	email: "",
	phone: "",
	hotelName: "",
	hotelCountry: "KSA",
	hotelState: "makkah",
	hotelCity: "",
	hotelAddress: "",
	propertyType: "Hotel",
	hotelFloors: "",
	hotelRooms: "",
	password: "",
	password2: "",
	role: 2000,
	accepted: false,
	redirect: false,
	inviteRequiredNotice: false,
	hotelIds: [],
	jobHotelId: "",
	requestedRoleDescription: "reception",
	companyName: "",
	companyOfficialName: "",
	companyEin: "",
	agentCommercialModel: "wallet_inventory",
	agentOpeningWalletCredit: "",
	companyDocuments: [],
	applicationNotes: "",
};

const getInitialSignupForm = () => {
	if (typeof window === "undefined") return initialForm;
	const params = new URLSearchParams(window.location.search || "");
	const invitationCode =
		params.get("invite") || params.get("invitationCode") || params.get("code") || "";
	const invitationToken = params.get("invitationToken") || "";
	const rawType = getFirstQueryValue(params, [
		"accountType",
		"type",
		"applicationType",
		"signupIntent",
	]);
	const rawRole = getFirstQueryValue(params, [
		"roleDescription",
		"jobRole",
		"requestedRoleDescription",
		"role",
	]);
	let accountType = normalizeAccountType(rawType);
	const attemptedInvitationOnlyType =
		Boolean(accountType && accountType !== "owner" && !invitationToken && !invitationCode) ||
		Boolean(
			!accountType &&
				!invitationToken &&
				!invitationCode &&
				jobRoleOptions.includes(String(rawRole || "").toLowerCase())
		) ||
		Boolean(
			!accountType &&
				!invitationToken &&
				!invitationCode &&
				normalizeAccountType(rawRole) === "agent"
		);
	if (!accountType && normalizeAccountType(rawRole) === "agent") {
		accountType = "agent";
	}
	if (!accountType && jobRoleOptions.includes(String(rawRole || "").toLowerCase())) {
		accountType = "job";
	}
	if ((accountType === "job" || accountType === "agent") && !invitationToken && !invitationCode) {
		accountType = "owner";
	}
	const invitationLocked = Boolean(
		(invitationToken || invitationCode) &&
			(!accountType || accountType === "agent" || accountType === "job")
	);
	if (!accountType) accountType = invitationLocked ? "" : "owner";

	const hotelIds = splitQueryIds(
		params.get("hotelIds"),
		params.get("hotels"),
		params.get("hotelIdsWork"),
		params.get("hotelsToSupport"),
		params.get("requestedHotelIds"),
		params.get("selectedHotelIds"),
		params.get("hotelId"),
		params.get("hotelIdWork")
	);
	const requestedRoleDescription = normalizeJobRole(rawRole);
	const fullName = params.get("name") || "";
	const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
	const invitationHotels = buildInvitationHotels(
		{ hotelNames: splitQueryIds(params.get("hotelNames")) },
		hotelIds
	);

	return {
		...initialForm,
		accountType,
		invitationCode,
		invitationToken,
		invitationLocked,
		invitationResolved: false,
		inviteRequiredNotice: attemptedInvitationOnlyType,
		firstName: nameParts[0] || "",
		lastName: nameParts.slice(1).join(" "),
		name: fullName,
		email: params.get("email") || "",
		phone: params.get("phone") || "",
		hotelIds: accountType === "agent" ? hotelIds : [],
		jobHotelId: accountType === "job" ? hotelIds[0] || "" : "",
		invitationHotels,
		requestedRoleDescription,
		companyName: params.get("companyName") || "",
		companyOfficialName: params.get("companyOfficialName") || "",
		companyEin: params.get("companyEin") || "",
		agentCommercialModel:
			commercialModelOptions.some(
				(option) => option.value === params.get("agentCommercialModel")
			)
				? params.get("agentCommercialModel")
				: initialForm.agentCommercialModel,
		agentOpeningWalletCredit: params.get("agentOpeningWalletCredit") || "",
		applicationNotes: params.get("applicationNotes") || "",
	};
};

const HotelSignup = () => {
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const T = isRTL ? TEXT.ar : TEXT.en;
	const [form, setForm] = useState(getInitialSignupForm);
	const [errors, setErrors] = useState({});
	const [hotels, setHotels] = useState([]);
	const [hotelsLoading, setHotelsLoading] = useState(false);
	const [invitationLoading, setInvitationLoading] = useState(
		Boolean(form.invitationCode || form.invitationToken)
	);
	const [invitationError, setInvitationError] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const needsPublishedHotels =
		(form.accountType === "agent" || form.accountType === "job") &&
		!form.invitationLocked;

	useEffect(() => {
		if (!needsPublishedHotels || hotels.length || hotelsLoading) return;
		setHotelsLoading(true);
		fetch(`${process.env.REACT_APP_API_URL}/active-hotel-list`)
			.then((response) => (response.ok ? response.json() : []))
			.then((data) => setHotels(Array.isArray(data) ? data : []))
			.catch(() => setHotels([]))
			.finally(() => setHotelsLoading(false));
	}, [hotels.length, hotelsLoading, needsPublishedHotels]);

	useEffect(() => {
		if (
			(!form.invitationCode && !form.invitationToken) ||
			form.invitationResolved
		) {
			return;
		}
		let active = true;
		setInvitationLoading(true);
		setInvitationError("");
		resolveSignupInvitation({
			code: form.invitationCode,
			token: form.invitationToken,
		})
			.then((invitation) => {
				if (!active || !invitation) return;
				const accountType = normalizeAccountType(
					invitation.accountType || invitation.signupIntent
				);
				const hotelIds = splitQueryIds(invitation.hotelIds);
				const invitationHotels = buildInvitationHotels(invitation, hotelIds);
				const fullName = String(invitation.name || form.name || "").trim();
				const nameParts = fullName.split(/\s+/).filter(Boolean);
				setForm((previous) => ({
					...previous,
					accountType,
					invitationLocked: true,
					invitationResolved: true,
					invitationHotels,
					firstName: previous.firstName || nameParts[0] || "",
					lastName: previous.lastName || nameParts.slice(1).join(" "),
					name: fullName || previous.name,
					email: invitation.email || previous.email,
					phone: invitation.phone || previous.phone,
					hotelIds: accountType === "agent" ? hotelIds : [],
					jobHotelId: accountType === "job" ? hotelIds[0] || "" : "",
					requestedRoleDescription: normalizeJobRole(
						invitation.roleDescription || previous.requestedRoleDescription
					),
					companyName: invitation.companyName || previous.companyName,
					companyOfficialName:
						invitation.companyOfficialName || previous.companyOfficialName,
					companyEin: invitation.companyEin || previous.companyEin,
					agentCommercialModel:
						commercialModelOptions.some(
							(option) => option.value === invitation.agentCommercialModel
						)
							? invitation.agentCommercialModel
							: previous.agentCommercialModel,
					agentOpeningWalletCredit:
						String(invitation.agentOpeningWalletCredit || "") ||
						previous.agentOpeningWalletCredit,
					applicationNotes:
						invitation.applicationNotes || previous.applicationNotes,
				}));
			})
			.catch((error) => {
				if (!active) return;
				setInvitationError(apiErrorMessage(error));
				setForm((previous) => ({
					...previous,
					invitationResolved: true,
					accountType: "",
				}));
			})
			.finally(() => {
				if (active) setInvitationLoading(false);
			});
		return () => {
			active = false;
		};
	}, [
		form.invitationCode,
		form.invitationResolved,
		form.invitationToken,
		form.name,
	]);

	const LABEL = useMemo(
		() => ({
			accountType: T.accountType,
			firstName: T.firstName,
			lastName: T.lastName,
			name: T.fullName,
			email: T.email,
			phone: T.phone,
			hotelName: T.hotelName,
			hotelCountry: T.country,
			hotelState: T.state,
			hotelCity: T.city,
			hotelAddress: T.address,
			propertyType: T.property,
			hotelFloors: T.floors,
			hotelRooms: T.rooms,
			password: T.password,
			password2: T.password2,
			hotelIds: T.selectHotels,
			jobHotelId: T.selectOneHotel,
			requestedRoleDescription: T.jobRole,
		}),
		[T]
	);

	const invitationHotelLabels = useMemo(() => {
		const byId = new Map(
			(Array.isArray(form.invitationHotels) ? form.invitationHotels : []).map(
				(hotel) => [String(hotel._id), hotel]
			)
		);
		const ids =
			form.accountType === "job"
				? [form.jobHotelId || form.hotelIds[0]].filter(Boolean)
				: form.hotelIds;
		return ids.map((hotelId, index) => {
			const hotel = byId.get(String(hotelId));
			const name = hotel?.hotelName || `Hotel ${index + 1}`;
			const location = [
				hotel?.hotelCity,
				hotel?.hotelState,
				hotel?.hotelCountry,
			]
				.filter(Boolean)
				.join(", ");
			return {
				id: hotelId,
				name: titleCase(name),
				location,
			};
		});
	}, [form.accountType, form.hotelIds, form.invitationHotels, form.jobHotelId]);

	const handle = (key) => (event) => {
		let value = event?.target ? event.target.value : event;
		value = toEnglishDigits(value);
		if (numericOnly.includes(key)) value = value.replace(/\D/g, "");
		setForm((previous) => ({ ...previous, [key]: value }));
		if (errors[key]) setErrors((previous) => ({ ...previous, [key]: false }));
	};

	const changeAccountType = (event) => {
		if (form.invitationLocked) return;
		const accountType = event.target.value;
		if (accountType === "agent" || accountType === "job") {
			setForm((previous) => ({
				...previous,
				accountType: "owner",
				inviteRequiredNotice: true,
				hotelIds: [],
				jobHotelId: "",
			}));
			return;
		}
		setForm((previous) => ({
			...previous,
			accountType,
			inviteRequiredNotice: false,
			hotelIds: accountType === "agent" ? previous.hotelIds : [],
			jobHotelId: accountType === "job" ? previous.jobHotelId : "",
		}));
		setErrors({});
	};

	const toggleAgentHotel = (hotelId) => {
		setForm((previous) => {
			const current = Array.isArray(previous.hotelIds) ? previous.hotelIds : [];
			const next = current.includes(hotelId)
				? current.filter((item) => item !== hotelId)
				: [...current, hotelId];
			return { ...previous, hotelIds: next };
		});
		if (errors.hotelIds) setErrors((previous) => ({ ...previous, hotelIds: false }));
	};

	const handleDocumentUpload = async (event) => {
		const files = Array.from(event.target.files || []);
		event.target.value = "";
		if (!files.length) return;
		const oversized = files.find((file) => file.size > FILE_LIMIT_BYTES);
		if (oversized) {
			toast.error(`${oversized.name} ${T.fileTooLarge}`);
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
		} catch {
			toast.error(T.fileReadFailed);
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

	const requiredKeys = () => {
		const keys = form.invitationLocked
			? ["accountType", "firstName", "lastName", "email", "phone", "password", "password2"]
			: ["accountType", "name", "email", "phone", "password", "password2"];
		if (form.accountType === "owner") {
			keys.push(
				"hotelName",
				"hotelCountry",
				"hotelState",
				"hotelCity",
				"hotelAddress",
				"propertyType",
				"hotelFloors",
				"hotelRooms"
			);
		}
		if (form.accountType === "agent") keys.push("hotelIds");
		if (form.accountType === "job") {
			keys.push("jobHotelId", "requestedRoleDescription");
		}
		return keys;
	};

	const validate = () => {
		const missing = requiredKeys().filter((key) => {
			if (key === "hotelIds") return !form.hotelIds.length;
			return !form[key];
		});
		if (missing.length) {
			setErrors(missing.reduce((acc, key) => ({ ...acc, [key]: true }), {}));
			toast.error(`${T.req} ${missing.map((key) => LABEL[key]).join(isRTL ? "، " : ", ")}`);
			return false;
		}
		if (form.password !== form.password2) {
			setErrors({ password: true, password2: true });
			toast.error(T.mismatch);
			return false;
		}
		if (!form.accepted) {
			toast.error(T.terms);
			return false;
		}
		return true;
	};

	const buildPayload = () => {
		const common = {
			name: form.invitationLocked
				? `${form.firstName} ${form.lastName}`.trim()
				: form.name,
			email: form.email,
			phone: form.phone,
			password: form.password,
			password2: form.password2,
			accepted: form.accepted,
			applicationNotes: form.applicationNotes,
			invitationCode: form.invitationCode,
			invitationToken: form.invitationToken,
		};
		if (form.accountType === "owner") {
			return {
				...common,
				hotelName: form.hotelName,
				hotelCountry: form.hotelCountry,
				hotelState: form.hotelState,
				hotelCity: form.hotelCity,
				hotelAddress: form.hotelAddress,
				propertyType: form.propertyType,
				hotelFloors: form.hotelFloors,
				hotelRooms: form.hotelRooms,
				role: 2000,
			};
		}
		if (form.accountType === "agent") {
			const openingWalletCredit =
				form.agentCommercialModel === "commission_only"
					? 0
					: Number(form.agentOpeningWalletCredit || 0);
			return {
				...common,
				signupIntent: "agent",
				role: 7000,
				roleDescription: "ordertaker",
				roles: [7000],
				roleDescriptions: ["ordertaker"],
				hotelIds: form.hotelIds,
				hotelIdsWork: form.hotelIds,
				hotelsToSupport: form.hotelIds,
				companyName: form.companyName,
				companyOfficialName: form.companyOfficialName,
				companyEin: form.companyEin,
				companyDocuments: normalizeCompanyDocuments(form.companyDocuments),
				agentCommercialModel: form.agentCommercialModel,
				agentOpeningWalletCredit: openingWalletCredit,
				agentWalletOpeningBalances: form.hotelIds.map((hotelId) => ({
					hotelId,
					amount: openingWalletCredit,
				})),
			};
		}
		const roleDescription = form.requestedRoleDescription;
		return {
			...common,
			signupIntent: "job",
			role: ROLE_BY_DESCRIPTION[roleDescription] || 3000,
			roleDescription,
			roles: [ROLE_BY_DESCRIPTION[roleDescription] || 3000],
			roleDescriptions: [roleDescription],
			hotelIdWork: form.jobHotelId,
			hotelIds: [form.jobHotelId],
			hotelIdsWork: [form.jobHotelId],
			hotelsToSupport: [form.jobHotelId],
			requestedRoleDescription: roleDescription,
			companyDocuments: normalizeCompanyDocuments(form.companyDocuments),
		};
	};

	const submit = async (event) => {
		event.preventDefault();
		if (!validate()) return;
		setSubmitting(true);
		try {
			const payload = buildPayload();
			const response = await signup(payload);
			if (response?.error) {
				toast.error(response.error);
				return;
			}
			if (form.accountType !== "owner") {
				toast.success(response?.message || T.applicationSubmitted);
			}
			const authResponse = await signin({
				emailOrPhone: form.email,
				password: form.password,
			});
			if (authResponse?.error) {
				toast.error(authResponse.error);
				return;
			}
			authenticate(authResponse, () =>
				setForm((previous) => ({ ...previous, redirect: true }))
			);
		} catch (error) {
			toast.error(apiErrorMessage(error));
		} finally {
			setSubmitting(false);
		}
	};

	if (form.redirect) return <Redirect to='/hotel-management/main-dashboard' />;
	if (isAuthenticated()) return <Redirect to='/' />;

	const submitLabel =
		form.accountType === "agent"
			? T.btnAgent
			: form.accountType === "job"
			? T.btnJob
			: T.btnOwner;

	return (
		<Page dir={isRTL ? "rtl" : "ltr"} className='container'>
			<HeroBar>
				<h1>{T.title}</h1>
			</HeroBar>

			<div className='mx-auto text-center'>
				<Ribbon className='mx-auto'>
					<span>
						{T.welcome} <strong>{T.brand}</strong>
					</span>
				</Ribbon>
			</div>

			<Intro>{T.fill}</Intro>

			<FormWrap onSubmit={submit}>
				<Field $isRTL={isRTL} className='full'>
					<label>{T.accountType}</label>
					<select
						className={errors.accountType ? "invalid" : ""}
						value={form.accountType}
						onChange={changeAccountType}
						disabled={form.invitationLocked}
					>
						<option value=''>{T.accountType}</option>
						<option value='owner'>{T.owner}</option>
						{form.invitationLocked ? (
							<>
								<option value='agent'>{T.agent}</option>
								<option value='job'>{T.job}</option>
							</>
						) : (
							<>
								<option value='agent'>{T.agentInvitationOnly}</option>
								<option value='job'>{T.jobInvitationOnly}</option>
							</>
						)}
					</select>
				</Field>
				{form.inviteRequiredNotice && !form.invitationLocked && (
					<ChoosePrompt className='full'>{T.inviteRequired}</ChoosePrompt>
				)}
				{form.invitationLocked && (
					<ChoosePrompt className='full'>{T.invitedOnly}</ChoosePrompt>
				)}
				{invitationLoading && (
					<ChoosePrompt className='full'>{T.loadingInvitation}</ChoosePrompt>
				)}
				{invitationError && (
					<ChoosePrompt className='full'>{invitationError}</ChoosePrompt>
				)}

				{!form.accountType ? (
					<ChoosePrompt className='full'>{T.chooseTypeFirst}</ChoosePrompt>
				) : (
					<>
						{form.invitationLocked ? (
							<>
								{[
									["firstName", T.firstName, false],
									["lastName", T.lastName, false],
									["email", T.email, Boolean(form.email)],
									["phone", T.phone, Boolean(form.phone)],
								].map(([key, label, locked]) => (
									<Field key={key} $isRTL={isRTL}>
										<label>{label}</label>
										<input
											className={errors[key] ? "invalid" : ""}
											value={form[key]}
											disabled={locked}
											onChange={handle(key)}
											{...(numericOnly.includes(key)
												? { inputMode: "numeric", pattern: "[0-9]*" }
												: {})}
										/>
									</Field>
								))}
							</>
						) : (
							[
								["name", T.fullName],
								["email", T.email],
								["phone", T.phone],
							].map(([key, label]) => (
								<Field key={key} $isRTL={isRTL}>
									<label>{label}</label>
									<input
										className={errors[key] ? "invalid" : ""}
										value={form[key]}
										onChange={handle(key)}
										{...(numericOnly.includes(key)
											? { inputMode: "numeric", pattern: "[0-9]*" }
											: {})}
									/>
								</Field>
							))
						)}

						{form.accountType === "owner" && (
							<>
								<Field $isRTL={isRTL}>
									<label>{T.hotelName}</label>
									<input
										className={errors.hotelName ? "invalid" : ""}
										value={form.hotelName}
										onChange={handle("hotelName")}
									/>
								</Field>
								<Field $isRTL={isRTL}>
									<label>{T.country}</label>
									<select
										className={errors.hotelCountry ? "invalid" : ""}
										value={form.hotelCountry}
										onChange={handle("hotelCountry")}
									>
										<option value='KSA'>KSA</option>
										<option value='UAE'>UAE</option>
										<option value='Qatar'>Qatar</option>
									</select>
								</Field>
								<Field $isRTL={isRTL}>
									<label>{T.state}</label>
									{form.hotelCountry === "KSA" ? (
										<select
											className={errors.hotelState ? "invalid" : ""}
											value={form.hotelState}
											onChange={handle("hotelState")}
										>
											<option value='makkah'>Makkah</option>
											<option value='madinah'>Madinah</option>
										</select>
									) : (
										<input
											className={errors.hotelState ? "invalid" : ""}
											value={form.hotelState}
											onChange={handle("hotelState")}
										/>
									)}
								</Field>
								<Field $isRTL={isRTL}>
									<label>{T.city}</label>
									<input
										className={errors.hotelCity ? "invalid" : ""}
										value={form.hotelCity}
										onChange={handle("hotelCity")}
									/>
								</Field>
								<Field $isRTL={isRTL}>
									<label>{T.address}</label>
									<input
										className={errors.hotelAddress ? "invalid" : ""}
										value={form.hotelAddress}
										onChange={handle("hotelAddress")}
									/>
								</Field>
								<Field $isRTL={isRTL}>
									<label>{T.property}</label>
									<select
										className={errors.propertyType ? "invalid" : ""}
										value={form.propertyType}
										onChange={handle("propertyType")}
									>
										<option value='Hotel'>Hotel</option>
										<option value='Apartments'>Apartments</option>
										<option value='Houses'>Houses</option>
									</select>
								</Field>
								<Field $isRTL={isRTL}>
									<label>{T.floors}</label>
									<input
										className={errors.hotelFloors ? "invalid" : ""}
										value={form.hotelFloors}
										onChange={handle("hotelFloors")}
										inputMode='numeric'
										pattern='[0-9]*'
									/>
								</Field>
								<Field $isRTL={isRTL}>
									<label>{T.rooms}</label>
									<input
										className={errors.hotelRooms ? "invalid" : ""}
										value={form.hotelRooms}
										onChange={handle("hotelRooms")}
										inputMode='numeric'
										pattern='[0-9]*'
									/>
								</Field>
							</>
						)}

						{form.accountType === "agent" && (
							<ApplicationBlock className='full'>
								<BlockHeader>
									<strong>{T.selectHotels}</strong>
									<span>{T.agentHint}</span>
								</BlockHeader>
								<HotelGrid>
									{form.invitationLocked ? (
										<InvitationLockedList>
											{invitationHotelLabels.map((hotel) => (
												<span key={hotel.id}>
													<strong>{hotel.name}</strong>
													{hotel.location && <small>{hotel.location}</small>}
												</span>
											))}
										</InvitationLockedList>
									) : hotelsLoading ? (
										<HelpText>{T.loadingHotels}</HelpText>
									) : hotels.length ? (
										hotels.map((hotel) => (
											<HotelPill
												type='button'
												key={hotel._id}
												$active={form.hotelIds.includes(hotel._id)}
												onClick={() => toggleAgentHotel(hotel._id)}
											>
												<strong>{titleCase(hotel.hotelName || "Hotel")}</strong>
												<span>
													{[hotel.hotelCity, hotel.hotelState, hotel.hotelCountry]
														.filter(Boolean)
														.join(", ")}
												</span>
											</HotelPill>
										))
									) : (
										<HelpText $error>{T.noHotels}</HelpText>
									)}
								</HotelGrid>
							</ApplicationBlock>
						)}

						{form.accountType === "job" && (
							<ApplicationBlock className='full'>
								<BlockHeader>
									<strong>{T.selectOneHotel}</strong>
									<span>{T.jobHint}</span>
								</BlockHeader>
								{form.invitationLocked && (
									<InvitationLockedList>
										{invitationHotelLabels.map((hotel) => (
											<span key={hotel.id}>
												<strong>{hotel.name}</strong>
												{hotel.location && <small>{hotel.location}</small>}
											</span>
										))}
										<span>{T[form.requestedRoleDescription]}</span>
									</InvitationLockedList>
								)}
								<TwoColumn $hidden={form.invitationLocked}>
									<Field $isRTL={isRTL}>
										<label>{T.selectOneHotel}</label>
										<select
											className={errors.jobHotelId ? "invalid" : ""}
											value={form.jobHotelId}
											onChange={handle("jobHotelId")}
										>
											<option value=''>{T.selectOneHotel}</option>
											{hotels.map((hotel) => (
												<option key={hotel._id} value={hotel._id}>
													{titleCase(hotel.hotelName || "Hotel")}
												</option>
											))}
										</select>
									</Field>
									<Field $isRTL={isRTL}>
										<label>{T.jobRole}</label>
										<select
											value={form.requestedRoleDescription}
											onChange={handle("requestedRoleDescription")}
										>
											{jobRoleOptions.map((role) => (
												<option key={role} value={role}>
													{T[role]}
												</option>
											))}
										</select>
									</Field>
								</TwoColumn>
							</ApplicationBlock>
						)}

						{form.accountType === "agent" && !form.invitationLocked && (
							<>
								<Field $isRTL={isRTL}>
									<label>{T.companyName}</label>
									<input value={form.companyName} onChange={handle("companyName")} />
								</Field>
								<Field $isRTL={isRTL}>
									<label>{T.companyOfficialName}</label>
									<input
										value={form.companyOfficialName}
										onChange={handle("companyOfficialName")}
									/>
								</Field>
								<Field $isRTL={isRTL}>
									<label>{T.companyEin}</label>
									<input
										dir='ltr'
										value={form.companyEin}
										onChange={handle("companyEin")}
									/>
								</Field>
								<ApplicationBlock className='full'>
									<BlockHeader>
										<strong>{T.commercialModel}</strong>
										<span>{T.openingWalletHint}</span>
									</BlockHeader>
									<CommercialGrid>
										{commercialModelOptions.map((option) => (
											<CommercialOption
												type='button'
												key={option.value}
												$active={form.agentCommercialModel === option.value}
												onClick={() =>
													setForm((previous) => ({
														...previous,
														agentCommercialModel: option.value,
													}))
												}
											>
												{T[option.labelKey]}
											</CommercialOption>
										))}
									</CommercialGrid>
									<Field $isRTL={isRTL}>
										<label>{T.openingWalletCredit}</label>
										<input
											type='number'
											min='0'
											step='0.01'
											dir='ltr'
											value={form.agentOpeningWalletCredit}
											disabled={form.agentCommercialModel === "commission_only"}
											onChange={handle("agentOpeningWalletCredit")}
										/>
									</Field>
								</ApplicationBlock>
							</>
						)}

						{form.accountType !== "owner" && !form.invitationLocked && (
							<ApplicationBlock className='full'>
								<BlockHeader>
									<strong>{T.attachments}</strong>
									<span>{T.attachmentHint}</span>
								</BlockHeader>
								<UploadButton type='button'>
									<span>{T.upload}</span>
									<input
										type='file'
										accept='image/*,.pdf,application/pdf'
										multiple
										onChange={handleDocumentUpload}
									/>
								</UploadButton>
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
								<Field $isRTL={isRTL}>
									<label>{T.notes}</label>
									<textarea
										value={form.applicationNotes}
										onChange={handle("applicationNotes")}
										rows='3'
									/>
								</Field>
							</ApplicationBlock>
						)}

						<Field $isRTL={isRTL}>
							<label>{T.password}</label>
							<StyledPasswordInput
								className={errors.password ? "invalid" : ""}
								value={form.password}
								onChange={handle("password")}
								autoComplete='new-password'
							/>
						</Field>
						<Field $isRTL={isRTL}>
							<label>{T.password2}</label>
							<StyledPasswordInput
								className={errors.password2 ? "invalid" : ""}
								value={form.password2}
								onChange={handle("password2")}
								autoComplete='new-password'
							/>
						</Field>

						<Terms $isRTL={isRTL} className='full'>
							<input
								type='checkbox'
								checked={form.accepted}
								onChange={(event) =>
									setForm((previous) => ({
										...previous,
										accepted: event.target.checked,
									}))
								}
							/>
							<span>{T.terms}</span>
						</Terms>
						<TermsLink
							$isRTL={isRTL}
							className='full'
							href='https://jannatbooking.com/terms-conditions?tab=hotel'
							target='_blank'
							rel='noreferrer'
						>
							{T.termsLink}
						</TermsLink>

						<Submit
							type='submit'
							disabled={
								!form.accepted ||
								submitting ||
								invitationLoading ||
								Boolean(invitationError)
							}
						>
							{submitting ? "..." : submitLabel}
						</Submit>
					</>
				)}
			</FormWrap>

			{form.accountType && <Note>{T.note}</Note>}

			<Foot $isRTL={isRTL}>
				{T.have}{" "}
				<Link to='/' className='cta'>
					{T.login}
				</Link>
			</Foot>
		</Page>
	);
};

export default HotelSignup;

const inputErrorStyle = css`
	border: 2px solid #e74c3c;
	background: #fff2f0;
`;

const Page = styled.div`
	min-height: 100vh;
	background: #fff;
	padding-top: 75px;

	input,
	select,
	textarea {
		width: 100%;
		min-height: 46px;
		padding: 0.85rem 1rem;
		background: #f3f6f9;
		border: 1px solid #d7e2ea;
		border-radius: 8px;
		color: #152330;
		font-size: 1rem;
		font-weight: 700;
		outline: none;

		&.invalid {
			${inputErrorStyle}
		}
	}

	textarea {
		min-height: 92px;
		resize: vertical;
	}
`;

const HeroBar = styled.div`
	background: #073947;
	color: #fff;
	text-align: center;
	padding: 2rem 1rem;

	h1 {
		margin: 0;
		font-size: clamp(1.6rem, 4vw, 2.2rem);
		font-weight: 800;
	}
`;

const Ribbon = styled.div`
	background: #e5e5e5;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.6rem;
	padding: 0.9rem 1rem;
	margin: auto;

	span {
		font-weight: 800;
		font-size: clamp(1rem, 3vw, 1.3rem);
	}
`;

const Intro = styled.p`
	text-align: center;
	font-weight: 800;
	margin: 1.7rem auto 2.2rem;
	padding: 0 1rem;
	max-width: 760px;
`;

const FormWrap = styled.form`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
	max-width: 980px;
	margin: 0 auto;
	padding: 0 1rem;

	.full {
		grid-column: 1 / -1;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const Field = styled.div`
	display: grid;
	gap: 0.45rem;
	min-width: 0;
	margin: 0;

	label,
	> span:first-child {
		font-weight: 800;
		text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	}
`;

const StyledPasswordInput = styled(Input.Password)`
	width: 100%;
	min-height: 46px;
	padding: 0.35rem 1rem;
	background: #f3f6f9;
	border: 1px solid #d7e2ea;
	border-radius: 8px;

	&.invalid {
		${inputErrorStyle}
	}

	input {
		background: transparent !important;
		border: 0 !important;
		box-shadow: none !important;
		padding: 0 !important;
		min-height: 34px !important;
		font-weight: 700;
	}
`;

const ChoosePrompt = styled.div`
	padding: 1rem;
	border: 1px dashed #b8dcff;
	border-radius: 12px;
	background: #f8fbff;
	color: #0b5cad;
	font-weight: 900;
	text-align: center;
`;

const ApplicationBlock = styled.div`
	display: grid;
	gap: 0.75rem;
	padding: 1rem;
	border: 1px solid #cfe8ff;
	border-radius: 12px;
	background: #f8fbff;
`;

const BlockHeader = styled.div`
	display: grid;
	gap: 0.25rem;

	strong {
		color: #102a43;
		font-size: 1rem;
		font-weight: 900;
	}

	span {
		color: #52677a;
		font-size: 0.86rem;
		font-weight: 700;
		line-height: 1.45;
	}
`;

const HotelGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	gap: 0.55rem;
`;

const InvitationLockedList = styled.div`
	grid-column: 1 / -1;
	display: flex;
	flex-wrap: wrap;
	gap: 0.45rem;

	span {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		min-height: 32px;
		padding: 0.3rem 0.65rem;
		border: 1px solid #b8dcff;
		border-radius: 999px;
		background: #fff;
		color: #0b5cad;
		font-weight: 900;
	}

	strong {
		font: inherit;
	}

	small {
		color: #52677a;
		font-size: 0.75rem;
		font-weight: 800;
	}
`;

const HotelPill = styled.button`
	display: grid;
	gap: 0.25rem;
	min-height: 76px;
	padding: 0.75rem;
	border: 1px solid ${(props) => (props.$active ? "#1677ff" : "#cfe1f4")};
	border-radius: 10px;
	background: ${(props) => (props.$active ? "#eaf4ff" : "#fff")};
	color: #102033;
	text-align: start;
	box-shadow: ${(props) =>
		props.$active ? "0 8px 18px rgba(22, 119, 255, 0.14)" : "none"};

	strong,
	span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	span {
		color: #667085;
		font-size: 0.78rem;
		font-weight: 700;
	}
`;

const TwoColumn = styled.div`
	display: ${(props) => (props.$hidden ? "none" : "grid")};
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.85rem;

	@media (max-width: 680px) {
		grid-template-columns: 1fr;
	}
`;

const CommercialGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.55rem;

	@media (max-width: 680px) {
		grid-template-columns: 1fr;
	}
`;

const CommercialOption = styled.button`
	min-height: 46px;
	border: 1px solid ${(props) => (props.$active ? "#1677ff" : "#cfe1f4")};
	border-radius: 10px;
	background: ${(props) => (props.$active ? "#eaf4ff" : "#fff")};
	color: #102033;
	font-weight: 900;
`;

const UploadButton = styled.button`
	position: relative;
	justify-self: start;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 40px;
	padding: 0 1rem;
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
	gap: 0.45rem;
`;

const DocumentChip = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	max-width: 100%;
	padding: 0.3rem 0.55rem;
	border: 1px solid #b8dcff;
	border-radius: 999px;
	background: #fff;
	font-weight: 800;

	span {
		max-width: 240px;
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

const HelpText = styled.div`
	grid-column: 1 / -1;
	color: ${(props) => (props.$error ? "#b42318" : "#52677a")};
	font-weight: 800;
`;

const Terms = styled.label`
	display: flex;
	align-items: center;
	gap: 0.6rem;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	font-weight: 800;
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};

	input {
		width: auto;
		min-height: auto;
	}
`;

const TermsLink = styled.a`
	display: block;
	width: 100%;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	color: var(--primary-color);
	text-decoration: underline;
	cursor: pointer;
	font-weight: 800;

	&:hover {
		color: var(--primary-color-dark);
	}
`;

const Submit = styled.button`
	grid-column: 1 / -1;
	justify-self: center;
	display: block;
	width: 280px;
	max-width: 100%;
	margin-top: 0.4rem;
	background: #d3a52e;
	color: #fff;
	font-weight: 900;
	border: none;
	border-radius: 8px;
	padding: 0.95rem;
	cursor: pointer;
	transition: opacity 0.25s;

	&:hover:enabled {
		opacity: 0.9;
	}

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
`;

const Note = styled.p`
	max-width: 760px;
	margin: 2rem auto 3.5rem;
	padding: 0 1rem;
	text-align: center;
	font-weight: 800;
	line-height: 1.55;
`;

const Foot = styled.p`
	text-align: ${(props) => (props.$isRTL ? "right" : "left")};
	padding: 0 1rem 3rem;
	max-width: 980px;
	margin: 0 auto;

	.cta {
		color: #0a8fab;
		font-weight: 800;
		text-decoration: underline;
	}
`;
