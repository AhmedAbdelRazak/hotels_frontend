/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Button, Empty, Modal, Select, Table, Tag, message } from "antd";
import {
	BankOutlined,
	CalendarOutlined,
	DownloadOutlined,
	HomeOutlined,
	ReloadOutlined,
	WalletOutlined,
} from "@ant-design/icons";
import moment from "moment";
import * as XLSX from "xlsx";

import { getAgentWalletSummary } from "../apiAdmin";

const labels = {
	en: {
		title: "Financials",
		subtitle:
			"Agent wallets, reservation deductions, commissions, and pending confirmations by hotel.",
		chooseHotel: "Choose hotel",
		chooseAgent: "Choose agent",
		chooseAgentPlaceholder: "Choose agent name | company",
		required: "Required",
		chooseAgentFirst:
			"Choose an agent first to review wallet movements and reservation deductions.",
		refresh: "Refresh",
		exportExcel: "Export Excel",
		openWorkspace: "Open full financials",
		hotelList: "Hotels",
		agent: "Agent",
		company: "Company",
		walletAdded: "Wallet added",
		walletUsed: "Reservation deductions",
		balance: "Current balance",
		commissionDue: "Commission due",
		reservations: "Reservations",
		pending: "Pending confirmation",
		transactions: "Wallet movements",
		reservationDeductions: "Reservations deducted from wallet",
		type: "Type",
		amount: "Amount",
		date: "Date",
		reference: "Reference",
		note: "Note",
		confirmation: "Confirmation",
		guest: "Guest",
		commission: "Commission",
		status: "Status",
		noHotels: "No hotels are assigned to this manager yet.",
		noData: "No financial data for this hotel yet.",
		error: "Unable to load financials.",
		filePrefix: "manager-financials",
	},
	ar: {
		title: "المالية",
		subtitle:
			"محافظ الوكلاء، خصومات الحجوزات، العمولات، والحجوزات بانتظار التأكيد حسب الفندق.",
		chooseHotel: "اختر الفندق",
		refresh: "تحديث",
		exportExcel: "تصدير إكسل",
		openWorkspace: "فتح المالية بالكامل",
		hotelList: "الفنادق",
		agent: "الوكيل",
		company: "الشركة",
		walletAdded: "المضافة للمحفظة",
		walletUsed: "خصومات الحجوزات",
		balance: "الرصيد الحالي",
		commissionDue: "العمولة المستحقة",
		reservations: "الحجوزات",
		pending: "بانتظار التأكيد",
		transactions: "حركات المحفظة",
		reservationDeductions: "الحجوزات المخصومة من المحفظة",
		type: "النوع",
		amount: "المبلغ",
		date: "التاريخ",
		reference: "مرجع",
		note: "ملاحظة",
		confirmation: "رقم التأكيد",
		guest: "الضيف",
		commission: "العمولة",
		status: "الحالة",
		noHotels: "لا توجد فنادق مخصصة لهذا المدير حتى الآن.",
		noData: "لا توجد بيانات مالية لهذا الفندق حتى الآن.",
		error: "تعذر تحميل البيانات المالية.",
		filePrefix: "financials",
	},
};

Object.assign(labels.ar, {
	chooseAgent: "اختر الوكيل",
	chooseAgentPlaceholder: "اختر اسم الوكيل | الشركة",
	required: "مطلوب",
	chooseAgentFirst:
		"اختر الوكيل أولاً لعرض حركات المحفظة والحجوزات المخصومة.",
});

const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const money = (value) =>
	Number(value || 0).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const toTitleCase = (value = "") =>
	String(value || "")
		.toLowerCase()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) =>
	value ? moment(value).format("YYYY-MM-DD") : "-";

