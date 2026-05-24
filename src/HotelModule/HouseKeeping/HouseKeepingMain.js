import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import moment from "moment";
import {
	Button,
	Empty,
	Form,
	Input,
	message,
	Modal,
	Pagination,
	Select,
	Spin,
	Tag,
} from "antd";
import {
	CheckCircleOutlined,
	ClearOutlined,
	HomeOutlined,
	PlusOutlined,
	ReloadOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import { useHistory, useParams } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import { useCartContext } from "../../cart_context";
import {
	createNewHouseKeepingTask,
	createHousekeepingSupplyRequest,
	getAllHouseKeepingTasks,
	getAllHouseKeepingTotalRecords,
	getEmployeeWorkLoad,
	getHotelDetails,
	getHotelRooms,
	getHousekeepingSupplies,
	getHouseKeepingStaff,
	saveHousekeepingSupplyItem,
	updateHousekeepingSupplyRequest,
	updatingHouseKeepingTask,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import { isSuperAdminUser } from "../../AdminModule/utils/superUsers";
import { getStoredMenuCollapsed } from "../utils/menuState";
import socket from "../../socket";

const TEXT = {
	en: {
		title: "Housekeeping",
		subtitle: "Assign rooms, track cleaning, and keep the hotel map accurate.",
		cleanerSubtitle: "Your assigned rooms for the selected day.",
		overview: "Tasks",
		myWork: "My work",
		assign: "Assign rooms",
		reports: "Reports",
		today: "Today",
		selectedDate: "Selected date",
		dateHint: "Pick the work day",
		refresh: "Refresh",
		total: "Total",
		pending: "Pending",
		cleaning: "Cleaning",
		done: "Cleaned",
		noTasks: "No housekeeping tasks for this day.",
		noStaff: "Create housekeeping staff first, then assign rooms.",
		employee: "Employee",
		rooms: "Rooms",
		comment: "Comment",
		taskDate: "Task date",
		createTask: "Create task",
		creating: "Creating...",
		assignHint: "Select one employee and one or more rooms.",
		status: "Status",
		floor: "Floor",
		roomType: "Room type",
		assignedTo: "Assigned to",
		cleanedBy: "Cleaned by",
		confirmation: "Confirmation",
		markCleaning: "Start cleaning",
		markClean: "Mark clean",
		reopen: "Reopen",
		edit: "Edit",
		updateTask: "Update task",
		save: "Save",
		cancel: "Cancel",
		unfinished: "Pending",
		finished: "Cleaned",
		cleaningStatus: "Cleaning",
		allStatuses: "All statuses",
		activeTasks: "Active tasks",
		live: "Live",
		lastUpdated: "Updated",
		hotelReady: "Room status updates automatically when cleaned.",
		selectRoomHint: "Tap a room to confirm it has been cleaned.",
		roomCleanTitle: "Confirm room cleaning",
		roomCleanQuestion: "Are you sure this room is fully cleaned and ready?",
		roomCleanChecklist:
			"Please confirm the floor is cleaned, towels are changed, trash is removed, bathroom is checked, bed is made, and supplies are ready.",
		confirmClean: "Yes, room is clean",
		alreadyClean: "Already clean",
		startCleaningRequired: "Please click Start cleaning first, then confirm the room when it is done.",
		roomUpdated: "Room marked clean.",
		fromDate: "From",
		toDate: "To",
		loadReport: "Show report",
		duration: "Duration",
		startedAt: "Started",
		completedAt: "Completed",
		minutes: "min",
		reportHint: "Review cleaning productivity by date range.",
		averageDuration: "Average duration",
		noReportRows: "No report rows for this range.",
		housed: "Housed",
		notHoused: "Not housed",
		closedByEmployee: "Closed by employee",
		closedByManager: "Closed by manager",
		priorityTask: "Current cleaning task",
		priorityHint: "This task is in progress and stays first.",
		taskKind: "Task kind",
		roomCleaning: "Room cleaning",
		generalCleaning: "General cleaning",
		generalAreas: "Cleaning areas",
		generalAreasHint: "Choose one or more hotel areas.",
		generalTaskDetails: "Task details",
		generalTaskCommentHint:
			"Add details when the task is custom or needs special instructions.",
		customAreaRequiresComment: "Please add a comment for custom cleaning work.",
		generalTaskCleanHint: "Start the task first, then confirm once it is done.",
		generalCleanTitle: "Confirm general cleaning task",
		generalCleanQuestion: "Are you sure this housekeeping task is complete?",
		generalCleanChecklist:
			"Please confirm the assigned area is clean, dry, safe, stocked if needed, and ready for guests or staff.",
		supplies: "Supplies",
		suppliesHint: "Track housekeeping stock and purchase approvals.",
		inventory: "Inventory",
		requestSupplies: "Request supplies",
		itemName: "Supply",
		category: "Category",
		unit: "Unit",
		currentStock: "Current stock",
		minStock: "Minimum stock",
		unitCost: "Unit cost",
		estimatedCost: "Estimated cost",
		lowStock: "Low stock",
		inStock: "In stock",
		pendingFinance: "Pending finance",
		approved: "Approved",
		rejected: "Rejected",
		received: "Received",
		priority: "Priority",
		normal: "Normal",
		urgent: "Urgent",
		vendor: "Vendor",
		financeNotes: "Finance notes",
		requestNotes: "Request notes",
		receiveNotes: "Receiving notes",
		addItem: "Save inventory item",
		submitRequest: "Submit finance request",
		approve: "Approve",
		reject: "Reject",
		markReceived: "Mark received",
		requests: "Purchase requests",
		quantity: "Qty",
		totalCost: "Total cost",
		requestedBy: "Requested by",
		requestedAt: "Requested at",
		actions: "Actions",
		details: "Details",
		statusLocked: "Closed tasks can only be reopened by a super admin.",
		stockLevel: "Stock level",
		financeRequired: "Finance approval required before purchase or receiving.",
		noSupplies: "No supplies have been tracked yet.",
		noRequests: "No supply purchase requests yet.",
	},
	ar: {
		title: "تدبير الغرف",
		subtitle: "تكليف الغرف ومتابعة التنظيف وتحديث خريطة الفندق بدقة.",
		cleanerSubtitle: "الغرف المخصصة لك في اليوم المحدد.",
		overview: "المهام",
		myWork: "مهامي",
		assign: "تكليف الغرف",
		reports: "التقارير",
		today: "اليوم",
		selectedDate: "التاريخ المحدد",
		dateHint: "اختر يوم العمل",
		refresh: "تحديث",
		total: "الإجمالي",
		pending: "قيد الانتظار",
		cleaning: "قيد التنظيف",
		done: "تم التنظيف",
		noTasks: "لا توجد مهام تنظيف لهذا اليوم.",
		noStaff: "أنشئ موظفي النظافة أولاً ثم قم بتكليف الغرف.",
		employee: "الموظف",
		rooms: "الغرف",
		comment: "ملاحظة",
		taskDate: "تاريخ المهمة",
		createTask: "إنشاء مهمة",
		creating: "جاري الإنشاء...",
		assignHint: "اختر موظفاً واحداً وغرفة أو أكثر.",
		status: "الحالة",
		floor: "الطابق",
		roomType: "نوع الغرفة",
		assignedTo: "الموظف المكلف",
		cleanedBy: "تم التنظيف بواسطة",
		confirmation: "رقم التأكيد",
		markCleaning: "بدء التنظيف",
		markClean: "تم التنظيف",
		reopen: "إعادة فتح",
		edit: "تعديل",
		updateTask: "تحديث المهمة",
		save: "حفظ",
		cancel: "إلغاء",
		unfinished: "قيد الانتظار",
		finished: "تم التنظيف",
		cleaningStatus: "قيد التنظيف",
		allStatuses: "كل الحالات",
		activeTasks: "المهام النشطة",
		live: "مباشر",
		lastUpdated: "آخر تحديث",
		hotelReady: "يتم تحديث حالة الغرفة تلقائياً عند التنظيف.",
		selectRoomHint: "اضغط على الغرفة لتأكيد اكتمال تنظيفها.",
		roomCleanTitle: "تأكيد تنظيف الغرفة",
		roomCleanQuestion: "هل أنت متأكد أن الغرفة أصبحت نظيفة وجاهزة؟",
		roomCleanChecklist:
			"يرجى التأكد من تنظيف الأرضية، تغيير المناشف، إزالة النفايات، فحص الحمام، ترتيب السرير، وتجهيز المستلزمات.",
		confirmClean: "نعم، الغرفة نظيفة",
		alreadyClean: "نظيفة بالفعل",
		roomUpdated: "تم وضع الغرفة كنظيفة.",
		fromDate: "من",
		toDate: "إلى",
		loadReport: "عرض التقرير",
		duration: "مدة التنظيف",
		startedAt: "بدأت",
		completedAt: "انتهت",
		minutes: "دقيقة",
		reportHint: "متابعة إنتاجية التنظيف حسب الفترة المحددة.",
		averageDuration: "متوسط المدة",
		noReportRows: "لا توجد بيانات في هذه الفترة.",
		housed: "مشغولة",
		notHoused: "غير مشغولة",
		closedByEmployee: "أغلقها الموظف",
		closedByManager: "أغلقها المدير",
		priorityTask: "المهمة قيد التنظيف الآن",
		priorityHint: "هذه المهمة تظهر أولاً حتى لا يحتاج الموظف للبحث عنها.",
		taskKind: "نوع المهمة",
		roomCleaning: "تنظيف غرفة",
		generalCleaning: "تنظيف عام",
		generalAreas: "مناطق التنظيف",
		generalAreasHint: "اختر منطقة أو أكثر داخل الفندق.",
		generalTaskDetails: "تفاصيل المهمة",
		generalTaskCommentHint:
			"اكتب التفاصيل عندما تكون المهمة مخصصة أو تحتاج تعليمات خاصة.",
		customAreaRequiresComment: "يرجى كتابة ملاحظة عند اختيار مهمة مخصصة.",
		generalTaskCleanHint: "ابدأ المهمة أولاً، ثم أكد إتمامها بعد الانتهاء.",
		generalCleanTitle: "تأكيد إتمام مهمة التنظيف",
		generalCleanQuestion: "هل أنت متأكد أن مهمة التنظيف اكتملت؟",
		generalCleanChecklist:
			"يرجى التأكد أن المنطقة المكلفة أصبحت نظيفة وجافة وآمنة ومجهزة عند الحاجة وجاهزة للضيوف أو الموظفين.",
		supplies: "المستلزمات",
		suppliesHint: "متابعة مخزون النظافة وطلبات الشراء وموافقة المالية.",
		inventory: "المخزون",
		requestSupplies: "طلب مستلزمات",
		itemName: "المستلزم",
		category: "التصنيف",
		unit: "الوحدة",
		currentStock: "المخزون الحالي",
		minStock: "الحد الأدنى",
		unitCost: "سعر الوحدة",
		estimatedCost: "التكلفة التقديرية",
		lowStock: "مخزون منخفض",
		inStock: "متوفر",
		pendingFinance: "بانتظار المالية",
		approved: "تم الاعتماد",
		rejected: "مرفوض",
		received: "تم الاستلام",
		priority: "الأولوية",
		normal: "عادي",
		urgent: "عاجل",
		vendor: "المورد",
		financeNotes: "ملاحظات المالية",
		requestNotes: "ملاحظات الطلب",
		receiveNotes: "ملاحظات الاستلام",
		addItem: "حفظ مستلزم في المخزون",
		submitRequest: "إرسال الطلب للمالية",
		approve: "اعتماد",
		reject: "رفض",
		markReceived: "تم الاستلام",
		requests: "طلبات الشراء",
		quantity: "الكمية",
		totalCost: "إجمالي التكلفة",
		requestedBy: "طلب بواسطة",
		requestedAt: "تاريخ الطلب",
		actions: "الإجراءات",
		stockLevel: "مستوى المخزون",
		financeRequired: "يجب اعتماد المالية قبل الشراء أو الاستلام.",
		noSupplies: "لا توجد مستلزمات مسجلة حتى الآن.",
		noRequests: "لا توجد طلبات شراء مستلزمات حتى الآن.",
	},
};

const GENERAL_CLEANING_AREAS = [
	{ value: "lobby", en: "Lobby", ar: "اللوبي" },
	{ value: "reception_area", en: "Reception area", ar: "منطقة الاستقبال" },
	{ value: "entrance", en: "Hotel entrance", ar: "مدخل الفندق" },
	{ value: "elevators", en: "Elevators", ar: "المصاعد" },
	{ value: "hallways", en: "Hallways", ar: "الممرات" },
	{ value: "stairs", en: "Stairs", ar: "السلالم" },
	{ value: "public_restrooms", en: "Public restrooms", ar: "دورات المياه العامة" },
	{ value: "restaurant", en: "Restaurant / breakfast area", ar: "المطعم / منطقة الإفطار" },
	{ value: "kitchen", en: "Kitchen area", ar: "منطقة المطبخ" },
	{ value: "prayer_room", en: "Prayer room", ar: "المصلى" },
	{ value: "laundry", en: "Laundry area", ar: "المغسلة" },
	{ value: "storage", en: "Storage room", ar: "غرفة التخزين" },
	{ value: "staff_area", en: "Staff area", ar: "منطقة الموظفين" },
	{ value: "parking", en: "Parking area", ar: "مواقف السيارات" },
	{ value: "other", en: "Other / custom task", ar: "أخرى / مهمة مخصصة" },
];

const normalizeId = (value) => {
	if (!value) return "";
	if (typeof value === "object") return String(value._id || value.id || "");
	return String(value);
};

const getRoles = (user = {}) => [
	...new Set(
		[user.role, ...(Array.isArray(user.roles) ? user.roles : [])]
			.map(Number)
			.filter(Boolean)
	),
];

const getRoleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const hasRole = (user, role) => getRoles(user).includes(Number(role));
const hasRoleDescription = (user, role) =>
	getRoleDescriptions(user).includes(String(role || "").toLowerCase());

const isFinishedStatus = (status = "") =>
	["finished", "done", "completed", "clean"].includes(
		String(status || "").toLowerCase()
	);

const statusLabel = (status, isRTL) => {
	const normalized = String(status || "").toLowerCase();
	if (normalized === "cleaning") return isRTL ? TEXT.ar.cleaningStatus : TEXT.en.cleaningStatus;
	if (isFinishedStatus(normalized)) return isRTL ? TEXT.ar.finished : TEXT.en.finished;
	return isRTL ? TEXT.ar.unfinished : TEXT.en.unfinished;
};

const statusTone = (status = "") => {
	const normalized = String(status || "").toLowerCase();
	if (normalized === "cleaning") return "blue";
	if (isFinishedStatus(normalized)) return "green";
	return "orange";
};

const formatDate = (value) => {
	if (!value) return "-";
	const parsed = moment(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "-";
};

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = moment(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm") : "-";
};

const formatDuration = (durationMs = 0, fallbackText = "min") => {
	const totalMinutes = Math.max(0, Math.round(Number(durationMs || 0) / 60000));
	if (!totalMinutes) return `0 ${fallbackText}`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (!hours) return `${minutes} ${fallbackText}`;
	return `${hours}h ${minutes}m`;
};

const MIN_TASK_DATE = "2020-01-01";
const MAX_TASK_DATE = moment().add(2, "years").format("YYYY-MM-DD");

const normalizeTaskDateString = (value) => {
	const parsed = moment(value, "YYYY-MM-DD", true);
	if (!parsed.isValid()) return moment().format("YYYY-MM-DD");
	if (parsed.isBefore(moment(MIN_TASK_DATE, "YYYY-MM-DD"))) {
		return moment().format("YYYY-MM-DD");
	}
	if (parsed.isAfter(moment(MAX_TASK_DATE, "YYYY-MM-DD"))) {
		return moment().format("YYYY-MM-DD");
	}
	return parsed.format("YYYY-MM-DD");
};

const toTaskDateString = (value) => {
	if (moment.isMoment(value)) return normalizeTaskDateString(value.format("YYYY-MM-DD"));
	return normalizeTaskDateString(value);
};

const roomLabel = (room = {}) => room.room_number || room.roomNumber || "-";
const roomTypeDisplay = (room = {}) =>
	room.room_type || room.roomType || room.type || room.roomTypeName || "-";

const numericValue = (value, fallback = Number.NEGATIVE_INFINITY) => {
	const directNumber = Number(value);
	if (Number.isFinite(directNumber)) return directNumber;
	const match = String(value || "").match(/\d+/);
	return match ? Number(match[0]) : fallback;
};

const roomNumberValue = (room = {}) =>
	numericValue(room.room_number || room.roomNumber || room.roomName);

const roomFloorValue = (room = {}) => {
	const explicitFloor = numericValue(room.floor);
	if (Number.isFinite(explicitFloor)) return explicitFloor;
	const roomNumber = roomNumberValue(room);
	return Number.isFinite(roomNumber) && roomNumber >= 100
		? Math.floor(roomNumber / 100)
		: Number.NEGATIVE_INFINITY;
};

const sortRoomsForHousekeeping = (rooms = []) =>
	(Array.isArray(rooms) ? [...rooms] : []).sort((a, b) => {
		const floorDiff = roomFloorValue(b) - roomFloorValue(a);
		if (floorDiff) return floorDiff;
		const roomDiff = roomNumberValue(b) - roomNumberValue(a);
		if (roomDiff) return roomDiff;
		return String(b.room_number || b.roomNumber || "").localeCompare(
			String(a.room_number || a.roomNumber || "")
		);
	});

const taskStatusPriority = (status = "") => {
	const normalized = String(status || "").toLowerCase();
	if (normalized === "cleaning") return 0;
	if (isFinishedStatus(normalized)) return 2;
	return 1;
};

const sortTasksForHousekeeping = (tasks = []) =>
	(Array.isArray(tasks) ? tasks : [])
		.map((task) => ({
			...task,
			rooms: sortRoomsForHousekeeping(task.rooms),
		}))
		.sort((a, b) => {
			const statusDiff =
				taskStatusPriority(a.task_status) - taskStatusPriority(b.task_status);
			if (statusDiff) return statusDiff;
			const aRoom = a.rooms?.[0] || {};
			const bRoom = b.rooms?.[0] || {};
			const floorDiff = roomFloorValue(bRoom) - roomFloorValue(aRoom);
			if (floorDiff) return floorDiff;
			const roomDiff = roomNumberValue(bRoom) - roomNumberValue(aRoom);
			if (roomDiff) return roomDiff;
			return moment(b.taskDate || b.createdAt || 0).valueOf() -
				moment(a.taskDate || a.createdAt || 0).valueOf();
		});

const getRoomNumbers = (rooms = []) =>
	sortRoomsForHousekeeping(rooms).map(roomLabel).filter(Boolean);

const compactRoomNumbers = (rooms = [], limit = 10) => {
	const numbers = getRoomNumbers(rooms);
	if (!numbers.length) return "-";
	const visible = numbers.slice(0, limit).join(", ");
	return numbers.length > limit ? `${visible} +${numbers.length - limit}` : visible;
};

const uniqueRoomTypes = (rooms = []) => {
	if (!Array.isArray(rooms)) return "-";
	const types = [...new Set(rooms.map(roomTypeDisplay).filter(Boolean))];
	return types.length ? types.join(", ") : "-";
};

const getGeneralAreaLabel = (value, isRTL) => {
	const area = GENERAL_CLEANING_AREAS.find(
		(item) => item.value === String(value || "").toLowerCase()
	);
	return area ? area[isRTL ? "ar" : "en"] : String(value || "");
};

const isGeneralTask = (task = {}) =>
	String(task.taskType || "").toLowerCase() === "general" ||
	(!Array.isArray(task.rooms) || task.rooms.length === 0);

const generalAreaLabels = (task = {}, isRTL = false) => {
	task = task || {};
	const areas = Array.isArray(task.generalAreas) ? task.generalAreas : [];
	const labels = areas.map((area) => getGeneralAreaLabel(area, isRTL)).filter(Boolean);
	if (task.customTask) labels.push(task.customTask);
	return labels.length ? labels.join(", ") : task.task_comment || "-";
};

const taskMainLabel = (task = {}, text = TEXT.en, isRTL = false) =>
	isGeneralTask(task) ? generalAreaLabels(task, isRTL) : compactRoomNumbers(task.rooms);

const taskTypeLabel = (task = {}, text = TEXT.en) =>
	isGeneralTask(task) ? text.generalCleaning : text.roomCleaning;

const supplyStatusLabel = (status = "", text = TEXT.en) => {
	const normalized = String(status || "").toLowerCase();
	if (normalized === "approved") return text.approved;
	if (normalized === "rejected") return text.rejected;
	if (normalized === "received") return text.received;
	return text.pendingFinance;
};

const supplyStatusColor = (status = "") => {
	const normalized = String(status || "").toLowerCase();
	if (normalized === "approved") return "blue";
	if (normalized === "rejected") return "red";
	if (normalized === "received") return "green";
	return "orange";
};

const formatSupplyMoney = (value = 0) =>
	`${Number(value || 0).toLocaleString("en-US", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})} SAR`;

const getRoomStatusEntry = (task = {}, room = {}) => {
	const roomId = normalizeId(room);
	return (Array.isArray(task.roomStatus) ? task.roomStatus : []).find(
		(entry) => normalizeId(entry?.room) === roomId
	);
};

const getRoomTaskStatus = (task = {}, room = {}) =>
	getRoomStatusEntry(task, room)?.status || task.task_status || "unfinished";

const isRoomFinished = (task = {}, room = {}) =>
	isFinishedStatus(getRoomTaskStatus(task, room));

const roomStatusTone = (task = {}, room = {}) =>
	statusTone(getRoomTaskStatus(task, room));

const getTaskStartedAt = (task = {}) => {
	if (task.cleaningStartedAt) return task.cleaningStartedAt;
	const roomStartedAt = (Array.isArray(task.roomStatus) ? task.roomStatus : [])
		.map((entry) => entry?.startedAt)
		.find(Boolean);
	if (roomStartedAt) return roomStartedAt;
	return (Array.isArray(task.statusHistory) ? task.statusHistory : []).find(
		(entry) => String(entry?.status || "").toLowerCase() === "cleaning"
	)?.changedAt;
};

const getTaskCompletedAt = (task = {}) => {
	if (task.completedAt) return task.completedAt;
	const cleanedDates = (Array.isArray(task.roomStatus) ? task.roomStatus : [])
		.map((entry) => entry?.cleanedAt)
		.filter(Boolean)
		.map((date) => moment(date))
		.filter((date) => date.isValid());
	if (!cleanedDates.length) return null;
	return moment.max(cleanedDates).toISOString();
};

const getTaskDurationMs = (task = {}) => {
	if (Number(task.cleaningDurationMs) > 0) return Number(task.cleaningDurationMs);
	const startedAt = getTaskStartedAt(task);
	const completedAt = getTaskCompletedAt(task);
	if (!startedAt || !completedAt) return 0;
	return Math.max(0, moment(completedAt).valueOf() - moment(startedAt).valueOf());
};

const getTaskCompletionActor = (task = {}) => {
	if (task.cleanedBy?._id) return task.cleanedBy;
	const finishedRoomStatus = (Array.isArray(task.roomStatus) ? task.roomStatus : [])
		.filter((entry) => isFinishedStatus(entry?.status))
		.find((entry) => entry?.cleanedBy?._id);
	return finishedRoomStatus?.cleanedBy || null;
};

const isManagerCompletionActor = (actor = {}) => {
	if (!actor?._id) return false;
	const roles = getRoles(actor);
	const descriptions = getRoleDescriptions(actor);
	return (
		roles.some((role) => [1000, 2000, 4000, 10000].includes(role)) ||
		descriptions.some((role) =>
			[
				"hotelmanager",
				"systemadmin",
				"housekeepingmanager",
				"manager",
				"owner",
			].includes(role)
		)
	);
};

const completionLabel = (task = {}, text = TEXT.en) =>
	isManagerCompletionActor(getTaskCompletionActor(task))
		? text.closedByManager
		: text.closedByEmployee;

const startCleaningRequiredText = (isRTL, text = TEXT.en) =>
	isRTL
		? "يرجى الضغط على بدء التنظيف أولاً، ثم تأكيد الغرفة بعد الانتهاء."
		: text.startCleaningRequired;

const HouseKeepingMain = () => {
	const { userId: routeUserId, hotelId: routeHotelId } = useParams();
	const history = useHistory();
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [hotelDetails, setHotelDetails] = useState({});
	const [hotelRooms, setHotelRooms] = useState([]);
	const [houseKeepingStaff, setHouseKeepingStaff] = useState([]);
	const [tasks, setTasks] = useState([]);
	const [totalTasksCount, setTotalTasksCount] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [recordsPerPage] = useState(18);
	const [activeTab, setActiveTab] = useState("overview");
	const [selectedDate, setSelectedDate] = useState(moment());
	const [reportFromDate, setReportFromDate] = useState(moment().startOf("month"));
	const [reportToDate, setReportToDate] = useState(moment());
	const [reportStatus, setReportStatus] = useState("all");
	const [reportTasks, setReportTasks] = useState([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [suppliesData, setSuppliesData] = useState({
		items: [],
		requests: [],
		recommended: [],
	});
	const [suppliesLoading, setSuppliesLoading] = useState(false);
	const [statusFilter, setStatusFilter] = useState("active");
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [editTask, setEditTask] = useState(null);
	const [roomCleanTarget, setRoomCleanTarget] = useState(null);
	const [generalCleanTarget, setGeneralCleanTarget] = useState(null);
	const [lastLiveUpdate, setLastLiveUpdate] = useState(null);
	const [form] = Form.useForm();
	const [editForm] = Form.useForm();
	const [supplyItemForm] = Form.useForm();
	const [supplyRequestForm] = Form.useForm();
	const taskTypeValue = Form.useWatch("taskType", form) || "room";
	const generalAreasValue = Form.useWatch("generalAreas", form) || [];
	const editTaskTypeValue = Form.useWatch("taskType", editForm) || "room";
	const editGeneralAreasValue = Form.useWatch("generalAreas", editForm) || [];
	const watchedRequestItems = Form.useWatch("items", supplyRequestForm);
	const { chosenLanguage } = useCartContext();
	const isRTL = chosenLanguage === "Arabic";
	const TXT = TEXT[isRTL ? "ar" : "en"];
	const auth = isAuthenticated();
	const { user } = auth;
	const isSuperAdmin = isSuperAdminUser(user);
	const hotelId = routeHotelId || normalizeId(user?.hotelIdWork);
	const ownerId = routeUserId || normalizeId(user?.belongsToId || user?._id);
	const selectedDateString = selectedDate
		? toTaskDateString(selectedDate)
		: moment().format("YYYY-MM-DD");
	const sortedHotelRooms = useMemo(
		() => sortRoomsForHousekeeping(hotelRooms),
		[hotelRooms]
	);
	const sortedTasks = useMemo(() => sortTasksForHousekeeping(tasks), [tasks]);
	const firstCleaningTask = useMemo(
		() =>
			sortedTasks.find(
				(task) => String(task.task_status || "").toLowerCase() === "cleaning"
			),
		[sortedTasks]
	);
	const remainingTasks = useMemo(
		() =>
			firstCleaningTask
				? sortedTasks.filter((task) => normalizeId(task) !== normalizeId(firstCleaningTask))
				: sortedTasks,
		[firstCleaningTask, sortedTasks]
	);
	const sortedReportTasks = useMemo(
		() => sortTasksForHousekeeping(reportTasks),
		[reportTasks]
	);
	const requestItemsValue = useMemo(
		() => (Array.isArray(watchedRequestItems) ? watchedRequestItems : []),
		[watchedRequestItems]
	);
	const supplyItems = useMemo(
		() => (Array.isArray(suppliesData.items) ? suppliesData.items : []),
		[suppliesData.items]
	);
	const supplyRequests = useMemo(
		() => (Array.isArray(suppliesData.requests) ? suppliesData.requests : []),
		[suppliesData.requests]
	);
	const supplyOptions = useMemo(() => {
		const map = new Map();
		[...(suppliesData.recommended || []), ...supplyItems].forEach((item) => {
			const name = String(item?.name || "").trim();
			if (!name) return;
			map.set(name.toLowerCase(), {
				name,
				category: item.category || "cleaning",
				unit: item.unit || "unit",
				estimatedUnitCost: Number(item.estimatedUnitCost || item.lastPurchasePrice || 0),
				minimumStock: Number(item.minimumStock || 0),
			});
		});
		return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
	}, [suppliesData.recommended, supplyItems]);
	const lowStockItems = useMemo(
		() =>
			supplyItems.filter(
				(item) => Number(item.currentStock || 0) <= Number(item.minimumStock || 0)
			),
		[supplyItems]
	);
	const pendingSupplyRequests = useMemo(
		() =>
			supplyRequests.filter(
				(request) => String(request.status || "").toLowerCase() === "pending_finance"
			),
		[supplyRequests]
	);
	const supplyRequestTotal = useMemo(
		() =>
			(Array.isArray(requestItemsValue) ? requestItemsValue : []).reduce((sum, item) => {
				const quantity = Number(item?.quantity || 0);
				const cost = Number(item?.estimatedUnitCost || 0);
				return sum + (Number.isFinite(quantity * cost) ? quantity * cost : 0);
			}, 0),
		[requestItemsValue]
	);

	const canManageHousekeeping =
		isSuperAdmin ||
		hasRole(user, 1000) ||
		hasRole(user, 2000) ||
		hasRole(user, 4000) ||
		hasRoleDescription(user, "hotelmanager") ||
		hasRoleDescription(user, "housekeepingmanager");

	const canApproveSupplies =
		isSuperAdmin ||
		hasRole(user, 1000) ||
		hasRole(user, 2000) ||
		hasRole(user, 6000) ||
		hasRoleDescription(user, "finance") ||
		hasRoleDescription(user, "accounting") ||
		hasRoleDescription(user, "accountant");
	const canUseSupplies = canManageHousekeeping || canApproveSupplies;

	const isCleanerOnly =
		(hasRole(user, 5000) || hasRoleDescription(user, "housekeeping")) &&
		!canManageHousekeeping;
	const canMarkRoomsClean = canManageHousekeeping || isCleanerOnly;
	const statusRank = (status = "") => {
		const normalized = String(status || "").toLowerCase();
		if (isFinishedStatus(normalized)) return 2;
		if (normalized === "cleaning") return 1;
		return 0;
	};
	const statusOptionsForTask = (task = {}) => {
		const options = [
			{ value: "unfinished", label: TXT.unfinished },
			{ value: "cleaning", label: TXT.cleaningStatus },
			{ value: "finished", label: TXT.finished },
		];
		if (isSuperAdmin) return options;
		const currentRank = statusRank(task.task_status);
		return options.filter((option) => statusRank(option.value) >= currentRank);
	};
	const canEditHousekeepingTask = (task = {}) =>
		canManageHousekeeping &&
		(!isFinishedStatus(task.task_status) || isSuperAdmin);
	const editTaskReadOnly = Boolean(editTask && !canEditHousekeepingTask(editTask));

	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, [hasStoredCollapsed]);

	useEffect(() => {
		if (window.location.search.includes("createNewTask")) {
			setActiveTab("assign");
		} else if (window.location.search.includes("reports")) {
			setActiveTab("reports");
		} else if (window.location.search.includes("supplies")) {
			setActiveTab("supplies");
		} else {
			setActiveTab("overview");
		}
	}, []);

	useEffect(() => {
		if (isCleanerOnly && !["overview", "reports"].includes(activeTab)) {
			setActiveTab("overview");
		}
		if (
			!isCleanerOnly &&
			!canManageHousekeeping &&
			canApproveSupplies &&
			activeTab !== "supplies"
		) {
			setActiveTab("supplies");
		}
	}, [activeTab, canApproveSupplies, canManageHousekeeping, isCleanerOnly]);

	const taskFilters = useMemo(
		() => ({
			date: selectedDateString,
			status: statusFilter,
		}),
		[selectedDateString, statusFilter]
	);

	const reportFilters = useMemo(
		() => ({
			hotelId,
			fromDate: toTaskDateString(reportFromDate),
			toDate: toTaskDateString(reportToDate),
			status: reportStatus,
			includeFinished: "true",
		}),
		[hotelId, reportFromDate, reportStatus, reportToDate]
	);

	const refreshTasks = useCallback((silent = false) => {
		if (!hotelId || !user?._id) return;
		if (!silent) setLoading(true);
		const taskLoader = isCleanerOnly
			? getEmployeeWorkLoad(user._id, {
					hotelId,
					date: selectedDateString,
					includeFinished: "false",
					status: "active",
			  }).then((data) => ({
					data: Array.isArray(data) ? data : [],
					total: Array.isArray(data) ? data.length : 0,
			  }))
			: Promise.all([
					getAllHouseKeepingTasks(currentPage, recordsPerPage, hotelId, taskFilters),
					getAllHouseKeepingTotalRecords(hotelId, taskFilters),
			  ]).then(([listData, totalData]) => ({
					data: Array.isArray(listData?.data) ? listData.data : [],
					total: Number(totalData?.totalDocuments || listData?.total || 0),
			  }));

		taskLoader
			.then(({ data, total }) => {
				setTasks(data);
				setTotalTasksCount(total);
				setLastLiveUpdate(moment());
			})
			.catch(() => message.error("Could not load housekeeping tasks."))
			.finally(() => {
				if (!silent) setLoading(false);
			});
	}, [
		currentPage,
		hotelId,
		isCleanerOnly,
		recordsPerPage,
		selectedDateString,
		taskFilters,
		user?._id,
	]);

	const loadSupplies = useCallback((silent = false) => {
		if (!hotelId || !canUseSupplies) return;
		if (!silent) setSuppliesLoading(true);
		getHousekeepingSupplies(hotelId)
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					return;
				}
				setSuppliesData({
					items: Array.isArray(data?.items) ? data.items : [],
					requests: Array.isArray(data?.requests) ? data.requests : [],
					recommended: Array.isArray(data?.recommended) ? data.recommended : [],
				});
			})
			.catch(() => message.error("Could not load housekeeping supplies."))
			.finally(() => {
				if (!silent) setSuppliesLoading(false);
			});
	}, [canUseSupplies, hotelId]);

	useEffect(() => {
		if (!hotelId) return;
		getHotelDetails(hotelId).then((hotel) => {
			if (hotel && !hotel.error) {
				setHotelDetails(hotel);
				localStorage.setItem("selectedHotel", JSON.stringify(hotel));
			}
		});
		getHotelRooms(hotelId, ownerId).then((rooms) => {
			setHotelRooms(Array.isArray(rooms) ? rooms : []);
		});
		getHouseKeepingStaff(hotelId).then((staff) => {
			setHouseKeepingStaff(Array.isArray(staff) ? staff : []);
		});
	}, [hotelId, ownerId]);

	useEffect(() => {
		refreshTasks();
	}, [refreshTasks]);

	useEffect(() => {
		if (activeTab === "supplies") {
			loadSupplies();
		}
	}, [activeTab, loadSupplies]);

	const loadReportTasks = useCallback(() => {
		if (!hotelId || !user?._id) return;
		setReportLoading(true);
		const loader = isCleanerOnly
			? getEmployeeWorkLoad(user._id, reportFilters).then((data) =>
					Array.isArray(data) ? data : []
			  )
			: getAllHouseKeepingTasks(1, 500, hotelId, reportFilters).then((data) =>
					Array.isArray(data?.data) ? data.data : []
			  );

		loader
			.then((data) => {
				setReportTasks(data);
				setLastLiveUpdate(moment());
			})
			.catch(() => message.error("Could not load housekeeping report."))
			.finally(() => setReportLoading(false));
	}, [hotelId, isCleanerOnly, reportFilters, user?._id]);

	useEffect(() => {
		if (!hotelId) return undefined;
		const handleHousekeepingUpdate = (event = {}) => {
			if (String(event.hotelId || "") !== String(hotelId)) return;
			refreshTasks(true);
			if (activeTab === "supplies" || event.action === "suppliesUpdated") {
				loadSupplies(true);
			}
			if (activeTab === "reports") {
				loadReportTasks();
			}
		};
		socket.emit("joinHousekeeping", { hotelId });
		socket.on("housekeepingUpdated", handleHousekeepingUpdate);
		const liveFallback = setInterval(() => refreshTasks(true), 30000);
		return () => {
			clearInterval(liveFallback);
			socket.off("housekeepingUpdated", handleHousekeepingUpdate);
			socket.emit("leaveHousekeeping", { hotelId });
		};
	}, [activeTab, hotelId, loadReportTasks, loadSupplies, refreshTasks]);

	useEffect(() => {
		if (activeTab === "reports") {
			loadReportTasks();
		}
	}, [activeTab, loadReportTasks]);

	useEffect(() => {
		if (activeTab === "assign") {
			form.setFieldsValue({ taskDate: selectedDateString });
		}
	}, [activeTab, form, selectedDateString]);

	const stats = useMemo(() => {
		const total = tasks.length;
		return tasks.reduce(
			(acc, task) => {
				const status = String(task.task_status || "").toLowerCase();
				if (isFinishedStatus(status)) acc.done += 1;
				else if (status === "cleaning") acc.cleaning += 1;
				else acc.pending += 1;
				return acc;
			},
			{ total, pending: 0, cleaning: 0, done: 0 }
		);
	}, [tasks]);

	const reportSummary = useMemo(() => {
		const completedDurations = reportTasks
			.map(getTaskDurationMs)
			.filter((duration) => duration > 0);
		const averageDuration = completedDurations.length
			? completedDurations.reduce((sum, duration) => sum + duration, 0) /
			  completedDurations.length
			: 0;
		return {
			total: reportTasks.length,
			completed: reportTasks.filter((task) => isFinishedStatus(task.task_status))
				.length,
			averageDuration,
		};
	}, [reportTasks]);

	const syncTab = (tab) => {
		setActiveTab(tab);
		const query =
			tab === "assign"
				? "?createNewTask"
			: tab === "reports"
				? "?reports"
			: tab === "supplies"
				? "?supplies"
				: "?overAllTasks";
		history.replace(`/hotel-management/house-keeping/${ownerId}/${hotelId}${query}`);
	};

	const createTask = (values) => {
		if (!canManageHousekeeping) return;
		const taskType = values.taskType === "general" ? "general" : "room";
		setSaving(true);
		createNewHouseKeepingTask(hotelId, {
			...values,
			taskType,
			rooms: taskType === "room" ? values.rooms : [],
			generalAreas: taskType === "general" ? values.generalAreas || [] : [],
			customTask:
				taskType === "general" &&
				Array.isArray(values.generalAreas) &&
				values.generalAreas.includes("other")
					? values.task_comment || ""
					: "",
			taskDate: toTaskDateString(values.taskDate),
			task_status: "unfinished",
			hotelId,
			assignedBy: user?._id,
		})
			.then((response) => {
				if (response?.error) {
					message.error(response.error);
					return;
				}
				const createdCount = Number(response?.created || 1);
				message.success(
					isRTL
						? `تم إنشاء ${createdCount} مهمة تنظيف.`
						: `${createdCount} housekeeping task${createdCount === 1 ? "" : "s"} created.`
				);
				form.resetFields();
				form.setFieldsValue({ taskDate: selectedDateString, taskType: "room" });
				setActiveTab("overview");
				refreshTasks();
			})
			.finally(() => setSaving(false));
	};

	const updateTaskStatus = (task, task_status) => {
		if (
			!isSuperAdmin &&
			(isFinishedStatus(task.task_status) ||
				statusRank(task_status) < statusRank(task.task_status))
		) {
			message.warning(TXT.statusLocked || "Closed tasks can only be reopened by a super admin.");
			return;
		}
		setSaving(true);
		updatingHouseKeepingTask(task._id, {
			task_status,
			cleanedBy: isFinishedStatus(task_status) ? user?._id : task.cleanedBy?._id,
			actorId: user?._id,
		})
			.then((response) => {
				if (response?.error) {
					message.error(response.error);
					return;
				}
				message.success(isRTL ? "تم تحديث المهمة." : "Task updated.");
				refreshTasks();
			})
			.finally(() => setSaving(false));
	};

	const openRoomCleanModal = (task, room) => {
		if (!canMarkRoomsClean) return;
		if (isRoomFinished(task, room)) {
			message.info(TXT.alreadyClean);
			return;
		}
		if (String(getRoomTaskStatus(task, room) || "").toLowerCase() !== "cleaning") {
			message.warning(startCleaningRequiredText(isRTL, TXT));
			return;
		}
		setRoomCleanTarget({ task, room });
	};

	const confirmRoomClean = () => {
		if (!roomCleanTarget?.task?._id || !roomCleanTarget?.room) return;
		setSaving(true);
		updatingHouseKeepingTask(roomCleanTarget.task._id, {
			cleanRoomId: normalizeId(roomCleanTarget.room),
			actorId: user?._id,
			cleanedBy: user?._id,
			roomCleanComment: TXT.confirmClean,
		})
			.then((response) => {
				if (response?.error) {
					message.error(response.error);
					return;
				}
				message.success(TXT.roomUpdated);
				setRoomCleanTarget(null);
				refreshTasks();
			})
			.finally(() => setSaving(false));
	};

	const openGeneralCleanModal = (task) => {
		if (!canMarkRoomsClean) return;
		if (isFinishedStatus(task.task_status)) {
			message.info(TXT.alreadyClean);
			return;
		}
		if (String(task.task_status || "").toLowerCase() !== "cleaning") {
			message.warning(startCleaningRequiredText(isRTL, TXT));
			return;
		}
		setGeneralCleanTarget(task);
	};

	const confirmGeneralClean = () => {
		if (!generalCleanTarget?._id) return;
		setSaving(true);
		updatingHouseKeepingTask(generalCleanTarget._id, {
			task_status: "finished",
			actorId: user?._id,
			cleanedBy: user?._id,
			task_comment: generalCleanTarget.task_comment || "",
		})
			.then((response) => {
				if (response?.error) {
					message.error(response.error);
					return;
				}
				message.success(TXT.roomUpdated);
				setGeneralCleanTarget(null);
				refreshTasks();
			})
			.finally(() => setSaving(false));
	};

	const openEditTask = (task) => {
		const taskType = isGeneralTask(task) ? "general" : "room";
		setEditTask(task);
		editForm.setFieldsValue({
			taskType,
			taskDate: task.taskDate ? formatDate(task.taskDate) : selectedDateString,
			assignedTo: task.assignedTo?._id,
			task_status: task.task_status || "unfinished",
			task_comment: task.task_comment || "",
			generalAreas: taskType === "general" ? task.generalAreas || [] : [],
			rooms: Array.isArray(task.rooms)
				? task.rooms.map((room) => normalizeId(room)).filter(Boolean)[0]
				: undefined,
		});
	};

	const saveEditTask = () => {
		if (!editTask || !canEditHousekeepingTask(editTask)) {
			message.warning(TXT.statusLocked || "Closed tasks can only be reopened by a super admin.");
			return;
		}
		editForm.validateFields().then((values) => {
			const taskType = values.taskType === "general" ? "general" : "room";
			setSaving(true);
			updatingHouseKeepingTask(editTask._id, {
				...values,
				taskType,
				rooms: taskType === "room" && values.rooms ? [values.rooms] : [],
				generalAreas: taskType === "general" ? values.generalAreas || [] : [],
				customTask:
					taskType === "general" &&
					Array.isArray(values.generalAreas) &&
					values.generalAreas.includes("other")
						? values.task_comment || ""
						: "",
				taskDate: toTaskDateString(values.taskDate),
				actorId: user?._id,
			})
				.then((response) => {
					if (response?.error) {
						message.error(response.error);
						return;
					}
					message.success(isRTL ? "تم حفظ المهمة." : "Task saved.");
					setEditTask(null);
					refreshTasks();
				})
				.finally(() => setSaving(false));
		});
	};

	const populateSupplyRequestItem = (index, supplyName) => {
		const selected = supplyOptions.find((item) => item.name === supplyName);
		if (!selected) return;
		supplyRequestForm.setFieldValue(["items", index, "name"], selected.name);
		supplyRequestForm.setFieldValue(["items", index, "category"], selected.category);
		supplyRequestForm.setFieldValue(["items", index, "unit"], selected.unit);
		supplyRequestForm.setFieldValue(
			["items", index, "estimatedUnitCost"],
			selected.estimatedUnitCost || 0
		);
	};

	const saveSupplyItem = (values) => {
		if (!canManageHousekeeping) return;
		setSuppliesLoading(true);
		saveHousekeepingSupplyItem(hotelId, values)
			.then((response) => {
				if (response?.error) {
					message.error(response.error);
					return;
				}
				message.success(isRTL ? "تم حفظ المستلزم." : "Supply item saved.");
				supplyItemForm.resetFields();
				loadSupplies(true);
			})
			.finally(() => setSuppliesLoading(false));
	};

	const submitSupplyRequest = (values) => {
		if (!canManageHousekeeping) return;
		const items = (Array.isArray(values.items) ? values.items : []).filter(
			(item) => item?.name && Number(item?.quantity || 0) > 0
		);
		if (!items.length) {
			message.error(isRTL ? "أضف مستلزم واحد على الأقل." : "Add at least one supply item.");
			return;
		}
		setSuppliesLoading(true);
		createHousekeepingSupplyRequest(hotelId, { ...values, items })
			.then((response) => {
				if (response?.error) {
					message.error(response.error);
					return;
				}
				message.success(
					isRTL ? "تم إرسال طلب المستلزمات للمالية." : "Supply request sent to finance."
				);
				supplyRequestForm.resetFields();
				supplyRequestForm.setFieldsValue({ priority: "normal", items: [{}] });
				loadSupplies(true);
			})
			.finally(() => setSuppliesLoading(false));
	};

	const updateSupplyRequest = (request, action) => {
		if (!request?._id) return;
		setSuppliesLoading(true);
		updateHousekeepingSupplyRequest(request._id, { action })
			.then((response) => {
				if (response?.error) {
					message.error(response.error);
					return;
				}
				message.success(isRTL ? "تم تحديث طلب المستلزمات." : "Supply request updated.");
				loadSupplies(true);
			})
			.finally(() => setSuppliesLoading(false));
	};

	const renderTaskCard = (task, priority = false) => (
		<TaskCard
			key={task._id}
			$status={statusTone(task.task_status)}
			$priority={priority}
		>
			<TaskHeader>
				<div>
					<strong>
						{Array.isArray(task.rooms) ? compactRoomNumbers(task.rooms) : "-"}
					</strong>
					<span>
						{TXT.floor}:{" "}
						{Array.isArray(task.rooms)
							? [
									...new Set(
										task.rooms
											.map((room) => room.floor)
											.filter((floor) => floor !== undefined)
									),
							  ].join(", ")
							: "-"}
					</span>
				</div>
				<Tag color={statusTone(task.task_status)}>
					{statusLabel(task.task_status, isRTL)}
				</Tag>
			</TaskHeader>
			{isFinishedStatus(task.task_status) ? (
				<CompletionBadge
					$manager={isManagerCompletionActor(getTaskCompletionActor(task))}
				>
					{completionLabel(task, TXT)}
				</CompletionBadge>
			) : null}
			{task.assignedTo?.name ? (
				<AssignedEmployeePill>
					{TXT.assignedTo}: <b>{task.assignedTo.name}</b>
				</AssignedEmployeePill>
			) : null}
			<RoomActionHint>
				{String(task.task_status || "").toLowerCase() === "cleaning"
					? TXT.selectRoomHint
					: startCleaningRequiredText(isRTL, TXT)}
			</RoomActionHint>
			<RoomActionGrid>
				{Array.isArray(task.rooms) &&
					task.rooms.map((room) => {
						const roomIsClean = isRoomFinished(task, room);
						const roomIsCleaning =
							String(getRoomTaskStatus(task, room) || "").toLowerCase() ===
							"cleaning";
						return (
							<RoomActionButton
								type='button'
								key={room._id || room.room_number}
								$clean={roomIsClean}
								$tone={roomStatusTone(task, room)}
								$attention={roomIsCleaning && !roomIsClean}
								disabled={!canMarkRoomsClean || roomIsClean || saving}
								onClick={() => openRoomCleanModal(task, room)}
							>
								<strong>{roomLabel(room)}</strong>
								<span>{roomTypeDisplay(room)}</span>
								<small>
									{roomIsClean
										? TXT.finished
										: statusLabel(getRoomTaskStatus(task, room), isRTL)}
								</small>
								<RoomHousedFlag $housed={room.isCurrentlyHoused}>
									{room.isCurrentlyHoused ? TXT.housed : TXT.notHoused}
								</RoomHousedFlag>
							</RoomActionButton>
						);
					})}
			</RoomActionGrid>
			<RoomList>
				{Array.isArray(task.rooms) &&
					task.rooms.map((room) => (
						<span key={room._id || room.room_number}>
							{roomLabel(room)} Â· {roomTypeDisplay(room)}
						</span>
					))}
			</RoomList>
			<TaskMeta>
				<span>
					{TXT.roomType}: <b>{uniqueRoomTypes(task.rooms)}</b>
				</span>
				<span>
					{TXT.taskDate}: <b>{formatDate(task.taskDate)}</b>
				</span>
				<span>
					{TXT.assignedTo}: <b>{task.assignedTo?.name || user?.name || "-"}</b>
				</span>
				<span>
					{TXT.cleanedBy}: <b>{task.cleanedBy?.name || "-"}</b>
				</span>
				<span>
					{TXT.confirmation}: <b>{task.confirmation_number || "-"}</b>
				</span>
			</TaskMeta>
			{task.task_comment ? <TaskComment>{task.task_comment}</TaskComment> : null}
			<TaskActions>
				{!isFinishedStatus(task.task_status) &&
				String(task.task_status || "").toLowerCase() !== "cleaning" ? (
					<StartCleaningButton
						type='button'
						onClick={() => updateTaskStatus(task, "cleaning")}
						disabled={saving}
					>
						{TXT.markCleaning}
					</StartCleaningButton>
				) : null}
				{isFinishedStatus(task.task_status) && isSuperAdmin ? (
					<Button onClick={() => updateTaskStatus(task, "unfinished")}>
						{TXT.reopen}
					</Button>
				) : null}
				{canManageHousekeeping ? (
					<Button onClick={() => openEditTask(task)}>
						{canEditHousekeepingTask(task) ? TXT.edit : TXT.details || TXT.edit}
					</Button>
				) : null}
			</TaskActions>
		</TaskCard>
	);

	const renderHousekeepingTaskCard = (task, priority = false) => {
		const generalTask = isGeneralTask(task);
		const taskIsCleaning =
			String(task.task_status || "").toLowerCase() === "cleaning";

		return (
			<TaskCard
				key={task._id}
				$status={statusTone(task.task_status)}
				$priority={priority}
			>
				<TaskHeader>
					<div>
						<strong>{taskMainLabel(task, TXT, isRTL)}</strong>
						<span>{taskTypeLabel(task, TXT)}</span>
					</div>
					<Tag color={statusTone(task.task_status)}>
						{statusLabel(task.task_status, isRTL)}
					</Tag>
				</TaskHeader>
				{isFinishedStatus(task.task_status) ? (
					<CompletionBadge
						$manager={isManagerCompletionActor(getTaskCompletionActor(task))}
					>
						{completionLabel(task, TXT)}
					</CompletionBadge>
				) : null}
				{task.assignedTo?.name ? (
					<AssignedEmployeePill>
						{TXT.assignedTo}: <b>{task.assignedTo.name}</b>
					</AssignedEmployeePill>
				) : null}
				<RoomActionHint>
					{generalTask
						? TXT.generalTaskCleanHint
						: taskIsCleaning
						? TXT.selectRoomHint
						: startCleaningRequiredText(isRTL, TXT)}
				</RoomActionHint>
				{generalTask ? (
					<GeneralTaskBox>
						<strong>{generalAreaLabels(task, isRTL)}</strong>
						<span>{task.task_comment || TXT.generalTaskCommentHint}</span>
					</GeneralTaskBox>
				) : (
					<>
						<RoomActionGrid>
							{Array.isArray(task.rooms) &&
								task.rooms.map((room) => {
									const roomIsClean = isRoomFinished(task, room);
									const roomIsCleaning =
										String(getRoomTaskStatus(task, room) || "").toLowerCase() ===
										"cleaning";
									return (
										<RoomActionButton
											type='button'
											key={room._id || room.room_number}
											$clean={roomIsClean}
											$tone={roomStatusTone(task, room)}
											$attention={roomIsCleaning && !roomIsClean}
											disabled={!canMarkRoomsClean || roomIsClean || saving}
											onClick={() => openRoomCleanModal(task, room)}
										>
											<strong>{roomLabel(room)}</strong>
											<span>{roomTypeDisplay(room)}</span>
											<small>
												{roomIsClean
													? TXT.finished
													: statusLabel(getRoomTaskStatus(task, room), isRTL)}
											</small>
											<RoomHousedFlag $housed={room.isCurrentlyHoused}>
												{room.isCurrentlyHoused ? TXT.housed : TXT.notHoused}
											</RoomHousedFlag>
										</RoomActionButton>
									);
								})}
						</RoomActionGrid>
						<RoomList>
							{Array.isArray(task.rooms) &&
								task.rooms.map((room) => (
									<span key={room._id || room.room_number}>
										{roomLabel(room)} · {roomTypeDisplay(room)}
									</span>
								))}
						</RoomList>
					</>
				)}
				<TaskMeta>
					<span>
						{generalTask ? TXT.generalAreas : TXT.roomType}:{" "}
						<b>
							{generalTask
								? generalAreaLabels(task, isRTL)
								: uniqueRoomTypes(task.rooms)}
						</b>
					</span>
					<span>
						{TXT.taskDate}: <b>{formatDate(task.taskDate)}</b>
					</span>
					<span>
						{TXT.assignedTo}: <b>{task.assignedTo?.name || user?.name || "-"}</b>
					</span>
					<span>
						{TXT.cleanedBy}: <b>{task.cleanedBy?.name || "-"}</b>
					</span>
					<span>
						{TXT.confirmation}: <b>{task.confirmation_number || "-"}</b>
					</span>
				</TaskMeta>
				{task.task_comment ? <TaskComment>{task.task_comment}</TaskComment> : null}
				<TaskActions>
					{!isFinishedStatus(task.task_status) && !taskIsCleaning ? (
						<StartCleaningButton
							type='button'
							onClick={() => updateTaskStatus(task, "cleaning")}
							disabled={saving}
						>
							{TXT.markCleaning}
						</StartCleaningButton>
					) : null}
					{generalTask && taskIsCleaning ? (
						<StartCleaningButton
							type='button'
							onClick={() => openGeneralCleanModal(task)}
							disabled={saving}
						>
							{TXT.markClean}
						</StartCleaningButton>
					) : null}
					{isFinishedStatus(task.task_status) && isSuperAdmin ? (
						<Button onClick={() => updateTaskStatus(task, "unfinished")}>
							{TXT.reopen}
						</Button>
					) : null}
					{canManageHousekeeping ? (
						<Button onClick={() => openEditTask(task)}>
							{canEditHousekeepingTask(task) ? TXT.edit : TXT.details || TXT.edit}
						</Button>
					) : null}
				</TaskActions>
			</TaskCard>
		);
	};

	const navProps = {
		fromPage: "HouseKeeping",
		AdminMenuStatus,
		setAdminMenuStatus,
		collapsed,
		setCollapsed,
		chosenLanguage,
	};

	return (
		<HouseKeepingMainWrapper $isRTL={isRTL} $collapsed={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{isRTL ? <AdminNavbarArabic {...navProps} /> : <AdminNavbar {...navProps} />}
				</div>

				<main className='otherContentWrapper'>
					{canManageHousekeeping || canApproveSupplies ? (
						<TabsBar $count={canManageHousekeeping ? 4 : 1}>
							{canManageHousekeeping ? (
								<>
							<TabButton
								type='button'
								$active={activeTab === "overview"}
								onClick={() => syncTab("overview")}
							>
								{TXT.overview}
							</TabButton>
							<TabButton
								type='button'
								$active={activeTab === "assign"}
								onClick={() => syncTab("assign")}
							>
								{TXT.assign}
							</TabButton>
							<TabButton
								type='button'
								$active={activeTab === "reports"}
								onClick={() => syncTab("reports")}
							>
								{TXT.reports}
							</TabButton>
								</>
							) : null}
							<TabButton
								type='button'
								$active={activeTab === "supplies"}
								onClick={() => syncTab("supplies")}
							>
								{TXT.supplies}
							</TabButton>
						</TabsBar>
					) : null}
					{isCleanerOnly ? (
						<TabsBar $count={2}>
							<TabButton
								type='button'
								$active={activeTab === "overview"}
								onClick={() => syncTab("overview")}
							>
								{TXT.myWork}
							</TabButton>
							<TabButton
								type='button'
								$active={activeTab === "reports"}
								onClick={() => syncTab("reports")}
							>
								{TXT.reports}
							</TabButton>
						</TabsBar>
					) : null}

					<TopControlsBar>
						<div>
							<strong>{hotelDetails?.hotelName || TXT.title}</strong>
							<span>{isCleanerOnly ? TXT.cleanerSubtitle : TXT.hotelReady}</span>
							<LiveStatusPill>
								<i />
								<b>{TXT.live}</b>
								{lastLiveUpdate ? (
									<small>
										{TXT.lastUpdated}: {lastLiveUpdate.format("HH:mm:ss")}
									</small>
								) : null}
							</LiveStatusPill>
						</div>
						<HeroActions>
							{activeTab !== "supplies" ? (
								<NativeDateInput
									type='date'
									value={selectedDateString}
									min={MIN_TASK_DATE}
									max={MAX_TASK_DATE}
									aria-label={TXT.dateHint}
									onChange={(event) => {
										setSelectedDate(
											moment(
												normalizeTaskDateString(event.target.value),
												"YYYY-MM-DD"
											)
										);
										setCurrentPage(1);
									}}
								/>
							) : null}
							<Button
								icon={<ReloadOutlined />}
								onClick={() =>
									activeTab === "supplies"
										? loadSupplies(false)
										: refreshTasks(false)
								}
							>
								{TXT.refresh}
							</Button>
						</HeroActions>
					</TopControlsBar>

					{activeTab === "overview" && firstCleaningTask ? (
						<PriorityTaskPanel>
							<PriorityTaskTitle>
								<strong>{TXT.priorityTask}</strong>
								<span>{TXT.priorityHint}</span>
							</PriorityTaskTitle>
							{renderHousekeepingTaskCard(firstCleaningTask, true)}
						</PriorityTaskPanel>
					) : null}

					{activeTab !== "supplies" ? (
						<StatsGrid>
							<StatCard $tone='blue'>
								<TeamOutlined />
								<strong>{stats.total}</strong>
								<span>{TXT.total}</span>
							</StatCard>
							<StatCard $tone='orange'>
								<HomeOutlined />
								<strong>{stats.pending}</strong>
								<span>{TXT.pending}</span>
							</StatCard>
							<StatCard $tone='purple' $attention={stats.cleaning > 0}>
								<ClearOutlined />
								<strong>{stats.cleaning}</strong>
								<span>{TXT.cleaning}</span>
							</StatCard>
							<StatCard $tone='green'>
								<CheckCircleOutlined />
								<strong>{stats.done}</strong>
								<span>{TXT.done}</span>
							</StatCard>
						</StatsGrid>
					) : null}

					{canUseSupplies && activeTab === "supplies" ? (
						<SuppliesPanel>
							<PanelTitle>
								<strong>{TXT.supplies}</strong>
								<span>{TXT.suppliesHint}</span>
							</PanelTitle>
							<Spin spinning={suppliesLoading}>
								<SupplySummaryGrid>
									<StatCard $tone='blue'>
										<HomeOutlined />
										<strong>{supplyItems.length}</strong>
										<span>{TXT.inventory}</span>
									</StatCard>
									<StatCard $tone='orange'>
										<ClearOutlined />
										<strong>{lowStockItems.length}</strong>
										<span>{TXT.lowStock}</span>
									</StatCard>
									<StatCard $tone='purple'>
										<TeamOutlined />
										<strong>{pendingSupplyRequests.length}</strong>
										<span>{TXT.pendingFinance}</span>
									</StatCard>
									<StatCard $tone='green'>
										<CheckCircleOutlined />
										<strong>
											{
												supplyRequests.filter(
													(request) =>
														String(request.status || "").toLowerCase() === "received"
												).length
											}
										</strong>
										<span>{TXT.received}</span>
									</StatCard>
								</SupplySummaryGrid>

								{canManageHousekeeping ? (
									<SupplyFormsGrid>
										<SupplyFormCard>
											<h3>{TXT.inventory}</h3>
											<Form
												form={supplyItemForm}
												layout='vertical'
												onFinish={saveSupplyItem}
											>
												<Form.Item
													name='name'
													label={TXT.itemName}
													rules={[{ required: true }]}
												>
													<Select
														showSearch
														optionFilterProp='children'
														onChange={(value) => {
															const selected = supplyOptions.find(
																(item) => item.name === value
															);
															if (!selected) return;
															supplyItemForm.setFieldsValue({
																category: selected.category,
																unit: selected.unit,
																minimumStock: selected.minimumStock,
																estimatedUnitCost: selected.estimatedUnitCost,
															});
														}}
													>
														{supplyOptions.map((item) => (
															<Select.Option key={item.name} value={item.name}>
																{item.name}
															</Select.Option>
														))}
													</Select>
												</Form.Item>
												<Form.Item name='category' label={TXT.category}>
													<Input />
												</Form.Item>
												<Form.Item name='unit' label={TXT.unit}>
													<Input />
												</Form.Item>
												<Form.Item name='currentStock' label={TXT.currentStock}>
													<Input type='number' min='0' step='1' />
												</Form.Item>
												<Form.Item name='minimumStock' label={TXT.minStock}>
													<Input type='number' min='0' step='1' />
												</Form.Item>
												<Form.Item name='estimatedUnitCost' label={`${TXT.unitCost} SAR`}>
													<Input type='number' min='0' step='0.01' />
												</Form.Item>
												<Button type='primary' htmlType='submit'>
													{TXT.addItem}
												</Button>
											</Form>
										</SupplyFormCard>

										<SupplyFormCard>
											<h3>{TXT.requestSupplies}</h3>
											<FinanceNotice>{TXT.financeRequired}</FinanceNotice>
											<Form
												form={supplyRequestForm}
												layout='vertical'
												onFinish={submitSupplyRequest}
												initialValues={{ priority: "normal", items: [{}] }}
											>
												<Form.Item name='priority' label={TXT.priority}>
													<Select>
														<Select.Option value='normal'>{TXT.normal}</Select.Option>
														<Select.Option value='urgent'>{TXT.urgent}</Select.Option>
													</Select>
												</Form.Item>
												<Form.Item name='vendor' label={TXT.vendor}>
													<Input />
												</Form.Item>
												<Form.List name='items'>
													{(fields, { add, remove }) => (
														<SupplyRequestList>
															{fields.map((field) => (
																<SupplyRequestLine key={field.key}>
																	<Form.Item
																		name={[field.name, "name"]}
																		label={TXT.itemName}
																		rules={[{ required: true }]}
																	>
																		<Select
																			showSearch
																			optionFilterProp='children'
																			onChange={(value) =>
																				populateSupplyRequestItem(field.name, value)
																			}
																		>
																			{supplyOptions.map((item) => (
																				<Select.Option
																					key={item.name}
																					value={item.name}
																				>
																					{item.name}
																				</Select.Option>
																			))}
																		</Select>
																	</Form.Item>
																	<Form.Item name={[field.name, "category"]} hidden>
																		<Input />
																	</Form.Item>
																	<Form.Item
																		name={[field.name, "quantity"]}
																		label={TXT.quantity}
																		rules={[{ required: true }]}
																	>
																		<Input type='number' min='1' step='1' />
																	</Form.Item>
																	<Form.Item name={[field.name, "unit"]} label={TXT.unit}>
																		<Input />
																	</Form.Item>
																	<Form.Item
																		name={[field.name, "estimatedUnitCost"]}
																		label={`${TXT.unitCost} SAR`}
																	>
																		<Input type='number' min='0' step='0.01' />
																	</Form.Item>
																	<Button
																		htmlType='button'
																		disabled={fields.length === 1}
																		onClick={() => remove(field.name)}
																	>
																		-
																	</Button>
																</SupplyRequestLine>
															))}
															<Button htmlType='button' onClick={() => add({})}>
																{TXT.addItem}
															</Button>
														</SupplyRequestList>
													)}
												</Form.List>
												<InlineTotal>
													<span>{TXT.estimatedCost}</span>
													<strong>{formatSupplyMoney(supplyRequestTotal)}</strong>
												</InlineTotal>
												<Form.Item name='requestNotes' label={TXT.requestNotes}>
													<Input.TextArea rows={2} />
												</Form.Item>
												<Button type='primary' htmlType='submit'>
													{TXT.submitRequest}
												</Button>
											</Form>
										</SupplyFormCard>
									</SupplyFormsGrid>
								) : null}

								<SupplyDataGrid>
									<SupplyListCard>
										<h3>{TXT.inventory}</h3>
										{supplyItems.length ? (
											<ReportTableWrap>
												<table>
													<thead>
														<tr>
															<th>{TXT.itemName}</th>
															<th>{TXT.category}</th>
															<th>{TXT.stockLevel}</th>
															<th>{TXT.minStock}</th>
															<th>{TXT.unitCost}</th>
														</tr>
													</thead>
													<tbody>
														{supplyItems.map((item) => {
															const isLow =
																Number(item.currentStock || 0) <=
																Number(item.minimumStock || 0);
															return (
																<tr key={item._id || item.name}>
																	<td>{item.name}</td>
																	<td>{item.category || "-"}</td>
																	<td>
																		<Tag color={isLow ? "red" : "green"}>
																			{Number(item.currentStock || 0)} {item.unit || ""}
																		</Tag>
																	</td>
																	<td>{Number(item.minimumStock || 0)}</td>
																	<td>{formatSupplyMoney(item.estimatedUnitCost)}</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</ReportTableWrap>
										) : (
											<Empty description={TXT.noSupplies} />
										)}
									</SupplyListCard>

									<SupplyListCard>
										<h3>{TXT.requests}</h3>
										{supplyRequests.length ? (
											<SupplyRequestCards>
												{supplyRequests.map((request) => {
													const status = String(request.status || "").toLowerCase();
													const requestTotal =
														Number(request.totalEstimatedCost || 0) ||
														(Array.isArray(request.items) ? request.items : []).reduce(
															(sum, item) =>
																sum +
																Number(item.quantity || 0) *
																	Number(item.estimatedUnitCost || 0),
															0
														);
													return (
														<SupplyRequestCard key={request._id}>
															<SupplyRequestHead>
																<div>
																	<strong>{formatSupplyMoney(requestTotal)}</strong>
																	<span>
																		{TXT.requestedBy}: {request.requestedBy?.name || "-"}
																	</span>
																</div>
																<Tag color={supplyStatusColor(status)}>
																	{supplyStatusLabel(status, TXT)}
																</Tag>
															</SupplyRequestHead>
															<SupplyItemChips>
																{(Array.isArray(request.items) ? request.items : []).map(
																	(item, index) => (
																		<span key={`${request._id}-${item.name}-${index}`}>
																			<b>{item.name}</b> × {item.quantity}{" "}
																			{item.unit || ""}
																		</span>
																	)
																)}
															</SupplyItemChips>
															<SupplyRequestMeta>
																<span>
																	{TXT.priority}:{" "}
																	<b>
																		{request.priority === "urgent"
																			? TXT.urgent
																			: TXT.normal}
																	</b>
																</span>
																<span>
																	{TXT.vendor}: <b>{request.vendor || "-"}</b>
																</span>
																<span>
																	{TXT.requestedAt}:{" "}
																	<b>{formatDate(request.createdAt)}</b>
																</span>
															</SupplyRequestMeta>
															{request.notes || request.requestNotes ? (
																<TaskComment>
																	{request.notes || request.requestNotes}
																</TaskComment>
															) : null}
															<SupplyActions>
																{status === "pending_finance" && canApproveSupplies ? (
																	<>
																		<Button
																			type='primary'
																			onClick={() =>
																				updateSupplyRequest(request, "approve")
																			}
																		>
																			{TXT.approve}
																		</Button>
																		<Button
																			danger
																			onClick={() =>
																				updateSupplyRequest(request, "reject")
																			}
																		>
																			{TXT.reject}
																		</Button>
																	</>
																) : null}
																{["approved", "purchased"].includes(status) &&
																canManageHousekeeping ? (
																	<Button
																		type='primary'
																		onClick={() =>
																			updateSupplyRequest(request, "received")
																		}
																	>
																		{TXT.markReceived}
																	</Button>
																) : null}
															</SupplyActions>
														</SupplyRequestCard>
													);
												})}
											</SupplyRequestCards>
										) : (
											<Empty description={TXT.noRequests} />
										)}
									</SupplyListCard>
								</SupplyDataGrid>
							</Spin>
						</SuppliesPanel>
					) : null}

					{canManageHousekeeping && activeTab === "assign" ? (
						<AssignmentPanel>
							<PanelTitle>
								<strong>{TXT.assign}</strong>
								<span>{TXT.assignHint}</span>
							</PanelTitle>
							{houseKeepingStaff.length ? (
								<Form
									form={form}
									layout='vertical'
									onFinish={createTask}
									initialValues={{ taskDate: selectedDateString, taskType: "room" }}
								>
									<Form.Item
										name='taskDate'
										label={TXT.taskDate}
										rules={[{ required: true }]}
									>
										<NativeDateInput
											type='date'
											min={MIN_TASK_DATE}
											max={MAX_TASK_DATE}
										/>
									</Form.Item>
									<Form.Item
										name='assignedTo'
										label={TXT.employee}
										rules={[{ required: true }]}
									>
										<Select showSearch optionFilterProp='children'>
											{houseKeepingStaff.map((staff) => (
												<Select.Option key={staff._id} value={staff._id}>
													{staff.name}
												</Select.Option>
											))}
										</Select>
									</Form.Item>
									<Form.Item
										name='taskType'
										label={TXT.taskKind}
										rules={[{ required: true }]}
									>
										<Select
											onChange={(value) => {
												if (value === "room") {
													form.setFieldsValue({
														generalAreas: [],
														task_comment: form.getFieldValue("task_comment"),
													});
												} else {
													form.setFieldsValue({ rooms: [] });
												}
											}}
										>
											<Select.Option value='room'>{TXT.roomCleaning}</Select.Option>
											<Select.Option value='general'>{TXT.generalCleaning}</Select.Option>
										</Select>
									</Form.Item>
									{taskTypeValue === "general" ? (
										<Form.Item
											name='generalAreas'
											label={TXT.generalAreas}
											rules={[
												{
													required: true,
													message: TXT.generalAreasHint,
													type: "array",
												},
											]}
										>
											<Select
												mode='multiple'
												showSearch
												optionFilterProp='children'
												placeholder={TXT.generalAreasHint}
											>
												{GENERAL_CLEANING_AREAS.map((area) => (
													<Select.Option key={area.value} value={area.value}>
														{isRTL ? area.ar : area.en}
													</Select.Option>
												))}
											</Select>
										</Form.Item>
									) : (
										<Form.Item
											name='rooms'
											label={TXT.rooms}
											rules={[{ required: true }]}
										>
											<Select mode='multiple' showSearch optionFilterProp='children'>
												{sortedHotelRooms.map((room) => (
													<Select.Option key={room._id} value={room._id}>
														{roomLabel(room)} - {roomTypeDisplay(room)} -{" "}
														{room.isCurrentlyHoused ? TXT.housed : TXT.notHoused}
													</Select.Option>
												))}
											</Select>
										</Form.Item>
									)}
									<Form.Item
										name='task_comment'
										className='full-span'
										label={
											taskTypeValue === "general" ? TXT.generalTaskDetails : TXT.comment
										}
										rules={[
											{
												required:
													taskTypeValue === "general" &&
													Array.isArray(generalAreasValue) &&
													generalAreasValue.includes("other"),
												message: TXT.customAreaRequiresComment,
											},
										]}
									>
										<Input.TextArea
											rows={3}
											placeholder={
												taskTypeValue === "general"
													? TXT.generalTaskCommentHint
													: undefined
											}
										/>
									</Form.Item>
									<Button
										type='primary'
										htmlType='submit'
										loading={saving}
										icon={<PlusOutlined />}
									>
										{saving ? TXT.creating : TXT.createTask}
									</Button>
								</Form>
							) : (
								<Empty description={TXT.noStaff} />
							)}
						</AssignmentPanel>
					) : null}

					{canManageHousekeeping && activeTab === "overview" ? (
						<FiltersRow>
							<Select
								value={statusFilter}
								onChange={(value) => {
									setStatusFilter(value);
									setCurrentPage(1);
								}}
							>
								<Select.Option value='active'>{TXT.activeTasks}</Select.Option>
								<Select.Option value='unfinished'>{TXT.unfinished}</Select.Option>
								<Select.Option value='cleaning'>{TXT.cleaningStatus}</Select.Option>
								<Select.Option value='finished'>{TXT.finished}</Select.Option>
							</Select>
							<Tag color='blue'>{TXT.hotelReady}</Tag>
						</FiltersRow>
					) : null}

					{activeTab === "reports" ? (
						<ReportsPanel>
							<PanelTitle>
								<strong>{TXT.reports}</strong>
								<span>{TXT.reportHint}</span>
							</PanelTitle>
							<ReportFilters>
								<label>
									<span>{TXT.fromDate}</span>
									<NativeDateInput
										type='date'
										value={toTaskDateString(reportFromDate)}
										min={MIN_TASK_DATE}
										max={MAX_TASK_DATE}
										onChange={(event) =>
											setReportFromDate(
												moment(
													normalizeTaskDateString(event.target.value),
													"YYYY-MM-DD"
												)
											)
										}
									/>
								</label>
								<label>
									<span>{TXT.toDate}</span>
									<NativeDateInput
										type='date'
										value={toTaskDateString(reportToDate)}
										min={MIN_TASK_DATE}
										max={MAX_TASK_DATE}
										onChange={(event) =>
											setReportToDate(
												moment(
													normalizeTaskDateString(event.target.value),
													"YYYY-MM-DD"
												)
											)
										}
									/>
								</label>
								<label>
									<span>{TXT.status}</span>
									<Select value={reportStatus} onChange={setReportStatus}>
										<Select.Option value='all'>{TXT.allStatuses}</Select.Option>
										<Select.Option value='unfinished'>{TXT.unfinished}</Select.Option>
										<Select.Option value='cleaning'>{TXT.cleaningStatus}</Select.Option>
										<Select.Option value='finished'>{TXT.finished}</Select.Option>
									</Select>
								</label>
								<Button type='primary' onClick={loadReportTasks}>
									{TXT.loadReport}
								</Button>
							</ReportFilters>
							<ReportSummaryGrid>
								<StatCard $tone='blue'>
									<strong>{reportSummary.total}</strong>
									<span>{TXT.total}</span>
								</StatCard>
								<StatCard $tone='green'>
									<strong>{reportSummary.completed}</strong>
									<span>{TXT.done}</span>
								</StatCard>
								<StatCard $tone='purple'>
									<strong>
										{formatDuration(reportSummary.averageDuration, TXT.minutes)}
									</strong>
									<span>{TXT.averageDuration}</span>
								</StatCard>
							</ReportSummaryGrid>
							<Spin spinning={reportLoading}>
								{reportTasks.length ? (
									<ReportTableWrap>
										<table>
											<thead>
												<tr>
													<th>#</th>
													<th>{TXT.taskDate}</th>
													<th>{TXT.rooms}</th>
													<th>{TXT.roomType}</th>
													<th>{TXT.employee}</th>
													<th>{TXT.status}</th>
													<th>{TXT.startedAt}</th>
													<th>{TXT.completedAt}</th>
													<th>{TXT.duration}</th>
													<th>{TXT.details || TXT.actions}</th>
												</tr>
											</thead>
											<tbody>
												{sortedReportTasks.map((task, index) => (
													<tr key={task._id || index}>
														<td>{index + 1}</td>
														<td>{formatDate(task.taskDate)}</td>
														<td>{taskMainLabel(task, TXT, isRTL)}</td>
														<td>{taskTypeLabel(task, TXT)}</td>
														<td>{task.assignedTo?.name || user?.name || "-"}</td>
														<td>
															<Tag color={statusTone(task.task_status)}>
																{statusLabel(task.task_status, isRTL)}
															</Tag>
														</td>
														<td>{formatDateTime(getTaskStartedAt(task))}</td>
														<td>{formatDateTime(getTaskCompletedAt(task))}</td>
														<td>
															{formatDuration(getTaskDurationMs(task), TXT.minutes)}
														</td>
														<td>
															<Button size='small' onClick={() => openEditTask(task)}>
																{TXT.details || TXT.edit}
															</Button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</ReportTableWrap>
								) : (
									<Empty description={TXT.noReportRows} />
								)}
							</Spin>
						</ReportsPanel>
					) : null}

					{activeTab === "overview" ? (
						<Spin spinning={loading}>
							{sortedTasks.length ? (
								<TaskGrid>
									{remainingTasks.map((task) =>
										isGeneralTask(task) ? renderHousekeepingTaskCard(task) : renderTaskCard(task) || (
										<TaskCard key={task._id} $status={statusTone(task.task_status)}>
											<TaskHeader>
												<div>
													<strong>
														{Array.isArray(task.rooms)
															? compactRoomNumbers(task.rooms)
															: "-"}
													</strong>
													<span>
														{TXT.floor}:{" "}
														{Array.isArray(task.rooms)
															? [
																	...new Set(
																		task.rooms
																			.map((room) => room.floor)
																			.filter((floor) => floor !== undefined)
																	),
															  ].join(", ")
															: "-"}
													</span>
												</div>
												<Tag color={statusTone(task.task_status)}>
													{statusLabel(task.task_status, isRTL)}
												</Tag>
											</TaskHeader>
											{isFinishedStatus(task.task_status) ? (
												<CompletionBadge
													$manager={isManagerCompletionActor(
														getTaskCompletionActor(task)
													)}
												>
													{completionLabel(task, TXT)}
												</CompletionBadge>
											) : null}
											<RoomActionHint>{TXT.selectRoomHint}</RoomActionHint>
											<RoomActionGrid>
												{Array.isArray(task.rooms) &&
													task.rooms.map((room) => {
														const roomIsClean = isRoomFinished(task, room);
														const roomIsCleaning =
															String(getRoomTaskStatus(task, room) || "").toLowerCase() ===
															"cleaning";
														return (
															<RoomActionButton
																type='button'
																key={room._id || room.room_number}
																$clean={roomIsClean}
																$tone={roomStatusTone(task, room)}
																$attention={roomIsCleaning && !roomIsClean}
																disabled={!canMarkRoomsClean || roomIsClean || saving}
																onClick={() => openRoomCleanModal(task, room)}
															>
																<strong>{roomLabel(room)}</strong>
																<span>{roomTypeDisplay(room)}</span>
																<small>
																	{roomIsClean
																		? TXT.finished
																		: statusLabel(getRoomTaskStatus(task, room), isRTL)}
																</small>
																<RoomHousedFlag $housed={room.isCurrentlyHoused}>
																	{room.isCurrentlyHoused ? TXT.housed : TXT.notHoused}
																</RoomHousedFlag>
															</RoomActionButton>
														);
													})}
											</RoomActionGrid>
											<RoomList>
												{Array.isArray(task.rooms) &&
													task.rooms.map((room) => (
														<span key={room._id || room.room_number}>
															{roomLabel(room)} · {roomTypeDisplay(room)}
														</span>
													))}
											</RoomList>
											<TaskMeta>
												<span>
													{TXT.roomType}: <b>{uniqueRoomTypes(task.rooms)}</b>
												</span>
												<span>
													{TXT.taskDate}: <b>{formatDate(task.taskDate)}</b>
												</span>
												<span>
													{TXT.assignedTo}:{" "}
													<b>{task.assignedTo?.name || user?.name || "-"}</b>
												</span>
												<span>
													{TXT.cleanedBy}: <b>{task.cleanedBy?.name || "-"}</b>
												</span>
												<span>
													{TXT.confirmation}:{" "}
													<b>{task.confirmation_number || "-"}</b>
												</span>
											</TaskMeta>
											{task.task_comment ? <TaskComment>{task.task_comment}</TaskComment> : null}
											<TaskActions>
												{!isFinishedStatus(task.task_status) &&
												String(task.task_status || "").toLowerCase() !== "cleaning" ? (
													<StartCleaningButton
														type='button'
														onClick={() => updateTaskStatus(task, "cleaning")}
														disabled={saving}
													>
														{TXT.markCleaning}
													</StartCleaningButton>
												) : null}
												{isFinishedStatus(task.task_status) && isSuperAdmin ? (
													<Button onClick={() => updateTaskStatus(task, "unfinished")}>
														{TXT.reopen}
													</Button>
												) : null}
												{canManageHousekeeping ? (
													<Button onClick={() => openEditTask(task)}>
														{canEditHousekeepingTask(task)
															? TXT.edit
															: TXT.details || TXT.edit}
													</Button>
												) : null}
											</TaskActions>
										</TaskCard>
									))}
								</TaskGrid>
							) : (
								<EmptyState>
									<Empty description={TXT.noTasks} />
								</EmptyState>
							)}
						</Spin>
					) : null}

					{canManageHousekeeping && activeTab === "overview" && totalTasksCount > recordsPerPage ? (
						<PaginationWrap>
							<Pagination
								current={currentPage}
								pageSize={recordsPerPage}
								total={totalTasksCount}
								onChange={setCurrentPage}
								showSizeChanger={false}
							/>
						</PaginationWrap>
					) : null}
				</main>
			</div>

			<Modal
				open={!!roomCleanTarget}
				title={TXT.roomCleanTitle}
				onCancel={() => setRoomCleanTarget(null)}
				onOk={confirmRoomClean}
				okText={TXT.confirmClean}
				cancelText={TXT.cancel}
				confirmLoading={saving}
				width='min(94vw, 520px)'
				centered
				destroyOnClose
			>
				<RoomCleanConfirm>
					<RoomCleanSummary>
						<strong>{roomLabel(roomCleanTarget?.room)}</strong>
						<span>{roomTypeDisplay(roomCleanTarget?.room)}</span>
						<Tag color={statusTone(roomCleanTarget?.task?.task_status)}>
							{statusLabel(roomCleanTarget?.task?.task_status, isRTL)}
						</Tag>
					</RoomCleanSummary>
					<h4>{TXT.roomCleanQuestion}</h4>
					<p>{TXT.roomCleanChecklist}</p>
				</RoomCleanConfirm>
			</Modal>

			<Modal
				open={!!generalCleanTarget}
				title={TXT.generalCleanTitle}
				onCancel={() => setGeneralCleanTarget(null)}
				onOk={confirmGeneralClean}
				okText={TXT.confirmClean}
				cancelText={TXT.cancel}
				confirmLoading={saving}
				width='min(94vw, 520px)'
				centered
				destroyOnClose
			>
				<RoomCleanConfirm>
					<RoomCleanSummary>
						<strong>{generalAreaLabels(generalCleanTarget, isRTL)}</strong>
						<span>{TXT.generalCleaning}</span>
						<Tag color={statusTone(generalCleanTarget?.task_status)}>
							{statusLabel(generalCleanTarget?.task_status, isRTL)}
						</Tag>
					</RoomCleanSummary>
					<h4>{TXT.generalCleanQuestion}</h4>
					<p>{TXT.generalCleanChecklist}</p>
				</RoomCleanConfirm>
			</Modal>

			<Modal
				open={!!editTask}
				title={TXT.updateTask}
				onCancel={() => setEditTask(null)}
				onOk={saveEditTask}
				okText={editTaskReadOnly ? TXT.details || TXT.edit : TXT.save}
				cancelText={TXT.cancel}
				confirmLoading={saving}
				okButtonProps={{ disabled: editTaskReadOnly }}
				width='min(94vw, 720px)'
				destroyOnClose
			>
				<Form form={editForm} layout='vertical'>
					<Form.Item name='taskDate' label={TXT.taskDate} rules={[{ required: true }]}>
						<NativeDateInput
							type='date'
							min={MIN_TASK_DATE}
							max={MAX_TASK_DATE}
							disabled={editTaskReadOnly}
						/>
					</Form.Item>
					<Form.Item name='assignedTo' label={TXT.employee} rules={[{ required: true }]}>
						<Select
							showSearch
							optionFilterProp='children'
							disabled={editTaskReadOnly}
						>
							{houseKeepingStaff.map((staff) => (
								<Select.Option key={staff._id} value={staff._id}>
									{staff.name}
								</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name='task_status' label={TXT.status} rules={[{ required: true }]}>
						<Select disabled={editTaskReadOnly}>
							{statusOptionsForTask(editTask || {}).map((option) => (
								<Select.Option key={option.value} value={option.value}>
									{option.label}
								</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name='taskType' label={TXT.taskKind} rules={[{ required: true }]}>
						<Select
							disabled={editTaskReadOnly}
							onChange={(value) => {
								if (value === "room") {
									editForm.setFieldsValue({ generalAreas: [] });
								} else {
									editForm.setFieldsValue({ rooms: undefined });
								}
							}}
						>
							<Select.Option value='room'>{TXT.roomCleaning}</Select.Option>
							<Select.Option value='general'>{TXT.generalCleaning}</Select.Option>
						</Select>
					</Form.Item>
					{editTaskTypeValue === "general" ? (
						<Form.Item
							name='generalAreas'
							label={TXT.generalAreas}
							rules={[
								{
									required: true,
									message: TXT.generalAreasHint,
									type: "array",
								},
							]}
						>
							<Select
								mode='multiple'
								showSearch
								disabled={editTaskReadOnly}
								optionFilterProp='children'
								placeholder={TXT.generalAreasHint}
							>
								{GENERAL_CLEANING_AREAS.map((area) => (
									<Select.Option key={area.value} value={area.value}>
										{isRTL ? area.ar : area.en}
									</Select.Option>
								))}
							</Select>
						</Form.Item>
					) : (
						<Form.Item name='rooms' label={TXT.rooms} rules={[{ required: true }]}>
							<Select
								showSearch
								optionFilterProp='children'
								disabled={editTaskReadOnly}
							>
								{sortedHotelRooms.map((room) => (
									<Select.Option key={room._id} value={room._id}>
										{roomLabel(room)} - {roomTypeDisplay(room)} -{" "}
										{room.isCurrentlyHoused ? TXT.housed : TXT.notHoused}
									</Select.Option>
								))}
							</Select>
						</Form.Item>
					)}
					<Form.Item
						name='task_comment'
						className='full-span'
						label={editTaskTypeValue === "general" ? TXT.generalTaskDetails : TXT.comment}
						rules={[
							{
								required:
									editTaskTypeValue === "general" &&
									Array.isArray(editGeneralAreasValue) &&
									editGeneralAreasValue.includes("other"),
								message: TXT.customAreaRequiresComment,
							},
						]}
					>
						<Input.TextArea
							rows={3}
							disabled={editTaskReadOnly}
							placeholder={
								editTaskTypeValue === "general"
									? TXT.generalTaskCommentHint
									: undefined
							}
						/>
					</Form.Item>
				</Form>
				{editTaskReadOnly ? (
					<TaskLockedNotice>
						{TXT.statusLocked || "Closed tasks can only be reopened by a super admin."}
					</TaskLockedNotice>
				) : null}
			</Modal>
		</HouseKeepingMainWrapper>
	);
};

export default HouseKeepingMain;

const HouseKeepingMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 70px;
	min-height: 100vh;
	background: #f5f7fb;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.$collapsed ? "72px minmax(0, 1fr)" : "270px minmax(0, 1fr)"};
		min-height: calc(100vh - 70px);
	}

	.otherContentWrapper {
		min-width: 0;
		padding: 0.85rem 1rem 1.2rem;
		display: grid;
		gap: 0.75rem;
		align-content: start;
	}

	@media (max-width: 900px) {
		margin-top: 66px;

		.grid-container-main {
			display: block;
		}

		.navcontent {
			position: relative;
			z-index: 20;
		}

		.otherContentWrapper {
			padding: 0.55rem;
		}
	}
`;

const TopControlsBar = styled.section`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.8rem;
	padding: 0.72rem;
	border: 1px solid #cfe8ff;
	border-radius: 13px;
	background: linear-gradient(135deg, #f6fbff 0%, #ffffff 100%);

	> div {
		display: grid;
		gap: 0.12rem;
		min-width: 0;
	}

	strong {
		color: #0b5fa8;
		font-size: 0.95rem;
		font-weight: 950;
		text-transform: capitalize;
	}

	span {
		color: #5f7895;
		font-size: 0.78rem;
		font-weight: 800;
		line-height: 1.25;
	}

	@media (max-width: 720px) {
		align-items: stretch;
		flex-direction: column;
		padding: 0.65rem;
	}
`;

const LiveStatusPill = styled.div`
	display: inline-flex !important;
	align-items: center;
	gap: 0.35rem !important;
	width: fit-content;
	max-width: 100%;
	margin-top: 0.18rem;
	padding: 0.24rem 0.55rem;
	border: 1px solid #bbf7d0;
	border-radius: 999px;
	background: #ecfdf5;
	color: #047857;
	font-size: 0.72rem;
	font-weight: 900;
	line-height: 1;

	i {
		width: 0.48rem;
		height: 0.48rem;
		border-radius: 999px;
		background: #22c55e;
		box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55);
		animation: livePulse 1.6s ease-out infinite;
	}

	b {
		color: #047857;
		font-weight: 950;
	}

	small {
		color: #3f6f5d;
		font-size: 0.68rem;
		font-weight: 850;
		white-space: nowrap;
	}

	@keyframes livePulse {
		0% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55);
		}
		70% {
			box-shadow: 0 0 0 7px rgba(34, 197, 94, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
		}
	}
`;

const HeroActions = styled.div`
	display: grid;
	grid-template-columns: minmax(150px, 1fr) auto;
	gap: 0.55rem;
	align-content: center;
	min-width: min(380px, 100%);

	input,
	button {
		min-height: 42px;
	}

	@media (max-width: 460px) {
		grid-template-columns: 1fr;
	}
`;

const NativeDateInput = styled.input`
	width: 100%;
	min-height: 42px;
	padding: 0 0.8rem;
	border: 1px solid #cfe0f3;
	border-radius: 8px;
	background: #fff;
	color: #102033;
	font-weight: 850;
	outline: none;

	&:focus {
		border-color: #1677ff;
		box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12);
	}
`;

const StatsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.55rem;

	@media (max-width: 680px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const statTones = {
	blue: { bg: "#e8f4ff", border: "#91caff", color: "#0b63b6" },
	orange: { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" },
	purple: { bg: "#f0e8ff", border: "#cbb7ff", color: "#5b21b6" },
	green: { bg: "#e9fbeF", border: "#86efac", color: "#08763d" },
};

const StatCard = styled.div`
	${(props) => {
		const tone = statTones[props.$tone] || statTones.blue;
		return css`
			background: ${tone.bg};
			border-color: ${tone.border};
			color: ${tone.color};
		`;
	}}
	${(props) =>
		props.$attention &&
		css`
			animation: housekeepingBeat 1.25s ease-in-out infinite;
			background: linear-gradient(135deg, #fff1f2, #f7edff);
			border-color: #fca5a5;
		`}
	border: 1px solid;
	border-radius: 11px;
	min-height: 72px;
	padding: 0.55rem;
	display: grid;
	justify-items: center;
	align-content: center;
	gap: 0.2rem;
	text-align: center;

	svg {
		font-size: 1.15rem;
	}

	strong {
		color: #0f172a;
		font-size: 1.1rem;
		line-height: 1;
	}

	span {
		color: #475569;
		font-weight: 900;
		font-size: 0.8rem;
	}

	@keyframes housekeepingBeat {
		0%,
		100% {
			transform: scale(1);
			box-shadow: 0 0 0 rgba(248, 113, 113, 0);
		}
		45% {
			transform: scale(1.025);
			box-shadow: 0 10px 24px rgba(248, 113, 113, 0.2);
		}
	}
`;

const TabsBar = styled.div`
	display: grid;
	grid-template-columns: repeat(${(props) => props.$count || 3}, minmax(104px, 1fr));
	gap: 0.35rem;
	padding: 0.35rem;
	border: 1px solid #cfe8ff;
	border-radius: 13px;
	background: linear-gradient(135deg, #eef8ff, #f8fcff);
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);

	@media (max-width: 580px) {
		grid-template-columns: repeat(${(props) => props.$count || 3}, minmax(94px, 1fr));
		overflow-x: auto;
		scrollbar-width: thin;
	}
`;

const TabButton = styled.button`
	min-height: 40px;
	border: 1px solid ${(props) => (props.$active ? "#1677ff" : "#d7e8fb")};
	border-radius: 9px;
	background: ${(props) =>
		props.$active ? "linear-gradient(135deg, #1677ff, #0d6ec8)" : "#fff"};
	color: ${(props) => (props.$active ? "#fff" : "#17324d")};
	font-weight: 950;
	font-size: 0.88rem;
	box-shadow: ${(props) =>
		props.$active ? "0 10px 20px rgba(22, 119, 255, 0.16)" : "none"};
	white-space: nowrap;
`;

const AssignmentPanel = styled.section`
	padding: 1rem;
	border: 1px solid #cfe8ff;
	border-radius: 14px;
	background: #fff;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);

	.ant-form {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem 0.9rem;
	}

	.ant-form-item {
		margin-bottom: 0;
	}

	.full-span {
		grid-column: 1 / -1;
	}

	.ant-form-item:last-child,
	button[type="submit"] {
		grid-column: 1 / -1;
		justify-self: end;
		min-width: 180px;
		min-height: 42px;
		font-weight: 900;
	}

	@media (max-width: 700px) {
		padding: 0.8rem;

		.ant-form {
			grid-template-columns: 1fr;
		}

		button[type="submit"] {
			width: 100%;
		}
	}
`;

const ReportsPanel = styled(AssignmentPanel)`
	display: grid;
	gap: 0.8rem;

	.ant-spin-nested-loading,
	.ant-spin-container {
		min-width: 0;
	}
`;

const SuppliesPanel = styled.section`
	display: grid;
	gap: 0.85rem;
	padding: 1rem;
	border: 1px solid #cfe8ff;
	border-radius: 14px;
	background: linear-gradient(135deg, #f8fcff, #ffffff);
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);

	.ant-spin-container {
		display: grid;
		gap: 0.85rem;
	}

	@media (max-width: 700px) {
		padding: 0.75rem;
	}
`;

const SupplySummaryGrid = styled(StatsGrid)`
	grid-template-columns: repeat(4, minmax(0, 1fr));

	@media (max-width: 720px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const SupplyFormsGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(280px, 0.85fr) minmax(320px, 1.15fr);
	gap: 0.8rem;

	@media (max-width: 980px) {
		grid-template-columns: 1fr;
	}
`;

const SupplyFormCard = styled.div`
	padding: 0.8rem;
	border: 1px solid #d8ecff;
	border-radius: 12px;
	background: #fff;

	h3 {
		margin: 0 0 0.65rem;
		color: #102033;
		font-size: 0.98rem;
		font-weight: 950;
	}

	.ant-form {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.55rem 0.65rem;
	}

	.ant-form-item {
		margin-bottom: 0;
	}

	.ant-form-item-label > label {
		color: #334155;
		font-size: 0.76rem;
		font-weight: 900;
	}

	.ant-input,
	.ant-select-selector {
		border-color: #c9ddf2 !important;
		border-radius: 8px !important;
	}

	button[type="submit"] {
		grid-column: 1 / -1;
		justify-self: end;
		min-width: 180px;
		font-weight: 900;
	}

	@media (max-width: 640px) {
		.ant-form {
			grid-template-columns: 1fr;
		}

		button[type="submit"] {
			width: 100%;
		}
	}
`;

const FinanceNotice = styled.div`
	margin: -0.2rem 0 0.6rem;
	padding: 0.5rem 0.65rem;
	border: 1px solid #ffd591;
	border-radius: 10px;
	background: #fff7e6;
	color: #7c4a03;
	font-weight: 900;
	font-size: 0.78rem;
`;

const SupplyRequestList = styled.div`
	grid-column: 1 / -1;
	display: grid;
	gap: 0.55rem;

	> button {
		justify-self: start;
		border-radius: 9px;
		font-weight: 900;
	}
`;

const SupplyRequestLine = styled.div`
	display: grid;
	grid-template-columns: 1.45fr 0.65fr 0.75fr 0.85fr auto;
	gap: 0.45rem;
	align-items: end;
	padding: 0.5rem;
	border: 1px solid #e0eefc;
	border-radius: 10px;
	background: #f8fbff;

	.ant-form-item {
		margin-bottom: 0;
	}

	> button {
		min-width: 34px;
		border-radius: 8px;
	}

	@media (max-width: 760px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));

		> button {
			width: 100%;
		}
	}
`;

const InlineTotal = styled.div`
	grid-column: 1 / -1;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.7rem;
	padding: 0.55rem 0.7rem;
	border: 1px solid #bfdbfe;
	border-radius: 10px;
	background: #eff6ff;
	color: #17324d;
	font-weight: 950;

	strong {
		color: #0b6bcb;
	}
`;

const SupplyDataGrid = styled.div`
	display: grid;
	grid-template-columns: minmax(300px, 0.9fr) minmax(360px, 1.1fr);
	gap: 0.8rem;

	@media (max-width: 980px) {
		grid-template-columns: 1fr;
	}
`;

const SupplyListCard = styled.div`
	min-width: 0;
	padding: 0.8rem;
	border: 1px solid #d8ecff;
	border-radius: 12px;
	background: #fff;

	h3 {
		margin: 0 0 0.65rem;
		color: #102033;
		font-size: 0.98rem;
		font-weight: 950;
	}
`;

const SupplyRequestCards = styled.div`
	display: grid;
	gap: 0.65rem;
`;

const SupplyRequestCard = styled.article`
	display: grid;
	gap: 0.55rem;
	padding: 0.7rem;
	border: 1px solid #d8ecff;
	border-inline-start: 4px solid #1677ff;
	border-radius: 12px;
	background: #f8fbff;
`;

const SupplyRequestHead = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.7rem;

	div {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}

	strong {
		color: #0f172a;
		font-size: 1rem;
		font-weight: 950;
	}

	span {
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 900;
	}
`;

const SupplyItemChips = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem;

	span {
		padding: 0.35rem 0.55rem;
		border: 1px solid #cfe8ff;
		border-radius: 999px;
		background: #fff;
		color: #17324d;
		font-size: 0.78rem;
		font-weight: 900;
	}
`;

const SupplyRequestMeta = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.4rem;

	span {
		padding: 0.45rem;
		border-radius: 8px;
		background: #fff;
		color: #64748b;
		font-size: 0.76rem;
		font-weight: 900;
		text-align: center;
	}

	b {
		display: block;
		color: #102033;
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;
	}
`;

const SupplyActions = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.45rem;
	justify-content: flex-end;

	button {
		border-radius: 9px;
		font-weight: 900;
	}
`;

const ReportFilters = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(150px, 1fr)) auto;
	gap: 0.6rem;
	align-items: end;

	label {
		display: grid;
		gap: 0.25rem;
		min-width: 0;
	}

	label > span {
		color: #334155;
		font-size: 0.78rem;
		font-weight: 900;
	}

	.ant-select,
	button {
		min-height: 42px;
	}

	button {
		font-weight: 900;
		border-radius: 9px;
	}

	@media (max-width: 900px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));

		button {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
	}
`;

const ReportSummaryGrid = styled(StatsGrid)`
	grid-template-columns: repeat(3, minmax(0, 1fr));

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
	}
`;

const ReportTableWrap = styled.div`
	width: 100%;
	overflow-x: auto;
	border: 1px solid #d9ecff;
	border-radius: 12px;
	background: #fff;

	table {
		width: 100%;
		min-width: 880px;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.55rem 0.65rem;
		border-bottom: 1px solid #e7eff8;
		text-align: center;
		vertical-align: middle;
		font-size: 0.82rem;
	}

	th {
		background: #eaf6ff;
		color: #17324d;
		font-weight: 950;
		white-space: nowrap;
	}

	td {
		color: #102033;
		font-weight: 800;
	}

	tbody tr:hover {
		background: #f8fbff;
	}
`;

const TaskLockedNotice = styled.div`
	margin-top: 0.75rem;
	padding: 0.6rem 0.75rem;
	border: 1px solid #fde68a;
	border-radius: 9px;
	background: #fffbeb;
	color: #92400e;
	font-size: 0.8rem;
	font-weight: 900;
`;

const PanelTitle = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	margin-bottom: 0.8rem;

	strong {
		color: #102033;
		font-size: 1.05rem;
	}

	span {
		color: #64748b;
		font-weight: 800;
	}

	@media (max-width: 580px) {
		align-items: flex-start;
		flex-direction: column;
	}
`;

const FiltersRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.7rem;
	padding: 0.75rem;
	border: 1px solid #d9ecff;
	border-radius: 12px;
	background: #fff;

	.ant-select {
		min-width: 190px;
	}

	@media (max-width: 620px) {
		align-items: stretch;
		flex-direction: column;

		.ant-select {
			width: 100%;
		}
	}
`;

const PriorityTaskPanel = styled.section`
	display: grid;
	gap: 0.55rem;
	padding: 0.65rem;
	border: 1px solid #bfdbfe;
	border-radius: 14px;
	background: linear-gradient(135deg, #eff6ff, #ffffff);
	box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);

	> article {
		max-width: 520px;
	}

	@media (max-width: 620px) {
		padding: 0.5rem;

		> article {
			max-width: none;
		}
	}
`;

const PriorityTaskTitle = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.65rem;

	strong {
		color: #0f3f74;
		font-size: 0.98rem;
		font-weight: 950;
	}

	span {
		color: #476682;
		font-size: 0.78rem;
		font-weight: 850;
	}

	@media (max-width: 520px) {
		align-items: flex-start;
		flex-direction: column;
	}
`;

const TaskGrid = styled.section`
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 440px));
	gap: 0.85rem;
	justify-content: start;

	@media (max-width: 430px) {
		grid-template-columns: 1fr;
	}
`;

const TaskCard = styled.article`
	display: grid;
	gap: 0.55rem;
	padding: 0.75rem;
	border: 1px solid #dce8f6;
	border-top: 5px solid
		${(props) =>
			props.$status === "green"
				? "#16a34a"
				: props.$status === "blue"
				? "#1677ff"
				: "#f59e0b"};
	border-radius: 14px;
	background: #fff;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
	${(props) =>
		props.$priority &&
		css`
			border-color: #93c5fd;
			background: linear-gradient(135deg, #ffffff, #f8fbff);
			box-shadow: 0 14px 30px rgba(14, 116, 144, 0.14);
		`}
`;

const TaskHeader = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 0.65rem;

	div {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}

	strong {
		color: #102033;
		font-size: 1.08rem;
		font-weight: 950;
	}

	span {
		color: #64748b;
		font-weight: 800;
		font-size: 0.82rem;
	}
`;

const CompletionBadge = styled.div`
	justify-self: start;
	width: fit-content;
	max-width: 100%;
	padding: 0.34rem 0.72rem;
	border-radius: 999px;
	border: 1px solid ${(props) => (props.$manager ? "#bfdbfe" : "#bbf7d0")};
	background: ${(props) =>
		props.$manager
			? "linear-gradient(135deg, #eff6ff, #ffffff)"
			: "linear-gradient(135deg, #ecfdf5, #ffffff)"};
	color: ${(props) => (props.$manager ? "#1d4ed8" : "#047857")};
	font-size: 0.76rem;
	font-weight: 950;
	box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
`;

const AssignedEmployeePill = styled.div`
	justify-self: start;
	width: fit-content;
	max-width: 100%;
	padding: 0.32rem 0.68rem;
	border: 1px solid #cfe8ff;
	border-radius: 999px;
	background: #f5fbff;
	color: #24537a;
	font-size: 0.76rem;
	font-weight: 850;

	b {
		color: #102033;
		font-weight: 950;
	}
`;

const RoomList = styled.div`
	display: none;
	flex-wrap: wrap;
	gap: 0.35rem;

	span {
		padding: 0.3rem 0.5rem;
		border: 1px solid #cfe8ff;
		border-radius: 999px;
		background: #f5faff;
		color: #17324d;
		font-size: 0.78rem;
		font-weight: 850;
	}
`;

const RoomActionHint = styled.div`
	padding: 0.48rem 0.6rem;
	border-radius: 10px;
	background: #eef8ff;
	color: #24537a;
	font-size: 0.8rem;
	font-weight: 900;
	text-align: center;
`;

const GeneralTaskBox = styled.div`
	display: grid;
	gap: 0.35rem;
	padding: 0.72rem;
	border: 1px solid #cfe8ff;
	border-radius: 13px;
	background: linear-gradient(135deg, #f8fbff, #ffffff);
	text-align: center;

	strong {
		color: #0f172a;
		font-size: 0.98rem;
		font-weight: 950;
		line-height: 1.35;
	}

	span {
		color: #475569;
		font-size: 0.8rem;
		font-weight: 850;
		line-height: 1.35;
	}
`;

const RoomActionGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
	gap: 0.45rem;

	@media (max-width: 430px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 330px) {
		grid-template-columns: 1fr;
	}
`;

const RoomActionButton = styled.button`
	min-width: 0;
	min-height: 78px;
	padding: 0.55rem;
	border: 1px solid
		${(props) => (props.$clean ? "#86efac" : props.$tone === "blue" ? "#93c5fd" : "#f8c87d")};
	border-radius: 13px;
	background: ${(props) =>
		props.$clean
			? "linear-gradient(135deg, #ecfdf5, #ffffff)"
			: "linear-gradient(135deg, #ffffff, #f8fbff)"};
	color: #102033;
	display: grid;
	align-content: center;
	justify-items: center;
	gap: 0.2rem;
	text-align: center;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
	cursor: pointer;
	${(props) =>
		props.$attention &&
		css`
			animation: roomCleaningBeat 1.15s ease-in-out infinite;
			border-color: #fca5a5;
			background: linear-gradient(135deg, #fff1f2, #ffffff 54%, #fff7ed);
		`}

	strong {
		font-size: 1rem;
		font-weight: 950;
		line-height: 1;
		color: ${(props) => (props.$clean ? "#08763d" : "#0f172a")};
	}

	span {
		width: 100%;
		color: #334155;
		font-size: 0.74rem;
		font-weight: 850;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	small {
		color: ${(props) =>
			props.$clean ? "#07823f" : props.$attention ? "#dc2626" : "#b45309"};
		font-size: 0.72rem;
		font-weight: 950;
	}

	&:disabled {
		cursor: default;
		opacity: 0.9;
	}

	&:not(:disabled):hover {
		border-color: #1677ff;
		transform: translateY(-1px);
	}

	@keyframes roomCleaningBeat {
		0%,
		100% {
			transform: scale(1);
			box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
		}
		45% {
			transform: scale(1.035);
			box-shadow: 0 12px 26px rgba(248, 113, 113, 0.22);
		}
	}
`;

const RoomHousedFlag = styled.em`
	margin-top: 0.1rem;
	padding: 0.12rem 0.45rem;
	border-radius: 999px;
	background: ${(props) => (props.$housed ? "#fff1f2" : "#ecfdf5")};
	border: 1px solid ${(props) => (props.$housed ? "#fecdd3" : "#bbf7d0")};
	color: ${(props) => (props.$housed ? "#be123c" : "#047857")};
	font-size: 0.66rem;
	font-weight: 950;
	font-style: normal;
	line-height: 1.25;
	white-space: nowrap;
`;

const TaskMeta = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.42rem;

	span {
		min-width: 0;
		padding: 0.48rem;
		border-radius: 9px;
		background: #f8fbff;
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 800;
	}

	b {
		display: block;
		margin-top: 0.12rem;
		color: #102033;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 440px) {
		grid-template-columns: 1fr;
	}
`;

const TaskComment = styled.p`
	margin: 0;
	padding: 0.55rem;
	border-radius: 10px;
	background: #fff7ed;
	color: #7c2d12;
	font-weight: 800;
	line-height: 1.35;
`;

const TaskActions = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: 0.45rem;

	button {
		min-height: 40px;
		font-weight: 900;
		border-radius: 9px;
	}
`;

const StartCleaningButton = styled.button`
	position: relative;
	min-height: 44px;
	padding: 0.62rem 1rem;
	border: 0;
	border-radius: 10px;
	background: linear-gradient(135deg, #0f172a 0%, #123d68 52%, #0b5fa8 100%);
	color: #fff;
	font-weight: 950;
	letter-spacing: 0;
	box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2),
		inset 0 1px 0 rgba(255, 255, 255, 0.18);
	cursor: pointer;
	transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;

	&::after {
		content: "";
		position: absolute;
		inset: 3px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		pointer-events: none;
	}

	&:hover,
	&:focus-visible {
		filter: brightness(1.08);
		transform: translateY(-1px);
		box-shadow: 0 14px 28px rgba(15, 23, 42, 0.26),
			0 0 0 3px rgba(22, 119, 255, 0.14);
		outline: none;
	}

	&:active {
		transform: translateY(0);
		box-shadow: 0 8px 16px rgba(15, 23, 42, 0.18);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.62;
		filter: grayscale(0.25);
		transform: none;
		box-shadow: none;
	}
`;

const EmptyState = styled.div`
	padding: 1.5rem;
	border: 1px dashed #b8dcff;
	border-radius: 14px;
	background: #fff;
`;

const PaginationWrap = styled.div`
	display: flex;
	justify-content: center;
	padding: 0.5rem;
`;

const RoomCleanConfirm = styled.div`
	display: grid;
	gap: 0.85rem;

	h4 {
		margin: 0;
		color: #102033;
		font-size: 1.05rem;
		font-weight: 950;
		text-align: center;
	}

	p {
		margin: 0;
		padding: 0.8rem;
		border: 1px solid #cfe8ff;
		border-radius: 12px;
		background: #f5fbff;
		color: #334155;
		font-weight: 850;
		line-height: 1.55;
		text-align: center;
	}
`;

const RoomCleanSummary = styled.div`
	display: grid;
	justify-items: center;
	gap: 0.35rem;
	padding: 0.9rem;
	border-radius: 14px;
	background: linear-gradient(135deg, #ecfdf5, #f8fbff);
	border: 1px solid #a7f3d0;

	strong {
		color: #08763d;
		font-size: 2rem;
		font-weight: 950;
		line-height: 1;
	}

	span {
		max-width: 100%;
		color: #0f172a;
		font-weight: 900;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;
