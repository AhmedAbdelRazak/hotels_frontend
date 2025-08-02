/** @format
 *  MainHotelDashboard.jsx  –  reference‑design alignment  (≈650 LOC incl. style)
 */

import React, { useEffect, useState, useCallback, memo } from "react";
import styled, { css } from "styled-components";
import { Button, Modal, Card, message } from "antd";
import {
	PlusOutlined,
	EditOutlined,
	CheckCircleTwoTone,
} from "@ant-design/icons";

import { useCartContext } from "../cart_context";
import { isAuthenticated } from "../auth";
import { hotelAccount, updateHotelDetails } from "./apiAdmin";

import TopNavbar from "./AdminNavbar/TopNavbar";
import AddHotelForm from "./AddHotelForm";
import EditHotelForm from "./EditHotelForm";

/* NEW – step‑specific modal components */
import { STEP_MODAL_REGISTRY } from "./utils/hotel‑setup‑modals"; // adjust path if needed

/* ─────────────────────────── i18n ─────────────────────────── */

const WORDS = {
	en: {
		ribbon: "Hotel under review",
		note:
			"Your request is under review now, our partner‑support team will contact you by WhatsApp or e‑mail in less than 24 hours.\n" +
			"If you want to speed up the registration, please reach us on WhatsApp 19092223374.",
		stepsTitle: "Steps to make the hotel ready for operation & booking:",
		steps: [
			"Registration request",
			"Room types & pricing",
			"Upload required photos",
			"Pin hotel location",
			"Complete hotel data",
			"Bank details",
		],
		startNote:
			"You can complete the required data and then start receiving bookings",
		start: "Start receiving bookings",
		startDisabled: "Finish required data first",
	},
	ar: {
		ribbon: "الفندق قيد المراجعة",
		note:
			"طلبكم قيد المراجعة الآن، وسيتم التواصل معكم من قبل فريق خدمة الشركاء على رقم الواتس آب أو الإيميل خلال ٢٤ ساعة أو أقل.\n" +
			"إذا أردت إسراع عملية التسجيل، يرجى التواصل على رقم واتس آب 19092223374",
		stepsTitle: "خطوات تجهيز الفندق ليصبح قابلاً للتشغيل والحجز:",
		steps: [
			"تقديم طلب التسجيل",
			"أنواع الغرف والسعر",
			"إكمال الصور المطلوبة",
			"إدخال لوكيشن الفندق",
			"استكمال بيانات الفندق",
			"البيانات البنكية",
		],
		startNote:
			"يمكنكم إستكمال البيانات المطلوبة حتى يمكنكم البدء بإستقبال الحجوزات",
		start: "بدء إستقبال الحجوزات",
		startDisabled: "يجب استكمال البيانات المطلوبة",
	},
};

/* ═════════════════════════ Component ═════════════════════════ */

