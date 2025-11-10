import React, { forwardRef, useMemo, useState } from "react";
import styled from "styled-components";
import UpdatePDF from "./UpdatePDF"; // Unified editing modal
import { updateSingleReservation } from "../apiAdmin";

/**
 * ReceiptPDF (drop-in)
 * - Click any editable field to open one Update modal.
 * - Supports Not Captured (credit/ debit) as authorized amount (treated as paid until captured).
 * - Validates amounts and updates DB via updateSingleReservation.
 */
const ReceiptPDF = forwardRef(function ReceiptPDF(
	{ reservation, hotelDetails },
	ref
) {
	const [localResv, setLocalResv] = useState(reservation);
	const [updateOpen, setUpdateOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	// ---- helpers ----
	const safeNumber = (value) => {
		const num = Number(value);
		return Number.isNaN(num) ? 0 : num;
	};

	const bookingDate = useMemo(
		() =>
			new Date(
				localResv?.createdAt || reservation?.createdAt || Date.now()
			).toLocaleDateString(),
		[localResv, reservation]
	);

	const hasCardNumber =
		localResv?.customer_details?.cardNumber &&
		localResv.customer_details.cardNumber.trim() !== "";

	const totalAmount = safeNumber(localResv?.total_amount);

	// Treat paid_amount as the online/authorized bucket:
	// - Paid Online -> captured
	// - Not Captured (credit/ debit) -> authorized amount
	const paidAmountAuthorized = safeNumber(localResv?.paid_amount);

	// Onsite paid amount (POS/cash)
	const paidAmountOffline = safeNumber(
		localResv?.payment_details?.onsite_paid_amount
	);

	const paymentStatus = (localResv?.payment || "").toLowerCase();
	const isNotCapturedStatus =
		paymentStatus === "credit/ debit" ||
		paymentStatus === "credit/debit" ||
		paymentStatus === "credit / debit" ||
		paymentStatus === "not captured";

	const totalPaid = paidAmountAuthorized + paidAmountOffline;

	const toCents = (n) => Math.round(Number(n || 0) * 100);

	const isFullyPaid =
		toCents(totalPaid) >= toCents(totalAmount) && totalPaid > 0;

	const isNotPaid = toCents(totalPaid) === 0 && paymentStatus === "not paid";

	const depositPercentage =
		totalAmount > 0 ? ((totalPaid / totalAmount) * 100).toFixed(0) : 0;

	const calculateNights = (checkin, checkout) => {
		const start = new Date(checkin);
		const end = new Date(checkout);
		let nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
		return nights < 1 ? 1 : nights;
	};

	const nights = calculateNights(
		localResv?.checkin_date,
		localResv?.checkout_date
	);

	const openUpdateModal = () => setUpdateOpen(true);

	// Initial values for the Update modal
	const modalInitials = {
		supplierName:
			(localResv?.supplierData && localResv.supplierData.supplierName) ||
			hotelDetails?.belongsTo?.name ||
			"",
		supplierBookingNo:
			(localResv?.supplierData && localResv.supplierData.suppliedBookingNo) ||
			localResv?.confirmation_number ||
			"",
		bookingNo: localResv?.confirmation_number || "",
		bookingSource: localResv?.booking_source || "",
		paymentStatus: (localResv?.payment || "").toLowerCase() || "",

		guestName: localResv?.customer_details?.name || "",
		guestEmail: localResv?.customer_details?.email || "",
		guestPhone: localResv?.customer_details?.phone || "",
		nationality: localResv?.customer_details?.nationality || "",
		passport: localResv?.customer_details?.passport || "",
		reservedBy: localResv?.customer_details?.reservedBy || "",

		// Prefill for Not Captured
		paidAmount: safeNumber(localResv?.paid_amount),
	};

	// Persist changes
	const handleSave = async (vals) => {
		// Build base update payload
		const updateData = {
			supplierData: {
				supplierName: (vals.supplierName || "").trim(),
				suppliedBookingNo: (vals.supplierBookingNo || "").trim(),
			},
			booking_source: (vals.bookingSource || "").trim(),
			payment: (vals.paymentStatus || "").toLowerCase(),
			customerDetails: {
				name: (vals.guestName || "").trim(),
				email: (vals.guestEmail || "").trim(),
				phone: (vals.guestPhone || "").trim(),
				passport: (vals.passport || "").trim(),
				nationality: (vals.nationality || "").trim(),
				reservedBy: (vals.reservedBy || "").trim(),
			},
			// Avoid auto emails from tiny edits; toggle if you like
			sendEmail: false,
		};

		// Apply paid/authorized amounts if provided and valid
		const amount = Number(vals.paidAmount || 0);
		if (
			(vals.paymentStatus === "paid online" ||
				vals.paymentStatus === "paid offline" ||
				vals.paymentStatus === "credit/ debit") &&
			Number.isFinite(amount) &&
			amount >= 0
		) {
			if (vals.paymentStatus === "paid online") {
				updateData.paid_amount = amount;
			} else if (vals.paymentStatus === "paid offline") {
				updateData.payment_details = {
					...(localResv?.payment_details || {}),
					onsite_paid_amount: amount,
				};
			} else if (vals.paymentStatus === "credit/ debit") {
				// Treat as authorized (paid) amount
				updateData.paid_amount = amount;
			}
		}

		setSaving(true);
		try {
			const resp = await updateSingleReservation(localResv._id, updateData);
			const updated = resp?.reservation || resp?.updatedReservation || resp;

			if (updated && updated._id) {
				setLocalResv(updated);
			} else {
				// Merge locally so the PDF reflects changes instantly
				setLocalResv((prev) => ({
					...prev,
					supplierData: updateData.supplierData,
					booking_source: updateData.booking_source,
					payment: updateData.payment,
					paid_amount:
						typeof updateData.paid_amount === "number"
							? updateData.paid_amount
							: prev?.paid_amount,
					payment_details: updateData.payment_details
						? {
								...(prev?.payment_details || {}),
								...updateData.payment_details,
						  }
						: prev?.payment_details,
					customer_details: {
						...prev?.customer_details,
						...updateData.customerDetails,
					},
				}));
			}

			setUpdateOpen(false);
		} finally {
			setSaving(false);
		}
	};

	const Clickable = ({ children, onClick }) => (
		<span
			onClick={onClick}
			style={{
				cursor: "pointer",
			}}
			title='Click to edit'
		>
			{children}
		</span>
	);

	return (
		<ReceiptPDFWrapper ref={ref}>
			{/* Header */}
			<div className='header1'>
				<div className='left'></div>
				<div className='center logo'>
					JANNAT <span>Booking.com</span>
				</div>
				<div className='right'>Booking Receipt</div>
			</div>

			<div className='header2'>
				<div className='hotel-name'>
					Hotel: {hotelDetails?.hotelName || "N/A"}
				</div>
			</div>

			<div className='header3'>
				<div className='booking-info'>
					<div>
						<strong>Booking No:</strong>{" "}
						<Clickable onClick={openUpdateModal}>
							{localResv?.confirmation_number}
							{localResv?.supplierData?.suppliedBookingNo &&
							localResv?.supplierData?.suppliedBookingNo !==
								localResv?.confirmation_number
								? ` / ${localResv?.supplierData?.suppliedBookingNo}`
								: ""}
						</Clickable>
					</div>
					<div>
						<strong>Booking Date:</strong> {bookingDate}
					</div>
				</div>
			</div>

			{/* Guest & Payment Details */}
			<div className='info-boxes'>
				<div className='info-box'>
					<strong>Guest Name</strong>
					<div>
						<Clickable onClick={openUpdateModal}>
							{localResv?.customer_details?.name || "N/A"}
						</Clickable>
					</div>
					<div>
						<Clickable onClick={openUpdateModal}>
							{localResv?.customer_details?.nationality || "N/A"}
						</Clickable>
					</div>
				</div>

				<div className='info-box'>
					<strong>
						{paidAmountOffline > 0
							? "Paid Offline"
							: isFullyPaid
							  ? "Paid Amount"
							  : isNotPaid
							    ? "Not Paid"
							    : isNotCapturedStatus
							      ? "Authorized (Not Captured)"
							      : `${depositPercentage}% Deposit`}
					</strong>

					<div>
						<Clickable onClick={openUpdateModal}>
							{paidAmountOffline > 0 ? (
								<>{Number((totalPaid / totalAmount) * 100).toFixed(2)}%</>
							) : isFullyPaid ? (
								`${totalPaid.toFixed(2)} SAR`
							) : isNotPaid ? (
								"Not Paid"
							) : isNotCapturedStatus ? (
								`${paidAmountAuthorized.toFixed(2)} SAR`
							) : (
								`${depositPercentage}% Deposit`
							)}
						</Clickable>
					</div>
				</div>
			</div>

			{/* Supplier Info */}
			<div className='supplier-info mt-2'>
				<div className='editable-supplier'>
					<strong>Supplied By:</strong>{" "}
					<Clickable onClick={openUpdateModal}>
						{(localResv?.supplierData && localResv.supplierData.supplierName) ||
							hotelDetails?.belongsTo?.name ||
							"N/A"}
					</Clickable>
				</div>
				<div>
					<strong>Supplier Booking No:</strong>{" "}
					<Clickable onClick={openUpdateModal}>
						{(localResv?.supplierData &&
							localResv.supplierData.suppliedBookingNo) ||
							localResv?.confirmation_number ||
							"N/A"}
					</Clickable>
				</div>
			</div>

			{/* Reservation Details */}
			<table className='details-table'>
				<thead>
					<tr>
						<th>Check In</th>
						<th>Check Out</th>
						<th>Booking Status</th>
						<th>Guests</th>
						<th>Booking Source</th>
						<th>Payment Method</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>{new Date(localResv?.checkin_date).toLocaleDateString()}</td>
						<td>{new Date(localResv?.checkout_date).toLocaleDateString()}</td>
						<td>{localResv?.reservation_status || "Confirmed"}</td>
						<td>{localResv?.total_guests}</td>
						<td>
							<Clickable onClick={openUpdateModal}>
								{localResv?.booking_source || "Jannatbooking.com"}
							</Clickable>
						</td>
						<td>
							<Clickable onClick={openUpdateModal}>
								{paidAmountOffline > 0
									? "Paid Offline"
									: isFullyPaid
									  ? "Paid in Full"
									  : isNotPaid
									    ? "Not Paid"
									    : isNotCapturedStatus
									      ? "Authorized (Not Captured)"
									      : `${depositPercentage}% Deposit`}
							</Clickable>
						</td>
					</tr>
				</tbody>
			</table>

			{/* Room Details */}
			<table className='room-details-table'>
				<thead>
					<tr>
						<th>Hotel</th>
						<th>Room Type</th>
						<th>Qty</th>
						<th>Extras</th>
						<th>Nights</th>
						<th>Rate</th>
						<th>Total</th>
					</tr>
				</thead>
				<tbody>
					{localResv?.pickedRoomsType?.map((room, index) => {
						const chosenPrice = safeNumber(room.chosenPrice);
						const firstDay = room.pricingByDay && room.pricingByDay[0];
						const rootPrice = firstDay ? safeNumber(firstDay.rootPrice) : 0;
						const rate = chosenPrice > 0 ? chosenPrice : rootPrice;
						const totalPrice = rate * safeNumber(room.count) * nights;

						return (
							<tr key={index}>
								<td>{hotelDetails?.hotelName || "N/A"}</td>
								<td>{room.displayName || "N/A"}</td>
								<td>{room.count}</td>
								<td>N/T</td>
								<td>{nights}</td>
								<td>{rate > 0 ? `${rate} SAR` : "N/A"}</td>
								<td>
									{totalPrice > 0 ? `${totalPrice.toFixed(2)} SAR` : "N/A"}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>

			{/* Payment Summary */}
			<div className='summary'>
				<div>
					<strong>Net Accommodation Charge:</strong> {totalAmount.toFixed(2)}{" "}
					SAR
				</div>

				{isFullyPaid ? (
					<div>
						<strong>Paid Amount:</strong> {totalPaid.toFixed(2)} SAR
					</div>
				) : paidAmountOffline > 0 && paidAmountAuthorized === 0 ? (
					<div>
						<strong>Paid Amount Onsite:</strong> {paidAmountOffline.toFixed(2)}{" "}
						SAR
					</div>
				) : isNotPaid ? (
					<div>
						<strong>Payment Status:</strong> Not Paid
					</div>
				) : isNotCapturedStatus && paidAmountAuthorized > 0 ? (
					<div>
						<strong>Authorized (Not Captured):</strong>{" "}
						{paidAmountAuthorized.toFixed(2)} SAR
					</div>
				) : paidAmountAuthorized > 0 ? (
					<div>
						<strong>Deposit:</strong> {paidAmountAuthorized.toFixed(2)} SAR
					</div>
				) : null}

				{(() => {
					const remaining = Math.max(
						0,
						Number((totalAmount - totalPaid).toFixed(2))
					);
					return (
						<div>
							<strong>Total To Be Collected:</strong> {remaining.toFixed(2)} SAR
						</div>
					);
				})()}
			</div>

			{/* Footer */}
			<div className='footer'>
				Many Thanks for staying with us at{" "}
				<strong>{hotelDetails?.hotelName || "N/A"}</strong> Hotel.
				<br />
				For better rates next time, please check{" "}
				<a href='https://jannatbooking.com'>jannatbooking.com</a>
			</div>

			{/* Unified Update Modal */}
			<UpdatePDF
				open={updateOpen}
				loading={saving}
				initialValues={modalInitials}
				totalAmount={totalAmount}
				currentPaidOnline={paidAmountAuthorized}
				currentPaidOffline={paidAmountOffline}
				onCancel={() => setUpdateOpen(false)}
				onSave={handleSave}
			/>
		</ReceiptPDFWrapper>
	);
});

export default ReceiptPDF;

/* Styled Components */
const ReceiptPDFWrapper = styled.div`
	font-family: Arial, Helvetica, sans-serif;
	padding: 20px;
	border: 1px solid #ccc;
	max-width: 800px;
	margin: auto;
	text-transform: capitalize;

	.header1 {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 0;
		background-color: #d9d9d9;
	}
	.header1 .left {
		flex: 1;
	}
	.header1 .center {
		flex: 1;
		text-align: center;
	}
	.header1 .right {
		color: #777;
		flex: 1;
		text-align: right;
		font-size: 20px;
		font-weight: bold;
		padding-right: 7px;
		align-self: flex-end;
		padding-top: 35px;
	}

	.header2,
	.header3 {
		text-align: center;
		padding: 8px 0;
	}
	.header2 {
		background-color: rgb(243, 195, 146);
	}
	.header3 {
		background-color: #ccc;
		margin-top: 10px;
	}

	.logo {
		font-size: 32px;
		font-weight: bold;
		color: #777;
	}
	.logo span {
		font-size: 14px;
		color: rgb(241, 131, 21);
	}

	.info-boxes {
		display: flex;
		justify-content: space-between;
		margin-top: 20px;
		gap: 16px;
	}
	.info-box {
		border: 1px solid #000;
		padding: 10px;
		width: 48%;
		text-align: center;
		word-break: break-word;
	}
	.supplier-info .editable-supplier {
		cursor: pointer;
		font-style: italic;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 20px;
	}
	.room-details-table td {
		font-size: 11px;
	}
	th,
	td {
		border: 1px solid #000;
		padding: 8px;
		text-align: center;
	}
	td {
		font-size: 11.5px;
	}
	th {
		background-color: rgb(243, 195, 146);
		color: #fff;
	}

	.summary {
		border: 1px solid #000;
		padding: 10px;
		text-align: right;
	}
	.footer {
		text-align: center;
		margin-top: 30px;
	}

	a {
		color: #007bff;
		text-decoration: none;
	}
`;
