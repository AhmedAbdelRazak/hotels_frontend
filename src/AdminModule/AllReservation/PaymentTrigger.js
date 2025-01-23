// src/components/admin/PaymentTrigger.js

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { triggerPayment, emailSendForTriggeringPayment } from "../apiAdmin"; // Import the updated API function
import { Modal, Radio, Input, message } from "antd";
import { toast } from "react-toastify";

const PaymentTrigger = ({ reservation }) => {
	const { user, token } = isAuthenticated();
	const [loading, setLoading] = useState(false);
	const [messageText, setMessageText] = useState("");
	// For showing our options modal:
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedOption, setSelectedOption] = useState(null);
	// For custom amount option:
	const [customAmountUSD, setCustomAmountUSD] = useState("");
	// For showing error message in the modal if needed:
	const [modalError, setModalError] = useState("");

	// For password confirmation modal:
	const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
	const [passwordInput, setPasswordInput] = useState("");
	const [modalErrorPassword, setModalErrorPassword] = useState("");

	// Import and configure Ant Design's message
	useEffect(() => {
		message.config({
			top: 100,
			duration: 3,
			maxCount: 3,
		});
	}, []);

	// **Added: State Variables for Exchange Rates**
	const [exchangeRateUSD, setExchangeRateUSD] = useState(0.2667); // Default value
	// eslint-disable-next-line
	const [exchangeRateEUR, setExchangeRateEUR] = useState(0.25597836); // Default value

	// **Added: Fetch Exchange Rates from LocalStorage**
	useEffect(() => {
		const rates = JSON.parse(localStorage.getItem("rate"));
		if (rates) {
			setExchangeRateUSD(rates.SAR_USD || 0.2667);
			setExchangeRateEUR(rates.SAR_EUR || 0.25597836);
		}
	}, []);

	// Check if customer has payment details (cardNumber)
	const hasPaymentDetails =
		reservation.customer_details && reservation.customer_details.cardNumber;

	// Check if a payment has already been captured
	const isCaptured =
		reservation.payment_details && reservation.payment_details.captured;

	// Calculate remaining amount if payment has been captured
	const remainingAmount = isCaptured
		? Number(reservation.total_amount) - Number(reservation.paid_amount)
		: Number(reservation.total_amount);

	// **Replaced sarToUsdRate with exchangeRateUSD**
	// Convert remaining amount to USD
	const remainingAmountUSD = (remainingAmount * exchangeRateUSD).toFixed(2);

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

	// **Replaced sarToUsdRate with exchangeRateUSD**
	// Convert each SAR to USD
	const option1_USD = (optionCommissionSAR * exchangeRateUSD).toFixed(2);
	const option2_USD = (depositWithOneNight * exchangeRateUSD).toFixed(2);
	const option3_USD = (optionFullAmountSAR * exchangeRateUSD).toFixed(2);

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
			finalSAR = finalUSD / exchangeRateUSD;
		}
		return { finalUSD, finalSAR };
	};

	// **First Requirement: Disable the capture button if**
	// - The user hasn't added his card details
	// - OR the paid_amount is greater than or equal to the total_amount
	const isDisabled =
		!hasPaymentDetails ||
		(Number(reservation.paid_amount) >= Number(reservation.total_amount) &&
			reservation.payment_details.isCaptured);

	const handlePaymentOptionConfirm = () => {
		// Validate payment options selection
		if (!selectedOption) {
			setModalError("Please select a payment option.");
			return;
		}
		if (selectedOption === "customAmount" && !customAmountUSD) {
			setModalError("Please enter a custom USD amount.");
			return;
		}

		// Compute final amounts in USD & SAR
		// eslint-disable-next-line
		const { finalUSD, finalSAR } = getChargeAmount();

		// If payment is captured, ensure not to exceed remainingAmount
		if (isCaptured && finalSAR > remainingAmount) {
			toast.error("You can't over charge the guest, Please try another amount");
			return;
		}

		setModalError("");
		// Open the password confirmation modal
		setIsPasswordModalVisible(true);
	};

	const handlePasswordConfirm = async () => {
		// Validate password input
		if (!passwordInput) {
			setModalErrorPassword("Please enter the confirmation password.");
			return;
		}

		// Check if the entered password matches the environment variable
		if (passwordInput !== process.env.REACT_APP_CONFIRM_PAYMENT) {
			setModalErrorPassword("Incorrect password. Please try again.");
			toast.error("Incorrect password. Please try again.");
			return;
		}

		setModalErrorPassword("");

		// Proceed with payment trigger
		try {
			setLoading(true);
			setMessageText("");

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
			toast.success(response.message || "Payment captured successfully!");

			setTimeout(() => {
				window.location.reload(false);
			}, 1500);
		} catch (error) {
			console.error(error);
			toast.error(
				"This customer was charged before, confirm with your admin Ahmed."
			);
		} finally {
			setLoading(false);
			setIsPasswordModalVisible(false);
		}
	};

	const openOptionsModal = () => {
		setSelectedOption(null);
		setCustomAmountUSD("");
		setMessageText("");
		setModalError("");
		setIsModalVisible(true);
	};

	// **Updated Function: Handle Send Email Click**
	const handleSendEmailClick = async (
		reservationId,
		confirmationNumber,
		amountUSD,
		amountSAR
	) => {
		try {
			const response = await emailSendForTriggeringPayment(
				user._id, // userId
				token, // Bearer token
				reservationId,
				amountSAR
			);

			if (response.message === "Confirmation email sent successfully.") {
				toast.success(
					`Email successfully sent to ${reservation.customer_details.name}`
				);
			} else {
				toast.error(response.message || "Failed to send confirmation email.");
			}
		} catch (error) {
			toast.error(
				error.message || "An unexpected error occurred while sending the email."
			);
		}
	};

	// **Determine if the Send Email button should be disabled**
	const { finalUSD, finalSAR } = getChargeAmount();
	const isSendEmailDisabled =
		!hasPaymentDetails ||
		(Number(reservation.paid_amount) >= Number(reservation.total_amount) &&
			reservation.payment_details.isCaptured) ||
		!selectedOption ||
		(selectedOption === "customAmount" && !customAmountUSD) ||
		finalSAR > remainingAmount ||
		finalUSD <= 0;

	return (
		<PaymentTriggerWrapper>
			{/* No need for ToastContainer since you're using react-toastify */}
			<h3>Trigger Payment</h3>
			<p>This action will capture the payment for the reservation.</p>
			<Button onClick={openOptionsModal} disabled={loading || isDisabled}>
				{loading ? "Processing..." : "Capture Payment"}
			</Button>
			{isDisabled && (
				<DisabledMessage>
					{!hasPaymentDetails
						? "Add payment details to capture payment."
						: "The paid amount has already been captured."}
				</DisabledMessage>
			)}
			{messageText && (
				<Message success={messageText === "Payment captured successfully!"}>
					{messageText}
				</Message>
			)}

			{/* Payment Options Modal */}
			<Modal
				title='Select Payment Option'
				visible={isModalVisible}
				onOk={handlePaymentOptionConfirm}
				onCancel={() => setIsModalVisible(false)}
				okText='Confirm'
				cancelText='Cancel'
				width={600} // Adjust width if needed to accommodate the new button
			>
				<Radio.Group
					onChange={(e) => setSelectedOption(e.target.value)}
					value={selectedOption}
				>
					<Radio
						value='depositOnly'
						disabled={isCaptured && optionCommissionSAR > remainingAmount}
					>
						Capture Commission Only: ${option1_USD} USD ({option1_SAR} SAR)
						{isCaptured && optionCommissionSAR > remainingAmount && (
							<span style={{ color: "red", marginLeft: "10px" }}>
								(Exceeds remaining amount)
							</span>
						)}
					</Radio>
					<br />
					<Radio
						value='depositAndOneNight'
						style={{ marginTop: "10px" }}
						disabled={isCaptured && depositWithOneNight > remainingAmount}
					>
						Capture Commission + 1 Night: ${option2_USD} USD ({option2_SAR} SAR)
						{isCaptured && depositWithOneNight > remainingAmount && (
							<span style={{ color: "red", marginLeft: "10px" }}>
								(Exceeds remaining amount)
							</span>
						)}
					</Radio>
					<br />
					<Radio
						value='fullAmount'
						style={{ marginTop: "10px" }}
						disabled={isCaptured && optionFullAmountSAR > remainingAmount}
					>
						Capture Entire Amount: ${option3_USD} USD ({option3_SAR} SAR)
						{isCaptured && optionFullAmountSAR > remainingAmount && (
							<span style={{ color: "red", marginLeft: "10px" }}>
								(Exceeds remaining amount)
							</span>
						)}
					</Radio>
					<br />
					<Radio
						value='customAmount'
						style={{ marginTop: "10px" }}
						disabled={isCaptured && remainingAmount <= 0}
					>
						<span style={{ fontSize: "18px", fontWeight: "bold" }}>
							Custom Withdrawal Amount (USD)
						</span>
						{isCaptured && remainingAmount <= 0 && (
							<span style={{ color: "red", marginLeft: "10px" }}>
								(No remaining amount)
							</span>
						)}
					</Radio>
				</Radio.Group>
				{selectedOption === "customAmount" && (
					<CustomInput
						placeholder={`Max ${remainingAmountUSD} USD`}
						value={customAmountUSD}
						onChange={(e) => {
							const value = e.target.value;
							// Allow only numbers and decimal
							if (/^\d*\.?\d*$/.test(value)) {
								// Ensure the entered amount does not exceed remainingAmount in USD
								if (isCaptured) {
									const maxUSD = remainingAmount / exchangeRateUSD;
									if (Number(value) > maxUSD) {
										toast.error(
											`Maximum allowable amount is ${maxUSD.toFixed(2)} USD`
										);
										setCustomAmountUSD(maxUSD.toFixed(2));
										return;
									}
								}
								setCustomAmountUSD(value);
							}
						}}
						max={
							isCaptured
								? (remainingAmount / exchangeRateUSD).toFixed(2)
								: undefined
						}
					/>
				)}
				{modalError && <ModalError>{modalError}</ModalError>}

				{/* **Send Email Button Inside Modal** */}
				<SendEmailButton
					onClick={() => {
						handleSendEmailClick(
							reservation._id,
							reservation.confirmation_number,
							finalUSD,
							finalSAR
						);
					}}
					disabled={isSendEmailDisabled} // Disabled until a valid amount is selected
					aria-label='Send Email To Client To Confirm Payment'
				>
					Send Email To Client To Confirm Payment
				</SendEmailButton>
			</Modal>

			{/* Password Confirmation Modal */}
			<Modal
				title='Confirm Payment'
				visible={isPasswordModalVisible}
				onOk={handlePasswordConfirm}
				onCancel={() => {
					setIsPasswordModalVisible(false);
					setPasswordInput("");
					setModalErrorPassword("");
				}}
				okText='Confirm'
				cancelText='Cancel'
			>
				<p>Please enter your password to confirm the payment:</p>
				<PasswordInput
					type='password'
					placeholder='Enter confirmation password'
					value={passwordInput}
					onChange={(e) => setPasswordInput(e.target.value)}
				/>
				{modalErrorPassword && <ModalError>{modalErrorPassword}</ModalError>}
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
	position: relative; /* To position the send email button inside the modal */
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

const DisabledMessage = styled.p`
	color: red;
	font-size: 14px;
	margin-top: 10px;
`;

const CustomInput = styled(Input)`
	margin-top: 10px;
	font-size: 18px;
	font-weight: bold;
	text-align: center;
`;

const PasswordInput = styled(Input)`
	margin-top: 10px;
	font-size: 16px;
	text-align: center;
`;

const ModalError = styled.p`
	color: red;
	font-size: 14px;
	margin-top: 10px;
	text-align: center;
`;

// **New Styled Component: SendEmailButton**
const SendEmailButton = styled.button`
	width: 100%;
	margin-top: 20px;
	background-color: #28a745;
	color: white;
	padding: 12px 0;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
	font-weight: bold;
	box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);

	&:hover {
		background-color: #218838;
	}
	&:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
`;