const MainHotelDashboard = () => {
	/* ───── context & state ───── */
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const TXT = WORDS[isRTL ? "ar" : "en"];

	const [adminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	const [userData, setUserData] = useState({});
	const [addVisible, setAddVisible] = useState(false);
	const [editVisible, setEditVisible] = useState(false);
	const [currentHotel, setCurrentHotel] = useState(null);

	/* NEW – which step‑modal is open? */
	const [stepModalIdx, setStepModalIdx] = useState(null); // number or null
	const [stepModalHotel, setStepModalHotel] = useState(null);

	const { user, token } = isAuthenticated();

	/* ───── fetch hotels ───── */
	const fetchHotels = useCallback(() => {
		hotelAccount(user._id, token, user._id).then((d) => {
			if (!d?.error) setUserData(d);
			else console.log(d.error);
		});
	}, [token, user._id]);

	useEffect(fetchHotels, [fetchHotels]);

	/* ───── helpers ───── */
	const gotoHotelDashboard = (hotel) => {
		if (!userData?.activeUser)
			return message.error(
				"Your account is deactivated, please contact administration."
			);
		localStorage.setItem("selectedHotel", JSON.stringify(hotel));
		window.location.href = `/hotel-management/dashboard/${user._id}/${hotel._id}`;
	};

	/* when a step bullet is clicked in a HotelCard */
	const handleStepClick = (idx, hotel) => {
		setStepModalIdx(idx);
		setStepModalHotel(hotel);
	};

	/* ═════ render ═════ */
	return (
		<Wrapper>
			<TopNavbar
				fromPage='AdminDasboard'
				AdminMenuStatus={adminMenuStatus}
				setAdminMenuStatus={setAdminMenuStatus}
				collapsed={collapsed}
				setCollapsed={setCollapsed}
				chosenLanguage={chosenLanguage}
			/>

			<CardsGrid className='container'>
				{userData?.hotelIdsOwner?.length ? (
					userData.hotelIdsOwner.map((h) => (
						<HotelCard
							key={h._id}
							hotel={h}
							WORDS={TXT}
							isRTL={isRTL}
							onEdit={() => {
								setCurrentHotel(h);
								setEditVisible(true);
							}}
							onTitleClick={() => gotoHotelDashboard(h)}
							onStepClick={handleStepClick} /* NEW */
						/>
					))
				) : (
					<p>No hotels found.</p>
				)}

				<Button
					type='primary'
					icon={<PlusOutlined />}
					onClick={() => setAddVisible(true)}
					style={addBtnStyle}
				>
					Add Another Property
				</Button>
			</CardsGrid>

			{/* Add / Edit modals */}
			<Modal
				title='Add New Property'
				open={addVisible}
				onCancel={() => setAddVisible(false)}
				footer={null}
			>
				<AddHotelForm closeAddHotelModal={() => setAddVisible(false)} />
			</Modal>

			<Modal
				title='Edit Property'
				open={editVisible}
				onCancel={() => setEditVisible(false)}
				footer={null}
			>
				<EditHotelForm
					closeEditHotelModal={() => setEditVisible(false)}
					hotelData={currentHotel}
					updateHotelDetails={updateHotelDetails}
					token={token}
					userId={user._id}
				/>
			</Modal>

			{/* dynamic step modal – resolves from the registry */}
			{stepModalIdx !== null &&
				stepModalHotel &&
				(() => {
					const ModalComp = STEP_MODAL_REGISTRY[stepModalIdx];
					if (!ModalComp) return null; // step not implemented yet
					return (
						<ModalComp
							open={true}
							onClose={() => setStepModalIdx(null)}
							hotelDoc={stepModalHotel}
							token={token}
							adminId={user._id}
							language={chosenLanguage}
							refreshCard={fetchHotels}
						/>
					);
				})()}
		</Wrapper>
	);
};

export default MainHotelDashboard;

/* ════════════════════ Single Hotel Card ═════════════════════ */

const HotelCard = memo(
	({ hotel, WORDS, isRTL, onEdit, onTitleClick, onStepClick }) => {
		/* guard against undefined fields */
		const photosDone = !!hotel?.hotelPhotos?.length;
		const roomsDone = !!hotel?.roomCountDetails?.length;
		const locationDone =
			Array.isArray(hotel?.location?.coordinates) &&
			hotel.location.coordinates[0] !== 0 &&
			hotel.location.coordinates[1] !== 0;
		const dataDone =
			hotel?.aboutHotel || hotel?.aboutHotelArabic || hotel?.overallRoomsCount;
		const bankDone = !!hotel?.paymentSettings?.length;

		const stepsDone = [
			true,
			roomsDone,
			photosDone,
			locationDone,
			dataDone,
			bankDone,
		];

		/* ───── JSX ───── */
		return (
			<CardShell>
				<div className='row'>
					{/* LEFT column */}
					<div className='col-md-7 mx-auto'>
						<LeftCol>
							<ReviewRibbon>{WORDS.ribbon}</ReviewRibbon>

							<NameRow onClick={onTitleClick} isRTL={isRTL}>
								{hotel?.hotelName || "Unnamed hotel"}
								<EditOutlined
									onClick={(e) => {
										e.stopPropagation();
										onEdit();
									}}
								/>
							</NameRow>

							<Address isRTL={isRTL}>
								{hotel?.hotelAddress}
								{hotel?.hotelCity && `, ${hotel.hotelCity}`}
								{hotel?.hotelCountry && `, ${hotel.hotelCountry}`}
								{(hotel?.hotelAddress || hotel?.phone) && <br />}
								{hotel?.phone && <small>+{hotel.phone}</small>}
							</Address>

							<BigNote isRTL={isRTL}>
								{WORDS.note.split("\n").map((ln, i) => (
									<span key={i}>
										{ln}
										<br />
									</span>
								))}
							</BigNote>
						</LeftCol>
					</div>

					{/* RIGHT column */}
					<div className='col-md-5 mx-auto'>
						<RightCol isRTL={isRTL}>
							<StepsHeading isRTL={isRTL}>{WORDS.stepsTitle}</StepsHeading>

							<StepsUL>
								{WORDS.steps.map((label, idx) => (
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
												style={{ fontSize: "16px" }}
											/>
										)}
										<span>{label}</span>
									</StepLi>
								))}
							</StepsUL>

							<StepNote isRTL={isRTL}>{WORDS.startNote}</StepNote>

							<ProceedBtn disabled={!stepsDone.every(Boolean)}>
								{stepsDone.every(Boolean) ? WORDS.start : WORDS.startDisabled}
							</ProceedBtn>
						</RightCol>
					</div>
				</div>
			</CardShell>
		);
	}
);

