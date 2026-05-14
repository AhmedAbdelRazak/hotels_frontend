/** @format
 *  Platform‑admin unified Hotel Dashboard – Table view with summary & filters
 *
 *  © 2025 Serene Code Labs — free to use in your PMS
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { createGlobalStyle } from "styled-components";
import {
	Button,
	Card,
	Input,
	message,
	Modal,
	Pagination,
	Select,
	Spin,
	Table,
	Tag,
	Tooltip,
	Space,
	Segmented,
} from "antd";
import {
	CheckCircleTwoTone,
	CloseCircleTwoTone,
	EditOutlined,
	PlusOutlined,
	GlobalOutlined,
	HomeOutlined,
	PictureOutlined,
	EnvironmentOutlined,
	FileTextOutlined,
	BankOutlined,
	SafetyCertificateOutlined,
	TrophyOutlined,
	FilterOutlined,
	ThunderboltOutlined,
	PhoneOutlined,
	MailOutlined,
	UserOutlined,
	ContainerOutlined,
} from "@ant-design/icons";

import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { updateHotelDetails } from "../../HotelModule/apiAdmin";
import { gettingHotelDetailsForAdmin } from "../apiAdmin";
import AddHotelForm from "./AddHotelForm";
import EditHotelForm from "./EditHotelForm";
import { STEP_MODAL_REGISTRY_ADMIN } from "../utils/hotel-setup-modals-admin";

const { Option } = Select;

/* ─────────────── i18n literals ─────────────── */

const WORDS = {
	en: {
		ribbon_review: "Hotel under review",
		ribbon_active: "Hotel active",
		note:
			"Once all steps are green you may flip the switch below to Activate.\n" +
			"Need help? Reach support on WhatsApp 19092223374.",
		stepsTitle: "On‑boarding steps:",
		steps: [
			"Registration request",
			"Room types & pricing",
			"Upload required photos",
			"Pin hotel location",
			"Complete hotel data",
			"Bank details",
		],
		btnAdd: "Add another property",
		diagramButton: "Open xHotelPro PMS map",
		diagramTitle: "xHotelPro PMS operating map",
		searchPh:
			"Search by Hotel, Country, Phone, Address, or Owner name / e‑mail…",
		activate: "Activate",
		deactivate: "Deactivate",
		saved: "Hotel record saved",
		noHotels: "No hotels found.",
		page: "Page",
		statusFilter: "Status",
		completenessFilter: "Completeness",
		all: "All",
		active: "Active",
		inactive: "Inactive",
		missingRooms: "Missing Rooms",
		missingPhotos: "Missing Photos",
		missingLocation: "Missing Location",
		missingData: "Missing Data",
		missingBank: "Missing Bank",
		missingAny: "Missing Any",
		activationReady: "Activation Ready",
		fullyComplete: "Fully Complete",
		hotel: "Hotel",
		owner: "Owner",
		location: "Location",
		phone: "Phone",
		email: "Email",
		status: "Status",
		stepsCol: "Steps",
		activateCol: "Activation",
		index: "#",
		summaryTitle: "Hotels Summary",
		view: "View",
		overall: "Overall",
		currentView: "Current view",
		pageMeta: (page, start, end, total) =>
			`Page ${page} – ${start}-${end} / ${total}`,
	},
	ar: {
		ribbon_review: "الفندق قيد المراجعة",
		ribbon_active: "الفندق مُفعل",
		note:
			"عند إكتمال جميع الخطوات باللون الأخضر يمكنك تفعيل الفندق من الأسفل.\n" +
			"للمساعدة تواصل عبر واتس آب 19092223374",
		stepsTitle: "خطوات التجهيز:",
		steps: [
			"طلب التسجيل",
			"أنواع الغرف والسعر",
			"إتمام الصور المطلوبة",
			"تحديد موقع الفندق",
			"إستكمال بيانات الفندق",
			"البيانات البنكية",
		],
		btnAdd: "إضافة فندق آخر",
		diagramButton: "\u0639\u0631\u0636 \u062e\u0631\u064a\u0637\u0629 xHotelPro PMS",
		diagramTitle:
			"\u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0644\u0640 xHotelPro PMS",
		searchPh: "ابحث بالإسم، الدولة، الهاتف، العنوان أو مالك الفندق…",
		activate: "تفعيل",
		deactivate: "إيقاف",
		saved: "تم الحفظ",
		noHotels: "لا توجد فنادق",
		page: "صفحة",
		statusFilter: "الحالة",
		completenessFilter: "الإكتمال",
		all: "الكل",
		active: "مُفعل",
		inactive: "موقوف",
		missingRooms: "نقص الغرف",
		missingPhotos: "نقص الصور",
		missingLocation: "موقع ناقص",
		missingData: "بيانات ناقصة",
		missingBank: "بنك ناقص",
		missingAny: "نواقص",
		activationReady: "جاهز للتفعيل",
		fullyComplete: "مكتمل كليًا",
		hotel: "الفندق",
		owner: "المالك",
		location: "الموقع",
		phone: "الهاتف",
		email: "البريد",
		status: "الحالة",
		stepsCol: "الخطوات",
		activateCol: "التفعيل",
		index: "م",
		summaryTitle: "ملخص الفنادق",
		view: "العرض",
		overall: "إجمالي",
		currentView: "المنظور الحالي",
		pageMeta: (page, start, end, total) =>
			`صفحة ${page} – ${start}-${end} / ${total}`,
	},
};

