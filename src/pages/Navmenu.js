/** @format */
/* Navmenu.jsx */

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { MenuOutlined, CloseOutlined, GlobalOutlined } from "@ant-design/icons";
import { useCartContext } from "../cart_context";
import XHotelLogo from "../GeneralImages/XHotelLogo.png";

/* ─────────────────────────────── TEXT LABELS ────────────────────────────── */
const navItems = {
	en: [
		{ to: "/", label: "Home" },
		{ to: "/why-x-hotel", label: "Why X‑Hotel?" },
		{ to: "/pms", label: "Hotel Management System" },
		{ to: "/contact", label: "Contact Us" },
	],
	ar: [
		{ to: "/", label: "الرئيسية" },
		{ to: "/why-x-hotel", label: "لماذا إكس أوتيل؟" },
		{ to: "/pms", label: "نظام إدارة الفنادق" },
		{ to: "/contact", label: "تواصل معنا" },
	],
};

const Navmenu = () => {
	/* ───── context & local state ───── */
	const { chosenLanguage, languageToggle } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const langKey = isRTL ? "ar" : "en";
	const [drawerOpen, setDrawerOpen] = useState(false);

	/* ───── body scroll lock ───── */
	useEffect(() => {
		document.body.style.overflow = drawerOpen ? "hidden" : "auto";
	}, [drawerOpen]);

	/* ───── close helpers ───── */
	const closeDrawer = useCallback(() => setDrawerOpen(false), []);
	const toggleDrawer = () => setDrawerOpen((v) => !v);
	const switchLanguage = () =>
		languageToggle(chosenLanguage === "English" ? "Arabic" : "English");

	/* Escape key closes the drawer */
	useEffect(() => {
		const onEsc = (e) => e.key === "Escape" && closeDrawer();
		window.addEventListener("keyup", onEsc);
		return () => window.removeEventListener("keyup", onEsc);
	}, [closeDrawer]);

	return (
		<>
			{/* ───────────────────── Header ───────────────────── */}
			<Header>
				<Inner>
					{/* Logo always left */}
					<Logo to='/' onClick={closeDrawer}>
						<img src={XHotelLogo} alt='X Hotel' />
					</Logo>

					{/* Centre links on ≥ 992 px */}
					<CenterLinks isRTL={isRTL}>
						{navItems[langKey].map(({ to, label }) => (
							<li key={to}>
								<Link to={to}>{label}</Link>
							</li>
						))}
					</CenterLinks>

					{/* Burger + Lang, always right */}
					<RightSide>
						<LangBtn onClick={switchLanguage}>
							<GlobalOutlined />
							<span>{chosenLanguage === "English" ? "عربي" : "En"}</span>
						</LangBtn>

						<Burger onClick={toggleDrawer}>
							{drawerOpen ? <CloseOutlined /> : <MenuOutlined />}
						</Burger>
					</RightSide>
				</Inner>
			</Header>

			{/* ───────────────────── Overlay & Drawer ───────────────────── */}
			<Overlay open={drawerOpen} onClick={closeDrawer} />

			<Drawer
				open={drawerOpen}
				from={isRTL ? "right" : "right"}
				aria-hidden={!drawerOpen}
			>
				{/* Close X inside panel (top‑left of the panel itself) */}
				<CloseIcon onClick={closeDrawer}>
					<CloseOutlined />
				</CloseIcon>

				<nav>
					<ul dir={isRTL ? "rtl" : "ltr"}>
						{navItems[langKey].map(({ to, label }) => (
							<li
								key={to}
								onClick={closeDrawer}
								style={{ textAlign: isRTL ? "right" : "left" }}
							>
								<Link to={to}>{label}</Link>
							</li>
						))}
						<li className='lang' onClick={switchLanguage}>
							<GlobalOutlined />
							<span>{chosenLanguage === "English" ? "عربي" : "En"}</span>
						</li>
					</ul>
				</nav>
			</Drawer>
		</>
	);
};

export default Navmenu;

/* ══════════════════════════  STYLES  ═══════════════════════════ */

const glassBrown = css`
	background: rgba(128, 66, 14, 0.85);
	backdrop-filter: blur(8px);
`;

const Header = styled.header`
	${glassBrown};
	position: fixed;
	inset: 0 0 auto 0;
	height: 90px;
	z-index: 2100; /* below overlay (2200) & drawer (2300) */
	font-family: "Helvetica, sans-serif";
`;

const Inner = styled.div`
	max-width: 1480px;
	height: 100%;
	margin: 0 auto;
	padding: 0 1.5rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
`;

const Logo = styled(Link)`
	display: flex;
	align-items: center;
	img {
		height: 100px;
		width: auto;
	}
`;

const CenterLinks = styled.ul`
	list-style: none;
	display: flex;
	gap: 3rem;
	margin: 0;
	padding: 0;
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	direction: ${(p) => (p.isRTL ? "rtl" : "ltr")};

	li a {
		color: #fff;
		font-weight: 700;
		font-size: 1.4rem;
		text-decoration: none;
		transition: opacity 0.25s;
		&:hover {
			opacity: 0.75;
		}
	}

	@media (max-width: 992px) {
		display: none;
	}
`;

const RightSide = styled.div`
	display: flex;
	align-items: center;
	gap: 1rem;
`;

const LangBtn = styled.button`
	display: flex;
	align-items: center;
	gap: 0.3rem;
	border: none;
	background: transparent;
	color: #fff;
	font-weight: 700;
	font-size: 1rem;
	cursor: pointer;
`;

const Burger = styled.button`
	background: transparent;
	border: none;
	color: #fff;
	font-size: 1.6rem;
	cursor: pointer;
	@media (min-width: 993px) {
		display: none;
	}
`;

/* ───────────────── Overlay (darkens full viewport) ───────────────── */
const Overlay = styled.div`
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.45);
	opacity: ${({ open }) => (open ? 1 : 0)};
	pointer-events: ${({ open }) => (open ? "auto" : "none")};
	transition: opacity 0.35s ease;
	z-index: 2200;
`;

/* ───────────────── Drawer ───────────────── */
const Drawer = styled.aside`
	${glassBrown};
	position: fixed;
	${({ from }) => (from === "right" ? "right: 0;" : "left: 0;")}
	top: 0;
	width: 75%;
	max-width: 340px;
	height: 100vh;
	padding: 4.5rem 2rem 2rem;
	transform: translateX(
		${({ open, from }) => (open ? "0" : from === "right" ? "100%" : "-100%")}
	);
	transition: transform 0.35s ease;
	z-index: 2300;
	overflow-y: auto;

	nav ul {
		list-style: none;
		margin: 2.5rem 0 0; /* leave space under close icon */
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
		text-align: ${({ from }) => (from === "right" ? "left" : "right")};
		align-items: ${({ from }) =>
			from === "right" ? "flex-start" : "flex-end"};
	}

	nav li a,
	nav li.lang {
		color: #ffffff;
		font-size: 1.15rem;
		font-weight: 700;
		text-decoration: none;
	}

	nav li.lang {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
	}

	@media (min-width: 993px) {
		display: none;
	}
`;

/* Close “X” inside drawer (always top‑left relative to panel) */
const CloseIcon = styled.button`
	position: absolute;
	top: 1.2rem;
	left: 1.5rem;
	border: none;
	background: transparent;
	color: #fff;
	font-size: 1.5rem;
	cursor: pointer;
`;
