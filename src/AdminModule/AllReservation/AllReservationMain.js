import React, { useEffect, useState, useCallback } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { getAllReservationForAdmin } from "../apiAdmin";
import ContentTable from "./ContentTable";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

const AllReservationMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [allReservationsForAdmin, setAllReservationForAdmin] = useState([]);
	const [currentPage, setCurrentPage] = useState(1); // Current page number
	const [pageSize, setPageSize] = useState(100); // Number of records per page
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);

	useEffect(() => {
		// Handle responsive collapse
		const handleResize = () => {
			setCollapsed(window.innerWidth <= 1000);
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	useEffect(() => {
		// Check password verification on mount
		const reservationPasswordVerified = localStorage.getItem(
			"ReservationListVerified"
		);
		if (reservationPasswordVerified) {
			setIsPasswordVerified(true);
		} else {
			setIsModalVisible(true);
		}
	}, []);

	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_RSERVATION_LIST) {
			setIsPasswordVerified(true);
			message.success("Password verified successfully");
			localStorage.setItem("ReservationListVerified", "true");
			setIsModalVisible(false);
		} else {
			message.error("Incorrect password. Please try again.");
		}
	};

	const { user, token } = isAuthenticated();

	const gettingAllReservationForAdmin = useCallback(() => {
		getAllReservationForAdmin(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error getting all hotel details");
				alert("Failed to fetch reservations. Please try again.");
			} else {
				setAllReservationForAdmin(data);
			}
		});
	}, [user._id, token]);

	useEffect(() => {
		if (isPasswordVerified) {
			gettingAllReservationForAdmin();
		}
	}, [isPasswordVerified, gettingAllReservationForAdmin]);

	return (
		<AllReservationMainWrapper
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

			{/* Content Rendering */}
			{isPasswordVerified && (
				<div className='grid-container-main'>
					<div className='navcontent'>
						{chosenLanguage === "Arabic" ? (
							<AdminNavbarArabic
								fromPage='AllReservations'
								AdminMenuStatus={AdminMenuStatus}
								setAdminMenuStatus={setAdminMenuStatus}
								collapsed={collapsed}
								setCollapsed={setCollapsed}
								chosenLanguage={chosenLanguage}
							/>
						) : (
							<AdminNavbar
								fromPage='AllReservations'
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
								{allReservationsForAdmin &&
								allReservationsForAdmin.data &&
								allReservationsForAdmin.data.length > 0 ? (
									<ContentTable
										allReservationsForAdmin={allReservationsForAdmin}
										currentPage={currentPage}
										setCurrentPage={setCurrentPage}
										pageSize={pageSize}
										setPageSize={setPageSize}
									/>
								) : (
									<div>No Reservations Found</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</AllReservationMainWrapper>
	);
};

export default AllReservationMain;

const AllReservationMainWrapper = styled.div`
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