/* ═══════════ utility – debounce hook ═══════════ */
const useDebounce = (value, delay = 400) => {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
};

/* ═════════════════════ component ═════════════════════ */

const PAGE_SIZES = [15, 30, 50];

const COMPLETENESS_FILTERS = [
	{ key: "all", labelKey: "all", icon: <FilterOutlined /> },
	{ key: "missing_rooms", labelKey: "missingRooms", icon: <HomeOutlined /> },
	{
		key: "missing_photos",
		labelKey: "missingPhotos",
		icon: <PictureOutlined />,
	},
	{
		key: "missing_location",
		labelKey: "missingLocation",
		icon: <EnvironmentOutlined />,
	},
	{ key: "missing_data", labelKey: "missingData", icon: <FileTextOutlined /> },
	{ key: "missing_bank", labelKey: "missingBank", icon: <BankOutlined /> },
	{ key: "missing_any", labelKey: "missingAny", icon: <ThunderboltOutlined /> },
	{
		key: "activation_ready",
		labelKey: "activationReady",
		icon: <SafetyCertificateOutlined />,
	},
	{
		key: "fully_complete",
		labelKey: "fullyComplete",
		icon: <TrophyOutlined />,
	},
];

const STATUS_FILTERS = [
	{ key: "all", labelKey: "all", icon: <ContainerOutlined /> },
	{
		key: "active",
		labelKey: "active",
		icon: <CheckCircleTwoTone twoToneColor='#52c41a' />,
	},
	{
		key: "inactive",
		labelKey: "inactive",
		icon: <CloseCircleTwoTone twoToneColor='#ff4d4f' />,
	},
];

const PMS_DIAGRAM_IMAGE_URL = `${
	process.env.PUBLIC_URL || ""
}/xhotelpro-pms-map.png`;

const PMS_DIAGRAM_HOTSPOTS = [
	{
		key: "booking",
		label: "Create booking",
		x: 1.9,
		y: 8.8,
		w: 9.1,
		h: 20.3,
	},
	{
		key: "availability",
		label: "Check availability",
		x: 13.0,
		y: 8.8,
		w: 8.8,
		h: 20.3,
	},
	{
		key: "confirmation-wait",
		label: "Waiting confirmation",
		x: 23.6,
		y: 8.8,
		w: 8.8,
		h: 20.3,
	},
	{
		key: "reservation-review",
		label: "Reservation review",
		x: 33.5,
		y: 8.8,
		w: 8.8,
		h: 20.3,
	},
	{
		key: "financial-review",
		label: "Financial review",
		x: 44.2,
		y: 8.8,
		w: 8.8,
		h: 20.3,
	},
	{
		key: "commission",
		label: "Commission decision",
		x: 54.7,
		y: 8.8,
		w: 8.7,
		h: 20.3,
	},
	{
		key: "agent-approval",
		label: "Agent approval",
		x: 64.9,
		y: 8.8,
		w: 8.7,
		h: 20.3,
	},
	{
		key: "confirmed",
		label: "Confirmed reservation",
		x: 74.8,
		y: 8.5,
		w: 9.2,
		h: 22.1,
	},
	{ key: "dashboards-header", label: "Daily operations dashboards", x: 85.4, y: 3.7, w: 13.0, h: 4.8 },
	{ key: "dashboard-general-manager", label: "General manager dashboard", x: 85.6, y: 9.4, w: 12.8, h: 6.0 },
	{ key: "dashboard-reservations", label: "Reservations dashboard", x: 85.6, y: 16.7, w: 12.8, h: 6.0 },
	{ key: "dashboard-finance", label: "Finance dashboard", x: 85.6, y: 24.0, w: 12.8, h: 6.0 },
	{ key: "dashboard-reception", label: "Reception dashboard", x: 85.6, y: 31.2, w: 12.8, h: 6.0 },
	{ key: "dashboard-housekeeping", label: "Housekeeping dashboard", x: 85.6, y: 38.5, w: 12.8, h: 6.0 },
	{ key: "dashboard-agents", label: "Agents dashboard", x: 85.6, y: 45.8, w: 12.8, h: 6.0 },
	{ key: "dashboard-reports", label: "Reports dashboard", x: 85.6, y: 53.1, w: 12.8, h: 6.0 },
	{
		key: "platform",
		label: "xHotelPro operations platform",
		x: 44.1,
		y: 29.0,
		w: 8.7,
		h: 15.3,
	},
	{
		key: "revision-loop",
		label: "Reject or resend loop",
		x: 25.7,
		y: 30.2,
		w: 11.0,
		h: 4.3,
	},
	{
		key: "arrival-prep",
		label: "Arrival preparation",
		x: 77.5,
		y: 40.1,
		w: 5.8,
		h: 20.3,
	},
	{
		key: "checkin",
		label: "Check in",
		x: 69.9,
		y: 40.1,
		w: 6.5,
		h: 20.3,
	},
	{
		key: "stay-management",
		label: "Stay management",
		x: 52.9,
		y: 40.1,
		w: 15.4,
		h: 20.3,
	},
	{
		key: "payments",
		label: "Payment tracking",
		x: 30.8,
		y: 40.1,
		w: 13.4,
		h: 20.3,
	},
	{
		key: "room-status",
		label: "Room status",
		x: 18.2,
		y: 40.1,
		w: 11.4,
		h: 20.3,
	},
	{
		key: "settlement",
		label: "Financial settlement",
		x: 10.6,
		y: 40.1,
		w: 6.8,
		h: 20.3,
	},
	{ key: "closure", label: "Case closure", x: 1.7, y: 40.1, w: 8.0, h: 20.3 },
	{
		key: "alerts",
		label: "Alerts and tasks",
		x: 1.8,
		y: 61.8,
		w: 31.1,
		h: 17.3,
	},
	{ key: "rules", label: "Strict controls", x: 34.0, y: 61.8, w: 28.5, h: 17.3 },
	{
		key: "visibility",
		label: "Business visibility",
		x: 63.5,
		y: 61.8,
		w: 29.8,
		h: 17.3,
	},
	{ key: "roles", label: "Main roles", x: 11.2, y: 82.3, w: 76.7, h: 14.2 },
];

