/** @format */
/* WhyXHotel.jsx — header/sub‑header swapped per latest design */

import styled from "styled-components";
import { useCartContext } from "../cart_context";

/* ──────────────── Localised copy ──────────────── */
const copy = {
	/* ────────── ENGLISH ────────── */
	en: {
		mainHeader: "Welcome partner to the",
		mainBrandX: "X‑",
		mainBrandHotel: "Hotel platform",
		subHeader: "Why X‑Hotel?",
		intro:
			"X‑Hotel offers its partner hotels a comprehensive set of privileges and technology solutions that solve the most common operational and revenue challenges hotels in Makkah and Madinah face. The most important of those are:",
		reasons: [
			{
				heading:
					"1 – All your reservations in one place — no double‑bookings, no losses.",
				body: [
					"X‑HOTEL merges every reservation source (front desk • campaigns • external OTAs such as BOOKING.COM & AGODA • agents) into a single, intuitive control panel.",
					"All bookings live in one database and one master list.",
					"A single room‑map for seamless allotment.",
					"Eliminates over‑booking issues, especially during peak seasons such as Ramadan.",
					"Empowers reception staff to manage everything easily and error‑free.",
				],
			},
			{
				heading:
					"2 – Professional marketing + global presence + steady flow of bookings.",
				body: [
					"The X‑HOTEL team handles the hotel’s full‑funnel marketing with a detailed plan that includes:",
					"Pricing optimisation for the local market, plus content & visual curation.",
					"Global listing across major OTAs such as BOOKING.COM, JANNATBOOKING.COM, and others.",
					"Targeted campaigns for European leisure pilgrims.",
					"Special religious‑season packages tailored to every hotel.",
					"Leveraging guest behaviour and pilgrimage calendars inside the X‑HOTEL PMS app.",
				],
			},
			{
				heading:
					"3 – Professional management from reception desk to financial reports — X‑HOTEL PMS.",
				body: [
					"A smart PMS built specifically for Makkah & Madinah hotels — no extra hardware or technical know‑how needed.",
					"Front‑desk check‑in & check‑out in one click.",
					"Integrated cashier and daily revenue module.",
					"Detailed housekeeping scheduling and maintenance tracking.",
					"Multi‑layer reporting for owners, finance teams and staff.",
				],
			},
			{
				heading: "4 – The technology is completely free.",
				body: [
					"No licence fees — no activation costs — no hidden charges, ever.",
					"The system is cloud‑hosted and maintained by our engineers.",
					"Automatic updates delivered instantly at no cost.",
				],
			},
			{
				heading:
					"5 – Guaranteed, fast payout of platform revenues and commissions.",
				body: [
					"We understand how critical timely cash‑flow is; X‑HOTEL guarantees swift disbursement for all OTA proceeds.",
					"Secure, verified settlement process upon guest check‑out.",
					"Daily or weekly transfer options (bank, cash, internal transfer).",
					"Full visibility inside the PMS — step‑by‑step reconciliation.",
				],
			},
			{
				heading:
					"6 – Live support & on‑site operations team in Makkah — you are never left alone.",
				body: [
					"Every partner hotel gets a dedicated account manager based in Makkah.",
					"Hands‑on training for staff on system usage.",
					"Immediate assistance with guest issues and reservation adjustments.",
					"24/7 telephone and WhatsApp hotline during peak seasons.",
				],
			},
			{
				heading: "7 – Extra services for the hotel — no additional fees.",
				body: [
					"✔️ High‑quality photography & 360‑video sessions for the property.",
					"✔️ Professional room‑type naming and categorisation.",
					"✔️ Dedicated landing page and social‑media promotion.",
					"✔️ Guest review management and rapid customer‑service response.",
				],
			},
		],
	},

	/* ────────── ARABIC ────────── */
	ar: {
		mainHeader: "مرحباً بشركائنا على منصة",
		mainBrandX: "إكس",
		mainBrandHotel: " أوتيل",
		subHeader: "لماذا إكس أوتيل؟",
		intro:
			"تقدّم منصة إكس أوتيل لشركائنا من الفنادق مجموعة ضخمة من الامتيازات وحلول التكنولوجيا التي تعالج معظم المشكلات التي تواجه فنادق مكة والمدينة المنورة، وأهمها:",
		reasons: [
			{
				heading:
					"١- جميع حجوزاتك في مكان واحد – بدون تعارض، بدون ازدواج، بدون خسائر",
				body: [
					"نظام X‑HOTEL يجمع كل مصادر الحجز (الاستقبال • الحملات • منصات الحجز مثل BOOKING.COM و AGODA • المندوبين) في لوحة تحكم واحدة سهلة الاستخدام.",
					"توحيد جميع الحجوزات في قاعدة بيانات واحدة وقائمة رئيسية واحدة.",
					"خريطة غرف موحدة لإدارة التسكين بسلاسة.",
					"القضاء على مشكلة الحجوزات المزدوجة خصوصاً في مواسم الذروة مثل رمضان.",
					"تمكين موظف الاستقبال من إدارة كل شيء بسهولة وبدون أخطاء.",
				],
			},
			{
				heading: "٢- تسويق احترافي + حضور عالمي + حجوزات مستمرة",
				body: [
					"فريق X‑HOTEL مسؤول عن التسويق الكامل للفندق بخطة مدروسة تشمل:",
					"تسعير عرض الفندق في السوق المحلي مع تحسين المحتوى والصور.",
					"نشر الفندق عالمياً عبر BOOKING.COM و JANNATBOOKING.COM وغيرها.",
					"استهداف الحجّاج والسياح القادمين من أوروبا.",
					"باقات مواسم دينية مصمّمة خصيصاً لكل فندق.",
					"استغلال سلوك الضيوف ومواسم الحج والعمرة عبر تطبيق X‑HOTEL PMS.",
				],
			},
			{
				heading:
					"٣- إدارة احترافية للفندق من مكتب الاستقبال حتى التقارير المالية — X‑HOTEL PMS",
				body: [
					"نظام إدارة فندقي ذكي مُصمَّم خصيصًا لفنادق مكة والمدينة — بدون أجهزة إضافية أو خبرة تقنية.",
					"تسجيل دخول وخروج النزلاء بضغطة واحدة.",
					"نظام كاشير ودفعات نقدية يومية مدمج.",
					"جدولة تنظيف الغرف ومتابعة أعمال الصيانة بالتفصيل.",
					"تقارير متعددة المستويات للمالك والإدارة والموظفين.",
				],
			},
			{
				heading: "٤- التقنية مجانية بالكامل",
				body: [
					"لا رسوم ترخيص — لا رسوم تفعيل — لا مصاريف خفية.",
					"النظام سحابي ويُدار بالكامل بواسطة مهندسينا.",
					"تحديثات تلقائية فورية بدون أي تكلفة.",
				],
			},
			{
				heading: "٥- التحويلات المالية من المنصات مضمونة وسريعة",
				body: [
					"ندرك أهمية التدفق النقدي؛ لذلك نضمن تحويل مستحقات المنصات بسرعة.",
					"إغلاق مالي آمن وموثّق عند مغادرة النزيل.",
					"خيارات تحويل يومية أو أسبوعية (حساب بنكي – كاش – تحويل داخلي).",
					"شفافية كاملة داخل النظام مع متابعة خطوة بخطوة.",
				],
			},
			{
				heading: "٦- دعم وتشغيل مباشر من مكة — لا نتركك وحدك",
				body: [
					"يُخصص لكل فندق شريك مدير حساب مقيم في مكة.",
					"تدريب عملي للموظفين على استخدام النظام.",
					"مساعدة فورية في حال وجود أي مشكلة للنزلاء أو تعديل حجز.",
					"هاتف وواتس آب على مدار الساعة خلال مواسم الذروة.",
				],
			},
			{
				heading: "٧- خدمات إضافية للفندق — بدون رسوم",
				body: [
					"✔️ جلسة تصوير احترافية للفندق (صور فوتوغرافية و فيديو 360°).",
					"✔️ تسمية وتصنيف الغرف بطريقة احترافية.",
					"✔️ صفحة مخصصة للفندق وحملات على وسائل التواصل.",
					"✔️ متابعة تقييمات النزلاء والرد بسرعة واحترافية.",
				],
			},
		],
	},
};

