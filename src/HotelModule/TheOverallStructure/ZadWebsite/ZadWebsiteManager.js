import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Alert, Button, Input, Tabs, message } from "antd";
import {
	ContactsOutlined,
	HomeOutlined,
	InfoCircleOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import ZLogoAdd from "../../../AdminModule/JanatWebsite/ZLogoAdd";
import ZHomePageBanners from "../../../AdminModule/JanatWebsite/ZHomePageBanners";
import ZHomePageBanner2 from "../../../AdminModule/JanatWebsite/ZHomePageBanner2";
import ZHomePageBanner3 from "../../../AdminModule/JanatWebsite/ZHomePageBanner3";
import ZAboutUsAdd from "../../../AdminModule/JanatWebsite/ZAboutUsAdd";
import ZContactusBannerAdd from "../../../AdminModule/JanatWebsite/ZContactusBannerAdd";
import { getZadWebsiteRecord, saveZadWebsiteRecord } from "../../apiAdmin";

const ZAD_MANAGER_EMAIL = "mrgamal@xhoteltest.com";

const TEXT = {
	en: {
		title: "ZAD Website",
		subtitle:
			"Manage the homepage visuals, about page, and contact details for zadhotels.com.",
		home: "Home",
		about: "About Us",
		contact: "Contact",
		save: "Save Changes",
		saving: "Saving...",
		saved: "ZAD website content was saved.",
		saveError: "Unable to save ZAD website content.",
		notAllowed: "This page is reserved for the ZAD Hotels website manager.",
		contactEmail: "Contact email",
		officialEmail: "Official email",
		phone: "Phone",
		whatsapp: "WhatsApp number",
		siteName: "Website name",
	},
	ar: {
		title: "ZAD Website",
		subtitle:
			"Manage the homepage visuals, about page, and contact details for zadhotels.com.",
		home: "Home",
		about: "About Us",
		contact: "Contact",
		save: "Save Changes",
		saving: "Saving...",
		saved: "ZAD website content was saved.",
		saveError: "Unable to save ZAD website content.",
		notAllowed: "This page is reserved for the ZAD Hotels website manager.",
		contactEmail: "Contact email",
		officialEmail: "Official email",
		phone: "Phone",
		whatsapp: "WhatsApp number",
		siteName: "Website name",
	},
};

const isZadManager = (user = {}) =>
	String(user?.email || "").trim().toLowerCase() === ZAD_MANAGER_EMAIL;

const imageState = (value, fallback = []) => ({
	images: Array.isArray(value) ? value : value?.url ? [value] : fallback,
});

const firstImage = (state) =>
	Array.isArray(state?.images) && state.images.length ? state.images[0] : {};

const ZadWebsiteManager = ({ user, userId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const L = TEXT[isRTL ? "ar" : "en"];
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [documentId, setDocumentId] = useState("");
	const [siteName, setSiteName] = useState("ZAD Hotels");
	const [logo, setLogo] = useState({ images: [] });
	const [homeMainBanners, setHomeMainBanners] = useState({ images: [] });
	const [homeSecondBanner, setHomeSecondBanner] = useState({ images: [] });
	const [homeThirdBanner, setHomeThirdBanner] = useState({ images: [] });
	const [aboutUsBanner, setAboutUsBanner] = useState({ images: [] });
	const [contactUsBanner, setContactUsBanner] = useState({ images: [] });
	const [aboutUsEnglish, setAboutUsEnglish] = useState("");
	const [aboutUsArabic, setAboutUsArabic] = useState("");
	const [contactEmail, setContactEmail] = useState("contact@zadhotels.com");
	const [officialEmail, setOfficialEmail] = useState("official@zadhotels.com");
	const [phone, setPhone] = useState("+966 54 779 3608");
	const [whatsappNumber, setWhatsappNumber] = useState("966547793608");

	const canManage = isZadManager(user);

	const contactFields = useMemo(
		() => [
			{ key: "siteName", label: L.siteName, value: siteName, setter: setSiteName },
			{
				key: "contactEmail",
				label: L.contactEmail,
				value: contactEmail,
				setter: setContactEmail,
			},
			{
				key: "officialEmail",
				label: L.officialEmail,
				value: officialEmail,
				setter: setOfficialEmail,
			},
			{ key: "phone", label: L.phone, value: phone, setter: setPhone },
			{
				key: "whatsappNumber",
				label: L.whatsapp,
				value: whatsappNumber,
				setter: setWhatsappNumber,
			},
		],
		[L, contactEmail, officialEmail, phone, siteName, whatsappNumber]
	);

	useEffect(() => {
		let isMounted = true;
		setLoading(true);
		getZadWebsiteRecord()
			.then((data) => {
				if (!isMounted) return;
				const doc = Array.isArray(data) ? data[data.length - 1] : data;
				if (!doc || doc.error) return;
				setDocumentId(doc._id || "");
				setSiteName(doc.siteName || "ZAD Hotels");
				setLogo(imageState(doc.janatLogo));
				setHomeMainBanners(imageState(doc.homeMainBanners));
				setHomeSecondBanner(imageState(doc.homeSecondBanner));
				setHomeThirdBanner(imageState(doc.homeThirdBanner));
				setAboutUsBanner(imageState(doc.aboutUsBanner));
				setContactUsBanner(imageState(doc.contactUsBanner));
				setAboutUsEnglish(doc.aboutUsEnglish || "");
				setAboutUsArabic(doc.aboutUsArabic || "");
				setContactEmail(doc.contactEmail || "contact@zadhotels.com");
				setOfficialEmail(doc.officialEmail || "official@zadhotels.com");
				setPhone(doc.phone || "+966 54 779 3608");
				setWhatsappNumber(doc.whatsappNumber || "966547793608");
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, []);

	const buildPayload = () => ({
		siteName,
		janatLogo: firstImage(logo),
		homeMainBanners: homeMainBanners?.images || [],
		homeSecondBanner: firstImage(homeSecondBanner),
		homeThirdBanner: firstImage(homeThirdBanner),
		aboutUsBanner: firstImage(aboutUsBanner),
		contactUsBanner: firstImage(contactUsBanner),
		aboutUsEnglish,
		aboutUsArabic,
		contactEmail,
		officialEmail,
		phone,
		whatsappNumber,
	});

	const saveWebsite = async () => {
		if (!userId || saving) return;
		setSaving(true);
		try {
			const response = await saveZadWebsiteRecord(
				documentId || "new",
				userId,
				buildPayload()
			);
			if (response?.error) throw new Error(response.error);
			if (response?.data?._id) setDocumentId(response.data._id);
			message.success(L.saved);
		} catch (error) {
			message.error(error?.message || L.saveError);
		} finally {
			setSaving(false);
		}
	};

	if (!canManage) {
		return (
			<ZadWebsiteWrapper dir={isRTL ? "rtl" : "ltr"}>
				<Alert type='warning' showIcon message={L.notAllowed} />
			</ZadWebsiteWrapper>
		);
	}

	return (
		<ZadWebsiteWrapper dir={isRTL ? "rtl" : "ltr"}>
			<PageHeader>
				<div>
					<h1>{L.title}</h1>
					<p>{L.subtitle}</p>
				</div>
				<Button
					type='primary'
					icon={<SaveOutlined />}
					onClick={saveWebsite}
					loading={saving}
				>
					{saving ? L.saving : L.save}
				</Button>
			</PageHeader>

			<Tabs
				defaultActiveKey='home'
				items={[
					{
						key: "home",
						label: (
							<span>
								<HomeOutlined /> {L.home}
							</span>
						),
						children: (
							<EditorBand $loading={loading}>
								<ZLogoAdd
									addThumbnail={logo}
									setAddThumbnail={setLogo}
									title='ZAD Logo'
								/>
								<ZHomePageBanners
									addThumbnail={homeMainBanners}
									setAddThumbnail={setHomeMainBanners}
									title='ZAD Homepage Carousel'
								/>
								<ZHomePageBanner2
									addThumbnail={homeSecondBanner}
									setAddThumbnail={setHomeSecondBanner}
									title='ZAD Middle Section Image'
								/>
								<ZHomePageBanner3
									addThumbnail={homeThirdBanner}
									setAddThumbnail={setHomeThirdBanner}
									title='ZAD Footer Lead Image'
								/>
							</EditorBand>
						),
					},
					{
						key: "about",
						label: (
							<span>
								<InfoCircleOutlined /> {L.about}
							</span>
						),
						children: (
							<EditorBand $loading={loading}>
								<ZAboutUsAdd
									addThumbnail={aboutUsBanner}
									setAddThumbnail={setAboutUsBanner}
									aboutUsEnglish={aboutUsEnglish}
									setAboutUsEnglish={setAboutUsEnglish}
									aboutUsArabic={aboutUsArabic}
									setAboutUsArabic={setAboutUsArabic}
									title='ZAD About Us Content'
								/>
							</EditorBand>
						),
					},
					{
						key: "contact",
						label: (
							<span>
								<ContactsOutlined /> {L.contact}
							</span>
						),
						children: (
							<EditorBand $loading={loading}>
								<ContactGrid>
									{contactFields.map((field) => (
										<label key={field.key}>
											<span>{field.label}</span>
											<Input
												value={field.value}
												onChange={(event) => field.setter(event.target.value)}
											/>
										</label>
									))}
								</ContactGrid>
								<ZContactusBannerAdd
									addThumbnail={contactUsBanner}
									setAddThumbnail={setContactUsBanner}
									title='ZAD Contact Page Image'
								/>
							</EditorBand>
						),
					},
				]}
			/>

			<StickyActions>
				<Button
					type='primary'
					icon={<SaveOutlined />}
					onClick={saveWebsite}
					loading={saving}
				>
					{saving ? L.saving : L.save}
				</Button>
			</StickyActions>
		</ZadWebsiteWrapper>
	);
};

export default ZadWebsiteManager;

const ZadWebsiteWrapper = styled.div`
	min-height: calc(100vh - 90px);
	padding: 18px;
	background:
		linear-gradient(135deg, rgba(123, 63, 179, 0.08), rgba(10, 143, 130, 0.1)),
		#f7f8fb;

	.ant-tabs-nav {
		margin-bottom: 14px;
	}

	.ant-tabs-tab {
		font-weight: 900;
	}

	@media (max-width: 768px) {
		padding: 10px;
	}
`;

const PageHeader = styled.div`
	display: flex;
	justify-content: space-between;
	gap: 16px;
	align-items: center;
	margin-bottom: 16px;

	h1 {
		margin: 0;
		font-size: 26px;
		font-weight: 950;
		color: #08090d;
	}

	p {
		margin: 5px 0 0;
		color: #475467;
		font-weight: 700;
	}

	.ant-btn-primary {
		background: linear-gradient(135deg, #7b3fb3, #2557c7 48%, #0a8f82);
		border: 0;
		font-weight: 900;
	}

	@media (max-width: 700px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const EditorBand = styled.div`
	opacity: ${(props) => (props.$loading ? 0.58 : 1)};
	pointer-events: ${(props) => (props.$loading ? "none" : "auto")};

	.container {
		max-width: 100% !important;
		border-radius: 8px !important;
		border-color: rgba(37, 87, 199, 0.18) !important;
		box-shadow: 0 14px 30px rgba(20, 30, 65, 0.08);
	}

	h3 {
		color: #174db6 !important;
	}
`;

const ContactGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
	padding: 16px;
	border: 1px solid rgba(37, 87, 199, 0.18);
	border-radius: 8px;
	background: white;
	box-shadow: 0 14px 30px rgba(20, 30, 65, 0.08);

	label {
		display: grid;
		gap: 6px;
		font-weight: 900;
		color: #1d2939;
	}

	span {
		font-size: 13px;
	}

	@media (max-width: 700px) {
		grid-template-columns: 1fr;
		padding: 12px;
	}
`;

const StickyActions = styled.div`
	position: sticky;
	bottom: 12px;
	display: flex;
	justify-content: center;
	padding-top: 18px;
	z-index: 5;

	.ant-btn-primary {
		min-width: 190px;
		background: linear-gradient(135deg, #7b3fb3, #2557c7 48%, #0a8f82);
		border: 0;
		font-weight: 950;
		box-shadow: 0 14px 30px rgba(37, 87, 199, 0.24);
	}
`;
