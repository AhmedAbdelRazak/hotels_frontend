import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useLocation, useHistory } from "react-router-dom"; // For mobile param logic
import { List, Select, Spin } from "antd";
import {
	getFilteredClosedSupportCasesClients,
	updateSupportCase,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import socket from "../../socket";
import ChatDetail from "./ChatDetail";
import StarRatings from "react-star-ratings";

const { Option } = Select;

const HistoryClientsSupportCases = () => {
	const { token } = isAuthenticated();
	const [closedCases, setClosedCases] = useState([]);
	const [selectedCase, setSelectedCase] = useState(null);
	const [loading, setLoading] = useState(true);

	// For mobile routing:
	const location = useLocation();
	const history = useHistory();
	const queryParams = new URLSearchParams(location.search);
	const caseIdParam = queryParams.get("id");
	const isMobile = window.innerWidth <= 768; // Basic detection

	useEffect(() => {
		const fetchClosedCases = () => {
			getFilteredClosedSupportCasesClients(token) // Using client-specific API
				.then((data) => {
					if (!data.error) {
						setClosedCases(data);
					}
					setLoading(false);
				})
				.catch(() => {
					setLoading(false);
				});
		};

		fetchClosedCases();

		const handleCaseReopened = (reopenedCase) => {
			setClosedCases((prevCases) =>
				prevCases.filter((c) => c._id !== reopenedCase.case._id)
			);
		};

		const handleCaseClosed = (closedCase) => {
			setClosedCases((prevCases) => [...prevCases, closedCase.case]);
		};

		socket.on("reopenCase", handleCaseReopened);
		socket.on("closeCase", handleCaseClosed);

		return () => {
			socket.off("reopenCase", handleCaseReopened);
			socket.off("closeCase", handleCaseClosed);
		};
	}, [token]);

	const handleCaseSelection = (caseObj) => {
		// Desktop: local state, side-by-side
		if (!isMobile) {
			setSelectedCase(caseObj);
		} else {
			// Mobile: add ?id=someCase
			history.push(`?id=${caseObj._id}`);
		}
	};

	const handleChangeStatus = async (value) => {
		if (selectedCase) {
			try {
				await updateSupportCase(selectedCase._id, { caseStatus: value }, token);
				if (value === "open") {
					socket.emit("reopenCase", { case: selectedCase });
					setClosedCases((prevCases) =>
						prevCases.filter((c) => c._id !== selectedCase._id)
					);
				} else if (value === "closed") {
					socket.emit("closeCase", { case: selectedCase });
					setClosedCases((prevCases) => [...prevCases, selectedCase]);
				}
				setSelectedCase(null);
			} catch (error) {
				console.error("Error reopening the case.");
			}
		}
	};

	/* ---------------- MOBILE LOGIC ---------------- */
	if (isMobile) {
		// If there's a param => show only chat detail
		if (caseIdParam) {
			const foundCase = closedCases.find((c) => c._id === caseIdParam);
			if (!foundCase) {
				return <div>Loading case...</div>;
			}

			return (
				<HistoryClientsSupportCasesWrapper>
					<MobileBackArrow
						onClick={() => {
							// Remove ?id from the URL
							const params = new URLSearchParams(location.search);
							params.delete("id");
							history.replace({ search: params.toString() });
						}}
					>
						← Back
					</MobileBackArrow>

					<MobileChatWrapper>
						<h3>Chat with {foundCase.displayName2}</h3>
						<StatusSelect
							value={foundCase.caseStatus}
							onChange={(val) => {
								setSelectedCase(foundCase); // temporarily store
								handleChangeStatus(val);
							}}
						>
							<Option value='closed'>Closed</Option>
							<Option value='open'>Open</Option>
						</StatusSelect>
						<ChatDetail chat={foundCase} isHistory={true} />
					</MobileChatWrapper>
				</HistoryClientsSupportCasesWrapper>
			);
		}

		// Else show only the list
		return (
			<HistoryClientsSupportCasesWrapper>
				{loading ? (
					<Spin tip='Loading closed cases...' />
				) : (
					<List
						style={{ marginTop: "20px" }}
						header={
							<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
								Closed Client Support Cases
							</div>
						}
						bordered
						dataSource={closedCases}
						renderItem={(item) => (
							<List.Item
								key={item._id}
								onClick={() => handleCaseSelection(item)}
								style={{
									cursor: "pointer",
									textTransform: "capitalize",
									backgroundColor: "white",
									marginBottom: "8px",
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
								}}
							>
								<div>
									{item.inquiryAbout} -{" "}
									{item.hotelId
										? item.hotelId.hotelName +
										  " | " +
										  item.conversation[0].inquiryAbout
										: ""}
								</div>
								<StarRatingWrapper>
									<StarRatings
										rating={item.rating || 0}
										starRatedColor='gold'
										numberOfStars={5}
										starDimension='20px'
										starSpacing='2px'
									/>
								</StarRatingWrapper>
							</List.Item>
						)}
					/>
				)}
			</HistoryClientsSupportCasesWrapper>
		);
	}

	/* ---------------- DESKTOP / LARGE SCREENS ---------------- */
	return (
		<HistoryClientsSupportCasesWrapper>
			<MainContentWrapper>
				<SupportCasesList>
					{loading ? (
						<Spin tip='Loading closed cases...' />
					) : (
						<List
							style={{ marginTop: "20px" }}
							header={
								<div
									style={{ fontWeight: "bold", textDecoration: "underline" }}
								>
									Closed Client Support Cases
								</div>
							}
							bordered
							dataSource={closedCases}
							renderItem={(item) => (
								<List.Item
									key={item._id}
									onClick={() => handleCaseSelection(item)}
									style={{
										cursor: "pointer",
										textTransform: "capitalize",
										backgroundColor:
											selectedCase && selectedCase._id === item._id
												? "#e6f7ff"
												: "white",
										display: "flex",
										flexDirection: "column",
										alignItems: "flex-start",
									}}
								>
									<div>
										{item.inquiryAbout} -{" "}
										{item.hotelId
											? item.hotelId.hotelName +
											  " | " +
											  item.conversation[0].inquiryAbout
											: ""}
									</div>
									<StarRatingWrapper>
										<StarRatings
											rating={item.rating || 0}
											starRatedColor='gold'
											numberOfStars={5}
											starDimension='20px'
											starSpacing='2px'
										/>
									</StarRatingWrapper>
								</List.Item>
							)}
						/>
					)}
				</SupportCasesList>

				{selectedCase && (
					<ChatDetailWrapper>
						<h3>Chat with {selectedCase.displayName2}</h3>
						<StatusSelect
							value={selectedCase.caseStatus}
							onChange={(val) => handleChangeStatus(val)}
						>
							<Option value='closed'>Closed</Option>
							<Option value='open'>Open</Option>
						</StatusSelect>
						<ChatDetail chat={selectedCase} isHistory={true} />
					</ChatDetailWrapper>
				)}
			</MainContentWrapper>
		</HistoryClientsSupportCasesWrapper>
	);
};

export default HistoryClientsSupportCases;

/* ------------------ STYLES ------------------ */

const HistoryClientsSupportCasesWrapper = styled.div`
	padding: 20px;

	@media (max-width: 1000px) {
		padding: 5px;

		ul {
			font-size: 0.75rem !important;
		}
	}
`;

/* For desktop two-column layout */
const MainContentWrapper = styled.div`
	display: flex;
	width: 100%;
	margin-top: 20px;
`;

/* The left column with the list */
const SupportCasesList = styled.div`
	width: 25%;
	padding-right: 10px;
`;

/* The right column with chat details */
const ChatDetailWrapper = styled.div`
	width: 75%;
	padding-left: 10px;
	border: 1px solid #e8e8e8;
	background-color: #f9f9f9;
	border-radius: 4px;
`;

const StatusSelect = styled(Select)`
	width: 150px;
	margin-top: 20px;
`;

/* For star ratings in the list items */
const StarRatingWrapper = styled.div`
	margin-top: 5px;
`;

/* For mobile full-width arrangement */
const MobileChatWrapper = styled.div`
	margin-top: 20px;
`;

/* Simple back arrow link on mobile */
const MobileBackArrow = styled.div`
	color: blue;
	cursor: pointer;
	font-size: 1.1rem;
	font-weight: bold;
	margin-bottom: 12px;
	width: fit-content;

	&:hover {
		text-decoration: underline;
	}
`;