const ManagerFinancialsModal = ({
	open,
	onCancel,
	hotels = [],
	userId,
	token,
	isArabic = false,
}) => {
	const txt = useMemo(() => labels[isArabic ? "ar" : "en"], [isArabic]);
	const normalizedHotels = useMemo(
		() =>
			(Array.isArray(hotels) ? hotels : [])
				.map((hotel) => ({
					id: normalizeId(hotel),
					name: toTitleCase(hotel?.hotelName || hotel?.name || ""),
				}))
				.filter((hotel) => hotel.id),
		[hotels]
	);

	const [selectedHotelId, setSelectedHotelId] = useState("");
	const [summary, setSummary] = useState(null);
	const [selectedAgentId, setSelectedAgentId] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		if (!normalizedHotels.length) {
			setSelectedHotelId("");
			setSummary(null);
			return;
		}
		if (!normalizedHotels.some((hotel) => hotel.id === selectedHotelId)) {
			setSelectedHotelId(normalizedHotels[0].id);
		}
	}, [normalizedHotels, open, selectedHotelId]);

	const selectedHotel = useMemo(
		() =>
			normalizedHotels.find((hotel) => hotel.id === selectedHotelId) ||
			normalizedHotels[0] ||
			null,
		[normalizedHotels, selectedHotelId]
	);

	const loadFinancials = useCallback(async () => {
		if (!open || !selectedHotelId || !userId || !token) return;
		setLoading(true);
		try {
			const data = await getAgentWalletSummary(
				selectedHotelId,
				userId,
				token,
				{}
			);
			if (data?.error) {
				message.error(data.error || txt.error);
				setSummary(null);
				return;
			}
			setSummary(data);
			const nextAgents = Array.isArray(data?.agents) ? data.agents : [];
			setSelectedAgentId((current) =>
				nextAgents.length === 1
					? normalizeId(nextAgents[0]?.agent)
					: nextAgents.some((item) => normalizeId(item.agent) === current)
					? current
					: ""
			);
		} catch (error) {
			console.error(error);
			message.error(txt.error);
			setSummary(null);
		} finally {
			setLoading(false);
		}
	}, [open, selectedHotelId, token, txt.error, userId]);

	useEffect(() => {
		loadFinancials();
	}, [loadFinancials]);

	const agents = useMemo(
		() => (Array.isArray(summary?.agents) ? summary.agents : []),
		[summary]
	);

	const activeAgent = useMemo(
		() =>
			agents.find((item) => normalizeId(item.agent) === selectedAgentId) || null,
		[agents, selectedAgentId]
	);

	const agentOptions = useMemo(
		() =>
			agents.map((item) => {
				const name = toTitleCase(item.agent?.name || item.agent?.email || "");
				const company = item.agent?.companyName
					? toTitleCase(item.agent.companyName)
					: item.agent?.email || "";
				const label =
					company && company !== name ? `${name} | ${company}` : name || company;
				return {
					value: normalizeId(item.agent),
					label,
				};
			}),
		[agents]
	);

	const activeTransactions = Array.isArray(activeAgent?.transactions)
		? activeAgent.transactions
		: [];
	const activeReservations = Array.isArray(activeAgent?.reservations)
		? activeAgent.reservations
		: [];

	const exportExcel = useCallback(() => {
		const summaryRows = agents.map((item) => ({
			Agent: item.agent?.name || "",
			Company: item.agent?.companyName || "",
			Email: item.agent?.email || "",
			"Wallet Added": item.walletAdded,
			"Reservation Deductions": item.walletUsed,
			Balance: item.balance,
			Reservations: item.totalReservations,
			"Reservation Value": item.totalReservationValue,
			"Commission Due": item.commissionDue,
			"Pending Confirmation": item.pendingConfirmation,
		}));
		const transactionRows = agents.flatMap((item) =>
			(Array.isArray(item.transactions) ? item.transactions : []).map((tx) => ({
				Agent: item.agent?.name || "",
				Company: item.agent?.companyName || "",
				Type: tx.transactionType || "",
				Amount: tx.amount || 0,
				Date: formatDate(tx.transactionDate),
				Reference: tx.reference || "",
				Note: tx.note || "",
			}))
		);
		const reservationRows = agents.flatMap((item) =>
			(Array.isArray(item.reservations) ? item.reservations : []).map(
				(reservation) => ({
					Agent: item.agent?.name || "",
					Company: item.agent?.companyName || "",
					Confirmation: reservation.confirmation_number || "",
					Guest: reservation.customer_details?.name || "",
					Date: formatDate(reservation.booked_at || reservation.createdAt),
					Amount: reservation.total_amount || 0,
					Commission:
						reservation.commission ||
						reservation.financial_cycle?.commissionAmount ||
						0,
					Status: reservation.reservation_status || reservation.state || "",
				})
			)
		);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(
			workbook,
			XLSX.utils.json_to_sheet(summaryRows),
			"Agents"
		);
		XLSX.utils.book_append_sheet(
			workbook,
			XLSX.utils.json_to_sheet(transactionRows),
			"Wallet Movements"
		);
		XLSX.utils.book_append_sheet(
			workbook,
			XLSX.utils.json_to_sheet(reservationRows),
			"Reservations"
		);
		XLSX.writeFile(
			workbook,
			`${txt.filePrefix}-${selectedHotel?.name || selectedHotelId}-${moment().format(
				"YYYY-MM-DD"
			)}.xlsx`
		);
	}, [agents, selectedHotel?.name, selectedHotelId, txt.filePrefix]);

	const openFullWorkspace = () => {
		if (!selectedHotelId || !userId) return;
		window.location.href = `/hotel-management/financials/${userId}/${selectedHotelId}`;
	};

	const agentColumns = useMemo(
		() => [
			{
				title: txt.agent,
				dataIndex: ["agent", "name"],
				render: (_, row) => (
					<AgentButton
						type='button'
						onClick={() => setSelectedAgentId(normalizeId(row.agent))}
					>
						<strong>
							{row.agent?.name
								? toTitleCase(row.agent.name)
								: row.agent?.email || "-"}
						</strong>
						<span>
							{row.agent?.companyName
								? toTitleCase(row.agent.companyName)
								: row.agent?.email || "-"}
						</span>
					</AgentButton>
				),
			},
			{
				title: txt.walletAdded,
				dataIndex: "walletAdded",
				render: (value) => `${money(value)} SAR`,
			},
			{
				title: txt.walletUsed,
				dataIndex: "walletUsed",
				render: (value) => `${money(value)} SAR`,
			},
			{
				title: txt.balance,
				dataIndex: "balance",
				render: (value) => (
					<Tag color={Number(value || 0) >= 0 ? "green" : "red"}>
						{money(value)} SAR
					</Tag>
				),
			},
			{ title: txt.reservations, dataIndex: "totalReservations" },
			{
				title: txt.commissionDue,
				dataIndex: "commissionDue",
				render: (value) => `${money(value)} SAR`,
			},
			{ title: txt.pending, dataIndex: "pendingConfirmation" },
		],
		[txt]
	);

	const transactionColumns = useMemo(
		() => [
			{ title: txt.type, dataIndex: "transactionType" },
			{
				title: txt.amount,
				dataIndex: "amount",
				render: (value) => `${money(value)} SAR`,
			},
			{
				title: txt.date,
				dataIndex: "transactionDate",
				render: formatDate,
			},
			{ title: txt.reference, dataIndex: "reference" },
			{ title: txt.note, dataIndex: "note" },
		],
		[txt]
	);

	const reservationColumns = useMemo(
		() => [
			{ title: txt.confirmation, dataIndex: "confirmation_number" },
			{
				title: txt.guest,
				dataIndex: ["customer_details", "name"],
				render: (value) => value || "-",
			},
			{
				title: txt.date,
				render: (_, row) => formatDate(row.booked_at || row.createdAt),
			},
			{
				title: txt.amount,
				dataIndex: "total_amount",
				render: (value) => `${money(value)} SAR`,
			},
			{
				title: txt.commission,
				render: (_, row) =>
					`${money(
						row.commission || row.financial_cycle?.commissionAmount || 0
					)} SAR`,
			},
			{
				title: txt.status,
				dataIndex: "reservation_status",
				render: (value, row) => <Tag>{value || row.state || "-"}</Tag>,
			},
		],
		[txt]
	);

	return (
		<Modal
			open={open}
			onCancel={onCancel}
			footer={null}
			width='min(1540px, 96vw)'
			centered
			destroyOnClose
			className='manager-financials-modal'
		>
			<ModalBody dir={isArabic ? "rtl" : "ltr"}>
				<Hero>
					<div>
						<Pill>
							<WalletOutlined />
							{selectedHotel?.name || txt.title}
						</Pill>
						<h2>{txt.title}</h2>
						<p>{txt.subtitle}</p>
					</div>
					<ActionRow>
						<Button icon={<ReloadOutlined />} onClick={loadFinancials}>
							{txt.refresh}
						</Button>
						<Button
							icon={<DownloadOutlined />}
							onClick={exportExcel}
							disabled={!agents.length}
						>
							{txt.exportExcel}
						</Button>
						<Button
							type='primary'
							icon={<WalletOutlined />}
							onClick={openFullWorkspace}
							disabled={!selectedHotelId}
						>
							{txt.openWorkspace}
						</Button>
					</ActionRow>
				</Hero>

				{normalizedHotels.length ? (
					<>
						<SelectorGrid>
							<SelectorField>
								<LabelLine>
									<span>{txt.chooseHotel}</span>
									<Requirement>{txt.required}</Requirement>
								</LabelLine>
							<Select
								value={selectedHotelId || undefined}
								onChange={(value) => {
									setSelectedHotelId(value);
									setSelectedAgentId("");
									setSummary(null);
								}}
								options={normalizedHotels.map((hotel) => ({
									value: hotel.id,
									label: hotel.name || hotel.id,
								}))}
								showSearch
								optionFilterProp='label'
							/>
							</SelectorField>
							<SelectorField>
								<LabelLine>
									<span>{txt.chooseAgent}</span>
									<Requirement>{txt.required}</Requirement>
								</LabelLine>
								<Select
									value={selectedAgentId || undefined}
									onChange={setSelectedAgentId}
									options={agentOptions}
									showSearch
									disabled={loading || !agents.length}
									optionFilterProp='label'
									placeholder={txt.chooseAgentPlaceholder}
								/>
							</SelectorField>
						</SelectorGrid>

						<HotelGrid>
							{normalizedHotels.map((hotel) => (
								<HotelChip
									key={hotel.id}
									type='button'
									$active={hotel.id === selectedHotelId}
									onClick={() => {
										setSelectedHotelId(hotel.id);
										setSelectedAgentId("");
										setSummary(null);
									}}
								>
									<HomeOutlined />
									{hotel.name || hotel.id}
								</HotelChip>
							))}
						</HotelGrid>

						<SummaryGrid>
							<SummaryCard $tone='blue'>
								<WalletOutlined />
								<span>{txt.walletAdded}</span>
								<strong>{money(summary?.totals?.walletAdded)} SAR</strong>
							</SummaryCard>
							<SummaryCard $tone='orange'>
								<BankOutlined />
								<span>{txt.walletUsed}</span>
								<strong>{money(summary?.totals?.walletUsed)} SAR</strong>
							</SummaryCard>
							<SummaryCard $tone='green'>
								<WalletOutlined />
								<span>{txt.balance}</span>
								<strong>{money(summary?.totals?.balance)} SAR</strong>
							</SummaryCard>
							<SummaryCard $tone='purple'>
								<BankOutlined />
								<span>{txt.commissionDue}</span>
								<strong>{money(summary?.totals?.commissionDue)} SAR</strong>
							</SummaryCard>
						</SummaryGrid>

						<Panel>
							<PanelTitle>{txt.agent}</PanelTitle>
							<Table
								loading={loading}
								dataSource={agents}
								columns={agentColumns}
								rowKey={(row) => normalizeId(row.agent)}
								size='small'
								pagination={{ pageSize: 6 }}
								scroll={{ x: 980 }}
								onRow={(row) => ({
									onClick: () => setSelectedAgentId(normalizeId(row.agent)),
								})}
								rowClassName={(row) =>
									normalizeId(row.agent) === selectedAgentId ? "selected-row" : ""
								}
							/>
						</Panel>

						{agents.length && !activeAgent ? (
							<RequiredNotice>{txt.chooseAgentFirst}</RequiredNotice>
						) : (
							<DetailGrid>
							<Panel>
								<PanelTitle>
									<CalendarOutlined />
									{txt.transactions}
								</PanelTitle>
								<Table
									dataSource={activeTransactions}
									columns={transactionColumns}
									rowKey={(row) => row._id || row.reference || row.createdAt}
									size='small'
									pagination={{ pageSize: 5 }}
									scroll={{ x: 720 }}
									locale={{ emptyText: txt.noData }}
								/>
							</Panel>
							<Panel>
								<PanelTitle>
									<BankOutlined />
									{txt.reservationDeductions}
								</PanelTitle>
								<Table
									dataSource={activeReservations}
									columns={reservationColumns}
									rowKey={(row) => row._id || row.confirmation_number}
									size='small'
									pagination={{ pageSize: 5 }}
									scroll={{ x: 780 }}
									locale={{ emptyText: txt.noData }}
								/>
							</Panel>
							</DetailGrid>
						)}
					</>
				) : (
					<Empty description={txt.noHotels} />
				)}
			</ModalBody>
		</Modal>
	);
};

