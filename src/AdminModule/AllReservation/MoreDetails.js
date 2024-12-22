import React from "react";
import styled from "styled-components";

const MoreDetails = ({ selectedReservation }) => {
	return (
		<MoreDetailsWrapper>
			{selectedReservation && (
				<div>
					<p>
						<strong>Confirmation Number:</strong>{" "}
						{selectedReservation.confirmation_number}
					</p>
					<p>
						<strong>Customer Name:</strong> {selectedReservation.customer_name}
					</p>
					<p>
						<strong>Phone:</strong> {selectedReservation.customer_phone}
					</p>
					<p>
						<strong>Email:</strong> {selectedReservation.customer_email}
					</p>
					<p>
						<strong>Check-in Date:</strong>{" "}
						{new Date(selectedReservation.checkin_date).toLocaleDateString()}
					</p>
					<p>
						<strong>Check-out Date:</strong>{" "}
						{new Date(selectedReservation.checkout_date).toLocaleDateString()}
					</p>
					<p>
						<strong>Created At:</strong>{" "}
						{new Date(selectedReservation.createdAt).toLocaleDateString()}
					</p>
				</div>
			)}
		</MoreDetailsWrapper>
	);
};

export default MoreDetails;

const MoreDetailsWrapper = styled.div``;