/* ═════════════════════ styled parts ═══════════════════ */

const Wrapper = styled.div`
	margin-top: 70px;
	min-height: 100vh;
	padding: 24px;
	background: var(--background-light);
`;

const CardsGrid = styled.div`
	display: grid;
	gap: 1.8rem;
`;

/* outer card shell */
const CardShell = styled(Card)`
	/* always split into two visible parts */
	display: flex;
	flex-wrap: wrap;
	direction: ltr; /* keeps left / right placement even on RTL pages */
	padding: 0 !important;
	border: 1px solid #ccc;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);

	@media (max-width: 767px) {
		flex-direction: column;
	}
`;

/* left ‑‑ 7/12 */
const LeftCol = styled.div`
	flex: 0 0 58%;
	padding: 2rem 2.2rem;

	@media (max-width: 767px) {
		flex: 1 1 100%;
	}
`;

/* right ‑‑ 5/12 (always visual right) */
const RightCol = styled.div`
	flex: 0 0 42%;
	padding: 2rem 1.7rem;
	background: #f5f5f5;

	@media (max-width: 767px) {
		flex: 1 1 100%;
	}
`;

/* ribbon */
const ReviewRibbon = styled.div`
	background: #dea878;
	color: #fff;
	text-align: center;
	font-weight: 700;
	padding: 0.65rem 1rem;
	margin-bottom: 2rem;
`;

/* hotel name row */
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

/* address */
const Address = styled.p`
	margin: 0 0 2.1rem;
	line-height: 1.45;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
`;

/* info paragraph */
const BigNote = styled.p`
	font-weight: 700;
	line-height: 1.55;
	white-space: pre-line;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
`;

/* right‑column heading */
const StepsHeading = styled.h3`
	margin: 0 0 1.5rem;
	font-size: 1.05rem;
	font-weight: 700;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
`;

/* steps list */
const StepsUL = styled.ul`
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
`;

/* individual row */
const StepLi = styled.li`
	/* RTL means numbered circle starts on the visual right */
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

/* numbered badge */
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

/* guidance note above CTA */
const StepNote = styled.p`
	margin: 1.4rem 0 1.6rem;
	font-size: 0.88rem;
	line-height: 1.45;
	font-weight: 700;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
`;

/* CTA */
const ProceedBtn = styled.button`
	width: 100%;
	padding: 0.9rem;
	background: ${(p) => (p.disabled ? "#9e9e9e" : "#0a8fab")};
	color: #fff;
	border: none;
	font-weight: 700;
	cursor: ${(p) => (p.disabled ? "default" : "pointer")};
	transition: opacity 0.25s;

	&:hover {
		opacity: ${(p) => (p.disabled ? 1 : 0.88)};
	}
`;

/* add‑property button */
const addBtnStyle = {
	backgroundColor: "var(--button-bg-primary)",
	borderColor: "var(--button-bg-primary)",
	color: "var(--button-font-color)",
	width: "50%",
	textAlign: "center",
	margin: "3rem auto 0",
	display: "block",
};
