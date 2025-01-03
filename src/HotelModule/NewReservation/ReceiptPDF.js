import React, { forwardRef } from "react";
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
		console.log(reservation, "reservation");
		return (
			<ReceiptPDFWrapper ref={ref}>
				<div className='headerWrapper'>
					<h3>{hotelDetails && hotelDetails.hotelName}</h3>
				</div>
				<div className='container mt-3'>
					<div className='row'>
						<div className='col-md-4'>
							<h4>Receipt</h4>
						</div>
						<div className='col-md-3'>
							<h4 className='status'>{reservation && reservation.payment}</h4>
						</div>
					</div>

					<div className='row mt-3 conf'>
						<div className='col-md-4'>Confirmation Number:</div>
						<div className='col-md-3' style={{ textDecoration: "underline" }}>
							{reservation && reservation.confirmation_number}
						</div>
					</div>

					<div className='row'>
						<div className='col-md-6'>
							<div className='secTable mt-3 '>
								<div className='secBorder'>Guest Name</div>
								<div className='secBorder2'>
									{reservation &&
										reservation.customer_details &&
										reservation.customer_details.name}
								</div>
							</div>
						</div>

						<div className='col-md-6'>
							<div className='secTable mt-3 '>
								<div className='secBorder'>Paid To</div>
								<div className='secBorder2'>
									{reservation.payment === "agoda collect" ||
									reservation.payment === "expedia collect" ||
									reservation.payment === "booking collect"
										? "Online Agency"
										: "Hotel Collect"}
								</div>
							</div>
						</div>
					</div>

					<div className='row mt-3 mx-auto thirdTableWrapper'>
						<div className='col-2 tableHeader' style={{ marginLeft: "40px" }}>
							Check-in
						</div>
						<div className='col-2 tableHeader'>Check-out</div>
						<div className='col-2 tableHeader'>Nights</div>
						<div className='col-2 tableHeader'>Source</div>
						<div className='col-2 tableHeader'>Payment</div>
					</div>
					<div className='row mx-auto thirdTableWrapper2'>
						<div className='col-2 tableBody' style={{ marginLeft: "40px" }}>
							{reservation && new Date(reservation.checkin_date).toDateString()}
						</div>
						<div className='col-2 tableBody'>
							{reservation &&
								new Date(reservation.checkout_date).toDateString()}
						</div>
						<div className='col-2 tableBody'>
							{calculateReservationPeriod(
								reservation.checkin_date,
								reservation.checkout_date
							)}
						</div>
						<div className='col-2 tableBody'>
							{reservation && reservation.booking_source}
						</div>
						<div className='col-2 tableBody' style={{ fontWeight: "bold" }}>
							{reservation.payment === "agoda collect" ||
							reservation.payment === "expedia collect" ||
							reservation.payment === "inhouse" ||
							reservation.payment === "collected" ||
							reservation.payment.includes("checked_out")
								? "PAID"
								: "Not Paid"}
						</div>
					</div>
					<div className='row mt-4 fourthTableWrapper'>
						<div className='col-md-4 tableHeader'>Description</div>
						<div className='col-md-2 tableHeader'>Nights</div>
						<div className='col-md-2 tableHeader'>Rate / Night</div>
						<div className='col-md-4 tableHeader'>Total</div>

						<div className='col-md-4 tableBody'>
							{reservation &&
								reservation.pickedRoomsType &&
								reservation.pickedRoomsType.map((i) => i.room_type + ", ")}
							<div>
								{reservation &&
									reservation.pickedRoomsType &&
									reservation.pickedRoomsType.map((i) => i.displayName + ", ")}
							</div>
						</div>
						<div className='col-md-2 tableBody'>
							{calculateReservationPeriod(
								reservation.checkin_date,
								reservation.checkout_date
							)}
						</div>
						<div className='col-md-2 tableBody'>
							{getTotalAmountPerDay(reservation.pickedRoomsType)} SAR
						</div>
						<div className='col-md-4 tableBody'>
							{reservation &&
							Number(reservation.sub_total).toLocaleString() >
								Number(
									Number(reservation.total_amount) -
										Number(reservation.sub_total)
								).toLocaleString()
								? Number(reservation.sub_total).toLocaleString()
								: Number(reservation.total_amount).toFixed(2)}{" "}
							SAR
						</div>

						<div className='col-md-4 tableBody2'></div>
						<div className='col-md-2 tableBody2'></div>
						<div className='col-md-2 tableBody2'>Taxes / Services</div>
						<div className='col-md-4 tableBody2'>
							{reservation &&
							Number(reservation.sub_total).toLocaleString() <=
								Number(
									Number(reservation.total_amount) -
										Number(reservation.sub_total)
								).toLocaleString()
								? 0
								: Number(
										Number(reservation.total_amount) -
											Number(reservation.sub_total)
								  ).toLocaleString()}{" "}
							SAR
						</div>

						<div className='col-md-4 tableBody2'></div>
						<div className='col-md-2 tableBody2'></div>
						<div
							className='col-md-2 tableBody2'
							style={{
								fontSize: "1.2rem",
								background: "black",
								color: "white",
							}}
						>
							Total
						</div>
						<div className='col-md-4 tableBody2' style={{ fontSize: "1.2rem" }}>
							{Number(reservation.total_amount).toLocaleString()} SAR
						</div>
					</div>

					<div className='mt-4 footer'>
						Many Thanks for staying with us at{" "}
						<span style={{ textTransform: "capitalize" }}>
							{hotelDetails && hotelDetails.hotelName}
						</span>{" "}
						Hotel
						<div>
							For better rates next time, please check https://jannatbooking.com
						</div>
					</div>
				</div>
			</ReceiptPDFWrapper>
		);
	}
);

export default ReceiptPDF;

const ReceiptPDFWrapper = styled.div`
	min-height: 705px;
	max-width: 900px;
	margin: 10px auto;
	font-family: Arial, Helvetica, sans-serif;

	h3 {
		text-align: center;
		font-weight: bold;
		font-size: 1.7rem;
		vertical-align: center;
		margin: auto;
		text-transform: capitalize;
	}

	.headerWrapper {
		background: lightgrey;
		padding: 5px;
	}

	h4 {
		font-weight: bold;
		font-size: 1.5rem;
		text-transform: capitalize;
	}

	.status {
		color: grey;
		text-transform: capitalize;
	}

	.conf {
		font-size: 0.9rem;
		font-weight: bold;
	}

	.secTable {
		border: solid 1px black;
		text-align: center;
		font-weight: bold;
		font-size: 0.9rem;
	}

	.secBorder {
		border: solid 1px black;
	}

	.secBorder2 {
		border: solid 1px black;
		padding: 8px;
	}

	.thirdTableWrapper {
		/* border: solid 1px black; */
		text-align: center;
		font-weight: bold;
		font-size: 0.9rem;
	}

	.tableHeader {
		border: solid 1px black;
	}

	.thirdTableWrapper2 {
		/* border: solid 1px black; */
		text-align: center;
		font-size: 0.85rem;
	}

	.tableBody {
		border: solid 1px black;
		padding: 10px;
		text-transform: capitalize;
	}

	.fourthTableWrapper {
		border: solid 1px black;
		text-align: center;
		font-weight: bold;
		font-size: 0.9rem;
	}

	.fourthTableWrapper > .tableBody {
		border: solid 1px black;
		min-height: 300px;
	}

	.fourthTableWrapper > .tableBody2 {
		border: solid 1px black;
	}

	.footer {
		text-align: center;
		font-size: 0.9rem;
		font-weight: bold;
	}
`;