export default ManagerFinancialsModal;

const ModalBody = styled.div`
	padding: 0.35rem;

	.ant-table-wrapper {
		direction: inherit;
	}

	.ant-table {
		border: 1px solid #d7ebff;
		border-radius: 12px;
		overflow: hidden;
	}

	.ant-table-thead > tr > th {
		background: #eaf6ff;
		color: #0f2842;
		font-weight: 900;
		text-align: inherit;
	}

	.selected-row td {
		background: #eef7ff !important;
	}
`;

const Hero = styled.section`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem;
	border: 1px solid #cfe8ff;
	border-radius: 16px;
	background: linear-gradient(135deg, #eff8ff 0%, #ffffff 100%);
	margin-bottom: 0.8rem;

	h2 {
		margin: 0.45rem 0 0.25rem;
		font-size: clamp(1.45rem, 2vw, 2.1rem);
		font-weight: 950;
		color: #0f172a;
	}

	p {
		margin: 0;
		color: #425b78;
		font-weight: 800;
	}

	@media (max-width: 760px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const Pill = styled.span`
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	width: fit-content;
	padding: 0.25rem 0.65rem;
	border: 1px solid #9fd0ff;
	border-radius: 999px;
	background: #f8fcff;
	color: #0068d6;
	font-weight: 950;
	text-transform: capitalize;
