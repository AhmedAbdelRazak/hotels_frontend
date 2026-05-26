import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { readUserId } from "../apiAdmin";
import CustomerServiceDetails from "./CustomerServiceDetails";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { NotificationProvider } from "./NotificationContext";
import { isConfiguredSuperAdminUser } from "../utils/superUsers";

const CUSTOMER_SERVICE_TEXT = {
	en: {
		passwordTitle: "Enter Password",
		passwordPlaceholder: "Enter password",
		verify: "Verify Password",
		passwordVerified: "Password verified successfully",
		incorrectPassword: "Incorrect password. Please try again.",
	},
	ar: {
		passwordTitle: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		passwordPlaceholder: "\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
		verify: "\u062a\u062d\u0642\u0642",
		passwordVerified:
			"\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.",
		incorrectPassword:
			"\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629.",
	},
};

const CustomerServiceMain = ({ chosenLanguage }) => {
	const isArabic = chosenLanguage === "Arabic";
	const L = CUSTOMER_SERVICE_TEXT[isArabic ? "ar" : "en"];
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [getUser, setGetUser] = useState("");

	const { user, token } = isAuthenticated() || {};
	const authUserId = user?._id || "";
	const authIsConfiguredSuperAdmin = isConfiguredSuperAdminUser(authUserId);
	const history = useHistory();

	// Fetch user details
	const gettingUserId = useCallback(() => {
		if (!authUserId || !token) return;
		readUserId(authUserId, token).then((data) => {
			if (data && data.error) {
				console.error(data.error);
			} else {
				setGetUser(data);
			}
		});
	}, [authUserId, token]);

	const accessTo = useMemo(
		() => (Array.isArray(getUser?.accessTo) ? getUser.accessTo : []),
		[getUser]
	);
	const isSuperAdmin =
		authIsConfiguredSuperAdmin ||
		isConfiguredSuperAdminUser(getUser?._id);

	// Validate user and handle access control
	useEffect(() => {
		if (getUser) {
			// Check if activeUser is false
			if (!getUser.activeUser) {
				history.push("/");
				return;
			}

			// Check if the user has access to CustomerService or is a Super Admin
			if (accessTo.includes("CustomerService") || isSuperAdmin) {
				setIsPasswordVerified(true);
				setIsModalVisible(false); // Ensure modal does not show
				return;
			}

			// Redirect based on the first valid access in accessTo
			if (accessTo.includes("JannatTools")) {
				history.push("/admin/jannatbooking-tools?tab=calculator");
			} else if (accessTo.includes("HotelsReservations")) {
				history.push("/admin/all-reservations");
			} else if (accessTo.includes("Integrator")) {
				history.push("/admin/el-integrator");
			} else if (accessTo.includes("JannatBookingWebsite")) {
				history.push("/admin/janat-website");
			} else if (accessTo.includes("AdminDashboard")) {
				history.push("/admin/dashboard");
			} else {
				history.push("/"); // Redirect to home if no valid access
			}
		}
	}, [accessTo, getUser, history, isSuperAdmin]);

	// Initial setup
	useEffect(() => {
		gettingUserId();

		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		if (authIsConfiguredSuperAdmin) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		}
	}, [gettingUserId, authIsConfiguredSuperAdmin]);

	useEffect(() => {
		if (authIsConfiguredSuperAdmin || isSuperAdmin) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			return;
		}

		if (!getUser) return;

		const customerServiceVerified = localStorage.getItem(
			"CustomerServiceVerified"
		);
		if (customerServiceVerified) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		} else {
			setIsModalVisible(true);
		}
	}, [authIsConfiguredSuperAdmin, getUser, isSuperAdmin]);

	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_CUSTOMER_SERVICE) {
			setIsPasswordVerified(true);
			message.success(L.passwordVerified);
			localStorage.setItem("CustomerServiceVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error(L.incorrectPassword);
		}
	};

	return (
		<NotificationProvider>
			<CustomerServiceMainWrapper
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
							{chosenLanguage === "Arabic" ? (
								<AdminNavbarArabic
									fromPage='CustomerService'
									AdminMenuStatus={AdminMenuStatus}
									setAdminMenuStatus={setAdminMenuStatus}
									collapsed={collapsed}
									setCollapsed={setCollapsed}
									chosenLanguage={chosenLanguage}
								/>
							) : (
								<AdminNavbar
									fromPage='CustomerService'
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
								<CustomerServiceDetails
									getUser={getUser}
									isSuperAdmin={isSuperAdmin}
									chosenLanguage={chosenLanguage}
								/>
							</div>
						</div>
					</div>
				)}
			</CustomerServiceMainWrapper>
		</NotificationProvider>
	);
};

export default CustomerServiceMain;

const CustomerServiceMainWrapper = styled.div`
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
		min-width: 0;
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
		background: rgba(255, 255, 255, 0.97);
		margin: 14px 10px;
		box-shadow: 0 14px 34px rgba(13, 49, 88, 0.11);
		box-sizing: border-box;
		overflow: hidden;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "content";
		}

		.navcontent {
			position: relative;
			z-index: 2;
		}

		.container-wrapper {
			max-width: calc(100% - 12px);
			margin: 10px 6px;
			padding: 12px;
		}
	}
`;
