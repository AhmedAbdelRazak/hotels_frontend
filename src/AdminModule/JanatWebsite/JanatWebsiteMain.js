import React, { useEffect, useState, useCallback } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
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
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import ZHomePageBanner3 from "./ZHomePageBanner3";
import { isAuthenticated } from "../../auth";
import { SUPER_USER_IDS } from "../utils/superUsers";

const JanatWebsiteMain = ({ chosenLanguage }) => {
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
	const [activeTab, setActiveTab] = useState("home"); // New state for tab selection
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
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [getUser, setGetUser] = useState(null);

	const { user, token } = isAuthenticated() || {};

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

					setDocumentId(data[0]._id);
				}
			}
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
		if (!getUser) return;

		const accessTo = getUser.accessTo || [];
		const hasAccess =
			SUPER_USER_IDS.includes(getUser?._id) ||
			accessTo.includes("JannatBookingWebsite") ||
			accessTo.includes("all") ||
			accessTo.length === 0;

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
			message.success("Password verified successfully");
			localStorage.setItem("JannatBookingWebsiteVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error("Incorrect password. Please try again.");
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
		};

		JanatWebsite(documentId, myDocument).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error creating a document");
			} else {
				toast.success("Janat Website Was Successfully Updated!");
			}
		});
	};

	return (
		<JanatWebsiteMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<Modal
				title='Enter Password'
				visible={isModalVisible}
				footer={null}
				closable={false}
			>
				<Input.Password
					placeholder='Enter password'
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
					Verify Password
				</Button>
			</Modal>
			{isPasswordVerified && (
				<div className='grid-container-main'>
					<div className='navcontent'>
						<AdminNavbar
							fromPage='JanatWebsite'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					</div>

					<div className='otherContentWrapper'>
						<div className='container-wrapper'>
							<h3 className='mb-3'>Janat Booking Website Edit</h3>

							{/* Tab Navigation */}
							<TabNavigation>
								<button
									className={activeTab === "home" ? "active" : ""}
									onClick={() => setActiveTab("home")}
								>
									Home Page
								</button>
								<button
									className={activeTab === "about" ? "active" : ""}
									onClick={() => setActiveTab("about")}
								>
									About Us
								</button>
								<button
									className={activeTab === "contact" ? "active" : ""}
									onClick={() => setActiveTab("contact")}
								>
									Contact Us
								</button>

								<button
									className={activeTab === "termsandconditions" ? "active" : ""}
									onClick={() => setActiveTab("termsandconditions")}
								>
									Terms & Condition For Guests
								</button>

								<button
									className={
										activeTab === "termsandconditions_B2B" ? "active" : ""
									}
									onClick={() => setActiveTab("termsandconditions_B2B")}
								>
									Terms & Condition For Hotels
								</button>

								<button
									className={activeTab === "privacyPolicy" ? "active" : ""}
									onClick={() => setActiveTab("privacyPolicy")}
								>
									Privacy Policy
								</button>
							</TabNavigation>

							{/* Conditional Rendering Based on Active Tab */}
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
										termsAndConditionEnglish_B2B={termsAndConditionEnglish_B2B}
										termsAndConditionArabic_B2B={termsAndConditionArabic_B2B}
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

							<div className='' style={{ marginTop: "80px" }}>
								<button className='btn btn-primary' onClick={submitDocument}>
									Submit...
								</button>
							</div>
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
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 20px 10px;
	}

	h3 {
		font-weight: bold;
		font-size: 1.5rem;
		text-align: center;
		color: #006ad1;
	}

	@media (max-width: 1400px) {
		background: white;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "nav" "content";
		}
	}
`;

const TabNavigation = styled.div`
	display: flex;
	gap: 10px;
	margin-bottom: 20px;

	button {
		padding: 10px 20px;
		border: none;
		background-color: #ddd;
		cursor: pointer;
		font-weight: bold;
		border-radius: 5px;

		&.active {
			background-color: #006ad1;
			color: white;
		}

		&:hover {
			background-color: #bbb;
		}
	}
`;
