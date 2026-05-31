import React, { useEffect, useMemo, useState } from "react";
import { EyeOutlined } from "@ant-design/icons";
import { message } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { getOverallAccounts } from "../../apiAdmin";
import {
	previewHotelStaffDashboard,
	startDashboardPreview,
} from "../../../auth";
import { isSuperAdminUser } from "../../../AdminModule/utils/superUsers";
import {
	ActionButton,
	buildOwnerParams,
	formatDate,
	getOverallText,
	localizeStatus,
	normalizeId,
	OVERALL_PAGE_SIZE,
	OverallPageShell,
	OverallTableWrap,
	OverallToolbar,
	Pager,
	pageRowNumber,
	roleLabel,
	StatusPill,
	statusTone,
	titleCase,
} from "../overallShared";
import MultiSelectFilter from "./MultiSelectFilter";

const ACCOUNT_MAIN_TEXT = {
	en: {
		hotelEmployeesTab: "Hotel Employees",
		externalAgentsTab: "External Agents",
		company: "Company",
		permissions: "Permissions",
		updateAccount: "Update",
		previewAccount: "Preview account dashboard",
		previewOpened: "Account preview opened.",
		previewFailed: "Unable to start account preview.",
		previewDenied: "Only super admins can open another account dashboard.",
		missingHotelScope: "Hotel scope was not found for this account.",
	},
	ar: {
		company: "اسم الشركة",
		permissions: "الصلاحيات",
		updateAccount: "تعديل",
	},
};

const ACCOUNT_PREVIEW_TEXT = {
	en: {
		previewAccount: "Preview account dashboard",
		previewOpened: "Account preview opened.",
		previewFailed: "Unable to start account preview.",
		previewDenied: "Only super admins can open another account dashboard.",
		missingHotelScope: "Hotel scope was not found for this account.",
	},
	ar: {
		previewAccount: "معاينة لوحة الحساب",
		previewOpened: "تم فتح معاينة الحساب.",
		previewFailed: "تعذر بدء معاينة الحساب.",
		missingHotelScope: "لم يتم العثور على نطاق فندقي لهذا الحساب.",
	},
};

const ACCOUNT_VIEW_EMPLOYEES = "employees";
const ACCOUNT_VIEW_AGENTS = "agents";
const EMPLOYEE_ROLE_VALUES = [
	"systemadmin",
	"hotelmanager",
	"reception",
	"finance",
	"reservationemployee",
	"housekeepingmanager",
	"housekeeping",
];
const AGENT_ROLE_VALUES = ["ordertaker"];

const accountViewFromSearch = (search = "") => {
	const value = new URLSearchParams(search || "").get("accountView");
	return value === ACCOUNT_VIEW_AGENTS ? ACCOUNT_VIEW_AGENTS : ACCOUNT_VIEW_EMPLOYEES;
};

const isExternalAgentAccount = (account = {}) => {
	const roles = [
		Number(account.role),
		...(Array.isArray(account.roles) ? account.roles.map(Number) : []),
	];
	const descriptions = [
		account.roleDescription,
		...(Array.isArray(account.roleDescriptions) ? account.roleDescriptions : []),
	].map((item) => String(item || "").toLowerCase());
	return roles.includes(7000) || descriptions.includes("ordertaker");
};

const ACCESS_TEXT = {
	overall: { en: "Overall Dashboard", ar: "لوحة التحكم العامة" },
	dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
	reservations: { en: "Reservations", ar: "الحجوزات" },
	ownReservations: { en: "Own Reservations", ar: "حجوزاته فقط" },
	newReservation: { en: "New Reservation", ar: "حجز جديد" },
	reports: { en: "Reports", ar: "التقارير" },
	finance: { en: "Finance", ar: "المالية" },
	housekeeping: { en: "Housekeeping", ar: "النظافة" },
	settings: { en: "Settings", ar: "الإعدادات" },
};

