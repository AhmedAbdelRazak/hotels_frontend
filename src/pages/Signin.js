/** @format */
/* Signin.jsx */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { authenticate, isAuthenticated, signin, signout } from "../auth";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import queryString from "query-string";
import { useCartContext } from "../cart_context";
import SigninImage from "../GeneralImages/SignInImage.jpg";

/* ───────────── localised strings ───────────── */
const txt = {
	en: {
		hero1: "Welcome to",
		hero2: "X‑Hotel",
		hero3: "Platform",
		sub: "Sign in",
		emailLbl: "Email",
		passLbl: "Password",
		login: "Login",
		signup: "Register",
		noAcc: "If you don't have an account please",
		phEmail: "Email / Phone",
		phPass: "••••••••",
		errMail: "Email is required.",
		errPass: "Password is required.",
	},
	ar: {
		hero1: "مرحباً بشركائنا على منصة",
		hero2: "إكس ",
		hero3: "",
		sub: "تسجيل الدخول",
		emailLbl: "البريد الإلكتروني",
		passLbl: "كلمة المرور",
		login: "الدخول",
		signup: "بدء التسجيل",
		noAcc: "إذا كنت لا تملك حساباً على إكس أوتيل يرجى",
		phEmail: "البريد الإلكتروني / الهاتف",
		phPass: "••••••••",
		errMail: "يرجى إدخال اسم المستخدم.",
		errPass: "يرجى إدخال كلمة المرور.",
	},
};

const Signin = ({ history }) => {
	/* context */
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const t = isRTL ? txt.ar : txt.en;

	/* state */
	const [vals, setVals] = useState({
		email: "",
		password: "",
		loading: false,
		redirect: false,
	});
	const [errors, setErrors] = useState({ email: "", password: "" });

	const { email, password, loading, redirect } = vals;

	/* sign‑out & auto‑login */
	useEffect(() => {
		signout(() => {});
		const qs = queryString.parse(window.location.search);
		if (qs.email && qs.password) {
			setVals((v) => ({
				...v,
				email: qs.email,
				password: qs.password,
				loading: true,
			}));
			signin({ emailOrPhone: qs.email, password: qs.password }).then(
				handleAuth
			);
		}
		// eslint-disable-next-line
	}, []);

	/* auth flow */
	const handleAuth = (data) => {
		if (data.error || (data.user && data.user.activeUser === false)) {
			toast.error(data.error || "Inactive user");
			return setVals((v) => ({ ...v, loading: false }));
		}
		authenticate(data, () => setVals((v) => ({ ...v, redirect: true })));
	};

	/* submit */
	const handleSubmit = (e) => {
		e.preventDefault();
		const eErr = email.trim() ? "" : t.errMail;
		const pErr = password.trim() ? "" : t.errPass;
		setErrors({ email: eErr, password: pErr });
		if (eErr || pErr) {
			toast.error(
				isRTL ? "تحقق من الحقول المطلوبة." : "Please fix the errors."
			);
			return;
		}
		setVals((v) => ({ ...v, loading: true }));
		signin({ emailOrPhone: email, password }).then(handleAuth);
	};

	/* redirect after login */
	if (redirect) history.push("/hotel-management/main-dashboard");

	/* roles guard */
	const user = isAuthenticated()?.user;
	if (user) {
		const paths = {
			2000: "/hotel-management/main-dashboard",
			1000: "/admin/dashboard",
			10000: "/owner-dashboard",
			3000: "/reception-management/new-reservation",
			4000: "/house-keeping-management/house-keeping",
			5000: "/house-keeping-employee/house-keeping",
			6000: "/finance/overview",
		};
		if (paths[user.role]) history.push(paths[user.role]);
	}

	return (
		<Layout dir={isRTL ? "ltr" : "rtl"}>
			{loading && <Mask>Loading…</Mask>}

			{/* image */}
			<Visual>
				<img src={SigninImage} alt='partners handshake' />
			</Visual>

			{/* form panel */}
			<Pane isRTL={isRTL}>
				<Hero>
					<span>{t.hero1}</span>
					<Accent>
						{t.hero2}
						{isRTL && <strong>أوتيل</strong>}
					</Accent>
				</Hero>
				<Line />

				<Sub>{t.sub}</Sub>

				<form onSubmit={handleSubmit} noValidate>
					<Field>
						<label style={{ textAlign: isRTL ? "right" : "" }}>
							{t.emailLbl}
						</label>
						<input
							className={errors.email && "err"}
							value={email}
							onChange={(e) => setVals({ ...vals, email: e.target.value })}
							placeholder={t.phEmail}
						/>
						{errors.email && <em>{errors.email}</em>}
					</Field>

					<Field>
						<label style={{ textAlign: isRTL ? "right" : "" }}>
							{t.passLbl}
						</label>
						<input
							type='password'
							className={errors.password && "err"}
							value={password}
							onChange={(e) => setVals({ ...vals, password: e.target.value })}
							placeholder={t.phPass}
						/>
						{errors.password && <em>{errors.password}</em>}
					</Field>

					<Buttons isRTL={isRTL}>
						<Link to='/signup' className='alt'>
							{t.signup}
						</Link>
						<button type='submit'>{t.login}</button>
					</Buttons>
				</form>

				<SmallNote isRTL={isRTL}>
					{t.noAcc} 
					<Link to='/signup' className='cta'>
						{t.signup}
					</Link>
				</SmallNote>
			</Pane>
		</Layout>
	);
};

