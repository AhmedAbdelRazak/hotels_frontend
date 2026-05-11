import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Alert, Button, Modal, Table, Tag, Upload, message } from "antd";
import {
	CheckCircleOutlined,
	RobotOutlined,
	UploadOutlined,
} from "@ant-design/icons";
import { isAuthenticated } from "../../auth";
import {
	commitReservationExcelImport,
	previewReservationExcelImport,
} from "../apiAdmin";

const labels = {
	en: {
		button: "Upload Excel",
		title: "AI Excel Reservation Import",
		subtitle:
			"Upload a spreadsheet, let AI clean it into PMS reservation fields, answer any clarification questions, then confirm before saving.",
		chooseFile: "Choose Excel File",
		preview: "Clean With AI",
		applyAnswers: "Apply Answers",
		confirm: "Create Pending Reservations",
		empty:
			"Upload an Excel file to preview cleaned reservations here before anything is saved.",
		questions: "AI clarification needed",
		errors: "Rows with errors must be fixed before importing.",
		success: "Reservations were imported successfully.",
		guestName: "Guest Name",
		guestPhone: "Guest Phone",
		guestCountry: "Guest Country",
		checkinDate: "Check-in date",
		checkoutDate: "Check-out date",
		roomType: "Room Type",
		displayName: "Display Name",
		totalAmount: "Total Amount",
		agentName: "Agent Name",
		commission: "Commission",
		comment: "Comments",
		status: "Status",
		ready: "Ready",
		needsReview: "Needs Review",
	},
	ar: {
		button: "رفع إكسل",
		title: "استيراد الحجوزات بالذكاء الاصطناعي",
		subtitle:
			"ارفع ملف الإكسل، وسيتم تنظيف البيانات لتناسب نظام الحجوزات، ثم أجب عن الأسئلة قبل الحفظ.",
		chooseFile: "اختيار ملف إكسل",
		preview: "تنظيف بالذكاء الاصطناعي",
		applyAnswers: "تطبيق الإجابات",
		confirm: "إنشاء الحجوزات بانتظار التأكيد",
		empty:
			"ارفع ملف إكسل لعرض الحجوزات المنظفة هنا قبل حفظ أي شيء في قاعدة البيانات.",
		questions: "أسئلة تحتاج تأكيد الموظف",
		errors: "يجب معالجة الصفوف التي تحتوي على أخطاء قبل الاستيراد.",
		success: "تم استيراد الحجوزات بنجاح.",
		guestName: "اسم الضيف",
		guestPhone: "هاتف الضيف",
		guestCountry: "دولة الضيف",
		checkinDate: "تاريخ الوصول",
		checkoutDate: "تاريخ المغادرة",
		roomType: "نوع الغرفة",
		displayName: "اسم الغرفة",
		totalAmount: "الإجمالي",
		agentName: "الوكيل",
		commission: "العمولة",
		comment: "تعليقات",
		status: "الحالة",
		ready: "جاهز",
		needsReview: "يحتاج مراجعة",
	},
};

const roleNumbers = (user = {}) => [
	Number(user.role),
	...(Array.isArray(user.roles) ? user.roles.map(Number) : []),
];

const roleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((role) => String(role || "").toLowerCase())
		: []),
];

const canUseExcelImport = (user = {}) => {
	const roles = roleNumbers(user);
	const descriptions = roleDescriptions(user);
	const superAdminId = process.env.REACT_APP_SUPER_ADMIN_ID;
	return (
		String(user?._id || "") === String(superAdminId || "") ||
		[1000, 2000, 6000, 8000].some((role) => roles.includes(role)) ||
		["hotelmanager", "finance", "reservationemployee"].some((role) =>
			descriptions.includes(role)
		)
	);
};

const rowStatus = (row, txt) => {
	const errors = Array.isArray(row.errors) ? row.errors : [];
	const warnings = Array.isArray(row.warnings) ? row.warnings : [];
	if (errors.length) return <Tag color='red'>{txt.needsReview}</Tag>;
	if (warnings.length) return <Tag color='gold'>{txt.needsReview}</Tag>;
	return <Tag color='green'>{txt.ready}</Tag>;
};