const accountHotelTargets = (account = {}, scopedHotels = []) => {
	const scopedHotelMap = new Map(
		scopedHotels.map((hotel) => [normalizeId(hotel._id), hotel])
	);
	const picked = [];
	const appendHotel = (hotelOrId) => {
		const id = normalizeId(hotelOrId);
		if (!id || picked.some((hotel) => hotel._id === id)) return;
		const scopedHotel = scopedHotelMap.get(id) || {};
		const source =
			hotelOrId && typeof hotelOrId === "object" ? hotelOrId : scopedHotel;
		picked.push({
			_id: id,
			hotelName: source.hotelName || source.name || scopedHotel.hotelName || id,
			ownerId: normalizeId(
				source.ownerId ||
					source.belongsTo?._id ||
					source.belongsTo ||
					scopedHotel.ownerId ||
					scopedHotel.belongsTo?._id ||
					scopedHotel.belongsTo
			),
		});
	};

	const ownerHotels = Array.isArray(account.hotelIdsOwner)
		? account.hotelIdsOwner
		: [];
	const workHotels = Array.isArray(account.hotelIdsWork)
		? account.hotelIdsWork
		: [];
	const supportHotels = Array.isArray(account.hotelsToSupport)
		? account.hotelsToSupport
		: [];
	[...ownerHotels, ...workHotels, ...supportHotels, account.hotelIdWork].forEach(
		appendHotel
	);
	return picked;
};

const hotelListText = (account = {}, scopedHotels = []) => {
	const hotels = accountHotelTargets(account, scopedHotels)
		.map((hotel) => hotel.hotelName)
		.filter(Boolean);
	return [...new Set(hotels)].map(titleCase).join(", ") || "-";
};

const accountRoleText = (account = {}, chosenLanguage) => {
	const descriptions = [
		...(Array.isArray(account.roleDescriptions) ? account.roleDescriptions : []),
		account.roleDescription,
	]
		.map((item) => String(item || "").toLowerCase())
		.filter(Boolean);
	const uniqueDescriptions = [...new Set(descriptions)];
	if (!uniqueDescriptions.length) return roleLabel(account, chosenLanguage);
	return uniqueDescriptions
		.map((description) =>
			roleLabel({ ...account, roleDescription: description }, chosenLanguage)
		)
		.join(" / ");
};

const accessLabels = (account = {}, isRTL = false) =>
	(Array.isArray(account.accessTo) ? account.accessTo : [])
		.map((access) => ACCESS_TEXT[access]?.[isRTL ? "ar" : "en"] || access)
		.filter(Boolean);

const accountStatusInfo = (account = {}, isRTL = false) => {
	const reviewStatus = String(account.applicationReview?.status || "").toLowerCase();
	if (account.activeUser === false && reviewStatus === "pending") {
		return {
			value: "pending review",
			label: isRTL ? "قيد المراجعة" : "Pending review",
		};
	}
	return {
		value: account.activeUser ? "active" : "inactive",
		label: null,
	};
};

const getDashboardRoleNumbers = (user = {}) =>
	[
		Number(user.role),
		...(Array.isArray(user.roles) ? user.roles.map(Number) : []),
	].filter(Boolean);

const getDashboardRoleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const getPrimaryScopedRole = (user = {}) => {
	const roleNumbers = getDashboardRoleNumbers(user);
	const roleDescriptions = getDashboardRoleDescriptions(user);
	const hasRole = (role) => roleNumbers.includes(Number(role));
	const hasRoleDescription = (description) =>
		roleDescriptions.includes(String(description || "").toLowerCase());

	if (hasRole(2000) || hasRoleDescription("hotelmanager")) return "hotelmanager";
	if (hasRole(3000) || hasRoleDescription("reception")) return "reception";
	if (hasRole(4000) || hasRoleDescription("housekeepingmanager")) {
		return "housekeepingmanager";
	}
	if (hasRole(5000) || hasRoleDescription("housekeeping")) return "housekeeping";
	if (hasRole(6000) || hasRoleDescription("finance")) return "finance";
	if (hasRole(8000) || hasRoleDescription("reservationemployee")) {
		return "reservationemployee";
	}
	if (hasRole(7000) || hasRoleDescription("ordertaker")) return "ordertaker";
	return "user";
};

