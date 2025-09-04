/** @format
 *  Platform‑admin unified Hotel Dashboard – Table view with summary & filters
 *
 *  © 2025 Serene Code Labs — free to use in your PMS
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
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
			width: 40,
			align: "center",
			render: (_t, _r, i) => indexStart + i + 1,
			fixed: "left",
		},
		{
			title: L.hotel,
			dataIndex: "hotelName",
			key: "hotelName",
			width: 250,
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
			width: 200,
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
			width: 160,
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
			width: 120,
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
			width: 90,
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
			width: 90,
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
			width: 100,
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
			width: 90,
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
			width: 90,
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
			width: 140,
			render: (v) => <BoolIcon val={v} />,
		},
		{
			title: <span title={L.fullyComplete}>{L.fullyComplete}</span>,
			dataIndex: "fullyComplete",
			align: "center",
			width: 140,
			render: (v) => <BoolIcon val={v} />,
		},
		{
			title: L.activateCol,
			dataIndex: "activateHotel",
			key: "activationAction",
			width: 170,
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

			<Wrapper>
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
							scroll={{ x: 1320 }}
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
					<EditHotelForm
						closeEditHotelModal={() => setEditVisible(false)}
						hotelData={currentHotel}
						updateHotelDetails={updateHotelDetails}
						token={token}
						userId={admin._id}
						refreshList={fetchHotels}
					/>
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
	height: 100%; /* stretch in grid */
	.ant-card-body {
		padding: 14px 16px;
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.stat-icon {
		font-size: 20px;
		opacity: 0.9;
	}
	.stat-texts {
		display: flex;
		flex-direction: column;
		min-width: 0; /* enable ellipsis */
	}
	.stat-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: #55657a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.1;
	}
	.stat-value {
		font-size: 1.28rem;
		font-weight: 800;
		color: #0f172a;
		white-space: nowrap;
	}
`;

const SummaryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 12px;
	margin-top: 8px;
`;

const SummaryHeader = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin: 10px 0 8px;
`;

const SummaryRight = styled.div`
	display: flex;
	align-items: center;
	gap: 10px;
	color: #6b7280;
	font-weight: 600;
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
				<h3 style={{ margin: 0, fontWeight: 800 }}>{L.summaryTitle}</h3>
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

const Wrapper = styled.div`
	margin-top: 46px;
	min-height: 100vh;
`;

const TopRow = styled.div`
	display: flex;
	gap: 1rem;
	margin-bottom: 1rem;
	flex-wrap: wrap;
`;

const FiltersBar = styled.div`
	display: grid;
	gap: 12px;
	margin-bottom: 14px;
`;

const FilterGroup = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 10px 12px;
	background: #fafafa;
	border: 1px solid #eee;
	border-radius: 6px;
`;

const GroupTitle = styled.div`
	font-weight: 700;
	display: flex;
	align-items: center;
	gap: 8px;
	color: #555;
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
`;

const PaginationRow = styled.div`
	display: flex;
	justify-content: ${(p) => (p.isRTL ? "flex-start" : "flex-end")};
`;

const StatusSelect = styled(Select)`
	width: 160px;
`;

/* Compact, consistent row height & 2-line total per text cell (name+address / name+email) */
const StyledTable = styled(Table)`
	/* compact paddings */
	.ant-table-thead > tr > th {
		padding: 10px 12px;
		white-space: nowrap;
	}
	.ant-table-tbody > tr > td {
		padding: 10px 12px;
		vertical-align: middle;
	}

	th {
		text-align: ${(p) => (p.isRTL ? "right" : "")} !important;
	}

	/* block to host two single-line rows */
	.cell-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
		line-height: 1.3;
	}

	/* one-line ellipsis */
	.ellip-1 {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* subtle secondary line */
	.sub-line {
		opacity: 0.85;
		font-size: 12px;
	}

	/* hotel top line spacing for icon */
	.hotel-line {
		display: flex;
		align-items: center;
	}

	/* prevent tall rows */
	.compact-row td {
		max-height: 48px; /* visually compact; content is already clamped */
	}
`;
