import { Input, Modal } from "antd";
import React, { forwardRef, useState } from "react";
import styled from "styled-components";
import { updateSingleReservation } from "../../HotelModule/apiAdmin";

const ReceiptPDFB2B = forwardRef(
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
		const [supplierBookingNo, setSupplierBookingNo] = useState(
			(reservation?.supplierData &&
				reservation.supplierData.suppliedBookingNo) ||
				reservation?.confirmation_number ||
				"N/A"
		);
		const [isModalVisible, setIsModalVisible] = useState(false);
		const [tempSupplierName, setTempSupplierName] = useState(supplierName);
		const [isBookingNoModalVisible, setIsBookingNoModalVisible] =
			useState(false);
		const [tempSupplierBookingNo, setTempSupplierBookingNo] =
			useState(supplierBookingNo);

		const safeNumber = (val) => {
			const parsed = Number(val);
			return isNaN(parsed) ? 0 : parsed;
		};

		const calculateNights = (checkin, checkout) => {
			const start = new Date(checkin);
			const end = new Date(checkout);
			let nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
			return nights < 1 ? 1 : nights;
		};
		const nights = calculateNights(
			reservation?.checkin_date,
			reservation?.checkout_date
		);

		const getAverageRootPrice = (room) => {
			if (hotelDetails?.wholeSaleHotel || reservation?.wholeSaleReservation) {
				return safeNumber(room.chosenPrice);
			}
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				const totalRootPrice = room.pricingByDay.reduce(
					(sum, day) => sum + safeNumber(day.rootPrice),
					0
				);
				return totalRootPrice / room.pricingByDay.length;
			}
			return safeNumber(room.chosenPrice);
		};

		const hasCardNumber =
			reservation?.customer_details?.cardNumber &&
			reservation.customer_details.cardNumber.trim() !== "";

		const totalRootPrice =
			reservation?.pickedRoomsType?.reduce((acc, room) => {
				const roomTotal =
					room.pricingByDay?.reduce((sum, day) => {
						return sum + safeNumber(day.rootPrice) * safeNumber(room.count);
					}, 0) || 0;
				return acc + roomTotal;
			}, 0) || 0;

		const deposit =
			reservation?.payment_details?.onsite_paid_amount > 0
				? 0
				: hasCardNumber
				  ? reservation.pickedRoomsType.reduce((acc, room) => {
							const firstDayRootPrice =
								hotelDetails?.wholeSaleHotel ||
								reservation?.wholeSaleReservation
									? safeNumber(room.chosenPrice)
									: room.pricingByDay && room.pricingByDay.length > 0
									  ? safeNumber(room.pricingByDay[0].rootPrice)
									  : safeNumber(room.chosenPrice);
							return acc + firstDayRootPrice * safeNumber(room.count);
				    }, 0)
				  : 0;

		// eslint-disable-next-line
		const remainder = totalRootPrice - deposit;

		const handleSupplierNameOk = async () => {
			setSupplierName(tempSupplierName);
			setIsModalVisible(false);
			const updateData = {
				supplierData: {
					supplierName: tempSupplierName,
					suppliedBookingNo: supplierBookingNo,
				},
				sendEmail: false,
			};
			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) console.error(response.error);
			});
		};
		const handleSupplierNameCancel = () => {
			setIsModalVisible(false);
		};
		const handleSupplierBookingNoOk = async () => {
			setSupplierBookingNo(tempSupplierBookingNo);
			setIsBookingNoModalVisible(false);
			const updateData = {
				supplierData: {
					supplierName,
					suppliedBookingNo: tempSupplierBookingNo,
				},
				sendEmail: false,
			};
			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) console.error(response.error);
			});
		};
		const handleSupplierBookingNoCancel = () => {
			setIsBookingNoModalVisible(false);
		};
		const showSupplierNameModal = () => {
			setTempSupplierName(supplierName);
			setIsModalVisible(true);
		};
		const showSupplierBookingNoModal = () => {
			setTempSupplierBookingNo(supplierBookingNo);
			setIsBookingNoModalVisible(true);
		};

		return (
			<ReceiptPDFB2BWrapper ref={ref}>
				<div className='header1'>
					<div className='left'></div>
					<div className='center logo'>
						JANNAT <span>Booking.com</span>
					</div>
					<div className='right'>Operation Order</div>
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
				<div className='info-boxes'>
					<div className='info-box'>
						<strong>Guest Name</strong>
						<div>{reservation?.customer_details?.name}</div>
						<div>{reservation?.customer_details?.nationality}</div>
					</div>
					<div className='info-box'>
						<strong>
							{reservation?.payment_details?.onsite_paid_amount > 0
								? "Paid Offline"
								: hasCardNumber
								  ? "Deposit Amount"
								  : "Payment Status"}
						</strong>
						<div>
							{reservation?.payment_details?.onsite_paid_amount > 0
								? safeNumber(
										reservation.payment_details.onsite_paid_amount
								  ).toFixed(2) + " SAR"
								: hasCardNumber
								  ? deposit.toFixed(2) + " SAR"
								  : "Not Paid"}
						</div>
					</div>
				</div>
				<div className='supplier-info mt-2'>
					<div onClick={showSupplierNameModal} className='editable-supplier'>
						<strong>Supplied By:</strong> {supplierName}
					</div>
					<div>
						<strong>Supplier Booking No:</strong>{" "}
						<span
							onClick={showSupplierBookingNoModal}
							style={{ cursor: "pointer" }}
						>
							{supplierBookingNo}
						</span>
					</div>
				</div>
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
								{reservation?.payment_details?.onsite_paid_amount > 0
									? "Paid Offline"
									: hasCardNumber
									  ? "Deposit Required"
									  : "Not Paid"}
							</td>
						</tr>
					</tbody>
				</table>
				<table className='room-details-table'>
					<thead>
						<tr>
							<th>Hotel</th>
							<th>Room Type</th>
							<th>Qty</th>
							<th>Extras</th>
							<th>Nights</th>
							<th>Rate (Avg Root Price)</th>
							<th>Total</th>
						</tr>
					</thead>
					<tbody>
						{reservation?.pickedRoomsType?.map((room, index) => {
							const averageRootPrice = getAverageRootPrice(room);
							const roomTotal =
								averageRootPrice * safeNumber(room.count) * nights;
							return (
								<tr key={index}>
									<td>{hotelDetails?.hotelName || "N/A"}</td>
									<td>{room.displayName || "N/A"}</td>
									<td>{room.count}</td>
									<td>N/T</td>
									<td>{nights}</td>
									<td>{averageRootPrice.toFixed(2)} SAR</td>
									<td>{roomTotal.toFixed(2)} SAR</td>
								</tr>
							);
						})}
					</tbody>
				</table>
				<div className='summary'>
					<div>
						{/* 
							-- If wholesale, always display reservation.total_amount as the Net 
							-- to match your “1500.00” example exactly. Otherwise, normal root sum.
						*/}
						<strong>Net Accommodation Charge:</strong>{" "}
						{(hotelDetails?.wholeSaleHotel || reservation?.wholeSaleReservation
							? safeNumber(reservation?.total_amount)
							: totalRootPrice
						).toFixed(2)}{" "}
						SAR
					</div>
					{reservation?.payment_details?.onsite_paid_amount > 0 ? (
						<div>
							<strong>Total To Be Collected:</strong>{" "}
							{Math.max(
								0,
								(hotelDetails?.wholeSaleHotel ||
								reservation?.wholeSaleReservation
									? safeNumber(reservation?.total_amount)
									: totalRootPrice) -
									safeNumber(reservation.payment_details.onsite_paid_amount)
							).toFixed(2)}{" "}
							SAR
						</div>
					) : hasCardNumber ? (
						<>
							<div>
								<strong>Deposit (First Night):</strong> {deposit.toFixed(2)} SAR
							</div>
							<div>
								{/* 
										-- “Remainder” = net - deposit, but never negative 
									*/}
								<strong>Total To Be Collected:</strong>{" "}
								{Math.max(
									0,
									(hotelDetails?.wholeSaleHotel ||
									reservation?.wholeSaleReservation
										? safeNumber(reservation?.total_amount)
										: totalRootPrice) - deposit
								).toFixed(2)}{" "}
								SAR
							</div>
						</>
					) : (
						<div>
							<strong>Payment Status:</strong> Not Paid
						</div>
					)}
				</div>
				<div className='footer'>
					Many Thanks for staying with us at{" "}
					<strong>{hotelDetails?.hotelName || "N/A"}</strong> Hotel.
					<br />
					For better rates next time, please check{" "}
					<a href='https://jannatbooking.com'>jannatbooking.com</a>
				</div>
				<Modal
					title='Edit Supplier'
					open={isModalVisible}
					onOk={handleSupplierNameOk}
					onCancel={handleSupplierNameCancel}
					okText='Save'
					cancelText='Cancel'
				>
					<Input
						value={tempSupplierName}
						onChange={(e) => setTempSupplierName(e.target.value)}
						placeholder='Enter Supplier Name'
					/>
				</Modal>
				<Modal
					title='Edit Supplier Booking No'
					open={isBookingNoModalVisible}
					onOk={handleSupplierBookingNoOk}
					onCancel={handleSupplierBookingNoCancel}
					okText='Save'
					cancelText='Cancel'
				>
					<Input
						value={tempSupplierBookingNo}
						onChange={(e) => setTempSupplierBookingNo(e.target.value)}
						placeholder='Enter Supplier Booking No'
					/>
				</Modal>
			</ReceiptPDFB2BWrapper>
		);
	}
);

export default ReceiptPDFB2B;

/* Styled Components */
const ReceiptPDFB2BWrapper = styled.div`
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
