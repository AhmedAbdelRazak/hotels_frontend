import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import {
	Button,
	Empty,
	Form,
	Input,
	message,
	Modal,
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
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import {
	createNewHouseKeepingTask,
	getHotelRooms,
	getHouseKeepingStaff,
	getOverallHousekeeping,
	updatingHouseKeepingTask,
} from "../../apiAdmin";
import { isAuthenticated } from "../../../auth";
import { isSuperAdminUser } from "../../../AdminModule/utils/superUsers";
import {
	buildOwnerParams,
	formatDate,
	formatDateTime,
	getOverallText,
	localizeStatus,
	normalizeId,
	OVERALL_PAGE_SIZE,
	OverallCard,
	OverallCards,
	OverallPageShell,
	OverallTableWrap,
	Pager,
	pageRowNumber,
	singleHotelRoute,
	StatusPill,
	statusTone,
	titleCase,
} from "../overallShared";

const HOUSEKEEPING_TEXT = {
	en: {
		title: "Housekeeping",
		subtitle: "Assign rooms, track cleaning, and review reports across hotels.",
		overview: "Tasks",
		assign: "Assign rooms",
		reports: "Reports",
		activeTasks: "Active tasks",
		selectedDate: "Selected date",
		dateHint: "Pick the work day",
		taskUpdated: "Task updated.",
		taskUpdateFailed: "Could not update task.",
		statusAction: "Update Status",
		taskKind: "Task kind",
		roomCleaning: "Room cleaning",
		generalCleaning: "General cleaning",
		generalAreas: "Cleaning areas",
		generalAreasHint: "Choose one or more hotel areas.",
		generalTaskDetails: "Task details",
		generalTaskCommentHint:
			"Add details when the task is custom or needs special instructions.",
		customAreaRequiresComment: "Please add a comment for custom cleaning work.",
		createTask: "Create task",
		creating: "Creating...",
		employee: "Employee",
		comment: "Comment",
		noStaff: "Create housekeeping staff first, then assign rooms.",
		noRooms: "No rooms are available for this hotel.",
		chooseHotel: "Choose hotel",
		hotelRequired: "Please choose the hotel first.",
		loadingHotelResources: "Loading hotel rooms and staff...",
		taskCreated: "Housekeeping task created.",
		taskCreateFailed: "Could not create housekeeping task.",
		reportHint: "Review cleaning productivity by date range and hotel.",
		fromDate: "From",
		toDate: "To",
		loadReport: "Show report",
		duration: "Duration",
		startedAt: "Started",
		completedAt: "Completed",
		minutes: "min",
		averageDuration: "Average duration",
		noReportRows: "No report rows for this range.",
		statusChanged: "Status",
		allHotelsReport: "All hotels",
		details: "Details",
		taskDetails: "Task details",
		saveDetails: "Save details",
		detailsSaved: "Task details saved.",
		statusLocked: "Closed tasks can only be reopened by a super admin.",
	},
	ar: {
		title: "تدبير الغرف",
		subtitle: "تكليف الغرف ومتابعة التنظيف ومراجعة التقارير عبر الفنادق.",
		overview: "المهام",
		assign: "تكليف الغرف",
		reports: "التقارير",
		activeTasks: "المهام النشطة",
		selectedDate: "التاريخ المحدد",
		dateHint: "اختر يوم العمل",
		taskUpdated: "تم تحديث المهمة.",
		taskUpdateFailed: "تعذر تحديث المهمة.",
		statusAction: "تحديث الحالة",
		taskKind: "نوع المهمة",
		roomCleaning: "تنظيف غرفة",
		generalCleaning: "تنظيف عام",
		generalAreas: "مناطق التنظيف",
		generalAreasHint: "اختر منطقة أو أكثر داخل الفندق.",
		generalTaskDetails: "تفاصيل المهمة",
		generalTaskCommentHint:
			"اكتب التفاصيل عندما تكون المهمة مخصصة أو تحتاج تعليمات خاصة.",
		customAreaRequiresComment: "يرجى كتابة ملاحظة عند اختيار مهمة مخصصة.",
		createTask: "إنشاء مهمة",
		creating: "جاري الإنشاء...",
		employee: "الموظف",
		comment: "ملاحظة",
		noStaff: "أنشئ موظفي النظافة أولاً ثم قم بتكليف الغرف.",
		noRooms: "لا توجد غرف متاحة لهذا الفندق.",
		chooseHotel: "اختر الفندق",
		hotelRequired: "يرجى اختيار الفندق أولاً.",
		loadingHotelResources: "جاري تحميل غرف الفندق والموظفين...",
		taskCreated: "تم إنشاء مهمة النظافة.",
		taskCreateFailed: "تعذر إنشاء مهمة النظافة.",
		reportHint: "متابعة إنتاجية التنظيف حسب الفترة والفندق.",
		fromDate: "من",
		toDate: "إلى",
		loadReport: "عرض التقرير",
		duration: "مدة التنظيف",
		startedAt: "بدأت",
		completedAt: "انتهت",
		minutes: "دقيقة",
		averageDuration: "متوسط المدة",
		noReportRows: "لا توجد بيانات في هذه الفترة.",
		statusChanged: "الحالة",
		allHotelsReport: "كل الفنادق",
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

const MIN_TASK_DATE = "2020-01-01";
const MAX_TASK_DATE = moment().add(2, "years").format("YYYY-MM-DD");

const tabFromSearch = (search = "") => {
	const params = new URLSearchParams(search);
	const tab = params.get("tab");
	if (["overview", "assign", "reports"].includes(tab)) return tab;
	if (params.has("createNewTask")) return "assign";
	if (params.has("reports")) return "reports";
	return "overview";
};

const roomList = (task = {}) =>
	Array.isArray(task.roomDetails)
		? task.roomDetails
		: Array.isArray(task.rooms)
		  ? task.rooms
		  : [];

const roomText = (rooms = []) =>
	(Array.isArray(rooms) ? rooms : [])
		.map((room) => room.room_number || room.roomNumber || room.displayName)
		.filter(Boolean)
		.join(", ") || "-";

const roomLabel = (room = {}) =>
	room.room_number || room.roomNumber || room.displayName || "-";

const roomTypeDisplay = (room = {}) =>
	room.room_type || room.roomType || room.type || room.roomTypeName || "-";

const isFinishedStatus = (status = "") =>
	["finished", "done", "completed", "clean"].includes(
		String(status || "").toLowerCase()
	);

const editableStatusValue = (status = "") => {
	const normalized = String(status || "").toLowerCase();
	if (isFinishedStatus(normalized)) return "finished";
	if (normalized === "cleaning") return "cleaning";
	return "unfinished";
};

const taskStatusPriority = (status = "") => {
	const normalized = String(status || "").toLowerCase();
	if (normalized === "cleaning") return 0;
	if (isFinishedStatus(normalized)) return 2;
	return 1;
};

const numericValue = (value, fallback = Number.NEGATIVE_INFINITY) => {
	const directNumber = Number(value);
	if (Number.isFinite(directNumber)) return directNumber;
	const match = String(value || "").match(/\d+/);
	return match ? Number(match[0]) : fallback;
};

const sortRoomsForHousekeeping = (rooms = []) =>
	(Array.isArray(rooms) ? [...rooms] : []).sort((a, b) => {
		const aFloor = numericValue(a.floor);
		const bFloor = numericValue(b.floor);
		const floorDiff = bFloor - aFloor;
		if (floorDiff) return floorDiff;
		return numericValue(roomLabel(b)) - numericValue(roomLabel(a));
	});

const sortTasksForHousekeeping = (tasks = []) =>
	(Array.isArray(tasks) ? tasks : [])
		.map((task) => ({
			...task,
			roomDetails: sortRoomsForHousekeeping(roomList(task)),
		}))
		.sort((a, b) => {
			const statusDiff =
				taskStatusPriority(a.task_status) - taskStatusPriority(b.task_status);
			if (statusDiff) return statusDiff;
			return (
				new Date(b.taskDate || b.createdAt || 0).getTime() -
				new Date(a.taskDate || a.createdAt || 0).getTime()
			);
		});

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

const getGeneralAreaLabel = (value, isRTL) => {
	const area = GENERAL_CLEANING_AREAS.find(
		(item) => item.value === String(value || "").toLowerCase()
	);
	return area ? area[isRTL ? "ar" : "en"] : String(value || "");
};

const isGeneralTask = (task = {}) =>
	String(task.taskType || "").toLowerCase() === "general" ||
	(!roomList(task).length && Array.isArray(task.generalAreas));

const generalAreaLabels = (task = {}, isRTL = false) => {
	const areas = Array.isArray(task.generalAreas) ? task.generalAreas : [];
	const labels = areas.map((area) => getGeneralAreaLabel(area, isRTL)).filter(Boolean);
	if (task.customTask) labels.push(task.customTask);
	return labels.length ? labels.join(", ") : task.task_comment || "-";
};

const taskMainLabel = (task = {}, isRTL = false) =>
	isGeneralTask(task) ? generalAreaLabels(task, isRTL) : roomText(roomList(task));

const taskTypeLabel = (task = {}, labels = {}) =>
	isGeneralTask(task) ? labels.generalCleaning : labels.roomCleaning;

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

const formatDuration = (durationMs = 0, fallbackText = "min") => {
	const totalMinutes = Math.max(0, Math.round(Number(durationMs || 0) / 60000));
	if (!totalMinutes) return `0 ${fallbackText}`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (!hours) return `${minutes} ${fallbackText}`;
	return `${hours}h ${minutes}m`;
};

const mergeUpdatedTask = (task = {}, updated = {}) => {
	const hotel =
		updated.hotelId && typeof updated.hotelId === "object" ? updated.hotelId : null;
	const assignedTo =
		updated.assignedTo && typeof updated.assignedTo === "object"
			? updated.assignedTo
			: null;
	const cleanedBy =
		updated.cleanedBy && typeof updated.cleanedBy === "object"
			? updated.cleanedBy
			: null;

	return {
		...task,
		...updated,
		hotelName: hotel?.hotelName || task.hotelName,
		hotelOwnerId: hotel?.belongsTo || task.hotelOwnerId,
		roomDetails: Array.isArray(updated.rooms) ? updated.rooms : task.roomDetails,
		assignedToName: assignedTo?.name || task.assignedToName,
		cleanedByName: cleanedBy?.name || (updated.cleanedBy ? task.cleanedByName : ""),
	};
};

const userRoles = (user = {}) => [
	...new Set(
		[user.role, ...(Array.isArray(user.roles) ? user.roles : [])]
			.map(Number)
			.filter(Boolean)
	),
];

const userRoleDescriptions = (user = {}) => [
	String(user.roleDescription || "").toLowerCase(),
	...(Array.isArray(user.roleDescriptions)
		? user.roleDescriptions.map((item) => String(item || "").toLowerCase())
		: []),
];

const userCanManageHousekeeping = (user = {}) => {
	const roles = userRoles(user);
	const descriptions = userRoleDescriptions(user);
	return (
		isSuperAdminUser(user) ||
		roles.some((role) => [1000, 2000, 4000, 10000].includes(role)) ||
		descriptions.some((role) =>
			["hotelmanager", "housekeepingmanager", "systemadmin"].includes(role)
		)
	);
};

const OverallHouseKeeping = ({ userId, token, ownerId, chosenLanguage }) => {
	const isRTL = chosenLanguage === "Arabic";
	const common = getOverallText(chosenLanguage);
	const labels = { ...common, ...HOUSEKEEPING_TEXT[isRTL ? "ar" : "en"] };
	const history = useHistory();
	const location = useLocation();
	const auth = isAuthenticated();
	const currentUser = auth?.user || {};
	const canManageHousekeeping = userCanManageHousekeeping(currentUser);
	const [activeTab, setActiveTab] = useState(() => tabFromSearch(location.search));
	const [filters, setFilters] = useState({ search: "", hotelId: "" });
	const [statusFilter, setStatusFilter] = useState("open");
	const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState({
		tasks: [],
		stats: [],
		hotels: [],
		total: 0,
	});
	const [updatingTaskId, setUpdatingTaskId] = useState("");
	const [assignHotelId, setAssignHotelId] = useState("");
	const [hotelRooms, setHotelRooms] = useState([]);
	const [houseKeepingStaff, setHouseKeepingStaff] = useState([]);
	const [hotelResourcesLoading, setHotelResourcesLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [reportFilters, setReportFilters] = useState({
		hotelId: "",
		dateFrom: moment().startOf("month").format("YYYY-MM-DD"),
		dateTo: moment().format("YYYY-MM-DD"),
		status: "all",
	});
	const [reportTasks, setReportTasks] = useState([]);
	const [reportLoading, setReportLoading] = useState(false);
	const [detailsTask, setDetailsTask] = useState(null);
	const [detailsStaff, setDetailsStaff] = useState([]);
	const [detailsStaffLoading, setDetailsStaffLoading] = useState(false);
	const [detailsSaving, setDetailsSaving] = useState(false);
	const [form] = Form.useForm();
	const [detailsForm] = Form.useForm();
	const taskTypeValue = Form.useWatch("taskType", form) || "room";
	const generalAreasValue = Form.useWatch("generalAreas", form) || [];

	useEffect(() => {
		const nextTab = tabFromSearch(location.search);
		if (nextTab !== activeTab) setActiveTab(nextTab);
	}, [activeTab, location.search]);

	useEffect(() => {
		if (!canManageHousekeeping && activeTab === "assign") {
			setActiveTab("overview");
		}
	}, [activeTab, canManageHousekeeping]);

	const params = useMemo(
		() => ({
			...buildOwnerParams(ownerId),
			search: filters.search,
			hotelId: filters.hotelId,
			status: statusFilter,
			dateFrom: selectedDate,
			dateTo: selectedDate,
			page,
			limit: OVERALL_PAGE_SIZE,
		}),
		[filters.hotelId, filters.search, ownerId, page, selectedDate, statusFilter]
	);

	const loadHousekeeping = useCallback(() => {
		if (!userId || !token) return;
		setLoading(true);
		getOverallHousekeeping(userId, token, params)
			.then((data) => {
				setResult(
					data && !data.error
						? data
						: { tasks: [], stats: [], hotels: [], total: 0 }
				);
			})
			.finally(() => setLoading(false));
	}, [params, token, userId]);

	useEffect(() => {
		loadHousekeeping();
	}, [loadHousekeeping]);

	const tasks = useMemo(
		() => sortTasksForHousekeeping(Array.isArray(result.tasks) ? result.tasks : []),
		[result.tasks]
	);
	const pages = Math.max(Number(result.pages || 1), 1);
	const hotelsFromResult = Array.isArray(result.hotels) ? result.hotels : [];
	const hotelsFromTasks = [
		...new Map(
			tasks
				.map((task) => [
					normalizeId(task.hotelId),
					{
						_id: normalizeId(task.hotelId),
						hotelName: task.hotelName,
						ownerId: task.hotelOwnerId,
					},
				])
				.filter(([id]) => id)
		).values(),
	];
	const hotels = hotelsFromResult.length ? hotelsFromResult : hotelsFromTasks;
	const selectedAssignHotel = hotels.find(
		(hotel) => normalizeId(hotel._id) === normalizeId(assignHotelId)
	);
	const assignOwnerId = selectedAssignHotel?.ownerId || ownerId;
	const sortedHotelRooms = useMemo(
		() => sortRoomsForHousekeeping(hotelRooms),
		[hotelRooms]
	);
	const reportRows = useMemo(() => sortTasksForHousekeeping(reportTasks), [reportTasks]);
	const overviewStats = useMemo(() => {
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
		const completedDurations = reportRows
			.map(getTaskDurationMs)
			.filter((duration) => duration > 0);
		const averageDuration = completedDurations.length
			? completedDurations.reduce((sum, duration) => sum + duration, 0) /
			  completedDurations.length
			: 0;
		return {
			total: reportRows.length,
			completed: reportRows.filter((task) => isFinishedStatus(task.task_status))
				.length,
			averageDuration,
		};
	}, [reportRows]);

	const statusOptions = [
		{ value: "open", label: labels.activeTasks },
		{ value: "unfinished", label: labels.unfinished },
		{ value: "cleaning", label: labels.cleaning },
		{ value: "finished", label: labels.finished },
	];
	const editableStatusOptions = [
		{ value: "unfinished", label: labels.unfinished },
		{ value: "cleaning", label: labels.cleaning },
		{ value: "finished", label: labels.finished },
	];
	const isSuperAdmin = isSuperAdminUser(currentUser);
	const statusRank = (status = "") => {
		const normalized = editableStatusValue(status);
		if (normalized === "finished") return 2;
		if (normalized === "cleaning") return 1;
		return 0;
	};
	const statusOptionsForTask = (task = {}) => {
		if (isSuperAdmin) return editableStatusOptions;
		const currentRank = statusRank(task.task_status);
		return editableStatusOptions.filter(
			(option) => statusRank(option.value) >= currentRank
		);
	};
	const canEditTaskDetails = (task = {}) =>
		canManageHousekeeping &&
		(!isFinishedStatus(task.task_status) || isSuperAdmin);

	useEffect(() => {
		if (!hotels.length || assignHotelId) return;
		const nextHotelId = filters.hotelId || normalizeId(hotels[0]._id);
		setAssignHotelId(nextHotelId);
		form.setFieldsValue({ hotelId: nextHotelId });
	}, [assignHotelId, filters.hotelId, form, hotels]);

	useEffect(() => {
		if (!assignHotelId) {
			setHotelRooms([]);
			setHouseKeepingStaff([]);
			return;
		}
		setHotelResourcesLoading(true);
		Promise.all([
			getHotelRooms(assignHotelId, assignOwnerId),
			getHouseKeepingStaff(assignHotelId),
		])
			.then(([rooms, staff]) => {
				setHotelRooms(Array.isArray(rooms) ? rooms : []);
				setHouseKeepingStaff(Array.isArray(staff) ? staff : []);
			})
			.finally(() => setHotelResourcesLoading(false));
	}, [assignHotelId, assignOwnerId]);

	useEffect(() => {
		form.setFieldsValue({
			taskDate: selectedDate,
			taskType: form.getFieldValue("taskType") || "room",
		});
	}, [form, selectedDate]);

	const loadReportTasks = useCallback(() => {
		if (!userId || !token) return;
		setReportLoading(true);
		getOverallHousekeeping(userId, token, {
			...buildOwnerParams(ownerId),
			hotelId: reportFilters.hotelId,
			status: reportFilters.status === "all" ? "" : reportFilters.status,
			dateFrom: reportFilters.dateFrom,
			dateTo: reportFilters.dateTo,
			page: 1,
			limit: 500,
		})
			.then((data) => {
				if (data?.error) {
					message.error(data.error);
					setReportTasks([]);
					return;
				}
				setReportTasks(Array.isArray(data?.tasks) ? data.tasks : []);
			})
			.catch(() => message.error(labels.taskUpdateFailed))
			.finally(() => setReportLoading(false));
	}, [
		labels.taskUpdateFailed,
		ownerId,
		reportFilters.dateFrom,
		reportFilters.dateTo,
		reportFilters.hotelId,
		reportFilters.status,
		token,
		userId,
	]);

	useEffect(() => {
		if (activeTab === "reports") {
			loadReportTasks();
		}
	}, [activeTab, loadReportTasks]);

	const syncTab = (tab) => {
		if (tab === "assign" && !canManageHousekeeping) return;
		setActiveTab(tab);
		const query = new URLSearchParams(location.search);
		query.set("overall", "housekeeping");
		query.set("tab", tab);
		query.delete("createNewTask");
		query.delete("reports");
		history.replace(`${location.pathname}?${query.toString()}`);
	};

	const updateFilter = (key, value) => {
		setFilters((previous) => ({ ...previous, [key]: value }));
		setPage(1);
	};

	const openHousekeeping = (task = {}) => {
		const hotelId = normalizeId(task.hotelId);
		const route = singleHotelRoute(
			task.hotelOwnerId || task.ownerId || ownerId,
			hotelId,
			"housekeeping"
		);
		if (route) history.push(route);
	};

	const updateTaskStatus = (task = {}, nextStatus = "") => {
		const taskId = normalizeId(task._id);
		const normalizedStatus = editableStatusValue(nextStatus);
		if (!taskId || normalizedStatus === editableStatusValue(task.task_status)) return;
		if (!canEditTaskDetails(task)) {
			message.warning(labels.statusLocked || labels.taskUpdateFailed);
			return;
		}

		const cleanedById = normalizeId(task.cleanedBy);
		const payload = {
			task_status: normalizedStatus,
			actorId: userId,
		};
		if (normalizedStatus === "finished") {
			payload.cleanedBy = userId;
		} else if (cleanedById) {
			payload.cleanedBy = cleanedById;
		}

		setUpdatingTaskId(taskId);
		updatingHouseKeepingTask(taskId, payload)
			.then((response) => {
				if (response?.error) {
					message.error(response.error || labels.taskUpdateFailed);
					return;
				}
				setResult((previous) => ({
					...previous,
					tasks: (Array.isArray(previous.tasks) ? previous.tasks : []).map((item) =>
						normalizeId(item._id) === taskId ? mergeUpdatedTask(item, response) : item
					),
				}));
				message.success(labels.taskUpdated);
				loadHousekeeping();
				if (activeTab === "reports") loadReportTasks();
			})
			.catch(() => message.error(labels.taskUpdateFailed))
			.finally(() => setUpdatingTaskId(""));
	};

	const openTaskDetails = (task = {}) => {
		setDetailsTask(task);
		detailsForm.setFieldsValue({
			assignedTo: normalizeId(task.assignedTo),
			task_status: editableStatusValue(task.task_status),
		});
		const taskHotelId = normalizeId(task.hotelId);
		if (!taskHotelId) {
			setDetailsStaff([]);
			return;
		}
		setDetailsStaffLoading(true);
		getHouseKeepingStaff(taskHotelId)
			.then((staff) => {
				setDetailsStaff(Array.isArray(staff) ? staff : []);
			})
			.finally(() => setDetailsStaffLoading(false));
	};

	const closeTaskDetails = () => {
		setDetailsTask(null);
		setDetailsStaff([]);
		detailsForm.resetFields();
	};

	const saveTaskDetails = () => {
		if (!detailsTask?._id || !canEditTaskDetails(detailsTask)) return;
		detailsForm.validateFields().then((values) => {
			const taskId = normalizeId(detailsTask._id);
			const nextStatus = editableStatusValue(values.task_status);
			const payload = {
				assignedTo: values.assignedTo,
				actorId: userId,
			};
			if (nextStatus !== editableStatusValue(detailsTask.task_status)) {
				payload.task_status = nextStatus;
				if (nextStatus === "finished") {
					payload.cleanedBy = userId;
				} else {
					const cleanedById = normalizeId(detailsTask.cleanedBy);
					if (cleanedById) payload.cleanedBy = cleanedById;
				}
			}
			setDetailsSaving(true);
			updatingHouseKeepingTask(taskId, payload)
				.then((response) => {
					if (response?.error) {
						message.error(response.error || labels.taskUpdateFailed);
						return;
					}
					setResult((previous) => ({
						...previous,
						tasks: (Array.isArray(previous.tasks) ? previous.tasks : []).map((item) =>
							normalizeId(item._id) === taskId
								? mergeUpdatedTask(item, response)
								: item
						),
					}));
					setReportTasks((previous) =>
						(Array.isArray(previous) ? previous : []).map((item) =>
							normalizeId(item._id) === taskId
								? mergeUpdatedTask(item, response)
								: item
						)
					);
					message.success(labels.detailsSaved || labels.taskUpdated);
					closeTaskDetails();
					loadHousekeeping();
					if (activeTab === "reports") loadReportTasks();
				})
				.catch(() => message.error(labels.taskUpdateFailed))
				.finally(() => setDetailsSaving(false));
		});
	};

	const createTask = (values) => {
		if (!canManageHousekeeping) return;
		const targetHotelId = normalizeId(values.hotelId || assignHotelId);
		if (!targetHotelId) {
			message.error(labels.hotelRequired);
			return;
		}
		const taskType = values.taskType === "general" ? "general" : "room";
		setSaving(true);
		createNewHouseKeepingTask(targetHotelId, {
			...values,
			taskType,
			rooms: taskType === "room" ? values.rooms || [] : [],
			generalAreas: taskType === "general" ? values.generalAreas || [] : [],
			customTask:
				taskType === "general" &&
				Array.isArray(values.generalAreas) &&
				values.generalAreas.includes("other")
					? values.task_comment || ""
					: "",
			taskDate: normalizeTaskDateString(values.taskDate),
			task_status: "unfinished",
			hotelId: targetHotelId,
			assignedBy: userId,
		})
			.then((response) => {
				if (response?.error) {
					message.error(response.error || labels.taskCreateFailed);
					return;
				}
				message.success(labels.taskCreated);
				form.resetFields();
				form.setFieldsValue({
					hotelId: targetHotelId,
					taskDate: selectedDate,
					taskType: "room",
				});
				loadHousekeeping();
				syncTab("overview");
			})
			.catch(() => message.error(labels.taskCreateFailed))
			.finally(() => setSaving(false));
	};

	return (
		<OverallPageShell $isRTL={isRTL}>
			<HousekeepingWorkspace $isRTL={isRTL}>
				<TabsBar $count={canManageHousekeeping ? 3 : 2}>
					<TabButton
						type='button'
						$active={activeTab === "overview"}
						onClick={() => syncTab("overview")}
					>
						{labels.overview}
					</TabButton>
					{canManageHousekeeping ? (
						<TabButton
							type='button'
							$active={activeTab === "assign"}
							onClick={() => syncTab("assign")}
						>
							{labels.assign}
						</TabButton>
					) : null}
					<TabButton
						type='button'
						$active={activeTab === "reports"}
						onClick={() => syncTab("reports")}
					>
						{labels.reports}
					</TabButton>
				</TabsBar>

				<TopControlsBar>
					<div>
						<strong>{labels.title}</strong>
						<span>{labels.subtitle}</span>
					</div>
					<HeroActions>
						{activeTab !== "reports" ? (
							<NativeDateInput
								type='date'
								value={selectedDate}
								min={MIN_TASK_DATE}
								max={MAX_TASK_DATE}
								aria-label={labels.dateHint}
								onChange={(event) => {
									setSelectedDate(normalizeTaskDateString(event.target.value));
									setPage(1);
								}}
							/>
						) : null}
						<Button
							icon={<ReloadOutlined />}
							onClick={() =>
								activeTab === "reports" ? loadReportTasks() : loadHousekeeping()
							}
						>
							{labels.refresh}
						</Button>
					</HeroActions>
				</TopControlsBar>

				{activeTab !== "reports" ? (
					<OverallCards>
						<OverallCard>
							<TeamOutlined />
							<strong>{overviewStats.total}</strong>
							<span>{labels.totalTasks}</span>
						</OverallCard>
						<OverallCard>
							<HomeOutlined />
							<strong>{overviewStats.pending}</strong>
							<span>{labels.unfinished}</span>
						</OverallCard>
						<OverallCard>
							<ClearOutlined />
							<strong>{overviewStats.cleaning}</strong>
							<span>{labels.cleaning}</span>
						</OverallCard>
						<OverallCard>
							<CheckCircleOutlined />
							<strong>{overviewStats.done}</strong>
							<span>{labels.finished}</span>
						</OverallCard>
					</OverallCards>
				) : null}

				{activeTab === "assign" && canManageHousekeeping ? (
					<AssignmentPanel>
						<PanelTitle>
							<strong>{labels.assign}</strong>
							<span>{labels.hotelRequired}</span>
						</PanelTitle>
						{hotels.length ? (
							<Spin spinning={hotelResourcesLoading}>
								<Form
									form={form}
									layout='vertical'
									onFinish={createTask}
									initialValues={{
										hotelId: assignHotelId,
										taskDate: selectedDate,
										taskType: "room",
									}}
								>
									<AssignmentGrid>
										<Form.Item
											name='hotelId'
											label={labels.hotel}
											rules={[{ required: true, message: labels.hotelRequired }]}
										>
											<Select
												showSearch
												optionFilterProp='children'
												placeholder={labels.chooseHotel}
												onChange={(value) => {
													setAssignHotelId(value);
													form.setFieldsValue({
														assignedTo: undefined,
														rooms: [],
													});
												}}
											>
												{hotels.map((hotel) => (
													<Select.Option key={hotel._id} value={hotel._id}>
														{titleCase(hotel.hotelName)}
													</Select.Option>
												))}
											</Select>
										</Form.Item>
										<Form.Item
											name='taskDate'
											label={labels.taskDate}
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
											label={labels.employee}
											rules={[{ required: true }]}
										>
											<Select
												showSearch
												optionFilterProp='children'
												placeholder={
													hotelResourcesLoading
														? labels.loadingHotelResources
														: labels.employee
												}
											>
												{houseKeepingStaff.map((staff) => (
													<Select.Option key={staff._id} value={staff._id}>
														{staff.name}
													</Select.Option>
												))}
											</Select>
										</Form.Item>
										<Form.Item
											name='taskType'
											label={labels.taskKind}
											rules={[{ required: true }]}
										>
											<Select
												onChange={(value) => {
													if (value === "room") {
														form.setFieldsValue({ generalAreas: [] });
													} else {
														form.setFieldsValue({ rooms: [] });
													}
												}}
											>
												<Select.Option value='room'>
													{labels.roomCleaning}
												</Select.Option>
												<Select.Option value='general'>
													{labels.generalCleaning}
												</Select.Option>
											</Select>
										</Form.Item>
										{taskTypeValue === "general" ? (
											<Form.Item
												name='generalAreas'
												label={labels.generalAreas}
												rules={[
													{
														required: true,
														message: labels.generalAreasHint,
														type: "array",
													},
												]}
											>
												<Select
													mode='multiple'
													showSearch
													optionFilterProp='children'
													placeholder={labels.generalAreasHint}
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
												label={labels.rooms}
												rules={[{ required: true }]}
											>
												<Select
													mode='multiple'
													showSearch
													optionFilterProp='children'
													placeholder={labels.rooms}
												>
													{sortedHotelRooms.map((room) => (
														<Select.Option key={room._id} value={room._id}>
															{roomLabel(room)} - {roomTypeDisplay(room)}
														</Select.Option>
													))}
												</Select>
											</Form.Item>
										)}
										<Form.Item
											name='task_comment'
											className='full-span'
											label={
												taskTypeValue === "general"
													? labels.generalTaskDetails
													: labels.comment
											}
											rules={[
												{
													required:
														taskTypeValue === "general" &&
														Array.isArray(generalAreasValue) &&
														generalAreasValue.includes("other"),
													message: labels.customAreaRequiresComment,
												},
											]}
										>
											<Input.TextArea
												rows={3}
												placeholder={
													taskTypeValue === "general"
														? labels.generalTaskCommentHint
														: undefined
												}
											/>
										</Form.Item>
									</AssignmentGrid>
									<ResourceHints>
										{assignHotelId && !houseKeepingStaff.length ? (
											<Tag color='orange'>{labels.noStaff}</Tag>
										) : null}
										{assignHotelId && !hotelResourcesLoading && !sortedHotelRooms.length ? (
											<Tag color='orange'>{labels.noRooms}</Tag>
										) : null}
									</ResourceHints>
									<Button
										type='primary'
										htmlType='submit'
										loading={saving}
										icon={<PlusOutlined />}
									>
										{saving ? labels.creating : labels.createTask}
									</Button>
								</Form>
							</Spin>
						) : (
							<Empty description={labels.noHotelsFound} />
						)}
					</AssignmentPanel>
				) : null}

				{activeTab === "overview" ? (
					<>
						<FiltersRow>
							<input
								value={filters.search}
								onChange={(event) => updateFilter("search", event.target.value)}
								placeholder={labels.searchHousekeepingPlaceholder}
							/>
							<select
								value={filters.hotelId}
								onChange={(event) => updateFilter("hotelId", event.target.value)}
							>
								<option value=''>{labels.allHotels}</option>
								{hotels.map((hotel) => (
									<option key={hotel._id} value={hotel._id}>
										{titleCase(hotel.hotelName)}
									</option>
								))}
							</select>
							<select
								value={statusFilter}
								onChange={(event) => {
									setStatusFilter(event.target.value);
									setPage(1);
								}}
							>
								{statusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<button type='button' onClick={() => loadHousekeeping()}>
								{labels.search}
							</button>
							<button
								type='button'
								className='secondary'
								onClick={() => {
									setFilters({ search: "", hotelId: "" });
									setStatusFilter("open");
									setPage(1);
								}}
							>
								{labels.reset}
							</button>
						</FiltersRow>

						<OverallTableWrap>
							<table>
								<thead>
									<tr>
										<th>#</th>
										<th>{labels.hotel}</th>
										<th>{labels.status}</th>
										<th>{labels.rooms}</th>
										<th>{labels.taskKind}</th>
										<th>{labels.assignedTo}</th>
										<th>{labels.cleanedBy}</th>
										<th>{labels.confirmation}</th>
										<th>{labels.taskDate}</th>
										<th>{labels.updated}</th>
										<th>{labels.details || labels.moreDetails}</th>
										<th>{labels.singleHotel}</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan='12'>{labels.loading}</td>
										</tr>
									) : tasks.length ? (
										tasks.map((task, index) => (
											<tr key={task._id}>
												<td>{pageRowNumber(page, index, OVERALL_PAGE_SIZE)}</td>
												<td>
													<button
														type='button'
														className='link-btn hotel-name'
														onClick={() => openHousekeeping(task)}
													>
														{titleCase(task.hotelName || "-")}
													</button>
												</td>
												<td>
													<StatusEditor $tone={statusTone(task.task_status)}>
														<StatusPill $tone={statusTone(task.task_status)}>
															{localizeStatus(
																task.task_status || "unfinished",
																chosenLanguage
															)}
														</StatusPill>
														<select
															aria-label={labels.statusAction}
															title={labels.statusAction}
															value={editableStatusValue(task.task_status)}
															disabled={
																updatingTaskId === normalizeId(task._id) ||
																!canEditTaskDetails(task)
															}
															onChange={(event) =>
																updateTaskStatus(task, event.target.value)
															}
														>
															{statusOptionsForTask(task).map((option) => (
																<option key={option.value} value={option.value}>
																	{option.label}
																</option>
															))}
														</select>
													</StatusEditor>
												</td>
												<td>{taskMainLabel(task, isRTL)}</td>
												<td>{taskTypeLabel(task, labels)}</td>
												<td>{task.assignedToName || labels.notAssigned}</td>
												<td>{task.cleanedByName || labels.notCleaned}</td>
												<td>{task.confirmation_number || "-"}</td>
												<td>{formatDateTime(task.taskDate, chosenLanguage)}</td>
												<td>{formatDateTime(task.updatedAt, chosenLanguage)}</td>
												<td>
													<button
														type='button'
														className='link-btn'
														onClick={() => openTaskDetails(task)}
													>
														{labels.details || labels.moreDetails}
													</button>
												</td>
												<td>
													<button
														type='button'
														className='link-btn'
														onClick={() => openHousekeeping(task)}
													>
														{labels.openHousekeeping}
													</button>
												</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan='12'>{labels.noHousekeepingTasksFound}</td>
										</tr>
									)}
								</tbody>
							</table>
						</OverallTableWrap>

						<Pager>
							<button
								type='button'
								disabled={page <= 1}
								onClick={() => setPage(page - 1)}
							>
								{labels.previous}
							</button>
							<span>
								{labels.page} {page} {labels.of} {pages} (
								{Number(result.total || 0)})
							</span>
							<button
								type='button'
								disabled={page >= pages}
								onClick={() => setPage(page + 1)}
							>
								{labels.next}
							</button>
						</Pager>
					</>
				) : null}

				{activeTab === "reports" ? (
					<ReportsPanel>
						<PanelTitle>
							<strong>{labels.reports}</strong>
							<span>{labels.reportHint}</span>
						</PanelTitle>
						<ReportFilters>
							<label>
								<span>{labels.hotel}</span>
								<Select
									value={reportFilters.hotelId}
									onChange={(value) =>
										setReportFilters((previous) => ({
											...previous,
											hotelId: value,
										}))
									}
								>
									<Select.Option value=''>{labels.allHotelsReport}</Select.Option>
									{hotels.map((hotel) => (
										<Select.Option key={hotel._id} value={hotel._id}>
											{titleCase(hotel.hotelName)}
										</Select.Option>
									))}
								</Select>
							</label>
							<label>
								<span>{labels.fromDate}</span>
								<NativeDateInput
									type='date'
									value={reportFilters.dateFrom}
									min={MIN_TASK_DATE}
									max={MAX_TASK_DATE}
									onChange={(event) =>
										setReportFilters((previous) => ({
											...previous,
											dateFrom: normalizeTaskDateString(event.target.value),
										}))
									}
								/>
							</label>
							<label>
								<span>{labels.toDate}</span>
								<NativeDateInput
									type='date'
									value={reportFilters.dateTo}
									min={MIN_TASK_DATE}
									max={MAX_TASK_DATE}
									onChange={(event) =>
										setReportFilters((previous) => ({
											...previous,
											dateTo: normalizeTaskDateString(event.target.value),
										}))
									}
								/>
							</label>
							<label>
								<span>{labels.status}</span>
								<Select
									value={reportFilters.status}
									onChange={(value) =>
										setReportFilters((previous) => ({
											...previous,
											status: value,
										}))
									}
								>
									<Select.Option value='all'>{labels.allStatuses}</Select.Option>
									<Select.Option value='unfinished'>
										{labels.unfinished}
									</Select.Option>
									<Select.Option value='cleaning'>{labels.cleaning}</Select.Option>
									<Select.Option value='finished'>{labels.finished}</Select.Option>
								</Select>
							</label>
							<Button type='primary' onClick={loadReportTasks}>
								{labels.loadReport}
							</Button>
						</ReportFilters>
						<ReportSummaryGrid>
							<OverallCard>
								<strong>{reportSummary.total}</strong>
								<span>{labels.total}</span>
							</OverallCard>
							<OverallCard>
								<strong>{reportSummary.completed}</strong>
								<span>{labels.finished}</span>
							</OverallCard>
							<OverallCard>
								<strong>
									{formatDuration(reportSummary.averageDuration, labels.minutes)}
								</strong>
								<span>{labels.averageDuration}</span>
							</OverallCard>
						</ReportSummaryGrid>
						<Spin spinning={reportLoading}>
							{reportRows.length ? (
								<OverallTableWrap>
									<table>
										<thead>
											<tr>
												<th>#</th>
												<th>{labels.hotel}</th>
												<th>{labels.taskDate}</th>
												<th>{labels.rooms}</th>
												<th>{labels.taskKind}</th>
												<th>{labels.employee}</th>
												<th>{labels.status}</th>
												<th>{labels.startedAt}</th>
												<th>{labels.completedAt}</th>
												<th>{labels.duration}</th>
												<th>{labels.details || labels.moreDetails}</th>
											</tr>
										</thead>
										<tbody>
											{reportRows.map((task, index) => (
												<tr key={task._id || index}>
													<td>{index + 1}</td>
													<td className='hotel-name'>
														{titleCase(task.hotelName || "-")}
													</td>
													<td>{formatDate(task.taskDate, chosenLanguage)}</td>
													<td>{taskMainLabel(task, isRTL)}</td>
													<td>{taskTypeLabel(task, labels)}</td>
													<td>{task.assignedToName || labels.notAssigned}</td>
													<td>
														<Tag color={statusTone(task.task_status)}>
															{localizeStatus(
																task.task_status || "unfinished",
																chosenLanguage
															)}
														</Tag>
													</td>
													<td>{formatDateTime(getTaskStartedAt(task), chosenLanguage)}</td>
													<td>{formatDateTime(getTaskCompletedAt(task), chosenLanguage)}</td>
													<td>{formatDuration(getTaskDurationMs(task), labels.minutes)}</td>
													<td>
														<button
															type='button'
															className='link-btn'
															onClick={() => openTaskDetails(task)}
														>
															{labels.details || labels.moreDetails}
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</OverallTableWrap>
							) : (
								<Empty description={labels.noReportRows} />
							)}
						</Spin>
					</ReportsPanel>
				) : null}

				<Modal
					open={!!detailsTask}
					title={labels.taskDetails || labels.generalTaskDetails || "Task details"}
					onCancel={closeTaskDetails}
					onOk={canEditTaskDetails(detailsTask || {}) ? saveTaskDetails : undefined}
					okText={labels.saveDetails || "Save"}
					cancelText={labels.cancel || "Cancel"}
					confirmLoading={detailsSaving}
					okButtonProps={{
						disabled: !canEditTaskDetails(detailsTask || {}),
					}}
					width='min(94vw, 760px)'
					destroyOnClose
				>
					{detailsTask ? (
						<TaskDetailsGrid>
							<div>
								<span>{labels.hotel}</span>
								<strong>{titleCase(detailsTask.hotelName || "-")}</strong>
							</div>
							<div>
								<span>{labels.taskKind}</span>
								<strong>{taskTypeLabel(detailsTask, labels)}</strong>
							</div>
							<div>
								<span>{labels.rooms}</span>
								<strong>{taskMainLabel(detailsTask, isRTL)}</strong>
							</div>
							<div>
								<span>{labels.confirmation}</span>
								<strong>{detailsTask.confirmation_number || "-"}</strong>
							</div>
							<div>
								<span>{labels.startedAt}</span>
								<strong>{formatDateTime(getTaskStartedAt(detailsTask), chosenLanguage)}</strong>
							</div>
							<div>
								<span>{labels.completedAt}</span>
								<strong>{formatDateTime(getTaskCompletedAt(detailsTask), chosenLanguage)}</strong>
							</div>
							{detailsTask.task_comment ? (
								<div className='full-span'>
									<span>{labels.comment}</span>
									<strong>{detailsTask.task_comment}</strong>
								</div>
							) : null}
							<Form form={detailsForm} layout='vertical' className='full-span'>
								<Form.Item
									name='assignedTo'
									label={labels.employee}
									rules={[{ required: true }]}
								>
									<Select
										loading={detailsStaffLoading}
										disabled={!canEditTaskDetails(detailsTask)}
										showSearch
										optionFilterProp='children'
									>
										{detailsStaff.map((staff) => (
											<Select.Option key={staff._id} value={staff._id}>
												{staff.name}
											</Select.Option>
										))}
									</Select>
								</Form.Item>
								<Form.Item
									name='task_status'
									label={labels.status}
									rules={[{ required: true }]}
								>
									<Select disabled={!canEditTaskDetails(detailsTask)}>
										{statusOptionsForTask(detailsTask).map((option) => (
											<Select.Option key={option.value} value={option.value}>
												{option.label}
											</Select.Option>
										))}
									</Select>
								</Form.Item>
							</Form>
							{!canEditTaskDetails(detailsTask) ? (
								<LockedNotice className='full-span'>
									{labels.statusLocked || labels.taskUpdateFailed}
								</LockedNotice>
							) : null}
						</TaskDetailsGrid>
					) : null}
				</Modal>
			</HousekeepingWorkspace>
		</OverallPageShell>
	);
};

export default OverallHouseKeeping;

const HousekeepingWorkspace = styled.div`
	display: grid;
	gap: 0.9rem;
	min-width: 0;
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};

	.hotel-name {
		text-transform: capitalize;
	}
`;

const TabsBar = styled.div`
	display: grid;
	grid-template-columns: repeat(${(props) => props.$count || 3}, minmax(0, 1fr));
	gap: 8px;
	padding: 8px;
	border: 1px solid #cfe5fb;
	border-radius: 12px;
	background: #e3f2fd;

	@media (max-width: 560px) {
		grid-template-columns: 1fr;
	}
`;

const TabButton = styled.button`
	min-height: 42px;
	border: 1px solid ${(props) => (props.$active ? "#1e88e5" : "#cfe5fb")};
	border-radius: 10px;
	background: ${(props) => (props.$active ? "#1e88e5" : "#fff")};
	color: ${(props) => (props.$active ? "#fff" : "#0f4f86")};
	font-weight: 950;
	box-shadow: ${(props) =>
		props.$active ? "0 8px 18px rgba(30, 136, 229, 0.18)" : "none"};
`;

const TopControlsBar = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
	min-width: 0;
	padding: 12px;
	border: 1px solid #cfe5fb;
	border-radius: 10px;
	background: #fff;

	> div:first-child {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	strong {
		color: #0f4f86;
		font-size: 1rem;
		font-weight: 950;
	}

	span {
		color: #47627d;
		font-size: 0.82rem;
		font-weight: 800;
	}
`;

const HeroActions = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;

	@media (max-width: 520px) {
		width: 100%;

		> * {
			flex: 1 1 100%;
		}
	}
`;

const NativeDateInput = styled.input`
	min-height: 38px;
	width: 100%;
	min-width: 0;
	box-sizing: border-box;
	border: 1px solid #cfe5fb;
	border-radius: 8px;
	background: #fff;
	color: #101828;
	font-size: 14px;
	font-weight: 850;
	padding: 0 10px;
	outline: none;
	line-height: 38px;

	&:focus {
		border-color: #1e88e5;
		box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.12);
	}

	&::-webkit-calendar-picker-indicator {
		cursor: pointer;
		opacity: 0.72;
	}
`;

const FiltersRow = styled.div`
	display: grid;
	grid-template-columns: minmax(180px, 1.4fr) repeat(2, minmax(150px, 1fr)) repeat(2, minmax(110px, 0.7fr));
	gap: 8px;
	min-width: 0;
	padding: 12px;
	border: 1px solid #cfe5fb;
	border-radius: 8px;
	background: #e3f2fd;

	input,
	select {
		min-width: 0;
		min-height: 38px;
		width: 100%;
		border: 1px solid #d0d5dd;
		border-radius: 8px;
		background: #fff;
		color: #101828;
		font-size: 14px;
		font-weight: 700;
		padding: 0 12px;
		outline: none;
	}

	button {
		min-height: 38px;
		border: 0;
		border-radius: 8px;
		background: #1e88e5;
		color: #fff;
		font-weight: 900;
		padding: 0 14px;
	}

	button.secondary {
		border: 1px solid rgba(16, 24, 40, 0.08);
		background: #fff;
		color: #18212f;
	}

	@media (max-width: 920px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 480px) {
		grid-template-columns: 1fr;
	}
`;

const AssignmentPanel = styled.section`
	display: grid;
	gap: 12px;
	padding: 12px;
	border: 1px solid #cfe5fb;
	border-radius: 10px;
	background: #f7fbff;
`;

const PanelTitle = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
	flex-wrap: wrap;

	strong {
		color: #0f4f86;
		font-size: 1rem;
		font-weight: 950;
	}

	span {
		color: #47627d;
		font-size: 0.82rem;
		font-weight: 800;
	}
`;

const AssignmentGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, minmax(220px, 1fr));
	align-items: start;
	gap: 12px;

	.full-span {
		grid-column: 1 / -1;
	}

	.ant-form-item {
		margin-bottom: 0;
		min-width: 0;
	}

	.ant-form-item-label {
		padding-bottom: 5px;
		text-align: inherit;
	}

	.ant-form-item-label > label {
		width: 100%;
		color: #0f2842;
		font-size: 0.82rem;
		font-weight: 950;
		justify-content: flex-start;
	}

	.ant-select,
	.ant-input,
	textarea,
	${NativeDateInput} {
		width: 100%;
		min-width: 0;
	}

	.ant-select-selector,
	.ant-input,
	textarea {
		border-color: #cfe5fb !important;
		border-radius: 8px !important;
		background: #fff !important;
	}

	.ant-select-single .ant-select-selector {
		min-height: 38px;
		display: flex;
		align-items: center;
	}

	.ant-select-single .ant-select-selection-search-input {
		height: 36px !important;
	}

	.ant-select-single .ant-select-selection-item,
	.ant-select-single .ant-select-selection-placeholder {
		display: flex;
		align-items: center;
		min-height: 36px;
		font-weight: 850;
	}

	.ant-select-multiple .ant-select-selector {
		min-height: 38px;
		padding-block: 3px !important;
	}

	.ant-select-focused .ant-select-selector,
	.ant-input:focus,
	textarea:focus {
		border-color: #1e88e5 !important;
		box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.12) !important;
	}

	textarea {
		min-height: 78px;
		font-weight: 750;
		resize: vertical;
	}

	button[type="submit"] {
		min-height: 38px;
		min-width: 150px;
		font-weight: 900;
		justify-self: start;
	}

	@media (max-width: 1100px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 640px) {
		grid-template-columns: 1fr;

		button[type="submit"] {
			width: 100%;
		}
	}
`;

const ResourceHints = styled.div`
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	margin-bottom: 10px;
`;

const ReportsPanel = styled.section`
	display: grid;
	gap: 12px;
`;

const ReportFilters = styled.div`
	display: grid;
	grid-template-columns: minmax(180px, 1.2fr) repeat(3, minmax(145px, 1fr)) minmax(120px, 0.75fr);
	gap: 8px;
	align-items: end;
	padding: 12px;
	border: 1px solid #cfe5fb;
	border-radius: 10px;
	background: #e3f2fd;

	label {
		display: grid;
		gap: 4px;
		min-width: 0;
		color: #344054;
		font-size: 0.75rem;
		font-weight: 900;
	}

	.ant-select,
	button {
		min-width: 0;
		width: 100%;
	}

	@media (max-width: 980px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: 520px) {
		grid-template-columns: 1fr;
	}
`;

const ReportSummaryGrid = styled(OverallCards)`
	grid-template-columns: repeat(3, minmax(160px, 1fr));

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
	}
`;

const TaskDetailsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;

	> div,
	.ant-form-item {
		min-width: 0;
	}

	> div:not(.full-span) {
		display: grid;
		gap: 4px;
		padding: 10px;
		border: 1px solid #d8ecff;
		border-radius: 8px;
		background: #f8fbff;
	}

	.full-span {
		grid-column: 1 / -1;
	}

	span,
	.ant-form-item-label > label {
		color: #64748b;
		font-size: 0.76rem;
		font-weight: 900;
	}

	strong {
		color: #102033;
		font-size: 0.9rem;
		font-weight: 950;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}

	.ant-form {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.ant-form-item {
		margin-bottom: 0;
	}

	@media (max-width: 620px) {
		grid-template-columns: 1fr;

		.ant-form {
			grid-template-columns: 1fr;
		}
	}
`;

const LockedNotice = styled.div`
	padding: 9px 10px;
	border: 1px solid #fde68a;
	border-radius: 8px;
	background: #fffbeb;
	color: #92400e;
	font-size: 0.78rem;
	font-weight: 900;
`;

const StatusEditor = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-width: 210px;

	select {
		min-width: 115px;
		min-height: 30px;
		border: 1px solid
			${(props) =>
				props.$tone === "red"
					? "#ff7875"
					: props.$tone === "orange"
					  ? "#ffd666"
					  : props.$tone === "green"
					    ? "#8ce99a"
					    : "#b8dcff"};
		border-radius: 8px;
		background: #fff;
		color: #101828;
		font-size: 12px;
		font-weight: 900;
		padding: 0 8px;
		outline: none;
	}

	select:focus {
		border-color: #1e88e5;
		box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.12);
	}

	select:disabled {
		background: #f2f4f7;
		cursor: wait;
		opacity: 0.72;
	}

	@media (max-width: 720px) {
		min-width: 190px;
		gap: 4px;

		select {
			min-width: 104px;
			min-height: 28px;
			font-size: 11px;
		}
	}
`;
