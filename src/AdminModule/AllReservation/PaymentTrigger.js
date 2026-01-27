// src/components/admin/PaymentTrigger.js

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { triggerPayment } from "../apiAdmin";
import { Modal, Radio, Input, message } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import { SUPER_USER_IDS } from "../utils/superUsers";

const safeNumber = (val) => {
	const n = Number(val);
	return Number.isFinite(n) ? n : 0;
};

const toMoney = (n) => Number(n || 0).toFixed(2);
const PAYMENT_MODAL_Z = 12110;
const PAYMENT_CONFIRM_MODAL_Z = 12120;

const PaymentTrigger = ({ reservation }) => {
	const { user, token } = isAuthenticated();
	const isSuperUser = SUPER_USER_IDS.includes(user?._id);

	// UI state
	const [loading, setLoading] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedOption, setSelectedOption] = useState(null);
	const [customAmountUSD, setCustomAmountUSD] = useState("");
	const [modalError, setModalError] = useState("");

	// Password modal
	const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
	const [passwordInput, setPasswordInput] = useState("");
	const [modalErrorPassword, setModalErrorPassword] = useState("");

	// Antd message config
	useEffect(() => {
		message.config({ top: 100, duration: 3, maxCount: 3 });
	}, []);

	// Exchange rates from localStorage
	const [exchangeRateUSD, setExchangeRateUSD] = useState(0.2667); // USD per 1 SAR
	useEffect(() => {
		const rates = JSON.parse(localStorage.getItem("rate"));
		if (rates) {
			setExchangeRateUSD(rates.SAR_USD || 0.2667);
			// EUR not needed here
		}
	}, []);

	/* ------------------------- Reservation helpers ------------------------- */

	// PayPal readiness: vault token or an authorization present
	const hasVault = !!reservation?.paypal_details?.vault_id;
	const hasAuth =
		!!reservation?.paypal_details?.initial?.authorization_id ||
		!!reservation?.payment_details?.authorizationId;

	const hasPaymentPath = hasVault || hasAuth;

	// Guest already paid in SAR so far
	const totalAmountSAR = safeNumber(reservation?.total_amount);
	const paidAmountSAR = safeNumber(reservation?.paid_amount);

	// Reservation remaining (SAR) & its USD equivalent
	const reservationRemainingSAR = Math.max(0, totalAmountSAR - paidAmountSAR);
	const reservationRemainingUSD = Number(
		(reservationRemainingSAR * exchangeRateUSD).toFixed(2)
	);

	// PayPal ledger remaining (USD)
	const limitUSD = safeNumber(reservation?.paypal_details?.bounds?.limit_usd);
	const capturedUSD = safeNumber(
		reservation?.paypal_details?.captured_total_usd
	);
	const pendingUSD = safeNumber(reservation?.paypal_details?.pending_total_usd);
	const ledgerRemainingUSD = Math.max(0, limitUSD - capturedUSD - pendingUSD);

	// Effective maximum we are allowed to capture right now (USD & SAR)
	const allowedMaxUSD = Number(
		Math.min(ledgerRemainingUSD, reservationRemainingUSD).toFixed(2)
	);
	const allowedMaxSAR = Number((allowedMaxUSD / exchangeRateUSD).toFixed(2));

	// Anything to capture?
	const captureDisabledGlobally = !hasPaymentPath || allowedMaxUSD <= 0;

	// Nights (kept from your original code)
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

	// Commission calc (as in your original)
	const computedCommissionPerNight = reservation?.pickedRoomsType
		? reservation.pickedRoomsType.reduce((total, room) => {
				let roomCommission = 0;
				if (room.pricingByDay && room.pricingByDay.length > 0) {
					roomCommission =
						room.pricingByDay.reduce((acc, day) => {
							return acc + (safeNumber(day.price) - safeNumber(day.rootPrice));
						}, 0) * safeNumber(room.count);
				}
				return total + roomCommission;
		  }, 0)
		: 0;
	const computedCommission = computedCommissionPerNight;

	const computeOneNightCost = () => {
		if (
			!reservation?.pickedRoomsType ||
			reservation.pickedRoomsType.length === 0
		)
			return 0;
		return reservation.pickedRoomsType.reduce((total, room) => {
			let firstDayRootPrice = 0;
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				firstDayRootPrice = safeNumber(room.pricingByDay[0].rootPrice);
			} else {
				firstDayRootPrice = safeNumber(room.chosenPrice);
			}
			return total + firstDayRootPrice * safeNumber(room.count);
		}, 0);
	};
	const oneNightCost = computeOneNightCost();

	// Option amounts (SAR)
	const optionCommissionSAR = computedCommission;
	const depositWithOneNight = computedCommission + oneNightCost;
	const optionFullAmountSAR = totalAmountSAR;

	// Convert to USD
	const option1_USD = (optionCommissionSAR * exchangeRateUSD).toFixed(2);
	const option2_USD = (depositWithOneNight * exchangeRateUSD).toFixed(2);
	const option3_USD = (optionFullAmountSAR * exchangeRateUSD).toFixed(2);

	const option1_SAR = optionCommissionSAR.toLocaleString();
	const option2_SAR = depositWithOneNight.toLocaleString();
	const option3_SAR = optionFullAmountSAR.toLocaleString();

	// Decide final amounts
	const getChargeAmount = useMemo(
		() => () => {
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
				finalUSD = parseFloat(customAmountUSD) || 0;
				finalSAR = finalUSD / exchangeRateUSD;
			}
			// Clamp for safety on UI side (backend also guards)
			if (finalUSD > allowedMaxUSD) {
				finalUSD = allowedMaxUSD;
				finalSAR = allowedMaxUSD / exchangeRateUSD;
			}
			return { finalUSD, finalSAR };
		},
		// deps:
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			selectedOption,
			customAmountUSD,
			option1_USD,
			option2_USD,
			option3_USD,
			optionCommissionSAR,
			depositWithOneNight,
			optionFullAmountSAR,
			exchangeRateUSD,
			allowedMaxUSD,
		]
	);

	/* ----------------------------- Modal handlers ----------------------------- */

	const openOptionsModal = () => {
		setSelectedOption(null);
		setCustomAmountUSD("");
		setModalError("");
		setIsModalVisible(true);
	};

	const handlePaymentOptionConfirm = () => {
		if (!selectedOption) {
			setModalError("Please select a payment option.");
			return;
		}
		if (selectedOption === "customAmount" && !customAmountUSD) {
			setModalError("Please enter a custom USD amount.");
			return;
		}
		const { finalUSD } = getChargeAmount();
		if (finalUSD <= 0) {
			setModalError("Please select a positive amount.");
			return;
		}
		setModalError("");
		if (isSuperUser) {
			setPasswordInput("");
			setModalErrorPassword("");
			void handlePasswordConfirm(true);
			return;
		}
		setIsPasswordModalVisible(true);
	};

	const handlePasswordConfirm = async (skipPassword = false) => {
		if (!skipPassword) {
			if (!passwordInput) {
				setModalErrorPassword("Please enter the confirmation password.");
				return;
			}
			if (passwordInput !== process.env.REACT_APP_CONFIRM_PAYMENT) {
				setModalErrorPassword("Incorrect password. Please try again.");
				toast.error("Incorrect password. Please try again.");
				return;
			}
		} else {
			setModalErrorPassword("");
			setPasswordInput("");
		}

		const { finalUSD, finalSAR } = getChargeAmount();

		// Double-check limits at click time
		if (finalUSD > allowedMaxUSD + 1e-9) {
			toast.error(
				`Amount exceeds the allowed maximum of $${allowedMaxUSD.toFixed(
					2
				)} USD (~${allowedMaxSAR.toFixed(2)} SAR).`
			);
			return;
		}

		try {
			setLoading(true);
			const reservationId = reservation._id;
			const cmid = reservation?.paypal_details?.initial?.cmid || null;

			const resp = await triggerPayment(
				user?._id,
				token,
				reservationId,
				finalUSD,
				selectedOption,
				selectedOption === "customAmount" ? customAmountUSD : null,
				finalSAR,
				cmid
			);

			toast.success(resp?.message || "Payment captured successfully!");

			// Wait 1.5s, then close modal and refresh
			setTimeout(() => {
				setIsPasswordModalVisible(false);
				setIsModalVisible(false);
				setLoading(false);
				window.location.reload(false);
			}, 1500);
		} catch (err) {
			console.error(err);
			setLoading(false);
			toast.error(
				err?.message ||
					"This customer was charged before, confirm with your admin Ahmed."
			);
		}
	};

	/* ------------------------------- UI helpers ------------------------------- */

	const isOption1Disabled =
		parseFloat(option1_USD) > allowedMaxUSD || allowedMaxUSD <= 0;
	const isOption2Disabled =
		parseFloat(option2_USD) > allowedMaxUSD || allowedMaxUSD <= 0;
	const isOption3Disabled =
		parseFloat(option3_USD) > allowedMaxUSD || allowedMaxUSD <= 0;

	// Disable main button if no path or nothing to capture
	const isDisabled = captureDisabledGlobally;

	const handleCustomChange = (e) => {
		const val = e.target.value;
		if (!/^\d*\.?\d*$/.test(val)) return; // allow only numbers/decimal
		const asNum = Number(val || 0);
		const maxUSD = allowedMaxUSD;
		if (asNum > maxUSD) {
			toast.error(`Maximum allowable amount is $${maxUSD.toFixed(2)} USD`);
			setCustomAmountUSD(maxUSD.toFixed(2));
			return;
		}
		setCustomAmountUSD(val);
	};

	// Preview for footer / info panel
	const { finalUSD, finalSAR } = getChargeAmount();

	return (
		<PaymentTriggerWrapper>
			<h3>Trigger Payment</h3>
			<p>This action will capture the payment for the reservation.</p>

			<Button onClick={openOptionsModal} disabled={isDisabled}>
				{isDisabled ? "Capture Unavailable" : "Capture Payment"}
			</Button>

			{isDisabled && (
				<DisabledMessage>
					{hasPaymentPath
						? "Nothing left to capture at this time."
						: "No saved card or authorization found for this reservation."}
				</DisabledMessage>
			)}

			{/* Payment Options Modal */}
			<Modal
				title='Select Payment Option'
				open={isModalVisible}
				onOk={handlePaymentOptionConfirm}
				onCancel={() => setIsModalVisible(false)}
				okText='Confirm'
				cancelText='Cancel'
				width={640}
				zIndex={PAYMENT_MODAL_Z}
				styles={{ mask: { zIndex: PAYMENT_MODAL_Z - 1 } }}
				getContainer={() => document.body}
			>
				{/* Remaining panel */}
				<InfoPanel>
					<div className='row'>
						<strong>Remaining you can capture now:</strong>
						<span>
							${toMoney(allowedMaxUSD)} USD (~{toMoney(allowedMaxSAR)} SAR)
						</span>
					</div>
					<div className='split'>
						<div className='col'>
							<div className='label'>
								<InfoCircleOutlined /> PayPal Ledger
							</div>
							<ul>
								<li>
									Limit: <b>${toMoney(limitUSD)}</b>
								</li>
								<li>
									Captured: <b>${toMoney(capturedUSD)}</b>
								</li>
								<li>
									Pending: <b>${toMoney(pendingUSD)}</b>
								</li>
								<li className='em'>
									Remaining: <b>${toMoney(ledgerRemainingUSD)}</b>
								</li>
							</ul>
						</div>
						<div className='col'>
							<div className='label'>
								<InfoCircleOutlined /> Reservation Balance
							</div>
							<ul>
								<li>
									Paid: <b>{toMoney(paidAmountSAR)} SAR</b>
								</li>
								<li>
									Total: <b>{toMoney(totalAmountSAR)} SAR</b>
								</li>
								<li className='em'>
									Remaining:{" "}
									<b>
										{toMoney(reservationRemainingSAR)} SAR (~$
										{toMoney(reservationRemainingUSD)})
									</b>
								</li>
							</ul>
						</div>
					</div>
				</InfoPanel>

				<Radio.Group
					onChange={(e) => setSelectedOption(e.target.value)}
					value={selectedOption}
				>
					<Radio value='depositOnly' disabled={isOption1Disabled}>
						Commission Only: ${option1_USD} USD ({option1_SAR} SAR)
						{isOption1Disabled && <Exceeded>(Exceeds allowed max)</Exceeded>}
					</Radio>
					<br />
					<Radio
						value='depositAndOneNight'
						style={{ marginTop: 10 }}
						disabled={isOption2Disabled}
					>
						Commission + 1 Night: ${option2_USD} USD ({option2_SAR} SAR)
						{isOption2Disabled && <Exceeded>(Exceeds allowed max)</Exceeded>}
					</Radio>
					<br />
					<Radio
						value='fullAmount'
						style={{ marginTop: 10 }}
						disabled={isOption3Disabled}
					>
						Entire Amount: ${option3_USD} USD ({option3_SAR} SAR)
						{isOption3Disabled && <Exceeded>(Exceeds allowed max)</Exceeded>}
					</Radio>
					<br />
					<Radio
						value='customAmount'
						style={{ marginTop: 10 }}
						disabled={allowedMaxUSD <= 0}
					>
						<span style={{ fontSize: 18, fontWeight: "bold" }}>
							Custom Withdrawal Amount (USD)
						</span>
					</Radio>
				</Radio.Group>

				{selectedOption === "customAmount" && (
					<CustomInput
						placeholder={`Max ${toMoney(allowedMaxUSD)} USD`}
						value={customAmountUSD}
						onChange={handleCustomChange}
					/>
				)}

				{modalError && <ModalError>{modalError}</ModalError>}

				{/* Live preview of current selection */}
				{selectedOption && (
					<SelectionPreview>
						<div>
							<span>Selected amount:&nbsp;</span>
							<b>${toMoney(finalUSD)} USD</b>
							<span>&nbsp;(~{toMoney(finalSAR)} SAR)</span>
						</div>
					</SelectionPreview>
				)}
			</Modal>

			{/* Password Confirmation Modal */}
			<Modal
				title='Confirm Payment'
				open={isPasswordModalVisible}
				onOk={handlePasswordConfirm}
				onCancel={() => {
					setIsPasswordModalVisible(false);
					setPasswordInput("");
					setModalErrorPassword("");
				}}
				okText={loading ? "Processing..." : "Confirm"}
				cancelText='Cancel'
				confirmLoading={loading} // <-- spinner on Confirm
				zIndex={PAYMENT_CONFIRM_MODAL_Z}
				styles={{ mask: { zIndex: PAYMENT_CONFIRM_MODAL_Z - 1 } }}
				getContainer={() => document.body}
			>
				<p>Please enter your password to confirm the payment:</p>
				<PasswordInput
					type='password'
					placeholder='Enter confirmation password'
					value={passwordInput}
					onChange={(e) => setPasswordInput(e.target.value)}
					disabled={loading}
				/>
				{modalErrorPassword && <ModalError>{modalErrorPassword}</ModalError>}
			</Modal>
		</PaymentTriggerWrapper>
	);
};

