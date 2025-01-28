import { Input, Modal } from "antd";
import React, { forwardRef, useState } from "react";
import styled from "styled-components";
import { updateSingleReservation } from "../../HotelModule/apiAdmin";

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

		// Compute the total commission considering dynamic commissionRate
		function computeTotalCommission() {
			if (!reservation.pickedRoomsType) return 0;

			return reservation.pickedRoomsType.reduce((total, room) => {
				if (!room.pricingByDay || room.pricingByDay.length === 0) return total;

				room.pricingByDay.forEach((day) => {
					const rootPrice = safeNumber(day.rootPrice);
					const commissionRate = safeNumber(day.commissionRate) / 100; // Convert percentage to decimal
					const totalPriceWithoutCommission = safeNumber(
						day.totalPriceWithoutCommission
					);

					// Commission per day
					const commission =
						rootPrice * commissionRate +
						(totalPriceWithoutCommission - rootPrice);
					const count = safeNumber(room.count);

					total += commission * count;
				});

				return total;
			}, 0);
		}

		const totalCommission = computeTotalCommission();

		// Compute one night cost for all rooms using the average rootPrice of each room
		const computeOneNightCost = () => {
			if (
				!reservation.pickedRoomsType ||
				reservation.pickedRoomsType.length === 0
			)
				return 0;

			return reservation.pickedRoomsType.reduce((total, room) => {
				let firstDayRootPrice = 0;

				if (room.pricingByDay && room.pricingByDay.length > 0) {
					const firstDay = room.pricingByDay[0];
					firstDayRootPrice = safeNumber(firstDay.rootPrice);
				} else {
					// Fallback to chosenPrice if pricingByDay is missing or invalid
					firstDayRootPrice = safeNumber(room.chosenPrice);
				}

				// Multiply by the number of rooms (count)
				return total + firstDayRootPrice * safeNumber(room.count);
			}, 0);
		};

		const oneNightCost = computeOneNightCost();

		// Full amount from reservation (in SAR)
		const totalAmount = safeNumber(reservation.total_amount);

		// The final deposit (in SAR) is computed as the sum of the total commission and the one night cost.
		const finalDeposit = totalCommission + oneNightCost;

		// Determine if "Not Paid" should be displayed
		const hasCardNumber =
			reservation?.customer_details?.cardNumber &&
			reservation.customer_details.cardNumber.trim() !== "";

		const isNotPaid = reservation.payment === "not paid" || !hasCardNumber;

		// Compute the deposit percentage (finalDeposit / totalAmount * 100)
		const depositPercentage =
			totalAmount !== 0 ? ((finalDeposit / totalAmount) * 100).toFixed(0) : 0;

		const isFullyPaid =
			safeNumber(reservation.paid_amount).toFixed(0) ===
			safeNumber(reservation.total_amount).toFixed(0);

		// Handle Modal actions for Supplier Name
		const showModal = () => {
			setTempSupplierName(supplierName); // Set the temp state when modal opens
			setIsModalVisible(true);
		};

		const handleOk = () => {
			setSupplierName(tempSupplierName);
			setIsModalVisible(false);
			// Update reservation with new supplierData; sendEmail is always false
			const updateData = {
				supplierData: {
					supplierName: tempSupplierName,
					suppliedBookingNo: supplierBookingNo, // keep current value
				},
				sendEmail: false,
			};
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
			const updateData = {
				supplierData: {
					supplierName: supplierName, // keep current value
					suppliedBookingNo: tempSupplierBookingNo,
				},
				sendEmail: false,
			};
			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
				}
			});
		};

		const handleBookingNoCancel = () => {
			setIsBookingNoModalVisible(false);
		};

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
							{isFullyPaid
								? "Paid Amount"
								: isNotPaid
								  ? "Not Paid"
								  : `${depositPercentage}% Deposit`}
						</strong>
						<div>
							{isFullyPaid
								? `${Number(reservation?.paid_amount).toFixed(2)} SAR`
								: isNotPaid
								  ? "Not Paid"
								  : `${depositPercentage}% Deposit`}
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
									  : `${depositPercentage}% Deposit`}
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
							// Safely parse chosenPrice and rootPrice
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
									<td>{rate > 0 ? `${rate} SAR` : "N/A"}</td>
									<td>
										{totalPrice > 0 ? `${totalPrice.toFixed(2)} SAR` : "N/A"}{" "}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>

				{/* Payment Summary */}
				<div className='summary'>
					<div>
						<strong>Net Accommodation Charge:</strong>{" "}
						{Number(reservation?.total_amount).toFixed(2)} SAR
					</div>
					{isFullyPaid ? (
						<div>
							<strong>Paid Amount:</strong>{" "}
							{Number(reservation?.paid_amount).toFixed(2)} SAR
						</div>
					) : isNotPaid ? (
						<div>
							<strong>Payment Status:</strong> Not Paid
						</div>
					) : (
						<>
							<div>
								<strong>Final Deposit ({depositPercentage}% of Total):</strong>{" "}
								{Number(finalDeposit).toFixed(2)} SAR
							</div>
						</>
					)}
					<div>
						<strong>Total To Be Collected:</strong>{" "}
						{isNotPaid
							? (
									Number(reservation?.total_amount) -
									Number(reservation?.paid_amount)
							  ).toFixed(2)
							: (
									Number(reservation?.total_amount) -
									Number(
										reservation?.paid_amount ? reservation?.paid_amount : 0
									)
							  ).toFixed(2)}{" "}
						SAR
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
		/* Align the content to the bottom and add extra top padding */
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
