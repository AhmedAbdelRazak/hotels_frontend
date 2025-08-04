/** @format */
/* WhyXHotel.jsx */

import styled from "styled-components";
import { useCartContext } from "../cart_context";

/* ──────────────── Localised copy ──────────────── */
const copy = {
	en: {
		title: "Why X‑Hotel?",
		greet1: "Welcome Partner to",
		greet2: "Platform",
		brandX: "X‑",
		brandHotel: "Hotel",
		intro:
			"X‑Hotel provides our hotel partners with a rich set of privileges and technology solutions that solve most of the problems Makkah and Madinah hotels face. The most important of which are:",
		reasons: [
			{
				heading: "1 – All your hotel reservations in one place.",
				body: [
					"X‑HOTEL consolidates every reservation source (front desk • marketing campaigns • OTAs such as Booking.com & Agoda • agents) into a single, easy‑to‑use control panel.",
					"Unifies all reservations into one database & one master list.",
					"One, consistent room‑map for smooth allotment.",
					"Eliminates over‑booking issues – especially during peak seasons such as Ramadan.",
					"Empowers reception staff to manage everything easily and error‑free.",
				],
			},
			/* You can add reason #2, #3 … here in the same format */
		],
	},
	ar: {
		title: "لماذا إكس أوتيل؟",
		greet1: "مرحباً بشركائنا على منصة",
		greet2: "",
		brandX: "إكس",
		brandHotel: " أوتيل",
		intro:
			"تقدم منصة إكس أوتيل لشركائنا من الفنادق و مقدمي الخدمات الكثير من الإمتيازات و حلول لمعظم المشكلات التكنولوجية للفنادق بمكة و المدينة المنورة و أهمها:",
		reasons: [
			{
				heading: "١ - جميع حجوزات فندقك في مكان واحد.",
				body: [
					"X‑HOTEL يجمع كل أنواع الحجوزات (استقبال – حملات – منصات حجز مثل بوكينج و اجودا – مندوبين) وكل ذلك في لوحة تحكم واحدة،",
					"توحيد جميع الحجوزات في قاعدة بيانات واحدة في قائمة حجوزات واحدة.",
					"إدارة التسكين بخريطة غرف موحدة.",
					"القضاء على مشكلة تعارض الحجوزات، خصوصاً في مواسم الضغط مثل رمضان.",
					"تمكين موظف الاستقبال من إدارة كل شيء بسهولة وبدون أخطاء.",
				],
			},
		],
	},
};

const WhyXHotel = () => {
	/* context */
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const t = isRTL ? copy.ar : copy.en;

	return (
		<Wrapper dir={isRTL ? "rtl" : "ltr"} className='container'>
			{/* 1 — Title banner */}
			<Hero>
				<h1>{t.title}</h1>
			</Hero>

			{/* 2 — Greeting strip */}
			<Greeting isRTL={isRTL} style={{ textAlign: isRTL ? "right" : "left" }}>
				{t.greet1}{" "}
				<Brand>
					<span style={{ textAlign: isRTL ? "right" : "left" }} className='x'>
						{t.brandX}
					</span>
					<span
						style={{ textAlign: isRTL ? "right" : "left" }}
						className='hotel'
					>
						{t.brandHotel}
					</span>
				</Brand>{" "}
				{t.greet2}
			</Greeting>

			{/* 3 — Intro paragraph */}
			<Container>
				<Intro>{t.intro}</Intro>

				{/* 4 — Reason blocks */}
				{t.reasons.map((r, i) => (
					<Reason key={i} isRTL={isRTL}>
						<Bar style={{ textAlign: isRTL ? "right" : "left" }}>
							{r.heading}
						</Bar>
						<Body style={{ textAlign: isRTL ? "right" : "left" }}>
							{r.body.map((line, idx) => (
								<p key={idx}>{line}</p>
							))}
						</Body>
					</Reason>
				))}
			</Container>
		</Wrapper>
	);
};

export default WhyXHotel;

/* ════════════════════  STYLES  ════════════════════ */

const max = "992px";

const Wrapper = styled.main`
	padding-top: 90px; /* leave space under fixed nav */
	font-family: ${(p) =>
		p.dir === "rtl"
			? "'Droid Arabic Kufi', sans-serif"
			: "Helvetica, sans-serif"};
	color: #000;
`;

const Hero = styled.section`
	background: #0b3d4c;
	color: #fff;
	text-align: center;
	padding: 3.2rem 1rem 2.6rem;

	h1 {
		margin: 0;
		font-size: 2.6rem;
		font-weight: 800;
		letter-spacing: 0.5px;
	}

	@media (min-width: ${max}) {
		h1 {
			font-size: 3.4rem;
		}
	}
`;

const Greeting = styled.section`
	background: #e6e6e6;
	font-weight: 700;
	font-size: 1.45rem;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
	padding: 1.4rem 1rem;
	line-height: 1.35;
	@media (min-width: ${max}) {
		font-size: 1.6rem;
		padding: 1.8rem 2rem;
	}
`;

const Brand = styled.span`
	white-space: nowrap;
	.x {
		color: #000;
		font-weight: 900;
	}
	.hotel {
		color: #00a5ad;
		font-weight: 900;
	}
`;

const Container = styled.div`
	max-width: 1000px;
	margin: 0 auto;
	padding: 2.5rem 1.4rem 4rem;
`;

const Intro = styled.p`
	max-width: 820px;
	margin: 0 auto 2.8rem;
	font-size: 1.15rem;
	font-weight: 700;
	text-align: center;
	line-height: 1.6;
`;

const Reason = styled.section`
	&:not(:first-of-type) {
		margin-top: 3.5rem;
	}
`;

const Bar = styled.div`
	background: #e7b288;
	color: #fff;
	font-weight: 900;
	font-size: 1.35rem;
	padding: 1rem 1.5rem;
	text-align: ${(p) => (p.dir === "rtl" ? "right" : "left")};
	@media (min-width: ${max}) {
		font-size: 1.5rem;
	}
`;

const Body = styled.div`
	padding: 2rem 1.5rem 0;
	p {
		margin: 0 0 1rem;
		line-height: 1.75;
		font-size: 1.1rem;
	}
	p:last-child {
		margin-bottom: 0;
	}
`;
