import React, { useEffect, useState, useCallback } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import MainHotelDashboard from "../AddedHotels/MainHotelDashboard";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { readUserId } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import { useHistory } from "react-router-dom";
import { SUPER_USER_IDS } from "../utils/superUsers";

const AdminDashboard = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [getUser, setGetUser] = useState("");
	const { user, token } = isAuthenticated();
	const history = useHistory();

	// Fetch user details
	const gettingUserId = useCallback(() => {
		readUserId(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error);
			} else {
				setGetUser(data);
			}
		});
	}, [user._id, token]);

	// Determine if the user is a Super Admin
	const isSuperAdmin =
		!getUser.accessTo ||
		getUser.accessTo.length === 0 ||
		getUser.accessTo.includes("all");
	const isSuperUser = SUPER_USER_IDS.includes(getUser?._id);

	// Validate user and handle access control
	useEffect(() => {
		if (getUser) {
			// If the user is not active, redirect to home
			if (!getUser.activeUser) {
				history.push("/");
				return;
			}

			const accessTo = getUser.accessTo || [];

			// Check if the user has access to AdminDashboard
			if (accessTo.includes("AdminDashboard") || isSuperAdmin || isSuperUser) {
				setIsPasswordVerified(true);
				setIsModalVisible(false); // Ensure modal does not show
				return;
			}

			// Redirect based on the first valid access in accessTo
			if (accessTo.includes("JannatTools")) {
				history.push("/admin/jannatbooking-tools?tab=calculator");
			} else if (accessTo.includes("CustomerService")) {
				history.push("/admin/customer-service?tab=active-client-cases");
			} else if (accessTo.includes("Integrator")) {
				history.push("/admin/el-integrator");
			} else if (accessTo.includes("JannatBookingWebsite")) {
				history.push("/admin/janat-website");
			} else {
				history.push("/"); // Redirect to home if no valid access
			}
		}
	}, [getUser, history, isSuperAdmin, isSuperUser]);

	// Initial setup
	useEffect(() => {
		gettingUserId();

		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		// If user is a Super Admin, skip modal
		if (isSuperAdmin || isSuperUser) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		} else {
			// Check if password is already verified
			const dashboardPasswordVerified = localStorage.getItem(
				"AdminDashboardVerified"
			);
			if (dashboardPasswordVerified) {
				setIsPasswordVerified(true);
			} else {
				setIsModalVisible(true);
			}
		}
	}, [gettingUserId, isSuperAdmin, isSuperUser]);

	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_ADMIN_DASHBOARD) {
			setIsPasswordVerified(true);
			message.success("Password verified successfully");
			localStorage.setItem("AdminDashboardVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error("Incorrect password. Please try again.");
		}
	};

	return (
		<AdminDashboardWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			{/* Password Verification Modal */}
			<Modal
				title='Enter Password'
				open={isModalVisible}
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

			{/* Content Rendering */}
			{isPasswordVerified && (
				<div className='grid-container-main'>
					<div className='navcontent'>
						{chosenLanguage === "Arabic" ? (
							<AdminNavbarArabic
								fromPage='AdminDasboard'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						) : (
							<AdminNavbar
								fromPage='AdminDasboard'
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
							<div>
								<MainHotelDashboard />
							</div>
						</div>
					</div>
				</div>
			)}
		</AdminDashboardWrapper>
	);
};

export default AdminDashboard;

const AdminDashboardWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 20px;
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
		margin: 0px 10px;
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
