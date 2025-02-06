import React, { useEffect, useState, useCallback } from "react";
import { useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { getAllReservationForAdmin, readUserId } from "../apiAdmin";
import ContentTable from "./ContentTable";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

const AllReservationMain = ({ chosenLanguage }) => {
	// Local UI states
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	// Reservation states (fetched and filtered)
	const [allReservationsForAdmin, setAllReservationsForAdmin] = useState([]);
	const [filteredReservations, setFilteredReservations] = useState([]);
	// Pagination states
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(500);
	// Password modal states
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	// Fetched user data
	const [getUser, setGetUser] = useState("");

	const { user, token } = isAuthenticated();
	const history = useHistory();

	/**
	 * 1) On mount, fetch user details.
	 */
	const gettingUserId = useCallback(() => {
		readUserId(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error fetching user details");
			} else {
				setGetUser(data);
			}
		});
	}, [user._id, token]);

	useEffect(() => {
		gettingUserId();
		// Adjust layout for mobile devices
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [gettingUserId]);

	/**
	 * 2) Determine if the user is a super admin.
	 */
	const isSuperAdmin =
		!getUser.accessTo ||
		getUser.accessTo.length === 0 ||
		getUser.accessTo.includes("all");

	/**
	 * 3) Basic access check – if the user is not active or does not have access to reservations,
	 *    redirect them.
	 */
	useEffect(() => {
		if (!getUser) return;
		if (!getUser.activeUser) {
			history.push("/");
			return;
		}
		const accessTo = getUser.accessTo || [];
		if (accessTo.includes("HotelsReservations") || isSuperAdmin) {
			return;
		}
		// Redirect based on available modules
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
			history.push("/");
		}
	}, [getUser, history, isSuperAdmin]);

	/**
	 * 4) Check if we can skip showing the password modal.
	 *    In this case, the user must have "HotelsReservations" access and some hotels
	 *    in hotelsToSupport.
	 */
	const canSkipPassword = (usr) => {
		if (!usr) return false;
		const { accessTo = [], hotelsToSupport } = usr;
		const hasReservationsAccess =
			accessTo.includes("HotelsReservations") || accessTo.includes("all");
		let hasHotels = false;
		if (Array.isArray(hotelsToSupport)) {
			hasHotels = hotelsToSupport.length > 0;
		} else if (typeof hotelsToSupport === "string") {
			hasHotels = hotelsToSupport === "all";
		}
		return hasReservationsAccess && hasHotels;
	};

	/**
	 * 5) Show or hide the password modal based on localStorage or skip logic.
	 */
	useEffect(() => {
		if (!getUser) return;
		const reservationPw = localStorage.getItem("ReservationListVerified");
		if (reservationPw) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			return;
		}
		if (canSkipPassword(getUser)) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			return;
		}
		setIsModalVisible(true);
	}, [getUser]);

	/**
	 * 6) Handle the password verification.
	 */
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

	/**
	 * 7) Fetch all reservations.
	 *     When filtering for a non-super-admin employee (role === 1000),
	 *     we filter out reservations whose hotelId._id is not in the user’s hotelsToSupport.
	 */
	const fetchAllReservations = useCallback(() => {
		getAllReservationForAdmin(user._id, token).then((resData) => {
			if (resData && resData.error) {
				console.error(resData.error, "Error getting reservations");
			} else {
				let finalList = resData.data || [];
				if (!isSuperAdmin && getUser.role === 1000) {
					const hts = getUser.hotelsToSupport;
					if (Array.isArray(hts) && hts.length > 0) {
						// Extract allowed hotel IDs from the user object (as strings)
						const allowedIds = hts.map((hotel) => String(hotel._id));
						finalList = finalList.filter((r) => {
							const hotelObj = r?.hotelId;
							let hotelId = "";
							if (
								typeof hotelObj === "object" &&
								hotelObj !== null &&
								hotelObj._id
							) {
								hotelId = String(hotelObj._id);
							} else {
								hotelId = String(hotelObj);
							}
							return allowedIds.includes(hotelId);
						});
					} else if (hts === "all") {
						// no filtering needed; show all reservations
					} else {
						finalList = [];
					}
				}
				setAllReservationsForAdmin({ data: finalList });
			}
		});
	}, [user._id, token, isSuperAdmin, getUser]);

	useEffect(() => {
		if (isPasswordVerified) {
			fetchAllReservations();
		}
	}, [isPasswordVerified, fetchAllReservations]);

	/**
	 * 8) In case you want to apply a second layer of filtering before passing the data to the table,
	 *     we filter the fetched reservations using the same allowed hotel IDs logic.
	 */
	useEffect(() => {
		if (
			!allReservationsForAdmin?.data ||
			!Array.isArray(allReservationsForAdmin.data)
		) {
			return;
		}
		let finalList = allReservationsForAdmin.data;
		if (!isSuperAdmin && getUser.role === 1000) {
			const userHotelsToSupport = getUser.hotelsToSupport;
			if (
				Array.isArray(userHotelsToSupport) &&
				userHotelsToSupport.length > 0
			) {
				const allowedIds = userHotelsToSupport.map((hotel) =>
					String(hotel._id)
				);
				finalList = finalList.filter((res) => {
					const hotelObj = res?.hotelId;
					let hotelId = "";
					if (
						typeof hotelObj === "object" &&
						hotelObj !== null &&
						hotelObj._id
					) {
						hotelId = String(hotelObj._id);
					} else {
						hotelId = String(hotelObj);
					}
					return allowedIds.includes(hotelId);
				});
			} else if (userHotelsToSupport === "all") {
				// no filtering needed
			} else {
				finalList = [];
			}
		}
		setFilteredReservations(finalList);
	}, [allReservationsForAdmin, getUser, isSuperAdmin]);

	return (
		<AllReservationMainWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			{/* Password Modal */}
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

			{/* Main Content */}
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
							{filteredReservations && filteredReservations.length > 0 ? (
								<ContentTable
									allReservationsForAdmin={{ data: filteredReservations }}
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
			)}
		</AllReservationMainWrapper>
	);
};

export default AllReservationMain;

/* --- Styled Component --- */
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
