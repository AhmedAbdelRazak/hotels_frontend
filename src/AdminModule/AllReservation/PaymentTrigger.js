import React, { useState } from "react";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { triggerPayment } from "../apiAdmin";

const PaymentTrigger = ({ reservation }) => {
	const { user, token } = isAuthenticated();
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	const handlePaymentTrigger = async () => {
		try {
			setLoading(true);
			setMessage("");

			// Extract amount and transId from reservation
			const amount = reservation.payment_details?.amountInUSD || 0;
			const reservationId = reservation._id;

			// Call API function
			const response = await triggerPayment(
				user._id,
				token,
				reservationId,
				amount
			);

			console.log(response, "response");

			// Display success message
			setMessage(response.message || "Payment captured successfully!");
		} catch (error) {
			// Handle errors
			console.log(error);
			setMessage(
				"This customer was charged before, confirm with your admin Ahmed Abarazak"
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<PaymentTriggerWrapper>
			<h3>Trigger Payment</h3>
			<p>
				This action will capture the payment for the reservation amount:{" "}
				<strong>${reservation.payment_details?.amountInUSD}</strong>{" "}
				<strong>(SAR {reservation.payment_details?.amountInSAR})</strong>
			</p>
			<Button
				onClick={handlePaymentTrigger}
				disabled={loading}
				success={"Payment captured successfully!" === message}
			>
				{loading ? "Processing..." : "Capture Payment"}
			</Button>
			{message && <Message>{message}</Message>}
		</PaymentTriggerWrapper>
	);
};

export default PaymentTrigger;

const PaymentTriggerWrapper = styled.div`
	text-align: center;
	padding: 20px;
	border: 1px solid #ccc;
	border-radius: 10px;
	background-color: #f9f9f9;
	box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
`;

const Button = styled.button`
	background-color: #007bff;
	color: white;
	padding: 10px 20px;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
	margin-top: 10px;

	&:hover {
		background-color: #0056b3;
	}

	&:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
`;

const Message = styled.p`
	margin-top: 10px;
	color: ${(props) => (props.success ? "green" : "red")};

	font-weight: bold;
`;
