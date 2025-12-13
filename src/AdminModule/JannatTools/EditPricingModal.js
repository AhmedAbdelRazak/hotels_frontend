import React, { useState, useEffect } from "react";
import { Modal, Table, Button, InputNumber, message } from "antd";

const safeParseFloat = (val, fallback = 0) => {
	const parsed = parseFloat(val);
	return isNaN(parsed) ? fallback : parsed;
};

/**
 * Convert the "commissionRate" stored in each day (which might be 10 for 10%)
 * into a decimal fraction (e.g. 0.10). If user enters 10, that means 10%.
 */
const toDecimalCommission = (commissionRateValue) => {
	const raw = safeParseFloat(commissionRateValue, 10);
	return raw > 1 ? raw / 100 : raw; // If user typed 10, that becomes 0.1
};

const EditPricingModal = ({ visible, onClose, pricingByDay, onUpdate }) => {
	const [editableData, setEditableData] = useState([]);
	const [distributeTotalValue, setDistributeTotalValue] = useState("");

	// Whenever the modal opens or the parent changes "pricingByDay",
	// re-initialize local state
	useEffect(() => {
		if (visible) {
			const initialData = (pricingByDay || []).map((row) => {
				const price = safeParseFloat(row.price, 0);
				const rootPrice = safeParseFloat(row.rootPrice, 0);
				const commissionRate = safeParseFloat(row.commissionRate, 10);
				const commRateDecimal = toDecimalCommission(commissionRate);

				// totalPriceWithCommission fallback
				const totalWithComm =
					row.totalPriceWithCommission || price + rootPrice * commRateDecimal;

				return {
					...row,
					price,
					rootPrice,
					commissionRate, // store the "raw" (10 or 0.1)
					totalPriceWithCommission: totalWithComm,
					// **Preserve whatever the parent had; or fallback to price**
					totalPriceWithoutCommission: row.totalPriceWithoutCommission ?? price,
				};
			});
			setEditableData(initialData);
			// We intentionally do NOT reset distributeTotalValue here,
			// so the user can re-try distribution if needed
		}
	}, [visible, pricingByDay]);

	/**
	 * Called whenever user manually edits a row's price / rootPrice / commissionRate
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

			// Recompute daily total with commission
			newData[rowIndex].totalPriceWithCommission = p + r * commDecimal;

			// **Ensure totalPriceWithoutCommission is always the "no comm" portion**:
			newData[rowIndex].totalPriceWithoutCommission = p;
		}

		setEditableData(newData);
		onUpdate(newData);
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
		const price = safeParseFloat(first.price, 0);
		const rootPrice = safeParseFloat(first.rootPrice, 0);

		const newData = editableData.map((row) => {
			const totalWithComm = price + rootPrice * commDecimal;
			return {
				...row,
				price,
				rootPrice,
				commissionRate: first.commissionRate, // keep raw
				totalPriceWithCommission: totalWithComm,
				// **Always set the no-comm portion to "price"**:
				totalPriceWithoutCommission: price,
			};
		});

		setEditableData(newData);
		onUpdate(newData);
		message.success("Values inherited successfully.");
	};

	/**
	 * Distribute `distributeTotalValue` across all days
	 * so total sums up to that amount with no leftover
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
			let dayCents =
				i < dayCount - 1
					? Math.round(totalCents / dayCount)
					: totalCents - sumSoFar;
			if (dayCents < 0) dayCents = 0;
			sumSoFar += dayCents;

			const dayShare = dayCents / 100;
			const commDecimal = toDecimalCommission(newData[i].commissionRate);

			// price = dayShare / (1 + commDecimal)  (if you want rootPrice + commission portion = dayShare)
			// but your logic typically says:
			// total = price + rootPrice * commDecimal
			// If you want "price"= "no-comm portion" and "rootPrice" likewise the hotel portion,
			// you can decide how to interpret dayShare. For simplicity, let's do:
			// dayShare = price + rootPrice * commDecimal
			// => price = dayShare - rootPrice * commDecimal
			// We'll assume rootPrice = price for your layout, but let's keep it consistent.

			// Let's keep your approach simpler: we just treat them equally:
			// We'll do something like splitting half for `price` and half for `rootPrice` for demonstration,
			// or you can do whichever logic best suits your real scenario.

			// For example, if you want 100% of "price" to show up in totalPriceWithoutCommission,
			// then let's do the old approach:
			// price = dayShare / (1 + commDecimal)
			// rootPrice = price
			const rawPrice = dayShare / (1 + commDecimal);
			const rawRoot = rawPrice;
			const finalPrice = parseFloat(rawPrice.toFixed(2));
			const finalRoot = parseFloat(rawRoot.toFixed(2));

			newData[i] = {
				...newData[i],
				price: finalPrice,
				rootPrice: finalRoot,
				totalPriceWithCommission: parseFloat(dayShare.toFixed(2)),
				// **Again, store the no-comm portion**:
				totalPriceWithoutCommission: finalPrice,
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
			zIndex={25000}
			styles={{
				mask: { zIndex: 24999 },
			}}
			rootClassName='edit-pricing-modal'
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
