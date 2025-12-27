// DateFilterModal.jsx
import React, { useEffect, useState } from "react";
import { Modal, Tabs, DatePicker, Space, Button } from "antd";
import dayjs from "dayjs";

const resolvePopupContainer = (triggerNode) => {
	if (typeof document === "undefined") {
		return triggerNode || null;
	}
	if (!triggerNode) {
		return document.body;
	}
	return triggerNode.closest(".ant-modal, .ant-drawer") || document.body;
};

const TAB_KEYS = {
	CHECKIN: "checkin",
	CHECKOUT: "checkout",
	CREATED: "created",
};

const DateFilterModal = ({
	open,
	onClose,
	onApply,
	onClear,
	initialType = "",
	initialFrom = "",
	initialTo = "",
}) => {
	const [activeTab, setActiveTab] = useState(
		initialType && Object.values(TAB_KEYS).includes(initialType)
			? initialType
			: TAB_KEYS.CHECKIN
	);
	const [fromVal, setFromVal] = useState(
		initialFrom ? dayjs(initialFrom) : null
	);
	const [toVal, setToVal] = useState(initialTo ? dayjs(initialTo) : null);

	// Sync when props change (open each time with current)
	useEffect(() => {
		setActiveTab(
			initialType && Object.values(TAB_KEYS).includes(initialType)
				? initialType
				: TAB_KEYS.CHECKIN
		);
		setFromVal(initialFrom ? dayjs(initialFrom) : null);
		setToVal(initialTo ? dayjs(initialTo) : null);
	}, [initialType, initialFrom, initialTo, open]);

	const handleFromChange = (v) => {
		setFromVal(v);
		if (v && !toVal) {
			setToVal(v); // auto-populate same day
		}
	};
	const handleToChange = (v) => setToVal(v);

	const disabledToDate = (current) => {
		if (!fromVal) return false;
		return current && current.isBefore(fromVal.startOf("day"));
	};

	const apply = () => {
		if (!fromVal) {
			// No dates picked => just close (or you could force selection)
			onClose && onClose();
			return;
		}
		const payload = {
			type: activeTab,
			from: fromVal.format("YYYY-MM-DD"),
			to: (toVal || fromVal).format("YYYY-MM-DD"),
		};
		onApply && onApply(payload);
	};

	const clear = () => {
		onClear && onClear();
	};

	const items = [
		{ key: TAB_KEYS.CHECKIN, label: "Check-In" },
		{ key: TAB_KEYS.CHECKOUT, label: "Check-Out" },
		{ key: TAB_KEYS.CREATED, label: "Reserved At" },
	];

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title='Filter by Date'
			footer={[
				<Button key='clear' onClick={clear}>
					Clear
				</Button>,
				<Button key='cancel' onClick={onClose}>
					Cancel
				</Button>,
				<Button key='apply' type='primary' onClick={apply}>
					Apply
				</Button>,
			]}
		>
			<Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
			<Space direction='vertical' size='middle' style={{ width: "100%" }}>
				<div>
					<div style={{ marginBottom: 6, fontWeight: 600 }}>From</div>
					<DatePicker
						className='w-100'
						format='YYYY-MM-DD'
						value={fromVal}
						onChange={handleFromChange}
						getPopupContainer={resolvePopupContainer}
					/>
				</div>
				<div>
					<div style={{ marginBottom: 6, fontWeight: 600 }}>To</div>
					<DatePicker
						className='w-100'
						format='YYYY-MM-DD'
						value={toVal}
						onChange={handleToChange}
						disabledDate={disabledToDate}
						getPopupContainer={resolvePopupContainer}
					/>
				</div>
			</Space>
		</Modal>
	);
};

export default DateFilterModal;
