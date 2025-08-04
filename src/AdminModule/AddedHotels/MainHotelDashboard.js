/** @format
 *  Platform‑admin unified Hotel Dashboard  – with server‑side pagination
 *
 *  © 2025 Serene Code Labs  — free to use in your PMS
 */

import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import styled, { css } from "styled-components";
import {
	Button,
	Card,
	Input,
	message,
	Modal,
	Pagination,
	Select,
	Spin,
	Tooltip,
} from "antd";
import {
	CheckCircleTwoTone,
	EditOutlined,
	PlusOutlined,
} from "@ant-design/icons";

import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { updateHotelDetails } from "../../HotelModule/apiAdmin";
import { gettingHotelDetailsForAdmin } from "../apiAdmin";
import AddHotelForm from "./AddHotelForm";
import EditHotelForm from "./EditHotelForm";
import { STEP_MODAL_REGISTRY_ADMIN } from "../utils/hotel-setup-modals-admin";
import { GlobalOutlined } from "@ant-design/icons";

const { Option } = Select;

/* ─────────────── i18n literals ─────────────── */

const WORDS = {
	en: {
		ribbon_review: "Hotel under review",
		ribbon_active: "Hotel active",
		note:
			"Once all steps are green you may flip the switch below to Activate.\n" +
			"Need help? Reach support on WhatsApp 19092223374.",
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
			"Search by Hotel, Country, Phone, Address, or Owner name / e‑mail…",
		activate: "Activate",
		deactivate: "Deactivate",
		saved: "Hotel record saved",
		noHotels: "No hotels found.",
		page: "Page",
	},
	ar: {
		ribbon_review: "الفندق قيد المراجعة",
		ribbon_active: "الفندق مُفعل",
		note:
			"عند إكتمال جميع الخطوات باللون الأخضر يمكنك تفعيل الفندق من الأسفل.\n" +
			"للمساعدة تواصل عبر واتس آب 19092223374",
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
	},
};

/* ═════════════════════ component ═════════════════════ */

const PAGE_SIZES = [5, 30, 50];

