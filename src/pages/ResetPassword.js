/** @format */
/* ResetPassword.jsx — EN/AR; greets user; axios inside */

import React, { useMemo, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { toast } from "react-toastify";
import { useCartContext } from "../cart_context";
import { useParams, Link, useHistory } from "react-router-dom";

const decodeJwt = (token) => {
	try {
		const seg = token.split(".")[1];
		const padded = seg.replace(/-/g, "+").replace(/_/g, "/");
		const json = decodeURIComponent(
			Array.prototype.map
				.call(
					atob(padded),
					(c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
				)
				.join("")
		);
		return JSON.parse(json);
	} catch {
		return null;
	}
};

const t = {
	en: {
		title: "Reset Password",
		hi: (n) =>
			`Hi ${n || "there"}, please set a new password (at least 6 characters).`,
		pass: "New Password",
		conf: "Confirm Password",
		save: "Update Password",
		back: "Back to Sign in",
		mismatch: "Passwords do not match.",
		tooShort: "Password must be at least 6 characters.",
		success: "Password updated. Redirecting to Sign in…",
	},
	ar: {
		title: "إعادة تعيين كلمة المرور",
		hi: (n) =>
			`مرحباً ${n || "بك"}، يرجى تعيين كلمة مرور جديدة (٦ أحرف على الأقل).`,
		pass: "كلمة المرور الجديدة",
		conf: "تأكيد كلمة المرور",
		save: "تحديث كلمة المرور",
		back: "العودة لتسجيل الدخول",
		mismatch: "كلمتا المرور غير متطابقتين.",
		tooShort: "يجب أن تكون كلمة المرور ٦ أحرف على الأقل.",
		success: "تم تحديث كلمة المرور. سيتم تحويلك لتسجيل الدخول...",
	},
};

export default function ResetPassword() {
	const { token } = useParams();
	const history = useHistory();
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const L = isRTL ? t.ar : t.en;

	const payload = useMemo(() => decodeJwt(token), [token]);
	const name = payload?.name;

	const [p1, setP1] = useState("");
	const [p2, setP2] = useState("");
	const [loading, setLoading] = useState(false);

	const submit = async (e) => {
		e.preventDefault();
		if (p1.length < 6) return toast.error(L.tooShort);
		if (p1 !== p2) return toast.error(L.mismatch);

		setLoading(true);
		try {
			const { data } = await axios.put(
				`${process.env.REACT_APP_API_URL}/reset-password`,
				{
					resetPasswordLink: token,
					newPassword: p1,
				}
			);
			setLoading(false);
			if (data?.error) return toast.error(data.error);
			toast.success(L.success);
			setTimeout(() => history.push("/"), 1200);
		} catch (err) {
			setLoading(false);
			toast.error(err?.response?.data?.error || "Failed to reset password.");
		}
	};

	return (
		<Wrap dir={isRTL ? "rtl" : "ltr"}>
			<Card>
				<h1>{L.title}</h1>
				<p>{L.hi(name)}</p>
				<form onSubmit={submit} noValidate>
					<label>{L.pass}</label>
					<input
						type='password'
						value={p1}
						onChange={(e) => setP1(e.target.value)}
					/>
					<label>{L.conf}</label>
					<input
						type='password'
						value={p2}
						onChange={(e) => setP2(e.target.value)}
					/>
					<button type='submit' disabled={loading}>
						{loading ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : L.save}
					</button>
				</form>
				<Back>
					<Link to='/'>{L.back}</Link>
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