const getHotspotStyle = ({ x, y, w, h }) => ({
	left: `${x}%`,
	top: `${y}%`,
	width: `${w}%`,
	height: `${h}%`,
	"--hotspot-bg": `url(${PMS_DIAGRAM_IMAGE_URL})`,
	"--hotspot-bg-size": `${10000 / w}% ${10000 / h}%`,
	"--hotspot-bg-position": `${(x / (100 - w)) * 100}% ${
		(y / (100 - h)) * 100
	}%`,
});

const MainHotelDashboardAdmin = () => {
	/* context & i18n */
	const { chosenLanguage, languageToggle } = useCartContext();
	const L = WORDS[chosenLanguage === "Arabic" ? "ar" : "en"];
	const isRTL = chosenLanguage === "Arabic";

	/* auth – logged‑in platform admin */
	const { user: admin, token } = isAuthenticated();

	/* state */
	const [hotels, setHotels] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(PAGE_SIZES[0]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [completenessFilter, setCompletenessFilter] = useState("all");
	const [summary, setSummary] = useState({ overall: null, currentView: null });

	/* debounced search term sent to server */
	const debouncedSearch = useDebounce(search.trim(), 400);

	/* modal dialogs */
	const [addVisible, setAddVisible] = useState(false);
	const [editVisible, setEditVisible] = useState(false);
	const [currentHotel, setCurrentHotel] = useState(null);
	const [stepModalIdx, setStepModalIdx] = useState(null);
	const [stepModalHotel, setStepModalHotel] = useState(null);
	const [diagramVisible, setDiagramVisible] = useState(false);

	const switchLanguage = () =>
		languageToggle(chosenLanguage === "English" ? "Arabic" : "English");

	/* ───── fetch list (server‑side pagination + search + filters) ───── */
	const fetchHotels = useCallback(() => {
		setLoading(true);

		const qs = new URLSearchParams({
			page,
			limit,
			q: debouncedSearch,
			...(statusFilter !== "all" ? { status: statusFilter } : {}),
			filter: completenessFilter || "all",
		}).toString();

		gettingHotelDetailsForAdmin(admin._id, token, qs)
			.then((d) => {
				if (d?.error) throw new Error(d.error);
				setHotels(Array.isArray(d.hotels) ? d.hotels : []);
				setTotal(d.total || 0);
				setSummary({
					overall: d?.summary?.overall || null,
					currentView: d?.summary?.currentView || null,
				});
			})
			.catch((e) => message.error(e.message || "Error"))
			.finally(() => setLoading(false));
	}, [
		admin._id,
		token,
		page,
		limit,
		debouncedSearch,
		statusFilter,
		completenessFilter,
	]);

	useEffect(fetchHotels, [fetchHotels]);

	/* reset page when debounced search or filters change ----------- */
	useEffect(() => {
		if (page !== 1) setPage(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedSearch, statusFilter, completenessFilter]);

	/* client‑side safety net filter inside current page */
	const filtered = useMemo(() => {
		const q = debouncedSearch.toLowerCase();
		if (!q) return hotels;
		return hotels.filter((h) => {
			const ownerName = h.belongsTo?.name || "";
			const ownerMail = h.belongsTo?.email || "";
			return (
				h.hotelName?.toLowerCase().includes(q) ||
				h.hotelCountry?.toLowerCase().includes(q) ||
				h.phone?.toLowerCase().includes(q) ||
				h.hotelAddress?.toLowerCase().includes(q) ||
				ownerName.toLowerCase().includes(q) ||
				ownerMail.toLowerCase().includes(q)
			);
		});
	}, [hotels, debouncedSearch]);

	/* ───── handlers ───── */
	const handleActivationChange = (hotel, value) => {
		Modal.confirm({
			title: `${value ? L.activate : L.deactivate} “${hotel.hotelName}”?`,
			onOk: () => {
				const payload = { ...hotel, activateHotel: value };
				return updateHotelDetails(hotel._id, admin._id, token, payload)
					.then((r) => {
						if (r?.error) throw new Error(r.error);
						message.success(L.saved);
						fetchHotels();
					})
					.catch((e) => message.error(e.message || "Error"));
			},
		});
	};

	const openStepModal = (idx, hotel) => {
		setStepModalIdx(idx);
		setStepModalHotel(hotel);
	};

	const gotoHotelDashboard = (hotel) => {
		localStorage.setItem("selectedHotel", JSON.stringify(hotel));
		window.open(
			`/hotel-management/dashboard/${hotel.belongsTo._id}/${hotel._id}`,
			"_blank"
		);
	};

	/* table columns */
	const indexStart = (page - 1) * limit;

	const BoolIcon = ({ val }) =>
		val ? (
			<CheckCircleTwoTone twoToneColor='#52c41a' style={{ fontSize: 18 }} />
		) : (
			<CloseCircleTwoTone twoToneColor='#ff4d4f' style={{ fontSize: 18 }} />
		);

	const columns = [
		{
			title: L.index,
			dataIndex: "__index",
			width: 34,
			align: "center",
			render: (_t, _r, i) => indexStart + i + 1,
			fixed: "left",
		},
		{
			title: L.hotel,
			dataIndex: "hotelName",
			key: "hotelName",
			width: 190,
			render: (_t, record) => {
				const fullName = record.hotelName || "-";
				const fullAddress = [
					record.hotelAddress,
					record.hotelCity,
					record.hotelCountry,
				]
					.filter(Boolean)
					.join(", ");
				return (
					<div className='cell-block'>
						<Tooltip title={fullName}>
							<div
								className='ellip-1 hotel-line'
								role='button'
								tabIndex={0}
								onClick={() => gotoHotelDashboard(record)}
								onKeyDown={(e) =>
									e.key === "Enter" && gotoHotelDashboard(record)
								}
								dir={isRTL ? "rtl" : "ltr"}
								style={{ cursor: "pointer", textTransform: "capitalize" }}
							>
								<strong>{fullName}</strong>
								<Tooltip title='Edit'>
									<EditOutlined
										style={{ marginInlineStart: 8 }}
										onClick={(e) => {
											e.stopPropagation();
											setCurrentHotel(record);
											setEditVisible(true);
										}}
									/>
								</Tooltip>
							</div>
						</Tooltip>

						<Tooltip title={fullAddress}>
							<div className='ellip-1 sub-line'>{fullAddress || "-"}</div>
						</Tooltip>
					</div>
				);
			},
		},
		{
			title: L.owner,
			dataIndex: "belongsTo",
			key: "owner",
			width: 165,
			render: (owner) => {
				const name = owner?.name || "-";
				const email = owner?.email || "-";
				return (
					<div className='cell-block'>
						<Tooltip title={name}>
							<div className='ellip-1'>
								<UserOutlined /> {name}
							</div>
						</Tooltip>
						<Tooltip title={email}>
							<div className='ellip-1 sub-line'>
								<MailOutlined /> {email}
							</div>
						</Tooltip>
					</div>
				);
			},
		},
		{
			title: L.phone,
			dataIndex: "phone",
			key: "phone",
			width: 120,
			render: (v) => (
				<Tooltip title={v ? `+${v}` : "-"}>
					<div className='ellip-1'>
						<PhoneOutlined /> {v ? `+${v}` : "-"}
					</div>
				</Tooltip>
			),
		},
		{
			title: L.status,
			dataIndex: "activateHotel",
			key: "activateHotel",
			width: 105,
			render: (val) =>
				val ? (
					<Tag color='success'>{L.active}</Tag>
				) : (
					<Tag color='warning'>{L.ribbon_review}</Tag>
				),
		},
		{
			title: "Rooms",
			dataIndex: "roomsDone",
			align: "center",
			width: 64,
			render: (v, r) => (
				<div onClick={() => openStepModal(1, r)} style={{ cursor: "pointer" }}>
					<Tooltip title={L.steps[1]}>
						<span>
							<BoolIcon val={v} />
						</span>
					</Tooltip>
				</div>
			),
		},
		{
			title: "Photos",
			dataIndex: "photosDone",
			align: "center",
			width: 64,
			render: (v, r) => (
				<div onClick={() => openStepModal(2, r)} style={{ cursor: "pointer" }}>
					<Tooltip title={L.steps[2]}>
						<span>
							<BoolIcon val={v} />
						</span>
					</Tooltip>
				</div>
			),
		},
		{
			title: "Location",
			dataIndex: "locationDone",
			align: "center",
			width: 72,
			render: (v, r) => (
				<div onClick={() => openStepModal(3, r)} style={{ cursor: "pointer" }}>
					<Tooltip title={L.steps[3]}>
						<span>
							<BoolIcon val={v} />
						</span>
					</Tooltip>
				</div>
			),
		},
		{
			title: "Data",
			dataIndex: "dataDone",
			align: "center",
			width: 64,
			render: (v, r) => (
				<div onClick={() => openStepModal(4, r)} style={{ cursor: "pointer" }}>
					<Tooltip title={L.steps[4]}>
						<span>
							<BoolIcon val={v} />
						</span>
					</Tooltip>
				</div>
			),
		},
		{
			title: "Bank",
			dataIndex: "bankDone",
			align: "center",
			width: 64,
			render: (v, r) => (
				<div onClick={() => openStepModal(5, r)} style={{ cursor: "pointer" }}>
					<Tooltip title={L.steps[5]}>
						<span>
							<BoolIcon val={v} />
						</span>
					</Tooltip>
				</div>
			),
		},
		{
			title: <span title={L.activationReady}>{L.activationReady}</span>,
			dataIndex: "activationReady",
			align: "center",
			width: 100,
			render: (v) => <BoolIcon val={v} />,
		},
		{
			title: <span title={L.fullyComplete}>{L.fullyComplete}</span>,
			dataIndex: "fullyComplete",
			align: "center",
			width: 100,
			render: (v) => <BoolIcon val={v} />,
		},
		{
			title: L.activateCol,
			dataIndex: "activateHotel",
			key: "activationAction",
			width: 110,
			fixed: "right",
			render: (_v, r) => {
				const canActivate = !!(
					r.roomsDone &&
					r.photosDone &&
					r.locationDone &&
					r.dataDone
				);
				return (
					<Tooltip title={canActivate ? "" : "Finish steps 1‑5 first"}>
						<StatusSelect
							value={r.activateHotel}
							onChange={(v) => handleActivationChange(r, v)}
							disabled={!canActivate}
						>
							<Option value={true}>{L.activate}</Option>
							<Option value={false}>{L.deactivate}</Option>
						</StatusSelect>
					</Tooltip>
				);
			},
		},
	];

	/* paging snippet for summary header */
	const startIdx = total === 0 ? 0 : (page - 1) * limit + 1;
	const endIdx = Math.min(page * limit, total);

	/* ═════ render ═════ */

	return (
		<>
			<DiagramModalGlobalStyles />
			{false && (
			<ul
				dir={isRTL ? "rtl" : "ltr"}
				style={{
					cursor: "pointer",
					listStyle: "none",
					display: "flex",
					gap: "1rem",
					padding: "0.5rem 0",
				}}
			>
				<li className='lang' onClick={switchLanguage}>
					<GlobalOutlined />
					<span>{chosenLanguage === "English" ? "عربي" : "En"}</span>
				</li>
			</ul>
			)}

			<Wrapper dir={isRTL ? "rtl" : "ltr"}>
				<DashboardToolbar>
					<DiagramLaunch>
					<Button
						type='primary'
						icon={<PictureOutlined />}
						onClick={() => setDiagramVisible(true)}
					>
						{L.diagramButton}
					</Button>
				</DiagramLaunch>
					<LanguageToggleButton type='button' onClick={switchLanguage}>
						<GlobalOutlined />
						<span className='language-toggle-clean'>
							{chosenLanguage === "English" ? "\u0639\u0631\u0628\u064a" : "En"}
						</span>
						<span>{chosenLanguage === "English" ? "Ø¹Ø±Ø¨ÙŠ" : "En"}</span>
					</LanguageToggleButton>

				<TopRow>
					<Search
						placeholder={L.searchPh}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						dir={isRTL ? "rtl" : "ltr"}
						allowClear
					/>
					<Button
						icon={<PlusOutlined />}
						type='primary'
						onClick={() => setAddVisible(true)}
					>
						{L.btnAdd}
					</Button>
				</TopRow>
				</DashboardToolbar>

				{/* Filters row */}
				<FiltersBar dir={isRTL ? "rtl" : "ltr"}>
					<FilterGroup>
						<GroupTitle>
							<ContainerOutlined /> {L.statusFilter}
						</GroupTitle>
						<Space wrap>
							{STATUS_FILTERS.map(({ key, labelKey, icon }) => (
								<Button
									key={key}
									type={statusFilter === key ? "primary" : "default"}
									icon={icon}
									onClick={() => setStatusFilter(key)}
								>
									{L[labelKey]}
								</Button>
							))}
						</Space>
					</FilterGroup>

					<FilterGroup>
						<GroupTitle>
							<FilterOutlined /> {L.completenessFilter}
						</GroupTitle>
						<Space wrap>
							{COMPLETENESS_FILTERS.map(({ key, labelKey, icon }) => (
								<Button
									key={key}
									type={completenessFilter === key ? "primary" : "default"}
									icon={icon}
									onClick={() => setCompletenessFilter(key)}
								>
									{L[labelKey]}
								</Button>
							))}
						</Space>
					</FilterGroup>
				</FiltersBar>

				{/* Summary cards */}
				<HotelsSummary
					L={L}
					isRTL={isRTL}
					summary={summary}
					pageMeta={L.pageMeta(page, startIdx, endIdx, total)}
				/>

				<ContentArea>
					<PaginationRow isRTL={isRTL} style={{ marginBottom: "1.0rem" }}>
						<Pagination
							current={page}
							pageSize={limit}
							pageSizeOptions={PAGE_SIZES.map(String)}
							showSizeChanger
							total={total}
							showTotal={() => L.pageMeta(page, startIdx, endIdx, total)}
							onChange={(p, l) => {
								setPage(p);
								setLimit(l);
								window.scrollTo(0, 0);
							}}
						/>
					</PaginationRow>

					{loading ? (
						<Spin />
					) : filtered.length === 0 ? (
						<p style={{ fontWeight: "bold" }}>{L.noHotels}</p>
					) : (
						<StyledTable
							dataSource={filtered}
							columns={columns}
							rowKey={(r) => r._id}
							pagination={false}
							scroll={{ x: 1260 }}
							tableLayout='fixed'
							size='small'
							rowClassName='compact-row'
							isRTL={isRTL}
						/>
					)}

					<PaginationRow isRTL={isRTL} style={{ marginTop: "1.0rem" }}>
						<Pagination
							current={page}
							pageSize={limit}
							pageSizeOptions={PAGE_SIZES.map(String)}
							showSizeChanger
							total={total}
							showTotal={() => L.pageMeta(page, startIdx, endIdx, total)}
							onChange={(p, l) => {
								setPage(p);
								setLimit(l);
								window.scrollTo(0, 0);
							}}
						/>
					</PaginationRow>
				</ContentArea>

				<Modal
					title={L.diagramTitle}
					open={diagramVisible}
					onCancel={() => setDiagramVisible(false)}
					footer={null}
					width='100vw'
					style={{ top: 0, maxWidth: "100vw", paddingBottom: 0 }}
					className='xhotelpro-map-modal'
					wrapClassName='xhotelpro-map-modal-wrap'
					zIndex={5000}
					styles={{ body: { padding: 0 } }}
					destroyOnClose
				>
					<DiagramModalBody>
						<DiagramStage aria-label={L.diagramTitle}>
							<img src={PMS_DIAGRAM_IMAGE_URL} alt={L.diagramTitle} />
							{PMS_DIAGRAM_HOTSPOTS.map((spot) => (
								<DiagramHotspot
									key={spot.key}
									type='button'
									style={getHotspotStyle(spot)}
									aria-label={spot.label}
								/>
							))}
						</DiagramStage>
					</DiagramModalBody>
				</Modal>

				{/* ADD / EDIT modals */}
				<Modal
					title={L.btnAdd}
					open={addVisible}
					onCancel={() => setAddVisible(false)}
					footer={null}
					destroyOnClose
				>
					<AddHotelForm closeAddHotelModal={() => setAddVisible(false)} />
				</Modal>

				<Modal
					title='Edit property'
					open={editVisible}
					onCancel={() => setEditVisible(false)}
					footer={null}
					destroyOnClose
				>
					{/* Render the form only when data is ready to avoid first-render mismatches */}
					{currentHotel ? (
						<EditHotelForm
							closeEditHotelModal={() => setEditVisible(false)}
							hotelData={currentHotel}
							updateHotelDetails={updateHotelDetails}
							token={token}
							userId={admin._id}
							refreshList={fetchHotels}
						/>
					) : (
						<Spin />
					)}
				</Modal>

				{/* dynamic step‑specific modal */}
				{stepModalIdx !== null &&
					stepModalHotel &&
					(() => {
						const M = STEP_MODAL_REGISTRY_ADMIN[stepModalIdx];
						if (!M) return null;
						return (
							<M
								open={true}
								onClose={() => setStepModalIdx(null)}
								hotelDoc={stepModalHotel}
								admin={admin}
								token={token}
								language={chosenLanguage}
								refreshCard={fetchHotels}
							/>
						);
					})()}
			</Wrapper>
		</>
	);
};

export default MainHotelDashboardAdmin;

/* ══════════════ HotelsSummary child component (polished) ══════════════ */

const StatCard = styled(Card).attrs({ bordered: false })`
	--bg: #f7f9fc;
	--bd: #e9eef7;
	background: var(--bg);
	border: 1px solid var(--bd);
	border-radius: 10px;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
	height: 100%;
	.ant-card-body {
		padding: 10px 12px;
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.stat-icon {
		font-size: 18px;
		opacity: 0.9;
	}
	.stat-texts {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.stat-title {
		font-size: 0.78rem;
		font-weight: 700;
		color: #55657a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.1;
	}
	.stat-value {
		font-size: 1.15rem;
		font-weight: 800;
		color: #0f172a;
		white-space: nowrap;
	}
`;

const SummaryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
	gap: 8px;
	margin-top: 6px;
`;

const SummaryHeader = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	margin: 6px 0;
	flex-wrap: wrap;
`;

const SummaryRight = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	color: #6b7280;
	font-weight: 600;
	flex-wrap: wrap;
`;

const HotelsSummary = ({ L, isRTL, summary, pageMeta }) => {
	const [mode, setMode] = useState("current"); // "current" | "overall"

	const S =
		mode === "overall" ? summary?.overall || {} : summary?.currentView || {};

	const safe = (k) => (S && typeof S[k] === "number" ? S[k] : 0);

	const Cards = [
		{ title: L.all, value: safe("total"), icon: <ContainerOutlined /> },
		{
			title: L.active,
			value: safe("active"),
			icon: <CheckCircleTwoTone twoToneColor='#52c41a' />,
		},
		{
			title: L.inactive,
			value: safe("inactive"),
			icon: <CloseCircleTwoTone twoToneColor='#ff4d4f' />,
		},
		{
			title: "Rooms ✓ / ✗",
			value: `${safe("roomsDone")} / ${safe("roomsMissing")}`,
			icon: <HomeOutlined />,
		},
		{
			title: "Photos ✓ / ✗",
			value: `${safe("photosDone")} / ${safe("photosMissing")}`,
			icon: <PictureOutlined />,
		},
		{
			title: "Location ✓ / ✗",
			value: `${safe("locationDone")} / ${safe("locationMissing")}`,
			icon: <EnvironmentOutlined />,
		},
		{
			title: "Data ✓ / ✗",
			value: `${safe("dataDone")} / ${safe("dataMissing")}`,
			icon: <FileTextOutlined />,
		},
		{
			title: "Bank ✓ / ✗",
			value: `${safe("bankDone")} / ${safe("bankMissing")}`,
			icon: <BankOutlined />,
		},
		{
			title: L.activationReady,
			value: safe("activationReady"),
			icon: <SafetyCertificateOutlined />,
		},
		{
			title: L.fullyComplete,
			value: safe("fullyComplete"),
			icon: <TrophyOutlined />,
		},
	];

	return (
		<div dir={isRTL ? "rtl" : "ltr"}>
	<SummaryHeader>
				<h3 style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>
					{L.summaryTitle}
				</h3>
				<SummaryRight>
					<span className='page-meta ellip-1'>{pageMeta}</span>
					<Segmented
						value={mode}
						onChange={(v) => setMode(v)}
						options={[
							{ label: L.currentView, value: "current" },
							{ label: L.overall, value: "overall" },
						]}
					/>
				</SummaryRight>
			</SummaryHeader>

			<SummaryGrid>
				{Cards.map((c, idx) => (
					<StatCard key={idx}>
						<span className='stat-icon'>{c.icon}</span>
						<div className='stat-texts'>
							<div className='stat-title' title={c.title}>
								{c.title}
							</div>
							<div className='stat-value'>{c.value}</div>
						</div>
					</StatCard>
				))}
			</SummaryGrid>
		</div>
	);
};

/* ══════════════  styled bits + table compaction & clamping  ══════════════ */

const DiagramModalGlobalStyles = createGlobalStyle`
	.xhotelpro-map-modal-wrap {
		z-index: 5000 !important;
	}

	.xhotelpro-map-modal-wrap .ant-modal {
		max-width: 100vw;
		margin: 0;
		padding-bottom: 0;
		top: 0;
	}

	.xhotelpro-map-modal .ant-modal-content {
		min-height: 100vh;
		border-radius: 0;
		background: #f6f9ff;
		overflow: hidden;
	}

	.xhotelpro-map-modal .ant-modal-header {
		margin: 0;
		padding: 14px 56px 12px 20px;
		border-bottom: 1px solid #dce9ff;
		background: #ffffff;
	}

	.xhotelpro-map-modal .ant-modal-title {
		color: #0b2a66;
		font-weight: 800;
	}

	.xhotelpro-map-modal .ant-modal-close {
		top: 10px;
	}
`;

const Wrapper = styled.div`
	margin-top: 0;
	min-height: auto;
	max-width: 100%;
	overflow: hidden;
`;

const DashboardToolbar = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	flex-wrap: wrap;
	margin-bottom: 10px;
	max-width: 100%;
`;

const DiagramLaunch = styled.div`
	display: flex;
	flex: 0 1 auto;

	.ant-btn {
		height: 36px;
		border-radius: 999px;
		font-weight: 800;
		max-width: 100%;
		white-space: nowrap;
		box-shadow: 0 10px 24px rgba(24, 144, 255, 0.18);
	}

	@media (max-width: 575px) {
		.ant-btn {
			width: 100%;
			justify-content: center;
		}
	}
`;

const LanguageToggleButton = styled.button`
	height: 36px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	border: 1px solid #d8e6ff;
	background: #fff;
	color: #0f3a7a;
	border-radius: 999px;
	padding: 0 12px;
	font-weight: 800;
	cursor: pointer;
	white-space: nowrap;

	&:hover {
		border-color: #1677ff;
		color: #0958d9;
	}

	> .anticon {
		display: inline-flex !important;
	}

	.language-toggle-clean {
		display: inline-flex !important;
		direction: rtl;
		unicode-bidi: isolate;
		font-family: "Tahoma", "Arial", sans-serif;
	}

	> span:not(.language-toggle-clean):not(.anticon) {
		display: none !important;
	}
`;

const TopRow = styled.div`
	display: flex;
	gap: 0.6rem;
	margin-bottom: 0;
	flex-wrap: wrap;
	flex: 1 1 520px;
	min-width: min(100%, 320px);
`;

const FiltersBar = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 8px;
	flex-wrap: wrap;
	margin-bottom: 8px;
	max-width: 100%;
`;

const FilterGroup = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 8px;
	background: #fbfdff;
	border: 1px solid #e7edf7;
	border-radius: 6px;
	min-width: 0;

	.ant-space {
		row-gap: 6px;
	}

	.ant-btn {
		height: 30px;
		padding-inline: 10px;
		font-size: 12px;
	}
`;

const GroupTitle = styled.div`
	font-weight: 700;
	display: flex;
	align-items: center;
	gap: 5px;
	color: #555;
	font-size: 12px;
	white-space: nowrap;
`;

const ContentArea = styled.div`
	position: relative;
	min-height: 200px;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: flex-start;

	> .ant-spin-nested-loading {
		margin: 0 auto;
	}
`;

const Search = styled(Input)`
	max-width: 420px;
	flex: 1 1 320px;
	min-width: min(100%, 260px);
`;

const PaginationRow = styled.div`
	display: flex;
	justify-content: ${(p) => (p.isRTL ? "flex-start" : "flex-end")};
`;

const StatusSelect = styled(Select)`
	width: 160px;
`;

const DiagramModalBody = styled.div`
	height: calc(100vh - 53px);
	overflow: auto;
	padding: 14px;
	background: linear-gradient(180deg, #f7fbff 0%, #eef5ff 100%);
`;

const DiagramStage = styled.div`
	position: relative;
	width: min(100%, 1672px);
	margin: 0 auto;
	line-height: 0;

	img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 8px;
		box-shadow: 0 18px 42px rgba(11, 42, 102, 0.16);
	}
`;

const DiagramHotspot = styled.button`
	position: absolute;
	border: 0;
	padding: 0;
	margin: 0;
	border-radius: 12px;
	background-color: transparent;
	background-image: var(--hotspot-bg);
	background-size: var(--hotspot-bg-size);
	background-position: var(--hotspot-bg-position);
	background-repeat: no-repeat;
	cursor: pointer;
	opacity: 0;
	transform-origin: center;
	transition: opacity 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;

	&::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		border: 2px solid transparent;
		box-shadow: none;
		pointer-events: none;
		transition: border-color 0.15s ease, box-shadow 0.15s ease,
			background-color 0.15s ease;
	}

	&:hover,
	&:focus-visible {
		opacity: 1;
		animation: xhotelproDiagramBeat 0.72s ease-in-out infinite;
		box-shadow: 0 0 0 2px rgba(0, 84, 188, 0.42),
			0 0 0 8px rgba(0, 132, 255, 0.12),
			0 18px 28px rgba(0, 61, 132, 0.18);
		filter: saturate(1.08);
		outline: none;
		z-index: 2;
	}

	&:hover::after,
	&:focus-visible::after {
		border-color: rgba(0, 105, 220, 0.55);
		background-color: rgba(255, 255, 255, 0.05);
		box-shadow: 0 0 0 7px rgba(0, 132, 255, 0.11),
			0 14px 28px rgba(0, 61, 132, 0.14);
	}

	@keyframes xhotelproDiagramBeat {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.055);
		}
	}
`;

/* Compact, consistent row height & 2-line total per text cell (name+address / name+email) */
const StyledTable = styled(Table)`
	.ant-table-thead > tr > th {
		padding: 8px 8px;
		white-space: nowrap;
		font-size: 12px;
	}
	.ant-table-tbody > tr > td {
		padding: 7px 8px;
		vertical-align: middle;
		font-size: 12px;
	}

	th {
		text-align: ${(p) => (p.isRTL ? "right" : "")} !important;
	}

	.cell-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
		line-height: 1.3;
	}

	.ellip-1 {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sub-line {
		opacity: 0.85;
		font-size: 11px;
	}

	.hotel-line {
		display: flex;
		align-items: center;
	}

	.compact-row td {
		max-height: 48px;
	}
`;