/* ════════════════════ COMPONENT ════════════════════ */

const WhyXHotel = () => {
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const t = isRTL ? copy.ar : copy.en;

	return (
		<Wrapper dir={isRTL ? "rtl" : "ltr"} className='container'>
			{/* MAIN HEADER — turquoise banner */}
			<Hero isRTL={isRTL}>
				<h1>
					{t.mainHeader}&nbsp;
					<Brand>
						<span className='x'>{t.mainBrandX}</span>
						<span className='hotel'>{t.mainBrandHotel}</span>
					</Brand>
				</h1>
			</Hero>

			{/* SUB‑HEADER — grey ribbon */}
			<SubHeader isRTL={isRTL}>{t.subHeader}</SubHeader>

			{/* Content */}
			<Container>
				<Intro>{t.intro}</Intro>

				{t.reasons.map((r, i) => (
					<Reason key={i}>
						<Bar isRTL={isRTL}>{r.heading}</Bar>
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
const rtlFont =
	"'Droid Arabic Kufi', 'Tajawal', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif";

const Wrapper = styled.main`
	padding-top: 90px;
	font-family: ${(p) =>
		p.dir === "rtl" ? rtlFont : "Helvetica, Arial, sans-serif"};
	color: #000;
`;

/* Turquoise banner */
const Hero = styled.section`
	background: #0b3d4c;
	color: #fff;
	text-align: center;
	padding: 2.2rem 1rem 1.8rem;

	h1 {
		margin: 0;
		font-size: 2.05rem;
		font-weight: 800;
		line-height: 1.4;
	}

	@media (min-width: ${max}) {
		padding: 3rem 1rem 2.4rem;
		h1 {
			font-size: 2.5rem;
		}
	}
`;

const Brand = styled.span`
	white-space: nowrap;

	.x {
		color: #fff;
		font-weight: 900;
	}

	.hotel {
		color: #00a5ad;
		font-weight: 900;
	}
`;

/* Grey ribbon */
const SubHeader = styled.section`
	background: #e6e6e6;
	font-weight: 700;
	font-size: 1.45rem;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
	padding: 1.3rem 1rem;
	line-height: 1.35;

	@media (min-width: ${max}) {
		font-size: 1.6rem;
		padding: 1.6rem 2rem;
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
	text-align: ${(p) => (p.isRTL ? "right" : "left")};

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
