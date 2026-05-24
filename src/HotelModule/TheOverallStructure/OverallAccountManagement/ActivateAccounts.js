import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { message } from "antd";
import {
	getOverallAccounts,
	updateOverallSystemAdmin,
} from "../../apiAdmin";
import { updateHotelStaffUser } from "../../../auth";
import {
	ActionButton,
	buildOwnerParams,
	formatDate,
	getOverallText,
	InlineNote,
	localizeStatus,
	normalizeId,
	OVERALL_PAGE_SIZE,
	OverallPageShell,
	OverallTableWrap,
	OverallToolbar,
	Pager,
	pageRowNumber,
	singleHotelRoute,
	StatusPill,
	statusTone,
	titleCase,
} from "../overallShared";
import MultiSelectFilter from "./MultiSelectFilter";

const ACTIVATE_ACCOUNTS_TEXT = {
	en: {
		title: "Activate Accounts",
		subtitle: "Activate or deactivate pending and inactive accounts in this hotel group",
	},
	ar: {
		title: "تفعيل الحسابات",
		subtitle: "تفعيل أو إلغاء تفعيل الحسابات المعلقة وغير النشطة في هذه المجموعة",
	},
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
					source.belongsTo ||
					scopedHotel.ownerId ||
					scopedHotel.belongsTo ||
					account.belongsToId ||
					account._id
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

const accountRoleNumbers = (account = {}) =>
	[
		Number(account.role),
		...(Array.isArray(account.roles) ? account.roles.map(Number) : []),
	].filter(Boolean);

const accountRoleDescriptions = (account = {}) =>
	[
		String(account.roleDescription || "").toLowerCase(),
		...(Array.isArray(account.roleDescriptions)
			? account.roleDescriptions.map((item) => String(item || "").toLowerCase())
			: []),
	].filter(Boolean);

const isSystemAdminAccount = (account = {}) =>
	accountRoleNumbers(account).includes(10000) ||
	accountRoleDescriptions(account).includes("systemadmin") ||
	accountRoleDescriptions(account).includes("system admin");

const ActivateAccounts = ({
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
		...ACTIVATE_ACCOUNTS_TEXT[isRTL ? "ar" : "en"],
	};
	const history = useHistory();
	const [filters, setFilters] = useState({ search: "", status: ["inactive"] });
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [updatingId, setUpdatingId] = useState("");
	const [result, setResult] = useState({ accounts: [], hotels: [], total: 0 });

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			status: filters.status,
			search: filters.search,
			page,
			limit: OVERALL_PAGE_SIZE,
		}),
		[filters, ownerId, page]
	);

	const loadAccounts = () => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallAccounts(userId, token, params)
			.then((data) => {
				setResult(data && !data.error ? data : { accounts: [], hotels: [], total: 0 });
			})
			.finally(() => setLoading(false));
	};

	useEffect(loadAccounts, [params, token, userId]);

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
	};
	const statusOptions = [
		{ value: "active", label: labels.active },
		{ value: "inactive", label: labels.inactive },
	];
	const selectedLabel = isRTL ? "محدد" : "selected";

	const toggleAccount = (account) => {
		const nextActiveUser = !account.activeUser;
		const hotelTargets = accountHotelTargets(account, hotels);
		const [primaryHotel] = hotelTargets;
		const activationHotelIds = [
			...new Set(hotelTargets.map((hotel) => hotel._id).filter(Boolean)),
		];
		const primaryHotelId =
			primaryHotel?._id ||
			normalizeId(account.hotelIdWork) ||
			normalizeId((account.hotelsToSupport || [])[0]) ||
			normalizeId((account.hotelIdsWork || [])[0]) ||
			normalizeId((account.hotelIdsOwner || [])[0]);

		if (!primaryHotelId) {
			message.error(
				isRTL
					? "لم يتم العثور على فندق مرتبط بهذا الحساب."
					: "Hotel scope was not found for this account."
			);
			return;
		}

		setUpdatingId(account._id);
		const request = isSystemAdminAccount(account)
			? updateOverallSystemAdmin(userId, token, account._id, {
					activeUser: nextActiveUser,
			  })
			: updateHotelStaffUser(
					userId,
					token,
					primaryHotelId,
					account._id,
					{
						activeUser: nextActiveUser,
						hotelIdWork: activationHotelIds[0] || primaryHotelId,
						hotelIdsWork: activationHotelIds.length
							? activationHotelIds
							: [primaryHotelId],
						hotelsToSupport: activationHotelIds.length
							? activationHotelIds
							: [primaryHotelId],
					}
			  );

		request
			.then((data) => {
				if (!data || data.error) {
					message.error(
						isRTL
							? labels.couldNotUpdateAccount
							: data?.error || labels.couldNotUpdateAccount
					);
					return;
				}
				message.success(
					isRTL ? labels.accountUpdated : data.message || labels.accountUpdated
				);
				loadAccounts();
			})
			.finally(() => setUpdatingId(""));
	};

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

	const openAccountHotel = (account = {}) => {
		const [hotel] = accountHotelTargets(account, hotels);
		const route = singleHotelRoute(hotel?.ownerId || ownerId, hotel?._id, "dashboard");
		if (route) history.push(route);
	};

	return (
		<OverallPageShell $isRTL={isRTL}>
			<OverallToolbar
				onSubmit={(event) => {
					event.preventDefault();
					setPage(1);
					loadAccounts();
				}}
			>
				<input
					value={filters.search}
					onChange={(event) => updateFilter("search", event.target.value)}
					placeholder={labels.searchAccountPlaceholder}
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
						setFilters({ search: "", status: ["inactive"] });
						setPage(1);
					}}
				>
					{labels.reset}
				</button>
			</OverallToolbar>

			{!loading && !accounts.length && (
				<InlineNote>{labels.noAccountsFound}</InlineNote>
			)}

			<OverallTableWrap>
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>{labels.name}</th>
							<th>{labels.email}</th>
							<th>{labels.phone}</th>
							<th>{labels.status}</th>
							<th>{labels.hotels}</th>
							<th>{labels.created}</th>
							<th>{labels.singleHotel}</th>
							<th>{labels.action}</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan='9'>{labels.loading}</td>
							</tr>
						) : accounts.length ? (
							accounts.map((account, index) => (
								<tr key={account._id}>
									<td>{pageRowNumber(page, index, OVERALL_PAGE_SIZE)}</td>
									<td>{account.name || "-"}</td>
									<td>{account.email || "-"}</td>
									<td>{account.phone || "-"}</td>
									<td>
										{(() => {
											const isPendingApplication =
												account.activeUser === false &&
												String(
													account.applicationReview?.status || ""
												).toLowerCase() === "pending";
											const statusValue = isPendingApplication
												? "pending review"
												: account.activeUser
												? "active"
												: "inactive";
											return (
												<StatusPill $tone={statusTone(statusValue)}>
													{isPendingApplication
														? isRTL
															? "قيد المراجعة"
															: "Pending review"
														: localizeStatus(statusValue, chosenLanguage)}
												</StatusPill>
											);
										})()}
									</td>
									<td>{hotelListText(account, hotels)}</td>
									<td>{formatDate(account.createdAt, chosenLanguage)}</td>
									<td>
										<button
											type='button'
											className='link-btn'
											onClick={() => openAccountHotel(account)}
										>
											{labels.openHotel}
										</button>
									</td>
									<td>
										<ActionButton
											type='button'
											$danger={account.activeUser}
											disabled={updatingId === account._id}
											onClick={() => toggleAccount(account)}
										>
											{updatingId === account._id
												? labels.saving
												: account.activeUser
												  ? labels.deactivate
												  : labels.activate}
										</ActionButton>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan='9'>{labels.noAccountsFound}</td>
							</tr>
						)}
					</tbody>
				</table>
			</OverallTableWrap>

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

export default ActivateAccounts;