const isPreviewOwnerLike = (user = {}) => {
	const roleNumbers = getDashboardRoleNumbers(user);
	const roleDescriptions = getDashboardRoleDescriptions(user);
	const hasRole = (role) => roleNumbers.includes(Number(role));
	const hasRoleDescription = (description) =>
		roleDescriptions.includes(String(description || "").toLowerCase());

	return (
		hasRole(10000) ||
		hasRoleDescription("systemadmin") ||
		hasRoleDescription("system admin") ||
		(hasRole(2000) && !normalizeId(user.belongsToId))
	);
};

const getScopedRouteForRole = (roleKey, ownerId, hotelId, action = "primary") => {
	if (!ownerId || !hotelId) return "/hotel-management/main-dashboard";

	if (roleKey === "ordertaker") {
		if (action === "todos") {
			return `/hotel-management/financials/${ownerId}/${hotelId}?focus=todos`;
		}
		if (action === "finance") {
			return `/hotel-management/financials/${ownerId}/${hotelId}`;
		}
		return `/hotel-management/new-reservation/${ownerId}/${hotelId}${
			action === "list" ? "?list=&page=1" : "?newReservation"
		}`;
	}
	if (roleKey === "reception") {
		return `/hotel-management/new-reservation/${ownerId}/${hotelId}${
			action === "list" ? "?list=&page=1" : "?reserveARoom"
		}`;
	}
	if (roleKey === "reservationemployee") {
		return `/hotel-management/new-reservation/${ownerId}/${hotelId}${
			action === "list"
				? "?list=&page=1"
				: action === "newReservation"
				? "?newReservation"
				: "?pendingConfirmation"
		}`;
	}
	if (roleKey === "housekeeping" || roleKey === "housekeepingmanager") {
		return `/hotel-management/house-keeping/${ownerId}/${hotelId}`;
	}
	if (roleKey === "finance") {
		return action === "payment"
			? `/hotel-management-payment/${ownerId}/${hotelId}`
			: action === "reservations"
			? `/hotel-management/new-reservation/${ownerId}/${hotelId}?list=&page=1`
			: `/hotel-management/financials/${ownerId}/${hotelId}`;
	}

	return `/hotel-management/dashboard/${ownerId}/${hotelId}`;
};

const getPreviewRouteForUser = (user = {}, ownerId = "", hotelId = "") => {
	if (isPreviewOwnerLike(user)) {
		const previewOwnerId = ownerId || normalizeId(user._id);
		return `/hotel-management/main-dashboard${
			previewOwnerId ? `?ownerId=${previewOwnerId}` : ""
		}`;
	}
	return getScopedRouteForRole(getPrimaryScopedRole(user), ownerId, hotelId);
};

