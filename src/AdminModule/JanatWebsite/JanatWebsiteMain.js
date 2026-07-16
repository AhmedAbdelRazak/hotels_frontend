import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import ZLogoAdd from "./ZLogoAdd";
import ZHomePageBanners from "./ZHomePageBanners";
import ZHomePageBanner2 from "./ZHomePageBanner2";
import ZContactusBannerAdd from "./ZContactusBannerAdd";
import ZAboutUsAdd from "./ZAboutUsAdd";
// eslint-disable-next-line
import ZHotelsMainBanner from "./ZHotelsMainBanner";
import { JanatWebsite, getJanatWebsiteRecord, readUserId } from "../apiAdmin";
import { toast } from "react-toastify";
import ZTermsAndConditions from "./ZTermsAndConditions";
import ZTermsAndConditionsB2B from "./ZTermsAndConditionsB2B";
import ZPrivacyPolicy from "./ZPrivacyPolicy";
import HotelRatingsModeration from "./HotelRatingsModeration";
import { Modal, Input, Button, message, Switch } from "antd";
import {
	ContactsOutlined,
	CustomerServiceOutlined,
	FileProtectOutlined,
	HomeOutlined,
	InfoCircleOutlined,
	LockOutlined,
	SaveOutlined,
	SafetyCertificateOutlined,
	StarOutlined,
	EyeInvisibleOutlined,
	EyeTwoTone,
} from "@ant-design/icons";
import ZHomePageBanner3 from "./ZHomePageBanner3";
import { isAuthenticated } from "../../auth";
import { isConfiguredSuperAdminUser } from "../utils/superUsers";

const TEXT = {
	en: {
		title: "Jannat Booking Website",
		passwordTitle: "Enter Password",
		passwordPlaceholder: "Enter password",
		verify: "Verify Password",
		save: "Save Changes",
		saved: "Jannat Booking website was updated successfully.",
		incorrectPassword: "Incorrect password. Please try again.",
		passwordVerified: "Password verified successfully",
		home: "Home Page",
		about: "About Us",
		contact: "Contact Us",
		guestTerms: "Guest Terms",
		hotelTerms: "Hotel Terms",
		privacy: "Privacy Policy",
		aiChat: "AI Chat",
		hotelRatings: "Hotel Ratings",
		aiChatTitle: "Jannat Booking AI Chat",
		aiChatEnabled: "AI responder is enabled for B2C website chats.",
		aiChatDisabled: "AI responder is stopped for B2C website chats.",
		aiChatSwitch: "Allow AI to respond to client chats",
		aiChatSaved: "AI chat setting was updated.",
		aiChatSaveFailed: "Unable to update AI chat setting.",
	},
	ar: {
		title: "\u0645\u0648\u0642\u0639 \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c",
		passwordTitle: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		passwordPlaceholder: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		verify: "\u062a\u062d\u0642\u0642",
		save: "\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a",
		saved:
			"\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0645\u0648\u0642\u0639 \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c \u0628\u0646\u062c\u0627\u062d.",
		incorrectPassword:
			"\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629.",
		passwordVerified:
			"\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.",
		home: "\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
		about: "\u0645\u0646 \u0646\u062d\u0646",
		contact: "\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627",
		guestTerms: "\u0634\u0631\u0648\u0637 \u0627\u0644\u0636\u064a\u0648\u0641",
		hotelTerms: "\u0634\u0631\u0648\u0637 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		privacy: "\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629",
		aiChat: "\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621",
		hotelRatings: "\u062a\u0642\u064a\u064a\u0645\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
		aiChatTitle:
			"\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621 \u0644\u062c\u0646\u0629 \u0628\u0648\u0643\u064a\u0646\u062c",
		aiChatEnabled:
			"\u0631\u062f\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0645\u0641\u0639\u0644\u0629 \u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0648\u0642\u0639.",
		aiChatDisabled:
			"\u062a\u0645 \u0625\u064a\u0642\u0627\u0641 \u0631\u062f\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0648\u0642\u0639.",
		aiChatSwitch:
			"\u0627\u0644\u0633\u0645\u0627\u062d \u0644\u0644\u0630\u0643\u0627\u0621 \u0628\u0627\u0644\u0631\u062f \u0639\u0644\u0649 \u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
		aiChatSaved:
			"\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0625\u0639\u062f\u0627\u062f \u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621.",
		aiChatSaveFailed:
			"\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u0625\u0639\u062f\u0627\u062f \u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621.",
	},
};

