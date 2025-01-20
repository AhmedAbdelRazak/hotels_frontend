import { Input, Modal } from "antd";
import React, { forwardRef, useState } from "react";
import styled from "styled-components";

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
			hotelDetails?.belongsTo?.name || "N/A"
		);
		// State for the editable supplier booking no in supplier-info
		const [supplierBookingNo, setSupplierBookingNo] = useState(
			reservation?.confirmation_number || "N/A"
		);
		const [isModalVisible, setIsModalVisible] = useState(false);
		const [tempSupplierName, setTempSupplierName] = useState(supplierName);
		// New state and modal flag for editing Supplier Booking No
		const [isBookingNoModalVisible, setIsBookingNoModalVisible] =
			useState(false);
		const [tempSupplierBookingNo, setTempSupplierBookingNo] =
			useState(supplierBookingNo);

		// Calculate dynamic deposit percentage
		const calculateDepositPercentage = () => {
			const paid = Number(reservation?.paid_amount || 0);
			const total = Number(reservation?.total_amount || 0);
			return total !== 0 ? ((paid / total) * 100).toFixed(0) : 0;
		};

		const isFullyPaid =
			Number(reservation?.paid_amount).toFixed(0) ===
			Number(reservation?.total_amount).toFixed(0);

		// Handle Modal actions for Supplier Name
		const showModal = () => {
			setTempSupplierName(supplierName); // Set the temp state when modal opens
			setIsModalVisible(true);
		};

		const handleOk = () => {
			setSupplierName(tempSupplierName);
			setIsModalVisible(false);
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
		};

		const handleBookingNoCancel = () => {
			setIsBookingNoModalVisible(false);
		};

		return (
			<ReceiptPDFWrapper ref={ref}>
				{/* Header */}
				<div className='header1'>
					<div className='logo'>
						JANNAT <span>Booking.com</span>
					</div>
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
							{reservation && reservation.confirmation_number}
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
						<div>{reservation?.customer_details?.name}</div>
						<div>{reservation?.customer_details?.nationality}</div>
					</div>
					<div className='info-box'>
						<strong>{isFullyPaid ? "Paid Amount" : "Paid To"}</strong>
						<div>
							{isFullyPaid
								? `${reservation?.paid_amount?.toFixed(2)} SAR`
								: `${calculateDepositPercentage()}% Deposited for Confirmation`}
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
						{/* Editable portion with pointer cursor */}
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
							<td>{reservation?.booking_source || "Jannatbooking.com"}</td>
							<td>
								{isFullyPaid
									? "Paid in Full"
									: `${calculateDepositPercentage()}% Deposit`}
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
							<th>Guests</th>
							<th>Extras</th>
							<th>Nights</th>
							<th>Rate</th>
							<th>Total</th>
						</tr>
					</thead>
					<tbody>
						{reservation?.pickedRoomsType?.map((room, index) => (
							<tr key={index}>
								<td>{hotelDetails?.hotelName}</td>
								<td>{room.displayName}</td>
								<td>{room.count}</td>
								<td>{reservation?.total_guests}</td>
								<td>N/T</td>
								<td>
									{calculateReservationPeriod(
										reservation.checkin_date,
										reservation.checkout_date
									)}
								</td>
								<td>{room.chosenPrice} SAR</td>
								<td>{(room.chosenPrice * room.count).toFixed(2)} SAR</td>
							</tr>
						))}
					</tbody>
				</table>

				{/* Payment Summary */}
				<div className='summary'>
					<div>
						<strong>Net Accommodation Charge:</strong>{" "}
						{reservation?.total_amount?.toFixed(2)} SAR
					</div>
					{isFullyPaid ? (
						<div>
							<strong>Paid Amount:</strong>{" "}
							{reservation?.paid_amount?.toFixed(2)} SAR
						</div>
					) : (
						<div>
							<strong>Deposits {calculateDepositPercentage()}%:</strong>{" "}
							{reservation?.paid_amount?.toFixed(2)} SAR
						</div>
					)}
					<div>
						<strong>Total To Be Collected:</strong>{" "}
						{(
							Number(reservation?.total_amount) -
							Number(reservation?.paid_amount)
						).toFixed(2)}{" "}
						SAR
					</div>
				</div>

				{/* Footer */}
				<div className='footer'>
					Many Thanks for staying with us at{" "}
					<strong>{hotelDetails?.hotelName}</strong> Hotel.
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
				>
					<Input
						value={tempSupplierBookingNo}
						onChange={(e) => setTempSupplierBookingNo(e.target.value)}
						placeholder='Enter Supplier Booking No'
					/>
				</Modal>
			</ReceiptPDFWrapper>
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
	.header1,
	.header2,
	.header3 {
		text-align: center;
		padding: 8px 0;
	}

	.header1 {
		background-color: #d9d9d9;
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

	th,
	td {
		border: 1px solid #000;
		padding: 8px;
		text-align: center;
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
