import React, { useEffect, useState, useCallback } from "react";
import { useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import {
	getAllReservationForAdmin,
	gettingHotelDetailsForAdmin,
	readUserId,
} from "../apiAdmin";
import EnhancedContentTable from "./EnhancedContentTable"; // <-- We'll render this child
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

const AllReservationMain = ({ chosenLanguage }) => {
	// Local UI states
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	// We store the "server" data in an object { data: [...], totalDocuments, scorecards }
	const [allReservationsForAdmin, setAllReservationsForAdmin] = useState({
		data: [],
		totalDocuments: 0,
		scorecards: {},
	});
	const [allHotelDetailsAdmin, setAllHotelDetailsAdmin] = useState("");

	// After fetching from the server, we apply a second layer of filtering for user-based hotels (if not super admin).
	const [filteredReservations, setFilteredReservations] = useState([]);

	// Pagination & search states
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [searchTerm, setSearchTerm] = useState("");

	// NEW: filterType to pass to server
	const [filterType, setFilterType] = useState("");

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

	const adminAllHotelDetails = useCallback(() => {
		gettingHotelDetailsForAdmin(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error getting all hotel details");
			} else {
				// Sort data alphabetically by hotelName before setting it in state
				const sortedData = data.sort((a, b) =>
					a.hotelName.localeCompare(b.hotelName)
				);
				setAllHotelDetailsAdmin(sortedData);
			}
		});
	}, [user._id, token]);

	// Fetch hotels list on mount
	useEffect(() => {
		adminAllHotelDetails();
	}, [adminAllHotelDetails]);

	/**
	 * 7) Fetch reservations from the server (server side pagination).
	 */
	const fetchReservations = useCallback(() => {
		// We pass filterType as well to let the server handle the filtering
		getAllReservationForAdmin(user._id, token, {
			page: currentPage,
			limit: pageSize,
			searchQuery: searchTerm,
			filterType, // <-- important
		})
			.then((resData) => {
				if (resData && resData.error) {
					console.error(resData.error, "Error getting reservations");
					// Fallback: empty results
					setAllReservationsForAdmin({
						data: [],
						totalDocuments: 0,
						scorecards: {},
					});
				} else if (resData && resData.success) {
					// We expect shape: { data, totalDocuments, scorecards, ... }
					setAllReservationsForAdmin({
						data: resData.data || [],
						totalDocuments: resData.totalDocuments || 0,
						scorecards: resData.scorecards || {},
					});
				} else {
					// If no success flag or something, fallback
					setAllReservationsForAdmin({
						data: [],
						totalDocuments: 0,
						scorecards: {},
					});
				}
			})
			.catch((err) => {
				console.error("Error fetching reservations:", err);
				setAllReservationsForAdmin({
					data: [],
					totalDocuments: 0,
					scorecards: {},
				});
			});
	}, [user._id, token, currentPage, pageSize, searchTerm, filterType]);

	// Whenever isPasswordVerified changes or any of our fetch dependencies change,
	// re-fetch the data from the server
	useEffect(() => {
		if (isPasswordVerified) {
			fetchReservations();
		}
	}, [isPasswordVerified, fetchReservations]);

	/**
	 * 8) After we fetch from the server, apply a second layer of filtering
	 *    based on the user’s hotelsToSupport (for non-super-admin).
	 */
	useEffect(() => {
		const { data } = allReservationsForAdmin;
		if (!data || !Array.isArray(data)) {
			setFilteredReservations([]);
			return;
		}

		let finalList = [...data];
		// If not a super admin and role=1000, filter by hotelsToSupport
		if (!isSuperAdmin && getUser.role === 1000) {
			const hts = getUser.hotelsToSupport;
			if (Array.isArray(hts) && hts.length > 0) {
				// Only keep reservations for hotels in hts
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
				// Show all
			} else {
				finalList = [];
			}
		}

		setFilteredReservations(finalList);
	}, [allReservationsForAdmin, getUser, isSuperAdmin]);

	/**
	 * 9) Handle search: reset to page 1, then fetch
	 */
	const handleSearch = () => {
		setCurrentPage(1);
		// The useEffect with fetchReservations() will run automatically on next render
	};

	// NEW: This function is called from the child when a user clicks a filter button
	const handleFilterClickFromParent = useCallback((newFilter) => {
		setFilterType(newFilter);
		setCurrentPage(1);
		// The useEffect that depends on [filterType, currentPage] will refetch
	}, []);

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
							<EnhancedContentTable
								data={filteredReservations}
								totalDocuments={allReservationsForAdmin.totalDocuments}
								currentPage={currentPage}
								pageSize={pageSize}
								setCurrentPage={setCurrentPage}
								setPageSize={setPageSize}
								searchTerm={searchTerm}
								setSearchTerm={setSearchTerm}
								handleSearch={handleSearch}
								scorecardsObject={allReservationsForAdmin.scorecards}
								// We pass fromPage for ScoreCards usage
								fromPage='AllReservations'
								// NEW: pass filter props
								filterType={filterType}
								setFilterType={setFilterType}
								handleFilterClickFromParent={handleFilterClickFromParent}
								allHotelDetailsAdmin={allHotelDetailsAdmin}
							/>
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
