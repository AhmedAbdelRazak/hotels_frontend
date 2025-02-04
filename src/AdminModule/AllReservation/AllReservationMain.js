import React, { useEffect, useState, useCallback } from "react";
import { useHistory } from "react-router-dom"; // Import for navigation
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { getAllReservationForAdmin, readUserId } from "../apiAdmin"; // Fixed missing import
import ContentTable from "./ContentTable"; // Fixed missing import
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

const AllReservationMain = ({ chosenLanguage }) => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [allReservationsForAdmin, setAllReservationForAdmin] = useState([]);
	const [currentPage, setCurrentPage] = useState(1); // Current page number
	const [pageSize, setPageSize] = useState(500); // Number of records per page
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [getUser, setGetUser] = useState(""); // Added to fetch user details

	const { user, token } = isAuthenticated();
	const history = useHistory();

	// Fetch user details
	const gettingUserId = useCallback(() => {
		readUserId(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error fetching user details");
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
			// If the user is not active, redirect to home
			if (!getUser.activeUser) {
				history.push("/");
				return;
			}

			const accessTo = getUser.accessTo || [];

			// Check if the user has access to HotelsReservations or is a Super Admin
			if (accessTo.includes("HotelsReservations") || isSuperAdmin) {
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
			const reservationPasswordVerified = localStorage.getItem(
				"ReservationListVerified"
			);
			if (reservationPasswordVerified) {
				setIsPasswordVerified(true);
			} else {
				setIsModalVisible(true);
			}
		}
	}, [gettingUserId, isSuperAdmin]);

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

	const gettingAllReservationForAdmin = useCallback(() => {
		getAllReservationForAdmin(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error getting reservations");
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