const ExcelReservationImportModal = ({
	hotelDetails,
	chosenLanguage,
	onImported,
}) => {
	const { user } = isAuthenticated();
	const isArabic = chosenLanguage === "Arabic";
	const txt = labels[isArabic ? "ar" : "en"];
	const [open, setOpen] = useState(false);
	const [file, setFile] = useState(null);
	const [rows, setRows] = useState([]);
	const [questions, setQuestions] = useState([]);
	const [answers, setAnswers] = useState({});
	const [loading, setLoading] = useState(false);
	const [committing, setCommitting] = useState(false);

	const hasErrors = useMemo(
		() => rows.some((row) => Array.isArray(row.errors) && row.errors.length),
		[rows]
	);
	const hasUnansweredQuestions = questions.some((q) => !answers[q.id]);
	const canCommit = rows.length > 0 && !hasErrors && !questions.length;

	if (!canUseExcelImport(user)) return null;

	const runPreview = async (nextAnswers = answers, selectedFile = file) => {
		if (!selectedFile) {
			message.warning(isArabic ? "الرجاء اختيار ملف أولاً." : "Please choose a file first.");
			return;
		}
		setLoading(true);
		try {
			const data = await previewReservationExcelImport({
				userId: user._id,
				hotelId: hotelDetails?._id,
				file: selectedFile,
				answers: nextAnswers,
			});
			if (data?.error) {
				message.error(data.error);
				return;
			}
			setRows(Array.isArray(data?.rows) ? data.rows : []);
			setQuestions(Array.isArray(data?.questions) ? data.questions : []);
			message.success(
				isArabic ? "تم تنظيف الملف للمراجعة." : "Excel file cleaned for review."
			);
		} finally {
			setLoading(false);
		}
	};

	const commitRows = () => {
		Modal.confirm({
			title: isArabic ? "تأكيد الاستيراد" : "Confirm Import",
			content: isArabic
				? "سيتم إنشاء هذه الحجوزات بحالة بانتظار التأكيد. هل تريد المتابعة؟"
				: "These reservations will be created as Pending Confirmation. Continue?",
			okText: isArabic ? "نعم، إنشاء" : "Yes, create",
			cancelText: isArabic ? "إلغاء" : "Cancel",
			onOk: async () => {
				setCommitting(true);
				try {
					const data = await commitReservationExcelImport({
						userId: user._id,
						hotelId: hotelDetails?._id,
						rows,
					});
					if (data?.error) {
						message.error(data.error);
						return;
					}
					if (Array.isArray(data?.errors) && data.errors.length) {
						message.warning(
							isArabic
								? `تم إنشاء ${data?.created?.length || 0} حجز، وبعض الصفوف تحتاج مراجعة.`
								: `${data?.created?.length || 0} reservations created. Some rows need review.`
						);
					} else {
						message.success(txt.success);
					}
					setRows([]);
					setQuestions([]);
					setAnswers({});
					setFile(null);
					setOpen(false);
					if (typeof onImported === "function") onImported();
				} finally {
					setCommitting(false);
				}
			},
		});
	};

	const columns = [
		{ title: "#", dataIndex: "rowNumber", width: 48, fixed: "left" },
		{ title: txt.guestName, dataIndex: "guestName", width: 150 },
		{ title: txt.guestPhone, dataIndex: "guestPhone", width: 130 },
		{ title: txt.guestCountry, dataIndex: "guestCountry", width: 110 },
		{ title: txt.checkinDate, dataIndex: "checkinDate", width: 120 },
		{ title: txt.checkoutDate, dataIndex: "checkoutDate", width: 120 },
		{ title: txt.roomType, dataIndex: "roomType", width: 130 },
		{ title: txt.displayName, dataIndex: "displayName", width: 180 },
		{
			title: txt.totalAmount,
			dataIndex: "totalAmount",
			width: 120,
			render: (value) => <strong>{Number(value || 0).toLocaleString()} SAR</strong>,
		},
		{ title: txt.agentName, dataIndex: "agentName", width: 150 },
		{
			title: txt.commission,
			dataIndex: "commission",
			width: 110,
			render: (value) =>
				value === "" || value === null || value === undefined ? "-" : `${value} SAR`,
		},
		{ title: txt.comment, dataIndex: "comment", width: 180 },
		{
			title: txt.status,
			width: 130,
			fixed: "right",
			render: (_, row) => rowStatus(row, txt),
		},
	];

	return (
		<>
			<Button
				type='primary'
				icon={<UploadOutlined />}
				onClick={() => setOpen(true)}
			>
				{txt.button}
			</Button>

			<Modal
				open={open}
				onCancel={() => setOpen(false)}
				footer={null}
				width='min(96vw, 1480px)'
				destroyOnClose={false}
				className='excel-reservation-import-modal'
			>
				<ModalBody dir={isArabic ? "rtl" : "ltr"}>
					<Header>
						<div className='icon'>
							<RobotOutlined />
						</div>
						<div>
							<h2>{txt.title}</h2>
							<p>{txt.subtitle}</p>
						</div>
					</Header>

					<ActionBar>
						<Upload
							accept='.xlsx,.xls,.csv'
							maxCount={1}
							beforeUpload={(nextFile) => {
								setFile(nextFile);
								setRows([]);
								setQuestions([]);
								setAnswers({});
								runPreview({}, nextFile);
								return false;
							}}
							onRemove={() => {
								setFile(null);
								setRows([]);
								setQuestions([]);
								setAnswers({});
							}}
						>
							<Button icon={<UploadOutlined />}>{txt.chooseFile}</Button>
						</Upload>
						<Button
							type='primary'
							loading={loading}
							disabled={!file}
							onClick={() => runPreview()}
						>
							{txt.preview}
						</Button>
						<Button
							disabled={!questions.length || hasUnansweredQuestions}
							onClick={() => runPreview(answers)}
						>
							{txt.applyAnswers}
						</Button>
						<Button
							type='primary'
							icon={<CheckCircleOutlined />}
							loading={committing}
							disabled={!canCommit}
							onClick={commitRows}
						>
							{txt.confirm}
						</Button>
					</ActionBar>

					{questions.length ? (
						<QuestionPanel>
							<h3>{txt.questions}</h3>
							{questions.map((question) => (
								<div className='question' key={question.id}>
									<p>{isArabic ? question.arMessage || question.message : question.message}</p>
									<div className='answers'>
										<Button
											type={answers[question.id] === "yes" ? "primary" : "default"}
											onClick={() =>
												setAnswers((previous) => ({
													...previous,
													[question.id]: "yes",
												}))
											}
										>
											{isArabic ? "نعم" : question.yesLabel || "Yes"}
										</Button>
										<Button
											danger
											type={answers[question.id] === "no" ? "primary" : "default"}
											onClick={() =>
												setAnswers((previous) => ({
													...previous,
													[question.id]: "no",
												}))
											}
										>
											{isArabic ? "لا" : question.noLabel || "No"}
										</Button>
									</div>
								</div>
							))}
						</QuestionPanel>
					) : null}

					{hasErrors ? <Alert type='error' showIcon message={txt.errors} /> : null}

					<TableShell>
						<Table
							rowKey='key'
							size='small'
							dataSource={rows}
							columns={columns}
							pagination={{ pageSize: 10 }}
							scroll={{ x: 1500, y: 430 }}
							locale={{ emptyText: txt.empty }}
							expandable={{
								expandedRowRender: (row) => (
									<RowNotes>
										{Array.isArray(row.errors) && row.errors.length ? (
											<div>
												<strong>Errors:</strong> {row.errors.join(" | ")}
											</div>
										) : null}
										{Array.isArray(row.warnings) && row.warnings.length ? (
											<div>
												<strong>Warnings:</strong> {row.warnings.join(" | ")}
											</div>
										) : null}
									</RowNotes>
								),
								rowExpandable: (row) =>
									Boolean(
										(Array.isArray(row.errors) && row.errors.length) ||
											(Array.isArray(row.warnings) && row.warnings.length)
									),
							}}
						/>
					</TableShell>
				</ModalBody>
			</Modal>
		</>
	);
};

