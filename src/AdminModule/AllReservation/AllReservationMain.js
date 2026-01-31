// client/src/AdminModule/AllReservation/AllReservationMain.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useHistory, useLocation } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import {
	getAllReservationForAdmin,
	gettingHotelDetailsForAdminAll,
	readUserId,
	distinctReservedByList,
	distinctBookingSources, // <-- NEW
} from "../apiAdmin";
import EnhancedContentTable from "./EnhancedContentTable";
import { Modal, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { SUPER_USER_IDS } from "../utils/superUsers";

const getPageFromSearch = (search) => {
	const params = new URLSearchParams(search || "");
	const pageParam = parseInt(params.get("page"), 10);
	return Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
};
const getSearchTermFromSearch = (search) => {
	const params = new URLSearchParams(search || "");
	return params.get("search") || "";
};
const DATE_FILTER_TYPES = new Set(["checkin", "checkout", "created"]);
const getDateFilterFromSearch = (search) => {
	const params = new URLSearchParams(search || "");
	const type = params.get("dateType") || "";
	const from = params.get("dateFrom") || "";
	const to = params.get("dateTo") || "";
	if (!type || !DATE_FILTER_TYPES.has(type) || !from) {
		return { type: "", from: "", to: "" };
	}
	return { type, from, to };
};
const isSameDateFilter = (a, b) =>
	(a?.type || "") === (b?.type || "") &&
	(a?.from || "") === (b?.from || "") &&
	(a?.to || "") === (b?.to || "");

const AllReservationMain = ({ chosenLanguage }) => {
	const history = useHistory();
	const location = useLocation();

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
	const [currentPage, setCurrentPage] = useState(() =>
		getPageFromSearch(location.search)
	);
	const [pageSize, setPageSize] = useState(15);
	const [searchTerm, setSearchTerm] = useState(() =>
		getSearchTermFromSearch(location.search)
	);

	// Server filter
	const [filterType, setFilterType] = useState("");

	// Reserved-by filters
	const [reservedByOptions, setReservedByOptions] = useState([]); // lowercase list
	const [activeReservedBy, setActiveReservedBy] = useState(""); // lowercase or ""

	// NEW: Booking source filters
	const [bookingSourceOptions, setBookingSourceOptions] = useState([]); // lowercase list
	const [activeBookingSource, setActiveBookingSource] = useState(""); // lowercase or ""

	// Single date modal filter { type: 'checkin'|'checkout'|'created'|'' , from, to }
	const [dateFilter, setDateFilter] = useState(() =>
		getDateFilterFromSearch(location.search)
	);

	// Password modal states
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);

	// Current employee/user fetched from backend (not from isAuthenticated().user)
	const [getUser, setGetUser] = useState(null);

	// Auth token still via isAuthenticated()
	const { user: authUser, token } = isAuthenticated() || {};

	// Keep currentPage/searchTerm in sync with query params
	useEffect(() => {
		const pageFromQuery = getPageFromSearch(location.search);
		const searchFromQuery = getSearchTermFromSearch(location.search);
		const dateFromQuery = getDateFilterFromSearch(location.search);
		setCurrentPage((prev) =>
			prev !== pageFromQuery ? pageFromQuery : prev
		);
		setSearchTerm((prev) =>
			prev !== searchFromQuery ? searchFromQuery : prev
		);
		setDateFilter((prev) =>
			isSameDateFilter(prev, dateFromQuery) ? prev : dateFromQuery
		);
	}, [location.search]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const desiredPage = String(currentPage);
		const desiredSearch = (searchTerm || "").trim();
		const desiredDateType = dateFilter?.type || "";
		const desiredDateFrom = dateFilter?.from || "";
		const desiredDateTo = dateFilter?.to || "";
		let changed = false;

		if (params.get("page") !== desiredPage) {
			params.set("page", desiredPage);
			changed = true;
		}

		if (desiredSearch) {
			if (params.get("search") !== searchTerm) {
				params.set("search", searchTerm);
				changed = true;
			}
		} else if (params.has("search")) {
			params.delete("search");
			changed = true;
		}

		if (desiredDateType && desiredDateFrom) {
			if (params.get("dateType") !== desiredDateType) {
				params.set("dateType", desiredDateType);
				changed = true;
			}
			if (params.get("dateFrom") !== desiredDateFrom) {
				params.set("dateFrom", desiredDateFrom);
				changed = true;
			}
			if (desiredDateTo) {
				if (params.get("dateTo") !== desiredDateTo) {
					params.set("dateTo", desiredDateTo);
					changed = true;
				}
			} else if (params.has("dateTo")) {
				params.delete("dateTo");
				changed = true;
			}
		} else if (
			params.has("dateType") ||
			params.has("dateFrom") ||
			params.has("dateTo")
		) {
			params.delete("dateType");
			params.delete("dateFrom");
			params.delete("dateTo");
			changed = true;
		}

		if (!changed) return;
		const nextSearch = params.toString();
		history.replace({
			pathname: location.pathname,
			search: nextSearch ? `?${nextSearch}` : "",
		});
	}, [
		currentPage,
		searchTerm,
		dateFilter?.type,
		dateFilter?.from,
		dateFilter?.to,
		history,
		location.pathname,
		location.search,
	]);

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

	/** 1) On mount, fetch employee details (readUserId) BEFORE anything else. */
	const loadCurrentUser = useCallback(() => {
		if (!authUser?._id || !token) return;
		readUserId(authUser._id, token).then((data) => {
			if (data && data.error) {
				console.error(data.error, "Error fetching user details");
			} else {
				setGetUser(data);
			}
		});
	}, [authUser?._id, token]);

	useEffect(() => {
		loadCurrentUser();
		if (typeof window !== "undefined" && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [loadCurrentUser]);

	/** 2) Determine if super admin (based on fetched user, not auth payload). */
	const isSuperAdmin =
		!getUser?.accessTo ||
		getUser?.accessTo.length === 0 ||
		getUser?.accessTo.includes("all");

	const allowAllReservedBy = SUPER_USER_IDS.includes(getUser?._id);

	/** 3) Access checks (uses getUser) */
	useEffect(() => {
		if (!getUser) return;
		if (!getUser.activeUser) {
			history.push("/");
			return;
		}
		const accessTo = getUser.accessTo || [];
		if (
			accessTo.includes("HotelsReservations") ||
			isSuperAdmin ||
			SUPER_USER_IDS.includes(getUser?._id)
		)
			return;

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

	/** 4) Can skip password? */
	const canSkipPassword = (usr) => {
		if (!usr) return false;
		if (SUPER_USER_IDS.includes(usr._id)) return true;
		const accessTo = usr.accessTo || [];
		return (
			accessTo.includes("HotelsReservations") ||
			accessTo.includes("all") ||
			accessTo.length === 0
		);
	};

	/** 5) Show/hide password modal (after getUser is known) */
	useEffect(() => {
		if (!getUser) return;
		const reservationPw = localStorage.getItem("ReservationListVerified");
		if (reservationPw || canSkipPassword(getUser) || isSuperAdmin) {
			setIsPasswordVerified(true);
			setIsModalVisible(false);
			return;
		}
		setIsModalVisible(true);
	}, [getUser, isSuperAdmin]);

	/** 6) Password verification */
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

	/** 7) After we know getUser -> set initial reservedBy behavior */
	useEffect(() => {
		if (!getUser) return;
		const selfLower = (getUser?.name || "").trim().toLowerCase();
		// If not a super user id => force self filter; else allow All (empty).
		if (!SUPER_USER_IDS.includes(getUser._id)) {
			setActiveReservedBy(selfLower);
		} else {
			setActiveReservedBy(""); // All
		}
		// eslint-disable-next-line
	}, [getUser?._id]);

	/** Fetch hotels list (uses getUser._id + token) */
	const adminAllHotelDetails = useCallback(() => {
		if (!getUser?._id || !token) return;
		gettingHotelDetailsForAdminAll(getUser._id, token)
			.then((data) => {
				const hotels = extractHotels(data.hotels);
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
	}, [getUser?._id, token]);

	useEffect(() => {
		if (!getUser) return;
		adminAllHotelDetails();
	}, [getUser, adminAllHotelDetails]);

	/** 8) Fetch reservedBy list (lowercase). */
	const fetchReservedByOptions = useCallback(() => {
		if (!getUser?._id || !token) return;
		distinctReservedByList(getUser._id, token)
			.then((list) => {
				const arr = Array.isArray(list) ? list : [];
				setReservedByOptions(arr);
			})
			.catch((err) => {
				console.error("Error fetching reservedBy list:", err);
				setReservedByOptions([]);
			});
	}, [getUser?._id, token]);

	/** NEW: Fetch bookingSource list (lowercase, dynamic, no hard-code) */
	const fetchBookingSourceOptions = useCallback(() => {
		if (!getUser?._id || !token) return;
		distinctBookingSources(getUser._id, token)
			.then((arr) => {
				const list = Array.isArray(arr) ? arr : [];
				setBookingSourceOptions(list);
			})
			.catch((err) => {
				console.error("Error fetching booking sources:", err);
				setBookingSourceOptions([]);
			});
	}, [getUser?._id, token]);

	useEffect(() => {
		if (isPasswordVerified && getUser) {
			fetchReservedByOptions();
			fetchBookingSourceOptions(); // NEW
		}
	}, [
		isPasswordVerified,
		getUser,
		fetchReservedByOptions,
		fetchBookingSourceOptions,
	]);

	/** 9) Fetch reservations (server-side, uses activeReservedBy + dateFilter + bookingSource). */
	const fetchReservations = useCallback(() => {
		if (!getUser?._id || !token) return;

		// Build date params from dateFilter
		const dateParams = {};
		if (dateFilter?.type && dateFilter?.from) {
			const t = dateFilter.type;
			if (t === "checkin") {
				dateParams.checkinFrom = dateFilter.from;
				if (dateFilter.to) dateParams.checkinTo = dateFilter.to;
			} else if (t === "checkout") {
				dateParams.checkoutFrom = dateFilter.from;
				if (dateFilter.to) dateParams.checkoutTo = dateFilter.to;
			} else if (t === "created") {
				dateParams.createdFrom = dateFilter.from;
				if (dateFilter.to) dateParams.createdTo = dateFilter.to;
			}
		}

		getAllReservationForAdmin(getUser._id, token, {
			page: currentPage,
			limit: pageSize,
			searchQuery: searchTerm,
			filterType,
			reservedBy: activeReservedBy, // "" means All (super user id only)
			bookingSource: activeBookingSource, // NEW
			...dateParams,
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
	}, [
		getUser?._id,
		token,
		currentPage,
		pageSize,
		searchTerm,
		filterType,
		activeReservedBy,
		activeBookingSource, // NEW
		dateFilter?.type,
		dateFilter?.from,
		dateFilter?.to,
	]);

	useEffect(() => {
		if (isPasswordVerified && getUser) {
			fetchReservations();
		}
	}, [isPasswordVerified, getUser, fetchReservations]);

	/** 10) After-fetch filtering (non-super-admin, role 1000) */
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

	/** Search handler (reset page -> triggers refetch via deps) */
	const handleSearch = () => {
		setCurrentPage(1);
	};

	// ReservedBy change handler (server refetch)
	const handleReservedByChange = (value /* lowercase or "" for All */) => {
		// For normal employees, ignore attempts to clear (enforce own name)
		if (!allowAllReservedBy) {
			const selfLower = (getUser?.name || "").trim().toLowerCase();
			setActiveReservedBy(selfLower);
		} else {
			setActiveReservedBy(value || "");
		}
		setCurrentPage(1);
	};

	// NEW: Booking Source change handler (server refetch)
	const handleBookingSourceChange = (value /* lowercase or "" for All */) => {
		setActiveBookingSource(value || "");
		setCurrentPage(1);
	};

	// Date filter apply/clear
	const handleDateFilterApply = ({ type, from, to }) => {
		setDateFilter({ type: type || "", from: from || "", to: to || "" });
		setCurrentPage(1);
	};
	const handleDateFilterClear = () => {
		setDateFilter({ type: "", from: "", to: "" });
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
			{isPasswordVerified && getUser && (
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
								// Reserved By (existing)
								reservedByOptions={reservedByOptions}
								activeReservedBy={activeReservedBy}
								onReservedByChange={handleReservedByChange}
								// NEW: Booking Source filter props
								bookingSourceOptions={bookingSourceOptions}
								activeBookingSource={activeBookingSource}
								onBookingSourceChange={handleBookingSourceChange}
								// Date filters
								dateFilter={dateFilter}
								onDateFilterApply={handleDateFilterApply}
								onClearDateFilter={handleDateFilterClear}
								// ReservedBy permissions
								allowAllReservedBy={allowAllReservedBy}
								selfReservedBy={(getUser?.name || "").trim().toLowerCase()}
								currentUserId={getUser?._id}
								onReservationUpdated={fetchReservations}
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
	margin-top: 0;
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
		margin: 20px 10px;
	}

	@media (max-width: 992px) {
		.grid-container-main {
			grid-template-columns: 1fr;
			grid-template-areas: "nav" "content";
		}
	}
`;
