import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import { List, Pagination, Select, Spin } from "antd";
import {
	getFilteredClosedSupportCasesClients,
	updateSupportCase,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import socket from "../../socket";
import ChatDetail from "./ChatDetail";
import StarRatings from "react-star-ratings";

const { Option } = Select;

const TEXT = {
	en: {
		back: "Back",
		closedCases: "Closed Client Support Cases",
		loading: "Loading closed cases...",
		loadingCase: "Loading case...",
		chatWith: "Chat with",
		closed: "Closed",
		open: "Open",
		noHotel: "No hotel",
		noSubject: "No subject",
		noCases: "No closed client support cases found.",
		totalCases: "Total",
	},
	ar: {
		back: "\u0631\u062c\u0648\u0639",
		closedCases:
			"\u0633\u062c\u0644 \u0628\u0644\u0627\u063a\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u063a\u0644\u0642\u0629",
		loading:
			"\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u0644\u0627\u063a\u0627\u062a \u0627\u0644\u0645\u063a\u0644\u0642\u0629...",
		loadingCase:
			"\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u0644\u0627\u063a...",
		chatWith: "\u0645\u062d\u0627\u062f\u062b\u0629 \u0645\u0639",
		closed: "\u0645\u063a\u0644\u0642",
		open: "\u0645\u0641\u062a\u0648\u062d",
		noHotel: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0641\u0646\u062f\u0642",
		noSubject: "\u0628\u062f\u0648\u0646 \u0645\u0648\u0636\u0648\u0639",
		noCases:
			"\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u0644\u0627\u063a\u0627\u062a \u0639\u0645\u0644\u0627\u0621 \u0645\u063a\u0644\u0642\u0629.",
		totalCases: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
	},
};

const normalizeClosedCasesResponse = (data, fallback = {}) => {
	if (Array.isArray(data)) {
		return {
			cases: data,
			page: fallback.page || 1,
			limit: fallback.limit || data.length || 20,
			total: data.length,
		};
	}

	return {
		cases: Array.isArray(data?.cases) ? data.cases : [],
		page: Number(data?.page || fallback.page || 1),
		limit: Number(data?.limit || fallback.limit || 20),
		total: Number(data?.total || 0),
	};
};

const latestCaseTime = (item = {}) => {
	const dates = [
		item.closedAt,
		item.updatedAt,
		item.createdAt,
		...(Array.isArray(item.conversation)
			? item.conversation.map((entry) => entry?.date)
			: []),
	]
		.map((value) => (value ? new Date(value).getTime() : 0))
		.filter(Boolean);

	return dates.length ? Math.max(...dates) : 0;
};

const sortCasesNewestFirst = (cases = []) =>
	[...cases].sort((a, b) => latestCaseTime(b) - latestCaseTime(a));

const caseSubtitle = (item = {}, labels) => {
	const hotelName =
		item.hotelId?.hotelName ||
		item.hotelId?.hotelName_OtherLanguage ||
		labels.noHotel;
	const firstInquiry =
		item.conversation?.[0]?.inquiryAbout ||
		item.inquiryAbout ||
		labels.noSubject;
	return `${hotelName} | ${firstInquiry}`;
};

const HistoryClientsSupportCases = ({ chosenLanguage }) => {
	const isArabic = chosenLanguage === "Arabic";
	const labels = TEXT[isArabic ? "ar" : "en"];
	const { token } = isAuthenticated() || {};
	const [closedCases, setClosedCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [loading, setLoading] = useState(true);
	const [pagination, setPagination] = useState({
		current: 1,
		pageSize: 20,
		total: 0,
	});

	const location = useLocation();
	const history = useHistory();
	const queryParams = new URLSearchParams(location.search);
	const caseIdParam = queryParams.get("id");
	const isMobile = window.innerWidth <= 768;

	const sortedClosedCases = useMemo(
		() => sortCasesNewestFirst(closedCases),
		[closedCases]
	);

	const fetchClosedCases = useCallback(
		async ({ page = 1, limit = 20 } = {}) => {
			if (!token) {
				setClosedCases([]);
				setLoading(false);
				return;
			}

			setLoading(true);
			try {
				const data = await getFilteredClosedSupportCasesClients(token, {
					page,
					limit,
				});
				if (data?.error) {
					setClosedCases([]);
					setPagination((current) => ({
						...current,
						current: page,
						pageSize: limit,
						total: 0,
					}));
					return;
				}

				const normalized = normalizeClosedCasesResponse(data, { page, limit });
				setClosedCases(sortCasesNewestFirst(normalized.cases));
				setPagination({
					current: normalized.page,
					pageSize: normalized.limit,
					total: normalized.total,
				});
			} catch (error) {
				setClosedCases([]);
				setPagination((current) => ({ ...current, total: 0 }));
			} finally {
				setLoading(false);
			}
		},
		[token]
	);

	useEffect(() => {
		fetchClosedCases();
	}, [fetchClosedCases]);

	useEffect(() => {
		const handleCaseReopened = (reopenedCase) => {
			setClosedCases((prevCases) =>
				prevCases.filter((caseItem) => caseItem._id !== reopenedCase?.case?._id)
			);
			setPagination((current) => ({
				...current,
				total: Math.max(current.total - 1, 0),
			}));
			setSelectedCase((current) =>
				current?._id === reopenedCase?.case?._id ? null : current
			);
		};

		const handleCaseClosed = (closedCase) => {
			if (closedCase?.case?.openedBy !== "client") return;
			fetchClosedCases({ page: 1, limit: pagination.pageSize });
		};

		socket.on("reopenCase", handleCaseReopened);
		socket.on("closeCase", handleCaseClosed);

		return () => {
			socket.off("reopenCase", handleCaseReopened);
			socket.off("closeCase", handleCaseClosed);
		};
	}, [fetchClosedCases, pagination.pageSize]);

	const handleCaseSelection = (caseObj) => {
		if (!isMobile) {
			setSelectedCase(caseObj);
			return;
		}

		const params = new URLSearchParams(location.search);
		params.set("tab", "history-client-cases");
		params.set("id", caseObj._id);
		history.push({
			pathname: location.pathname,
			search: params.toString(),
		});
	};

	const handlePaginationChange = (page, pageSize) => {
		setSelectedCase(null);
		fetchClosedCases({ page, limit: pageSize });
	};

	const handleChangeStatus = async (value, caseOverride = null) => {
		const caseToUpdate = caseOverride || selectedCase;
		if (!caseToUpdate) return;

		try {
			await updateSupportCase(caseToUpdate._id, { caseStatus: value }, token);
			if (value === "open") {
				socket.emit("reopenCase", { case: caseToUpdate });
				setClosedCases((prevCases) =>
					prevCases.filter((caseItem) => caseItem._id !== caseToUpdate._id)
				);
				setPagination((current) => ({
					...current,
					total: Math.max(current.total - 1, 0),
				}));
			} else if (value === "closed") {
				socket.emit("closeCase", { case: caseToUpdate });
				fetchClosedCases({ page: 1, limit: pagination.pageSize });
			}
			setSelectedCase(null);
		} catch (error) {
			console.error("Error updating the case.");
		}
	};

	if (isMobile && caseIdParam) {
		const foundCase = closedCases.find((caseItem) => caseItem._id === caseIdParam);
		if (!foundCase) {
			return (
				<HistoryClientsSupportCasesWrapper dir={isArabic ? "rtl" : "ltr"}>
					{labels.loadingCase}
				</HistoryClientsSupportCasesWrapper>
			);
		}

		return (
			<HistoryClientsSupportCasesWrapper dir={isArabic ? "rtl" : "ltr"}>
				<MobileBackArrow
					onClick={() => {
						const params = new URLSearchParams(location.search);
						params.delete("id");
						history.replace({ search: params.toString() });
					}}
				>
					{isArabic ? "\u2192" : "\u2190"} {labels.back}
				</MobileBackArrow>

				<MobileChatWrapper>
					<h3>
						{labels.chatWith} {foundCase.displayName2}
					</h3>
					<StatusSelect
						value={foundCase.caseStatus}
						onChange={(value) => handleChangeStatus(value, foundCase)}
					>
						<Option value='closed'>{labels.closed}</Option>
						<Option value='open'>{labels.open}</Option>
					</StatusSelect>
					<ChatDetail chat={foundCase} isHistory={true} />
				</MobileChatWrapper>
			</HistoryClientsSupportCasesWrapper>
		);
	}

	return (
		<HistoryClientsSupportCasesWrapper dir={isArabic ? "rtl" : "ltr"}>
			<MainContentWrapper>
				<SupportCasesList $hasSelection={Boolean(selectedCase)}>
					{loading ? (
						<Spin tip={labels.loading} />
					) : (
						<CaseList
							cases={sortedClosedCases}
							selectedCase={selectedCase}
							onSelect={handleCaseSelection}
							pagination={pagination}
							onPaginationChange={handlePaginationChange}
							labels={labels}
						/>
					)}
				</SupportCasesList>

				{selectedCase && (
					<ChatDetailWrapper>
						<h3>
							{labels.chatWith} {selectedCase.displayName2}
						</h3>
						<StatusSelect
							value={selectedCase.caseStatus}
							onChange={(value) => handleChangeStatus(value)}
						>
							<Option value='closed'>{labels.closed}</Option>
							<Option value='open'>{labels.open}</Option>
						</StatusSelect>
						<ChatDetail chat={selectedCase} isHistory={true} />
					</ChatDetailWrapper>
				)}
			</MainContentWrapper>
		</HistoryClientsSupportCasesWrapper>
	);
};

const CaseList = ({
	cases,
	selectedCase,
	onSelect,
	pagination,
	onPaginationChange,
	labels,
}) => (
	<ListShell>
		<ListHeader>
			<strong>{labels.closedCases}</strong>
			<span>
				{labels.totalCases}: {pagination.total}
			</span>
		</ListHeader>
		<List
			bordered
			locale={{ emptyText: labels.noCases }}
			dataSource={cases}
			renderItem={(item) => (
				<CaseListItem
					key={item._id}
					onClick={() => onSelect(item)}
					$isActive={selectedCase && selectedCase._id === item._id}
				>
					<div className='case-title'>{item.inquiryAbout || labels.noSubject}</div>
					<div className='case-subtitle'>{caseSubtitle(item, labels)}</div>
					<StarRatingWrapper>
						<StarRatings
							rating={item.rating || 0}
							starRatedColor='gold'
							numberOfStars={5}
							starDimension='20px'
							starSpacing='2px'
						/>
					</StarRatingWrapper>
				</CaseListItem>
			)}
		/>
		{pagination.total > pagination.pageSize && (
			<PaginationBar
				current={pagination.current}
				pageSize={pagination.pageSize}
				total={pagination.total}
				showSizeChanger
				pageSizeOptions={["10", "20", "50", "100"]}
				onChange={onPaginationChange}
				onShowSizeChange={onPaginationChange}
			/>
		)}
	</ListShell>
);

export default HistoryClientsSupportCases;

const HistoryClientsSupportCasesWrapper = styled.div`
	padding: 12px 0 0;
	direction: ${(props) => props.dir || "ltr"};

	@media (max-width: 1000px) {
		padding: 5px;

		ul {
			font-size: 0.82rem !important;
		}
	}
`;

const MainContentWrapper = styled.div`
	display: flex;
	width: 100%;
	gap: 12px;

	@media (max-width: 768px) {
		display: block;
	}
`;

const SupportCasesList = styled.div`
	width: ${(props) => (props.$hasSelection ? "30%" : "100%")};
	min-width: 300px;

	@media (max-width: 768px) {
		width: 100%;
		min-width: 0;
	}
`;

const ChatDetailWrapper = styled.div`
	flex: 1;
	min-width: 0;
	padding: 14px;
	border: 1px solid #d8e8f5;
	background-color: #f9fcff;
	border-radius: 8px;
`;

const ListShell = styled.div`
	border: 1px solid #d8e8f5;
	border-radius: 8px;
	background: #ffffff;
	overflow: hidden;
	box-shadow: 0 10px 24px rgba(13, 49, 88, 0.06);

	.ant-list {
		border: 0;
	}
`;

const ListHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 11px 14px;
	background: linear-gradient(180deg, #154a78 0%, #09223a 100%);
	color: #ffffff;
	font-weight: 900;

	span {
		font-size: 0.84rem;
		opacity: 0.9;
	}
`;

const CaseListItem = styled(List.Item)`
	cursor: pointer;
	text-transform: capitalize;
	display: flex !important;
	flex-direction: column;
	align-items: flex-start !important;
	gap: 4px;
	background: ${(props) => (props.$isActive ? "#e9f6ff" : "#ffffff")};
	border-inline-start: 4px solid
		${(props) => (props.$isActive ? "#1583c7" : "transparent")};
	transition:
		background 140ms ease,
		border-color 140ms ease;

	&:hover {
		background: #f3f9ff;
		border-inline-start-color: #50a7dc;
	}

	.case-title {
		color: #0b3158;
		font-weight: 900;
	}

	.case-subtitle {
		color: #536b80;
		font-size: 0.84rem;
		line-height: 1.35;
	}
`;

const PaginationBar = styled(Pagination)`
	display: flex;
	justify-content: center;
	padding: 12px;
	border-top: 1px solid #e6f0fa;
`;

const StatusSelect = styled(Select)`
	width: 150px;
	margin: 4px 0 14px;
`;

const StarRatingWrapper = styled.div`
	margin-top: 2px;
`;

const MobileChatWrapper = styled.div`
	margin-top: 12px;
`;

const MobileBackArrow = styled.div`
	color: #0b5c91;
	cursor: pointer;
	font-size: 1.02rem;
	font-weight: 900;
	margin-bottom: 12px;
	width: fit-content;

	&:hover {
		text-decoration: underline;
	}
`;
