import React, { useEffect, useMemo, useState } from "react";
import { Button, InputNumber, message, Modal, Table, Tooltip } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { isSuperAdminUser } from "../utils/superUsers";

const safeParseFloat = (val, fallback = 0) => {
	const parsed = parseFloat(val);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const hasNumericInput = (value) =>
	value !== null && value !== undefined && value !== "";

const firstNumber = (...values) => {
	for (const value of values) {
		if (!hasNumericInput(value)) continue;
		const parsed = safeParseFloat(value, NaN);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
};

const roundMoney = (value) => Number(safeParseFloat(value, 0).toFixed(2));

const formatMoney = (value) => Number(value || 0).toFixed(2);

const TEXT = {
	en: {
		title: "Edit Pricing Breakdown",
		cancel: "Cancel",
		inherit: "Inherit First Row Values",
		save: "Apply Pricing",
		applied:
			"Pricing was applied in the editor. Click Submit/Update Reservation to save it permanently.",
		distribute: "Distribute",
		distributeAll: "Distribute totals",
		moreDetails: "More details",
		enterPlaceholder: (label) => `Enter ${label.toLowerCase()}`,
		invalidAmount: (label) => `Please enter a valid ${label.toLowerCase()}.`,
		noDays: "No days available to distribute over.",
		distributed: (label) => `${label} distributed across all days.`,
		firstRowCopied: "First row values copied to all days.",
		netTooHigh: "Net after expenses cannot exceed the client price.",
		columns: {
			date: "Date",
			clientPrice: "Client/Main Price",
			rootPrice: "Root Price",
			netAfterExpenses: "Net After Expenses",
			otaExpense: "OTA/Other Expense",
			platformMargin: "Platform Margin",
			rate: "Rate %",
			totals: "Totals",
		},
		distribution: {
			client: "Client/Main Total",
			root: "Root Total",
			net: "Net After Expenses Total",
			commission: "Commission Amount",
		},
		help: {
			clientPrice:
				"The guest/admin price. This is the main amount the client sees and the reservation total is based on it.",
			rootPrice:
				"The hotel-owner/management price. For admin-priced reservations, hotel management sees this root amount only.",
			netAfterExpenses:
				"Client/main price after OTA or other expenses such as Expedia, Agoda, or similar costs.",
			otaExpense:
				"Calculated automatically as Client/Main Price minus Net After Expenses.",
			platformMargin:
				"Calculated automatically as Net After Expenses minus Root Price.",
			clientTotal:
				"Distributes the total amount the guest/client sees across all stay days. This remains the client-facing reservation total.",
			rootTotal:
				"Distributes the total amount provided by hotel ownership/management. Hotel management sees this total only for admin-priced reservations.",
			netTotal:
				"Distributes the total after OTA or other expenses. OTA/Other Expense is calculated as Client/Main Total minus this value.",
			commissionAmount:
				"General reservation commission saved separately from nightly room pricing.",
		},
	},
	ar: {
		applied:
			"\u062a\u0645 \u062a\u0637\u0628\u064a\u0642 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u062f\u0627\u062e\u0644 \u0646\u0645\u0648\u0630\u062c \u0627\u0644\u062d\u062c\u0632. \u0627\u0636\u063a\u0637 \u062d\u0641\u0638/\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u062c\u0632 \u0644\u062a\u062b\u0628\u064a\u062a\u0647\u0627.",
		title: "تعديل تفاصيل الأسعار",
		cancel: "إلغاء",
		inherit: "نسخ قيم أول يوم",
		save: "حفظ",
		distribute: "توزيع",
		moreDetails: "مزيد من التفاصيل",
		enterPlaceholder: (label) => `أدخل ${label}`,
		invalidAmount: (label) => `يرجى إدخال قيمة صحيحة لـ ${label}.`,
		noDays: "لا توجد أيام متاحة للتوزيع.",
		distributed: (label) => `تم توزيع ${label} على كل الأيام.`,
		firstRowCopied: "تم نسخ قيم أول يوم لكل الأيام.",
		netTooHigh: "لا يمكن أن يكون الصافي بعد المصاريف أعلى من سعر العميل.",
		columns: {
			date: "التاريخ",
			clientPrice: "سعر العميل/الرئيسي",
			rootPrice: "السعر الأساسي",
			netAfterExpenses: "الصافي بعد المصاريف",
			otaExpense: "مصاريف المنصات/أخرى",
			platformMargin: "هامش المنصة",
			rate: "النسبة %",
			totals: "الإجمالي",
		},
		distribution: {
			client: "إجمالي العميل/السعر الرئيسي",
			root: "إجمالي السعر الأساسي",
			net: "إجمالي الصافي بعد المصاريف",
		},
		help: {
			clientPrice:
				"السعر الذي يراه العميل والإدارة. إجمالي الحجز للعميل يعتمد على هذا السعر.",
			rootPrice:
				"السعر المقدم من إدارة الفندق أو المالك. عند تسعير الحجز بواسطة الإدارة، يرى فريق الفندق هذا السعر فقط.",
			netAfterExpenses:
				"سعر العميل بعد خصم مصاريف المنصات مثل Expedia أو Agoda أو أي مصاريف أخرى.",
			otaExpense:
				"يتم حسابه تلقائيا: سعر العميل/الرئيسي ناقص الصافي بعد المصاريف.",
			platformMargin:
				"يتم حسابه تلقائيا: الصافي بعد المصاريف ناقص السعر الأساسي.",
			clientTotal:
				"يوزع إجمالي السعر الذي يراه العميل على كل أيام الإقامة. هذا هو إجمالي الحجز الظاهر للعميل.",
			rootTotal:
				"يوزع إجمالي السعر المقدم من مالك أو إدارة الفندق. يرى فريق الفندق هذا الإجمالي فقط في الحجوزات المسعرة بواسطة الإدارة.",
			netTotal:
				"يوزع الإجمالي بعد مصاريف المنصات أو المصاريف الأخرى. مصاريف المنصات/أخرى تحسب من إجمالي العميل ناقص هذا الرقم.",
		},
	},
};

const HelpIcon = ({ title, ariaLabel }) => (
	<Tooltip
		title={title}
		trigger={["hover", "focus", "click"]}
		overlayStyle={{ maxWidth: 320 }}
	>
		<ExclamationCircleOutlined
			className='pricing-info-icon'
			tabIndex={0}
			aria-label={ariaLabel}
		/>
	</Tooltip>
);

const labelWithHelp = (label, help, ariaLabel) => (
	<span className='pricing-column-title'>
		{label}
		<HelpIcon title={help} ariaLabel={ariaLabel} />
	</span>
);

const normalizePricingRow = (row = {}) => {
	const clientPrice = roundMoney(
		firstNumber(
			row.clientPrice,
			row.mainPrice,
			row.totalPriceWithCommission,
			row.price,
		) ?? 0,
	);
	const rootPrice = roundMoney(
		firstNumber(row.rootPrice, row.totalPriceWithoutCommission) ?? 0,
	);
	const netInput = firstNumber(
		row.netAfterExpenses,
		row.netAfterOtaExpenses,
		row.netAfterOtherExpenses,
	);
	const expenseInput = firstNumber(
		row.otaExpenseAmount,
		row.otherExpenseAmount,
		row.expenseAmount,
	);
	const netAfterExpenses = roundMoney(
		netInput !== null
			? netInput
			: expenseInput !== null
			  ? clientPrice - expenseInput
			  : clientPrice,
	);
	const otaExpenseAmount = roundMoney(clientPrice - netAfterExpenses);
	const platformMargin = roundMoney(netAfterExpenses - rootPrice);
	const otaExpenseRate =
		clientPrice > 0 ? roundMoney((otaExpenseAmount / clientPrice) * 100) : 0;
	const platformMarginRate =
		netAfterExpenses > 0
			? roundMoney((platformMargin / netAfterExpenses) * 100)
			: 0;

	return {
		...row,
		price: clientPrice,
		clientPrice,
		mainPrice: clientPrice,
		rootPrice,
		commissionRate: safeParseFloat(row.commissionRate, 0),
		totalPriceWithCommission: clientPrice,
		totalPriceWithoutCommission: rootPrice,
		netAfterExpenses,
		netAfterOtaExpenses: netAfterExpenses,
		otaExpenseAmount,
		otaExpenseRate,
		platformMargin,
		platformMarginRate,
	};
};

const summarizePricingRows = (rows = []) =>
	(Array.isArray(rows) ? rows : []).reduce(
		(acc, row) => ({
			client: roundMoney(acc.client + safeParseFloat(row.clientPrice, 0)),
			root: roundMoney(acc.root + safeParseFloat(row.rootPrice, 0)),
			net: roundMoney(acc.net + safeParseFloat(row.netAfterExpenses, 0)),
		}),
		{ client: 0, root: 0, net: 0 },
	);

const distributeMoney = (total, count) => {
	const totalCents = Math.round(safeParseFloat(total, 0) * 100);
	const baseCents = Math.floor(totalCents / count);
	let remainder = totalCents - baseCents * count;
	return Array.from({ length: count }, () => {
		const cents = baseCents + (remainder > 0 ? 1 : 0);
		remainder -= remainder > 0 ? 1 : 0;
		return cents / 100;
	});
};

const EDIT_PRICING_MODAL_Z = 19020;

const EditPricingModal = ({
	visible,
	onClose,
	pricingByDay,
	onUpdate,
	showCommissionAmount = false,
	commissionAmount = null,
	onCommissionChange = () => {},
}) => {
	const { chosenLanguage } = useCartContext();
	const auth = isAuthenticated() || {};
	const canViewPlatformProfit = isSuperAdminUser(auth?.user);
	const isArabic = chosenLanguage === "Arabic";
	const t = TEXT[isArabic ? "ar" : "en"];
	const distributeAllLabel = t.distributeAll || t.distribute;
	const commissionLabel =
		t.distribution.commission ||
		(isArabic ? "\u0645\u0628\u0644\u063a \u0627\u0644\u0639\u0645\u0648\u0644\u0629" : "Commission Amount");
	const commissionHelp =
		t.help.commissionAmount ||
		(isArabic
			? "\u0627\u0644\u0639\u0645\u0648\u0644\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u062d\u062c\u0632. \u064a\u062a\u0645 \u062d\u0641\u0638\u0647\u0627 \u0645\u0646\u0641\u0635\u0644\u0629 \u0639\u0646 \u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0644\u064a\u0627\u0644\u064a."
			: "General reservation commission saved separately from nightly room pricing.");
	const [editableData, setEditableData] = useState([]);
	const [distributionTotals, setDistributionTotals] = useState({
		client: null,
		root: null,
		net: null,
	});
	const [commissionDraft, setCommissionDraft] = useState(null);

	useEffect(() => {
		if (visible) {
			const normalizedRows = (pricingByDay || []).map(normalizePricingRow);
			setEditableData(normalizedRows);
			setDistributionTotals(summarizePricingRows(normalizedRows));
			setCommissionDraft(
				showCommissionAmount && hasNumericInput(commissionAmount)
					? roundMoney(commissionAmount)
					: null,
			);
		}
	}, [visible, pricingByDay, commissionAmount, showCommissionAmount]);

	const totals = useMemo(
		() =>
			editableData.reduce(
				(acc, row) => {
					acc.client += safeParseFloat(row.clientPrice, 0);
					acc.root += safeParseFloat(row.rootPrice, 0);
					acc.net += safeParseFloat(row.netAfterExpenses, 0);
					acc.expense += safeParseFloat(row.otaExpenseAmount, 0);
					acc.margin += safeParseFloat(row.platformMargin, 0);
					return acc;
				},
				{ client: 0, root: 0, net: 0, expense: 0, margin: 0 },
			),
		[editableData],
	);

	const commitRows = (rows) => {
		const normalizedRows = rows.map(normalizePricingRow);
		setEditableData(normalizedRows);
		setDistributionTotals(summarizePricingRows(normalizedRows));
		onUpdate(normalizedRows);
	};

	const handleInputChange = (val, rowIndex, field) => {
		const nextRows = editableData.map((row, index) => {
			if (index !== rowIndex) return row;
			const hadNoExpense =
				Math.abs(
					safeParseFloat(row.clientPrice, 0) -
						safeParseFloat(row.netAfterExpenses, 0),
				) < 0.01 && Math.abs(safeParseFloat(row.otaExpenseAmount, 0)) < 0.01;
			const nextRow = { ...row, [field]: val };

			if (field === "clientPrice") {
				nextRow.price = val;
				nextRow.mainPrice = val;
				nextRow.totalPriceWithCommission = val;
				nextRow.totalPriceWithoutCommission = val;
				if (hadNoExpense) {
					nextRow.netAfterExpenses = val;
					nextRow.netAfterOtaExpenses = val;
				}
			}

			if (field === "netAfterExpenses") {
				nextRow.netAfterOtaExpenses = val;
			}

			return nextRow;
		});
		commitRows(nextRows);
	};

	const handleDistributionInput = (key, value) => {
		setDistributionTotals((current) => ({ ...current, [key]: value }));
	};

	const buildDistributedRows = (rows, field, total) => {
		const shares = distributeMoney(total, editableData.length);
		return rows.map((row, index) => {
			const hadNoExpense =
				Math.abs(
					safeParseFloat(row.clientPrice, 0) -
						safeParseFloat(row.netAfterExpenses, 0),
				) < 0.01 && Math.abs(safeParseFloat(row.otaExpenseAmount, 0)) < 0.01;
			const nextRow = { ...row, [field]: shares[index] };

			if (field === "clientPrice") {
				nextRow.price = shares[index];
				nextRow.mainPrice = shares[index];
				nextRow.totalPriceWithCommission = shares[index];
				nextRow.totalPriceWithoutCommission = shares[index];
				if (hadNoExpense) {
					nextRow.netAfterExpenses = shares[index];
					nextRow.netAfterOtaExpenses = shares[index];
				}
			}

			if (field === "netAfterExpenses") {
				nextRow.netAfterOtaExpenses = shares[index];
			}

			return nextRow;
		});
	};

	const handleDistributeTotals = () => {
		if (!editableData.length) {
			message.error(t.noDays);
			return;
		}

		for (const control of distributionControls) {
			const rawTotal = distributionTotals[control.key];
			const total = safeParseFloat(rawTotal, NaN);
			if (!hasNumericInput(rawTotal) || total < 0) {
				message.error(t.invalidAmount(control.label));
				return;
			}
		}

		let nextRows = editableData;
		distributionControls.forEach((control) => {
			nextRows = buildDistributedRows(
				nextRows,
				control.field,
				safeParseFloat(distributionTotals[control.key], 0),
			);
		});

		commitRows(nextRows);
		message.success(distributeAllLabel);
	};

	const handleCommissionInput = (value) => {
		const nextValue = hasNumericInput(value) ? value : null;
		setCommissionDraft(nextValue);
		onCommissionChange(
			hasNumericInput(nextValue) ? roundMoney(nextValue) : null,
		);
	};

	const handleInherit = () => {
		if (!editableData.length) return;
		const first = normalizePricingRow(editableData[0]);
		const nextRows = editableData.map((row) => ({
			...row,
			clientPrice: first.clientPrice,
			mainPrice: first.clientPrice,
			price: first.clientPrice,
			totalPriceWithCommission: first.clientPrice,
			totalPriceWithoutCommission: first.clientPrice,
			rootPrice: first.rootPrice,
			netAfterExpenses: first.netAfterExpenses,
			netAfterOtaExpenses: first.netAfterExpenses,
			commissionRate: first.commissionRate,
		}));

		commitRows(nextRows);
		message.success(t.firstRowCopied);
	};

	const handleSave = () => {
		const invalidNetRow = editableData.find(
			(row) =>
				safeParseFloat(row.netAfterExpenses, 0) -
					safeParseFloat(row.clientPrice, 0) >
				0.009,
		);
		if (invalidNetRow) {
			message.error(t.netTooHigh);
			return;
		}

		if (showCommissionAmount) {
			onCommissionChange(
				hasNumericInput(commissionDraft) ? roundMoney(commissionDraft) : null,
			);
		}
		commitRows(editableData);
		message.success(t.applied, 5);
		onClose();
	};

	const moneyInput = (field, width = 128) => (value, record, index) => (
		<InputNumber
			value={value}
			min={0}
			step={0.01}
			precision={2}
			style={{ width }}
			onChange={(val) => handleInputChange(val, index, field)}
		/>
	);

	const columns = [
		{
			title: t.columns.date,
			dataIndex: "date",
			key: "date",
			width: 130,
			fixed: "left",
			render: (val) => <b>{val}</b>,
		},
		{
			title: labelWithHelp(
				t.columns.clientPrice,
				t.help.clientPrice,
				t.moreDetails,
			),
			dataIndex: "clientPrice",
			key: "clientPrice",
			width: 165,
			render: moneyInput("clientPrice"),
		},
		{
			title: labelWithHelp(
				t.columns.rootPrice,
				t.help.rootPrice,
				t.moreDetails,
			),
			dataIndex: "rootPrice",
			key: "rootPrice",
			width: 145,
			render: moneyInput("rootPrice"),
		},
		{
			title: labelWithHelp(
				t.columns.netAfterExpenses,
				t.help.netAfterExpenses,
				t.moreDetails,
			),
			dataIndex: "netAfterExpenses",
			key: "netAfterExpenses",
			width: 170,
			render: moneyInput("netAfterExpenses"),
		},
		{
			title: labelWithHelp(
				t.columns.otaExpense,
				t.help.otaExpense,
				t.moreDetails,
			),
			dataIndex: "otaExpenseAmount",
			key: "otaExpenseAmount",
			width: 160,
			render: (value) => <span>{formatMoney(value)}</span>,
		},
		canViewPlatformProfit
			? {
			title: labelWithHelp(
				t.columns.platformMargin,
				t.help.platformMargin,
				t.moreDetails,
			),
			dataIndex: "platformMargin",
			key: "platformMargin",
			width: 150,
			render: (value) => (
				<span style={{ color: value < 0 ? "#b42318" : "#1a6d2f" }}>
					{formatMoney(value)}
				</span>
			),
		  }
			: null,
		{
			title: t.columns.rate,
			dataIndex: "commissionRate",
			key: "commissionRate",
			width: 130,
			render: (value, record, index) => (
				<InputNumber
					value={value}
					min={0}
					max={100}
					step={0.1}
					precision={2}
					style={{ width: 105 }}
					onChange={(val) => handleInputChange(val, index, "commissionRate")}
				/>
			),
		},
	].filter(Boolean);

	const distributionControls = [
		{
			key: "client",
			field: "clientPrice",
			label: t.distribution.client,
			help: t.help.clientTotal,
		},
		{
			key: "root",
			field: "rootPrice",
			label: t.distribution.root,
			help: t.help.rootTotal,
		},
		{
			key: "net",
			field: "netAfterExpenses",
			label: t.distribution.net,
			help: t.help.netTotal,
		},
	];

	return (
		<Modal
			title={<span dir={isArabic ? "rtl" : "ltr"}>{t.title}</span>}
			open={visible}
			onCancel={onClose}
			width='min(96vw, 1480px)'
			zIndex={EDIT_PRICING_MODAL_Z}
			styles={{
				mask: { zIndex: EDIT_PRICING_MODAL_Z - 1 },
				body: {
					maxHeight: "78vh",
					overflowX: "hidden",
					overflowY: "auto",
				},
			}}
			getContainer={() => document.body}
			rootClassName='edit-pricing-modal'
			footer={[
				<Button key='cancel' onClick={onClose}>
					{t.cancel}
				</Button>,
				<Button key='inherit' onClick={handleInherit} type='dashed'>
					{t.inherit}
				</Button>,
				<Button key='save' type='primary' onClick={handleSave}>
					{t.save}
				</Button>,
			]}
		>
			<div
				className={`pricing-modal-body${isArabic ? " is-arabic" : ""}`}
				dir={isArabic ? "rtl" : "ltr"}
			>
			<style>{`
				.edit-pricing-modal .pricing-modal-body {
					direction: ltr;
				}

				.edit-pricing-modal .pricing-modal-body.is-arabic {
					direction: rtl;
					text-align: right;
					font-family: "Droid Arabic Kufi", "Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
				}

				.edit-pricing-modal .pricing-distribution-stack {
					display: flex;
					align-items: stretch;
					gap: 10px;
					margin-bottom: 16px;
				}

				.edit-pricing-modal .pricing-distribution-fields {
					flex: 1 1 auto;
					min-width: 0;
					display: flex;
					flex-direction: column;
					gap: 10px;
				}

				.edit-pricing-modal .pricing-distribution-row {
					display: grid;
					grid-template-columns: minmax(210px, 320px) minmax(180px, 1fr);
					align-items: center;
					gap: 10px;
					padding: 10px;
					border: 1px solid #dbe7f3;
					border-radius: 8px;
					background: #fbfdff;
				}

				.edit-pricing-modal .pricing-distribution-label,
				.edit-pricing-modal .pricing-column-title {
					display: inline-flex;
					align-items: center;
					gap: 7px;
					min-width: 0;
				}

				.edit-pricing-modal .pricing-distribution-label {
					font-weight: 700;
					color: #17324d;
				}

				.edit-pricing-modal .pricing-modal-body.is-arabic .pricing-distribution-label,
				.edit-pricing-modal .pricing-modal-body.is-arabic .pricing-column-title {
					text-align: right;
				}

				.edit-pricing-modal .pricing-info-icon {
					color: #1769aa;
					cursor: help;
					font-size: 14px;
					flex: 0 0 auto;
				}

				.edit-pricing-modal .pricing-distribution-input {
					width: 100%;
				}

				.edit-pricing-modal .pricing-distribution-actions {
					flex: 0 0 126px;
					display: flex;
					align-items: center;
				}

				.edit-pricing-modal .pricing-distribution-action {
					width: 100%;
					min-width: 126px;
					white-space: normal;
				}

				@media (max-width: 760px) {
					.edit-pricing-modal .ant-modal {
						max-width: calc(100vw - 16px);
						margin: 8px auto;
						top: 8px;
					}

					.edit-pricing-modal .ant-modal-content {
						padding: 14px;
					}

					.edit-pricing-modal .pricing-distribution-stack {
						flex-direction: column;
					}

					.edit-pricing-modal .pricing-distribution-row {
						grid-template-columns: 1fr;
						align-items: stretch;
					}

					.edit-pricing-modal .pricing-distribution-actions {
						flex-basis: auto;
					}

					.edit-pricing-modal .pricing-distribution-action {
						width: 100%;
					}

					.edit-pricing-modal .ant-modal-footer {
						display: flex;
						flex-direction: column-reverse;
						gap: 8px;
					}

					.edit-pricing-modal .ant-modal-footer .ant-btn {
						width: 100%;
						margin-inline-start: 0 !important;
					}
				}
			`}</style>

			<div className='pricing-distribution-stack'>
				<div className='pricing-distribution-fields'>
					{distributionControls.map((control) => (
						<div key={control.key} className='pricing-distribution-row'>
							<div className='pricing-distribution-label'>
								<span>{control.label}</span>
								<HelpIcon title={control.help} ariaLabel={t.moreDetails} />
							</div>
							<InputNumber
								placeholder={t.enterPlaceholder(control.label)}
								value={distributionTotals[control.key]}
								min={0}
								step={0.01}
								precision={2}
								className='pricing-distribution-input'
								onChange={(val) => handleDistributionInput(control.key, val)}
							/>
						</div>
					))}
					{showCommissionAmount ? (
						<div className='pricing-distribution-row'>
							<div className='pricing-distribution-label'>
								<span>{commissionLabel}</span>
								<HelpIcon title={commissionHelp} ariaLabel={t.moreDetails} />
							</div>
							<InputNumber
								placeholder={t.enterPlaceholder(commissionLabel)}
								value={commissionDraft}
								min={0}
								step={0.01}
								precision={2}
								className='pricing-distribution-input'
								onChange={handleCommissionInput}
							/>
						</div>
					) : null}
				</div>
				<div className='pricing-distribution-actions'>
					<Button
						type='dashed'
						className='pricing-distribution-action'
						onClick={handleDistributeTotals}
					>
						{distributeAllLabel}
					</Button>
				</div>
			</div>

			<Table
				dataSource={editableData}
				columns={columns}
				pagination={false}
				rowKey={(row, index) => row.date || index}
				scroll={{ x: 1050, y: "55vh" }}
				size='middle'
				summary={() => (
					<Table.Summary fixed>
						<Table.Summary.Row>
							<Table.Summary.Cell>
								<b>{t.columns.totals}</b>
							</Table.Summary.Cell>
							<Table.Summary.Cell>
								<b>{formatMoney(totals.client)}</b>
							</Table.Summary.Cell>
							<Table.Summary.Cell>
								<b>{formatMoney(totals.root)}</b>
							</Table.Summary.Cell>
							<Table.Summary.Cell>
								<b>{formatMoney(totals.net)}</b>
							</Table.Summary.Cell>
							<Table.Summary.Cell>
								<b>{formatMoney(totals.expense)}</b>
							</Table.Summary.Cell>
							{canViewPlatformProfit ? (
								<Table.Summary.Cell>
									<b
										style={{
											color: totals.margin < 0 ? "#b42318" : "#1a6d2f",
										}}
									>
										{formatMoney(totals.margin)}
									</b>
								</Table.Summary.Cell>
							) : null}
							<Table.Summary.Cell />
						</Table.Summary.Row>
					</Table.Summary>
				)}
			/>
			</div>
		</Modal>
	);
};

export default EditPricingModal;