const AccountManagementMain = ({
	userId,
	token,
	ownerId,
	chosenLanguage,
	setAccountsModalHotels,
}) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = {
		...common,
		...ACCOUNT_MAIN_TEXT[isRTL ? "ar" : "en"],
		...ACCOUNT_PREVIEW_TEXT[isRTL ? "ar" : "en"],
	};
	const history = useHistory();
	const location = useLocation();
	const [activeAccountView, setActiveAccountView] = useState(() =>
		accountViewFromSearch(location.search)
	);
	const [filters, setFilters] = useState({
		search: "",
		role: [],
		status: [],
		hotelId: [],
	});
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [previewingAccountId, setPreviewingAccountId] = useState("");
	const [result, setResult] = useState({ accounts: [], hotels: [], total: 0 });
	const canPreviewAccounts = isSuperAdminUser(userId);
	const effectiveRoleFilter = useMemo(() => {
		if (Array.isArray(filters.role) && filters.role.length) return filters.role;
		return activeAccountView === ACCOUNT_VIEW_AGENTS
			? AGENT_ROLE_VALUES
			: EMPLOYEE_ROLE_VALUES;
	}, [activeAccountView, filters.role]);

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			...filters,
			role: effectiveRoleFilter,
			page,
			limit: OVERALL_PAGE_SIZE,
		}),
		[effectiveRoleFilter, filters, ownerId, page]
	);

	useEffect(() => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallAccounts(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { accounts: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	}, [params, token, userId]);

	useEffect(() => {
		const nextView = accountViewFromSearch(location.search);
		setActiveAccountView((previousView) => {
			if (previousView === nextView) return previousView;
			setFilters((previous) => ({ ...previous, role: [] }));
			setPage(1);
			return nextView;
		});
	}, [location.search]);

	const accounts = useMemo(
		() => (Array.isArray(result.accounts) ? result.accounts : []),
		[result.accounts]
	);
	const hotels = useMemo(
		() => (Array.isArray(result.hotels) ? result.hotels : []),
		[result.hotels]
	);
	const pages = Math.max(Number(result.pages || 1), 1);

	useEffect(() => {
		if (typeof setAccountsModalHotels === "function") {
			setAccountsModalHotels(hotels);
		}
	}, [hotels, setAccountsModalHotels]);

	const allRoleOptions = [
		{ value: "systemadmin", label: labels.systemAdmin },
		{ value: "hotelmanager", label: labels.hotelManager },
		{ value: "reception", label: labels.reception },
		{ value: "finance", label: labels.finance },
		{ value: "reservationemployee", label: labels.reservationsOfficer },
		{ value: "housekeepingmanager", label: labels.housekeepingManager },
		{ value: "housekeeping", label: labels.housekeepingRole },
		{ value: "ordertaker", label: labels.externalAgent },
	];
	const allowedRoleValues =
		activeAccountView === ACCOUNT_VIEW_AGENTS
			? AGENT_ROLE_VALUES
			: EMPLOYEE_ROLE_VALUES;
	const roleOptions = allRoleOptions.filter((option) =>
		allowedRoleValues.includes(option.value)
	);
	const accountViewOptions = [
		{
			value: ACCOUNT_VIEW_EMPLOYEES,
			label: isRTL
				? "\u0645\u0648\u0638\u0641\u0648 \u0627\u0644\u0641\u0646\u0627\u062f\u0642"
				: labels.hotelEmployeesTab,
		},
		{
			value: ACCOUNT_VIEW_AGENTS,
			label: isRTL
				? "\u0627\u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u062e\u0627\u0631\u062c\u064a\u0648\u0646"
				: labels.externalAgentsTab,
		},
	];
	const statusOptions = [
		{ value: "active", label: labels.active },
		{ value: "inactive", label: labels.inactive },
	];
	const hotelOptions = hotels.map((hotel) => ({
		value: hotel._id,
		label: titleCase(hotel.hotelName || "Hotel"),
	}));
	const selectedLabel = isRTL ? "محدد" : "selected";

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
	};

	const handleAccountViewChange = (nextView) => {
		const view =
			nextView === ACCOUNT_VIEW_AGENTS ? ACCOUNT_VIEW_AGENTS : ACCOUNT_VIEW_EMPLOYEES;
		setActiveAccountView(view);
		setFilters((previous) => ({ ...previous, role: [] }));
		setPage(1);
		const query = new URLSearchParams(location.search || "");
		if (view === ACCOUNT_VIEW_EMPLOYEES) query.delete("accountView");
		else query.set("accountView", view);
		query.set("page", "1");
		history.replace({
			pathname: location.pathname,
			search: `?${query.toString()}`,
		});
	};

	const openAccountEditor = (account = {}) => {
		const searchParams = new URLSearchParams(location.search || "");
		searchParams.set("overall", "update-account");
		searchParams.delete("modal");
		searchParams.delete("accountTab");
		if (isExternalAgentAccount(account)) {
			searchParams.set("accountView", ACCOUNT_VIEW_AGENTS);
		} else {
			searchParams.delete("accountView");
		}
		if (account._id) searchParams.set("accountId", account._id);
		history.push({
			pathname: location.pathname,
			search: `?${searchParams.toString()}`,
		});
	};

	const getPreviewHotelId = (account = {}) => {
		const target = accountHotelTargets(account, hotels).find((hotel) =>
			normalizeId(hotel._id)
		);
		return normalizeId(target?._id);
	};

	const buildPreviewSelectedHotel = (account = {}, hotelId = "", preview = {}) => {
		const targetHotel =
			hotels.find((hotel) => normalizeId(hotel._id) === normalizeId(hotelId)) ||
			accountHotelTargets(account, hotels).find(
				(hotel) => normalizeId(hotel._id) === normalizeId(hotelId)
			) ||
			{};
		const previewOwnerId =
			normalizeId(preview.ownerId) ||
			normalizeId(targetHotel.ownerId) ||
			normalizeId(targetHotel.belongsTo?._id || targetHotel.belongsTo) ||
			normalizeId(account.belongsToId) ||
			normalizeId(ownerId);

		return {
			...targetHotel,
			_id: normalizeId(hotelId),
			hotelName:
				targetHotel.hotelName ||
				targetHotel.name ||
				account.hotelName ||
				preview.hotelName ||
				"Hotel",
			belongsTo: previewOwnerId
				? {
						...(targetHotel.belongsTo &&
						typeof targetHotel.belongsTo === "object"
							? targetHotel.belongsTo
							: {}),
						_id: previewOwnerId,
				  }
				: targetHotel.belongsTo,
		};
	};

	const startAccountPreview = (account = {}) => {
		if (!canPreviewAccounts) {
			message.error(
				isRTL
					? "\u064a\u0645\u0643\u0646 \u0644\u0644\u0645\u0634\u0631\u0641\u064a\u0646 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u064a\u0646 \u0641\u0642\u0637 \u0641\u062a\u062d \u0644\u0648\u062d\u0629 \u062d\u0633\u0627\u0628 \u0622\u062e\u0631."
					: labels.previewDenied ||
					"Only super admins can open another account dashboard."
			);
			return;
		}
		const hotelId = getPreviewHotelId(account);
		if (!hotelId) {
			message.error(labels.missingHotelScope);
			return;
		}
		if (!account?._id || !userId || !token) {
			message.error(labels.previewFailed);
			return;
		}

		setPreviewingAccountId(account._id);
		previewHotelStaffDashboard(userId, token, hotelId, account._id)
			.then((data) => {
				if (data?.error || !data?.token || !data?.user) {
					message.error(data?.error || labels.previewFailed);
					return;
				}

				const selectedHotel = buildPreviewSelectedHotel(
					account,
					hotelId,
					data.preview
				);
				const previewOwnerId =
					normalizeId(data.preview?.ownerId) ||
					normalizeId(selectedHotel.belongsTo?._id || selectedHotel.belongsTo) ||
					normalizeId(data.user?.belongsToId) ||
					normalizeId(account.belongsToId) ||
					normalizeId(ownerId) ||
					normalizeId(data.user?._id);

				startDashboardPreview({
					auth: { token: data.token, user: data.user },
					preview: data.preview,
					selectedHotel,
				});
				message.success(labels.previewOpened);
				history.push(getPreviewRouteForUser(data.user, previewOwnerId, hotelId));
			})
			.catch(() => message.error(labels.previewFailed))
			.finally(() => setPreviewingAccountId(""));
	};

	return (
		<OverallPageShell $isRTL={isRTL}>
			<AccountTabs>
				{accountViewOptions.map((tab) => (
					<button
						key={tab.value}
						type='button'
						className={activeAccountView === tab.value ? "active" : ""}
						onClick={() => handleAccountViewChange(tab.value)}
					>
						{tab.label}
					</button>
				))}
			</AccountTabs>

			<OverallToolbar
				onSubmit={(event) => {
					event.preventDefault();
					setPage(1);
				}}
			>
				<input
					value={filters.search}
					onChange={(event) => updateFilter("search", event.target.value)}
					placeholder={labels.searchAccountCompanyPlaceholder}
				/>
				<MultiSelectFilter
					value={filters.hotelId}
					options={hotelOptions}
					onChange={(value) => updateFilter("hotelId", value)}
					allLabel={labels.allHotels}
					selectedLabel={selectedLabel}
					isRTL={isRTL}
				/>
				<MultiSelectFilter
					value={filters.role}
					options={roleOptions}
					onChange={(value) => updateFilter("role", value)}
					allLabel={labels.allRoles}
					selectedLabel={selectedLabel}
					isRTL={isRTL}
				/>
				<MultiSelectFilter
					value={filters.status}
					options={statusOptions}
					onChange={(value) => updateFilter("status", value)}
					allLabel={labels.allStatuses}
					selectedLabel={selectedLabel}
					isRTL={isRTL}
				/>
				<button type='submit'>{labels.search}</button>
				<button
					type='button'
					className='secondary'
					onClick={() => {
						setFilters({ search: "", role: [], status: [], hotelId: [] });
						setPage(1);
					}}
				>
					{labels.reset}
				</button>
			</OverallToolbar>

			<AccountTableWrap $isRTL={isRTL}>
				<table>
					<colgroup>
						<col className='account-col-index' />
						<col className='account-col-name' />
						<col className='account-col-hotels' />
						<col className='account-col-role' />
						<col className='account-col-company' />
						<col className='account-col-permissions' />
						<col className='account-col-status' />
						<col className='account-col-created' />
						<col className='account-col-action' />
					</colgroup>
					<thead>
						<tr>
							<th>#</th>
							<th>{labels.name}</th>
							<th>{labels.hotels}</th>
							<th>{labels.role}</th>
							<th>{labels.company}</th>
							<th>{labels.permissions}</th>
							<th>{labels.status}</th>
							<th>{labels.created}</th>
							<th>{labels.action}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='9'>{labels.loading}</td>
							</tr>
						) : accounts.length ? (
							accounts.map((account, index) => {
								const accountHotels = accountHotelTargets(account, hotels);
								const permissions = accessLabels(account, isRTL);
								return (
									<tr key={account._id}>
										<td className='account-index' data-label='#'>
											{pageRowNumber(page, index, OVERALL_PAGE_SIZE)}
										</td>
										<td className='account-identity-cell' data-label={labels.name}>
											<AccountIdentity>
												{canPreviewAccounts ? (
													<AccountPreviewButton
														type='button'
														onClick={() => startAccountPreview(account)}
														disabled={previewingAccountId === account._id}
														title={labels.previewAccount}
													>
														<span className='account-name-line'>
															<EyeOutlined />
															<strong>{account.name || "-"}</strong>
														</span>
														<span className='account-contact' dir='auto'>
															{account.email || account.phone || "-"}
														</span>
													</AccountPreviewButton>
												) : (
													<AccountIdentityText>
														<span className='account-name-line'>
															<strong>{account.name || "-"}</strong>
														</span>
														<span className='account-contact' dir='auto'>
															{account.email || account.phone || "-"}
														</span>
													</AccountIdentityText>
												)}
											</AccountIdentity>
										</td>
										<td className='account-hotels-cell' data-label={labels.hotels}>
											<AccountTags>
												{accountHotels.length ? (
													accountHotels.map((hotel) => (
														<span key={hotel._id}>
															{titleCase(hotel.hotelName)}
														</span>
													))
												) : (
													<em>{hotelListText(account, hotels)}</em>
												)}
											</AccountTags>
										</td>
										<td className='account-text-cell' data-label={labels.role}>
											{accountRoleText(account, chosenLanguage)}
										</td>
										<td className='account-text-cell' data-label={labels.company}>
											{account.companyName ||
												account.companyOfficialName ||
												"-"}
										</td>
										<td
											className='account-permissions-cell'
											data-label={labels.permissions}
										>
											<AccountTags>
												{permissions.length ? (
													permissions.map((access) => (
														<span key={access}>{access}</span>
													))
												) : (
													<em>-</em>
												)}
											</AccountTags>
										</td>
										<td className='account-status-cell' data-label={labels.status}>
											{(() => {
												const status = accountStatusInfo(account, isRTL);
												return (
											<StatusPill
												$tone={statusTone(
													status.value
												)}
											>
												{status.label ||
													localizeStatus(status.value, chosenLanguage)}
											</StatusPill>
												);
											})()}
										</td>
										<td className='account-date-cell' data-label={labels.created}>
											{formatDate(account.createdAt, chosenLanguage)}
										</td>
										<td className='account-action-cell' data-label={labels.action}>
											<ActionButton
												type='button'
												onClick={() => openAccountEditor(account)}
											>
												{labels.updateAccount}
											</ActionButton>
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td colSpan='9'>{labels.noAccountsFound}</td>
							</tr>
						)}
					</tbody>
				</table>
			</AccountTableWrap>

			<Pager>
				<button type='button' disabled={page <= 1} onClick={() => setPage(page - 1)}>
					{labels.previous}
				</button>
				<span>
					{labels.page} {page} {labels.of} {pages} ({Number(result.total || 0)})
				</span>
				<button
					type='button'
					disabled={page >= pages}
					onClick={() => setPage(page + 1)}
				>
					{labels.next}
				</button>
			</Pager>
		</OverallPageShell>
	);
};

