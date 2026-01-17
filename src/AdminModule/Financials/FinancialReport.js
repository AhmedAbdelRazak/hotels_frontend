import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Button, Card, Select, Spin, Table, Tag } from "antd";
import { CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import { isAuthenticated } from "../../auth";
import { getFinancialReport, listExpenseHotels } from "../apiAdmin";

const DEFAULT_HOTEL_FILTER = "all";
const SUPER_USER_IDS = ["6553f1c6d06c5cea2f98a838"];
const PAYMENT_STATUS_OPTIONS = [
	"Captured",
	"Paid Offline",
	"Not Captured",
	"Not Paid",
];

const extractHotels = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (payload?.hotels && Array.isArray(payload.hotels)) return payload.hotels;
	const firstArray = Object.values(payload || {}).find(Array.isArray);
	return firstArray || [];
};

const formatCurrency = (value) => {
	const num = Number(value || 0);
	if (Number.isNaN(num)) return "0.00";
	return num.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const formatPercent = (value) => {
	const num = Number(value || 0);
	if (Number.isNaN(num)) return "0.0%";
	return `${num.toFixed(1)}%`;
};

const formatCount = (value) => {
	const num = Number(value || 0);
	if (Number.isNaN(num)) return "0";
	return Math.round(num).toLocaleString("en-US");
};

const FinancialReport = () => {
	const { user, token } = isAuthenticated() || {};
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const [loadingHotels, setLoadingHotels] = useState(false);
	const [expenseHotels, setExpenseHotels] = useState([]);
	const [report, setReport] = useState(null);
	const [selectedHotel, setSelectedHotel] = useState(DEFAULT_HOTEL_FILTER);
	const [selectedYear, setSelectedYear] = useState(null);
	const [availableYears, setAvailableYears] = useState([]);
	const [excludeCancelled, setExcludeCancelled] = useState(true);
	const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState([]);
	const isAllowed = SUPER_USER_IDS.includes(user?._id);

	const hotelOptions = useMemo(() => {
		const list = Array.isArray(expenseHotels) ? expenseHotels : [];
		const mapped = list
			.map((hotel) => ({
				value: hotel?._id,
				label: hotel?.hotelName || "",
			}))
			.filter((hotel) => hotel.value && hotel.label)
			.sort((a, b) =>
				a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
			);

		return [{ value: DEFAULT_HOTEL_FILTER, label: "All Hotels" }, ...mapped];
	}, [expenseHotels]);

	const yearOptions = useMemo(() => {
		const years = Array.isArray(availableYears) ? availableYears : [];
		return years.map((year) => ({ value: year, label: String(year) }));
	}, [availableYears]);

	const paymentStatusOptions = useMemo(
		() =>
			PAYMENT_STATUS_OPTIONS.map((status) => ({
				value: status,
				label: status,
			})),
		[]
	);

	useEffect(() => {
		if (!user?._id || !isAllowed) {
			history.push("/");
		}
	}, [history, isAllowed, user?._id]);

	const loadExpenseHotels = useCallback(async () => {
		if (!user?._id || !token || !isAllowed) return;
		setLoadingHotels(true);
		try {
			const payload = await listExpenseHotels(user._id, token);
			if (!payload) {
				toast.error("Unable to load expense hotels. Please try again.");
				setExpenseHotels([]);
				return;
			}
			if (payload?.error) {
				toast.error(payload.error);
				setExpenseHotels([]);
			} else {
				setExpenseHotels(extractHotels(payload));
			}
		} catch (error) {
			console.error(error);
			setExpenseHotels([]);
			toast.error("Unable to load expense hotels. Please try again.");
		} finally {
			setLoadingHotels(false);
		}
	}, [isAllowed, token, user?._id]);

	const loadReport = useCallback(async () => {
		if (!user?._id || !token || !isAllowed) return;
		setLoading(true);
		try {
			const hotelId =
				selectedHotel && selectedHotel !== DEFAULT_HOTEL_FILTER
					? selectedHotel
					: null;
			const payload = await getFinancialReport(user._id, token, {
				hotelId,
				year: selectedYear || undefined,
				excludeCancelled,
				paymentStatuses: selectedPaymentStatuses.length
					? selectedPaymentStatuses
					: undefined,
			});

			if (!payload) {
				toast.error("Unable to load financial report. Please try again.");
				setReport(null);
				return;
			}
			if (payload?.error) {
				toast.error(payload.error);
				setReport(null);
				return;
			}

			setReport(payload);
			setAvailableYears(payload?.availableYears || []);
			if (payload?.year && payload.year !== selectedYear) {
				setSelectedYear(payload.year);
			}
		} catch (error) {
			console.error(error);
			toast.error("Unable to load financial report. Please try again.");
			setReport(null);
		} finally {
			setLoading(false);
		}
	}, [
		excludeCancelled,
		isAllowed,
		selectedHotel,
		selectedPaymentStatuses,
		selectedYear,
		token,
		user?._id,
	]);

	useEffect(() => {
		loadExpenseHotels();
	}, [loadExpenseHotels]);

	useEffect(() => {
		loadReport();
	}, [loadReport]);

	const handleReset = () => {
		setSelectedHotel(DEFAULT_HOTEL_FILTER);
		setExcludeCancelled(true);
		setSelectedPaymentStatuses([]);
		if (availableYears.length) {
			setSelectedYear(availableYears[availableYears.length - 1]);
		} else {
			setSelectedYear(null);
		}
	};

	const totals = report?.totals || {};
	const monthlyRows = useMemo(() => report?.monthly || [], [report]);
	const paymentRows = useMemo(() => report?.paymentStatus || [], [report]);

	const monthlyColumns = useMemo(
		() => [
			{
				title: "Month",
				dataIndex: "monthLabel",
				key: "monthLabel",
			},
			{
				title: "Revenue (SAR)",
				dataIndex: "revenue",
				key: "revenue",
				align: "right",
				render: (value) => formatCurrency(value),
			},
			{
				title: "Expenses (SAR)",
				dataIndex: "expenses",
				key: "expenses",
				align: "right",
				render: (value) => formatCurrency(value),
			},
			{
				title: "Net (SAR)",
				dataIndex: "net",
				key: "net",
				align: "right",
				render: (value) => (
					<NetValue $negative={Number(value) < 0}>
						{formatCurrency(value)}
					</NetValue>
				),
			},
			{
				title: "Expenses % of Revenue",
				dataIndex: "expenseRatio",
				key: "expenseRatio",
				align: "right",
				render: (value) => formatPercent(value),
			},
		],
		[]
	);

	const paymentColumns = useMemo(
		() => [
			{
				title: "Payment Status",
				dataIndex: "status",
				key: "status",
				render: (value) => <Tag>{value}</Tag>,
			},
			{
				title: "Reservations",
				dataIndex: "reservations",
				key: "reservations",
				align: "right",
				render: (value) => formatCount(value),
			},
			{
				title: "Revenue (SAR)",
				dataIndex: "revenue",
				key: "revenue",
				align: "right",
				render: (value) => formatCurrency(value),
			},
		],
		[]
	);

	const paymentTotals = useMemo(() => {
		return paymentRows.reduce(
			(acc, row) => {
				acc.reservations += Number(row?.reservations || 0);
				acc.revenue += Number(row?.revenue || 0);
				return acc;
			},
			{ reservations: 0, revenue: 0 }
		);
	}, [paymentRows]);

	if (!user?._id || !isAllowed) {
		return null;
	}

	return (
		<FinancialReportWrapper>
			<Card title='Filters' size='small'>
				<FilterBar>
					<FilterGroup>
						<FilterLabel>Hotel</FilterLabel>
						<Select
							showSearch
							loading={loadingHotels}
							placeholder='All hotels'
							optionFilterProp='label'
							value={selectedHotel}
							options={hotelOptions}
							style={{ width: "100%" }}
							onChange={(value) =>
								setSelectedHotel(value || DEFAULT_HOTEL_FILTER)
							}
						/>
					</FilterGroup>
					<FilterGroup>
						<FilterLabel>Year (checkout date)</FilterLabel>
						<Select
							placeholder='Select year'
							value={selectedYear}
							options={yearOptions}
							style={{ width: "100%" }}
							onChange={(value) => setSelectedYear(value)}
							disabled={yearOptions.length === 0}
						/>
					</FilterGroup>
					<FilterGroup>
						<FilterLabel>Payment status</FilterLabel>
						<Select
							mode='multiple'
							allowClear
							placeholder='All payment statuses'
							value={selectedPaymentStatuses}
							options={paymentStatusOptions}
							style={{ width: "100%" }}
							onChange={(value) => setSelectedPaymentStatuses(value)}
							maxTagCount='responsive'
						/>
					</FilterGroup>
					<FilterActions>
						<Button
							onClick={() => setExcludeCancelled((prev) => !prev)}
							disabled={loading}
						>
							{excludeCancelled
								? "Include Cancelled Reservations"
								: "Exclude Cancelled Reservations"}
						</Button>
						<Button icon={<CloseCircleOutlined />} onClick={handleReset}>
							Reset
						</Button>
						<Button
							icon={<ReloadOutlined />}
							onClick={loadReport}
							loading={loading}
						>
							Refresh
						</Button>
					</FilterActions>
				</FilterBar>
			</Card>

			<Card title='Financial Summary' size='small'>
				{loading && !report ? (
					<Spin tip='Loading financial report...' />
				) : (
					<SummaryGrid>
						<SummaryCard>
							<SummaryLabel>Total Revenue (SAR)</SummaryLabel>
							<SummaryValue>{formatCurrency(totals.revenue)}</SummaryValue>
							<SummaryMeta>
								Reservations: {formatCount(totals.reservationCount)}
							</SummaryMeta>
						</SummaryCard>
						<SummaryCard>
							<SummaryLabel>Total Expenses (SAR)</SummaryLabel>
							<SummaryValue>{formatCurrency(totals.expenses)}</SummaryValue>
							<SummaryMeta>
								Expenses: {formatCount(totals.expenseCount)}
							</SummaryMeta>
						</SummaryCard>
						<SummaryCard>
							<SummaryLabel>Net (Revenue - Expenses)</SummaryLabel>
							<SummaryValue $negative={Number(totals.net) < 0}>
								{formatCurrency(totals.net)}
							</SummaryValue>
							<SummaryMeta>
								{Number(totals.net) < 0 ? "Loss" : "Profit"}
							</SummaryMeta>
						</SummaryCard>
						<SummaryCard>
							<SummaryLabel>Expenses as % of Revenue</SummaryLabel>
							<SummaryValue>{formatPercent(totals.expenseRatio)}</SummaryValue>
							<SummaryMeta>Lower is better</SummaryMeta>
						</SummaryCard>
						<SummaryCard>
							<SummaryLabel>Net Margin %</SummaryLabel>
							<SummaryValue>{formatPercent(totals.margin)}</SummaryValue>
							<SummaryMeta>Higher is better</SummaryMeta>
						</SummaryCard>
					</SummaryGrid>
				)}
			</Card>

			<Card title='Revenue vs Expenses by Month' size='small'>
				<TableWrapper>
					<Table
						rowKey={(record) => record.monthKey}
						dataSource={monthlyRows}
						columns={monthlyColumns}
						loading={loading}
						size='small'
						bordered
						pagination={false}
						summary={() => (
							<Table.Summary.Row>
								<Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
								<Table.Summary.Cell index={1} align='right'>
									{formatCurrency(totals.revenue)}
								</Table.Summary.Cell>
								<Table.Summary.Cell index={2} align='right'>
									{formatCurrency(totals.expenses)}
								</Table.Summary.Cell>
								<Table.Summary.Cell index={3} align='right'>
									{formatCurrency(totals.net)}
								</Table.Summary.Cell>
								<Table.Summary.Cell index={4} align='right'>
									{formatPercent(totals.expenseRatio)}
								</Table.Summary.Cell>
							</Table.Summary.Row>
						)}
					/>
				</TableWrapper>
			</Card>

			<Card title='Revenue by Payment Status' size='small'>
				<TableWrapper>
					<Table
						rowKey={(record) => record.status}
						dataSource={paymentRows}
						columns={paymentColumns}
						loading={loading}
						size='small'
						bordered
						pagination={false}
						summary={() => (
							<Table.Summary.Row>
								<Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
								<Table.Summary.Cell index={1} align='right'>
									{formatCount(paymentTotals.reservations)}
								</Table.Summary.Cell>
								<Table.Summary.Cell index={2} align='right'>
									{formatCurrency(paymentTotals.revenue)}
								</Table.Summary.Cell>
							</Table.Summary.Row>
						)}
					/>
				</TableWrapper>
			</Card>
		</FinancialReportWrapper>
	);
};

export default FinancialReport;

const FinancialReportWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;

	.ant-card {
		border-radius: 12px;
		border: 1px solid #f0f0f0;
	}
`;

const FilterBar = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 12px;
`;

const FilterGroup = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 220px;
`;

const FilterLabel = styled.span`
	font-size: 12px;
	color: #667085;
`;

const FilterActions = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
`;

const SummaryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 12px;
`;

const SummaryCard = styled.div`
	border: 1px solid #e4e7ec;
	border-radius: 12px;
	padding: 12px;
	background: #fafbfc;
`;

const SummaryLabel = styled.div`
	font-size: 12px;
	color: #667085;
	margin-bottom: 6px;
`;

const SummaryValue = styled.div`
	font-size: 18px;
	font-weight: 600;
	color: ${(props) => (props.$negative ? "#b42318" : "#101828")};
`;

const SummaryMeta = styled.div`
	margin-top: 6px;
	font-size: 12px;
	color: #475467;
`;

const TableWrapper = styled.div`
	width: 100%;
	overflow-x: auto;

	.ant-table {
		min-width: 760px;
	}

	.ant-table-summary {
		background: #fafafa;
	}

	.ant-table-summary > tr > td {
		font-weight: 600;
	}
`;

const NetValue = styled.span`
	color: ${(props) => (props.$negative ? "#b42318" : "#027a48")};
	font-weight: 600;
`;
