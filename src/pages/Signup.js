/** @format */
/* HotelSignup.jsx — single‑column form, defaults preset */

import React, { useState } from "react";
import { Link, Redirect } from "react-router-dom";
import styled from "styled-components";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { signup, signin, authenticate, isAuthenticated } from "../auth";
import { useCartContext } from "../cart_context";

/* ─── translations ─── */
const W = {
	en: {
		title: "Hotel Registration Request",
		welcome: "Welcome to",
		brand: "X‑Hotel",
		fill: "Please fill all data then press Register",
		fullName: "Full account owner name",
		email: "Email address",
		phone: "Phone (WhatsApp)",
		hotelName: "Hotel name",
		country: "Country",
		state: "State / Region",
		city: "City",
		address: "Street address",
		property: "Property type",
		floors: "Number of floors",
		rooms: "Number of rooms",
		password: "Password",
		password2: "Confirm password",
		terms: "I accept X‑Hotel Terms & Conditions",
		note: "Please ensure all information is accurate; the data‑entry person is responsible for any errors.",
		btn: "Register now",
		have: "If you already have an account please",
		login: "Login here",
		req: "This field is required",
		mismatch: "Passwords don't match",
	},
	ar: {
		title: "طلب تسجيل فندق",
		welcome: "مرحباً بشركائنا على منصة",
		brand: "إكس أوتيل",
		fill: "يرجى ملء جميع البيانات و الضغط على تسجيل",
		fullName: "اسم صاحب الحساب بالكامل",
		email: "البريد الإلكتروني",
		phone: "رقم الهاتف ( يجب ان يكون عليه واتس أب )",
		hotelName: "اسم الفندق",
		country: "البلد",
		state: "المنطقة / الولاية",
		city: "المدينة",
		address: "العنوان التفصيلي",
		property: "نوع العقار",
		floors: "عدد الادوار",
		rooms: "عدد الغرف",
		password: "كلمة المرور",
		password2: "إعادة كتابة كلمة المرور",
		terms: "أُقر أن جميع البيانات صحيحة وأوافق على الشروط والأحكام",
		note: "يرجى التأكد من ملء جميع البيانات بالشكل كامل وصحيح, واي أخطاء بالبيانات تكون على مسؤولية مدخل البيانات.",
		btn: "سجل الآن",
		have: "إذا كنت تملك حساباً مسبقاً رجاءً",
		login: "سجّل الدخول",
		req: "هذا الحقل مطلوب",
		mismatch: "كلمتا المرور غير متطابقتين",
	},
};

const HotelSignup = ({ history }) => {
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const T = isRTL ? W.ar : W.en;

	/* initial state incl. defaults */
	const [form, setForm] = useState({
		name: "",
		email: "",
		phone: "",
		hotelName: "",
		hotelCountry: "KSA",
		hotelState: "makkah",
		hotelCity: "",
		hotelAddress: "",
		propertyType: "Hotel",
		hotelFloors: "",
		hotelRooms: "",
		password: "",
		password2: "",
		role: 2000,
		accepted: false,
		redirect: false,
	});

	/* two‑way binding */
	const handle = (k) => (e) =>
		setForm({ ...form, [k]: e.target ? e.target.value : e });

	/* validation */
	const required = Object.keys(form).filter(
		(k) => !["accepted", "redirect"].includes(k)
	);

	const submit = (e) => {
		e.preventDefault();
		for (const f of required) if (!form[f]) return toast.error(T.req);
		if (form.password !== form.password2) return toast.error(T.mismatch);
		if (!form.accepted) return toast.error(T.terms);

		signup(form).then((res) => {
			if (res.error) return toast.error(res.error);
			signin({ emailOrPhone: form.email, password: form.password }).then(
				(d) => {
					if (d.error) return toast.error(d.error);
					authenticate(d, () => setForm({ ...form, redirect: true }));
				}
			);
		});
	};

	/* redirects */
	if (form.redirect) return <Redirect to='/hotel-management/main-dashboard' />;
	if (isAuthenticated()) return <Redirect to='/' />;

	return (
		<Page dir={isRTL ? "rtl" : "ltr"} className='container'>
			<ToastContainer />

			{/* Header */}
			<HeroBar>
				<h1>{T.title}</h1>
			</HeroBar>
			<div className='mx-auto text-center'>
				<Ribbon className='mx-auto'>
					<span className='mx-auto text-center'>
						{T.welcome} <strong>{T.brand}</strong>
					</span>
				</Ribbon>
			</div>

			<Intro>{T.fill}</Intro>

			{/* Form */}
			<FormWrap onSubmit={submit}>
				{[
					["name", T.fullName],
					["email", T.email],
					["phone", T.phone],
					["hotelName", T.hotelName],
				].map(([k, lbl]) => (
					<Field key={k} isRTL={isRTL}>
						<label>{lbl}</label>
						<input value={form[k]} onChange={handle(k)} />
					</Field>
				))}

				{/* country */}
				<Field isRTL={isRTL}>
					<label>{T.country}</label>
					<select value={form.hotelCountry} onChange={handle("hotelCountry")}>
						<option value='KSA'>KSA</option>
						<option value='UAE'>UAE</option>
						<option value='Qatar'>Qatar</option>
					</select>
				</Field>

				{/* state: list for KSA else text */}
				<Field isRTL={isRTL}>
					<label>{T.state}</label>
					{form.hotelCountry === "KSA" ? (
						<select value={form.hotelState} onChange={handle("hotelState")}>
							<option value='makkah'>Makkah</option>
							<option value='madinah'>Madinah</option>
						</select>
					) : (
						<input value={form.hotelState} onChange={handle("hotelState")} />
					)}
				</Field>

				{[
					["hotelCity", T.city],
					["hotelAddress", T.address],
				].map(([k, lbl]) => (
					<Field key={k} isRTL={isRTL}>
						<label>{lbl}</label>
						<input value={form[k]} onChange={handle(k)} />
					</Field>
				))}

				{/* property type */}
				<Field isRTL={isRTL}>
					<label>{T.property}</label>
					<select value={form.propertyType} onChange={handle("propertyType")}>
						<option value='Hotel'>Hotel</option>
						<option value='Apartments'>Apartments</option>
						<option value='Houses'>Houses</option>
					</select>
				</Field>

				{[
					["hotelFloors", T.floors],
					["hotelRooms", T.rooms],
					["password", T.password, "password"],
					["password2", T.password2, "password"],
				].map(([k, lbl, type = "text"]) => (
					<Field key={k} isRTL={isRTL}>
						<label>{lbl}</label>
						<input
							type={type}
							value={form[k]}
							onChange={handle(k)}
							autoComplete='new-password'
						/>
					</Field>
				))}

				{/* terms */}
				<Terms isRTL={isRTL}>
					<input
						type='checkbox'
						checked={form.accepted}
						onChange={(e) => setForm({ ...form, accepted: e.target.checked })}
					/>{" "}
					{T.terms}
				</Terms>
				<TermsLink
					href='https://jannatbooking.com/terms-conditions?tab=hotel'
					target='_blank'
				>
					Click here to read our terms and conditions
				</TermsLink>

				{/* submit */}
				<Submit disabled={!form.accepted}>{T.btn}</Submit>
			</FormWrap>

			<Note>{T.note}</Note>

			<Foot isRTL={isRTL}>
				{T.have}{" "}
				<Link to='/' className='cta'>
					{T.login}
				</Link>
			</Foot>
		</Page>
	);
};

