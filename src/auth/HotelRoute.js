/** @format */

import React, { useEffect, useState } from "react";
import { Route, Redirect } from "react-router-dom";
import { getSingleUser, isAuthenticated, signout } from "./index";
import { isSuperAdminUser } from "../AdminModule/utils/superUsers";

const readSelectedHotel = () => {
	try {
		const stored = localStorage.getItem("selectedHotel");
		return stored ? JSON.parse(stored) : null;
	} catch (err) {
		console.warn("Failed to parse selectedHotel from localStorage", err);
		return null;
	}
};

const normalizeSelectedHotel = (hotel, { hotelId, userId, fallbackUserId }) => {
	const normalized = hotel && typeof hotel === "object" ? { ...hotel } : {};
	const normalizedHotelId = normalized._id || hotelId || "";

	if (normalizedHotelId) {
		normalized._id = normalizedHotelId;
	}

	const rawBelongsTo = normalized.belongsTo;
	const belongsToId =
		(rawBelongsTo && typeof rawBelongsTo === "object"
			? rawBelongsTo._id
			: rawBelongsTo) ||
		userId ||
		fallbackUserId ||
		"";

	if (belongsToId) {
		normalized.belongsTo = {
			...(typeof rawBelongsTo === "object" ? rawBelongsTo : {}),
			_id: belongsToId,
		};
	}

	if (!Array.isArray(normalized.roomCountDetails)) {
		normalized.roomCountDetails = [];
	}

	return normalized;
};

const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const getSupportedHotelIds = (user) => [
	...new Set(
		[
			user?.hotelIdWork,
			...(Array.isArray(user?.hotelIdsWork) ? user.hotelIdsWork : []),
			...(Array.isArray(user?.hotelsToSupport) ? user.hotelsToSupport : []),
			...(Array.isArray(user?.hotelIdsOwner) ? user.hotelIdsOwner : []),
		]
			.map(normalizeId)
			.filter(Boolean)
	),
];

const getUserRoles = (user) => {
	const roles = Array.isArray(user?.roles) ? user.roles : [];
	return [...new Set([user?.role, ...roles].map(Number).filter(Boolean))];
};

const hasRole = (user, role) => getUserRoles(user).includes(Number(role));

