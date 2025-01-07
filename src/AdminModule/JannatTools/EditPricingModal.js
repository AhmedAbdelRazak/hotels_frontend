import React, { useState, useEffect } from "react";
import { Modal, Table, Button, InputNumber, message } from "antd";

const EditPricingModal = ({ visible, onClose, pricingByDay, onUpdate }) => {
	const [editableData, setEditableData] = useState([]);

	// Initialize the editable data with the current `pricingByDay`
	useEffect(() => {
		if (visible) {
			setEditableData(
				pricingByDay.map((row) => ({
					...row,
					price: row.price || 0,
					rootPrice: row.rootPrice || 0,
					commissionRate: row.commissionRate || 0,
					totalPriceWithCommission:
						row.totalPriceWithCommission ||
						Number(row.price || 0) +
							Number(row.rootPrice || 0) *
								(Number(row.commissionRate || 0) / 100),
				}))
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]); // Only reinitialize when modal visibility changes

	// Handle individual input changes
	const handleInputChange = (value, index, field) => {
		const updatedData = [...editableData];
		updatedData[index][field] = value;

		// Recalculate totalPriceWithCommission
		if (
			["price", "rootPrice", "commissionRate"].includes(field) &&
			updatedData[index].price &&
			updatedData[index].rootPrice &&
			updatedData[index].commissionRate
		) {
			updatedData[index].totalPriceWithCommission =
				Number(updatedData[index].price) +
				Number(updatedData[index].rootPrice) *
					(Number(updatedData[index].commissionRate) / 100);
		}

		setEditableData(updatedData);

		// Propagate the updated data to the parent
		onUpdate(updatedData);
	};

	// Handle inheritance of values
	const handleInherit = () => {
		if (editableData.length > 0) {
			const firstRow = editableData[0];
			if (
				firstRow.price == null ||
				firstRow.rootPrice == null ||
				firstRow.commissionRate == null
			) {
				message.error("First row must have valid values to inherit.");
				return;
			}

			const inheritedData = editableData.map((row) => ({
				...row,
				price: firstRow.price,
				rootPrice: firstRow.rootPrice,
				commissionRate: firstRow.commissionRate,
				totalPriceWithCommission:
					Number(firstRow.price) +
					Number(firstRow.rootPrice) * (Number(firstRow.commissionRate) / 100),
			}));

			setEditableData(inheritedData);
			message.success("Values inherited successfully.");
		}
	};

	// Handle save
	const handleSave = () => {
		// Validate that all rows have valid data
		const invalidRow = editableData.find(
			(row) =>
				row.price == null || row.rootPrice == null || row.commissionRate == null
		);

		if (invalidRow) {
			message.error("Please fill in all fields before saving.");
			return;
		}

		console.log("Saving updated pricing data:", editableData); // Debugging

		onUpdate(editableData); // Pass the updated data back to the parent
		onClose();
	};

	// Columns for the table
	const columns = [
		{
			title: "Date",
			dataIndex: "date",
			key: "date",
		},
		{
			title: "Root Price",
			dataIndex: "rootPrice",
			key: "rootPrice",
			render: (value, _, index) => (
				<InputNumber
					value={value}
					min={0}
					onChange={(val) => handleInputChange(val, index, "rootPrice")}
				/>
			),
		},
		{
			title: "Price per Day",
			dataIndex: "price",
			key: "price",
			render: (value, _, index) => (
				<InputNumber
					value={value}
					min={0}
					onChange={(val) => handleInputChange(val, index, "price")}
				/>
			),
		},
		{
			title: "Commission Rate (%)",
			dataIndex: "commissionRate",
			key: "commissionRate",
			render: (value, _, index) => (
				<InputNumber
					value={value}
					min={0}
					max={100}
					onChange={(val) => handleInputChange(val, index, "commissionRate")}
				/>
			),
		},
		{
			title: "Total Price (With Commission)",
			dataIndex: "totalPriceWithCommission",
			key: "totalPriceWithCommission",
			render: (value) => <span>{Number(value).toFixed(2)}</span>,
		},
	];

	return (
		<Modal
			title='Edit Pricing Breakdown'
			open={visible}
			onCancel={onClose}
			width={"65%"}
			footer={[
				<Button key='cancel' onClick={onClose}>
					Cancel
				</Button>,
				<Button key='inherit' onClick={handleInherit} type='dashed'>
					Inherit First Row Values
				</Button>,
				<Button key='save' type='primary' onClick={handleSave}>
					Save
				</Button>,
			]}
		>
			<Table
				dataSource={editableData}
				columns={columns}
				pagination={false}
				rowKey='date'
			/>
		</Modal>
	);
};

export default EditPricingModal;
