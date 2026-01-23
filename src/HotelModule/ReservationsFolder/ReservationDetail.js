import React, {
	useEffect,
	useState,
	useRef,
	useMemo,
	useCallback,
} from "react";
import styled from "styled-components";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { Spin, Modal, Select, Checkbox } from "antd";
import moment from "moment";
import { EditOutlined } from "@ant-design/icons";
import {
	getHotelRooms,
	sendPaymnetLinkToTheClient,
	sendReservationConfirmationEmail,
	updateSingleReservation,
} from "../apiAdmin";
import { toast } from "react-toastify";
import { EditReservationMain } from "./EditWholeReservation/EditReservationMain";
import ReceiptPDF from "../NewReservation/ReceiptPDF";
import ReceiptPDFB2B from "../NewReservation/ReceiptPDFB2B";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";
import { relocationArray1 } from "./ReservationAssets";

const Wrapper = styled.div`
	min-height: 750px;
	margin-top: 30px;
	text-align: ${(props) => (props.isArabic ? "right" : "")};
`;

const Header = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 170px;
	background-color: #f2f2f2;
	padding: 0 16px;
	h4,
	h3 {
		font-weight: bold;
	}

	button {
		background-color: black;
		color: white;
		padding: 1px;
		font-size: 13px;
		border-radius: 5px;
		text-align: center;
		margin: auto;
	}
`;

const Section = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
`;

const HorizontalLine = styled.hr`
	border: none;
	border-bottom: 2px solid black;
	margin: 0;
`;

const Content = styled.div`
	display: flex;
	padding: 16px;
`;

const ContentSection = styled.div`
	padding: 0 16px;

	&:first-child,
	&:last-child {
		flex: 0 0 30%;
	}

	&:nth-child(2) {
		flex: 0 0 40%;
		border-right: 1px solid #ddd;
		border-left: 1px solid #ddd;
	}
`;