const TAB_DEFS = [
	{ key: "home", labelKey: "home", icon: <HomeOutlined /> },
	{ key: "about", labelKey: "about", icon: <InfoCircleOutlined /> },
	{ key: "contact", labelKey: "contact", icon: <ContactsOutlined /> },
	{
		key: "termsandconditions",
		labelKey: "guestTerms",
		icon: <FileProtectOutlined />,
	},
	{
		key: "termsandconditions_B2B",
		labelKey: "hotelTerms",
		icon: <SafetyCertificateOutlined />,
	},
	{ key: "privacyPolicy", labelKey: "privacy", icon: <LockOutlined /> },
	{ key: "ai-chat", labelKey: "aiChat", icon: <CustomerServiceOutlined /> },
	{
		key: "hotel-rating",
		labelKey: "hotelRatings",
		icon: <StarOutlined />,
	},
];

const JanatWebsiteMain = ({ chosenLanguage }) => {
	const history = useHistory();
	const location = useLocation();
	const isArabic = chosenLanguage === "Arabic";
	const L = TEXT[isArabic ? "ar" : "en"];
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [logo, setLogo] = useState([]);
	const [homeMainBanners, setHomeMainBanners] = useState([]);
	const [homeSecondBanner, setHomeSecondBanner] = useState([]);
	const [homeThirdBanner, setHomeThirdBanner] = useState([]);
	const [contactUsBanner, setContactUsBanner] = useState([]);
	const [aboutUsBanner, setAboutUsBanner] = useState([]);
	const [hotelPageBanner, setHotelPageBanner] = useState([]);
	const [documentId, setDocumentId] = useState(undefined);
	const [activeTab, setActiveTab] = useState(() => {
		const requestedTab = new URLSearchParams(location.search).get("tab");
		return TAB_DEFS.some((tab) => tab.key === requestedTab)
			? requestedTab
			: "home";
	});
	const [aboutUsEnglish, setAboutUsEnglish] = useState("");
	const [aboutUsArabic, setAboutUsArabic] = useState("");
	const [privacyPolicy, setPrivacyPolicy] = useState("");
	const [privacyPolicyArabic, setPrivacyPolicyArabic] = useState("");
	const [termsAndConditionArabic, setTermsAndConditionArabic] = useState("");
	const [termsAndConditionEnglish, setTermsAndConditionEnglish] = useState("");
	const [termsAndConditionArabic_B2B, setTermsAndConditionArabic_B2B] =
		useState("");
	const [termsAndConditionEnglish_B2B, setTermsAndConditionEnglish_B2B] =
		useState("");
	const [aiToRespond, setAiToRespond] = useState(true);
	const [aiSaving, setAiSaving] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [getUser, setGetUser] = useState(null);

	const { user, token } = isAuthenticated() || {};
	const validTabKeys = useMemo(
		() => new Set(TAB_DEFS.map((tab) => tab.key)),
		[]
	);
	const activeTabLabel =
		L[TAB_DEFS.find((tab) => tab.key === activeTab)?.labelKey] || L.home;

	const loadCurrentUser = useCallback(() => {
		if (!user?._id || !token) return;
		readUserId(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error);
			} else {
				setGetUser(data);
			}
		});
	}, [user?._id, token]);

	const gettingJanatWebsiteRecord = () => {
		getJanatWebsiteRecord().then((data) => {
			if (data && data.error) {
				console.log(data.error, "data.error");
			} else {
				if (data && data[0]) {
					setLogo({ images: data[0].janatLogo ? [data[0].janatLogo] : [] });
					setHomeMainBanners({
						images: data[0].homeMainBanners || [],
					});
					setHomeSecondBanner({
						images: data[0].homeSecondBanner ? [data[0].homeSecondBanner] : [],
					});
					setHomeThirdBanner({
						images: data[0].homeThirdBanner ? [data[0].homeThirdBanner] : [],
					});
					setContactUsBanner({
						images: data[0].contactUsBanner ? [data[0].contactUsBanner] : [],
					});
					setAboutUsBanner({
						images: data[0].aboutUsBanner ? [data[0].aboutUsBanner] : [],
					});
					setHotelPageBanner({
						images: data[0].hotelPageBanner ? [data[0].hotelPageBanner] : [],
					});

					// Initialize the 'About Us' and 'Terms and Conditions' fields
					setAboutUsEnglish(data[0].aboutUsEnglish || "");
					setAboutUsArabic(data[0].aboutUsArabic || "");
					setTermsAndConditionEnglish(data[0].termsAndConditionEnglish || "");
					setTermsAndConditionArabic(data[0].termsAndConditionArabic || "");
					setPrivacyPolicy(data[0].privacyPolicy || "");
					setPrivacyPolicyArabic(data[0].privacyPolicyArabic || "");
					setTermsAndConditionEnglish_B2B(
						data[0].termsAndConditionEnglish_B2B || ""
					);
					setTermsAndConditionArabic_B2B(
						data[0].termsAndConditionArabic_B2B || ""
					);
					setAiToRespond(data[0].aiToRespond !== false);

					setDocumentId(data[0]._id);
				}
			}
		});
	};

	const handleTabChange = (tabKey) => {
		if (!validTabKeys.has(tabKey)) return;
		setActiveTab(tabKey);
		const params = new URLSearchParams(location.search);
		params.set("tab", tabKey);
		const nextSearch = `?${params.toString()}`;
		if (nextSearch === location.search) return;
		history.push({
			pathname: location.pathname,
			search: nextSearch,
		});
	};

	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
		loadCurrentUser();
		gettingJanatWebsiteRecord();
		// eslint-disable-next-line
	}, [loadCurrentUser]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const tabParam = params.get("tab");
		const nextTab = validTabKeys.has(tabParam) ? tabParam : "home";

		if (activeTab !== nextTab) {
			setActiveTab(nextTab);
		}

		if (tabParam !== nextTab) {
			params.set("tab", nextTab);
			history.replace({
				pathname: location.pathname,
				search: `?${params.toString()}`,
			});
		}
	}, [
		activeTab,
		history,
		location.pathname,
		location.search,
		validTabKeys,
	]);

	useEffect(() => {
		if (!getUser) return;

		const accessTo = getUser.accessTo || [];
		const hasAccess =
			isConfiguredSuperAdminUser(getUser?._id) ||
			accessTo.includes("JannatBookingWebsite");

		// Check if password is already verified
		const websitePasswordVerified = localStorage.getItem(
			"JannatBookingWebsiteVerified"
		);

		if (websitePasswordVerified || hasAccess) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		} else {
			setIsModalVisible(true);
		}
	}, [getUser]);

	const handlePasswordVerification = () => {
		if (password === "JannatBookingWebsite2025") {
			setIsPasswordVerified(true);
			message.success(L.passwordVerified);
			localStorage.setItem("JannatBookingWebsiteVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error(L.incorrectPassword);
		}
	};

	const submitDocument = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });

		const myDocument = {
			janatLogo: logo && logo.images[0] && logo.images[0],
			homeMainBanners: homeMainBanners && homeMainBanners.images,
			homeSecondBanner:
				homeSecondBanner &&
				homeSecondBanner.images &&
				homeSecondBanner.images[0],
			homeThirdBanner:
				homeThirdBanner && homeThirdBanner.images && homeThirdBanner.images[0],
			contactUsBanner:
				contactUsBanner && contactUsBanner.images && contactUsBanner.images[0],
			aboutUsBanner:
				aboutUsBanner && aboutUsBanner.images && aboutUsBanner.images[0],
			hotelPageBanner:
				hotelPageBanner && hotelPageBanner.images && hotelPageBanner.images[0],
			aboutUsEnglish: aboutUsEnglish, // Include this field
			aboutUsArabic: aboutUsArabic, // Include this field
			termsAndConditionArabic: termsAndConditionArabic,
			termsAndConditionEnglish: termsAndConditionEnglish,
			termsAndConditionArabic_B2B: termsAndConditionArabic_B2B,
			termsAndConditionEnglish_B2B: termsAndConditionEnglish_B2B,
			privacyPolicy: privacyPolicy,
			privacyPolicyArabic: privacyPolicyArabic,
			aiToRespond: aiToRespond,
		};

		JanatWebsite(documentId, myDocument).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error creating a document");
			} else {
				toast.success(L.saved);
			}
		});
	};

	const handleAiSwitchChange = async (checked) => {
		setAiToRespond(checked);
		if (!documentId) return;

		setAiSaving(true);
		try {
			const response = await JanatWebsite(documentId, {
				aiToRespond: checked,
			});
			if (response?.error) throw new Error(response.error);
			message.success(L.aiChatSaved);
		} catch (error) {
			setAiToRespond(!checked);
			message.error(error?.message || L.aiChatSaveFailed);
		} finally {
			setAiSaving(false);
		}
	};

	return (
		<JanatWebsiteMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<Modal
				title={L.passwordTitle}
				open={isModalVisible}
				footer={null}
				closable={false}
			>
				<Input.Password
					placeholder={L.passwordPlaceholder}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					iconRender={(visible) =>
						visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
					}
				/>
				<Button
					type='primary'
					style={{ marginTop: "10px", width: "100%" }}
					onClick={handlePasswordVerification}
				>
					{L.verify}
				</Button>
			</Modal>
			{isPasswordVerified && (
				<div className='grid-container-main'>
					<div className='navcontent'>
						{isArabic ? (
							<AdminNavbarArabic
								fromPage='WebsiteManagement'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						) : (
							<AdminNavbar
								fromPage='JanatWebsite'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						)}
					</div>

					<div className='otherContentWrapper'>
						<div className='container-wrapper'>
							<PageHeader>
								<h1>{L.title}</h1>
								<ActivePill>{activeTabLabel}</ActivePill>
							</PageHeader>

							{/* Tab Navigation */}
							<TabNavigation role='tablist' aria-label={L.title}>
								{TAB_DEFS.map((tab) => (
									<button
										type='button'
										key={tab.key}
										role='tab'
										aria-selected={activeTab === tab.key}
										className={activeTab === tab.key ? "active" : ""}
										onClick={() => handleTabChange(tab.key)}
									>
										{tab.icon}
										<span>{L[tab.labelKey]}</span>
									</button>
								))}
							</TabNavigation>

							{/* Conditional Rendering Based on Active Tab */}
							<TabPanel>
								{activeTab === "home" && (
									<>
										<div>
											<ZLogoAdd addThumbnail={logo} setAddThumbnail={setLogo} />
										</div>
										<div>
											<ZHomePageBanners
												addThumbnail={homeMainBanners}
												setAddThumbnail={setHomeMainBanners}
											/>
										</div>
										<div>
											<ZHomePageBanner2
												addThumbnail={homeSecondBanner}
												setAddThumbnail={setHomeSecondBanner}
											/>
										</div>
										<div>
											<ZHomePageBanner3
												addThumbnail={homeThirdBanner}
												setAddThumbnail={setHomeThirdBanner}
											/>
										</div>
										{/* <div>
										<ZHotelsMainBanner
											addThumbnail={hotelPageBanner}
											setAddThumbnail={setHotelPageBanner}
										/>
									</div> */}
									</>
								)}

								{activeTab === "about" && (
									<div>
										<ZAboutUsAdd
											addThumbnail={aboutUsBanner}
											setAddThumbnail={setAboutUsBanner}
											aboutUsArabic={aboutUsArabic}
											setAboutUsArabic={setAboutUsArabic}
											aboutUsEnglish={aboutUsEnglish}
											setAboutUsEnglish={setAboutUsEnglish}
										/>
									</div>
								)}

								{activeTab === "contact" && (
									<div>
										<ZContactusBannerAdd
											addThumbnail={contactUsBanner}
											setAddThumbnail={setContactUsBanner}
										/>
									</div>
								)}

								{activeTab === "termsandconditions" && (
									<div>
										<ZTermsAndConditions
											termsAndConditionEnglish={termsAndConditionEnglish}
											termsAndConditionArabic={termsAndConditionArabic}
											setTermsAndConditionEnglish={setTermsAndConditionEnglish}
											setTermsAndConditionArabic={setTermsAndConditionArabic}
										/>
									</div>
								)}

								{activeTab === "termsandconditions_B2B" && (
									<div>
										<ZTermsAndConditionsB2B
											termsAndConditionEnglish_B2B={
												termsAndConditionEnglish_B2B
											}
											termsAndConditionArabic_B2B={
												termsAndConditionArabic_B2B
											}
											setTermsAndConditionEnglish_B2B={
												setTermsAndConditionEnglish_B2B
											}
											setTermsAndConditionArabic_B2B={
												setTermsAndConditionArabic_B2B
											}
										/>
									</div>
								)}

								{activeTab === "privacyPolicy" && (
									<div>
										<ZPrivacyPolicy
											privacyPolicy={privacyPolicy}
											setPrivacyPolicy={setPrivacyPolicy}
											privacyPolicyArabic={privacyPolicyArabic}
											setPrivacyPolicyArabic={setPrivacyPolicyArabic}
										/>
									</div>
								)}

								{activeTab === "ai-chat" && (
									<AiSettingsPanel>
										<div>
											<h2>{L.aiChatTitle}</h2>
											<p>
												{aiToRespond ? L.aiChatEnabled : L.aiChatDisabled}
											</p>
										</div>
										<AiSwitchRow>
											<span>{L.aiChatSwitch}</span>
											<Switch
												checked={aiToRespond}
												loading={aiSaving}
												onChange={handleAiSwitchChange}
											/>
										</AiSwitchRow>
									</AiSettingsPanel>
								)}

								{activeTab === "hotel-rating" && (
									<HotelRatingsModeration
										chosenLanguage={chosenLanguage}
										userId={getUser?._id || user?._id}
										token={token}
										currentUser={getUser}
									/>
								)}
							</TabPanel>

							{activeTab !== "hotel-rating" && (
								<ActionFooter>
									<Button
										type='primary'
										icon={<SaveOutlined />}
										onClick={submitDocument}
									>
										{L.save}
									</Button>
								</ActionFooter>
							)}
						</div>
					</div>
				</div>
			)}
		</JanatWebsiteMainWrapper>
	);
};