export default HotelSignup;

/* ───────── styled components ───────── */

const Page = styled.div`
	min-height: 100vh;
	background: #fff;
	padding-top: 75px;

	input,
	select {
		width: 100%;
		padding: 0.95rem 1rem;
		background: #e7e7e7;
		border: none;
		font-size: 1rem;
	}

	@media (max-width: 992px) {
		input,
		select {
			width: 90%;
			max-width: 600px;
			margin: 0px 20px;
		}
		label {
			margin: 0px 20px;
		}
	}
`;

const HeroBar = styled.div`
	background: #073947;
	color: #fff;
	text-align: center;
	padding: 2rem 1rem; /* more vertical space like screenshot */
	h1 {
		margin: 0;
		font-size: 2.2rem;
		font-weight: 700;
	}
`;

const Ribbon = styled.div`
	background: #e5e5e5;
	display: flex;
	align-items: center;
	gap: 0.6rem;
	padding: 0.9rem 1rem;
	margin: auto;
	text-align: center;
	img {
		height: 28px;
	}
	span {
		font-weight: 700;
		font-size: 1.3rem;
	}
`;

const Intro = styled.p`
	text-align: center;
	font-weight: 700;
	margin: 1.7rem 0 2.2rem;
`;

const FormWrap = styled.form`
	max-width: 700px;
	margin: 0 auto;
`;

const Field = styled.div`
	display: flex;
	flex-direction: column;
	margin-bottom: 1.4rem;

	label {
		font-weight: 700;
		margin-bottom: 0.45rem;
		text-align: ${(p) => (p.isRTL ? "right" : "left")};
	}
`;

const Terms = styled.label`
	display: flex;
	align-items: center;
	gap: 0.6rem;
	font-weight: 700;
	margin: 1.5rem 0 2.5rem;
	text-align: ${(p) => (p.isRTL ? "right" : "left")};

	input {
		width: auto;
	}

	@media (max-width: 992px) {
		font-size: 0.75rem !important;
	}
`;

const TermsLink = styled.a`
	color: var(--primary-color);
	text-decoration: underline;
	margin-top: 10px;
	cursor: pointer;
	&:hover {
		color: var(--primary-color-dark);
	}
	@media (max-width: 992px) {
		font-size: 0.75rem !important;
		margin: 2rem !important;
	}
`;

const Submit = styled.button`
	display: block;
	width: 260px;
	max-width: 100%;
	margin: 0 auto;
	background: #d3a52e;
	color: #fff;
	font-weight: 700;
	border: none;
	padding: 0.9rem;
	cursor: pointer;
	transition: opacity 0.25s;
	&:hover:enabled {
		opacity: 0.9;
	}
	&:disabled {
		opacity: 0.5;
		cursor: default;
	}

	@media (max-width: 992px) {
		margin-top: 10px;
	}
`;

const Note = styled.p`
	max-width: 700px;
	margin: 2rem auto 3.5rem;
	text-align: center;
	font-weight: 700;
	line-height: 1.5;
`;

const Foot = styled.p`
	text-align: ${(p) => (p.isRTL ? "right" : "left")};
	padding: 0 1rem 3rem;
	.cta {
		color: #0a8fab;
		font-weight: 700;
		text-decoration: underline;
	}
`;
