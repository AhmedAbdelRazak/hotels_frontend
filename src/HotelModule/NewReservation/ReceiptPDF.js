import { Input, Modal } from "antd";
import React, { forwardRef, useState } from "react";
import styled from "styled-components";
import { updateSingleReservation } from "../apiAdmin";
import OfficialReceipt from "../../components/OfficialReceipt/OfficialReceipt";
import ReceiptViewport from "../../components/OfficialReceipt/ReceiptViewport";
import {
	getReceiptPricingDisplay,
} from "../../AdminModule/AllReservation/receiptPricingDisplay";
import { buildReceiptSupplierUpdatePayload } from "../../AdminModule/AllReservation/hotelRunnerPricingEditPolicy";

const PDF_CHILD_MODAL_Z = 60010;
const pdfChildModalProps = {
	getContainer: () => document.body,
	rootClassName: "update-pdf-modal",
	wrapClassName: "update-pdf-modal",
	zIndex: PDF_CHILD_MODAL_Z,
	styles: { mask: { zIndex: PDF_CHILD_MODAL_Z - 1 } },
};

const ReceiptPDF = forwardRef(
	(
		{
			reservation,
			hotelDetails,
			calculateReservationPeriod,
			getTotalAmountPerDay,
		},
		ref
	) => {
		const bookingDate = new Date(reservation?.createdAt).toLocaleDateString();

		const [supplierName, setSupplierName] = useState(
			(reservation?.supplierData && reservation.supplierData.supplierName) ||
				hotelDetails?.belongsTo?.name ||
				"N/A"
		);
		// State for the editable supplier booking no in supplier-info
		const [supplierBookingNo, setSupplierBookingNo] = useState(
			(reservation?.supplierData &&
				reservation.supplierData.suppliedBookingNo) ||
				reservation?.confirmation_number ||
				"N/A"
		);
		const [isModalVisible, setIsModalVisible] = useState(false);
		const [tempSupplierName, setTempSupplierName] = useState(supplierName);
		// New state and modal flag for editing Supplier Booking No
		const [isBookingNoModalVisible, setIsBookingNoModalVisible] =
			useState(false);
		const [tempSupplierBookingNo, setTempSupplierBookingNo] =
			useState(supplierBookingNo);

		// Calculate the number of nights between check-in and check-out
		const calculateNights = (checkin, checkout) => {
			const start = new Date(checkin);
			const end = new Date(checkout);
			let nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
			return nights < 1 ? 1 : nights;
		};

		// Calculate nights once (assuming all room bookings have same checkin/checkout)
		const nights = calculateNights(
			reservation?.checkin_date,
			reservation?.checkout_date
		);

		// Utility function to safely parse numbers and handle NaN
		const safeNumber = (value) => {
			const num = Number(value);
			return isNaN(num) ? 0 : num;
		};
		const receiptPricing = getReceiptPricingDisplay(
			reservation,
			safeNumber(reservation?.total_amount),
		);
		const totalAmount = receiptPricing.amount;
		const totalAmountAvailable = receiptPricing.available === true;

		const paidAmount = safeNumber(reservation.paid_amount);

		// --- NEW Logic For Final Deposit & Deposit Percentage ---
		// If user has a card, deposit = paid_amount, depositPercentage = (paid_amount / total_amount)*100
		// Otherwise, if user has no card, we consider it 0 or "Not Paid".
		const hasCardNumber =
			reservation?.customer_details?.cardNumber &&
			reservation.customer_details.cardNumber.trim() !== "";

		const finalDeposit = hasCardNumber ? paidAmount : 0;

		const depositPercentage =
			totalAmountAvailable && hasCardNumber && totalAmount !== 0
				? ((finalDeposit / totalAmount) * 100).toFixed(0)
				: null;
		// -------------------------------------------------------

		const isNotPaid = reservation.payment === "not paid" || !hasCardNumber;

		const isFullyPaid = totalAmountAvailable &&
			safeNumber(reservation.paid_amount).toFixed(0) ===
			totalAmount.toFixed(0);

		// Handle Modal actions for Supplier Name
		const showModal = () => {
			setTempSupplierName(supplierName); // Set the temp state when modal opens
			setIsModalVisible(true);
		};

		const handleOk = () => {
			setSupplierName(tempSupplierName);
			setIsModalVisible(false);
			// Update reservation with new supplierData; sendEmail is always false
			const updateData = buildReceiptSupplierUpdatePayload({
				supplierName: tempSupplierName,
			});
			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
				}
			});
		};

		const handleCancel = () => {
			setIsModalVisible(false);
		};

		// Handle modal actions for Supplier Booking No
		const showBookingNoModal = () => {
			setTempSupplierBookingNo(supplierBookingNo);
			setIsBookingNoModalVisible(true);
		};

		const handleBookingNoOk = () => {
			setSupplierBookingNo(tempSupplierBookingNo);
			setIsBookingNoModalVisible(false);
			// Update reservation with new supplierData; sendEmail is always false
			const updateData = buildReceiptSupplierUpdatePayload({
				suppliedBookingNo: tempSupplierBookingNo,
			});
			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
				}
			});
		};

		const handleBookingNoCancel = () => {
			setIsBookingNoModalVisible(false);
		};

		const receiptReservation = {
			...reservation,
			supplierData: {
				...(reservation?.supplierData || {}),
				supplierName,
				suppliedBookingNo: supplierBookingNo,
			},
		};

		return (
			<>
				<ReceiptViewport>
					<OfficialReceipt
						ref={ref}
						reservation={receiptReservation}
						hotelDetails={hotelDetails}
						onSupplierNameClick={showModal}
						onSupplierBookingNoClick={showBookingNoModal}
					/>
				</ReceiptViewport>
				<ReceiptPDFWrapper style={{ display: "none" }} aria-hidden='true'>
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
						Hotel: {hotelDetails && hotelDetails.hotelName}
					</div>
				</div>

				<div className='header3'>
					<div className='booking-info'>
						<div>
							<strong>Booking No:</strong>{" "}
							{reservation && reservation.confirmation_number}{" "}
							{reservation &&
							reservation.confirmation_number === supplierBookingNo
								? null
								: `/ ${supplierBookingNo}`}
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
						<div>{reservation?.customer_details?.name || "N/A"}</div>
						<div>{reservation?.customer_details?.nationality || "N/A"}</div>
					</div>
					<div className='info-box'>
						<strong>
							{reservation?.payment_details?.onsite_paid_amount &&
							reservation?.payment_details?.onsite_paid_amount > 0
								? "Paid Offline"
								: isFullyPaid
								  ? "Paid Amount"
								  : isNotPaid
								    ? "Not Paid"
								    : totalAmountAvailable
								      ? `${depositPercentage}% Deposit`
								      : "Total unavailable"}
						</strong>
						<div>
							{reservation?.payment_details?.onsite_paid_amount &&
							reservation?.payment_details?.onsite_paid_amount > 0 ? (
								<>
									{totalAmountAvailable
										? `${Number(
												(reservation?.payment_details?.onsite_paid_amount /
													totalAmount) *
													100,
											).toFixed(2)}%`
										: "Total unavailable"}
								</>
							) : isFullyPaid ? (
								`${paidAmount.toFixed(2)} ${receiptPricing.currency}`
							) : isNotPaid ? (
								"Not Paid"
							) : (
								totalAmountAvailable
									? `${depositPercentage}% Deposit`
									: "Total unavailable"
							)}
						</div>
					</div>
				</div>

				{/* Supplier Info */}
				<div className='supplier-info mt-2'>
					<div onClick={showModal} className='editable-supplier'>
						<strong>Supplied By:</strong> {supplierName}
					</div>
					<div>
						<strong>Supplier Booking No:</strong>{" "}
						<span onClick={showBookingNoModal} style={{ cursor: "pointer" }}>
							{supplierBookingNo}
						</span>
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
							<td>
								{new Date(reservation?.checkin_date).toLocaleDateString()}
							</td>
							<td>
								{new Date(reservation?.checkout_date).toLocaleDateString()}
							</td>
							<td>{reservation?.reservation_status || "Confirmed"}</td>
							<td>{reservation?.total_guests}</td>
							<td>{reservation?.booking_source || "Jannatbooking.com"}</td>
							<td>
								{isFullyPaid
									? "Paid in Full"
									: isNotPaid
									  ? "Not Paid"
									  : totalAmountAvailable
									    ? `${depositPercentage}% Deposit`
									    : "Total unavailable"}
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
						{reservation?.pickedRoomsType?.map((room, index) => {
							const chosenPrice = safeNumber(room.chosenPrice);
							const firstDay = room.pricingByDay && room.pricingByDay[0];
							const rootPrice = firstDay ? safeNumber(firstDay.rootPrice) : 0;

							// Determine the rate to display
							const rate = chosenPrice > 0 ? chosenPrice : rootPrice;

							// Calculate total price: rate * count * nights
							const totalPrice = rate * safeNumber(room.count) * nights;

							return (
								<tr key={index}>
									<td>{hotelDetails?.hotelName || "N/A"}</td>
									<td>{room.displayName || "N/A"}</td>
									<td>{room.count}</td>
									<td>N/T</td>
									<td>{nights}</td>
									<td>
										{rate > 0 ? `${rate} ${receiptPricing.currency}` : "N/A"}
									</td>
									<td>
										{totalPrice > 0
											? `${totalPrice.toFixed(2)} ${receiptPricing.currency}`
											: "N/A"}{" "}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>

				{/* Payment Summary */}
				<div className='summary'>
					<div>
						<strong>{receiptPricing.accommodationLabel}:</strong>{" "}
						{totalAmountAvailable
							? `${totalAmount.toFixed(2)} ${receiptPricing.currency}`
							: "—"}
					</div>
					{isFullyPaid ? (
						<div>
							<strong>Paid Amount:</strong> {paidAmount.toFixed(2)}{" "}
							{receiptPricing.currency}
						</div>
					) : reservation?.payment_details?.onsite_paid_amount ||
					  reservation?.payment_details?.onsite_paid_amount > 0 ? (
						<div>
							<strong>Paid Amount Onsite:</strong>{" "}
							{Number(reservation?.payment_details?.onsite_paid_amount).toFixed(
								2
							)}{" "}
							{receiptPricing.currency}
						</div>
					) : reservation?.payment_details?.onsite_paid_amount ||
					  reservation?.payment_details?.onsite_paid_amount > 0 ? (
						<div>
							<strong>Payment Status:</strong>{" "}
							{totalAmountAvailable &&
							reservation?.payment_details?.onsite_paid_amount === totalAmount
								? "Fully Paid Onsite"
								: totalAmountAvailable
									? "Deposit Paid Onsite"
									: "Payment recorded onsite; total unavailable"}
						</div>
					) : isNotPaid ? (
						<div>
							<strong>Payment Status:</strong> Not Paid
						</div>
					) : (
						<>
							<div>
								<strong>
									{totalAmountAvailable
										? `Final Deposit (${depositPercentage}% of Total):`
										: "Final Deposit (total unavailable):"}
								</strong>{" "}
								{finalDeposit.toFixed(2)} {receiptPricing.currency}
							</div>
						</>
					)}
					<div>
						<strong>Total To Be Collected:</strong>{" "}
						{!totalAmountAvailable ? (
							"—"
						) : reservation?.payment_details?.onsite_paid_amount &&
						reservation?.payment_details?.onsite_paid_amount > 0 ? (
							<>
								{Number(
									Number(totalAmount) -
										Number(reservation?.payment_details?.onsite_paid_amount)
								).toFixed(2)}
							</>
						) : isNotPaid ? (
							(Number(totalAmount) - paidAmount).toFixed(2)
						) : (
							(Number(totalAmount) - paidAmount).toFixed(2)
						)}{" "}
						{totalAmountAvailable ? receiptPricing.currency : ""}
					</div>
				</div>

				{/* Footer */}
				<div className='footer'>
					Many Thanks for staying with us at{" "}
					<strong>{hotelDetails?.hotelName || "N/A"}</strong> Hotel.
					<br />
					For better rates next time, please check{" "}
					<a href='https://jannatbooking.com'>jannatbooking.com</a>
				</div>

				{/* Editable Modal for Supplier Name */}
				<Modal
					title='Edit Supplier'
					open={isModalVisible}
					onOk={handleOk}
					onCancel={handleCancel}
					okText='Save'
					cancelText='Cancel'
					{...pdfChildModalProps}
				>
					<Input
						value={tempSupplierName}
						onChange={(e) => setTempSupplierName(e.target.value)}
						placeholder='Enter Supplier Name'
					/>
				</Modal>

				{/* Editable Modal for Supplier Booking No */}
				<Modal
					title='Edit Supplier Booking No'
					open={isBookingNoModalVisible}
					onOk={handleBookingNoOk}
					onCancel={handleBookingNoCancel}
					okText='Save'
					cancelText='Cancel'
					{...pdfChildModalProps}
				>
					<Input
						value={tempSupplierBookingNo}
						onChange={(e) => setTempSupplierBookingNo(e.target.value)}
						placeholder='Enter Supplier Booking No'
					/>
				</Modal>
				</ReceiptPDFWrapper>
			</>
		);
	}
);

export default ReceiptPDF;

/* Styled Components */
const ReceiptPDFWrapper = styled.div`
	font-family: Arial, Helvetica, sans-serif;
	padding: 20px;
	border: 1px solid #ccc;
	max-width: 800px;
	margin: auto;
	text-transform: capitalize;

	/* Header Styling */
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
		padding-top: 35px; /* Extra top padding */
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
	}
	.info-box {
		border: 1px solid #000;
		padding: 10px;
		width: 48%;
		text-align: center;
	}
	.supplier-info {
		.editable-supplier {
			cursor: pointer;
			font-style: italic;
		}
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
		background: rgb(243, 195, 146) !important;
		background-color: rgb(243, 195, 146) !important;
		border-color: #000 !important;
		color: #fff !important;
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
