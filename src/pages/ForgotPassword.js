/** @format */
/* ForgotPassword.jsx — email or phone; WhatsApp-aware; EN/AR; axios inside */

import React, { useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { useCartContext } from "../cart_context";
import { Link } from "react-router-dom";

// Arabic → English digits + phone/email normaliser (like your Signin)
const toEnglishDigits = (str = "") =>
	str
		.replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
		.replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
const normaliseCredential = (v = "") => {
	let s = toEnglishDigits(v);
	const looksLikeEmail = /[A-Za-z@]/.test(s);
	if (!looksLikeEmail) s = s.replace(/\D/g, "");
	return s;
};

const t = {
	en: {
		title: "Forgot Password",
		sub: "We will send you a reset link by email and WhatsApp (if a phone exists).",
		label: "Email or Phone",
		placeholder: "you@example.com or +123456789",
		send: "Send Reset Link",
		back: "Back to Sign in",
		ok: "If an account exists, a reset link will be sent.",
		waOpen: "Open WhatsApp",
		or: "or",
	},
	ar: {
		title: "نسيت كلمة المرور",
		sub: "سنرسل لك رابط إعادة التعيين عبر البريد الإلكتروني والواتساب (إذا توفّر رقم هاتف).",
		label: "البريد الإلكتروني أو الهاتف",
		placeholder: "you@example.com أو +123456789",
		send: "إرسال الرابط",
		back: "العودة لتسجيل الدخول",
		ok: "إذا كان الحساب موجوداً، سيتم إرسال رابط إعادة التعيين.",
		waOpen: "فتح واتساب",
		or: "أو",
	},
};

export default function ForgotPassword() {
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const L = isRTL ? t.ar : t.en;

	const [value, setValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [waLink, setWaLink] = useState("");

	const onSubmit = async (e) => {
		e.preventDefault();
		const credential = value.trim();
		if (!credential) {
			toast.error(
				isRTL
					? "يرجى إدخال بريد إلكتروني أو هاتف."
					: "Please enter email or phone."
			);
			return;
		}
		setLoading(true);
		setWaLink("");

		try {
			const { data } = await axios.put(
				`${process.env.REACT_APP_API_URL}/forgot-password`,
				{
					emailOrPhone: normaliseCredential(credential),
				}
			);
			setLoading(false);
			if (data?.error) return toast.error(data.error);
			if (data?.wa_link) setWaLink(data.wa_link);
			toast.success(data?.message || L.ok);
		} catch (err) {
			setLoading(false);
			toast.error(err?.response?.data?.error || "Failed to send reset link.");
		}
	};

	return (
		<Wrap dir={isRTL ? "rtl" : "ltr"}>
			<Card>
				<h1>{L.title}</h1>
				<p>{L.sub}</p>
				<form onSubmit={onSubmit} noValidate>
					<label>{L.label}</label>
					<input
						value={value}
						onChange={(e) => setValue(normaliseCredential(e.target.value))}
						placeholder={L.placeholder}
					/>
					<button type='submit' disabled={loading}>
						{loading ? (isRTL ? "جاري الإرسال..." : "Sending...") : L.send}
					</button>
				</form>

				{waLink && (
					<WaBox>
						<span>{L.or}</span>
						<a className='wa' href={waLink} target='_blank' rel='noreferrer'>
							{L.waOpen}
						</a>
					</WaBox>
				)}

				<Back>
					<Link to='/signin'>{L.back}</Link>
				</Back>
			</Card>
		</Wrap>
	);
}

/* styles */
const Wrap = styled.main`
	min-height: 100vh;
	display: grid;
	place-items: center;
	background: #06232b;
	color: #fff;
`;
const Card = styled.section`
	width: min(92vw, 520px);
	background: #0b2f3a;
	padding: 2rem;
	border-radius: 12px;
	h1 {
		margin: 0 0 0.5rem;
	}
	p {
		margin: 0 0 1.2rem;
		opacity: 0.9;
	}
	label {
		display: block;
		margin: 0.5rem 0;
		font-weight: 700;
	}
	input {
		width: 100%;
		padding: 0.85rem 1rem;
		border: none;
		margin-bottom: 1rem;
	}
	button {
		width: 100%;
		padding: 0.9rem;
		border: none;
		font-weight: 700;
		color: #fff;
		background: #158492;
		cursor: pointer;
	}
`;
const Back = styled.p`
	margin-top: 1rem;
	text-align: center;
	a {
		color: #ff8c21;
		text-decoration: underline;
	}
`;
const WaBox = styled.div`
	margin-top: 1rem;
	text-align: center;
	.wa {
		display: inline-block;
		margin-top: 0.4rem;
		padding: 0.6rem 1rem;
		background: #25d366;
		color: #06232b;
		font-weight: 700;
		border-radius: 6px;
	}
`;