`;

const ActionRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 0.55rem;
	flex-wrap: wrap;

	.ant-btn {
		font-weight: 900;
		min-height: 38px;
	}

	@media (max-width: 760px) {
		justify-content: stretch;

		.ant-btn {
			flex: 1 1 150px;
		}
	}
`;

const SelectorGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	align-items: center;
	gap: 0.75rem;
	padding: 0.85rem 1rem;
	border: 1px solid #d7ebff;
	border-radius: 14px;
	background: #fff;

	.ant-select {
		width: 100%;
	}

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const SelectorField = styled.div`
	display: grid;
	gap: 0.4rem;
`;

const LabelLine = styled.label`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	font-weight: 950;
	color: #0f2842;
`;

const Requirement = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 22px;
	padding: 0 0.5rem;
	border-radius: 999px;
	border: 1px solid #ffb4a8;
	background: #fff4f2;
	color: #b42318;
	font-size: 0.72rem;
	font-weight: 900;
`;

const HotelGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 0.65rem;
	margin: 0.75rem 0;
`;

const HotelChip = styled.button`
	border: 1px solid ${(p) => (p.$active ? "#0d6efd" : "#cfe8ff")};
	background: ${(p) =>
		p.$active ? "linear-gradient(135deg, #e8f4ff, #ffffff)" : "#ffffff"};
	color: #0f2842;
	border-radius: 12px;
	padding: 0.75rem 0.85rem;
	font-weight: 950;
	text-align: inherit;
	text-transform: capitalize;
	box-shadow: ${(p) =>
		p.$active ? "0 12px 24px rgba(13, 110, 253, 0.14)" : "none"};
	cursor: pointer;

	svg {
		margin-inline-end: 0.4rem;
		color: #0d6efd;
	}
`;

const SummaryGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.75rem;
	margin-bottom: 0.85rem;

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
	}
`;

const SummaryCard = styled.div`
	border-radius: 14px;
	border: 1px solid
		${(p) =>
			p.$tone === "orange"
				? "#ffb066"
				: p.$tone === "green"
				? "#60d394"
				: p.$tone === "purple"
				? "#b197fc"
				: "#8ecbff"};
	background: ${(p) =>
		p.$tone === "orange"
			? "#fff6eb"
			: p.$tone === "green"
			? "#edfff5"
			: p.$tone === "purple"
			? "#f4edff"
			: "#eef8ff"};
	padding: 0.85rem;
	display: grid;
	gap: 0.35rem;

	svg {
		color: ${(p) =>
			p.$tone === "orange"
				? "#e87500"
				: p.$tone === "green"
				? "#079455"
				: p.$tone === "purple"
				? "#7048e8"
				: "#0875d1"};
		font-size: 1.2rem;
	}

	span {
		color: #4b6380;
		font-weight: 850;
	}

	strong {
		color: #07182d;
		font-size: clamp(1.1rem, 1.5vw, 1.45rem);
		font-weight: 950;
	}
`;

const DetailGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.85rem;

	@media (max-width: 980px) {
		grid-template-columns: 1fr;
	}
`;

const Panel = styled.section`
	border: 1px solid #d7ebff;
	border-radius: 16px;
	background: #ffffff;
	padding: 0.8rem;
	margin-bottom: 0.85rem;
	overflow: hidden;
`;

const RequiredNotice = styled.div`
	margin-bottom: 0.85rem;
	padding: 0.9rem 1rem;
	border: 1px solid #ffd6a5;
	border-radius: 14px;
	background: linear-gradient(135deg, #fff8ed 0%, #ffffff 100%);
	color: #8a4b00;
	font-weight: 950;
	text-align: center;
`;

const PanelTitle = styled.h3`
	display: flex;
	align-items: center;
	gap: 0.45rem;
	margin: 0 0 0.65rem;
	color: #0f2842;
	font-size: 1rem;
	font-weight: 950;

	svg {
		color: #0d6efd;
	}
`;

const AgentButton = styled.button`
	display: grid;
	gap: 0.15rem;
	background: transparent;
	border: 0;
	padding: 0;
	cursor: pointer;
	text-align: inherit;
	color: #0d4b87;

	strong {
		font-weight: 950;
		text-decoration: underline;
		text-transform: capitalize;
	}

	span {
		color: #64748b;
		font-size: 0.82rem;
		text-transform: capitalize;
	}
`;