export default JanatWebsiteMain;

const JanatWebsiteMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 0;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		min-width: 0;
		grid-template-columns: ${(props) => {
			const nav = props.show ? "70px" : "285px";
			return props.dir === "rtl" ? `1fr ${nav}` : `${nav} 1fr`;
		}};
		grid-template-areas: ${(props) =>
			props.dir === "rtl" ? "'content nav'" : "'nav content'"};
	}

	.navcontent {
		grid-area: nav;
	}

	.otherContentWrapper {
		grid-area: content;
		min-width: 0;
		overflow: hidden;
	}

	.container-wrapper {
		width: auto;
		max-width: calc(100% - 20px);
		min-width: 0;
		border: 1px solid rgba(139, 190, 227, 0.42);
		padding: 16px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.96);
		margin: 14px 10px;
		box-shadow: 0 14px 34px rgba(13, 49, 88, 0.11);
		overflow: hidden;
		box-sizing: border-box;
	}

	.container-wrapper .container {
		max-width: 100%;
	}

	.container-wrapper h3 {
		color: #0b5484 !important;
		font-weight: 950 !important;
		letter-spacing: 0;
	}

	@media (max-width: 1400px) {
		background: white;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "nav" "content";
		}

		.container-wrapper {
			max-width: calc(100% - 12px);
			margin: 10px 6px;
			padding: 12px;
		}
	}