export default AccountManagementMain;

const AccountTabs = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
	min-width: 0;
	padding: 8px;
	border: 1px solid rgba(45, 93, 145, 0.22);
	border-radius: 8px;
	background:
		linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 251, 255, 0.98) 100%),
		linear-gradient(180deg, rgba(141, 76, 157, 0.12), rgba(16, 32, 51, 0.08));
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.9),
		0 8px 22px rgba(16, 32, 51, 0.06);

	button {
		position: relative;
		overflow: hidden;
		min-width: 0;
		min-height: 46px;
		padding: 9px 12px;
		border: 1px solid rgba(45, 93, 145, 0.18);
		border-radius: 8px;
		background: linear-gradient(180deg, #ffffff 0%, #f4f8fe 100%);
		color: #102033;
		cursor: pointer;
		font-size: 0.84rem;
		font-weight: 950;
		line-height: 1.2;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease,
			color 0.18s ease,
			transform 0.18s ease;
	}

	button.active {
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 36%),
			linear-gradient(135deg, #102033 0%, #352044 48%, #6f1f78 100%);
		border-color: rgba(183, 123, 198, 0.72);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.2),
			inset 0 -1px 0 rgba(0, 0, 0, 0.22),
			0 10px 22px rgba(80, 23, 96, 0.24);
		color: #ffffff;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.24);
		transform: translateY(-1px);
	}

	button.active::after {
		content: "";
		position: absolute;
		inset-inline: 18px;
		bottom: 6px;
		height: 3px;
		border-radius: 999px;
		background: linear-gradient(90deg, #d7b5df, #ffffff, #67a7df);
		box-shadow: 0 0 12px rgba(215, 181, 223, 0.72);
	}

	button:hover:not(.active),
	button:focus-visible:not(.active) {
		background: linear-gradient(180deg, #244e7d 0%, #102033 100%);
		border-color: rgba(45, 93, 145, 0.35);
		color: #ffffff;
		outline: none;
	}

	@media (max-width: 560px) {
		grid-template-columns: 1fr;

		button {
			min-height: 42px;
		}
	}
`;

const AccountTableWrap = styled(OverallTableWrap)`
	border-color: #d7e9fb;
	border-radius: 10px;
	box-shadow: 0 10px 26px rgba(15, 23, 42, 0.07);

	table {
		min-width: 1366px;
		table-layout: fixed;
		border-collapse: separate;
		border-spacing: 0;
	}

	.account-col-index {
		width: 44px;
	}

	.account-col-name {
		width: 220px;
	}

	.account-col-hotels {
		width: 300px;
	}

	.account-col-role {
		width: 140px;
	}

	.account-col-company {
		width: 190px;
	}

	.account-col-permissions {
		width: 230px;
	}

	.account-col-status {
		width: 76px;
	}

	.account-col-created {
		width: 98px;
	}

	.account-col-action {
		width: 68px;
	}

	th,
	td {
		border: 0;
		border-bottom: 1px solid #e8f0f8;
		padding: 10px 12px;
		white-space: normal;
		overflow-wrap: anywhere;
		word-break: normal;
		line-height: 1.45;
		vertical-align: top;
	}

	th {
		background: linear-gradient(180deg, #fbfdff 0%, #f3f8fd 100%);
		color: #1f3f5f;
		font-size: 11.5px;
		font-weight: 900;
		white-space: nowrap;
	}

	tbody tr:nth-child(even) td {
		background: #fcfdff;
	}

	tbody tr:hover td {
		background: #f5fbff;
	}

	tbody tr:last-child td {
		border-bottom: 0;
	}

	.account-index,
	.account-status-cell,
	.account-date-cell,
	.account-action-cell {
		vertical-align: middle;
	}

	.account-index,
	.account-status-cell,
	.account-date-cell,
	.account-action-cell {
		text-align: center;
	}

	.account-text-cell {
		color: #1f2937;
		font-weight: 700;
	}

	.account-date-cell {
		white-space: nowrap;
		color: #344054;
		font-weight: 800;
	}

	.account-action-cell ${ActionButton} {
		width: 100%;
		min-height: 34px;
		padding-inline: 0.55rem;
	}

	@media (max-width: 720px) {
		overflow-x: visible;
		border: 0;
		border-radius: 0;
		background: transparent;
		box-shadow: none;

		table,
		colgroup,
		tbody,
		tr,
		td {
			display: block;
			width: 100%;
			min-width: 0;
		}

		table {
			border-spacing: 0;
		}

		colgroup,
		thead {
			display: none;
		}

		tbody {
			display: grid;
			gap: 0.8rem;
		}

		tr {
			border: 1px solid #d7e9fb;
			border-radius: 12px;
			background: #fff;
			box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
			overflow: hidden;
		}

		td {
			display: grid;
			grid-template-columns: minmax(92px, 34%) minmax(0, 1fr);
			align-items: start;
			gap: 0.65rem;
			min-height: 42px;
			padding: 0.7rem 0.85rem;
			border-bottom: 1px solid #edf4fb;
			text-align: start;
		}

		td::before {
			content: attr(data-label);
			color: #667085;
			font-size: 0.72rem;
			font-weight: 900;
			line-height: 1.35;
		}

		td:last-child {
			border-bottom: 0;
		}

		.account-index {
			background: #f7fbff;
			color: #0f4f86;
			font-weight: 900;
		}

		.account-status-cell,
		.account-date-cell,
		.account-action-cell {
			text-align: start;
		}

		.account-action-cell ${ActionButton} {
			width: fit-content;
			min-width: 92px;
		}
	}

	@media (max-width: 420px) {
		margin-inline: 0;
		width: 100%;

		td {
			grid-template-columns: 1fr;
			gap: 0.35rem;
		}

		.account-action-cell ${ActionButton} {
			width: 100%;
		}
	}
`;

const AccountIdentity = styled.div`
	display: grid;
	gap: 0.2rem;
	min-width: 0;

	strong {
		color: #0f4f86;
		font-size: 0.82rem;
		font-weight: 900;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	span {
		color: #47627d;
		font-size: 0.74rem;
		font-weight: 700;
		min-width: 0;
		overflow-wrap: anywhere;
	}
`;

const AccountPreviewButton = styled.button`
	display: grid;
	gap: 0.22rem;
	min-width: 0;
	width: 100%;
	border: 0;
	background: transparent;
	padding: 0;
	text-align: inherit;
	cursor: pointer;

	.account-name-line {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
		color: #0f4f86;
	}

	.account-name-line strong {
		min-width: 0;
	}

	.account-contact {
		color: #475467;
		line-height: 1.35;
	}

	svg {
		flex: 0 0 auto;
		color: #667085;
		font-size: 0.86rem;
	}

	strong {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	&:hover strong {
		color: #0874d1;
	}

	&:disabled {
		cursor: wait;
		opacity: 0.65;
	}
`;

const AccountIdentityText = styled.div`
	display: grid;
	gap: 0.22rem;
	min-width: 0;
	width: 100%;

	.account-name-line {
		display: inline-flex;
		align-items: center;
		min-width: 0;
		color: #17324d;
	}

	.account-contact {
		color: #475467;
		line-height: 1.35;
	}
`;

const AccountTags = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 0.32rem;
	flex-wrap: wrap;
	min-width: 0;
	max-width: 100%;

	span {
		display: inline-flex;
		align-items: center;
		max-width: 100%;
		min-height: 22px;
		border: 1px solid #8bd8d2;
		border-radius: 5px;
		background: #e8fffb;
		color: #00827a;
		font-size: 0.72rem;
		font-weight: 800;
		line-height: 1.25;
		padding: 0.12rem 0.42rem;
		white-space: normal;
		overflow-wrap: anywhere;
	}

	em {
		color: #667085;
		font-style: normal;
		font-weight: 800;
		overflow-wrap: anywhere;
	}
`;
