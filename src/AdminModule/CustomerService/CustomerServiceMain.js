import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import CustomerServiceDetails from "./CustomerServiceDetails";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

const CustomerServiceMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);

	// Check password verification on mount
	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		const customerServiceVerified = localStorage.getItem(
			"CustomerServiceVerified"
		);

		if (customerServiceVerified) {
			setIsPasswordVerified(true); // Skip modal if already verified
		} else {
			setIsModalVisible(true); // Show modal if not verified
		}
	}, []);

	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_CUSTOMER_SERVICE) {
			setIsPasswordVerified(true);
			message.success("Password verified successfully");
			localStorage.setItem("CustomerServiceVerified", "true"); // Save verification status
			setIsModalVisible(false); // Close modal
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
							<CustomerServiceDetails />
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
		grid-template-columns: ${(props) => (props.show ? "5% 75%" : "17% 75%")};
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
`;