`;

const PageHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 13px 15px;
	margin-bottom: 12px;
	border: 1px solid rgba(139, 190, 227, 0.4);
	border-radius: 8px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(235, 247, 255, 0.92)),
		#f8fbff;

	h1 {
		margin: 0;
		color: #0b3158;
		font-size: clamp(1.12rem, 1.4vw, 1.45rem);
		font-weight: 950;
		line-height: 1.35;
		letter-spacing: 0;
	}

	@media (max-width: 620px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const ActivePill = styled.span`
	min-height: 30px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 5px 12px;
	border: 1px solid rgba(36, 144, 200, 0.36);
	border-radius: 999px;
	background: rgba(36, 144, 200, 0.08);
	color: #0d4773;
	font-size: 0.78rem;
	font-weight: 950;
	white-space: nowrap;
`;

const TabNavigation = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 16px;
	padding: 6px;
	border: 1px solid rgba(139, 190, 227, 0.36);
	border-radius: 8px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 251, 255, 0.96)),
		#f8fbff;

	button {
		min-height: 44px;
		padding: 9px 14px;
		border: 1px solid rgba(139, 190, 227, 0.46);
		background: #ffffff;
		color: #173a5f;
		cursor: pointer;
		font-weight: 950;
		border-radius: 6px;
		flex: 1 1 175px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		line-height: 1.2;
		box-shadow: 0 8px 18px rgba(13, 49, 88, 0.06);
		transition:
			background 160ms ease,
			border-color 160ms ease,
			color 160ms ease,
			box-shadow 160ms ease,
			transform 160ms ease;

		&.active {
			border-color: rgba(122, 209, 245, 0.95);
			background: var(
				--admin-metal-blue-bg,
				linear-gradient(135deg, #081a2d 0%, #155d95 52%, #071827 100%)
			);
			color: #ffffff;
			box-shadow:
				inset 0 1px rgba(255, 255, 255, 0.22),
				0 10px 22px rgba(8, 42, 75, 0.18);
		}

		&:hover {
			border-color: rgba(36, 144, 200, 0.7);
			transform: translateY(-1px);
		}

		svg {
			font-size: 16px;
			flex: 0 0 auto;
		}

		span {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	@media (max-width: 768px) {
		button {
			flex-basis: 100%;
			font-size: 0.9rem;
		}
	}
`;

