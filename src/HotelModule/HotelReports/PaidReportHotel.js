import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Button, Input, Modal, Spin, message } from "antd";
import { useParams } from "react-router-dom";
import { isAuthenticated } from "../../auth";
import { useCartContext } from "../../cart_context";
import { getPaidBreakdownReportHotel } from "../apiAdmin";
import ReservationDetail from "../ReservationsFolder/ReservationDetail";

const breakdownKeys = [
	"paid_online_via_link",
	"paid_at_hotel_cash",
	"paid_at_hotel_card",
	"paid_to_zad",
	"paid_online_jannatbooking",
	"paid_online_other_platforms",
	"paid_online_via_instapay",
];

const safeNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value, locale = "en-US") =>
	safeNumber(value).toLocaleString(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const formatDate = (value, locale = "en-US", fallback = "N/A") => {
	if (!value) return fallback;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return fallback;
	return date.toLocaleDateString(locale);
};

const PaidReportHotel = ({ collapsed = false }) => {
	const { chosenLanguage } = useCartContext();
	const { user, token } = isAuthenticated() || {};
	const { hotelId } = useParams();
	const [searchTerm, setSearchTerm] = useState("");
	const [searchBoxValue, setSearchBoxValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [reservations, setReservations] = useState([]);
	const [scorecards, setScorecards] = useState({
		totalAmount: 0,
		paidAmount: 0,
		breakdownTotals: {},
	});
	const [detailsVisible, setDetailsVisible] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState(null);

	const isArabic = chosenLanguage === "Arabic";
	const numberLocale = "en-US";
	const modalOffsets = useMemo(() => {
		const sideMenuWidth = collapsed ? 90 : 295;
		const gutter = 16;
		const width = `calc(100vw - ${sideMenuWidth + gutter * 2}px)`;
		const left = isArabic ? `${gutter}px` : `${sideMenuWidth + gutter}px`;
		return {
			width,
			style: { top: "3%", left, position: "absolute" },
		};
	}, [collapsed, isArabic]);
	const labels = useMemo(
		() => ({
			searchPlaceholder: isArabic
				? "ابحث برقم التأكيد أو الهاتف أو الاسم أو الفندق..."
				: "Search by confirmation, phone, name, or hotel name...",
			search: isArabic ? "بحث" : "Search",
			emptyData: isArabic
				? "لا توجد سجلات لبيان الدفع."
				: "No paid breakdown records found.",
			name: isArabic ? "الاسم" : "Name",
			confirmation: isArabic ? "رقم التأكيد" : "Confirmation #",
			checkin: isArabic ? "تاريخ الوصول" : "Check-in",
			checkout: isArabic ? "تاريخ المغادرة" : "Check-out",
			breakdown: {
				paid_online_via_link: isArabic
					? "مدفوع أونلاين (رابط الدفع)"
					: "Paid Online (Link)",
				paid_at_hotel_cash: isArabic
					? "مدفوع في الفندق (نقداً)"
					: "Paid at Hotel (Cash)",
				paid_at_hotel_card: isArabic
					? "مدفوع في الفندق (بطاقة)"
					: "Paid at Hotel (Card)",
				paid_to_zad: isArabic ? "مدفوع إلى زاد" : "Paid to ZAD",
				paid_online_jannatbooking: isArabic
					? "مدفوع أونلاين (جنات بوكينغ)"
					: "Paid Online (Jannat Booking)",
				paid_online_other_platforms: isArabic
					? "مدفوع أونلاين (منصات أخرى)"
					: "Paid Online (Other Platforms)",
				paid_online_via_instapay: isArabic
					? "مدفوع أونلاين (إنستاباي)"
					: "Paid Online (InstaPay)",
			},
			paidBreakdown: isArabic ? "تفاصيل الدفع" : "Paid Breakdown",
			breakdownTotalsTitle: isArabic
				? "إجمالي تفاصيل الدفع"
				: "Breakdown Totals",
			totalPaid: isArabic ? "إجمالي المدفوع" : "Total Paid",
			totalAmount: isArabic ? "إجمالي المبلغ" : "Total Amount",
			remaining: isArabic ? "المتبقي" : "Remaining",
			details: isArabic ? "التفاصيل" : "Details",
			viewDetails: isArabic ? "عرض التفاصيل" : "View Details",
			totalRow: isArabic ? "الإجمالي" : "Total",
			scoreTotalAmount: isArabic ? "إجمالي المبلغ" : "Total Amount",
			scorePaidAmount: isArabic ? "إجمالي المدفوع" : "Paid Amount",
			na: isArabic ? "غير متاح" : "N/A",
			missingHotel: isArabic
				? "بيانات الفندق غير متوفرة لهذا الحجز."
				: "Hotel details are missing for this reservation.",
			loadError: isArabic
				? "تعذر تحميل تقرير بيان الدفع."
				: "Failed to load paid breakdown report",
		}),
		[isArabic],
	);

	const fetchReport = useCallback(() => {
		if (!user?._id || !token || !hotelId) return;
		setLoading(true);
		getPaidBreakdownReportHotel(user._id, token, {
			hotelId,
			searchQuery: searchTerm,
		})
			.then((data) => {
				const list = Array.isArray(data?.data)
					? data.data
					: Array.isArray(data)
					  ? data
					  : [];
				const scorecardPayload = data?.scorecards;
				const fallbackTotalAmount = list.reduce(
					(sum, reservation) => sum + safeNumber(reservation?.total_amount),
					0,
				);
				const fallbackPaidAmount = list.reduce(
					(sum, reservation) =>
						sum +
						safeNumber(
							reservation?.paid_breakdown_total ??
								breakdownKeys.reduce(
									(innerSum, key) =>
										innerSum +
										safeNumber(reservation?.paid_amount_breakdown?.[key]),
									0,
								),
						),
					0,
				);
				setReservations(list);
				setScorecards({
					totalAmount: safeNumber(
						scorecardPayload?.totalAmount ?? fallbackTotalAmount,
					),
					paidAmount: safeNumber(
						scorecardPayload?.paidAmount ?? fallbackPaidAmount,
					),
					breakdownTotals: scorecardPayload?.breakdownTotals || {},
				});
			})
			.catch((err) => {
				console.error("Failed to fetch paid breakdown report", err);
				message.error(labels.loadError);
				setReservations([]);
				setScorecards({ totalAmount: 0, paidAmount: 0, breakdownTotals: {} });
			})
			.finally(() => setLoading(false));
	}, [user?._id, token, hotelId, searchTerm, labels.loadError]);

	useEffect(() => {
		if (!hotelId) {
			setReservations([]);
			setScorecards({ totalAmount: 0, paidAmount: 0, breakdownTotals: {} });
			return;
		}
		fetchReport();
	}, [fetchReport, hotelId]);

	const handleSearch = () => {
		setSearchTerm(searchBoxValue.trim());
	};

	const handleSearchKey = (event) => {
		if (event.key === "Enter") {
			handleSearch();
		}
	};

	const rows = useMemo(() => {
		return reservations.map((reservation) => {
			const breakdown = reservation?.paid_amount_breakdown || {};
			const paidTotal =
				Number.isFinite(reservation?.paid_breakdown_total) &&
				reservation?.paid_breakdown_total !== null
					? reservation.paid_breakdown_total
					: breakdownKeys.reduce(
							(sum, key) => sum + safeNumber(breakdown[key]),
							0,
					  );
			const totalAmount = safeNumber(reservation?.total_amount);
			return {
				...reservation,
				paidTotal,
				totalAmount,
				remainingAmount: Math.max(totalAmount - paidTotal, 0),
			};
		});
	}, [reservations]);

	const tableTotals = useMemo(() => {
		const breakdownTotals = breakdownKeys.reduce((acc, key) => {
			acc[key] = rows.reduce(
				(sum, reservation) =>
					sum + safeNumber(reservation?.paid_amount_breakdown?.[key]),
				0,
			);
			return acc;
		}, {});
		const totalPaid = rows.reduce(
			(sum, reservation) => sum + safeNumber(reservation?.paidTotal),
			0,
		);
		const totalAmount = rows.reduce(
			(sum, reservation) => sum + safeNumber(reservation?.totalAmount),
			0,
		);
		const remainingAmount = rows.reduce(
			(sum, reservation) => sum + safeNumber(reservation?.remainingAmount),
			0,
		);
		return { breakdownTotals, totalPaid, totalAmount, remainingAmount };
	}, [rows]);

	const breakdownSummary = useMemo(() => {
		const fromApi = scorecards.breakdownTotals;
		if (fromApi && typeof fromApi === "object" && Object.keys(fromApi).length) {
			return breakdownKeys.reduce((acc, key) => {
				acc[key] = safeNumber(fromApi[key]);
				return acc;
			}, {});
		}
		return tableTotals.breakdownTotals;
	}, [scorecards.breakdownTotals, tableTotals]);

	const handleOpenDetails = (reservation) => {
		if (!reservation?.hotelId) {
			message.error(labels.missingHotel);
			return;
		}
		setSelectedReservation(reservation);
		setDetailsVisible(true);
	};

	const handleCloseDetails = () => {
		setSelectedReservation(null);
		setDetailsVisible(false);
	};

	const handleReservationUpdated = (updated) => {
		if (!updated?._id) return;
		setReservations((prev) =>
			prev.map((reservation) =>
				reservation?._id === updated._id
					? { ...reservation, ...updated }
					: reservation,
			),
		);
		setSelectedReservation((prev) =>
			prev && prev._id === updated._id ? { ...prev, ...updated } : prev,
		);
	};

	return (
		<Wrapper dir={isArabic ? "rtl" : "ltr"} isArabic={isArabic}>
			<SearchRow>
				<Input
					placeholder={labels.searchPlaceholder}
					style={{ width: 500 }}
					value={searchBoxValue}
					onChange={(e) => setSearchBoxValue(e.target.value)}
					onKeyDown={handleSearchKey}
				/>
				<Button type='primary' onClick={handleSearch}>
					{labels.search}
				</Button>
			</SearchRow>

			{loading ? (
				<LoadingWrapper>
					<Spin size='large' />
				</LoadingWrapper>
			) : (
				<>
					<ScorecardsRow>
						<Scorecard>
							<span>{labels.scoreTotalAmount}</span>
							<strong>
								{formatMoney(scorecards.totalAmount, numberLocale)}
							</strong>
						</Scorecard>
						<Scorecard>
							<span>{labels.scorePaidAmount}</span>
							<strong>
								{formatMoney(scorecards.paidAmount, numberLocale)}
							</strong>
						</Scorecard>
					</ScorecardsRow>
					<BreakdownTotals>
						<BreakdownTotalsTitle>
							{labels.breakdownTotalsTitle}
						</BreakdownTotalsTitle>
						<BreakdownTotalsGrid>
							{breakdownKeys.map((key) => (
								<BreakdownTotalsItem key={key}>
									<span>{labels.breakdown[key]}</span>
									<strong>
										{formatMoney(breakdownSummary[key], numberLocale)}
									</strong>
								</BreakdownTotalsItem>
							))}
						</BreakdownTotalsGrid>
					</BreakdownTotals>
					{rows.length === 0 ? (
						<EmptyState>{labels.emptyData}</EmptyState>
					) : (
						<TableWrapper>
							<StyledTable isArabic={isArabic}>
								<thead>
									<tr>
										<th>{labels.name}</th>
										<th>{labels.confirmation}</th>
										<th>{labels.checkin}</th>
										<th>{labels.checkout}</th>
										{breakdownKeys.map((key) => (
											<th key={key}>{labels.breakdown[key]}</th>
										))}
										<th>{labels.paidBreakdown}</th>
										<th>{labels.totalPaid}</th>
										<th>{labels.totalAmount}</th>
										<th>{labels.remaining}</th>
										<th>{labels.details}</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((reservation) => {
										const nameValue =
											reservation?.customer_details?.name || labels.na;
										const confirmationValue =
											reservation?.confirmation_number || labels.na;
										const commentsValue =
											reservation?.paid_amount_breakdown?.payment_comments ||
											labels.na;
										return (
											<tr key={reservation._id}>
												<td>
													<EllipsisText title={nameValue} $maxWidth='160px'>
														{nameValue}
													</EllipsisText>
												</td>
												<td>
													<EllipsisText
														title={confirmationValue}
														$maxWidth='140px'
													>
														{confirmationValue}
													</EllipsisText>
												</td>
											<td>
												{formatDate(
													reservation?.checkin_date,
													numberLocale,
													labels.na,
												)}
											</td>
											<td>
												{formatDate(
													reservation?.checkout_date,
													numberLocale,
													labels.na,
												)}
											</td>
											{breakdownKeys.map((key) => (
												<td key={key}>
													{formatMoney(
														reservation?.paid_amount_breakdown?.[key],
														numberLocale,
													)}
												</td>
											))}
											<td>
												<EllipsisText title={commentsValue} $maxWidth='160px'>
													{commentsValue}
												</EllipsisText>
											</td>
											<td>
												{formatMoney(reservation?.paidTotal, numberLocale)}
											</td>
											<td>
												{formatMoney(reservation?.totalAmount, numberLocale)}
											</td>
											<td>
												{formatMoney(
													reservation?.remainingAmount,
													numberLocale,
												)}
											</td>
											<td>
												<Button onClick={() => handleOpenDetails(reservation)}>
													{labels.viewDetails}
												</Button>
											</td>
										</tr>
										);
									})}
								</tbody>
								<tfoot>
									<tr>
										<td>{labels.totalRow}</td>
										<td></td>
										<td></td>
										<td></td>
										{breakdownKeys.map((key) => (
											<td key={key}>
												{formatMoney(
													tableTotals.breakdownTotals[key],
													numberLocale,
												)}
											</td>
										))}
										<td></td>
										<td>{formatMoney(tableTotals.totalPaid, numberLocale)}</td>
										<td>
											{formatMoney(tableTotals.totalAmount, numberLocale)}
										</td>
										<td>
											{formatMoney(tableTotals.remainingAmount, numberLocale)}
										</td>
										<td></td>
									</tr>
								</tfoot>
							</StyledTable>
						</TableWrapper>
					)}
				</>
			)}

			<Modal
				open={detailsVisible}
				onCancel={handleCloseDetails}
				footer={null}
				width={modalOffsets.width}
				style={modalOffsets.style}
				destroyOnClose
			>
				{selectedReservation ? (
					<ReservationDetail
						reservation={selectedReservation}
						setReservation={handleReservationUpdated}
						hotelDetails={selectedReservation.hotelId}
					/>
				) : null}
			</Modal>
		</Wrapper>
	);
};

export default PaidReportHotel;

const Wrapper = styled.div`
	width: 100%;
	direction: ${(props) => (props.isArabic ? "rtl" : "ltr")};
	text-align: ${(props) => (props.isArabic ? "right" : "left")};
`;

const SearchRow = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	margin-bottom: 16px;
	gap: 8px;
`;

const TableWrapper = styled.div`
	width: 100%;
	max-height: 680px;
	overflow: auto;
	max-width: 100%;
	border: 1px solid #f0f0f0;
`;

const StyledTable = styled.table`
	width: 100%;
	border-collapse: collapse;
	min-width: 1200px;

	th,
	td {
		border: 1px solid #f0f0f0;
		padding: 6px 8px;
		font-size: 12px;
		text-align: ${(props) => (props.isArabic ? "right" : "left")};
		white-space: nowrap;
	}

	th {
		background-color: #fafafa;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	tfoot tr {
		background-color: #f5f5f5;
		font-weight: 600;
	}
`;

const EllipsisText = styled.span`
	display: inline-block;
	max-width: ${(props) => props.$maxWidth || "180px"};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	vertical-align: bottom;
`;

const EmptyState = styled.div`
	padding: 24px 12px;
	text-align: center;
	color: #666;
	font-weight: 600;
`;

const LoadingWrapper = styled.div`
	padding: 24px 12px;
	text-align: center;
`;

const ScorecardsRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	margin-bottom: 16px;
`;

const Scorecard = styled.div`
	background: #f7f9fc;
	border: 1px solid #dfe6f1;
	border-radius: 10px;
	padding: 12px 18px;
	min-width: 220px;
	display: flex;
	flex-direction: column;
	gap: 6px;

	span {
		font-size: 0.85rem;
		color: #4a5568;
	}

	strong {
		font-size: 1.1rem;
		color: #1a202c;
	}
`;

const BreakdownTotals = styled.div`
	margin-bottom: 16px;
`;

const BreakdownTotalsTitle = styled.div`
	font-weight: 600;
	margin-bottom: 8px;
	color: #1f2933;
`;

const BreakdownTotalsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 12px;
`;

const BreakdownTotalsItem = styled.div`
	background: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 10px;
	padding: 10px 14px;
	display: flex;
	flex-direction: column;
	gap: 4px;

	span {
		font-size: 0.82rem;
		color: #4a5568;
	}

	strong {
		font-size: 1rem;
		color: #1a202c;
	}
`;