const MainHotelDashboardAdmin = () => {
	/* context & i18n */
	const { chosenLanguage, languageToggle } = useCartContext();
	const L = WORDS[chosenLanguage === "Arabic" ? "ar" : "en"];
	const isRTL = chosenLanguage === "Arabic";

	/* auth – logged‑in platform admin */
	const { user: admin, token } = isAuthenticated();

	/* state ------------------------------------------- */
	const [hotels, setHotels] = useState([]);
	const [total, setTotal] = useState(0); // total documents in DB
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(PAGE_SIZES[0]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");

	/* modal dialogs */
	const [addVisible, setAddVisible] = useState(false);
	const [editVisible, setEditVisible] = useState(false);
	const [currentHotel, setCurrentHotel] = useState(null);
	const [stepModalIdx, setStepModalIdx] = useState(null);
	const [stepModalHotel, setStepModalHotel] = useState(null);

	const switchLanguage = () =>
		languageToggle(chosenLanguage === "English" ? "Arabic" : "English");

	/* ───── fetch list (server‑side pagination) ───── */
	const fetchHotels = useCallback(() => {
		setLoading(true);
		const q = new URLSearchParams({
			page,
			limit,
		}).toString();

		gettingHotelDetailsForAdmin(admin._id, token, q)
			.then((d) => {
				if (d?.error) throw new Error(d.error);
				setHotels(Array.isArray(d.hotels) ? d.hotels : []);
				setTotal(d.total || 0);
			})
			.catch((e) => message.error(e.message || "Error"))
			.finally(() => setLoading(false));
	}, [admin._id, token, page, limit]);

	/* initial + whenever page/limit changes */
	useEffect(fetchHotels, [fetchHotels]);

	/* reset page when search string changes ----------- */
	useEffect(() => {
		if (search) setPage(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	/* client‑side search inside current page ---------- */
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
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
	}, [hotels, search]);

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
					/>
					<Button
						icon={<PlusOutlined />}
						type='primary'
						onClick={() => setAddVisible(true)}
					>
						{L.btnAdd}
					</Button>
				</TopRow>

				<ContentArea>
					<PaginationRow isRTL={isRTL} style={{ marginBottom: "1.6rem" }}>
						<Pagination
							current={page}
							pageSize={limit}
							pageSizeOptions={PAGE_SIZES.map(String)}
							showSizeChanger
							total={total}
							showTotal={(tot, range) =>
								`${L.page} ${page} – ${range[0]}‑${range[1]} / ${tot}`
							}
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
						<>
							<Grid>
								{filtered.map((h) => (
									<HotelCard
										key={h._id}
										hotel={h}
										L={L}
										isRTL={isRTL}
										onTitleClick={() => gotoHotelDashboard(h)}
										onEdit={() => {
											setCurrentHotel(h);
											setEditVisible(true);
										}}
										onActivate={handleActivationChange}
										onStepClick={openStepModal}
									/>
								))}
							</Grid>

							<PaginationRow isRTL={isRTL}>
								<Pagination
									current={page}
									pageSize={limit}
									pageSizeOptions={PAGE_SIZES.map(String)}
									showSizeChanger
									total={total}
									showTotal={(tot, range) =>
										`${L.page} ${page} – ${range[0]}‑${range[1]} / ${tot}`
									}
									onChange={(p, l) => {
										setPage(p);
										setLimit(l);
										window.scrollTo(0, 0);
									}}
								/>
							</PaginationRow>
						</>
					)}
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

/* ══════════════ single hotel card ══════════════ */

const HotelCard = memo(
	({ hotel, L, isRTL, onTitleClick, onEdit, onActivate, onStepClick }) => {
		/* completeness flags */
		const roomsDone = !!hotel.roomCountDetails?.length;
		const photosDone = !!hotel.hotelPhotos?.length;
		const locationDone =
			Array.isArray(hotel.location?.coordinates) &&
			hotel.location.coordinates[0] !== 0 &&
			hotel.location.coordinates[1] !== 0;
		const dataDone =
			hotel.aboutHotel || hotel.aboutHotelArabic || hotel.overallRoomsCount;
		const bankDone = !!hotel.paymentSettings?.length;

		const stepsDone = [
			true,
			roomsDone,
			photosDone,
			locationDone,
			dataDone,
			bankDone,
		];

		/* allow activation even if Bank step missing */
		const canActivate = roomsDone && photosDone && locationDone && dataDone;

		return (
			<CardShell
				tabIndex={0}
				role='button'
				aria-label={hotel.hotelName}
				onKeyPress={(e) => e.key === "Enter" && onTitleClick()}
			>
				<div className='row'>
					{/* left column */}
					<div className='col-md-7 mx-auto'>
						<LeftCol>
							<Ribbon active={hotel.activateHotel}>
								{hotel.activateHotel ? L.ribbon_active : L.ribbon_review}
							</Ribbon>

							<NameRow onClick={onTitleClick} isRTL={isRTL}>
								{hotel.hotelName}
								<EditOutlined
									onClick={(e) => {
										e.stopPropagation();
										onEdit();
									}}
								/>
							</NameRow>

							<Address isRTL={isRTL}>
								{hotel.hotelAddress}
								{hotel.hotelCity && `, ${hotel.hotelCity}`}
								{hotel.hotelCountry && `, ${hotel.hotelCountry}`}
								{(hotel.hotelAddress || hotel.phone) && <br />}
								{hotel.phone && <small>+{hotel.phone}</small>}
							</Address>

							<BigNote isRTL={isRTL}>{L.note}</BigNote>
						</LeftCol>
					</div>

					{/* right column */}
					<div className='col-md-5 mx-auto'>
						<RightCol isRTL={isRTL}>
							<StepsHeading isRTL={isRTL}>{L.stepsTitle}</StepsHeading>

							<StepsUL>
								{L.steps.map((label, idx) => (
									<StepLi
										key={idx}
										done={stepsDone[idx]}
										isRTL={isRTL}
										onClick={() => onStepClick(idx, hotel)}
									>
										<StepBadge done={stepsDone[idx]}>{idx + 1}</StepBadge>
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

							<div style={{ marginTop: 18 }}>
								<Tooltip
									title={canActivate ? "" : "Finish steps 1‑5 first"}
									placement='top'
								>
									<StatusSelect
										value={hotel.activateHotel}
										onChange={(v) => onActivate(hotel, v)}
										disabled={!canActivate}
									>
										<Option value={true}>{L.activate}</Option>
										<Option value={false}>{L.deactivate}</Option>
									</StatusSelect>
								</Tooltip>
							</div>
						</RightCol>
					</div>
				</div>
			</CardShell>
		);
	}
);

/* ══════════════  styled bits  ══════════════ */

const Wrapper = styled.div`
	margin-top: 46px;
	min-height: 100vh;
`;

const TopRow = styled.div`
	display: flex;
	gap: 1rem;
	margin-bottom: 1.4rem;
	flex-wrap: wrap;
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

const Grid = styled.div`
	display: grid;
	gap: 1.6rem;
`;

const PaginationRow = styled.div`
	display: flex;
	justify-content: ${(p) => (p.isRTL ? "flex-start" : "flex-end")};
	margin-top: 1.6rem;
`;

const CardShell = styled(Card)`
	padding: 0 !important;
	border: 1px solid #ccc;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
`;

const LeftCol = styled.div`
	flex: 0 0 58%;
	padding: 2rem 2.2rem;
`;

const RightCol = styled.div`
	flex: 0 0 42%;
	padding: 2rem 1.7rem;
	background: #f5f5f5;
`;

const Ribbon = styled.div`
	background: ${(p) => (p.active ? "#0a8f3d" : "#dea878")};
	color: #fff;
	text-align: center;
	font-weight: 700;
	padding: 0.65rem 1rem;
	margin-bottom: 2rem;
`;

const NameRow = styled.h2`
	margin: 0 0 0.8rem;
	font-size: 1.45rem;
	font-weight: 700;
	display: flex;
	align-items: center;
	gap: 0.55rem;
	cursor: pointer;

	${(p) =>
		p.isRTL &&
		css`
			svg {
				order: -1;
			}
		`}
`;

const Address = styled.p`
	margin: 0 0 2.1rem;
	line-height: 1.45;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
`;

const BigNote = styled.p`
	font-weight: 700;
	line-height: 1.55;
	white-space: pre-line;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
`;

const StepsHeading = styled.h3`
	margin: 0 0 1.5rem;
	font-size: 1.05rem;
	font-weight: 700;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
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
	direction: ${(p) => (p.isRTL ? "rtl" : "ltr")};
	background: ${(p) => (p.done ? "#d6f4d9" : "#d7d7d7")};
	padding: 0.75rem 1rem;
	border-radius: 3px;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 0.55rem;

	&:hover {
		background: ${(p) => (p.done ? "#c8efcd" : "#cfcfcf")};
	}
`;

const StepBadge = styled.span`
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: ${(p) => (p.done ? "#0a8f3d" : "#ffc107")};
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-weight: 700;
	font-size: 0.9rem;
	flex-shrink: 0;
`;

const StatusSelect = styled(Select)`
	width: 160px;
`;