const TabPanel = styled.section`
	min-width: 0;
	overflow: hidden;

	> div,
	.container {
		min-width: 0;
	}

	.ql-toolbar,
	.ql-container,
	.card {
		max-width: 100%;
	}
`;

const AiSettingsPanel = styled.section`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
	padding: 18px;
	border: 1px solid rgba(139, 190, 227, 0.42);
	border-radius: 8px;
	background: linear-gradient(180deg, rgba(248, 252, 255, 0.96), #ffffff);

	h2 {
		margin: 0 0 8px;
		color: #0b3158;
		font-size: 1.15rem;
		font-weight: 950;
		letter-spacing: 0;
		line-height: 1.35;
	}

	p {
		margin: 0;
		color: #36546f;
		font-weight: 750;
		line-height: 1.55;
	}

	@media (max-width: 640px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const AiSwitchRow = styled.div`
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	gap: 12px;
	min-width: 210px;
	color: #0b3158;
	font-weight: 950;
	white-space: nowrap;

	@media (max-width: 640px) {
		justify-content: space-between;
		min-width: 0;
		width: 100%;
	}
`;

const ActionFooter = styled.div`
	display: flex;
	justify-content: flex-end;
	margin-top: 24px;
	padding-top: 14px;
	border-top: 1px solid rgba(139, 190, 227, 0.28);

	.ant-btn {
		min-width: 150px;
		min-height: 42px;
		border-radius: 6px;
		font-weight: 950;
	}

	@media (max-width: 575px) {
		.ant-btn {
			width: 100%;
		}
	}
`;
