/** @format */
/* Contact.jsx */

import React, { useState } from "react";
import styled from "styled-components";
import { MailOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useCartContext } from "../cart_context";

/* ──────────────── Localised copy ──────────────── */
const TEXT = {
	en: {
		hero: "Contact Us",
		subtitle: "We’re always happy to help – drop us a line!",
		fields: {
			phone: "Phone number",
			email: "E‑mail",
			msg: "Your inquiry",
			phPhone: "+1 (555) 123‑4567",
			phEmail: "you@example.com",
			phMsg: "Tell us how we can help…",
		},
		submit: "Send message",
		contact: "Direct contacts",
		email: "E‑mail",
		whatsapp: "WhatsApp",
		note: "We normally reply within 24 hours.",
	},
	ar: {
		hero: "تواصل معنا",
		subtitle: "نسعد دائماً بخدمتكم – راسلونا بأي وقت",
		fields: {
			phone: "رقم الهاتف",
			email: "البريد الإلكتروني",
			msg: "استفسارك",
			phPhone: "+966 (5xx) xxx‑xxx",
			phEmail: "you@example.com",
			phMsg: "أخبرنا كيف يمكننا مساعدتك…",
		},
		submit: "إرسال الرسالة",
		contact: "وسائل التواصل المباشر",
		email: "البريد الإلكتروني",
		whatsapp: "واتس آب",
		note: "عادةً نرد خلال 24 ساعة.",
	},
};

/* constants */
const WHATSAPP_NUMBER = "19092223374";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
const SUPPORT_EMAIL = "support@jannatbooking.com";

/* ═══════════════════  Component  ═══════════════════ */

const Contact = () => {
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const t = isRTL ? TEXT.ar : TEXT.en;

	/* simple local state – purely UI for now */
	const [form, setForm] = useState({ phone: "", email: "", msg: "" });
	const handleChange = (e) =>
		setForm({ ...form, [e.target.name]: e.target.value });
	const handleSubmit = (e) => {
		e.preventDefault();
		// TODO – hook into backend
		alert("Form submit is not wired yet 🙂");
	};

	return (
		<Page dir={isRTL ? "rtl" : "ltr"}>
			{/* hero */}
			<Hero>
				<h1>{t.hero}</h1>
				<p>{t.subtitle}</p>
			</Hero>

			{/* body */}
			<Body>
				{/* contact info (left) */}
				<InfoPane isRTL={isRTL}>
					<h2>{t.contact}</h2>

					<ContactLine>
						<MailOutlined />
						<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
					</ContactLine>

					<ContactLine>
						<WhatsAppOutlined />
						<a href={WHATSAPP_URL} target='_blank' rel='noopener noreferrer'>
							{WHATSAPP_NUMBER}
						</a>
					</ContactLine>

					<SmallNote>{t.note}</SmallNote>
				</InfoPane>

				{/* form (right) */}
				<FormPane as='form' isRTL={isRTL} onSubmit={handleSubmit}>
					<Field>
						<label style={{ textAlign: isRTL ? "right" : "left" }}>
							{t.fields.phone}
						</label>
						<input
							type='tel'
							name='phone'
							value={form.phone}
							placeholder={t.fields.phPhone}
							onChange={handleChange}
						/>
					</Field>

					<Field>
						<label style={{ textAlign: isRTL ? "right" : "left" }}>
							{t.fields.email}
						</label>
						<input
							type='email'
							name='email'
							value={form.email}
							placeholder={t.fields.phEmail}
							onChange={handleChange}
						/>
					</Field>

					<Field>
						<label style={{ textAlign: isRTL ? "right" : "left" }}>
							{t.fields.msg}
						</label>
						<textarea
							name='msg'
							rows='5'
							value={form.msg}
							placeholder={t.fields.phMsg}
							onChange={handleChange}
						/>
					</Field>

					<SubmitBtn type='submit'>{t.submit}</SubmitBtn>
				</FormPane>
			</Body>
		</Page>
	);
};

export default Contact;

/* ═══════════════════  STYLES  ═══════════════════ */

const bp = "992px";

const Page = styled.main`
	font-family: ${(p) =>
		p.dir === "rtl"
			? "'Droid Arabic Kufi', sans-serif"
			: "Helvetica, sans-serif"};
	padding-top: 90px; /* under fixed nav */
	min-height: 100vh;
	color: #000;
`;

const Hero = styled.header`
	background: #0b3d4c;
	color: #fff;
	text-align: center;
	padding: 3rem 1rem 2.5rem;

	h1 {
		margin: 0 0 0.8rem;
		font-size: 2.5rem;
		font-weight: 800;
	}
	p {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
	}
`;

const Body = styled.section`
	display: flex;
	flex-wrap: wrap;
	max-width: 1100px;
	margin: 0 auto;
	padding: 3rem 1.2rem 5rem;

	@media (max-width: ${bp}) {
		flex-direction: column;
		gap: 2.8rem;
	}
`;

/* info panel */
const InfoPane = styled.aside`
	flex: 0 0 38%;
	padding: 0 2rem;
	direction: ${(p) => (p.isRTL ? "rtl" : "ltr")};

	h2 {
		font-size: 1.45rem;
		font-weight: 800;
		margin-bottom: 1.4rem;
	}

	@media (max-width: ${bp}) {
		flex: 0 0 100%;
		text-align: ${(p) => (p.isRTL ? "right" : "left")};
	}
`;

const ContactLine = styled.p`
	display: flex;
	align-items: center;
	gap: 0.6rem;
	font-size: 1.05rem;
	margin: 0 0 1.1rem;

	a {
		color: #0b66a6;
		font-weight: 700;
		text-decoration: none;
	}
`;

const SmallNote = styled.p`
	margin-top: 1.3rem;
	font-size: 0.9rem;
	line-height: 1.55;
`;

/* form panel */
const FormPane = styled.div`
	flex: 0 0 62%;
	background: #f7f7f7;
	border-radius: 8px;
	padding: 2.2rem 2.3rem;
	display: flex;
	flex-direction: column;
	gap: 1.3rem;
	direction: ${(p) => (p.isRTL ? "rtl" : "ltr")};

	@media (max-width: ${bp}) {
		flex: 0 0 100%;
	}
`;

const Field = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.45rem;

	label {
		font-weight: 700;
	}
	input,
	textarea {
		padding: 0.9rem 1rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		resize: vertical;
	}
`;

const SubmitBtn = styled.button`
	margin-top: 0.6rem;
	align-self: flex-start;
	padding: 0.85rem 2.2rem;
	background: #0a8fab;
	color: #fff;
	border: none;
	font-weight: 700;
	cursor: pointer;
	transition: opacity 0.25s;

	&:hover {
		opacity: 0.88;
	}
`;
