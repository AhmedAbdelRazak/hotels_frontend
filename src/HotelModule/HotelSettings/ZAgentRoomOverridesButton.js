import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Button,
	DatePicker,
	InputNumber,
	message,
	Modal,
	Popconfirm,
	Select,
	Switch,
	Table,
	Tag,
} from "antd";
import {
	DeleteOutlined,
	SaveOutlined,
	SyncOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayjs from "dayjs";
import { getHotelAgentOptions, isAuthenticated } from "../../auth";
import { updateRoomAgentOverrides } from "../apiAdmin";

const { RangePicker } = DatePicker;
const AGENT_SEARCH_LIMIT = 120;

const normalizeId = (value) =>
	String(value?._id || value?.id || value || "").trim();

const dateKey = (value) => {
	if (!value) return "";
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	if (dayjs.isDayjs(value)) return value.format("YYYY-MM-DD");
	const parsed = dayjs(value);
	return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

const agentLabel = (agent = {}) => {
	const pieces = [agent.name, agent.companyName || agent.email]
		.map((item) => String(item || "").trim())
		.filter(Boolean);
	return pieces.length ? pieces.join(" | ") : "Agent";
};

const dateRangeArray = (start, end) => {
	const dates = [];
	const cursor = dayjs.isDayjs(start)
		? start.startOf("day")
		: dayjs(start).startOf("day");
	const last = dayjs.isDayjs(end) ? end.startOf("day") : dayjs(end).startOf("day");
	let current = cursor;
	while (current.isSame(last, "day") || current.isBefore(last, "day")) {
		dates.push(current.format("YYYY-MM-DD"));
		current = current.add(1, "day");
	}
	return dates;
};

const isBlockedRate = (row = {}) => {
	const color = String(row.color || "").toLowerCase();
	const status = String(row.status || "").toLowerCase();
	const price = Number(row.price);
	const rootPrice = Number(row.rootPrice);
	return (
		row.blocked === true ||
		row.isBlocked === true ||
		status === "blocked" ||
		color === "black" ||
		(Number.isFinite(price) && price <= 0) ||
		(Number.isFinite(rootPrice) && rootPrice <= 0 && color === "black")
	);
};

const makeAgentSnapshot = (agent = {}) => ({
	agentId: normalizeId(agent._id),
	agentName: agent.name || agent.email || "",
	agentEmail: agent.email || "",
	companyName: agent.companyName || "",
});

const agentFromOverrideRow = (row = {}) => ({
	_id: normalizeId(row.agentId),
	name: row.agentName || row.agentEmail || "",
	email: row.agentEmail || "",
	companyName: row.companyName || "",
});

const mergeAgents = (...agentLists) => {
	const byId = new Map();
	agentLists.flat().forEach((agent) => {
		const agentId = normalizeId(agent?._id || agent?.agentId);
		if (!agentId) return;
		const previous = byId.get(agentId) || {};
		byId.set(agentId, {
			...previous,
			...agent,
			_id: agentId,
			name: agent.name || previous.name || agent.agentName || "",
			email: agent.email || previous.email || agent.agentEmail || "",
			companyName:
				agent.companyName || previous.companyName || agent.companyOfficialName || "",
		});
	});
	return Array.from(byId.values()).sort((left, right) =>
		agentLabel(left).localeCompare(agentLabel(right))
	);
};

const ZAgentRoomOverridesButton = ({
	chosenLanguage,
	hotelDetails,
	roomDetails,
	onChange,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const labels = useMemo(
		() => ({
			button: isArabic
				? "\u0645\u062e\u0632\u0648\u0646 \u0648\u0633\u0639\u0631 \u0627\u0644\u0648\u0643\u064a\u0644"
				: "Agent Stock & Price",
			title: isArabic
				? "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0648\u0643\u064a\u0644"
				: "Agent room settings",
			stockTab: isArabic ? "\u0627\u0644\u0645\u062e\u0632\u0648\u0646" : "Stock",
			pricingTab: isArabic ? "\u0627\u0644\u062a\u0633\u0639\u064a\u0631" : "Pricing",
			agent: isArabic ? "\u0627\u0644\u0648\u0643\u064a\u0644" : "Agent",
			chooseAgent: isArabic
				? "\u0627\u062e\u062a\u0631 \u0648\u0643\u064a\u0644"
				: "Choose agent",
			stock: isArabic ? "\u0627\u0644\u0645\u062e\u0632\u0648\u0646" : "Stock",
			saveStock: isArabic
				? "\u062d\u0641\u0638 \u0627\u0644\u0645\u062e\u0632\u0648\u0646"
				: "Save stock",
			dateRange: isArabic
				? "\u0646\u0637\u0627\u0642 \u0627\u0644\u062a\u0627\u0631\u064a\u062e"
				: "Date range",
			price: isArabic ? "\u0627\u0644\u0633\u0639\u0631" : "Price",
			rootPrice: isArabic
				? "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u062c\u0630\u0631\u064a"
				: "Root price",
			savePricing: isArabic
				? "\u062d\u0641\u0638 \u0627\u0644\u062a\u0633\u0639\u064a\u0631"
				: "Save pricing",
			saveBlock: isArabic
				? "\u062d\u0641\u0638 \u0627\u0644\u062d\u0638\u0631"
				: "Save block",
			blockRange: isArabic
				? "\u062d\u0638\u0631 \u0647\u0630\u0627 \u0627\u0644\u0646\u0637\u0627\u0642 \u0644\u0644\u0648\u0643\u064a\u0644"
				: "Block this range for the agent",
			blocked: isArabic ? "\u0645\u062d\u0638\u0648\u0631" : "Blocked",
			blockedSaved: isArabic
				? "\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u062d\u0638\u0631"
				: "Block saved",
			remove: isArabic ? "\u062d\u0630\u0641" : "Remove",
			noAgents: isArabic
				? "\u0644\u0627 \u064a\u0648\u062c\u062f \u0648\u0643\u0644\u0627\u0621"
				: "No agents",
			required: isArabic
				? "\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0648\u0643\u064a\u0644 \u0623\u0648\u0644\u0627"
				: "Please choose an agent first",
			saved: isArabic ? "\u062a\u0645 \u0627\u0644\u062d\u0641\u0638" : "Saved",
			removeQuestion: isArabic ? "\u062d\u0630\u0641\u061f" : "Remove?",
			fallback: isArabic ? "\u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a" : "Fallback",
			refresh: isArabic ? "\u062a\u062d\u062f\u064a\u062b" : "Refresh",
			stockRows: isArabic
				? "\u0635\u0641\u0648\u0641 \u0627\u0644\u0645\u062e\u0632\u0648\u0646"
				: "Stock rows",
			priceDays: isArabic
				? "\u0623\u064a\u0627\u0645 \u0627\u0644\u0633\u0639\u0631"
				: "Price days",
			stockSetup: isArabic
				? "\u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u0645\u062e\u0632\u0648\u0646"
				: "Stock assignment",
			pricingSetup: isArabic
				? "\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u062a\u0633\u0639\u064a\u0631"
				: "Pricing calendar",
			assignedStock: isArabic
				? "\u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0627\u0644\u0645\u062e\u0635\u0635"
				: "Assigned stock",
			assignedPricing: isArabic
				? "\u0627\u0644\u062a\u0633\u0639\u064a\u0631 \u0627\u0644\u0645\u062e\u0635\u0635"
				: "Assigned pricing",
			localOnly: isArabic
				? "\u062a\u0645 \u062a\u0637\u0628\u064a\u0642\u0647\u0627 \u0645\u062d\u0644\u064a\u0627 \u0648\u0633\u062a\u062d\u0641\u0638 \u0639\u0646\u062f \u062d\u0641\u0638 \u0627\u0644\u063a\u0631\u0641\u0629 \u0627\u0644\u062c\u062f\u064a\u062f\u0629"
				: "Applied locally until the new room is saved.",
			saveFailed: isArabic
				? "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0647\u0630\u0627 \u0627\u0644\u062c\u0632\u0621"
				: "Could not save this section",
			completeDate: isArabic
				? "\u0623\u0643\u0645\u0644 \u0646\u0637\u0627\u0642 \u0627\u0644\u062a\u0627\u0631\u064a\u062e"
				: "Complete the date range",
		}),
		[isArabic]
	);
	const { user, token } = isAuthenticated();
	const [open, setOpen] = useState(false);
	const [agents, setAgents] = useState([]);
	const [agentSearch, setAgentSearch] = useState("");
	const [agentLoading, setAgentLoading] = useState(false);
	const [selectedAgentId, setSelectedAgentId] = useState("");
	const [stock, setStock] = useState(0);
	const [dateRange, setDateRange] = useState([]);
	const [price, setPrice] = useState(null);
	const [rootPrice, setRootPrice] = useState(null);
	const [blockPricingRange, setBlockPricingRange] = useState(false);
	const [activeTab, setActiveTab] = useState("stock");
	const [stockSaving, setStockSaving] = useState(false);
	const [pricingSaving, setPricingSaving] = useState(false);
	const [removingKey, setRemovingKey] = useState("");
	const calendarRef = useRef(null);

	const inventoryRows = useMemo(
		() =>
			Array.isArray(roomDetails?.agentInventory)
				? roomDetails.agentInventory
				: [],
		[roomDetails?.agentInventory]
	);
	const pricingRows = useMemo(
		() =>
			Array.isArray(roomDetails?.agentPricingRate)
				? roomDetails.agentPricingRate
				: [],
		[roomDetails?.agentPricingRate]
	);
	const snapshotAgents = useMemo(
		() =>
			mergeAgents(
				inventoryRows.map(agentFromOverrideRow),
				pricingRows.map(agentFromOverrideRow)
			),
		[inventoryRows, pricingRows]
	);

	const selectedAgent = useMemo(
		() =>
			agents.find((agent) => normalizeId(agent._id) === selectedAgentId) ||
			snapshotAgents.find((agent) => normalizeId(agent._id) === selectedAgentId),
		[agents, selectedAgentId, snapshotAgents]
	);
	const selectedPricingRows = useMemo(
		() =>
			pricingRows
				.filter((row) => normalizeId(row.agentId) === selectedAgentId)
				.sort((left, right) =>
					dateKey(left.calendarDate).localeCompare(dateKey(right.calendarDate))
				),
		[pricingRows, selectedAgentId]
	);
	const agentOptions = useMemo(
		() =>
			mergeAgents(agents, snapshotAgents).map((agent) => ({
				value: normalizeId(agent._id),
				label: agentLabel(agent),
			})),
		[agents, snapshotAgents]
	);

	const emitChange = useCallback(
		(next) => {
			onChange?.({
				agentInventory: next.agentInventory ?? inventoryRows,
				agentPricingRate: next.agentPricingRate ?? pricingRows,
			});
		},
		[inventoryRows, onChange, pricingRows]
	);

	const directSaveAvailable = Boolean(
		normalizeId(hotelDetails?._id) &&
			normalizeId(roomDetails?._id) &&
			normalizeId(user?._id) &&
			token
	);

	const persistOverride = useCallback(
		async (payload) => {
			if (!directSaveAvailable) return null;
			const data = await updateRoomAgentOverrides(
				normalizeId(hotelDetails?._id),
				normalizeId(roomDetails?._id),
				normalizeId(user?._id),
				token,
				payload
			);
			if (data?.error) throw new Error(data.error);
			return data;
		},
		[directSaveAvailable, hotelDetails?._id, roomDetails?._id, token, user?._id]
	);

	const loadAgents = useCallback(
		(searchTerm = "") => {
			if (!open || !hotelDetails?._id || !user?._id || !token) return;
			setAgentLoading(true);
			getHotelAgentOptions(user._id, token, hotelDetails._id, {
				q: searchTerm,
				limit: AGENT_SEARCH_LIMIT,
			})
				.then((data) => {
					const rows = Array.isArray(data?.agents)
						? data.agents
						: Array.isArray(data)
						? data
						: [];
					setAgents((previous) => {
						const selectedFromPrevious = previous.find(
							(agent) => normalizeId(agent._id) === selectedAgentId
						);
						const nextAgents = mergeAgents(
							rows,
							snapshotAgents,
							selectedFromPrevious ? [selectedFromPrevious] : []
						);
						setSelectedAgentId((current) => {
							if (current) return current;
							return normalizeId(nextAgents[0]?._id) || "";
						});
						return nextAgents;
					});
				})
				.catch(() => {
					message.error(
						isArabic
							? "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0648\u0643\u0644\u0627\u0621"
							: "Could not load agents"
					);
				})
				.finally(() => setAgentLoading(false));
		},
		[
			hotelDetails?._id,
			isArabic,
			open,
			selectedAgentId,
			snapshotAgents,
			token,
			user?._id,
		]
	);

	useEffect(() => {
		if (!open) return undefined;
		const timer = setTimeout(
			() => loadAgents(agentSearch),
			agentSearch ? 250 : 0
		);
		return () => clearTimeout(timer);
	}, [agentSearch, loadAgents, open]);

	useEffect(() => {
		if (!open) return;
		setAgents((previous) => mergeAgents(previous, snapshotAgents));
	}, [open, snapshotAgents]);

	useEffect(() => {
		const existing = inventoryRows.find(
			(row) => normalizeId(row.agentId) === selectedAgentId
		);
		setStock(Number(existing?.stock ?? 0));
	}, [inventoryRows, selectedAgentId]);

	const saveStock = async () => {
		if (!selectedAgent) return message.error(labels.required);
		const snapshot = makeAgentSnapshot(selectedAgent);
		const parsedStock = Number(stock ?? 0);
		const normalizedStock = Math.max(
			0,
			Math.floor(Number.isFinite(parsedStock) ? parsedStock : 0)
		);
		const nextRows = [
			...inventoryRows.filter(
				(row) => normalizeId(row.agentId) !== selectedAgentId
			),
			{ ...snapshot, stock: normalizedStock },
		];

		if (!directSaveAvailable) {
			emitChange({ agentInventory: nextRows });
			message.info(labels.localOnly);
			return null;
		}

		setStockSaving(true);
		try {
			const data = await persistOverride({
				action: "saveStock",
				agentId: selectedAgentId,
				stock: normalizedStock,
			});
			emitChange({
				agentInventory: data?.agentInventory || nextRows,
				agentPricingRate: data?.agentPricingRate || pricingRows,
			});
			message.success(labels.saved);
		} catch (error) {
			message.error(error?.message || labels.saveFailed);
		} finally {
			setStockSaving(false);
		}
		return null;
	};

	const removeStock = useCallback(
		async (agentId) => {
			const normalizedAgentId = normalizeId(agentId);
			const nextRows = inventoryRows.filter(
				(row) => normalizeId(row.agentId) !== normalizedAgentId
			);

			if (!directSaveAvailable) {
				emitChange({ agentInventory: nextRows });
				message.info(labels.localOnly);
				return;
			}

			setRemovingKey(`stock-${normalizedAgentId}`);
			try {
				const data = await persistOverride({
					action: "removeStock",
					agentId: normalizedAgentId,
				});
				emitChange({
					agentInventory: data?.agentInventory || nextRows,
					agentPricingRate: data?.agentPricingRate || pricingRows,
				});
				message.success(labels.saved);
			} catch (error) {
				message.error(error?.message || labels.saveFailed);
			} finally {
				setRemovingKey("");
			}
		},
		[
			directSaveAvailable,
			emitChange,
			inventoryRows,
			labels.localOnly,
			labels.saveFailed,
			labels.saved,
			persistOverride,
			pricingRows,
		]
	);

	const savePricing = async () => {
		if (!selectedAgent) return message.error(labels.required);
		if (!dateRange?.[0] || !dateRange?.[1]) {
			return message.error(labels.completeDate);
		}
		if (!blockPricingRange && (!(Number(price) > 0) || !(Number(rootPrice) > 0))) {
			return message.error(
				isArabic
					? "\u0623\u0643\u0645\u0644 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0648\u0627\u0644\u0633\u0639\u0631"
					: "Complete date and pricing"
			);
		}
		const snapshot = makeAgentSnapshot(selectedAgent);
		const dates = dateRangeArray(dateRange[0], dateRange[1]);
		const dateSet = new Set(dates);
		const newPricingRows = dates.map((calendarDate) => ({
			...snapshot,
			calendarDate,
			price: blockPricingRange ? 0 : Number(price),
			rootPrice: blockPricingRange ? 0 : Number(rootPrice),
			...(blockPricingRange
				? { color: "black", status: "blocked", blocked: true }
				: {}),
		}));
		const nextRows = [
			...pricingRows.filter(
				(row) =>
					normalizeId(row.agentId) !== selectedAgentId ||
					!dateSet.has(dateKey(row.calendarDate))
			),
			...newPricingRows,
		];

		if (!directSaveAvailable) {
			emitChange({ agentPricingRate: nextRows });
			setDateRange([]);
			setPrice(null);
			setRootPrice(null);
			setBlockPricingRange(false);
			message.info(labels.localOnly);
			if (calendarRef.current) calendarRef.current.getApi().refetchEvents();
			return null;
		}

		setPricingSaving(true);
		try {
			const data = await persistOverride({
				action: "savePricingRange",
				agentId: selectedAgentId,
				pricingRows: newPricingRows.map((row) => ({
					calendarDate: row.calendarDate,
					price: row.price,
					rootPrice: row.rootPrice,
					color: row.color,
					status: row.status,
					blocked: row.blocked,
				})),
			});
			emitChange({
				agentInventory: data?.agentInventory || inventoryRows,
				agentPricingRate: data?.agentPricingRate || nextRows,
			});
			setDateRange([]);
			setPrice(null);
			setRootPrice(null);
			setBlockPricingRange(false);
			message.success(blockPricingRange ? labels.blockedSaved : labels.saved);
			if (calendarRef.current) calendarRef.current.getApi().refetchEvents();
		} catch (error) {
			message.error(error?.message || labels.saveFailed);
		} finally {
			setPricingSaving(false);
		}
		return null;
	};

	const removePricingDate = useCallback(
		async (calendarDate) => {
			const normalizedDate = dateKey(calendarDate);
			const nextRows = pricingRows.filter(
				(row) =>
					normalizeId(row.agentId) !== selectedAgentId ||
					dateKey(row.calendarDate) !== normalizedDate
			);

			if (!directSaveAvailable) {
				emitChange({ agentPricingRate: nextRows });
				message.info(labels.localOnly);
				return;
			}

			setRemovingKey(`pricing-${selectedAgentId}-${normalizedDate}`);
			try {
				const data = await persistOverride({
					action: "removePricingDate",
					agentId: selectedAgentId,
					calendarDate: normalizedDate,
				});
				emitChange({
					agentInventory: data?.agentInventory || inventoryRows,
					agentPricingRate: data?.agentPricingRate || nextRows,
				});
				message.success(labels.saved);
			} catch (error) {
				message.error(error?.message || labels.saveFailed);
			} finally {
				setRemovingKey("");
			}
		},
		[
			directSaveAvailable,
			emitChange,
			inventoryRows,
			labels.localOnly,
			labels.saveFailed,
			labels.saved,
			persistOverride,
			pricingRows,
			selectedAgentId,
		]
	);

	const handleCalendarSelect = useCallback((info) => {
		const start = dayjs(info.start).startOf("day");
		const end = dayjs(info.end).subtract(1, "day").startOf("day");
		if (!start.isValid() || !end.isValid()) return;
		setDateRange([start, end.isBefore(start, "day") ? start : end]);
	}, []);

	const calendarEvents = useMemo(
		() => {
			const selectedRangeEvent =
				dateRange?.[0] && dateRange?.[1]
					? [
							{
								id: "agent-selected-pricing-range",
								start: dayjs(dateRange[0]).format("YYYY-MM-DD"),
								end: dayjs(dateRange[1]).add(1, "day").format("YYYY-MM-DD"),
								allDay: true,
								display: "background",
								backgroundColor: "rgba(14, 165, 233, 0.18)",
								classNames: ["agent-selected-pricing-range"],
							},
					  ]
					: [];

			return [
				...selectedRangeEvent,
				...selectedPricingRows.map((row) => {
					const blocked = isBlockedRate(row);
					const priceLabel = `${labels.price}: ${row.price}`;
					const rootPriceLabel = `${labels.rootPrice}: ${row.rootPrice}`;
					return {
						title: blocked
							? labels.blocked
							: `${priceLabel} ${rootPriceLabel}`,
						start: dateKey(row.calendarDate),
						end: dateKey(row.calendarDate),
						allDay: true,
						backgroundColor: blocked ? "#111827" : "#1677ff",
						borderColor: blocked ? "#111827" : "#1677ff",
						textColor: "#fff",
						classNames: blocked
							? ["agent-calendar-blocked"]
							: ["agent-calendar-price"],
						extendedProps: {
							blocked,
							priceLabel,
							rootPriceLabel,
						},
					};
				}),
			];
		},
		[dateRange, labels.blocked, labels.price, labels.rootPrice, selectedPricingRows]
	);

	const renderCalendarEventContent = useCallback(
		(eventInfo) => {
			const { title, extendedProps = {} } = eventInfo.event;
			if (extendedProps.blocked) {
				return <span className='agent-calendar-blocked-label'>{title}</span>;
			}
			if (!extendedProps.priceLabel && !extendedProps.rootPriceLabel) return null;

			return (
				<span className='agent-calendar-price-lines'>
					<span>{extendedProps.priceLabel}</span>
					<span>{extendedProps.rootPriceLabel}</span>
				</span>
			);
		},
		[]
	);

	useEffect(() => {
		if (!open || activeTab !== "pricing") return undefined;
		const timer = setTimeout(() => {
			calendarRef.current?.getApi?.().updateSize();
		}, 80);
		return () => clearTimeout(timer);
	}, [activeTab, open]);

	const stockColumns = useMemo(
		() => [
			{
				title: labels.agent,
				dataIndex: "agentName",
				ellipsis: true,
				render: (_, row) => row.agentName || row.companyName || row.agentEmail || "-",
			},
			{ title: labels.stock, dataIndex: "stock", width: 120 },
			{
				title: "",
				width: 96,
				render: (_, row) => (
					<Popconfirm
						title={labels.removeQuestion}
						onConfirm={() => removeStock(row.agentId)}
					>
						<Button
							danger
							size='small'
							icon={<DeleteOutlined />}
							loading={removingKey === `stock-${normalizeId(row.agentId)}`}
						>
							{labels.remove}
						</Button>
					</Popconfirm>
				),
			},
		],
		[
			labels.agent,
			labels.remove,
			labels.removeQuestion,
			labels.stock,
			removeStock,
			removingKey,
		]
	);

	const pricingColumns = useMemo(
		() => [
			{ title: labels.dateRange, dataIndex: "calendarDate", width: 130 },
			{
				title: labels.price,
				dataIndex: "price",
				width: 110,
				render: (_, row) =>
					isBlockedRate(row) ? <Tag color='red'>{labels.blocked}</Tag> : row.price,
			},
			{
				title: labels.rootPrice,
				dataIndex: "rootPrice",
				width: 120,
				render: (_, row) => (isBlockedRate(row) ? "-" : row.rootPrice),
			},
			{
				title: "",
				width: 96,
				render: (_, row) => (
					<Popconfirm
						title={labels.removeQuestion}
						onConfirm={() => removePricingDate(row.calendarDate)}
					>
						<Button
							danger
							size='small'
							icon={<DeleteOutlined />}
							loading={
								removingKey ===
								`pricing-${selectedAgentId}-${dateKey(row.calendarDate)}`
							}
						>
							{labels.remove}
						</Button>
					</Popconfirm>
				),
			},
		],
		[
			labels.dateRange,
			labels.blocked,
			labels.price,
			labels.remove,
			labels.removeQuestion,
			labels.rootPrice,
			removePricingDate,
			removingKey,
			selectedAgentId,
		]
	);

	const switchActiveTab = useCallback((key) => {
		setActiveTab(key);
		if (key === "pricing") {
			setTimeout(() => {
				calendarRef.current?.getApi?.().updateSize();
			}, 80);
		}
	}, []);

	return (
		<>
			<AgentOverridesTrigger icon={<TeamOutlined />} onClick={() => setOpen(true)}>
				{labels.button}
			</AgentOverridesTrigger>
			<Modal
				open={open}
				title={
					<ModalTitle $isArabic={isArabic}>
						<span className='title-icon'>
							<TeamOutlined />
						</span>
						<span>
							<strong>{labels.title}</strong>
							<small>{roomDetails?.displayName || roomDetails?.roomType || ""}</small>
						</span>
					</ModalTitle>
				}
				onCancel={() => setOpen(false)}
				footer={null}
				width='min(98vw, 1520px)'
				destroyOnClose={false}
				styles={{
					body: {
						maxHeight: "calc(100vh - 132px)",
						overflowY: "auto",
						padding: "0 24px 24px",
					},
				}}
			>
				<AgentModalBody dir={isArabic ? "rtl" : "ltr"}>
					<SubTabBar role='tablist' aria-label={labels.title}>
						<SubTabButton
							type='button'
							role='tab'
							aria-selected={activeTab === "stock"}
							$active={activeTab === "stock"}
							onClick={() => switchActiveTab("stock")}
						>
							<span>{labels.stockTab}</span>
							<Tag color={activeTab === "stock" ? "green" : "default"}>
								{inventoryRows.length}
							</Tag>
						</SubTabButton>
						<SubTabButton
							type='button'
							role='tab'
							aria-selected={activeTab === "pricing"}
							$active={activeTab === "pricing"}
							onClick={() => switchActiveTab("pricing")}
						>
							<span>{labels.pricingTab}</span>
							<Tag color={activeTab === "pricing" ? "purple" : "default"}>
								{selectedPricingRows.length}
							</Tag>
						</SubTabButton>
					</SubTabBar>

					<AgentToolbar>
						<label>
							<span>{labels.agent}</span>
							<Select
								showSearch
								value={selectedAgentId || undefined}
								placeholder={labels.chooseAgent}
								onChange={setSelectedAgentId}
								onSearch={setAgentSearch}
								filterOption={false}
								loading={agentLoading}
								options={agentOptions}
								notFoundContent={labels.noAgents}
								optionFilterProp='label'
								getPopupContainer={(node) =>
									node?.parentElement || document.body
								}
							/>
						</label>
						<MetaStrip>
							<Tag color='blue'>
								{labels.stockRows}: {inventoryRows.length}
							</Tag>
							<Tag color='geekblue'>
								{labels.priceDays}: {selectedPricingRows.length}
							</Tag>
							{!selectedPricingRows.length && selectedAgentId ? (
								<Tag color='cyan'>{labels.fallback}</Tag>
							) : null}
						</MetaStrip>
						<Button
							icon={<SyncOutlined spin={agentLoading} />}
							onClick={() => loadAgents(agentSearch)}
						>
							{labels.refresh}
						</Button>
					</AgentToolbar>

					{activeTab === "stock" ? (
						<StockWorkspace>
							<EditorPanel>
								<PanelHeader>
									<strong>{labels.stockSetup}</strong>
									<Tag color='green'>
										{selectedAgent ? agentLabel(selectedAgent) : labels.chooseAgent}
									</Tag>
								</PanelHeader>
								<InlineFields $columns={2}>
									<label>
										<span>{labels.stock}</span>
										<InputNumber
											min={0}
											precision={0}
											value={stock}
											onChange={(value) => setStock(value ?? 0)}
										/>
									</label>
									<Button
										type='primary'
										icon={<SaveOutlined />}
										loading={stockSaving}
										onClick={saveStock}
									>
										{labels.saveStock}
									</Button>
								</InlineFields>
							</EditorPanel>
							<TablePanel>
								<PanelHeader>
									<strong>{labels.assignedStock}</strong>
									<Tag color='blue'>{inventoryRows.length}</Tag>
								</PanelHeader>
								<Table
									size='small'
									rowKey={(row) => normalizeId(row.agentId)}
									columns={stockColumns}
									dataSource={inventoryRows}
									pagination={
										inventoryRows.length > 8
											? { pageSize: 8, showSizeChanger: false }
											: false
									}
									scroll={{ x: 560 }}
								/>
							</TablePanel>
						</StockWorkspace>
					) : (
						<PanelGrid>
							<EditorPanel>
								<PanelHeader>
									<strong>{labels.pricingSetup}</strong>
									<Tag color='purple'>
										{selectedAgent ? agentLabel(selectedAgent) : labels.chooseAgent}
									</Tag>
								</PanelHeader>
								<InlineFields $columns={5}>
									<label>
										<span>{labels.dateRange}</span>
										<RangePicker
											value={dateRange?.length ? dateRange : null}
											onChange={(value) => setDateRange(value || [])}
											getPopupContainer={(node) =>
												node?.parentElement || document.body
											}
										/>
									</label>
									<BlockToggleField>
										<span>{labels.blockRange}</span>
										<Switch
											checked={blockPricingRange}
											onChange={(checked) => {
												setBlockPricingRange(checked);
												if (checked) {
													setPrice(null);
													setRootPrice(null);
												}
											}}
										/>
									</BlockToggleField>
									<label>
										<span>{labels.price}</span>
										<InputNumber
											min={0}
											value={price}
											disabled={blockPricingRange}
											onChange={setPrice}
										/>
									</label>
									<label>
										<span>{labels.rootPrice}</span>
										<InputNumber
											min={0}
											value={rootPrice}
											disabled={blockPricingRange}
											onChange={setRootPrice}
										/>
									</label>
									<Button
										type='primary'
										icon={<SaveOutlined />}
										loading={pricingSaving}
										onClick={savePricing}
									>
										{blockPricingRange ? labels.saveBlock : labels.savePricing}
									</Button>
								</InlineFields>
							</EditorPanel>
							<PricingWorkspace>
								<AgentCalendar>
									<PanelHeader>
										<strong>{labels.pricingSetup}</strong>
										<Tag color='geekblue'>{selectedPricingRows.length}</Tag>
									</PanelHeader>
									<FullCalendar
										ref={calendarRef}
										plugins={[dayGridPlugin, interactionPlugin]}
										initialView='dayGridMonth'
										events={calendarEvents}
										selectable
										selectMirror
										unselectAuto={false}
										selectLongPressDelay={140}
										select={handleCalendarSelect}
										eventContent={renderCalendarEventContent}
										height='auto'
										headerToolbar={{
											left: "prev,next today",
											center: "title",
											right: "dayGridMonth",
										}}
									/>
								</AgentCalendar>
								<TablePanel>
									<PanelHeader>
										<strong>{labels.assignedPricing}</strong>
										<Tag color='blue'>{selectedPricingRows.length}</Tag>
									</PanelHeader>
									<Table
										size='small'
										rowKey={(row) =>
											`${normalizeId(row.agentId)}-${dateKey(row.calendarDate)}`
										}
										columns={pricingColumns}
										dataSource={selectedPricingRows}
										pagination={
											selectedPricingRows.length > 8
												? { pageSize: 8, showSizeChanger: false }
												: false
										}
										scroll={{ x: 620 }}
									/>
								</TablePanel>
							</PricingWorkspace>
						</PanelGrid>
					)}
				</AgentModalBody>
			</Modal>
		</>
	);
};

export default ZAgentRoomOverridesButton;

const AgentOverridesTrigger = styled(Button)`
	&& {
		height: 42px;
		min-width: 220px;
		padding: 0 22px;
		border: 1px solid rgba(8, 112, 71, 0.28);
		border-radius: 999px;
		background: linear-gradient(135deg, #0f5132 0%, #087047 100%);
		color: #ffffff !important;
		font-weight: 900;
		letter-spacing: 0;
		box-shadow: 0 10px 22px rgba(8, 112, 71, 0.22);
	}

	&& > span,
	&& .ant-btn-icon,
	&& .anticon {
		color: #ffffff !important;
	}

	&&:hover,
	&&:focus {
		border-color: rgba(8, 112, 71, 0.42);
		background: linear-gradient(135deg, #0b3f2a 0%, #0b7f52 100%);
		color: #ffffff !important;
		transform: translateY(-1px);
	}

	.anticon {
		font-size: 1rem;
	}
`;

const ModalTitle = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	direction: ${({ $isArabic }) => ($isArabic ? "rtl" : "ltr")};

	.title-icon {
		display: inline-grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 12px;
		background: linear-gradient(135deg, #4b0f59, #0f5132);
		color: #ffffff;
		box-shadow: 0 8px 18px rgba(75, 15, 89, 0.22);
	}

	span:last-child {
		display: grid;
		gap: 2px;
	}

	strong {
		font-size: 1rem;
		color: #101828;
	}

	small {
		max-width: min(72vw, 900px);
		overflow: hidden;
		color: #53657d;
		font-size: 0.82rem;
		font-weight: 800;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
`;

const AgentModalBody = styled.div`
	display: grid;
	gap: 16px;
	padding-top: 14px;
	align-content: start;
	grid-auto-rows: max-content;
`;

const SubTabBar = styled.div`
	display: inline-flex;
	align-items: center;
	gap: 8px;
	width: fit-content;
	margin: 4px 0 2px;
	padding: 6px;
	border: 1px solid #d7e7f8;
	border-radius: 14px;
	background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);

	@media (max-width: 640px) {
		display: grid;
		width: 100%;
	}
`;

const SubTabButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-width: 132px;
	min-height: 38px;
	padding: 8px 14px;
	border: 1px solid
		${({ $active }) => ($active ? "rgba(75, 15, 89, 0.32)" : "transparent")};
	border-radius: 10px;
	background: ${({ $active }) =>
		$active
			? "linear-gradient(135deg, #4b0f59 0%, #0f5132 100%)"
			: "transparent"};
	color: ${({ $active }) => ($active ? "#ffffff" : "#334155")};
	cursor: pointer;
	font-weight: 950;
	letter-spacing: 0;
	transition: all 0.18s ease;

	span {
		line-height: 1;
	}

	.ant-tag {
		margin-inline-end: 0;
		font-weight: 900;
	}

	&:hover,
	&:focus {
		background: ${({ $active }) =>
			$active
				? "linear-gradient(135deg, #4b0f59 0%, #0f5132 100%)"
				: "#eef7ff"};
		color: ${({ $active }) => ($active ? "#ffffff" : "#102f50")};
		outline: none;
	}
`;

const AgentToolbar = styled.div`
	display: grid;
	grid-template-columns: minmax(360px, 1fr) auto auto;
	gap: 12px;
	align-items: end;
	padding: 16px;
	border: 1px solid #d7e7f8;
	border-radius: 14px;
	background:
		linear-gradient(135deg, rgba(248, 251, 255, 0.98), rgba(255, 255, 255, 0.98)),
		linear-gradient(90deg, rgba(75, 15, 89, 0.08), rgba(8, 112, 71, 0.08));
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);

	label {
		display: grid;
		gap: 6px;
		font-weight: 800;
		color: #1f3349;
	}

	.ant-select,
	button {
		width: 100%;
	}

	.ant-select-selector,
	button {
		min-height: 38px;
		border-radius: 9px !important;
	}

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const MetaStrip = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	min-height: 32px;
`;

const PanelGrid = styled.div`
	display: grid;
	gap: 16px;
	padding: 16px;
	border: 1px solid #d7e7f8;
	border-radius: 14px;
	background: #fbfdff;
`;

const StockWorkspace = styled.div`
	display: grid;
	grid-template-columns: minmax(240px, 340px) minmax(0, 1fr);
	gap: 14px;
	align-items: start;

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const PricingWorkspace = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
	gap: 14px;
	align-items: start;

	@media (max-width: 1040px) {
		grid-template-columns: 1fr;
	}
`;

const EditorPanel = styled.div`
	display: grid;
	gap: 14px;
	border: 1px solid #d7e7f8;
	border-radius: 14px;
	padding: 16px;
	background: #ffffff;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
`;

const TablePanel = styled.div`
	display: grid;
	gap: 12px;
	min-width: 0;
	padding: 14px;
	border: 1px solid #d7e7f8;
	border-radius: 14px;
	background: #ffffff;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);

	.ant-table-wrapper {
		border: 1px solid #d7e7f8;
		border-radius: 14px;
		overflow: hidden;
		background: #ffffff;
	}

	.ant-table-thead > tr > th {
		background: linear-gradient(180deg, #214c79 0%, #102f50 100%) !important;
		color: #ffffff !important;
		font-weight: 900 !important;
		border-color: rgba(255, 255, 255, 0.18) !important;
	}

	.ant-table-tbody > tr > td {
		font-weight: 700;
	}

	.ant-empty-description {
		font-weight: 800;
	}
`;

const PanelHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	min-height: 30px;

	strong {
		color: #102f50;
		font-size: 0.92rem;
		font-weight: 950;
	}

	.ant-tag {
		max-width: 70%;
		margin-inline-end: 0;
		overflow: hidden;
		font-weight: 900;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 720px) {
		align-items: flex-start;
		flex-direction: column;

		.ant-tag {
			max-width: 100%;
		}
	}
`;

const InlineFields = styled.div`
	display: grid;
	grid-template-columns: repeat(${({ $columns }) => $columns || 4}, minmax(0, 1fr));
	gap: 12px;
	align-items: end;

	label {
		display: grid;
		gap: 6px;
		font-weight: 800;
		color: #1f3349;
	}

	.ant-picker,
	.ant-input-number,
	button {
		width: 100%;
	}

	.ant-picker,
	.ant-input-number {
		min-height: 38px;
		border-radius: 9px;
	}

	button.ant-btn-primary {
		min-height: 38px;
		border-color: #4b0f59;
		border-radius: 9px;
		background: linear-gradient(135deg, #4b0f59, #6f1f82);
		font-weight: 900;
		box-shadow: 0 8px 18px rgba(75, 15, 89, 0.2);
	}

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const BlockToggleField = styled.label`
	display: grid;
	gap: 6px;
	align-content: end;
	min-height: 38px;
	padding: 8px 10px;
	border: 1px solid #f1c5c5;
	border-radius: 10px;
	background: #fff7f7;

	span {
		color: #7f1d1d;
		font-weight: 900;
	}

	.ant-switch {
		width: 54px !important;
	}
`;

const AgentCalendar = styled.div`
	display: grid;
	gap: 12px;
	min-width: 0;
	border: 1px solid #d7e7f8;
	border-radius: 14px;
	padding: 12px;
	overflow: hidden;
	background: #ffffff;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);

	.fc .fc-toolbar {
		gap: 8px;
		flex-wrap: wrap;
	}

	.fc .fc-toolbar-title {
		font-size: 1rem;
		font-weight: 900;
	}

	.fc .fc-button {
		border: 0;
		border-radius: 8px;
		background: #1f3349;
		font-weight: 900;
		text-transform: none;
	}

	.fc .fc-col-header-cell {
		background: linear-gradient(180deg, #214c79 0%, #102f50 100%);
		color: #ffffff;
	}

	.fc .fc-daygrid-day {
		cursor: crosshair;
	}

	.fc .fc-daygrid-day-frame {
		min-height: 74px;
	}

	.fc .fc-highlight {
		background: rgba(8, 112, 71, 0.18);
	}

	.fc .agent-selected-pricing-range {
		background: rgba(14, 165, 233, 0.2) !important;
	}

	.fc .agent-calendar-blocked {
		border-color: #111827 !important;
		background: #111827 !important;
	}

	.fc .agent-calendar-price,
	.fc .agent-calendar-blocked {
		min-height: 34px;
	}

	.fc .agent-calendar-price .fc-event-main,
	.fc .agent-calendar-blocked .fc-event-main {
		display: grid;
		align-items: center;
		padding: 3px 4px;
	}

	.agent-calendar-price-lines {
		display: grid;
		gap: 2px;
		width: 100%;
		overflow: hidden;
		line-height: 1.15;
		text-align: center;
	}

	.agent-calendar-price-lines span,
	.agent-calendar-blocked-label {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fc-event {
		border-radius: 6px;
		font-size: 0.72rem;
		font-weight: 900;
	}
`;