export default Signin;

/* ─────────────────────────────  STYLES  ─────────────────────────── */

const Layout = styled.main`
	position: relative;
	display: flex;
	height: 100vh;
	font-family: ${(p) =>
		p.dir === "rtl"
			? "'Droid Arabic Kufi', sans-serif"
			: "Helvetica, sans-serif"};

	@media (max-width: 992px) {
		flex-direction: column; /* stacked, but pane becomes overlay */
	}
`;

/* image column */
const Visual = styled.section`
	flex: 0 0 54%;
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	@media (max-width: 992px) {
		flex: 0 0 100%;
	}
`;

/* pane */
const Pane = styled.section`
	flex: 1 1 46%;
	background: #06232b;
	color: #fff;
	padding: 0 4rem;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;

	@media (max-width: 992px) {
		/* overlay mode on phones */
		position: absolute;
		inset: 0;
		background: rgba(6, 35, 43, 0.8); /* translucent overlay */
		padding: 3rem 1.5rem;
	}
`;

/* headline */
const Hero = styled.h1`
	font-size: 2.8rem;
	font-weight: bolder;
	text-align: center;
	line-height: 1.25;

	span {
		display: block;
	}

	@media (max-width: 992px) {
		font-size: 2rem;
	}
`;

/* accent */
const Accent = styled.span`
	color: #fff;
	font-weight: bold;
	strong {
		color: #00a5ad;
		font-size: 2.2rem;
		font-weight: bold;
	}
`;

/* rule */
const Line = styled.hr`
	width: 65%;
	max-width: 350px;
	border: none;
	border-top: 3px solid #fff;
	margin: 1.3rem 0 2.3rem;
`;

/* subheading */
const Sub = styled.h2`
	font-size: 1.35rem;
	font-weight: 700;
	margin-bottom: 1.5rem;
`;

/* form field */
const Field = styled.div`
	width: 95%;
	max-width: 600px;
	margin-bottom: 1.3rem;
	display: flex;
	flex-direction: column;
	gap: 0.45rem;

	label {
		font-weight: 700;
	}

	input {
		padding: 0.95rem 1.1rem;
		font-size: 1rem;
		border: none;
		width: 360px;
	}

	@media (min-width: 993px) {
		input {
			width: 400px;
		}
	}

	.err {
		outline: 2px solid #b02828;
	}
	em {
		color: #ffb1b1;
		font-size: 0.8rem;
	}
`;

/* buttons */
const Buttons = styled.div`
	margin-top: 0.8rem;
	display: flex;
	flex-direction: ${(p) => (p.isRTL ? "row-reverse" : "row")};
	gap: 1rem;
	width: 100%;
	max-width: 400px;

	button {
		flex: 1;
		padding: 0.9rem;
		background: #158492;
		border: none;
		color: #fff;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.25s;
		&:hover {
			opacity: 0.9;
		}
	}

	.alt {
		flex: 1;
		display: inline-block;
		text-align: center;
		padding: 0.9rem 0;
		background: #b56a00;
		color: #fff;
		font-weight: 700;
		text-decoration: none;
		transition: opacity 0.25s;
		&:hover {
			opacity: 0.9;
		}
	}
`;

/* footnote */
const SmallNote = styled.p`
	margin-top: 2rem;
	font-size: 0.9rem;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};

	.cta {
		color: #ff8c21;
		font-weight: 700;
		text-decoration: underline;
	}
`;

/* loader */
const Mask = styled.div`
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.35);
	color: #fff;
	font-size: 1.2rem;
	display: grid;
	place-items: center;
	z-index: 10000;
`;
