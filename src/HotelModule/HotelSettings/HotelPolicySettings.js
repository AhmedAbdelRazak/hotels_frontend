import React, { useMemo } from "react";
import styled from "styled-components";
import {
	Alert,
	Button,
	Input,
	Popconfirm,
	Space,
	Switch,
	Tag,
	Tooltip,
	message,
} from "antd";
import {
	DeleteOutlined,
	InfoCircleOutlined,
	PlusOutlined,
	SaveOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;

const DEFAULT_CANCELLATION_REFUND_ANSWER =
	"Cancellation is free with a full refund when requested 14 days or more before check-in. When requested less than 14 days but more than 3 days before check-in, cancellation can still be processed; the hotel keeps one night only and the remaining amount is refunded. Within 3 days or less before check-in, the reservation is non-cancellable and non-refundable under the general policy.";

const DEFAULT_POLICY_ROWS = [
	{
		key: "cancellation_refund",
		category: "Cancellation and refunds",
		question: "What is the cancellation and refund policy?",
		answer: DEFAULT_CANCELLATION_REFUND_ANSWER,
		mandatory: true,
		active: true,
		sortOrder: 10,
	},
	{
		key: "checkin_checkout",
		category: "Arrival and departure",
		question: "What are the check-in and check-out times?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 20,
	},
	{
		key: "early_late",
		category: "Arrival and departure",
		question: "Is early check-in or late check-out available?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 30,
	},
	{
		key: "children_extra_beds",
		category: "Guests and rooms",
		question: "What is the children and extra-bed policy?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 40,
	},
	{
		key: "payment_deposit",
		category: "Payment",
		question: "What payment or deposit rules should guests know?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 50,
	},
	{
		key: "no_show",
		category: "Cancellation and refunds",
		question: "What happens if the guest does not show up?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 60,
	},
	{
		key: "id_documents",
		category: "Guest documents",
		question: "What ID, passport, or booking documents are required?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 70,
	},
	{
		key: "smoking",
		category: "House rules",
		question: "What is the smoking policy?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 80,
	},
	{
		key: "parking",
		category: "Facilities",
		question: "What is the parking policy?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 90,
	},
	{
		key: "meals_breakfast",
		category: "Facilities",
		question: "What meal or breakfast rules should guests know?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 100,
	},
	{
		key: "pets",
		category: "House rules",
		question: "Are pets allowed?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 110,
	},
	{
		key: "damage_deposit",
		category: "House rules",
		question: "Is there a damage deposit or damage policy?",
		answer: "",
		mandatory: false,
		active: false,
		sortOrder: 120,
	},
];

const defaultByKey = DEFAULT_POLICY_ROWS.reduce((acc, row) => {
	acc[row.key] = row;
	return acc;
}, {});

const cleanText = (value, max = 3000) =>
	String(value || "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, max);

const normalizeKey = (value, fallback) =>
	String(value || fallback || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 80) || `custom_${Date.now()}`;

const normalizePolicyRows = (rows = []) => {
	const byKey = new Map();
	(Array.isArray(rows) ? rows : []).forEach((row, index) => {
		const key = normalizeKey(row?.key, row?.question || `policy_${index + 1}`);
		const defaultRow = defaultByKey[key] || {};
		byKey.set(key, {
			...defaultRow,
			...row,
			key,
			category: cleanText(row?.category || defaultRow.category, 120),
			question: cleanText(row?.question || defaultRow.question, 240),
			answer:
				defaultRow.mandatory === true
					? cleanText(row?.answer || defaultRow.answer, 3000)
					: cleanText(row?.answer, 3000),
			mandatory: defaultRow.mandatory === true || row?.mandatory === true,
			active:
				defaultRow.mandatory === true
					? true
					: row?.active === true && Boolean(cleanText(row?.answer, 3000)),
			sortOrder: Number.isFinite(Number(row?.sortOrder))
				? Number(row.sortOrder)
				: defaultRow.sortOrder || 900 + index,
		});
	});
	DEFAULT_POLICY_ROWS.forEach((row) => {
		if (!byKey.has(row.key)) byKey.set(row.key, { ...row });
	});
	return [...byKey.values()].sort((a, b) => a.sortOrder - b.sortOrder);
};

const HotelPolicySettings = ({
	hotelDetails,
	setHotelDetails,
	submittingHotelDetails,
	chosenLanguage,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const autoDirectionProps = { dir: "auto", className: "policy-text-input" };
	const labels = {
		title: isArabic ? "سياسات وشروط الفندق" : "Hotel Policies And Terms",
		subtitle: isArabic
			? "أسئلة وأجوبة مختصرة يستخدمها مساعد الفندق عند سؤال الضيوف."
			: "Short Q&A entries used by the hotel assistant when guests ask.",
		mandatory: isArabic ? "إجباري" : "Mandatory",
		active: isArabic ? "مفعل" : "Active",
		inactive: isArabic ? "غير مفعل" : "Inactive",
		category: isArabic ? "القسم" : "Category",
		question: isArabic ? "السؤال" : "Question",
		answer: isArabic ? "الإجابة" : "Answer",
		add: isArabic ? "إضافة سؤال" : "Add Question",
		save: isArabic ? "حفظ السياسات" : "Save Policies",
		delete: isArabic ? "حذف" : "Delete",
		cancel: isArabic ? "إلغاء" : "Cancel",
		requiredAnswer: isArabic
			? "سياسة الإلغاء والاسترداد مطلوبة."
			: "Cancellation and refund policy is required.",
		optionalHint: isArabic
			? "الأسئلة الاختيارية الفارغة لن يستخدمها المساعد."
			: "Empty optional questions are ignored by the assistant.",
		removeConfirm: isArabic
			? "هل تريد حذف هذا السؤال؟"
			: "Remove this question?",
	};

	const rows = useMemo(
		() => normalizePolicyRows(hotelDetails?.hotelPolicyQA),
		[hotelDetails?.hotelPolicyQA]
	);

	const updateRows = (nextRows) => {
		const normalized = normalizePolicyRows(nextRows);
		setHotelDetails((previous) => ({
			...previous,
			hotelPolicyQA: normalized,
		}));
	};

	const updateRow = (key, patch) => {
		updateRows(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
	};

	const addRow = () => {
		const nextOrder = Math.max(...rows.map((row) => Number(row.sortOrder) || 0), 0) + 10;
		updateRows([
			...rows,
			{
				key: `custom_${Date.now()}`,
				category: "",
				question: "",
				answer: "",
				mandatory: false,
				active: false,
				sortOrder: nextOrder,
			},
		]);
	};

	const removeRow = (key) => {
		updateRows(rows.filter((row) => row.key !== key || row.mandatory));
	};

	const saveRows = () => {
		const normalized = normalizePolicyRows(rows);
		const cancellation = normalized.find((row) => row.key === "cancellation_refund");
		if (!cleanText(cancellation?.answer)) {
			message.error(labels.requiredAnswer);
			return;
		}
		submittingHotelDetails("PolicySettings", { hotelPolicyQA: normalized });
	};

	return (
		<PolicyShell dir={isArabic ? "rtl" : "ltr"}>
			<HeaderRow>
				<div>
					<h3>{labels.title}</h3>
					<p>{labels.subtitle}</p>
				</div>
				<Space wrap>
					<Button icon={<PlusOutlined />} onClick={addRow}>
						{labels.add}
					</Button>
					<Button type='primary' icon={<SaveOutlined />} onClick={saveRows}>
						{labels.save}
					</Button>
				</Space>
			</HeaderRow>

			<Alert type='info' showIcon message={labels.optionalHint} />

			<PolicyList>
				{rows.map((row, index) => (
					<PolicyRow key={row.key || index} $mandatory={row.mandatory}>
						<RowTop>
							<Space wrap>
								<Tag color={row.mandatory ? "red" : row.active ? "green" : "default"}>
									{row.mandatory
										? labels.mandatory
										: row.active
										? labels.active
										: labels.inactive}
								</Tag>
								<Tooltip title={row.mandatory ? labels.requiredAnswer : labels.optionalHint}>
									<InfoCircleOutlined />
								</Tooltip>
							</Space>
							<Space wrap>
								<Switch
									checked={row.mandatory || row.active === true}
									disabled={row.mandatory}
									onChange={(checked) => updateRow(row.key, { active: checked })}
								/>
								{!row.mandatory ? (
									<Popconfirm
										title={labels.removeConfirm}
										okText={labels.delete}
										cancelText={labels.cancel}
										onConfirm={() => removeRow(row.key)}
									>
										<Button danger icon={<DeleteOutlined />}>
											{labels.delete}
										</Button>
									</Popconfirm>
								) : null}
							</Space>
						</RowTop>

						<FieldGrid>
							<Field>
								<label>{labels.category}</label>
								<Input
									{...autoDirectionProps}
									value={row.category || ""}
									onChange={(event) =>
										updateRow(row.key, { category: event.target.value })
									}
								/>
							</Field>
							<Field>
								<label>{labels.question}</label>
								<Input
									{...autoDirectionProps}
									value={row.question || ""}
									onChange={(event) =>
										updateRow(row.key, { question: event.target.value })
									}
								/>
							</Field>
						</FieldGrid>

						<Field>
							<label>
								{labels.answer}
								{row.mandatory ? <RequiredMark>*</RequiredMark> : null}
							</label>
							<TextArea
								{...autoDirectionProps}
								rows={4}
								value={row.answer || ""}
								onChange={(event) =>
									updateRow(row.key, {
										answer: event.target.value,
										active: row.mandatory ? true : row.active,
									})
								}
							/>
						</Field>
					</PolicyRow>
				))}
			</PolicyList>
		</PolicyShell>
	);
};

export default HotelPolicySettings;

const PolicyShell = styled.div`
	display: flex;
	flex-direction: column;
	gap: 14px;
	text-align: start;

	.ant-alert {
		border-radius: 8px;
	}
`;

const HeaderRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	text-align: start;

	h3 {
		font-size: 22px;
		margin: 0 0 4px;
		color: #102a43;
	}

	p {
		margin: 0;
		color: #52606d;
	}

	@media (max-width: 760px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const PolicyList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
`;

const PolicyRow = styled.div`
	background: #ffffff;
	border: 1px solid ${(props) => (props.$mandatory ? "#fecaca" : "#d7e7f8")};
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
	padding: 14px;
`;

const RowTop = styled.div`
	align-items: center;
	display: flex;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 12px;

	@media (max-width: 640px) {
		align-items: stretch;
		flex-direction: column;
	}
`;

const FieldGrid = styled.div`
	display: grid;
	direction: inherit;
	gap: 12px;
	grid-template-columns: minmax(180px, 0.5fr) minmax(260px, 1fr);

	@media (max-width: 760px) {
		grid-template-columns: 1fr;
	}
`;

const Field = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-bottom: 12px;
	min-width: 0;

	label {
		align-self: stretch;
		color: #243b53;
		font-size: 13px;
		font-weight: 700;
		line-height: 1.35;
		padding-inline: 2px;
		text-align: start;
	}

	.policy-text-input {
		text-align: start;
		unicode-bidi: plaintext;
	}
`;

const RequiredMark = styled.span`
	color: #cf1322;
	margin-inline-start: 4px;
`;