export default ExcelReservationImportModal;

const ModalBody = styled.div`
	display: grid;
	gap: 12px;
	padding-top: 8px;
	color: #132238;
`;

const Header = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px;
	border: 1px solid #b8dcff;
	border-radius: 10px;
	background: linear-gradient(135deg, #e8f5ff 0%, #f7fbff 100%);

	.icon {
		width: 42px;
		height: 42px;
		border-radius: 12px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: #1677ff;
		color: #fff;
		font-size: 1.35rem;
		box-shadow: 0 12px 24px rgba(22, 119, 255, 0.2);
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		font-size: clamp(1.15rem, 2vw, 1.55rem);
		font-weight: 900;
	}

	p {
		margin-top: 4px;
		color: #4f6682;
		font-weight: 700;
		line-height: 1.55;
	}

	@media (max-width: 620px) {
		align-items: flex-start;
	}
`;

const ActionBar = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
	padding: 10px;
	border: 1px solid #d6eaff;
	border-radius: 10px;
	background: #ffffff;

	.ant-upload-list {
		max-width: 320px;
	}
`;

const QuestionPanel = styled.div`
	display: grid;
	gap: 8px;
	padding: 12px;
	border: 1px solid #ffd591;
	border-radius: 10px;
	background: #fff9ed;

	h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 900;
		color: #ad6800;
	}

	.question {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 10px;
		align-items: center;
		padding: 10px;
		border-radius: 8px;
		background: #fff;
		border: 1px solid #ffe7ba;
	}

	p {
		margin: 0;
		font-weight: 800;
		line-height: 1.5;
	}

	.answers {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	@media (max-width: 720px) {
		.question {
			grid-template-columns: 1fr;
		}
	}
`;

const TableShell = styled.div`
	border: 1px solid #d6eaff;
	border-radius: 10px;
	overflow: hidden;

	.ant-table-thead > tr > th {
		background: #e7f4ff;
		color: #10233a;
		font-weight: 900;
		text-align: center;
		white-space: nowrap;
	}

	.ant-table-tbody > tr > td {
		text-align: center;
		vertical-align: middle;
	}
`;

const RowNotes = styled.div`
	display: grid;
	gap: 4px;
	padding: 8px 10px;
	background: #fbfdff;
	font-size: 0.84rem;
	line-height: 1.5;
`;