export default PaymentTrigger;

/* ------------------------------- styled UI ------------------------------- */

const PaymentTriggerWrapper = styled.div`
	text-align: center;
	padding: 20px;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	background-color: #fafafa;
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
`;

const Button = styled.button`
	background-color: #1677ff;
	color: #fff;
	padding: 10px 20px;
	border: 0;
	border-radius: 8px;
	cursor: pointer;
	font-size: 16px;
	margin-top: 8px;
	transition: all 0.2s ease-in-out;

	&:hover {
		background-color: #155bd6;
	}
	&:disabled {
		background-color: #cbd5e1;
		cursor: not-allowed;
	}
`;

const DisabledMessage = styled.p`
	color: #b91c1c;
	font-size: 14px;
	margin-top: 10px;
`;

const CustomInput = styled(Input)`
	margin-top: 12px;
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
	color: #dc2626;
	font-size: 14px;
	margin-top: 10px;
	text-align: center;
`;

const Exceeded = styled.span`
	color: #dc2626;
	margin-left: 8px;
	font-weight: 600;
`;

const SelectionPreview = styled.div`
	margin-top: 16px;
	padding: 10px 12px;
	border-radius: 8px;
	background: #f5faff;
	border: 1px solid #e6f0ff;
	text-align: center;
	font-size: 15px;
`;

const InfoPanel = styled.div`
	margin-bottom: 16px;
	padding: 12px;
	border-radius: 8px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;

	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 15px;
		margin-bottom: 8px;
	}
	.split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.col {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 10px;
	}
	.label {
		font-weight: 600;
		margin-bottom: 8px;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	ul {
		margin: 0;
		padding-left: 16px;
	}
	li {
		margin: 2px 0;
	}
	.em {
		color: #111827;
	}
`;
