import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import ReservationCalculator from "./ReservationCalculator";
import OrderTaker from "./OrderTaker";

const JannatBookingToolsMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [activeTab, setActiveTab] = useState("calculator"); // Active tab state

	// Check password verification on mount
	useEffect(() => {
		const toolsPasswordVerified = localStorage.getItem("ToolsVerified");

		if (toolsPasswordVerified) {
			setIsPasswordVerified(true); // Skip modal if already verified
		} else {
			setIsModalVisible(true); // Show modal if not verified
		}
	}, []);

	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_TOOLS) {
			setIsPasswordVerified(true);
			message.success("Password verified successfully");
			localStorage.setItem("ToolsVerified", "true"); // Save verification status
			setIsModalVisible(false); // Close modal
		} else {
			message.error("Incorrect password. Please try again.");
		}
	};

	return (
		<JannatBookingToolsMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			{/* Password Verification Modal */}
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

			{/* Render Content if Password is Verified */}
			{isPasswordVerified && (
				<div className='grid-container-main'>
					<div className='navcontent'>
						{chosenLanguage === "Arabic" ? (
							<AdminNavbarArabic
								fromPage='Tools'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						) : (
							<AdminNavbar
								fromPage='Tools'
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
							{/* Tab Navigation */}
							<TabNavigation>
								<button
									className={activeTab === "calculator" ? "active" : ""}
									onClick={() => setActiveTab("calculator")}
								>
									Reservation Calculator
								</button>
								<button
									className={activeTab === "reservations" ? "active" : ""}
									onClick={() => setActiveTab("reservations")}
								>
									Reservations Tools
								</button>
								<button
									className={activeTab === "other" ? "active" : ""}
									onClick={() => setActiveTab("other")}
								>
									Other Tools
								</button>
							</TabNavigation>

							{/* Tab Content Rendering */}
							{activeTab === "calculator" && (
								<div>
									<h3>Reservation Calculator</h3>
									<ReservationCalculator />
								</div>
							)}
							{activeTab === "reservations" && (
								<div>
									<h3>Reservation Taker</h3>
									<OrderTaker />
								</div>
							)}
							{activeTab === "other" && (
								<div>
									<h3>Other Tools</h3>
									<p>This is the Other Tools content.</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</JannatBookingToolsMainWrapper>
	);
};

export default JannatBookingToolsMain;

const JannatBookingToolsMainWrapper = styled.div`
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
