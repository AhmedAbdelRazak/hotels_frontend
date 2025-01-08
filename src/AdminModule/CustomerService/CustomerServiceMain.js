import React, { useEffect, useState, useCallback } from "react";
import { useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { readUserId } from "../apiAdmin";
import CustomerServiceDetails from "./CustomerServiceDetails";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

const CustomerServiceMain = ({ chosenLanguage }) => {
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

	// Validate user and handle access control
	useEffect(() => {
		if (getUser) {
			// Check if activeUser is false
			if (!getUser.activeUser) {
				history.push("/");
				return;
			}

			const accessTo = getUser.accessTo || [];

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
	}, [getUser, history, isSuperAdmin]);

	// Initial setup
	useEffect(() => {
		gettingUserId();

		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		// If user is a Super Admin, skip modal
		if (isSuperAdmin) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
		} else {
			// Check if password is already verified
			const customerServiceVerified = localStorage.getItem(
				"CustomerServiceVerified"
			);
			if (customerServiceVerified) {
				setIsPasswordVerified(true);
			} else {
				setIsModalVisible(true);
			}
		}
	}, [gettingUserId, isSuperAdmin]);

	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_CUSTOMER_SERVICE) {
			setIsPasswordVerified(true);
			message.success("Password verified successfully");
			localStorage.setItem("CustomerServiceVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error("Incorrect password. Please try again.");
		}
	};

	return (
		<CustomerServiceMainWrapper
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
							/>
						</div>
					</div>
				</div>
			)}
		</CustomerServiceMainWrapper>
	);
};

export default CustomerServiceMain;

const CustomerServiceMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 20px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 75%" : "17% 83%")};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}

	@media (max-width: 768px) {
		.grid-container-main {
			grid-template-columns: 1fr;
		}
	}
`;