const getUserRoleDescriptions = (user) => [
	String(user?.roleDescription || "").toLowerCase(),
	...(Array.isArray(user?.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const hasRoleDescription = (user, description) =>
	getUserRoleDescriptions(user).includes(String(description || "").toLowerCase());

const hasAnyRoleDescription = (user, descriptions = []) =>
	descriptions.some((description) => hasRoleDescription(user, description));

const isSystemAdminUser = (user) =>
	hasRole(user, 10000) ||
	hasRoleDescription(user, "systemadmin") ||
	hasRoleDescription(user, "system admin");

const isFullReservationAccessUser = (user) =>
	isSuperAdminUser(user) ||
	isSystemAdminUser(user) ||
	hasRole(user, 2000) ||
	hasRole(user, 3000) ||
	hasRole(user, 8000) ||
	hasAnyRoleDescription(user, [
		"hotelmanager",
		"reception",
		"reservationemployee",
	]);

const isLimitedOrderTakerUser = (user) => {
	const isOrderTaker =
		hasRole(user, 7000) ||
		hasRoleDescription(user, "ordertaker") ||
		(Array.isArray(user?.accessTo) && user.accessTo.includes("ownReservations"));

	return isOrderTaker && !isFullReservationAccessUser(user);
};

const isOrderTakerReservationSearchAllowed = (search = "") => {
	const params = new URLSearchParams(search || "");
	return params.has("newReservation") || params.has("list");
};

const hasScopedHotelRole = (user) =>
	getUserRoles(user).some((role) =>
		[2000, 3000, 4000, 5000, 6000, 7000, 8000].includes(role)
	) ||
	hasAnyRoleDescription(user, [
		"hotelmanager",
		"reception",
		"housekeepingmanager",
		"housekeeping",
		"finance",
		"ordertaker",
		"reservationemployee",
	]);

const isScopedHotelUser = (user) =>
	hasScopedHotelRole(user) &&
	getSupportedHotelIds(user).length > 0;

const isPendingApplicationUser = (user = {}) =>
	user?.activeUser === false &&
	String(user?.applicationReview?.status || "").toLowerCase() === "pending";

const pathAllowsRole = (pathname = "", user, search = "") => {
	if (isPendingApplicationUser(user)) {
		return pathname.includes("/hotel-management/main-dashboard");
	}

	const isScopedManager = hasRole(user, 2000) && hasRoleDescription(user, "hotelmanager");

	if (isSuperAdminUser(user)) return true;
	if (isSystemAdminUser(user)) {
		return (
			pathname.includes("/hotel-management") ||
			pathname.includes("/hotel-management-payment")
		);
	}
	if (hasRole(user, 2000) && !isScopedHotelUser(user)) return true;
	if (isScopedManager) return true;

	if (pathname.includes("/hotel-management/b2b-chat")) {
		return hasRole(user, 2000) || isSystemAdminUser(user) || isScopedHotelUser(user);
	}
	if (pathname.includes("/hotel-management/main-dashboard")) {
		return hasRole(user, 2000) || isScopedHotelUser(user);
	}
	if (pathname.includes("/hotel-management/dashboard")) {
		return [4000, 6000].some((role) => hasRole(user, role));
	}
	if (pathname.includes("/hotel-management/new-reservation")) {
		if (isLimitedOrderTakerUser(user)) {
			return isOrderTakerReservationSearchAllowed(search);
		}
		return (
			hasRole(user, 3000) ||
			hasRole(user, 6000) ||
			hasRole(user, 7000) ||
			hasRole(user, 8000)
		);
	}
	if (pathname.includes("/hotel-management/financials")) {
		return (
			hasRole(user, 6000) ||
			hasRoleDescription(user, "finance") ||
			isLimitedOrderTakerUser(user)
		);
	}
	if (pathname.includes("/hotel-management/settings")) {
		return hasRole(user, 8000) || hasRoleDescription(user, "reservationemployee");
	}
	if (pathname.includes("/hotel-management/customer-service")) {
		return isScopedHotelUser(user) || hasRole(user, 2000) || isSystemAdminUser(user);
	}
	if (pathname.includes("/hotel-management/reservation-history")) {
		return false;
	}
	if (
		pathname.includes("/hotel-management/hotel-reports") ||
		pathname.includes("/hotel-management-payment")
	) {
		return hasRole(user, 6000);
	}
	if (pathname.includes("/hotel-management/house-keeping")) {
		return hasRole(user, 4000) || hasRole(user, 5000);
	}

	return false;
};

const getFirstAssignedHotelId = (user, routeHotelId = "") => {
	const possibleIds = [
		user?.hotelIdWork,
		...(Array.isArray(user?.hotelIdsWork) ? user.hotelIdsWork : []),
		...(Array.isArray(user?.hotelsToSupport) ? user.hotelsToSupport : []),
		...(Array.isArray(user?.hotelIdsOwner) ? user.hotelIdsOwner : []),
		routeHotelId,
	];
	return normalizeId(possibleIds.find((item) => normalizeId(item)));
};

const getLimitedAccountRedirect = (user, location, { hotelId, userId }) => {
	if (!user || isSuperAdminUser(user)) return null;
	const pathname = location?.pathname || "";
	const search = location?.search || "";
	if (!pathname.includes("/hotel-management")) return null;
	if (isPendingApplicationUser(user)) {
		return pathname.includes("/hotel-management/main-dashboard")
			? null
			: { pathname: "/hotel-management/main-dashboard" };
	}

	const isReceptionOnly =
		(hasRole(user, 3000) || hasRoleDescription(user, "reception")) &&
		!hasRole(user, 2000);
	const isOrderTakerOnly = isLimitedOrderTakerUser(user);
	const isReservationEmployeeOnly =
		(hasRole(user, 8000) || hasRoleDescription(user, "reservationemployee")) &&
		!hasRole(user, 2000) &&
		!isSystemAdminUser(user);

	if (!isReceptionOnly && !isOrderTakerOnly && !isReservationEmployeeOnly)
		return null;

	const isNewReservationPath = pathname.includes("/hotel-management/new-reservation");
	if (
		isOrderTakerOnly &&
		isNewReservationPath &&
		!isOrderTakerReservationSearchAllowed(search)
	) {
		return { pathname, search: "?newReservation" };
	}

	if (pathAllowsRole(pathname, user, search)) return null;

	const targetHotelId = getFirstAssignedHotelId(user, hotelId);
	const targetOwnerId =
		normalizeId(userId) || normalizeId(user?.belongsToId) || normalizeId(user?._id);

	if (!targetHotelId || !targetOwnerId) {
		return { pathname: "/", state: { from: location } };
	}

	return {
		pathname: `/hotel-management/new-reservation/${targetOwnerId}/${targetHotelId}`,
		search: isOrderTakerOnly
			? "?newReservation"
			: isReservationEmployeeOnly
			  ? "?pendingConfirmation"
			  : "?reserveARoom",
	};
};

const userCanAccessHotel = (user, { hotelId, userId, pathname, search }) => {
	if (!user) return false;
	if (user.activeUser === false) {
		return isPendingApplicationUser(user) && pathAllowsRole(pathname, user, search);
	}
	if (isSuperAdminUser(user)) return true;

	const role = Number(user.role);
	const urlHotelId = normalizeId(hotelId);
	const urlOwnerId = normalizeId(userId);

	if (!pathAllowsRole(pathname, user, search)) return false;

	if (!urlHotelId) {
		return (
			role === 2000 ||
			isSystemAdminUser(user) ||
			isScopedHotelUser(user)
		);
	}

	if (isSystemAdminUser(user)) {
		const supportIds = getSupportedHotelIds(user);
		return supportIds.includes(urlHotelId);
	}

	if (isScopedHotelUser(user)) {
		const assignedHotelId = normalizeId(user.hotelIdWork);
		const assignedOwnerId = normalizeId(user.belongsToId);
		const supportIds = getSupportedHotelIds(user);
		const ownerMatches =
			!urlOwnerId || !assignedOwnerId || assignedOwnerId === urlOwnerId;
		return (
			(assignedHotelId === urlHotelId || supportIds.includes(urlHotelId)) &&
			ownerMatches
		);
	}

	if (role === 2000) {
		return !urlOwnerId || normalizeId(user._id) === urlOwnerId;
	}

	return false;
};

// Legacy copy kept for compatibility while the clean RTL copy below drives the UI.
// eslint-disable-next-line no-unused-vars
const pendingApplicationText = (user = {}) => {
	const type = String(user.applicationReview?.type || "").toLowerCase();
	return {
		title: type === "job" ? "طلب الوظيفة قيد المراجعة" : "طلب الوكيل قيد المراجعة",
		body:
			type === "job"
				? "تم استلام طلبك وسيظهر للفندق المختار للمراجعة أو تحديد المقابلة. لن تتمكن من استخدام النظام حتى تتم الموافقة."
				: "تم استلام طلب الوكيل وسيظهر للفنادق المختارة للمراجعة. لن تتمكن من إنشاء حجوزات حتى تتم الموافقة من أحد الفنادق.",
		status: "قيد المراجعة",
		checking: "جاري التحقق...",
		refreshStatus: "تحديث حالة الطلب",
		stillPending: "لا يزال الطلب قيد المراجعة. سنقوم بتحديث الصفحة تلقائيا عند الموافقة.",
		checkFailed: "تعذر التحقق من الحالة الآن. يرجى المحاولة مرة أخرى بعد قليل.",
		approved: "تمت الموافقة على الحساب. سيتم فتح لوحة التحكم الآن.",
		signout: "تسجيل الخروج",
	};
};

const pendingApplicationTextClean = (user = {}) => {
	const type = String(user.applicationReview?.type || "").toLowerCase();
	return {
		title: type === "job" ? "طلب الوظيفة قيد المراجعة" : "طلب الوكيل قيد المراجعة",
		body:
			type === "job"
				? "تم استلام طلبك وسيظهر للفندق المختار للمراجعة أو تحديد المقابلة. لن تتمكن من استخدام النظام حتى تتم الموافقة."
				: "تم استلام طلب الوكيل وسيظهر للفنادق المختارة للمراجعة. لن تتمكن من إنشاء حجوزات حتى تتم الموافقة من أحد الفنادق.",
		status: "قيد المراجعة",
		checking: "جاري التحقق...",
		refreshStatus: "تحديث حالة الطلب",
		stillPending: "لا يزال الطلب قيد المراجعة. سنقوم بتحديث الصفحة تلقائيا عند الموافقة.",
		checkFailed: "تعذر التحقق من الحالة الآن. يرجى المحاولة مرة أخرى بعد قليل.",
		approved: "تمت الموافقة على الحساب. سيتم فتح لوحة التحكم الآن.",
		signout: "تسجيل الخروج",
	};
};

const PendingApplicationPage = ({ user = {} }) => {
	const text = pendingApplicationTextClean(user);
	const [checking, setChecking] = useState(false);
	const [approvedMessage, setApprovedMessage] = useState("");
	const [statusMessage, setStatusMessage] = useState("");

	const refreshApplicationStatus = async ({ showPendingMessage = false } = {}) => {
		const auth = isAuthenticated();
		if (!auth?.token || !auth?.user?._id) return;
		setChecking(true);
		if (showPendingMessage) setStatusMessage("");
		try {
			const latest = await getSingleUser(auth.user._id, auth.token);
			if (latest && !latest.error) {
				const nextAuth = {
					...auth,
					user: {
						...(auth.user || {}),
						...latest,
					},
				};
				localStorage.setItem("jwt", JSON.stringify(nextAuth));
				const stillPending =
					latest.activeUser === false &&
					String(latest.applicationReview?.status || "").toLowerCase() ===
						"pending";
				if (!stillPending) {
					setApprovedMessage(text.approved);
					window.setTimeout(() => {
						window.location.href = "/hotel-management/main-dashboard";
					}, 850);
				} else if (showPendingMessage) {
					setStatusMessage(text.stillPending);
				}
			} else if (showPendingMessage) {
				setStatusMessage(text.checkFailed);
			}
		} catch {
			if (showPendingMessage) setStatusMessage(text.checkFailed);
		} finally {
			setChecking(false);
		}
	};

	useEffect(() => {
		refreshApplicationStatus();
		const timer = window.setInterval(refreshApplicationStatus, 30000);
		return () => window.clearInterval(timer);
		// The status check reads current auth from localStorage intentionally.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div
			dir='rtl'
			style={{
				minHeight: "calc(100vh - 70px)",
				display: "grid",
				placeItems: "center",
				padding: "96px 18px 32px",
				background: "#f5f8fc",
			}}
		>
			<section
				style={{
					width: "min(680px, 100%)",
					border: "1px solid #cfe8ff",
					borderRadius: 14,
					background: "#fff",
					boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
					padding: "28px 24px",
					textAlign: "right",
				}}
			>
				<span
					style={{
						display: "inline-flex",
						marginBottom: 14,
						border: "1px solid #ffd591",
						borderRadius: 999,
						background: "#fff7e6",
						color: "#ad6800",
						fontWeight: 900,
						padding: "6px 12px",
					}}
				>
					{text.status}
				</span>
				<h1 style={{ color: "#102a43", fontSize: 26, margin: "0 0 12px" }}>
					{text.title}
				</h1>
				<p style={{ color: "#475467", fontWeight: 800, lineHeight: 1.8, margin: 0 }}>
					{text.body}
				</p>
				{approvedMessage && (
					<p
						style={{
							margin: "18px 0 0",
							color: "#027a48",
							fontWeight: 900,
						}}
					>
						{approvedMessage}
					</p>
				)}
				{statusMessage && !approvedMessage && (
					<p
						style={{
							margin: "18px 0 0",
							color: "#344054",
							fontWeight: 900,
						}}
					>
						{statusMessage}
					</p>
				)}
				<button
					type='button'
					onClick={() =>
						refreshApplicationStatus({ showPendingMessage: true })
					}
					disabled={checking}
					style={{
						marginTop: 22,
						marginInlineEnd: 10,
						border: 0,
						borderRadius: 10,
						background: checking ? "#8cbfff" : "#1677ff",
						color: "#fff",
						fontWeight: 900,
						padding: "10px 18px",
					}}
				>
					{checking ? text.checking : text.refreshStatus}
				</button>
				<button
					type='button'
					onClick={() => signout(() => { window.location.href = "/"; })}
					style={{
						marginTop: 12,
						border: 0,
						borderRadius: 10,
						background: "#344054",
						color: "#fff",
						fontWeight: 900,
						padding: "10px 18px",
					}}
				>
					{text.signout}
				</button>
			</section>
		</div>
	);
};

const HotelContextGate = ({ children, hotelId, userId }) => {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let isActive = true;

		const hydrateSelectedHotel = async () => {
			if (!hotelId) {
				if (isActive) setReady(true);
				return;
			}

			const auth = isAuthenticated();
			const fallbackUserId = auth?.user?._id;
			const storedHotel = readSelectedHotel();
			const storedMatches = storedHotel?._id === hotelId;
			const normalizedStored = normalizeSelectedHotel(storedHotel, {
				hotelId,
				userId,
				fallbackUserId,
			});

			if (storedMatches) {
				localStorage.setItem("selectedHotel", JSON.stringify(normalizedStored));
				if (isActive) setReady(true);
				return;
			}

			try {
				const response = await fetch(
					`${process.env.REACT_APP_API_URL}/hotel-details/${hotelId}?view=summary`,
					{ method: "GET" }
				);
				const data = await response.json();
				const normalized = normalizeSelectedHotel(data, {
					hotelId,
					userId,
					fallbackUserId,
				});
				localStorage.setItem("selectedHotel", JSON.stringify(normalized));
			} catch (err) {
				console.error("Failed to load selected hotel details", err);
				const fallback = normalizeSelectedHotel({}, {
					hotelId,
					userId,
					fallbackUserId,
				});
				localStorage.setItem("selectedHotel", JSON.stringify(fallback));
			}

			if (isActive) setReady(true);
		};

		hydrateSelectedHotel();

		return () => {
			isActive = false;
		};
	}, [hotelId, userId]);

	if (!ready) {
		return <div>Loading...</div>;
	}

	return children;
};

const HotelRoute = ({ component: Component, ...rest }) => (
	<Route
		{...rest}
		render={(props) => {
			const auth = isAuthenticated();
			const user = auth?.user;
			const { hotelId, userId } = props.match?.params || {};
			const limitedAccountRedirect = getLimitedAccountRedirect(
				user,
				props.location,
				{ hotelId, userId }
			);

			if (limitedAccountRedirect) {
				return <Redirect to={limitedAccountRedirect} />;
			}

			const isAllowed =
				auth &&
				userCanAccessHotel(user, {
					hotelId,
					userId,
					pathname: props.location?.pathname || "",
					search: props.location?.search || "",
				});

			if (!isAllowed) {
				return (
					<Redirect
						to={{
							pathname: "/",
							state: { from: props.location },
						}}
					/>
				);
			}

			if (isPendingApplicationUser(user)) {
				return <PendingApplicationPage user={user} />;
			}

			const isHotelManagement =
				props.location?.pathname?.includes("/hotel-management");

			if (isHotelManagement && hotelId) {
				return (
					<HotelContextGate hotelId={hotelId} userId={userId}>
						<Component {...props} />
					</HotelContextGate>
				);
			}

			return <Component {...props} />;
		}}
	/>
);

export default HotelRoute;
