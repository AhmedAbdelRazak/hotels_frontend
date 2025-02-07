import React, { useState, useEffect } from "react";
import { Modal, Table, Button, InputNumber, message } from "antd";

/**
 * A safe parse float function.
 * If val is not parseable, returns fallback.
 */
const safeParseFloat = (val, fallback = 0) => {
	const parsed = parseFloat(val);
	return isNaN(parsed) ? fallback : parsed;
};

const EditPricingModal = ({ visible, onClose, pricingByDay, onUpdate }) => {
	const [editableData, setEditableData] = useState([]);
	const [distributeTotalValue, setDistributeTotalValue] = useState("");

	// Initialize the editable data with the current `pricingByDay`
	useEffect(() => {
		if (visible) {
			setEditableData(
				(pricingByDay || []).map((row) => {
					const price = safeParseFloat(row.price, 0);
					const rootPrice = safeParseFloat(row.rootPrice, 0);
					const commissionRate = safeParseFloat(row.commissionRate, 10); // default 10% if missing
					const totalWithComm =
						row.totalPriceWithCommission ||
						price + rootPrice * (commissionRate / 100);

					return {
						...row,
						price,
						rootPrice,
						commissionRate,
						totalPriceWithCommission: totalWithComm,
					};
				})
			);
			setDistributeTotalValue(""); // Reset the distribute field each time we open
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

	// Handle individual input changes in the table
	const handleInputChange = (value, index, field) => {
		const updatedData = [...editableData];
		updatedData[index][field] = value;

		// Recalculate totalPriceWithCommission if user edits price/rootPrice/commissionRate
		if (
			["price", "rootPrice", "commissionRate"].includes(field) &&
			updatedData[index].price != null &&
			updatedData[index].rootPrice != null &&
			updatedData[index].commissionRate != null
		) {
			const { price, rootPrice, commissionRate } = updatedData[index];
			updatedData[index].totalPriceWithCommission =
				Number(price) + Number(rootPrice) * (Number(commissionRate) / 100);
		}

		setEditableData(updatedData);
		// If you want immediate reflection in parent, you can call onUpdate here:
		onUpdate(updatedData);
	};

	// Handle inheritance of first row's values
	const handleInherit = () => {
		if (editableData.length === 0) return;

		const firstRow = editableData[0];
		if (
			firstRow.price == null ||
			firstRow.rootPrice == null ||
			firstRow.commissionRate == null
		) {
			message.error("First row must have valid values to inherit.");
			return;
		}

		const { price, rootPrice, commissionRate } = firstRow;
		const newData = editableData.map((row) => ({
			...row,
			price,
			rootPrice,
			commissionRate,
			totalPriceWithCommission:
				Number(price) + Number(rootPrice) * (Number(commissionRate) / 100),
		}));

		setEditableData(newData);
		message.success("Values inherited successfully.");
		onUpdate(newData);
	};

	// Distribute a total across all days
	const handleDistributeTotal = () => {
		const total = safeParseFloat(distributeTotalValue, 0);
		if (total <= 0) {
			message.error("Please enter a valid total amount.");
			return;
		}
		if (!editableData.length) {
			message.error("No days available to distribute over.");
			return;
		}

		const numberOfDays = editableData.length;
		const dailyShare = total / numberOfDays;

		// For each day:
		//   totalPriceWithCommission = dailyShare
		//   dailyShare = price + (rootPrice * commissionRate/100)
		// We pick a ratio so that rootPrice < price. For example:
		//   rootPrice = dailyShare * 0.3
		//   price = dailyShare - (rootPrice * commissionRate)
		// Adjust this formula to your business logic as needed
		const newData = editableData.map((day) => {
			const usedCommissionRate = safeParseFloat(day.commissionRate, 10) / 100; // default 10%
			const newTotal = dailyShare;
			const newRoot = newTotal * 0.85; // e.g. 30% of dailyShare
			// price = dailyShare - (rootPrice * commRate)
			const newPrice = newTotal - newRoot * usedCommissionRate;

			return {
				...day,
				rootPrice: parseFloat(newRoot.toFixed(2)),
				price: parseFloat(newPrice.toFixed(2)),
				totalPriceWithCommission: parseFloat(newTotal.toFixed(2)),
			};
		});

		setEditableData(newData);
		onUpdate(newData);
		message.success("Distributed total across all days!");
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

		console.log("Saving updated pricing data:", editableData);
		onUpdate(editableData); // Pass the updated data back to the parent
		onClose();
	};

	// Columns for the table
	const columns = [
		{
			title: "Date",
			dataIndex: "date",
			key: "date",
			render: (value) => <b>{value}</b>,
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
			title: "Price per Day (No Comm.)",
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
			render: (value) => <span>{Number(value || 0).toFixed(2)}</span>,
		},
	];

	return (
		<Modal
			title='Edit Pricing Breakdown'
			open={visible}
			onCancel={onClose}
			width='65%'
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
			{/* Distribute Total UI */}
			<div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
				<InputNumber
					placeholder='Enter total to distribute'
					style={{ width: 200 }}
					value={distributeTotalValue}
					onChange={(val) => setDistributeTotalValue(val)}
				/>
				<Button onClick={handleDistributeTotal} type='dashed'>
					Distribute Total
				</Button>
			</div>

			<Table
				dataSource={editableData}
				columns={columns}
				pagination={false}
				rowKey='date'
				// ----- ADD A SUMMARY ROW -----
				summary={(pageData) => {
					const totalWithCommission = pageData.reduce(
						(acc, item) => acc + (item.totalPriceWithCommission || 0),
						0
					);
					return (
						<Table.Summary.Row>
							{/* Combine the first 4 columns into one cell */}
							<Table.Summary.Cell colSpan={4} align='right'>
								<b>Total (With Commission) for All Days:</b>
							</Table.Summary.Cell>
							<Table.Summary.Cell>
								<b>{Number(totalWithCommission).toFixed(2)}</b>
							</Table.Summary.Cell>
						</Table.Summary.Row>
					);
				}}
			/>
		</Modal>
	);
};

export default EditPricingModal;
