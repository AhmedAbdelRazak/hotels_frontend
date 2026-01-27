/** @format
 *  MainHotelDashboard.jsx  –  unified 6‑step onboarding dashboard
 *  © 2025 Serene Code Labs – free to use in your PMS
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
import { getStoredMenuCollapsed } from "./utils/menuState";

/* 🔑  step‑modal registry */
import { STEP_MODAL_REGISTRY } from "./utils/hotel‑setup‑modals";

/* ──────────── literals / i18n ──────────── */

const CONTACT_WHATSAPP = "19092223374";
const CONTACT_URL = `https://wa.me/${CONTACT_WHATSAPP}`;

const WORDS = {
	en: {
		ribbon: "Hotel under review",
		ribbonActive: "Hotel is active ✓",
		note:
			"Your request is under review now, our partner‑support team will contact you by WhatsApp or e‑mail in less than 24 hours.\n" +
			"If you want to speed up the registration, please reach us on WhatsApp " +
			CONTACT_WHATSAPP +
			".",
		noteActive: "Everything is set – your hotel is live and bookable!",
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
		ribbonActive: "الفندق مفعل وجاهز للحجوزات ✓",
		note:
			"طلبكم قيد المراجعة الآن، وسيتم التواصل معكم من قبل فريق خدمة الشركاء على رقم الواتس آب أو الإيميل خلال ٢٤ ساعة أو أقل.\n" +
			"إذا أردت إسراع عملية التسجيل، يرجى التواصل على رقم واتس آب " +
			CONTACT_WHATSAPP,
		noteActive: "تم تفعيل الفندق – يمكنكم الآن استقبال الحجوزات!",
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

/* ═══════════════════  Component  ═══════════════════ */

const MainHotelDashboard = () => {
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const TXT = WORDS[isRTL ? "ar" : "en"];

	/* side‑nav + data */
	const [adminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed } = getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [userData, setUserData] = useState({});

	/* add / edit property */
	const [addVisible, setAddVisible] = useState(false);
	const [editVisible, setEditVisible] = useState(false);
	const [currentHotel, setCurrentHotel] = useState(null);

	/* onboarding modals */
	const [stepModalIdx, setStepModalIdx] = useState(null);
	const [stepModalHotel, setStepModalHotel] = useState(null);

	const { user, token } = isAuthenticated();

	/* fetch hotels owned by this admin */
	const fetchHotels = useCallback(() => {
		hotelAccount(user._id, token, user._id).then((d) => {
			if (d?.error) console.log(d.error);
			else setUserData(d);
		});
	}, [token, user._id]);

	useEffect(fetchHotels, [fetchHotels]);

	/* navigation helpers */
	const gotoHotelDashboard = (hotel) => {
		if (!userData?.activeUser) {
			return message.error(
				"Your account is deactivated, please contact administration."
			);
		}
		localStorage.setItem("selectedHotel", JSON.stringify(hotel));
		window.location.href = `/hotel-management/dashboard/${user._id}/${hotel._id}`;
	};

	const handleStepClick = (idx, hotel) => {
		setStepModalIdx(idx);
		setStepModalHotel(hotel);
	};

	/* ═════ JSX ═════ */
	return (
		<Wrapper>
			<TopNavbar
				fromPage='AdminDashboard'
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
							adminId={user._id}
							onEdit={() => {
								setCurrentHotel(h);
								setEditVisible(true);
							}}
							onTitleClick={() => gotoHotelDashboard(h)}
							onStepClick={handleStepClick}
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

			{/* add / edit */}
			<Modal
				title='Add New Property'
				open={addVisible}
				onCancel={() => setAddVisible(false)}
				footer={null}
				destroyOnClose
			>
				<AddHotelForm closeAddHotelModal={() => setAddVisible(false)} />
			</Modal>

			<Modal
				title='Edit Property'
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
					userId={user._id}
				/>
			</Modal>

			{/* dynamic step modal (resolved from registry) */}
			{stepModalIdx !== null &&
				stepModalHotel &&
				(() => {
					const ModalComp = STEP_MODAL_REGISTRY[stepModalIdx];
					if (!ModalComp) return null;
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

/* ═══════════  Single hotel card  ═══════════ */

const HotelCard = memo(
	({ hotel, WORDS, isRTL, adminId, onEdit, onTitleClick, onStepClick }) => {
		const isActive = !!hotel.activateHotel;

		/* progress flags */
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

		/* click on start */
		const handleStart = () => {
			if (!stepsDone.every(Boolean)) return;
			window.location.href = `/hotel-management/new-reservation/${adminId}/${hotel._id}?newReservation`;
		};

		/* replace WhatsApp number with clickable anchor */
		const renderNoteLine = (ln, idx) => {
			if (ln.includes(CONTACT_WHATSAPP)) {
				const parts = ln.split(CONTACT_WHATSAPP);
				return (
					<span key={idx}>
						{parts[0]}
						<a
							href={CONTACT_URL}
							target='_blank'
							rel='noopener noreferrer'
							style={{ fontWeight: 700 }}
						>
							{CONTACT_WHATSAPP}
						</a>
						{parts[1]}
						<br />
					</span>
				);
			}
			return (
				<span key={idx}>
					{ln}
					<br />
				</span>
			);
		};

		/* ─── JSX ─── */
		return (
			<CardShell>
				<div className='row'>
					{/* LEFT */}
					<div className='col-md-7 mx-auto'>
						<LeftCol>
							<ReviewRibbon $active={isActive}>
								{isActive ? WORDS.ribbonActive : WORDS.ribbon}
							</ReviewRibbon>

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
								{(isActive ? WORDS.noteActive : WORDS.note)
									.split("\n")
									.map(renderNoteLine)}
							</BigNote>
						</LeftCol>
					</div>

					{/* RIGHT */}
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
												style={{ fontSize: 16 }}
											/>
										)}
										<span>{label}</span>
									</StepLi>
								))}
							</StepsUL>

							<StepNote isRTL={isRTL}>{WORDS.startNote}</StepNote>

							<ProceedBtn
								disabled={!stepsDone.every(Boolean)}
								onClick={handleStart}
							>
								{stepsDone.every(Boolean) ? WORDS.start : WORDS.startDisabled}
							</ProceedBtn>
						</RightCol>
					</div>
				</div>
			</CardShell>
		);
	}
);

/* ═════════════  styled parts  ═════════════ */

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

const CardShell = styled(Card)`
	display: flex;
	flex-wrap: wrap;
	direction: ltr;
	padding: 0 !important;
	border: 1px solid #ccc;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);

	@media (max-width: 767px) {
		flex-direction: column;
	}
`;

const LeftCol = styled.div`
	flex: 0 0 58%;
	padding: 2rem 2.2rem;

	@media (max-width: 767px) {
		flex: 1 1 100%;
	}
`;

const RightCol = styled.div`
	flex: 0 0 42%;
	padding: 2rem 1.7rem;
	background: #f5f5f5;

	@media (max-width: 767px) {
		flex: 1 1 100%;
	}
`;

const ReviewRibbon = styled.div`
	background: ${(p) => (p.$active ? "#4caf50" : "#dea878")};
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

const StepNote = styled.p`
	margin: 1.4rem 0 1.6rem;
	font-size: 0.88rem;
	line-height: 1.45;
	font-weight: 700;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
`;

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

const addBtnStyle = {
	backgroundColor: "var(--button-bg-primary)",
	borderColor: "var(--button-bg-primary)",
	color: "var(--button-font-color)",
	width: "50%",
	textAlign: "center",
	margin: "3rem auto 0",
	display: "block",
};
