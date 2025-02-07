import React, { useState, useEffect } from "react";
import { Modal, Table, Button, InputNumber, message } from "antd";

/**
 * Safely parse float; if invalid, return fallback.
 */
const safeParseFloat = (val, fallback = 0) => {
	const parsed = parseFloat(val);
	return isNaN(parsed) ? fallback : parsed;
};

/**
 * Convert the "commissionRate" stored in each day (which might be 10 or 0.1)
 * into a decimal fraction (e.g. 0.1). If it's <= 1, assume it's already decimal. If > 1, divide by 100.
 */
const toDecimalCommission = (commissionRateValue) => {
	const raw = safeParseFloat(commissionRateValue, 10);
	return raw > 1 ? raw / 100 : raw;
};

const EditPricingModal = ({ visible, onClose, pricingByDay, onUpdate }) => {
	const [editableData, setEditableData] = useState([]);
	const [distributeTotalValue, setDistributeTotalValue] = useState("");

	// Initialize from incoming pricingByDay whenever modal becomes visible
	useEffect(() => {
		if (visible) {
			const initialData = (pricingByDay || []).map((row) => {
				const price = safeParseFloat(row.price, 0);
				const rootPrice = safeParseFloat(row.rootPrice, 0);
				// Commission rate can be 10 => means 10%, or 0.1 => also means 10%
				const commissionRate = safeParseFloat(row.commissionRate, 10);
				const commRateDecimal = toDecimalCommission(commissionRate);

				// totalPriceWithCommission fallback if missing
				const totalWithComm =
					row.totalPriceWithCommission || price + rootPrice * commRateDecimal;

				return {
					...row,
					price,
					rootPrice,
					commissionRate, // We store the "raw" (10 or 0.1)
					totalPriceWithCommission: totalWithComm,
				};
			});

			setEditableData(initialData);
			setDistributeTotalValue("");
		}
	}, [visible, pricingByDay]);

	/**
	 * Called whenever user manually edits a row's price/rootPrice/commissionRate
	 */
	const handleInputChange = (val, rowIndex, field) => {
		const newData = [...editableData];
		newData[rowIndex][field] = val;

		if (
			["price", "rootPrice", "commissionRate"].includes(field) &&
			newData[rowIndex].price != null &&
			newData[rowIndex].rootPrice != null &&
			newData[rowIndex].commissionRate != null
		) {
			const commDecimal = toDecimalCommission(newData[rowIndex].commissionRate);
			const p = safeParseFloat(newData[rowIndex].price, 0);
			const r = safeParseFloat(newData[rowIndex].rootPrice, 0);
			// Recompute daily total
			newData[rowIndex].totalPriceWithCommission = p + r * commDecimal;
		}

		setEditableData(newData);
		onUpdate(newData); // If immediate updates are desired in the parent
	};

	/**
	 * Copies the first row's [price, rootPrice, commissionRate] into every row
	 */
	const handleInherit = () => {
		if (!editableData.length) return;

		const first = editableData[0];
		if (
			first.price == null ||
			first.rootPrice == null ||
			first.commissionRate == null
		) {
			message.error("First row must have valid values to inherit.");
			return;
		}

		const commDecimal = toDecimalCommission(first.commissionRate);
		const newData = editableData.map((row, idx) => {
			const price = safeParseFloat(first.price, 0);
			const rootPrice = safeParseFloat(first.rootPrice, 0);
			const totalWithComm = price + rootPrice * commDecimal;
			return {
				...row,
				price,
				rootPrice,
				commissionRate: first.commissionRate, // keep raw
				totalPriceWithCommission: totalWithComm,
			};
		});

		setEditableData(newData);
		onUpdate(newData);
		message.success("Values inherited successfully.");
	};

	/**
	 * Distribute `distributeTotalValue` across all days so that:
	 *   - dayTotal = dayShare
	 *   - rootPrice = price
	 *   - dayShare = price + rootPrice * commDecimal = price + price * commDecimal = price * (1 + commDecimal)
	 *   => price = dayShare / (1 + commDecimal)
	 *   => rootPrice = price
	 */
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

		const dayCount = editableData.length;
		const totalCents = Math.round(total * 100);

		let sumSoFar = 0;
		const newData = [...editableData];

		for (let i = 0; i < dayCount; i++) {
			// This daily chunk in cents. The last day picks up leftover so total is exact.
			let dayCents =
				i < dayCount - 1
					? Math.round(totalCents / dayCount) // approximate share for first (N-1) days
					: totalCents - sumSoFar; // leftover for the final day

			if (dayCents < 0) dayCents = 0;
			sumSoFar += dayCents;

			const dayShare = dayCents / 100;
			// Commission rate => decimal
			const commDecimal = toDecimalCommission(newData[i].commissionRate);

			// price = dayShare / (1 + commDecimal)
			const rawPrice = dayShare / (1 + commDecimal);
			// rootPrice = price
			const rawRoot = rawPrice;

			// Round to 2 decimals
			const finalPrice = parseFloat(rawPrice.toFixed(2));
			const finalRoot = parseFloat(rawRoot.toFixed(2));

			// totalPriceWithCommission = dayShare
			newData[i] = {
				...newData[i],
				price: finalPrice,
				rootPrice: finalRoot,
				totalPriceWithCommission: parseFloat(dayShare.toFixed(2)),
			};
		}

		setEditableData(newData);
		onUpdate(newData);
		message.success("Distributed total across days with no leftover!");
	};

	/**
	 * Validate and pass final data to parent
	 */
	const handleSave = () => {
		const invalidRow = editableData.find(
			(row) =>
				row.price == null || row.rootPrice == null || row.commissionRate == null
		);
		if (invalidRow) {
			message.error("Please fill in all fields before saving.");
			return;
		}

		onUpdate(editableData);
		onClose();
	};

	// The columns
	const columns = [
		{
			title: "Date",
			dataIndex: "date",
			key: "date",
			render: (val) => <b>{val}</b>,
		},
		{
			title: "Root Price",
			dataIndex: "rootPrice",
			key: "rootPrice",
			render: (value, record, index) => (
				<InputNumber
					value={value}
					min={0}
					step={0.01}
					onChange={(val) => handleInputChange(val, index, "rootPrice")}
				/>
			),
		},
		{
			title: "Price per Day (No Comm.)",
			dataIndex: "price",
			key: "price",
			render: (value, record, index) => (
				<InputNumber
					value={value}
					min={0}
					step={0.01}
					onChange={(val) => handleInputChange(val, index, "price")}
				/>
			),
		},
		{
			title: "Commission Rate (%)",
			dataIndex: "commissionRate",
			key: "commissionRate",
			render: (value, record, index) => (
				<InputNumber
					value={value}
					min={0}
					max={100}
					step={0.1}
					onChange={(val) => handleInputChange(val, index, "commissionRate")}
				/>
			),
		},
		{
			title: "Total Price (With Commission)",
			dataIndex: "totalPriceWithCommission",
			key: "totalPriceWithCommission",
			render: (val) => <span>{Number(val || 0).toFixed(2)}</span>,
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
				summary={(pageData) => {
					const totalWithCommission = pageData.reduce(
						(acc, item) => acc + (item.totalPriceWithCommission || 0),
						0
					);
					return (
						<Table.Summary.Row>
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
