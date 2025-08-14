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
import EnhancedContentTable from "./EnhancedContentTable";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

const AllReservationMain = ({ chosenLanguage }) => {
	// Local UI states
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	// Server data
	const [allReservationsForAdmin, setAllReservationsForAdmin] = useState({
		data: [],
		totalDocuments: 0,
		scorecards: {},
	});

	// IMPORTANT: array, not string
	const [allHotelDetailsAdmin, setAllHotelDetailsAdmin] = useState([]);

	// After-fetch, user-based filtering
	const [filteredReservations, setFilteredReservations] = useState([]);

	// Pagination & search
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [searchTerm, setSearchTerm] = useState("");

	// Server filter
	const [filterType, setFilterType] = useState("");

	// Password modal states
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);

	// User data (guarded)
	const [getUser, setGetUser] = useState(null);
	const { user, token } = isAuthenticated() || {};
	const history = useHistory();

	// --- helpers ---
	const extractHotels = (payload) => {
		if (Array.isArray(payload)) return payload;
		const candidateKeys = [
			"hotels",
			"data",
			"results",
			"items",
			"docs",
			"list",
		];
		if (payload && typeof payload === "object") {
			for (const k of candidateKeys) {
				if (Array.isArray(payload[k])) return payload[k];
			}
			const firstArray = Object.values(payload).find(Array.isArray);
			if (Array.isArray(firstArray)) return firstArray;
		}
		return [];
	};

	/**
	 * 1) On mount, fetch user details.
	 */
	const gettingUserId = useCallback(() => {
		if (!user?._id || !token) return;
		readUserId(user._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error fetching user details");
			} else {
				setGetUser(data);
			}
		});
	}, [user?._id, token]);

	useEffect(() => {
		gettingUserId();
		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [gettingUserId]);

	/**
	 * 2) Determine if the user is a super admin.
	 */
	const isSuperAdmin =
		!getUser?.accessTo ||
		getUser?.accessTo.length === 0 ||
		getUser?.accessTo.includes("all");

	/**
	 * 3) Access checks
	 */
	useEffect(() => {
		if (!getUser) return;
		if (!getUser.activeUser) {
			history.push("/");
			return;
		}
		const accessTo = getUser.accessTo || [];
		if (accessTo.includes("HotelsReservations") || isSuperAdmin) return;

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
	 * 4) Can skip password?
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
	 * 5) Show/hide password modal
	 */
	useEffect(() => {
		if (!getUser) return;
		const reservationPw = localStorage.getItem("ReservationListVerified");
		if (reservationPw || canSkipPassword(getUser)) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			return;
		}
		setIsModalVisible(true);
	}, [getUser]);

	/**
	 * 6) Handle password verification
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
	 * Fetch hotels list (guarded + normalized + sorted)
	 */
	const adminAllHotelDetails = useCallback(() => {
		if (!user?._id || !token) return;
		gettingHotelDetailsForAdmin(user._id, token)
			.then((data) => {
				const hotels = extractHotels(data);
				const sorted = [...hotels].filter(Boolean).sort((a, b) =>
					(a?.hotelName || "").localeCompare(b?.hotelName || "", undefined, {
						sensitivity: "base",
					})
				);
				setAllHotelDetailsAdmin(sorted);
			})
			.catch((err) => {
				console.error("Error getting all hotel details", err);
				setAllHotelDetailsAdmin([]);
			});
	}, [user?._id, token]);

	useEffect(() => {
		adminAllHotelDetails();
	}, [adminAllHotelDetails]);

	/**
	 * 7) Fetch reservations (server-side pagination)
	 */
	const fetchReservations = useCallback(() => {
		if (!user?._id || !token) return;
		getAllReservationForAdmin(user._id, token, {
			page: currentPage,
			limit: pageSize,
			searchQuery: searchTerm,
			filterType,
		})
			.then((resData) => {
				if (resData && resData.error) {
					console.error(resData.error, "Error getting reservations");
					setAllReservationsForAdmin({
						data: [],
						totalDocuments: 0,
						scorecards: {},
					});
				} else if (resData && resData.success) {
					setAllReservationsForAdmin({
						data: resData.data || [],
						totalDocuments: resData.totalDocuments || 0,
						scorecards: resData.scorecards || {},
					});
				} else {
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
	}, [user?._id, token, currentPage, pageSize, searchTerm, filterType]);

	useEffect(() => {
		if (isPasswordVerified) {
			fetchReservations();
		}
	}, [isPasswordVerified, fetchReservations]);

	/**
	 * 8) Apply second-layer filtering (non-super-admin, role 1000)
	 */
	useEffect(() => {
		const { data } = allReservationsForAdmin || {};
		if (!Array.isArray(data)) {
			setFilteredReservations([]);
			return;
		}

		let finalList = [...data];

		if (!isSuperAdmin && Number(getUser?.role) === 1000) {
			const hts = getUser?.hotelsToSupport;
			if (Array.isArray(hts) && hts.length > 0) {
				const allowedIds = hts.map((hotel) => String(hotel?._id));
				finalList = finalList.filter((r) => {
					const hotelObj = r?.hotelId;
					let hotelId = "";
					if (hotelObj && typeof hotelObj === "object" && hotelObj._id) {
						hotelId = String(hotelObj._id);
					} else {
						hotelId = String(hotelObj);
					}
					return allowedIds.includes(hotelId);
				});
			} else if (hts === "all") {
				// show all
			} else {
				finalList = [];
			}
		}

		setFilteredReservations(finalList);
	}, [allReservationsForAdmin, getUser, isSuperAdmin]);

	/**
	 * 9) Search handler (reset page -> triggers refetch via deps)
	 */
	const handleSearch = () => {
		setCurrentPage(1);
	};

	// Filter button click (from child)
	const handleFilterClickFromParent = useCallback((newFilter) => {
		setFilterType(newFilter);
		setCurrentPage(1);
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
								fromPage='AllReservations'
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