const ReservationDetail = ({ reservation, setReservation, hotelDetails }) => {
	const pdfRef = useRef(null);
	// eslint-disable-next-line
	const [loading, setLoading] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isModalVisible2, setIsModalVisible2] = useState(false);
	const [isModalVisible3, setIsModalVisible3] = useState(false); // Receipt (ReceiptPDF)
	const [isModalVisible5, setIsModalVisible5] = useState(false); // Ops Receipt (ReceiptPDFB2B)
	const [isModalVisible4, setIsModalVisible4] = useState(false);
	const [linkModalVisible, setLinkModalVisible] = useState(false);
	const [chosenRooms, setChosenRooms] = useState([]);
	const [selectedHotelDetails, setSelectedHotelDetails] = useState("");
	const [sendEmail, setSendEmail] = useState(true);

	// eslint-disable-next-line
	const [selectedStatus, setSelectedStatus] = useState("");
	const [linkGenerate, setLinkGenerated] = useState("");

	const { languageToggle, chosenLanguage } = useCartContext();

	// eslint-disable-next-line
	const { user, token } = isAuthenticated();

	const normalizeNumber = useCallback((value, fallback = 0) => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}, []);

	const formatMoney = useCallback(
		(value) => normalizeNumber(value, 0).toLocaleString(),
		[normalizeNumber],
	);

	const summarizePayment = useCallback(
		(reservationData, paymentOverride = "") => {
			const paymentModeRaw =
				(paymentOverride ||
					reservationData?.payment ||
					reservationData?.payment_status ||
					reservationData?.financeStatus ||
					"") + "";
			const paymentMode = paymentModeRaw.toLowerCase().trim();
			const pd = reservationData?.paypal_details || {};
			const legacyCaptured = !!reservationData?.payment_details?.captured;
			const payOffline =
				normalizeNumber(
					reservationData?.payment_details?.onsite_paid_amount,
					0,
				) > 0 || paymentMode === "paid offline";
			const capTotal = normalizeNumber(pd?.captured_total_usd, 0);
			const initialCompleted =
				(pd?.initial?.capture_status || "").toUpperCase() === "COMPLETED";
			const anyMitCompleted =
				Array.isArray(pd?.mit) &&
				pd.mit.some(
					(c) => (c?.capture_status || "").toUpperCase() === "COMPLETED",
				);

			const isCaptured =
				legacyCaptured ||
				capTotal > 0 ||
				initialCompleted ||
				anyMitCompleted ||
				paymentMode === "paid online" ||
				paymentMode === "captured" ||
				paymentMode === "credit/ debit" ||
				paymentMode === "credit/debit";

			const isNotPaid =
				paymentMode === "not paid" && !isCaptured && !payOffline;

			let status = "Not Captured";
			if (isCaptured) status = "Captured";
			else if (payOffline) status = "Paid Offline";
			else if (isNotPaid) status = "Not Paid";

			return { status, isCaptured, paidOffline: payOffline, paymentMode };
		},
		[normalizeNumber],
	);

	const getReservationRoomIds = useCallback((roomIdValue) => {
		if (!Array.isArray(roomIdValue)) return [];
		return roomIdValue
			.map((room) => {
				if (!room) return null;
				if (typeof room === "string") return room;
				if (typeof room === "object" && room._id) return room._id;
				return room;
			})
			.filter(Boolean)
			.map((id) => String(id));
	}, []);

	const getTotalAmountPerDay = (pickedRoomsType) => {
		return pickedRoomsType.reduce((total, room) => {
			return total + room.chosenPrice * room.count;
		}, 0);
	};

	const calculateDaysBetweenDates = (startDate, endDate) => {
		const start = new Date(startDate);
		const end = new Date(endDate);
		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			console.error("Invalid start or end date");
			return 0;
		}
		const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
		return days > 0 ? days : 1; // Ensures a minimum of 1 day
	};

	// eslint-disable-next-line
	const daysOfResidence = calculateDaysBetweenDates(
		reservation.checkin_date,
		reservation.checkout_date,
	);

	const paymentSummary = useMemo(
		() => summarizePayment(reservation),
		[reservation, summarizePayment],
	);
	const totalAmountValue = normalizeNumber(reservation?.total_amount, 0);
	const paidOnline = normalizeNumber(reservation?.paid_amount, 0);
	const paidOffline = normalizeNumber(
		reservation?.payment_details?.onsite_paid_amount,
		0,
	);
	const totalPaid = paidOnline + paidOffline;
	const isCreditDebit =
		paymentSummary.paymentMode === "credit/ debit" ||
		paymentSummary.paymentMode === "credit/debit";
	const assumePaidInFull =
		isCreditDebit || (paymentSummary.isCaptured && totalPaid === 0);
	const amountDue = assumePaidInFull
		? 0
		: Math.max(totalAmountValue - totalPaid, 0);
	const displayPaymentLabel =
		reservation?.payment ||
		reservation?.payment_status ||
		reservation?.financeStatus ||
		"";

	// Same as in MoreDetails
	function calculateReservationPeriod(checkin, checkout, language) {
		const checkinDate = moment(checkin).startOf("day");
		const checkoutDate = moment(checkout).startOf("day");
		const days = checkoutDate.diff(checkinDate, "days") + 1;
		const nights = days - 1;

		const daysText = language === "Arabic" ? "أيام" : "days";
		const nightsText = language === "Arabic" ? "ليال" : "nights";

		return `${days} ${daysText} / ${nights} ${nightsText}`;
	}

	const handleUpdateReservationStatus = () => {
		if (!selectedStatus) {
			return toast.error("Please Select A Status...");
		}

		const confirmationMessage = `Are you sure you want to change the status of the reservation to ${selectedStatus}?`;
		if (window.confirm(confirmationMessage)) {
			const updateData = {
				reservation_status: selectedStatus,
				hotelName: hotelDetails.hotelName,
				sendEmail, // ✅ mirror MoreDetails
			};

			if (selectedStatus === "early_checked_out") {
				const newCheckoutDate = new Date();
				const startDate = new Date(reservation.checkin_date);
				const diffTime = Math.abs(newCheckoutDate - startDate);
				const daysOfResidence = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				updateData.checkout_date = newCheckoutDate.toISOString();
				updateData.days_of_residence = daysOfResidence;

				const totalAmountPerDay = reservation.pickedRoomsType.reduce(
					(total, room) => total + room.count * parseFloat(room.chosenPrice),
					0,
				);

				updateData.total_amount = totalAmountPerDay * daysOfResidence;
			}

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					toast.success("Status was successfully updated");
					setIsModalVisible(false);
					setReservation(response.reservation);
				}
			});
		}
	};

	const handleUpdateReservationStatus2 = () => {
		if (!selectedStatus) {
			return toast.error("Please Select A Status...");
		}

		const confirmationMessage = `Are you sure you want to change the status of the reservation to ${selectedStatus}?`;
		if (window.confirm(confirmationMessage)) {
			const updateData = { reservation_status: selectedStatus };

			if (selectedStatus === "early_checked_out") {
				const newCheckoutDate = new Date();
				const startDate = new Date(reservation.checkin_date);
				const diffTime = Math.abs(newCheckoutDate - startDate);
				const daysOfResidence = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				updateData.checkout_date = newCheckoutDate.toISOString();
				updateData.days_of_residence = daysOfResidence;

				const totalAmountPerDay = reservation.pickedRoomsType.reduce(
					(total, room) => {
						return total + room.count * parseFloat(room.chosenPrice);
					},
					0,
				);

				updateData.total_amount = totalAmountPerDay * daysOfResidence;
			}

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					toast.success("Status was successfully updated");
					setIsModalVisible(false);
					setReservation(response);
				}
			});
		}
	};

	const handleUpdateReservationStatus3 = () => {
		if (
			!selectedHotelDetails ||
			!selectedHotelDetails.belongsTo ||
			!selectedHotelDetails._id
		) {
			return toast.error("Please Select Your Desired Hotel For Relocation");
		}

		const confirmationMessage = `Are You Sure You want to re-locate this reservation? Once relocated, it will disappear from your reservation list`;
		if (window.confirm(confirmationMessage)) {
			const updateData = {
				belongsTo: selectedHotelDetails.belongsTo,
				hotelId: selectedHotelDetails._id,
				state: "relocated",
			};

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					toast.success("Reservation was successfully relocated");
					setIsModalVisible4(false);
					setTimeout(() => {
						window.location.reload(false);
					}, 2000);
				}
			});
		}
	};

	const roomIdValue = reservation?.roomId;
	const hotelIdValue = reservation?.hotelId;

	const getHotelRoomsDetails = useCallback(() => {
		if (!hotelIdValue || !user?._id) return;
		getHotelRooms(hotelIdValue, user._id).then((data3) => {
			if (data3 && data3.error) {
				console.log(data3.error);
			} else {
				const roomIds = getReservationRoomIds(roomIdValue);
				const filteredRooms = Array.isArray(data3)
					? data3.filter((room) => roomIds.includes(String(room._id)))
					: [];
				setChosenRooms(filteredRooms);
			}
		});
	}, [getReservationRoomIds, hotelIdValue, roomIdValue, user?._id]);

	useEffect(() => {
		if (Array.isArray(roomIdValue) && roomIdValue.length > 0) {
			getHotelRoomsDetails();
		} else {
			setChosenRooms([]);
		}
	}, [roomIdValue, getHotelRoomsDetails]);

	const roomTableRows = useMemo(() => {
		const fromDetails = Array.isArray(reservation?.roomDetails)
			? reservation.roomDetails.filter(Boolean)
			: [];
		if (fromDetails.length > 0) return fromDetails;

		const fromChosen = Array.isArray(chosenRooms)
			? chosenRooms.filter(Boolean)
			: [];
		if (fromChosen.length > 0) return fromChosen;

		const fromRoomId = Array.isArray(reservation?.roomId)
			? reservation.roomId.filter(
					(room) => room && typeof room === "object" && room.room_number,
			  )
			: [];
		return fromRoomId;
	}, [reservation, chosenRooms]);

	const downloadPDF = () => {
		html2canvas(pdfRef.current, { scale: 1 }).then((canvas) => {
			const imgData = canvas.toDataURL("image/png");

			const pdf = new jsPDF({
				orientation: "p",
				unit: "pt",
				format: "a4",
			});

			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

			const imgHeight = (canvas.height * pdfWidth) / canvas.width;
			let heightLeft = imgHeight;

			let position = 0;

			pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
			heightLeft -= pdfHeight;

			while (heightLeft >= 0) {
				position = heightLeft - imgHeight;
				pdf.addPage();
				pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
				heightLeft -= pdfHeight;
			}

			pdf.save("receipt.pdf");
		});
	};

	// eslint-disable-next-line
	const getAverageRootPrice = (pickedRoomsType) => {
		if (!pickedRoomsType || pickedRoomsType.length === 0) return 0;

		let totalRootPrice = 0;
		let totalDays = 0;

		pickedRoomsType.forEach((room) => {
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				room.pricingByDay.forEach((day) => {
					totalRootPrice += parseFloat(day.rootPrice);
				});
				totalDays += room.pricingByDay.length;
			}
		});

		return totalDays > 0 ? totalRootPrice / totalDays : 0;
	};

	// eslint-disable-next-line
	const calculateOverallTotalRootPrice = (pickedRoomsType) => {
		if (!pickedRoomsType || pickedRoomsType.length === 0) return 0;

		return pickedRoomsType.reduce((total, room) => {
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				const roomTotal = room.pricingByDay.reduce((dayTotal, day) => {
					return dayTotal + parseFloat(day.rootPrice);
				}, 0);
				return total + roomTotal * room.count;
			}
			return total;
		}, 0);
	};

	return (
		<Wrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			isArabic={chosenLanguage === "Arabic"}
		>
			{loading ? (
				<div className='text-center my-5'>
					<Spin size='large' />
					<p>Loading...</p>
				</div>
			) : (
				<div className='otherContentWrapper'>
					{/* EDIT RESERVATION MODAL */}
					<Modal
						title={
							chosenLanguage === "Arabic" ? "تعديل الحجز" : "Edit Reservation"
						}
						open={isModalVisible2}
						onCancel={() => setIsModalVisible2(false)}
						onOk={handleUpdateReservationStatus2}
						footer={null}
						width='84.5%'
						style={{
							position: "absolute",
							left: chosenLanguage === "Arabic" ? "1%" : "auto",
							right: chosenLanguage === "Arabic" ? "auto" : "5%",
							top: "1%",
						}}
					>
						{reservation && (
							<EditReservationMain
								reservation={reservation}
								setReservation={setReservation}
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
							/>
						)}
					</Modal>

					{/* UPDATE STATUS MODAL (matches MoreDetails incl. checkbox) */}
					<Modal
						title={
							chosenLanguage === "Arabic"
								? "تعديل الحجز"
								: "Update Reservation Status"
						}
						open={isModalVisible}
						onCancel={() => setIsModalVisible(false)}
						onOk={handleUpdateReservationStatus}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
					>
						<Select
							defaultValue={reservation && reservation.reservation_status}
							style={{ width: "100%" }}
							onChange={(value) => setSelectedStatus(value)}
						>
							<Select.Option value=''>Please Select</Select.Option>
							<Select.Option value='cancelled'>Cancelled</Select.Option>
							<Select.Option value='no_show'>No Show</Select.Option>
							<Select.Option value='confirmed'>Confirmed</Select.Option>
							{/* <Select.Option value='inhouse'>InHouse</Select.Option> */}
							{reservation &&
							reservation.roomId &&
							reservation.roomId.length > 0 ? (
								<Select.Option value='checked_out'>Checked Out</Select.Option>
							) : null}
							{reservation &&
							reservation.roomId &&
							reservation.roomId.length > 0 ? (
								<Select.Option value='early_checked_out'>
									Early Check Out
								</Select.Option>
							) : null}
						</Select>

						{/* Send email checkbox (new, mirrors MoreDetails) */}
						<Checkbox
							checked={sendEmail}
							onChange={(e) => setSendEmail(e.target.checked)}
							style={{ marginTop: "16px" }}
						>
							Send Email Notification to the Customer
						</Checkbox>
					</Modal>

					{/* RELOCATE MODAL */}
					<Modal
						title={
							chosenLanguage === "Arabic"
								? "نقل الحجز؟"
								: "Relocate Reservation?"
						}
						open={isModalVisible4}
						onCancel={() => setIsModalVisible4(false)}
						onOk={handleUpdateReservationStatus3}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
					>
						<Select
							defaultValue={
								reservation && hotelDetails && hotelDetails.hotelName
							}
							style={{ width: "100%", textTransform: "capitalize" }}
							onChange={(value) => setSelectedHotelDetails(JSON.parse(value))}
						>
							<Select.Option value=''>Please Select</Select.Option>
							{relocationArray1.map((hotel) => (
								<Select.Option
									style={{ textTransform: "capitalize" }}
									key={hotel._id}
									value={JSON.stringify(hotel)}
								>
									{hotel.hotelName}
								</Select.Option>
							))}
						</Select>
					</Modal>

					{/* PAYMENT LINK MODAL */}
					<Modal
						open={linkModalVisible}
						onCancel={() => setLinkModalVisible(false)}
						onOk={() => setLinkModalVisible(false)}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
						width={"70%"}
					>
						<h3>Payment Link:</h3>
						<div
							style={{
								marginTop: "50px",
								marginBottom: "50px",
								fontSize: "1rem",
								cursor: "pointer",
								textAlign: "center",
								fontWeight: "bold",
								textDecoration: "underline",
								color: "darkblue",
							}}
							onClick={() =>
								window.open(linkGenerate, "_blank", "noopener,noreferrer")
							}
						>
							{linkGenerate}
						</div>
					</Modal>

					{/* LANGUAGE TOGGLE */}
					<div
						style={{
							textAlign: chosenLanguage === "Arabic" ? "left" : "right",
							fontWeight: "bold",
							textDecoration: "underline",
							cursor: "pointer",
						}}
						onClick={() => {
							if (chosenLanguage === "English") {
								languageToggle("Arabic");
							} else {
								languageToggle("English");
							}
						}}
					>
						{chosenLanguage === "English" ? "ARABIC" : "English"}
					</div>

					<div className='container-wrapper'>
						{/* EDIT ACTION ENTRY */}
						<h5
							className='text-center mx-auto'
							style={{
								fontWeight: "bold",
								textDecoration: "underline",
								cursor: "pointer",
								color: "darkgoldenrod",
							}}
							onClick={() => {
								setIsModalVisible2(true);
							}}
						>
							<EditOutlined />
							{chosenLanguage === "Arabic" ? "تعديل الحجز" : "Edit Reservation"}
						</h5>

						{/* RELOCATE ENTRY (same condition you already had) */}
						{relocationArray1 &&
							relocationArray1.some(
								(hotel) =>
									hotel._id === hotelDetails._id &&
									hotel.belongsTo === hotelDetails.belongsTo._id,
							) && (
								<h5
									className='text-center mx-auto mt-3'
									style={{
										fontWeight: "bold",
										textDecoration: "underline",
										cursor: "pointer",
										color: "#67634c",
									}}
									onClick={() => {
										setIsModalVisible4(true);
									}}
								>
									<EditOutlined />
									{chosenLanguage === "Arabic"
										? "نقل الحجز؟"
										: "Relocate Reservation?"}
								</h5>
							)}

						{/* RECEIPT (ReceiptPDF) */}
						<Modal
							title='Receipt Download'
							open={isModalVisible3}
							onCancel={() => setIsModalVisible3(false)}
							onOk={() => setIsModalVisible3(false)}
							footer={null}
							width='84.5%'
							style={{
								position: "absolute",
								left: chosenLanguage === "Arabic" ? "15%" : "auto", // match MoreDetails
								right: chosenLanguage === "Arabic" ? "auto" : "5%",
								top: "1%",
							}}
						>
							<div className='text-center my-3 '>
								<button
									className='btn btn-info w-50'
									style={{ fontWeight: "bold", fontSize: "1.1rem" }}
									onClick={downloadPDF}
								>
									Print To PDF
								</button>
							</div>

							{reservation && (
								<div dir='ltr'>
									<ReceiptPDF
										ref={pdfRef}
										reservation={reservation}
										hotelDetails={hotelDetails}
										calculateReservationPeriod={calculateReservationPeriod}
										getTotalAmountPerDay={getTotalAmountPerDay}
									/>
								</div>
							)}
						</Modal>

						{/* OPS RECEIPT (ReceiptPDFB2B) — NEW to match MoreDetails */}
						<Modal
							title='Ops Receipt'
							open={isModalVisible5}
							onCancel={() => setIsModalVisible5(false)}
							onOk={() => setIsModalVisible5(false)}
							footer={null}
							width='84.5%'
							style={{
								position: "absolute",
								left: chosenLanguage === "Arabic" ? "15%" : "auto", // match MoreDetails
								right: chosenLanguage === "Arabic" ? "auto" : "5%",
								top: "1%",
							}}
						>
							<div className='text-center my-3 '>
								<button
									className='btn btn-info w-50'
									style={{ fontWeight: "bold", fontSize: "1.1rem" }}
									onClick={downloadPDF}
								>
									Print To PDF
								</button>
							</div>

							{reservation && (
								<div dir='ltr'>
									<ReceiptPDFB2B
										ref={pdfRef}
										reservation={reservation}
										hotelDetails={hotelDetails}
										calculateReservationPeriod={calculateReservationPeriod}
										getTotalAmountPerDay={getTotalAmountPerDay}
									/>
								</div>
							)}
						</Modal>

						{/* HEADER */}
						<Header>
							<Section>
								{/* Left side of the header */}
								<div className='row'>
									<div className='col-md-6 my-auto'>
										<div className='col-md-6 my-auto'>
											<div>
												{chosenLanguage === "Arabic"
													? "المبلغ الإجمالي"
													: "Total Amount"}
											</div>
											<h4 className='mx-2'>
												{reservation
													? reservation.total_amount.toLocaleString()
													: 0}{" "}
												{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
											</h4>
										</div>
										<div className='col-md-12'>
											<h3 style={{ fontSize: "1.5rem", color: "black" }}>
												Confirmation #:{" "}
												{reservation &&
													reservation.customer_details &&
													reservation.confirmation_number}
											</h3>
										</div>
									</div>

									{chosenLanguage === "Arabic" ? (
										<div className='col-md-5 text-center my-auto'>
											<button
												className='my-2'
												onClick={() => setIsModalVisible3(true)}
											>
												فاتورة رسمية
											</button>
											<button
												className='mx-2 my-2'
												onClick={() => setIsModalVisible5(true)}
											>
												Operation Order
											</button>
											{linkGenerate ? (
												<>
													<button
														onClick={() => {
															sendPaymnetLinkToTheClient(
																linkGenerate,
																reservation.customer_details.email,
															).then((data) => {
																if (data && data.error) {
																	console.log(data.error);
																} else {
																	toast.success(
																		"Email Was Successfully Sent to the guest!",
																	);
																}
															});
														}}
														style={{
															background: "darkgreen",
															border: "1px darkred solid",
														}}
													>
														Email Payment Link To The Client
													</button>
													<br />
													<div
														className='mx-2 mt-2'
														style={{ cursor: "pointer" }}
														onClick={() => {
															setLinkModalVisible(true);
														}}
													>
														Show Link <i className='fa-solid fa-eye'></i>
													</div>
												</>
											) : (
												<button
													style={{
														background: "darkred",
														border: "1px darkred solid",
													}}
													onClick={() => {
														setLinkGenerated(
															`${process.env.REACT_APP_MAIN_URL_JANNAT}/client-payment/${reservation._id}/${reservation.confirmation_number}`,
														);
													}}
												>
													Generate Payment Link
												</button>
											)}
										</div>
									) : (
										<div className='col-md-4 mx-auto text-center'>
											<button
												className='my-2'
												onClick={() => setIsModalVisible3(true)}
											>
												Invoice
											</button>
											<button
												className='mx-2'
												onClick={() => setIsModalVisible5(true)}
											>
												Operation Order
											</button>
											{linkGenerate ? (
												<>
													<button
														onClick={() => {
															sendPaymnetLinkToTheClient(
																linkGenerate,
																reservation.customer_details.email,
															).then((data) => {
																if (data && data.error) {
																	console.log(data.error);
																} else {
																	toast.success(
																		"Email Was Successfully Sent to the guest!",
																	);
																}
															});
														}}
														style={{
															background: "darkgreen",
															border: "1px darkred solid",
														}}
													>
														Email Payment Link To The Client
													</button>
													<br />
													<div
														className='mx-2 mt-2'
														style={{ cursor: "pointer" }}
														onClick={() => {
															setLinkModalVisible(true);
														}}
													>
														Show Link <i className='fa-solid fa-eye'></i>
													</div>
												</>
											) : (
												<button
													style={{
														background: "darkred",
														border: "1px darkred solid",
													}}
													onClick={() => {
														setLinkGenerated(
															`${
																process.env.REACT_APP_MAIN_URL_JANNAT
															}/client-payment/${reservation._id}/${
																reservation._id
															}/${reservation._id}/${
																hotelDetails.hotelName
															}/roomTypes/${reservation._id}/${
																reservation._id
															}/${reservation.days_of_residence}/${Number(
																reservation.total_amount,
															).toFixed(2)}`,
														);
													}}
												>
													Generate Payment Link
												</button>
											)}
										</div>
									)}

									<div className='col-md-8'></div>
									<div
										className='col-md-3 mx-auto text-center'
										style={{
											textAlign: chosenLanguage === "Arabic" ? "center" : "",
											fontSize: "1.1rem",
											fontWeight: "bold",
										}}
									>
										{chosenLanguage === "Arabic"
											? "حالة الحجز"
											: "Reservation Status"}
										<EditOutlined
											onClick={() => setIsModalVisible(true)}
											style={{
												marginLeft: "5px",
												marginRight: "5px",
												cursor: "pointer",
											}}
										/>
										<div
											className=''
											style={{
												background:
													reservation &&
													reservation.reservation_status.includes("cancelled")
														? "red"
														: reservation.reservation_status.includes(
																	"checked_out",
														    )
														  ? "darkgreen"
														  : reservation.reservation_status === "inhouse"
														    ? "#c4d3e2"
														    : "yellow",
												color:
													reservation &&
													reservation.reservation_status.includes("cancelled")
														? "white"
														: reservation.reservation_status.includes(
																	"checked_out",
														    )
														  ? "white"
														  : "black",
												textAlign: "center",
												textTransform: "uppercase",
											}}
										>
											{reservation && reservation.reservation_status}
										</div>
									</div>
								</div>
							</Section>

							<Section>
								{/* Right side of the header */}
								<div className='row'>
									<div className='col-md-12'>
										<h3 style={{ fontSize: "2.5rem" }}>
											{reservation &&
												reservation.customer_details &&
												reservation.customer_details.name}
										</h3>
										<div className='row  my-2'>
											<button
												className='col-md-5'
												onClick={() => {
													sendReservationConfirmationEmail({
														...reservation,
														hotelName: hotelDetails.hotelName,
													}).then((data) => {
														if (data && data.error) {
															toast.error("Failed Sending Email");
														} else {
															toast.success(
																`Email was successfully sent to ${reservation.customer_details.email}`,
															);
														}
													});
												}}
											>
												Email
											</button>
											<button className='col-md-5'>SMS</button>
										</div>
									</div>
								</div>
							</Section>
						</Header>

						<HorizontalLine />

						<Content>
							{/* LEFT COLUMN */}
							<ContentSection>
								<div
									className='row'
									style={{ fontSize: "17px", fontWeight: "bold" }}
								>
									<div className='col-md-5'>
										{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{moment(reservation && reservation.checkin_date)
												.locale(chosenLanguage === "Arabic" ? "ar" : "en")
												.format("DD/MM/YYYY")}
										</div>
									</div>
									<div className='col-md-5'>
										{chosenLanguage === "Arabic"
											? "تاريخ المغادرة"
											: "Check-out"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{moment(reservation && reservation.checkout_date)
												.locale(chosenLanguage === "Arabic" ? "ar" : "en")
												.format("DD/MM/YYYY")}
										</div>
									</div>
									<div className='col-md-5 mx-auto mt-3'>
										{chosenLanguage === "Arabic"
											? "فترة الحجز"
											: "Reservation Period"}
										<div>
											{reservation
												? calculateReservationPeriod(
														reservation.checkin_date,
														reservation.checkout_date,
														chosenLanguage,
												  )
												: ""}
										</div>
									</div>
								</div>

								<div
									className='row mt-5'
									style={{ fontSize: "15px", fontWeight: "bold" }}
								>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "الجنسية" : "Nationality"}
										<div className='mx-2'>
											{reservation &&
											reservation.customer_details &&
											reservation.customer_details.nationality
												? reservation.customer_details.nationality
												: "N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "رقم جواز السفر"
											: "Passport #"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.passport) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "نسخة جواز السفر"
											: "Passport Copy #"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details.copyNumber) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "العنوان" : "Address"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details &&
												reservation.customer_details.nationality) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "الهاتف" : "Phone"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.phone) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "البريد" : "Email"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.email) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-12 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "تاريخ الميلاد"
											: "Date Of Birth"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details &&
												reservation.customer_details.passportExpiry) ||
												"N/A"}
										</div>
									</div>
								</div>

								{reservation &&
								reservation.customer_details &&
								reservation.customer_details.carLicensePlate ? (
									<div
										className='row mt-2'
										style={{ fontSize: "15px", fontWeight: "bold" }}
									>
										<div className='col-md-4 mx-auto text-center mx-auto my-2'>
											{chosenLanguage === "Arabic"
												? "رقم لوحة السيارة"
												: "License Plate"}
											<div className='mx-2'>
												{(reservation &&
													reservation.customer_details.carLicensePlate) ||
													"N/A"}
											</div>
										</div>
										<div className='col-md-4 mx-auto text-center mx-auto my-2'>
											{chosenLanguage === "Arabic"
												? "رقم لوحة السيارة"
												: "License Plate"}
											<div className='mx-2'>
												{(reservation &&
													reservation.customer_details.carColor) ||
													"N/A"}
											</div>
										</div>
										<div className='col-md-4 mx-auto text-center mx-auto my-2'>
											{chosenLanguage === "Arabic"
												? "رقم لوحة السيارة"
												: "License Plate"}
											<div className='mx-2'>
												{(reservation &&
													reservation.customer_details.carModel) ||
													"N/A"}
											</div>
										</div>
									</div>
								) : (
									<div
										className='mt-3'
										style={{
											fontSize: "15px",
											fontWeight: "bold",
											textAlign: "center",
										}}
									>
										Guest Doesn't Have A Car!
									</div>
								)}
							</ContentSection>

							{/* MIDDLE COLUMN */}
							<ContentSection>
								<div
									className='row mt-5'
									style={{ fontWeight: "bold", fontSize: "16px" }}
								>
									<div className='col-md-4'>
										{chosenLanguage === "Arabic"
											? "مصدر الحجز"
											: "Booking Source"}
										<div
											className='mx-1'
											style={{ textTransform: "capitalize" }}
										>
											{reservation && reservation.booking_source}
										</div>
									</div>

									<div className='col-md-4'>
										{chosenLanguage === "Arabic"
											? "تاريخ الحجز"
											: "Booking Date"}
										<div className='mx-1'>
											{reservation && reservation.booked_at
												? new Intl.DateTimeFormat(
														chosenLanguage === "Arabic" ? "ar-EG" : "en-GB",
														{
															year: "numeric",
															month: "2-digit",
															day: "2-digit",
														},
												  ).format(new Date(reservation.booked_at))
												: "N/A"}
										</div>
									</div>

									<div className='col-md-4 my-5 mx-auto'>
										{chosenLanguage === "Arabic"
											? "نوع الغرفة"
											: "Reserved Room Types"}
										<div className='mx-1'>
											{reservation.pickedRoomsType.map((room, index) => (
												<div key={index}>
													<div>{room.room_type}</div>
													{room.displayName}
												</div>
											))}
										</div>
									</div>

									<div className='col-md-4 my-5 mx-auto'>
										{chosenLanguage === "Arabic"
											? "عدد الزوار"
											: "Count Of Visitors"}
										<div className='mx-1'>
											{reservation && reservation.total_guests}
										</div>
									</div>

									<div className='col-md-8 my-4 mx-auto'>
										{chosenLanguage === "Arabic" ? "ملحوظة" : "Comment"}
										<div>{reservation && reservation.comment}</div>
									</div>

									{roomTableRows && roomTableRows.length > 0 ? (
										<div className='table-responsive'>
											<table
												className='table table-bordered table-hover mx-auto'
												style={{
													textAlign: "center",
													marginTop: "10px",
													width: "90%",
												}}
											>
												<thead className='thead-light'>
													<tr>
														<th
															scope='col'
															style={{ width: "50%", fontWeight: "bold" }}
														>
															Room Type
														</th>
														<th
															scope='col'
															style={{ width: "50%", fontWeight: "bold" }}
														>
															Room Number
														</th>
													</tr>
												</thead>
												<tbody>
													{roomTableRows.map((room, index) => (
														<tr key={index}>
															<td style={{ textTransform: "capitalize" }}>
																{room.room_type || room.roomType || "N/A"}
															</td>
															<td>{room.room_number || "N/A"}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									) : (
										<div
											className='mx-auto'
											style={{ marginTop: "10px", fontWeight: "bold" }}
										>
											{chosenLanguage === "Arabic" ? "No Room" : "No Room"}
										</div>
									)}
									{reservation?.bedNumber &&
									Array.isArray(reservation.bedNumber) &&
									reservation.bedNumber.length > 0 ? (
										<div
											className='mx-auto mt-2'
											style={{ fontWeight: "bold", textAlign: "center" }}
										>
											{chosenLanguage === "Arabic" ? "الأسرّة" : "Beds"} :{" "}
											{reservation.bedNumber.join(", ")}
										</div>
									) : null}
								</div>
							</ContentSection>

							{/* RIGHT COLUMN */}
							<ContentSection>
								<div
									className='row'
									style={{
										maxHeight: "350px",
										overflow: "auto",
										fontSize: "16px",
									}}
								>
									{reservation &&
										reservation.pickedRoomsType.map((room, index) => (
											<React.Fragment key={index}>
												<div className='col-md-4 mt-2'>{/* Date */}</div>
												<div className='col-md-4 mt-2'>{room.room_type}</div>
												<div className='col-md-4 mt-2'>
													{room.chosenPrice.toLocaleString() * room.count}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</div>
											</React.Fragment>
										))}
									<div className='col-md-4 mt-2'></div>
									<div className='col-md-4 mt-2'></div>
									<div className='col-md-4 mt-2 text-center pb-3'>
										<div style={{ fontWeight: "bold", fontSize: "13px" }}>
											{chosenLanguage === "Arabic"
												? "المبلغ الإجمالي"
												: "Total Amount"}
										</div>
										<div style={{ fontWeight: "bold" }}>
											{reservation && reservation.total_amount.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>
								</div>

								<div className='mt-5'>
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic"
												? "الضرائب والرسوم "
												: "Taxes & Extra Fees"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{0} {chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>

										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic" ? "عمولة" : "Commision"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{reservation &&
												reservation.commission &&
												reservation.commission.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>
								</div>

								<div className='my-5'>
									<div className='row my-auto'>
										<div className='col-md-5 mx-auto'>
											<h4>
												{chosenLanguage === "Arabic"
													? "إجمالي المبلغ"
													: "Total Amount"}
											</h4>
										</div>
										<div className='col-md-5 mx-auto'>
											<h3>{formatMoney(totalAmountValue)} SAR</h3>
										</div>

										{displayPaymentLabel ? (
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "طريقة الدفع"
														: "Payment"}
												</h6>
											</div>
										) : null}
										{displayPaymentLabel ? (
											<div className='col-md-5 mx-auto'>
												<h5 style={{ textTransform: "uppercase" }}>
													{displayPaymentLabel}
												</h5>
											</div>
										) : null}

										{totalPaid > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h4>
													{chosenLanguage === "Arabic"
														? "المبلغ المدفوع"
														: "Deposited Amount"}
												</h4>
											</div>
										) : null}
										{totalPaid > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h3>{formatMoney(totalPaid)} SAR</h3>
											</div>
										) : null}

										{paidOnline > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "مدفوع إلكترونياً"
														: "Paid Online"}
												</h6>
											</div>
										) : null}
										{paidOnline > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h5>{formatMoney(paidOnline)} SAR</h5>
											</div>
										) : null}

										{paidOffline > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "مدفوع نقداً"
														: "Paid Offline"}
												</h6>
											</div>
										) : null}
										{paidOffline > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h5>{formatMoney(paidOffline)} SAR</h5>
											</div>
										) : null}

										{totalAmountValue > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h4>
													{chosenLanguage === "Arabic"
														? "المبلغ المستحق"
														: "Amount Due"}
												</h4>
											</div>
										) : null}
										{totalAmountValue > 0 ? (
											<div className='col-md-5 mx-auto'>
												<h3 style={{ color: "darkgreen" }}>
													{formatMoney(amountDue)} SAR
												</h3>
											</div>
										) : null}

										<div className='col-md-5 mx-auto'>
											<h6>
												{chosenLanguage === "Arabic"
													? "حالة الدفع"
													: "Payment Status"}
											</h6>
										</div>
										<div className='col-md-5 mx-auto'>
											<h5>{paymentSummary.status}</h5>
										</div>
									</div>

									<div className='my-3'>
										<div className='row'>
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "معدل السعر اليومي"
														: "Daily Rate"}
												</h6>
											</div>

											<div className='col-md-5 mx-auto'>
												<h5>
													{getTotalAmountPerDay(reservation.pickedRoomsType) &&
														getTotalAmountPerDay(
															reservation.pickedRoomsType,
														).toLocaleString()}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h5>
											</div>
										</div>
									</div>
								</div>
							</ContentSection>
						</Content>
					</div>
				</div>
			)}
		</Wrapper>
	);
};

export default ReservationDetail;
