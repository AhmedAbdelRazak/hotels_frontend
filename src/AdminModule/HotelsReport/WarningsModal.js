import React from "react";
import { Modal, Table, Tag } from "antd";

const columns = [
	{
		title: "Status",
		dataIndex: "status",
		key: "status",
		render: (val) => <Tag color='red'>{val || "Overbooked"}</Tag>,
		width: 110,
	},
	{
		title: "Date",
		dataIndex: "date",
		key: "date",
		width: 120,
	},
	{
		title: "Room",
		dataIndex: "roomType",
		key: "roomType",
	},
	{
		title: "Booked",
		dataIndex: "booked",
		key: "booked",
		width: 90,
	},
	{
		title: "Capacity",
		dataIndex: "capacity",
		key: "capacity",
		width: 90,
	},
];

const WarningsModal = ({ open, onClose, warnings = [], loading }) => {
	const dataSource = (warnings || []).map((w, idx) => ({
		key: `${w.date}-${w.roomType}-${idx}`,
		status: "Overbooked",
		...w,
	}));

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			title='Occupancy Warnings'
			width={700}
			styles={{ body: { paddingTop: 8 } }}
			destroyOnClose
		>
			<Table
				size='small'
				columns={columns}
				dataSource={dataSource}
				loading={loading}
				pagination={{ pageSize: 10 }}
			/>
		</Modal>
	);
};

export default WarningsModal;
