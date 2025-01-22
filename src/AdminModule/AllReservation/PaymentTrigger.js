import React, { useState } from "react";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { triggerPayment } from "../apiAdmin";
import { Modal, Radio, Input } from "antd";

const PaymentTrigger = ({ reservation }) => {
	const { user, token } = isAuthenticated();
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	// For showing our options modal:
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedOption, setSelectedOption] = useState(null);
	// For custom amount option:
	const [customAmountUSD, setCustomAmountUSD] = useState("");
	// For showing error message in the modal if needed:
	const [modalError, setModalError] = useState("");

	// Check if customer has payment details (cardNumber)
	const hasPaymentDetails =
		reservation.customer_details && reservation.customer_details.cardNumber;

	// Calculate nights (not crucial for final deposit but used in your code)
	const calculateNights = (checkin, checkout) => {
		const start = new Date(checkin);
		const end = new Date(checkout);
		let nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
		return nights < 1 ? 1 : nights;
	};

	// eslint-disable-next-line
	const nights = calculateNights(
		reservation?.checkin_date,
		reservation?.checkout_date
	);

	// Commission calculation (unchanged)
	const computedCommissionPerNight = reservation.pickedRoomsType
		? reservation.pickedRoomsType.reduce((total, room) => {
				let roomCommission = 0;
				if (room.pricingByDay && room.pricingByDay.length > 0) {
					// difference = (day.price - day.rootPrice)
					roomCommission =
						room.pricingByDay.reduce((acc, day) => {
							return acc + (Number(day.price) - Number(day.rootPrice));
						}, 0) * Number(room.count);
				}
				return total + roomCommission;
		  }, 0)
		: 0;

	const computedCommission = computedCommissionPerNight;

	// One-night cost calculation
	const oneNightCost = reservation.pickedRoomsType
		? reservation.pickedRoomsType.reduce((total, room) => {
				let roomNightCost = 0;
				if (room.pricingByDay && room.pricingByDay.length > 0) {
					roomNightCost =
						Number(room.pricingByDay[0].totalPriceWithoutCommission) *
						Number(room.count);
				} else {
					roomNightCost = Number(room.chosenPrice) * Number(room.count);
				}
				return total + roomNightCost;
		  }, 0)
		: 0;

	// Full amount from reservation (in SAR)
	const totalAmount = Number(reservation.total_amount) || 0;

	// Option 1: Commission in SAR
	const optionCommissionSAR = computedCommission;
	// Option 2: Commission + One Night
	const depositWithOneNight = computedCommission + oneNightCost;
	// Option 3: Full Amount
	const optionFullAmountSAR = totalAmount;

	// Retrieve SAR->USD rate from localStorage
	const storedRates = JSON.parse(localStorage.getItem("rates")) || {};
	const sarToUsdRate = Number(storedRates["SARtoUSD"]) || 0.2667;

	// Convert each SAR to USD
	const option1_USD = (optionCommissionSAR * sarToUsdRate).toFixed(2);
	const option2_USD = (depositWithOneNight * sarToUsdRate).toFixed(2);
	const option3_USD = (optionFullAmountSAR * sarToUsdRate).toFixed(2);

	// Also store them as strings for display
	const option1_SAR = optionCommissionSAR.toLocaleString();
	const option2_SAR = depositWithOneNight.toLocaleString();
	const option3_SAR = optionFullAmountSAR.toLocaleString();

	// Decide which final USD + SAR amounts to charge
	const getChargeAmount = () => {
		let finalUSD = 0;
		let finalSAR = 0;

		if (selectedOption === "depositOnly") {
			finalUSD = parseFloat(option1_USD);
			finalSAR = optionCommissionSAR;
		} else if (selectedOption === "depositAndOneNight") {
			finalUSD = parseFloat(option2_USD);
			finalSAR = depositWithOneNight;
		} else if (selectedOption === "fullAmount") {
			finalUSD = parseFloat(option3_USD);
			finalSAR = optionFullAmountSAR;
		} else if (selectedOption === "customAmount") {
			// customAmountUSD is the user’s typed USD
			finalUSD = parseFloat(customAmountUSD) || 0;
			// Convert that custom USD back to SAR
			finalSAR = finalUSD / sarToUsdRate;
		}
		return { finalUSD, finalSAR };
	};

	// Disable the capture button if:
	// eslint-disable-next-line
	const isDisabled =
		!hasPaymentDetails ||
		reservation.payment === "paid online" ||
		reservation.reservation_status === "cancelled" ||
		(reservation.payment_details && reservation.payment_details.captured);

	const handlePaymentTrigger = async () => {
		// Validate
		if (!selectedOption) {
			setModalError("Please select a payment option.");
			return;
		}
		if (selectedOption === "customAmount" && !customAmountUSD) {
			setModalError("Please enter a custom USD amount.");
			return;
		}

		setModalError("");
		try {
			setLoading(true);
			setMessage("");

			// Compute final amounts in USD & SAR
			const { finalUSD, finalSAR } = getChargeAmount();
			const reservationId = reservation._id;

			// Fire the API call
			const response = await triggerPayment(
				user._id,
				token,
				reservationId,
				finalUSD, // amount in USD
				selectedOption,
				selectedOption === "customAmount" ? customAmountUSD : null,
				finalSAR // new argument: the SAR amount
			);
			console.log(response, "response");
			setMessage(response.message || "Payment captured successfully!");

			setTimeout(() => {
				window.location.reload(false);
			}, 1500);
		} catch (error) {
			console.error(error);
			setMessage(
				"This customer was charged before, confirm with your admin Ahmed."
			);
		} finally {
			setLoading(false);
			if (!modalError) {
				setIsModalVisible(false);
			}
		}
	};

	const openOptionsModal = () => {
		setSelectedOption(null);
		setCustomAmountUSD("");
		setMessage("");
		setModalError("");
		setIsModalVisible(true);
	};

	return (
		<PaymentTriggerWrapper>
			<h3>Trigger Payment</h3>
			<p>This action will capture the payment for the reservation.</p>
			<Button onClick={openOptionsModal} disabled={loading}>
				{loading ? "Processing..." : "Capture Payment"}
			</Button>
			{message && (
				<Message success={message === "Payment captured successfully!"}>
					{message}
				</Message>
			)}
			<Modal
				title='Select Payment Option'
				visible={isModalVisible}
				onOk={handlePaymentTrigger}
				onCancel={() => setIsModalVisible(false)}
				okText='Confirm'
				cancelText='Cancel'
			>
				<Radio.Group
					onChange={(e) => setSelectedOption(e.target.value)}
					value={selectedOption}
				>
					<Radio value='depositOnly'>
						Capture Commission Only: ${option1_USD} USD ({option1_SAR} SAR)
					</Radio>
					<br />
					<Radio value='depositAndOneNight' style={{ marginTop: "10px" }}>
						Capture Commission + 1 Night: ${option2_USD} USD ({option2_SAR} SAR)
					</Radio>
					<br />
					<Radio value='fullAmount' style={{ marginTop: "10px" }}>
						Capture Entire Amount: ${option3_USD} USD ({option3_SAR} SAR)
					</Radio>
					<br />
					<Radio value='customAmount' style={{ marginTop: "10px" }}>
						<span style={{ fontSize: "18px", fontWeight: "bold" }}>
							Custom Withdrawal Amount (USD)
						</span>
					</Radio>
				</Radio.Group>
				{selectedOption === "customAmount" && (
					<CustomInput
						placeholder='Enter custom USD amount'
						value={customAmountUSD}
						onChange={(e) => setCustomAmountUSD(e.target.value)}
					/>
				)}
				{modalError && <ModalError>{modalError}</ModalError>}
			</Modal>
		</PaymentTriggerWrapper>
	);
};

export default PaymentTrigger;

// Styled components
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

const CustomInput = styled(Input)`
	margin-top: 10px;
	font-size: 18px;
	font-weight: bold;
	text-align: center;
`;

const ModalError = styled.p`
	color: red;
	font-size: 14px;
	margin-top: 10px;
	text-align: center;
`;
